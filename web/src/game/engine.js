import { CONFIG, frogHitbox } from './config.js'
import { Frog } from './frog.js'
import { createLevel1 } from './level.js'
import { drawBackground, drawWorld } from './render.js'

export const GameState = Object.freeze({ PLAY: 'play' })

// Framework-agnostic game core. React owns the canvas and the loop; this
// class owns the simulation and draws itself in logical view units
// (cfg.view_w x cfg.view_h). The caller sets the canvas transform.
export class Game {
  constructor(cfg = CONFIG, level = createLevel1()) {
    this.cfg = cfg
    this.level = level
    this.state = GameState.PLAY
    this.elapsed_ms = 0
    this.accumulator = 0
    this.prevJump = false
    this.camera_x = 0
    this.deaths = 0

    const hb = frogHitbox(cfg)
    this.frog = new Frog(cfg, level.spawn_x, level.ground_y - hb.h - 1)
    this._snapCamera()
  }

  update(frame_ms, input) {
    const { cfg } = this
    frame_ms = Math.min(frame_ms, cfg.max_frame_ms)

    // Jump press edge -> buffered jump
    if (input.jump && !this.prevJump) this.frog.jump_buffer_ms = cfg.jump_buffer_ms
    this.prevJump = input.jump

    switch (this.state) {
      case GameState.PLAY: {
        this.accumulator += frame_ms
        while (this.accumulator >= cfg.step_ms) {
          this.frog.update(cfg.step_ms, input, this.level)
          this.elapsed_ms += cfg.step_ms
          this.accumulator -= cfg.step_ms
          if (this.frog.y > this.level.height + 120) this._respawn()
        }
        this._updateCamera(frame_ms / 1000)
        break
      }
    }
  }

  _respawn() {
    const hb = frogHitbox(this.cfg)
    this.deaths += 1
    this.frog.respawn(this.level.spawn_x, this.level.ground_y - hb.h - 1)
    this._snapCamera()
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
    this.frog.draw(ctx)
    ctx.restore()
  }
}
