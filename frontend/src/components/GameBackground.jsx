import React, { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// GIVIHUB — Cinematic Game Background
// Two scenes alternate every 14s: DOTA 2 and CS2
// Each is a faithful recreation of the game's main menu atmosphere
// ─────────────────────────────────────────────────────────────────────────────

// ── Particle pool helper ──────────────────────────────────────────────────────
function makeParticles(count, init) {
  return Array.from({ length: count }, (_, i) => init(i))
}

// ── DOTA 2 Scene ──────────────────────────────────────────────────────────────
// Aesthetic: deep purple/crimson cosmic sky, floating ancient runes, hero silhouette,
// slow vertical particle drift, hex grid pulses, arcane light rays
function dotaScene() {
  // Rune particles (ancient script)
  const RUNES = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ']
  const runes = makeParticles(28, i => ({
    x:   Math.random(),
    y:   Math.random(),
    vy:  -(0.00008 + Math.random() * 0.00012),
    vx:  (Math.random() - 0.5) * 0.00004,
    size: 9 + Math.random() * 14,
    alpha: 0.04 + Math.random() * 0.18,
    phase: Math.random() * Math.PI * 2,
    sym: RUNES[i % RUNES.length],
    color: Math.random() > 0.5 ? '#c8371a' : '#a855f7',
  }))

  // Ember sparks
  const embers = makeParticles(60, () => ({
    x: Math.random(), y: 0.5 + Math.random() * 0.5,
    vy: -(0.0003 + Math.random() * 0.0006),
    vx: (Math.random() - 0.5) * 0.0003,
    size: 0.6 + Math.random() * 1.8,
    alpha: 0.4 + Math.random() * 0.6,
    phase: Math.random() * Math.PI * 2,
    color: Math.random() > 0.4 ? '#ff6a2a' : '#e040fb',
  }))

  // Hex grid cells
  const hexes = []
  const hsize = 38
  const hw = hsize * Math.sqrt(3), hh = hsize * 1.5
  for (let row = -1; row < 20; row++) {
    for (let col = -1; col < 14; col++) {
      hexes.push({
        cx: col * hw + (row % 2) * hw / 2,
        cy: row * hh,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
      })
    }
  }

  return {
    name: 'DOTA 2', color: '#c8371a',
    state: { runes, embers, hexes },
    draw(ctx, t, W, H, state) {
      // ── Background gradient ───────────────────────────────────────────
      const bg = ctx.createLinearGradient(0, 0, W * 0.6, H)
      bg.addColorStop(0,   '#020008')
      bg.addColorStop(0.3, '#0e0325')
      bg.addColorStop(0.6, '#1a0430')
      bg.addColorStop(1,   '#050004')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // ── Nebula clouds ─────────────────────────────────────────────────
      const nebulas = [
        { x: 0.2, y: 0.3, r: 0.38, c: 'rgba(120,20,80,' },
        { x: 0.75, y: 0.2, r: 0.28, c: 'rgba(60,10,130,' },
        { x: 0.5,  y: 0.6, r: 0.22, c: 'rgba(180,40,20,' },
      ]
      nebulas.forEach(n => {
        const pulse = 0.06 + 0.03 * Math.sin(t * 0.4 + n.x * 5)
        const ng = ctx.createRadialGradient(n.x * W, n.y * H, 0, n.x * W, n.y * H, n.r * W)
        ng.addColorStop(0, n.c + pulse + ')')
        ng.addColorStop(0.5, n.c + (pulse * 0.4) + ')')
        ng.addColorStop(1, 'transparent')
        ctx.fillStyle = ng
        ctx.fillRect(0, 0, W, H)
      })

      // ── Stars ─────────────────────────────────────────────────────────
      for (let i = 0; i < 120; i++) {
        const sx = (Math.sin(i * 127.3) * 0.5 + 0.5) * W
        const sy = (Math.sin(i * 89.7) * 0.5 + 0.5) * H * 0.7
        const a = 0.2 + 0.8 * Math.abs(Math.sin(t * 0.5 + i * 0.7))
        const size = 0.4 + 0.8 * (i % 5 === 0 ? 1.5 : 0.5)
        ctx.fillStyle = i % 7 === 0 ? `rgba(200,150,255,${a * 0.9})` : `rgba(255,240,210,${a * 0.7})`
        ctx.beginPath()
        ctx.arc(sx, sy, size, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Hex grid ──────────────────────────────────────────────────────
      ctx.lineWidth = 0.8
      state.hexes.forEach(h => {
        const dist = Math.hypot(h.cx - W * 0.5, h.cy - H * 0.68) / Math.max(W, H)
        const pulse = 0.5 + 0.5 * Math.sin(t * h.speed + h.phase)
        const a = (0.04 + 0.06 * pulse) * Math.max(0, 1 - dist * 2.2)
        if (a < 0.005) return
        ctx.strokeStyle = `rgba(200,55,26,${a})`
        ctx.beginPath()
        for (let k = 0; k < 6; k++) {
          const ang = k * Math.PI / 3 - Math.PI / 6
          const px = h.cx + 38 * Math.cos(ang)
          const py = h.cy + 38 * Math.sin(ang)
          k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.stroke()
      })

      // ── Floating runes ────────────────────────────────────────────────
      ctx.save()
      state.runes.forEach(r => {
        r.y += r.vy
        r.x += r.vx
        if (r.y < -0.05) { r.y = 1.05; r.x = Math.random() }
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.8 + r.phase)
        const a = r.alpha * pulse
        ctx.fillStyle = r.color.replace(')', `,${a})`)
          .replace('rgba', 'rgba').replace('#c8371a', `rgba(200,55,26,${a})`).replace('#a855f7', `rgba(168,85,247,${a})`)
        ctx.font = `${r.size}px serif`
        ctx.fillStyle = r.color === '#c8371a' ? `rgba(200,55,26,${a})` : `rgba(168,85,247,${a})`
        ctx.fillText(r.sym, r.x * W, r.y * H)
      })
      ctx.restore()

      // ── Light rays from hero position ─────────────────────────────────
      const heroX = W * 0.5, heroY = H * 0.55
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + t * 0.08
        const len = (0.15 + 0.1 * Math.sin(t * 0.6 + i)) * H
        const a = 0.04 + 0.03 * Math.sin(t * 1.2 + i * 0.8)
        const rg = ctx.createLinearGradient(heroX, heroY, heroX + Math.cos(ang) * len, heroY + Math.sin(ang) * len)
        rg.addColorStop(0, `rgba(200,55,26,${a})`)
        rg.addColorStop(1, 'transparent')
        ctx.strokeStyle = rg
        ctx.lineWidth = 1.5 + Math.sin(t + i) * 0.8
        ctx.beginPath()
        ctx.moveTo(heroX, heroY)
        ctx.lineTo(heroX + Math.cos(ang) * len, heroY + Math.sin(ang) * len)
        ctx.stroke()
      }

      // ── Dota 2 Hero silhouette (Invoker-style) ────────────────────────
      const tx = W * 0.5, ty = H * 0.42
      const heroGlow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 80)
      heroGlow.addColorStop(0, `rgba(220,80,30,${0.12 + 0.08 * Math.sin(t * 1.5)})`)
      heroGlow.addColorStop(0.5, `rgba(150,30,180,${0.06 + 0.04 * Math.sin(t * 1.2)})`)
      heroGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = heroGlow
      ctx.fillRect(tx - 80, ty - 80, 160, 160)

      // Robe + body silhouette
      ctx.fillStyle = 'rgba(2,0,8,0.97)'
      ctx.beginPath()
      // Head
      ctx.arc(tx, ty - 42, 16, 0, Math.PI * 2)
      ctx.fill()
      // Shoulders + robe — wide sweeping shape
      ctx.beginPath()
      ctx.moveTo(tx - 48, H)
      ctx.lineTo(tx - 38, ty + 30)
      ctx.lineTo(tx - 55, ty - 5)
      ctx.lineTo(tx - 30, ty - 18)
      ctx.lineTo(tx - 14, ty - 26)
      ctx.lineTo(tx, ty - 27)
      ctx.lineTo(tx + 14, ty - 26)
      ctx.lineTo(tx + 30, ty - 18)
      ctx.lineTo(tx + 55, ty - 5)
      ctx.lineTo(tx + 38, ty + 30)
      ctx.lineTo(tx + 48, H)
      ctx.fill()
      // Orbs floating around (Invoker signature)
      const orbColors = [
        [255, 100, 20],   // Exort (fire)
        [80, 200, 255],   // Wex (lightning)
        [180, 100, 255],  // Quas (ice/spirit)
      ]
      orbColors.forEach((col, i) => {
        const oAng = t * 0.9 + (i * Math.PI * 2) / 3
        const ox = tx + Math.cos(oAng) * 35
        const oy = ty - 20 + Math.sin(oAng) * 20
        const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, 10)
        og.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.95)`)
        og.addColorStop(0.5, `rgba(${col[0]},${col[1]},${col[2]},0.4)`)
        og.addColorStop(1, 'transparent')
        ctx.fillStyle = og
        ctx.beginPath()
        ctx.arc(ox, oy, 10, 0, Math.PI * 2)
        ctx.fill()
        // Orb glow trail
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.2)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(tx, ty - 20, 35, oAng - 0.4, oAng)
        ctx.stroke()
      })

      // ── Embers ────────────────────────────────────────────────────────
      state.embers.forEach(e => {
        e.y += e.vy
        e.x += e.vx + 0.0001 * Math.sin(t * 2 + e.phase)
        if (e.y < -0.02) { e.y = 1.0 + Math.random() * 0.1; e.x = Math.random() }
        const a = e.alpha * (0.5 + 0.5 * Math.sin(t * 3 + e.phase))
        ctx.fillStyle = e.color === '#ff6a2a' ? `rgba(255,106,42,${a})` : `rgba(224,64,251,${a})`
        ctx.beginPath()
        ctx.arc(e.x * W, e.y * H, e.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // ── Ground horizon glow ───────────────────────────────────────────
      const hg = ctx.createLinearGradient(0, H * 0.58, 0, H)
      hg.addColorStop(0, 'rgba(180,40,20,0.22)')
      hg.addColorStop(0.3, 'rgba(80,10,40,0.12)')
      hg.addColorStop(1, 'transparent')
      ctx.fillStyle = hg
      ctx.fillRect(0, H * 0.58, W, H * 0.42)

      // ── Vignette ──────────────────────────────────────────────────────
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, W * 0.85)
      vig.addColorStop(0, 'transparent')
      vig.addColorStop(1, 'rgba(0,0,0,0.82)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)
    }
  }
}

// ── CS2 Scene ─────────────────────────────────────────────────────────────────
// Aesthetic: Mirage/Dust2 palette — sandy ochre, concrete grey, tactical overlay,
// floating smoke particles, radar lines, holographic crosshair, player positions
function cs2Scene() {
  // Smoke particles (billowing)
  const smokes = makeParticles(50, () => ({
    x: 0.2 + Math.random() * 0.6,
    y: 0.4 + Math.random() * 0.4,
    vx: (Math.random() - 0.5) * 0.0002,
    vy: -(0.00005 + Math.random() * 0.0001),
    r: 18 + Math.random() * 40,
    alpha: 0.02 + Math.random() * 0.06,
    phase: Math.random() * Math.PI * 2,
  }))

  // Bullet holes
  const holes = makeParticles(12, () => ({
    x: Math.random(),
    y: 0.3 + Math.random() * 0.5,
    size: 1.5 + Math.random() * 3,
  }))

  // Scan lines
  const scanY = { v: 0 }

  return {
    name: 'CS2', color: '#e4c84b',
    state: { smokes, holes, scanY },
    draw(ctx, t, W, H, state) {
      // ── Base: dark concrete ───────────────────────────────────────────
      ctx.fillStyle = '#020508'
      ctx.fillRect(0, 0, W, H)

      // ── Mirage map architecture — sandy courtyard ─────────────────────
      // Sky gradient (dusty desert dusk)
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55)
      sky.addColorStop(0,    '#04090f')
      sky.addColorStop(0.35, '#0c1520')
      sky.addColorStop(0.7,  '#1a1005')
      sky.addColorStop(1,    '#100a02')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H * 0.55)

      // Sun/moon glow (low on horizon — Mirage aesthetic)
      const sunX = W * 0.72, sunY = H * 0.44
      const sunG = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 100)
      sunG.addColorStop(0,   `rgba(255,200,80,${0.12 + 0.04 * Math.sin(t * 0.3)})`)
      sunG.addColorStop(0.4, `rgba(200,130,40,${0.06 + 0.02 * Math.sin(t * 0.3)})`)
      sunG.addColorStop(1,   'transparent')
      ctx.fillStyle = sunG
      ctx.fillRect(0, 0, W, H)

      // ── Architectural silhouettes (Mirage mid/palace) ─────────────────
      const archColor = '#03070c'
      // Palace / mid arch shape
      ctx.fillStyle = archColor
      // Left wall
      ctx.fillRect(0, H * 0.3, W * 0.15, H)
      // Right wall
      ctx.fillRect(W * 0.85, H * 0.3, W * 0.15, H)
      // Mid tower
      ctx.beginPath()
      ctx.moveTo(W * 0.42, H)
      ctx.lineTo(W * 0.42, H * 0.28)
      ctx.lineTo(W * 0.45, H * 0.22)
      ctx.lineTo(W * 0.5,  H * 0.19)
      ctx.lineTo(W * 0.55, H * 0.22)
      ctx.lineTo(W * 0.58, H * 0.28)
      ctx.lineTo(W * 0.58, H)
      ctx.fill()
      // Battlements
      for (let i = 0; i < 6; i++) {
        const bx = W * 0.42 + i * (W * 0.16 / 6)
        ctx.fillRect(bx, H * 0.22, W * 0.016, H * 0.06)
      }
      // Side buildings
      [[0.12, 0.35, 0.08, 0.5], [0.8, 0.3, 0.08, 0.6], [0.24, 0.32, 0.06, 0.45], [0.7, 0.28, 0.07, 0.52]].forEach(([x, y, w, h]) => {
        ctx.fillStyle = '#020609'
        ctx.fillRect(x * W, y * H, w * W, h * H)
        // Windows with flickering light
        const wRows = 3, wCols = 2
        for (let r = 0; r < wRows; r++) {
          for (let c = 0; c < wCols; c++) {
            const lit = Math.sin(t * 0.15 + x * 8 + r * 3 + c * 2) > -0.3
            if (!lit) continue
            const wa = 0.3 + 0.4 * Math.sin(t * 0.12 + r * 2 + c * 1.7)
            ctx.fillStyle = `rgba(240,${180 + 40 * Math.sin(t * 0.2 + r)},60,${wa})`
            ctx.fillRect(
              x * W + c * (w * W / 2.4) + W * 0.008,
              y * H + H * 0.06 + r * (h * H / 3.5),
              w * W * 0.28, h * H * 0.12
            )
          }
        }
      })

      // ── Ground (sandy/concrete) ───────────────────────────────────────
      const ground = ctx.createLinearGradient(0, H * 0.55, 0, H)
      ground.addColorStop(0, '#1a1208')
      ground.addColorStop(0.4, '#0e0c06')
      ground.addColorStop(1, '#050403')
      ctx.fillStyle = ground
      ctx.fillRect(0, H * 0.55, W, H * 0.45)

      // Ground texture lines (cobblestone / sand)
      ctx.strokeStyle = 'rgba(80,65,30,0.08)'
      ctx.lineWidth = 1
      for (let i = 0; i < 12; i++) {
        const ly = H * 0.56 + i * (H * 0.44 / 12)
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke()
      }
      for (let i = 0; i < 20; i++) {
        const lx = i * (W / 20)
        ctx.beginPath(); ctx.moveTo(lx, H * 0.56); ctx.lineTo(lx, H); ctx.stroke()
      }

      // ── Tactical radar overlay (holographic, lower corner) ─────────────
      const radarX = W * 0.12, radarY = H * 0.72, radarR = Math.min(W, H) * 0.12
      const radarAlpha = 0.18 + 0.06 * Math.sin(t * 1.2)
      // Radar bg
      ctx.fillStyle = `rgba(0,20,10,${radarAlpha * 2})`
      ctx.beginPath(); ctx.arc(radarX, radarY, radarR, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = `rgba(0,220,120,${radarAlpha * 2.5})`
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(radarX, radarY, radarR, 0, Math.PI * 2); ctx.stroke()
      // Radar sweep line
      const sweepAng = t * 1.8
      ctx.strokeStyle = `rgba(0,255,140,${0.5 + 0.3 * Math.sin(t * 2)})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(radarX, radarY)
      ctx.lineTo(radarX + Math.cos(sweepAng) * radarR, radarY + Math.sin(sweepAng) * radarR)
      ctx.stroke()
      // Radar sweep glow arc
      const sweepG = ctx.createConicalGradient
        ? null
        : (() => { /* fallback */ return null })()
      for (let i = 0; i < 20; i++) {
        const ang = sweepAng - i * 0.05
        const a = (0.15 - i * 0.007) * Math.max(0, 1)
        ctx.strokeStyle = `rgba(0,255,140,${a})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(radarX, radarY)
        ctx.lineTo(radarX + Math.cos(ang) * radarR, radarY + Math.sin(ang) * radarR)
        ctx.stroke()
      }
      // Player dots on radar
      const players = [
        { x: 0.3, y: -0.2, team: 'ct' }, { x: -0.5, y: 0.3, team: 'ct' }, { x: 0.6, y: 0.1, team: 'ct' },
        { x: -0.3, y: -0.5, team: 't' }, { x: 0.1, y: 0.6, team: 't' },
      ]
      players.forEach(p => {
        const px = radarX + p.x * radarR * 0.85, py = radarY + p.y * radarR * 0.85
        ctx.fillStyle = p.team === 'ct' ? 'rgba(60,140,255,0.95)' : 'rgba(255,120,30,0.95)'
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill()
      })
      // Radar grid lines
      ctx.strokeStyle = `rgba(0,200,100,${radarAlpha})`
      ctx.lineWidth = 0.5
      ;[-0.5, 0, 0.5].forEach(offset => {
        ctx.beginPath(); ctx.moveTo(radarX + offset * radarR, radarY - radarR); ctx.lineTo(radarX + offset * radarR, radarY + radarR); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(radarX - radarR, radarY + offset * radarR); ctx.lineTo(radarX + radarR, radarY + offset * radarR); ctx.stroke()
      })

      // ── Smoke particles ───────────────────────────────────────────────
      state.smokes.forEach(s => {
        s.x += s.vx + 0.00004 * Math.sin(t * 0.5 + s.phase)
        s.y += s.vy
        if (s.y < 0.1) { s.y = 0.7 + Math.random() * 0.2; s.x = 0.2 + Math.random() * 0.6 }
        const a = s.alpha * (0.5 + 0.5 * Math.sin(t * 0.4 + s.phase))
        const sg = ctx.createRadialGradient(s.x * W, s.y * H, 0, s.x * W, s.y * H, s.r)
        sg.addColorStop(0, `rgba(140,130,110,${a})`)
        sg.addColorStop(1, 'transparent')
        ctx.fillStyle = sg
        ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill()
      })

      // ── Holographic crosshair (CS2 main menu style, center-ish) ───────
      const cx = W * 0.5, cy = H * 0.48
      const spread = 6 + 3 * Math.sin(t * 2.5)
      const ca = `rgba(0,210,255,${0.55 + 0.25 * Math.sin(t * 2)})`
      ctx.strokeStyle = ca; ctx.lineWidth = 1.8
      ctx.lineCap = 'round'
      // Lines
      ;[[cx - spread - 20, cy, cx - spread - 2, cy],
        [cx + spread + 2, cy, cx + spread + 20, cy],
        [cx, cy - spread - 20, cx, cy - spread - 2],
        [cx, cy + spread + 2, cx, cy + spread + 20]
      ].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      })
      // Center dot
      ctx.fillStyle = `rgba(0,230,255,${0.6 + 0.3 * Math.sin(t * 3)})`
      ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill()
      // Outer ring
      ctx.strokeStyle = `rgba(0,180,220,${0.12 + 0.06 * Math.sin(t * 1.5)})`
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.stroke()

      // ── Bullet holes ─────────────────────────────────────────────────
      state.holes.forEach(h => {
        ctx.strokeStyle = 'rgba(180,160,120,0.15)'
        ctx.lineWidth = 0.8
        ctx.beginPath(); ctx.arc(h.x * W, h.y * H, h.size, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = 'rgba(10,8,4,0.6)'
        ctx.beginPath(); ctx.arc(h.x * W, h.y * H, h.size * 0.4, 0, Math.PI * 2); ctx.fill()
      })

      // ── Scan line (tactical HUD) ──────────────────────────────────────
      state.scanY.v = (state.scanY.v + 0.0012) % 1
      const sy = state.scanY.v * H
      const sg2 = ctx.createLinearGradient(0, sy - 3, 0, sy + 3)
      sg2.addColorStop(0, 'transparent')
      sg2.addColorStop(0.5, `rgba(0,220,120,${0.06})`)
      sg2.addColorStop(1, 'transparent')
      ctx.fillStyle = sg2
      ctx.fillRect(0, sy - 3, W, 6)

      // ── Damage flash / round timer (top HUD element) ──────────────────
      const hudA = 0.55 + 0.05 * Math.sin(t * 0.5)
      ctx.font = 'bold 11px "Courier New", monospace'
      ctx.fillStyle = `rgba(228,200,75,${hudA})`
      ctx.fillText(`◆ CT  3 : 2  T  ◆`, W * 0.5 - 55, H * 0.08)
      ctx.fillStyle = `rgba(180,160,100,${hudA * 0.6})`
      ctx.font = '9px "Courier New", monospace'
      ctx.fillText(`MATCH LIVE`, W * 0.5 - 22, H * 0.12)

      // ── Vignette ──────────────────────────────────────────────────────
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.88)
      vig.addColorStop(0, 'transparent')
      vig.addColorStop(1, 'rgba(0,0,0,0.86)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)
    }
  }
}

// ── Scene registry ────────────────────────────────────────────────────────────
const SCENE_FACTORIES = [dotaScene, cs2Scene]

export default function GameBackground() {
  const canvasRef  = useRef(null)
  const rafRef     = useRef(null)
  const timeRef    = useRef(0)
  const scenesRef  = useRef(null)
  const idxRef     = useRef(0)
  const [idx,   setIdx]   = useState(0)
  const [alpha, setAlpha] = useState(1)

  // Build scene objects once
  useEffect(() => {
    scenesRef.current = SCENE_FACTORIES.map(f => f())
  }, [])

  // Auto-rotate scenes every 14s
  useEffect(() => {
    const timer = setInterval(() => {
      setAlpha(0)
      setTimeout(() => {
        const n = (idxRef.current + 1) % SCENE_FACTORIES.length
        idxRef.current = n
        setIdx(n)
        setAlpha(1)
      }, 700)
    }, 14000)
    return () => clearInterval(timer)
  }, [])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const loop = () => {
      timeRef.current += 0.016
      const scenes = scenesRef.current
      if (scenes) {
        const s = scenes[idxRef.current]
        s.draw(ctx, timeRef.current, canvas.width, canvas.height, s.state)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const scenes = scenesRef.current
  const scene  = scenes ? scenes[idx] : null

  return (
    <>
      <canvas ref={canvasRef} style={{
        position: 'fixed', inset: 0, zIndex: 0,
        opacity: alpha * 0.72,
        transition: 'opacity 0.7s ease',
        pointerEvents: 'none',
      }}/>
      {/* Scene badge */}
      {scene && (
        <div style={{
          position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom,0px) + 10px)',
          right: 12, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)',
          border: `1px solid ${scene.color}35`, borderRadius: 9,
          padding: '4px 11px',
          boxShadow: `0 0 14px ${scene.color}18`,
          transition: 'all 0.7s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: scene.color,
            boxShadow: `0 0 6px ${scene.color}`,
            animation: 'blink 1.5s ease-in-out infinite',
          }}/>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700,
            color: scene.color, letterSpacing: '0.14em',
          }}>
            {scene.name}
          </span>
        </div>
      )}
      <style>{`@keyframes blink{0%,100%{opacity:.2}50%{opacity:1}}`}</style>
    </>
  )
}
