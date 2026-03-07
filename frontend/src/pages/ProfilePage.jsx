import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC, GameLogo } from '../components/Icons'
import { RubleAmount } from '../components/RubleDisplay'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, setUser, setToken } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('deals')

  if (!user) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'18px' }}>
      <IC.User s={60} c="rgba(255,255,255,0.08)"/>
      <div style={{ fontFamily:'var(--font-d)', color:'var(--text3)', letterSpacing:'0.1em', fontSize:'18px' }}>НЕ АВТОРИЗОВАН</div>
      <button className="btn btn-primary btn-lg" onClick={()=>navigate('/auth')}
        style={{ fontFamily:'var(--font-d)', letterSpacing:'0.08em', gap:'8px' }}>
        <IC.Exit s={18} c="white"/> ВОЙТИ
      </button>
    </div>
  )

  const logout = () => { setToken(null); setUser(null); navigate('/') }
  const bal = parseFloat(user.balance||0)
  const STATS = [
    { l:'БАЛАНС', v:`$${bal.toFixed(2)}`, c:'#ffaa44', Icon:IC.Wallet, glow:'rgba(255,160,0,0.3)', sub:<RubleAmount usd={bal} size="sm"/> },
    { l:'СДЕЛКИ', v:user.totalSales||0, c:'#00ff88', Icon:IC.Check, glow:'rgba(0,255,136,0.25)' },
    { l:'ПОКУПКИ', v:user.totalPurchases||0, c:'#00d4ff', Icon:IC.Diamond, glow:'rgba(0,212,255,0.25)' },
    { l:'РЕЙТИНГ', v:`${parseFloat(user.rating||5).toFixed(1)}★`, c:'#ffcc00', Icon:IC.Star, glow:'rgba(255,200,0,0.3)' },
  ]

  return (
    <div style={{ minHeight:'100%' }}>
      {/* Header */}
      <div style={{ padding:'14px', background:'rgba(4,4,10,0.96)', backdropFilter:'blur(28px)', borderBottom:'1px solid rgba(255,102,0,0.1)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:'var(--font-d)', fontSize:'20px', fontWeight:700, color:'#ffaa44', letterSpacing:'0.06em', textShadow:'0 0 12px rgba(255,140,0,0.4)', animation:'neonPulse 4s ease-in-out infinite' }}>ПРОФИЛЬ</span>
          <div style={{ display:'flex', gap:'8px' }}>
            {user.isAdmin && (
              <button className="btn btn-gold btn-sm" onClick={()=>navigate('/admin')}
                style={{ fontFamily:'var(--font-d)', fontSize:'11px', letterSpacing:'0.06em', gap:'5px' }}>
                <IC.Crown s={13} c="#1a0800"/> ПАНЕЛЬ
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={logout}
              style={{ fontFamily:'var(--font-d)', fontSize:'11px', gap:'5px' }}>
              <IC.Exit s={13}/> ВЫХОД
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:'14px' }}>
        {/* Profile card */}
        <div style={{
          borderRadius:'22px', padding:'22px', marginBottom:'14px',
          background:'linear-gradient(135deg,rgba(255,100,0,0.1),rgba(10,10,20,0.95),rgba(0,80,150,0.08))',
          border:'1px solid rgba(255,255,255,0.09)', borderTop:'1px solid rgba(255,255,255,0.16)',
          boxShadow:'0 12px 50px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,200,100,0.08)',
          backdropFilter:'blur(20px)', position:'relative', overflow:'hidden'
        }}>
          {/* Decorative glow */}
          <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'150px', height:'150px',
            borderRadius:'50%', background:'radial-gradient(circle,rgba(255,100,0,0.08),transparent)', pointerEvents:'none' }}/>

          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'20px' }}>
            {/* Avatar */}
            <div style={{ position:'relative' }}>
              <div style={{
                width:'68px', height:'68px', borderRadius:'20px', flexShrink:0,
                background:'linear-gradient(135deg,#ff8800,#ff4400,#cc2200)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'28px', fontWeight:900, color:'white', fontFamily:'var(--font-d)',
                boxShadow:'0 0 0 2px rgba(255,100,0,0.4), 0 0 25px rgba(255,80,0,0.4), inset 0 1px 0 rgba(255,200,100,0.3)',
                textShadow:'0 2px 8px rgba(0,0,0,0.5)'
              }}>
                {(user.firstName||user.username||'U').charAt(0).toUpperCase()}
              </div>
              {user.isVerified && (
                <div style={{ position:'absolute', bottom:'-4px', right:'-4px',
                  width:'20px', height:'20px', borderRadius:'6px',
                  background:'linear-gradient(135deg,#00ff88,#00aa55)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 0 10px rgba(0,255,136,0.5)' }}>
                  <IC.Check s={11} c="#001a08"/>
                </div>
              )}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'20px', fontWeight:800, marginBottom:'4px', letterSpacing:'0.02em' }}>
                {user.firstName||user.username||'Пользователь'}
              </div>
              <div style={{ fontSize:'12px', color:'var(--text3)', marginBottom:'6px' }}>
                {user.username?`@${user.username}`:''} {user.email?`· ${user.email}`:''}
              </div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {user.isAdmin && <span className="badge badge-gold"><IC.Crown s={10} c="#1a0800"/> ADMIN</span>}
                {user.isVerified && <span className="badge badge-green"><IC.Check s={10} c="#001a08"/> VERIFIED</span>}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {STATS.map(s=>(
              <div key={s.l} style={{
                padding:'12px 14px', borderRadius:'13px',
                background:`linear-gradient(135deg,${s.glow.replace('0.3','0.08')},rgba(10,10,20,0.9))`,
                border:`1px solid ${s.glow.replace('rgba','rgba').replace(/,[^)]+\)$/,',0.2)')}`,
                boxShadow:`inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 15px rgba(0,0,0,0.4)`
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'4px' }}>
                  <s.Icon s={13} c={s.c}/>
                  <div style={{ fontSize:'9px', color:'var(--text3)', fontFamily:'var(--font-d)', fontWeight:700, letterSpacing:'0.1em' }}>{s.l}</div>
                </div>
                <div style={{ fontFamily:'var(--font-d)', fontWeight:800, fontSize:'19px', color:s.c, textShadow:`0 0 10px ${s.glow}` }}>
                  {s.v}
                </div>
                {s.sub && <div style={{ marginTop:'2px' }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'6px', marginBottom:'12px', background:'rgba(10,10,20,0.8)', borderRadius:'13px', padding:'5px', border:'1px solid rgba(255,255,255,0.06)' }}>
          {[['deals','СДЕЛКИ'],['purchases','ПОКУПКИ'],['sales','ПРОДАЖИ'],['listings','ТОВАРЫ']].map(([id,l])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1, padding:'8px 4px', borderRadius:'9px',
              background:tab===id?'linear-gradient(135deg,rgba(255,100,0,0.2),rgba(255,140,0,0.1))':'transparent',
              border:`1px solid ${tab===id?'rgba(255,120,0,0.4)':'transparent'}`,
              color:tab===id?'#ffaa44':'var(--text3)',
              fontFamily:'var(--font-d)', fontWeight:700, fontSize:'10px', letterSpacing:'0.06em',
              cursor:'pointer', boxShadow:tab===id?'0 0 12px rgba(255,100,0,0.15)':'none',
              transition:'all 0.2s', textShadow:tab===id?'0 0 8px rgba(255,140,0,0.5)':'none'
            }}>{l}</button>
          ))}
        </div>

        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text3)', fontFamily:'var(--font-d)', fontSize:'14px', letterSpacing:'0.08em' }}>
          РАЗДЕЛ В РАЗРАБОТКЕ
        </div>
      </div>
    </div>
  )
}
