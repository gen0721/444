import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC } from '../components/Icons'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'

// ─── Colour palette for chat avatars ─────────────────────────────────────────
const AVATAR_COLORS = ['#7c6aff','#22d3ee','#4ade80','#f472b6','#fbbf24','#f87171','#a78bfa','#38bdf8']
function avatarColor(str = '') {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function timeStr(ts) {
  if (!ts) return ''
  const d = new Date(ts), now = new Date()
  const diffH = (now - d) / 3600000
  if (diffH < 24) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru', { day: '2-digit', month: 'short' })
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ChatsPage() {
  const navigate     = useNavigate()
  const location     = useLocation()
  const { user, token } = useStore()
  const [chats,      setChats]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [activeChat, setActiveChat] = useState(null) // full chat object
  const [showCreate, setShowCreate] = useState(false)
  const [pwModal,    setPwModal]    = useState(null)  // chat waiting for password
  const [pwInput,    setPwInput]    = useState('')
  const [connected,  setConnected]  = useState(false)
  const [messages,   setMessages]   = useState([])   // current chat messages
  const [typing,     setTyping]     = useState([])   // [{userId, userName}]
  const [text,       setText]       = useState('')
  const [memberCount,setMemberCount]= useState(0)

  const sockRef    = useRef(null)
  const bottomRef  = useRef(null)
  const typingTimer= useRef(null)
  const activeChatRef = useRef(null)
  useEffect(() => { activeChatRef.current = activeChat }, [activeChat])

  // ── Load chat list ──────────────────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    try { const { data } = await api.get('/chats'); setChats(data || []) }
    catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    loadChats()
    const t = setInterval(loadChats, 8000)
    return () => clearInterval(t)
  }, [])

  // Auto-open chat from deal page navigation
  useEffect(() => {
    const openChatId = location.state?.openChatId
    if (!openChatId || chats.length === 0) return
    const target = chats.find(c => c.id === openChatId)
    if (target) { doJoinChat(target); return }
    // If not in list (deal chat) - fetch directly
    api.get(`/chats/${openChatId}`).then(({ data }) => {
      if (data) doJoinChat(data)
    }).catch(() => {})
  }, [location.state?.openChatId, chats])

  // ── Socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    const sock = io(window.location.origin, {
      auth: { token }, path: '/socket.io',
      transports: ['websocket','polling'],
      reconnection: true, reconnectionDelay: 1500,
    })
    sockRef.current = sock

    sock.on('connect',    () => { setConnected(true);  if (activeChatRef.current) sock.emit('chat:join', { chatId: activeChatRef.current.id }) })
    sock.on('disconnect', () => setConnected(false))
    sock.on('connect_error', e => console.error('Chat socket error:', e.message))

    sock.on('chat:joined', ({ chatId, messages: msgs, memberCount: mc, isClosed, closedReason }) => {
      setMessages(msgs || [])
      setMemberCount(mc || 0)
      // Update activeChat with closed state
      setActiveChat(prev => prev ? { ...prev, isClosed: isClosed || false, closedReason: closedReason || null } : prev)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    })

    sock.on('chat:message', (msg) => {
      if (msg.chatId !== activeChatRef.current?.id) {
        // Update last message in list for other chats
        setChats(prev => prev.map(c => c.id === msg.chatId
          ? { ...c, lastMessage: { text: msg.text, userName: msg.userName, ts: msg.ts } }
          : c))
        return
      }
      setMessages(prev => [...prev, msg])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
      // Remove typing indicator for this user
      setTyping(prev => prev.filter(t => t.userId !== msg.userId))
    })

    sock.on('chat:typing', ({ userId, userName, typing: t }) => {
      if (!t) { setTyping(prev => prev.filter(u => u.userId !== userId)); return }
      setTyping(prev => {
        if (prev.some(u => u.userId === userId)) return prev
        return [...prev, { userId, userName }]
      })
      // Auto-remove after 3s
      setTimeout(() => setTyping(prev => prev.filter(u => u.userId !== userId)), 3000)
    })

    sock.on('chat:user-joined', ({ userName, memberCount: mc }) => {
      setMemberCount(mc)
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, system: true, text: `${userName} присоединился`, ts: new Date().toISOString() }])
    })

    sock.on('chat:user-left', ({ userName }) => {
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, system: true, text: `${userName} вышел`, ts: new Date().toISOString() }])
    })

    sock.on('chat:deleted', ({ chatId, reason }) => {
      toast(reason || 'Чат удалён', { icon: '🗑', duration: 5000 })
      // If we're in this chat — kick us out
      if (activeChatRef.current?.id === chatId) {
        setActiveChat(null)
        setMessages([])
        setTyping([])
      }
      // Remove from list
      setChats(prev => prev.filter(c => c.id !== chatId))
    })

    sock.on('chat:closed', ({ chatId, reason }) => {
      if (activeChatRef.current?.id === chatId) {
        setActiveChat(prev => prev ? { ...prev, isClosed: true, closedReason: reason } : prev)
        toast('Чат закрыт администратором', { icon: '🔒', duration: 4000 })
      }
    })

    sock.on('chat:error', ({ message }) => toast.error(message))

    return () => { sock.disconnect() }
  }, [token])

  // ── Open chat ────────────────────────────────────────────────────────────────
  const openChat = (chat) => {
    if (chat.type === 'private') {
      // Check if already joined (member)
      if (!chat.members?.includes(user.id)) {
        setPwModal(chat); setPwInput(''); return
      }
    }
    doJoinChat(chat)
  }

  const doJoinChat = (chat, password) => {
    // Leave previous
    if (activeChatRef.current) sockRef.current?.emit('chat:leave')
    setActiveChat(chat)
    setMessages([])
    setTyping([])
    setMemberCount(chat.memberCount || 1)
    sockRef.current?.emit('chat:join', { chatId: chat.id, password })
  }

  const submitPw = async () => {
    if (!pwInput.trim()) return toast.error('Введите пароль')
    // Verify via API first
    try {
      await api.post(`/chats/${pwModal.id}/join`, { password: pwInput.trim() })
      doJoinChat(pwModal, pwInput.trim())
      setPwModal(null)
      loadChats()
    } catch (e) { toast.error(e.response?.data?.error || 'Неверный пароль') }
  }

  const leaveChat = () => {
    sockRef.current?.emit('chat:leave')
    setActiveChat(null); setMessages([]); setTyping([])
  }

  const deleteChat = async (chatId) => {
    if (!window.confirm('Удалить чат? Все сообщения будут удалены.')) return
    try {
      await api.delete(`/chats/${chatId}`)
      toast.success('Чат удалён')
      if (activeChatRef.current?.id === chatId) {
        sockRef.current?.emit('chat:leave')
        setActiveChat(null); setMessages([]); setTyping([])
      }
      setChats(prev => prev.filter(c => c.id !== chatId))
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  const send = () => {
    const t = text.trim()
    if (!t || !activeChat) return
    sockRef.current?.emit('chat:message', { chatId: activeChat.id, text: t })
    setText('')
    clearTimeout(typingTimer.current)
    sockRef.current?.emit('chat:typing', { chatId: activeChat.id, typing: false })
  }

  const onTextChange = (val) => {
    setText(val)
    if (!activeChat) return
    sockRef.current?.emit('chat:typing', { chatId: activeChat.id, typing: true })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      sockRef.current?.emit('chat:typing', { chatId: activeChat.id, typing: false })
    }, 2000)
  }

  if (!user) return null

  // ── Chat view (messages) ──────────────────────────────────────────────────
  if (activeChat) {
    return (
      <ChatView
        chat={activeChat}
        messages={messages}
        user={user}
        typing={typing}
        memberCount={memberCount}
        connected={connected}
        text={text}
        onTextChange={onTextChange}
        onSend={send}
        onBack={leaveChat}
        onDelete={() => deleteChat(activeChat.id)}
        bottomRef={bottomRef}
      />
    )
  }

  // ── Chat list ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100%' }}>
      {/* Header */}
      <div style={{ padding: '14px', background: 'rgba(6,8,17,0.96)', backdropFilter: 'blur(32px)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} className="btn-icon"><IC.Back s={18}/></button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8 }}>
              💬 ЧАТЫ
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#4ade80' : '#f87171', display: 'inline-block', boxShadow: connected ? '0 0 6px #4ade80' : 'none' }}/>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>{chats.length} чатов</div>
          </div>
          <button onClick={() => setShowCreate(true)} style={{ padding: '8px 14px', borderRadius: 100, cursor: 'pointer', background: 'rgba(124,106,255,0.1)', border: '1px solid rgba(124,106,255,0.35)', color: '#a78bfa', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
            <IC.Plus s={13} c="#a78bfa"/> Создать
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="skel" style={{ height: 68, borderRadius: 16, marginBottom: 8 }}/>
          ))
        ) : chats.length === 0 ? (
          <EmptyChats onCreate={() => setShowCreate(true)}/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chats.map((chat, i) => (
              <ChatRow key={chat.id} chat={chat} i={i} userId={user.id}
                onClick={() => openChat(chat)}
                onDelete={() => deleteChat(chat.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateChatModal
          onClose={() => setShowCreate(false)}
          onCreate={async (name, type, password) => {
            try {
              const { data } = await api.post('/chats', { name, type, password })
              setShowCreate(false)
              loadChats()
              doJoinChat(data, password)
              toast.success(type === 'private' ? '🔒 Закрытый чат создан!' : '💬 Чат создан!')
            } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
          }}
        />
      )}

      {pwModal && (
        <PasswordModal
          chat={pwModal}
          value={pwInput}
          onChange={setPwInput}
          onSubmit={submitPw}
          onClose={() => { setPwModal(null); setPwInput('') }}
        />
      )}
    </div>
  )
}

// ─── Chat View (messages screen) ──────────────────────────────────────────────
function ChatView({ chat, messages, user, typing, memberCount, connected, text, onTextChange, onSend, onBack, onDelete, bottomRef }) {
  const color  = avatarColor(chat.name)
  const letter = chat.name.charAt(0).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', background: 'rgba(6,8,17,0.98)', backdropFilter: 'blur(32px)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zIndex: 10 }}>
        <button onClick={onBack} className="btn-icon"><IC.Back s={18}/></button>
        {/* Avatar */}
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color, flexShrink: 0 }}>
          {letter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chat.name}
            {chat.type === 'private' && <span style={{ marginLeft: 6, fontSize: 11, color: '#e040fb' }}>🔒</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#4ade80' : '#f87171', display: 'inline-block' }}/>
            {memberCount} участн.
          </div>
        </div>
        {chat.ownerId === user.id && (
          <button onClick={onDelete} title="Удалить чат" style={{
            width: 36, height: 36, borderRadius: 11, border: '1px solid rgba(248,113,113,0.3)',
            background: 'rgba(248,113,113,0.08)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
          }}>🗑</button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--t3)', fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.08em', marginTop: 40 }}>
            НАЧНИТЕ ПЕРЕПИСКУ
          </div>
        )}
        {messages.map(msg => (
          msg.system
            ? <SystemMsg key={msg.id} text={msg.text}/>
            : <MessageBubble key={msg.id} msg={msg} isMe={msg.userId === user.id}/>
        ))}
        {/* Typing indicator */}
        {typing.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
              {typing[0].userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ padding: '8px 14px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t3)', animation: `blink 1.2s ${i*0.2}s ease-in-out infinite` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Closed chat banner */}
      {chat?.isClosed && (
        <div style={{ margin: '0 14px 8px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🔒</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-display)' }}>ЧАТ ЗАКРЫТ АДМИНИСТРАТОРОМ</div>
            {chat.closedReason && <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{chat.closedReason}</div>}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding: '10px 14px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', background: 'rgba(6,8,17,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
        <textarea
          value={text}
          onChange={e => onTextChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
          placeholder="Сообщение..."
          rows={1}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '10px 14px', color: 'var(--t1)', fontSize: 14,
            outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4,
            maxHeight: 120, overflowY: 'auto',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(124,106,255,0.5)' }}
          onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
        <button
          onClick={onSend}
          disabled={!text.trim()}
          style={{
            width: 42, height: 42, borderRadius: 13, flexShrink: 0, cursor: text.trim() ? 'pointer' : 'default',
            background: text.trim() ? 'linear-gradient(135deg,#7c6aff,#a78bfa)' : 'rgba(255,255,255,0.05)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: text.trim() ? '0 0 16px rgba(124,106,255,0.4)' : 'none',
          }}
        >
          <IC.Send s={18} c={text.trim() ? 'white' : 'var(--t3)'}/>
        </button>
      </div>
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe }) {
  const isAdminMsg  = msg.isAdmin
  const isSystemMsg = msg.isSystem
  const color = isAdminMsg ? '#fbbf24' : avatarColor(msg.userName || '')

  if (isSystemMsg) {
    return (
      <div style={{ textAlign: 'center', margin: '6px 0' }}>
        <span style={{ display: 'inline-block', fontSize: 11, color: '#22d3ee', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '100px', padding: '4px 14px', fontStyle: 'italic' }}>
          {msg.text}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
      {!isMe && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: isAdminMsg ? 'rgba(251,191,36,0.2)' : `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isAdminMsg ? 14 : 11, fontWeight: 800, color, flexShrink: 0, fontFamily: 'var(--font-display)' }}>
          {isAdminMsg ? '👑' : (msg.userName || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        {!isMe && (
          <span style={{ fontSize: 10, color, fontWeight: 700, fontFamily: 'var(--font-display)', paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            {isAdminMsg && <span>👑</span>}
            {msg.userName}
            {isAdminMsg && <span style={{ fontSize: 9, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', padding: '1px 5px', borderRadius: '4px' }}>ADMIN</span>}
          </span>
        )}
        <div style={{
          padding: '9px 14px',
          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isMe
            ? 'linear-gradient(135deg,rgba(124,106,255,0.7),rgba(167,139,250,0.6))'
            : isAdminMsg
              ? 'linear-gradient(135deg,rgba(251,191,36,0.12),rgba(251,191,36,0.06))'
              : 'rgba(255,255,255,0.07)',
          border: isMe
            ? '1px solid rgba(124,106,255,0.4)'
            : isAdminMsg
              ? '1px solid rgba(251,191,36,0.3)'
              : '1px solid rgba(255,255,255,0.08)',
          fontSize: 14, color: isMe ? 'white' : isAdminMsg ? '#fef3c7' : 'var(--t1)',
          lineHeight: 1.45, wordBreak: 'break-word',
          boxShadow: isAdminMsg ? '0 2px 12px rgba(251,191,36,0.15)' : isMe ? '0 4px 16px rgba(124,106,255,0.25)' : 'none',
          backdropFilter: 'blur(8px)',
        }}>
          {msg.text}
        </div>
        <span style={{ fontSize: 10, color: 'var(--t3)', paddingLeft: 4, paddingRight: 4 }}>
          {timeStr(msg.ts)}
        </span>
      </div>
    </div>
  )
}

function SystemMsg({ text }) {
  return (
    <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--t3)', padding: '4px 0', fontStyle: 'italic' }}>
      {text}
    </div>
  )
}

// ─── Chat row in list ─────────────────────────────────────────────────────────
function ChatRow({ chat, i, userId, onClick, onDelete }) {
  const color  = avatarColor(chat.name)
  const letter = chat.name.charAt(0).toUpperCase()
  const isOwner = chat.ownerId === userId
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      borderRadius: 16, cursor: 'pointer',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      transition: 'all 0.15s',
      animation: `fadeUp 0.3s ${i*40}ms both`,
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,106,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(124,106,255,0.2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
    >
      {/* Avatar */}
      <div style={{ width: 46, height: 46, borderRadius: 14, background: `${color}18`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color, flexShrink: 0 }}>
        {letter}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chat.name}
          </span>
          {chat.type === 'private' && <span style={{ fontSize: 10, color: '#e040fb', flexShrink: 0 }}>🔒</span>}
          {isOwner && <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--font-display)', fontWeight: 700, flexShrink: 0 }}>ВЫ</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chat.lastMessageText
            ? `${chat.lastMessageUser}: ${chat.lastMessageText}`
            : `${chat.memberCount} участн. · ${chat.ownerName}`
          }
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        {chat.lastMessageAt && <div style={{ fontSize: 10, color: 'var(--t3)' }}>{timeStr(chat.lastMessageAt)}</div>}
        <div style={{ fontSize: 11, color: 'var(--t3)' }}>{chat.memberCount} 👤</div>
        {chat.ownerId === userId && (
          <button onClick={e => { e.stopPropagation(); onDelete() }} style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: 8, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: '#f87171',
            fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.04em',
          }}>
            🗑
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Create chat modal ────────────────────────────────────────────────────────
function CreateChatModal({ onClose, onCreate }) {
  const [name,     setName]     = useState('')
  const [type,     setType]     = useState('public')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  const create = async () => {
    if (!name.trim()) return toast.error('Введите название')
    if (type === 'private' && password.trim().length < 4) return toast.error('Пароль минимум 4 символа')
    setLoading(true)
    await onCreate(name.trim(), type, type === 'private' ? password.trim() : undefined)
    setLoading(false)
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: '#a78bfa', marginBottom: 20 }}>
        💬 СОЗДАТЬ ЧАТ
      </div>

      {/* Type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { v: 'public',  icon: '🌐', label: 'ПУБЛИЧНЫЙ',  desc: 'Открытый для всех',  color: '#a78bfa' },
          { v: 'private', icon: '🔒', label: 'ПРИВАТНЫЙ',  desc: 'Только по паролю',   color: '#e040fb' },
        ].map(t => (
          <button key={t.v} onClick={() => setType(t.v)} style={{
            padding: '12px', borderRadius: 13, cursor: 'pointer', textAlign: 'center',
            background: type === t.v ? `${t.color}12` : 'rgba(255,255,255,0.03)',
            border: `1px solid ${type === t.v ? `${t.color}45` : 'rgba(255,255,255,0.07)'}`,
            color: type === t.v ? t.color : 'var(--t3)', transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{t.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', marginBottom: 2 }}>{t.label}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <FL>НАЗВАНИЕ ЧАТА</FL>
      <input className="inp" placeholder="Например: CS2 Трейдеры" value={name} onChange={e => setName(e.target.value)}
        style={{ marginBottom: 14 }}/>

      {type === 'private' && (
        <>
          <FL>ПАРОЛЬ ДЛЯ ВХОДА</FL>
          <input className="inp" placeholder="Минимум 4 символа" value={password} onChange={e => setPassword(e.target.value)}
            style={{ marginBottom: 10, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: '0.15em', textAlign: 'center', borderColor: 'rgba(224,64,251,0.4)' }}/>
          <div style={{ padding: '10px 12px', borderRadius: 11, background: 'rgba(224,64,251,0.07)', border: '1px solid rgba(224,64,251,0.2)', marginBottom: 16, fontSize: 12, color: '#e040fb', lineHeight: 1.5 }}>
            🔒 Только люди с паролем смогут войти в чат
          </div>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
        <button className="btn btn-ghost btn-full" onClick={onClose} style={{ fontFamily: 'var(--font-display)', fontSize: 13 }}>Отмена</button>
        <button className="btn btn-violet btn-full" onClick={create} disabled={loading} style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.05em' }}>
          {loading ? <Spin/> : '💬 Создать чат'}
        </button>
      </div>
    </Sheet>
  )
}

// ─── Password modal ───────────────────────────────────────────────────────────
function PasswordModal({ chat, value, onChange, onSubmit, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: '#e040fb', marginBottom: 6 }}>🔒 ЗАКРЫТЫЙ ЧАТ</div>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>«{chat.name}»</div>
      <input className="inp" placeholder="Пароль" value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSubmit()}
        style={{ marginBottom: 16, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, textAlign: 'center', letterSpacing: '0.2em', borderColor: 'rgba(224,64,251,0.4)' }}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button className="btn btn-ghost btn-full" onClick={onClose} style={{ fontFamily: 'var(--font-display)', fontSize: 13 }}>Отмена</button>
        <button className="btn btn-full" onClick={onSubmit} style={{ fontFamily: 'var(--font-display)', fontSize: 13, background: 'rgba(224,64,251,0.1)', border: '1px solid rgba(224,64,251,0.4)', color: '#e040fb' }}>
          🔓 Войти
        </button>
      </div>
    </Sheet>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyChats({ onCreate }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>💬</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: 18 }}>НЕТ ЧАТОВ</div>
      <button onClick={onCreate} style={{ padding: '10px 22px', borderRadius: 100, cursor: 'pointer', background: 'rgba(124,106,255,0.1)', border: '1px solid rgba(124,106,255,0.35)', color: '#a78bfa', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        <IC.Plus s={14} c="#a78bfa"/> Создать первый чат
      </button>
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function Sheet({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, top: 0, left: 0, right: 0, bottom: 0, height: '100dvh', background: 'rgba(8,10,22,0.99)', backdropFilter: 'blur(16px)', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'calc(24px + env(safe-area-inset-bottom,16px))', width: '100%', overflowY: 'auto', animation: 'slideUp 0.28s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 20px' }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}/>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
function FL({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(167,139,250,0.4)', letterSpacing: '0.14em', fontFamily: 'var(--font-display)', marginBottom: 7 }}>{children}</div>
}
function Spin() {
  return <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', animation: 'rotateSpin 0.7s linear infinite', display: 'inline-block' }}/>
}
