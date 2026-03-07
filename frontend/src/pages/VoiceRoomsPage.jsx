import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC } from '../components/Icons'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'

// ─── ICE Config: STUN + public TURN for NAT traversal ────────────────────────
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80',   username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',  username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
}

// Quality levels by RTT and packet loss
function getQuality(stats) {
  if (!stats) return 'unknown'
  const { rtt, lost, sent } = stats
  const loss = sent > 0 ? (lost / sent) * 100 : 0
  if (rtt < 80  && loss < 2)  return 'excellent'
  if (rtt < 150 && loss < 5)  return 'good'
  if (rtt < 300 && loss < 15) return 'fair'
  return 'poor'
}

const QUALITY_META = {
  excellent: { color: '#4ade80', bars: 4, label: 'Отлично' },
  good:      { color: '#86efac', bars: 3, label: 'Хорошо' },
  fair:      { color: '#fbbf24', bars: 2, label: 'Слабый' },
  poor:      { color: '#f87171', bars: 1, label: 'Плохой' },
  unknown:   { color: 'var(--t3)', bars: 0, label: '...' },
}

// ─── Quality indicator component ──────────────────────────────────────────────
function QualityBars({ quality, size = 14 }) {
  const meta = QUALITY_META[quality] || QUALITY_META.unknown
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: size }} title={`Связь: ${meta.label}`}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{
          width: size * 0.22,
          height: `${25 * i}%`,
          borderRadius: '1px',
          background: i <= meta.bars ? meta.color : 'rgba(255,255,255,0.15)',
          transition: 'background 0.4s',
        }}/>
      ))}
    </div>
  )
}

export default function VoiceRoomsPage() {
  const navigate        = useNavigate()
  const { user, token } = useStore()

  const [rooms,        setRooms]       = useState([])
  const [roomsLoading, setRoomsLoading]= useState(true)
  const [activeRoom,   setActiveRoom]  = useState(null)
  const [participants, setParticipants]= useState([])
  const [muted,        setMuted]       = useState(false)
  const [showCreate,   setShowCreate]  = useState(false)
  const [pinModal,     setPinModal]    = useState(null)
  const [pinInput,     setPinInput]    = useState('')
  const [speaking,     setSpeaking]    = useState({})
  const [socketReady,  setSocketReady] = useState(false)

  // Quality: socketId → { rtt, lost, sent, quality }
  const [peerQuality, setPeerQuality]  = useState({})
  // Reconnect state: socketId → 'connecting' | 'reconnecting' | 'ok' | 'failed'
  const [peerState,   setPeerState]    = useState({})
  // Own connection quality (for display in ActivePanel)
  const [myQuality,   setMyQuality]    = useState('unknown')

  const sockRef        = useRef(null)
  const localStream    = useRef(null)
  const peerConns      = useRef({})     // socketId → RTCPeerConnection
  const pendingICE     = useRef({})     // socketId → candidate[]
  const analysers      = useRef({})     // socketId → { ctx, node, rafId }
  const statsIntervals = useRef({})     // socketId → intervalId
  const reconnectTimers= useRef({})     // socketId → timeoutId
  const activeRoomRef  = useRef(null)   // mirrors activeRoom for closures
  const mutedRef       = useRef(false)

  // Keep ref in sync with state
  useEffect(() => { activeRoomRef.current = activeRoom }, [activeRoom])

  // ── Load rooms ────────────────────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    try { const { data } = await api.get('/rooms'); setRooms(data || []) }
    catch {}
    setRoomsLoading(false)
  }, [])

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    loadRooms()
    const t = setInterval(loadRooms, 6000)
    return () => clearInterval(t)
  }, [])

  // ── Socket.io ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return

    const sock = io(window.location.origin, {
      auth:       { token },
      path:       '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection:        true,
      reconnectionDelay:   1500,
      reconnectionAttempts: 10,
    })
    sockRef.current = sock

    sock.on('connect', () => {
      console.log('✅ Socket connected:', sock.id)
      setSocketReady(true)
      // Re-join room after reconnect
      if (activeRoomRef.current) {
        console.log('↩ Re-joining room after socket reconnect')
        sock.emit('join-room', { roomId: activeRoomRef.current.id })
        toast('Переподключение к комнате...', { icon: '🔄' })
      }
    })

    sock.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setSocketReady(false)
      if (activeRoomRef.current) {
        toast('Соединение потеряно, переподключаем...', { icon: '⚠️' })
      }
    })

    sock.on('connect_error', (e) => console.error('❌ Socket error:', e.message))

    sock.on('room-joined', ({ participants: existing }) => {
      console.log('room-joined, existing peers:', existing.length)
      existing.forEach(peer => createOffer(peer.socketId))
    })

    sock.on('peer-joined', ({ peerId, userName }) => {
      setParticipants(prev =>
        prev.some(p => p.socketId === peerId)
          ? prev
          : [...prev, { socketId: peerId, userName, muted: false, isMe: false }]
      )
      setPeerState(s => ({ ...s, [peerId]: 'connecting' }))
    })

    sock.on('offer', ({ fromSocketId, userName, sdp }) => {
      setParticipants(prev =>
        prev.some(p => p.socketId === fromSocketId)
          ? prev
          : [...prev, { socketId: fromSocketId, userName, muted: false, isMe: false }]
      )
      setPeerState(s => ({ ...s, [fromSocketId]: 'connecting' }))
      handleOffer(fromSocketId, sdp)
    })

    sock.on('answer', ({ fromSocketId, sdp }) => {
      const pc = peerConns.current[fromSocketId]
      if (!pc) return
      if (!['have-local-offer', 'stable'].includes(pc.signalingState)) return
      pc.setRemoteDescription(new RTCSessionDescription(sdp))
        .then(() => drainICE(fromSocketId))
        .catch(e => console.error('setRemoteDesc(answer) error:', e))
    })

    sock.on('ice-candidate', ({ fromSocketId, candidate }) => {
      if (!candidate) return
      const pc = peerConns.current[fromSocketId]
      if (pc && pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      } else {
        if (!pendingICE.current[fromSocketId]) pendingICE.current[fromSocketId] = []
        pendingICE.current[fromSocketId].push(candidate)
      }
    })

    sock.on('peer-left', ({ socketId }) => {
      closePeer(socketId)
      setParticipants(prev => prev.filter(p => p.socketId !== socketId))
      setPeerState(s  => { const n = { ...s }; delete n[socketId]; return n })
      setPeerQuality(s => { const n = { ...s }; delete n[socketId]; return n })
    })

    sock.on('peer-muted', ({ socketId, muted: m }) => {
      setParticipants(prev => prev.map(p =>
        p.socketId === socketId ? { ...p, muted: m } : p
      ))
    })

    sock.on('room-updated', ({ participants: list }) => {
      setParticipants(prev => {
        const me     = prev.find(p => p.isMe)
        const others = list
          .filter(p => p.socketId !== sock.id)
          .map(p => ({ socketId: p.socketId, userName: p.userName, muted: p.muted, isMe: false }))
        return me ? [me, ...others] : others
      })
    })

    sock.on('room-error', ({ message }) => toast.error(message))

    return () => {
      sock.disconnect()
      stopAll()
    }
  }, [token])

  // ── Microphone ────────────────────────────────────────────────────────────
  async function getStream() {
    if (localStream.current) return localStream.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
      localStream.current = stream
      stream.getAudioTracks().forEach(t => { t.enabled = !mutedRef.current })
      return stream
    } catch (e) {
      console.error('getUserMedia failed:', e)
      if (e.name === 'NotAllowedError')  toast.error('Разрешите доступ к микрофону в браузере')
      else if (e.name === 'NotFoundError') toast.error('Микрофон не найден')
      else toast.error('Ошибка микрофона: ' + e.message)
      return null
    }
  }

  // ── Create RTCPeerConnection ───────────────────────────────────────────────
  function makePeer(remoteId) {
    // Close stale peer if exists
    if (peerConns.current[remoteId]) {
      const old = peerConns.current[remoteId]
      if (['failed','closed'].includes(old.connectionState)) {
        old.close()
        delete peerConns.current[remoteId]
      } else {
        return old
      }
    }

    const pc = new RTCPeerConnection(ICE_CONFIG)
    peerConns.current[remoteId] = pc

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && sockRef.current?.connected) {
        sockRef.current.emit('ice-candidate', {
          targetSocketId: remoteId,
          candidate: candidate.toJSON(),
        })
      }
    }

    pc.ontrack = ({ track, streams }) => {
      if (track.kind !== 'audio') return
      const stream = (streams && streams[0]) || new MediaStream([track])
      mountAudio(remoteId, stream)
      startVisualiser(remoteId, stream)
    }

    // Connection state → update peerState, handle failures, collect stats
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState
      console.log(`[${remoteId.slice(0,6)}] conn: ${s}`)

      if (s === 'connected') {
        setPeerState(prev => ({ ...prev, [remoteId]: 'ok' }))
        clearTimeout(reconnectTimers.current[remoteId])
        startStatsPolling(remoteId, pc)
      } else if (s === 'connecting') {
        setPeerState(prev => ({ ...prev, [remoteId]: 'connecting' }))
      } else if (s === 'disconnected') {
        setPeerState(prev => ({ ...prev, [remoteId]: 'reconnecting' }))
        // Give it 4s to recover on its own before forcing ICE restart
        reconnectTimers.current[remoteId] = setTimeout(() => {
          const cur = peerConns.current[remoteId]
          if (cur && cur.connectionState === 'disconnected') {
            console.log(`🔄 ICE restart for ${remoteId.slice(0,6)}`)
            scheduleReconnect(remoteId)
          }
        }, 4000)
      } else if (s === 'failed') {
        setPeerState(prev => ({ ...prev, [remoteId]: 'reconnecting' }))
        stopStatsPolling(remoteId)
        scheduleReconnect(remoteId)
      } else if (s === 'closed') {
        stopStatsPolling(remoteId)
        closePeer(remoteId)
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`[${remoteId.slice(0,6)}] ICE: ${pc.iceConnectionState}`)
    }

    return pc
  }

  // ── Stats polling for quality indicator ───────────────────────────────────
  function startStatsPolling(socketId, pc) {
    stopStatsPolling(socketId)
    let prevSent = 0, prevLost = 0

    statsIntervals.current[socketId] = setInterval(async () => {
      if (!pc || pc.connectionState !== 'connected') return
      try {
        const report = await pc.getStats()
        let rtt = 0, lost = 0, sent = 0

        report.forEach(stat => {
          // Outbound audio stats
          if (stat.type === 'remote-inbound-rtp' && stat.kind === 'audio') {
            rtt  = Math.round((stat.roundTripTime || 0) * 1000)
            lost = (stat.packetsLost || 0) - prevLost
            prevLost = stat.packetsLost || 0
          }
          if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
            sent = (stat.packetsSent || 0) - prevSent
            prevSent = stat.packetsSent || 0
          }
        })

        const q = getQuality({ rtt, lost: Math.max(0, lost), sent })
        setPeerQuality(prev => ({ ...prev, [socketId]: { rtt, lost, sent, quality: q } }))

        // Update own displayed quality from first peer
        setMyQuality(q)
      } catch {}
    }, 2500)
  }

  function stopStatsPolling(socketId) {
    clearInterval(statsIntervals.current[socketId])
    delete statsIntervals.current[socketId]
  }

  // ── Auto-reconnect ────────────────────────────────────────────────────────
  function scheduleReconnect(remoteId, attempt = 1) {
    if (attempt > 5) {
      console.warn(`❌ Reconnect failed after 5 attempts for ${remoteId.slice(0,6)}`)
      setPeerState(prev => ({ ...prev, [remoteId]: 'failed' }))
      return
    }
    const delay = Math.min(1000 * attempt, 8000)
    console.log(`🔄 Reconnect attempt ${attempt} for ${remoteId.slice(0,6)} in ${delay}ms`)

    reconnectTimers.current[remoteId] = setTimeout(async () => {
      if (!sockRef.current?.connected || !activeRoomRef.current) return
      // Close old peer fully
      const old = peerConns.current[remoteId]
      if (old) { old.ontrack = null; old.onicecandidate = null; try { old.close() } catch {} }
      delete peerConns.current[remoteId]
      delete pendingICE.current[remoteId]

      // Try fresh offer
      try {
        await createOffer(remoteId)
        console.log(`✅ Re-offer sent to ${remoteId.slice(0,6)}`)
      } catch {
        scheduleReconnect(remoteId, attempt + 1)
      }
    }, delay)
  }

  // ── Tracks ────────────────────────────────────────────────────────────────
  function addTracks(pc, stream) {
    if (!stream) return
    const senders = pc.getSenders()
    stream.getTracks().forEach(track => {
      const already = senders.find(s => s.track?.kind === track.kind)
      if (!already) pc.addTrack(track, stream)
    })
  }

  async function drainICE(remoteId) {
    const queue = pendingICE.current[remoteId] || []
    delete pendingICE.current[remoteId]
    const pc = peerConns.current[remoteId]
    if (!pc) return
    for (const c of queue) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
    }
  }

  // ── Offer / Answer ────────────────────────────────────────────────────────
  async function createOffer(remoteId) {
    const stream = await getStream()
    if (!stream || !sockRef.current?.connected) return

    const pc = makePeer(remoteId)
    addTracks(pc, stream)

    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, iceRestart: true })
      await pc.setLocalDescription(offer)
      sockRef.current.emit('offer', { targetSocketId: remoteId, sdp: offer })
    } catch (e) {
      console.error('createOffer error:', e)
    }
  }

  async function handleOffer(remoteId, sdp) {
    const stream = await getStream()
    if (!stream || !sockRef.current?.connected) return

    const pc = makePeer(remoteId)
    addTracks(pc, stream)

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      await drainICE(remoteId)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sockRef.current.emit('answer', { targetSocketId: remoteId, sdp: answer })
    } catch (e) {
      console.error('handleOffer error:', e)
    }
  }

  // ── Audio element ─────────────────────────────────────────────────────────
  function mountAudio(socketId, stream) {
    const id = `va-${socketId}`
    let el = document.getElementById(id)
    if (!el) {
      el = document.createElement('audio')
      el.id = id
      el.autoplay = true
      el.setAttribute('playsinline', '')
      el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none'
      document.body.appendChild(el)
    }
    el.srcObject = stream
    el.play().catch(err => console.warn('audio.play() blocked:', err.message))
  }

  // ── Voice activity visualiser ─────────────────────────────────────────────
  function startVisualiser(socketId, stream) {
    if (analysers.current[socketId]) return
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)()
      const src  = ctx.createMediaStreamSource(stream)
      const node = ctx.createAnalyser()
      node.fftSize = 256
      src.connect(node)
      const buf = new Uint8Array(node.frequencyBinCount)
      const tick = () => {
        if (!analysers.current[socketId]) return
        node.getByteFrequencyData(buf)
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length
        setSpeaking(s => ({ ...s, [socketId]: avg > 8 }))
        analysers.current[socketId].rafId = requestAnimationFrame(tick)
      }
      analysers.current[socketId] = { ctx, node, rafId: 0 }
      tick()
    } catch {}
  }

  // ── Close one peer ────────────────────────────────────────────────────────
  function closePeer(socketId) {
    clearTimeout(reconnectTimers.current[socketId])
    delete reconnectTimers.current[socketId]
    stopStatsPolling(socketId)

    const vis = analysers.current[socketId]
    if (vis) {
      cancelAnimationFrame(vis.rafId)
      try { vis.ctx.close() } catch {}
      delete analysers.current[socketId]
    }
    const pc = peerConns.current[socketId]
    if (pc) {
      pc.ontrack = null; pc.onicecandidate = null; pc.onconnectionstatechange = null
      try { pc.close() } catch {}
      delete peerConns.current[socketId]
    }
    delete pendingICE.current[socketId]
    const el = document.getElementById(`va-${socketId}`)
    if (el) { el.srcObject = null; el.remove() }
    setSpeaking(s => { const n = { ...s }; delete n[socketId]; return n })
  }

  function stopAll() {
    Object.keys(peerConns.current).forEach(closePeer)
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    document.querySelectorAll('audio[id^="va-"]').forEach(el => { el.srcObject = null; el.remove() })
    setPeerQuality({})
    setPeerState({})
    setMyQuality('unknown')
  }

  // ── Join room ─────────────────────────────────────────────────────────────
  const doJoin = async (room, pin) => {
    try {
      const { data } = await api.post(`/rooms/${room.id}/join`, { pin: pin || undefined })
      const stream   = await getStream()
      if (!stream) return

      const me = {
        socketId: sockRef.current?.id || 'me',
        userName: user.firstName || user.username || 'Вы',
        muted: false,
        isMe: true,
      }
      setActiveRoom(data)
      setParticipants([me])
      setMuted(false)
      mutedRef.current = false
      setPeerQuality({})
      setPeerState({})

      sockRef.current?.emit('join-room', { roomId: room.id, pin: pin || undefined })
    } catch (e) {
      toast.error(e.response?.data?.error || 'Не удалось войти')
    }
  }

  const handleJoinClick = (room) => {
    if (room.type === 'private') { setPinModal(room); setPinInput('') }
    else doJoin(room)
  }

  const submitPin = async () => {
    if (!pinInput.trim()) return toast.error('Введите PIN')
    await doJoin(pinModal, pinInput.trim())
    setPinModal(null)
  }

  const leaveRoom = async () => {
    if (!activeRoom) return
    sockRef.current?.emit('leave-room')
    try { await api.post(`/rooms/${activeRoom.id}/leave`) } catch {}
    stopAll()
    setActiveRoom(null)
    setParticipants([])
    setSpeaking({})
    loadRooms()
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    mutedRef.current = next
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = !next })
    sockRef.current?.emit('toggle-mute', { muted: next })
    setParticipants(prev => prev.map(p => p.isMe ? { ...p, muted: next } : p))
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100%', paddingBottom: '24px' }}>

      {/* Header */}
      <div style={{ padding: '14px', background: 'rgba(6,8,17,0.96)', backdropFilter: 'blur(32px)', borderBottom: '1px solid rgba(34,211,238,0.12)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => navigate(-1)} className="btn-icon"><IC.Back s={18} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: '#22d3ee', textShadow: '0 0 12px rgba(34,211,238,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🎙 ГОЛОСОВЫЕ КОМНАТЫ
              {/* Socket connection dot */}
              <span style={{
                width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
                background: socketReady ? '#4ade80' : '#f87171',
                boxShadow: socketReady ? '0 0 6px #4ade80' : 'none',
                transition: 'all 0.3s',
              }} title={socketReady ? 'Подключено' : 'Нет соединения'}/>
              {/* Own quality bars when in room */}
              {activeRoom && <QualityBars quality={myQuality} size={13}/>}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
              WebRTC P2P{activeRoom ? ` · ${QUALITY_META[myQuality]?.label}` : ''}
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: '100px', cursor: 'pointer', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.35)', color: '#22d3ee', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IC.Plus s={13} c="#22d3ee" /> Создать
          </button>
        </div>
      </div>

      {/* Active room panel */}
      {activeRoom && (
        <ActivePanel
          room={activeRoom}
          participants={participants}
          muted={muted}
          onMute={toggleMute}
          onLeave={leaveRoom}
          speaking={speaking}
          peerQuality={peerQuality}
          peerState={peerState}
          myQuality={myQuality}
        />
      )}

      {/* Room list */}
      <div style={{ padding: '14px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.12em', marginBottom: '12px' }}>
          ВСЕ КОМНАТЫ ({rooms.length})
        </div>
        {roomsLoading ? (
          [1,2,3].map(i => <div key={i} className="skel" style={{ height: '76px', marginBottom: '10px' }} />)
        ) : rooms.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rooms.map((room, i) => (
              <RoomCard
                key={room.id} room={room}
                isActive={activeRoom?.id === room.id}
                onJoin={() => handleJoinClick(room)}
                delay={i * 40}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={room => { setShowCreate(false); loadRooms(); handleJoinClick(room) }}
        />
      )}

      {pinModal && (
        <PinModal
          room={pinModal} value={pinInput} onChange={setPinInput}
          onSubmit={submitPin} onClose={() => setPinModal(null)}
        />
      )}
    </div>
  )
}

// ─── Active Room Panel ────────────────────────────────────────────────────────
function ActivePanel({ room, participants, muted, onMute, onLeave, speaking, peerQuality, peerState, myQuality }) {
  return (
    <div style={{ margin: '14px 14px 0', borderRadius: '20px', background: 'linear-gradient(135deg,rgba(34,211,238,0.08),rgba(6,8,17,0.97))', border: '2px solid rgba(34,211,238,0.25)', overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(34,211,238,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee', animation: 'glowPulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#22d3ee' }}>
            {room.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {participants.length} участн.
            <span>·</span>
            {room.type === 'private' ? '🔒 закрытая' : '🌐 публичная'}
            <span>·</span>
            <QualityBars quality={myQuality} size={11}/>
            <span style={{ color: QUALITY_META[myQuality]?.color }}>{QUALITY_META[myQuality]?.label}</span>
          </div>
        </div>
        <button onClick={onMute} title={muted ? 'Включить микрофон' : 'Выключить'} style={{ width: 40, height: 40, borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: muted ? 'rgba(248,113,113,0.15)' : 'rgba(34,211,238,0.1)', border: `1px solid ${muted ? 'rgba(248,113,113,0.4)' : 'rgba(34,211,238,0.3)'}`, transition: 'all 0.2s' }}>
          {muted ? '🔇' : '🎤'}
        </button>
        <button onClick={onLeave} style={{ width: 40, height: 40, borderRadius: '12px', border: '1px solid rgba(248,113,113,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(248,113,113,0.1)' }}>
          <IC.Exit s={16} c="#f87171" />
        </button>
      </div>

      {/* Participants */}
      <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {participants.map(p => (
          <PeerChip
            key={p.socketId || p.userName}
            peer={p}
            isSpeaking={speaking[p.socketId]}
            quality={peerQuality[p.socketId]?.quality}
            state={p.isMe ? 'ok' : (peerState[p.socketId] || 'connecting')}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Peer chip with quality + reconnect state ─────────────────────────────────
function PeerChip({ peer, isSpeaking, quality, state }) {
  const active = isSpeaking && !peer.muted

  const stateColor = state === 'ok'           ? null
                   : state === 'connecting'   ? '#fbbf24'
                   : state === 'reconnecting' ? '#fb923c'
                   : state === 'failed'       ? '#f87171'
                   : null

  const stateLabel = state === 'connecting'   ? '⏳'
                   : state === 'reconnecting' ? '🔄'
                   : state === 'failed'       ? '❌'
                   : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '7px',
      padding: '7px 12px', borderRadius: '100px',
      background: active ? 'rgba(34,211,238,0.15)' : stateColor ? `${stateColor}14` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? 'rgba(34,211,238,0.5)' : stateColor ? `${stateColor}40` : 'rgba(255,255,255,0.07)'}`,
      boxShadow: active ? '0 0 14px rgba(34,211,238,0.25)' : 'none',
      transition: 'all 0.2s',
    }}>
      {/* Avatar */}
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: peer.isMe ? 'linear-gradient(135deg,#22d3ee,#0891b2)' : 'linear-gradient(135deg,#a78bfa,#7c6aff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)', flexShrink: 0 }}>
        {(peer.userName || '?').charAt(0).toUpperCase()}
      </div>

      {/* Name */}
      <span style={{ fontSize: '12px', fontWeight: 600, color: active ? '#22d3ee' : stateColor || 'var(--t1)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {peer.isMe ? 'Вы' : peer.userName}
      </span>

      {/* State indicators */}
      {peer.muted && !stateLabel && <span style={{ fontSize: '13px' }}>🔇</span>}
      {stateLabel && <span style={{ fontSize: '12px' }} title={state}>{stateLabel}</span>}
      {active && !stateLabel && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px #22d3ee', flexShrink: 0 }} />}

      {/* Quality bars for remote peers */}
      {!peer.isMe && state === 'ok' && quality && (
        <QualityBars quality={quality} size={12}/>
      )}
    </div>
  )
}

// ─── Room Card ────────────────────────────────────────────────────────────────
function RoomCard({ room, isActive, onJoin, delay }) {
  return (
    <div className="anim-up" style={{ animationDelay: `${delay}ms`, padding: '14px 16px', borderRadius: '18px', background: isActive ? 'rgba(34,211,238,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.07)'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: 44, height: 44, borderRadius: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {room.type === 'private' ? '🔒' : '🌐'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {room.name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--t3)', display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: room.type === 'private' ? '#e040fb' : '#22d3ee', fontWeight: 600 }}>
            {room.type === 'private' ? '🔒 Закрытая' : '🌐 Публичная'}
          </span>
          <span>·</span><span>{room.count || 0} чел.</span>
          <span>·</span><span>{room.ownerName}</span>
        </div>
      </div>
      {isActive
        ? <div style={{ fontSize: '10px', color: '#22d3ee', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>● ЭФИР</div>
        : <button onClick={onJoin} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.35)', color: '#22d3ee', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            ВОЙТИ
          </button>
      }
    </div>
  )
}

// ─── PIN Modal ────────────────────────────────────────────────────────────────
function PinModal({ room, value, onChange, onSubmit, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: '#e040fb', marginBottom: '6px' }}>🔒 ЗАКРЫТАЯ КОМНАТА</div>
      <div style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px' }}>«{room.name}»</div>
      <input className="inp" placeholder="PIN-код" value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSubmit()}
        style={{ marginBottom: '16px', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, textAlign: 'center', letterSpacing: '0.25em', borderColor: 'rgba(224,64,251,0.4)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button className="btn btn-ghost btn-full" onClick={onClose} style={{ fontFamily: 'var(--font-display)', fontSize: '13px' }}>Отмена</button>
        <button className="btn btn-full" onClick={onSubmit} style={{ fontFamily: 'var(--font-display)', fontSize: '13px', background: 'rgba(224,64,251,0.12)', border: '1px solid rgba(224,64,251,0.4)', color: '#e040fb' }}>
          🔓 Войти
        </button>
      </div>
    </Sheet>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [name, setName]       = useState('')
  const [type, setType]       = useState('public')
  const [pin,  setPin]        = useState('')
  const [loading, setLoading] = useState(false)

  const create = async () => {
    if (!name.trim()) return toast.error('Введите название')
    if (type === 'private' && pin.trim().length < 4) return toast.error('PIN минимум 4 символа')
    setLoading(true)
    try {
      const { data } = await api.post('/rooms', { name: name.trim(), type, pin: type === 'private' ? pin.trim() : undefined })
      toast.success(type === 'private' ? '🔒 Закрытая комната создана!' : '🌐 Публичная комната создана!')
      onCreated(data)
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setLoading(false)
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: '#22d3ee', marginBottom: '20px' }}>🎙 СОЗДАТЬ КОМНАТУ</div>
      <FieldLabel>НАЗВАНИЕ</FieldLabel>
      <input className="inp" placeholder="Название..." value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: '16px', borderColor: 'rgba(34,211,238,0.3)' }} />
      <FieldLabel>ТИП</FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {[
          { v: 'public',  icon: '🌐', label: 'ПУБЛИЧНАЯ', desc: 'Все могут войти',  color: '#22d3ee' },
          { v: 'private', icon: '🔒', label: 'ЗАКРЫТАЯ',  desc: 'Только по PIN',   color: '#e040fb' },
        ].map(t => (
          <button key={t.v} onClick={() => setType(t.v)} style={{ padding: '12px', borderRadius: '13px', cursor: 'pointer', textAlign: 'center', background: type === t.v ? `${t.color}12` : 'rgba(255,255,255,0.03)', border: `1px solid ${type === t.v ? `${t.color}45` : 'rgba(255,255,255,0.07)'}`, color: type === t.v ? t.color : 'var(--t3)', transition: 'all 0.15s' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{t.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', marginBottom: '2px' }}>{t.label}</div>
            <div style={{ fontSize: '10px', color: 'var(--t3)' }}>{t.desc}</div>
          </button>
        ))}
      </div>
      {type === 'private' && (
        <>
          <FieldLabel>ВАШ PIN-КОД</FieldLabel>
          <input className="inp" placeholder="Минимум 4 символа" value={pin} onChange={e => setPin(e.target.value)}
            maxLength={8} style={{ marginBottom: '10px', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, letterSpacing: '0.2em', textAlign: 'center', borderColor: 'rgba(224,64,251,0.4)' }} />
          <div style={{ padding: '10px 12px', borderRadius: '11px', background: 'rgba(224,64,251,0.07)', border: '1px solid rgba(224,64,251,0.2)', marginBottom: '16px', fontSize: '12px', color: '#e040fb', lineHeight: '1.5' }}>
            🔒 Передайте PIN тем, кого хотите пригласить
          </div>
        </>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
        <button className="btn btn-ghost btn-full" onClick={onClose} style={{ fontFamily: 'var(--font-display)', fontSize: '13px' }}>Отмена</button>
        <button className="btn btn-full" onClick={create} disabled={loading} style={{ fontFamily: 'var(--font-display)', fontSize: '13px', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.4)', color: '#22d3ee' }}>
          {loading
            ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(34,211,238,0.25)', borderTop: '2px solid #22d3ee', animation: 'rotateSpin 0.7s linear infinite' }} />
            : '🎙 Создать'}
        </button>
      </div>
    </Sheet>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function Sheet({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'rgba(8,10,22,0.99)', borderRadius: '24px 24px 0 0', padding: '24px 20px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 16px))', width: '100%', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', boxShadow: '0 -8px 40px rgba(0,0,0,0.7)', animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)', maxHeight: '88dvh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 3, borderRadius: '2px', background: 'rgba(255,255,255,0.1)', margin: '0 auto 20px' }} />
        {children}
      </div>
    </div>
  )
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.12em', fontFamily: 'var(--font-display)', marginBottom: '7px' }}>{children}</div>
}

function EmptyState({ onCreate }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎙</div>
      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--t3)', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '18px' }}>НЕТ АКТИВНЫХ КОМНАТ</div>
      <button onClick={onCreate} style={{ padding: '10px 22px', borderRadius: '100px', cursor: 'pointer', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.35)', color: '#22d3ee', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
        <IC.Plus s={14} c="#22d3ee" /> Создать первую комнату
      </button>
    </div>
  )
}
