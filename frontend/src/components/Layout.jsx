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
    { to:'/',        label:'Главная',  Icon: IC.Home   },
    { to:'/wallet',  label:'Баланс',   Icon: IC.Wallet },
    { to:'/rooms',   label:'Голос',    Icon: IC.Chat   },
    { to:'/create',  special: true                     },
    { to:'/profile', label:'Профиль',  Icon: IC.User   },
    ...(user?.isAdmin ? [{ to:'/admin', label:'Панель', Icon: IC.Crown }] : []),
  ]

  return (
    <div style={{ height:'100vh', height:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg)', position:'relative', overflow:'hidden' }}>
      <GameBackground />

      <div className="scroll" style={{ flex:1, position:'relative', zIndex:2, paddingBottom:'68px' }}>
        <Outlet/>
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:100,
        background:'rgba(6,8,17,0.96)',
        backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)',
        borderTop:'1px solid rgba(255,255,255,0.07)',
        paddingBottom:'env(safe-area-inset-bottom,0px)',
        boxShadow:'0 -1px 0 rgba(255,255,255,0.04), 0 -8px 40px rgba(0,0,0,0.6)',
      }}>
        {/* top accent line */}
        <div style={{ height:'1px', background:'linear-gradient(90deg,transparent 0%,rgba(124,106,255,0.5) 30%,rgba(167,139,250,0.4) 50%,rgba(124,106,255,0.5) 70%,transparent 100%)' }}/>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-around', height:'58px', maxWidth:'520px', margin:'0 auto', padding:'0 6px' }}>
          {tabs.map((tab) => {
            if (tab.special) return (
              <button key="plus" onClick={() => navigate('/create')} style={{
                width:'52px', height:'52px', borderRadius:'16px',
                background:'linear-gradient(160deg,#9d8fff 0%,#7c6aff 40%,#4035b5 100%)',
                border:'1px solid rgba(124,106,255,0.5)',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', transform:'translateY(-14px)',
                boxShadow:'0 0 0 1px rgba(124,106,255,0.2), 0 4px 16px rgba(124,106,255,0.65), 0 10px 35px rgba(124,106,255,0.3)',
                position:'relative', overflow:'hidden',
                transition:'transform 0.2s ease, box-shadow 0.2s ease',
                animation:'glowPulse 3s ease-in-out infinite',
              }}
              onTouchStart={e => { e.currentTarget.style.transform='translateY(-11px) scale(0.93)' }}
              onTouchEnd={e   => { e.currentTarget.style.transform='translateY(-14px) scale(1)' }}
              onMouseDown={e  => { e.currentTarget.style.transform='translateY(-11px) scale(0.93)' }}
              onMouseUp={e    => { e.currentTarget.style.transform='translateY(-14px) scale(1)' }}
              >
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'48%', background:'linear-gradient(180deg,rgba(255,255,255,0.28),transparent)', borderRadius:'16px 16px 0 0', pointerEvents:'none' }}/>
                <IC.Plus s={24} c="white"/>
              </button>
            )

            const active = pathname === tab.to
            const { Icon } = tab
            return (
              <button key={tab.to} onClick={() => navigate(tab.to)} style={{
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                gap:'4px', flex:1, height:'100%',
                background:'none', border:'none', cursor:'pointer',
                position:'relative', padding:0,
                transition:'all 0.2s ease',
              }}>
                {active && (
                  <div style={{
                    position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                    width:'24px', height:'2px', borderRadius:'0 0 3px 3px',
                    background:'linear-gradient(90deg,#7c6aff,#a78bfa)',
                    boxShadow:'0 0 10px rgba(124,106,255,0.9), 0 0 20px rgba(124,106,255,0.5)',
                  }}/>
                )}
                <div style={{
                  transform: active ? 'translateY(-1px) scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  color: active ? '#a78bfa' : 'rgba(255,255,255,0.25)',
                  filter: active ? 'drop-shadow(0 0 5px rgba(167,139,250,0.7))' : 'none',
                }}>
                  <Icon s={21}/>
                </div>
                <span style={{
                  fontSize:'9px', fontWeight:700, letterSpacing:'0.04em',
                  fontFamily:'var(--font-display)',
                  color: active ? '#a78bfa' : 'rgba(255,255,255,0.2)',
                  textShadow: active ? '0 0 10px rgba(167,139,250,0.7)' : 'none',
                  transition:'all 0.2s',
                }}>
                  {tab.label?.toUpperCase()}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* theme toggle */}
      <button onClick={toggleTheme} style={{
        position:'fixed', top:'12px', right:'12px', zIndex:200,
        width:'34px', height:'34px', borderRadius:'10px',
        background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
        backdropFilter:'blur(12px)', color:'rgba(255,255,255,0.5)',
        boxShadow:'0 2px 12px rgba(0,0,0,0.4)',
        transition:'all 0.2s',
      }}>
        {theme === 'dark' ? <IC.Sun s={15}/> : <IC.Moon s={15}/>}
      </button>
    </div>
  )
}
