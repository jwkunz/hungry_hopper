// Placeholder world art drawn with canvas primitives (real art comes later).

const DEFAULT_THEME = {
  sky: ['#16302a', '#2c5a43', '#3b6b4a'], hills: '#1b3d30', decor: '#244d37', decor_kind: 'reeds',
  mist: '205,232,218', dirt: '#3a2a1a', grass: '#4a8a3c', grass2: '#5fa24a',
  leaf: '#3f9a45', leaf_vein: '#2a6e30', flies: '235,255,170', weather: null,
}

// Deterministic pseudo-random in [0,1) from an integer
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function drawBackground(ctx, cam, cfg, level, t = 0) {
  const { view_w: W, view_h: H } = cfg
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  const th = level.theme ?? DEFAULT_THEME
  sky.addColorStop(0, th.sky[0])
  sky.addColorStop(0.7, th.sky[1])
  sky.addColorStop(1, th.sky[2])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // Far hills (slow parallax)
  ctx.fillStyle = th.hills
  ctx.beginPath()
  ctx.moveTo(0, H)
  for (let sx = 0; sx <= W + 20; sx += 20) {
    const wx = sx + cam * 0.2
    ctx.lineTo(sx, level.ground_y - 90 - 40 * Math.sin(wx / 170) - 25 * Math.sin(wx / 71))
  }
  ctx.lineTo(W, H)
  ctx.fill()

  // Background decor (medium parallax): reeds, cypress trunks or honeycomb
  ctx.fillStyle = th.decor
  const f = 0.5
  if (th.decor_kind === 'trees') {
    const spacing = 150
    const first = Math.floor((cam * f) / spacing)
    for (let i = first; i < first + W / spacing + 2; i++) {
      const sx = i * spacing - cam * f
      const w = 26 + hash(i) * 22
      ctx.beginPath()
      ctx.moveTo(sx - w, level.ground_y)
      ctx.quadraticCurveTo(sx - w * 0.3, level.ground_y - 160, sx - w * 0.35, 0)
      ctx.lineTo(sx + w * 0.35, 0)
      ctx.quadraticCurveTo(sx + w * 0.3, level.ground_y - 160, sx + w, level.ground_y)
      ctx.fill()
    }
  } else if (th.decor_kind === 'hex') {
    const r = 46
    const dx = r * 1.732
    ctx.strokeStyle = th.decor
    ctx.lineWidth = 3
    const ox = -((cam * f) % dx)
    for (let row = 0; row < 8; row++) {
      for (let c = -1; c < W / dx + 2; c++) {
        const x = ox + c * dx + (row % 2 ? dx / 2 : 0)
        const y = row * r * 1.5 + 10
        ctx.beginPath()
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3
          const px = x + Math.cos(a) * r * 0.92
          const py = y + Math.sin(a) * r * 0.92
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        }
        ctx.closePath()
        if ((hash(c + row * 31 + Math.floor((cam * f) / dx)) < 0.18)) { ctx.fillStyle = 'rgba(255,200,70,.16)'; ctx.fill() }
        ctx.stroke()
      }
    }
  } else {
    const spacing = 46
    const first = Math.floor((cam * f) / spacing)
    for (let i = first; i < first + W / spacing + 2; i++) {
      const sx = i * spacing - cam * f
      const h = 70 + hash(i) * 90
      ctx.fillRect(sx, level.ground_y - h, 4, h)
      ctx.beginPath()
      ctx.ellipse(sx + 2, level.ground_y - h, 5, 14, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Drifting mist
  for (let band = 0; band < (quality.low ? 1 : 3); band++) {
    ctx.fillStyle = `rgba(${th.mist},${0.032 + band * 0.008})`
    const y = level.ground_y - 30 - band * 55
    const span = W + 500
    for (let i = 0; i < 6; i++) {
      const x = ((((i * 230 + t * (0.012 + band * 0.006) - cam * (0.3 + band * 0.12)) % span) + span) % span) - 250
      ctx.beginPath()
      ctx.ellipse(x, y + Math.sin(t / 2000 + i) * 6, 190, 20 + band * 6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Ambient fireflies (decoration only; the shield ones are bigger and real)
  const glow = glowSprite(th.flies)
  const n = quality.low ? 6 : 16
  for (let i = 0; i < n; i++) {
    const blink = Math.sin(t / 600 + i * 2.3)
    if (blink < 0) continue
    const x = ((((hash(i) * (W + 300)) - cam * 0.7 - t * 0.01) % (W + 300)) + (W + 300)) % (W + 300) - 150
    const y = level.ground_y - 50 - hash(i + 3) * 230 + Math.sin(t / 900 + i) * 10
    ctx.globalAlpha = 0.7 * blink
    ctx.drawImage(glow, x - 9, y - 9, 18, 18)
  }
  ctx.globalAlpha = 1

  drawWeather(ctx, cam, cfg, level, t)
}

// ---- weather & atmosphere ----
export const quality = { low: false } // set from the settings (see GameCanvas)

const glowCache = new Map()
function glowSprite(rgb) {
  let c = glowCache.get(rgb)
  if (!c) {
    if (typeof document === 'undefined') return { width: 1, height: 1 } // node tests never draw
    c = document.createElement('canvas')
    c.width = c.height = 18
    const g = c.getContext('2d')
    const gr = g.createRadialGradient(9, 9, 0, 9, 9, 9)
    gr.addColorStop(0, `rgba(${rgb},1)`)
    gr.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = gr
    g.fillRect(0, 0, 18, 18)
    glowCache.set(rgb, c)
  }
  return c
}

// Lightning flashes in the storm: a bright pulse every few seconds
export function flashAmount(level, t) {
  if (level.theme?.weather !== 'storm') return 0
  const period = 7000
  const k = (t % period) / period
  const pulses = [[0.55, 0.06], [0.6, 0.04], [0.63, 0.1]]
  let a = 0
  for (const [c, w] of pulses) a = Math.max(a, Math.max(0, 1 - Math.abs(k - c) / w))
  return a * 0.55
}

function drawWeather(ctx, cam, cfg, level, t) {
  const kind = level.theme?.weather
  if (!kind) return
  const { view_w: W, view_h: H } = cfg
  ctx.save()
  if (kind === 'storm') {
    ctx.strokeStyle = 'rgba(170,190,230,0.35)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    const n = quality.low ? 45 : 110
    for (let i = 0; i < n; i++) {
      const x = ((hash(i) * (W + 200) - t * 0.25 - cam * 0.05) % (W + 200) + W + 200) % (W + 200) - 60
      const y = ((hash(i + 91) * H + t * 0.9) % (H + 60)) - 30
      ctx.moveTo(x, y)
      ctx.lineTo(x - 5, y + 16)
    }
    ctx.stroke()
    const fl = flashAmount(level, t)
    if (fl > 0) { ctx.fillStyle = `rgba(215,225,255,${fl})`; ctx.fillRect(0, 0, W, H) }
  } else {
    // drifting motes: spores (bog), pollen (forest), embers (hive)
    const col = kind === 'embers' ? '255,170,60' : kind === 'spores' ? '190,230,110' : '200,255,230'
    const n = quality.low ? 8 : 22
    for (let i = 0; i < n; i++) {
      const rise = kind === 'embers' ? -1 : kind === 'spores' ? 0.2 : 0.4
      const x = ((hash(i + 7) * (W + 200) - cam * 0.6 + Math.sin(t / 1400 + i) * 22 + t * 0.012 * (i % 2 ? 1 : -1)) % (W + 200) + W + 200) % (W + 200) - 100
      const y = (((hash(i + 40) * H + t * 0.02 * rise * 4) % H) + H) % H
      ctx.fillStyle = `rgba(${col},${0.25 + 0.25 * Math.sin(t / 500 + i)})`
      ctx.beginPath()
      ctx.arc(x, y, 1.6 + (i % 3) * 0.7, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

export function drawWorld(ctx, level, cam, cfg, activeCheckpoint = -1) {
  const th = level.theme ?? DEFAULT_THEME
  const left = cam - 50
  const right = cam + cfg.view_w + 50

  // Ground
  for (const s of level.segments) {
    if (s.x > right || s.x + s.w < left) continue
    ctx.fillStyle = th.dirt
    ctx.fillRect(s.x, level.ground_y, s.w, cfg.view_h - level.ground_y)
    ctx.fillStyle = th.grass
    ctx.fillRect(s.x, level.ground_y, s.w, 12)
    ctx.fillStyle = th.grass2
    ctx.fillRect(s.x, level.ground_y, s.w, 4)
  }

  // Pond basins (the water itself is drawn over everything in drawWater)
  for (const p of level.ponds) {
    if (p.x > right || p.x + p.w < left) continue
    ctx.fillStyle = '#21170e'
    ctx.fillRect(p.x, level.ground_y, p.w, cfg.view_h - level.ground_y)
    ctx.fillStyle = '#4a3a22'
    ctx.fillRect(p.x, p.floor_y, p.w, 8)
    ctx.fillStyle = '#5b4a2c'
    for (let x = p.x + 14; x < p.x + p.w - 8; x += 38) ctx.fillRect(x, p.floor_y - 3, 12, 5) // pebbles
  }

  // Mud patches
  for (const m of level.mud) {
    if (m.x > right || m.x + m.w < left) continue
    ctx.fillStyle = '#2b1d10'
    ctx.beginPath()
    ctx.ellipse(m.x + m.w / 2, level.ground_y + 4, m.w / 2, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.beginPath()
    ctx.ellipse(m.x + m.w / 2 - m.w * 0.15, level.ground_y + 2, m.w * 0.2, 2, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Leaves (collision top = leaf.y)
  for (const l of level.leaves) {
    if (l.x > right || l.x + l.w < left) continue
    const cx = l.x + l.w / 2
    ctx.fillStyle = th.leaf
    ctx.beginPath()
    ctx.ellipse(cx, l.y + 7, l.w / 2, 9, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = th.leaf_vein
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(l.x + 8, l.y + 7)
    ctx.lineTo(l.x + l.w - 8, l.y + 7)
    ctx.stroke()
  }

  // Checkpoints: a lily pad with a flag; turns gold once reached
  level.checkpoints.forEach((cp, i) => {
    if (cp.x > right || cp.x < left) return
    const on = i <= activeCheckpoint
    ctx.fillStyle = '#3f9a45'
    ctx.beginPath()
    ctx.ellipse(cp.x, level.ground_y + 2, 34, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#6b4a2a'
    ctx.fillRect(cp.x - 2, level.ground_y - 62, 4, 62)
    ctx.fillStyle = on ? '#ffd84a' : '#9aa59c'
    ctx.beginPath()
    ctx.moveTo(cp.x + 2, level.ground_y - 62)
    ctx.lineTo(cp.x + 36, level.ground_y - 50)
    ctx.lineTo(cp.x + 2, level.ground_y - 38)
    ctx.fill()
  })

  // Goal marker
  ctx.fillStyle = '#e8d44d'
  ctx.fillRect(level.goal_x, level.ground_y - 90, 5, 90)
  ctx.fillStyle = '#d9534f'
  ctx.beginPath()
  ctx.moveTo(level.goal_x + 5, level.ground_y - 90)
  ctx.lineTo(level.goal_x + 55, level.ground_y - 72)
  ctx.lineTo(level.goal_x + 5, level.ground_y - 54)
  ctx.fill()
}

export function drawHud(ctx, game) {
  const { cfg } = game
  ctx.save()
  ctx.font = 'bold 22px system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(0,0,0,.65)'
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  const lv = `LIVES ${'♥'.repeat(Math.max(0, game.lives))}`
  ctx.strokeText(lv, 16, 32)
  ctx.fillStyle = '#ff7a8a'
  ctx.fillText(lv, 16, 32)
  if (game.level.secrets?.length) {
    ctx.font = 'bold 15px system-ui, sans-serif'
    ctx.fillStyle = '#ffd84a'
    const st = `★ ${game.secrets_run.size}/${game.level.secrets.length}`
    ctx.strokeText(st, 16, 76)
    ctx.fillText(st, 16, 76)
    ctx.font = 'bold 22px system-ui, sans-serif'
  }
  const frac = game.frog.breath_ms / cfg.breath_ms
  if (frac < 0.999) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'
    ctx.fillRect(16, 42, 112, 14)
    ctx.fillStyle = frac > 0.5 ? '#6fd3f2' : frac > 0.25 ? '#ffd24a' : '#ff5a5a'
    ctx.fillRect(18, 44, 108 * frac, 10)
    ctx.font = 'bold 11px system-ui, sans-serif'
    ctx.fillStyle = '#fff'
    ctx.fillText('AIR', 134, 54)
    ctx.font = 'bold 22px system-ui, sans-serif'
  }
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'right'
  const txt = `SCORE ${String(game.score).padStart(6, '0')}`
  ctx.strokeText(txt, cfg.view_w - 72, 32)
  ctx.fillText(txt, cfg.view_w - 72, 32)
  if (game.frog.shield) {
    ctx.font = 'bold 15px system-ui, sans-serif'
    ctx.fillStyle = '#ffe97a'
    ctx.strokeText('◉ SHIELD', cfg.view_w - 72, 54)
    ctx.fillText('◉ SHIELD', cfg.view_w - 72, 54)
  }
  // Power-up timers and the combo
  let hy = game.frog.shield ? 76 : 54
  const line = (txt, color) => {
    ctx.font = 'bold 15px system-ui, sans-serif'
    ctx.fillStyle = color
    ctx.strokeText(txt, cfg.view_w - 72, hy)
    ctx.fillText(txt, cfg.view_w - 72, hy)
    hy += 22
  }
  if (game.frog.glide_ms > 0) line(`GLIDE ${(game.frog.glide_ms / 1000).toFixed(0)}s`, '#8fe8ff')
  if (game.frog.light_ms > 0) line(`GLOW ${(game.frog.light_ms / 1000).toFixed(0)}s`, '#9dffcf')
  if (game.frog.fire_ms > 0) line(`FIRE ${(game.frog.fire_ms / 1000).toFixed(0)}s`, '#ffa04a')
  if (game.combo >= 2 && game.combo_ms > 0) line(`COMBO x${Math.min(cfg.combo_max, game.combo)}`, '#ffe97a')
  // Boss health: one eye per hit point, shown once the fight has begun
  const boss = game.boss
  if (boss && game.arena_active && boss.phase !== 'dormant' && !game.boss_defeated) {
    const cx = cfg.view_w / 2
    ctx.textAlign = 'center'
    ctx.font = 'bold 13px system-ui, sans-serif'
    ctx.lineWidth = 3
    ctx.fillStyle = '#ffd0d6'
    ctx.strokeText('FLY BOSS', cx, 66)
    ctx.fillText('FLY BOSS', cx, 66)
    for (let i = 0; i < boss.max_hp; i++) {
      const x = cx + (i - (boss.max_hp - 1) / 2) * 30
      ctx.beginPath(); ctx.arc(x, 82, 10, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill()
      if (i < boss.hp) {
        ctx.beginPath(); ctx.arc(x, 82, 7, 0, Math.PI * 2)
        ctx.fillStyle = '#e0334d'; ctx.fill()
        ctx.beginPath(); ctx.arc(x - 2, 80, 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill()
      }
    }
  }
  ctx.restore()
}

// Hitboxes and the tongue segment (enable with ?debug in the URL)
export function drawDebug(ctx, game) {
  ctx.save()
  ctx.lineWidth = 1
  ctx.strokeStyle = '#0f0'
  const f = game.frog.hitbox
  ctx.strokeRect(f.x, f.y, f.w, f.h)
  ctx.strokeStyle = '#f0f'
  for (const e of game.entities) {
    const h = e.hitbox
    ctx.strokeRect(h.x, h.y, h.w, h.h)
  }
  const seg = game.frog.tongueSegment()
  if (seg) {
    ctx.strokeStyle = '#ff0'
    ctx.lineWidth = game.cfg.tongue_thickness
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.moveTo(seg.x1, seg.y1)
    ctx.lineTo(seg.x2, seg.y2)
    ctx.stroke()
  }
  ctx.restore()
}

import { TITLE_LEVELS_BTN, SELECT_BACK_BTN, SELECT_CARDS } from './ui.js'

// Title / game-over / level-complete screens drawn over the idling world
export function drawScreen(ctx, game) {
  const { cfg } = game
  const W = cfg.view_w
  const H = cfg.view_h
  const cx = W / 2
  const blink = Math.floor(game.state_ms / 500) % 2 === 0
  const text = (str, y, size, color = '#fff') => {
    ctx.font = `bold ${size}px system-ui, sans-serif`
    ctx.lineWidth = Math.max(3, size / 7)
    ctx.strokeStyle = 'rgba(0,0,0,.7)'
    ctx.fillStyle = color
    ctx.strokeText(str, cx, y)
    ctx.fillText(str, cx, y)
  }
  ctx.save()
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(5,15,10,0.55)'
  ctx.fillRect(0, 0, W, H)
  const hi = `HIGH SCORE ${String(game.high_score).padStart(6, '0')}`
  const prompt = 'TAP  or press JUMP / TONGUE'

  const button = (r, label, active = true) => {
    ctx.fillStyle = active ? 'rgba(20,60,40,.85)' : 'rgba(40,40,40,.7)'
    ctx.strokeStyle = active ? '#8fe37a' : '#777'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.stroke()
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.fillStyle = active ? '#d8ffd0' : '#999'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1)
    ctx.textBaseline = 'alphabetic'
  }
  const stars = (found, total) => '★'.repeat(found) + '☆'.repeat(Math.max(0, total - found))
  const campaign = !!game.levels
  const lvName = campaign ? `${game.level_index + 1}. ${game.level.name}` : ''

  switch (game.state) {
    case 'title':
      text('HUNGRY', 140, 78, '#8fe37a')
      text('HOPPER', 215, 78, '#8fe37a')
      if (campaign) text(lvName, 262, 22, '#d8ffd0')
      text(hi, campaign ? 292 : 270, 22, '#ffe97a')
      if (blink) text(prompt + ' to start', campaign ? 345 : 330, 24)
      if (campaign) button(TITLE_LEVELS_BTN, 'LEVELS')
      text(`v${typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : ''}`, H - 16, 14, '#9fb5a6')
      break
    case 'select': {
      text('SELECT LEVEL', 86, 48, '#8fe37a')
      game.levels.forEach((L, i) => {
        const r = SELECT_CARDS[i]
        const unlocked = game.isUnlocked(i)
        const sel = i === game.select_index
        ctx.fillStyle = unlocked ? 'rgba(15,50,35,.9)' : 'rgba(30,30,30,.85)'
        ctx.strokeStyle = sel ? '#ffe97a' : unlocked ? '#4f9a60' : '#555'
        ctx.lineWidth = sel ? 5 : 3
        ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill(); ctx.stroke()
        const cxx = r.x + r.w / 2
        ctx.font = 'bold 44px system-ui, sans-serif'
        ctx.fillStyle = unlocked ? '#8fe37a' : '#666'
        ctx.fillText(unlocked ? String(i + 1) : '🔒', cxx, r.y + 58)
        ctx.font = 'bold 18px system-ui, sans-serif'
        ctx.fillStyle = unlocked ? '#fff' : '#888'
        const words = L.name.split(' ')
        if (words.length > 1 && L.name.length > 12) {
          ctx.fillText(words.slice(0, -1).join(' '), cxx, r.y + 96)
          ctx.fillText(words[words.length - 1], cxx, r.y + 118)
        } else ctx.fillText(L.name, cxx, r.y + 104)
        ctx.font = '13px system-ui, sans-serif'
        ctx.fillStyle = unlocked ? '#b9d8c0' : '#777'
        ctx.fillText(unlocked ? L.subtitle : 'Locked', cxx, r.y + 148)
        if (unlocked) {
          const found = (game.progress.secrets[L.id] ?? []).length
          ctx.font = 'bold 20px system-ui, sans-serif'
          ctx.fillStyle = '#ffd84a'
          ctx.fillText(stars(found, L.secrets), cxx, r.y + 182)
          ctx.font = '13px system-ui, sans-serif'
          ctx.fillStyle = '#ffe97a'
          ctx.fillText(`BEST ${String(game.progress.best[L.id] ?? 0).padStart(6, '0')}`, cxx, r.y + 208)
        }
      })
      button(SELECT_BACK_BTN, '◀ BACK')
      if (blink) text('TAP a level, or ◀ ▶ and JUMP', 440, 20)
      break
    }
    case 'gameover':
      text('GAME OVER', 170, 72, '#ff7a7a')
      text(`SCORE ${String(game.score).padStart(6, '0')}`, 235, 30)
      text(game.new_high ? '★ NEW HIGH SCORE! ★' : hi, 280, 22, '#ffe97a')
      if (blink) text(prompt, 350, 24)
      break
    case 'complete': {
      const last = !campaign || game.level_index + 1 >= game.levels.length
      text(last && campaign ? 'YOU BEAT THE HIVE!' : 'LEVEL COMPLETE!', 140, 58, '#8fe37a')
      text(`Life bonus  +${game.bonus ?? 0}`, 200, 24, '#ffe97a')
      text(`SCORE ${String(game.score).padStart(6, '0')}`, 245, 32)
      if (game.level.secrets?.length) text(`SECRETS ${stars(game.secrets_run.size, game.level.secrets.length)}`, 285, 24, '#ffd84a')
      text(game.new_high ? '★ NEW HIGH SCORE! ★' : hi, 320, 22, '#ffe97a')
      if (blink) text(last ? prompt : prompt.replace('TAP ', 'TAP for the next level: '), 380, 22)
      break
    }
  }
  ctx.restore()
}

// Translucent water over the ponds (drawn after the frog so it looks submerged)
export function drawWater(ctx, level, cam, cfg, t, particles = []) {
  for (const p of level.ponds) {
    if (p.x > cam + cfg.view_w + 50 || p.x + p.w < cam - 50) continue
    const h = p.floor_y - p.surface_y
    const g = ctx.createLinearGradient(0, p.surface_y, 0, p.floor_y)
    g.addColorStop(0, 'rgba(60,140,170,0.50)')
    g.addColorStop(1, 'rgba(20,70,100,0.72)')
    ctx.fillStyle = g
    ctx.fillRect(p.x, p.surface_y, p.w, h)
    ctx.strokeStyle = 'rgba(200,235,245,0.85)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = 0; x <= p.w; x += 8) {
      const y = p.surface_y + Math.sin((x + t / 6) / 11) * 1.8
      if (x === 0) ctx.moveTo(p.x + x, y)
      else ctx.lineTo(p.x + x, y)
    }
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(220,245,255,0.8)'
  ctx.lineWidth = 1.5
  for (const b of particles) {
    ctx.globalAlpha = Math.max(0, 1 - b.age / 1200)
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}


// ---- dark areas ----
// Everything that lights up the dark: [{ x, y, r }] in world coordinates.
export function lightSources(game) {
  const { cfg, frog } = game
  const out = []
  if (!frog.dead) {
    let r = cfg.base_light
    if (frog.light_ms > 0) r = cfg.base_light + (cfg.light_radius - cfg.base_light) * Math.min(1, frog.light_ms / 2000)
    out.push({ x: frog.x + frog.w / 2, y: frog.y + frog.h / 2, r })
    if (frog.fire_ms > 0) {
      const tip = frog.tongueSegment()
      if (tip) out.push({ x: tip.x2, y: tip.y2, r: 85 })
    }
  }
  for (const e of game.entities) if (e.light && e.alive !== false) out.push({ x: e.cx, y: e.cy, r: e.light })
  return out
}

let darkLayer = null
// Draws the darkness on top of the world (before the HUD). Dark where
// level.darknessAt(x) > 0, with soft holes cut around every light source.
export function drawDarkness(ctx, game, cam) {
  const { cfg, level } = game
  if (!level.dark || typeof document === 'undefined') return
  const W = cfg.view_w
  const H = cfg.view_h
  const left = level.darknessAt(cam)
  const right = level.darknessAt(cam + W)
  let any = left > 0 || right > 0
  if (!any) for (let x = cam; x <= cam + W; x += 120) if (level.darknessAt(x) > 0) { any = true; break }
  if (!any) return
  if (!darkLayer) darkLayer = document.createElement('canvas')
  const scale = ctx.getTransform().a || 1
  const pw = Math.round(W * scale)
  const ph = Math.round(H * scale)
  if (darkLayer.width !== pw || darkLayer.height !== ph) { darkLayer.width = pw; darkLayer.height = ph }
  const d = darkLayer.getContext('2d')
  d.setTransform(scale, 0, 0, scale, 0, 0)
  d.globalCompositeOperation = 'source-over'
  d.clearRect(0, 0, W, H)
  // horizontal gradient of darkness across the screen
  const lift = 1 - Math.min(0.85, flashAmount(level, game.elapsed_ms) * 1.4)
  const grad = d.createLinearGradient(0, 0, W, 0)
  const stops = 24
  for (let i = 0; i <= stops; i++) {
    const a = level.darknessAt(cam + (W * i) / stops) * cfg.dark_alpha * lift
    grad.addColorStop(i / stops, `rgba(2,6,14,${a.toFixed(3)})`)
  }
  d.fillStyle = grad
  d.fillRect(0, 0, W, H)
  // holes
  d.globalCompositeOperation = 'destination-out'
  for (const l of lightSources(game)) {
    const x = l.x - cam
    const g = d.createRadialGradient(x, l.y, 0, x, l.y, l.r)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(0.55, 'rgba(0,0,0,0.85)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    d.fillStyle = g
    d.fillRect(x - l.r, l.y - l.r, l.r * 2, l.r * 2)
  }
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(darkLayer, 0, 0)
  ctx.restore()
}
