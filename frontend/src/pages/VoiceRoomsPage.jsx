import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC } from '../components/Icons'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'

// WebRTC config - STUN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export default function VoiceRoomsPage() {
  const navigate      = useNavigate()
  const { user, token } = useStore()
  const [rooms, setRooms]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeRoom, setActiveRoom] = useState(null)    // room object when inside
  const [showCreate, setShowCreate] = useState(false)
  const [showPin, setShowPin]       = useState(null)    // roomId waiting for pin
  const [pinInput, setPinInput]     = useState('')
  const [muted, setMuted]           = useState(false)
  const [peers, setPeers]           = useState([])      // { socketId, userId, userName, muted }
  const [speaking, setSpeaking]     = useState({})      // socketId → bool

  const socketRef  = useRef(null)
  const localStream= useRef(null)
  const peerConns  = useRef({})      // socketId → RTCPeerConnection
  const analyserRef= useRef({})      // socketId → AudioContext/AnalyserNode for visualisation

  // ── Load public rooms list ──────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get('/rooms'); setRooms(data || []) }
    catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    loadRooms()
    const interval = setInterval(loadRooms, 8000)
    return () => clearInterval(interval)
  }, [])

  // ── Init socket connection ──────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api','')
      : window.location.origin

    const sock = io(socketUrl, { auth: { token }, transports: ['websocket','polling'] })
    socketRef.current = sock

    sock.on('connect', () => console.log('Socket connected'))
    sock.on('connect_error', (e) => console.error('Socket error:', e.message))

    // Someone joined → initiate offer
    sock.on('peer-joined', async ({ peerId, userId, userName }) => {
      setPeers(p => [...p.filter(x => x.socketId !== peerId), { socketId: peerId, userId, userName, muted: false }])
      await createOffer(peerId)
    })

    // We joined → connect to existing peers
    sock.on('room-joined', async ({ participants }) => {
      for (const p of participants) {
        setPeers(prev => [...prev.filter(x => x.socketId !== p.socketId), p])
        await createOffer(p.socketId)
      }
    })

    sock.on('offer', async ({ fromSocketId, userName, sdp }) => {
      setPeers(p => p.find(x => x.socketId === fromSocketId) ? p : [...p, { socketId: fromSocketId, userName, muted: false }])
      await handleOffer(fromSocketId, sdp)
    })

    sock.on('answer', async ({ fromSocketId, sdp }) => {
      const pc = peerConns.current[fromSocketId]
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp))
    })

    sock.on('ice-candidate', async ({ fromSocketId, candidate }) => {
      const pc = peerConns.current[fromSocketId]
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
      }
    })

    sock.on('peer-left', ({ socketId }) => {
      closePeer(socketId)
      setPeers(p => p.filter(x => x.socketId !== socketId))
    })

    sock.on('peer-muted', ({ socketId, muted }) => {
      setPeers(p => p.map(x => x.socketId === socketId ? { ...x, muted } : x))
    })

    sock.on('room-updated', ({ participants }) => {
      setPeers(participants.filter(p => p.socketId !== sock.id))
    })

    sock.on('error', ({ message }) => toast.error(message))

    return () => { sock.disconnect(); stopAllMedia() }
  }, [token])

  // ── WebRTC helpers ──────────────────────────────────────────────────────
  async function getLocalStream() {
    if (localStream.current) return localStream.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStream.current = stream
      return stream
    } catch {
      toast.error('Нет доступа к микрофону')
      return null
    }
  }

  function createPeerConnection(remoteSocketId) {
    if (peerConns.current[remoteSocketId]) return peerConns.current[remoteSocketId]
    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConns.current[remoteSocketId] = pc

    // Send ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { targetSocketId: remoteSocketId, candidate })
      }
    }

    // Receive remote audio
    pc.ontrack = ({ streams }) => {
      const stream = streams[0]
      if (!stream) return
      // Mount audio
      let audio = document.getElementById(`audio-${remoteSocketId}`)
      if (!audio) {
        audio = document.createElement('audio')
        audio.id       = `audio-${remoteSocketId}`
        audio.autoplay = true
        audio.style.display = 'none'
        document.body.appendChild(audio)
      }
      audio.srcObject = stream
      // Volume visualisation
      startVisualiser(remoteSocketId, stream)
    }

    pc.onconnectionstatechange = () => {
      if (['disconnected','failed','closed'].includes(pc.connectionState)) {
        closePeer(remoteSocketId)
      }
    }

    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => pc.addTrack(t, localStream.current))
    }
    return pc
  }

  async function createOffer(remoteSocketId) {
    const stream = await getLocalStream()
    if (!stream || !socketRef.current) return
    const pc = createPeerConnection(remoteSocketId)
    if (!pc.getSenders().length) stream.getTracks().forEach(t => pc.addTrack(t, stream))
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socketRef.current.emit('offer', { targetSocketId: remoteSocketId, sdp: offer })
  }

  async function handleOffer(remoteSocketId, sdp) {
    const stream = await getLocalStream()
    if (!stream || !socketRef.current) return
    const pc = createPeerConnection(remoteSocketId)
    if (!pc.getSenders().length) stream.getTracks().forEach(t => pc.addTrack(t, stream))
    await pc.setRemoteDescription(new RTCSessionDescription(sdp))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    socketRef.current.emit('answer', { targetSocketId: remoteSocketId, sdp: answer })
  }

  function closePeer(socketId) {
    const pc = peerConns.current[socketId]
    if (pc) { pc.close(); delete peerConns.current[socketId] }
    const audio = document.getElementById(`audio-${socketId}`)
    if (audio) { audio.srcObject = null; audio.remove() }
    if (analyserRef.current[socketId]) {
      try { analyserRef.current[socketId].ctx.close() } catch {}
      delete analyserRef.current[socketId]
    }
    setSpeaking(s => { const n = { ...s }; delete n[socketId]; return n })
  }

  function stopAllMedia() {
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    Object.keys(peerConns.current).forEach(id => closePeer(id))
    document.querySelectorAll('audio[id^="audio-"]').forEach(a => { a.srcObject = null; a.remove() })
  }

  function startVisualiser(socketId, stream) {
    try {
      const ctx      = new AudioContext()
      const src      = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      src.connect(analyser)
      analyserRef.current[socketId] = { ctx, analyser }
      const buf = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!analyserRef.current[socketId]) return
        analyser.getByteFrequencyData(buf)
        const avg = buf.reduce((a,b) => a+b, 0) / buf.length
        setSpeaking(s => ({ ...s, [socketId]: avg > 10 }))
        requestAnimationFrame(tick)
      }
      tick()
    } catch {}
  }

  // ── Join room ───────────────────────────────────────────────────────────
  const joinRoom = async (room, pin) => {
    if (activeRoom) await leaveRoom()
    try {
      const { data } = await api.post(`/rooms/${room.id}/join`, { pin: pin || undefined })
      setActiveRoom(data)
      setPeers([])
      if (socketRef.current) socketRef.current.emit('join-room', { roomId: room.id, pin: pin || undefined })
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка входа')
    }
  }

  const handleJoin = (room) => {
    if (room.type === 'private') {
      setShowPin(room)
      setPinInput('')
    } else {
      joinRoom(room)
    }
  }

  const submitPin = async () => {
    if (!pinInput) return toast.error('Введите PIN')
    await joinRoom(showPin, pinInput)
    setShowPin(null)
  }

  // ── Leave room ──────────────────────────────────────────────────────────
  const leaveRoom = async () => {
    if (!activeRoom) return
    if (socketRef.current) socketRef.current.emit('leave-room')
    try { await api.post(`/rooms/${activeRoom.id}/leave`) } catch {}
    stopAllMedia()
    setPeers([])
    setActiveRoom(null)
    loadRooms()
  }

  // ── Toggle mute ─────────────────────────────────────────────────────────
  const toggleMute = () => {
    const newMuted = !muted
    setMuted(newMuted)
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = !newMuted })
    if (socketRef.current) socketRef.current.emit('toggle-mute', { muted: newMuted })
  }

  if (!user) return null

  return (
    <div style={{ minHeight:'100%', paddingBottom:'20px' }}>
      {/* Header */}
      <div style={{ padding:'14px', background:'rgba(6,8,17,0.96)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(34,211,238,0.1)', position:'sticky', top:0, zIndex:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={() => navigate(-1)} className="btn-icon"><IC.Back s={18}/></button>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700, letterSpacing:'0.04em', color:'#22d3ee', textShadow:'0 0 10px rgba(34,211,238,0.4)' }}>
              🎙 ГОЛОСОВЫЕ КОМНАТЫ
            </div>
            <div style={{ fontSize:'11px', color:'var(--t3)' }}>WebRTC p2p голос</div>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn btn-sm" style={{ fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'0.04em', gap:'5px', background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.3)', color:'#22d3ee', flexShrink:0 }}>
            <IC.Plus s={13} c="#22d3ee"/> Создать
          </button>
        </div>
      </div>

      {/* Active Room Panel */}
      {activeRoom && (
        <ActiveRoomPanel
          room={activeRoom} peers={peers} muted={muted}
          onToggleMute={toggleMute} onLeave={leaveRoom} speaking={speaking}
          mySocketId={socketRef.current?.id}
          userName={user.firstName || user.username || 'Вы'}
        />
      )}

      {/* Public Rooms List */}
      <div style={{ padding:'14px' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'11px', fontWeight:700, color:'var(--t3)', letterSpacing:'0.12em', marginBottom:'12px' }}>
          ПУБЛИЧНЫЕ КОМНАТЫ ({rooms.length})
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[1,2,3].map(i => <div key={i} className="skel" style={{ height:'80px' }}/>)}
          </div>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign:'center', padding:'50px 20px' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>🎙</div>
            <div style={{ fontFamily:'var(--font-display)', color:'var(--t3)', fontSize:'12px', letterSpacing:'0.1em', marginBottom:'16px' }}>НЕТ АКТИВНЫХ КОМНАТ</div>
            <button onClick={() => setShowCreate(true)} className="btn btn-ghost" style={{ fontFamily:'var(--font-display)', fontSize:'12px', gap:'7px', border:'1px solid rgba(34,211,238,0.3)', color:'#22d3ee' }}>
              <IC.Plus s={14} c="#22d3ee"/> Создать первую комнату
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {rooms.map((room, i) => (
              <RoomCard key={room.id} room={room} onJoin={() => handleJoin(room)}
                isActive={activeRoom?.id === room.id} style={{ animationDelay:`${i*40}ms` }}/>
            ))}
          </div>
        )}
      </div>

      {/* Create room modal */}
      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={(room) => { setShowCreate(false); loadRooms(); handleJoin(room) }}/>}

      {/* PIN modal */}
      {showPin && (
        <Overlay onClose={() => setShowPin(null)}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:700, color:'#e040fb', marginBottom:'8px', letterSpacing:'0.04em' }}>🔒 ЗАКРЫТАЯ КОМНАТА</div>
          <div style={{ fontSize:'13px', color:'var(--t2)', marginBottom:'18px' }}>«{showPin.name}» — введите PIN-код</div>
          <input className="inp" type="number" placeholder="Введите PIN" value={pinInput} onChange={e => setPinInput(e.target.value)}
            onKeyDown={e => e.key==='Enter' && submitPin()}
            style={{ marginBottom:'14px', fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, textAlign:'center', letterSpacing:'0.2em', borderColor:'rgba(224,64,251,0.4)' }}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <button className="btn btn-ghost btn-full" onClick={() => setShowPin(null)} style={{ fontFamily:'var(--font-display)', fontSize:'13px' }}>Отмена</button>
            <button className="btn btn-full btn-pink btn-full" onClick={submitPin} style={{ fontFamily:'var(--font-display)', fontSize:'13px', background:'rgba(224,64,251,0.15)', border:'1px solid rgba(224,64,251,0.4)', color:'#e040fb' }}>
              🔓 Войти
            </button>
          </div>
        </Overlay>
      )}
    </div>
  )
}

// ── Active Room Panel ─────────────────────────────────────────────────────────
function ActiveRoomPanel({ room, peers, muted, onToggleMute, onLeave, speaking, mySocketId, userName }) {
  const allParticipants = [
    { socketId: mySocketId || 'me', userName, muted, isMe: true },
    ...peers,
  ]
  return (
    <div style={{ margin:'14px', marginBottom:'0', borderRadius:'20px', background:'linear-gradient(135deg,rgba(34,211,238,0.1),rgba(6,8,17,0.95))', border:'2px solid rgba(34,211,238,0.3)', overflow:'hidden', boxShadow:'0 8px 32px rgba(34,211,238,0.1)' }}>
      {/* Room info */}
      <div style={{ padding:'16px', borderBottom:'1px solid rgba(34,211,238,0.1)', display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#22d3ee', boxShadow:'0 0 8px #22d3ee', animation:'glowPulse 1.5s ease-in-out infinite', flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'15px', color:'#22d3ee' }}>{room.name}</div>
          <div style={{ fontSize:'11px', color:'var(--t3)' }}>{allParticipants.length} участников</div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onToggleMute} style={{ width:'40px', height:'40px', borderRadius:'12px', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', background: muted ? 'rgba(248,113,113,0.15)' : 'rgba(34,211,238,0.1)', border: `1px solid ${muted ? 'rgba(248,113,113,0.4)' : 'rgba(34,211,238,0.3)'}`, transition:'all 0.2s' }}>
            {muted ? '🔇' : '🎤'}
          </button>
          <button onClick={onLeave} style={{ width:'40px', height:'40px', borderRadius:'12px', border:'1px solid rgba(248,113,113,0.4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(248,113,113,0.1)', transition:'all 0.2s' }}>
            <IC.Exit s={16} c="#f87171"/>
          </button>
        </div>
      </div>

      {/* Participants */}
      <div style={{ padding:'12px 16px', display:'flex', flexWrap:'wrap', gap:'8px' }}>
        {allParticipants.map(p => (
          <ParticipantChip key={p.socketId} participant={p} isSpeaking={speaking[p.socketId]}/>
        ))}
      </div>
    </div>
  )
}

function ParticipantChip({ participant, isSpeaking }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'7px',
      padding:'7px 12px', borderRadius:'100px',
      background: isSpeaking ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${isSpeaking ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.08)'}`,
      boxShadow: isSpeaking ? '0 0 12px rgba(34,211,238,0.3)' : 'none',
      transition:'all 0.15s',
    }}>
      <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'linear-gradient(135deg,#a78bfa,#7c6aff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'white', fontFamily:'var(--font-display)', flexShrink:0 }}>
        {(participant.userName||'?').charAt(0).toUpperCase()}
      </div>
      <span style={{ fontSize:'12px', fontWeight:600, color: isSpeaking ? '#22d3ee' : 'var(--t1)', maxWidth:'90px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {participant.isMe ? 'Вы' : participant.userName}
      </span>
      {participant.muted && <span style={{ fontSize:'12px' }}>🔇</span>}
      {isSpeaking && <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#22d3ee', boxShadow:'0 0 6px #22d3ee' }}/>}
    </div>
  )
}

// ── Room Card ─────────────────────────────────────────────────────────────────
function RoomCard({ room, onJoin, isActive, style }) {
  return (
    <div className="anim-up" style={{ ...style, padding:'14px 16px', borderRadius:'18px', background: isActive ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.07)'}`, display:'flex', alignItems:'center', gap:'12px' }}>
      <div style={{ width:'44px', height:'44px', borderRadius:'13px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
        {room.type === 'private' ? '🔒' : '🌐'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'14px', fontWeight:700, color:'var(--t1)', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {room.name}
        </div>
        <div style={{ fontSize:'11px', color:'var(--t3)', display:'flex', alignItems:'center', gap:'6px' }}>
          <span>{room.count || 0} участников</span>
          <span>·</span>
          <span style={{ color: room.type==='private' ? '#e040fb' : '#22d3ee', fontWeight:600 }}>
            {room.type==='private' ? '🔒 Закрытая' : '🌐 Публичная'}
          </span>
          <span>· {room.ownerName}</span>
        </div>
      </div>
      {!isActive && (
        <button onClick={onJoin} style={{ flexShrink:0, padding:'8px 14px', borderRadius:'100px', border:'none', cursor:'pointer', background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.35)', color:'#22d3ee', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'11px', letterSpacing:'0.05em', transition:'all 0.2s' }}>
          ВОЙТИ
        </button>
      )}
      {isActive && (
        <div style={{ fontSize:'10px', color:'#22d3ee', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.06em' }}>
          ● В ЭФИРЕ
        </div>
      )}
    </div>
  )
}

// ── Create Room Modal ─────────────────────────────────────────────────────────
function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName]     = useState('')
  const [type, setType]     = useState('public')
  const [pin, setPin]       = useState('')
  const [loading, setLoading] = useState(false)

  const create = async () => {
    if (!name.trim()) return toast.error('Введите название')
    if (type === 'private') {
      if (!pin.trim()) return toast.error('Введите PIN-код')
      if (pin.trim().length < 4) return toast.error('PIN минимум 4 символа')
    }
    setLoading(true)
    try {
      const { data } = await api.post('/rooms', { name: name.trim(), type, pin: type === 'private' ? pin.trim() : undefined })
      toast.success(type === 'private' ? `🔒 Комната создана!` : '🌐 Публичная комната создана!')
      onCreated(data)
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setLoading(false)
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:700, color:'#22d3ee', marginBottom:'20px', letterSpacing:'0.04em' }}>
        🎙 СОЗДАТЬ КОМНАТУ
      </div>

      <label style={{ fontSize:'10px', fontWeight:700, color:'var(--t3)', letterSpacing:'0.12em', fontFamily:'var(--font-display)', display:'block', marginBottom:'7px' }}>НАЗВАНИЕ</label>
      <input className="inp" placeholder="Название комнаты..." value={name} onChange={e => setName(e.target.value)} style={{ marginBottom:'16px', borderColor:'rgba(34,211,238,0.3)' }}/>

      <label style={{ fontSize:'10px', fontWeight:700, color:'var(--t3)', letterSpacing:'0.12em', fontFamily:'var(--font-display)', display:'block', marginBottom:'8px' }}>ТИП КОМНАТЫ</label>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'20px' }}>
        {[
          { v:'public',  icon:'🌐', label:'ПУБЛИЧНАЯ',  desc:'Все могут войти',            color:'#22d3ee' },
          { v:'private', icon:'🔒', label:'ЗАКРЫТАЯ',   desc:'Только по PIN-коду',         color:'#e040fb' },
        ].map(t => (
          <button key={t.v} onClick={() => setType(t.v)} style={{
            padding:'12px', borderRadius:'13px', cursor:'pointer',
            background: type===t.v ? `${t.color}12` : 'rgba(255,255,255,0.03)',
            border:`1px solid ${type===t.v ? `${t.color}45` : 'rgba(255,255,255,0.07)'}`,
            color: type===t.v ? t.color : 'var(--t3)',
            transition:'all 0.15s', textAlign:'center',
          }}>
            <div style={{ fontSize:'22px', marginBottom:'4px' }}>{t.icon}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'11px', letterSpacing:'0.06em', marginBottom:'3px' }}>{t.label}</div>
            <div style={{ fontSize:'10px', color:'var(--t3)' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {type === 'private' && (
        <>
          <label style={{ fontSize:'10px', fontWeight:700, color:'var(--t3)', letterSpacing:'0.12em', fontFamily:'var(--font-display)', display:'block', marginBottom:'7px' }}>
            ВАШ PIN-КОД
          </label>
          <input className="inp" placeholder="Например: 1234 или MyRoom" value={pin}
            onChange={e => setPin(e.target.value)}
            maxLength={8}
            style={{ marginBottom:'10px', fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:800, letterSpacing:'0.15em', textAlign:'center', borderColor:'rgba(224,64,251,0.4)' }}/>
          <div style={{ padding:'10px 12px', borderRadius:'11px', background:'rgba(224,64,251,0.08)', border:'1px solid rgba(224,64,251,0.2)', marginBottom:'16px', fontSize:'12px', color:'#e040fb', lineHeight:'1.5' }}>
            🔒 Запомните этот PIN и передайте тем, кого хотите пригласить. Войти в комнату можно только с ним.
          </div>
        </>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'10px' }}>
        <button className="btn btn-ghost btn-full" onClick={onClose} style={{ fontFamily:'var(--font-display)', fontSize:'13px' }}>Отмена</button>
        <button className="btn btn-full" onClick={create} disabled={loading} style={{ fontFamily:'var(--font-display)', fontSize:'13px', gap:'7px', background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.4)', color:'#22d3ee' }}>
          {loading ? <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:'2px solid rgba(34,211,238,0.25)', borderTop:'2px solid #22d3ee', animation:'rotateSpin 0.7s linear infinite' }}/> : '🎙 Создать'}
        </button>
      </div>
    </Overlay>
  )
}

// ── Overlay wrapper ───────────────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(16px)', zIndex:300, display:'flex', alignItems:'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'rgba(8,10,22,0.99)', borderRadius:'24px 24px 0 0', padding:'24px 20px 34px', width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderBottom:'none', boxShadow:'0 -8px 40px rgba(0,0,0,0.7)', animation:'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)', maxHeight:'88dvh', overflowY:'auto' }}>
        <div style={{ width:'36px', height:'3px', borderRadius:'2px', background:'rgba(255,255,255,0.1)', margin:'0 auto 20px' }}/>
        {children}
      </div>
    </div>
  )
}
