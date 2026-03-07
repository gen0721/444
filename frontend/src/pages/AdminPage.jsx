import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, useStore } from '../store'
import { IC } from '../components/Icons'
import toast from 'react-hot-toast'

const DEAL_COLORS = { frozen:'#00d4ff', completed:'#00ff88', disputed:'#ffe600', refunded:'#b44fff', cancelled:'#ff3355' }

export default function AdminPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [deals, setDeals] = useState([])
  const [products, setProducts] = useState([])
  const [transactions, setTransactions] = useState([])
  const { user: currentUser } = useStore()
  // Main admin = isAdmin && !isSubAdmin (or has specific telegramId)
  const isMainAdmin = currentUser?.isAdmin && !currentUser?.isSubAdmin
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [balModal, setBalModal] = useState(null)
  const [balAmt, setBalAmt] = useState('')
  const [balReason, setBalReason] = useState('')
  const [balAction, setBalAction] = useState('add') // add | sub | set
  const [userModal, setUserModal] = useState(null)
  const [msgModal, setMsgModal] = useState(null)
  const [msgText, setMsgText] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      if (tab==='stats') { const {data}=await api.get('/admin/stats'); setStats(data) }
      else if (tab==='users') { const {data}=await api.get('/admin/users',{params:{search,limit:50}}); setUsers(data.users||[]) }
      else if (tab==='deals') { const {data}=await api.get('/admin/deals',{params:{limit:50}}); setDeals(data.deals||[]) }
      else if (tab==='products') { const {data}=await api.get('/admin/products',{params:{limit:50}}); setProducts(data.products||[]) }
      else if (tab==='transactions') { const {data}=await api.get('/admin/transactions',{params:{limit:50}}); setTransactions(data.transactions||[]) }
    } catch { toast.error('Ошибка загрузки') }
    setLoading(false)
  }
  useEffect(()=>{ load() },[tab,search])

  const banUser = async (u) => {
    try { await api.post(`/admin/users/${u.id}/ban`); toast.success(u.isBanned?'✅ Разбанен':'🚫 Забанен'); load() }
    catch { toast.error('Ошибка') }
  }
  const verifyUser = async (u) => {
    try { await api.post(`/admin/users/${u.id}/verify`); toast.success('✅ Верификация обновлена'); load() }
    catch { toast.error('Ошибка') }
  }
  const resetBalance = async (id) => {
    if (!confirm('Обнулить баланс?')) return
    try { await api.post(`/admin/users/${id}/balance`,{amount:0,reason:'Admin reset',absolute:true}); toast.success('Баланс обнулён'); load() }
    catch { toast.error('Ошибка') }
  }
  const adjustBalance = async () => {
    if (!balAmt) return
    try {
      let amount = parseFloat(balAmt)
      let absolute = false
      if (balAction === 'sub') amount = -Math.abs(amount)
      if (balAction === 'set') { amount = Math.abs(amount); absolute = true }
      await api.post(`/admin/users/${balModal}/balance`, { amount, reason: balReason||'Admin adjustment', absolute })
      toast.success('✅ Баланс изменён')
      setBalModal(null); setBalAmt(''); setBalReason(''); setBalAction('add')
      load()
    } catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
  }
  const completeDeal = async (id) => {
    try { await api.post(`/admin/deals/${id}/complete`); toast.success('✅ Сделка завершена'); load() }
    catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
  }
  const refundDeal = async (id) => {
    const reason = prompt('Причина возврата:')
    if (!reason) return
    try { await api.post(`/admin/deals/${id}/refund`,{reason}); toast.success('↩ Возврат выполнен'); load() }
    catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
  }
  const deleteProduct = async (id) => {
    if (!confirm('Удалить товар?')) return
    try { await api.delete(`/admin/products/${id}`); toast.success('🗑 Удалено'); load() }
    catch { toast.error('Ошибка') }
  }
  const sendAdminMsg = async () => {
    if (!msgText.trim()) return
    try {
      await api.post(`/deals/${msgModal}/message`,{text:`[ADMIN] ${msgText}`})
      toast.success('✅ Сообщение отправлено'); setMsgModal(null); setMsgText('')
    } catch { toast.error('Ошибка') }
  }

  const TABS = [
    {id:'stats',label:'СТАТЫ'},
    {id:'users',label:'ЮЗЕРЫ'},
    {id:'deals',label:'СДЕЛКИ'},
    {id:'products',label:'ТОВАРЫ'},
    {id:'transactions',label:'ТРАНЗАКЦИИ'},
    {id:'admins',label:'ADMINS'},
  ]

  return (
    <div style={{minHeight:'100%'}}>
      {/* Header */}
      <div style={{padding:'14px 14px 0',background:'rgba(8,8,8,0.95)',borderBottom:'1px solid rgba(255,230,0,0.2)',position:'sticky',top:0,zIndex:10,backdropFilter:'blur(20px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
          <button onClick={()=>navigate(-1)} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',width:'34px',height:'34px',cursor:'pointer',color:'var(--text)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>←</button>
          <div>
            <div style={{fontFamily:'var(--font-d)',fontSize:'20px',fontWeight:700,letterSpacing:'0.05em',
              background:'linear-gradient(135deg,#ffe600,#ff8800)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
              filter:'drop-shadow(0 0 8px rgba(255,230,0,0.4))'}}>
              👑 ПАНЕЛЬ АДМИНИСТРАТОРА
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:'6px',overflowX:'auto',scrollbarWidth:'none',paddingBottom:'10px'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              display:'flex',alignItems:'center',gap:'5px',
              padding:'7px 12px',borderRadius:'9px',whiteSpace:'nowrap',
              background: tab===t.id?'rgba(255,230,0,0.15)':'rgba(255,255,255,0.03)',
              border:`1px solid ${tab===t.id?'rgba(255,230,0,0.5)':'rgba(255,255,255,0.06)'}`,
              color: tab===t.id?'#ffe600':'var(--text3)',
              fontFamily:'var(--font-d)',fontWeight:700,fontSize:'12px',letterSpacing:'0.05em',
              cursor:'pointer',transition:'all var(--ease)',
              boxShadow:tab===t.id?'0 0 12px rgba(255,230,0,0.2)':'none'
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'14px'}}>

        {/* ─── STATS ─── */}
        {tab==='stats' && stats && (
          <div className="anim-in">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
              {[
                {l:'👥 ПОЛЬЗОВАТЕЛЕЙ',v:stats.stats.totalUsers,c:'#b44fff'},
                {l:'📦 АКТИВНЫХ',v:stats.stats.activeProducts,c:'#00d4ff'},
                {l:'🤝 СДЕЛОК',v:stats.stats.totalDeals,c:'#00ff88'},
                {l:'⚠ СПОРОВ',v:stats.stats.disputedDeals||0,c:'#ffe600'},
                {l:'💰 ДЕПОЗИТОВ',v:`$${parseFloat(stats.stats.totalDeposited||0).toFixed(0)}`,c:'#ff6600'},
                {l:'📈 ОБЪЁМ ПРОДАЖ',v:`$${parseFloat(stats.stats.totalSalesVolume||0).toFixed(0)}`,c:'#00ff88'},
              ].map(s=>(
                <div key={s.l} style={{background:'rgba(14,14,14,0.9)',border:`1px solid ${s.c}25`,borderRadius:'12px',padding:'14px',
                  boxShadow:`0 0 15px ${s.c}15`}}>
                  <div style={{fontFamily:'var(--font-d)',fontSize:'24px',fontWeight:700,color:s.c,textShadow:`0 0 10px ${s.c}60`}}>{s.v}</div>
                  <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'4px',letterSpacing:'0.06em',fontFamily:'var(--font-d)'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{fontFamily:'var(--font-d)',fontSize:'14px',fontWeight:700,color:'#ffe600',marginBottom:'10px',letterSpacing:'0.08em'}}>
              ПОСЛЕДНИЕ СДЕЛКИ
            </div>
            {stats.recentDeals?.map(d=>(
              <div key={d.id} style={{background:'rgba(14,14,14,0.9)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'10px',padding:'11px',marginBottom:'7px',display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:DEAL_COLORS[d.status]||'#666',flexShrink:0,boxShadow:`0 0 6px ${DEAL_COLORS[d.status]||'#666'}`}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px',fontWeight:600}}>{d.product?.title||'Товар'}</div>
                  <div style={{fontSize:'11px',color:'var(--text3)'}}>{d.buyer?.firstName} → {d.seller?.firstName}</div>
                </div>
                <div style={{fontFamily:'var(--font-d)',fontWeight:700,color:'#ff8833'}}>${parseFloat(d.amount).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {/* ─── USERS ─── */}
        {tab==='users' && (
          <div className="anim-in">
            <input className="input" placeholder="🔍 Поиск: имя, email, telegram ID..." value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:'12px',borderColor:'rgba(255,230,0,0.2)'}}/>
            {loading ? <Spinner/> : users.map(u=>(
              <div key={u.id} style={{background:'rgba(14,14,14,0.9)',border:`1px solid ${u.isBanned?'rgba(255,51,85,0.3)':u.isAdmin?'rgba(255,230,0,0.25)':'rgba(255,255,255,0.05)'}`,borderRadius:'14px',padding:'14px',marginBottom:'10px',
                boxShadow:u.isBanned?'0 0 15px rgba(255,51,85,0.1)':u.isAdmin?'0 0 15px rgba(255,230,0,0.08)':'none'}}>

                {/* User header */}
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                  <div style={{width:'44px',height:'44px',borderRadius:'12px',flexShrink:0,overflow:'hidden',
                    background:'linear-gradient(135deg,#ff6600,#ff4400)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'18px',fontWeight:800,color:'white',
                    boxShadow:u.isAdmin?'0 0 15px rgba(255,230,0,0.4)':'none',
                    border:u.isAdmin?'2px solid rgba(255,230,0,0.5)':'none'}}>
                    {u.photoUrl?<img src={u.photoUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                      :(u.firstName||u.username||'?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:'15px',color:'var(--text)',display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
                      {u.firstName||u.username||'Пользователь'}
                      {u.isAdmin && <span style={{fontSize:'10px',background:'rgba(255,230,0,0.15)',color:'#ffe600',padding:'2px 7px',borderRadius:'4px',fontFamily:'var(--font-d)',letterSpacing:'0.05em',border:'1px solid rgba(255,230,0,0.3)'}}>ADMIN</span>}
                      {u.isBanned && <span style={{fontSize:'10px',background:'rgba(255,51,85,0.15)',color:'#ff3355',padding:'2px 7px',borderRadius:'4px',fontFamily:'var(--font-d)',border:'1px solid rgba(255,51,85,0.3)'}}>БАН</span>}
                      {u.isVerified && <span style={{fontSize:'10px',background:'rgba(0,212,255,0.12)',color:'#00d4ff',padding:'2px 7px',borderRadius:'4px',fontFamily:'var(--font-d)',border:'1px solid rgba(0,212,255,0.25)'}}>✓ ВЕРИФИЦИРОВАН</span>}
                    </div>
                    <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}}>
                      {u.username?`@${u.username}`:''} {u.email?`· ${u.email}`:''} {u.telegramId?`· tg:${u.telegramId}`:''}
                    </div>
                  </div>
                  <button onClick={()=>setUserModal(userModal===u.id?null:u.id)} style={{
                    background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:'8px',width:'32px',height:'32px',cursor:'pointer',
                    color:'var(--text2)',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center'
                  }}>{userModal===u.id?'▲':'▼'}</button>
                </div>

                {/* Stats row */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'7px',marginBottom:'10px'}}>
                  {[
                    {l:'Баланс',v:`$${parseFloat(u.balance||0).toFixed(2)}`,c:'#ff8833'},
                    {l:'Заморожено',v:`$${parseFloat(u.frozenBalance||0).toFixed(2)}`,c:'#00d4ff'},
                    {l:'Продаж',v:u.totalSales||0,c:'#00ff88'},
                    {l:'Покупок',v:u.totalPurchases||0,c:'#b44fff'},
                  ].map(s=>(
                    <div key={s.l} style={{background:'rgba(255,255,255,0.03)',borderRadius:'8px',padding:'7px',textAlign:'center',border:'1px solid rgba(255,255,255,0.04)'}}>
                      <div style={{fontFamily:'var(--font-d)',fontWeight:700,fontSize:'14px',color:s.c}}>{s.v}</div>
                      <div style={{fontSize:'9px',color:'var(--text3)',marginTop:'2px',letterSpacing:'0.04em'}}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px'}}>
                  <button className={`btn btn-sm ${u.isBanned?'btn-success':'btn-danger'}`}
                    onClick={()=>banUser(u)}
                    style={{fontFamily:'var(--font-d)',letterSpacing:'0.04em'}}>
                    {u.isBanned?'✅ РАЗБАНИТЬ':'🚫 ЗАБАНИТЬ'}
                  </button>
                  <button className="btn btn-sm btn-primary"
                    onClick={()=>{setBalModal(u.id);setBalAmt('');setBalReason('')}}
                    style={{fontFamily:'var(--font-d)',letterSpacing:'0.04em'}}>
                    💰 БАЛАНС
                  </button>
                </div>

                {/* Extended panel */}
                {userModal===u.id && (
                  <div style={{marginTop:'10px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',
                    padding:'10px',background:'rgba(255,255,255,0.02)',borderRadius:'10px',
                    border:'1px solid rgba(255,255,255,0.04)',animation:'fadeIn 0.2s ease'}}>
                    <button className="btn btn-sm btn-cyan"
                      onClick={()=>verifyUser(u)}
                      style={{fontFamily:'var(--font-d)',letterSpacing:'0.04em'}}>
                      {u.isVerified?'❌ СНЯТЬ ВЕР.':'✓ ВЕРИФИЦИРОВАТЬ'}
                    </button>
                    <button className="btn btn-sm btn-purple"
                      onClick={()=>resetBalance(u.id)}
                      style={{fontFamily:'var(--font-d)',letterSpacing:'0.04em'}}>
                      ⚠ СБРОСИТЬ БАЛ.
                    </button>
                    <div style={{gridColumn:'1/-1',fontSize:'11px',color:'var(--text3)',padding:'4px 2px'}}>
                      📅 Рег: {new Date(u.createdAt).toLocaleDateString('ru')} · 
                      ⭐ {parseFloat(u.rating||5).toFixed(1)} · 
                      💬 {u.reviewCount||0} отзывов
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── DEALS ─── */}
        {tab==='deals' && (
          <div className="anim-in">
            {/* Filter by status */}
            <div style={{display:'flex',gap:'6px',marginBottom:'12px',overflowX:'auto',scrollbarWidth:'none',paddingBottom:'4px'}}>
              {['all','frozen','disputed','completed','refunded','cancelled'].map(s=>(
                <button key={s} onClick={()=>{}} style={{
                  padding:'5px 10px',borderRadius:'100px',whiteSpace:'nowrap',
                  background:`${DEAL_COLORS[s]||'#888'}18`,
                  border:`1px solid ${DEAL_COLORS[s]||'#888'}30`,
                  color:DEAL_COLORS[s]||'var(--text3)',
                  fontFamily:'var(--font-d)',fontSize:'11px',fontWeight:700,cursor:'pointer'
                }}>{s.toUpperCase()}</button>
              ))}
            </div>
            {loading ? <Spinner/> : deals.map(d=>(
              <div key={d.id} style={{background:'rgba(14,14,14,0.9)',border:`1px solid ${DEAL_COLORS[d.status]||'rgba(255,255,255,0.05)'}30`,borderRadius:'14px',padding:'14px',marginBottom:'8px',
                boxShadow:`0 0 15px ${DEAL_COLORS[d.status]||'transparent'}10`}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'8px'}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:'14px',color:'var(--text)',marginBottom:'4px'}}>{d.product?.title||'Товар'}</div>
                    <div style={{fontSize:'12px',color:'var(--text3)'}}>
                      🛒 {d.buyer?.firstName||'Покупатель'} → 💸 {d.seller?.firstName||'Продавец'}
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0,marginLeft:'10px'}}>
                    <div style={{fontFamily:'var(--font-d)',fontWeight:800,fontSize:'17px',color:'#ff8833',textShadow:'0 0 8px rgba(255,102,0,0.4)'}}>${parseFloat(d.amount).toFixed(2)}</div>
                    <span style={{fontSize:'11px',fontWeight:700,fontFamily:'var(--font-d)',color:DEAL_COLORS[d.status]||'var(--text3)',textShadow:`0 0 6px ${DEAL_COLORS[d.status]||'transparent'}80`}}>
                      {d.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'10px'}}>
                  {new Date(d.createdAt).toLocaleString('ru')} · Комиссия: ${parseFloat(d.commission).toFixed(2)}
                </div>
                {['frozen','disputed'].includes(d.status) && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'}}>
                    <button className="btn btn-sm btn-success" onClick={()=>completeDeal(d.id)} style={{fontFamily:'var(--font-d)',letterSpacing:'0.04em'}}>✅ ЗАВЕРШИТЬ</button>
                    <button className="btn btn-sm btn-cyan" onClick={()=>refundDeal(d.id)} style={{fontFamily:'var(--font-d)',letterSpacing:'0.04em',color:'#00d4ff',background:'rgba(0,212,255,0.1)',border:'1px solid rgba(0,212,255,0.3)',boxShadow:'0 0 10px rgba(0,212,255,0.15)'}}>↩ ВОЗВРАТ</button>
                    <button className="btn btn-sm btn-purple" onClick={()=>{setMsgModal(d.id);setMsgText('')}} style={{fontFamily:'var(--font-d)',letterSpacing:'0.04em'}}>💬 НАПИСАТЬ</button>
                  </div>
                )}
                {d.adminNote && <div style={{marginTop:'8px',fontSize:'12px',color:'#ffe600',padding:'7px 10px',background:'rgba(255,230,0,0.06)',borderRadius:'8px',border:'1px solid rgba(255,230,0,0.15)'}}>📝 {d.adminNote}</div>}
              </div>
            ))}
          </div>
        )}

        {/* ─── PRODUCTS ─── */}
        {tab==='products' && (
          <div className="anim-in">
            {loading ? <Spinner/> : products.map(p=>(
              <div key={p.id} style={{background:'rgba(14,14,14,0.9)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'12px',padding:'12px',marginBottom:'8px',display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</div>
                  <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'3px'}}>
                    {p.seller?.username||p.seller?.firstName} · {p.category} ·
                    <span style={{color:p.status==='active'?'#00ff88':p.status==='frozen'?'#00d4ff':'#ff3355',marginLeft:'4px'}}>{p.status}</span>
                    {' · '}👁 {p.views||0}
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontFamily:'var(--font-d)',fontWeight:700,color:'#ff8833',marginBottom:'6px'}}>${parseFloat(p.price).toFixed(2)}</div>
                  <button className="btn btn-sm btn-danger" onClick={()=>deleteProduct(p.id)} style={{fontFamily:'var(--font-d)',fontSize:'10px',letterSpacing:'0.04em'}}>🗑 УДАЛИТЬ</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── TRANSACTIONS ─── */}
        {tab==='transactions' && (
          <div className="anim-in">
            {loading ? <Spinner/> : transactions.map((t,i)=>{
              const amt=parseFloat(t.amount)
              return (
                <div key={t.id} style={{background:'rgba(14,14,14,0.9)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'10px',padding:'11px',marginBottom:'7px',display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:'13px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.description||t.type}</div>
                    <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'3px'}}>
                      {t.user?.username||t.user?.firstName} · {new Date(t.createdAt).toLocaleString('ru')}
                    </div>
                  </div>
                  <div style={{fontFamily:'var(--font-d)',fontWeight:700,fontSize:'15px',color:amt>=0?'#00ff88':'#ff3355',flexShrink:0,textShadow:`0 0 8px ${amt>=0?'rgba(0,255,136,0.4)':'rgba(255,51,85,0.4)'}`}}>
                    {amt>=0?'+':''}{amt.toFixed(2)}$
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

        {/* ─── ADMINS ─── */}
        {tab==='admins' && <AdminsTab isMain={isMainAdmin}/>}

      {/* Balance Modal */}
      {balModal && (
        <Modal onClose={()=>{setBalModal(null);setBalAmt('');setBalReason('')}}>
          <div style={{fontFamily:'var(--font-d)',fontSize:'18px',fontWeight:700,marginBottom:'16px',color:'#ffe600',letterSpacing:'0.05em'}}>💰 ИЗМЕНИТЬ БАЛАНС</div>
          <input className="input" type="number" placeholder="Сумма (- для списания)" value={balAmt} onChange={e=>setBalAmt(e.target.value)} style={{marginBottom:'10px',borderColor:'rgba(255,230,0,0.3)'}}/>
          <input className="input" placeholder="Причина" value={balReason} onChange={e=>setBalReason(e.target.value)} style={{marginBottom:'16px',borderColor:'rgba(255,230,0,0.2)'}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
            <button className="btn btn-ghost" onClick={()=>{setBalModal(null);setBalAmt('');setBalReason('')}} style={{fontFamily:'var(--font-d)'}}>ОТМЕНА</button>
            <button className="btn btn-primary" onClick={adjustBalance} style={{fontFamily:'var(--font-d)',letterSpacing:'0.05em'}}>✅ ПРИМЕНИТЬ</button>
          </div>
        </Modal>
      )}

      {/* Message Modal */}
      {msgModal && (
        <Modal onClose={()=>{setMsgModal(null);setMsgText('')}}>
          <div style={{fontFamily:'var(--font-d)',fontSize:'18px',fontWeight:700,marginBottom:'16px',color:'#b44fff',letterSpacing:'0.05em'}}>💬 СООБЩЕНИЕ В СДЕЛКУ</div>
          <textarea className="input" rows={4} placeholder="Текст сообщения от администратора..." value={msgText} onChange={e=>setMsgText(e.target.value)} style={{marginBottom:'16px',borderColor:'rgba(180,79,255,0.3)'}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
            <button className="btn btn-ghost" onClick={()=>{setMsgModal(null);setMsgText('')}} style={{fontFamily:'var(--font-d)'}}>ОТМЕНА</button>
            <button className="btn btn-purple" onClick={sendAdminMsg} style={{fontFamily:'var(--font-d)',letterSpacing:'0.05em'}}>📨 ОТПРАВИТЬ</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(12px)',zIndex:300,display:'flex',alignItems:'flex-end'}}>
      <div style={{background:'rgba(10,10,10,0.98)',backdropFilter:'blur(20px)',borderRadius:'20px 20px 0 0',padding:'24px 20px',width:'100%',border:'1px solid rgba(255,230,0,0.2)',borderBottom:'none',animation:'slideUp 0.3s ease'}}>
        <div style={{width:'40px',height:'3px',borderRadius:'2px',background:'rgba(255,230,0,0.4)',margin:'0 auto 20px'}}/>
        {children}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{display:'flex',justifyContent:'center',padding:'50px'}}>
      <div style={{width:'36px',height:'36px',borderRadius:'50%',border:'3px solid rgba(255,255,255,0.05)',borderTop:'3px solid #ffe600',animation:'rotate 0.8s linear infinite',boxShadow:'0 0 15px rgba(255,230,0,0.3)'}}/>
    </div>
  )
}

// ─── ADMINS TAB COMPONENT ────────────────────────────────────────────────
function AdminsTab({ isMain }) {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [searching, setSearching] = useState(false)

  const loadAdmins = async () => {
    setLoading(true)
    try { const {data} = await api.get('/admin/subadmins'); setAdmins(data||[]) }
    catch {}
    setLoading(false)
  }
  useEffect(() => { loadAdmins() }, [])

  const searchUsers = async () => {
    if (!search.trim()) return
    setSearching(true)
    try { const {data} = await api.get('/admin/users', {params:{search,limit:5}}); setUsers(data.users||[]) }
    catch {}
    setSearching(false)
  }

  const addAdmin = async (userId) => {
    try { await api.post('/admin/subadmin/add', {userId}); toast.success('✅ Назначен администратором'); loadAdmins(); setUsers([]); setSearch('') }
    catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
  }
  const removeAdmin = async (userId) => {
    if (!confirm('Снять права администратора?')) return
    try { await api.post('/admin/subadmin/remove', {userId}); toast.success('Права сняты'); loadAdmins() }
    catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
  }

  return (
    <div className="anim-in">
      {/* Add sub-admin */}
      {isMain && (
        <div style={{background:'rgba(14,14,14,0.9)',border:'1px solid rgba(255,230,0,0.2)',borderRadius:'14px',padding:'14px',marginBottom:'14px',boxShadow:'0 0 15px rgba(255,230,0,0.06)'}}>
          <div style={{fontFamily:'var(--font-d)',fontSize:'14px',fontWeight:700,color:'#ffe600',letterSpacing:'0.06em',marginBottom:'10px'}}>
            + НАЗНАЧИТЬ АДМИНИСТРАТОРА
          </div>
          <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
            <input className="input" placeholder="Поиск пользователя..." value={search} onChange={e=>setSearch(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&searchUsers()} style={{flex:1,borderColor:'rgba(255,230,0,0.2)'}}/>
            <button className="btn btn-gold" onClick={searchUsers} disabled={searching} style={{fontFamily:'var(--font-d)',letterSpacing:'0.05em',flexShrink:0}}>
              НАЙТИ
            </button>
          </div>
          {users.map(u=>(
            <div key={u.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px',background:'rgba(255,255,255,0.03)',borderRadius:'10px',marginBottom:'6px',border:'1px solid rgba(255,255,255,0.05)'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'linear-gradient(135deg,#ff6600,#cc3300)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',fontWeight:800,color:'white',flexShrink:0}}>
                {(u.firstName||u.username||'?').charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:'14px'}}>{u.firstName||u.username}</div>
                <div style={{fontSize:'11px',color:'var(--text3)'}}>{u.username?`@${u.username}`:''} {u.telegramId?`· ${u.telegramId}`:''}</div>
              </div>
              <button className="btn btn-gold btn-sm" onClick={()=>addAdmin(u.id)} style={{fontFamily:'var(--font-d)',fontSize:'11px'}}>
                НАЗНАЧИТЬ
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Current admins list */}
      <div style={{fontFamily:'var(--font-d)',fontSize:'13px',fontWeight:700,color:'rgba(255,230,0,0.6)',letterSpacing:'0.08em',marginBottom:'10px'}}>
        ДЕЙСТВУЮЩИЕ АДМИНИСТРАТОРЫ
      </div>
      {loading ? <div style={{textAlign:'center',padding:'30px'}}><div style={{width:'30px',height:'30px',borderRadius:'50%',border:'3px solid rgba(255,255,255,0.05)',borderTop:'3px solid #ffe600',animation:'rotate 0.8s linear infinite',margin:'auto'}}/></div>
        : admins.map(a=>(
        <div key={a.id} style={{background:'rgba(14,14,14,0.9)',border:`1px solid ${a.isMainAdmin?'rgba(255,200,0,0.3)':'rgba(255,255,255,0.07)'}`,borderRadius:'13px',padding:'13px',marginBottom:'8px',display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{width:'42px',height:'42px',borderRadius:'12px',background:'linear-gradient(135deg,#ffe600,#cc8800)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:800,color:'#1a0a00',flexShrink:0,boxShadow:'0 0 12px rgba(255,200,0,0.3)'}}>
            {(a.firstName||a.username||'?').charAt(0).toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:'14px',display:'flex',alignItems:'center',gap:'6px'}}>
              {a.firstName||a.username||'Admin'}
              {a.isMainAdmin && <span style={{fontSize:'10px',background:'rgba(255,200,0,0.2)',color:'#ffc000',padding:'2px 8px',borderRadius:'100px',fontFamily:'var(--font-d)',border:'1px solid rgba(255,200,0,0.35)'}}>ГЛАВНЫЙ</span>}
            </div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}}>{a.username?`@${a.username}`:''} {a.telegramId?`ID: ${a.telegramId}`:''}</div>
          </div>
          {!a.isMainAdmin && isMain && (
            <button className="btn btn-danger btn-sm" onClick={()=>removeAdmin(a.id)} style={{fontFamily:'var(--font-d)',fontSize:'11px',letterSpacing:'0.04em',flexShrink:0}}>
              СНЯТЬ
            </button>
          )}
        </div>
      ))}

      {/* Protection notice */}
      <div style={{marginTop:'14px',padding:'12px',background:'rgba(0,212,255,0.06)',border:'1px solid rgba(0,212,255,0.15)',borderRadius:'10px',fontSize:'12px',color:'rgba(0,212,255,0.7)',lineHeight:'1.5'}}>
        <span style={{display:'inline-flex',verticalAlign:'middle',marginRight:'6px'}}><IC.Shield s={14} c="#00d4ff"/></span>
        Суб-администраторы не могут банить или изменять главного администратора. Только главный Admin может назначать новых администраторов.
      </div>
    </div>
  )
}
