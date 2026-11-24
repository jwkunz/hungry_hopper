// Placeholder world art drawn with canvas primitives (real art comes later).

// Deterministic pseudo-random in [0,1) from an integer
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function drawBackground(ctx, cam, cfg, level) {
  const { view_w: W, view_h: H } = cfg
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#16302a')
  sky.addColorStop(0.7, '#2c5a43')
  sky.addColorStop(1, '#3b6b4a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // Far hills (slow parallax)
  ctx.fillStyle = '#1b3d30'
  ctx.beginPath()
  ctx.moveTo(0, H)
  for (let sx = 0; sx <= W + 20; sx += 20) {
    const wx = sx + cam * 0.2
    ctx.lineTo(sx, level.ground_y - 90 - 40 * Math.sin(wx / 170) - 25 * Math.sin(wx / 71))
  }
  ctx.lineTo(W, H)
  ctx.fill()

  // Reeds (medium parallax)
  ctx.fillStyle = '#244d37'
  const f = 0.5
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

export function drawWorld(ctx, level, cam, cfg) {
  const left = cam - 50
  const right = cam + cfg.view_w + 50

  // Ground
  for (const s of level.segments) {
    if (s.x > right || s.x + s.w < left) continue
    ctx.fillStyle = '#3a2a1a'
    ctx.fillRect(s.x, level.ground_y, s.w, cfg.view_h - level.ground_y)
    ctx.fillStyle = '#4a8a3c'
    ctx.fillRect(s.x, level.ground_y, s.w, 12)
    ctx.fillStyle = '#5fa24a'
    ctx.fillRect(s.x, level.ground_y, s.w, 4)
  }

  // Puddles (decorative)
  for (const p of level.puddles) {
    if (p.x > right || p.x + p.w < left) continue
    ctx.fillStyle = '#2b6a86'
    ctx.beginPath()
    ctx.ellipse(p.x + p.w / 2, level.ground_y + 4, p.w / 2, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.beginPath()
    ctx.ellipse(p.x + p.w / 2 - p.w * 0.12, level.ground_y + 2, p.w * 0.18, 2, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Leaves (collision top = leaf.y)
  for (const l of level.leaves) {
    if (l.x > right || l.x + l.w < left) continue
    const cx = l.x + l.w / 2
    ctx.fillStyle = '#3f9a45'
    ctx.beginPath()
    ctx.ellipse(cx, l.y + 7, l.w / 2, 9, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2a6e30'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(l.x + 8, l.y + 7)
    ctx.lineTo(l.x + l.w - 8, l.y + 7)
    ctx.stroke()
  }

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
