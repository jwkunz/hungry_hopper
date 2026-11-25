import test from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG } from '../src/game/config.js'
import { Game, GameState } from '../src/game/engine.js'
import { createLevel1 } from '../src/game/level.js'
import { Bat, Mole, Beetle, Centipede, PillBug, Owl, Crane } from '../src/game/bestiary.js'

const none = { left: false, right: false, up: false, down: false, jump: false, eat: false }
const G = 400
// A stand-in world: just what the creatures look at.
const world = (fx, fy = G - 60) => ({
  cfg: CONFIG, state: 'play',
  frog: { x: fx - 50, y: fy - 28, w: 100, h: 56, dead: false, hidden: false },
})
const step = (e, g, ms) => { for (let t = 0; t < ms; t += 16) e.update(16, g) }
const start = (g) => { for (let t = 0; t < 700; t += 16) g.update(16, none); g.tap(); g.update(16, none); assert.equal(g.state, GameState.PLAY) }

test('level 1 contains every creature type', () => {
  const g = new Game(CONFIG, createLevel1(), {})
  const labels = new Set(g.entities.map((e) => e.label).filter(Boolean))
  for (const k of ['bat', 'mole', 'beetle', 'centipede', 'pillbug', 'owl', 'crane']) assert.ok(labels.has(k), k)
})

test('bat hangs, swoops through the frog position, then roosts again', () => {
  const b = new Bat(500, G - 250, G)
  const w = world(500)
  step(b, w, 100); assert.equal(b.mode, 'swoop')
  let lowest = 0
  for (let i = 0; i < 90; i++) { b.update(16, w); lowest = Math.max(lowest, b.cy) }
  assert.ok(lowest > G - 90, `dived to ${lowest}`)
  w.frog.hidden = true
  step(b, w, 3000)
  assert.equal(b.mode, 'hang'); assert.ok(Math.abs(b.cy - b.home_y) < 6)
})

test('mole is harmless until it pops up, then can be stomped/tongued, then burrows', () => {
  const m = new Mole(500, G)
  const w = world(500 + 180)
  assert.ok(m.harmless && !m.edible)
  step(m, w, 1300); assert.equal(m.mode, 'rising')
  step(m, w, 400); assert.equal(m.mode, 'up')
  assert.ok(!m.harmless && m.edible && m.h > 40)
  step(m, w, 1800); assert.ok(['sinking', 'hidden'].includes(m.mode))
  step(m, w, 600); assert.ok(m.harmless)
})

test('beetle: shell deflects the tongue, a stomp flips it, then it is harmless and edible', () => {
  const b = new Beetle(500, G, 60)
  assert.ok(b.deflects && !b.edible && !b.harmless)
  b.onStomp()
  assert.ok(b.harmless && b.edible && !b.deflects)
  step(b, world(900), 4400)
  assert.ok(!b.harmless && b.deflects, 'rights itself')

  // in the real game: touching an upright beetle kills, a stomp bounces instead
  const g = new Game(CONFIG, createLevel1(), {})
  start(g)
  const beetle = new Beetle(g.frog.x + g.frog.w / 2, g.level.ground_y, 0)
  beetle.speed = 0
  g.entities = [beetle]
  g.frog.invuln_ms = 0
  g.update(16, none)
  assert.equal(g.state, GameState.DYING, 'walking into a beetle hurts')
})

test('beetle stomp flips it and bounces the frog', () => {
  const g = new Game(CONFIG, createLevel1(), {})
  start(g)
  const f = g.frog
  const beetle = new Beetle(f.x + f.w / 2 + 300, g.level.ground_y, 0)
  beetle.speed = 0
  g.entities = [beetle]
  f.physics.p_x = beetle.cx - f.w / 2
  f.physics.p_y = beetle.y - f.h - 30
  f.physics.v_y = 300
  for (let i = 0; i < 40 && !beetle.flipped; i++) g.update(16, none)
  assert.ok(beetle.flipped, 'flipped')
  assert.equal(g.state, GameState.PLAY)
  assert.ok(beetle.alive)
})

test('centipede speeds up when it sees the frog', () => {
  const c = new Centipede(600, G, 200)
  step(c, world(2000), 200); assert.ok(!c.angry)
  step(c, world(700), 100); assert.ok(c.angry)
})

test('pill bug curls then rolls at you; a rolling bug cannot be stomped', () => {
  const p = new PillBug(500, G, 60)
  const w = world(640)
  step(p, w, 1000)
  assert.ok(['curl', 'roll'].includes(p.mode), p.mode)
  step(p, w, 400)
  assert.equal(p.mode, 'roll'); assert.ok(!p.stompable)
  const x0 = p.cx
  step(p, w, 300)
  assert.ok(p.cx > x0 + 40, 'rolls toward the frog')
  step(p, w, 2500)
  assert.ok(p.stompable, 'stompable again once it uncurls')
})

test('owl warns, then glides at the frog', () => {
  const o = new Owl(800, G - 280, G)
  const w = world(800)
  step(o, w, 700); assert.equal(o.mode, 'alert')
  step(o, w, 800); assert.equal(o.mode, 'glide')
  const y0 = o.cy
  step(o, w, 400)
  assert.ok(o.cy > y0 + 40, 'came down at you')
})

test('crane: windup warning, strike, then beak stuck = edible; otherwise tongue-proof', () => {
  const c = new Crane(800, G, 0)
  const w = world(920)
  assert.ok(c.deflects && !c.edible && !c.stompable)
  step(c, w, 1300); assert.equal(c.mode, 'windup')
  step(c, w, 800); assert.equal(c.mode, 'strike')
  step(c, w, 300)
  assert.equal(c.mode, 'recover'); assert.ok(c.edible && !c.deflects)
  assert.ok(c.w > 100, 'reach extends the hitbox')
  w.frog.hidden = true
  step(c, w, 1500); assert.equal(c.mode, 'stalk'); assert.ok(c.h > 100)
})

test('creatures are safe to spawn near: respawn zones stay clear', () => {
  const g = new Game(CONFIG, createLevel1(), {})
  start(g)
  g.checkpoint = 3; g.deaths = 1; g._resetWorld()
  const f = g.frog
  for (const e of g.entities) if (e.label) assert.ok(Math.abs(e.cx - (f.x + f.w / 2)) > 150)
})
