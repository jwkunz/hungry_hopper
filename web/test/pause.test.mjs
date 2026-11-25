import test from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG } from '../src/game/config.js'
import { Game, GameState } from '../src/game/engine.js'
import { settings } from '../src/game/settings.js'

const none = { left: false, right: false, up: false, down: false, jump: false, eat: false }
function playing() {
  const g = new Game(CONFIG)
  for (let i = 0; i < 100; i++) g.update(16, none)
  g.update(16, { ...none, jump: true }); g.update(16, none)
  g.tap(); for (let i = 0; i < 5; i++) g.update(16, none)
  if (g.state !== GameState.PLAY) { g.tap(); g.update(16, none) }
  return g
}

test('pause freezes the world; resume continues', () => {
  const g = playing()
  assert.equal(g.state, GameState.PLAY)
  for (let i = 0; i < 20; i++) g.update(16, { ...none, right: true })
  const x = g.frog.x
  assert.ok(g.setPaused(true))
  const t = g.elapsed_ms
  for (let i = 0; i < 100; i++) g.update(16, { ...none, right: true })
  assert.equal(g.frog.x, x)
  assert.equal(g.elapsed_ms, t)
  g.setPaused(false)
  for (let i = 0; i < 20; i++) g.update(16, { ...none, right: true })
  assert.ok(g.frog.x > x)
})

test('pausing on the title screen does nothing; quit and restart work', () => {
  const g = new Game(CONFIG)
  assert.equal(g.setPaused(true), false)
  const p = playing()
  p.setPaused(true)
  p.quitToTitle()
  assert.equal(p.state, GameState.TITLE)
  assert.equal(p.paused, false)
  p.restartRun()
  assert.equal(p.state, GameState.PLAY)
  assert.equal(p.lives, CONFIG.start_lives)
})

test('settings clamp, persist-safe and notify', () => {
  let seen = null
  const off = settings.subscribe((v) => (seen = v))
  settings.set('music', 5)
  assert.equal(settings.get('music'), 1)
  settings.set('sfx', -3)
  assert.equal(settings.get('sfx'), 0)
  settings.set('touch', 0)
  assert.equal(seen.touch, false)
  off()
})
