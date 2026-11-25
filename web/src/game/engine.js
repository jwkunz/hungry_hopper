import { CONFIG, frogHitbox } from './config.js'
import { Frog } from './frog.js'
import { createLevel1 } from './level.js'
import { spawnEntities, Firefly } from './entities.js'
import { drawBackground, drawWorld, drawWater, drawHud, drawDebug, drawScreen } from './render.js'
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
    this.particles = [] // water bubbles
    this.bubble_ms = 0
    this.last_cut_shot = -1
    this.elapsed_ms = 0
    this.accumulator = 0
    this.prevJump = false
    this.prevAny = false
    this.tapQueued = false
    this.paused = false

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

  // Pause freezes the simulation (only while actually playing or dying).
  setPaused(p) {
    this.paused = !!p && (this.state === GameState.PLAY || this.state === GameState.DYING)
    this.accumulator = 0
    this.prevAny = true // don't let a held button count as a fresh press on resume
    this.prevJump = true
    return this.paused
  }

  // Abandon the current run and go back to the title screen
  quitToTitle() {
    this.paused = false
    this._newRun()
    this._enter(GameState.TITLE)
  }

  // Start a fresh run from the beginning
  restartRun() {
    this.paused = false
    this._newRun()
    this._enter(GameState.PLAY)
  }

  update(frame_ms, input) {
    const { cfg } = this
    if (this.paused) {
      this.tapQueued = false
      return
    }
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
    this.particles = []
    this.last_cut_shot = -1
    for (const l of this.level.leaves) { l.dip = 0; l.y = l.y0 }
    // Keep what is ahead of the checkpoint, but carve a safe zone around the
    // spawn point so you never respawn inside a briar or under a mosquito.
    const lo = x - this.cfg.spawn_clear_behind
    const hi = x + this.cfg.spawn_clear_ahead
    this.entities = spawnEntities(this.level).filter(
      (e) => (this.checkpoint < 0 || e.cx > x) && !(e.cx > lo && e.cx < hi && !(e instanceof Firefly)),
    )
    if (this.deaths > 0) this.frog.invuln_ms = this.cfg.spawn_invuln_ms // grace after a death
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
    this._updateLeaves(dt_ms)
    this._updateParticles(dt_ms)

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
    this._updateEaten()

    // Air: stay under too long and you drown
    if (frog.hidden) this._bubbles(dt_ms)
    if (frog.breath_ms <= 0) {
      this._popup(frog.x + frog.w / 2, frog.y - 10, 'OUT OF AIR!')
      return this._die()
    }

    // Tongue: eat enemies, cut briars, grab pickups (nearest thing wins)
    const seg = frog.tongueSegment()
    if (seg) {
      let best = null
      let bestD = Infinity
      for (const e of this.entities) {
        if (!e.alive || !(e.edible || e.lickable)) continue
        if (!segmentHitsRect(seg.x1, seg.y1, seg.x2, seg.y2, e.hitbox, cfg.tongue_thickness / 2)) continue
        const d = Math.hypot(e.cx - seg.x1, e.cy - seg.y1)
        if (d < bestD) { best = e; bestD = d }
      }
      if (best) {
        if (best.lickable) {
          // A shot cuts away at most ONE section: the nearest one it touched.
          if (this.last_cut_shot !== frog.shot_id) {
            this.last_cut_shot = frog.shot_id
            best.lick()
            this._emit('cut')
            this._addScore(cfg.points_briar, best.cx, best.cy)
          }
        } else {
          this._eat(best)
        }
        frog.retractTongue()
      }
    }

    // Body contacts: stomp, get hit, or collect
    const fb = frog.hitbox
    for (const e of this.entities) {
      if (!e.alive || !rectsOverlap(fb, e.hitbox)) continue
      if (e.kind !== 'pickup' && frog.hidden) continue // hiding underwater
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

  // Leaves sink a little under the frog's weight and spring back up.
  _updateLeaves(dt_ms) {
    const { cfg, frog, level } = this
    const dt = dt_ms / 1000
    for (const l of level.leaves) {
      const standing =
        !frog.dead && frog.grounded && frog.x + frog.w > l.x && frog.x < l.x + l.w &&
        Math.abs(frog.y + frog.h - l.y) < 3
      const target = standing ? cfg.leaf_dip : 0
      const speed = (standing ? cfg.leaf_dip_down : cfg.leaf_dip_up) * dt
      const before = l.dip
      l.dip += Math.max(-speed, Math.min(speed, target - l.dip))
      l.y = l.y0 + l.dip
      if (standing) frog.physics.p_y += l.dip - before // ride the leaf down
    }
  }

  _bubbles(dt_ms) {
    this.bubble_ms -= dt_ms
    if (this.bubble_ms > 0) return
    this.bubble_ms = 260 + Math.random() * 200
    const f = this.frog
    this.particles.push({
      x: f.x + f.w / 2 + (Math.random() - 0.5) * 30,
      y: f.y + 4,
      r: 2 + Math.random() * 3,
      age: 0,
    })
  }

  _updateParticles(dt_ms) {
    for (const p of this.particles) {
      p.age += dt_ms
      p.y -= 45 * (dt_ms / 1000)
    }
    this.particles = this.particles.filter((p) => p.age < 1200)
  }

  // Only entities near the screen move
  _updateEntities(dt_ms) {
    const { cfg } = this
    const lo = this.camera_x - cfg.active_margin
    const hi = this.camera_x + cfg.view_w + cfg.active_margin
    for (const e of this.entities) {
      if (!e.alive || (e.cx > lo && e.cx < hi)) e.update(dt_ms, this)
    }
    this.entities = this.entities.filter((e) => !e.gone)
  }

  _drainFrogEvents(play) {
    const ev = this.frog.events
    if (play) for (const e of ev) this._emit(e)
    ev.length = 0
  }

  // Tongue grabbed something edible: it rides the tongue in, then is swallowed
  // (see _updateEaten). Points are awarded on the grab.
  _eat(e) {
    if (e.kind === 'pickup') return this._collect(e, true)
    e.die()
    e.eaten = true
    this._emit('grab')
    this._addScore(this.cfg.points_eat, e.cx, e.cy)
  }

  _updateEaten() {
    const { frog, cfg } = this
    for (const e of this.entities) {
      if (!e.eaten || e.gone) continue
      if (frog.tongueFrame > 0 && !frog.dead) {
        // Stuck to the tip, being reeled in
        const tip = frog.tongueTip()
        e.cx += (tip.x - e.cx) * 0.4
        e.cy += (tip.y - e.cy) * 0.4
        e.swallow_ms = 0
      } else {
        // Tongue is home: into the mouth and gone
        e.swallow_ms += cfg.step_ms
        e.cx += (frog.mouth.x - e.cx) * 0.35
        e.cy += (frog.mouth.y + 6 - e.cy) * 0.35
        e.scale_mul = Math.max(0, 1 - e.swallow_ms / cfg.swallow_ms)
        if (e.swallow_ms >= cfg.swallow_ms) {
          e.gone = true
          this._emit('eat') // gulp
        }
      }
    }
    this.entities = this.entities.filter((e) => !e.gone)
  }

  _stomp(e) {
    e.die()
    this.frog.bounce(this.prevJump)
    this._emit('stomp')
    this._addScore(this.cfg.points_stomp, e.cx, e.cy)
  }

  _collect(e, viaTongue = false) {
    e.die()
    if (viaTongue) { e.eaten = true; e.swallow_ms = 0 }
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
    drawBackground(ctx, cam, cfg, level, this.elapsed_ms)
    ctx.save()
    ctx.translate(-cam, 0)
    drawWorld(ctx, level, cam, cfg, this.checkpoint, this.elapsed_ms)
    for (const e of this.entities) {
      if (e.cx > cam - 200 && e.cx < cam + cfg.view_w + 200) e.draw(ctx)
    }
    this.frog.draw(ctx)
    drawWater(ctx, level, cam, cfg, this.elapsed_ms, this.particles)
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
