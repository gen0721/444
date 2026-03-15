import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC } from '../components/Icons'
import { RubleAmount, useRate } from '../components/RubleDisplay'
import toast from 'react-hot-toast'

const TX_ICONS  = { deposit:'↓', withdrawal:'↑', commission:'%', deal_payment:'🤝', deal_received:'💸', refund:'↩', adjustment:'⚡', freeze:'🔒' }
const TX_COLORS = { deposit:'#4ade80', withdrawal:'#f87171', commission:'#fbbf24', deal_payment:'#f87171', deal_received:'#4ade80', refund:'#22d3ee', adjustment:'#a78bfa', freeze:'#94a3b8' }
const TX_PLUS   = new Set(['deposit','deal_received','refund','adjustment'])

export default function WalletPage() {
  const navigate          = useNavigate()
  const { user, setUser } = useStore()
  const [txs,     setTxs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [amount,  setAmount]  = useState('')
  const [network, setNetwork] = useState('USDT')
  const [tgId,    setTgId]    = useState('')
  const [working, setWorking] = useState(false)
  const rate = useRate()

  const [payMethod, setPayMethod] = useState('crypto') // 'crypto' | 'rukassa' | 'cryptocloud'

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    loadTxs()
    if (user.telegramId) setTgId(String(user.telegramId))
  }, [])

  const loadTxs = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/wallet/transactions')
      setTxs(data?.transactions || data || [])
    } catch {}
    setLoading(false)
  }

  const refreshUser = async () => {
    try { const { data } = await api.get('/auth/me'); setUser(data.user || data) } catch {}
  }

  const openModal = (type) => {
    setModal(type); setAmount('')
    if (type === 'withdraw' && user?.telegramId) setTgId(String(user.telegramId))
  }

  // ── Deposit via RuKassa ───────────────────────────────────────────────────
  const depositRukassa = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt < 1) return toast.error('Минимум $1')
    setWorking(true)
    try {
      const { data } = await api.post('/wallet/deposit/rukassa', { amount: amt })
      if (data.payUrl) {
        window.open(data.payUrl, '_blank')
        toast.success('Откроется страница оплаты RuKassa')
        setModal(null); setAmount('')
        loadTxs()
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка RuKassa')
    }
    setWorking(false)
  }

  // ── Deposit via CryptoCloud ───────────────────────────────────────────────
  const depositCryptoCloud = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt < 1) return toast.error('Минимум $1')
    setWorking(true)
    try {
      const { data } = await api.post('/wallet/deposit/cryptocloud', { amount: amt })
      if (data.payUrl) {
        window.open(data.payUrl, '_blank')
        toast.success('Откроется страница оплаты CryptoCloud')
        setModal(null); setAmount('')
        loadTxs()
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка CryptoCloud')
    }
    setWorking(false)
  }
  const deposit = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt < 1) return toast.error('Минимум $1')
    setWorking(true)
    try {
      const { data } = await api.post('/wallet/deposit', { amount: amt, currency: network })
      if (data.payUrl) {
        window.open(data.payUrl, '_blank')
        toast.success('Откройте @CryptoBot для оплаты')
      } else if (data.devMode) {
        toast.success(`✅ +$${amt} зачислено (dev)`)
        await refreshUser()
      }
      setModal(null); setAmount('')
      loadTxs()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка при пополнении')
    }
    setWorking(false)
  }

  // ── Withdraw ─────────────────────────────────────────────────────────────
  const withdraw = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt < 2) return toast.error('Минимальный вывод — $2')
    if (parseFloat(user?.balance || 0) < amt) return toast.error('Недостаточно средств')
    if (!tgId || isNaN(parseInt(tgId))) return toast.error('Укажите числовой Telegram ID')
    setWorking(true)
    try {
      const { data } = await api.post('/wallet/withdraw', { amount: amt, currency: network, address: tgId })
      toast.success(data.message || `✅ ${amt} ${network} отправлено!`)
      setModal(null); setAmount('')
      await refreshUser()
      loadTxs()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка при выводе')
    }
    setWorking(false)
  }

  if (!user) return null
  const bal    = parseFloat(user.balance || 0)
  const frz    = parseFloat(user.frozenBalance || 0)
  const rubBal = rate ? (bal * rate).toLocaleString('ru', { maximumFractionDigits: 0 }) : null

  return (
    <div style={{ minHeight:'100%' }}>
      {/* Header */}
      <div style={{ padding:'14px', background:'rgba(6,8,17,0.96)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'sticky', top:0, zIndex:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={() => navigate(-1)} className="btn-icon"><IC.Back s={18}/></button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700, letterSpacing:'0.04em' }}>Кошелёк</span>
        </div>
      </div>

      <div style={{ padding:'16px 14px', paddingBottom:'24px' }}>
        {/* Balance card */}
        <div style={{
          borderRadius:'24px', padding:'28px 24px', marginBottom:'16px',
          position:'relative', overflow:'hidden',
          background:'linear-gradient(135deg,rgba(124,106,255,0.18),rgba(10,12,26,0.97) 60%,rgba(224,64,251,0.08))',
          border:'1px solid rgba(124,106,255,0.25)',
          boxShadow:'0 16px 60px rgba(0,0,0,0.7)',
          backdropFilter:'blur(20px)',
        }}>
          <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'180px', height:'180px', borderRadius:'50%', background:'radial-gradient(circle,rgba(124,106,255,0.1),transparent)', pointerEvents:'none' }}/>

          <div style={{ fontSize:'10px', color:'rgba(167,139,250,0.4)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.16em', marginBottom:'10px' }}>ДОСТУПНЫЙ БАЛАНС</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'44px', fontWeight:800, lineHeight:1, color:'#a78bfa', marginBottom:'6px', textShadow:'0 0 30px rgba(167,139,250,0.5)' }}>
            ${bal.toFixed(2)}
          </div>
          {rubBal && <div style={{ fontSize:'16px', color:'rgba(167,139,250,0.4)', fontWeight:600, marginBottom:'4px' }}>≈ {rubBal} ₽</div>}
          {rate   && <div style={{ fontSize:'11px', color:'var(--t3)', marginBottom:'20px' }}>1$ = {rate.toFixed(0)} ₽</div>}

          {frz > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'8px 12px', borderRadius:'10px', background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', marginBottom:'16px' }}>
              <IC.Lock s={13} c="#22d3ee"/>
              <span style={{ fontSize:'12px', color:'#22d3ee', fontWeight:600 }}>В сделках (заморожено): ${frz.toFixed(2)}</span>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <button className="btn btn-violet btn-full" onClick={() => openModal('deposit')}
              style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'0.04em', gap:'7px' }}>
              <IC.Down s={15} c="white"/> Пополнить
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => openModal('withdraw')}
              style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'0.04em', gap:'7px', border:'1px solid rgba(248,113,113,0.3)', color:'#f87171' }}>
              <IC.Up s={15}/> Вывести
            </button>
          </div>
        </div>

        {/* Transactions */}
        <div style={{ fontFamily:'var(--font-display)', fontSize:'11px', fontWeight:700, color:'var(--t3)', letterSpacing:'0.12em', marginBottom:'12px' }}>
          ИСТОРИЯ ТРАНЗАКЦИЙ
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {Array(4).fill(0).map((_, i) => <div key={i} className="skel" style={{ height:'62px' }}/>)}
          </div>
        ) : txs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'50px 20px', color:'var(--t3)', fontFamily:'var(--font-display)', fontSize:'12px', letterSpacing:'0.1em' }}>НЕТ ТРАНЗАКЦИЙ</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {txs.map((tx, i) => {
              const color = TX_COLORS[tx.type] || 'var(--t2)'
              const plus  = TX_PLUS.has(tx.type)
              const amt   = Math.abs(parseFloat(tx.amount))
              const fail  = tx.status === 'failed'
              const pend  = tx.status === 'pending'
              return (
                <div key={tx.id || i} className="anim-up" style={{
                  animationDelay:`${i*35}ms`,
                  padding:'13px 16px', borderRadius:'14px',
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
                  borderLeft:`3px solid ${fail?'#f87171':pend?'#fbbf24':color}50`,
                  display:'flex', alignItems:'center', gap:'12px',
                }}>
                  <div style={{ width:'38px', height:'38px', borderRadius:'11px', flexShrink:0, background:`${fail?'#f87171':pend?'#fbbf24':color}14`, border:`1px solid ${fail?'#f87171':pend?'#fbbf24':color}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>
                    {TX_ICONS[tx.type] || '•'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'var(--t1)', marginBottom:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {tx.description || tx.type}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                      <span style={{ fontSize:'11px', color:'var(--t3)' }}>
                        {new Date(tx.createdAt).toLocaleString('ru', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </span>
                      {pend && <span style={{ fontSize:'10px', color:'#fbbf24', fontWeight:700, fontFamily:'var(--font-display)' }}>ОЖИДАНИЕ</span>}
                      {fail && <span style={{ fontSize:'10px', color:'#f87171', fontWeight:700, fontFamily:'var(--font-display)' }}>ОШИБКА</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'15px', color: fail?'#f87171':plus?'#4ade80':'#f87171', textShadow:`0 0 6px ${fail?'rgba(248,113,113,0.4)':plus?'rgba(74,222,128,0.4)':'rgba(248,113,113,0.4)'}` }}>
                      {plus?'+':'-'}${amt.toFixed(2)}
                    </div>
                    {rate && <div style={{ fontSize:'10px', color:'var(--t3)', marginTop:'2px' }}>{(amt*rate).toFixed(0)} ₽</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── DEPOSIT MODAL ── */}
      {modal === 'deposit' && (
        <BottomModal onClose={() => { setModal(null); setAmount('') }}>
          <ModalTitle color="#a78bfa">↓ ПОПОЛНЕНИЕ</ModalTitle>

          {/* Payment method selector */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
            {[
              { v:'crypto',      icon:'🤖', label:'CryptoBot',   desc:'USDT, TON, BTC' },
              { v:'rukassa',     icon:'💳', label:'RuKassa',     desc:'Карта РФ, СБП' },
              { v:'cryptocloud', icon:'☁️', label:'CryptoCloud', desc:'USDT, BTC, ETH' },
            ].map(m => (
              <button key={m.v} onClick={() => setPayMethod(m.v)} style={{ padding:'10px 8px', borderRadius:12, cursor:'pointer', textAlign:'center', background:payMethod===m.v?'rgba(167,139,250,0.12)':'rgba(255,255,255,0.03)', border:`1.5px solid ${payMethod===m.v?'rgba(167,139,250,0.5)':'rgba(255,255,255,0.07)'}`, color:payMethod===m.v?'#a78bfa':'var(--t3)', transition:'all 0.15s' }}>
                <div style={{ fontSize:20, marginBottom:3 }}>{m.icon}</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11 }}>{m.label}</div>
                <div style={{ fontSize:10, color:'var(--t3)', marginTop:2 }}>{m.desc}</div>
              </button>
            ))}
          </div>

          <QuickAmounts value={amount} onChange={setAmount} color="#a78bfa"/>
          <FieldLabel>СУММА (USD)</FieldLabel>
          <AmountInput value={amount} onChange={setAmount} rate={rate}/>
          {payMethod === 'crypto' && <>
            <FieldLabel>ВАЛЮТА</FieldLabel>
            <NetPicker value={network} onChange={setNetwork}/>
          </>}
          {/* Минимальные депозиты */}
          {payMethod === 'rukassa' && (
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:8 }}>МИНИМАЛЬНЫЙ ДЕПОЗИТ</div>
              {[
                ['💳', 'Visa / MC / МИР', '$100.00'],
                ['💳', 'Visa / MC (AZN)', '$5.50'],
                ['🎮', 'SkinPay', '$0.10'],
                ['💛', 'YooMoney', '$11.00'],
                ['🔐', 'Крипта', '$0.50'],
              ].map(([icon, label, min]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{icon} {label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#a78bfa' }}>{min}</span>
                </div>
              ))}
            </div>
          )}
          {payMethod === 'cryptocloud' && (
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:8 }}>МИНИМАЛЬНЫЙ ДЕПОЗИТ</div>
              {[['💎','USDT','$1.00'],['₿','BTC','$1.00'],['🔹','ETH','$1.00']].map(([icon, label, min]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{icon} {label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#a78bfa' }}>{min}</span>
                </div>
              ))}
            </div>
          )}
          {payMethod === 'crypto' && (
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:8 }}>МИНИМАЛЬНЫЙ ДЕПОЗИТ</div>
              {[['💎','USDT','$1.00'],['🔷','TON','$1.00'],['₿','BTC','$1.00']].map(([icon, label, min]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{icon} {label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#a78bfa' }}>{min}</span>
                </div>
              ))}
            </div>
          )}

          <InfoBox color="#a78bfa">
            {payMethod === 'rukassa'
              ? '💳 Оплата картой РФ или СБП — откроется страница RuKassa, баланс зачислится автоматически'
              : payMethod === 'cryptocloud'
              ? '☁️ Оплата криптовалютой — USDT, BTC, ETH и другие, баланс зачислится автоматически'
              : 'Нажмите «Пополнить» → откроется @CryptoBot → оплатите → баланс зачислится автоматически'}
          </InfoBox>
          <ModalBtns onCancel={() => { setModal(null); setAmount('') }}
            onConfirm={payMethod === 'rukassa' ? depositRukassa : payMethod === 'cryptocloud' ? depositCryptoCloud : deposit}
            confirmLabel="↓ Пополнить" confirmCls="btn-violet" loading={working}/>
        </BottomModal>
      )}

      {/* ── WITHDRAW MODAL ── */}
      {modal === 'withdraw' && (
        <BottomModal onClose={() => { setModal(null); setAmount('') }}>
          <ModalTitle color="#f87171">↑ ВЫВОД СРЕДСТВ</ModalTitle>
          <QuickAmounts value={amount} onChange={setAmount} color="#f87171"/>
          <FieldLabel>СУММА (USD)</FieldLabel>
          <AmountInput value={amount} onChange={setAmount} rate={rate}/>
          <FieldLabel>ВАЛЮТА</FieldLabel>
          <NetPicker value={network} onChange={setNetwork}/>
          <FieldLabel>TELEGRAM ID ПОЛУЧАТЕЛЯ</FieldLabel>
          <input className="inp" type="number" placeholder="123456789"
            value={tgId} onChange={e => setTgId(e.target.value)}
            style={{ marginBottom:'6px', borderColor:'rgba(248,113,113,0.3)', fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:700 }}/>
          <div style={{ fontSize:'11px', color:'var(--t3)', marginBottom:'14px', lineHeight:'1.5' }}>
            {user?.telegramId ? `✅ Ваш Telegram ID подставлен автоматически` : '⚠ Войдите через Telegram для авто-подстановки ID'}
          </div>
          <InfoBox color="#f87171">
            💸 Деньги спишутся автоматически и придут в @CryptoBot мгновенно. Получатель должен сначала запустить /start в @CryptoBot.
          </InfoBox>
          <ModalBtns onCancel={() => { setModal(null); setAmount('') }} onConfirm={withdraw}
            confirmLabel="↑ Вывести" confirmStyle={{ border:'1px solid rgba(248,113,113,0.5)', color:'#f87171', background:'rgba(248,113,113,0.08)' }} loading={working}/>
        </BottomModal>
      )}
    </div>
  )
}

// ── UI Components ──────────────────────────────────────────────────────────────

function BottomModal({ children, onClose }) {
  const overlayRef = useRef(null)
  return (
    <div ref={overlayRef}
      style={{ position:'fixed', inset:0, top:0, left:0, right:0, bottom:0, height:'100dvh', background:'rgba(8,10,22,0.99)', backdropFilter:'blur(14px)', zIndex:200, display:'flex', flexDirection:'column' }}>
      <div style={{
        flex:1, display:'flex', flexDirection:'column',
        padding:'0 20px',
        paddingTop:'env(safe-area-inset-top, 0px)',
        paddingBottom:'calc(24px + env(safe-area-inset-bottom, 16px))',
        width:'100%', overflowY:'auto',
        animation:'slideUp 0.28s ease-out',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 20px' }}>
          <div style={{ width:'36px', height:'3px', borderRadius:'2px', background:'rgba(255,255,255,0.1)' }}/>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', width:'32px', height:'32px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', fontSize:'16px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalTitle({ children, color }) {
  return (
    <div style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700, color, letterSpacing:'0.05em', textShadow:`0 0 12px ${color}40`, marginBottom:'20px' }}>
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(167,139,250,0.4)', letterSpacing:'0.14em', fontFamily:'var(--font-display)', marginBottom:'7px' }}>{children}</div>
}

function QuickAmounts({ value, onChange, color }) {
  return (
    <div style={{ display:'flex', gap:'7px', marginBottom:'14px', flexWrap:'wrap' }}>
      {[5,10,25,50,100].map(v => (
        <button key={v} onClick={() => onChange(String(v))} style={{
          padding:'6px 13px', borderRadius:'100px', cursor:'pointer',
          background: value===String(v) ? `${color}18` : 'rgba(255,255,255,0.04)',
          border:`1px solid ${value===String(v) ? `${color}50` : 'rgba(255,255,255,0.08)'}`,
          color: value===String(v) ? color : 'var(--t2)',
          fontSize:'12px', fontWeight:700, fontFamily:'var(--font-display)',
          transition:'all 0.15s',
        }}>${v}</button>
      ))}
    </div>
  )
}

function AmountInput({ value, onChange, rate }) {
  return (
    <div style={{ position:'relative', marginBottom:'14px' }}>
      <input className="inp" type="number" placeholder="0.00" value={value} onChange={e => onChange(e.target.value)}
        style={{ paddingRight:'70px', fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:800 }}/>
      {value && rate && (
        <div style={{ position:'absolute', right:'13px', top:'50%', transform:'translateY(-50%)', fontSize:'11px', color:'var(--t3)', whiteSpace:'nowrap' }}>
          ≈{(parseFloat(value||0)*rate).toFixed(0)}₽
        </div>
      )}
    </div>
  )
}

function NetPicker({ value, onChange }) {
  return (
    <div style={{ display:'flex', gap:'7px', marginBottom:'14px' }}>
      {['USDT','TON','BTC'].map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          flex:1, padding:'9px', borderRadius:'10px', cursor:'pointer',
          background: value===n ? 'rgba(124,106,255,0.15)' : 'rgba(255,255,255,0.03)',
          border:`1px solid ${value===n ? 'rgba(124,106,255,0.45)' : 'rgba(255,255,255,0.07)'}`,
          color: value===n ? '#a78bfa' : 'var(--t2)',
          fontSize:'12px', fontWeight:700, fontFamily:'var(--font-display)',
          transition:'all 0.15s',
        }}>{n}</button>
      ))}
    </div>
  )
}

function InfoBox({ children, color }) {
  return (
    <div style={{ padding:'12px 14px', borderRadius:'12px', marginBottom:'18px', background:`${color}08`, border:`1px solid ${color}20`, fontSize:'12px', color:'var(--t2)', lineHeight:'1.6' }}>
      {children}
    </div>
  )
}

function ModalBtns({ onCancel, onConfirm, confirmLabel, confirmCls, confirmStyle={}, loading }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'10px' }}>
      <button className="btn btn-ghost btn-full" onClick={onCancel}
        style={{ fontFamily:'var(--font-display)', fontSize:'13px' }}>Отмена</button>
      <button className={`btn btn-full ${confirmCls||'btn-ghost'}`} onClick={onConfirm} disabled={loading}
        style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'0.04em', ...confirmStyle }}>
        {loading
          ? <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.2)', borderTop:'2px solid currentColor', animation:'rotateSpin 0.7s linear infinite' }}/>
          : confirmLabel}
      </button>
    </div>
  )
}
