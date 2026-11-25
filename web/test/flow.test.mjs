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
