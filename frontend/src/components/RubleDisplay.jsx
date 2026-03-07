import React, { useState, useEffect, createContext, useContext } from 'react'

// ─── Global rate cache ────────────────────────────────────────────────────────
let _rate = null, _fetched = 0, _listeners = []

export async function getUsdToRub() {
  if (_rate && Date.now() - _fetched < 300_000) return _rate
  try {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const d = await r.json()
    _rate    = d.rates?.RUB || 92
    _fetched = Date.now()
    _listeners.forEach(fn => fn(_rate))
  } catch { _rate = _rate || 92 }
  return _rate
}

export function useRate() {
  const [rate, setRate] = useState(_rate)
  useEffect(() => {
    getUsdToRub().then(setRate)
    _listeners.push(setRate)
    return () => { _listeners = _listeners.filter(f => f !== setRate) }
  }, [])
  return rate
}

// Format: "$5.00 · ≈ 460 ₽"
export function PriceWithRub({ usd, style = {}, rubStyle = {}, showDot = true }) {
  const rate = useRate()
  const rub  = rate ? Math.round(usd * rate) : null
  return (
    <span style={style}>
      ${parseFloat(usd).toFixed(2)}
      {rub && (
        <span style={{ color: 'var(--t3)', fontSize: '0.85em', marginLeft: 6, ...rubStyle }}>
          {showDot && '· '}≈{rub.toLocaleString('ru')} ₽
        </span>
      )}
    </span>
  )
}

// Small ruble hint below price
export function RubleAmount({ usd, size = 'md' }) {
  const rate = useRate()
  const rub  = rate ? Math.round(usd * rate) : null
  if (!rub) return null
  const fs = size === 'sm' ? '11px' : size === 'xs' ? '10px' : '14px'
  return (
    <span style={{ fontSize: fs, color: 'var(--t3)', fontWeight: 600 }}>
      ≈ {rub.toLocaleString('ru')} ₽
    </span>
  )
}

// Commission breakdown: price + 5% buyer fee
export function BuyerPriceBreakdown({ usd }) {
  const rate   = useRate()
  const buyer  = usd * 1.05        // buyer pays +5%
  const fee    = usd * 0.05
  const rubB   = rate ? Math.round(buyer * rate) : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--t3)' }}>
        <span>Цена товара</span>
        <span>${usd.toFixed(2)}{rate && ` · ≈${Math.round(usd*rate).toLocaleString('ru')}₽`}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#fbbf24' }}>
        <span>Комиссия сервиса (5%)</span>
        <span>+${fee.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: 'var(--t1)', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 6, marginTop: 2 }}>
        <span>Итого к оплате</span>
        <span>${buyer.toFixed(2)}{rubB && <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}> · ≈{rubB.toLocaleString('ru')}₽</span>}</span>
      </div>
    </div>
  )
}

// Seller gets: price − 5% fee
export function SellerPriceBreakdown({ usd }) {
  const rate   = useRate()
  const seller = usd * 0.95
  const fee    = usd * 0.05
  const rubS   = rate ? Math.round(seller * rate) : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--t3)' }}>
        <span>Цена продажи</span>
        <span>${usd.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#f87171' }}>
        <span>Комиссия сервиса (5%)</span>
        <span>−${fee.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: '#4ade80', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 6, marginTop: 2 }}>
        <span>Вы получите</span>
        <span>${seller.toFixed(2)}{rubS && <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}> · ≈{rubS.toLocaleString('ru')}₽</span>}</span>
      </div>
    </div>
  )
}

export default RubleAmount
