import { PhysicsODE2D } from './physics.js'
import { Sprite, SpriteMask } from './sprite.js'
import { moveAndCollide } from './collision.js'
import { FROG_REST_SIZE } from './config.js'
import frogSheet from '../assets/sprites/frog/frog.png'
import tongueSheet from '../assets/sprites/frog/tongue.png'
import crosshairsSheet from '../assets/sprites/frog/crosshairs.png'

// Tongue frames played during one eat: out to the max, then back in.
const TONGUE_SEQUENCE = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0]

const BODY_MASKS = new Map([
  ['rest right', new SpriteMask(0, 0, FROG_REST_SIZE.w, FROG_REST_SIZE.h)],
  ['rest left', new SpriteMask(1510, 0, 865, 475)],
  ['jump up right', new SpriteMask(120, 745, 1050, 660)],
  ['jump up left', new SpriteMask(1185, 745, 1050, 660)],
  ['jump down right', new SpriteMask(70, 1410, 1095, 590)],
  ['jump down left', new SpriteMask(1185, 1410, 1095, 590)],
  ['smash right', new SpriteMask(5, 2180, 1180, 346)],
  ['smash left', new SpriteMask(1200, 2180, 1180, 346)],
  ['eat right', new SpriteMask(0, 2645, 890, 465)],
  ['eat left', new SpriteMask(1495, 2645, 890, 465)],
])

const TONGUE_MASKS = new Map([
  ['right 0', new SpriteMask(0, 0, 100, 100)],
  ['left 0', new SpriteMask(1100, 0, 100, 100)],
  ['right 1', new SpriteMask(0, 0, 685, 90)],
  ['left 1', new SpriteMask(2915, 0, 685, 90)],
  ['right 2', new SpriteMask(0, 260, 950, 130)],
  ['left 2', new SpriteMask(2650, 260, 950, 130)],
  ['right 3', new SpriteMask(0, 560, 1210, 120)],
  ['left 3', new SpriteMask(2390, 560, 1210, 120)],
  ['right 4', new SpriteMask(0, 895, 1450, 150)],
  ['left 4', new SpriteMask(2150, 895, 1450, 150)],
  ['right 5', new SpriteMask(0, 1170, 1736, 142)],
  ['left 5', new SpriteMask(2430, 1170, 1736, 142)],
])

const CROSSHAIR_MASKS = new Map([
  ['on', new SpriteMask(0, 0, 175, 175)],
  ['off', new SpriteMask(0, 0, 0, 0)],
])

export class Frog {
  // (x, y) is the top-left of the frog's hitbox in world coordinates.
  constructor(cfg, x, y) {
    this.cfg = cfg
    this.scale = cfg.frog_scale
    this.w = FROG_REST_SIZE.w * this.scale
    this.h = FROG_REST_SIZE.h * this.scale

    this.physics = new PhysicsODE2D()
    this.physics.mass = cfg.frog_mass
    this.physics.g = cfg.gravity

    this.body = new Sprite(frogSheet, BODY_MASKS, 'rest right', 0, 0, this.scale)
    this.tongue = new Sprite(tongueSheet, TONGUE_MASKS, 'right 0', 0, 0, this.scale)
    this.crosshairs = new Sprite(crosshairsSheet, CROSSHAIR_MASKS, 'on', 0, 0, this.scale)
    this.mouth = { x: 0, y: 0 } // where the tongue leaves the body (world coords)
    this.events = [] // sound/feedback events for the engine to drain ('jump', 'tongue', 'land')

    this.respawn(x, y)
  }

  respawn(x, y) {
    const p = this.physics
    p.p_x = x
    p.p_y = y
    p.v_x = p.v_y = 0
    p.force_x = p.force_y = 0
    p.drag = this.cfg.ground_drag
    this.dead = false
    this.shield = false
    this.invuln_ms = 0
    this.is_right = true
    this.grounded = false
    this.jumping = false
    this.coyote_ms = 0
    this.jump_buffer_ms = 0
    this.tongue_angle_deg = 0
    // Tongue: -1 = idle/ready, 0..SEQ.length-1 = extending/retracting,
    // SEQ.length = reloading
    this.tongue_step = -1
    this.tongue_timer_ms = 0
    this._syncSprites()
  }

  get x() { return this.physics.p_x }
  get y() { return this.physics.p_y }
  get dir() { return this.is_right ? 'right' : 'left' }
  get hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h } }

  get tongueExtending() {
    return this.tongue_step >= 0 && this.tongue_step < TONGUE_SEQUENCE.length
  }
  // Current tongue frame 0..5 (0 = tucked away)
  get tongueFrame() {
    return this.tongueExtending ? TONGUE_SEQUENCE[this.tongue_step] : 0
  }

  // The tongue as a line segment (for hit tests), or null when tucked away.
  tongueSegment() {
    const f = this.tongueFrame
    if (f === 0) return null
    const len = this.tongue.mask().s_width * this.scale
    const th = (this.tongue_angle_deg * Math.PI) / 180
    const dx = (this.is_right ? 1 : -1) * Math.cos(th)
    const dy = Math.sin(th)
    const y0 = this.mouth.y + 6 // roughly the tongue's centre line
    return { x1: this.mouth.x, y1: y0, x2: this.mouth.x + dx * len, y2: y0 + dy * len }
  }

  // The tongue hit something: pull it back in instead of finishing the reach.
  retractTongue() {
    const i = this.tongue_step
    if (i >= 0 && i < 5) {
      this.tongue_step = TONGUE_SEQUENCE.length - 1 - i
      this.tongue_timer_ms = 0
    }
  }

  die() {
    if (this.dead) return
    this.dead = true
    this.tongue_step = -1
    const p = this.physics
    p.v_x = 0
    p.v_y = -this.cfg.death_hop
    p.force_x = p.force_y = 0
  }

  // input: { left, right, up, down, jump, eat } booleans (held state).
  // The engine sets jump_buffer_ms when jump is newly pressed.
  update(dt_ms, input, level) {
    const { cfg, physics: p } = this
    const dt = dt_ms / 1000

    if (this.dead) {
      // Death hop: no collisions, just fall off the screen
      p.drag = 0
      p.drag_y = 0
      p.step(dt)
      this._syncSprites()
      return
    }

    this.invuln_ms = Math.max(0, this.invuln_ms - dt_ms)
    this.jump_buffer_ms = Math.max(0, this.jump_buffer_ms - dt_ms)
    this.coyote_ms = this.grounded ? cfg.coyote_ms : Math.max(0, this.coyote_ms - dt_ms)

    // --- Tongue: aim, fire, animate (works on the ground and in the air) ---
    if (!this.tongueExtending) {
      const step = cfg.frog_tongue_aim_deg_per_s * dt
      if (input.up) {
        this.tongue_angle_deg = Math.max(this.tongue_angle_deg - step, -cfg.frog_tongue_angle_limit_up_deg)
      } else if (input.down) {
        this.tongue_angle_deg = Math.min(this.tongue_angle_deg + step, cfg.frog_tongue_angle_limit_down_deg)
      }
    }
    if (input.eat && this.tongue_step < 0) {
      this.tongue_step = 0
      this.tongue_timer_ms = 0
      this.events.push('tongue')
    } else if (this.tongue_step >= 0) {
      this._updateTongue(dt_ms)
    }

    // --- Horizontal control (planted while the tongue is out on the ground) ---
    p.drag = this.grounded ? cfg.ground_drag : cfg.air_drag
    p.drag_y = 0
    const dirInput = (input.right ? 1 : 0) - (input.left ? 1 : 0)
    const planted = this.grounded && this.tongueExtending
    if (planted || dirInput === 0) {
      p.force_x = 0
    } else {
      p.force_x = dirInput * cfg.run_speed * p.drag // terminal speed = run_speed
      this.is_right = dirInput > 0
    }

    // --- Jump (buffered, with coyote time, variable height) ---
    if (this.jump_buffer_ms > 0 && this.coyote_ms > 0) {
      p.v_y = -cfg.jump_speed
      this.jumping = true
      this.grounded = false
      this.jump_buffer_ms = 0
      this.coyote_ms = 0
      this.events.push('jump')
    }
    if (this.jumping && !input.jump && p.v_y < -cfg.jump_speed * cfg.jump_cut) {
      p.v_y = -cfg.jump_speed * cfg.jump_cut
    }

    // --- Integrate + collide ---
    const prevX = p.p_x
    const prevY = p.p_y
    const prevVy = p.v_y
    p.step(dt)
    const hit = moveAndCollide(p, this.w, this.h, prevX, prevY, level.solids)
    if (hit.grounded && !this.grounded && prevVy > 350) this.events.push('land')
    this.grounded = hit.grounded
    if (this.grounded) this.jumping = false

    // Level edges
    if (p.p_x < 0) { p.p_x = 0; p.v_x = Math.max(0, p.v_x) }
    const maxX = level.width - this.w
    if (p.p_x > maxX) { p.p_x = maxX; p.v_x = Math.min(0, p.v_x) }

    this._syncSprites()
  }

  // Bounce off a stomped enemy
  bounce(high) {
    this.physics.v_y = -(high ? this.cfg.stomp_bounce_high : this.cfg.stomp_bounce)
    this.jumping = true
    this.grounded = false
    this.coyote_ms = 0
  }

  _updateTongue(dt_ms) {
    const { cfg } = this
    this.tongue_timer_ms += dt_ms
    const reloading = this.tongue_step >= TONGUE_SEQUENCE.length
    const limit = reloading ? cfg.frog_tongue_reload_ms : cfg.frog_tongue_action_ms
    if (this.tongue_timer_ms > limit) {
      this.tongue_timer_ms = 0
      this.tongue_step = reloading ? -1 : this.tongue_step + 1
    }
  }

  // Update sprite animation states / positions from the simulation state.
  _syncSprites() {
    const dir = this.dir
    if (this.dead) {
      this.body.state = `smash ${dir}`
      this.crosshairs.state = 'off'
    } else if (this.grounded) {
      this.body.state = `${this.tongueExtending ? 'eat' : 'rest'} ${dir}`
      this.crosshairs.state = 'on'
    } else {
      this.body.state = `${this.physics.v_y < 0 ? 'jump up' : 'jump down'} ${dir}`
      this.crosshairs.state = 'on'
    }
    this.tongue.state = `${dir} ${this.dead ? 0 : this.tongueFrame}`

    // Body sprite: bottom-center aligned to the hitbox, whatever the pose.
    const m = this.body.mask()
    const s = this.scale
    this.body.p_x = this.x + this.w / 2 - (m.s_width * s) / 2
    this.body.p_y = this.y + this.h - m.s_height * s
    this._placeTongue()
  }

  // Position the tongue and crosshairs relative to the hitbox and aim angle.
  _placeTongue() {
    const s = this.scale
    const eat = BODY_MASKS.get('eat right')
    const eatLeft = this.x + this.w / 2 - (eat.s_width * s) / 2
    const eatTop = this.y + this.h - eat.s_height * s
    const cross_w = CROSSHAIR_MASKS.get('on').s_width * s
    const len_tongue = this.tongue.mask().s_width * s
    const R = TONGUE_MASKS.get('right 5').s_width * s
    const theta = (this.tongue_angle_deg * Math.PI) / 180
    const c = Math.cos(theta)
    const sn = Math.sin(theta)

    this.tongue.p_y = eatTop + eat.s_height * 0.4 * s
    this.mouth.y = this.tongue.p_y

    if (this.is_right) {
      this.tongue.p_x = eatLeft + eat.s_width * 0.6 * s
      this.mouth.x = this.tongue.p_x
      this.crosshairs.p_x = this.tongue.p_x + R * c - cross_w / 2
      this.crosshairs.p_y = this.tongue.p_y + R * sn
      this.tongue.rotation = theta
    } else {
      this.tongue.p_x = eatLeft + eat.s_width * 0.4 * s
      this.mouth.x = this.tongue.p_x
      this.crosshairs.p_x = this.tongue.p_x - R * c - cross_w / 2
      this.crosshairs.p_y = this.tongue.p_y + R * sn
      this.tongue.p_x -= len_tongue * c
      this.tongue.p_y += len_tongue * sn
      this.tongue.rotation = -theta
    }
  }

  draw(ctx) {
    const blink = this.invuln_ms > 0 && Math.floor(this.invuln_ms / 80) % 2 === 0
    if (!blink) {
      this.tongue.draw(ctx)
      this.crosshairs.draw(ctx)
      this.body.draw(ctx)
    }
    if (this.shield && !this.dead) this._drawShield(ctx)
  }

  _drawShield(ctx) {
    const cx = this.x + this.w / 2
    const cy = this.y + this.h / 2
    const r = Math.max(this.w, this.h) * 0.72
    const pulse = 1 + 0.04 * Math.sin(performance.now() / 150)
    ctx.save()
    ctx.fillStyle = 'rgba(255,240,130,0.16)'
    ctx.strokeStyle = 'rgba(255,240,130,0.75)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}
