import React, { useEffect, useRef, useState } from 'react'

const SCENES = [
  {
    name: 'DOTA 2', color: '#c8371a',
    draw(ctx, t, W, H) {
      // Deep cosmic sky
      const sky = ctx.createLinearGradient(0,0,0,H)
      sky.addColorStop(0,'#010005'); sky.addColorStop(0.45,'#100325'); sky.addColorStop(0.75,'#1a0510'); sky.addColorStop(1,'#050005')
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H)

      // Animated star field
      for(let i=0;i<120;i++){
        const sx=(Math.sin(i*2.3)*0.5+0.5)*W
        const sy=(Math.sin(i*1.7)*0.5+0.5)*H*0.6
        const sa=0.2+0.8*Math.abs(Math.sin(t*0.5+i))
        ctx.fillStyle=`rgba(255,220,180,${sa*0.7})`
        ctx.beginPath(); ctx.arc(sx,sy,0.8+0.5*Math.sin(t+i),0,Math.PI*2); ctx.fill()
      }

      // Hex grid floor
      const hex=38, hxW=hex*Math.sqrt(3), hxH=hex*1.5
      ctx.lineWidth=1
      for(let row=-1;row<H/hxH+2;row++){
        for(let col=-1;col<W/hxW+2;col++){
          const cx=col*hxW+(row%2)*hxW/2, cy=row*hxH
          const dist=Math.hypot(cx-W*0.5,cy-H*0.65)/300
          const alpha=(0.06+0.04*Math.sin(t*0.8+dist*3))*Math.max(0,1-dist*0.5)
          ctx.strokeStyle=`rgba(200,55,26,${alpha})`
          ctx.beginPath()
          for(let k=0;k<6;k++){
            const a=k*Math.PI/3-Math.PI/6
            k===0?ctx.moveTo(cx+hex*Math.cos(a),cy+hex*Math.sin(a)):ctx.lineTo(cx+hex*Math.cos(a),cy+hex*Math.sin(a))
          }
          ctx.closePath(); ctx.stroke()
        }
      }

      // Horizon ember glow
      const hor=ctx.createLinearGradient(0,H*0.52,0,H*0.78)
      hor.addColorStop(0,'rgba(200,55,26,0.22)'); hor.addColorStop(0.5,'rgba(120,20,10,0.12)'); hor.addColorStop(1,'transparent')
      ctx.fillStyle=hor; ctx.fillRect(0,H*0.52,W,H*0.26)

      // Roshan tower
      const tx=W*0.5, ty=H*0.42
      ctx.fillStyle='rgba(5,2,10,0.96)'
      ctx.beginPath()
      ctx.moveTo(tx-40,H); ctx.lineTo(tx-40,ty+30)
      ctx.lineTo(tx-28,ty+10); ctx.lineTo(tx-16,ty-5)
      ctx.lineTo(tx-8,ty-18); ctx.lineTo(tx,ty-30)
      ctx.lineTo(tx+8,ty-18); ctx.lineTo(tx+16,ty-5)
      ctx.lineTo(tx+28,ty+10); ctx.lineTo(tx+40,ty+30); ctx.lineTo(tx+40,H)
      ctx.fill()
      // Tower crown spires
      ;[[tx-22,ty],[tx,ty-30],[tx+22,ty]].forEach(([spx,spy])=>{
        ctx.fillStyle='rgba(5,2,10,0.96)'
        ctx.fillRect(spx-4,spy-20,8,22)
        ctx.beginPath(); ctx.moveTo(spx-4,spy-20); ctx.lineTo(spx,spy-32); ctx.lineTo(spx+4,spy-20); ctx.fill()
      })
      // Pulsing crown glow
      const cr=30+15*Math.sin(t*1.8)
      const cg=ctx.createRadialGradient(tx,ty-30,0,tx,ty-30,cr)
      cg.addColorStop(0,`rgba(220,80,30,${0.5+0.3*Math.sin(t*1.8)})`); cg.addColorStop(1,'transparent')
      ctx.fillStyle=cg; ctx.fillRect(0,0,W,H)

      // Ground embers
      for(let i=0;i<18;i++){
        const ex=W*(0.05+i*0.055)+Math.sin(t*0.6+i)*12
        const ey=H*(0.72+0.06*Math.sin(t*0.4+i*0.7))
        const ea=0.2+0.6*Math.sin(t*1.2+i*0.8)
        const er=1.5+1.5*Math.sin(t+i)
        ctx.fillStyle=`rgba(255,${100+80*Math.sin(t+i)},20,${ea})`
        ctx.beginPath(); ctx.arc(ex,ey,er,0,Math.PI*2); ctx.fill()
      }
    }
  },
  {
    name: 'GTA V', color: '#fcaf17',
    draw(ctx, t, W, H) {
      const sky=ctx.createLinearGradient(0,0,0,H)
      sky.addColorStop(0,'#010308'); sky.addColorStop(0.5,'#060e1a'); sky.addColorStop(0.72,'#0a1208'); sky.addColorStop(1,'#050502')
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H)

      // Moon
      const moonX=W*0.78, moonY=H*0.14
      const moonG=ctx.createRadialGradient(moonX,moonY,0,moonX,moonY,38)
      moonG.addColorStop(0,'rgba(255,250,220,0.95)'); moonG.addColorStop(0.7,'rgba(240,230,180,0.6)'); moonG.addColorStop(1,'transparent')
      ctx.fillStyle=moonG; ctx.fillRect(0,0,W,H)
      // Moon halo
      const moonH=ctx.createRadialGradient(moonX,moonY,30,moonX,moonY,80)
      moonH.addColorStop(0,'rgba(255,240,160,0.12)'); moonH.addColorStop(1,'transparent')
      ctx.fillStyle=moonH; ctx.fillRect(0,0,W,H)

      // City silhouette - layered buildings
      const blds=[
        {x:0,w:55,h:0.42,floors:8},{x:50,w:40,h:0.55,floors:11},{x:88,w:70,h:0.46,floors:9},
        {x:155,w:50,h:0.62,floors:14},{x:200,w:35,h:0.38,floors:7},{x:232,w:90,h:0.58,floors:12},
        {x:318,w:45,h:0.44,floors:9},{x:360,w:65,h:0.66,floors:15},{x:422,w:40,h:0.42,floors:8},
        {x:460,w:80,h:0.52,floors:11},{x:536,w:50,h:0.48,floors:10},{x:582,w:35,h:0.6,floors:13},
        {x:614,w:60,h:0.38,floors:7},{x:671,w:45,h:0.55,floors:12},
      ]
      const scaleX=W/720
      blds.forEach(b=>{
        const bx=b.x*scaleX, bw=b.w*scaleX, bh=b.h*H, by=H-bh
        ctx.fillStyle='#03080f'; ctx.fillRect(bx,by,bw,bh)
        // Windows
        const cols=Math.floor(bw/10), rows=b.floors
        for(let r=0;r<rows;r++){
          for(let c=0;c<cols;c++){
            const lit=Math.sin(t*0.08+b.x*0.1+r*3.7+c*2.3)>-0.25
            if(lit){
              const wa=0.4+0.4*Math.sin(t*0.12+r*2.1+c*1.7)
              ctx.fillStyle=`rgba(255,${210+40*Math.sin(t*0.2+r+c)},80,${wa})`
              ctx.fillRect(bx+c*10+2,by+r*(bh/rows)+3,6,bh/rows-5)
            }
          }
        }
        // Rooftop lights (red blink)
        if(b.h>0.5){
          const bl=0.4+0.6*Math.abs(Math.sin(t*1.8+b.x))
          ctx.fillStyle=`rgba(255,50,50,${bl})`
          ctx.beginPath(); ctx.arc(bx+bw/2,by+2,2.5,0,Math.PI*2); ctx.fill()
        }
      })

      // Street + reflections
      const st=ctx.createLinearGradient(0,H*0.83,0,H)
      st.addColorStop(0,'#060e04'); st.addColorStop(1,'#010302')
      ctx.fillStyle=st; ctx.fillRect(0,H*0.83,W,H*0.17)
      // Road markings
      ctx.strokeStyle='rgba(255,230,50,0.25)'; ctx.lineWidth=2; ctx.setLineDash([30,20])
      ctx.beginPath(); ctx.moveTo(0,H*0.92); ctx.lineTo(W,H*0.92); ctx.stroke()
      ctx.setLineDash([])

      // Moving cars
      for(let i=0;i<5;i++){
        const dir=i%2===0?1:-1
        const cx=((t*55*dir*(1+i*0.1)+i*W/4+W)%(W+120))-60
        const cy=H*(0.87+i*0.022)
        const isH=dir>0
        // Headlights
        ;[0,14].forEach(off=>{
          ctx.fillStyle=isH?'rgba(255,245,180,0.95)':'rgba(255,40,40,0.9)'
          ctx.beginPath(); ctx.arc(cx+off,cy,2.5,0,Math.PI*2); ctx.fill()
          // Light cone
          const lg=ctx.createLinearGradient(cx,cy,cx+(isH?-70:70),cy)
          lg.addColorStop(0,isH?'rgba(255,240,160,0.35)':'rgba(255,40,40,0.25)'); lg.addColorStop(1,'transparent')
          ctx.fillStyle=lg; ctx.fillRect(cx+(isH?-70:14),cy-4,70,8)
        })
        // Reflection
        const rg=ctx.createLinearGradient(cx,H*0.94,cx,H)
        rg.addColorStop(0,isH?'rgba(255,240,160,0.12)':'rgba(255,40,40,0.1)'); rg.addColorStop(1,'transparent')
        ctx.fillStyle=rg; ctx.fillRect(cx-5,H*0.94,24,H*0.06)
      }
    }
  },
  {
    name: 'VALORANT', color: '#ff4655',
    draw(ctx, t, W, H) {
      const bg=ctx.createLinearGradient(0,0,0,H)
      bg.addColorStop(0,'#020104'); bg.addColorStop(0.5,'#0e0208'); bg.addColorStop(1,'#040103')
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H)

      // Diagonal slash panels
      for(let i=0;i<7;i++){
        const px=(t*25+i*(W/5.5))%(W+180)-90
        const alpha=0.03+0.015*Math.sin(t*0.8+i)
        ctx.fillStyle=`rgba(255,70,85,${alpha})`
        ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px+90,H); ctx.lineTo(px+100,H); ctx.lineTo(px+10,0); ctx.fill()
      }

      // Map grid lines (Pearl/Ascent style)
      ctx.strokeStyle='rgba(255,70,85,0.05)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=60){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for(let y=0;y<H;y+=60){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

      // Jett silhouette (stylized)
      const ax=W*0.38, ay=H*0.48
      ctx.fillStyle='rgba(4,1,6,0.97)'
      // Body
      ctx.beginPath(); ctx.ellipse(ax,ay+32,14,28,0,0,Math.PI*2); ctx.fill()
      // Head
      ctx.beginPath(); ctx.arc(ax,ay-8,15,0,Math.PI*2); ctx.fill()
      // Cape flowing
      ctx.beginPath()
      ctx.moveTo(ax-12,ay+10); ctx.quadraticCurveTo(ax-35,ay+30+10*Math.sin(t),ax-28,ay+65)
      ctx.lineTo(ax+5,ay+55); ctx.quadraticCurveTo(ax-5,ay+25,ax+2,ay+10)
      ctx.fill()
      // Blade trail
      const bladePts=[[ax+18,ay-2],[ax+40+8*Math.cos(t*2.5),ay+12+10*Math.sin(t*2)],[ax+28,ay+30]]
      ctx.strokeStyle=`rgba(255,70,85,${0.6+0.3*Math.sin(t*3)})`; ctx.lineWidth=2.5
      ctx.beginPath(); ctx.moveTo(bladePts[0][0],bladePts[0][1])
      bladePts.slice(1).forEach(p=>ctx.lineTo(p[0],p[1])); ctx.stroke()
      // Agent neon halo
      const ag=ctx.createRadialGradient(ax,ay,0,ax,ay,65)
      ag.addColorStop(0,'rgba(255,70,85,0.08)'); ag.addColorStop(1,'transparent')
      ctx.fillStyle=ag; ctx.fillRect(0,0,W,H)

      // Spike (bomb)
      const spx=W*0.68+8*Math.sin(t), spy=H*0.7
      const spP=(Math.sin(t*4)+1)/2
      ctx.fillStyle=`rgba(255,70,85,${0.5+0.4*spP})`
      ctx.beginPath(); ctx.roundRect(spx-7,spy-7,14,14,3); ctx.fill()
      // Beeping rings
      for(let r=0;r<3;r++){
        const rphase=(t*1.8+r*0.4)%1
        ctx.strokeStyle=`rgba(255,70,85,${0.6*(1-rphase)})`
        ctx.lineWidth=1.5+rphase
        ctx.beginPath(); ctx.arc(spx,spy,16+rphase*45,0,Math.PI*2); ctx.stroke()
      }

      // Particles from blade
      for(let p=0;p<12;p++){
        const pt=(t*0.9+p*0.25)%1
        const px2=bladePts[0][0]+Math.cos(t*2+p)*40*pt
        const py2=bladePts[0][1]+Math.sin(t*1.5+p)*30*pt-pt*50
        ctx.fillStyle=`rgba(255,${100+100*Math.sin(p)},100,${0.8*(1-pt)})`
        ctx.beginPath(); ctx.arc(px2,py2,2*(1-pt)+0.5,0,Math.PI*2); ctx.fill()
      }
    }
  },
  {
    name: 'FORTNITE', color: '#00d4ff',
    draw(ctx, t, W, H) {
      const sky=ctx.createLinearGradient(0,0,0,H)
      sky.addColorStop(0,'#04020f'); sky.addColorStop(0.3,'#140a30'); sky.addColorStop(0.6,'#1a2565'); sky.addColorStop(0.8,'#102840'); sky.addColorStop(1,'#050a12')
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H)

      // Storm ring
      const scx=W*0.52+Math.sin(t*0.18)*18, scy=H*0.38
      const sr=Math.min(W,H)*(0.32+0.04*Math.sin(t*0.25))
      for(let r=0;r<4;r++){
        const ring=ctx.createRadialGradient(scx,scy,(sr-r*8)*0.85,scx,scy,sr+r*4)
        ring.addColorStop(0,'transparent')
        ring.addColorStop(0.85,'transparent')
        ring.addColorStop(0.92,`rgba(${120+r*20},${30+r*10},${220+r*10},${0.12-r*0.02})`)
        ring.addColorStop(1,`rgba(${80+r*20},${20+r*10},${200+r*10},${0.35-r*0.05})`)
        ctx.fillStyle=ring; ctx.fillRect(0,0,W,H)
      }
      ctx.beginPath(); ctx.arc(scx,scy,sr,0,Math.PI*2)
      ctx.strokeStyle=`rgba(160,80,255,${0.25+0.15*Math.sin(t*1.5)})`; ctx.lineWidth=2.5; ctx.stroke()

      // Lightning
      if(Math.sin(t*6.5)>0.94){
        const lx=W*(0.15+Math.random()*0.7)
        ctx.strokeStyle='rgba(210,190,255,0.92)'; ctx.lineWidth=1.8
        ctx.shadowBlur=20; ctx.shadowColor='rgba(200,180,255,0.8)'
        ctx.beginPath(); ctx.moveTo(lx,0)
        let ly=0; while(ly<H*0.7){ ly+=H*0.08+Math.random()*H*0.06; ctx.lineTo(lx+(Math.random()-0.5)*50,ly) }
        ctx.stroke(); ctx.shadowBlur=0
      }

      // Floating island
      const isX=W*0.28, isY=H*0.58+5*Math.sin(t*0.4)
      // Island base
      const isG=ctx.createRadialGradient(isX,isY+10,10,isX,isY,85)
      isG.addColorStop(0,'#3a6028'); isG.addColorStop(0.6,'#2a4818'); isG.addColorStop(1,'rgba(20,30,15,0.6)')
      ctx.fillStyle=isG
      ctx.beginPath(); ctx.ellipse(isX,isY,82,22,0,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='#1e3010'
      ctx.beginPath(); ctx.ellipse(isX,isY+4,82,16,0,0,Math.PI); ctx.fill()
      // Trees
      ;[isX-38,isX-18,isX+5,isX+30,isX+52].forEach((tx2,i)=>{
        const th=20+i%3*5
        ctx.fillStyle=`rgb(${20+i*5},${70+i*8},${15+i*4})`
        ctx.beginPath(); ctx.moveTo(tx2,isY-th); ctx.lineTo(tx2-10,isY-4); ctx.lineTo(tx2+10,isY-4); ctx.fill()
        ctx.fillStyle=`rgb(${30+i*5},${85+i*8},${20+i*4})`
        ctx.beginPath(); ctx.moveTo(tx2,isY-th-8); ctx.lineTo(tx2-7,isY-th+6); ctx.lineTo(tx2+7,isY-th+6); ctx.fill()
      })

      // Battle Bus
      const busx=(t*45)%(W+220)-110
      ctx.fillStyle='rgba(255,220,0,0.92)'
      ctx.beginPath(); ctx.roundRect(busx-22,H*0.22-10,44,18,5); ctx.fill()
      ctx.fillStyle='rgba(120,200,255,0.8)'
      ctx.beginPath(); ctx.roundRect(busx-14,H*0.22-18,28,10,3); ctx.fill()
      // Bus trail
      const btg=ctx.createLinearGradient(busx-110,0,busx,0)
      btg.addColorStop(0,'transparent'); btg.addColorStop(1,'rgba(100,200,255,0.2)')
      ctx.strokeStyle=btg; ctx.lineWidth=2
      ctx.beginPath(); ctx.moveTo(busx-110,H*0.22+2); ctx.lineTo(busx,H*0.22+2); ctx.stroke()
      // Drops from bus
      for(let d=0;d<3;d++){
        const dx=busx-d*35-10, dy=H*0.22+22+d*18*Math.max(0,Math.sin(t*0.3))
        ctx.strokeStyle=`rgba(200,240,255,${0.5-d*0.15})`; ctx.lineWidth=1
        ctx.beginPath(); ctx.moveTo(dx,H*0.22+22); ctx.lineTo(dx,dy); ctx.stroke()
        ctx.fillStyle=`rgba(200,240,255,${0.6-d*0.15})`
        ctx.beginPath(); ctx.arc(dx,dy,3-d,0,Math.PI*2); ctx.fill()
      }
    }
  },
  {
    name: 'CS2', color: '#e4c84b',
    draw(ctx, t, W, H) {
      const bg=ctx.createLinearGradient(0,0,W,H)
      bg.addColorStop(0,'#020508'); bg.addColorStop(1,'#06090e')
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H)

      // Tactical grid
      ctx.strokeStyle='rgba(228,200,75,0.035)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=48){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for(let y=0;y<H;y+=48){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

      // Dust2 layout (simplified overhead)
      const rooms=[
        {x:0.08,y:0.15,w:0.22,h:0.28,n:'A SITE'},{x:0.35,y:0.08,w:0.28,h:0.18,n:'CATWALK'},
        {x:0.68,y:0.15,w:0.24,h:0.28,n:'B SITE'},{x:0.18,y:0.55,w:0.26,h:0.25,n:'LONG A'},
        {x:0.52,y:0.52,w:0.22,h:0.28,n:'TUNNELS'},{x:0.35,y:0.3,w:0.14,h:0.22,n:'MID'},
      ]
      rooms.forEach(r=>{
        const a=0.06+0.03*Math.sin(t*0.5+r.x*8)
        ctx.fillStyle=`rgba(228,200,75,${a})`; ctx.fillRect(r.x*W,r.y*H,r.w*W,r.h*H)
        ctx.strokeStyle=`rgba(228,200,75,${a*2.5})`; ctx.lineWidth=1.5; ctx.strokeRect(r.x*W,r.y*H,r.w*W,r.h*H)
        ctx.fillStyle=`rgba(228,200,75,0.25)`; ctx.font=`600 9px 'Orbitron',monospace`
        ctx.textAlign='center'; ctx.fillText(r.n,(r.x+r.w/2)*W,(r.y+r.h/2)*H+3)
      })
      ctx.textAlign='left'

      // Crosshair center
      const cx=W/2, cy=H*0.5
      const cg=5+3*Math.sin(t*2.5)
      ctx.strokeStyle=`rgba(0,230,255,${0.5+0.3*Math.sin(t*2)})`; ctx.lineWidth=1.5
      ;[[-cg-18,-cg-3],[-cg-3,cg+3],[cg+3,cg+18]].forEach(([a,b],i)=>{
        if(i===1) return
        ctx.beginPath(); ctx.moveTo(cx+a,cy); ctx.lineTo(cx+b,cy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx,cy+a); ctx.lineTo(cx,cy+b); ctx.stroke()
      })
      ctx.beginPath(); ctx.moveTo(cx-cg-18,cy); ctx.lineTo(cx-cg-2,cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx+cg+2,cy); ctx.lineTo(cx+cg+18,cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx,cy-cg-18); ctx.lineTo(cx,cy-cg-2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx,cy+cg+2); ctx.lineTo(cx,cy+cg+18); ctx.stroke()
      ctx.fillStyle=`rgba(0,230,255,${0.7+0.3*Math.sin(t*2)})`
      ctx.beginPath(); ctx.arc(cx,cy,2,0,Math.PI*2); ctx.fill()

      // Player dots
      const players=[
        {x:0.19,y:0.29,t:1},{x:0.22,y:0.26,t:1},{x:0.74,y:0.3,t:1},{x:0.73,y:0.62,t:0},{x:0.55,y:0.65,t:0}
      ]
      players.forEach((p,i)=>{
        const px=p.x*W+3*Math.sin(t*0.7+i), py=p.y*H+3*Math.cos(t*0.5+i)
        ctx.fillStyle=p.t?'rgba(100,220,100,0.9)':'rgba(255,80,80,0.9)'
        ctx.beginPath(); ctx.arc(px,py,5.5,0,Math.PI*2); ctx.fill()
        ctx.strokeStyle=p.t?'rgba(150,255,150,0.5)':'rgba(255,130,130,0.5)'; ctx.lineWidth=1.5
        ctx.beginPath(); ctx.arc(px,py,9,0,Math.PI*2); ctx.stroke()
        // Direction indicator
        ctx.strokeStyle=p.t?'rgba(150,255,150,0.7)':'rgba(255,130,130,0.7)'; ctx.lineWidth=1.5
        const da=t*0.3+i; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+Math.cos(da)*14,py+Math.sin(da)*14); ctx.stroke()
      })
    }
  },
  {
    name: 'MINECRAFT', color: '#5aad3b',
    draw(ctx, t, W, H) {
      // Pixel day/dusk sky
      const progress=((Math.sin(t*0.15)+1)/2)
      const r=Math.floor(80+60*progress), g=Math.floor(130+80*progress), b=Math.floor(200+55*progress)
      ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(0,0,W,H*0.55)
      // Horizon gradient
      const hor=ctx.createLinearGradient(0,H*0.45,0,H*0.55)
      hor.addColorStop(0,`rgb(${r},${g},${b})`); hor.addColorStop(0.5,'rgba(255,160,60,0.4)'); hor.addColorStop(1,'rgba(255,100,20,0.2)')
      ctx.fillStyle=hor; ctx.fillRect(0,H*0.45,W,H*0.1)

      const BK=20
      // Moving clouds
      const coff=(t*8)%W
      ;[[0,H*0.12,5,3],[1.5,H*0.08,6,3],[0.6,H*0.15,4,3]].forEach(([xr,cy2,cw,ch])=>{
        const cx2=(xr*W+coff)%W
        ctx.fillStyle='rgba(255,255,255,0.88)'
        for(let bx=0;bx<cw;bx++) for(let by=0;by<ch;by++){
          if((bx===0&&by===0)||(bx===cw-1&&by===0)||(bx===0&&by===ch-1)||(bx===cw-1&&by===ch-1)) continue
          ctx.fillRect(cx2+bx*BK,cy2+by*BK,BK,BK)
        }
      })

      // Sun / Moon
      const sunX=W*(0.2+0.6*progress), sunY=H*(0.08+0.15*Math.abs(Math.sin(progress*Math.PI)))
      ctx.fillStyle=progress>0.5?'rgba(255,230,80,0.95)':'rgba(220,220,255,0.9)'
      ctx.fillRect(sunX-BK/2,sunY-BK/2,BK,BK)

      // Terrain
      const terrain=[3,3,4,4,3,3,2,2,3,3,4,5,5,4,3,3,4,4,3,2,2,3,4,4,5,5,4,3,3,4]
      const tw=Math.ceil(W/BK)+1
      for(let i=0;i<tw;i++){
        const h2=terrain[i%terrain.length]
        const bx=i*BK
        // Grass top
        ctx.fillStyle='#5aad3b'; ctx.fillRect(bx,H-h2*BK,BK,BK)
        ctx.fillStyle='#7bc950'; ctx.fillRect(bx,H-h2*BK,BK,4)
        // Dirt
        for(let d=1;d<h2;d++){
          ctx.fillStyle=d<2?'#9b6e3a':d<4?'#7a4e22':'#5a3410'
          ctx.fillRect(bx,H-(h2-d)*BK,BK,BK)
          ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=0.5; ctx.strokeRect(bx,H-(h2-d)*BK,BK,BK)
        }
      }

      // Steve walking
      const sx=W*0.25+12*Math.sin(t*1.8), sy=H-terrain[3]*BK-54
      const fr=Math.floor(t*4)%2, fa=fr*0.3
      ctx.fillStyle='#f5c292'; ctx.fillRect(sx,sy,16,16) // head
      ctx.fillStyle='#3366bb'; ctx.fillRect(sx-2,sy+16,20,20) // body
      ctx.fillStyle='#f5c292'; ctx.fillRect(sx-7,sy+17,7,16+fr*4) // arm L
      ctx.fillStyle='#3366bb'; ctx.fillRect(sx+16,sy+17,7,16-fr*4) // arm R
      ctx.fillStyle='#8b4510'; ctx.fillRect(sx,sy+36,8,14+fr*5) // leg L
      ctx.fillStyle='#7a3a08'; ctx.fillRect(sx+8,sy+36,8,14-fr*5) // leg R
      // Eyes
      ctx.fillStyle='#2a1a00'
      ctx.fillRect(sx+3,sy+5,3,3); ctx.fillRect(sx+10,sy+5,3,3)

      // Creeper (distant)
      const creepx=W*0.65, creepy=H-terrain[12]*BK-46
      ctx.fillStyle='#4a8a2a'; ctx.fillRect(creepx,creepy+18,18,24)
      ctx.fillRect(creepx-2,creepy,22,20)
      ctx.fillStyle='#1a1a1a'
      ctx.fillRect(creepx+3,creepy+3,5,5); ctx.fillRect(creepx+14,creepy+3,5,5)
      ctx.fillRect(creepx+7,creepy+10,8,3)
      ctx.fillRect(creepx+5,creepy+13,3,4); ctx.fillRect(creepx+14,creepy+13,3,4)
    }
  }
]

export default function GameBackground() {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const timeRef = useRef(0)
  const sceneIdxRef = useRef(0)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [alpha, setAlpha] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setAlpha(0)
      setTimeout(() => {
        const next = (sceneIdxRef.current + 1) % SCENES.length
        sceneIdxRef.current = next
        setSceneIdx(next)
        setAlpha(1)
      }, 600)
    }, 11000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const draw = () => {
      timeRef.current += 0.016
      SCENES[sceneIdxRef.current].draw(ctx, timeRef.current, canvas.width, canvas.height)
      // Vignette
      const v = ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*0.18,canvas.width/2,canvas.height/2,canvas.width*0.9)
      v.addColorStop(0,'transparent'); v.addColorStop(1,'rgba(0,0,0,0.75)')
      ctx.fillStyle=v; ctx.fillRect(0,0,canvas.width,canvas.height)
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  const scene = SCENES[sceneIdx]
  return (
    <>
      <canvas ref={canvasRef} style={{
        position:'fixed', inset:0, zIndex:0,
        opacity: alpha * 0.72,
        transition: 'opacity 0.6s ease'
      }}/>
      {/* Scene badge */}
      <div style={{
        position:'fixed', bottom:'72px', right:'10px', zIndex:5,
        display:'flex', alignItems:'center', gap:'7px',
        background:'rgba(0,0,0,0.75)', backdropFilter:'blur(16px)',
        border:`1px solid ${scene.color}35`,
        borderRadius:'10px', padding:'5px 11px',
        boxShadow:`0 0 15px ${scene.color}20, inset 0 1px 0 rgba(255,255,255,0.06)`,
        transition:'all 0.6s ease'
      }}>
        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:scene.color, boxShadow:`0 0 6px ${scene.color}`, animation:'blink 1.5s ease-in-out infinite' }}/>
        <span style={{ fontFamily:'var(--font-d)', fontSize:'9px', fontWeight:700, color:scene.color, letterSpacing:'0.12em' }}>
          {scene.name}
        </span>
      </div>
    </>
  )
}
