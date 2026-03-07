import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useStore, api } from './store'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ProductPage from './pages/ProductPage'
import CreateProductPage from './pages/CreateProductPage'
import ProfilePage from './pages/ProfilePage'
import WalletPage from './pages/WalletPage'
import DealPage from './pages/DealPage'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import './styles/global.css'

export default function App() {
  const { theme, user, token, fetchMe, login, setTheme } = useStore()

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) setTheme(saved)
    else {
      const h = new Date().getHours()
      setTheme(h >= 7 && h < 19 ? 'light' : 'dark')
    }

    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready(); tg.expand()
      tg.setHeaderColor?.('#0a0a0a')
      const { initData, initDataUnsafe } = tg
      if (initDataUnsafe?.user) {
        api.post('/auth/telegram', { initData, initDataUnsafe })
          .then(({ data }) => login(data.token, data.user))
          .catch(() => { if (token) fetchMe() })
        return
      }
    }

    if (token) fetchMe()
    else useStore.setState({ isLoading: false })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const { isLoading } = useStore()
  if (isLoading) return <Splash/>

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        gutter={10}
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(12,12,12,0.97)',
            color: '#f0f0f0',
            border: '1px solid rgba(255,102,0,0.3)',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            padding: '12px 16px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 20px rgba(255,102,0,0.15), 0 10px 40px rgba(0,0,0,0.6)'
          },
          success: { iconTheme: { primary: '#00ff88', secondary: '#000' } },
          error:   { iconTheme: { primary: '#ff3355', secondary: '#000' } },
        }}
      />
      <Routes>
        <Route path="/auth" element={!user ? <AuthPage/> : <Navigate to="/" replace/>}/>
        <Route path="/" element={<Layout/>}>
          <Route index element={<HomePage/>}/>
          <Route path="product/:id" element={<ProductPage/>}/>
          <Route path="create" element={user ? <CreateProductPage/> : <Navigate to="/auth" replace/>}/>
          <Route path="profile" element={user ? <ProfilePage/> : <Navigate to="/auth" replace/>}/>
          <Route path="wallet" element={user ? <WalletPage/> : <Navigate to="/auth" replace/>}/>
          <Route path="deal/:id" element={user ? <DealPage/> : <Navigate to="/auth" replace/>}/>
          <Route path="admin" element={user?.isAdmin ? <AdminPage/> : <Navigate to="/" replace/>}/>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function Splash() {
  return (
    <div style={{
      height:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      flexDirection:'column', gap:'20px', background:'#0a0a0a',
      position:'relative', overflow:'hidden'
    }}>
      {/* Animated bg */}
      {[...Array(3)].map((_,i)=>(
        <div key={i} style={{
          position:'absolute', borderRadius:'50%', filter:'blur(60px)',
          background:['rgba(255,102,0,0.15)','rgba(255,68,0,0.1)','rgba(255,150,0,0.08)'][i],
          width:[300,200,400][i], height:[300,200,400][i],
          top:['-80px','60%','-50px'][i], left:['20%','-50px','60%'][i],
          animation:`float ${[6,8,10][i]}s ease-in-out infinite`,
          animationDelay:`${i*2}s`
        }}/>
      ))}
      <div style={{
        width:'80px', height:'80px', borderRadius:'22px',
        background:'linear-gradient(135deg,#ff6600,#ff4400)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'36px', position:'relative', zIndex:1,
        boxShadow:'0 0 30px rgba(255,102,0,0.7), 0 0 60px rgba(255,102,0,0.3)',
        animation:'pulse 1.5s ease-in-out infinite'
      }}>⚡</div>
      <div style={{
        fontFamily:'var(--font-display)', fontSize:'36px', fontWeight:700,
        background:'linear-gradient(135deg,#ff6600,#ff8800)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        letterSpacing:'0.1em', position:'relative', zIndex:1,
        filter:'drop-shadow(0 0 10px rgba(255,102,0,0.5))'
      }}>GIVIHUB</div>
      <div style={{display:'flex',gap:'8px',position:'relative',zIndex:1}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{
            width:'8px', height:'8px', borderRadius:'50%',
            background:'rgba(255,102,0,0.7)',
            animation:`blink 1.2s ${i*0.2}s ease-in-out infinite`,
            boxShadow:'0 0 8px rgba(255,102,0,0.5)'
          }}/>
        ))}
      </div>
    </div>
  )
}
