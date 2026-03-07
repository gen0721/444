import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import GameBackground from '../components/GameBackground'
import { IC } from '../components/Icons'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const navigate          = useNavigate()
  const { login }         = useStore()
  const [tab, setTab]     = useState('login')
  const [form, setForm]   = useState({ username:'', email:'', password:'' })
  const [loading, setLoading]   = useState(false)
  const [tgLoading, setTgLoading] = useState(false)
  const [showPw, setShowPw]     = useState(false)

  // Auto-auth if inside Telegram WebApp
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.initDataUnsafe?.user) return
    setTgLoading(true)
    api.post('/auth/telegram', { initData: tg.initData, initDataUnsafe: tg.initDataUnsafe })
      .then(({ data }) => { login(data.token, data.user); navigate('/', { replace: true }) })
      .catch(() => setTgLoading(false))
  }, [])

  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.email || !form.password) return toast.error('Заполните все поля')
    if (tab === 'register' && form.password.length < 6) return toast.error('Пароль минимум 6 символов')
    setLoading(true)
    try {
      const { data } = await api.post(tab === 'login' ? '/auth/login' : '/auth/register', form)
      login(data.token, data.user)
      toast.success(tab === 'login' ? '👋 Добро пожаловать!' : '✅ Аккаунт создан!')
      navigate('/', { replace: true })
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setLoading(false)
  }

  const loginTelegram = async () => {
    const tg = window.Telegram?.WebApp
    if (!tg?.initDataUnsafe?.user) {
      toast.error('Доступно только внутри Telegram Mini App')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/telegram', { initData: tg.initData, initDataUnsafe: tg.initDataUnsafe })
      login(data.token, data.user)
      toast.success(`👋 Привет, ${data.user.firstName || data.user.username}!`)
      navigate('/', { replace: true })
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка Telegram входа') }
    setLoading(false)
  }

  if (tgLoading) return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg)', gap:'20px' }}>
      <div style={{ width:'48px', height:'48px', borderRadius:'50%', border:'3px solid rgba(124,106,255,0.15)', borderTop:'3px solid #7c6aff', animation:'rotateSpin 0.8s linear infinite' }}/>
      <div style={{ fontFamily:'var(--font-display)', color:'var(--t3)', letterSpacing:'0.1em', fontSize:'13px' }}>ВХОД ЧЕРЕЗ TELEGRAM...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px', position:'relative', overflow:'hidden' }}>
      <GameBackground/>
      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:'380px', animation:'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'48px', fontWeight:800, letterSpacing:'0.08em', lineHeight:1, marginBottom:'8px', background:'linear-gradient(135deg,#a78bfa 0%,#7c6aff 45%,#e040fb 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', filter:'drop-shadow(0 0 20px rgba(124,106,255,0.7))' }}>
            GIVIHUB
          </div>
          <div style={{ fontSize:'10px', color:'rgba(167,139,250,0.3)', letterSpacing:'0.28em', fontFamily:'var(--font-display)' }}>DIGITAL MARKETPLACE</div>
        </div>

        {/* Card */}
        <div style={{ background:'linear-gradient(160deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))', border:'1px solid rgba(255,255,255,0.1)', borderTop:'1px solid rgba(255,255,255,0.18)', borderRadius:'24px', overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.88)', backdropFilter:'blur(30px)' }}>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            {[['login','Вход'],['register','Регистрация']].map(([id,l]) => (
              <button key={id} onClick={() => setTab(id)} style={{ flex:1, padding:'16px', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'12px', letterSpacing:'0.06em', color:tab===id?'#a78bfa':'var(--t3)', borderBottom:`2px solid ${tab===id?'#7c6aff':'transparent'}`, transition:'all 0.2s' }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'0' }}>

            {/* Telegram button */}
            <button onClick={loginTelegram} disabled={loading} style={{ width:'100%', padding:'14px', borderRadius:'14px', cursor:'pointer', background:'linear-gradient(135deg,rgba(42,171,238,0.2),rgba(34,157,217,0.12))', border:'1px solid rgba(42,171,238,0.4)', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', color:'#29aae2', fontFamily:'var(--font-display)', fontWeight:700, fontSize:'14px', letterSpacing:'0.05em', boxShadow:'0 0 20px rgba(42,171,238,0.1)', transition:'all 0.2s', marginBottom:'16px' }}>
              {loading ? (
                <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:'2px solid rgba(42,171,238,0.3)', borderTop:'2px solid #29aae2', animation:'rotateSpin 0.7s linear infinite' }}/>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#29aae2">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.013 9.484c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.876.737z"/>
                </svg>
              )}
              ВОЙТИ ЧЕРЕЗ TELEGRAM
            </button>

            {/* Divider */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
              <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.07)' }}/>
              <span style={{ fontSize:'11px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.08em', whiteSpace:'nowrap' }}>или через email</span>
              <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.07)' }}/>
            </div>

            {/* Fields */}
            {tab === 'register' && (
              <>
                <Label>ИМЯ ПОЛЬЗОВАТЕЛЯ</Label>
                <input className="inp" placeholder="username" value={form.username} onChange={upd('username')} style={{ marginBottom:'12px' }}/>
              </>
            )}
            <Label>EMAIL</Label>
            <input className="inp" type="email" placeholder="you@example.com" value={form.email} onChange={upd('email')} style={{ marginBottom:'12px' }}/>
            <Label>ПАРОЛЬ</Label>
            <div style={{ position:'relative', marginBottom:'20px' }}>
              <input className="inp" type={showPw?'text':'password'} placeholder="••••••••" value={form.password} onChange={upd('password')} onKeyDown={e => e.key==='Enter' && submit()} style={{ paddingRight:'44px' }}/>
              <button onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--t3)', cursor:'pointer' }}>
                <IC.Eye s={15}/>
              </button>
            </div>

            <button className="btn btn-violet btn-full btn-lg" onClick={submit} disabled={loading} style={{ fontFamily:'var(--font-display)', letterSpacing:'0.08em', gap:'9px' }}>
              {loading
                ? <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)', borderTop:'2px solid white', animation:'rotateSpin 0.7s linear infinite' }}/>
                : tab==='login' ? '→ ВОЙТИ' : '+ СОЗДАТЬ АККАУНТ'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <label style={{ display:'block', fontSize:'10px', fontWeight:700, color:'rgba(167,139,250,0.4)', letterSpacing:'0.14em', fontFamily:'var(--font-display)', marginBottom:'7px' }}>{children}</label>
}
