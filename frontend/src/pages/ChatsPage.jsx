import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC } from '../components/Icons'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'

// ── helpers ───────────────────────────────────────────────────────────────────
const PAL = ['#7c6aff','#22d3ee','#4ade80','#f472b6','#fbbf24','#f87171','#a78bfa','#38bdf8']
const pal = s => { let h=0; for(const c of s) h=(h*31+c.charCodeAt(0))|0; return PAL[Math.abs(h)%PAL.length] }
const fmt = ts => { if(!ts) return ''; const d=new Date(ts),n=new Date(); return (n-d)<86400000 ? d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}) : d.toLocaleDateString('ru',{day:'2-digit',month:'short'}) }

// ── styles ─────────────────────────────────────────────────────────────────────
const S = {
  screen:  { position:'fixed', inset:0, zIndex:50, display:'flex', flexDirection:'column', background:'#060811' },
  header:  { padding:'12px 14px', paddingTop:'calc(12px + env(safe-area-inset-top,0px))', background:'rgba(6,8,17,0.98)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:10, flexShrink:0 },
  iconBtn: { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.6)', flexShrink:0 },
  msgs:    { flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8, WebkitOverflowScrolling:'touch' },
  inp:     { padding:'10px 14px', paddingBottom:'calc(10px + env(safe-area-inset-bottom,0px))', background:'rgba(6,8,17,0.98)', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:8, alignItems:'flex-end', flexShrink:0 },
}

export default function ChatsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token } = useStore()

  const [chats,       setChats]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState('list') // 'list' | 'chat' | 'create' | 'pw'
  const [activeChat,  setActiveChat]  = useState(null)
  const [pwTarget,    setPwTarget]    = useState(null)
  const [pwInput,     setPwInput]     = useState('')
  const [connected,   setConnected]   = useState(false)
  const [messages,    setMessages]    = useState([])
  const [typing,      setTyping]      = useState([])
  const [text,        setText]        = useState('')
  const [memberCount, setMemberCount] = useState(0)

  const sock      = useRef(null)
  const bottom    = useRef(null)
  const tyTimer   = useRef(null)
  const chatRef   = useRef(null)
  const pending   = useRef(null)   // join payload queued before connect
  const joined    = useRef(new Set())

  useEffect(() => { chatRef.current = activeChat }, [activeChat])

  // ── load chat list ───────────────────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    try { const { data } = await api.get('/chats'); setChats(Array.isArray(data) ? data : []) }
    catch(e) { console.error('loadChats:', e.message) }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    loadChats()
    const t = setInterval(loadChats, 10000)
    return () => clearInterval(t)
  }, [])

  // ── socket ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    const s = io(window.location.origin, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket','polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      timeout: 15000,
    })
    sock.current = s

    s.on('connect', () => {
      setConnected(true)
      if (pending.current)         { s.emit('chat:join', pending.current); pending.current = null }
      else if (chatRef.current)    { s.emit('chat:join', { chatId: chatRef.current.id }) }
    })
    s.on('disconnect', () => setConnected(false))
    s.on('connect_error', e => console.error('socket err:', e.message))

    s.on('chat:joined', ({ chatId, messages: msgs, memberCount: mc, isClosed, closedReason }) => {
      setMessages(msgs || [])
      setMemberCount(mc || 0)
      setActiveChat(p => p ? { ...p, isClosed: isClosed||false, closedReason: closedReason||null } : p)
      requestAnimationFrame(() => bottom.current?.scrollIntoView({ behavior:'smooth' }))
    })

    s.on('chat:message', msg => {
      if (msg.chatId !== chatRef.current?.id) {
        setChats(p => p.map(c => c.id===msg.chatId ? { ...c, lastMessageText:msg.text, lastMessageUser:msg.userName, lastMessageAt:msg.ts } : c))
        return
      }
      setMessages(p => [...p, msg])
      setTyping(p => p.filter(u => u.userId !== msg.userId))
      requestAnimationFrame(() => bottom.current?.scrollIntoView({ behavior:'smooth' }))
    })

    s.on('chat:typing', ({ userId, userName, typing: t }) => {
      if (!t) { setTyping(p => p.filter(u => u.userId !== userId)); return }
      setTyping(p => p.some(u => u.userId===userId) ? p : [...p, { userId, userName }])
      setTimeout(() => setTyping(p => p.filter(u => u.userId !== userId)), 3000)
    })

    s.on('chat:user-joined', ({ memberCount: mc }) => setMemberCount(mc))
    s.on('chat:user-left',   ({ memberCount: mc }) => setMemberCount(mc || 0))

    s.on('chat:warning', ({ chatId, message, countdown }) => {
      if (chatRef.current?.id === chatId) {
        toast(message, { icon: '⚠️', duration: countdown ? countdown * 1000 : 8000 })
      }
    })

    s.on('chat:closed', ({ chatId, reason }) => {
      if (chatRef.current?.id === chatId) {
        setActiveChat(p => p ? { ...p, isClosed:true, closedReason:reason } : p)
        toast.error(reason || 'Чат закрыт', { duration: 5000 })
      }
    })

    s.on('chat:deleted', ({ chatId, reason }) => {
      if (chatRef.current?.id === chatId) {
        toast(reason || 'Чат удалён', { icon: '🗑', duration: 5000 })
        setActiveChat(null); setMessages([]); setTyping([]); setView('list')
      }
      setChats(p => p.filter(c => c.id !== chatId))
    })

    s.on('chat:error', ({ message }) => toast.error(message))

    return () => { s.disconnect(); sock.current = null }
  }, [token])

  // ── auto-open from deal ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = location.state?.openChatId
    if (!id) return
    const tryOpen = async () => {
      let c = chats.find(x => x.id === id)
      if (!c) { try { const { data } = await api.get(`/chats/${id}`); c = data } catch {} }
      if (c) joinChat(c)
    }
    if (chats.length > 0 || !loading) tryOpen()
  }, [location.state?.openChatId, loading])

  // ── actions ────────────────────────────────────────────────────────────────
  const joinChat = (chat, pw) => {
    if (chatRef.current) sock.current?.emit('chat:leave')
    setActiveChat(chat)
    setMessages([])
    setTyping([])
    setMemberCount(chat.memberCount || 0)
    setView('chat')
    joined.current.add(chat.id)
    const payload = { chatId: chat.id, ...(pw ? { password: pw } : {}) }
    if (sock.current?.connected) sock.current.emit('chat:join', payload)
    else pending.current = payload
  }

  const openChat = chat => {
    if (chat.type === 'private' && !joined.current.has(chat.id)) {
      setPwTarget(chat); setPwInput(''); setView('pw'); return
    }
    joinChat(chat)
  }

  const submitPw = async () => {
    if (!pwInput.trim()) return toast.error('Введите пароль')
    try {
      await api.post(`/chats/${pwTarget.id}/join`, { password: pwInput.trim() })
      joinChat(pwTarget, pwInput.trim())
    } catch(e) { toast.error(e.response?.data?.error || 'Неверный пароль') }
  }

  const leaveChat = () => {
    sock.current?.emit('chat:leave')
    setActiveChat(null); setMessages([]); setTyping([]); setView('list')
  }

  const deleteChat = async id => {
    if (!window.confirm('Удалить чат?')) return
    try {
      await api.delete(`/chats/${id}`)
      toast.success('Удалено')
      if (chatRef.current?.id === id) { sock.current?.emit('chat:leave'); setActiveChat(null); setMessages([]); setView('list') }
      setChats(p => p.filter(c => c.id !== id))
    } catch(e) { toast.error(e.response?.data?.error || 'Ошибка') }
  }

  const send = () => {
    const t = text.trim()
    if (!t || !activeChat) return
    sock.current?.emit('chat:message', { chatId: activeChat.id, text: t })
    setText('')
    clearTimeout(tyTimer.current)
    sock.current?.emit('chat:typing', { chatId: activeChat.id, typing: false })
  }

  const onType = v => {
    setText(v)
    if (!activeChat) return
    sock.current?.emit('chat:typing', { chatId: activeChat.id, typing: true })
    clearTimeout(tyTimer.current)
    tyTimer.current = setTimeout(() => sock.current?.emit('chat:typing', { chatId: activeChat.id, typing: false }), 2000)
  }

  if (!user) return null

  // ── VIEWS ──────────────────────────────────────────────────────────────────
  if (view === 'chat' && activeChat) return (
    <ChatScreen
      chat={activeChat} messages={messages} user={user}
      typing={typing} memberCount={memberCount} connected={connected}
      text={text} onType={onType} onSend={send}
      onBack={leaveChat} onDelete={() => deleteChat(activeChat.id)}
      bottomRef={bottom}
    />
  )

  if (view === 'create') return (
    <CreateScreen onClose={() => setView('list')} onCreate={async (name, type, pw) => {
      try {
        const { data } = await api.post('/chats', { name, type, password: pw })
        setView('list'); loadChats(); joinChat(data, pw)
        toast.success(type==='private' ? '🔒 Чат создан' : '💬 Чат создан')
      } catch(e) { toast.error(e.response?.data?.error || 'Ошибка') }
    }}/>
  )

  if (view === 'pw' && pwTarget) return (
    <PwScreen chat={pwTarget} pw={pwInput} setPw={setPwInput}
      onCancel={() => setView('list')} onSubmit={submitPw}/>
  )

  // ── LIST ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100%', paddingBottom:80 }}>
      <div style={{ ...S.header, position:'sticky', top:0, zIndex:40 }}>
        <button onClick={() => navigate(-1)} style={S.iconBtn}><IC.Back s={18}/></button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:800, letterSpacing:'0.04em', display:'flex', alignItems:'center', gap:8 }}>
            💬 ЧАТЫ
            <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:connected?'#4ade80':'rgba(255,255,255,0.2)', boxShadow:connected?'0 0 6px #4ade80':'' }}/>
          </div>
          <div style={{ fontSize:11, color:'var(--t3)' }}>{chats.length} чатов</div>
        </div>
        <button onClick={() => setView('create')} style={{ padding:'8px 14px', borderRadius:100, cursor:'pointer', background:'rgba(124,106,255,0.1)', border:'1px solid rgba(124,106,255,0.35)', color:'#a78bfa', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, display:'flex', alignItems:'center', gap:6 }}>
          <IC.Plus s={13} c="#a78bfa"/> Создать
        </button>
      </div>

      <div style={{ padding:'12px 14px' }}>
        {loading
          ? Array(4).fill(0).map((_,i) => <div key={i} style={{ height:68, borderRadius:16, marginBottom:8, background:'rgba(255,255,255,0.04)', animation:'pulse 1.5s ease-in-out infinite' }}/>)
          : chats.length === 0
            ? <Empty onCreate={() => setView('create')}/>
            : chats.map((c,i) => <ChatRow key={c.id} chat={c} i={i} userId={user.id} onClick={() => openChat(c)} onDelete={() => deleteChat(c.id)}/>)
        }
      </div>
    </div>
  )
}

// ── CHAT SCREEN ────────────────────────────────────────────────────────────────
function ChatScreen({ chat, messages, user, typing, memberCount, connected, text, onType, onSend, onBack, onDelete, bottomRef }) {
  const color = pal(chat.name)
  return (
    <div style={S.screen}>
      {/* Header */}
      <div style={S.header}>
        <button onClick={onBack} style={S.iconBtn}><IC.Back s={18}/></button>
        <div style={{ width:38, height:38, borderRadius:12, background:`${color}22`, border:`1px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:17, color, flexShrink:0 }}>
          {chat.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6 }}>
            {chat.name}
            {chat.type==='private' && <span style={{ fontSize:11 }}>🔒</span>}
            {chat.dealId && <span style={{ fontSize:9, background:'rgba(167,139,250,0.15)', color:'#a78bfa', padding:'1px 6px', borderRadius:4, fontFamily:'var(--font-display)', fontWeight:700, flexShrink:0 }}>СДЕЛКА</span>}
          </div>
          <div style={{ fontSize:11, color:'var(--t3)', display:'flex', alignItems:'center', gap:5, marginTop:1 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:connected?'#4ade80':'#f87171', flexShrink:0, boxShadow:connected?'0 0 4px #4ade80':'' }}/>
            {connected ? `${memberCount} участн.` : 'Подключение...'}
          </div>
        </div>
        {chat.ownerId === user.id && (
          <button onClick={onDelete} style={{ ...S.iconBtn, borderColor:'rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.08)', color:'#f87171' }}>🗑</button>
        )}
      </div>

      {/* Closed banner */}
      {chat.isClosed && (
        <div style={{ margin:'8px 14px 0', padding:'10px 14px', borderRadius:12, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
          <span style={{ fontSize:20 }}>🔒</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#f87171', fontFamily:'var(--font-display)' }}>ЧАТ ЗАКРЫТ</div>
            {chat.closedReason && <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{chat.closedReason}</div>}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={S.msgs}>
        {!connected && messages.length===0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--t3)', fontFamily:'var(--font-display)', fontSize:12, gap:12, paddingTop:60 }}>
            <div style={{ fontSize:40 }}>🔌</div>ПОДКЛЮЧЕНИЕ...
          </div>
        )}
        {connected && messages.length===0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--t3)', fontFamily:'var(--font-display)', fontSize:12, gap:12, paddingTop:60 }}>
            <div style={{ fontSize:40 }}>💬</div>НАЧНИТЕ ПЕРЕПИСКУ
          </div>
        )}
        {messages.map((msg, i) =>
          (msg.isSystem || msg.system)
            ? <SysMsg key={msg.id||i} text={msg.text}/>
            : <Bubble key={msg.id||i} msg={msg} isMe={msg.userId===user.id}/>
        )}
        {typing.length > 0 && (
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'var(--t3)' }}>
              {typing[0].userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ padding:'8px 14px', borderRadius:'18px 18px 18px 4px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:4, alignItems:'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--t3)', animation:`blink 1.2s ${i*0.2}s ease-in-out infinite` }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      {!chat.isClosed
        ? <div style={S.inp}>
            <textarea value={text} onChange={e => onType(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); onSend() }}}
              placeholder="Сообщение..." rows={1}
              style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:'10px 14px', color:'var(--t1)', fontSize:14, outline:'none', resize:'none', fontFamily:'inherit', lineHeight:1.4, maxHeight:100, overflowY:'auto' }}
              onFocus={e => e.target.style.borderColor='rgba(124,106,255,0.5)'}
              onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}
            />
            <button onClick={onSend} disabled={!text.trim()} style={{ width:42, height:42, borderRadius:13, flexShrink:0, cursor:text.trim()?'pointer':'default', background:text.trim()?'linear-gradient(135deg,#7c6aff,#a78bfa)':'rgba(255,255,255,0.05)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:text.trim()?'0 0 16px rgba(124,106,255,0.4)':'none', transition:'all 0.2s' }}>
              <IC.Send s={18} c={text.trim()?'white':'var(--t3)'}/>
            </button>
          </div>
        : <div style={{ padding:'12px 14px', paddingBottom:'calc(12px + env(safe-area-inset-bottom,0px))', background:'rgba(6,8,17,0.98)', borderTop:'1px solid rgba(255,255,255,0.07)', textAlign:'center', color:'#f87171', fontSize:12, fontFamily:'var(--font-display)', letterSpacing:'0.06em', flexShrink:0 }}>
            🔒 ЧАТ ЗАКРЫТ — СООБЩЕНИЯ НЕДОСТУПНЫ
          </div>
      }
    </div>
  )
}

// ── CREATE SCREEN ──────────────────────────────────────────────────────────────
function CreateScreen({ onClose, onCreate }) {
  const [name, setName]         = useState('')
  const [type, setType]         = useState('public')
  const [pw,   setPw]           = useState('')
  const [busy, setBusy]         = useState(false)

  const go = async () => {
    if (!name.trim()) return toast.error('Введите название')
    if (type==='private' && pw.trim().length < 4) return toast.error('Пароль минимум 4 символа')
    setBusy(true)
    await onCreate(name.trim(), type, type==='private' ? pw.trim() : undefined)
    setBusy(false)
  }

  return (
    <div style={{ minHeight:'100%', paddingBottom:80 }}>
      <div style={{ ...S.header, position:'sticky', top:0, zIndex:40 }}>
        <button onClick={onClose} style={S.iconBtn}><IC.Back s={18}/></button>
        <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:800, color:'#a78bfa' }}>СОЗДАТЬ ЧАТ</div>
      </div>
      <div style={{ padding:'20px 16px' }}>

        {/* Type selector */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
          {[
            { v:'public',  icon:'🌐', title:'ПУБЛИЧНЫЙ',  desc:'Виден всем · удаляется через 5 мин без участников', color:'#a78bfa' },
            { v:'private', icon:'🔒', title:'ПРИВАТНЫЙ',  desc:'Только по паролю · удаляется через 1 мин без участников', color:'#e040fb' },
          ].map(t => (
            <button key={t.v} onClick={() => setType(t.v)} style={{ padding:'14px 12px', borderRadius:14, cursor:'pointer', textAlign:'center', background:type===t.v?`${t.color}12`:'rgba(255,255,255,0.03)', border:`2px solid ${type===t.v?t.color:'rgba(255,255,255,0.07)'}`, color:type===t.v?t.color:'var(--t3)', transition:'all 0.15s' }}>
              <div style={{ fontSize:26, marginBottom:6 }}>{t.icon}</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:11, letterSpacing:'0.06em', marginBottom:4 }}>{t.title}</div>
              <div style={{ fontSize:10, color:'var(--t3)', lineHeight:1.4 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Notice */}
        <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(251,191,36,0.07)', border:'1px solid rgba(251,191,36,0.2)', marginBottom:20, fontSize:12, color:'#fbbf24', lineHeight:1.5 }}>
          ⚠️ {type==='public'
            ? 'Публичный чат удалится автоматически через 5 минут, если в нём никого не останется. Последний участник получит предупреждение.'
            : 'Приватный чат удалится через 1 минуту если все участники покинут его.'}
        </div>

        <div style={{ fontSize:10, fontWeight:700, color:'rgba(167,139,250,0.5)', letterSpacing:'0.14em', fontFamily:'var(--font-display)', marginBottom:8 }}>НАЗВАНИЕ ЧАТА</div>
        <input className="inp" placeholder="Например: CS2 Торговля" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom:16 }}/>

        {type==='private' && <>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(224,64,251,0.5)', letterSpacing:'0.14em', fontFamily:'var(--font-display)', marginBottom:8 }}>ПАРОЛЬ ДЛЯ ВХОДА</div>
          <input className="inp" placeholder="Минимум 4 символа" value={pw} onChange={e => setPw(e.target.value)}
            style={{ marginBottom:20, fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, letterSpacing:'0.2em', textAlign:'center', borderColor:'rgba(224,64,251,0.35)' }}/>
        </>}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10, marginTop:4 }}>
          <button className="btn btn-ghost btn-full" onClick={onClose} style={{ fontFamily:'var(--font-display)' }}>Отмена</button>
          <button className="btn btn-full" onClick={go} disabled={busy} style={{ fontFamily:'var(--font-display)', background:'linear-gradient(135deg,#7c6aff,#a78bfa)', boxShadow:'0 0 20px rgba(124,106,255,0.35)' }}>
            {busy ? <Spin/> : (type==='private' ? '🔒 Создать приватный' : '💬 Создать публичный')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PW SCREEN ─────────────────────────────────────────────────────────────────
function PwScreen({ chat, pw, setPw, onCancel, onSubmit }) {
  return (
    <div style={{ minHeight:'100%', paddingBottom:80 }}>
      <div style={{ ...S.header, position:'sticky', top:0, zIndex:40 }}>
        <button onClick={onCancel} style={S.iconBtn}><IC.Back s={18}/></button>
        <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800, color:'#e040fb' }}>ВХОД В ЧАТ</div>
      </div>
      <div style={{ padding:'32px 16px' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:10 }}>🔒</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'var(--t1)', marginBottom:6 }}>{chat.name}</div>
          <div style={{ fontSize:13, color:'var(--t3)' }}>Введите пароль для входа</div>
        </div>
        <input className="inp" placeholder="Пароль" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key==='Enter' && onSubmit()}
          style={{ marginBottom:16, fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, textAlign:'center', letterSpacing:'0.25em', borderColor:'rgba(224,64,251,0.4)' }}/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <button className="btn btn-ghost btn-full" onClick={onCancel} style={{ fontFamily:'var(--font-display)' }}>Отмена</button>
          <button className="btn btn-full" onClick={onSubmit} style={{ fontFamily:'var(--font-display)', background:'linear-gradient(135deg,#e040fb,#a78bfa)', boxShadow:'0 0 20px rgba(224,64,251,0.3)' }}>
            🔓 Войти
          </button>
        </div>
      </div>
    </div>
  )
}

// ── COMPONENTS ─────────────────────────────────────────────────────────────────
function SysMsg({ text }) {
  return (
    <div style={{ textAlign:'center', margin:'4px 0' }}>
      <span style={{ display:'inline-block', fontSize:11, color:'#22d3ee', background:'rgba(34,211,238,0.07)', border:'1px solid rgba(34,211,238,0.18)', borderRadius:100, padding:'4px 16px', fontStyle:'italic' }}>{text}</span>
    </div>
  )
}

function Bubble({ msg, isMe }) {
  const isAdmin = msg.isAdmin
  const c = isAdmin ? '#fbbf24' : pal(msg.userName||'?')
  return (
    <div style={{ display:'flex', flexDirection:isMe?'row-reverse':'row', gap:8, alignItems:'flex-end' }}>
      {!isMe && (
        <div style={{ width:28, height:28, borderRadius:'50%', background:isAdmin?'rgba(251,191,36,0.18)':`${c}18`, border:`1px solid ${c}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:isAdmin?14:11, fontWeight:800, color:c, flexShrink:0 }}>
          {isAdmin ? '👑' : (msg.userName||'?').charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{ maxWidth:'76%', display:'flex', flexDirection:'column', gap:3, alignItems:isMe?'flex-end':'flex-start' }}>
        {!isMe && (
          <div style={{ fontSize:10, color:c, fontWeight:700, fontFamily:'var(--font-display)', paddingLeft:4, display:'flex', alignItems:'center', gap:4 }}>
            {isAdmin && '👑 '}{msg.userName}
            {isAdmin && <span style={{ fontSize:9, background:'rgba(251,191,36,0.12)', color:'#fbbf24', padding:'1px 5px', borderRadius:4 }}>ADMIN</span>}
          </div>
        )}
        <div style={{ padding:'9px 14px', borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px', background:isMe?'linear-gradient(135deg,rgba(124,106,255,0.85),rgba(167,139,250,0.75))':isAdmin?'rgba(251,191,36,0.08)':'rgba(255,255,255,0.07)', border:isMe?'1px solid rgba(124,106,255,0.4)':isAdmin?'1px solid rgba(251,191,36,0.25)':'1px solid rgba(255,255,255,0.08)', fontSize:14, color:isMe?'#fff':isAdmin?'#fef3c7':'var(--t1)', lineHeight:1.45, wordBreak:'break-word' }}>
          {msg.text}
        </div>
        <span style={{ fontSize:10, color:'var(--t3)', paddingLeft:4, paddingRight:4 }}>{fmt(msg.ts||msg.createdAt)}</span>
      </div>
    </div>
  )
}

function ChatRow({ chat, i, userId, onClick, onDelete }) {
  const c = pal(chat.name)
  const typeLabel = chat.type === 'private' ? '🔒' : '🌐'
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:16, cursor:'pointer', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', marginBottom:6, transition:'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.background='rgba(124,106,255,0.07)'; e.currentTarget.style.borderColor='rgba(124,106,255,0.22)' }}
      onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)' }}
    >
      <div style={{ width:46, height:46, borderRadius:14, background:`${c}18`, border:`1px solid ${c}35`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:c, flexShrink:0 }}>
        {chat.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{chat.name}</span>
          <span style={{ fontSize:12, flexShrink:0 }}>{typeLabel}</span>
          {chat.isClosed && <span style={{ fontSize:10, color:'#f87171', flexShrink:0, fontFamily:'var(--font-display)', fontWeight:700 }}>ЗАКРЫТ</span>}
          {chat.dealId   && <span style={{ fontSize:9, background:'rgba(167,139,250,0.15)', color:'#a78bfa', padding:'1px 6px', borderRadius:4, fontFamily:'var(--font-display)', fontWeight:700, flexShrink:0 }}>СДЕЛКА</span>}
        </div>
        <div style={{ fontSize:12, color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {chat.lastMessageText ? `${chat.lastMessageUser}: ${chat.lastMessageText}` : `${chat.memberCount} участн.`}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
        {chat.lastMessageAt && <span style={{ fontSize:10, color:'var(--t3)' }}>{fmt(chat.lastMessageAt)}</span>}
        <span style={{ fontSize:11, color:'var(--t3)' }}>{chat.memberCount}👤</span>
        {chat.ownerId===userId && (
          <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:8, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#f87171', fontFamily:'var(--font-display)', fontWeight:700 }}>🗑</button>
        )}
      </div>
    </div>
  )
}

function Empty({ onCreate }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:56, marginBottom:14 }}>💬</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:20 }}>НЕТ АКТИВНЫХ ЧАТОВ</div>
      <button onClick={onCreate} style={{ padding:'10px 24px', borderRadius:100, cursor:'pointer', background:'rgba(124,106,255,0.1)', border:'1px solid rgba(124,106,255,0.35)', color:'#a78bfa', fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, display:'inline-flex', alignItems:'center', gap:8 }}>
        <IC.Plus s={14} c="#a78bfa"/> Создать первый чат
      </button>
    </div>
  )
}

function Spin() {
  return <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)', borderTop:'2px solid white', animation:'rotateSpin 0.7s linear infinite', display:'inline-block', verticalAlign:'middle' }}/>
}
