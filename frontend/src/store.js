import { create } from 'zustand'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      useStore.setState({ user: null, token: null })
    }
    return Promise.reject(err)
  }
)

export const useStore = create((set, get) => ({
  theme: 'dark',
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,

  // ── setters used by AuthPage / WalletPage / ProfilePage ──
  setUser:  (user)  => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('token', token)
    else       localStorage.removeItem('token')
    set({ token })
  },

  setTheme: (t) => { set({ theme: t }); localStorage.setItem('theme', t) },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },

  // ── login / logout ──
  login: (token, user) => {
    localStorage.setItem('token', token)
    set({ token, user, isLoading: false })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
    window.location.href = '/'
  },
  updateUser: (data) => set(s => ({ user: s.user ? { ...s.user, ...data } : null })),

  // ── fetch current user ──
  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      // /auth/me returns { user: {...} }  OR directly the user object
      set({ user: data.user || data, isLoading: false })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null, isLoading: false })
    }
  },

  refreshBalance: async () => {
    try {
      const { data } = await api.get('/wallet/balance')
      set(s => ({ user: s.user ? { ...s.user, ...data } : null }))
    } catch {}
  }
}))
