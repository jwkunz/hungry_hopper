import { CONFIG, frogHitbox } from './config.js'
import { Frog } from './frog.js'
import { createLevel1 } from './level.js'
import { spawnEntities } from './entities.js'
import { drawBackground, drawWorld, drawHud, drawDebug, drawScreen } from './render.js'
import { rectsOverlap, segmentHitsRect, isStomp } from './collision.js'
import { loadHighScore, saveHighScore } from './storage.js'

export const GameState = Object.freeze({
  TITLE: 'title',
  PLAY: 'play',
  DYING: 'dying',
  GAMEOVER: 'gameover',
  COMPLETE: 'complete',
})

const IDLE_INPUT = Object.freeze({ left: false, right: false, up: false, down: false, jump: false, eat: false })

// Framework-agnostic game core. React owns the canvas and the loop; this
// class owns the simulation and draws itself in logical view units
// (cfg.view_w x cfg.view_h). The caller sets the canvas transform.
//
// Flow:  TITLE -> PLAY -> (DYING -> PLAY at checkpoint | GAMEOVER) -> TITLE
//                    \-> COMPLETE -> TITLE
// Rules: one hit kills the frog, unless it holds a shield (from a firefly),
// which absorbs exactly one hit. Landing on top of an enemy stomps it; any
// other contact is a hit. The tongue eats enemies and grabs pickups.
//
// `onEvent(name)` is called for sound/music cues, e.g. 'jump', 'music:play'.
export class Game {
  constructor(cfg = CONFIG, level = createLevel1(), { debug = false, onEvent = null } = {}) {
    this.cfg = cfg
    this.level = level
    this.debug = debug
    this.onEvent = onEvent
    this.high_score = loadHighScore()
    this.new_high = false
    this.popups = []
    this.elapsed_ms = 0
    this.accumulator = 0
    this.prevJump = false
    this.prevAny = false
    this.tapQueued = false

    const hb = frogHitbox(cfg)
    this.frog = new Frog(cfg, level.spawn_x, level.ground_y - hb.h - 1)
    this._newRun()
    this._enter(GameState.TITLE)
  }

  // ---- public API ----

  // A tap/click on the playfield (advances non-play screens)
  tap() {
    this.tapQueued = true
  }

  update(frame_ms, input) {
    const { cfg } = this
    frame_ms = Math.min(frame_ms, cfg.max_frame_ms)

    const any = input.jump || input.eat
    const pressed = (any && !this.prevAny) || this.tapQueued
    this.prevAny = any
    this.tapQueued = false

    // Jump press edge -> buffered jump
    if (this.state === GameState.PLAY && input.jump && !this.prevJump) {
      this.frog.jump_buffer_ms = cfg.jump_buffer_ms
    }
    this.prevJump = input.jump

    this.state_ms += frame_ms
    if (this.state !== GameState.PLAY && this.state !== GameState.DYING) {
      if (pressed && this.state_ms > cfg.screen_min_ms) this._advanceScreen()
    }

    this.accumulator += frame_ms
    while (this.accumulator >= cfg.step_ms) {
      this._step(cfg.step_ms, input)
      this.accumulator -= cfg.step_ms
    }
    if (this.state === GameState.PLAY || this.state === GameState.TITLE) {
      this._updateCamera(frame_ms / 1000)
    }
  }

  // ---- state machine ----

  _enter(state) {
    this.state = state
    this.state_ms = 0
    switch (state) {
      case GameState.TITLE:
        this._emit('music:title')
        break
      case GameState.PLAY:
        this._emit('music:play')
        break
      case GameState.GAMEOVER:
      case GameState.COMPLETE:
        this._emit('music:stop')
        this._finishRun()
        break
    }
  }

  _advanceScreen() {
    if (this.state === GameState.TITLE) {
      this._newRun()
      this._enter(GameState.PLAY)
    } else {
      this._resetWorld()
      this._enter(GameState.TITLE)
    }
  }

  _newRun() {
    this.score = 0
    this.lives = this.cfg.start_lives
    this.checkpoint = -1 // index into level.checkpoints
    this.deaths = 0
    this.new_high = false
    this._resetWorld()
  }

  // Put the frog at the start (or last checkpoint) and respawn the world
  // ahead of it. Things already cleared behind the checkpoint stay cleared.
  _resetWorld() {
    const hb = frogHitbox(this.cfg)
    const x = this.checkpoint >= 0 ? this.level.checkpoints[this.checkpoint].x : this.level.spawn_x
    this.frog.respawn(x, this.level.ground_y - hb.h - 1)
    this.entities = spawnEntities(this.level).filter((e) => this.checkpoint < 0 || e.cx > x)
    this._snapCamera()
  }

  _finishRun() {
    if (this.score > this.high_score) {
      this.high_score = this.score
      this.new_high = true
      saveHighScore(this.score)
    }
  }

  _die() {
    if (this.state !== GameState.PLAY) return
    this.lives -= 1
    this.deaths += 1
    this.frog.die()
    this._emit('die')
    this._enter(GameState.DYING)
  }

  _complete() {
    const bonus = this.lives * this.cfg.points_life_bonus
    this.bonus = bonus
    this.score += bonus
    this._emit('win')
    this._enter(GameState.COMPLETE)
  }

  // ---- simulation ----

  _step(dt_ms, input) {
    const { cfg, frog, level } = this
    this.elapsed_ms += dt_ms
    this._updatePopups(dt_ms)

    switch (this.state) {
      case GameState.TITLE:
      case GameState.GAMEOVER:
      case GameState.COMPLETE:
        // The world idles behind the screen: frog settles, bugs hover.
        frog.update(dt_ms, IDLE_INPUT, level)
        this._drainFrogEvents(false)
        this._updateEntities(dt_ms)
        return

      case GameState.DYING:
        frog.update(dt_ms, IDLE_INPUT, level)
        if (this.state_ms >= cfg.death_ms) {
          if (this.lives > 0) {
            this._resetWorld()
            this._enter(GameState.PLAY)
          } else {
            this._enter(GameState.GAMEOVER)
          }
        }
        return
    }

    // ---- PLAY ----
    const prevBottom = frog.y + frog.h
    const prevVy = frog.physics.v_y
    frog.update(dt_ms, input, level)
    this._drainFrogEvents(true)
    this._updateEntities(dt_ms)

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
        if (this.state !== GameState.PLAY) return
      }
    }

    // Checkpoints and goal
    const cx = frog.x + frog.w / 2
    level.checkpoints.forEach((cp, i) => {
      if (i > this.checkpoint && cx > cp.x) {
        this.checkpoint = i
        this._popup(cp.x, level.ground_y - 70, 'CHECKPOINT')
        this._emit('checkpoint')
      }
    })
    if (cx > level.goal_x) return this._complete()

    if (frog.y > level.height + 120) this._die()
  }

  // Only entities near the screen move
  _updateEntities(dt_ms) {
    const { cfg } = this
    const lo = this.camera_x - cfg.active_margin
    const hi = this.camera_x + cfg.view_w + cfg.active_margin
    for (const e of this.entities) {
      if (!e.alive || (e.cx > lo && e.cx < hi)) e.update(dt_ms)
    }
    this.entities = this.entities.filter((e) => !e.gone)
  }

  _drainFrogEvents(play) {
    const ev = this.frog.events
    if (play) for (const e of ev) this._emit(e)
    ev.length = 0
  }

  _eat(e) {
    e.die()
    if (e.kind === 'pickup') return this._collect(e)
    this._emit('eat')
    this._addScore(this.cfg.points_eat, e.cx, e.cy)
  }

  _stomp(e) {
    e.die()
    this.frog.bounce(this.prevJump)
    this._emit('stomp')
    this._addScore(this.cfg.points_stomp, e.cx, e.cy)
  }

  _collect(e) {
    e.die()
    this.frog.shield = true
    this._emit('pickup')
    this._addScore(this.cfg.points_pickup, e.cx, e.cy, 'SHIELD!')
  }

  // An enemy touched the frog the wrong way
  _hurt() {
    const f = this.frog
    if (f.shield) {
      f.shield = false
      f.invuln_ms = this.cfg.invuln_ms
      this._emit('shield_lost')
      this._popup(f.x + f.w / 2, f.y - 6, 'SHIELD LOST')
    } else {
      this._die()
    }
  }

  _emit(name) {
    if (this.onEvent) this.onEvent(name)
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

  // ---- camera ----

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

  // ---- drawing ----

  draw(ctx) {
    const { cfg, level } = this
    const cam = Math.round(this.camera_x)
    ctx.fillStyle = cfg.background
    ctx.fillRect(0, 0, cfg.view_w, cfg.view_h)
    drawBackground(ctx, cam, cfg, level)
    ctx.save()
    ctx.translate(-cam, 0)
    drawWorld(ctx, level, cam, cfg, this.checkpoint)
    for (const e of this.entities) {
      if (e.cx > cam - 200 && e.cx < cam + cfg.view_w + 200) e.draw(ctx)
    }
    this.frog.draw(ctx)
    for (const p of this.popups) this._drawPopup(ctx, p)
    if (this.debug) drawDebug(ctx, this)
    ctx.restore()
    if (this.state === GameState.PLAY || this.state === GameState.DYING) drawHud(ctx, this)
    else drawScreen(ctx, this)
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
