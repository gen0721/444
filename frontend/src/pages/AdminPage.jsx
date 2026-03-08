import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC, GameLogo } from '../components/Icons'
import toast from 'react-hot-toast'

const TABS = [
  { id:'stats',     l:'Статы',    Icon:IC.Diamond },
  { id:'online',    l:'Онлайн',   Icon:IC.User    },
  { id:'users',     l:'Юзеры',    Icon:IC.Shield  },
  { id:'deals',     l:'Сделки',   Icon:IC.Chat    },
  { id:'prods',     l:'Товары',   Icon:IC.Crown   },
  { id:'chats',     l:'Чаты',     Icon:IC.Chat    },
  { id:'subadmins', l:'Субадмины',Icon:IC.Shield  },
  { id:'broadcast', l:'Рассылка', Icon:IC.Send    },
]

export default function AdminPage() {
  const navigate  = useNavigate()
  const { user }  = useStore()
  const [tab,     setTab]     = useState('stats')
  const [stats,   setStats]   = useState(null)
  const [users,   setUsers]   = useState([])
  const [online,  setOnline]  = useState([])
  const [deals,   setDeals]   = useState([])
  const [prods,   setProds]   = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  const [loading, setLoading] = useState(false)
  const [search,  setSearch]  = useState('')

  // Balance modal
  const [balModal,  setBalModal]  = useState(null)
  const [balAmt,    setBalAmt]    = useState('')
  const [balReason, setBalReason] = useState('')
  const [balMode,   setBalMode]   = useState('add')
  const [working,   setWorking]   = useState(false)

  // Message (deal) modal
  const [msgModal, setMsgModal] = useState(null)
  const [msgText,  setMsgText]  = useState('')

  // Broadcast modal
  const [bcTitle,  setBcTitle]  = useState('')
  const [bcText,   setBcText]   = useState('')
  const [bcType,   setBcType]   = useState('all')
  const [bcUser,   setBcUser]   = useState('')
  const [bcWorking,setBcWorking]= useState(false)

  const isMainAdmin = user?.isMainAdmin

  // Ban modal
  const [banModal,  setBanModal]  = useState(null) // user object
  const [banType,   setBanType]   = useState('permanent') // 'permanent'|'timed'|'date'
  const [banDur,    setBanDur]    = useState('7')
  const [banUnit,   setBanUnit]   = useState('days')
  const [banDate,   setBanDate]   = useState('')
  const [banReason2,setBanReason2]= useState('')

  // Subadmins tab
  const [subadmins, setSubadmins] = useState([])

  // Chats tab
  const [chats, setChats] = useState([])

  useEffect(() => { loadTab(tab) }, [tab])

  const loadTab = async (t) => {
    setLoading(true)
    try {
      if (t === 'stats')     { const { data } = await api.get('/admin/stats');                           setStats(data) }
      if (t === 'online')    { const { data } = await api.get('/admin/online');                          setOnline(data.users || []) }
      if (t === 'users')     { const { data } = await api.get('/admin/users', { params:{ search: search || undefined, limit:50 } }); setUsers(data.users || data || []) }
      if (t === 'deals')     { const { data } = await api.get('/admin/deals', { params:{ limit:50 } });  setDeals(data.deals || data || []) }
      if (t === 'prods')     { const { data } = await api.get('/admin/products', { params:{ limit:50 } }); setProds(data.products || data || []) }
      if (t === 'broadcast') {
        const [bcRes, usersRes] = await Promise.all([
          api.get('/admin/broadcasts'),
          api.get('/admin/users', { params:{ limit: 200 } }),
        ])
        setBroadcasts(bcRes.data || [])
        setUsers(usersRes.data?.users || usersRes.data || [])
      }
      if (t === 'subadmins') {
        const [saRes, usersRes] = await Promise.all([
          api.get('/admin/subadmins'),
          api.get('/admin/users', { params:{ limit: 200 } }),
        ])
        setSubadmins(saRes.data || [])
        setUsers(usersRes.data?.users || usersRes.data || [])
      }
      if (t === 'chats')     { const { data } = await api.get('/admin/chats');                            setChats(data || []) }
    } catch (e) { console.error('loadTab error:', e.message) }
    setLoading(false)
  }

  const openBanModal = (u) => {
    if (u.isBanned) {
      // Unban directly
      api.post(`/admin/users/${u.id}/unban`)
        .then(() => { toast.success('✅ Пользователь разбанен'); loadTab('users') })
        .catch(e => toast.error(e.response?.data?.error || 'Ошибка'))
    } else {
      setBanModal(u); setBanType('permanent'); setBanDur('7'); setBanUnit('days'); setBanDate(''); setBanReason2('')
    }
  }

  const submitBan = async () => {
    if (!banModal) return
    try {
      await api.post(`/admin/users/${banModal.id}/ban`, {
        type:     banType,
        duration: banType === 'timed' ? parseInt(banDur) : undefined,
        unit:     banType === 'timed' ? banUnit : undefined,
        until:    banType === 'date'  ? banDate : undefined,
        reason:   banReason2 || undefined,
      })
      toast.success('🔒 Пользователь заблокирован')
      setBanModal(null)
      loadTab('users')
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
  }

  const addSubAdmin = async (userId) => {
    try {
      await api.post('/admin/subadmin/add', { userId })
      toast.success('👑 Субадмин добавлен'); loadTab('subadmins'); loadTab('users')
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
  }

  const removeSubAdmin = async (userId) => {
    try {
      await api.post('/admin/subadmin/remove', { userId })
      toast.success('Права субадмина сняты'); loadTab('subadmins'); loadTab('users')
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
  }

  const closeChat = async (chatId) => {
    const reason = prompt('Причина закрытия (необязательно):')
    if (reason === null) return
    try {
      await api.post(`/admin/chats/${chatId}/close`, { reason: reason || undefined })
      toast.success('🔒 Чат закрыт'); loadTab('chats')
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
  }

  const reopenChat = async (chatId) => {
    try {
      await api.post(`/admin/chats/${chatId}/reopen`)
      toast.success('✅ Чат открыт снова'); loadTab('chats')
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
  }

  const deleteProduct = async (id) => {
    if (!confirm('Удалить товар?')) return
    try { await api.delete(`/admin/products/${id}`); toast.success('Удалён'); loadTab('prods') }
    catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
  }

  const adjustBalance = async () => {
    if (!balAmt) return toast.error('Введите сумму')
    setWorking(true)
    try {
      const amt     = parseFloat(balAmt)
      const payload = {
        reason: balReason || 'Admin adjustment',
        ...(balMode === 'add' ? { amount: amt } :
            balMode === 'sub' ? { amount: -amt } :
            { amount: amt, absolute: true }),
      }
      await api.post(`/admin/users/${balModal}/balance`, payload)
      toast.success('Баланс изменён')
      setBalModal(null); setBalAmt(''); setBalReason('')
      loadTab('users')
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setWorking(false)
  }

  const sendAdminMsg = async () => {
    if (!msgText.trim()) return
    setWorking(true)
    try {
      await api.post(`/deals/${msgModal}/message`, { text: msgText })
      toast.success('Сообщение отправлено')
      setMsgModal(null); setMsgText('')
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setWorking(false)
  }

  const sendBroadcast = async () => {
    if (!bcTitle.trim() || !bcText.trim()) return toast.error('Заполните заголовок и текст')
    if (bcType === 'single' && !bcUser.trim()) return toast.error('Выберите пользователя')
    setBcWorking(true)
    try {
      const { data } = await api.post('/admin/broadcast', {
        title:        bcTitle,
        text:         bcText,
        targetType:   bcType,
        targetUserId: bcType === 'single' ? bcUser : undefined,
      })
      toast.success(`✅ Отправлено ${data.sentCount} пользователям${data.telegramSent ? ` (TG: ${data.telegramSent})` : ''}`)
      setBcTitle(''); setBcText(''); setBcType('all'); setBcUser('')
      loadTab('broadcast')
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка рассылки') }
    setBcWorking(false)
  }

  if (!user?.isAdmin) return null

  return (
    <div style={{ minHeight:'100%', paddingBottom:'calc(80px + env(safe-area-inset-bottom,0px))' }}>
      {/* Header */}
      <div style={{ padding:'14px', background:'rgba(6,8,17,0.96)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(251,191,36,0.1)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={() => navigate(-1)} className="btn-icon"><IC.Back s={18}/></button>
          <IC.Crown s={18} c="#fbbf24"/>
          <span style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700, letterSpacing:'0.04em', color:'#fbbf24', textShadow:'0 0 10px rgba(251,191,36,0.4)' }}>
            ADMIN PANEL
          </span>
          {isMainAdmin && (
            <span style={{ fontSize:'10px', background:'rgba(251,191,36,0.1)', color:'#fbbf24', padding:'2px 8px', borderRadius:'6px', fontFamily:'var(--font-display)', fontWeight:700, border:'1px solid rgba(251,191,36,0.3)', letterSpacing:'0.08em' }}>
              MAIN
            </span>
          )}
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80', display:'inline-block', boxShadow:'0 0 6px #4ade80' }}/>
            <span style={{ fontSize:'11px', color:'#4ade80', fontFamily:'var(--font-display)', fontWeight:700 }}>
              {stats?.onlineUsers || 0} онлайн
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="scroll-x" style={{ display:'flex', gap:'4px', padding:'10px 14px 0', borderBottom:'1px solid rgba(255,255,255,0.06)', overflowX:'auto' }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display:'flex', alignItems:'center', gap:'5px', padding:'7px 12px 9px', cursor:'pointer', border:'none', whiteSpace:'nowrap',
              background: active ? 'rgba(251,191,36,0.12)' : 'transparent',
              color: active ? '#fbbf24' : 'var(--t3)',
              fontFamily:'var(--font-display)', fontWeight:700, fontSize:'10px', letterSpacing:'0.05em',
              borderBottom: `2px solid ${active ? '#fbbf24' : 'transparent'}`,
              borderRadius:'8px 8px 0 0',
              transition:'all 0.2s',
            }}>
              <t.Icon s={12} c={active ? '#fbbf24' : 'var(--t3)'}/> {t.l.toUpperCase()}
            </button>
          )
        })}
      </div>

      <div style={{ padding:'14px' }}>
        {loading ? <Spinner/> : (
          <>
            {tab === 'stats'     && <StatsTab stats={stats}/>}
            {tab === 'online'    && <OnlineTab users={online} reload={() => loadTab('online')}/>}
            {tab === 'users'     && (
              <UsersTab
                users={users}
                onBan={openBanModal}
                onBalance={(id) => { setBalModal(id); setBalAmt(''); setBalReason(''); setBalMode('add') }}
                search={search} setSearch={setSearch}
                reload={() => loadTab('users')}
                isMain={isMainAdmin}
              />
            )}
            {tab === 'deals'     && <DealsTab deals={deals} onMsg={(id) => { setMsgModal(id); setMsgText('') }} reload={() => loadTab('deals')}/>}
            {tab === 'prods'     && <ProdsTab prods={prods} onDelete={deleteProduct}/>}
            {tab === 'chats'     && <ChatsTab chats={chats} onClose={closeChat} onReopen={reopenChat} reload={() => loadTab('chats')}/>}
            {tab === 'subadmins' && <SubAdminsTab subadmins={subadmins} users={users} isMain={isMainAdmin} onAdd={addSubAdmin} onRemove={removeSubAdmin} reload={() => loadTab('subadmins')}/>}
            {tab === 'broadcast' && (
              <BroadcastTab
                broadcasts={broadcasts}
                users={users}
                bcTitle={bcTitle} setBcTitle={setBcTitle}
                bcText={bcText}   setBcText={setBcText}
                bcType={bcType}   setBcType={setBcType}
                bcUser={bcUser}   setBcUser={setBcUser}
                onSend={sendBroadcast} working={bcWorking}
              />
            )}
          </>
        )}
      </div>

      {/* Balance Modal */}
      {balModal && (
        <BottomModal onClose={() => { setBalModal(null); setBalAmt(''); setBalReason('') }} color="#fbbf24">
          <div style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:700, marginBottom:'16px', color:'#fbbf24' }}>
            💰 ИЗМЕНИТЬ БАЛАНС
          </div>
          <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
            {[['add','+ ДОБАВИТЬ','#4ade80'],['sub','− СНЯТЬ','#f87171'],['set','⚡ ЗАДАТЬ','#22d3ee']].map(([m,l,c]) => (
              <button key={m} onClick={() => setBalMode(m)} style={{
                flex:1, padding:'8px', borderRadius:'9px', cursor:'pointer',
                background: balMode === m ? `${c}14` : 'rgba(255,255,255,0.03)',
                border:`1px solid ${balMode === m ? `${c}45` : 'rgba(255,255,255,0.07)'}`,
                color: balMode === m ? c : 'var(--t3)',
                fontFamily:'var(--font-display)', fontWeight:700, fontSize:'10px',
              }}>{l}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:'6px', marginBottom:'12px', flexWrap:'wrap' }}>
            {[1,5,10,25,100].map(v => (
              <button key={v} onClick={() => setBalAmt(String(v))} style={{
                padding:'5px 12px', borderRadius:'100px', cursor:'pointer',
                background: balAmt === String(v) ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                border:`1px solid ${balAmt === String(v) ? 'rgba(251,191,36,0.45)' : 'rgba(255,255,255,0.07)'}`,
                color: balAmt === String(v) ? '#fbbf24' : 'var(--t3)',
                fontSize:'12px', fontWeight:700, fontFamily:'var(--font-display)',
              }}>${v}</button>
            ))}
          </div>
          <input className="inp" type="number" placeholder="Сумма USD" value={balAmt} onChange={e => setBalAmt(e.target.value)}
            style={{ marginBottom:'10px', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'18px', borderColor:'rgba(251,191,36,0.3)' }}/>
          <input className="inp" placeholder="Причина (опционально)" value={balReason} onChange={e => setBalReason(e.target.value)}
            style={{ marginBottom:'16px', borderColor:'rgba(251,191,36,0.15)' }}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'10px' }}>
            <button className="btn btn-ghost btn-full" onClick={() => { setBalModal(null); setBalAmt(''); setBalReason('') }}
              style={{ fontFamily:'var(--font-display)', fontSize:'12px' }}>Отмена</button>
            <button className="btn btn-full" onClick={adjustBalance} disabled={working} style={{
              fontFamily:'var(--font-display)', fontSize:'13px',
              background:'linear-gradient(135deg,#ffe566,#fbbf24,#d97706)', color:'#1a0800',
              boxShadow:'0 0 15px rgba(251,191,36,0.4)',
            }}>
              {working ? <BtnSpinner/> : '✅ Применить'}
            </button>
          </div>
        </BottomModal>
      )}

      {/* Message modal */}
      {msgModal && (
        <BottomModal onClose={() => { setMsgModal(null); setMsgText('') }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'14px', fontWeight:700, marginBottom:'12px', color:'#a78bfa' }}>💬 СООБЩЕНИЕ АДМИНА</div>
          <textarea className="inp" rows={4} placeholder="Введите сообщение..." value={msgText} onChange={e => setMsgText(e.target.value)} style={{ resize:'none', marginBottom:'12px' }}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'10px' }}>
            <button className="btn btn-ghost btn-full" onClick={() => { setMsgModal(null); setMsgText('') }} style={{ fontFamily:'var(--font-display)', fontSize:'12px' }}>Отмена</button>
            <button className="btn btn-violet btn-full" onClick={sendAdminMsg} disabled={working || !msgText.trim()} style={{ fontFamily:'var(--font-display)', fontSize:'12px' }}>
              {working ? <BtnSpinner/> : '📨 Отправить'}
            </button>
          </div>
        </BottomModal>
      )}

      {/* Ban Modal */}
      {banModal && (
        <BottomModal onClose={() => setBanModal(null)} color="#f87171">
          <div style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:700, marginBottom:'4px', color:'#f87171' }}>
            🚫 ЗАБЛОКИРОВАТЬ
          </div>
          <div style={{ fontSize:'13px', color:'var(--t2)', marginBottom:'18px' }}>
            {banModal.firstName || banModal.username}
          </div>

          {/* Ban type */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'7px', marginBottom:'16px' }}>
            {[['permanent','НАВСЕГДА'],['timed','НА ВРЕМЯ'],['date','ДО ДАТЫ']].map(([v,l]) => (
              <button key={v} onClick={() => setBanType(v)} style={{
                padding:'9px 6px', borderRadius:'10px', cursor:'pointer', textAlign:'center',
                background: banType===v ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)',
                border:`1px solid ${banType===v ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: banType===v ? '#f87171' : 'var(--t3)',
                fontFamily:'var(--font-display)', fontWeight:700, fontSize:'10px', letterSpacing:'0.04em',
              }}>{l}</button>
            ))}
          </div>

          {banType === 'timed' && (
            <>
              <div style={{ fontSize:'10px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.12em', marginBottom:'7px' }}>ДЛИТЕЛЬНОСТЬ</div>
              <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
                <input className="inp" type="number" min="1" value={banDur} onChange={e => setBanDur(e.target.value)} style={{ width:'80px', textAlign:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'20px' }}/>
                <div style={{ display:'flex', gap:'6px', flex:1 }}>
                  {[['hours','ЧАСОВ'],['days','ДНЕЙ'],['weeks','НЕДЕЛЬ']].map(([v,l]) => (
                    <button key={v} onClick={() => setBanUnit(v)} style={{
                      flex:1, padding:'8px 4px', borderRadius:'9px', cursor:'pointer',
                      background: banUnit===v ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)',
                      border:`1px solid ${banUnit===v ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: banUnit===v ? '#f87171' : 'var(--t3)',
                      fontFamily:'var(--font-display)', fontWeight:700, fontSize:'9px',
                    }}>{l}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {banType === 'date' && (
            <>
              <div style={{ fontSize:'10px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.12em', marginBottom:'7px' }}>ДАТА ОКОНЧАНИЯ БАНА</div>
              <input className="inp" type="datetime-local" value={banDate} onChange={e => setBanDate(e.target.value)} style={{ marginBottom:'14px', fontFamily:'var(--font-display)' }}/>
            </>
          )}

          <div style={{ fontSize:'10px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.12em', marginBottom:'7px' }}>ПРИЧИНА (необязательно)</div>
          <input className="inp" placeholder="Нарушение правил..." value={banReason2} onChange={e => setBanReason2(e.target.value)} style={{ marginBottom:'16px', borderColor:'rgba(248,113,113,0.3)' }}/>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'10px' }}>
            <button className="btn btn-ghost btn-full" onClick={() => setBanModal(null)} style={{ fontFamily:'var(--font-display)', fontSize:'12px' }}>Отмена</button>
            <button className="btn btn-full" onClick={submitBan} disabled={working} style={{ fontFamily:'var(--font-display)', fontSize:'12px', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.4)', color:'#f87171' }}>
              {working ? <BtnSpinner/> : '🚫 Заблокировать'}
            </button>
          </div>
        </BottomModal>
      )}
    </div>
  )
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────
function StatsTab({ stats }) {
  if (!stats) return <div style={{ color:'var(--t3)', textAlign:'center', padding:'40px' }}>Загрузка...</div>
  const cards = [
    { label:'Пользователи',  value: stats.totalUsers,      icon:'👥', color:'#60a5fa' },
    { label:'Онлайн сейчас', value: stats.onlineUsers,     icon:'🟢', color:'#4ade80' },
    { label:'Товары',        value: stats.totalProducts,   icon:'📦', color:'#a78bfa' },
    { label:'Сделок всего',  value: stats.totalDeals,      icon:'🤝', color:'#fbbf24' },
    { label:'Активных сделок', value: stats.activeDeals,  icon:'⏳', color:'#f87171' },
    { label:'Объём продаж',  value: `$${(stats.totalVolume||0).toFixed(2)}`,    icon:'💰', color:'#4ade80' },
    { label:'Комиссия',      value: `$${(stats.totalCommission||0).toFixed(2)}`,icon:'🏦', color:'#fbbf24' },
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
      {cards.map(c => (
        <div key={c.label} style={{ padding:'16px', borderRadius:'16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize:'22px', marginBottom:'4px' }}>{c.icon}</div>
          <div style={{ fontSize:'20px', fontWeight:800, color: c.color, fontFamily:'var(--font-display)' }}>{c.value}</div>
          <div style={{ fontSize:'10px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:600, letterSpacing:'0.06em', marginTop:'2px' }}>{c.label.toUpperCase()}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Online Tab ───────────────────────────────────────────────────────────────
function OnlineTab({ users, reload }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'12px', fontWeight:700, color:'#4ade80', letterSpacing:'0.06em' }}>
          🟢 {users.length} ОНЛАЙН (последние 5 мин)
        </span>
        <button className="btn btn-ghost" onClick={reload} style={{ fontSize:'11px', padding:'4px 10px' }}>↻ Обновить</button>
      </div>
      {users.length === 0 ? (
        <div style={{ textAlign:'center', color:'var(--t3)', padding:'30px' }}>Никого онлайн</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {users.map(u => (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', borderRadius:'12px', background:'rgba(74,222,128,0.04)', border:'1px solid rgba(74,222,128,0.12)' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(74,222,128,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0, border:'1px solid rgba(74,222,128,0.2)' }}>
                {u.photoUrl ? <img src={u.photoUrl} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} alt=""/> : '👤'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {u.firstName || u.username || 'User'}
                  {u.isAdmin && <span style={{ marginLeft:'6px', fontSize:'9px', color:'#fbbf24', fontFamily:'var(--font-display)' }}>ADMIN</span>}
                </div>
                <div style={{ fontSize:'11px', color:'var(--t3)' }}>
                  {u.username ? `@${u.username}` : u.telegramId || 'Нет TG'}
                </div>
              </div>
              <div style={{ fontSize:'10px', color:'#4ade80', fontFamily:'var(--font-display)', fontWeight:700 }}>
                {timeAgo(u.lastActive)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ users, onBan, onBalance, search, setSearch, reload, isMain }) {
  return (
    <div>
      <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
        <input className="inp" placeholder="Поиск по имени / TG / email" value={search}
          onChange={e => setSearch(e.target.value)} style={{ flex:1 }}/>
        <button className="btn btn-violet" onClick={reload} style={{ padding:'0 14px', fontFamily:'var(--font-display)', fontSize:'11px' }}>GO</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {users.map(u => (
          <div key={u.id} style={{ padding:'12px', borderRadius:'14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(124,106,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>
                {u.photoUrl ? <img src={u.photoUrl} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} alt=""/> : '👤'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:700, color: u.isBanned ? '#f87171' : 'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {u.firstName || u.username || 'User'}
                  {u.isMainAdmin && <span style={{ marginLeft:'4px', fontSize:'9px', color:'#fbbf24' }}>★MAIN</span>}
                  {u.isAdmin && !u.isMainAdmin && <span style={{ marginLeft:'4px', fontSize:'9px', color:'#fbbf24' }}>ADMIN</span>}
                  {u.isVerified && <span style={{ marginLeft:'4px', fontSize:'9px', color:'#60a5fa' }}>✓</span>}
                  {u.isBanned && <span style={{ marginLeft:'4px', fontSize:'9px', color:'#f87171' }}>БАН</span>}
                </div>
                <div style={{ fontSize:'10px', color:'var(--t3)' }}>
                  {u.username ? `@${u.username}` : ''} · ID: {u.id.slice(0,8)}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:'14px', fontWeight:800, color:'#4ade80', fontFamily:'var(--font-display)' }}>
                  ${parseFloat(u.balance || 0).toFixed(2)}
                </div>
                <div style={{ fontSize:'9px', color:'var(--t3)' }}>баланс</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              <button onClick={() => onBalance(u.id)} style={{ flex:1, minWidth:80, padding:'6px', borderRadius:'8px', cursor:'pointer', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', color:'#fbbf24', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700 }}>
                💰 БАЛАНС
              </button>
              {!u.isMainAdmin && (
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'3px' }}>
                  {u.isBanned && (
                    <div style={{ fontSize:'9px', color:'#f87171', fontFamily:'var(--font-display)', fontWeight:700, textAlign:'center' }}>
                      {u.banUntil ? `до ${new Date(u.banUntil).toLocaleDateString('ru')}` : '∞ НАВСЕГДА'}
                    </div>
                  )}
                  <button onClick={() => onBan(u)} style={{ padding:'6px', borderRadius:'8px', cursor:'pointer', background: u.isBanned ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)', border:`1px solid ${u.isBanned ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`, color: u.isBanned ? '#4ade80' : '#f87171', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700 }}>
                    {u.isBanned ? '🔓 РАЗБАН' : '🔒 БАН'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Deals Tab ────────────────────────────────────────────────────────────────
function DealsTab({ deals, onMsg, reload }) {
  const [working, setWorking] = useState({})

  const action = async (id, type) => {
    setWorking(w => ({ ...w, [id]: true }))
    try {
      await api.post(`/admin/deals/${id}/${type}`)
      toast.success(type === 'complete' ? 'Сделка завершена' : 'Возврат выполнен')
      reload()
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setWorking(w => ({ ...w, [id]: false }))
  }

  const STATUS_COLOR = { frozen:'#60a5fa', disputed:'#f87171', completed:'#4ade80', refunded:'#fbbf24', cancelled:'var(--t3)' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
      {deals.length === 0 && <div style={{ textAlign:'center', color:'var(--t3)', padding:'30px' }}>Нет сделок</div>}
      {deals.map(d => (
        <div key={d.id} style={{ padding:'14px', borderRadius:'14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'var(--t1)' }}>
              {d.product?.title || 'Товар удалён'}
            </div>
            <span style={{ fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700, color: STATUS_COLOR[d.status] || 'var(--t3)', background:`${STATUS_COLOR[d.status]}15`, padding:'2px 8px', borderRadius:'6px' }}>
              {d.status.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize:'11px', color:'var(--t3)', marginBottom:'8px' }}>
            👤 {d.buyer?.firstName || 'Buyer'} → 🏪 {d.seller?.firstName || 'Seller'} · ${parseFloat(d.amount || 0).toFixed(2)}
          </div>
          {['frozen','disputed'].includes(d.status) && (
            <div style={{ display:'flex', gap:'6px' }}>
              <button onClick={() => action(d.id, 'complete')} disabled={working[d.id]} style={{ flex:1, padding:'6px', borderRadius:'8px', cursor:'pointer', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', color:'#4ade80', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700 }}>
                ✅ ЗАВЕРШИТЬ
              </button>
              <button onClick={() => action(d.id, 'refund')} disabled={working[d.id]} style={{ flex:1, padding:'6px', borderRadius:'8px', cursor:'pointer', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', color:'#f87171', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700 }}>
                💸 ВОЗВРАТ
              </button>
              <button onClick={() => onMsg(d.id)} style={{ padding:'6px 10px', borderRadius:'8px', cursor:'pointer', background:'rgba(124,106,255,0.08)', border:'1px solid rgba(124,106,255,0.2)', color:'#a78bfa', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700 }}>
                💬
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Products Tab ──────────────────────────────────────────────────────────────
function ProdsTab({ prods, onDelete }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
      {prods.length === 0 && <div style={{ textAlign:'center', color:'var(--t3)', padding:'30px' }}>Нет товаров</div>}
      {prods.map(p => (
        <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <GameLogo title={p.title} category={p.category} size={36}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</div>
            <div style={{ fontSize:'10px', color:'var(--t3)' }}>
              ${parseFloat(p.price || 0).toFixed(2)} · {p.seller?.firstName || 'Seller'} · {p.status}
            </div>
          </div>
          <button onClick={() => onDelete(p.id)} style={{ padding:'6px 10px', borderRadius:'8px', cursor:'pointer', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', color:'#f87171', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700 }}>
            🗑
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Broadcast Tab ────────────────────────────────────────────────────────────
function BroadcastTab({ broadcasts, users, bcTitle, setBcTitle, bcText, setBcText, bcType, setBcType, bcUser, setBcUser, onSend, working }) {
  return (
    <div>
      {/* Compose */}
      <div style={{ padding:'16px', borderRadius:'16px', background:'rgba(124,106,255,0.05)', border:'1px solid rgba(124,106,255,0.15)', marginBottom:'16px' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'13px', fontWeight:700, color:'#a78bfa', letterSpacing:'0.06em', marginBottom:'14px' }}>📢 НОВАЯ РАССЫЛКА</div>

        {/* Target type */}
        <div style={{ display:'flex', gap:'6px', marginBottom:'12px' }}>
          {[['all','👥 Всем'],['admins','👑 Админам'],['single','👤 Одному']].map(([v,l]) => (
            <button key={v} onClick={() => setBcType(v)} style={{
              flex:1, padding:'7px', borderRadius:'9px', cursor:'pointer',
              background: bcType === v ? 'rgba(124,106,255,0.15)' : 'rgba(255,255,255,0.03)',
              border:`1px solid ${bcType === v ? 'rgba(124,106,255,0.4)' : 'rgba(255,255,255,0.07)'}`,
              color: bcType === v ? '#a78bfa' : 'var(--t3)',
              fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700,
            }}>{l}</button>
          ))}
        </div>

        {/* User picker for single */}
        {bcType === 'single' && (
          <div style={{ marginBottom:'10px' }}>
            <select className="inp" value={bcUser} onChange={e => setBcUser(e.target.value)} style={{ width:'100%' }}>
              <option value="">Выберите пользователя</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.firstName || u.username || 'User'} {u.username ? `(@${u.username})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <input className="inp" placeholder="Заголовок" value={bcTitle} onChange={e => setBcTitle(e.target.value)} style={{ marginBottom:'8px' }}/>
        <textarea className="inp" rows={4} placeholder="Текст сообщения..." value={bcText} onChange={e => setBcText(e.target.value)} style={{ resize:'none', marginBottom:'12px' }}/>

        <button className="btn btn-violet btn-full" onClick={onSend} disabled={working || !bcTitle.trim() || !bcText.trim()} style={{ fontFamily:'var(--font-display)', fontSize:'12px', letterSpacing:'0.06em', gap:'7px' }}>
          {working ? <BtnSpinner/> : '📨'} {working ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ РАССЫЛКУ'}
        </button>
      </div>

      {/* History */}
      <div style={{ fontFamily:'var(--font-display)', fontSize:'11px', fontWeight:700, color:'var(--t3)', letterSpacing:'0.06em', marginBottom:'10px' }}>ИСТОРИЯ РАССЫЛОК</div>
      {broadcasts.length === 0 ? (
        <div style={{ textAlign:'center', color:'var(--t3)', padding:'20px' }}>Нет рассылок</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {broadcasts.map(b => (
            <div key={b.id} style={{ padding:'12px', borderRadius:'12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                <span style={{ fontSize:'13px', fontWeight:700, color:'var(--t1)' }}>{b.title}</span>
                <span style={{ fontSize:'10px', color: b.targetType === 'all' ? '#60a5fa' : '#a78bfa', fontFamily:'var(--font-display)', fontWeight:700 }}>
                  {b.targetType === 'all' ? '👥 ВСЕ' : b.targetType === 'admins' ? '👑 АДМИНЫ' : '👤 ЛС'}
                </span>
              </div>
              <div style={{ fontSize:'12px', color:'var(--t2)', marginBottom:'6px' }}>{b.text}</div>
              <div style={{ fontSize:'10px', color:'var(--t3)' }}>
                Отправлено: {b.sentCount} · {new Date(b.createdAt).toLocaleString('ru')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Ban Modal (rendered in main component) ──────────────────────────────────
// Add to JSX near end of main return:
// {banModal && <BanModal .../>}

// ─── Chats Tab ────────────────────────────────────────────────────────────────
function ChatsTab({ chats, onClose, onReopen, reload }) {
  return (
    <div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--t3)', letterSpacing:'0.1em', marginBottom:'12px' }}>
        ЧАТЫ ({chats.length})
      </div>
      {chats.length === 0 && <div style={{ color:'var(--t3)', fontSize:'13px', textAlign:'center', padding:'30px' }}>Нет чатов</div>}
      {chats.map(c => (
        <div key={c.id} style={{ padding:'12px 14px', borderRadius:'14px', background: c.isClosed ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.03)', border:`1px solid ${c.isClosed ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.07)'}`, marginBottom:'8px', display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:700, color: c.isClosed ? '#f87171' : 'var(--t1)', display:'flex', alignItems:'center', gap:'6px' }}>
              {c.isClosed ? '🔒' : '💬'} {c.name}
              {c.dealId && <span style={{ fontSize:'9px', background:'rgba(167,139,250,0.15)', color:'#a78bfa', padding:'1px 6px', borderRadius:'4px', fontFamily:'var(--font-display)' }}>СДЕЛКА</span>}
            </div>
            <div style={{ fontSize:'10px', color:'var(--t3)', marginTop:'2px' }}>
              {c.type === 'private' ? '🔒 Закрытый' : '🌐 Публичный'} · {c.memberCount || 0} чел.
              {c.isClosed && c.closedReason && <span style={{ color:'#f87171' }}> · {c.closedReason}</span>}
            </div>
          </div>
          {c.isClosed
            ? <button onClick={() => onReopen(c.id)} style={{ padding:'6px 12px', borderRadius:'8px', cursor:'pointer', background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.3)', color:'#4ade80', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700 }}>ОТКРЫТЬ</button>
            : <button onClick={() => onClose(c.id)} style={{ padding:'6px 12px', borderRadius:'8px', cursor:'pointer', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.3)', color:'#f87171', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700 }}>ЗАКРЫТЬ</button>
          }
        </div>
      ))}
    </div>
  )
}

// ─── SubAdmins Tab ────────────────────────────────────────────────────────────
function SubAdminsTab({ subadmins, users, isMain, onAdd, onRemove }) {
  const [search, setSearch] = useState('')
  if (!isMain) return (
    <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--t3)', fontSize:'13px' }}>
      👑 Только главный администратор может управлять субадминами
    </div>
  )
  const filtered = users.filter(u => !u.isMainAdmin && !u.isSubAdmin &&
    ((u.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
     (u.username  || '').toLowerCase().includes(search.toLowerCase())))

  return (
    <div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--t3)', letterSpacing:'0.1em', marginBottom:'12px' }}>
        ТЕКУЩИЕ СУБАДМИНЫ ({subadmins.length})
      </div>
      {subadmins.length === 0 && <div style={{ color:'var(--t3)', fontSize:'12px', marginBottom:'16px' }}>Нет субадминов</div>}
      {subadmins.map(u => (
        <div key={u.id} style={{ padding:'10px 14px', borderRadius:'12px', background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', marginBottom:'8px', display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#fbbf24' }}>👑 {u.firstName || u.username}</div>
            <div style={{ fontSize:'10px', color:'var(--t3)' }}>@{u.username} · ID: {u.telegramId || '—'}</div>
          </div>
          <button onClick={() => onRemove(u.id)} style={{ padding:'6px 12px', borderRadius:'8px', cursor:'pointer', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.3)', color:'#f87171', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700 }}>
            СНЯТЬ
          </button>
        </div>
      ))}

      <div style={{ fontFamily:'var(--font-display)', fontSize:'11px', color:'var(--t3)', letterSpacing:'0.1em', margin:'16px 0 10px' }}>
        ДОБАВИТЬ СУБАДМИНА
      </div>
      <input className="inp" placeholder="Поиск пользователя..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom:'10px' }}/>
      {search && filtered.slice(0,8).map(u => (
        <div key={u.id} style={{ padding:'10px 14px', borderRadius:'12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', marginBottom:'6px', display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'var(--t1)' }}>{u.firstName || u.username}</div>
            <div style={{ fontSize:'10px', color:'var(--t3)' }}>@{u.username}</div>
          </div>
          <button onClick={() => onAdd(u.id)} style={{ padding:'6px 12px', borderRadius:'8px', cursor:'pointer', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.3)', color:'#fbbf24', fontSize:'10px', fontFamily:'var(--font-display)', fontWeight:700 }}>
            👑 НАЗНАЧИТЬ
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function BottomModal({ children, onClose, color = '#a78bfa' }) {
  return (
    <div style={{ position:'fixed', inset:0, top:0, left:0, right:0, bottom:0, height:'100dvh', zIndex:200, display:'flex', flexDirection:'column', background:'rgba(6,8,17,0.99)', backdropFilter:'blur(16px)' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 16px', paddingTop:'env(safe-area-inset-top, 0px)', paddingBottom:'calc(20px + env(safe-area-inset-bottom, 16px))', overflowY:'auto', animation:'slideUp 0.28s ease-out' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 20px' }}>
          <div style={{ width:36, height:3, borderRadius:2, background:'rgba(255,255,255,0.1)' }}/>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', width:'32px', height:'32px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', fontSize:'16px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'40px' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.1)', borderTop:'3px solid #fbbf24', animation:'rotateSpin 0.7s linear infinite' }}/>
    </div>
  )
}

function BtnSpinner() {
  return <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(0,0,0,0.2)', borderTop:'2px solid currentColor', animation:'rotateSpin 0.7s linear infinite', display:'inline-block' }}/>
}

function timeAgo(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}с`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}м`
  return `${Math.floor(m / 60)}ч`
}
