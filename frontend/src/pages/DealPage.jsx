import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC, GameLogo } from '../components/Icons'
import { RubleAmount } from '../components/RubleDisplay'
import toast from 'react-hot-toast'

const STATUS_INFO = {
  frozen:    { label:'💰 Средства заморожены',  color:'#22d3ee', bg:'rgba(34,211,238,0.08)',   desc:'Продавец — передайте товар. Покупатель — проверьте и подтвердите.' },
  completed: { label:'✅ Сделка завершена',       color:'#4ade80', bg:'rgba(74,222,128,0.08)',   desc:'Деньги переведены продавцу. Спасибо!' },
  disputed:  { label:'⚠️ Открыт спор',           color:'#f87171', bg:'rgba(248,113,113,0.08)',  desc:'Администратор рассматривает ситуацию.' },
  refunded:  { label:'↩️ Возврат',               color:'#a78bfa', bg:'rgba(167,139,250,0.08)',  desc:'Средства возвращены покупателю.' },
  cancelled: { label:'✖ Отменена',               color:'var(--t3)', bg:'rgba(255,255,255,0.03)', desc:'Сделка отменена.' },
  pending:   { label:'⏳ Ожидание',              color:'#fbbf24', bg:'rgba(251,191,36,0.08)',   desc:'Ожидаем оплату.' },
}

// ── Steps for visual progress bar ────────────────────────────────────────────
function StepBar({ status, sellerDelivered }) {
  const steps = [
    { key: 'paid',      label: 'Оплачено',     done: true },
    { key: 'delivered', label: 'Товар передан', done: status === 'completed' || status === 'refunded' || sellerDelivered },
    { key: 'confirmed', label: 'Подтверждено',  done: status === 'completed' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: s.done ? 'linear-gradient(135deg,#4ade80,#22d3ee)' : 'rgba(255,255,255,0.07)',
              border: `2px solid ${s.done ? '#4ade80' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: s.done ? '#000' : 'var(--t3)',
              fontWeight: 800, transition: 'all 0.3s',
              boxShadow: s.done ? '0 0 10px rgba(74,222,128,0.5)' : 'none',
            }}>
              {s.done ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 9, color: s.done ? '#4ade80' : 'var(--t3)', marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.04em', textAlign: 'center' }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: steps[i + 1].done ? 'linear-gradient(90deg,#4ade80,#22d3ee)' : 'rgba(255,255,255,0.07)', marginBottom: 18, transition: 'background 0.3s' }}/>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function DealPage() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { user }    = useStore()
  const [deal,      setDeal]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [msg,       setMsg]       = useState('')
  const [sending,   setSending]   = useState(false)
  const [working,   setWorking]   = useState(false)
  const [showDeliver, setShowDeliver] = useState(false)
  const [deliverText, setDeliverText] = useState('')
  const [delivering,  setDelivering]  = useState(false)
  const bottomRef = useRef(null)
  const pollRef   = useRef(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try { const { data } = await api.get(`/deals/${id}`); setDeal(data) } catch {}
    if (!quiet) setLoading(false)
  }, [id])

  useEffect(() => {
    load()
    pollRef.current = setInterval(() => load(true), 4000)
    return () => clearInterval(pollRef.current)
  }, [load])

  useEffect(() => {
    if (deal) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [deal?.messages?.length])

  const sendMsg = async () => {
    if (!msg.trim() || sending) return
    const text = msg.trim(); setSending(true); setMsg('')
    try { await api.post(`/deals/${id}/message`, { text }); await load(true) }
    catch { setMsg(text) }
    setSending(false)
  }

  const confirm = async () => {
    if (!window.confirm('Подтвердить получение товара?\n\nДеньги будут переведены продавцу — это действие нельзя отменить.')) return
    setWorking(true)
    try { await api.post(`/deals/${id}/confirm`); toast.success('✅ Сделка успешно завершена!'); await load(true) }
    catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setWorking(false)
  }

  const dispute = async () => {
    const reason = window.prompt('Опишите проблему (необязательно):') ?? ''
    if (reason === null) return // cancelled
    setWorking(true)
    try { await api.post(`/deals/${id}/dispute`, { reason }); toast.success('⚠️ Спор открыт, администратор рассмотрит ситуацию'); await load(true) }
    catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setWorking(false)
  }

  const deliver = async () => {
    if (!deliverText.trim()) return toast.error('Введите данные для передачи')
    setDelivering(true)
    try {
      await api.post(`/deals/${id}/deliver`, { deliveryData: deliverText.trim() })
      toast.success('📦 Данные переданы покупателю!')
      setShowDeliver(false); setDeliverText('')
      await load(true)
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setDelivering(false)
  }

  if (loading) return <Loader/>
  if (!deal)   return null

  const isBuyer  = deal.buyerId  === user?.id
  const isSeller = deal.sellerId === user?.id
  const isAdmin  = user?.isAdmin
  const other    = isBuyer ? deal.seller : deal.buyer
  const st       = STATUS_INFO[deal.status] || { label: deal.status, color: 'var(--t2)', bg: 'var(--surface)', desc: '' }
  const msgs     = deal.messages || []
  const price    = parseFloat(deal.amount)
  const sellerAmt = parseFloat(deal.sellerAmount || price * 0.95)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>

      {/* ── HEADER ── */}
      <div style={{ padding: '12px 14px 14px', background: 'rgba(6,8,17,0.98)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, backdropFilter: 'blur(28px)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={() => navigate(-1)} className="btn-icon" style={{ flexShrink: 0 }}><IC.Back s={18}/></button>
          <GameLogo title={deal.product?.title} game={deal.product?.game} category={deal.product?.category} size={36}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {deal.product?.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>
              {isBuyer ? `Продавец: ${other?.username || other?.firstName || '?'}` : `Покупатель: ${other?.username || other?.firstName || '?'}`}
            </div>
          </div>
          {/* Price shown per role */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: isBuyer ? '#f87171' : '#4ade80', textShadow: `0 0 8px ${isBuyer ? 'rgba(248,113,113,0.4)' : 'rgba(74,222,128,0.4)'}` }}>
              {isBuyer ? `-$${price.toFixed(2)}` : `+$${sellerAmt.toFixed(2)}`}
            </div>
            <RubleAmount usd={isBuyer ? price : sellerAmt} size="xs"/>
          </div>
        </div>

        {/* Progress steps */}
        <StepBar status={deal.status} sellerDelivered={deal.sellerDelivered}/>

        {/* Status badge */}
        <div style={{ borderRadius: 12, padding: '10px 13px', background: st.bg, border: `1px solid ${st.color}28`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: st.color, flexShrink: 0, boxShadow: `0 0 8px ${st.color}`, animation: deal.status === 'frozen' ? 'floatY 2s ease-in-out infinite' : 'none' }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: st.color, letterSpacing: '0.04em' }}>{st.label}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{st.desc}</div>
          </div>
          {deal.autoCompleteAt && deal.status === 'frozen' && (
            <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>
              Авто через<br/>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                {Math.max(0, Math.ceil((new Date(deal.autoCompleteAt) - Date.now()) / 3600000))}ч
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── MESSAGES + ACTIONS ── */}
      <div className="scroll" style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Deal ID */}
        <div style={{ textAlign: 'center', margin: '4px 0 8px' }}>
          <span style={{ fontSize: 11, color: 'var(--t3)', background: 'rgba(255,255,255,0.04)', padding: '4px 12px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.06)' }}>
            Сделка #{id.slice(-8).toUpperCase()} · {new Date(deal.createdAt).toLocaleString('ru', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Commission info */}
        <div style={{ padding: '10px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
          <div>
            <div style={{ color: 'var(--t3)', marginBottom: 2 }}>Покупатель заплатил</div>
            <div style={{ fontWeight: 700, color: '#f87171' }}>${price.toFixed(2)}</div>
            <RubleAmount usd={price} size="xs"/>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--t3)', marginBottom: 2 }}>Продавец получит</div>
            <div style={{ fontWeight: 700, color: '#4ade80' }}>${sellerAmt.toFixed(2)}</div>
            <RubleAmount usd={sellerAmt} size="xs"/>
          </div>
        </div>

        {/* Delivery data box — shown to buyer when seller has delivered */}
        {deal.deliveryData && (
          <div style={{ padding: '14px', borderRadius: 14, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'rgba(74,222,128,0.6)', letterSpacing: '0.1em', marginBottom: 8 }}>
              📦 ДАННЫЕ ТОВАРА
            </div>
            <div style={{ fontSize: 14, color: '#4ade80', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.6, userSelect: 'all', background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 9 }}>
              {deal.deliveryData}
            </div>
            <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 6 }}>
              Нажмите и удерживайте для копирования
            </div>
          </div>
        )}

        {/* Empty chat */}
        {msgs.length === 0 && !deal.deliveryData && (
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <IC.Chat s={40} c="rgba(255,255,255,0.06)"/>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 12, fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
              {isSeller ? 'ПЕРЕДАЙТЕ ДАННЫЕ ТОВАРА ПОКУПАТЕЛЮ' : 'ДОЖДИТЕСЬ ДАННЫХ ОТ ПРОДАВЦА'}
            </div>
          </div>
        )}

        {/* Messages */}
        {msgs.map((m, i) => {
          const isMe    = m.senderId === user?.id
          const isAdmin = m.isAdmin
          const isSys   = m.isSystem
          if (isAdmin || isSys) return (
            <div key={i} style={{ textAlign: 'center', margin: '4px 0' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 12, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
                <IC.Shield s={12} c="#a78bfa"/>
                <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>{m.text}</span>
              </div>
            </div>
          )
          return (
            <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '72%', padding: '10px 13px',
                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isMe
                  ? 'linear-gradient(135deg,rgba(124,106,255,0.28),rgba(91,78,224,0.22))'
                  : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isMe ? 'rgba(124,106,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isMe ? '0 4px 16px rgba(124,106,255,0.15)' : 'none',
              }}>
                {!isMe && (
                  <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4, letterSpacing: '0.04em' }}>
                    {other?.username || other?.firstName || '?'}
                  </div>
                )}
                <div style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.4, wordBreak: 'break-word' }}>{m.text}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 5, textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(m.ts || m.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}

        {/* ── ACTION BUTTONS ── */}
        {deal.status === 'frozen' && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* SELLER actions */}
            {isSeller && !deal.sellerDelivered && (
              <button onClick={() => setShowDeliver(true)} style={{
                width: '100%', padding: '14px', borderRadius: 14, cursor: 'pointer',
                background: 'linear-gradient(135deg,rgba(34,211,238,0.12),rgba(34,211,238,0.06))',
                border: '1px solid rgba(34,211,238,0.35)',
                color: '#22d3ee', fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 13, letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 0 16px rgba(34,211,238,0.15)',
              }}>
                📦 ПЕРЕДАТЬ ТОВАР ПОКУПАТЕЛЮ
              </button>
            )}
            {isSeller && deal.sellerDelivered && (
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', fontSize: 12, color: '#4ade80', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                ✓ Данные переданы · Ожидаем подтверждения покупателя
              </div>
            )}

            {/* BUYER actions */}
            {isBuyer && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={dispute} disabled={working} style={{
                  padding: '13px', borderRadius: 13, cursor: 'pointer',
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
                  color: '#f87171', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <IC.Shield s={14} c="#f87171"/> Спор
                </button>
                <button onClick={confirm} disabled={working || !deal.sellerDelivered} style={{
                  padding: '13px', borderRadius: 13, cursor: deal.sellerDelivered ? 'pointer' : 'not-allowed',
                  background: deal.sellerDelivered
                    ? 'linear-gradient(135deg,rgba(74,222,128,0.15),rgba(34,211,238,0.1))'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${deal.sellerDelivered ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: deal.sellerDelivered ? '#4ade80' : 'var(--t3)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: deal.sellerDelivered ? '0 0 14px rgba(74,222,128,0.2)' : 'none',
                  opacity: working ? 0.5 : 1,
                }}>
                  {working
                    ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', animation: 'rotateSpin 0.7s linear infinite' }}/>
                    : <IC.Check s={14} c={deal.sellerDelivered ? '#4ade80' : 'var(--t3)'}/>
                  }
                  Подтвердить
                </button>
              </div>
            )}

            {/* hint if buyer hasn't received yet */}
            {isBuyer && !deal.sellerDelivered && (
              <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', padding: '4px 0' }}>
                Кнопка «Подтвердить» станет активной после передачи товара продавцом
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* ── INPUT ── */}
      {['pending','frozen','disputed'].includes(deal.status) && (
        <div style={{
          padding: '10px 12px', background: 'rgba(6,8,17,0.98)', borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(28px)', paddingBottom: 'calc(10px + env(safe-area-inset-bottom,0px))',
          display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
        }}>
          <input className="inp" placeholder="Сообщение..." value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
            style={{ flex: 1, borderRadius: 100, fontSize: 14, padding: '10px 16px' }}
          />
          <button onClick={sendMsg} disabled={!msg.trim() || sending} style={{
            width: 42, height: 42, borderRadius: 13, flexShrink: 0, cursor: 'pointer', border: 'none',
            background: msg.trim() ? 'linear-gradient(135deg,#9d8fff,#7c6aff,#4035b5)' : 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: msg.trim() ? '0 0 15px rgba(124,106,255,0.5)' : 'none', transition: 'all 0.2s',
          }}>
            <IC.Send s={17} c={msg.trim() ? 'white' : 'var(--t3)'}/>
          </button>
        </div>
      )}

      {/* ── DELIVER MODAL ── */}
      {showDeliver && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeliver(false) }}>
          <div style={{ background: 'rgba(8,10,22,0.99)', borderRadius: '24px 24px 0 0', padding: '24px 20px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom,16px))', width: '100%', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', boxShadow: '0 -8px 40px rgba(0,0,0,0.7)', animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 20px' }}/>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#22d3ee', marginBottom: 6 }}>
              📦 ПЕРЕДАТЬ ТОВАР
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16, lineHeight: 1.5 }}>
              Введите ключ активации, данные аккаунта, ссылку или любые данные которые нужно передать покупателю. Они увидят это после того как вы нажмёте кнопку.
            </div>
            <textarea
              value={deliverText}
              onChange={e => setDeliverText(e.target.value)}
              placeholder="Ключ: XXXX-XXXX-XXXX&#10;Логин: user@email.com&#10;Пароль: ..."
              rows={5}
              style={{
                width: '100%', background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.25)',
                borderRadius: 14, padding: '12px 14px', color: 'var(--t1)', fontSize: 14,
                outline: 'none', resize: 'none', fontFamily: 'monospace', lineHeight: 1.6,
                boxSizing: 'border-box', marginBottom: 14,
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <button onClick={() => setShowDeliver(false)} style={{ padding: '12px', borderRadius: 13, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--t2)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>
                Отмена
              </button>
              <button onClick={deliver} disabled={delivering || !deliverText.trim()} style={{ padding: '12px', borderRadius: 13, cursor: 'pointer', background: 'linear-gradient(135deg,rgba(34,211,238,0.15),rgba(34,211,238,0.08))', border: '1px solid rgba(34,211,238,0.4)', color: '#22d3ee', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: delivering ? 0.6 : 1 }}>
                {delivering
                  ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(34,211,238,0.3)', borderTop: '2px solid #22d3ee', animation: 'rotateSpin 0.7s linear infinite' }}/>
                  : '📦'
                }
                {delivering ? 'Отправка...' : 'Передать покупателю'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(124,106,255,0.15)', borderTop: '3px solid #7c6aff', animation: 'rotateSpin 0.8s linear infinite' }}/>
    </div>
  )
}
