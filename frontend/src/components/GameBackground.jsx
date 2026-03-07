import React, { useEffect, useRef, useState } from 'react'

const SCENES = [
  { name:'DOTA 2',    color:'#c8371a',
    draw(ctx,t,W,H){
      const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#020008'); g.addColorStop(0.5,'#0d0320'); g.addColorStop(1,'#050004'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
      for(let i=0;i<100;i++){const x=(Math.sin(i*2.3)*0.5+0.5)*W,y=(Math.sin(i*1.7)*0.5+0.5)*H*0.65,a=0.15+0.6*Math.abs(Math.sin(t*0.4+i)); ctx.fillStyle=`rgba(255,210,160,${a*0.7})`; ctx.beginPath(); ctx.arc(x,y,0.7+0.5*Math.sin(t+i),0,Math.PI*2); ctx.fill()}
      const hx=38,hw=hx*Math.sqrt(3),hh=hx*1.5; ctx.lineWidth=1
      for(let row=-1;row<H/hh+2;row++) for(let col=-1;col<W/hw+2;col++){const cx=col*hw+(row%2)*hw/2,cy=row*hh,d=Math.hypot(cx-W*.5,cy-H*.65)/280,a=(0.07+0.03*Math.sin(t+d*3))*Math.max(0,1-d*.5); ctx.strokeStyle=`rgba(200,55,26,${a})`; ctx.beginPath(); for(let k=0;k<6;k++){const a2=k*Math.PI/3-Math.PI/6; k===0?ctx.moveTo(cx+hx*Math.cos(a2),cy+hx*Math.sin(a2)):ctx.lineTo(cx+hx*Math.cos(a2),cy+hx*Math.sin(a2))} ctx.closePath(); ctx.stroke()}
      const tx=W*.5,ty=H*.42; ctx.fillStyle='rgba(3,0,8,.96)'; ctx.beginPath(); ctx.moveTo(tx-40,H); ctx.lineTo(tx-40,ty+30); ctx.lineTo(tx-28,ty+10); ctx.lineTo(tx-8,ty-18); ctx.lineTo(tx,ty-30); ctx.lineTo(tx+8,ty-18); ctx.lineTo(tx+28,ty+10); ctx.lineTo(tx+40,ty+30); ctx.lineTo(tx+40,H); ctx.fill()
      const cr=28+12*Math.sin(t*1.8),cg=ctx.createRadialGradient(tx,ty-30,0,tx,ty-30,cr); cg.addColorStop(0,`rgba(220,80,30,${.5+.3*Math.sin(t*1.8)})`); cg.addColorStop(1,'transparent'); ctx.fillStyle=cg; ctx.fillRect(0,0,W,H)
      const hor=ctx.createLinearGradient(0,H*.5,0,H*.75); hor.addColorStop(0,'rgba(200,55,26,.18)'); hor.addColorStop(1,'transparent'); ctx.fillStyle=hor; ctx.fillRect(0,H*.5,W,H*.25)
    }
  },
  { name:'GTA V',     color:'#fcaf17',
    draw(ctx,t,W,H){
      const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#010307'); g.addColorStop(.5,'#060d18'); g.addColorStop(.7,'#090f06'); g.addColorStop(1,'#040402'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
      const mx=W*.78,my=H*.14,mg=ctx.createRadialGradient(mx,my,0,mx,my,40); mg.addColorStop(0,'rgba(255,250,220,.92)'); mg.addColorStop(.7,'rgba(240,230,180,.5)'); mg.addColorStop(1,'transparent'); ctx.fillStyle=mg; ctx.fillRect(0,0,W,H)
      const blds=[{x:.05,w:.06,h:.42},{x:.12,w:.08,h:.55},{x:.22,w:.1,h:.45},{x:.35,w:.12,h:.65},{x:.5,w:.07,h:.38},{x:.6,w:.11,h:.58},{x:.73,w:.09,h:.42},{x:.84,w:.08,h:.52},{x:.93,w:.07,h:.36}]
      blds.forEach(b=>{const bx=b.x*W,bw=b.w*W,bh=b.h*H,by=H-bh; ctx.fillStyle='#03090e'; ctx.fillRect(bx,by,bw,bh); const cols=Math.floor(bw/10),rows=Math.floor(b.h*18); for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){if(Math.sin(t*.08+b.x*10+r*3.7+c*2.3)>-.2){const wa=.35+.35*Math.sin(t*.1+r*2+c*1.7); ctx.fillStyle=`rgba(255,${210+30*Math.sin(t*.2+r+c)},80,${wa})`; ctx.fillRect(bx+c*10+2,by+r*(bh/rows)+2,7,bh/rows-4)}}})
      for(let i=0;i<5;i++){const dir=i%2?-1:1,cx=((t*55*dir+i*W/4+W)%(W+120))-60,cy=H*(.87+i*.022); [0,14].forEach(off=>{ctx.fillStyle=dir>0?'rgba(255,245,180,.92)':'rgba(255,40,40,.88)'; ctx.beginPath(); ctx.arc(cx+off,cy,2.5,0,Math.PI*2); ctx.fill()})}
    }
  },
  { name:'VALORANT',  color:'#ff4655',
    draw(ctx,t,W,H){
      const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#020104'); g.addColorStop(.5,'#0e0208'); g.addColorStop(1,'#040103'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
      for(let i=0;i<7;i++){const px=(t*25+i*(W/5.5))%(W+180)-90,a=.035+.015*Math.sin(t*.8+i); ctx.fillStyle=`rgba(255,70,85,${a})`; ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px+90,H); ctx.lineTo(px+100,H); ctx.lineTo(px+10,0); ctx.fill()}
      const ax=W*.38,ay=H*.48; ctx.fillStyle='rgba(4,1,6,.97)'; ctx.beginPath(); ctx.ellipse(ax,ay+32,14,28,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(ax,ay-8,15,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.moveTo(ax-12,ay+10); ctx.quadraticCurveTo(ax-35,ay+30+10*Math.sin(t),ax-28,ay+65); ctx.lineTo(ax+5,ay+55); ctx.quadraticCurveTo(ax-5,ay+25,ax+2,ay+10); ctx.fill()
      ctx.strokeStyle=`rgba(255,70,85,${.6+.3*Math.sin(t*3)})`; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(ax+18,ay-2); ctx.lineTo(ax+40+8*Math.cos(t*2.5),ay+12+10*Math.sin(t*2)); ctx.stroke()
      const spx=W*.68+8*Math.sin(t),spy=H*.7,sp=(Math.sin(t*4)+1)/2; ctx.fillStyle=`rgba(255,70,85,${.5+.4*sp})`; ctx.beginPath(); ctx.arc(spx,spy,8,0,Math.PI*2); ctx.fill()
      for(let r=0;r<3;r++){const rp=(t*1.8+r*.4)%1; ctx.strokeStyle=`rgba(255,70,85,${.6*(1-rp)})`; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(spx,spy,16+rp*45,0,Math.PI*2); ctx.stroke()}
    }
  },
  { name:'FORTNITE',  color:'#00d4ff',
    draw(ctx,t,W,H){
      const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#04020f'); g.addColorStop(.3,'#140a30'); g.addColorStop(.6,'#1a2565'); g.addColorStop(1,'#050a12'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
      const scx=W*.52+Math.sin(t*.18)*18,scy=H*.38,sr=Math.min(W,H)*(.32+.04*Math.sin(t*.25))
      const sg=ctx.createRadialGradient(scx,scy,sr*.82,scx,scy,sr); sg.addColorStop(0,'transparent'); sg.addColorStop(.88,'transparent'); sg.addColorStop(.94,'rgba(130,50,230,.14)'); sg.addColorStop(1,'rgba(100,40,210,.38)'); ctx.fillStyle=sg; ctx.fillRect(0,0,W,H)
      ctx.beginPath(); ctx.arc(scx,scy,sr,0,Math.PI*2); ctx.strokeStyle=`rgba(150,80,255,${.22+.12*Math.sin(t*1.5)})`; ctx.lineWidth=2.5; ctx.stroke()
      if(Math.sin(t*6.5)>.94){ctx.strokeStyle='rgba(210,190,255,.9)'; ctx.lineWidth=1.8; ctx.beginPath(); let lx=W*(.15+Math.random()*.7),ly=0; ctx.moveTo(lx,0); while(ly<H*.7){ly+=H*.07+Math.random()*H*.05; ctx.lineTo(lx+(Math.random()-.5)*50,ly)} ctx.stroke()}
      const bx=(t*45)%(W+220)-110; ctx.fillStyle='rgba(255,220,0,.9)'; ctx.beginPath(); ctx.roundRect(bx-22,H*.22-10,44,18,5); ctx.fill()
    }
  },
  { name:'CS2',       color:'#e4c84b',
    draw(ctx,t,W,H){
      ctx.fillStyle='#020508'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(228,200,75,.03)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=48){ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke()} for(let y=0;y<H;y+=48){ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke()}
      [[.08,.15,.22,.28,'A'],[.35,.08,.28,.18,'CAT'],[.68,.15,.24,.28,'B'],[.18,.55,.26,.25,'LONG'],[.52,.52,.22,.28,'TUNN'],[.35,.3,.14,.22,'MID']].forEach(([rx,ry,rw,rh,n])=>{const a=.06+.025*Math.sin(t*.5+rx*8); ctx.fillStyle=`rgba(228,200,75,${a})`; ctx.fillRect(rx*W,ry*H,rw*W,rh*H); ctx.strokeStyle=`rgba(228,200,75,${a*2.5})`; ctx.lineWidth=1.5; ctx.strokeRect(rx*W,ry*H,rw*W,rh*H)})
      const cx=W/2,cy=H*.5,cg=6+3*Math.sin(t*2.5),ca=`rgba(0,230,255,${.5+.25*Math.sin(t*2)})`
      ctx.strokeStyle=ca; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.moveTo(cx-cg-18,cy); ctx.lineTo(cx-cg-2,cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx+cg+2,cy); ctx.lineTo(cx+cg+18,cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx,cy-cg-18); ctx.lineTo(cx,cy-cg-2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx,cy+cg+2); ctx.lineTo(cx,cy+cg+18); ctx.stroke()
      [{x:.19,y:.29,t:1},{x:.22,y:.26,t:1},{x:.74,y:.3,t:1},{x:.73,y:.62,t:0},{x:.55,y:.65,t:0}].forEach((p,i)=>{const px=p.x*W+3*Math.sin(t*.7+i),py=p.y*H+3*Math.cos(t*.5+i); ctx.fillStyle=p.t?'rgba(100,220,100,.9)':'rgba(255,80,80,.9)'; ctx.beginPath(); ctx.arc(px,py,5.5,0,Math.PI*2); ctx.fill()})
    }
  },
  { name:'MINECRAFT', color:'#5aad3b',
    draw(ctx,t,W,H){
      const p=(Math.sin(t*.15)+1)/2,r=Math.floor(80+60*p),g=Math.floor(130+80*p),b=Math.floor(200+55*p)
      ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(0,0,W,H*.55)
      const BK=20,terrain=[3,3,4,4,3,3,2,2,3,3,4,5,5,4,3,3,4,4,3,2,2,3,4,4,5,5,4,3,3,4]
      const tw=Math.ceil(W/BK)+1
      for(let i=0;i<tw;i++){const h2=terrain[i%terrain.length],bx=i*BK; ctx.fillStyle='#5aad3b'; ctx.fillRect(bx,H-h2*BK,BK,BK); ctx.fillStyle='#7bc950'; ctx.fillRect(bx,H-h2*BK,BK,4); for(let d=1;d<h2;d++){ctx.fillStyle=d<2?'#9b6e3a':d<4?'#7a4e22':'#5a3410'; ctx.fillRect(bx,H-(h2-d)*BK,BK,BK); ctx.strokeStyle='rgba(0,0,0,.12)'; ctx.lineWidth=.5; ctx.strokeRect(bx,H-(h2-d)*BK,BK,BK)}}
      const sx=W*.25+12*Math.sin(t*1.8),sy=H-terrain[3]*BK-54,fr=Math.floor(t*4)%2
      ctx.fillStyle='#f5c292'; ctx.fillRect(sx,sy,16,16); ctx.fillStyle='#3366bb'; ctx.fillRect(sx-2,sy+16,20,20)
      ctx.fillStyle='#f5c292'; ctx.fillRect(sx-7,sy+17,7,16+fr*4); ctx.fillStyle='#3366bb'; ctx.fillRect(sx+16,sy+17,7,16-fr*4)
      ctx.fillStyle='#8b4510'; ctx.fillRect(sx,sy+36,8,14+fr*5); ctx.fillStyle='#7a3a08'; ctx.fillRect(sx+8,sy+36,8,14-fr*5)
    }
  },
]

export default function GameBackground() {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const timeRef   = useRef(0)
  const idxRef    = useRef(0)
  const [idx, setIdx]     = useState(0)
  const [alpha, setAlpha] = useState(1)

  useEffect(() => {
    const timer = setInterval(() => {
      setAlpha(0)
      setTimeout(() => { const n=(idxRef.current+1)%SCENES.length; idxRef.current=n; setIdx(n); setAlpha(1) }, 600)
    }, 11000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width=window.innerWidth; canvas.height=window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const loop = () => {
      timeRef.current += 0.016
      SCENES[idxRef.current].draw(ctx, timeRef.current, canvas.width, canvas.height)
      const v=ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*.18,canvas.width/2,canvas.height/2,canvas.width*.9)
      v.addColorStop(0,'transparent'); v.addColorStop(1,'rgba(0,0,0,.78)')
      ctx.fillStyle=v; ctx.fillRect(0,0,canvas.width,canvas.height)
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  const scene = SCENES[idx]
  return (
    <>
      <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:0, opacity:alpha*0.7, transition:'opacity 0.6s ease' }}/>
      <div style={{
        position:'fixed', bottom:'72px', right:'10px', zIndex:5,
        display:'flex', alignItems:'center', gap:'6px',
        background:'rgba(0,0,0,0.72)', backdropFilter:'blur(16px)',
        border:`1px solid ${scene.color}30`, borderRadius:'9px', padding:'4px 10px',
        boxShadow:`0 0 12px ${scene.color}18`, transition:'all 0.6s ease'
      }}>
        <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:scene.color, boxShadow:`0 0 6px ${scene.color}`, animation:'blink 1.5s ease-in-out infinite' }}/>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'9px', fontWeight:700, color:scene.color, letterSpacing:'0.12em' }}>
          {scene.name}
        </span>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:.25}50%{opacity:1}}`}</style>
    </>
  )
}
