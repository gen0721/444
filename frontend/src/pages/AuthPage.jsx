import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import GameBackground from '../components/GameBackground'
import { IC } from '../components/Icons'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const navigate = useNavigate()
  const { setUser, setToken } = useStore()
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ username:'', email:'', password:'' })
  const [loading, setLoading] = useState(false)

  const upd = k => e => setForm(f=>({...f,[k]:e.target.value}))

  const submit = async () => {
    setLoading(true)
    try {
      const endpoint = tab==='login' ? '/auth/login' : '/auth/register'
      const { data } = await api.post(endpoint, form)
      setToken(data.token); setUser(data.user)
      toast.success(tab==='login'?'Добро пожаловать!':'Аккаунт создан!')
      navigate('/')
    } catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px', position:'relative' }}>
      <GameBackground/>
      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:'380px', animation:'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{
            fontFamily:'var(--font-d)', fontSize:'44px', fontWeight:900, letterSpacing:'0.1em',
            background:'linear-gradient(135deg,#ffcc00 0%,#ff8800 40%,#ff4400 70%,#ff9900 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            filter:'drop-shadow(0 0 18px rgba(255,120,0,0.7))',
            animation:'titleFlicker 8s ease-in-out infinite', marginBottom:'6px'
          }}>GIVIHUB</div>
          <div style={{ fontSize:'10px', color:'rgba(255,140,0,0.4)', letterSpacing:'0.3em', fontFamily:'var(--font-d)' }}>
            DIGITAL MARKETPLACE
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:'linear-gradient(160deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.02) 100%)',
          border:'1px solid rgba(255,255,255,0.1)', borderTop:'1px solid rgba(255,255,255,0.18)',
          borderRadius:'24px', overflow:'hidden',
          boxShadow:'0 20px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.1)',
          backdropFilter:'blur(30px)'
        }}>
          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            {[['login','ВХОД'],['register','РЕГИСТРАЦИЯ']].map(([id,l])=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                flex:1, padding:'16px', background:'none', border:'none', cursor:'pointer',
                fontFamily:'var(--font-d)', fontWeight:700, fontSize:'13px', letterSpacing:'0.08em',
                color:tab===id?'#ffaa44':'var(--text3)',
                borderBottom:`2px solid ${tab===id?'#ff8800':'transparent'}`,
                transition:'all 0.2s',
                boxShadow:tab===id?'0 2px 0 rgba(255,140,0,0.4)':'none',
                textShadow:tab===id?'0 0 12px rgba(255,140,0,0.5)':'none'
              }}>{l}</button>
            ))}
          </div>

          <div style={{ padding:'24px' }}>
            {tab==='register' && (
              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'rgba(255,140,0,0.5)', letterSpacing:'0.12em', fontFamily:'var(--font-d)', marginBottom:'7px' }}>ИМЯ ПОЛЬЗОВАТЕЛЯ</label>
                <div style={{ position:'relative' }}>
                  <div style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}><IC.User s={15}/></div>
                  <input className="input" placeholder="username" value={form.username} onChange={upd('username')} style={{ paddingLeft:'40px' }}/>
                </div>
              </div>
            )}
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'rgba(255,140,0,0.5)', letterSpacing:'0.12em', fontFamily:'var(--font-d)', marginBottom:'7px' }}>EMAIL</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={upd('email')}/>
            </div>
            <div style={{ marginBottom:'22px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'rgba(255,140,0,0.5)', letterSpacing:'0.12em', fontFamily:'var(--font-d)', marginBottom:'7px' }}>ПАРОЛЬ</label>
              <div style={{ position:'relative' }}>
                <div style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}><IC.Lock s={15}/></div>
                <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={upd('password')}
                  style={{ paddingLeft:'40px' }}
                  onKeyDown={e=>e.key==='Enter'&&submit()}/>
              </div>
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={loading}
              style={{ fontFamily:'var(--font-d)', letterSpacing:'0.1em', gap:'10px' }}>
              {loading ? (
                <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid white', animation:'rotate 0.7s linear infinite' }}/>
              ) : tab==='login' ? <IC.Exit s={18} c="white"/> : <IC.User s={18} c="white"/>}
              {loading ? 'ЗАГРУЗКА...' : tab==='login' ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
