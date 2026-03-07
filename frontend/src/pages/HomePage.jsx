import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { GameLogo, IC } from '../components/Icons'
import { RubleAmount } from '../components/RubleDisplay'

const CATS = [
  {id:'all',l:'ВСЁ'},{id:'games',l:'ИГРЫ'},{id:'software',l:'СОФТ'},
  {id:'social',l:'СОЦСЕТИ'},{id:'education',l:'КУРСЫ'},
  {id:'services',l:'УСЛУГИ'},{id:'finance',l:'ФИНАНСЫ'},{id:'other',l:'ДРУГОЕ'}
]

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('createdAt')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/products', { params:{ category:cat==='all'?undefined:cat, search:search||undefined, sort } })
      setProducts(data.products||[])
    } catch {}
    setLoading(false)
  }, [cat, sort, search])
  useEffect(() => { const t = setTimeout(load, search?380:0); return()=>clearTimeout(t) }, [load])

  return (
    <div style={{ minHeight:'100%' }}>
      {/* ── HEADER ── */}
      <div style={{
        padding:'14px 14px 0', position:'sticky', top:0, zIndex:50,
        background:'rgba(4,4,10,0.96)', backdropFilter:'blur(28px)',
        borderBottom:'1px solid rgba(255,102,0,0.1)'
      }}>
        {/* Bottom neon line */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'1px', background:'linear-gradient(90deg,transparent,rgba(255,102,0,0.4),rgba(255,200,0,0.2),rgba(255,102,0,0.4),transparent)' }}/>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
          {/* GIVIHUB Logo */}
          <div>
            <div style={{
              fontFamily:'var(--font-d)', fontSize:'30px', fontWeight:900, letterSpacing:'0.08em', lineHeight:1,
              background:'linear-gradient(135deg,#ffcc00 0%,#ff8800 35%,#ff4400 65%,#ff9900 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              filter:'drop-shadow(0 0 10px rgba(255,120,0,0.6))',
              animation:'titleFlicker 8s ease-in-out infinite'
            }}>GIVIHUB</div>
            <div style={{ fontSize:'8px', color:'rgba(255,140,0,0.45)', letterSpacing:'0.25em', fontFamily:'var(--font-d)', marginTop:'1px' }}>
              DIGITAL MARKETPLACE
            </div>
          </div>

          {user ? (
            <div onClick={()=>navigate('/wallet')} style={{
              display:'flex', alignItems:'center', gap:'9px',
              padding:'9px 15px', borderRadius:'13px', cursor:'pointer',
              background:'linear-gradient(135deg,rgba(255,90,0,0.12),rgba(255,150,0,0.06))',
              border:'1px solid rgba(255,100,0,0.32)',
              boxShadow:'0 0 20px rgba(255,90,0,0.1), inset 0 1px 0 rgba(255,200,100,0.12)',
              transition:'all 0.2s'
            }}>
              <IC.Diamond s={16} c="#ffaa33"/>
              <div>
                <div style={{ fontFamily:'var(--font-d)', fontWeight:700, fontSize:'17px', color:'#ffaa33', lineHeight:1,
                  textShadow:'0 0 12px rgba(255,140,0,0.6)', animation:'neonPulse 4s ease-in-out infinite' }}>
                  ${parseFloat(user.balance||0).toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={()=>navigate('/auth')}>
              <IC.User s={14} c="white"/> ВОЙТИ
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:'10px' }}>
          <div style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }}>
            <IC.Search s={16}/>
          </div>
          <input className="input" placeholder="Поиск товаров..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ paddingLeft:'42px', paddingRight:search?'38px':'14px', height:'44px', borderRadius:'100px', fontSize:'14px' }}/>
          {search && (
            <button onClick={()=>setSearch('')} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', color:'var(--text3)', cursor:'pointer' }}>
              <IC.X s={16}/>
            </button>
          )}
        </div>

        {/* Categories */}
        <div style={{ display:'flex', gap:'5px', overflowX:'auto', scrollbarWidth:'none', paddingBottom:'10px' }}>
          {CATS.map(c=>(
            <button key={c.id} onClick={()=>setCat(c.id)} style={{
              padding:'6px 14px', borderRadius:'100px', whiteSpace:'nowrap', cursor:'pointer',
              border:`1px solid ${cat===c.id?'rgba(255,130,0,0.55)':'rgba(255,255,255,0.07)'}`,
              background:cat===c.id?'rgba(255,100,0,0.15)':'rgba(255,255,255,0.03)',
              color:cat===c.id?'#ffaa44':'var(--text3)',
              fontFamily:'var(--font-d)', fontWeight:700, fontSize:'11px', letterSpacing:'0.06em',
              boxShadow:cat===c.id?'0 0 12px rgba(255,100,0,0.25), inset 0 1px 0 rgba(255,200,100,0.1)':'none',
              transition:'all var(--ease)'
            }}>{c.l}</button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px' }}>
        <span style={{ fontSize:'11px', color:'var(--text3)', fontFamily:'var(--font-d)', letterSpacing:'0.08em' }}>
          {loading ? '...' : `${products.length} ТОВАРОВ`}
        </span>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{
          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,102,0,0.2)',
          color:'var(--text2)', padding:'5px 10px', borderRadius:'9px',
          fontSize:'11px', cursor:'pointer', outline:'none', fontFamily:'var(--font-d)', fontWeight:700
        }}>
          <option value="createdAt">НОВЫЕ</option>
          <option value="price_asc">ДЕШЕВЛЕ</option>
          <option value="price_desc">ДОРОЖЕ</option>
          <option value="popular">ПОПУЛЯРНЫЕ</option>
        </select>
      </div>

      {/* Grid */}
      <div style={{ padding:'0 10px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
        {loading
          ? Array(6).fill(0).map((_,i)=><SkeletonCard key={i}/>)
          : products.length===0 ? <Empty/>
          : products.map((p,i)=><ProductCard key={p.id} product={p} i={i} onClick={()=>navigate(`/product/${p.id}`)}/>)
        }
      </div>
    </div>
  )
}

function ProductCard({ product, i, onClick }) {
  const [mounted, setMounted] = useState(false)
  const [hov, setHov] = useState(false)
  useEffect(()=>{ const t=setTimeout(()=>setMounted(true),i*60); return()=>clearTimeout(t) },[i])
  const price = parseFloat(product.price)
  const seller = product.seller||{}

  return (
    <div onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        borderRadius:'18px', overflow:'hidden', cursor:'pointer',
        background:hov
          ?'linear-gradient(135deg,rgba(255,100,0,0.08),rgba(10,10,20,0.97))'
          :'linear-gradient(135deg,rgba(255,255,255,0.05),rgba(10,10,20,0.95))',
        border:`1px solid ${hov?'rgba(255,120,0,0.5)':'rgba(255,255,255,0.065)'}`,
        borderTop:`1px solid ${hov?'rgba(255,160,0,0.4)':'rgba(255,255,255,0.1)'}`,
        boxShadow:hov
          ?'0 0 0 1px rgba(255,100,0,0.15), 0 8px 35px rgba(255,80,0,0.22), 0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,200,100,0.08)'
          :'0 4px 25px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        opacity:mounted?1:0,
        transform:mounted?(hov?'translateY(-4px) scale(1.01)':'translateY(0)'):'translateY(22px) scale(0.94)',
        transition:`opacity 0.4s ${i*55}ms ease, transform 0.35s ${i*55}ms cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s, box-shadow 0.25s, background 0.25s`,
        backdropFilter:'blur(12px)'
      }}>

      {/* Image / Logo area */}
      <div style={{ height:'128px', position:'relative', overflow:'hidden',
        background:'linear-gradient(160deg,rgba(18,8,4,1),rgba(4,4,15,1))' }}>
        {product.images?.[0] ? (
          <>
            <img src={product.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover',
              opacity:hov?0.9:0.8, transition:'opacity 0.3s, transform 0.4s',
              transform:hov?'scale(1.06)':'scale(1)' }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,transparent 35%,rgba(0,0,0,0.55))' }}/>
          </>
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(160deg,rgba(20,8,4,1),rgba(4,4,18,1))' }}>
            <GameLogo title={product.title} game={product.game} category={product.category} size={68}
              style={{ transform:hov?'scale(1.1)':'scale(1)', transition:'transform 0.35s var(--spring)' }}/>
          </div>
        )}
        {/* Mirror top reflection */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'38%',
          background:'linear-gradient(180deg,rgba(255,255,255,0.08),transparent)', pointerEvents:'none' }}/>

        {product.isPromoted && (
          <div style={{ position:'absolute', top:'8px', left:'8px',
            background:'linear-gradient(135deg,#ffe600,#ff8800)', color:'#000',
            fontSize:'9px', fontWeight:800, padding:'3px 9px', borderRadius:'100px',
            letterSpacing:'0.1em', fontFamily:'var(--font-d)',
            boxShadow:'0 0 15px rgba(255,200,0,0.6), inset 0 1px 0 rgba(255,255,255,0.4)' }}>★ ТОП</div>
        )}
        {/* Price tag */}
        <div style={{ position:'absolute', bottom:'8px', right:'8px',
          background:'rgba(0,0,0,0.88)', backdropFilter:'blur(12px)',
          border:'1px solid rgba(255,130,0,0.5)', borderTop:'1px solid rgba(255,180,0,0.3)',
          color:'#ffaa44', fontSize:'16px', fontWeight:800, padding:'4px 11px',
          borderRadius:'9px', fontFamily:'var(--font-d)',
          boxShadow:'0 0 15px rgba(255,120,0,0.35), inset 0 1px 0 rgba(255,200,100,0.15)',
          textShadow:'0 0 10px rgba(255,140,0,0.6)' }}>
          ${price.toFixed(2)}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding:'11px 12px' }}>
        <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text)', lineHeight:'1.35', marginBottom:'8px',
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
          textShadow:hov?'0 0 20px rgba(255,255,255,0.1)':'none', transition:'text-shadow 0.2s' }}>
          {product.title}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:'11px', color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>
            {seller.username||seller.firstName||'Продавец'}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'3px', flexShrink:0 }}>
            <IC.Star s={11} c="#ffcc00" filled/>
            <span style={{ fontSize:'11px', color:'#ffcc00', fontWeight:800, textShadow:'0 0 6px rgba(255,200,0,0.5)' }}>
              {parseFloat(seller.rating||5).toFixed(1)}
            </span>
          </div>
        </div>
        <div style={{ marginTop:'4px' }}>
          <RubleAmount usd={price} size="sm"/>
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ borderRadius:'18px', overflow:'hidden', background:'rgba(10,10,20,0.9)', border:'1px solid rgba(255,255,255,0.045)' }}>
      <div className="skeleton" style={{ height:'128px' }}/>
      <div style={{ padding:'11px 12px' }}>
        <div className="skeleton" style={{ height:'13px', marginBottom:'8px' }}/>
        <div className="skeleton" style={{ height:'11px', width:'60%' }}/>
      </div>
    </div>
  )
}

function Empty() {
  return (
    <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'70px 20px' }}>
      <IC.Search s={52} c="rgba(255,255,255,0.07)"/>
      <div style={{ fontFamily:'var(--font-d)', fontSize:'18px', fontWeight:700, color:'var(--text3)', marginTop:'16px', letterSpacing:'0.1em' }}>
        НИЧЕГО НЕ НАЙДЕНО
      </div>
    </div>
  )
}
