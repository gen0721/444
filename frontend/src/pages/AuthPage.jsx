import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import GameBackground from '../components/GameBackground'
import { IC } from '../components/Icons'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const navigate = useNavigate()
  const { setUser, setToken } = useStore()
  const [tab, setTab]     = useState('login')
  const [form, setForm]   = useState({ username:'', email:'', password:'' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)

  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    setLoading(true)
    try {
      const { data } = await api.post(tab === 'login' ? '/auth/login' : '/auth/register', form)
      setToken(data.token); setUser(data.user)
      toast.success(tab === 'login' ? 'Добро пожаловать!' : 'Аккаунт создан!')
      navigate('/')
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight:'100dvh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:'20px',
      position:'relative', overflow:'hidden',
    }}>
      <GameBackground/>

      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:'380px', animation:'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'36px' }}>
          <div style={{
            fontFamily:'var(--font-display)', fontSize:'48px', fontWeight:800,
            letterSpacing:'0.08em', lineHeight:1,
            background:'linear-gradient(135deg,#a78bfa 0%,#7c6aff 45%,#e040fb 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            filter:'drop-shadow(0 0 20px rgba(124,106,255,0.7))',
            marginBottom:'8px',
          }}>GIVIHUB</div>
          <div style={{ fontSize:'10px', color:'rgba(167,139,250,0.35)', letterSpacing:'0.28em', fontFamily:'var(--font-display)' }}>
            DIGITAL MARKETPLACE
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:'linear-gradient(160deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.02) 100%)',
          border:'1px solid rgba(255,255,255,0.1)',
          borderTop:'1px solid rgba(255,255,255,0.18)',
          borderRadius:'24px', overflow:'hidden',
          boxShadow:'0 24px 80px rgba(0,0,0,0.88), 0 0 0 1px rgba(124,106,255,0.08), inset 0 1px 0 rgba(255,255,255,0.09)',
          backdropFilter:'blur(30px)',
        }}>
          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            {[['login','Вход'], ['register','Регистрация']].map(([id, l]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex:1, padding:'16px', background:'none', border:'none', cursor:'pointer',
                fontFamily:'var(--font-display)', fontWeight:700, fontSize:'12px', letterSpacing:'0.06em',
                color: tab === id ? '#a78bfa' : 'var(--t3)',
                borderBottom: `2px solid ${tab === id ? '#7c6aff' : 'transparent'}`,
                textShadow: tab === id ? '0 0 10px rgba(167,139,250,0.5)' : 'none',
                transition:'all 0.2s',
              }}>{l.toUpperCase()}</button>
            ))}
          </div>

          <div style={{ padding:'24px' }}>
            {tab === 'register' && (
              <Field label="ИМЯ ПОЛЬЗОВАТЕЛЯ" icon={<IC.User s={14}/>}>
                <input className="inp" placeholder="username" value={form.username} onChange={upd('username')}/>
              </Field>
            )}
            <Field label="EMAIL" icon={<IC.Eye s={14}/>}>
              <input className="inp" type="email" placeholder="you@example.com" value={form.email} onChange={upd('email')}/>
            </Field>
            <Field label="ПАРОЛЬ" icon={<IC.Lock s={14}/>} mb="22px" extra={
              <button onClick={() => setShowPw(!showPw)} style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', padding:'2px' }}>
                <IC.Eye s={13}/>
              </button>
            }>
              <input className="inp" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={upd('password')}
                onKeyDown={e => e.key === 'Enter' && submit()}/>
            </Field>

            <button className="btn btn-violet btn-full btn-lg" onClick={submit} disabled={loading}
              style={{ fontFamily:'var(--font-display)', letterSpacing:'0.08em', gap:'9px', marginTop:'4px' }}>
              {loading
                ? <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)', borderTop:'2px solid white', animation:'rotateSpin 0.7s linear infinite' }}/>
                : tab === 'login' ? <IC.Exit s={17} c="white"/> : <IC.User s={17} c="white"/>
              }
              {loading ? 'ЗАГРУЗКА...' : tab === 'login' ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, icon, children, mb='14px', extra }) {
  return (
    <div style={{ marginBottom: mb }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'7px' }}>
        <label style={{ fontSize:'10px', fontWeight:700, color:'rgba(167,139,250,0.45)', letterSpacing:'0.14em', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:'5px' }}>
          <span style={{ color:'rgba(167,139,250,0.35)' }}>{icon}</span> {label}
        </label>
        {extra}
      </div>
      {children}
    </div>
  )
}
