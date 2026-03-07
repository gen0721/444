import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC } from '../components/Icons'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
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

  const sockRef       = useRef(null)
  const localStream   = useRef(null)
  const peerConns     = useRef({})   // socketId → RTCPeerConnection
  const pendingICE    = useRef({})   // socketId → candidate[] (before remoteDesc set)
  const analysers     = useRef({})
  const mutedRef      = useRef(false)

  // ── Load rooms ──────────────────────────────────────────────────────
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

  // ── Socket.io ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return

    // Always connect to same origin — works via Vite proxy in dev, directly in prod
    const sock = io(window.location.origin, {
      auth:       { token },
      path:       '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection:      true,
      reconnectionDelay: 2000,
    })
    sockRef.current = sock

    sock.on('connect', () => {
      console.log('✅ Socket connected:', sock.id)
      setSocketReady(true)
    })
    sock.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setSocketReady(false)
    })
    sock.on('connect_error', (e) => console.error('❌ Socket error:', e.message))

    // We joined — send offers to all existing peers
    sock.on('room-joined', ({ participants: existing }) => {
      console.log('room-joined, peers:', existing.length)
      existing.forEach(peer => {
        createOffer(peer.socketId)
      })
    })

    // New peer joined after us — they'll send us an offer, just add to UI
    sock.on('peer-joined', ({ peerId, userName }) => {
      console.log('peer-joined:', peerId)
      setParticipants(prev =>
        prev.some(p => p.socketId === peerId)
          ? prev
          : [...prev, { socketId: peerId, userName, muted: false, isMe: false }]
      )
    })

    // Incoming offer — send back answer
    sock.on('offer', ({ fromSocketId, userName, sdp }) => {
      console.log('got offer from:', fromSocketId)
      setParticipants(prev =>
        prev.some(p => p.socketId === fromSocketId)
          ? prev
          : [...prev, { socketId: fromSocketId, userName, muted: false, isMe: false }]
      )
      handleOffer(fromSocketId, sdp)
    })

    // Incoming answer
    sock.on('answer', ({ fromSocketId, sdp }) => {
      console.log('got answer from:', fromSocketId)
      const pc = peerConns.current[fromSocketId]
      if (!pc) return
      if (pc.signalingState !== 'have-local-offer') return
      pc.setRemoteDescription(new RTCSessionDescription(sdp))
        .then(() => drainICE(fromSocketId))
        .catch(e => console.error('setRemoteDesc(answer) error:', e))
    })

    // ICE candidate
    sock.on('ice-candidate', ({ fromSocketId, candidate }) => {
      if (!candidate) return
      const pc = peerConns.current[fromSocketId]
      if (pc && pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
      } else {
        // Queue until remote description is set
        if (!pendingICE.current[fromSocketId]) pendingICE.current[fromSocketId] = []
        pendingICE.current[fromSocketId].push(candidate)
      }
    })

    sock.on('peer-left', ({ socketId }) => {
      console.log('peer-left:', socketId)
      closePeer(socketId)
      setParticipants(prev => prev.filter(p => p.socketId !== socketId))
    })

    sock.on('peer-muted', ({ socketId, muted: m }) => {
      setParticipants(prev => prev.map(p =>
        p.socketId === socketId ? { ...p, muted: m } : p
      ))
    })

    sock.on('room-updated', ({ participants: list }) => {
      setParticipants(prev => {
        const me = prev.find(p => p.isMe)
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

  // ── Get/init local microphone stream ──────────────────────────────
  async function getStream() {
    if (localStream.current) return localStream.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
        },
        video: false,
      })
      localStream.current = stream
      // Apply current mute state
      stream.getAudioTracks().forEach(t => { t.enabled = !mutedRef.current })
      return stream
    } catch (e) {
      console.error('getUserMedia failed:', e)
      if (e.name === 'NotAllowedError') {
        toast.error('Разрешите доступ к микрофону в браузере')
      } else if (e.name === 'NotFoundError') {
        toast.error('Микрофон не найден')
      } else {
        toast.error('Ошибка доступа к микрофону: ' + e.message)
      }
      return null
    }
  }

  // ── Create RTCPeerConnection ──────────────────────────────────────
  function makePeer(remoteId) {
    if (peerConns.current[remoteId]) return peerConns.current[remoteId]

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
      console.log('🔊 Remote audio track from:', remoteId)
      mountAudio(remoteId, stream)
      startVisualiser(remoteId, stream)
    }

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState
      console.log(`[${remoteId.slice(0,6)}] conn:`, s)
      if (s === 'failed') {
        // Try ICE restart
        if (sockRef.current?.connected) createOffer(remoteId)
      }
      if (s === 'closed') closePeer(remoteId)
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`[${remoteId.slice(0,6)}] ICE:`, pc.iceConnectionState)
    }

    return pc
  }

  // ── Add local tracks to peer connection ──────────────────────────
  function addTracks(pc, stream) {
    if (!stream) return
    const senders = pc.getSenders()
    stream.getTracks().forEach(track => {
      const already = senders.find(s => s.track?.kind === track.kind)
      if (!already) pc.addTrack(track, stream)
    })
  }

  // ── Drain queued ICE candidates ───────────────────────────────────
  async function drainICE(remoteId) {
    const queue = pendingICE.current[remoteId] || []
    delete pendingICE.current[remoteId]
    const pc = peerConns.current[remoteId]
    if (!pc) return
    for (const c of queue) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {}
    }
  }

  // ── Initiate offer (we are the joiner) ───────────────────────────
  async function createOffer(remoteId) {
    const stream = await getStream()
    if (!stream || !sockRef.current?.connected) return

    const pc = makePeer(remoteId)
    addTracks(pc, stream)

    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)
      sockRef.current.emit('offer', { targetSocketId: remoteId, sdp: offer })
      console.log('📤 offer →', remoteId.slice(0,6))
    } catch (e) {
      console.error('createOffer error:', e)
    }
  }

  // ── Handle incoming offer, send answer ───────────────────────────
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
      console.log('📤 answer →', remoteId.slice(0,6))
    } catch (e) {
      console.error('handleOffer error:', e)
    }
  }

  // ── Mount <audio> element for remote peer ─────────────────────────
  function mountAudio(socketId, stream) {
    const id = `va-${socketId}`
    let el = document.getElementById(id)
    if (!el) {
      el = document.createElement('audio')
      el.id = id
      el.autoplay = true
      el.setAttribute('playsinline', '')
      el.style.position = 'absolute'
      el.style.width = '1px'
      el.style.opacity = '0'
      document.body.appendChild(el)
    }
    el.srcObject = stream
    // Unlock audio on mobile (must be triggered by user gesture earlier)
    el.play().catch(err => {
      console.warn('audio.play() blocked:', err.message)
      // Will autoplay once user interacts with page
    })
  }

  // ── Voice activity detection ──────────────────────────────────────
  function startVisualiser(socketId, stream) {
    if (analysers.current[socketId]) return
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)()
      const src  = ctx.createMediaStreamSource(stream)
      const node = ctx.createAnalyser()
      node.fftSize = 256
      src.connect(node)
      const buf = new Uint8Array(node.frequencyBinCount)
      let rafId = 0
      const tick = () => {
        if (!analysers.current[socketId]) return
        node.getByteFrequencyData(buf)
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length
        setSpeaking(s => ({ ...s, [socketId]: avg > 8 }))
        rafId = requestAnimationFrame(tick)
        analysers.current[socketId].rafId = rafId
      }
      analysers.current[socketId] = { ctx, node, rafId: 0 }
      tick()
    } catch {}
  }

  // ── Close one peer ────────────────────────────────────────────────
  function closePeer(socketId) {
    const vis = analysers.current[socketId]
    if (vis) {
      cancelAnimationFrame(vis.rafId)
      try { vis.ctx.close() } catch {}
      delete analysers.current[socketId]
    }
    const pc = peerConns.current[socketId]
    if (pc) {
      pc.ontrack = null; pc.onicecandidate = null
      pc.close()
      delete peerConns.current[socketId]
    }
    delete pendingICE.current[socketId]
    const el = document.getElementById(`va-${socketId}`)
    if (el) { el.srcObject = null; el.remove() }
    setSpeaking(s => { const n = { ...s }; delete n[socketId]; return n })
  }

  // ── Stop everything ───────────────────────────────────────────────
  function stopAll() {
    Object.keys(peerConns.current).forEach(closePeer)
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    document.querySelectorAll('audio[id^="va-"]').forEach(el => {
      el.srcObject = null; el.remove()
    })
  }

  // ── Join room ─────────────────────────────────────────────────────
  const doJoin = async (room, pin) => {
    // Validate via REST
    try {
      const { data } = await api.post(`/rooms/${room.id}/join`, { pin: pin || undefined })

      // Pre-request mic permission NOW (before joining socket room)
      // so user sees the prompt before audio starts
      const stream = await getStream()
      if (!stream) return  // user denied mic — abort

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

      sockRef.current?.emit('join-room', { roomId: room.id, pin: pin || undefined })
    } catch (e) {
      toast.error(e.response?.data?.error || 'Не удалось войти в комнату')
    }
  }

  const handleJoinClick = (room) => {
    if (room.type === 'private') {
      setPinModal(room); setPinInput('')
    } else {
      doJoin(room)
    }
  }

  const submitPin = async () => {
    if (!pinInput.trim()) return toast.error('Введите PIN')
    await doJoin(pinModal, pinInput.trim())
    setPinModal(null)
  }

  // ── Leave room ────────────────────────────────────────────────────
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

  // ── Toggle mute ───────────────────────────────────────────────────
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
              {socketReady
                ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', display: 'inline-block' }} title="Подключено"/>
                : <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f87171', display: 'inline-block' }} title="Нет соединения"/>
              }
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t3)' }}>WebRTC P2P</div>
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
        />
      )}

      {/* List */}
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

// ─── Active Room Panel ──────────────────────────────────────────────────────
function ActivePanel({ room, participants, muted, onMute, onLeave, speaking }) {
  return (
    <div style={{ margin: '14px 14px 0', borderRadius: '20px', background: 'linear-gradient(135deg,rgba(34,211,238,0.08),rgba(6,8,17,0.97))', border: '2px solid rgba(34,211,238,0.25)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(34,211,238,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee', animation: 'glowPulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#22d3ee' }}>{room.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{participants.length} участн. · {room.type === 'private' ? '🔒 закрытая' : '🌐 публичная'}</div>
        </div>
        <button onClick={onMute} title={muted ? 'Включить микрофон' : 'Выключить'} style={{ width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: muted ? 'rgba(248,113,113,0.15)' : 'rgba(34,211,238,0.1)', border: `1px solid ${muted ? 'rgba(248,113,113,0.4)' : 'rgba(34,211,238,0.3)'}`, transition: 'all 0.2s' }}>
          {muted ? '🔇' : '🎤'}
        </button>
        <button onClick={onLeave} style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid rgba(248,113,113,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(248,113,113,0.1)' }}>
          <IC.Exit s={16} c="#f87171" />
        </button>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {participants.map(p => (
          <PeerChip key={p.socketId || p.userName} peer={p} isSpeaking={speaking[p.socketId]} />
        ))}
      </div>
    </div>
  )
}

function PeerChip({ peer, isSpeaking }) {
  const active = isSpeaking && !peer.muted
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 12px', borderRadius: '100px', background: active ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.07)'}`, boxShadow: active ? '0 0 14px rgba(34,211,238,0.25)' : 'none', transition: 'all 0.15s' }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: peer.isMe ? 'linear-gradient(135deg,#22d3ee,#0891b2)' : 'linear-gradient(135deg,#a78bfa,#7c6aff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)', flexShrink: 0 }}>
        {(peer.userName || '?').charAt(0).toUpperCase()}
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: active ? '#22d3ee' : 'var(--t1)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {peer.isMe ? 'Вы' : peer.userName}
      </span>
      {peer.muted && <span style={{ fontSize: '13px' }}>🔇</span>}
      {active && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px #22d3ee', flexShrink: 0 }} />}
    </div>
  )
}

// ─── Room Card ──────────────────────────────────────────────────────────────
function RoomCard({ room, isActive, onJoin, delay }) {
  return (
    <div className="anim-up" style={{ animationDelay: `${delay}ms`, padding: '14px 16px', borderRadius: '18px', background: isActive ? 'rgba(34,211,238,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.07)'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {room.type === 'private' ? '🔒' : '🌐'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {room.name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--t3)', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
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

// ─── PIN Modal ──────────────────────────────────────────────────────────────
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

// ─── Create Modal ───────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [name, setName]       = useState('')
  const [type, setType]       = useState('public')
  const [pin, setPin]         = useState('')
  const [loading, setLoading] = useState(false)

  const create = async () => {
    if (!name.trim()) return toast.error('Введите название')
    if (type === 'private' && pin.trim().length < 4) return toast.error('PIN минимум 4 символа')
    setLoading(true)
    try {
      const { data } = await api.post('/rooms', {
        name: name.trim(), type,
        pin: type === 'private' ? pin.trim() : undefined,
      })
      toast.success(type === 'private' ? '🔒 Закрытая комната создана!' : '🌐 Публичная комната создана!')
      onCreated(data)
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setLoading(false)
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: '#22d3ee', marginBottom: '20px' }}>🎙 СОЗДАТЬ КОМНАТУ</div>

      <FieldLabel>НАЗВАНИЕ</FieldLabel>
      <input className="inp" placeholder="Название..." value={name} onChange={e => setName(e.target.value)}
        style={{ marginBottom: '16px', borderColor: 'rgba(34,211,238,0.3)' }} />

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
            ? <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(34,211,238,0.25)', borderTop: '2px solid #22d3ee', animation: 'rotateSpin 0.7s linear infinite' }} />
            : '🎙 Создать'}
        </button>
      </div>
    </Sheet>
  )
}

// ─── Shared ─────────────────────────────────────────────────────────────────
function Sheet({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'rgba(8,10,22,0.99)', borderRadius: '24px 24px 0 0', padding: '24px 20px 36px', width: '100%', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', boxShadow: '0 -8px 40px rgba(0,0,0,0.7)', animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)', maxHeight: '88dvh', overflowY: 'auto' }}>
        <div style={{ width: '36px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', margin: '0 auto 20px' }} />
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
