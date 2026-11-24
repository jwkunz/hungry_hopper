import { CONFIG, frogHitbox } from './config.js'
import { Frog } from './frog.js'
import { createLevel1 } from './level.js'
import { spawnEntities } from './entities.js'
import { drawBackground, drawWorld, drawHud, drawDebug } from './render.js'
import { rectsOverlap, segmentHitsRect, isStomp } from './collision.js'

export const GameState = Object.freeze({ PLAY: 'play', DYING: 'dying' })

// Framework-agnostic game core. React owns the canvas and the loop; this
// class owns the simulation and draws itself in logical view units
// (cfg.view_w x cfg.view_h). The caller sets the canvas transform.
//
// Rules: one hit kills the frog, unless it holds a shield (from a firefly),
// which absorbs exactly one hit. Landing on top of an enemy stomps it; any
// other contact is a hit. The tongue eats enemies and grabs pickups.
export class Game {
  constructor(cfg = CONFIG, level = createLevel1(), { debug = false } = {}) {
    this.cfg = cfg
    this.level = level
    this.debug = debug
    this.state = GameState.PLAY
    this.elapsed_ms = 0
    this.accumulator = 0
    this.prevJump = false
    this.camera_x = 0
    this.score = 0
    this.deaths = 0
    this.popups = []
    this.dying_ms = 0

    const hb = frogHitbox(cfg)
    this.frog = new Frog(cfg, level.spawn_x, level.ground_y - hb.h - 1)
    this.entities = spawnEntities(level)
    this._snapCamera()
  }

  update(frame_ms, input) {
    const { cfg } = this
    frame_ms = Math.min(frame_ms, cfg.max_frame_ms)

    // Jump press edge -> buffered jump
    if (input.jump && !this.prevJump) this.frog.jump_buffer_ms = cfg.jump_buffer_ms
    this.prevJump = input.jump

    this.accumulator += frame_ms
    while (this.accumulator >= cfg.step_ms) {
      this._step(cfg.step_ms, input)
      this.accumulator -= cfg.step_ms
    }
    if (this.state === GameState.PLAY) this._updateCamera(frame_ms / 1000)
  }

  _step(dt_ms, input) {
    const { cfg, frog, level } = this
    this.elapsed_ms += dt_ms
    this._updatePopups(dt_ms)

    if (this.state === GameState.DYING) {
      frog.update(dt_ms, input, level)
      this.dying_ms += dt_ms
      if (this.dying_ms >= cfg.death_ms) this._restart()
      return
    }

    // Frog first (remember where its feet were, for stomp detection)
    const prevBottom = frog.y + frog.h
    const prevVy = frog.physics.v_y
    frog.update(dt_ms, input, level)

    // Entities (only those near the screen move)
    const lo = this.camera_x - cfg.active_margin
    const hi = this.camera_x + cfg.view_w + cfg.active_margin
    for (const e of this.entities) {
      if (!e.alive || (e.cx > lo && e.cx < hi)) e.update(dt_ms)
    }
    this.entities = this.entities.filter((e) => !e.gone)

    // Tongue: eat enemies, grab pickups
    const seg = frog.tongueSegment()
    if (seg) {
      for (const e of this.entities) {
        if (!e.alive || !e.edible) continue
        if (segmentHitsRect(seg.x1, seg.y1, seg.x2, seg.y2, e.hitbox, cfg.tongue_thickness / 2)) {
          this._eat(e)
          frog.retractTongue()
          break
        }
      }
    }

    // Body contacts: stomp, get hit, or collect
    const fb = frog.hitbox
    for (const e of this.entities) {
      if (!e.alive || !rectsOverlap(fb, e.hitbox)) continue
      if (e.kind === 'pickup') {
        this._collect(e)
      } else if (e.stompable && isStomp(prevBottom, prevVy, e.hitbox)) {
        this._stomp(e)
      } else if (frog.invuln_ms <= 0) {
        this._hurt()
        if (this.state === GameState.DYING) return
      }
    }

    if (frog.y > level.height + 120) this._die()
  }

  _eat(e) {
    e.die()
    if (e.kind === 'pickup') return this._collect(e)
    this._addScore(this.cfg.points_eat, e.cx, e.cy)
  }

  _stomp(e) {
    e.die()
    this.frog.bounce(this.prevJump)
    this._addScore(this.cfg.points_stomp, e.cx, e.cy)
  }

  _collect(e) {
    e.die()
    this.frog.shield = true
    this._addScore(this.cfg.points_pickup, e.cx, e.cy, 'SHIELD!')
  }

  // An enemy touched the frog the wrong way
  _hurt() {
    const f = this.frog
    if (f.shield) {
      f.shield = false
      f.invuln_ms = this.cfg.invuln_ms
      this._popup(f.x + f.w / 2, f.y - 6, 'SHIELD LOST')
    } else {
      this._die()
    }
  }

  _die() {
    if (this.state === GameState.DYING) return
    this.state = GameState.DYING
    this.dying_ms = 0
    this.deaths += 1
    this.frog.die()
  }

  _restart() {
    const hb = frogHitbox(this.cfg)
    this.frog.respawn(this.level.spawn_x, this.level.ground_y - hb.h - 1)
    this.entities = spawnEntities(this.level)
    this.state = GameState.PLAY
    this._snapCamera()
  }

  _addScore(points, x, y, label) {
    this.score += points
    this._popup(x, y, label ?? `+${points}`)
  }

  _popup(x, y, text) {
    this.popups.push({ x, y, text, age: 0 })
  }

  _updatePopups(dt_ms) {
    for (const p of this.popups) p.age += dt_ms
    this.popups = this.popups.filter((p) => p.age < 900)
  }

  _cameraTarget() {
    const { cfg, level, frog } = this
    const t = frog.x + frog.w / 2 - cfg.view_w * cfg.camera_lead
    return Math.max(0, Math.min(t, level.width - cfg.view_w))
  }

  _snapCamera() {
    this.camera_x = this._cameraTarget()
  }

  _updateCamera(dt) {
    const k = 1 - Math.exp(-this.cfg.camera_smooth * dt)
    this.camera_x += (this._cameraTarget() - this.camera_x) * k
  }

  draw(ctx) {
    const { cfg, level } = this
    const cam = Math.round(this.camera_x)
    ctx.fillStyle = cfg.background
    ctx.fillRect(0, 0, cfg.view_w, cfg.view_h)
    drawBackground(ctx, cam, cfg, level)
    ctx.save()
    ctx.translate(-cam, 0)
    drawWorld(ctx, level, cam, cfg)
    for (const e of this.entities) {
      if (e.cx > cam - 200 && e.cx < cam + cfg.view_w + 200) e.draw(ctx)
    }
    this.frog.draw(ctx)
    for (const p of this.popups) this._drawPopup(ctx, p)
    if (this.debug) drawDebug(ctx, this)
    ctx.restore()
    drawHud(ctx, this)
  }

  _drawPopup(ctx, p) {
    const t = p.age / 900
    ctx.save()
    ctx.globalAlpha = 1 - t * t
    ctx.font = 'bold 20px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(0,0,0,.6)'
    ctx.fillStyle = '#ffe97a'
    const y = p.y - t * 40
    ctx.strokeText(p.text, p.x, y)
    ctx.fillText(p.text, p.x, y)
    ctx.restore()
  }
}
