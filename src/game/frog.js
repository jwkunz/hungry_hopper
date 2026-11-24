import { PhysicsODE2D } from './physics.js'
import { Sprite, SpriteMask } from './sprite.js'
import frogSheet from '../assets/sprites/frog/frog.png'
import tongueSheet from '../assets/sprites/frog/tongue.png'
import crosshairsSheet from '../assets/sprites/frog/crosshairs.png'

export const FrogState = Object.freeze({
  REST: 'rest',
  JUMP_UP: 'jump_up',
  JUMP_DOWN: 'jump_down',
  EAT: 'eat',
})

// Tongue frames played during one eat: out to the max, then back in.
const TONGUE_SEQUENCE = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0]

const BODY_MASKS = new Map([
  ['rest right', new SpriteMask(0, 0, 865, 475)],
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
  // v1 had y=260 here (copy/paste slip that showed the frame-2 row)
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
  constructor(cfg, p_x = 0, ground_y = 0, scale = cfg.frog_scale) {
    this.cfg = cfg
    this.scale = scale
    this.state = FrogState.REST
    this.is_right = true
    this.tongue_angle_deg = 0

    // Eat animation bookkeeping
    this.eat_step = 0 // index into TONGUE_SEQUENCE; == length means "reloading"
    this.eat_timer_ms = 0

    this.physics = new PhysicsODE2D()
    this.physics.p_x = p_x
    this.physics.mass = cfg.frog_mass
    this.physics.g = 0
    this.physics.drag = cfg.frog_drag_walk

    this.body = new Sprite(frogSheet, BODY_MASKS, 'rest right', p_x, 0, scale)
    this.tongue = new Sprite(tongueSheet, TONGUE_MASKS, 'right 0', 0, 0, scale)
    this.crosshairs = new Sprite(crosshairsSheet, CROSSHAIR_MASKS, 'on', 0, 0, scale)

    this.height = BODY_MASKS.get('rest right').s_height * scale
    this.body_width = Math.max(...[...BODY_MASKS.values()].map((m) => m.s_width)) * scale
    this.min_x = -Infinity
    this.max_x = Infinity
    this.setGround(ground_y)
    this.physics.p_y = this.ground_y - this.height
    this._syncSprites()
  }

  // The y coordinate of the floor the frog's feet rest on.
  setGround(y) {
    this.ground_y = y
    this.rest_y = y - this.height
    if (this.state === FrogState.REST) this.physics.p_y = this.rest_y
  }

  // Keep the whole frog inside [0, width] horizontally.
  setBounds(width) {
    this.min_x = 0
    this.max_x = Math.max(0, width - this.body_width)
  }

  get dir() {
    return this.is_right ? 'right' : 'left'
  }

  // input: { left, right, up, down, jump, eat } booleans
  update(dt_ms, input) {
    const { cfg, physics } = this

    // Face the direction of travel; hold the last facing when nearly stopped.
    if (physics.v_x > 1) this.is_right = true
    else if (physics.v_x < -1) this.is_right = false

    switch (this.state) {
      case FrogState.REST: {
        if (input.left) physics.force_x = -cfg.frog_push_f
        else if (input.right) physics.force_x = cfg.frog_push_f
        else physics.force_x = 0

        if (input.up) {
          this.tongue_angle_deg = Math.max(
            this.tongue_angle_deg - cfg.frog_tongue_angle_step_deg,
            -cfg.frog_tongue_angle_limit_up_deg
          )
        } else if (input.down) {
          this.tongue_angle_deg = Math.min(
            this.tongue_angle_deg + cfg.frog_tongue_angle_step_deg,
            cfg.frog_tongue_angle_limit_down_deg
          )
        }

        if (input.jump) {
          this.state = FrogState.JUMP_UP
          physics.drag = cfg.frog_drag_jump
          physics.force_y = -cfg.frog_f_jump
          physics.g = cfg.frog_g_jump
          physics.force_x = 0
        } else if (input.eat) {
          this.state = FrogState.EAT
          this.eat_step = 0
          this.eat_timer_ms = 0
          physics.force_x = 0
        }
        break
      }
      case FrogState.JUMP_UP:
        physics.force_y = 0 // the jump is a one-frame impulse
        if (physics.v_y >= 0) this.state = FrogState.JUMP_DOWN
        break
      case FrogState.JUMP_DOWN:
        if (physics.p_y >= this.rest_y) {
          this.state = FrogState.REST
          physics.g = 0
          physics.v_y = 0
          physics.drag = cfg.frog_drag_walk
          physics.p_y = this.rest_y
        }
        break
      case FrogState.EAT:
        this._updateEat(dt_ms)
        break
    }

    physics.step(dt_ms / 1000)
    if (physics.p_x < this.min_x) {
      physics.p_x = this.min_x
      physics.v_x = Math.max(0, physics.v_x)
    } else if (physics.p_x > this.max_x) {
      physics.p_x = this.max_x
      physics.v_x = Math.min(0, physics.v_x)
    }
    this._syncSprites()
  }

  _updateEat(dt_ms) {
    const { cfg } = this
    this.eat_timer_ms += dt_ms
    const reloading = this.eat_step >= TONGUE_SEQUENCE.length
    const limit = reloading ? cfg.frog_tongue_reload_ms : cfg.frog_tongue_action_ms
    if (this.eat_timer_ms > limit) {
      this.eat_timer_ms = 0
      this.eat_step += 1
      if (reloading) {
        this.eat_step = 0
        this.state = FrogState.REST
      }
    }
  }

  // Update sprite animation states / positions from the simulation state.
  _syncSprites() {
    const dir = this.dir
    this.body.p_x = this.physics.p_x
    this.body.p_y = this.physics.p_y

    switch (this.state) {
      case FrogState.REST:
        this.body.state = `rest ${dir}`
        this.crosshairs.state = 'on'
        this.tongue.state = `${dir} 0`
        break
      case FrogState.JUMP_UP:
        this.body.state = `jump up ${dir}`
        this.crosshairs.state = 'off'
        this.tongue.state = `${dir} 0`
        break
      case FrogState.JUMP_DOWN:
        this.body.state = `jump down ${dir}`
        this.crosshairs.state = 'off'
        this.tongue.state = `${dir} 0`
        break
      case FrogState.EAT: {
        const frame = this.eat_step < TONGUE_SEQUENCE.length ? TONGUE_SEQUENCE[this.eat_step] : 0
        this.body.state = `eat ${dir}`
        this.crosshairs.state = 'on'
        this.tongue.state = `${dir} ${frame}`
        break
      }
    }
    this._placeTongue()
  }

  // Position the tongue and crosshairs relative to the body and aim angle.
  _placeTongue() {
    const s = this.scale
    const eat = BODY_MASKS.get('eat right')
    const cross_w = CROSSHAIR_MASKS.get('on').s_width * s
    const len_tongue = this.tongue.mask().s_width * s
    const R = TONGUE_MASKS.get('right 5').s_width * s
    const theta = (this.tongue_angle_deg * Math.PI) / 180
    const c = Math.cos(theta)
    const sn = Math.sin(theta)

    this.tongue.p_y = this.body.p_y + eat.s_height * 0.4 * s

    if (this.is_right) {
      this.tongue.p_x = this.body.p_x + eat.s_width * 0.6 * s
      this.crosshairs.p_x = this.tongue.p_x + R * c - cross_w / 2
      this.crosshairs.p_y = this.tongue.p_y + R * sn
      this.tongue.rotation = theta
    } else {
      this.tongue.p_x = this.body.p_x + eat.s_width * 0.4 * s
      this.crosshairs.p_x = this.tongue.p_x - R * c - cross_w / 2
      this.crosshairs.p_y = this.tongue.p_y + R * sn
      this.tongue.p_x -= len_tongue * c
      this.tongue.p_y += len_tongue * sn
      this.tongue.rotation = -theta
    }
  }

  draw(ctx) {
    this.tongue.draw(ctx)
    this.crosshairs.draw(ctx)
    this.body.draw(ctx)
  }
}
