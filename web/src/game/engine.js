import { CONFIG, frogHitbox } from './config.js'
import { Frog } from './frog.js'
import { createLevel1 } from './level.js'
import { spawnEntities } from './spawn.js'
import { drawBackground, drawWorld, drawWater, drawHud, drawDebug, drawScreen, drawDarkness } from './render.js'
import { rectsOverlap, segmentHitsRect, isStomp } from './collision.js'
import { TITLE_LEVELS_BTN, SELECT_BACK_BTN, SELECT_CARDS, hitRect } from './ui.js'
import { loadHighScore, saveHighScore, loadProgress, saveProgress } from './storage.js'

export const GameState = Object.freeze({
  TITLE: 'title',
  PLAY: 'play',
  DYING: 'dying',
  GAMEOVER: 'gameover',
  COMPLETE: 'complete',
  SELECT: 'select',
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

const clampIndex = (i, n) => Math.max(0, Math.min(n - 1, i | 0))

export class Game {
  constructor(cfg = CONFIG, level = null, { debug = false, onEvent = null, levels = null, progress = null } = {}) {
    this.cfg = cfg
    // `levels` = the campaign (see levels/index.js). Without it the game is a
    // single level (used by the tests), with no level select or next level.
    this.levels = levels
    this.progress = levels ? (progress ?? loadProgress()) : null
    this.level_index = 0
    this.select_index = 0
    this.tapPos = null
    this.prevLeft = false
    this.prevRight = false
    this.secrets_run = new Set()
    if (!level) level = levels ? levels[0].build() : createLevel1()
    this.level = level
    this.debug = debug
    this.onEvent = onEvent
    this.high_score = this._bestScore()
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
  // (x, y) are logical view coordinates when the tap came from a pointer.
  tap(x = null, y = null) {
    this.tapQueued = true
    this.tapPos = x === null ? null : { x, y }
  }

  _bestScore() {
    return this.levels ? (this.progress.best[this.level.id] ?? 0) : loadHighScore()
  }

  // Start (or restart) level i of the campaign from the beginning.
  startLevel(i) {
    if (!this.levels) return
    this.paused = false
    this.level_index = clampIndex(i, this.levels.length)
    this.level = this.levels[this.level_index].build()
    this.high_score = this._bestScore()
    this._newRun()
    this._enter(GameState.PLAY)
  }

  // Show the level-select screen
  openSelect() {
    if (!this.levels) return
    this.paused = false
    this.select_index = this.level_index
    this._enter(GameState.SELECT)
  }

  isUnlocked(i) {
    return !this.levels || i < this.progress.unlocked
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

    const leftEdge = input.left && !this.prevLeft
    const rightEdge = input.right && !this.prevRight
    this.prevLeft = input.left
    this.prevRight = input.right
    const pos = this.tapPos
    this.tapPos = null

    this.state_ms += frame_ms
    if (this.state === GameState.SELECT) {
      this._updateSelect(pressed, pos, leftEdge, rightEdge)
    } else if (this.state !== GameState.PLAY && this.state !== GameState.DYING) {
      if (pressed && this.state_ms > cfg.screen_min_ms) {
        if (this.state === GameState.TITLE && this.levels && pos && hitRect(pos, TITLE_LEVELS_BTN)) this.openSelect()
        else this._advanceScreen()
      }
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

  _updateSelect(pressed, pos, leftEdge, rightEdge) {
    const n = this.levels.length
    if (leftEdge) this.select_index = (this.select_index + n - 1) % n
    if (rightEdge) this.select_index = (this.select_index + 1) % n
    if (!pressed || this.state_ms < this.cfg.screen_min_ms) return
    if (pos) {
      if (hitRect(pos, SELECT_BACK_BTN)) return this._enter(GameState.TITLE)
      const hit = SELECT_CARDS.findIndex((c, i) => i < n && hitRect(pos, c))
      if (hit < 0) return
      this.select_index = hit
    }
    if (this.isUnlocked(this.select_index)) this.startLevel(this.select_index)
    else this._emit('cut') // locked
  }

  _advanceScreen() {
    if (this.state === GameState.TITLE) {
      this._newRun()
      this._enter(GameState.PLAY)
    } else if (this.state === GameState.COMPLETE && this.levels && this.level_index + 1 < this.levels.length) {
      this.startLevel(this.level_index + 1) // on to the next area
    } else {
      this._resetWorld()
      this._enter(GameState.TITLE)
    }
  }

  _newRun() {
    this.secrets_run = new Set()
    this.combo = 0
    this.combo_ms = 0
    this.boss_defeated = false
    this.arena_active = false
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
    this.level.solids = this.level.solids.filter((sd) => sd.kind !== 'log') // bridges reset with their log
    this.entities = spawnEntities(this.level).filter(
      (e) => (this.checkpoint < 0 || e.cx > x) && !(e.cx > lo && e.cx < hi && e.kind === 'enemy') &&
        !(e.is_boss && this.boss_defeated) && !(e.secret_id && this.secrets_run.has(e.secret_id)),
    )
    this.boss = this.entities.find((e) => e.is_boss) ?? null
    this.arena_active = false // the fight restarts (boss at full health) after a death
    if (this.deaths > 0) this.frog.invuln_ms = this.cfg.spawn_invuln_ms // grace after a death
    this._snapCamera()
  }

  _finishRun() {
    if (this.score > this.high_score) {
      this.high_score = this.score
      this.new_high = true
      if (this.levels) {
        this.progress.best[this.level.id] = this.score
        saveProgress(this.progress)
      } else {
        saveHighScore(this.score)
      }
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
    if (this.levels) {
      const p = this.progress
      p.unlocked = Math.max(p.unlocked, this.level_index + 2)
      if (this.score > (p.best[this.level.id] ?? 0)) p.best[this.level.id] = this.score
      const had = new Set(p.secrets[this.level.id] ?? [])
      for (const id of this.secrets_run) had.add(id)
      p.secrets[this.level.id] = [...had]
      saveProgress(p)
    }
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
    this.combo_ms = Math.max(0, this.combo_ms - dt_ms)
    if (this.combo_ms <= 0) this.combo = 0

    // Air: stay under too long and you drown
    if (frog.hidden) this._bubbles(dt_ms)
    if (frog.breath_ms <= 0) {
      this._popup(frog.x + frog.w / 2, frog.y - 10, 'OUT OF AIR!')
      return this._die()
    }

    // Tongue vs boss weak point (the glowing eye)
    {
      const tseg = frog.tongueSegment()
      if (tseg) {
        for (const e of this.entities) {
          const r = e.weakRect?.()
          if (!r || !segmentHitsRect(tseg.x1, tseg.y1, tseg.x2, tseg.y2, r, cfg.tongue_thickness / 2)) continue
          frog.retractTongue()
          if (e.eyeHit(this)) {
            this._addScore(e.hp > 0 ? cfg.points_boss_hit : cfg.points_boss_kill, r.x + r.w / 2, r.y)
          } else if (this.last_deflect_shot !== frog.shot_id) {
            this.last_deflect_shot = frog.shot_id
            this._emit('cut')
          }
          break
        }
      }
    }

    // Tongue vs pullable objects (the bridge log)
    {
      const tseg = frog.tongueSegment()
      if (tseg) {
        for (const e of this.entities) {
          const r = e.pullable && e.pullRect?.()
          if (!r || !segmentHitsRect(tseg.x1, tseg.y1, tseg.x2, tseg.y2, r, cfg.tongue_thickness / 2)) continue
          if (e.pull()) {
            this._emit('grab')
            this._addScore(cfg.points_pickup, r.x + r.w / 2, r.y, 'PULL!')
          }
          frog.retractTongue()
          break
        }
      }
    }

    // Tongue: eat enemies, cut briars, grab pickups (nearest thing wins)
    const seg = frog.tongueSegment()
    if (seg) {
      let best = null
      let bestD = Infinity
      for (const e of this.entities) {
        if (!e.alive || (e.harmless && !e.grapple) || !(e.edible || e.lickable || e.deflects || e.grapple)) continue
        if (!segmentHitsRect(seg.x1, seg.y1, seg.x2, seg.y2, e.hitbox, cfg.tongue_thickness / 2)) continue
        const d = Math.hypot(e.cx - seg.x1, e.cy - seg.y1)
        if (d < bestD) { best = e; bestD = d }
      }
      if (best) {
        const fire = frog.fire_ms > 0
        if (best.grapple) {
          frog.startGrapple(best) // reel the frog in (the tongue becomes the rope)
        } else {
          if (best.deflects) {
            if (fire && !best.is_boss) {
              // Fire burns right through armour
              if (this.last_deflect_shot !== frog.shot_id) {
                this.last_deflect_shot = frog.shot_id
                best.die()
                this._emit('stomp')
                this._award(cfg.points_eat, best, 'BURNED!')
              }
            } else if (this.last_deflect_shot !== frog.shot_id) {
              // Armour: the tongue bounces off
              this.last_deflect_shot = frog.shot_id
              this._emit('cut')
            }
          } else if (best.lickable) {
            // A shot cuts away at most ONE section (the nearest one it touched);
            // a fire tongue torches the neighbouring sections too.
            if (this.last_cut_shot !== frog.shot_id) {
              this.last_cut_shot = frog.shot_id
              best.lick()
              if (fire) {
                for (const n of this.entities) {
                  if (n !== best && n.alive && n.lickable && Math.hypot(n.cx - best.cx, n.cy - best.cy) < 90) n.lick()
                }
              }
              this._emit('cut')
              this._addScore(cfg.points_briar, best.cx, best.cy)
            }
          } else {
            this._eat(best)
          }
          frog.retractTongue()
        }
      }
    }

    // Body contacts: stomp, get hit, or collect
    const fb = frog.hitbox
    // Area hazards (bat shriek and shockwaves)
    if (!frog.hidden && frog.invuln_ms <= 0) {
      for (const e of this.entities) {
        if (e.hazard && e.hazard(fb)) {
          this._hurt()
          if (this.state !== GameState.PLAY) return
          break
        }
      }
    }
    for (const e of this.entities) {
      if (!e.alive || e.harmless || !rectsOverlap(fb, e.hitbox)) continue
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
    // Boss arena: entering it locks the camera and shuts the door behind you
    const arena = level.boss?.arena
    if (arena && this.boss && !this.boss_defeated) {
      if (!this.arena_active && cx > arena.trigger) {
        this.arena_active = true
        this._popup(arena.x0 + cfg.view_w / 2, level.ground_y - 200, this.boss.title ?? 'THE FLY BOSS!')
      }
      if (this.arena_active) {
        const p = frog.physics
        if (p.p_x < arena.x0 + 10) { p.p_x = arena.x0 + 10; p.v_x = Math.max(0, p.v_x) }
        if (p.p_x + frog.w > arena.x1 - 10) { p.p_x = arena.x1 - 10 - frog.w; p.v_x = Math.min(0, p.v_x) }
      }
    }
    if (cx > level.goal_x && (!this.boss || this.boss_defeated)) return this._complete()

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
    this._award(this.cfg.points_eat, e)
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
    if (e.onStomp) e.onStomp()
    else e.die()
    this.frog.bounce(this.prevJump)
    this._emit('stomp')
    this._award(this.cfg.points_stomp, e)
  }

  _collect(e, viaTongue = false) {
    e.die()
    if (viaTongue) { e.eaten = true; e.swallow_ms = 0 }
    if (e.power === 'secret') {
      this.secrets_run.add(e.secret_id)
      this._emit('powerup')
      this.score += 1000
      this._popup(e.cx, e.cy, `★ SECRET! ${this.secrets_run.size}/${this.level.secrets.length}`)
    } else if (e.power === 'glide') {
      this.frog.glide_ms = this.cfg.glide_ms
      this._emit('powerup')
      this._addScore(this.cfg.points_pickup, e.cx, e.cy, 'GLIDE! (hold JUMP)')
    } else if (e.power === 'light') {
      this.frog.light_ms = this.cfg.light_ms
      this._emit('powerup')
      this._addScore(this.cfg.points_pickup, e.cx, e.cy, 'GLOW!')
    } else if (e.power === 'fire') {
      this.frog.fire_ms = this.cfg.fire_ms
      this._emit('powerup')
      this._addScore(this.cfg.points_pickup, e.cx, e.cy, 'FIRE TONGUE!')
    } else {
      this.frog.shield = true
      this._emit('pickup')
      this._addScore(this.cfg.points_pickup, e.cx, e.cy, 'SHIELD!')
    }
  }

  // An enemy touched the frog the wrong way
  _hurt() {
    this.combo = 0
    this.combo_ms = 0
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

  // Points for a kill, multiplied by the combo (tongue -> stomp -> tongue ...
  // within a few seconds of each other).
  _award(points, e, label) {
    this.combo = this.combo_ms > 0 ? this.combo + 1 : 1
    this.combo_ms = this.cfg.combo_window_ms
    const mult = Math.min(this.cfg.combo_max, this.combo)
    const pts = points * mult
    this._addScore(pts, e.cx, e.cy, `${label ?? '+' + pts}${mult > 1 ? ` x${mult}` : ''}`)
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
    if (this.arena_active && level.boss) return Math.min(level.boss.arena.x0, level.width - cfg.view_w)
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
    ctx.restore()
    drawDarkness(ctx, this, cam)
    ctx.save()
    ctx.translate(-cam, 0)
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
