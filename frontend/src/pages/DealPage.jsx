import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import GameLogo from '../components/GameLogo'
import toast from 'react-hot-toast'

const STATUS_INFO = {
  frozen:    { label:'❄ ЗАМОРОЖЕНО',    color:'#00d4ff', bg:'rgba(0,212,255,0.08)',  desc:'Средства заморожены. Подтвердите получение.' },
  completed: { label:'✅ ЗАВЕРШЕНО',     color:'#00ff88', bg:'rgba(0,255,136,0.08)', desc:'Сделка успешно завершена.' },
  disputed:  { label:'⚠ СПОР',          color:'#ffe600', bg:'rgba(255,230,0,0.08)', desc:'Спор передан администратору.' },
  cancelled: { label:'❌ ОТМЕНЕНО',      color:'#ff3355', bg:'rgba(255,51,85,0.08)', desc:'Сделка отменена.' },
  refunded:  { label:'↩ ВОЗВРАТ',       color:'#b44fff', bg:'rgba(180,79,255,0.08)',desc:'Средства возвращены покупателю.' },
}

export default function DealPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refreshBalance } = useStore()
  const [deal, setDeal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [working, setWorking] = useState(false)
  const messagesRef = useRef(null)

  const load = async (silent=false) => {
    try { const {data}=await api.get(`/deals/${id}`); setDeal(data) }
    catch { if(!silent) toast.error('Сделка не найдена') }
    if(!silent) setLoading(false)
  }
  useEffect(()=>{ load() },[id])

  // Auto-refresh chat every 4 seconds
  useEffect(()=>{
    const t = setInterval(()=>load(true), 4000)
    return ()=>clearInterval(t)
  },[id])

  useEffect(()=>{
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  },[deal?.messages])

  const sendMsg = async () => {
    if (!msg.trim()||sending) return
    setSending(true)
    try {
      const {data}=await api.post(`/deals/${id}/message`,{text:msg.trim()})
      setMsg('')
      setDeal(d=>({...d,messages:data.messages}))
    } catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
    setSending(false)
  }
  const doConfirm = async () => {
    setWorking(true)
    try {
      await api.post(`/deals/${id}/confirm`)
      await refreshBalance()
      toast.success('🎉 Сделка завершена! Деньги переведены продавцу.')
      setConfirm(false); load()
    } catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
    setWorking(false)
  }
  const doDispute = async () => {
    if (!confirm('Открыть спор? Сделка будет передана администратору.')) return
    setWorking(true)
    try { await api.post(`/deals/${id}/dispute`); toast.success('⚠ Спор открыт. Администратор разберётся.'); load() }
    catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
    setWorking(false)
  }

  if (loading) return <Loader/>
  if (!deal) return null

  const isBuyer = deal.buyerId===user?.id
  const other = isBuyer?deal.seller:deal.buyer
  const st = STATUS_INFO[deal.status]||{ label:deal.status, color:'var(--text3)', bg:'var(--surface)', desc:'' }
  const msgs = deal.messages||[]

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',height:'100dvh'}}>
      {/* Header */}
      <div style={{padding:'12px 14px',background:'rgba(8,8,8,0.97)',borderBottom:'1px solid rgba(255,102,0,0.15)',flexShrink:0,backdropFilter:'blur(20px)',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <button onClick={()=>navigate(-1)} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',width:'34px',height:'34px',cursor:'pointer',color:'var(--text)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>←</button>
          <GameLogo title={deal.product?.title} game={deal.product?.game} category={deal.product?.category} size={36}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{deal.product?.title}</div>
            <div style={{fontSize:'11px',color:'var(--text3)'}}>
              {isBuyer?`💸 Продавец: ${other?.username||other?.firstName||'?'}`:`🛒 Покупатель: ${other?.username||other?.firstName||'?'}`}
            </div>
          </div>
          <div style={{fontFamily:'var(--font-d)',fontWeight:800,fontSize:'17px',color:'#ff8833',flexShrink:0,textShadow:'0 0 8px rgba(255,102,0,0.5)'}}>${parseFloat(deal.amount).toFixed(2)}</div>
        </div>

        {/* Status banner */}
        <div style={{borderRadius:'10px',padding:'10px 13px',background:st.bg,border:`1px solid ${st.color}30`,display:'flex',alignItems:'center',gap:'10px',boxShadow:`0 0 12px ${st.color}15`}}>
          <div style={{width:'8px',height:'8px',borderRadius:'50%',background:st.color,flexShrink:0,boxShadow:`0 0 8px ${st.color}`,animation:'pulse 2s infinite'}}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:'var(--font-d)',fontWeight:700,fontSize:'13px',color:st.color,letterSpacing:'0.04em',textShadow:`0 0 8px ${st.color}50`}}>{st.label}</div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'1px'}}>{st.desc}</div>
          </div>
          {deal.autoCompleteAt&&deal.status==='frozen'&&(
            <div style={{fontSize:'10px',color:'var(--text3)',textAlign:'right',flexShrink:0}}>
              ⏰ Авто<br/>{new Date(deal.autoCompleteAt).toLocaleDateString('ru')}
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div ref={messagesRef} className="scrollable" style={{flex:1,padding:'12px 14px',display:'flex',flexDirection:'column',gap:'8px'}}>
        {/* System message */}
        <div style={{textAlign:'center',margin:'8px 0'}}>
          <span style={{fontSize:'11px',color:'var(--text3)',background:'rgba(255,255,255,0.04)',padding:'5px 12px',borderRadius:'100px',border:'1px solid rgba(255,255,255,0.06)'}}>
            🛡 Сделка #{id.slice(-8)} · {new Date(deal.createdAt).toLocaleString('ru')}
          </span>
        </div>

        {msgs.length===0&&(
          <div style={{textAlign:'center',padding:'30px 20px',color:'var(--text3)',fontSize:'13px'}}>
            <div style={{fontSize:'32px',marginBottom:'10px'}}>💬</div>
            <div style={{fontFamily:'var(--font-d)',letterSpacing:'0.05em',marginBottom:'4px'}}>ЧАТ ПУСТ</div>
            <div style={{fontSize:'12px'}}>Обсудите детали с {isBuyer?'продавцом':'покупателем'}</div>
          </div>
        )}

        {msgs.map((m,i)=>{
          const isMe = m.senderId===user?.id
          const isAdmin = m.text?.startsWith('[ADMIN]')
          return (
            <div key={i} style={{display:'flex',flexDirection:'column',alignItems:isAdmin?'center':isMe?'flex-end':'flex-start'}}>
              {isAdmin ? (
                <div style={{background:'rgba(255,230,0,0.1)',border:'1px solid rgba(255,230,0,0.25)',borderRadius:'10px',padding:'8px 14px',maxWidth:'90%',boxShadow:'0 0 10px rgba(255,230,0,0.1)'}}>
                  <div style={{fontSize:'9px',fontFamily:'var(--font-d)',color:'#ffe600',letterSpacing:'0.08em',marginBottom:'4px'}}>👑 АДМИНИСТРАТОР</div>
                  <div style={{fontSize:'13px',color:'#ffe600'}}>{m.text.replace('[ADMIN] ','')}</div>
                </div>
              ) : (
                <div style={{maxWidth:'78%'}}>
                  {!isMe&&<div style={{fontSize:'10px',color:'var(--text3)',marginBottom:'3px',paddingLeft:'4px',fontFamily:'var(--font-d)',letterSpacing:'0.04em'}}>
                    {other?.username||other?.firstName||'?'}
                  </div>}
                  <div style={{
                    padding:'10px 13px',borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px',
                    background:isMe?'linear-gradient(135deg,rgba(255,102,0,0.25),rgba(255,68,0,0.15))':'rgba(25,25,25,0.9)',
                    border:`1px solid ${isMe?'rgba(255,102,0,0.3)':'rgba(255,255,255,0.06)'}`,
                    boxShadow:isMe?'0 0 12px rgba(255,102,0,0.12)':'none',
                    fontSize:'14px',color:'var(--text)',lineHeight:'1.45',wordBreak:'break-word'
                  }}>{m.text}</div>
                  <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'3px',textAlign:isMe?'right':'left',paddingLeft:isMe?0:'4px',paddingRight:isMe?'4px':0}}>
                    {new Date(m.ts).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Delivery data — shown after completion */}
        {deal.status==='completed'&&deal.product?.deliveryData&&(
          <div style={{borderRadius:'12px',padding:'14px',background:'rgba(0,255,136,0.08)',border:'1px solid rgba(0,255,136,0.2)',boxShadow:'0 0 15px rgba(0,255,136,0.08)',marginTop:'8px'}}>
            <div style={{fontSize:'11px',fontWeight:700,color:'#00ff88',fontFamily:'var(--font-d)',letterSpacing:'0.08em',marginBottom:'8px'}}>🔓 ДАННЫЕ ТОВАРА</div>
            <pre style={{fontSize:'13px',color:'var(--text)',whiteSpace:'pre-wrap',wordBreak:'break-all',fontFamily:'monospace'}}>{deal.product.deliveryData}</pre>
          </div>
        )}
      </div>

      {/* Action buttons — only for frozen deals */}
      {deal.status==='frozen'&&(
        <div style={{padding:'10px 14px',background:'rgba(8,8,8,0.97)',borderTop:'1px solid rgba(255,255,255,0.04)',flexShrink:0}}>
          {isBuyer&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'10px'}}>
              <button className="btn btn-success" onClick={()=>setConfirm(true)} disabled={working}
                style={{fontFamily:'var(--font-d)',letterSpacing:'0.05em',fontSize:'13px'}}>
                ✅ ПОЛУЧИЛ
              </button>
              <button className="btn btn-danger" onClick={doDispute} disabled={working}
                style={{fontFamily:'var(--font-d)',letterSpacing:'0.05em',fontSize:'13px'}}>
                ⚠ СПОР
              </button>
            </div>
          )}
          {!isBuyer&&(
            <div style={{padding:'10px',background:'rgba(0,212,255,0.06)',borderRadius:'10px',border:'1px solid rgba(0,212,255,0.15)',marginBottom:'10px',fontSize:'12px',color:'#00d4ff',textAlign:'center',fontFamily:'var(--font-d)',letterSpacing:'0.04em'}}>
              ⏳ ОЖИДАНИЕ ПОДТВЕРЖДЕНИЯ ПОКУПАТЕЛЯ
            </div>
          )}
        </div>
      )}

      {/* Chat input */}
      {['frozen','disputed'].includes(deal.status)&&(
        <div style={{padding:'10px 14px 10px',background:'rgba(8,8,8,0.97)',borderTop:'1px solid rgba(255,255,255,0.04)',flexShrink:0,paddingBottom:'calc(10px + env(safe-area-inset-bottom,0px))'}}>
          <div style={{display:'flex',gap:'8px',alignItems:'flex-end'}}>
            <textarea
              className="input"
              rows={1}
              value={msg}
              onChange={e=>setMsg(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()} }}
              placeholder="Написать сообщение..."
              style={{flex:1,resize:'none',maxHeight:'90px',borderRadius:'12px',fontSize:'14px',lineHeight:'1.4',borderColor:'rgba(255,102,0,0.2)'}}
            />
            <button
              onClick={sendMsg} disabled={!msg.trim()||sending}
              style={{width:'42px',height:'42px',borderRadius:'12px',flexShrink:0,
                background:'linear-gradient(135deg,#ff6600,#ff4400)',
                border:'1px solid rgba(255,102,0,0.5)',cursor:'pointer',
                fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:'0 0 15px rgba(255,102,0,0.4)',
                opacity:!msg.trim()||sending?0.4:1,
                transition:'all var(--ease)'}}>
              {sending?<span style={{fontSize:'12px',animation:'rotate 0.6s linear infinite'}}>⟳</span>:'➤'}
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',backdropFilter:'blur(12px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'rgba(10,10,10,0.98)',border:'1px solid rgba(0,255,136,0.25)',borderRadius:'20px',padding:'24px 20px',width:'100%',maxWidth:'360px',boxShadow:'0 0 40px rgba(0,255,136,0.1)',animation:'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)'}}>
            <div style={{textAlign:'center',marginBottom:'18px'}}>
              <div style={{fontSize:'48px',marginBottom:'12px',animation:'float 2s ease-in-out infinite'}}>✅</div>
              <div style={{fontFamily:'var(--font-d)',fontSize:'20px',fontWeight:700,letterSpacing:'0.05em',color:'#00ff88',textShadow:'0 0 12px rgba(0,255,136,0.5)'}}>ПОДТВЕРДИТЬ ПОЛУЧЕНИЕ?</div>
              <div style={{fontSize:'13px',color:'var(--text3)',marginTop:'8px',lineHeight:'1.5'}}>Деньги будут переведены продавцу.<br/>Это действие нельзя отменить.</div>
            </div>
            <div style={{background:'rgba(0,255,136,0.06)',border:'1px solid rgba(0,255,136,0.15)',borderRadius:'10px',padding:'12px',marginBottom:'18px',textAlign:'center'}}>
              <div style={{fontFamily:'var(--font-d)',fontSize:'22px',fontWeight:700,color:'#00ff88',textShadow:'0 0 10px rgba(0,255,136,0.5)'}}>
                ${parseFloat(deal.sellerAmount||0).toFixed(2)}
              </div>
              <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'2px',letterSpacing:'0.05em',fontFamily:'var(--font-d)'}}>ПОЛУЧИТ ПРОДАВЕЦ</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <button className="btn btn-ghost" onClick={()=>setConfirm(false)} style={{fontFamily:'var(--font-d)'}}>ОТМЕНА</button>
              <button className="btn btn-success" onClick={doConfirm} disabled={working} style={{fontFamily:'var(--font-d)',letterSpacing:'0.05em'}}>
                {working?'⏳...':'✅ ПОДТВЕРДИТЬ'}
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
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:'16px'}}>
      <div style={{width:'40px',height:'40px',borderRadius:'50%',border:'3px solid rgba(255,255,255,0.05)',borderTop:'3px solid #ff6600',animation:'rotate 0.8s linear infinite',boxShadow:'0 0 15px rgba(255,102,0,0.3)'}}/>
      <div style={{color:'var(--text3)',fontSize:'13px',fontFamily:'var(--font-d)',letterSpacing:'0.08em'}}>ЗАГРУЗКА СДЕЛКИ...</div>
    </div>
  )
}
