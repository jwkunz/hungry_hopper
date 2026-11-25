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
    p.drag_y = 0
    p.g = this.cfg.gravity
    this.dead = false
    this.shield = false
    this.glide_ms = 0 // dragonfly power: hold JUMP in the air to glide
    this.fire_ms = 0 // pepper power: the tongue burns
    this.gliding = false
    this.grapple = null // { x, y, phase: 'reel' | 'hang', ms }
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
    this.walk_phase = 0 // advances with distance walked
    this.walk_k = 0 // 0..1 how much the walk bounce is applied
    this.anim_ms = 0
    this.shot_id = 0 // increments on every tongue shot (briars count licks per shot)
    this.in_water = false
    this.hidden = false // fully submerged: enemies can't see or hurt the frog
    this.breath_ms = this.cfg.breath_ms
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

  // The tongue's centre line as a segment from the mouth (x1,y1) to the tip
  // (x2,y2), for hit tests. Derived from the sprite's own transform, so it
  // always matches what is drawn, at any aim angle. Null when tucked away.
  tongueSegment() {
    if (this.tongueFrame === 0) return null
    const m = this.tongue.mask()
    const len = m.s_width * this.scale
    const hc = (m.s_height * this.scale) / 2
    const rot = this.tongue.rotation
    const c = Math.cos(rot)
    const sn = Math.sin(rot)
    const at = (lx, ly) => ({
      x: this.tongue.p_x + lx * c - ly * sn,
      y: this.tongue.p_y + lx * sn + ly * c,
    })
    const a = at(0, hc)
    const b = at(len, hc)
    // Right-facing: the root is the sprite's left end. Left-facing: its right end.
    const [root, tip] = this.is_right ? [a, b] : [b, a]
    return { x1: root.x, y1: root.y, x2: tip.x, y2: tip.y }
  }

  // Where a captured bug rides: the tongue tip, or the mouth when tucked.
  tongueTip() {
    const seg = this.tongueSegment()
    return seg ? { x: seg.x2, y: seg.y2 } : { x: this.mouth.x, y: this.mouth.y + 6 }
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
    p.g = this.cfg.gravity
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
    this.glide_ms = Math.max(0, this.glide_ms - dt_ms)
    this.fire_ms = Math.max(0, this.fire_ms - dt_ms)
    if (this.grapple) {
      this._updateGrapple(dt_ms, input, level)
      return
    }

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
      this.shot_id += 1
      this.events.push('tongue')
    } else if (this.tongue_step >= 0) {
      this._updateTongue(dt_ms)
    }

    // --- Environment: water, mud ---
    const cx = this.x + this.w / 2
    const pond = level.pondAt(cx)
    const surface = pond ? pond.surface_y : Infinity
    const wasWater = this.in_water
    this.in_water = !!pond && this.y + this.h > surface + 2 // feet in the water
    this.hidden = !!pond && this.y > surface - 4
    if (this.in_water && !wasWater && Math.abs(p.v_y) > 120) this.events.push('splash')
    if (this.hidden) {
      this.breath_ms = Math.max(0, this.breath_ms - dt_ms)
    } else {
      this.breath_ms = Math.min(cfg.breath_ms, this.breath_ms + dt_ms * cfg.breath_refill)
    }
    const inMud = this.grounded && !this.in_water && level.mudAt(cx)

    // --- Horizontal control (planted while the tongue is out on the ground) ---
    p.g = this.in_water ? cfg.gravity * cfg.water_gravity : cfg.gravity
    p.drag = this.in_water ? cfg.water_drag_x : this.grounded ? cfg.ground_drag : cfg.air_drag
    p.drag_y = this.in_water ? cfg.water_drag_y : 0
    const speed = this.in_water ? cfg.swim_speed : cfg.run_speed * (inMud ? cfg.mud_speed : 1)
    const dirInput = (input.right ? 1 : 0) - (input.left ? 1 : 0)
    const planted = this.grounded && !this.in_water && this.tongueExtending
    if (planted || dirInput === 0) {
      p.force_x = 0
    } else {
      p.force_x = dirInput * speed * p.drag // terminal speed = speed
      this.is_right = dirInput > 0
    }

    // --- Jump (buffered, coyote time, variable height) / swim stroke ---
    if (this.jump_buffer_ms > 0) {
      if (this.in_water) {
        // Head above the surface: hop out; otherwise kick upward.
        const headOut = this.y + this.h * 0.3 < surface
        p.v_y = headOut ? -cfg.jump_speed * cfg.water_out_jump : -cfg.swim_stroke
        this.jumping = headOut
        this.grounded = false
        this.jump_buffer_ms = 0
        this.events.push(headOut ? 'jump' : 'bounce')
      } else if (this.coyote_ms > 0) {
        p.v_y = -cfg.jump_speed * (inMud ? cfg.mud_jump : 1)
        this.jumping = true
        this.grounded = false
        this.jump_buffer_ms = 0
        this.coyote_ms = 0
        this.events.push('jump')
      }
    }
    if (this.jumping && !input.jump && p.v_y < -cfg.jump_speed * cfg.jump_cut) {
      p.v_y = -cfg.jump_speed * cfg.jump_cut
    }

    // --- Dragonfly glide: hold JUMP while falling ---
    this.gliding = false
    if (this.glide_ms > 0 && !this.grounded && !this.in_water && input.jump && p.v_y > cfg.glide_fall) {
      p.v_y = cfg.glide_fall
      this.gliding = true
      if (dirInput !== 0) p.force_x = dirInput * speed * cfg.glide_speed_mul * p.drag
    }

    // --- Integrate + collide ---
    const prevX = p.p_x
    const prevY = p.p_y
    const prevVy = p.v_y
    p.step(dt)
    const hit = moveAndCollide(p, this.w, this.h, prevX, prevY, level.solids)
    if (hit.grounded && !this.grounded && prevVy > 350 && !this.in_water) this.events.push('land')
    this.grounded = hit.grounded
    if (this.grounded) this.jumping = false

    // Walk-cycle bookkeeping: the bounce advances with distance covered
    this.anim_ms += dt_ms
    const walking = this.grounded && !this.in_water && !this.tongueExtending
    const moveFrac = walking ? Math.min(1, Math.abs(p.v_x) / cfg.run_speed) : 0
    this.walk_k += (moveFrac - this.walk_k) * Math.min(1, dt * 14)
    if (walking) this.walk_phase += (Math.abs(p.v_x) * dt / cfg.walk_stride_px) * Math.PI * 2

    // Level edges
    if (p.p_x < 0) { p.p_x = 0; p.v_x = Math.max(0, p.v_x) }
    const maxX = level.width - this.w
    if (p.p_x > maxX) { p.p_x = maxX; p.v_x = Math.min(0, p.v_x) }

    this._syncSprites()
  }

  // The tongue stuck to a grapple anchor: reel the frog in, then hang there.
  startGrapple(anchor) {
    if (this.grapple || this.dead) return
    this.grapple = { x: anchor.cx, y: anchor.cy, phase: 'reel', ms: 0 }
    this.tongue_step = -1
    this.grounded = false
    this.jumping = false
    this.is_right = anchor.cx >= this.x + this.w / 2
    this.events.push('grapple')
  }

  _releaseGrapple(input, launch) {
    const { cfg, physics: p } = this
    this.grapple = null
    if (launch) {
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0) || (this.is_right ? 1 : -1)
      p.v_x = dir * cfg.grapple_launch_x
      p.v_y = -cfg.grapple_launch_y
      this.is_right = dir > 0
      this.jumping = true
      this.events.push('jump')
    } else {
      p.v_x *= 0.3
      p.v_y = Math.max(p.v_y, 0)
    }
    this.coyote_ms = 0
    this.jump_buffer_ms = 0
    // brief reload so the tongue cannot be spammed straight away
    this.tongue_step = TONGUE_SEQUENCE.length
    this.tongue_timer_ms = 0
  }

  _updateGrapple(dt_ms, input, level) {
    const { cfg, physics: p } = this
    const dt = dt_ms / 1000
    const g = this.grapple
    g.ms += dt_ms
    this.hidden = false
    this.in_water = false
    p.drag = 0
    p.drag_y = 0
    p.g = 0
    p.force_x = p.force_y = 0

    if (this.jump_buffer_ms > 0) return this._releaseGrapple(input, true) // fling!
    if (input.down && g.ms > 200) return this._releaseGrapple(input, false) // let go

    const cx = this.x + this.w / 2
    const cy = this.y + this.h * 0.35
    const dx = g.x - cx
    const dy = g.y - cy
    const d = Math.hypot(dx, dy)
    if (g.phase === 'reel') {
      if (d < 22) {
        g.phase = 'hang'
        g.ms = 0
        p.p_x = g.x - this.w / 2
        p.p_y = g.y - this.h * 0.35
        p.v_x = p.v_y = 0
      } else if (g.ms > 1200) {
        return this._releaseGrapple(input, false) // blocked on the way
      } else {
        p.v_x = (dx / d) * cfg.grapple_speed
        p.v_y = (dy / d) * cfg.grapple_speed
        this.is_right = dx >= 0
      }
    } else {
      p.v_x = p.v_y = 0
      if (g.ms > cfg.grapple_hang_ms) return this._releaseGrapple(input, false)
    }
    const prevX = p.p_x
    const prevY = p.p_y
    p.step(dt)
    moveAndCollide(p, this.w, this.h, prevX, prevY, level.solids)
    this.grounded = false
    this.anim_ms += dt_ms
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

    // Squash & bob while walking (rest pose only), a little breathing at idle.
    // Purely visual: the hitbox never changes.
    const cfg = this.cfg
    let sx = 1
    let sy = 1
    let lift = 0
    if (this.grounded && !this.dead && !this.in_water && !this.tongueExtending) {
      const hop = Math.abs(Math.sin(this.walk_phase / 2)) // 0 at contact, 1 at the top
      const k = this.walk_k
      sy = 1 + k * cfg.walk_squash * (2 * hop - 1) + (1 - k) * cfg.breathe_squash * Math.sin(this.anim_ms / 420)
      sx = 1 - (sy - 1) * 0.8 // keep the volume roughly constant
      lift = -k * cfg.walk_bob_px * hop
    }
    this.body.sx = sx
    this.body.sy = sy

    // Body sprite: bottom-center aligned to the hitbox, whatever the pose.
    const m = this.body.mask()
    const s = this.scale
    this.body.p_x = this.x + this.w / 2 - (m.s_width * s * sx) / 2
    this.body.p_y = this.y + this.h - m.s_height * s * sy + lift
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
    if (this.glide_ms > 0 && !this.grounded && !this.dead) this._drawWings(ctx)
    if (this.grapple) this._drawRope(ctx)
    if (this.fire_ms > 0 && !this.dead) this._drawFire(ctx)
    if (!blink) {
      // Frame 0 is just the tucked-in root of the tongue; drawing it leaves a
      // stray pink blob floating off the body in the jump poses.
      if (this.tongueFrame > 0 && !this.dead) this.tongue.draw(ctx)
      this.crosshairs.draw(ctx)
      this.body.draw(ctx)
    }
    if (this.shield && !this.dead) this._drawShield(ctx)
  }

  _drawRope(ctx) {
    const g = this.grapple
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#d9506a'
    ctx.lineWidth = 9
    ctx.beginPath(); ctx.moveTo(this.mouth.x, this.mouth.y); ctx.lineTo(g.x, g.y); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,200,210,.6)'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(this.mouth.x, this.mouth.y - 2); ctx.lineTo(g.x, g.y - 2); ctx.stroke()
    ctx.restore()
  }

  // Translucent dragonfly wings while the glide power-up is active
  _drawWings(ctx) {
    const cx = this.x + this.w / 2
    const cy = this.y + this.h * 0.35
    const flap = this.gliding ? 0.15 * Math.sin(performance.now() / 60) : Math.sin(performance.now() / 45) * 0.5
    ctx.save()
    ctx.translate(cx, cy)
    ctx.fillStyle = 'rgba(200,245,255,.5)'
    ctx.strokeStyle = 'rgba(120,200,220,.8)'
    ctx.lineWidth = 1.5
    for (const [dx, a] of [[-8, -0.5], [8, 0.5]]) {
      for (const k of [0, 1]) {
        ctx.save()
        ctx.translate(dx, 0)
        ctx.rotate(a * (k ? 1.6 : 1) + flap * (dx < 0 ? -1 : 1))
        ctx.beginPath(); ctx.ellipse(0, -26 - k * 4, 7, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        ctx.restore()
      }
    }
    ctx.restore()
  }

  // Burning glow along the tongue (pepper power-up)
  _drawFire(ctx) {
    const seg = this.tongueSegment()
    if (!seg) return
    const t = performance.now()
    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = 'rgba(255,110,20,.45)'
    ctx.lineWidth = 26
    ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,220,90,.55)'
    ctx.lineWidth = 12
    ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke()
    for (let i = 0; i < 4; i++) {
      const k = (i + 1) / 5
      const x = seg.x1 + (seg.x2 - seg.x1) * k + Math.sin(t / 60 + i) * 4
      const y = seg.y1 + (seg.y2 - seg.y1) * k - 6 - Math.abs(Math.sin(t / 80 + i * 2)) * 8
      ctx.fillStyle = 'rgba(255,160,40,.8)'
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
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
