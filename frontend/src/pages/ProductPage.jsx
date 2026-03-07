import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC, GameLogo } from '../components/Icons'
import { RubleAmount } from '../components/RubleDisplay'
import toast from 'react-hot-toast'

export default function ProductPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { user }  = useStore()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx,  setImgIdx]  = useState(0)
  const [buying,  setBuying]  = useState(false)
  const [fav,     setFav]     = useState(false)

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(({ data }) => { setProduct(data); setFav(data.isFavorite) })
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
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setBuying(false)
  }

  const toggleFav = async () => {
    if (!user) return navigate('/auth')
    setFav(!fav)
    try { await api.post(`/products/${id}/favorite`) }
    catch { setFav(fav) }
  }

  if (loading) return <Loader/>
  if (!product) return null

  const price  = parseFloat(product.price)
  const seller = product.seller || {}
  const images = product.images || []
  const isMine = user?.id === product.sellerId

  return (
    <div style={{ minHeight:'100%', paddingBottom:'100px' }}>
      {/* Header */}
      <div style={{ padding:'12px 14px', background:'rgba(6,8,17,0.97)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={() => navigate(-1)} className="btn-icon"><IC.Back s={18}/></button>
          <div style={{ flex:1, fontSize:'15px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {product.title}
          </div>
          <button onClick={toggleFav} style={{
            width:'36px', height:'36px', borderRadius:'11px', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            background: fav ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.05)',
            transition:'all 0.2s', animation: fav ? 'heartBeat 0.4s ease' : 'none',
          }}>
            <IC.Heart s={17} c={fav ? '#f87171' : 'var(--t3)'} fill={fav ? '#f87171' : 'none'}/>
          </button>
        </div>
      </div>

      {/* Image */}
      <div style={{ height:'240px', position:'relative', background:'linear-gradient(160deg,#10061e,#04040f)', overflow:'hidden' }}>
        {images.length > 0 ? (
          <>
            <img src={images[imgIdx]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.85 }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 40%,rgba(6,8,17,0.9))' }}/>
            {images.length > 1 && (
              <div style={{ position:'absolute', bottom:'12px', left:'50%', transform:'translateX(-50%)', display:'flex', gap:'5px' }}>
                {images.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} style={{
                    width: i === imgIdx ? '20px' : '6px', height:'6px', borderRadius:'3px',
                    background: i === imgIdx ? '#7c6aff' : 'rgba(255,255,255,0.3)',
                    border:'none', cursor:'pointer', transition:'all 0.2s',
                    boxShadow: i === imgIdx ? '0 0 8px rgba(124,106,255,0.7)' : 'none',
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
        {/* top glass */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'35%', background:'linear-gradient(180deg,rgba(6,8,17,0.6),transparent)', pointerEvents:'none' }}/>
      </div>

      <div style={{ padding:'20px 14px' }}>
        {/* Title + price */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'16px' }}>
          <h1 style={{ fontSize:'22px', fontWeight:700, lineHeight:'1.3', flex:1 }}>{product.title}</h1>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:800, color:'#a78bfa', textShadow:'0 0 15px rgba(167,139,250,0.5)' }}>
              ${price.toFixed(2)}
            </div>
            <RubleAmount usd={price} size="sm"/>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display:'flex', gap:'7px', flexWrap:'wrap', marginBottom:'18px' }}>
          {product.category && <span className="badge badge-violet">{product.category}</span>}
          {product.game     && <span className="badge badge-cyan">{product.game}</span>}
          {product.isPromoted && <span className="badge badge-amber">★ ТОП</span>}
        </div>

        {/* Seller */}
        <div style={{ padding:'14px', borderRadius:'16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
          <div style={{ width:'44px', height:'44px', borderRadius:'13px', background:'linear-gradient(135deg,#9d8fff,#7c6aff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:800, color:'white', fontFamily:'var(--font-display)', flexShrink:0 }}>
            {(seller.firstName || seller.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'3px' }}>{seller.firstName || seller.username || 'Продавец'}</div>
            <div style={{ fontSize:'12px', color:'var(--t3)' }}>
              {seller.totalSales || 0} продаж · <IC.Star s={11} c="#fbbf24" fill="#fbbf24" style={{ verticalAlign:'middle' }}/> {parseFloat(seller.rating || 5).toFixed(1)}
            </div>
          </div>
          {seller.isVerified && <span className="badge badge-green"><IC.Check s={9} c="#4ade80"/> VIP</span>}
        </div>

        {/* Description */}
        {product.description && (
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontFamily:'var(--font-display)', fontWeight:700, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:'8px' }}>ОПИСАНИЕ</div>
            <div style={{ fontSize:'14px', color:'var(--t2)', lineHeight:'1.6', whiteSpace:'pre-wrap' }}>{product.description}</div>
          </div>
        )}

        {/* Details */}
        {(product.platform || product.region || product.deliveryType) && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'18px' }}>
            {[
              { l:'Платформа', v:product.platform },
              { l:'Регион',    v:product.region },
              { l:'Доставка',  v:product.deliveryType },
              { l:'В наличии', v:product.stock > 0 ? `${product.stock} шт.` : 'Нет' },
            ].filter(x => x.v).map(x => (
              <div key={x.l} style={{ padding:'10px 12px', borderRadius:'11px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize:'9px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.1em', marginBottom:'4px' }}>{x.l.toUpperCase()}</div>
                <div style={{ fontSize:'13px', fontWeight:600, color:'var(--t1)' }}>{x.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buy bar */}
      {!isMine && (
        <div style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:50,
          padding:'12px 14px', paddingBottom:'calc(12px + env(safe-area-inset-bottom,0px))',
          background:'rgba(6,8,17,0.97)', backdropFilter:'blur(28px)',
          borderTop:'1px solid rgba(255,255,255,0.07)',
          boxShadow:'0 -4px 30px rgba(0,0,0,0.7)',
        }}>
          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'20px', color:'#a78bfa', textShadow:'0 0 10px rgba(167,139,250,0.5)' }}>${price.toFixed(2)}</div>
              <RubleAmount usd={price} size="sm"/>
            </div>
            <button className="btn btn-violet btn-full btn-lg" onClick={buy} disabled={buying}
              style={{ fontFamily:'var(--font-display)', fontSize:'15px', letterSpacing:'0.06em', gap:'8px' }}>
              {buying
                ? <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)', borderTop:'2px solid white', animation:'rotateSpin 0.7s linear infinite' }}/>
                : <IC.Diamond s={17} c="white"/>
              }
              {buying ? 'СОЗДАНИЕ...' : 'КУПИТЬ СЕЙЧАС'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Loader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh' }}>
      <div style={{ width:'32px', height:'32px', borderRadius:'50%', border:'3px solid rgba(124,106,255,0.15)', borderTop:'3px solid #7c6aff', animation:'rotateSpin 0.8s linear infinite' }}/>
    </div>
  )
}
