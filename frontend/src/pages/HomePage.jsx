import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { GameLogo, IC } from '../components/Icons'
import { RubleAmount } from '../components/RubleDisplay'

const CATS = [
  { id:'all',       l:'Все',        emoji:'🎮' },
  { id:'games',     l:'Игры',       emoji:'🕹️' },
  { id:'software',  l:'Программы',  emoji:'💻' },
  { id:'social',    l:'Соцсети',    emoji:'📱' },
  { id:'education', l:'Обучение',   emoji:'🎓' },
  { id:'services',  l:'Услуги',     emoji:'⚡' },
  { id:'finance',   l:'Финансы',    emoji:'💎' },
  { id:'other',     l:'Другое',     emoji:'📦' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [cat, setCat]             = useState('all')
  const [search, setSearch]       = useState('')
  const [sort, setSort]           = useState('createdAt')
  const searchRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/products', {
        params: { category: cat === 'all' ? undefined : cat, search: search || undefined, sort }
      })
      setProducts(data.products || [])
    } catch {}
    setLoading(false)
  }, [cat, sort, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 380 : 0)
    return () => clearTimeout(t)
  }, [load])

  const bal = parseFloat(user?.balance || 0)

  return (
    <div style={{ minHeight:'100%' }}>
      {/* ── STICKY HEADER ── */}
      <div style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(6,8,17,0.96)', backdropFilter:'blur(32px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ padding:'14px 14px 0' }}>
          {/* Top row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
            {/* Logo */}
            <div>
              <div style={{
                fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:800,
                letterSpacing:'0.04em', lineHeight:1,
                background:'linear-gradient(135deg,#a78bfa 0%,#7c6aff 40%,#e040fb 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                filter:'drop-shadow(0 0 12px rgba(124,106,255,0.5))',
              }}>GIVIHUB</div>
              <div style={{ fontSize:'8px', color:'rgba(167,139,250,0.35)', letterSpacing:'0.22em', fontFamily:'var(--font-display)', marginTop:'1px' }}>
                DIGITAL MARKETPLACE
              </div>
            </div>

            {/* Balance pill */}
            {user ? (
              <div onClick={() => navigate('/wallet')} style={{
                display:'flex', alignItems:'center', gap:'8px',
                padding:'8px 14px', borderRadius:'100px', cursor:'pointer',
                background:'rgba(124,106,255,0.1)',
                border:'1px solid rgba(124,106,255,0.3)',
                boxShadow:'0 0 20px rgba(124,106,255,0.1)',
                transition:'all 0.2s',
              }}>
                <IC.Diamond s={14} c="#a78bfa"/>
                <span style={{
                  fontFamily:'var(--font-display)', fontWeight:700, fontSize:'15px',
                  color:'#a78bfa',
                  textShadow:'0 0 10px rgba(167,139,250,0.5)',
                }}>
                  ${bal.toFixed(2)}
                </span>
              </div>
            ) : (
              <button className="btn btn-violet btn-sm" onClick={() => navigate('/auth')}
                style={{ fontFamily:'var(--font-display)', fontSize:'12px', letterSpacing:'0.06em' }}>
                <IC.Exit s={13} c="white"/> Войти
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:'12px' }}>
            <div style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'var(--t3)', pointerEvents:'none' }}>
              <IC.Search s={16}/>
            </div>
            <input ref={searchRef} className="inp" placeholder="Поиск товаров..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft:'40px', paddingRight: search ? '36px' : '13px', height:'42px', borderRadius:'100px', fontSize:'14px' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', color:'var(--t3)', cursor:'pointer', padding:'2px',
              }}>
                <IC.X s={15}/>
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="scroll-x" style={{ display:'flex', gap:'6px', paddingBottom:'12px' }}>
            {CATS.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} style={{
                padding:'7px 14px', borderRadius:'100px', whiteSpace:'nowrap', cursor:'pointer',
                border: `1px solid ${cat === c.id ? 'rgba(124,106,255,0.5)' : 'rgba(255,255,255,0.07)'}`,
                background: cat === c.id ? 'rgba(124,106,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: cat === c.id ? '#a78bfa' : 'var(--t2)',
                fontFamily:'var(--font-display)', fontWeight:700, fontSize:'11px', letterSpacing:'0.04em',
                display:'flex', alignItems:'center', gap:'5px',
                boxShadow: cat === c.id ? '0 0 14px rgba(124,106,255,0.2), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                transition:'all 0.2s ease',
              }}>
                <span style={{ fontSize:'13px' }}>{c.emoji}</span> {c.l}
              </button>
            ))}
          </div>
        </div>

        {/* bottom line */}
        <div style={{ height:'1px', background:'linear-gradient(90deg,transparent,rgba(124,106,255,0.3),transparent)' }}/>
      </div>

      {/* ── TOOLBAR ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px' }}>
        <span style={{ fontSize:'11px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.06em' }}>
          {loading ? '...' : `${products.length} товаров`}
        </span>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{
          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
          color:'var(--t2)', padding:'5px 10px', borderRadius:'9px',
          fontSize:'11px', cursor:'pointer', outline:'none',
          fontFamily:'var(--font-display)', fontWeight:700,
        }}>
          <option value="createdAt">Новые</option>
          <option value="price_asc">Дешевле</option>
          <option value="price_desc">Дороже</option>
          <option value="popular">Популярные</option>
        </select>
      </div>

      {/* ── GRID ── */}
      <div style={{ padding:'0 10px 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
        {loading
          ? Array(6).fill(0).map((_, i) => <SkelCard key={i}/>)
          : products.length === 0
            ? <NoResults/>
            : products.map((p, i) => <ProductCard key={p.id} product={p} i={i} onClick={() => navigate(`/product/${p.id}`)}/>)
        }
      </div>

      {/* ── КАТЕГОРИИ ОПИСАНИЕ ── */}
      <div style={{ padding:'24px 14px 0' }}>
        <div style={{ fontSize:'11px', fontFamily:'var(--font-display)', letterSpacing:'0.12em', color:'var(--t3)', marginBottom:'12px', fontWeight:700 }}>
          ЧТО МОЖНО КУПИТЬ
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {[
            { emoji:'🕹️', title:'Игры и аккаунты', desc:'Лицензионные ключи активации Steam, Epic Games, PlayStation, Xbox. Готовые игровые аккаунты с прокачкой, скинами и балансом.' },
            { emoji:'💻', title:'Программы и ПО', desc:'Лицензионные ключи для Windows, Office, антивирусов и другого программного обеспечения. Активация сразу после покупки.' },
            { emoji:'📱', title:'Аккаунты соцсетей', desc:'Аккаунты Instagram, Telegram, TikTok, YouTube с подписчиками. Проверенные профили для бизнеса и продвижения.' },
            { emoji:'⚡', title:'Услуги и буст', desc:'Прокачка персонажей, буст рейтинга, выполнение заданий в игре. Профессиональные игровые услуги от проверенных продавцов.' },
            { emoji:'💎', title:'Игровая валюта', desc:'V-Bucks, Robux, UC, донат-монеты для любых игр. Быстрое пополнение на ваш аккаунт по выгодному курсу.' },
          ].map(c => (
            <div key={c.title} style={{
              display:'flex', gap:'12px', alignItems:'flex-start',
              padding:'12px 14px', borderRadius:'14px',
              background:'rgba(255,255,255,0.02)',
              border:'1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{ fontSize:'22px', flexShrink:0, marginTop:'2px' }}>{c.emoji}</span>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'13px', fontWeight:700, color:'var(--t1)', marginBottom:'4px' }}>{c.title}</div>
                <div style={{ fontSize:'12px', color:'var(--t3)', lineHeight:'1.6' }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ФУТЕР ── */}
      <div style={{ padding:'28px 14px 20px', marginTop:'24px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        {/* Logo */}
        <div style={{ marginBottom:'16px' }}>
          <div style={{
            fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:800,
            background:'linear-gradient(135deg,#a78bfa,#7c6aff,#e040fb)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            marginBottom:'4px',
          }}>GIVIHUB</div>
          <div style={{ fontSize:'11px', color:'var(--t3)', lineHeight:'1.6' }}>
            Безопасный маркетплейс цифровых товаров и услуг. Все сделки защищены системой эскроу.
          </div>
        </div>

        {/* Contacts */}
        <div style={{ marginBottom:'16px' }}>
          <div style={{ fontSize:'11px', fontFamily:'var(--font-display)', letterSpacing:'0.1em', color:'var(--t3)', marginBottom:'8px', fontWeight:700 }}>КОНТАКТЫ</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            <a href="mailto:anvarikromov778@gmail.com" style={{ fontSize:'13px', color:'#a78bfa', textDecoration:'none', display:'flex', alignItems:'center', gap:'6px' }}>
              📧 anvarikromov778@gmail.com
            </a>
            <a href="https://t.me/givi_hu" target="_blank" rel="noreferrer" style={{ fontSize:'13px', color:'#a78bfa', textDecoration:'none', display:'flex', alignItems:'center', gap:'6px' }}>
              ✈️ @givi_hu
            </a>
          </div>
        </div>

        {/* Legal links */}
        <div style={{ marginBottom:'16px' }}>
          <div style={{ fontSize:'11px', fontFamily:'var(--font-display)', letterSpacing:'0.1em', color:'var(--t3)', marginBottom:'8px', fontWeight:700 }}>ДОКУМЕНТЫ</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
            {[
              { path:'privacy',  label:'Политика конфиденциальности' },
              { path:'offer',    label:'Договор оферты' },
              { path:'refund',   label:'Условия возврата' },
              { path:'contacts', label:'Контакты' },
            ].map(l => (
              <button key={l.path} onClick={() => navigate(`/legal/${l.path}`)} style={{
                background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                borderRadius:'20px', padding:'6px 12px',
                fontSize:'12px', color:'var(--t2)', cursor:'pointer',
                fontFamily:'var(--font-display)', letterSpacing:'0.04em',
                transition:'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(124,106,255,0.1)'; e.currentTarget.style.borderColor='rgba(124,106,255,0.3)'; e.currentTarget.style.color='#a78bfa' }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.color='var(--t2)' }}
              >{l.label}</button>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div style={{ marginBottom:'16px' }}>
          <div style={{ fontSize:'11px', fontFamily:'var(--font-display)', letterSpacing:'0.1em', color:'var(--t3)', marginBottom:'8px', fontWeight:700 }}>СПОСОБЫ ОПЛАТЫ</div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {['💳 Карты РФ', '📲 СБП', '₿ USDT', '💎 TON'].map(m => (
              <span key={m} style={{ fontSize:'12px', color:'var(--t3)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'4px 10px' }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div style={{ paddingTop:'14px', borderTop:'1px solid rgba(255,255,255,0.05)', textAlign:'center', fontSize:'11px', color:'var(--t4)' }}>
          © 2026 GIVIHUB. Все права защищены.
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product, i, onClick }) {
  const [vis,  setVis]  = useState(false)
  const [hov,  setHov]  = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), i * 55); return () => clearTimeout(t) }, [i])

  const price = parseFloat(product.price)
  const seller = product.seller || {}

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onTouchStart={() => setHov(true)} onTouchEnd={() => setHov(false)}
      style={{
        borderRadius:'20px', overflow:'hidden', cursor:'pointer',
        background: hov
          ? 'linear-gradient(145deg,rgba(124,106,255,0.09),rgba(10,12,26,0.97))'
          : 'linear-gradient(145deg,rgba(255,255,255,0.05),rgba(8,10,22,0.95))',
        border: `1px solid ${hov ? 'rgba(124,106,255,0.4)' : 'rgba(255,255,255,0.07)'}`,
        borderTop: `1px solid ${hov ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.11)'}`,
        boxShadow: hov
          ? '0 0 0 1px rgba(124,106,255,0.12), 0 8px 32px rgba(124,106,255,0.18), 0 20px 50px rgba(0,0,0,0.7)'
          : '0 4px 24px rgba(0,0,0,0.5)',
        opacity:    vis ? 1 : 0,
        transform:  vis ? (hov ? 'translateY(-4px) scale(1.01)' : 'translateY(0)') : 'translateY(20px) scale(0.95)',
        transition: `opacity 0.4s ${i*50}ms ease, transform ${vis ? '0.3s' : `0.4s ${i*50}ms`} cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s, box-shadow 0.25s, background 0.2s`,
        backdropFilter:'blur(10px)',
      }}
    >
      {/* Image / logo */}
      <div style={{ height:'120px', position:'relative', overflow:'hidden', background:'linear-gradient(160deg,#10061e,#04040f)' }}>
        {product.images?.[0] ? (
          <>
            <img src={product.images[0]} alt="" style={{
              width:'100%', height:'100%', objectFit:'cover',
              opacity: hov ? 0.88 : 0.78,
              transform: hov ? 'scale(1.06)' : 'scale(1)',
              transition:'all 0.4s ease',
            }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 30%,rgba(0,0,0,0.6))' }}/>
          </>
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <GameLogo title={product.title} game={product.game} category={product.category} size={64}
              style={{ transform: hov ? 'scale(1.1)' : 'scale(1)', transition:'transform 0.3s ease' }}
            />
          </div>
        )}

        {/* top glass */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'35%', background:'linear-gradient(180deg,rgba(255,255,255,0.07),transparent)', pointerEvents:'none' }}/>

        {product.isPromoted && (
          <div style={{
            position:'absolute', top:'8px', left:'8px',
            background:'linear-gradient(135deg,#fbbf24,#f59e0b)',
            color:'#1a0a00', fontSize:'9px', fontWeight:800,
            padding:'3px 8px', borderRadius:'100px', letterSpacing:'0.08em',
            fontFamily:'var(--font-display)',
            boxShadow:'0 0 12px rgba(251,191,36,0.5)',
          }}>★ ТОП</div>
        )}

        {/* price */}
        <div style={{
          position:'absolute', bottom:'8px', right:'8px',
          background:'rgba(0,0,0,0.85)', backdropFilter:'blur(12px)',
          border:'1px solid rgba(124,106,255,0.4)',
          color:'#a78bfa', fontSize:'15px', fontWeight:800,
          padding:'4px 10px', borderRadius:'9px',
          fontFamily:'var(--font-display)',
          boxShadow:'0 0 12px rgba(124,106,255,0.25)',
          textShadow:'0 0 8px rgba(167,139,250,0.5)',
        }}>
          ${price.toFixed(2)}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding:'10px 12px 12px' }}>
        <div style={{
          fontSize:'13px', fontWeight:600, color:'var(--t1)', lineHeight:'1.35', marginBottom:'8px',
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
        }}>
          {product.title}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'6px' }}>
          <div style={{ fontSize:'11px', color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>
            {seller.username || seller.firstName || 'Продавец'}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'3px', flexShrink:0 }}>
            <IC.Star s={11} c="#fbbf24" fill="#fbbf24"/>
            <span style={{ fontSize:'11px', color:'#fbbf24', fontWeight:700, textShadow:'0 0 5px rgba(251,191,36,0.5)' }}>
              {parseFloat(seller.rating || 5).toFixed(1)}
            </span>
          </div>
        </div>
        <div style={{ marginTop:'5px' }}>
          <RubleAmount usd={price} size="sm"/>
        </div>
      </div>
    </div>
  )
}

function SkelCard() {
  return (
    <div style={{ borderRadius:'20px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.05)', background:'rgba(10,12,26,0.9)' }}>
      <div className="skel" style={{ height:'120px', borderRadius:0 }}/>
      <div style={{ padding:'10px 12px 12px', display:'flex', flexDirection:'column', gap:'7px' }}>
        <div className="skel" style={{ height:'12px' }}/>
        <div className="skel" style={{ height:'12px', width:'65%' }}/>
        <div className="skel" style={{ height:'10px', width:'40%' }}/>
      </div>
    </div>
  )
}

function NoResults() {
  return (
    <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'80px 20px' }}>
      <IC.Search s={50} c="rgba(255,255,255,0.06)"/>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:700, color:'var(--t3)', marginTop:'16px', letterSpacing:'0.08em' }}>
        НИЧЕГО НЕ НАЙДЕНО
      </div>
    </div>
  )
}
