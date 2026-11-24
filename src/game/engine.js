import { CONFIG } from './config.js'
import { Frog } from './frog.js'

export const GameState = Object.freeze({ PLAY: 'play' })

// Framework-agnostic game core. React owns the canvas and the loop; this
// class owns the simulation and knows how to draw itself to a 2D context.
export class Game {
  constructor(width, height, cfg = CONFIG) {
    this.cfg = cfg
    this.width = width
    this.height = height
    this.state = GameState.PLAY
    this.elapsed_ms = 0
    this.frog = new Frog(cfg, width / 2, height * 0.99)
    this.frog.setBounds(width)
  }

  resize(width, height) {
    this.width = width
    this.height = height
    this.frog.setGround(height * 0.99)
    this.frog.setBounds(width)
  }

  update(dt_ms, input) {
    dt_ms = Math.min(dt_ms, this.cfg.max_dt_ms)
    this.elapsed_ms += dt_ms
    switch (this.state) {
      case GameState.PLAY:
        this.frog.update(dt_ms, input)
        break
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.cfg.background
    ctx.fillRect(0, 0, this.width, this.height)
    this.frog.draw(ctx)
  }
}
