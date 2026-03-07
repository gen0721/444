import React, { useState, useEffect } from 'react'
import { useStore, api } from '../store'
import { IC } from '../components/Icons'
import { getUsdToRub } from '../components/RubleDisplay'
import toast from 'react-hot-toast'

const TX_INFO = {
  deposit:    { Icon: IC.Up,     color: '#00e87a', label: 'Пополнение' },
  withdrawal: { Icon: IC.Down,   color: '#ff3355', label: 'Вывод' },
  purchase:   { Icon: IC.Wallet, color: '#ff3355', label: 'Покупка' },
  sale:       { Icon: IC.Check,  color: '#00e87a', label: 'Продажа' },
  refund:     { Icon: IC.Back,   color: '#00d4ff', label: 'Возврат' },
  commission: { Icon: IC.Star,   color: '#b44fff', label: 'Комиссия' },
  freeze:     { Icon: IC.Lock,   color: '#00d4ff', label: 'Заморожено' },
  unfreeze:   { Icon: IC.Check,  color: '#00e87a', label: 'Разморожено' },
  adjustment: { Icon: IC.Crown,  color: '#ffe600', label: 'Корректировка' },
}

export default function WalletPage() {
  const { user, refreshBalance } = useStore()
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [modal, setModal] = useState(null)
  const [amount, setAmount] = useState('')
  const [working, setWorking] = useState(false)
  const [rate, setRate] = useState(92)
  const [rubDisplay, setRubDisplay] = useState('')

  useEffect(() => { getUsdToRub().then(setRate) }, [])
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      setRubDisplay((parseFloat(amount) * rate).toFixed(0))
    } else setRubDisplay('')
  }, [amount, rate])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/wallet/transactions', { params: { type: tab==='all'?undefined:tab, limit: 50 } })
      setTxs(data.transactions || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [tab])

  const doDeposit = async () => {
    if (!amount || parseFloat(amount) < 1) return toast.error('Минимум $1')
    setWorking(true)
    try {
      const { data } = await api.post('/wallet/deposit', { amount: parseFloat(amount), currency: 'USDT' })
      if (data.payUrl) {
        window.Telegram?.WebApp?.openLink(data.payUrl)
        toast.success('Счёт создан! Оплатите через CryptoBot')
      } else if (data.devMode) {
        await refreshBalance()
        toast.success(`✅ +$${amount} зачислено`)
      }
      setModal(null); setAmount(''); setTimeout(load, 1500)
    } catch(e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setWorking(false)
  }

  const doWithdraw = async () => {
    if (!amount || parseFloat(amount) < 5) return toast.error('Минимум $5')
    if (parseFloat(amount) > parseFloat(user?.balance || 0)) return toast.error('Недостаточно средств')
    setWorking(true)
    try {
      await api.post('/wallet/withdraw', { amount: parseFloat(amount), currency: 'USDT' })
      await refreshBalance()
      toast.success(`✅ $${amount} выведено`)
      setModal(null); setAmount(''); load()
    } catch(e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setWorking(false)
  }

  const bal = parseFloat(user?.balance || 0)
  const frozen = parseFloat(user?.frozenBalance || 0)
  const balRub = (bal * rate).toFixed(0)
  const FILTERS = [
    {id:'all',l:'ВСЁ'},{id:'deposit',l:'ПОПОЛН.'},{id:'withdrawal',l:'ВЫВОД'},
    {id:'purchase',l:'ПОКУПКИ'},{id:'sale',l:'ПРОДАЖИ'}
  ]

  return (
    <div style={{ minHeight:'100%' }}>
      {/* Header */}
      <div style={{ padding:'14px 14px 0', background:'rgba(7,7,9,0.95)', borderBottom:'1px solid rgba(255,102,0,0.12)', backdropFilter:'blur(20px)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
          <IC.Diamond s={20} c="#ff6600"/>
          <span style={{ fontFamily:'var(--font-d)', fontSize:'22px', fontWeight:700, letterSpacing:'0.05em', color:'var(--orange)',
            textShadow:'0 0 12px rgba(255,102,0,0.4)', animation:'neonPulse 3s ease-in-out infinite' }}>
            КОШЕЛЁК
          </span>
        </div>

        {/* Balance Card */}
        <div style={{
          borderRadius:'18px', padding:'22px 20px', marginBottom:'12px',
          background:'linear-gradient(135deg,rgba(20,10,0,0.95),rgba(8,8,18,0.95))',
          border:'1px solid rgba(255,102,0,0.25)',
          boxShadow:'0 0 40px rgba(255,102,0,0.08), inset 0 1px 0 rgba(255,140,0,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)',
          position:'relative', overflow:'hidden'
        }}>
          {/* Background pattern */}
          <div style={{ position:'absolute', inset:0, opacity:0.04,
            backgroundImage:'radial-gradient(circle, rgba(255,102,0,1) 1px, transparent 1px)',
            backgroundSize:'24px 24px' }}/>
          {/* Highlight */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'45%',
            background:'linear-gradient(180deg,rgba(255,255,255,0.04),transparent)', borderRadius:'18px 18px 0 0', pointerEvents:'none' }}/>

          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:'11px', color:'rgba(255,102,0,0.5)', fontFamily:'var(--font-d)', letterSpacing:'0.15em', marginBottom:'5px' }}>
              ДОСТУПНЫЙ БАЛАНС
            </div>
            <div style={{ fontFamily:'var(--font-d)', fontSize:'42px', fontWeight:700, color:'#ff8833', lineHeight:1, marginBottom:'4px',
              textShadow:'0 0 20px rgba(255,102,0,0.5)', animation:'neonPulse 4s ease-in-out infinite' }}>
              ${bal.toFixed(2)}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'18px' }}>
              <IC.Ruble s={13} c="rgba(0,212,255,0.7)"/>
              <span style={{ fontSize:'15px', color:'rgba(0,212,255,0.8)', fontWeight:600 }}>
                {parseInt(balRub).toLocaleString('ru')} ₽
              </span>
              <span style={{ fontSize:'10px', color:'var(--text3)', marginLeft:'4px' }}>1$ = {rate.toFixed(0)}₽</span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
              {[
                { l:'ЗАМОРОЖЕНО', v:`$${frozen.toFixed(2)}`, vr:`${(frozen*rate).toFixed(0)}₽`, c:'#00d4ff' },
                { l:'ПОПОЛНЕНО',  v:`$${parseFloat(user?.totalDeposited||0).toFixed(0)}`, vr:`${(parseFloat(user?.totalDeposited||0)*rate).toFixed(0)}₽`, c:'#00e87a' },
                { l:'ВЫВЕДЕНО',   v:`$${parseFloat(user?.totalWithdrawn||0).toFixed(0)}`, vr:`${(parseFloat(user?.totalWithdrawn||0)*rate).toFixed(0)}₽`, c:'#ff3355' },
              ].map(s=>(
                <div key={s.l}>
                  <div style={{ fontFamily:'var(--font-d)', fontWeight:700, fontSize:'15px', color:s.c, textShadow:`0 0 6px ${s.c}60` }}>{s.v}</div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', fontFamily:'var(--font-d)' }}>{s.vr}</div>
                  <div style={{ fontSize:'9px', color:'var(--text3)', marginTop:'1px', letterSpacing:'0.06em', fontFamily:'var(--font-d)' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', paddingBottom:'14px' }}>
          <button className="btn btn-success btn-lg btn-full" onClick={()=>{setModal('deposit');setAmount('')}}
            style={{ fontFamily:'var(--font-d)', letterSpacing:'0.08em', gap:'8px' }}>
            <IC.Up s={18} c="#002a14"/> ПОПОЛНИТЬ
          </button>
          <button className="btn btn-danger btn-lg btn-full" onClick={()=>{setModal('withdraw');setAmount('')}}
            style={{ fontFamily:'var(--font-d)', letterSpacing:'0.08em', gap:'8px' }}>
            <IC.Down s={18} c="white"/> ВЫВЕСТИ
          </button>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:'5px', overflowX:'auto', scrollbarWidth:'none', paddingBottom:'10px' }}>
          {FILTERS.map(f=>(
            <button key={f.id} onClick={()=>setTab(f.id)} style={{
              padding:'6px 12px', borderRadius:'100px', whiteSpace:'nowrap', border:'none', cursor:'pointer',
              background: tab===f.id ? 'rgba(255,102,0,0.15)' : 'rgba(255,255,255,0.04)',
              borderWidth:'1px', borderStyle:'solid', borderColor: tab===f.id ? 'rgba(255,102,0,0.45)' : 'rgba(255,255,255,0.06)',
              color: tab===f.id ? '#ff8833' : 'var(--text3)',
              fontFamily:'var(--font-d)', fontWeight:700, fontSize:'11px', letterSpacing:'0.06em',
              transition:'all var(--ease)'
            }}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div style={{ padding:'10px 12px' }}>
        {loading ? (
          Array(6).fill(0).map((_,i)=>(
            <div key={i} style={{ display:'flex', gap:'10px', marginBottom:'8px', alignItems:'center' }}>
              <div className="skeleton" style={{ width:'42px', height:'42px', borderRadius:'12px', flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div className="skeleton" style={{ height:'13px', marginBottom:'6px', borderRadius:'4px', width:'70%' }}/>
                <div className="skeleton" style={{ height:'10px', borderRadius:'4px', width:'45%' }}/>
              </div>
              <div className="skeleton" style={{ width:'60px', height:'16px', borderRadius:'4px' }}/>
            </div>
          ))
        ) : txs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <IC.Wallet s={48} c="rgba(255,255,255,0.1)"/>
            <div style={{ fontFamily:'var(--font-d)', color:'var(--text3)', letterSpacing:'0.08em', marginTop:'14px', fontSize:'16px' }}>НЕТ ТРАНЗАКЦИЙ</div>
          </div>
        ) : txs.map((tx, i) => {
          const info = TX_INFO[tx.type] || { Icon: IC.Wallet, color: 'var(--text3)', label: tx.type }
          const amt = parseFloat(tx.amount)
          const amtRub = Math.abs(amt * rate).toFixed(0)
          const { Icon } = info
          return (
            <div key={tx.id} style={{
              display:'flex', alignItems:'center', gap:'12px', padding:'12px 12px',
              borderRadius:'13px', marginBottom:'6px',
              background:'rgba(11,11,15,0.85)', border:'1px solid rgba(255,255,255,0.04)',
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.03)',
              animation:`fadeIn 0.35s ${i*35}ms both`
            }}>
              <div style={{ width:'42px', height:'42px', borderRadius:'12px', flexShrink:0,
                background:`${info.color}12`, display:'flex', alignItems:'center', justifyContent:'center',
                border:`1px solid ${info.color}20`,
                boxShadow:`0 0 8px ${info.color}15` }}>
                <Icon s={18} c={info.color}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)', marginBottom:'3px',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {tx.description || info.label}
                </div>
                <div style={{ fontSize:'11px', color:'var(--text3)' }}>
                  {new Date(tx.createdAt).toLocaleString('ru', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  &nbsp;·&nbsp;
                  <span style={{ color: tx.status==='completed'?'#00e87a':tx.status==='pending'?'#ffe600':'#ff3355' }}>
                    {tx.status==='completed'?'✓ Выполнено':tx.status==='pending'?'⏳ Ожидание':'✗ Ошибка'}
                  </span>
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:'var(--font-d)', fontWeight:700, fontSize:'15px',
                  color: amt >= 0 ? '#00e87a' : '#ff3355',
                  textShadow:`0 0 8px ${amt >= 0 ? 'rgba(0,232,122,0.35)' : 'rgba(255,51,85,0.35)'}` }}>
                  {amt >= 0 ? '+' : ''}{amt.toFixed(2)}$
                </div>
                <div style={{ fontSize:'10px', color:'rgba(0,212,255,0.5)', marginTop:'2px' }}>
                  {parseInt(amtRub).toLocaleString('ru')} ₽
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── MODAL ─── */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(14px)', zIndex:200, display:'flex', alignItems:'flex-end' }}
          onClick={e=>{ if(e.target===e.currentTarget){setModal(null);setAmount('')} }}>
          <div style={{
            background:'linear-gradient(180deg,rgba(12,12,16,0.98),rgba(8,8,12,0.99))',
            backdropFilter:'blur(20px)', borderRadius:'22px 22px 0 0', padding:'6px 20px 24px',
            width:'100%', border:'1px solid rgba(255,102,0,0.18)', borderBottom:'none',
            boxShadow:'0 -8px 40px rgba(0,0,0,0.7), 0 -1px 0 rgba(255,140,0,0.08)',
            animation:'slideUp 0.38s cubic-bezier(0.34,1.56,0.64,1)'
          }}>
            {/* Handle */}
            <div style={{ width:'44px', height:'3px', borderRadius:'2px', background:'rgba(255,102,0,0.35)', margin:'10px auto 20px' }}/>

            <div style={{ fontFamily:'var(--font-d)', fontSize:'22px', fontWeight:700, letterSpacing:'0.05em', marginBottom:'6px',
              color: modal==='deposit'?'#00e87a':'#ff3355',
              textShadow:`0 0 12px ${modal==='deposit'?'rgba(0,232,122,0.4)':'rgba(255,51,85,0.4)'}` }}>
              {modal==='deposit' ? 'ПОПОЛНЕНИЕ СЧЁТА' : 'ВЫВОД СРЕДСТВ'}
            </div>

            {modal==='deposit' && (
              <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 12px', marginBottom:'14px',
                background:'rgba(0,212,255,0.07)', border:'1px solid rgba(0,212,255,0.18)', borderRadius:'10px', fontSize:'13px', color:'#00d4ff' }}>
                <IC.Diamond s={14} c="#00d4ff"/> Оплата через CryptoBot (USDT, BTC, TON, ETH)
              </div>
            )}

            <div style={{ marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:`rgba(${modal==='deposit'?'0,232,122':'255,51,85'},0.6)`,
                textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'7px', fontFamily:'var(--font-d)' }}>
                {modal==='deposit' ? 'СУММА (МИН. $1)' : `СУММА (МИН. $5, МАКС. $${bal.toFixed(2)})`}
              </div>
              <div style={{ position:'relative' }}>
                <input className="input" type="number" placeholder="0.00" value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ paddingLeft:'44px', fontSize:'24px', fontFamily:'var(--font-d)', fontWeight:700, height:'58px',
                    borderColor:`rgba(${modal==='deposit'?'0,200,100':'200,40,60'},0.3)` }}/>
                <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)',
                  color:'var(--text3)', fontSize:'22px', fontWeight:300 }}>$</span>
              </div>
              {/* Ruble equivalent */}
              {rubDisplay && (
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'7px', padding:'8px 12px',
                  background:'rgba(0,212,255,0.06)', borderRadius:'9px', border:'1px solid rgba(0,212,255,0.15)' }}>
                  <IC.Ruble s={13} c="#00d4ff"/>
                  <span style={{ fontSize:'14px', color:'#00d4ff', fontWeight:700, fontFamily:'var(--font-d)' }}>
                    {parseInt(rubDisplay).toLocaleString('ru')} ₽
                  </span>
                  <span style={{ fontSize:'10px', color:'var(--text3)', marginLeft:'auto' }}>курс: {rate.toFixed(0)} ₽/$</span>
                </div>
              )}
            </div>

            {/* Quick amounts */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'6px', marginBottom:'18px' }}>
              {(modal==='deposit'?['1','5','10','25','50']:['5','10','25','50','100']).map(a=>(
                <button key={a} onClick={()=>setAmount(a)} style={{
                  padding:'9px 4px', borderRadius:'9px', fontSize:'13px',
                  fontFamily:'var(--font-d)', fontWeight:700,
                  background: amount===a?'rgba(255,102,0,0.18)':'rgba(255,255,255,0.04)',
                  border:`1px solid ${amount===a?'rgba(255,102,0,0.5)':'rgba(255,255,255,0.07)'}`,
                  color: amount===a?'#ff8833':'var(--text3)', cursor:'pointer',
                  boxShadow: amount===a?'0 0 10px rgba(255,102,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)':'inset 0 1px 0 rgba(255,255,255,0.04)',
                  transition:'all var(--ease)'
                }}>${a}</button>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'10px' }}>
              <button className="btn btn-ghost" onClick={()=>{setModal(null);setAmount('')}}
                style={{ fontFamily:'var(--font-d)', letterSpacing:'0.05em' }}>ОТМЕНА</button>
              <button
                className={`btn btn-lg ${modal==='deposit'?'btn-success':'btn-danger'}`}
                onClick={modal==='deposit'?doDeposit:doWithdraw}
                disabled={working||!amount}
                style={{ fontFamily:'var(--font-d)', letterSpacing:'0.08em', gap:'8px' }}>
                {modal==='deposit' ? <IC.Up s={16} c="#002a14"/> : <IC.Down s={16} c="white"/>}
                {working ? 'ОБРАБОТКА...' : modal==='deposit' ? 'ПОПОЛНИТЬ' : 'ВЫВЕСТИ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
