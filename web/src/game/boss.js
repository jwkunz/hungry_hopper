// M6: the Fly Boss. A big erratic flyer with a glowing eye as its weak point.
// Tongue the eye 3 times to win. It gets faster and calls more mosquito minions
// after every hit, and sometimes dives at you (with a short warning).
import { Entity, Mosquito } from './entities.js'
import bossAtlas from '../assets/sprites/creatures/fly_boss.png'

const CELL = { w: 470, h: 300 }
const BASE_W = 190
// eye position in the art, as a fraction of the cell (facing right; mirrored when facing left)
const EYE = { fx: 0.796, fy: 0.228 }

const PHASES = {
  // by hit points left
  3: { speed: 135, dive_cd: 6500, minion_cd: 6500, minion_max: 1, wp_ms: [900, 1500] },
  2: { speed: 185, dive_cd: 4800, minion_cd: 4800, minion_max: 2, wp_ms: [700, 1200] },
  1: { speed: 235, dive_cd: 3400, minion_cd: 3600, minion_max: 3, wp_ms: [500, 950] },
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// The Fly Boss comes in five flavours, one per area. `attacks` are extra
// signature moves on top of the dives and minions.
export const VARIANTS = {
  fly: { title: 'THE FLY BOSS!', scale: 1, hue: 0, hp: 3, speed: 1, attacks: [] },
  bog: { title: 'THE BOG FLY!', scale: 0.9, hue: 75, hp: 2, speed: 0.95, attacks: ['mud'] },
  cypress: { title: 'THE FOREST FLY!', scale: 0.9, hue: 150, hp: 2, speed: 1, attacks: ['swarm'] },
  storm: { title: 'THE STORM FLY!', scale: 0.95, hue: 205, hp: 3, speed: 1.05, attacks: ['bolt'] },
  queen: { title: 'THE HIVE QUEEN!', scale: 1.25, hue: -35, hp: 4, speed: 1.1, attacks: ['mud', 'bolt', 'swarm'] },
}

// Mud spat by the Bog Fly / Queen: an arcing blob that splats on the ground.
export class MudBlob extends Entity {
  constructor(x, y, vx, vy, ground_y) {
    super(x, y, 24, 24)
    this.vx = vx; this.vy = vy; this.ground_y = ground_y
    this.edible = true // you can eat it out of the air
    this.t = 0
  }
  update(dt_ms) {
    this.t += dt_ms
    if (this.eaten) return
    if (!this.alive) { this.death_ms += dt_ms; if (this.death_ms > 250) this.gone = true; return }
    const dt = dt_ms / 1000
    this.vy += 900 * dt
    this.cx += this.vx * dt
    this.cy += this.vy * dt
    if (this.cy > this.ground_y - 12 || this.t > 5000) this.die() // splat
  }
  draw(ctx) {
    if (this.scale_mul < 0.03) return
    ctx.save()
    ctx.globalAlpha = this.alive ? 1 : Math.max(0, 1 - this.death_ms / 250)
    const sq = this.alive ? 1 : 1 + this.death_ms / 120
    ctx.translate(this.cx, this.cy)
    ctx.scale(this.scale_mul * sq, this.scale_mul * (this.alive ? 1 : 0.5))
    ctx.fillStyle = '#4a3216'
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#6a4a22'
    ctx.beginPath(); ctx.arc(-3, -3, 5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

// A lightning strike called by the Storm Fly / Queen: a flickering warning on
// the ground, then a bolt that hurts anything under it.
export class Bolt extends Entity {
  constructor(x, ground_y) {
    super(x, ground_y - 250, 56, 500)
    this.ground_y = ground_y
    this.harmless = true // contact never hurts; only the strike (hazard) does
    this.edible = false
    this.ms = 0
    this.light = 0
  }
  get striking() { return this.ms >= 800 && this.ms < 1050 }
  update(dt_ms) {
    this.ms += dt_ms
    this.light = this.striking ? 320 : 0
    if (this.ms >= 1250) this.gone = true
  }
  hazard(fb) {
    if (!this.striking) return false
    return fb.x < this.cx + 28 && fb.x + fb.w > this.cx - 28
  }
  draw(ctx) {
    const G = this.ground_y
    ctx.save()
    if (this.ms < 800) { // warning: flickering ground marker and thin line
      const f = 0.35 + 0.35 * Math.sin(this.ms / 40)
      ctx.fillStyle = `rgba(255,255,160,${f})`
      ctx.beginPath(); ctx.ellipse(this.cx, G - 2, 34, 6, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = `rgba(255,255,200,${f * 0.6})`; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(this.cx, G - 60); ctx.lineTo(this.cx, G); ctx.stroke()
    } else if (this.striking) {
      ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 8; ctx.lineJoin = 'round'
      ctx.shadowColor = '#bde0ff'; ctx.shadowBlur = 24
      ctx.beginPath()
      let x = this.cx + 10, y = -20
      ctx.moveTo(x, y)
      for (let i = 0; i < 9; i++) { y += (G + 20) / 9; x = this.cx + ((i * 7919) % 5 - 2) * 9; ctx.lineTo(x, y) }
      ctx.lineTo(this.cx, G)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,230,.5)'
      ctx.fillRect(this.cx - 28, 0, 56, G)
    } else {
      ctx.fillStyle = 'rgba(255,240,180,0.25)'
      ctx.beginPath(); ctx.ellipse(this.cx, G - 2, 20, 4, 0, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }
}

export class FlyBoss extends Entity {
  constructor(x, y, arena, ground_y, seed = 7, variant = 'fly') {
    const v = VARIANTS[variant] ?? VARIANTS.fly
    super(x, y, 150 * v.scale, 84 * v.scale)
    this.variant = v
    this.title = v.title
    this.k = v.scale
    this.is_boss = true
    this.arena = arena // { x0, x1 }
    this.ground_y = ground_y
    this.hp = v.hp
    this.max_hp = v.hp
    this.atk = { mud: 2500, bolt: 3500, swarm: 4500 }
    this.phase = 'dormant' // dormant | intro | fight | telegraph | dive | retreat | dying
    this.ms = 0
    this.t = 0
    this.inv_ms = 0
    this.vx = 0
    this.vy = 0
    this.face = -1
    this.edible = false
    this.deflects = false
    this.stompable = false
    this.harmless = true
    this.frozen = false // tests: hold still
    this.rng = seed
    this.wp = { x, y }
    this.wp_ms = 0
    this.dive_ms = 4000
    this.minion_ms = 3500
    this.spin = 0
    this.img = new Image()
    this.img.src = bossAtlas
  }

  rand() { // tiny deterministic LCG so fights are reproducible in tests
    this.rng = (this.rng * 1664525 + 1013904223) % 4294967296
    return this.rng / 4294967296
  }
  get cfgp() {
    const p = PHASES[clamp(this.hp, 1, 3)]
    return { ...p, speed: p.speed * this.variant.speed }
  }

  // Centre of the glowing eye in world coordinates
  eyePos() {
    const sx = this.face > 0 ? EYE.fx : 1 - EYE.fx
    const W = BASE_W * this.k
    const H = (W * CELL.h) / CELL.w
    return {
      x: this.cx - W / 2 + sx * W,
      y: this.cy - 4 * this.k - H / 2 + EYE.fy * H,
    }
  }
  // Tongue target: slightly bigger than the visible eye
  weakRect() {
    if (this.harmless || !this.alive) return null
    const e = this.eyePos()
    const r = 22 * Math.max(1, this.k)
    return { x: e.x - r, y: e.y - r, w: r * 2, h: r * 2 }
  }

  // The tongue touched the eye. Returns true if it counted.
  eyeHit(game) {
    if (!this.alive || this.harmless || this.inv_ms > 0 || this.phase === 'dying') return false
    this.hp -= 1
    this.inv_ms = 2000
    game?._emit?.('boss_hit')
    if (this.hp <= 0) {
      this.phase = 'dying'
      this.ms = 0
      this.harmless = true
      for (const e of game?.entities ?? []) if (e.minion && e.alive) e.die()
    } else {
      this.phase = 'retreat'
      this.ms = 0
      this.minion_ms = Math.min(this.minion_ms, 1200) // calls for backup
      // flee to the far top corner
      const far = game && game.frog.x + game.frog.w / 2 < (this.arena.x0 + this.arena.x1) / 2
      this.wp = { x: far ? this.arena.x1 - 110 : this.arena.x0 + 110, y: this.ground_y - 330 }
    }
    return true
  }

  update(dt_ms, game) {
    this.t += dt_ms
    const dt = dt_ms / 1000
    this.ms += dt_ms
    this.inv_ms = Math.max(0, this.inv_ms - dt_ms)
    if (this.frozen) return
    const f = game?.frog
    const sees = !!f && game.state === 'play' && !f.dead && !f.hidden

    switch (this.phase) {
      case 'dormant':
        if (game?.arena_active) { this.phase = 'intro'; this.ms = 0; this.wp = { x: (this.arena.x0 + this.arena.x1) / 2 + 120, y: this.ground_y - 230 } }
        break
      case 'intro':
        this._steer(dt, 150, 4)
        if (this.ms >= 1800) { this.phase = 'fight'; this.ms = 0; this.harmless = false; this.wp_ms = 0; this.dive_ms = 3500; this.minion_ms = 3000 }
        break
      case 'fight': {
        const p = this.cfgp
        this.wp_ms -= dt_ms
        if (this.wp_ms <= 0) this._pickWaypoint(f, sees)
        this._steer(dt, p.speed, 3.2, true)
        if (sees) this.face = f.x + f.w / 2 >= this.cx ? 1 : -1
        this.dive_ms -= dt_ms
        if (sees && this.dive_ms <= 0) { this.phase = 'telegraph'; this.ms = 0 }
        this._spawnMinions(dt_ms, game)
        this._attacks(dt_ms, game, f, sees)
        break
      }
      case 'telegraph': // shudder in place, then lunge
        this.vx *= 0.9; this.vy *= 0.9
        this.cx += Math.sin(this.t / 22) * 1.4
        if (sees) this.face = f.x + f.w / 2 >= this.cx ? 1 : -1
        if (this.ms >= 650) {
          const tx = sees ? f.x + f.w / 2 : this.cx
          const ty = sees ? f.y + f.h / 2 : this.ground_y - 60
          const dx = tx - this.cx, dy = ty - this.cy
          const d = Math.max(1, Math.hypot(dx, dy))
          this.vx = (dx / d) * 380
          this.vy = (dy / d) * 380
          this.phase = 'dive'; this.ms = 0
        }
        break
      case 'dive':
        this.cx += this.vx * dt
        this.cy += this.vy * dt
        this.cy = Math.min(this.cy, this.ground_y - 58)
        this.face = this.vx >= 0 ? 1 : -1
        if (this.ms >= 800) { this.phase = 'fight'; this.ms = 0; this.wp_ms = 0; this.dive_ms = this.cfgp.dive_cd * (0.8 + this.rand() * 0.5) }
        break
      case 'retreat':
        this._steer(dt, 330, 6)
        if (this.ms >= 900) { this.phase = 'fight'; this.ms = 0; this.wp_ms = 0; this.dive_ms = this.cfgp.dive_cd * 0.6 }
        break
      case 'dying':
        this.spin += dt * 5
        this.vy += 900 * dt
        this.cy += this.vy * dt
        this.cx += Math.sin(this.t / 30) * 1.5
        this.cy = Math.min(this.cy, this.ground_y - 40)
        if (this.ms >= 2400 && game) {
          game.boss_defeated = true
          game._popup?.(this.cx, this.ground_y - 120, 'FLY DEFEATED!')
          game._emit?.('boss_dead')
          this.gone = true
        }
        break
    }
    this.cx = clamp(this.cx, this.arena.x0 + 80, this.arena.x1 - 80)
    this.cy = clamp(this.cy, this.ground_y - 360, this.ground_y - 40)
  }

  // Smoothly fly toward the current waypoint; erratic wobble optional.
  _steer(dt, speed, turn, wobble = false) {
    const dx = this.wp.x - this.cx
    const dy = this.wp.y - this.cy
    const d = Math.max(1, Math.hypot(dx, dy))
    const v = Math.min(speed, d * 3)
    let tvx = (dx / d) * v
    let tvy = (dy / d) * v
    if (wobble) { // jittery, hard-to-predict flight
      tvx += Math.sin(this.t / 83) * 70 + Math.sin(this.t / 37) * 30
      tvy += Math.cos(this.t / 71) * 70 + Math.sin(this.t / 29) * 25
    }
    const k = Math.min(1, dt * turn)
    this.vx += (tvx - this.vx) * k
    this.vy += (tvy - this.vy) * k
    this.cx += this.vx * dt
    this.cy += this.vy * dt
    if (Math.abs(this.vx) > 25 && !wobble) this.face = this.vx >= 0 ? 1 : -1
  }

  _pickWaypoint(f, sees) {
    const p = this.cfgp
    const { x0, x1 } = this.arena
    const G = this.ground_y
    if (sees && this.rand() < 0.4) {
      // swoop low near the frog: this is when you can reach the eye
      this.wp = { x: clamp(f.x + f.w / 2 + (this.rand() - 0.5) * 260, x0 + 110, x1 - 110), y: G - 150 - this.rand() * 60 }
    } else {
      this.wp = { x: x0 + 110 + this.rand() * (x1 - x0 - 220), y: G - 330 + this.rand() * 230 }
    }
    this.wp_ms = p.wp_ms[0] + this.rand() * (p.wp_ms[1] - p.wp_ms[0])
  }

  // Signature attacks (mud, lightning, swarm), each on its own timer.
  _attacks(dt_ms, game, f, sees) {
    if (!game || !sees) return
    const hpf = 1 - 0.18 * (this.max_hp - this.hp) // faster when hurt
    for (const name of this.variant.attacks) {
      this.atk[name] -= dt_ms
      if (this.atk[name] > 0) continue
      if (name === 'mud') {
        this.atk.mud = (3600 + this.rand() * 1200) * hpf
        const tx = f.x + f.w / 2, ty = f.y + f.h / 2
        const T = 0.9
        const sxp = this.cx + this.face * 40 * this.k, syp = this.cy + 10
        const vx = (tx - sxp) / T
        const vy = (ty - syp - 0.5 * 900 * T * T) / T
        game.entities.push(new MudBlob(sxp, syp, vx, vy, this.ground_y))
      } else if (name === 'bolt') {
        this.atk.bolt = (4200 + this.rand() * 1500) * hpf
        game.entities.push(new Bolt(f.x + f.w / 2, this.ground_y))
      } else if (name === 'swarm') {
        this.atk.swarm = (7500 + this.rand() * 1500) * hpf
        for (let i = 0; i < 2; i++) {
          const m = new Mosquito(this.cx + (i ? 40 : -40), this.cy + 30, 90)
          m.minion = true; m.mode = 'chase'
          game.entities.push(m)
        }
      }
    }
  }

  _spawnMinions(dt_ms, game) {
    if (!game) return
    this.minion_ms -= dt_ms
    if (this.minion_ms > 0) return
    const p = this.cfgp
    this.minion_ms = p.minion_cd
    const alive = game.entities.filter((e) => e.minion && e.alive).length
    if (alive >= p.minion_max) return
    const m = new Mosquito(this.cx, this.cy + 30, 90)
    m.minion = true
    m.mode = 'chase'
    game.entities.push(m)
  }

  draw(ctx) {
    if (this.phase === 'dormant' || !this.img.complete) return
    const dying = this.phase === 'dying'
    ctx.save()
    // blink while invulnerable
    if (this.inv_ms > 0 && !dying && Math.floor(this.inv_ms / 70) % 2 === 0) ctx.globalAlpha = 0.45
    ctx.translate(this.cx, this.cy - 4 * this.k)
    const shake = this.phase === 'telegraph' ? Math.sin(this.t / 18) * 3 : 0
    ctx.translate(shake, 0)
    ctx.rotate(dying ? this.spin : clamp(this.vx / 900, -0.3, 0.3))
    const buzz = 1 + 0.025 * Math.sin(this.t / 22) // wing-buzz shimmer
    ctx.scale(buzz, 1 / buzz)
    const sx = this.face > 0 ? 0 : CELL.w
    const W = BASE_W * this.k
    const H = (W * CELL.h) / CELL.w
    if (this.variant.hue) ctx.filter = `hue-rotate(${this.variant.hue}deg) saturate(1.5)`
    ctx.drawImage(this.img, sx, 0, CELL.w, CELL.h, -W / 2, -H / 2, W, H)
    ctx.filter = 'none'
    ctx.restore()

    // Glow on the weak point so you can tell where to aim
    if (!dying && !this.harmless && this.inv_ms <= 0) {
      const e = this.eyePos()
      const pulse = 0.55 + 0.45 * Math.sin(this.t / 120)
      const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, 34)
      g.addColorStop(0, `rgba(255,120,140,${0.55 * pulse})`)
      g.addColorStop(1, 'rgba(255,60,90,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(e.x, e.y, 34, 0, Math.PI * 2); ctx.fill()
    }
    if (dying) { // little explosion puffs
      const k = this.ms / 2400
      ctx.save()
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4 + this.t / 400
        const r = 20 + k * 90 * ((i % 3) + 1) / 3
        ctx.fillStyle = `rgba(255,${150 + (i % 3) * 40},60,${0.55 * (1 - k)})`
        ctx.beginPath(); ctx.arc(this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r * 0.7, 10 + (i % 4) * 4, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()
    }
  }
}
