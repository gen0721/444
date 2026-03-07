import React, { useState, useEffect } from 'react'

let _rate = null, _fetched = 0

export async function getUsdToRub() {
  if (_rate && Date.now() - _fetched < 300000) return _rate
  try {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const d = await r.json()
    _rate = d.rates?.RUB || 92; _fetched = Date.now()
  } catch { _rate = 92 }
  return _rate
}

export function RubleAmount({ usd, size = 'md' }) {
  const [rub, setRub] = useState(null)
  useEffect(() => { if (usd) getUsdToRub().then(r => setRub(Math.round(usd * r))) }, [usd])
  if (!rub) return null
  const fs = size === 'sm' ? '11px' : '14px'
  return (
    <span style={{ fontSize:fs, color:'var(--t3)', fontWeight:600 }}>
      ≈ {rub.toLocaleString('ru')} ₽
    </span>
  )
}

export default RubleAmount
