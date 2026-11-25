import test from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG } from '../src/game/config.js'
import { Game, GameState } from '../src/game/engine.js'
import { createLevel1 } from '../src/game/level.js'

const none = { left: false, right: false, up: false, down: false, jump: false, eat: false }
const events = []
const mk = () => {
  events.length = 0
  return new Game(CONFIG, createLevel1(), { onEvent: (e) => events.push(e) })
}
const run = (g, ms, input = none) => { for (let t = 0; t < ms; t += 16) g.update(16, input) }
const start = (g) => { run(g, 700); g.tap(); g.update(16, none); assert.equal(g.state, GameState.PLAY) }

test('title screen: waits, ignores an immediate tap, starts on tap', () => {
  const g = mk()
  assert.equal(g.state, GameState.TITLE)
  assert.ok(events.includes('music:title'))
  g.tap(); g.update(16, none)
  assert.equal(g.state, GameState.TITLE, 'too soon after the screen appeared')
  start(g)
  assert.equal(g.lives, CONFIG.start_lives)
  assert.ok(events.includes('music:play'))
})

test('title screen also starts from the JUMP / TONGUE buttons', () => {
  const g = mk()
  run(g, 700)
  g.update(16, { ...none, eat: true })
  assert.equal(g.state, GameState.PLAY)
})

test('dying costs a life and respawns at the start; game over at zero lives', () => {
  const g = mk()
  start(g)
  g.frog.physics.p_y = g.level.height + 500 // fell in a pit
  run(g, 50)
  assert.equal(g.state, GameState.DYING)
  assert.equal(g.lives, CONFIG.start_lives - 1)
  assert.ok(events.includes('die'))
  run(g, CONFIG.death_ms + 100)
  assert.equal(g.state, GameState.PLAY)
  assert.ok(Math.abs(g.frog.x - g.level.spawn_x) < 1)

  for (let i = 0; i < 2; i++) {
    g.frog.physics.p_y = g.level.height + 500
    run(g, 50)
    run(g, CONFIG.death_ms + 100)
  }
  assert.equal(g.lives, 0)
  assert.equal(g.state, GameState.GAMEOVER)
  assert.ok(events.includes('music:stop'))
  // tap returns to the title screen after a moment
  run(g, 700); g.tap(); g.update(16, none)
  assert.equal(g.state, GameState.TITLE)
})

test('checkpoints: reaching one sets the respawn point; cleared things behind it stay gone', () => {
  const g = mk()
  start(g)
  const cp = g.level.checkpoints[0]
  const before = g.entities.length
  // Teleport onto the ground just past the first checkpoint
  g.frog.physics.p_x = cp.x + 5
  g.frog.physics.p_y = g.level.ground_y - g.frog.h - 1
  run(g, 100)
  assert.equal(g.checkpoint, 0)
  assert.ok(events.includes('checkpoint'))
  g.frog.physics.p_y = g.level.height + 500
  run(g, 50); run(g, CONFIG.death_ms + 100)
  assert.equal(g.state, GameState.PLAY)
  assert.ok(Math.abs(g.frog.x - cp.x) < 1, 'respawned at the checkpoint')
  assert.ok(g.entities.length < before, 'enemies behind the checkpoint are not respawned')
  assert.ok(g.entities.every((e) => e.cx > cp.x))
})

test('reaching the goal completes the level with a life bonus and saves nothing weird', () => {
  const g = mk()
  start(g)
  g.frog.physics.p_x = g.level.goal_x + 10
  g.frog.physics.p_y = g.level.ground_y - g.frog.h - 1
  run(g, 100)
  assert.equal(g.state, GameState.COMPLETE)
  assert.equal(g.score, CONFIG.start_lives * CONFIG.points_life_bonus)
  assert.ok(events.includes('win'))
})

test('a shield absorbs one hit; the second hit is fatal', () => {
  const g = mk()
  start(g)
  const m = g.entities.find((e) => e.kind === 'enemy')
  g.frog.shield = true
  const park = () => { m.cx = g.frog.x + g.frog.w; m.cy = g.frog.y + g.frog.h / 2; m.home_x = m.cx; m.home_y = m.cy; m.range = 0; m.speed = 0 }
  park(); run(g, 50)
  assert.equal(g.frog.shield, false)
  assert.equal(g.state, GameState.PLAY)
  assert.ok(events.includes('shield_lost'))
  run(g, CONFIG.invuln_ms + 200)
  park(); run(g, 50)
  assert.equal(g.state, GameState.DYING)
})

// ---- tongue aiming + being eaten ----
import { Frog } from '../src/game/frog.js'

test('tongue can aim steeply: limits are respected and the hit line follows the angle', () => {
  assert.ok(CONFIG.frog_tongue_angle_limit_up_deg >= 55)
  assert.ok(CONFIG.frog_tongue_angle_limit_down_deg >= 30)
  const lv = createLevel1()
  for (const right of [true, false]) {
    for (const deg of [-CONFIG.frog_tongue_angle_limit_up_deg, 0, CONFIG.frog_tongue_angle_limit_down_deg]) {
      const f = new Frog(CONFIG, 300, lv.ground_y - 60)
      f.is_right = right
      f.tongue_angle_deg = deg
      f.tongue_step = 5 // fully extended
      f._syncSprites()
      const seg = f.tongueSegment()
      const dx = (seg.x2 - seg.x1) * (right ? 1 : -1)
      const dy = seg.y2 - seg.y1
      const got = (Math.atan2(dy, dx) * 180) / Math.PI
      assert.ok(Math.abs(got - deg) < 1, `${right ? 'right' : 'left'} ${deg}°: got ${got.toFixed(1)}°`)
      assert.ok(Math.hypot(dx, dy) > 150, 'full-length tongue')
    }
  }
})

test('holding up/down sweeps the aim to the limits', () => {
  const g = mk()
  start(g)
  g.entities = []
  run(g, 300)
  run(g, 1500, { ...none, up: true })
  assert.equal(g.frog.tongue_angle_deg, -CONFIG.frog_tongue_angle_limit_up_deg)
  run(g, 2500, { ...none, down: true })
  assert.equal(g.frog.tongue_angle_deg, CONFIG.frog_tongue_angle_limit_down_deg)
})

test('an eaten mosquito is reeled in on the tongue, shrinks, is swallowed, and scores', () => {
  const g = mk()
  start(g)
  const m = g.entities.find((e) => e.kind === 'enemy')
  g.entities = [m]
  const f = g.frog
  f.is_right = true
  run(g, 100)
  Object.assign(m, { cx: f.mouth.x + 120, cy: f.mouth.y + 6, home_x: f.mouth.x + 120, home_y: f.mouth.y + 6, range: 0, speed: 0 })
  events.length = 0
  const startX = m.cx
  let sawEaten = false
  let minScale = 1
  g.update(16, { ...none, eat: true })
  for (let t = 0; t < 900 && !m.gone; t += 16) {
    g.update(16, none)
    if (m.eaten) sawEaten = true
    minScale = Math.min(minScale, m.scale_mul)
  }
  assert.ok(sawEaten, 'was grabbed')
  assert.ok(m.gone, 'swallowed')
  assert.ok(minScale < 0.6, 'shrank while being swallowed')
  assert.equal(g.score, CONFIG.points_eat)
  assert.ok(events.indexOf('grab') !== -1 && events.indexOf('eat') > events.indexOf('grab'), 'grab then gulp')
  assert.ok(m.cx < startX, 'was pulled toward the frog')
})
