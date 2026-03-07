import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { GameLogo, IC } from '../components/Icons'
import { RubleAmount, useRate } from '../components/RubleDisplay'

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

// ─── Fake slides shown until real promoted products exist ─────────────────────
const FAKE_SLIDES = [
  {
    id: 'f1',
    title: 'CS2 Premier Account',
    subtitle: 'Рейтинг 15,000+ · Prime · Нет банов',
    price: 12.99,
    badge: '🔥 ХИТ',
    badgeColor: '#f97316',
    gradient: 'linear-gradient(135deg,#1a0533 0%,#2d0a5e 50%,#0f0222 100%)',
    accent: '#a78bfa',
    emoji: '🎮',
  },
  {
    id: 'f2',
    title: 'Adobe CC 2024',
    subtitle: 'Полная лицензия · Все приложения · 1 год',
    price: 8.50,
    badge: '⚡ ЛИЦЕНЗИЯ',
    badgeColor: '#0ea5e9',
    gradient: 'linear-gradient(135deg,#001a33 0%,#003366 50%,#001122 100%)',
    accent: '#38bdf8',
    emoji: '💻',
  },
  {
    id: 'f3',
    title: 'Instagram 10K Подписчики',
    subtitle: 'Живые аккаунты · Гарантия 30 дней',
    price: 5.99,
    badge: '📱 СОЦСЕТИ',
    badgeColor: '#ec4899',
    gradient: 'linear-gradient(135deg,#33001a 0%,#660033 50%,#1a0011 100%)',
    accent: '#f472b6',
    emoji: '📱',
  },
  {
    id: 'f4',
    title: 'Dota 2 Immortal Items',
    subtitle: 'Редкие предметы · Быстрая доставка',
    price: 24.00,
    badge: '💎 РЕДКОСТЬ',
    badgeColor: '#fbbf24',
    gradient: 'linear-gradient(135deg,#1a1200 0%,#3d2b00 50%,#0d0800 100%)',
    accent: '#fbbf24',
    emoji: '⚔️',
  },
]

// ─── Slideshow component ──────────────────────────────────────────────────────
function Slideshow({ products, onSlideClick }) {
  const [idx,      setIdx]      = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dragDx,   setDragDx]   = useState(0)
  const startX     = useRef(0)
  const timerRef   = useRef(null)
  const rate       = useRate()

  // Merge promoted products with fake slides
  const slides = products.length > 0
    ? products.map(p => ({
        id:       p.id,
        title:    p.title,
        subtitle: p.description?.slice(0, 60) || `${p.category} · ${p.deliveryType || 'digital'}`,
        price:    parseFloat(p.price),
        badge:    '★ ПРОМО',
        badgeColor: '#a78bfa',
        gradient: 'linear-gradient(135deg,#0d0a1f 0%,#1a1040 50%,#080614 100%)',
        accent:   '#a78bfa',
        image:    p.images?.[0] || null,
        isReal:   true,
      }))
    : FAKE_SLIDES

  const n = slides.length

  const autoNext = useCallback(() => {
    setIdx(i => (i + 1) % n)
  }, [n])

  useEffect(() => {
    timerRef.current = setInterval(autoNext, 4000)
    return () => clearInterval(timerRef.current)
  }, [autoNext])

  const resetTimer = () => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(autoNext, 4000)
  }

  const goTo = (i) => { setIdx(i); resetTimer() }

  // Touch/mouse drag
  const onStart = (clientX) => { setDragging(true); startX.current = clientX; setDragDx(0) }
  const onMove  = (clientX) => { if (dragging) setDragDx(clientX - startX.current) }
  const onEnd   = () => {
    if (Math.abs(dragDx) > 50) {
      const next = dragDx < 0 ? (idx + 1) % n : (idx - 1 + n) % n
      setIdx(next); resetTimer()
    }
    setDragging(false); setDragDx(0)
  }

  const slide = slides[idx]

  return (
    <div style={{ padding: '0 14px', marginBottom: 16 }}>
      <div
        style={{
          borderRadius: 24, overflow: 'hidden', position: 'relative',
          height: 200, cursor: 'pointer',
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
        onClick={() => { if (Math.abs(dragDx) < 10 && slide.isReal) onSlideClick(slide.id) }}
        onMouseDown={e => onStart(e.clientX)}
        onMouseMove={e => onMove(e.clientX)}
        onMouseUp={onEnd}
        onTouchStart={e => onStart(e.touches[0].clientX)}
        onTouchMove={e => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
      >
        {/* Slide background */}
        {slides.map((s, i) => (
          <div key={s.id} style={{
            position: 'absolute', inset: 0,
            background: s.gradient,
            opacity: i === idx ? 1 : 0,
            transition: 'opacity 0.55s ease',
            pointerEvents: 'none',
          }}>
            {s.image && (
              <img src={s.image} alt="" style={{
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: 0.35, position: 'absolute', inset: 0,
              }}/>
            )}
          </div>
        ))}

        {/* Shimmer overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(135deg,rgba(255,255,255,0.05) 0%,transparent 50%,rgba(0,0,0,0.3) 100%)',
        }}/>

        {/* Glowing orb */}
        <div style={{
          position: 'absolute', right: -30, top: -30,
          width: 180, height: 180, borderRadius: '50%',
          background: `radial-gradient(circle, ${slide.accent}25, transparent 70%)`,
          pointerEvents: 'none',
          transition: 'background 0.55s ease',
        }}/>

        {/* Content */}
        <div style={{ position: 'absolute', inset: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Top row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{
              fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-display)',
              letterSpacing: '0.08em', color: slide.badgeColor,
              background: `${slide.badgeColor}18`,
              border: `1px solid ${slide.badgeColor}40`,
              padding: '4px 10px', borderRadius: 100,
              backdropFilter: 'blur(8px)',
              boxShadow: `0 0 12px ${slide.badgeColor}30`,
              transition: 'all 0.4s',
            }}>
              {slide.badge}
            </div>
            <div style={{ fontSize: 36, filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.2))' }}>
              {slide.emoji || '📦'}
            </div>
          </div>

          {/* Bottom: title + price */}
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800,
              color: '#fff', lineHeight: 1.2, marginBottom: 4,
              textShadow: '0 2px 12px rgba(0,0,0,0.8)',
              transition: 'all 0.4s',
            }}>
              {slide.title}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
              {slide.subtitle}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
                  color: slide.accent,
                  textShadow: `0 0 20px ${slide.accent}60`,
                  transition: 'color 0.4s',
                }}>
                  ${slide.price.toFixed(2)}
                </span>
                {rate && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                    ≈ {Math.round(slide.price * rate).toLocaleString('ru')} ₽
                  </span>
                )}
              </div>
              {slide.isReal && (
                <div style={{
                  fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700,
                  color: slide.accent, border: `1px solid ${slide.accent}50`,
                  padding: '6px 14px', borderRadius: 100, letterSpacing: '0.05em',
                  backdropFilter: 'blur(8px)',
                  background: `${slide.accent}12`,
                }}>
                  СМОТРЕТЬ →
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} style={{
            border: 'none', cursor: 'pointer', padding: 0,
            width: i === idx ? 20 : 6, height: 6, borderRadius: 3,
            background: i === idx ? slide.accent : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: i === idx ? `0 0 8px ${slide.accent}60` : 'none',
          }}/>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate  = useNavigate()
  const { user }  = useStore()
  const rate      = useRate()
  const [products,  setProducts]  = useState([])
  const [promoted,  setPromoted]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [cat,       setCat]       = useState('all')
  const [search,    setSearch]    = useState('')
  const [sort,      setSort]      = useState('createdAt')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/products', {
        params: { category: cat === 'all' ? undefined : cat, search: search || undefined, sort },
      })
      setProducts(data.products || [])
      // Promoted = isPromoted flag
      const promo = (data.products || []).filter(p => p.isPromoted).slice(0, 6)
      setPromoted(promo)
    } catch {}
    setLoading(false)
  }, [cat, sort, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 380 : 0)
    return () => clearTimeout(t)
  }, [load])

  const bal    = parseFloat(user?.balance || 0)
  const rubBal = rate ? Math.round(bal * rate) : null

  return (
    <div style={{ minHeight: '100%' }}>
      {/* ── STICKY HEADER ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(6,8,17,0.96)', backdropFilter: 'blur(32px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ padding: '14px 14px 0' }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800,
                letterSpacing: '0.04em', lineHeight: 1,
                background: 'linear-gradient(135deg,#a78bfa 0%,#7c6aff 40%,#e040fb 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 12px rgba(124,106,255,0.5))',
              }}>GIVIHUB</div>
              <div style={{ fontSize: 8, color: 'rgba(167,139,250,0.35)', letterSpacing: '0.22em', fontFamily: 'var(--font-display)', marginTop: 1 }}>
                DIGITAL MARKETPLACE
              </div>
            </div>

            {user ? (
              <div onClick={() => navigate('/wallet')} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                padding: '7px 14px', borderRadius: 100, cursor: 'pointer',
                background: 'rgba(124,106,255,0.1)', border: '1px solid rgba(124,106,255,0.3)',
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IC.Diamond s={13} c="#a78bfa"/>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#a78bfa', textShadow: '0 0 10px rgba(167,139,250,0.5)' }}>
                    ${bal.toFixed(2)}
                  </span>
                </div>
                {rubBal != null && (
                  <span style={{ fontSize: 10, color: 'rgba(167,139,250,0.4)', fontWeight: 600 }}>
                    ≈ {rubBal.toLocaleString('ru')} ₽
                  </span>
                )}
              </div>
            ) : (
              <button className="btn btn-violet btn-sm" onClick={() => navigate('/auth')}
                style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.06em' }}>
                <IC.Exit s={13} c="white"/> Войти
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }}>
              <IC.Search s={16}/>
            </div>
            <input className="inp" placeholder="Поиск товаров..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 40, paddingRight: search ? 36 : 13, height: 42, borderRadius: 100, fontSize: 14 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: 2 }}>
                <IC.X s={15}/>
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="scroll-x" style={{ display: 'flex', gap: 6, paddingBottom: 12 }}>
            {CATS.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} style={{
                padding: '7px 14px', borderRadius: 100, whiteSpace: 'nowrap', cursor: 'pointer',
                border: `1px solid ${cat === c.id ? 'rgba(124,106,255,0.5)' : 'rgba(255,255,255,0.07)'}`,
                background: cat === c.id ? 'rgba(124,106,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: cat === c.id ? '#a78bfa' : 'var(--t2)',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.2s ease',
              }}>
                <span style={{ fontSize: 13 }}>{c.emoji}</span> {c.l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(124,106,255,0.3),transparent)' }}/>
      </div>

      {/* ── SLIDESHOW (shown when no search/filter active) ── */}
      {!search && cat === 'all' && (
        <div style={{ paddingTop: 16 }}>
          <Slideshow products={promoted} onSlideClick={id => navigate(`/product/${id}`)}/>
        </div>
      )}

      {/* ── TOOLBAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 10px' }}>
        <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em' }}>
          {loading ? '...' : `${products.length} ТОВАРОВ`}
        </span>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--t2)', padding: '5px 10px', borderRadius: 9,
          fontSize: 11, cursor: 'pointer', outline: 'none',
          fontFamily: 'var(--font-display)', fontWeight: 700,
        }}>
          <option value="createdAt">Новые</option>
          <option value="price_asc">Дешевле</option>
          <option value="price_desc">Дороже</option>
          <option value="popular">Популярные</option>
        </select>
      </div>

      {/* ── PRODUCT GRID ── */}
      <div style={{ padding: '0 10px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {loading
          ? Array(6).fill(0).map((_, i) => <SkelCard key={i}/>)
          : products.length === 0 ? <NoResults/>
          : products.map((p, i) => (
              <ProductCard key={p.id} product={p} i={i} rate={rate} onClick={() => navigate(`/product/${p.id}`)}/>
            ))
        }
      </div>
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, i, rate, onClick }) {
  const [vis, setVis] = useState(false)
  const [hov, setHov] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), i * 55); return () => clearTimeout(t) }, [i])

  const price  = parseFloat(product.price)
  const seller = product.seller || {}
  const rub    = rate ? Math.round(price * rate) : null

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onTouchStart={() => setHov(true)} onTouchEnd={() => setHov(false)}
      style={{
        borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
        background: hov
          ? 'linear-gradient(145deg,rgba(124,106,255,0.09),rgba(10,12,26,0.97))'
          : 'linear-gradient(145deg,rgba(255,255,255,0.05),rgba(8,10,22,0.95))',
        border: `1px solid ${hov ? 'rgba(124,106,255,0.4)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hov
          ? '0 0 0 1px rgba(124,106,255,0.12), 0 8px 32px rgba(124,106,255,0.18)'
          : '0 4px 24px rgba(0,0,0,0.5)',
        opacity:   vis ? 1 : 0,
        transform: vis ? (hov ? 'translateY(-4px) scale(1.01)' : 'translateY(0)') : 'translateY(20px) scale(0.95)',
        transition: `opacity 0.4s ${i*50}ms, transform ${vis ? '0.3s' : `0.4s ${i*50}ms`} cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s, box-shadow 0.25s`,
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Image */}
      <div style={{ height: 120, position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg,#10061e,#04040f)' }}>
        {product.images?.[0] ? (
          <>
            <img src={product.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: hov ? 0.88 : 0.78, transform: hov ? 'scale(1.06)' : 'scale(1)', transition: 'all 0.4s' }}/>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 30%,rgba(0,0,0,0.6))' }}/>
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GameLogo title={product.title} game={product.game} category={product.category} size={64} style={{ transform: hov ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.3s' }}/>
          </div>
        )}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(180deg,rgba(255,255,255,0.07),transparent)', pointerEvents: 'none' }}/>
        {product.isPromoted && (
          <div style={{ position: 'absolute', top: 8, left: 8, background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#1a0a00', fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 100, letterSpacing: '0.08em', fontFamily: 'var(--font-display)', boxShadow: '0 0 12px rgba(251,191,36,0.5)' }}>★ ТОП</div>
        )}
        {/* Price badge */}
        <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(124,106,255,0.4)', color: '#a78bfa', fontSize: 15, fontWeight: 800, padding: '4px 10px', borderRadius: 9, fontFamily: 'var(--font-display)', boxShadow: '0 0 12px rgba(124,106,255,0.25)', textShadow: '0 0 8px rgba(167,139,250,0.5)' }}>
          ${price.toFixed(2)}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.35, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {seller.username || seller.firstName || 'Продавец'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            <IC.Star s={11} c="#fbbf24" fill="#fbbf24"/>
            <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>
              {parseFloat(seller.rating || 5).toFixed(1)}
            </span>
          </div>
        </div>
        {rub != null && (
          <div style={{ marginTop: 5, fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>
            ≈ {rub.toLocaleString('ru')} ₽
          </div>
        )}
      </div>
    </div>
  )
}

function SkelCard() {
  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,12,26,0.9)' }}>
      <div className="skel" style={{ height: 120, borderRadius: 0 }}/>
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div className="skel" style={{ height: 12 }}/>
        <div className="skel" style={{ height: 12, width: '65%' }}/>
        <div className="skel" style={{ height: 10, width: '40%' }}/>
      </div>
    </div>
  )
}

function NoResults() {
  return (
    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 20px' }}>
      <IC.Search s={50} c="rgba(255,255,255,0.06)"/>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--t3)', marginTop: 16, letterSpacing: '0.08em' }}>
        НИЧЕГО НЕ НАЙДЕНО
      </div>
    </div>
  )
}
