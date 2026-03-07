import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, api } from '../store'
import { IC, GameLogo } from '../components/Icons'
import toast from 'react-hot-toast'

const STEPS = ['Основное','Детали','Медиа','Публикация']

export default function CreateProductPage() {
  const navigate = useNavigate()
  const { user } = useStore()
  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [form,    setForm]    = useState({
    title:'', description:'', price:'', category:'games', game:'',
    platform:'', region:'', deliveryType:'digital', stock:1, images:[],
  })

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.title || !form.price) return toast.error('Заполните обязательные поля')
    setLoading(true)
    try {
      const { data } = await api.post('/products', form)
      toast.success('Товар опубликован!')
      navigate(`/product/${data.id}`)
    } catch (e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setLoading(false)
  }

  const CATS = ['games','software','social','education','services','finance','other']

  return (
    <div style={{ minHeight:'100%' }}>
      {/* Header */}
      <div style={{ padding:'12px 14px', background:'rgba(6,8,17,0.96)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
          <button onClick={() => navigate(-1)} className="btn-icon"><IC.Back s={18}/></button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700, letterSpacing:'0.04em' }}>Новый товар</span>
        </div>
        {/* Step bar */}
        <div style={{ display:'flex', gap:'4px' }}>
          {STEPS.map((s, i) => (
            <div key={i} onClick={() => i < step && setStep(i)} style={{
              flex:1, height:'3px', borderRadius:'2px', cursor: i < step ? 'pointer' : 'default',
              background: i <= step ? 'linear-gradient(90deg,#7c6aff,#a78bfa)' : 'rgba(255,255,255,0.1)',
              boxShadow: i <= step ? '0 0 8px rgba(124,106,255,0.5)' : 'none',
              transition:'all 0.3s ease',
            }}/>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:'6px' }}>
          {STEPS.map((s, i) => (
            <span key={i} style={{ fontSize:'9px', color: i === step ? '#a78bfa' : 'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.06em', transition:'color 0.2s' }}>
              {s.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding:'20px 14px' }}>
        {/* Preview card */}
        <div style={{ marginBottom:'20px', padding:'16px', borderRadius:'18px', background:'rgba(124,106,255,0.06)', border:'1px solid rgba(124,106,255,0.2)', display:'flex', alignItems:'center', gap:'14px' }}>
          <GameLogo title={form.title} game={form.game} category={form.category} size={56}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'16px', fontWeight:700, color: form.title ? 'var(--t1)' : 'var(--t3)', marginBottom:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {form.title || 'Название товара'}
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'20px', color:'#a78bfa', textShadow:'0 0 8px rgba(167,139,250,0.5)' }}>
              {form.price ? `$${parseFloat(form.price).toFixed(2)}` : '$0.00'}
            </div>
          </div>
        </div>

        {/* Step 0: Main */}
        {step === 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'14px', animation:'fadeUp 0.4s ease' }}>
            <Field label="НАЗВАНИЕ *">
              <input className="inp" placeholder="Например: CS2 Premier Account..." value={form.title} onChange={e => upd('title', e.target.value)}/>
            </Field>
            <Field label="ОПИСАНИЕ">
              <textarea className="inp" rows={4} placeholder="Подробное описание товара..." value={form.description} onChange={e => upd('description', e.target.value)} style={{ resize:'none' }}/>
            </Field>
            <Field label="ЦЕНА (USD) *">
              <input className="inp" type="number" placeholder="0.00" value={form.price} onChange={e => upd('price', e.target.value)}
                style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'18px' }}/>
            </Field>
          </div>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'14px', animation:'fadeUp 0.4s ease' }}>
            <Field label="КАТЕГОРИЯ">
              <div style={{ display:'flex', flexWrap:'wrap', gap:'7px' }}>
                {CATS.map(c => (
                  <button key={c} onClick={() => upd('category', c)} style={{
                    padding:'7px 14px', borderRadius:'100px', cursor:'pointer',
                    background: form.category === c ? 'rgba(124,106,255,0.18)' : 'rgba(255,255,255,0.04)',
                    border:`1px solid ${form.category === c ? 'rgba(124,106,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: form.category === c ? '#a78bfa' : 'var(--t2)',
                    fontSize:'12px', fontWeight:600, transition:'all 0.15s',
                  }}>{c}</button>
                ))}
              </div>
            </Field>
            <Field label="ИГРА / ПЛАТФОРМА">
              <input className="inp" placeholder="Dota 2, CS2, Steam..." value={form.game} onChange={e => upd('game', e.target.value)}/>
            </Field>
            <Field label="СПОСОБ ДОСТАВКИ">
              <div style={{ display:'flex', gap:'8px' }}>
                {['digital','account','key'].map(t => (
                  <button key={t} onClick={() => upd('deliveryType', t)} style={{
                    flex:1, padding:'9px', borderRadius:'10px', cursor:'pointer',
                    background: form.deliveryType === t ? 'rgba(124,106,255,0.15)' : 'rgba(255,255,255,0.03)',
                    border:`1px solid ${form.deliveryType === t ? 'rgba(124,106,255,0.45)' : 'rgba(255,255,255,0.07)'}`,
                    color: form.deliveryType === t ? '#a78bfa' : 'var(--t2)',
                    fontSize:'11px', fontWeight:700, fontFamily:'var(--font-display)',
                    transition:'all 0.15s',
                  }}>{t}</button>
                ))}
              </div>
            </Field>
            <Field label="КОЛИЧЕСТВО">
              <input className="inp" type="number" value={form.stock} onChange={e => upd('stock', parseInt(e.target.value))}/>
            </Field>
          </div>
        )}

        {/* Step 2: Media */}
        {step === 2 && (
          <div style={{ animation:'fadeUp 0.4s ease' }}>
            <Field label="ССЫЛКА НА ИЗОБРАЖЕНИЕ">
              <input className="inp" placeholder="https://..." onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value) {
                  upd('images', [...form.images, e.target.value]); e.target.value = ''
                }
              }}/>
            </Field>
            <div style={{ fontSize:'11px', color:'var(--t3)', marginTop:'6px', marginBottom:'14px' }}>Нажмите Enter чтобы добавить</div>
            {form.images.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {form.images.map((url, i) => (
                  <div key={i} style={{ padding:'8px 12px', borderRadius:'10px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:'8px' }}>
                    <img src={url} alt="" style={{ width:'36px', height:'36px', borderRadius:'8px', objectFit:'cover', flexShrink:0 }} onError={e => { e.target.style.display='none' }}/>
                    <div style={{ flex:1, fontSize:'12px', color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url}</div>
                    <button onClick={() => upd('images', form.images.filter((_, j) => j !== i))} style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', padding:'2px' }}>
                      <IC.X s={14}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Publish */}
        {step === 3 && (
          <div style={{ animation:'fadeUp 0.4s ease' }}>
            <div style={{ padding:'20px', borderRadius:'18px', background:'rgba(124,106,255,0.06)', border:'1px solid rgba(124,106,255,0.18)', marginBottom:'20px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'14px', fontWeight:700, color:'#a78bfa', letterSpacing:'0.06em', marginBottom:'14px' }}>ПРЕДПРОСМОТР</div>
              {[
                ['Название',    form.title || '—'],
                ['Цена',        form.price ? `$${parseFloat(form.price).toFixed(2)}` : '—'],
                ['Категория',   form.category],
                ['Доставка',    form.deliveryType],
                ['Количество',  form.stock],
              ].map(([l, v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize:'13px', color:'var(--t3)' }}>{l}</span>
                  <span style={{ fontSize:'13px', fontWeight:600, color:'var(--t1)' }}>{v}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-violet btn-full btn-lg" onClick={submit} disabled={loading}
              style={{ fontFamily:'var(--font-display)', fontSize:'15px', letterSpacing:'0.06em', gap:'9px' }}>
              {loading
                ? <div style={{ width:'18px', height:'18px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)', borderTop:'2px solid white', animation:'rotateSpin 0.7s linear infinite' }}/>
                : <IC.Check s={18} c="white"/>
              }
              {loading ? 'ПУБЛИКАЦИЯ...' : 'ОПУБЛИКОВАТЬ'}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display:'grid', gridTemplateColumns: step > 0 ? '1fr 2fr' : '1fr', gap:'10px', marginTop:'24px' }}>
          {step > 0 && (
            <button className="btn btn-ghost btn-full" onClick={() => setStep(s => s - 1)}
              style={{ fontFamily:'var(--font-display)', fontSize:'13px', gap:'6px' }}>
              <IC.Back s={15}/> Назад
            </button>
          )}
          {step < 3 && (
            <button className="btn btn-violet btn-full" onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && (!form.title || !form.price)}
              style={{ fontFamily:'var(--font-display)', fontSize:'13px', gap:'6px' }}>
              Далее <IC.Send s={14} c="white"/>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:'10px', fontWeight:700, color:'rgba(167,139,250,0.4)', letterSpacing:'0.14em', fontFamily:'var(--font-display)', marginBottom:'8px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
