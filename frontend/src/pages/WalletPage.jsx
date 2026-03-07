import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC } from '../components/Icons'
import { RubleAmount, getUsdToRub } from '../components/RubleDisplay'
import toast from 'react-hot-toast'

const TX_ICONS  = { deposit:'↓', withdrawal:'↑', commission:'%', deal_payment:'🤝', deal_received:'💸', refund:'↩', adjustment:'⚡' }
const TX_COLORS = { deposit:'#4ade80', withdrawal:'#f87171', commission:'#fbbf24', deal_payment:'#f87171', deal_received:'#4ade80', refund:'#22d3ee', adjustment:'#a78bfa' }
const TX_PLUS   = new Set(['deposit','deal_received','refund','adjustment'])

export default function WalletPage() {
  const navigate       = useNavigate()
  const { user, setUser } = useStore()
  const [txs,     setTxs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)   // 'deposit' | 'withdraw'
  const [amount,  setAmount]  = useState('')
  const [network, setNetwork] = useState('USDT')
  const [working, setWorking] = useState(false)
  const [rate,    setRate]    = useState(null)

  // Вывод — Telegram ID (авто или ручной)
  const [tgId, setTgId] = useState('')

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    loadTxs()
    getUsdToRub().then(setRate)
    // Подставляем telegramId пользователя если есть
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

  const openModal = (type) => {
    setModal(type)
    setAmount('')
    if (type === 'withdraw' && user.telegramId) setTgId(String(user.telegramId))
  }

  // ── Пополнение ──────────────────────────────────────────────────────────
  const deposit = async () => {
    if (!amount || parseFloat(amount) < 1) return toast.error('Минимум $1')
    setWorking(true)
    try {
      const { data } = await api.post('/wallet/deposit', {
        amount:   parseFloat(amount),
        currency: network,
      })
      if (data.payUrl) {
        window.open(data.payUrl, '_blank')
        toast.success('Откройте CryptoBot для оплаты')
      } else if (data.devMode) {
        toast.success(`✅ ${amount}$ зачислено (dev mode)`)
        const me = await api.get('/auth/me'); setUser(me.data)
      }
      setModal(null); setAmount('')
      loadTxs()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка создания счёта')
    }
    setWorking(false)
  }

  // ── Вывод через CryptoBot transfer ──────────────────────────────────────
  const withdraw = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt < 2) return toast.error('Минимальный вывод — $2')
    if (parseFloat(user.balance) < amt) return toast.error('Недостаточно средств')
    if (!tgId || isNaN(parseInt(tgId))) return toast.error('Укажите числовой Telegram ID')

    setWorking(true)
    try {
      const { data } = await api.post('/wallet/withdraw', {
        amount:   amt,
        currency: network,
        address:  tgId,   // передаём Telegram ID как address
      })

      if (data.devMode) {
        toast.success(`[DEV] ${amt}$ списано (CryptoBot не настроен)`)
      } else {
        toast.success(`✅ ${amt} ${network} отправлено в ваш Telegram!`)
      }

      setModal(null); setAmount('')
      // Обновляем баланс
      const me = await api.get('/auth/me'); setUser(me.data)
      loadTxs()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ошибка вывода')
    }
    setWorking(false)
  }

  if (!user) return null
  const bal    = parseFloat(user.balance || 0)
  const frz    = parseFloat(user.frozenBalance || 0)
  const rubBal = rate ? (bal * rate).toLocaleString('ru', { maximumFractionDigits:0 }) : null

  return (
    <div style={{ minHeight:'100%' }}>
      {/* ── Header ── */}
      <div style={{ padding:'14px', background:'rgba(6,8,17,0.96)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={() => navigate(-1)} className="btn-icon"><IC.Back s={18}/></button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700, letterSpacing:'0.04em' }}>Кошелёк</span>
        </div>
      </div>

      <div style={{ padding:'16px 14px' }}>
        {/* ── Balance card ── */}
        <div style={{
          borderRadius:'24px', padding:'28px 24px', marginBottom:'16px',
          position:'relative', overflow:'hidden',
          background:'linear-gradient(135deg,rgba(124,106,255,0.18) 0%,rgba(10,12,26,0.97) 60%,rgba(224,64,251,0.08) 100%)',
          border:'1px solid rgba(124,106,255,0.25)',
          boxShadow:'0 16px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,106,255,0.05)',
          backdropFilter:'blur(20px)',
        }}>
          <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'180px', height:'180px', borderRadius:'50%', background:'radial-gradient(circle,rgba(124,106,255,0.1),transparent)', pointerEvents:'none' }}/>

          <div style={{ fontSize:'10px', color:'rgba(167,139,250,0.4)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.16em', marginBottom:'10px' }}>
            ДОСТУПНЫЙ БАЛАНС
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'44px', fontWeight:800, lineHeight:1, color:'#a78bfa', marginBottom:'6px', textShadow:'0 0 30px rgba(167,139,250,0.5)' }}>
            ${bal.toFixed(2)}
          </div>
          {rubBal && <div style={{ fontSize:'16px', color:'rgba(167,139,250,0.4)', fontWeight:600, marginBottom:'4px' }}>≈ {rubBal} ₽</div>}
          {rate    && <div style={{ fontSize:'11px', color:'var(--t3)', marginBottom:'20px' }}>1$ = {rate.toFixed(0)} ₽</div>}

          {frz > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'8px 12px', borderRadius:'10px', background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', marginBottom:'16px' }}>
              <IC.Lock s={13} c="#22d3ee"/>
              <span style={{ fontSize:'12px', color:'#22d3ee', fontWeight:600 }}>Заморожено в сделках: ${frz.toFixed(2)}</span>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <button className="btn btn-violet btn-full" onClick={() => openModal('deposit')}
              style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'0.04em', gap:'7px' }}>
              <IC.Down s={15} c="white"/> Пополнить
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => openModal('withdraw')}
              style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'0.04em', gap:'7px' }}>
              <IC.Up s={15}/> Вывести
            </button>
          </div>
        </div>

        {/* ── История транзакций ── */}
        <div style={{ fontFamily:'var(--font-display)', fontSize:'12px', fontWeight:700, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:'12px' }}>
          ИСТОРИЯ ТРАНЗАКЦИЙ
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {Array(4).fill(0).map((_, i) => <div key={i} className="skel" style={{ height:'62px' }}/>)}
          </div>
        ) : txs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'50px 20px', color:'var(--t3)', fontFamily:'var(--font-display)', fontSize:'12px', letterSpacing:'0.1em' }}>
            НЕТ ТРАНЗАКЦИЙ
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {txs.map((tx, i) => {
              const color  = TX_COLORS[tx.type] || 'var(--t2)'
              const plus   = TX_PLUS.has(tx.type)
              const amt    = Math.abs(parseFloat(tx.amount))
              const isPend = tx.status === 'pending'
              const isFail = tx.status === 'failed'
              return (
                <div key={tx.id} className="anim-up" style={{
                  animationDelay:`${i*35}ms`,
                  padding:'13px 16px', borderRadius:'14px',
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
                  borderLeft:`3px solid ${isFail ? '#f87171' : isPend ? '#fbbf24' : color}50`,
                  display:'flex', alignItems:'center', gap:'12px',
                }}>
                  <div style={{
                    width:'38px', height:'38px', borderRadius:'11px', flexShrink:0,
                    background:`${isFail?'#f87171':isPend?'#fbbf24':color}14`,
                    border:`1px solid ${isFail?'#f87171':isPend?'#fbbf24':color}28`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'16px',
                  }}>
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
                      {isPend && <span style={{ fontSize:'10px', color:'#fbbf24', fontWeight:700, fontFamily:'var(--font-display)', letterSpacing:'0.06em' }}>ОЖИДАНИЕ</span>}
                      {isFail && <span style={{ fontSize:'10px', color:'#f87171', fontWeight:700, fontFamily:'var(--font-display)', letterSpacing:'0.06em' }}>ОШИБКА</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{
                      fontFamily:'var(--font-display)', fontWeight:700, fontSize:'15px',
                      color: isFail ? '#f87171' : (plus ? '#4ade80' : '#f87171'),
                      textShadow:`0 0 8px ${isFail?'#f87171':plus?'rgba(74,222,128,0.4)':'rgba(248,113,113,0.4)'}`,
                    }}>
                      {plus ? '+' : '-'}${amt.toFixed(2)}
                    </div>
                    {rate && <div style={{ fontSize:'10px', color:'var(--t3)', marginTop:'2px' }}>{(amt * rate).toFixed(0)} ₽</div>}
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
          <ModalHeader icon="↓" title="ПОПОЛНЕНИЕ" color="#a78bfa"/>

          <QuickAmounts value={amount} onChange={setAmount} color="#a78bfa"/>

          <Label>СУММА (USD)</Label>
          <AmountInput value={amount} onChange={setAmount} rate={rate} style={{ marginBottom:'14px' }}/>

          <Label>ВАЛЮТА</Label>
          <NetworkPicker value={network} onChange={setNetwork} style={{ marginBottom:'20px' }}/>

          <InfoBox color="#a78bfa">
            Нажмите «Пополнить» → откроется @CryptoBot → оплатите счёт → баланс зачислится автоматически
          </InfoBox>

          <ModalButtons
            onCancel={() => { setModal(null); setAmount('') }}
            onConfirm={deposit}
            confirmLabel="↓ Пополнить"
            confirmClass="btn-violet"
            loading={working}
          />
        </BottomModal>
      )}

      {/* ── WITHDRAW MODAL ── */}
      {modal === 'withdraw' && (
        <BottomModal onClose={() => { setModal(null); setAmount('') }}>
          <ModalHeader icon="↑" title="ВЫВОД СРЕДСТВ" color="#f87171"/>

          <QuickAmounts value={amount} onChange={setAmount} color="#f87171"/>

          <Label>СУММА (USD)</Label>
          <AmountInput value={amount} onChange={setAmount} rate={rate} style={{ marginBottom:'14px' }}/>

          <Label>ВАЛЮТА</Label>
          <NetworkPicker value={network} onChange={setNetwork} style={{ marginBottom:'14px' }}/>

          <Label>TELEGRAM ID ПОЛУЧАТЕЛЯ</Label>
          <div style={{ position:'relative', marginBottom:'8px' }}>
            <input className="inp" type="number" placeholder="123456789"
              value={tgId} onChange={e => setTgId(e.target.value)}
              style={{ borderColor:'rgba(248,113,113,0.3)', fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:700 }}
            />
          </div>
          <div style={{ fontSize:'11px', color:'var(--t3)', marginBottom:'16px', lineHeight:'1.5' }}>
            {user.telegramId
              ? `✅ Ваш Telegram ID: ${user.telegramId} (подставлен автоматически)`
              : '⚠️ Войдите через Telegram чтобы подставить ID автоматически'}
          </div>

          <InfoBox color="#f87171">
            💸 Деньги спишутся автоматически и придут в @CryptoBot мгновенно. Получатель должен запустить @CryptoBot (/start).
          </InfoBox>

          <ModalButtons
            onCancel={() => { setModal(null); setAmount('') }}
            onConfirm={withdraw}
            confirmLabel="↑ Вывести"
            confirmStyle={{ border:'1px solid rgba(248,113,113,0.5)', color:'#f87171', background:'rgba(248,113,113,0.1)' }}
            loading={working}
          />
        </BottomModal>
      )}
    </div>
  )
}

// ── UI subcomponents ─────────────────────────────────────────────────────────

function BottomModal({ children, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', backdropFilter:'blur(14px)', zIndex:300, display:'flex', alignItems:'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background:'rgba(8,10,22,0.99)', borderRadius:'24px 24px 0 0',
        padding:'24px 20px', width:'100%',
        border:'1px solid rgba(255,255,255,0.08)', borderBottom:'none',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.7)',
        animation:'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        maxHeight:'90dvh', overflowY:'auto',
      }}>
        <div style={{ width:'36px', height:'3px', borderRadius:'2px', background:'rgba(255,255,255,0.1)', margin:'0 auto 20px' }}/>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ icon, title, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
      <div style={{ width:'38px', height:'38px', borderRadius:'11px', background:`${color}14`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'17px', fontWeight:700, color, letterSpacing:'0.05em', textShadow:`0 0 12px ${color}40` }}>
        {title}
      </div>
    </div>
  )
}

function Label({ children }) {
  return (
    <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(167,139,250,0.4)', letterSpacing:'0.14em', fontFamily:'var(--font-display)', marginBottom:'7px' }}>
      {children}
    </div>
  )
}

function QuickAmounts({ value, onChange, color }) {
  return (
    <div style={{ display:'flex', gap:'7px', marginBottom:'14px', flexWrap:'wrap' }}>
      {[5, 10, 25, 50, 100].map(v => (
        <button key={v} onClick={() => onChange(String(v))} style={{
          padding:'6px 13px', borderRadius:'100px', cursor:'pointer',
          background: value === String(v) ? `${color}18` : 'rgba(255,255,255,0.04)',
          border:`1px solid ${value === String(v) ? `${color}50` : 'rgba(255,255,255,0.08)'}`,
          color: value === String(v) ? color : 'var(--t2)',
          fontSize:'12px', fontWeight:700, fontFamily:'var(--font-display)',
          transition:'all 0.15s',
        }}>${v}</button>
      ))}
    </div>
  )
}

function AmountInput({ value, onChange, rate, style = {} }) {
  return (
    <div style={{ position:'relative', ...style }}>
      <input className="inp" type="number" placeholder="0.00" value={value} onChange={e => onChange(e.target.value)}
        style={{ paddingRight:'70px', fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:800 }}/>
      {value && rate && (
        <div style={{ position:'absolute', right:'13px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'var(--t3)', whiteSpace:'nowrap' }}>
          ≈{(parseFloat(value||0) * rate).toFixed(0)}₽
        </div>
      )}
    </div>
  )
}

function NetworkPicker({ value, onChange, style = {} }) {
  return (
    <div style={{ display:'flex', gap:'7px', ...style }}>
      {['USDT','TON','BTC'].map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          flex:1, padding:'9px', borderRadius:'10px', cursor:'pointer',
          background: value === n ? 'rgba(124,106,255,0.15)' : 'rgba(255,255,255,0.03)',
          border:`1px solid ${value === n ? 'rgba(124,106,255,0.45)' : 'rgba(255,255,255,0.07)'}`,
          color: value === n ? '#a78bfa' : 'var(--t2)',
          fontSize:'12px', fontWeight:700, fontFamily:'var(--font-display)',
          boxShadow: value === n ? '0 0 10px rgba(124,106,255,0.2)' : 'none',
          transition:'all 0.15s',
        }}>{n}</button>
      ))}
    </div>
  )
}

function InfoBox({ children, color }) {
  return (
    <div style={{
      padding:'12px 14px', borderRadius:'12px', marginBottom:'18px',
      background:`${color}08`, border:`1px solid ${color}20`,
      fontSize:'12px', color:'var(--t2)', lineHeight:'1.6',
    }}>
      {children}
    </div>
  )
}

function ModalButtons({ onCancel, onConfirm, confirmLabel, confirmClass, confirmStyle = {}, loading }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'10px' }}>
      <button className="btn btn-ghost btn-full" onClick={onCancel}
        style={{ fontFamily:'var(--font-display)', fontSize:'13px' }}>
        Отмена
      </button>
      <button className={`btn btn-full ${confirmClass || 'btn-ghost'}`} onClick={onConfirm} disabled={loading}
        style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'0.04em', ...confirmStyle }}>
        {loading
          ? <div style={{ width:'16px', height:'16px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.2)', borderTop:'2px solid currentColor', animation:'rotateSpin 0.7s linear infinite' }}/>
          : confirmLabel
        }
      </button>
    </div>
  )
}
