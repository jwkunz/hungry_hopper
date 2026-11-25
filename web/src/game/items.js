// M7 items: power-up pickups (dragonfly = glide, pepper = fire tongue) and
// grapple anchors (glowing knobs on vines that the tongue can latch onto).
import { Entity } from './entities.js'

const TAU = Math.PI * 2

class Pickup extends Entity {
  constructor(cx, cy, w, h, power) {
    super(cx, cy, w, h)
    this.kind = 'pickup'
    this.power = power
    this.base_x = cx
    this.base_y = cy
    this.t = (cx * 5) % 1000
  }
  update(dt_ms) {
    this.t += dt_ms
    if (this.eaten) return
    if (!this.alive) { this.gone = true; return }
    this._float()
  }
}

// ---------------------------------------------------------------- DRAGONFLY
// Eat or touch it: for a while, hold JUMP in the air to glide down slowly.
export class Dragonfly extends Pickup {
  constructor(x, y) { super(x, y, 44, 22, 'glide') }
  _float() {
    this.cy = this.base_y + Math.sin(this.t / 420) * 9
    this.cx = this.base_x + Math.sin(this.t / 900) * 16
  }
  draw(ctx) {
    if (this.scale_mul < 0.03) return
    const s = this.scale_mul
    ctx.save()
    ctx.translate(this.cx, this.cy)
    ctx.scale(s, s)
    const flap = Math.sin(this.t / 28)
    // glow
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34)
    g.addColorStop(0, 'rgba(120,255,230,.35)'); g.addColorStop(1, 'rgba(120,255,230,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill()
    // wings (two pairs)
    ctx.fillStyle = 'rgba(200,245,255,.55)'
    ctx.strokeStyle = 'rgba(120,200,220,.9)'; ctx.lineWidth = 1
    for (const [ox, k] of [[2, 1], [-4, -1]]) {
      for (const sgn of [-1, 1]) {
        ctx.save()
        ctx.translate(ox, -2)
        ctx.rotate(sgn * (0.25 + 0.35 * flap * k))
        ctx.beginPath(); ctx.ellipse(0, sgn * -13, 4.5, 13, 0, 0, TAU); ctx.fill(); ctx.stroke()
        ctx.restore()
      }
    }
    // body: long segmented tail, round head
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#1fb5a4' : '#12806f'
      ctx.beginPath(); ctx.ellipse(-4 - i * 5, 0, 3.4, 2.6, 0, 0, TAU); ctx.fill()
    }
    ctx.fillStyle = '#2bd3bf'
    ctx.beginPath(); ctx.ellipse(6, 0, 7, 5, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#ff6b8a'
    ctx.beginPath(); ctx.arc(11, -2.5, 3.6, 0, TAU); ctx.arc(11, 2.5, 3.6, 0, TAU); ctx.fill()
    ctx.restore()
  }
}

// ---------------------------------------------------------------- PEPPER
// Eat or touch it: your tongue turns into fire for a while. It burns armour
// (beetle, crane) and torches whole patches of briar.
export class Pepper extends Pickup {
  constructor(x, y) { super(x, y, 26, 34, 'fire') }
  _float() { this.cy = this.base_y + Math.sin(this.t / 350) * 3 }
  draw(ctx) {
    if (this.scale_mul < 0.03) return
    const s = this.scale_mul
    ctx.save()
    ctx.translate(this.cx, this.cy)
    ctx.scale(s, s)
    const pulse = 0.7 + 0.3 * Math.sin(this.t / 130)
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34)
    g.addColorStop(0, `rgba(255,140,40,${0.45 * pulse})`); g.addColorStop(1, 'rgba(255,100,20,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill()
    ctx.rotate(-0.35)
    // chili body (curved)
    ctx.fillStyle = '#d6281e'
    ctx.beginPath()
    ctx.moveTo(-7, -12)
    ctx.bezierCurveTo(10, -12, 12, 6, 2, 16)
    ctx.bezierCurveTo(8, 4, 2, -2, -7, -2)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.35)'
    ctx.beginPath(); ctx.ellipse(-2, -8, 4, 2, 0.2, 0, TAU); ctx.fill()
    // green cap + stem
    ctx.fillStyle = '#2f8f3a'
    ctx.beginPath(); ctx.ellipse(-8, -8, 4, 7, 0, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#2f8f3a'; ctx.lineWidth = 3; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-9, -13); ctx.quadraticCurveTo(-10, -19, -5, -21); ctx.stroke()
    ctx.restore()
  }
}

// ---------------------------------------------------------------- ANCHOR
// A glowing knob hanging on a vine. Shoot your tongue at it: it reels you in,
// you hang there, then press JUMP to fling yourself off (hold left/right to
// choose the direction). Great for crossing pits.
export class Anchor extends Entity {
  constructor(x, y) {
    super(x, y, 36, 36)
    this.kind = 'anchor'
    this.grapple = true
    this.harmless = true // never hurts you
    this.edible = false
    this.t = (x * 11) % 1000
  }
  update(dt_ms) { this.t += dt_ms }
  draw(ctx) {
    const pulse = 0.7 + 0.3 * Math.sin(this.t / 220)
    ctx.save()
    // vine from above
    ctx.strokeStyle = '#2f5b2a'; ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(this.cx, this.cy - 520)
    ctx.bezierCurveTo(this.cx + 8, this.cy - 300, this.cx - 8, this.cy - 120, this.cx, this.cy - 14)
    ctx.stroke()
    ctx.strokeStyle = '#4c8a3c'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(this.cx + 1, this.cy - 520)
    ctx.bezierCurveTo(this.cx + 9, this.cy - 300, this.cx - 7, this.cy - 120, this.cx + 1, this.cy - 14)
    ctx.stroke()
    // glow + knob
    const g = ctx.createRadialGradient(this.cx, this.cy, 2, this.cx, this.cy, 32)
    g.addColorStop(0, `rgba(255,200,90,${0.55 * pulse})`); g.addColorStop(1, 'rgba(255,170,60,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.cx, this.cy, 32, 0, TAU); ctx.fill()
    ctx.fillStyle = '#e8a43a'; ctx.strokeStyle = '#7a4a10'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(this.cx, this.cy, 11, 0, TAU); ctx.fill(); ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,.6)'
    ctx.beginPath(); ctx.arc(this.cx - 3, this.cy - 3, 3, 0, TAU); ctx.fill()
    ctx.restore()
  }
}

export function spawnItems(level) {
  const it = level.items ?? {}
  return [
    ...(it.dragonflies ?? []).map(([x, y]) => new Dragonfly(x, y)),
    ...(it.peppers ?? []).map(([x, y]) => new Pepper(x, y)),
    ...(it.anchors ?? []).map(([x, y]) => new Anchor(x, y)),
  ]
}
