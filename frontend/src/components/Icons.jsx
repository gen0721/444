import React from 'react'

// Pure SVG UI icons — no emoji
export const IC = {
  Home:    ({s=22,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Wallet:  ({s=22,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>,
  User:    ({s=22,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Crown:   ({s=22,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20M5 20V10l7-6 7 6v10"/><path d="M9 20v-5h6v5"/></svg>,
  Plus:    ({s=24,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search:  ({s=18,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Star:    ({s=14,c='currentColor',fill='none'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Heart:   ({s=16,c='currentColor',fill='none'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  Back:    ({s=22,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  X:       ({s=18,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:   ({s=16,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Mic:     ({s=20,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  Send:    ({s=18,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Lock:    ({s=16,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  Exit:    ({s=18,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Up:      ({s=16,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  Down:    ({s=16,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  Diamond: ({s=16,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3L8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>,
  Shield:  ({s=16,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Eye:     ({s=16,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Chat:    ({s=20,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Ruble:   ({s=16,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><path d="M7 4h6a4 4 0 010 8H7M7 12h10M7 16h10M7 20V4"/></svg>,
  Sun:     ({s=16,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon:    ({s=16,c='currentColor'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
}

// SVG game icon with gradient
export function GameLogo({ title='', game='', category='', size=48, style={} }) {
  const t = `${title} ${game}`.toLowerCase()
  let ca='#7c6aff', cb='#5b4ee0', shape=0
  if (t.includes('dota'))                        { ca='#c8371a'; cb='#8b0000'; shape=0 }
  else if (t.includes('cs2')||t.includes('csgo')){ ca='#e4c84b'; cb='#2a4f6e'; shape=3 }
  else if (t.includes('gta'))                    { ca='#fcaf17'; cb='#1a1200'; shape=6 }
  else if (t.includes('fortnite'))               { ca='#00d4ff'; cb='#1d4dbd'; shape=2 }
  else if (t.includes('valorant'))               { ca='#ff4655'; cb='#0d1117'; shape=6 }
  else if (t.includes('minecraft'))              { ca='#5aad3b'; cb='#2a5a1a'; shape=5 }
  else if (t.includes('pubg'))                   { ca='#f4a61c'; cb='#3a2800'; shape=4 }
  else if (t.includes('apex'))                   { ca='#da292a'; cb='#3a0808'; shape=6 }
  else if (t.includes('steam'))                  { ca='#66c0f4'; cb='#1b2838'; shape=7 }
  else if (t.includes('instagram'))              { ca='#e1306c'; cb='#833ab4'; shape=7 }
  else if (t.includes('tiktok'))                 { ca='#ff0050'; cb='#010101'; shape=1 }
  else if (t.includes('youtube'))                { ca='#ff0000'; cb='#1a0000'; shape=3 }
  else if (t.includes('telegram'))               { ca='#2aabee'; cb='#229ed9'; shape=7 }
  else if (t.includes('wow')||t.includes('warcraft')){ ca='#c8a964'; cb='#0a0e1a'; shape=0 }
  else if (t.includes('lol')||t.includes('league')){ ca='#c8a964'; cb='#0a0e1a'; shape=2 }
  else if (t.includes('wow'))                    { ca='#4a90e2'; cb='#0a1a5a'; shape=0 }
  else if (category==='games')                   { ca='#7c6aff'; cb='#4035b5'; shape=3 }
  else if (category==='social')                  { ca='#e040fb'; cb='#9c27b0'; shape=7 }
  else                                           { ca='#22d3ee'; cb='#0284c7'; shape=1 }

  const shapes = [
    `<path d="M16 4L28 8V18C28 24 22 28 16 30C10 28 4 24 4 18V8Z" fill="url(#g)" opacity="0.92"/>
     <path d="M16 10L22 13V18C22 22 19 24 16 25C13 24 10 22 10 18V13Z" fill="white" opacity="0.2"/>`,
    `<polygon points="16,3 29,13 24,28 8,28 3,13" fill="url(#g)" opacity="0.92"/>
     <circle cx="16" cy="15" r="5" fill="white" opacity="0.2"/>`,
    `<path d="M16 3L28 11V21L16 29L4 21V11Z" fill="url(#g)" opacity="0.92"/>
     <path d="M16 3L28 11L16 17L4 11Z" fill="white" opacity="0.18"/>`,
    `<path d="M16 4C20 4 26 8 27 18L22 25H10L5 18C6 8 12 4 16 4Z" fill="url(#g)" opacity="0.92"/>
     <circle cx="16" cy="14" r="4" fill="white" opacity="0.22"/>`,
    `<path d="M4 22L7 11L12 17L16 7L20 17L25 11L28 22Z" fill="url(#g)" opacity="0.92"/>
     <rect x="4" y="22" width="24" height="4" rx="2" fill="white" opacity="0.2"/>`,
    `<circle cx="16" cy="16" r="12" fill="url(#g)" opacity="0.92"/>
     <ellipse cx="16" cy="16" rx="15" ry="5" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3"/>`,
    `<path d="M20 4L9 18H16L12 28L23 14H16Z" fill="url(#g)" opacity="0.95"/>`,
    `<circle cx="16" cy="16" r="12" fill="url(#g)" opacity="0.92"/>
     <circle cx="13" cy="13" r="3" fill="white" opacity="0.3"/>
     <circle cx="20" cy="19" r="2" fill="white" opacity="0.18"/>`,
  ]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${ca}"/><stop offset="100%" stop-color="${cb}"/>
    </linearGradient></defs>
    <rect width="32" height="32" rx="8" fill="${ca}18"/>
    ${shapes[shape % shapes.length]}
    <rect width="32" height="32" rx="8" fill="none" stroke="${ca}44" stroke-width="1"/>
  </svg>`

  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25,
      background: `linear-gradient(135deg,${ca}18,${cb}30)`,
      border: `1px solid ${ca}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden', position: 'relative',
      boxShadow: `0 0 ${size*0.3}px ${ca}35, 0 ${size*0.08}px ${size*0.2}px rgba(0,0,0,0.5)`,
      ...style
    }}>
      <img src={`data:image/svg+xml,${encodeURIComponent(svg)}`} width={size*0.75} height={size*0.75} alt=""/>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(255,255,255,0.1),transparent 60%)', pointerEvents:'none' }}/>
    </div>
  )
}

export default GameLogo
