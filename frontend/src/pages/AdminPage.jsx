import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC, GameLogo } from '../components/Icons'
import toast from 'react-hot-toast'

const TABS = [
  { id:'stats',  l:'Стат.',   Icon:IC.Diamond },
  { id:'users',  l:'Юзеры',   Icon:IC.User    },
  { id:'deals',  l:'Сделки',  Icon:IC.Chat    },
  { id:'prods',  l:'Товары',  Icon:IC.Shield  },
  { id:'admins', l:'Админы',  Icon:IC.Crown   },
]

export default function AdminPage() {
  const navigate  = useNavigate()
  const { user }  = useStore()
  const [tab, setTab]             = useState('stats')
  const [stats, setStats]         = useState(null)
  const [users, setUsers]         = useState([])
  const [deals, setDeals]         = useState([])
  const [prods, setProds]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')

  // Balance modal
  const [balModal, setBalModal]   = useState(null)  // userId
  const [balAmt, setBalAmt]       = useState('')
  const [balReason, setBalReason] = useState('')
  const [balMode, setBalMode]     = useState('add') // add | sub | set
  const [working, setWorking]     = useState(false)

  // Msg modal
  const [msgModal, setMsgModal]   = useState(null)  // dealId
  const [msgText, setMsgText]     = useState('')

  const isMainAdmin = user?.isMainAdmin

  useEffect(() => { loadTab(tab) }, [tab])

  const loadTab = async (t) => {
    setLoading(true)
    try {
      if (t === 'stats')  { const { data } = await api.get('/admin/stats'); setStats(data) }
      if (t === 'users')  { const { data } = await api.get('/admin/users', { params:{ search:search||undefined, limit:50 } }); setUsers(data.users||data||[]) }
      if (t === 'deals')  { const { data } = await api.get('/admin/deals', { params:{ limit:50 } }); setDeals(data.deals||data||[]) }
      if (t === 'prods')  { const { data } = await api.get('/admin/products', { params:{ limit:50 } }); setProds(data.products||data||[]) }
    } catch {}
    setLoading(false)
  }

  const banUser = async (u) => {
    try {
      await api.post(`/admin/users/${u.id}/${u.isBanned ? 'unban' : 'ban'}`)
      toast.success(u.isBanned ? 'Разбанен' : 'Забанен')
      loadTab('users')
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
      const amt = parseFloat(balAmt)
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
      await api.post(`/deals/${msgModal}/message`, { text: msgText, isAdmin: true })
      toast.success('Сообщение отправлено')
      setMsgModal(null); setMsgText('')
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setWorking(false)
  }

  if (!user?.isAdmin) return null

  return (
    <div style={{ minHeight:'100%', paddingBottom:'16px' }}>
      {/* Header */}
      <div style={{ padding:'14px', background:'rgba(6,8,17,0.96)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(251,191,36,0.1)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={() => navigate(-1)} className="btn-icon"><IC.Back s={18}/></button>
          <IC.Crown s={18} c="#fbbf24"/>
          <span style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700, letterSpacing:'0.04em', color:'#fbbf24', textShadow:'0 0 10px rgba(251,191,36,0.4)' }}>
            ADMIN PANEL
          </span>
          {isMainAdmin && (
            <span style={{ fontSize:'10px', background:'rgba(251,191,36,0.1)', color:'#fbbf24', padding:'2px 8px', borderRadius:'6px', fontFamily:'var(--font-display)', fontWeight:700, border:'1px solid rgba(251,191,36,0.3)', letterSpacing:'0.08em', marginLeft:'4px' }}>
              MAIN
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="scroll-x" style={{ display:'flex', gap:'6px', padding:'12px 14px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'10px',
              whiteSpace:'nowrap', cursor:'pointer', border:'none',
              background: active ? 'rgba(251,191,36,0.12)' : 'transparent',
              color: active ? '#fbbf24' : 'var(--t3)',
              fontFamily:'var(--font-display)', fontWeight:700, fontSize:'11px', letterSpacing:'0.05em',
              borderBottom: `2px solid ${active ? '#fbbf24' : 'transparent'}`,
              paddingBottom:'10px', borderRadius:'10px 10px 0 0',
              textShadow: active ? '0 0 8px rgba(251,191,36,0.5)' : 'none',
              transition:'all 0.2s',
            }}>
              <t.Icon s={13} c={active ? '#fbbf24' : 'var(--t3)'}/> {t.l.toUpperCase()}
            </button>
          )
        })}
      </div>

      <div style={{ padding:'14px' }}>
        {loading ? <Spinner/> : (
          <>
            {tab === 'stats'  && <StatsTab  stats={stats}/>}
            {tab === 'users'  && <UsersTab  users={users} onBan={banUser} onBalance={(id) => { setBalModal(id); setBalAmt(''); setBalReason(''); setBalMode('add') }} search={search} setSearch={setSearch} reload={() => loadTab('users')} isMain={isMainAdmin}/>}
            {tab === 'deals'  && <DealsTab  deals={deals} onMsg={(id) => { setMsgModal(id); setMsgText('') }}/>}
            {tab === 'prods'  && <ProdsTab  prods={prods} onDelete={deleteProduct}/>}
            {tab === 'admins' && <AdminsTab isMain={isMainAdmin}/>}
          </>
        )}
      </div>

      {/* Balance Modal */}
      {balModal && (
        <BottomModal onClose={() => { setBalModal(null); setBalAmt(''); setBalReason('') }} color="#fbbf24">
          <div style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:700, marginBottom:'16px', color:'#fbbf24', letterSpacing:'0.04em' }}>
            💰 ИЗМЕНИТЬ БАЛАНС
          </div>

          {/* Mode selector */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
            {[['add','+ ДОБАВИТЬ','#4ade80'],['sub','− СНЯТЬ','#f87171'],['set','⚡ ЗАДАТЬ','#22d3ee']].map(([m,l,c]) => (
              <button key={m} onClick={() => setBalMode(m)} style={{
                flex:1, padding:'8px', borderRadius:'9px', cursor:'pointer',
                background: balMode === m ? `${c}14` : 'rgba(255,255,255,0.03)',
                border:`1px solid ${balMode === m ? `${c}45` : 'rgba(255,255,255,0.07)'}`,
                color: balMode === m ? c : 'var(--t3)',
                fontFamily:'var(--font-display)', fontWeight:700, fontSize:'10px', letterSpacing:'0.05em',
                transition:'all 0.15s',
              }}>{l}</button>
            ))}
          </div>

          {/* Quick amounts */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'12px', flexWrap:'wrap' }}>
            {[1,5,10,25,100].map(v => (
              <button key={v} onClick={() => setBalAmt(String(v))} style={{
                padding:'5px 12px', borderRadius:'100px', cursor:'pointer',
                background: balAmt === String(v) ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                border:`1px solid ${balAmt === String(v) ? 'rgba(251,191,36,0.45)' : 'rgba(255,255,255,0.07)'}`,
                color: balAmt === String(v) ? '#fbbf24' : 'var(--t3)',
                fontSize:'12px', fontWeight:700, fontFamily:'var(--font-display)', transition:'all 0.15s',
              }}>${v}</button>
            ))}
          </div>

          <input className="inp" type="number" placeholder="Сумма USD" value={balAmt} onChange={e => setBalAmt(e.target.value)} style={{ marginBottom:'10px', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'18px', borderColor:'rgba(251,191,36,0.3)' }}/>
          <input className="inp" placeholder="Причина (опционально)" value={balReason} onChange={e => setBalReason(e.target.value)} style={{ marginBottom:'16px', borderColor:'rgba(251,191,36,0.15)' }}/>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'10px' }}>
            <button className="btn btn-ghost btn-full" onClick={() => { setBalModal(null); setBalAmt(''); setBalReason('') }} style={{ fontFamily:'var(--font-display)', fontSize:'12px' }}>Отмена</button>
            <button className="btn btn-full" onClick={adjustBalance} disabled={working} style={{
              fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'0.04em',
              background:'linear-gradient(135deg,#ffe566,#fbbf24,#d97706)', color:'#1a0800',
              boxShadow:'0 0 15px rgba(251,191,36,0.4)',
            }}>
              {working ? <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:'2px solid rgba(0,0,0,0.2)', borderTop:'2px solid #1a0800', animation:'rotateSpin 0.7s linear infinite' }}/> : '✅ Применить'}
            </button>
          </div>
        </BottomModal>
      )}

      {/* Message Modal */}
      {msgModal && (
        <BottomModal onClose={() => { setMsgModal(null); setMsgText('') }} color="#a78bfa">
          <div style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:700, marginBottom:'16px', color:'#a78bfa', letterSpacing:'0.04em' }}>
            💬 СООБЩЕНИЕ В СДЕЛКУ
          </div>
          <textarea className="inp" rows={4} placeholder="Текст от администратора..." value={msgText} onChange={e => setMsgText(e.target.value)} style={{ marginBottom:'16px', borderColor:'rgba(167,139,250,0.25)', resize:'none' }}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'10px' }}>
            <button className="btn btn-ghost btn-full" onClick={() => { setMsgModal(null); setMsgText('') }} style={{ fontFamily:'var(--font-display)', fontSize:'12px' }}>Отмена</button>
            <button className="btn btn-violet btn-full" onClick={sendAdminMsg} disabled={working} style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'0.04em' }}>
              {working ? <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.2)', borderTop:'2px solid white', animation:'rotateSpin 0.7s linear infinite' }}/> : '📨 Отправить'}
            </button>
          </div>
        </BottomModal>
      )}
    </div>
  )
}

// ── STATS TAB ─────────────────────────────────────────────────────────────
function StatsTab({ stats }) {
  if (!stats) return <Spinner/>
  const items = [
    { l:'Всего пользователей', v:stats.totalUsers     || 0, c:'#a78bfa', Icon:IC.User   },
    { l:'Всего сделок',        v:stats.totalDeals      || 0, c:'#22d3ee', Icon:IC.Chat   },
    { l:'Активных сделок',     v:stats.activeDeals     || 0, c:'#fbbf24', Icon:IC.Shield },
    { l:'Оборот (USD)',         v:`$${parseFloat(stats.totalVolume||0).toFixed(2)}`, c:'#4ade80', Icon:IC.Diamond },
    { l:'Комиссия собрана',     v:`$${parseFloat(stats.totalCommission||0).toFixed(2)}`, c:'#fbbf24', Icon:IC.Wallet },
    { l:'Всего товаров',        v:stats.totalProducts   || 0, c:'#f87171', Icon:IC.Eye   },
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
      {items.map(s => (
        <div key={s.l} style={{ padding:'16px', borderRadius:'16px', background:`${s.c}08`, border:`1px solid ${s.c}1a` }}>
          <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'8px' }}>
            <s.Icon s={13} c={s.c}/>
            <div style={{ fontSize:'9px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.1em' }}>{s.l.toUpperCase()}</div>
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'24px', color:s.c, textShadow:`0 0 10px ${s.c}40` }}>{s.v}</div>
        </div>
      ))}
    </div>
  )
}

// ── USERS TAB ─────────────────────────────────────────────────────────────
function UsersTab({ users, onBan, onBalance, search, setSearch, reload, isMain }) {
  return (
    <div>
      <div style={{ position:'relative', marginBottom:'12px' }}>
        <div style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'var(--t3)', pointerEvents:'none' }}><IC.Search s={15}/></div>
        <input className="inp" placeholder="Поиск пользователей..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft:'38px', height:'40px', borderRadius:'100px', fontSize:'13px' }}/>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
        {users.map((u, i) => (
          <div key={u.id} className="anim-up" style={{ animationDelay:`${i*40}ms`, padding:'14px', borderRadius:'16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
              <div style={{
                width:'44px', height:'44px', borderRadius:'13px', flexShrink:0,
                background: u.isAdmin ? 'linear-gradient(135deg,#ffe566,#fbbf24)' : 'linear-gradient(135deg,#9d8fff,#7c6aff)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'18px', fontWeight:800, color: u.isAdmin ? '#1a0800' : 'white',
                fontFamily:'var(--font-display)',
                boxShadow: u.isAdmin ? '0 0 12px rgba(251,191,36,0.4)' : '0 0 12px rgba(124,106,255,0.3)',
              }}>
                {u.photoUrl ? <img src={u.photoUrl} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'13px' }} alt=""/> : (u.firstName||u.username||'?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:'14px', color:'var(--t1)', display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'3px' }}>
                  {u.firstName || u.username || 'Пользователь'}
                  {u.isAdmin    && <span className="badge badge-amber" style={{ fontSize:'9px', padding:'2px 6px' }}><IC.Crown s={8} c="#fbbf24"/> ADMIN</span>}
                  {u.isBanned   && <span className="badge badge-red"   style={{ fontSize:'9px', padding:'2px 6px' }}>БАН</span>}
                  {u.isVerified && <span className="badge badge-green"  style={{ fontSize:'9px', padding:'2px 6px' }}>✓</span>}
                </div>
                <div style={{ fontSize:'11px', color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {u.username ? `@${u.username}` : ''}{u.email ? ` · ${u.email}` : ''}
                </div>
              </div>
            </div>

            {/* Mini stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'6px', marginBottom:'10px' }}>
              {[
                { l:'Баланс', v:`$${parseFloat(u.balance||0).toFixed(2)}`, c:'#a78bfa' },
                { l:'Продаж',  v:u.totalSales||0,     c:'#4ade80' },
                { l:'Покупок', v:u.totalPurchases||0, c:'#22d3ee' },
              ].map(s => (
                <div key={s.l} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'8px', padding:'6px 8px', textAlign:'center', border:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'13px', color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:'9px', color:'var(--t3)', marginTop:'1px', letterSpacing:'0.04em' }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'7px' }}>
              <button className={`btn btn-sm ${u.isBanned ? 'btn-ghost' : 'btn-ghost'}`} onClick={() => onBan(u)} style={{
                fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'0.04em', gap:'5px',
                border: `1px solid ${u.isBanned ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                color: u.isBanned ? '#4ade80' : '#f87171',
              }}>
                {u.isBanned ? <><IC.Check s={12} c="#4ade80"/> РАЗБАН</> : <><IC.X s={12} c="#f87171"/> ЗАБАНИТЬ</>}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => onBalance(u.id)} style={{
                fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'0.04em', gap:'5px',
                border:'1px solid rgba(251,191,36,0.3)', color:'#fbbf24',
              }}>
                <IC.Wallet s={12} c="#fbbf24"/> БАЛАНС
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DEALS TAB ─────────────────────────────────────────────────────────────
const DEAL_COLORS = { pending:'#fbbf24', frozen:'#22d3ee', completed:'#4ade80', disputed:'#f87171', refunded:'#a78bfa', cancelled:'var(--t3)' }
const DEAL_LABELS = { pending:'Ожидание', frozen:'Заморожено', completed:'Завершена', disputed:'Спор', refunded:'Возврат', cancelled:'Отменена' }

function DealsTab({ deals, onMsg }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
      {deals.map((d, i) => {
        const color = DEAL_COLORS[d.status] || 'var(--t3)'
        return (
          <div key={d.id} className="anim-up" style={{
            animationDelay:`${i*40}ms`,
            padding:'13px 14px', borderRadius:'14px',
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
            borderLeft:`3px solid ${color}50`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
              <GameLogo title={d.product?.title} size={36}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {d.product?.title || 'Товар'}
                </div>
                <div style={{ fontSize:'11px', color:'var(--t3)' }}>
                  {d.buyer?.username||d.buyer?.firstName||'?'} → {d.seller?.username||d.seller?.firstName||'?'}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'14px', color:'#a78bfa' }}>${parseFloat(d.amount).toFixed(2)}</div>
                <div style={{ fontSize:'10px', color, fontWeight:700, marginTop:'2px' }}>{DEAL_LABELS[d.status]||d.status}</div>
              </div>
            </div>
            {['frozen','disputed'].includes(d.status) && (
              <button className="btn btn-sm btn-ghost btn-full" onClick={() => onMsg(d.id)} style={{ fontFamily:'var(--font-display)', fontSize:'11px', gap:'6px', border:'1px solid rgba(167,139,250,0.25)', color:'#a78bfa' }}>
                <IC.Chat s={12} c="#a78bfa"/> Написать в сделку
              </button>
            )}
          </div>
        )
      })}
      {deals.length === 0 && <Empty text="НЕТ СДЕЛОК"/>}
    </div>
  )
}

// ── PRODUCTS TAB ──────────────────────────────────────────────────────────
function ProdsTab({ prods, onDelete }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
      {prods.map((p, i) => (
        <div key={p.id} className="anim-up" style={{
          animationDelay:`${i*40}ms`,
          padding:'12px 14px', borderRadius:'14px',
          background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
          display:'flex', alignItems:'center', gap:'10px',
        }}>
          <GameLogo title={p.title} category={p.category} size={36}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</div>
            <div style={{ fontSize:'11px', color:'var(--t3)' }}>{p.seller?.username || '?'} · ${parseFloat(p.price).toFixed(2)}</div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => onDelete(p.id)} style={{ border:'1px solid rgba(248,113,113,0.25)', color:'#f87171', gap:'4px', flexShrink:0 }}>
            <IC.X s={12} c="#f87171"/> Удалить
          </button>
        </div>
      ))}
      {prods.length === 0 && <Empty text="НЕТ ТОВАРОВ"/>}
    </div>
  )
}

// ── ADMINS TAB ────────────────────────────────────────────────────────────
function AdminsTab({ isMain }) {
  const [admins,    setAdmins]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [found,     setFound]     = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => { loadAdmins() }, [])

  const loadAdmins = async () => {
    setLoading(true)
    try { const { data } = await api.get('/admin/subadmins'); setAdmins(data || []) }
    catch {} setLoading(false)
  }

  const searchUsers = async () => {
    if (!search.trim()) return
    setSearching(true)
    try { const { data } = await api.get('/admin/users', { params:{ search, limit:5 } }); setFound(data.users||data||[]) }
    catch {} setSearching(false)
  }

  const makeAdmin = async (userId) => {
    try { await api.post('/admin/subadmin/add', { userId }); toast.success('Назначен субадмином'); loadAdmins(); setFound([]); setSearch('') }
    catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
  }

  const removeAdmin = async (userId) => {
    if (!confirm('Снять права?')) return
    try { await api.post('/admin/subadmin/remove', { userId }); toast.success('Права сняты'); loadAdmins() }
    catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
  }

  return (
    <div>
      {isMain && (
        <div style={{ marginBottom:'16px' }}>
          <div style={{ fontSize:'11px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.1em', marginBottom:'10px' }}>
            НАЗНАЧИТЬ СУБАДМИНА
          </div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
            <input className="inp" placeholder="Поиск пользователя..." value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUsers()}
              style={{ flex:1, height:'40px', borderRadius:'10px', fontSize:'13px' }}/>
            <button className="btn btn-violet" onClick={searchUsers} disabled={searching} style={{ fontFamily:'var(--font-display)', fontSize:'12px', flexShrink:0 }}>
              <IC.Search s={14} c="white"/>
            </button>
          </div>
          {found.map(u => (
            <div key={u.id} style={{ padding:'10px 12px', borderRadius:'11px', background:'rgba(124,106,255,0.06)', border:'1px solid rgba(124,106,255,0.18)', marginBottom:'6px', display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:600, color:'var(--t1)' }}>{u.firstName || u.username}</div>
                <div style={{ fontSize:'11px', color:'var(--t3)' }}>@{u.username} · {u.email}</div>
              </div>
              <button className="btn btn-sm btn-violet" onClick={() => makeAdmin(u.id)} style={{ fontFamily:'var(--font-display)', fontSize:'11px', flexShrink:0 }}>
                + Назначить
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize:'11px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.1em', marginBottom:'10px' }}>
        СУБАДМИНЫ ({admins.length})
      </div>
      {loading ? <Spinner/> : admins.length === 0 ? <Empty text="НЕТ СУБАДМИНОВ"/> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {admins.map(u => (
            <div key={u.id} style={{ padding:'12px 14px', borderRadius:'13px', background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', display:'flex', alignItems:'center', gap:'10px' }}>
              <IC.Crown s={16} c="#fbbf24"/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:600 }}>{u.firstName || u.username}</div>
                <div style={{ fontSize:'11px', color:'var(--t3)' }}>@{u.username}</div>
              </div>
              {isMain && (
                <button className="btn btn-sm btn-ghost" onClick={() => removeAdmin(u.id)} style={{ flexShrink:0, border:'1px solid rgba(248,113,113,0.25)', color:'#f87171', fontSize:'11px', gap:'4px' }}>
                  <IC.X s={11} c="#f87171"/> Снять
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SHARED ────────────────────────────────────────────────────────────────
function BottomModal({ children, onClose, color = '#a78bfa' }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(14px)', zIndex:300, display:'flex', alignItems:'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background:'rgba(8,10,22,0.99)', borderRadius:'24px 24px 0 0', padding:'24px 20px',
        width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderBottom:'none',
        boxShadow:`0 -8px 40px rgba(0,0,0,0.7), 0 -1px 0 ${color}20`,
        animation:'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ width:'36px', height:'3px', borderRadius:'2px', background:`${color}30`, margin:'0 auto 20px' }}/>
        {children}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:'50px' }}>
      <div style={{ width:'32px', height:'32px', borderRadius:'50%', border:'3px solid rgba(251,191,36,0.1)', borderTop:'3px solid #fbbf24', animation:'rotateSpin 0.8s linear infinite', boxShadow:'0 0 12px rgba(251,191,36,0.25)' }}/>
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ textAlign:'center', padding:'40px', color:'var(--t3)', fontFamily:'var(--font-display)', fontSize:'12px', letterSpacing:'0.1em' }}>{text}</div>
}
