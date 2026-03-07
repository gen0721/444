import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../store'
import GameLogo, { detectGame } from '../components/GameLogo'
import toast from 'react-hot-toast'

const CATS = [
  {id:'games',label:'ИГРЫ',icon:'🎮',subs:['Аккаунты','Валюта','Предметы','Буст','Услуги']},
  {id:'software',label:'ПРОГРАММЫ',icon:'💻',subs:['Подписки','Лицензии','Ключи']},
  {id:'social',label:'СОЦСЕТИ',icon:'📱',subs:['Instagram','TikTok','YouTube','Telegram']},
  {id:'education',label:'ОБУЧЕНИЕ',icon:'📚',subs:['Курсы','Материалы','Консультации']},
  {id:'services',label:'УСЛУГИ',icon:'⚡',subs:['Дизайн','Разработка','Маркетинг','SEO']},
  {id:'finance',label:'ФИНАНСЫ',icon:'💰',subs:['Аккаунты','Инструменты']},
  {id:'other',label:'ДРУГОЕ',icon:'📦',subs:['Разное']},
]

export default function CreateProductPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title:'',description:'',price:'',category:'',subcategory:'',game:'',server:'',deliveryData:'',images:[],tags:[] })
  const [tagInput, setTagInput] = useState('')
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const selCat = CATS.find(c=>c.id===form.category)
  const gameInfo = detectGame(form.title, form.game, form.category)

  const addTag = () => {
    if (tagInput.trim()&&form.tags.length<8) { set('tags',[...form.tags,tagInput.trim().toLowerCase()]); setTagInput('') }
  }

  const submit = async () => {
    if (!form.title||!form.description||!form.price||!form.category) return toast.error('Заполните все поля')
    if (parseFloat(form.price)<0.5) return toast.error('Мин. цена $0.50')
    setSaving(true)
    try {
      const { data } = await api.post('/products', form)
      toast.success('🎉 Товар опубликован!')
      navigate(`/product/${data.id}`)
    } catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
    setSaving(false)
  }

  const STEPS = ['КАТЕГОРИЯ','ОПИСАНИЕ','ДЕТАЛИ','ПУБЛИКАЦИЯ']

  return (
    <div style={{minHeight:'100%'}}>
      {/* Header */}
      <div style={{padding:'12px 14px 0',background:'rgba(8,8,8,0.95)',borderBottom:'1px solid rgba(255,102,0,0.15)',position:'sticky',top:0,zIndex:10,backdropFilter:'blur(20px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
          <button onClick={()=>step>1?setStep(s=>s-1):navigate(-1)} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',width:'34px',height:'34px',cursor:'pointer',color:'var(--text)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>←</button>
          <div>
            <div style={{fontFamily:'var(--font-d)',fontSize:'17px',fontWeight:700,letterSpacing:'0.05em',color:'var(--accent)',textShadow:'0 0 8px rgba(255,102,0,0.4)'}}>ПРОДАТЬ ТОВАР</div>
            <div style={{fontSize:'11px',color:'var(--text3)',fontFamily:'var(--font-d)',letterSpacing:'0.05em'}}>ШАГ {step} / {STEPS.length}: {STEPS[step-1]}</div>
          </div>
          {/* Live preview logo */}
          {(form.title||form.category) && <div style={{marginLeft:'auto'}}><GameLogo title={form.title} game={form.game} category={form.category} size={38}/></div>}
        </div>
        {/* Progress bar */}
        <div style={{display:'flex',gap:'4px',paddingBottom:'12px'}}>
          {STEPS.map((_,i)=>(
            <div key={i} style={{flex:1,height:'3px',borderRadius:'2px',
              background:i<step?'var(--accent)':'rgba(255,255,255,0.08)',
              boxShadow:i<step?'0 0 6px rgba(255,102,0,0.5)':'none',
              transition:'all 0.4s ease'}}/>
          ))}
        </div>
      </div>

      <div style={{padding:'18px 14px'}}>

        {/* STEP 1 */}
        {step===1&&(
          <div className="anim-in">
            <div style={{marginBottom:'18px'}}>
              <h2 style={{fontFamily:'var(--font-d)',fontSize:'22px',fontWeight:700,color:'var(--text)',letterSpacing:'0.03em',marginBottom:'6px'}}>ВЫБЕРИТЕ КАТЕГОРИЮ</h2>
              <p style={{fontSize:'13px',color:'var(--text3)'}}>Категория помогает покупателям найти ваш товар</p>
            </div>
            <div style={{display:'grid',gap:'8px'}}>
              {CATS.map(cat=>(
                <div key={cat.id} onClick={()=>{set('category',cat.id);set('subcategory','')}} style={{
                  padding:'14px 16px',borderRadius:'12px',cursor:'pointer',
                  background:form.category===cat.id?'rgba(255,102,0,0.1)':'rgba(14,14,14,0.9)',
                  border:`1px solid ${form.category===cat.id?'rgba(255,102,0,0.5)':'rgba(255,255,255,0.06)'}`,
                  display:'flex',alignItems:'center',gap:'14px',
                  boxShadow:form.category===cat.id?'0 0 15px rgba(255,102,0,0.15)':'none',
                  transition:'all var(--ease)'
                }}>
                  <span style={{fontSize:'26px'}}>{cat.icon}</span>
                  <span style={{fontFamily:'var(--font-d)',fontWeight:700,fontSize:'16px',letterSpacing:'0.03em',
                    color:form.category===cat.id?'#ff8833':'var(--text)',
                    textShadow:form.category===cat.id?'0 0 8px rgba(255,102,0,0.4)':'none'}}>{cat.label}</span>
                  {form.category===cat.id&&<span style={{marginLeft:'auto',color:'#ff8833',fontSize:'18px',textShadow:'0 0 8px rgba(255,102,0,0.5)'}}>✓</span>}
                </div>
              ))}
            </div>
            {form.category&&selCat?.subs&&(
              <div style={{marginTop:'16px',animation:'fadeIn 0.3s ease'}}>
                <div style={{fontSize:'11px',fontWeight:700,color:'rgba(255,102,0,0.6)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'10px',fontFamily:'var(--font-d)'}}>ПОДКАТЕГОРИЯ</div>
                <div style={{display:'flex',gap:'7px',flexWrap:'wrap'}}>
                  {selCat.subs.map(sub=>(
                    <button key={sub} onClick={()=>set('subcategory',sub)} style={{
                      padding:'7px 14px',borderRadius:'100px',fontSize:'13px',
                      background:form.subcategory===sub?'rgba(255,102,0,0.15)':'rgba(255,255,255,0.03)',
                      border:`1px solid ${form.subcategory===sub?'rgba(255,102,0,0.4)':'rgba(255,255,255,0.07)'}`,
                      color:form.subcategory===sub?'#ff8833':'var(--text2)',
                      fontWeight:form.subcategory===sub?700:400,cursor:'pointer',
                      boxShadow:form.subcategory===sub?'0 0 8px rgba(255,102,0,0.2)':'none',
                      transition:'all var(--ease)'
                    }}>{sub}</button>
                  ))}
                </div>
              </div>
            )}
            <button className="btn btn-primary btn-full btn-lg" style={{marginTop:'22px',fontFamily:'var(--font-d)',letterSpacing:'0.08em'}}
              onClick={()=>form.category&&setStep(2)} disabled={!form.category}>
              ДАЛЕЕ →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step===2&&(
          <div className="anim-in">
            <h2 style={{fontFamily:'var(--font-d)',fontSize:'22px',fontWeight:700,marginBottom:'6px',letterSpacing:'0.03em'}}>ОПИСАНИЕ ТОВАРА</h2>
            <p style={{fontSize:'13px',color:'var(--text3)',marginBottom:'18px'}}>Подробное описание = больше покупателей</p>

            <div style={{marginBottom:'14px'}}>
              <label style={lbl}>НАЗВАНИЕ *</label>
              <input className="input" placeholder="Например: Аккаунт Fortnite 50+ скинов" value={form.title} onChange={e=>set('title',e.target.value)} maxLength={100}/>
              <div style={{fontSize:'11px',color:'var(--text3)',textAlign:'right',marginTop:'3px'}}>{form.title.length}/100</div>
            </div>

            <div style={{marginBottom:'14px'}}>
              <label style={lbl}>ОПИСАНИЕ *</label>
              <textarea className="input" rows={5} placeholder="Подробно опишите товар..." value={form.description} onChange={e=>set('description',e.target.value)} maxLength={2000}/>
              <div style={{fontSize:'11px',color:'var(--text3)',textAlign:'right',marginTop:'3px'}}>{form.description.length}/2000</div>
            </div>

            <div style={{marginBottom:'14px'}}>
              <label style={lbl}>ЦЕНА (USD) *</label>
              <div style={{position:'relative'}}>
                <input className="input" type="number" placeholder="0.00" value={form.price} onChange={e=>set('price',e.target.value)} style={{paddingLeft:'36px'}} min="0.5" step="0.01"/>
                <span style={{position:'absolute',left:'13px',top:'50%',transform:'translateY(-50%)',color:'var(--text3)',fontSize:'16px'}}>$</span>
              </div>
              {form.price&&parseFloat(form.price)>0&&(
                <div style={{fontSize:'12px',color:'var(--text3)',marginTop:'7px',padding:'8px 12px',background:'rgba(0,255,136,0.06)',borderRadius:'8px',border:'1px solid rgba(0,255,136,0.12)'}}>
                  💰 Вы получите: <strong style={{color:'#00ff88',textShadow:'0 0 6px rgba(0,255,136,0.4)'}}>${(parseFloat(form.price)*0.95).toFixed(2)}</strong>
                  <span style={{color:'var(--text3)'}}> (после комиссии 5%)</span>
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-full btn-lg" style={{fontFamily:'var(--font-d)',letterSpacing:'0.08em'}}
              onClick={()=>form.title&&form.description&&form.price&&setStep(3)}
              disabled={!form.title||!form.description||!form.price}>ДАЛЕЕ →</button>
          </div>
        )}

        {/* STEP 3 */}
        {step===3&&(
          <div className="anim-in">
            <h2 style={{fontFamily:'var(--font-d)',fontSize:'22px',fontWeight:700,marginBottom:'6px',letterSpacing:'0.03em'}}>ДЕТАЛИ И ДОСТАВКА</h2>
            <p style={{fontSize:'13px',color:'var(--text3)',marginBottom:'18px'}}>Укажите дополнительные данные</p>

            {form.category==='games'&&(
              <>
                <div style={{marginBottom:'12px'}}>
                  <label style={lbl}>ИГРА</label>
                  <input className="input" placeholder="Fortnite, CS2, Dota 2..." value={form.game} onChange={e=>set('game',e.target.value)}/>
                  {form.game&&(
                    <div style={{marginTop:'7px',display:'flex',alignItems:'center',gap:'8px'}}>
                      <GameLogo title={form.title} game={form.game} category={form.category} size={32}/>
                      <span style={{fontSize:'12px',color:detectGame(form.title,form.game).color,fontFamily:'var(--font-d)',fontWeight:700}}>{detectGame(form.title,form.game).label||form.game} ОПРЕДЕЛЕНО ✓</span>
                    </div>
                  )}
                </div>
                <div style={{marginBottom:'12px'}}>
                  <label style={lbl}>СЕРВЕР / РЕГИОН</label>
                  <input className="input" placeholder="EU, NA, RU..." value={form.server} onChange={e=>set('server',e.target.value)}/>
                </div>
              </>
            )}

            <div style={{marginBottom:'12px'}}>
              <label style={lbl}>ДАННЫЕ ДЛЯ ПОКУПАТЕЛЯ *</label>
              <div style={{background:'rgba(255,230,0,0.06)',border:'1px solid rgba(255,230,0,0.2)',borderRadius:'9px',padding:'9px 12px',marginBottom:'8px',fontSize:'12px',color:'#ffe600',fontFamily:'var(--font-d)',letterSpacing:'0.03em'}}>
                🔒 ПОКАЗЫВАЕТСЯ ТОЛЬКО ПОСЛЕ УСПЕШНОЙ СДЕЛКИ
              </div>
              <textarea className="input" rows={4} placeholder="Логин/пароль, ключ активации, инструкции..." value={form.deliveryData} onChange={e=>set('deliveryData',e.target.value)}/>
            </div>

            <div style={{marginBottom:'12px'}}>
              <label style={lbl}>ТЕГИ (до 8)</label>
              <div style={{display:'flex',gap:'6px',marginBottom:'8px',flexWrap:'wrap'}}>
                {form.tags.map(t=>(
                  <span key={t} style={{padding:'4px 10px',borderRadius:'100px',background:'rgba(255,102,0,0.12)',border:'1px solid rgba(255,102,0,0.25)',fontSize:'12px',color:'#ff8833',display:'flex',alignItems:'center',gap:'5px'}}>
                    #{t}<span onClick={()=>set('tags',form.tags.filter(x=>x!==t))} style={{cursor:'pointer',opacity:0.7,fontSize:'16px',lineHeight:1}}>×</span>
                  </span>
                ))}
              </div>
              {form.tags.length<8&&(
                <div style={{display:'flex',gap:'8px'}}>
                  <input className="input" placeholder="Добавить тег..." value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTag()} style={{flex:1}}/>
                  <button className="btn btn-secondary" onClick={addTag} style={{fontFamily:'var(--font-d)',fontWeight:700}}>+</button>
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-full btn-lg" style={{fontFamily:'var(--font-d)',letterSpacing:'0.08em'}} onClick={()=>setStep(4)}>ДАЛЕЕ →</button>
          </div>
        )}

        {/* STEP 4 */}
        {step===4&&(
          <div className="anim-in">
            <h2 style={{fontFamily:'var(--font-d)',fontSize:'22px',fontWeight:700,marginBottom:'18px',letterSpacing:'0.03em'}}>ПРЕДПРОСМОТР</h2>

            {/* Preview card */}
            <div style={{background:'rgba(14,14,14,0.9)',border:'1px solid rgba(255,102,0,0.2)',borderRadius:'16px',overflow:'hidden',marginBottom:'18px',boxShadow:'0 0 20px rgba(255,102,0,0.08)'}}>
              <div style={{height:'110px',background:'linear-gradient(135deg,#0a0808,#080a14)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                <GameLogo title={form.title} game={form.game} category={form.category} size={70}/>
                <div style={{position:'absolute',top:'10px',right:'10px',background:'linear-gradient(135deg,#ff6600,#ff4400)',color:'white',padding:'6px 14px',borderRadius:'8px',fontFamily:'var(--font-d)',fontWeight:800,fontSize:'18px',boxShadow:'0 0 12px rgba(255,102,0,0.5)'}}>
                  ${parseFloat(form.price||0).toFixed(2)}
                </div>
              </div>
              <div style={{padding:'14px'}}>
                <div style={{fontFamily:'var(--font-d)',fontWeight:700,fontSize:'17px',marginBottom:'8px',letterSpacing:'0.02em'}}>{form.title}</div>
                <p style={{fontSize:'13px',color:'var(--text2)',lineHeight:'1.5',marginBottom:'10px'}}>{form.description.slice(0,120)}{form.description.length>120?'...':''}</p>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  <span className="badge badge-orange">{CATS.find(c=>c.id===form.category)?.label}</span>
                  {form.subcategory&&<span className="badge badge-cyan">{form.subcategory}</span>}
                  {form.game&&<span className="badge badge-yellow">🎮 {form.game}</span>}
                </div>
              </div>
            </div>

            {/* Fee summary */}
            <div style={{background:'rgba(14,14,14,0.9)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'12px',padding:'14px',marginBottom:'18px'}}>
              {[
                ['ЦЕНА',`$${parseFloat(form.price||0).toFixed(2)}`,'var(--text)'],
                ['КОМИССИЯ (5%)',`-$${(parseFloat(form.price||0)*0.05).toFixed(2)}`,'#ff3355'],
                ['ВЫ ПОЛУЧИТЕ',`$${(parseFloat(form.price||0)*0.95).toFixed(2)}`,'#00ff88'],
              ].map(([l,v,c],i)=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<2?'1px solid rgba(255,255,255,0.04)':'none'}}>
                  <span style={{fontSize:'12px',color:'var(--text3)',fontFamily:'var(--font-d)',letterSpacing:'0.05em'}}>{l}</span>
                  <span style={{fontSize:'14px',fontWeight:700,fontFamily:'var(--font-d)',color:c,textShadow:i===2?'0 0 8px rgba(0,255,136,0.4)':'none'}}>{v}</span>
                </div>
              ))}
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={saving}
              style={{fontFamily:'var(--font-d)',fontSize:'17px',letterSpacing:'0.08em'}}>
              {saving?'⏳ ПУБЛИКАЦИЯ...':'🚀 ОПУБЛИКОВАТЬ'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
const lbl = { display:'block', fontSize:'11px', fontWeight:700, color:'rgba(255,102,0,0.6)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'7px', fontFamily:'var(--font-d)' }
