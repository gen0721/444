import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC, GameLogo } from '../components/Icons'
import { RubleAmount } from '../components/RubleDisplay'
import toast from 'react-hot-toast'

const STATUS_COLOR = { pending:'#fbbf24', frozen:'#22d3ee', completed:'#4ade80', disputed:'#f87171', refunded:'#a78bfa', cancelled:'var(--t3)' }
const STATUS_LABEL = { pending:'Ожидание', frozen:'Заморожено', completed:'Завершена', disputed:'Спор', refunded:'Возврат', cancelled:'Отменена' }

export default function ProfilePage() {
  const { user, setUser, setToken } = useStore()
  const navigate = useNavigate()
  const [tab, setTab]     = useState('deals')
  const [deals, setDeals] = useState([])
  const [prods, setProds] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    loadTab(tab)
  }, [tab, user])

  const loadTab = async (t) => {
    setLoading(true)
    try {
      if (t === 'deals' || t === 'purchases' || t === 'sales') {
        const { data } = await api.get('/deals/my')
        setDeals(data || [])
      } else if (t === 'listings') {
        const { data } = await api.get('/products/my')
        setProds(data?.products || data || [])
      }
    } catch {}
    setLoading(false)
  }

  const logout = () => { setToken(null); setUser(null); navigate('/') }

  if (!user) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'18px', padding:'40px' }}>
      <IC.User s={56} c="rgba(255,255,255,0.06)"/>
      <div style={{ fontFamily:'var(--font-display)', color:'var(--t3)', letterSpacing:'0.1em', fontSize:'16px', textAlign:'center' }}>
        ВОЙДИТЕ В АККАУНТ
      </div>
      <button className="btn btn-violet btn-lg" onClick={() => navigate('/auth')}
        style={{ fontFamily:'var(--font-display)', letterSpacing:'0.06em', gap:'8px' }}>
        <IC.Exit s={17} c="white"/> Войти
      </button>
    </div>
  )

  const bal = parseFloat(user.balance || 0)
  const STATS = [
    { l:'Баланс',  v:`$${bal.toFixed(2)}`, c:'#a78bfa', Icon:IC.Wallet },
    { l:'Продажи', v:user.totalSales    || 0, c:'#4ade80', Icon:IC.Check },
    { l:'Покупки', v:user.totalPurchases|| 0, c:'#22d3ee', Icon:IC.Diamond },
    { l:'Рейтинг', v:`${parseFloat(user.rating || 5).toFixed(1)}★`, c:'#fbbf24', Icon:IC.Star },
  ]

  const myDeals = tab === 'purchases'
    ? deals.filter(d => d.buyerId === user.id)
    : tab === 'sales'
      ? deals.filter(d => d.sellerId === user.id)
      : deals

  return (
    <div style={{ minHeight:'100%' }}>
      {/* Header */}
      <div style={{ padding:'14px', background:'rgba(6,8,17,0.96)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700, color:'var(--t1)', letterSpacing:'0.04em' }}>Профиль</span>
          <div style={{ display:'flex', gap:'8px' }}>
            {user.isAdmin && (
              <button className="btn btn-sm" onClick={() => navigate('/admin')} style={{
                fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'0.06em', gap:'5px',
                background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.3)', color:'#fbbf24',
              }}>
                <IC.Crown s={12} c="#fbbf24"/> Панель
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={logout}
              style={{ fontFamily:'var(--font-display)', fontSize:'11px', gap:'5px' }}>
              <IC.Exit s={12}/> Выход
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:'14px' }}>
        {/* Profile card */}
        <div style={{
          borderRadius:'22px', padding:'22px', marginBottom:'14px', position:'relative', overflow:'hidden',
          background:'linear-gradient(145deg,rgba(124,106,255,0.1),rgba(10,12,26,0.97),rgba(224,64,251,0.06))',
          border:'1px solid rgba(255,255,255,0.08)', borderTop:'1px solid rgba(255,255,255,0.14)',
          boxShadow:'0 12px 50px rgba(0,0,0,0.7)',
          backdropFilter:'blur(20px)',
        }}>
          <div style={{ position:'absolute', top:'-40px', right:'-30px', width:'160px', height:'160px', borderRadius:'50%', background:'radial-gradient(circle,rgba(124,106,255,0.07),transparent)', pointerEvents:'none' }}/>

          {/* Avatar row */}
          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'20px' }}>
            <div style={{ position:'relative' }}>
              <div style={{
                width:'64px', height:'64px', borderRadius:'18px', flexShrink:0,
                background:'linear-gradient(135deg,#9d8fff,#7c6aff,#4035b5)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'26px', fontWeight:800, color:'white', fontFamily:'var(--font-display)',
                boxShadow:'0 0 0 2px rgba(124,106,255,0.35), 0 0 20px rgba(124,106,255,0.35)',
              }}>
                {(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
              </div>
              {user.isVerified && (
                <div style={{ position:'absolute', bottom:'-4px', right:'-4px', width:'20px', height:'20px', borderRadius:'6px', background:'linear-gradient(135deg,#4ade80,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 8px rgba(74,222,128,0.5)' }}>
                  <IC.Check s={11} c="white"/>
                </div>
              )}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'19px', fontWeight:700, marginBottom:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user.firstName || user.username || 'Пользователь'}
              </div>
              <div style={{ fontSize:'12px', color:'var(--t3)', marginBottom:'7px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user.username ? `@${user.username}` : ''}{user.email ? ` · ${user.email}` : ''}
              </div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {user.isAdmin    && <span className="badge badge-amber"><IC.Crown s={9} c="#fbbf24"/> ADMIN</span>}
                {user.isVerified && <span className="badge badge-green"><IC.Check s={9} c="#4ade80"/> VIP</span>}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {STATS.map(s => (
              <div key={s.l} style={{
                padding:'12px 14px', borderRadius:'13px',
                background:`${s.c}08`,
                border:`1px solid ${s.c}1a`,
                boxShadow:`inset 0 1px 0 rgba(255,255,255,0.04)`,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'5px' }}>
                  <s.Icon s={12} c={s.c}/>
                  <div style={{ fontSize:'9px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.1em' }}>{s.l.toUpperCase()}</div>
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'18px', color:s.c, textShadow:`0 0 8px ${s.c}40` }}>
                  {s.v}
                </div>
                {s.l === 'Баланс' && <div style={{ marginTop:'3px' }}><RubleAmount usd={bal} size="sm"/></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'5px', marginBottom:'12px', background:'rgba(10,12,26,0.8)', borderRadius:'12px', padding:'4px', border:'1px solid rgba(255,255,255,0.06)' }}>
          {[['deals','Сделки'],['purchases','Покупки'],['sales','Продажи'],['listings','Товары']].map(([id,l]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex:1, padding:'8px 4px', borderRadius:'9px',
              background: tab === id ? 'rgba(124,106,255,0.15)' : 'transparent',
              border: `1px solid ${tab === id ? 'rgba(124,106,255,0.35)' : 'transparent'}`,
              color: tab === id ? '#a78bfa' : 'var(--t3)',
              fontFamily:'var(--font-display)', fontWeight:700, fontSize:'10px', letterSpacing:'0.04em',
              cursor:'pointer', textShadow: tab === id ? '0 0 8px rgba(167,139,250,0.5)' : 'none',
              transition:'all 0.2s',
            }}>{l.toUpperCase()}</button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {Array(3).fill(0).map((_, i) => <div key={i} className="skel" style={{ height:'70px' }}/>)}
          </div>
        ) : tab === 'listings' ? (
          prods.length === 0 ? <Empty text="НЕТ ТОВАРОВ"/> : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {prods.map((p, i) => <ListingRow key={p.id} p={p} i={i} navigate={navigate}/>)}
            </div>
          )
        ) : (
          myDeals.length === 0 ? <Empty text="НЕТ СДЕЛОК"/> : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {myDeals.map((d, i) => <DealRow key={d.id} deal={d} i={i} userId={user.id} navigate={navigate}/>)}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function DealRow({ deal, i, userId, navigate }) {
  const isBuyer = deal.buyerId === userId
  const other   = isBuyer ? deal.seller : deal.buyer
  const color   = STATUS_COLOR[deal.status] || 'var(--t3)'
  const amt     = parseFloat(deal.amount)
  return (
    <div onClick={() => navigate(`/deal/${deal.id}`)} className="anim-up" style={{
      animationDelay:`${i*50}ms`,
      padding:'13px 14px', borderRadius:'14px', cursor:'pointer',
      background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
      borderLeft:`3px solid ${color}50`,
      display:'flex', alignItems:'center', gap:'12px',
      transition:'background 0.2s, border-color 0.2s',
    }}>
      <GameLogo title={deal.product?.title} size={40}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'var(--t1)', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {deal.product?.title || 'Товар'}
        </div>
        <div style={{ fontSize:'11px', color:'var(--t3)' }}>
          {isBuyer ? '🛒 Покупка' : '💸 Продажа'} · {other?.username || other?.firstName || '?'}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'14px', color:'#a78bfa' }}>${amt.toFixed(2)}</div>
        <div style={{ fontSize:'10px', color, fontWeight:700, marginTop:'3px' }}>{STATUS_LABEL[deal.status] || deal.status}</div>
      </div>
    </div>
  )
}

function ListingRow({ p, i, navigate }) {
  const price = parseFloat(p.price)
  return (
    <div onClick={() => navigate(`/product/${p.id}`)} className="anim-up" style={{
      animationDelay:`${i*50}ms`,
      padding:'13px 14px', borderRadius:'14px', cursor:'pointer',
      background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
      display:'flex', alignItems:'center', gap:'12px',
    }}>
      <GameLogo title={p.title} category={p.category} size={40}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'var(--t1)', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {p.title}
        </div>
        <div style={{ fontSize:'11px', color:'var(--t3)' }}>
          {p.category} · {p.sold || 0} продаж
        </div>
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'14px', color:'#a78bfa', flexShrink:0 }}>
        ${price.toFixed(2)}
      </div>
    </div>
  )
}

function Empty({ text }) {
  return (
    <div style={{ textAlign:'center', padding:'50px 20px', color:'var(--t3)', fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'0.1em' }}>
      {text}
    </div>
  )
}
