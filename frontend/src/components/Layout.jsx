import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import GameBackground from './GameBackground'
import { IC } from './Icons'

export default function Layout() {
  const { user, theme, toggleTheme } = useStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const tabs = [
    { to:'/', label:'КАТАЛОГ', Icon: IC.Home },
    { to:'/wallet', label:'БАЛАНС', Icon: IC.Wallet },
    { to:'/create', special: true },
    { to:'/profile', label:'ПРОФИЛЬ', Icon: IC.User },
    ...(user?.isAdmin ? [{ to:'/admin', label:'ПАНЕЛЬ', Icon: IC.Crown }] : []),
  ]

  return (
    <div style={{ height:'100vh', height:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg)', position:'relative', overflow:'hidden' }}>
      <GameBackground />

      <div className="scrollable" style={{ flex:1, position:'relative', zIndex:2, paddingBottom:'64px' }}>
        <Outlet/>
      </div>

      {/* Bottom navigation — ultra glass */}
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:100,
        background:'rgba(4,4,10,0.97)',
        backdropFilter:'blur(30px)', WebkitBackdropFilter:'blur(30px)',
        borderTop:'1px solid rgba(255,102,0,0.15)',
        paddingBottom:'env(safe-area-inset-bottom,0px)',
        boxShadow:'0 -4px 40px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,102,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)'
      }}>
        {/* Top neon line */}
        <div style={{ height:'1px', background:'linear-gradient(90deg,transparent,rgba(255,102,0,0.5),rgba(255,200,0,0.3),rgba(0,212,255,0.2),rgba(255,102,0,0.5),transparent)' }}/>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-around', height:'56px', maxWidth:'520px', margin:'0 auto', padding:'0 4px' }}>
          {tabs.map((tab) => {
            if (tab.special) return (
              <button key="plus" onClick={()=>navigate('/create')} style={{
                width:'54px', height:'54px', borderRadius:'16px',
                background:'linear-gradient(180deg,#ff9900 0%,#ff5500 45%,#cc2200 100%)',
                border:'1px solid rgba(255,130,0,0.6)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', transform:'translateY(-12px)',
                boxShadow:'0 0 0 1px rgba(255,80,0,0.3), 0 4px 15px rgba(255,80,0,0.7), 0 8px 35px rgba(255,50,0,0.4), 0 16px 50px rgba(255,50,0,0.15)',
                position:'relative', overflow:'hidden',
                transition:'transform 0.2s var(--spring), box-shadow 0.2s ease',
                animation:'liveFire 2.5s ease-in-out infinite'
              }}
              onMouseDown={e=>{e.currentTarget.style.transform='translateY(-9px) scale(0.93)'}}
              onMouseUp={e=>{e.currentTarget.style.transform='translateY(-12px) scale(1)'}}
              onTouchStart={e=>{e.currentTarget.style.transform='translateY(-9px) scale(0.93)'}}
              onTouchEnd={e=>{e.currentTarget.style.transform='translateY(-12px) scale(1)'}}
              >
                {/* Mirror top */}
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'50%', background:'linear-gradient(180deg,rgba(255,255,255,0.3),transparent)', borderRadius:'16px 16px 0 0', pointerEvents:'none' }}/>
                <IC.Plus s={26} c="white"/>
              </button>
            )
            const active = pathname === tab.to
            const { Icon } = tab
            return (
              <button key={tab.to} onClick={()=>navigate(tab.to)} style={{
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                gap:'3px', flex:1, height:'100%', background:'none', border:'none', cursor:'pointer',
                position:'relative', padding:0,
                transition:'all 0.2s ease'
              }}>
                {/* Active top line */}
                {active && (
                  <div style={{
                    position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                    width:'28px', height:'2.5px', borderRadius:'0 0 3px 3px',
                    background:'linear-gradient(90deg,#ff6600,#ffaa00)',
                    boxShadow:'0 0 12px rgba(255,120,0,0.9), 0 0 20px rgba(255,80,0,0.5)'
                  }}/>
                )}
                <div style={{
                  transform: active ? 'translateY(-1px) scale(1.12)' : 'scale(1)',
                  transition:'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  color: active ? '#ff9933' : 'rgba(255,255,255,0.28)',
                  filter: active ? 'drop-shadow(0 0 5px rgba(255,120,0,0.7))' : 'none'
                }}>
                  <Icon s={22}/>
                </div>
                <span style={{
                  fontSize:'9px', fontWeight:800, letterSpacing:'0.07em',
                  fontFamily:'var(--font-d)',
                  color: active ? '#ff9933' : 'rgba(255,255,255,0.2)',
                  textShadow: active ? '0 0 10px rgba(255,120,0,0.7)' : 'none',
                  transition:'all 0.2s'
                }}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{
        position:'fixed', top:'12px', right:'12px', zIndex:200,
        width:'36px', height:'36px', borderRadius:'11px',
        background:'rgba(0,0,0,0.7)', border:'1px solid rgba(255,102,0,0.3)',
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
        backdropFilter:'blur(12px)', color:'rgba(255,255,255,0.7)',
        boxShadow:'0 0 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        transition:'all 0.2s'
      }}>
        {theme==='dark' ? <IC.Sun s={16}/> : <IC.Moon s={16}/>}
      </button>
    </div>
  )
}
