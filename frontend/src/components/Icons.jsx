import React from 'react'

// ─── REAL SVG GAME LOGOS ─────────────────────────────────────────────────
// Using actual brand SVG paths (simplified but recognizable)

export const GameIcons = {
  dota2: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <defs>
        <linearGradient id="dota-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c8371a"/>
          <stop offset="100%" stopColor="#8b0000"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#dota-g)"/>
      <path d="M25 30 L50 18 L75 30 L75 70 L50 82 L25 70 Z" fill="none" stroke="#ff6633" strokeWidth="3" opacity="0.8"/>
      <path d="M50 25 L65 35 L65 65 L50 75 L35 65 L35 35 Z" fill="#cc3300" opacity="0.9"/>
      <text x="50" y="56" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="Arial">D2</text>
    </svg>
  ),

  csgo: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <defs>
        <linearGradient id="cs-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a4f6e"/>
          <stop offset="100%" stopColor="#1a2a3a"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="18" fill="url(#cs-g)"/>
      <path d="M20 65 L20 40 Q20 35 25 33 L40 28 L40 35 L28 38 L28 55 L40 55 L40 45 L50 42 L50 62 L28 62 L28 68 Z" fill="#e4c84b"/>
      <path d="M55 65 L55 28 L72 28 Q82 28 82 38 L82 45 Q82 50 75 52 L82 65 L72 65 L66 53 L63 53 L63 65 Z M63 35 L63 47 L71 47 Q74 47 74 44 L74 38 Q74 35 71 35 Z" fill="#e4c84b"/>
    </svg>
  ),

  gtav: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <defs>
        <linearGradient id="gta-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#000000"/>
          <stop offset="100%" stopColor="#1a1a1a"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="14" fill="url(#gta-g)"/>
      {/* GTA V logo - simplified */}
      <path d="M15 38 L15 62 L28 62 L28 55 L22 55 L22 45 L30 45 L30 55 L36 55 L36 38 L30 38 L30 42 L22 42 L22 38 Z" fill="#fcaf17"/>
      <path d="M40 38 L40 62 L48 62 L48 38 Z" fill="#fcaf17"/>
      <path d="M52 38 L52 62 L60 62 L70 45 L70 62 L78 62 L78 38 L70 38 L60 55 L60 38 Z" fill="#fcaf17"/>
      <path d="M82 38 L82 44 L90 44 L90 62 L96 62 L96 38 Z" fill="#fcaf17" opacity="0.5"/>
    </svg>
  ),

  fortnite: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <defs>
        <linearGradient id="fn-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1d4dbd"/>
          <stop offset="100%" stopColor="#0a1a55"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="16" fill="url(#fn-g)"/>
      <path d="M30 20 L70 20 L70 30 L45 30 L45 45 L65 45 L65 55 L45 55 L45 80 L30 80 Z" fill="white"/>
      <path d="M45 30 L70 30 L70 45 L45 45 Z" fill="#00d4ff" opacity="0.8"/>
    </svg>
  ),

  valorant: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <rect width="100" height="100" rx="12" fill="#0d1117"/>
      <path d="M15 75 L50 20 L60 20 L30 75 Z" fill="#ff4655"/>
      <path d="M40 75 L75 20 L85 20 L55 75 Z" fill="white" opacity="0.9"/>
      <path d="M55 75 L85 75 L85 65 L65 65 Z" fill="#ff4655" opacity="0.7"/>
    </svg>
  ),

  minecraft: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <rect width="100" height="100" rx="10" fill="#5aad3b"/>
      <rect x="25" y="20" width="20" height="20" fill="#8b5a2b"/>
      <rect x="45" y="20" width="20" height="20" fill="#5aad3b"/>
      <rect x="65" y="20" width="10" height="20" fill="#8b5a2b"/>
      <rect x="20" y="40" width="15" height="20" fill="#7bc950"/>
      <rect x="35" y="40" width="30" height="20" fill="#4a8a28"/>
      <rect x="65" y="40" width="15" height="20" fill="#7bc950"/>
      <rect x="25" y="60" width="50" height="20" fill="#8b5a2b"/>
      <rect x="40" y="60" width="20" height="20" fill="#6b3a10"/>
    </svg>
  ),

  steam: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <defs>
        <linearGradient id="steam-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1b2838"/>
          <stop offset="100%" stopColor="#2a475e"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="16" fill="url(#steam-g)"/>
      <path d="M50 15 C30 15 15 30 15 50 C15 68 28 83 45 86 L38 70 C35 69 32 66 32 62 C32 55 38 49 45 49 C52 49 58 55 58 62 C58 66 56 70 52 72 L62 90 C80 85 85 68 85 50 C85 30 70 15 50 15 Z" fill="#66c0f4"/>
      <circle cx="45" cy="62" r="10" fill="#4a90d9" opacity="0.8"/>
      <circle cx="45" cy="62" r="5" fill="white" opacity="0.9"/>
    </svg>
  ),

  pubg: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <rect width="100" height="100" rx="12" fill="#f4a61c"/>
      <rect x="15" y="30" width="70" height="40" rx="5" fill="#1a1200"/>
      <circle cx="35" cy="50" r="12" fill="#f4a61c"/>
      <circle cx="35" cy="50" r="7" fill="#1a1200"/>
      <circle cx="35" cy="50" r="3" fill="#f4a61c"/>
      <rect x="55" y="38" width="25" height="6" rx="2" fill="#f4a61c"/>
      <rect x="55" y="47" width="20" height="6" rx="2" fill="#f4a61c"/>
      <rect x="55" y="56" width="25" height="6" rx="2" fill="#f4a61c"/>
    </svg>
  ),

  apex: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <rect width="100" height="100" rx="12" fill="#da292a"/>
      <path d="M50 15 L80 80 L65 80 L50 45 L35 80 L20 80 Z" fill="white"/>
      <path d="M35 65 L65 65 L60 55 L40 55 Z" fill="#da292a"/>
    </svg>
  ),

  wow: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <defs>
        <radialGradient id="wow-g">
          <stop offset="0%" stopColor="#4a90e2"/>
          <stop offset="100%" stopColor="#0a1a5a"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="14" fill="url(#wow-g)"/>
      <path d="M50 20 C35 20 25 30 25 45 L25 55 C25 65 35 75 50 75 C65 75 75 65 75 55 L75 45 C75 30 65 20 50 20 Z" fill="none" stroke="#f4d03f" strokeWidth="4"/>
      <path d="M35 50 L50 30 L65 50 L58 50 L58 70 L42 70 L42 50 Z" fill="#f4d03f"/>
    </svg>
  ),

  lol: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <rect width="100" height="100" rx="0" fill="#0a0e1a"/>
      <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="none" stroke="#c8a964" strokeWidth="3"/>
      <path d="M50 22 L76 37 L76 63 L50 78 L24 63 L24 37 Z" fill="#0d1428"/>
      <path d="M50 30 L70 42 L70 58 L50 70 L30 58 L30 42 Z" fill="#c8a964" opacity="0.2"/>
      <text x="50" y="57" textAnchor="middle" fill="#c8a964" fontSize="20" fontWeight="900" fontFamily="Arial">LoL</text>
    </svg>
  ),

  roblox: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <rect width="100" height="100" rx="0" fill="#e60000"/>
      <rect x="20" y="20" width="60" height="60" fill="white" transform="rotate(-15 50 50)"/>
      <rect x="30" y="30" width="40" height="40" fill="#e60000" transform="rotate(-15 50 50)"/>
    </svg>
  ),

  // Social
  instagram: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <defs>
        <radialGradient id="ig-g" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#ig-g)"/>
      <rect x="20" y="20" width="60" height="60" rx="14" fill="none" stroke="white" strokeWidth="5"/>
      <circle cx="50" cy="50" r="15" fill="none" stroke="white" strokeWidth="5"/>
      <circle cx="72" cy="28" r="5" fill="white"/>
    </svg>
  ),

  tiktok: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <rect width="100" height="100" rx="16" fill="#010101"/>
      <path d="M65 20 C65 28 71 35 80 36 L80 48 C74 48 68 46 65 42 L65 65 C65 78 54 88 41 88 C28 88 18 78 18 65 C18 52 28 42 41 42 C43 42 45 42 47 43 L47 55 C45 54 43 54 41 54 C35 54 30 59 30 65 C30 71 35 76 41 76 C47 76 52 71 52 65 L52 20 Z" fill="white"/>
      <path d="M65 20 C65 28 71 35 80 36 L80 48 C74 48 68 46 65 42 L65 65 C65 78 54 88 41 88 C28 88 18 78 18 65 C18 52 28 42 41 42 C43 42 45 42 47 43 L47 55 C45 54 43 54 41 54 C35 54 30 59 30 65 C30 71 35 76 41 76 C47 76 52 71 52 65 L52 20 Z" fill="#ff0050" opacity="0.4" transform="translate(-2, -2)"/>
      <path d="M65 20 C65 28 71 35 80 36 L80 48 C74 48 68 46 65 42 L65 65 C65 78 54 88 41 88 C28 88 18 78 18 65 C18 52 28 42 41 42 C43 42 45 42 47 43 L47 55 C45 54 43 54 41 54 C35 54 30 59 30 65 C30 71 35 76 41 76 C47 76 52 71 52 65 L52 20 Z" fill="#00f2ea" opacity="0.4" transform="translate(2, 2)"/>
    </svg>
  ),

  youtube: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <rect width="100" height="100" rx="16" fill="#ff0000"/>
      <path d="M82 36 C80 29 75 28 50 28 C25 28 20 29 18 36 C16 43 16 50 16 50 C16 50 16 57 18 64 C20 71 25 72 50 72 C75 72 80 71 82 64 C84 57 84 50 84 50 C84 50 84 43 82 36 Z" fill="white" opacity="0.15"/>
      <polygon points="40,35 40,65 68,50" fill="white"/>
    </svg>
  ),

  telegram: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <defs>
        <linearGradient id="tg-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2aabee"/>
          <stop offset="100%" stopColor="#229ed9"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#tg-g)"/>
      <path d="M22 48 L78 26 L62 76 L46 62 L70 38 L44 60 Z" fill="white"/>
      <path d="M44 60 L40 74 L50 64 Z" fill="#c8daea"/>
    </svg>
  ),

  spotify: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <circle cx="50" cy="50" r="48" fill="#1db954"/>
      <path d="M28 62 Q50 52 72 60" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"/>
      <path d="M24 52 Q50 40 76 50" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"/>
      <path d="M30 42 Q50 33 70 40" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round"/>
    </svg>
  ),

  netflix: ({ size = 32, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <rect width="100" height="100" fill="#000"/>
      <path d="M25 15 L25 85 L38 85 L38 55 L62 85 L75 85 L75 15 L62 15 L62 45 L38 15 Z" fill="#e50914"/>
      <rect x="25" y="15" width="13" height="70" fill="#e50914" opacity="0.5"/>
      <rect x="62" y="15" width="13" height="70" fill="#e50914" opacity="0.5"/>
    </svg>
  ),
}

// Auto-detect which icon to use
export function detectGameIcon(title = '', game = '', category = '') {
  const t = `${title} ${game}`.toLowerCase()
  if (t.includes('dota')) return { Icon: GameIcons.dota2, color: '#c8371a', label: 'Dota 2', gradient: 'linear-gradient(135deg,#c8371a,#5a0a0a)' }
  if (t.includes('cs2') || t.includes('csgo') || t.includes('counter')) return { Icon: GameIcons.csgo, color: '#e4c84b', label: 'CS2', gradient: 'linear-gradient(135deg,#2a4f6e,#0a1a2a)' }
  if (t.includes('gta')) return { Icon: GameIcons.gtav, color: '#fcaf17', label: 'GTA V', gradient: 'linear-gradient(135deg,#1a1200,#000)' }
  if (t.includes('fortnite')) return { Icon: GameIcons.fortnite, color: '#00d4ff', label: 'Fortnite', gradient: 'linear-gradient(135deg,#1d4dbd,#0a1a55)' }
  if (t.includes('valorant')) return { Icon: GameIcons.valorant, color: '#ff4655', label: 'Valorant', gradient: 'linear-gradient(135deg,#0d1117,#1a0508)' }
  if (t.includes('minecraft')) return { Icon: GameIcons.minecraft, color: '#5aad3b', label: 'Minecraft', gradient: 'linear-gradient(135deg,#2a5a1a,#0a2008)' }
  if (t.includes('pubg')) return { Icon: GameIcons.pubg, color: '#f4a61c', label: 'PUBG', gradient: 'linear-gradient(135deg,#3a2800,#1a1200)' }
  if (t.includes('apex')) return { Icon: GameIcons.apex, color: '#da292a', label: 'Apex', gradient: 'linear-gradient(135deg,#3a0808,#1a0000)' }
  if (t.includes('wow') || t.includes('warcraft')) return { Icon: GameIcons.wow, color: '#4a90e2', label: 'WoW', gradient: 'linear-gradient(135deg,#0a1a5a,#050a2a)' }
  if (t.includes('lol') || t.includes('league')) return { Icon: GameIcons.lol, color: '#c8a964', label: 'LoL', gradient: 'linear-gradient(135deg,#0a0e1a,#000)' }
  if (t.includes('roblox')) return { Icon: GameIcons.roblox, color: '#e60000', label: 'Roblox', gradient: 'linear-gradient(135deg,#3a0000,#1a0000)' }
  if (t.includes('steam')) return { Icon: GameIcons.steam, color: '#66c0f4', label: 'Steam', gradient: 'linear-gradient(135deg,#1b2838,#0a1420)' }
  if (t.includes('instagram') || t.includes('insta')) return { Icon: GameIcons.instagram, color: '#e1306c', label: 'Instagram', gradient: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)' }
  if (t.includes('tiktok')) return { Icon: GameIcons.tiktok, color: '#ff0050', label: 'TikTok', gradient: 'linear-gradient(135deg,#010101,#1a0010)' }
  if (t.includes('youtube') || t.includes('ютуб')) return { Icon: GameIcons.youtube, color: '#ff0000', label: 'YouTube', gradient: 'linear-gradient(135deg,#1a0000,#000)' }
  if (t.includes('telegram') || t.includes('телеграм')) return { Icon: GameIcons.telegram, color: '#2aabee', label: 'Telegram', gradient: 'linear-gradient(135deg,#001a2e,#000a18)' }
  if (t.includes('spotify')) return { Icon: GameIcons.spotify, color: '#1db954', label: 'Spotify', gradient: 'linear-gradient(135deg,#001a0a,#000)' }
  if (t.includes('netflix')) return { Icon: GameIcons.netflix, color: '#e50914', label: 'Netflix', gradient: 'linear-gradient(135deg,#1a0000,#000)' }
  // Category fallbacks
  const catIcons = {
    games:    { Icon: GameIcons.steam, color: '#ff6600', label: 'Game', gradient: 'linear-gradient(135deg,#1a0800,#0a0000)' },
    social:   { Icon: GameIcons.instagram, color: '#ff0080', label: 'Social', gradient: 'linear-gradient(135deg,#1a0010,#000)' },
    software: { Icon: () => <SoftwareIcon size={32}/>, color: '#00d4ff', label: 'Software', gradient: 'linear-gradient(135deg,#001a2a,#000a15)' },
  }
  return catIcons[category] || { Icon: DefaultIcon, color: '#888', label: 'Item', gradient: 'linear-gradient(135deg,#1a1a1a,#0a0a0a)' }
}

function SoftwareIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect width="100" height="100" rx="14" fill="#001a2a"/>
      <rect x="15" y="25" width="70" height="50" rx="6" fill="none" stroke="#00d4ff" strokeWidth="4"/>
      <path d="M30 50 L42 40 L42 60 Z" fill="#00d4ff"/>
      <rect x="50" y="44" width="22" height="5" rx="2" fill="#00d4ff" opacity="0.8"/>
      <rect x="50" y="52" width="16" height="5" rx="2" fill="#00d4ff" opacity="0.5"/>
    </svg>
  )
}

function DefaultIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect width="100" height="100" rx="14" fill="#1a1a1a"/>
      <rect x="20" y="30" width="60" height="8" rx="4" fill="#555"/>
      <rect x="20" y="46" width="40" height="8" rx="4" fill="#444"/>
      <rect x="20" y="62" width="50" height="8" rx="4" fill="#555"/>
    </svg>
  )
}

// ─── UI ICON COMPONENTS (real SVG, no emoji) ─────────────────────────────
export const IC = {
  Home: ({ s=22, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Wallet: ({ s=22, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/>
    </svg>
  ),
  Plus: ({ s=26, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  User: ({ s=22, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Crown: ({ s=22, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  Shield: ({ s=22, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Check: ({ s=22, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: ({ s=22, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Send: ({ s=22, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Back: ({ s=22, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  Search: ({ s=18, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Sun: ({ s=18, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  Moon: ({ s=18, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  ),
  Exit: ({ s=20, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Up: ({ s=18, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
  ),
  Down: ({ s=18, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
  ),
  Star: ({ s=16, c='currentColor', filled=false }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={filled?c:'none'} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Chat: ({ s=22, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  Alert: ({ s=22, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <triangle points="10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Ruble: ({ s=18, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <path d="M7 4 h6 a4 4 0 0 1 0 8 H7 M7 12 h10 M7 16 h10 M7 20 v-16"/>
    </svg>
  ),
  Eye: ({ s=16, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Diamond: ({ s=18, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3L8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>
    </svg>
  ),
  Lock: ({ s=16, c='currentColor' }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  ),
}

// ─── GAME LOGO COMPONENT ─────────────────────────────────────────────────
export function GameLogo({ title, game, category, size = 48, style = {} }) {
  const info = detectGameIcon(title, game, category)
  const { Icon } = info
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: info.gradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
      boxShadow: `0 0 ${size * 0.35}px ${info.color}50, 0 2px ${size * 0.2}px rgba(0,0,0,0.6)`,
      border: `1px solid ${info.color}30`,
      position: 'relative',
      ...style
    }}>
      <Icon size={size * 0.72}/>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.08),transparent 60%)', pointerEvents: 'none' }}/>
    </div>
  )
}

export default GameLogo
