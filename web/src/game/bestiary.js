// M5 bestiary: swamp creatures drawn with canvas vector art.
// All of them follow the Entity contract (see entities.js) plus a few hooks the
// engine understands:
//   harmless  – no body contact / cannot be tongued right now
//   deflects  – the tongue bounces off it (armour)
//   onStomp() – custom stomp reaction (default is to die)
import { Entity } from './entities.js'

const TAU = Math.PI * 2
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Shared plumbing: death animation, drawing transform, facing.
class Critter extends Entity {
  constructor(cx, cy, w, h, ground_y) {
    super(cx, cy, w, h)
    this.ground_y = ground_y
    this.t = (cx * 13) % 1000
    this.face = 1 // art faces right; -1 mirrors
    this.harmless = false
    this.stompable = true
  }

  // Returns true while the critter is dead/dying (caller should stop).
  _dying(dt_ms) {
    if (this.eaten) return true // engine moves it along with the tongue
    if (this.alive) return false
    this.death_ms += dt_ms
    this._deathStep?.(dt_ms)
    if (this.death_ms > 650) this.gone = true
    return true
  }

  _onGround() { this.cy = this.ground_y - this.h / 2 }

  _sees(game, range, dyMax = 9999) {
    const f = game?.frog
    if (!f || game.state !== 'play' || f.dead || f.hidden) return null
    const dx = f.x + f.w / 2 - this.cx
    const dy = f.y + f.h / 2 - this.cy
    if (Math.abs(dx) > range || Math.abs(dy) > dyMax) return null
    return { dx, dy, f }
  }

  draw(ctx) {
    if (this.scale_mul < 0.03) return
    ctx.save()
    const a = this.alive ? 1 : clamp(1 - (this.death_ms - 250) / 350, 0, 1)
    ctx.globalAlpha = a
    const squash = this.alive ? 1 : clamp(1 - this.death_ms / 140, 0.12, 1)
    const s = this.scale_mul
    ctx.translate(this.cx, this.cy + this.h / 2) // feet / bottom of hitbox
    ctx.scale(this.face * s, s * (this.flying ? 1 : squash))
    ctx.translate(0, -this.h / 2)
    if (this.flying && !this.alive) ctx.rotate(this.death_ms / 110)
    this.paint(ctx)
    ctx.restore()
  }
}

// ---- shared bits of art ----
function eye(ctx, x, y, r, pupil = true, color = '#fff') {
  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
  if (pupil) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + r * 0.25, y, r * 0.5, 0, TAU); ctx.fill() }
}
function ellipse(ctx, x, y, rx, ry, fill, stroke) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU)
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke() }
}

// ---------------------------------------------------------------- BAT
// Hangs upside-down until you come near, then swoops down in a U-shaped arc
// through where you were standing, and flutters back up to roost.
export class Bat extends Critter {
  constructor(x, y, ground_y) {
    super(x, y, 44, 28, ground_y)
    this.home_x = x
    this.home_y = y
    this.flying = true
    this.mode = 'hang' // hang | swoop | return
    this.u = 0
    this.cool = 0
    this.vy = 0
  }
  _deathStep(dt_ms) { this.cy += (dt_ms / 1000) * (240 + this.death_ms) }
  update(dt_ms, game) {
    this.t += dt_ms
    if (this._dying(dt_ms)) return
    const dt = dt_ms / 1000
    this.cool = Math.max(0, this.cool - dt_ms)
    if (this.mode === 'hang') {
      this.cy = this.home_y + Math.sin(this.t / 600) * 2
      const s = this._sees(game, 340, 420)
      if (s && !this.cool) {
        this.mode = 'swoop'
        this.u = 0
        this.sx = this.cx; this.sy = this.cy
        this.tx = s.f.x + s.f.w / 2
        this.ty = Math.min(this.ground_y - 26, s.f.y + s.f.h / 2)
        this.face = s.dx >= 0 ? 1 : -1
      }
    } else if (this.mode === 'swoop') {
      this.u = Math.min(1, this.u + dt_ms / 1550)
      const u = this.u
      const ex = 2 * this.tx - this.sx
      const cx = this.tx
      const cy = 2 * this.ty - this.sy
      const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u
      this.cx = a * this.sx + b * cx + c * ex
      this.cy = a * this.sy + b * cy + c * this.sy
      this.face = ex >= this.sx ? 1 : -1
      if (this.u >= 1) this.mode = 'return'
    } else {
      const dx = this.home_x - this.cx, dy = this.home_y - this.cy
      const d = Math.max(1, Math.hypot(dx, dy))
      const v = Math.min(d, 120 * dt)
      this.cx += (dx / d) * v
      this.cy += (dy / d) * v
      if (d < 4) { this.mode = 'hang'; this.cool = 1800; this.face = 1 }
    }
  }
  paint(ctx) {
    const hang = this.mode === 'hang' && this.alive
    const flap = hang ? 0.15 : Math.sin(this.t / 55)
    ctx.fillStyle = '#2b2236'
    // wings
    for (const sgn of [-1, 1]) {
      ctx.save()
      ctx.scale(sgn, 1)
      ctx.beginPath()
      if (hang) {
        ctx.moveTo(4, -2); ctx.quadraticCurveTo(14, 4, 7, 14); ctx.quadraticCurveTo(2, 8, 2, 2)
      } else {
        const wy = flap * 16
        ctx.moveTo(3, 0)
        ctx.quadraticCurveTo(18, -16 - wy, 36, -4 - wy * 1.4)
        ctx.lineTo(28, 2 - wy * 0.6); ctx.lineTo(22, 6 - wy * 0.3); ctx.lineTo(14, 5); ctx.lineTo(7, 10)
      }
      ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ellipse(ctx, 0, 0, 8, 11, '#3a2e48')
    ellipse(ctx, 0, -9, 7, 6, '#463957')
    ctx.fillStyle = '#463957'
    ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-5, -20); ctx.lineTo(-1, -14); ctx.fill()
    ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(5, -20); ctx.lineTo(1, -14); ctx.fill()
    eye(ctx, -2.5, -9, 1.9, false, '#ff5a5a'); eye(ctx, 2.5, -9, 1.9, false, '#ff5a5a')
    if (!this.alive || this.mode !== 'hang') {
      ctx.fillStyle = '#fff'
      ctx.fillRect(-2.5, -5, 1.4, 2.4); ctx.fillRect(1.2, -5, 1.4, 2.4)
    }
  }
}

// ---------------------------------------------------------------- MOLE
// Mound in the ground. When you walk near it shakes, then the mole pops up for
// a moment (hostile, stompable, edible) and burrows back down.
export class Mole extends Critter {
  constructor(x, ground_y) {
    super(x, ground_y - 2, 44, 4, ground_y)
    this.mode = 'hidden' // hidden | rising | up | sinking
    this.ms = 0
    this.cool = 1200
    this.prog = 0
    this.harmless = true
    this.edible = false
  }
  _deathStep(dt_ms) { this.prog = Math.max(0, this.prog - dt_ms / 300) }
  _fit() {
    this.h = Math.max(4, 44 * this.prog)
    this._onGround()
  }
  update(dt_ms, game) {
    this.t += dt_ms
    if (this._dying(dt_ms)) { this._fit(); return }
    this.ms += dt_ms
    this.cool = Math.max(0, this.cool - dt_ms)
    switch (this.mode) {
      case 'hidden': {
        const s = this._sees(game, 260, 140)
        if (s && !this.cool && Math.abs(s.dx) > 95) { this.mode = 'rising'; this.ms = 0 }
        break
      }
      case 'rising':
        this.prog = clamp(this.ms / 380, 0, 1) // shakes first, then pops
        if (this.ms >= 380) { this.mode = 'up'; this.ms = 0 }
        break
      case 'up':
        this.prog = 1
        if (this.ms >= 1700) { this.mode = 'sinking'; this.ms = 0 }
        break
      case 'sinking':
        this.prog = clamp(1 - this.ms / 320, 0, 1)
        if (this.ms >= 320) { this.mode = 'hidden'; this.ms = 0; this.cool = 1800 }
        break
    }
    const up = this.mode === 'up' || (this.mode === 'rising' && this.prog > 0.6)
    this.harmless = !up
    this.edible = !this.harmless
    this._fit()
  }
  draw(ctx) {
    if (this.scale_mul < 0.03) return
    const gy = this.ground_y
    ctx.save()
    ctx.globalAlpha = this.alive ? 1 : clamp(1 - this.death_ms / 650, 0, 1)
    // dirt mound (shakes while the mole is about to pop)
    const shake = this.mode === 'rising' ? Math.sin(this.t / 30) * 2 : 0
    ellipse(ctx, this.cx + shake, gy, 30, 9, '#4a3320')
    ellipse(ctx, this.cx + shake, gy - 3, 22, 6, '#5b4129')
    ctx.fillStyle = '#6b4d31'
    for (const [dx, dy] of [[-10, -4], [6, -6], [14, -2], [-18, -1]]) ctx.fillRect(this.cx + dx + shake, gy + dy - 3, 3, 2)
    if (this.prog > 0.02) {
      ctx.save()
      ctx.beginPath(); ctx.rect(this.cx - 80, gy - 120, 160, 120 + 1); ctx.clip()
      ctx.translate(this.cx, gy + (1 - this.prog) * 46)
      ctx.scale(this.scale_mul, this.scale_mul)
      this.paint(ctx)
      ctx.restore()
    }
    ctx.restore()
  }
  paint(ctx) {
    // origin = bottom centre of the mole when fully up
    ellipse(ctx, 0, -20, 19, 22, '#3b3040')
    ellipse(ctx, 0, -16, 13, 14, '#4b3d52')
    // snout + pink star nose
    ellipse(ctx, 0, -28, 10, 8, '#5a4a60')
    ctx.fillStyle = '#ff9aa8'
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU
      ctx.beginPath(); ctx.arc(Math.cos(a) * 4.5, -31 + Math.sin(a) * 4, 1.8, 0, TAU); ctx.fill()
    }
    ctx.beginPath(); ctx.arc(0, -31, 2.6, 0, TAU); ctx.fill()
    // tiny eyes
    eye(ctx, -9, -32, 2, true); eye(ctx, 9, -32, 2, true)
    // big digging claws
    for (const sgn of [-1, 1]) {
      ellipse(ctx, sgn * 20, -9, 8, 6, '#ffb08a')
      ctx.fillStyle = '#f4e6d0'
      for (let i = -1; i <= 1; i++) ctx.fillRect(sgn * 20 + i * 4 - 1 + sgn * 4, -17, 2, 6)
    }
  }
}

// ---------------------------------------------------------------- BEETLE
// Armoured walker. The tongue bounces off its shell and plain contact hurts,
// but a stomp flips it onto its back: then it is helpless and can be eaten.
export class Beetle extends Critter {
  constructor(x, ground_y, range = 100) {
    super(x, ground_y - 18, 60, 36, ground_y)
    this.home_x = x
    this.range = range
    this.dir = -1
    this.speed = 38
    this.flip_ms = 0
    this.deflects = true
    this.edible = false
    this.face = -1
  }
  get flipped() { return this.flip_ms > 0 }
  onStomp() {
    this.flip_ms = 4200
    this.deflects = false
    this.edible = true
    this.harmless = true
    this.h = 28
    this._onGround()
  }
  _deathStep() {}
  update(dt_ms) {
    this.t += dt_ms
    if (this._dying(dt_ms)) return
    if (this.flipped) {
      this.flip_ms -= dt_ms
      if (this.flip_ms <= 0) { // rights itself
        this.flip_ms = 0
        this.deflects = true; this.edible = false; this.harmless = false
        this.h = 36; this._onGround()
      }
      return
    }
    this.cx += this.dir * this.speed * (dt_ms / 1000)
    if (this.cx < this.home_x - this.range) this.dir = 1
    if (this.cx > this.home_x + this.range) this.dir = -1
    this.face = this.dir
  }
  paint(ctx) {
    const flipped = this.flipped
    ctx.save()
    if (flipped) { ctx.scale(1, -1); ctx.translate(0, 0) }
    const wig = Math.sin(this.t / 70)
    // legs
    ctx.strokeStyle = '#1d2a1a'; ctx.lineWidth = 3; ctx.lineCap = 'round'
    for (let i = 0; i < 3; i++) {
      const x = -14 + i * 14
      const k = flipped ? wig * (i % 2 ? 1 : -1) * 6 : Math.sin(this.t / 90 + i * 2) * 3
      ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x + k, 17); ctx.stroke()
    }
    // shell
    ctx.fillStyle = flipped ? '#6a7f4a' : '#245a46'
    ctx.beginPath(); ctx.ellipse(0, 1, 28, 18, 0, Math.PI, 0); ctx.lineTo(28, 4); ctx.lineTo(-28, 4); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(0, 4); ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,.16)'
    ctx.beginPath(); ctx.ellipse(-9, -8, 9, 5, -0.3, 0, TAU); ctx.fill()
    // head + pincers
    ellipse(ctx, 29, 0, 9, 8, '#1a3a2d')
    ctx.strokeStyle = '#1a3a2d'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(34, -4); ctx.quadraticCurveTo(44, -6, 40, 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(34, 5); ctx.quadraticCurveTo(44, 8, 40, 0); ctx.stroke()
    eye(ctx, 31, -3, 2.4, true)
    ctx.restore()
  }
}

// ---------------------------------------------------------------- CENTIPEDE
// Long, low and fast; too long to hop over lazily. Speeds up when it spots you.
export class Centipede extends Critter {
  constructor(x, ground_y, range = 120) {
    super(x, ground_y - 11, 150, 22, ground_y)
    this.home_x = x
    this.range = range
    this.dir = -1
    this.face = -1
    this.speed = 55
    this.angry = false
    this.phase = 0
  }
  update(dt_ms, game) {
    this.t += dt_ms
    if (this._dying(dt_ms)) return
    this.angry = !!this._sees(game, 380, 140)
    const v = this.angry ? 125 : this.speed
    this.cx += this.dir * v * (dt_ms / 1000)
    this.phase += v * (dt_ms / 1000)
    const wide = this.range + (this.angry ? 60 : 0)
    if (this.cx < this.home_x - wide) this.dir = 1
    if (this.cx > this.home_x + wide) this.dir = -1
    this.face = this.dir
  }
  paint(ctx) {
    const n = 8
    const seg = 17
    // segments run from tail (x<0) to head (x>0)
    for (let i = 0; i < n; i++) {
      const x = -62 + i * seg
      const wave = Math.sin(this.phase / 9 - i * 0.9)
      // legs
      ctx.strokeStyle = '#7a3a1c'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x + wave * 5, 12); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + 3, 4); ctx.lineTo(x + 3 - wave * 5, 12); ctx.stroke()
      const y = Math.sin(this.phase / 9 - i * 0.9) * 1.5
      ellipse(ctx, x, y, 9.5, 8.5, i % 2 ? '#c4552b' : '#d96a36', '#6b2d12')
    }
    const hx = -62 + n * seg - 4
    ellipse(ctx, hx, 0, 10, 9, '#9c3a17', '#4d1e0b')
    eye(ctx, hx + 4, -3, 2.4, true, this.angry ? '#ffe35a' : '#fff')
    ctx.strokeStyle = '#4d1e0b'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(hx + 8, -7); ctx.quadraticCurveTo(hx + 22, -14, hx + 24, -6); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(hx + 9, 5); ctx.quadraticCurveTo(hx + 18, 6, hx + 17, 0); ctx.stroke()
  }
}

// ---------------------------------------------------------------- PILL BUG
// Trundles about. When it spots you it curls into a ball (telegraph) and rolls
// at you: rolling bugs cannot be stomped, but can still be tongued.
export class PillBug extends Critter {
  constructor(x, ground_y, range = 90) {
    super(x, ground_y - 14, 42, 28, ground_y)
    this.home_x = x
    this.range = range
    this.dir = -1
    this.face = -1
    this.mode = 'walk' // walk | curl | roll | rest
    this.ms = 0
    this.cool = 800
    this.angle = 0
    this.rv = 0
  }
  update(dt_ms, game) {
    this.t += dt_ms
    if (this._dying(dt_ms)) return
    const dt = dt_ms / 1000
    this.ms += dt_ms
    this.cool = Math.max(0, this.cool - dt_ms)
    switch (this.mode) {
      case 'walk': {
        this.cx += this.dir * 32 * dt
        if (this.cx < this.home_x - this.range) this.dir = 1
        if (this.cx > this.home_x + this.range) this.dir = -1
        this.face = this.dir
        const s = this._sees(game, 340, 110)
        if (s && !this.cool) {
          this.dir = s.dx >= 0 ? 1 : -1
          this.face = this.dir
          this.mode = 'curl'; this.ms = 0
        }
        break
      }
      case 'curl':
        if (this.ms >= 520) { this.mode = 'roll'; this.ms = 0 }
        break
      case 'roll': {
        this.rv += (320 - this.rv) * Math.min(1, dt * 6)
        this.cx += this.dir * this.rv * dt
        this.angle += this.dir * this.rv * dt / 14
        const lim = this.range + 140
        if (this.cx < this.home_x - lim) { this.cx = this.home_x - lim; this.dir = 1 }
        if (this.cx > this.home_x + lim) { this.cx = this.home_x + lim; this.dir = -1 }
        if (this.ms >= 1900) { this.mode = 'rest'; this.ms = 0; this.rv = 0 }
        break
      }
      case 'rest':
        if (this.ms >= 900) { this.mode = 'walk'; this.ms = 0; this.cool = 1500 }
        break
    }
    const ball = this.mode === 'roll' || (this.mode === 'curl' && this.ms > 260)
    this.stompable = this.mode !== 'roll'
    this.h = ball ? 30 : 24
    this.w = ball ? 30 : 42
    this._onGround()
  }
  paint(ctx) {
    const ball = this.mode === 'roll' || (this.mode === 'curl' && this.ms > 260)
    if (ball) {
      ctx.save()
      ctx.translate(0, 0)
      ctx.rotate(this.angle)
      ellipse(ctx, 0, 0, 15, 15, '#7d8794', '#454d58')
      ctx.strokeStyle = '#454d58'; ctx.lineWidth = 2
      for (const a of [0.5, 1.2, 1.9, 2.6]) {
        ctx.beginPath(); ctx.arc(0, 0, 15, a, a + 0.05); ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15); ctx.lineTo(-Math.cos(a) * 15, -Math.sin(a) * 15); ctx.stroke()
      }
      ctx.fillStyle = 'rgba(255,255,255,.25)'
      ctx.beginPath(); ctx.arc(-4, -5, 5, 0, TAU); ctx.fill()
      ctx.restore()
      return
    }
    const curl = this.mode === 'curl' ? (this.ms / 260) : 0 // hunches up
    ctx.strokeStyle = '#3d4550'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    for (let i = 0; i < 5; i++) {
      const x = -14 + i * 7
      const k = Math.sin(this.t / 80 + i) * 2
      ctx.beginPath(); ctx.moveTo(x, 7); ctx.lineTo(x + k, 12); ctx.stroke()
    }
    ctx.fillStyle = '#7d8794'
    for (let i = 0; i < 6; i++) {
      const x = -17 + i * 6.4
      const r = 8 + Math.sin((i / 5) * Math.PI) * (5 + curl * 2)
      ellipse(ctx, x, 1 - curl * 2, 5, r * 0.85, i % 2 ? '#8a94a1' : '#7d8794', '#454d58')
    }
    ellipse(ctx, 19, 3, 6, 6, '#56606d', '#2f353d')
    eye(ctx, 21, 1, 1.7, true)
    ctx.strokeStyle = '#2f353d'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.quadraticCurveTo(30, -6, 33, -4); ctx.stroke()
  }
}

// ---------------------------------------------------------------- OWL
// Sleeps on its perch until you get close, flares its eyes (warning!), then
// glides silently and fast in a straight line through where you stood.
export class Owl extends Critter {
  constructor(x, y, ground_y) {
    super(x, y, 62, 50, ground_y)
    this.home_x = x
    this.home_y = y
    this.flying = true
    this.mode = 'perch' // perch | alert | glide | return
    this.ms = 0
    this.cool = 600
  }
  _deathStep(dt_ms) { this.cy += (dt_ms / 1000) * (200 + this.death_ms) }
  update(dt_ms, game) {
    this.t += dt_ms
    if (this._dying(dt_ms)) return
    const dt = dt_ms / 1000
    this.ms += dt_ms
    this.cool = Math.max(0, this.cool - dt_ms)
    switch (this.mode) {
      case 'perch': {
        this.cy = this.home_y
        const s = this._sees(game, 440, 400)
        if (s && !this.cool) { this.mode = 'alert'; this.ms = 0; this.face = s.dx >= 0 ? 1 : -1 }
        break
      }
      case 'alert': {
        const s = this._sees(game, 700, 500)
        if (s) this.face = s.dx >= 0 ? 1 : -1
        if (this.ms >= 750) {
          const f = game.frog
          const tx = f.x + f.w / 2, ty = Math.min(this.ground_y - 30, f.y + f.h / 2)
          const dx = tx - this.cx, dy = ty - this.cy
          const d = Math.max(1, Math.hypot(dx, dy))
          this.vx = (dx / d) * 330
          this.vy = (dy / d) * 330
          this.mode = 'glide'; this.ms = 0
        }
        break
      }
      case 'glide':
        this.cx += this.vx * dt
        this.cy += this.vy * dt
        this.cy = Math.min(this.cy, this.ground_y - 30)
        this.face = this.vx >= 0 ? 1 : -1
        if (this.ms >= 1300) { this.mode = 'return'; this.ms = 0 }
        break
      default: {
        const dx = this.home_x - this.cx, dy = this.home_y - this.cy
        const d = Math.max(1, Math.hypot(dx, dy))
        const v = Math.min(d, 150 * dt)
        this.cx += (dx / d) * v
        this.cy += (dy / d) * v
        if (d < 4) { this.mode = 'perch'; this.cool = 2600; this.ms = 0 }
      }
    }
  }
  paint(ctx) {
    const flying = this.mode === 'glide' || this.mode === 'return'
    const flap = flying ? Math.sin(this.t / (this.mode === 'glide' ? 90 : 65)) : 0
    // wings
    ctx.fillStyle = '#7b5f3f'
    for (const sgn of [-1, 1]) {
      ctx.save()
      ctx.scale(sgn, 1)
      ctx.beginPath()
      if (flying) {
        const wy = flap * 14
        ctx.moveTo(4, -6)
        ctx.quadraticCurveTo(24, -20 - wy, 46, -6 - wy)
        ctx.lineTo(40, 2 - wy * 0.6); ctx.lineTo(30, 4); ctx.lineTo(22, 10); ctx.lineTo(6, 12)
      } else {
        ctx.moveTo(8, -10); ctx.quadraticCurveTo(26, 0, 14, 22); ctx.lineTo(6, 16)
      }
      ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ellipse(ctx, 0, 2, 17, 22, '#97774f')
    ellipse(ctx, 0, 8, 10, 13, '#d9c39a')
    ctx.strokeStyle = '#7b5f3f'; ctx.lineWidth = 1.5
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 6 + i * 5, 6, 0.3, Math.PI - 0.3); ctx.stroke() }
    // head with ear tufts and big facial disc
    ellipse(ctx, 0, -14, 17, 14, '#97774f')
    ctx.fillStyle = '#7b5f3f'
    ctx.beginPath(); ctx.moveTo(-14, -22); ctx.lineTo(-12, -33); ctx.lineTo(-6, -24); ctx.fill()
    ctx.beginPath(); ctx.moveTo(14, -22); ctx.lineTo(12, -33); ctx.lineTo(6, -24); ctx.fill()
    ellipse(ctx, -7, -14, 8, 8, '#e8d9b5'); ellipse(ctx, 7, -14, 8, 8, '#e8d9b5')
    const awake = this.mode !== 'perch' || !this.alive
    if (awake) {
      const glow = this.mode === 'alert' ? 0.6 + 0.4 * Math.sin(this.t / 50) : 1
      eye(ctx, -7, -14, 5, false, '#ffd23a'); eye(ctx, 7, -14, 5, false, '#ffd23a')
      ctx.fillStyle = '#111'
      ctx.beginPath(); ctx.arc(-6, -14, 2.4, 0, TAU); ctx.arc(8, -14, 2.4, 0, TAU); ctx.fill()
      if (this.mode === 'alert') {
        ctx.fillStyle = `rgba(255,210,60,${0.25 * glow})`
        ctx.beginPath(); ctx.arc(-7, -14, 11, 0, TAU); ctx.arc(7, -14, 11, 0, TAU); ctx.fill()
      }
    } else { // asleep: closed eyes
      ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(-7, -14, 4, 0.1, Math.PI - 0.1); ctx.stroke()
      ctx.beginPath(); ctx.arc(7, -14, 4, 0.1, Math.PI - 0.1); ctx.stroke()
    }
    ctx.fillStyle = '#e59a2c'
    ctx.beginPath(); ctx.moveTo(-3, -11); ctx.lineTo(3, -11); ctx.lineTo(0, -4); ctx.fill()
    if (this.mode === 'perch') { // talons on the branch
      ctx.fillStyle = '#e59a2c'
      ctx.fillRect(-9, 22, 6, 3); ctx.fillRect(3, 22, 6, 3)
    }
  }
}

// ---------------------------------------------------------------- CRANE
// A tall wading bird. It stalks about; when you come near it draws its neck
// back (warning), then stabs forward along the ground. Too big to stomp and
// its feathers deflect the tongue, but right after a stab its beak is stuck
// low in the mud: a tongue to the head then swallows it whole.
export class Crane extends Critter {
  constructor(x, ground_y, range = 90) {
    super(x, ground_y - 55, 46, 110, ground_y)
    this.home_x = x
    this.range = range
    this.dir = -1
    this.face = -1
    this.mode = 'stalk' // stalk | windup | strike | recover
    this.ms = 0
    this.cool = 1200
    this.stompable = false
    this.deflects = true
    this.edible = false
    this.reach = 0 // 0..1 how far the strike has extended
  }
  _fit() {
    const f = this.face
    if (this.mode === 'strike' || this.mode === 'recover') {
      const r = this.mode === 'strike' ? this.reach : 1
      this.w = 46 + 110 * r
      this.h = this.mode === 'recover' ? 56 : 64 - 20 * (1 - this.reach)
      this.cx = this.base_x + f * (this.w - 46) / 2
    } else {
      this.w = 46
      this.h = 110
      this.cx = this.base_x
    }
    this._onGround()
  }
  update(dt_ms, game) {
    this.t += dt_ms
    if (this.base_x === undefined) this.base_x = this.cx
    if (this._dying(dt_ms)) return
    const dt = dt_ms / 1000
    this.ms += dt_ms
    this.cool = Math.max(0, this.cool - dt_ms)
    switch (this.mode) {
      case 'stalk': {
        this.base_x += this.dir * 26 * dt
        if (this.base_x < this.home_x - this.range) this.dir = 1
        if (this.base_x > this.home_x + this.range) this.dir = -1
        this.face = this.dir
        const s = this._sees(game, 340, 160)
        if (s && !this.cool) {
          this.face = s.dx >= 0 ? 1 : -1
          this.mode = 'windup'; this.ms = 0
        }
        break
      }
      case 'windup':
        if (this.ms >= 750) { this.mode = 'strike'; this.ms = 0; this.reach = 0 }
        break
      case 'strike':
        this.reach = clamp(this.ms / 170, 0, 1)
        if (this.ms >= 260) { this.mode = 'recover'; this.ms = 0; this.reach = 1 }
        break
      case 'recover':
        if (this.ms >= 1300) { this.mode = 'stalk'; this.ms = 0; this.cool = 1700; this.dir = this.face }
        break
    }
    const stuck = this.mode === 'recover'
    this.edible = stuck
    this.deflects = !stuck
    this._fit()
  }
  paint(ctx) {
    // local origin = hitbox centre. The body is drawn at a fixed spot behind the
    // beak, so while the hitbox stretches forward the body stays put.
    const stretch = (this.w - 46) / 2 // how far the box centre moved forward
    ctx.translate(-stretch, this.h / 2) // origin: feet line under the body
    const gy = 0
    const walk = this.mode === 'stalk' ? Math.sin(this.t / 260) : 0
    // legs
    ctx.strokeStyle = '#d9a43a'; ctx.lineWidth = 4; ctx.lineCap = 'round'
    for (const sgn of [-1, 1]) {
      const k = sgn * walk * 7
      ctx.beginPath(); ctx.moveTo(sgn * 5, gy - 44); ctx.lineTo(sgn * 5 + k, gy - 2); ctx.lineTo(sgn * 5 + k + 9, gy - 1); ctx.stroke()
    }
    // body
    ctx.save()
    ctx.translate(0, -58)
    ctx.rotate(this.mode === 'strike' || this.mode === 'recover' ? 0.35 : 0)
    ellipse(ctx, -2, 0, 22, 14, '#eef0f2', '#b8bec6')
    ctx.fillStyle = '#c9ced6'
    ctx.beginPath(); ctx.ellipse(-8, 2, 14, 8, -0.2, 0, TAU); ctx.fill() // wing fold
    ctx.fillStyle = '#2d3138'
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-34, 6); ctx.lineTo(-22, 8); ctx.fill() // tail tip
    ctx.restore()
    // neck + head: S-curve when relaxed, coiled back when winding up, straight out when stabbing
    let hx, hy, c1x, c1y
    switch (this.mode) {
      case 'windup': { const p = this.ms / 750; hx = -6 - p * 8; hy = -92 - p * 6; c1x = 20; c1y = -60; break }
      case 'strike': { hx = 20 + 118 * this.reach; hy = -86 + 60 * this.reach; c1x = 12 + 60 * this.reach; c1y = -78 + 30 * this.reach; break }
      case 'recover': { hx = 138; hy = -26; c1x = 70; c1y = -52; break }
      default: hx = 16; hy = -94; c1x = 0; c1y = -78
    }
    ctx.strokeStyle = '#eef0f2'; ctx.lineWidth = 7; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(10, -62); ctx.quadraticCurveTo(c1x, c1y, hx, hy); ctx.stroke()
    ellipse(ctx, hx, hy, 9, 7, '#f6f7f8', '#b8bec6')
    ctx.fillStyle = '#c0262d' // red crown
    ctx.beginPath(); ctx.ellipse(hx - 2, hy - 5, 6, 3, 0, 0, TAU); ctx.fill()
    eye(ctx, hx + 3, hy - 1, 2.2, true, '#ffd23a')
    const bl = this.mode === 'strike' || this.mode === 'recover' ? 34 : 26
    ctx.fillStyle = '#e8b03a'
    ctx.beginPath(); ctx.moveTo(hx + 7, hy - 3); ctx.lineTo(hx + 7 + bl, hy + (this.mode === 'recover' ? 6 : 2)); ctx.lineTo(hx + 7, hy + 3); ctx.fill()
    if (this.mode === 'windup') { // warning flash
      ctx.fillStyle = `rgba(255,70,70,${0.4 + 0.4 * Math.sin(this.t / 40)})`
      ctx.beginPath(); ctx.arc(hx + 2, hy - 1, 6, 0, TAU); ctx.fill()
    }
  }
}

// Level data -> creatures
export function spawnBestiary(level) {
  const g = level.ground_y
  const b = level.bestiary ?? {}
  const tag = (label, list) => list.map((e) => Object.assign(e, { label }))
  return [
    ...tag('bat', (b.bats ?? []).map(([x, above]) => new Bat(x, g - above, g))),
    ...tag('mole', (b.moles ?? []).map(([x]) => new Mole(x, g))),
    ...tag('beetle', (b.beetles ?? []).map(([x, range]) => new Beetle(x, g, range))),
    ...tag('centipede', (b.centipedes ?? []).map(([x, range]) => new Centipede(x, g, range))),
    ...tag('pillbug', (b.pillbugs ?? []).map(([x, range]) => new PillBug(x, g, range))),
    ...tag('owl', (b.owls ?? []).map(([x, above]) => new Owl(x, g - above, g))),
    ...tag('crane', (b.cranes ?? []).map(([x, range]) => new Crane(x, g, range))),
  ]
}
