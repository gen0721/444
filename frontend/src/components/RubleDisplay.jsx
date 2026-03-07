import React, { useState, useEffect } from 'react'
import { IC } from './Icons'

const FALLBACK_RATE = 92 // fallback if API unavailable

let cachedRate = null
let lastFetch = 0

export async function getUsdToRub() {
  const now = Date.now()
  if (cachedRate && now - lastFetch < 300000) return cachedRate // cache 5min
  try {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const data = await r.json()
    cachedRate = data.rates?.RUB || FALLBACK_RATE
    lastFetch = now
    return cachedRate
  } catch {
    return FALLBACK_RATE
  }
}

export function RubleAmount({ usd, size='sm' }) {
  const [rub, setRub] = useState(null)
  useEffect(() => {
    getUsdToRub().then(rate => setRub((parseFloat(usd||0)*rate).toFixed(0)))
  }, [usd])
  if (!rub) return null
  const fsize = size==='lg' ? '14px' : '11px'
  return (
    <span style={{ fontSize:fsize, color:'var(--text3)', display:'inline-flex', alignItems:'center', gap:'2px' }}>
      ≈ {parseInt(rub).toLocaleString('ru')} ₽
    </span>
  )
}

export default function RubleConverter({ usd, setRub: onRubChange }) {
  const [rate, setRate] = useState(FALLBACK_RATE)
  const [rub, setRub] = useState('')
  const [active, setActive] = useState('usd')

  useEffect(() => { getUsdToRub().then(r => { setRate(r); if(usd) setRub((parseFloat(usd||0)*r).toFixed(0)) }) }, [])
  useEffect(() => { if (active==='usd' && usd) setRub((parseFloat(usd||0)*rate).toFixed(0)) }, [usd, rate])

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px',
      background:'rgba(0,212,255,0.06)', borderRadius:'9px', border:'1px solid rgba(0,212,255,0.15)' }}>
      <IC.Ruble s={14} c="#00d4ff"/>
      <span style={{ fontSize:'13px', color:'#00d4ff', fontWeight:600 }}>
        ≈ {rub ? parseInt(rub).toLocaleString('ru') : '—'} ₽
      </span>
      <span style={{ fontSize:'10px', color:'var(--text3)', marginLeft:'auto' }}>
        1$ = {rate.toFixed(0)}₽
      </span>
    </div>
  )
}
