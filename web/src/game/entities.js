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
    this.eaten = false // being pulled in by the tongue (engine drives position)
    this.swallow_ms = 0
    this.scale_mul = 1 // shrinks to 0 as it is swallowed
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
    if (this.eaten) return // the engine moves it along with the tongue
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
    if (this.scale_mul < 0.03) return
    const s = this.sprite
    s.scale = 0.5 * this.scale_mul
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
    if (this.eaten) return
    if (!this.alive) { this.gone = true; return }
    this.cy = this.base_y + Math.sin(this.t / 300) * 8
  }
  draw(ctx) {
    if (this.scale_mul < 0.03) return
    const pulse = 0.75 + 0.25 * Math.sin(this.t / 160)
    const r = 26 * pulse * this.scale_mul
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

// One section of a thorn thicket. Lethal to touch; can't be stomped or eaten,
// but a tongue shot cuts away the single section it touches (the nearest one),
// leaving the rest of the thicket in place.
export class BriarCell extends Entity {
  constructor(cx, cy, w, h, col, row, ground_y) {
    super(cx, cy, w, h)
    this.col = col
    this.row = row
    this.ground_y = ground_y
    this.kind = 'hazard'
    this.edible = false
    this.lickable = true
    this.t = (cx * 5 + cy * 3) % 1000
  }

  lick() {
    this.die()
  }

  update(dt_ms) {
    this.t += dt_ms
    if (!this.alive) {
      this.death_ms += dt_ms
      if (this.death_ms > 320) this.gone = true
    }
  }

  draw(ctx) {
    const fade = this.alive ? 1 : Math.max(0, 1 - this.death_ms / 320)
    if (fade <= 0) return
    const left = this.x
    const top = this.y
    const bottom = this.y + this.h
    ctx.save()
    ctx.globalAlpha = fade
    if (!this.alive) ctx.translate((hash(this.col + this.row * 7) - 0.5) * this.death_ms * 0.05, this.death_ms * 0.08)
    ctx.lineCap = 'round'
    const wob = (y, i) => Math.sin(this.t / 500 + y / 38 + this.col * 2 + i) * 3
    const n = Math.max(1, Math.round(this.w / 12))
    for (let i = 0; i < n; i++) {
      const x0 = left + ((i + 0.5) * this.w) / n
      ctx.strokeStyle = (i + this.row) % 2 ? '#34431f' : '#4b5e28'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(x0 + wob(bottom, i), bottom)
      ctx.quadraticCurveTo(x0 + wob((top + bottom) / 2, i) + (hash(i + this.col) - 0.5) * 8, (top + bottom) / 2, x0 + wob(top, i), top)
      ctx.stroke()
      // thorns
      ctx.strokeStyle = '#8a6a43'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let y = bottom - 7; y > top + 3; y -= 15) {
        const px = x0 + wob(y, i)
        const side = (Math.floor(y / 15) + i) % 2 ? 1 : -1
        ctx.moveTo(px, y)
        ctx.lineTo(px + side * 9, y - 6)
      }
      ctx.stroke()
    }
    // a cross-vine so the thicket looks tangled, not combed
    ctx.strokeStyle = '#3d5024'
    ctx.lineWidth = 3
    ctx.beginPath()
    const flip = hash(this.col * 13 + this.row) > 0.5
    ctx.moveTo(flip ? left : left + this.w, bottom)
    ctx.quadraticCurveTo(left + this.w / 2, (top + bottom) / 2 + 6, flip ? left + this.w : left, top)
    ctx.stroke()
    ctx.restore()
  }
}

export const BRIAR_CELL_W = 36
export const BRIAR_CELL_H = 60

// A thicket of width w and height h centred on x, standing on the ground,
// built from a grid of cells (columns across, rows upward).
export function spawnBriar(def, ground_y) {
  const cols = Math.max(1, Math.round(def.w / BRIAR_CELL_W))
  const rows = Math.max(1, Math.ceil(def.h / BRIAR_CELL_H))
  const cw = def.w / cols
  const cells = []
  for (let r = 0; r < rows; r++) {
    const ch = Math.min(BRIAR_CELL_H, def.h - r * BRIAR_CELL_H)
    for (let c = 0; c < cols; c++) {
      const cx = def.x - def.w / 2 + cw * (c + 0.5)
      const cy = ground_y - r * BRIAR_CELL_H - ch / 2
      cells.push(new BriarCell(cx, cy, cw, ch, c, r, ground_y))
    }
  }
  return cells
}

export function spawnEntities(level) {
  return [
    ...level.briars.flatMap((b) => spawnBriar(b, level.ground_y)),
    ...level.mosquitos.map((m) => new Mosquito(m.x, m.y, m.range)),
    ...level.fireflies.map((f) => new Firefly(f.x, f.y)),
  ]
}
