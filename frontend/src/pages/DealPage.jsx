import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC, GameLogo } from '../components/Icons'
import toast from 'react-hot-toast'

const STATUS_INFO = {
  pending:   { label:'Ожидание оплаты', color:'#fbbf24', bg:'rgba(251,191,36,0.08)',  desc:'Ожидаем оплату от покупателя' },
  frozen:    { label:'Оплачено — В сделке', color:'#22d3ee', bg:'rgba(34,211,238,0.08)', desc:'Средства заморожены. Подтвердите получение.' },
  completed: { label:'Сделка завершена', color:'#4ade80', bg:'rgba(74,222,128,0.08)',  desc:'Деньги переведены продавцу' },
  disputed:  { label:'Открыт спор', color:'#f87171', bg:'rgba(248,113,113,0.08)',  desc:'Администратор разберётся в ситуации' },
  refunded:  { label:'Возврат', color:'#a78bfa', bg:'rgba(167,139,250,0.08)',  desc:'Средства возвращены покупателю' },
  cancelled: { label:'Отменена', color:'var(--t3)', bg:'rgba(255,255,255,0.03)', desc:'Сделка отменена' },
}

export default function DealPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useStore()
  const [deal, setDeal]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg]         = useState('')
  const [sending, setSending] = useState(false)
  const [working, setWorking] = useState(false)
  const bottomRef = useRef(null)
  const pollRef   = useRef(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const { data } = await api.get(`/deals/${id}`)
      setDeal(data)
    } catch {}
    if (!quiet) setLoading(false)
  }, [id])

  useEffect(() => {
    load()
    pollRef.current = setInterval(() => load(true), 4000)
    return () => clearInterval(pollRef.current)
  }, [load])

  useEffect(() => {
    if (deal) bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [deal?.messages?.length])

  const sendMsg = async () => {
    if (!msg.trim() || sending) return
    const text = msg.trim(); setSending(true); setMsg('')
    try {
      await api.post(`/deals/${id}/message`, { text })
      await load(true)
    } catch { setMsg(text) }
    setSending(false)
  }

  const confirm = async () => {
    if (!confirm('Подтвердить получение? Деньги будут переведены продавцу.')) return
    setWorking(true)
    try { await api.post(`/deals/${id}/confirm`); toast.success('✅ Сделка завершена!'); await load(true) }
    catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setWorking(false)
  }

  const dispute = async () => {
    if (!confirm('Открыть спор? Администратор разберётся в ситуации.')) return
    setWorking(true)
    try { await api.post(`/deals/${id}/dispute`); toast.success('⚠ Спор открыт'); await load(true) }
    catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setWorking(false)
  }

  if (loading) return <Loader/>
  if (!deal) return null

  const isBuyer = deal.buyerId === user?.id
  const other   = isBuyer ? deal.seller : deal.buyer
  const st      = STATUS_INFO[deal.status] || { label:deal.status, color:'var(--t2)', bg:'var(--surface)', desc:'' }
  const msgs    = deal.messages || []

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh' }}>
      {/* ── HEADER ── */}
      <div style={{ padding:'12px 14px', background:'rgba(6,8,17,0.97)', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0, backdropFilter:'blur(28px)', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
          <button onClick={() => navigate(-1)} className="btn-icon" style={{ flexShrink:0 }}><IC.Back s={18}/></button>
          <GameLogo title={deal.product?.title} game={deal.product?.game} category={deal.product?.category} size={36}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:'14px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {deal.product?.title}
            </div>
            <div style={{ fontSize:'11px', color:'var(--t3)' }}>
              {isBuyer ? `Продавец: ${other?.username||other?.firstName||'?'}` : `Покупатель: ${other?.username||other?.firstName||'?'}`}
            </div>
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'17px', color:'#a78bfa', flexShrink:0, textShadow:'0 0 8px rgba(167,139,250,0.5)' }}>
            ${parseFloat(deal.amount).toFixed(2)}
          </div>
        </div>

        {/* Status */}
        <div style={{ borderRadius:'12px', padding:'10px 13px', background:st.bg, border:`1px solid ${st.color}28`, display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:st.color, flexShrink:0, boxShadow:`0 0 8px ${st.color}`, animation:'floatY 2s ease-in-out infinite' }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'12px', color:st.color, letterSpacing:'0.04em', textShadow:`0 0 8px ${st.color}50` }}>{st.label}</div>
            <div style={{ fontSize:'11px', color:'var(--t3)', marginTop:'1px' }}>{st.desc}</div>
          </div>
          {deal.autoCompleteAt && deal.status === 'frozen' && (
            <div style={{ fontSize:'10px', color:'var(--t3)', textAlign:'right', flexShrink:0 }}>
              Авто<br/>{new Date(deal.autoCompleteAt).toLocaleDateString('ru')}
            </div>
          )}
        </div>
      </div>

      {/* ── CHAT MESSAGES ── */}
      <div className="scroll" style={{ flex:1, padding:'12px 14px', display:'flex', flexDirection:'column', gap:'8px', background:'var(--bg)' }}>
        {/* System header */}
        <div style={{ textAlign:'center', margin:'4px 0 8px' }}>
          <span style={{ fontSize:'11px', color:'var(--t3)', background:'rgba(255,255,255,0.04)', padding:'4px 12px', borderRadius:'100px', border:'1px solid rgba(255,255,255,0.06)' }}>
            Сделка #{id.slice(-8).toUpperCase()} · {new Date(deal.createdAt).toLocaleString('ru', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
          </span>
        </div>

        {msgs.length === 0 && (
          <div style={{ textAlign:'center', padding:'30px 20px' }}>
            <IC.Chat s={40} c="rgba(255,255,255,0.06)"/>
            <div style={{ fontSize:'12px', color:'var(--t3)', marginTop:'12px', fontFamily:'var(--font-display)', letterSpacing:'0.08em' }}>НАПИШИТЕ СООБЩЕНИЕ</div>
          </div>
        )}

        {msgs.map((m, i) => {
          const isMe    = m.senderId === user?.id
          const isAdmin = m.isAdmin
          if (isAdmin) return (
            <div key={i} style={{ textAlign:'center', margin:'4px 0' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', padding:'8px 14px', borderRadius:'12px', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)' }}>
                <IC.Shield s={12} c="#a78bfa"/>
                <span style={{ fontSize:'12px', color:'#a78bfa', fontWeight:600 }}>{m.text}</span>
              </div>
            </div>
          )
          return (
            <div key={i} style={{ display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth:'72%', padding:'10px 13px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isMe
                  ? 'linear-gradient(135deg,rgba(124,106,255,0.28),rgba(91,78,224,0.22))'
                  : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isMe ? 'rgba(124,106,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                borderTop: `1px solid ${isMe ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.12)'}`,
                boxShadow: isMe ? '0 4px 16px rgba(124,106,255,0.15)' : 'none',
              }}>
                {!isMe && (
                  <div style={{ fontSize:'10px', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'4px', letterSpacing:'0.04em' }}>
                    {other?.username || other?.firstName || '?'}
                  </div>
                )}
                <div style={{ fontSize:'14px', color:'var(--t1)', lineHeight:'1.4', wordBreak:'break-word' }}>
                  {m.text}
                </div>
                <div style={{ fontSize:'10px', color:'var(--t3)', marginTop:'5px', textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(m.createdAt).toLocaleTimeString('ru', { hour:'2-digit', minute:'2-digit' })}
                  {isMe && <span style={{ marginLeft:'5px', color: m.read ? '#4ade80' : 'var(--t3)' }}>✓✓</span>}
                </div>
              </div>
            </div>
          )
        })}

        {/* Action buttons */}
        {deal.status === 'frozen' && isBuyer && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'8px' }}>
            <button className="btn btn-ghost" onClick={dispute} disabled={working}
              style={{ gap:'6px', fontFamily:'var(--font-display)', fontSize:'12px', letterSpacing:'0.04em', border:'1px solid rgba(248,113,113,0.3)', color:'#f87171' }}>
              <IC.Shield s={14} c="#f87171"/> Спор
            </button>
            <button className="btn btn-violet" onClick={confirm} disabled={working}
              style={{ gap:'6px', fontFamily:'var(--font-display)', fontSize:'12px', letterSpacing:'0.04em' }}>
              {working
                ? <div style={{ width:'14px', height:'14px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid white', animation:'rotateSpin 0.7s linear infinite' }}/>
                : <IC.Check s={14} c="white"/>
              }
              Подтвердить
            </button>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* ── INPUT ── */}
      {['pending','frozen','disputed'].includes(deal.status) && (
        <div style={{
          padding:'10px 12px', background:'rgba(6,8,17,0.97)', borderTop:'1px solid rgba(255,255,255,0.06)',
          backdropFilter:'blur(28px)', paddingBottom:'calc(10px + env(safe-area-inset-bottom,0px))',
          display:'flex', gap:'8px', alignItems:'center',
        }}>
          <input
            className="inp" placeholder="Сообщение..."
            value={msg} onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
            style={{ flex:1, borderRadius:'100px', fontSize:'14px', padding:'10px 16px' }}
          />
          <button onClick={sendMsg} disabled={!msg.trim() || sending} style={{
            width:'42px', height:'42px', borderRadius:'13px', flexShrink:0, cursor:'pointer', border:'none',
            background: msg.trim()
              ? 'linear-gradient(135deg,#9d8fff,#7c6aff,#4035b5)'
              : 'rgba(255,255,255,0.06)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: msg.trim() ? '0 0 15px rgba(124,106,255,0.5)' : 'none',
            transition:'all 0.2s',
          }}>
            <IC.Send s={17} c={msg.trim() ? 'white' : 'var(--t3)'}/>
          </button>
        </div>
      )}
    </div>
  )
}

function Loader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh', background:'var(--bg)' }}>
      <div style={{ width:'36px', height:'36px', borderRadius:'50%', border:'3px solid rgba(124,106,255,0.15)', borderTop:'3px solid #7c6aff', animation:'rotateSpin 0.8s linear infinite', boxShadow:'0 0 15px rgba(124,106,255,0.3)' }}/>
    </div>
  )
}
