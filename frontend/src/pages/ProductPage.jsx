import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC, GameLogo } from '../components/Icons'
import { RubleAmount, BuyerPriceBreakdown, useRate } from '../components/RubleDisplay'
import toast from 'react-hot-toast'

export default function ProductPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useStore()
  const rate = useRate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx,  setImgIdx]  = useState(0)
  const [buying,  setBuying]  = useState(false)
  const [fav,     setFav]     = useState(false)

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(({ data }) => { setProduct(data); setFav(data.isFavorite || false) })
      .catch(() => toast.error('Товар не найден'))
      .finally(() => setLoading(false))
  }, [id])

  const buy = async () => {
    if (!user) return navigate('/auth')
    setBuying(true)
    try {
      const { data } = await api.post('/deals', { productId: id })
      toast.success('Сделка создана!')
      navigate(`/deal/${data.id}`)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка')
    }
    setBuying(false)
  }

  const toggleFav = async () => {
    if (!user) return navigate('/auth')
    setFav(f => !f)
    try { await api.post(`/products/${id}/favorite`) }
    catch { setFav(f => !f) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh' }}>
      <div style={{ width:'32px', height:'32px', borderRadius:'50%', border:'3px solid rgba(124,106,255,0.15)', borderTop:'3px solid #7c6aff', animation:'rotateSpin 0.8s linear infinite' }}/>
    </div>
  )

  if (!product) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', gap:'16px' }}>
      <div style={{ color:'var(--t3)', fontFamily:'var(--font-display)', letterSpacing:'0.1em' }}>ТОВАР НЕ НАЙДЕН</div>
      <button className="btn btn-ghost" onClick={() => navigate('/')}>← Назад</button>
    </div>
  )

  const price      = parseFloat(product.price)
  const buyerTotal = price * 1.05
  const seller = product.seller || {}
  const images = product.images || []
  const isMine = user?.id === product.sellerId
  const canBuy = !isMine && product.status === 'active'

  return (
    // extra bottom padding so content is not hidden under buy bar + nav
    <div style={{ minHeight:'100%', paddingBottom: canBuy ? '140px' : '20px' }}>

      {/* ── Sticky header ── */}
      <div style={{
        padding:'12px 14px', background:'rgba(6,8,17,0.97)',
        backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.06)',
        position:'sticky', top:0, zIndex:40,
        display:'flex', alignItems:'center', gap:'10px',
      }}>
        <button onClick={() => navigate(-1)} className="btn-icon"><IC.Back s={18}/></button>
        <div style={{ flex:1, fontSize:'15px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {product.title}
        </div>
        <button onClick={toggleFav} style={{
          width:'36px', height:'36px', borderRadius:'11px', border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          background: fav ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.05)',
          transition:'all 0.2s',
        }}>
          <IC.Heart s={17} c={fav ? '#f87171' : 'var(--t3)'} fill={fav ? '#f87171' : 'none'}/>
        </button>
      </div>

      {/* ── Image gallery ── */}
      <div style={{ height:'240px', position:'relative', background:'linear-gradient(160deg,#10061e,#04040f)', overflow:'hidden' }}>
        {images.length > 0 ? (
          <>
            <img src={images[imgIdx]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.85 }}
              onError={e => { e.target.style.display='none' }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 40%,rgba(6,8,17,0.85))' }}/>
            {images.length > 1 && (
              <div style={{ position:'absolute', bottom:'12px', left:'50%', transform:'translateX(-50%)', display:'flex', gap:'5px', zIndex:2 }}>
                {images.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} style={{
                    width: i===imgIdx ? '20px' : '6px', height:'6px', borderRadius:'3px',
                    border:'none', cursor:'pointer',
                    background: i===imgIdx ? '#7c6aff' : 'rgba(255,255,255,0.3)',
                    transition:'all 0.2s',
                  }}/>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <GameLogo title={product.title} game={product.game} category={product.category} size={100}/>
          </div>
        )}
      </div>

      <div style={{ padding:'20px 14px' }}>
        {/* Title + price */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'14px' }}>
          <h1 style={{ fontSize:'22px', fontWeight:700, lineHeight:'1.3', flex:1, margin:0 }}>{product.title}</h1>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:800, color:'#a78bfa', textShadow:'0 0 15px rgba(167,139,250,0.5)' }}>
              ${price.toFixed(2)}
            </div>
            <RubleAmount usd={price} size="sm"/>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display:'flex', gap:'7px', flexWrap:'wrap', marginBottom:'18px' }}>
          {product.category    && <Badge color="#7c6aff">{product.category}</Badge>}
          {product.game        && <Badge color="#22d3ee">{product.game}</Badge>}
          {product.platform    && <Badge color="#4ade80">{product.platform}</Badge>}
          {product.deliveryType && <Badge color="#e040fb">{product.deliveryType}</Badge>}
          {product.status === 'active' && <Badge color="#4ade80">● В наличии</Badge>}
          {product.status !== 'active' && <Badge color="#f87171">Недоступен</Badge>}
        </div>

        {/* Seller */}
        <div style={{ padding:'14px', borderRadius:'16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:'12px', marginBottom:'18px' }}>
          <div style={{ width:'44px', height:'44px', borderRadius:'13px', background:'linear-gradient(135deg,#9d8fff,#7c6aff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:800, color:'white', fontFamily:'var(--font-display)', flexShrink:0 }}>
            {(seller.firstName||seller.username||'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'3px', display:'flex', alignItems:'center', gap:'6px' }}>
              {seller.firstName||seller.username||'Продавец'}
              {seller.isVerified && <Badge color="#4ade80" size="xs">✓ VIP</Badge>}
            </div>
            <div style={{ fontSize:'12px', color:'var(--t3)', display:'flex', alignItems:'center', gap:'5px' }}>
              <IC.Star s={11} c="#fbbf24" fill="#fbbf24"/>
              <span style={{ color:'#fbbf24', fontWeight:700 }}>{parseFloat(seller.rating||5).toFixed(1)}</span>
              <span>· {seller.totalSales||0} продаж</span>
            </div>
          </div>
        </div>

        {/* Commission breakdown for buyers */}
        {canBuy && (
          <div style={{ marginBottom:'18px', padding:'14px', borderRadius:'14px', background:'rgba(124,106,255,0.05)', border:'1px solid rgba(124,106,255,0.15)' }}>
            <div style={{ fontSize:'11px', fontFamily:'var(--font-display)', fontWeight:700, color:'rgba(167,139,250,0.5)', letterSpacing:'0.1em', marginBottom:'10px' }}>РАСЧЁТ СТОИМОСТИ</div>
            <BuyerPriceBreakdown usd={price}/>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div style={{ marginBottom:'18px' }}>
            <SectionLabel>ОПИСАНИЕ</SectionLabel>
            <div style={{ fontSize:'14px', color:'var(--t2)', lineHeight:'1.65', whiteSpace:'pre-wrap' }}>{product.description}</div>
          </div>
        )}

        {/* Details */}
        {[product.platform,product.region,product.deliveryType,product.stock].some(Boolean) && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'18px' }}>
            {[
              { l:'Платформа', v:product.platform },
              { l:'Регион',    v:product.region },
              { l:'Доставка',  v:product.deliveryType },
              { l:'В наличии', v:product.stock ? `${product.stock} шт.` : null },
            ].filter(x=>x.v).map(x => (
              <div key={x.l} style={{ padding:'10px 12px', borderRadius:'11px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize:'9px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.1em', marginBottom:'4px' }}>{x.l.toUpperCase()}</div>
                <div style={{ fontSize:'13px', fontWeight:600 }}>{x.v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Own product */}
        {isMine && (
          <div style={{ padding:'14px', borderRadius:'14px', background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', display:'flex', alignItems:'center', gap:'10px' }}>
            <IC.Eye s={16} c="#22d3ee"/>
            <span style={{ fontSize:'13px', color:'#22d3ee', fontWeight:600 }}>Это ваш товар — покупка недоступна</span>
          </div>
        )}

        {/* Unavailable */}
        {!isMine && product.status !== 'active' && (
          <div style={{ padding:'14px', borderRadius:'14px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', display:'flex', alignItems:'center', gap:'10px' }}>
            <IC.Lock s={16} c="#f87171"/>
            <span style={{ fontSize:'13px', color:'#f87171', fontWeight:600 }}>Товар сейчас недоступен для покупки</span>
          </div>
        )}
      </div>

      {/* ── BUY BAR — fixed ABOVE bottom nav (68px) ── */}
      {canBuy && (
        <div style={{
          position:'fixed',
          bottom:'68px',      /* sits right above the 68px bottom nav */
          left:0, right:0,
          zIndex:90,
          padding:'12px 16px 14px',
          background:'linear-gradient(to top, rgba(6,8,17,0.99) 80%, rgba(6,8,17,0.0))',
          backdropFilter:'blur(16px)',
          borderTop:'1px solid rgba(124,106,255,0.15)',
        }}>
          <div style={{ display:'flex', gap:'12px', alignItems:'center', maxWidth:'500px', margin:'0 auto' }}>
            <div style={{ flexShrink:0 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'22px', color:'#a78bfa', textShadow:'0 0 10px rgba(167,139,250,0.4)', lineHeight:1 }}>
                ${buyerTotal.toFixed(2)}
              </div>
              <div style={{ fontSize:'10px', color:'var(--t3)' }}>+5% комиссия</div>
              {rate && <div style={{ fontSize:'11px', color:'var(--t3)', fontWeight:600 }}>≈{Math.round(buyerTotal*rate).toLocaleString('ru')}₽</div>}
            </div>
            <button
              className="btn btn-violet btn-full btn-lg"
              onClick={buy}
              disabled={buying}
              style={{ flex:1, fontFamily:'var(--font-display)', fontSize:'15px', letterSpacing:'0.06em', gap:'9px' }}
            >
              {buying
                ? <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)', borderTop:'2px solid white', animation:'rotateSpin 0.7s linear infinite' }}/>
                : <IC.Diamond s={17} c="white"/>
              }
              {buying ? 'ОФОРМЛЕНИЕ...' : user ? 'КУПИТЬ СЕЙЧАС' : 'ВОЙТИ И КУПИТЬ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ children, color, size }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:'3px',
      padding: size==='xs' ? '2px 6px' : '4px 10px',
      borderRadius:'100px',
      background:`${color}14`, border:`1px solid ${color}30`,
      fontSize: size==='xs' ? '10px' : '11px',
      color, fontWeight:700,
    }}>{children}</span>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:'11px', fontFamily:'var(--font-display)', fontWeight:700, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:'8px' }}>{children}</div>
}
