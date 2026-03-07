import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import GameLogo from '../components/GameLogo'
import toast from 'react-hot-toast'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refreshBalance } = useStore()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  useEffect(() => {
    api.get(`/products/${id}`).then(r=>{ setProduct(r.data); setLoading(false) }).catch(()=>setLoading(false))
  }, [id])

  const buy = async () => {
    if (!user) return navigate('/auth')
    if (parseFloat(user.balance) < parseFloat(product.price)) {
      toast.error('Недостаточно средств'); return navigate('/wallet')
    }
    setBuying(true)
    try {
      const { data } = await api.post('/deals', { productId: product.id })
      await refreshBalance()
      toast.success('🎉 Сделка создана! Деньги заморожены.')
      navigate(`/deal/${data.id}`)
    } catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
    setBuying(false)
  }

  if (loading) return <Loader/>
  if (!product) return <div style={{padding:'40px',textAlign:'center',fontFamily:'var(--font-d)',color:'var(--text3)',fontSize:'18px'}}>ТОВАР НЕ НАЙДЕН</div>

  const seller = product.seller||{}
  const imgs = product.images||[]
  const isMine = user&&product.sellerId===user.id
  const price = parseFloat(product.price)

  return (
    <div style={{minHeight:'100%'}}>
      {/* Back header */}
      <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',position:'sticky',top:0,background:'rgba(8,8,8,0.95)',zIndex:10,borderBottom:'1px solid rgba(255,102,0,0.15)',backdropFilter:'blur(20px)'}}>
        <button onClick={()=>navigate(-1)} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',width:'34px',height:'34px',cursor:'pointer',color:'var(--text)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>←</button>
        <span style={{fontFamily:'var(--font-d)',fontWeight:700,fontSize:'16px',letterSpacing:'0.05em',color:'var(--text)'}}>ТОВАР</span>
      </div>

      {/* Image */}
      <div style={{height:'220px',position:'relative',overflow:'hidden',background:'linear-gradient(135deg,#0a0808,#080a14)'}}>
        {imgs.length>0 ? (
          <>
            <img src={imgs[imgIdx]} alt="" style={{width:'100%',height:'100%',objectFit:'cover',opacity:0.85}}/>
            {imgs.length>1&&(
              <div style={{position:'absolute',bottom:'12px',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'6px'}}>
                {imgs.map((_,i)=>(
                  <div key={i} onClick={()=>setImgIdx(i)} style={{width:i===imgIdx?'24px':'8px',height:'8px',borderRadius:'4px',background:i===imgIdx?'var(--accent)':'rgba(255,255,255,0.4)',cursor:'pointer',transition:'all 0.3s',boxShadow:i===imgIdx?'0 0 8px rgba(255,102,0,0.6)':'none'}}/>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <GameLogo title={product.title} game={product.game} category={product.category} size={100}/>
          </div>
        )}
        {/* Price badge */}
        <div style={{position:'absolute',top:'12px',right:'12px',background:'linear-gradient(135deg,#ff6600,#ff4400)',color:'white',padding:'8px 18px',borderRadius:'10px',fontFamily:'var(--font-d)',fontWeight:800,fontSize:'22px',boxShadow:'0 0 20px rgba(255,102,0,0.6)',letterSpacing:'0.03em',textShadow:'0 0 10px rgba(255,102,0,0.5)'}}>
          ${price.toFixed(2)}
        </div>
        {/* Logo watermark */}
        <div style={{position:'absolute',top:'12px',left:'12px'}}>
          <GameLogo title={product.title} game={product.game} category={product.category} size={38}/>
        </div>
      </div>

      <div style={{padding:'16px 14px'}}>
        {/* Title + Status */}
        <div style={{marginBottom:'14px'}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:'10px',marginBottom:'8px'}}>
            <h1 style={{fontFamily:'var(--font-d)',fontSize:'22px',fontWeight:700,lineHeight:'1.2',color:'var(--text)',flex:1,letterSpacing:'0.02em'}}>{product.title}</h1>
            <span style={{padding:'4px 10px',borderRadius:'100px',fontSize:'11px',fontWeight:700,fontFamily:'var(--font-d)',letterSpacing:'0.05em',flexShrink:0,marginTop:'3px',
              color:product.status==='active'?'#00ff88':'#ffe600',
              background:product.status==='active'?'rgba(0,255,136,0.12)':'rgba(255,230,0,0.12)',
              border:`1px solid ${product.status==='active'?'rgba(0,255,136,0.25)':'rgba(255,230,0,0.25)'}`,
              boxShadow:`0 0 8px ${product.status==='active'?'rgba(0,255,136,0.2)':'rgba(255,230,0,0.2)'}`}}>
              {product.status==='active'?'ДОСТУПЕН':'НЕДОСТУПЕН'}
            </span>
          </div>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            <span className="badge badge-orange">{product.category}</span>
            {product.subcategory&&<span className="badge badge-cyan">{product.subcategory}</span>}
            {product.game&&<span className="badge badge-yellow">🎮 {product.game}</span>}
            {product.server&&<span className="badge badge-green">🖥 {product.server}</span>}
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'16px'}}>
          {[
            {l:'👁 ПРОСМОТРЫ',v:product.views||0,c:'#00d4ff'},
            {l:'⭐ РЕЙТИНГ',v:parseFloat(seller.rating||5).toFixed(1),c:'#ffe600'},
            {l:'✅ СДЕЛОК',v:seller.totalSales||0,c:'#00ff88'},
          ].map(s=>(
            <div key={s.l} style={{background:'rgba(14,14,14,0.9)',border:`1px solid ${s.c}20`,borderRadius:'10px',padding:'10px',textAlign:'center',boxShadow:`0 0 8px ${s.c}08`}}>
              <div style={{fontFamily:'var(--font-d)',fontSize:'20px',fontWeight:700,color:s.c,textShadow:`0 0 8px ${s.c}60`}}>{s.v}</div>
              <div style={{fontSize:'9px',color:'var(--text3)',marginTop:'2px',letterSpacing:'0.06em',fontFamily:'var(--font-d)'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div style={{background:'rgba(14,14,14,0.9)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'12px',padding:'14px',marginBottom:'14px'}}>
          <div style={{fontSize:'11px',fontWeight:700,color:'rgba(255,102,0,0.6)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'8px',fontFamily:'var(--font-d)'}}>ОПИСАНИЕ</div>
          <p style={{fontSize:'14px',color:'var(--text2)',lineHeight:'1.65',whiteSpace:'pre-wrap'}}>{product.description}</p>
        </div>

        {/* Seller */}
        <div style={{background:'rgba(14,14,14,0.9)',border:'1px solid rgba(255,102,0,0.15)',borderRadius:'12px',padding:'13px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'12px',boxShadow:'0 0 12px rgba(255,102,0,0.06)'}}>
          <div style={{width:'44px',height:'44px',borderRadius:'12px',overflow:'hidden',flexShrink:0,
            background:'linear-gradient(135deg,#ff6600,#ff4400)',display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:'18px',fontWeight:800,color:'white',boxShadow:'0 0 12px rgba(255,102,0,0.3)'}}>
            {seller.photoUrl?<img src={seller.photoUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
              :(seller.firstName||'?').charAt(0).toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:'15px',color:'var(--text)',display:'flex',alignItems:'center',gap:'6px'}}>
              {seller.username||seller.firstName||'Продавец'}
              {seller.isVerified&&<span style={{color:'#00d4ff',fontSize:'13px',textShadow:'0 0 6px rgba(0,212,255,0.5)'}}>✓</span>}
            </div>
            <div style={{fontSize:'12px',color:'var(--text3)',marginTop:'2px'}}>
              <span style={{color:'#ffe600',textShadow:'0 0 6px rgba(255,230,0,0.4)'}}>⭐ {parseFloat(seller.rating||5).toFixed(1)}</span>
              {' · '}{seller.reviewCount||0} отзывов · {seller.totalSales||0} продаж
            </div>
          </div>
        </div>

        {/* Tags */}
        {product.tags?.length>0&&(
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'14px'}}>
            {product.tags.map(t=>(
              <span key={t} style={{fontSize:'12px',padding:'4px 10px',borderRadius:'100px',background:'rgba(255,255,255,0.04)',color:'var(--text3)',border:'1px solid rgba(255,255,255,0.07)'}}># {t}</span>
            ))}
          </div>
        )}

        {/* Security */}
        <div style={{background:'rgba(0,255,136,0.06)',border:'1px solid rgba(0,255,136,0.15)',borderRadius:'10px',padding:'11px 13px',marginBottom:'18px',display:'flex',gap:'10px',alignItems:'flex-start',boxShadow:'0 0 10px rgba(0,255,136,0.05)'}}>
          <span style={{fontSize:'18px'}}>🛡</span>
          <div>
            <div style={{fontSize:'13px',fontWeight:700,color:'#00ff88',fontFamily:'var(--font-d)',letterSpacing:'0.03em'}}>БЕЗОПАСНАЯ СДЕЛКА</div>
            <div style={{fontSize:'12px',color:'var(--text3)',marginTop:'2px'}}>Деньги заморожены до вашего подтверждения. Комиссия 5%.</div>
          </div>
        </div>

        {/* CTA */}
        {!isMine&&product.status==='active'&&(
          <button className="btn btn-primary btn-full btn-lg" onClick={buy} disabled={buying}
            style={{fontFamily:'var(--font-d)',fontSize:'18px',letterSpacing:'0.08em'}}>
            {buying?'⏳ ОБРАБОТКА...':(`💎 КУПИТЬ $${price.toFixed(2)}`)}
          </button>
        )}
        {isMine&&(
          <div style={{textAlign:'center',padding:'14px',background:'rgba(255,255,255,0.04)',borderRadius:'12px',color:'var(--text3)',fontSize:'14px',border:'1px solid rgba(255,255,255,0.06)',fontFamily:'var(--font-d)',letterSpacing:'0.05em'}}>
            📦 ЭТО ВАШ ТОВАР
          </div>
        )}
        {product.status!=='active'&&!isMine&&(
          <div style={{textAlign:'center',padding:'14px',background:'rgba(255,51,85,0.06)',borderRadius:'12px',color:'#ff3355',fontSize:'14px',border:'1px solid rgba(255,51,85,0.2)',fontFamily:'var(--font-d)',letterSpacing:'0.05em'}}>
            ❌ ТОВАР НЕДОСТУПЕН
          </div>
        )}
      </div>
    </div>
  )
}

function Loader() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:'16px'}}>
      <div style={{width:'40px',height:'40px',borderRadius:'50%',border:'3px solid rgba(255,255,255,0.05)',borderTop:'3px solid var(--accent)',animation:'rotate 0.8s linear infinite',boxShadow:'0 0 15px rgba(255,102,0,0.3)'}}/>
      <div style={{color:'var(--text3)',fontSize:'13px',fontFamily:'var(--font-d)',letterSpacing:'0.08em'}}>ЗАГРУЗКА...</div>
    </div>
  )
}
