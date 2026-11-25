import { Sprite, SpriteMask } from './sprite.js'
import mosquitoAtlas from '../assets/sprites/creatures/mosquito_atlas.png'

// Base class: a thing in the world with an AABB hitbox (x, y = top-left).
class Entity {
  constructor(cx, cy, w, h) {
    this.cx = cx
    this.cy = cy
    this.w = w
    this.h = h
    this.alive = true // collides / can be hit
    this.gone = false // finished dying; remove from the world
    this.death_ms = 0
    this.kind = 'enemy' // 'enemy' | 'pickup'
    this.edible = true // tongue can grab it
    this.stompable = false
  }
  get x() { return this.cx - this.w / 2 }
  get y() { return this.cy - this.h / 2 }
  get hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h } }
  die() { this.alive = false; this.death_ms = 0 }
}

const MQ_CELL = { w: 190, h: 145 }
const MQ_MASKS = new Map([0, 1, 2].map((i) => [`flap ${i}`, new SpriteMask(i * MQ_CELL.w, 0, MQ_CELL.w, MQ_CELL.h)]))
const MQ_ANIM = [0, 1, 2, 1]

// A mosquito patrolling back and forth in a lazy hover.
export class Mosquito extends Entity {
  constructor(x, y, range = 140) {
    super(x, y, 56, 34)
    this.home_x = x
    this.home_y = y
    this.range = range
    this.dir = -1
    this.speed = 70
    this.t = (x * 7) % 1000 // desync neighbours
    this.stompable = true
    this.sprite = new Sprite(mosquitoAtlas, MQ_MASKS, 'flap 0', 0, 0, 0.5)
  }

  update(dt_ms) {
    this.t += dt_ms
    if (!this.alive) {
      this.death_ms += dt_ms
      this.cy += (dt_ms / 1000) * (200 + this.death_ms * 0.5) // tumble down
      if (this.death_ms > 700) this.gone = true
      return
    }
    this.cx += this.dir * this.speed * (dt_ms / 1000)
    if (this.cx < this.home_x - this.range) this.dir = 1
    if (this.cx > this.home_x + this.range) this.dir = -1
    this.cy = this.home_y + Math.sin(this.t / 260) * 16
  }

  draw(ctx) {
    const s = this.sprite
    s.state = `flap ${MQ_ANIM[Math.floor(this.t / 70) % MQ_ANIM.length]}`
    s.flip = this.dir < 0
    s.alpha = this.alive ? 1 : Math.max(0, 1 - this.death_ms / 700)
    // Bias a little so the body sits in the hitbox (art has a trailing proboscis)
    s.p_x = this.cx - (MQ_CELL.w * s.scale) / 2 + (this.dir < 0 ? -6 : 6)
    s.p_y = this.cy - (MQ_CELL.h * s.scale) / 2
    s.rotation = this.alive ? 0 : this.death_ms / 120
    if (!this.alive) {
      // rotate around the centre while falling
      ctx.save()
      ctx.translate(this.cx, this.cy)
      ctx.rotate(this.death_ms / 120)
      ctx.translate(-this.cx, -this.cy)
      s.rotation = 0
      s.draw(ctx)
      ctx.restore()
    } else {
      s.draw(ctx)
    }
  }
}

// A glowing firefly: grants a one-hit shield.
export class Firefly extends Entity {
  constructor(x, y) {
    super(x, y, 26, 26)
    this.kind = 'pickup'
    this.base_y = y
    this.t = (x * 3) % 1000
  }
  update(dt_ms) {
    this.t += dt_ms
    if (!this.alive) { this.gone = true; return }
    this.cy = this.base_y + Math.sin(this.t / 300) * 8
  }
  draw(ctx) {
    const pulse = 0.75 + 0.25 * Math.sin(this.t / 160)
    const r = 26 * pulse
    const g = ctx.createRadialGradient(this.cx, this.cy, 1, this.cx, this.cy, r)
    g.addColorStop(0, 'rgba(255,250,170,0.95)')
    g.addColorStop(0.35, 'rgba(255,230,90,0.45)')
    g.addColorStop(1, 'rgba(255,230,90,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fffbd0'
    ctx.beginPath()
    ctx.arc(this.cx, this.cy, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

// Thorny vines. Lethal to touch, can't be stomped or eaten, but the tongue
// cuts them: each tongue shot is one lick. A tall wall (3 licks) shrinks as it
// is cut, so after two licks you can hop over what is left.
export class Briar extends Entity {
  constructor(x, ground_y, w, h) {
    super(x, ground_y - h / 2, w, h)
    this.ground_y = ground_y
    this.base_h = h
    this.max_hp = h > 150 ? 3 : 1
    this.hp = this.max_hp
    this.kind = 'hazard'
    this.edible = false
    this.lickable = true
    this.last_shot = -1
    this.hurt_ms = 0
    this.t = (x * 5) % 1000
  }

  // One tongue shot. Returns true if it counted.
  lick(shot) {
    if (!this.alive || shot === this.last_shot) return false
    this.last_shot = shot
    this.hp -= 1
    this.hurt_ms = 250
    this.h = this.base_h * Math.max(0, this.hp / this.max_hp)
    this.cy = this.ground_y - this.h / 2
    if (this.hp <= 0) this.die()
    return true
  }

  update(dt_ms) {
    this.t += dt_ms
    this.hurt_ms = Math.max(0, this.hurt_ms - dt_ms)
    if (!this.alive) {
      this.death_ms += dt_ms
      if (this.death_ms > 450) this.gone = true
    }
  }

  draw(ctx) {
    const fade = this.alive ? 1 : Math.max(0, 1 - this.death_ms / 450)
    const full = this.alive ? this.h : this.base_h / this.max_hp * 0.6 * fade
    if (full < 2) return
    const n = Math.max(2, Math.round(this.w / 13))
    const left = this.cx - this.w / 2
    ctx.save()
    ctx.globalAlpha = fade
    ctx.lineCap = 'round'
    for (let i = 0; i < n; i++) {
      const x0 = left + ((i + 0.5) * this.w) / n + (hash(i) - 0.5) * 5
      const shake = this.hurt_ms > 0 ? (Math.random() - 0.5) * 6 : 0
      const sway = Math.sin(this.t / 500 + i * 1.7) * 4 + shake
      const top = full * (0.72 + 0.28 * hash(i + 9))
      const y0 = this.ground_y
      ctx.strokeStyle = i % 2 ? '#34431f' : '#4b5e28'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(x0 + sway * 1.6 + (hash(i + 4) - 0.5) * 18, y0 - top * 0.55, x0 + sway, y0 - top)
      ctx.stroke()
      // thorns
      ctx.strokeStyle = '#8a6a43'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let y = 18; y < top; y += 22) {
        const f = y / top
        const px = x0 + sway * f * f
        const side = (Math.floor(y / 22) + i) % 2 ? 1 : -1
        ctx.moveTo(px, y0 - y)
        ctx.lineTo(px + side * 9, y0 - y - 7)
      }
      ctx.stroke()
    }
    ctx.restore()
  }
}

export function spawnEntities(level) {
  return [
    ...level.briars.map((b) => new Briar(b.x, level.ground_y, b.w, b.h)),
    ...level.mosquitos.map((m) => new Mosquito(m.x, m.y, m.range)),
    ...level.fireflies.map((f) => new Firefly(f.x, f.y)),
  ]
}
