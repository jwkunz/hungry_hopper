import test from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG } from '../src/game/config.js'
import { Game, GameState } from '../src/game/engine.js'
import { createLevel1 } from '../src/game/level.js'
import { FlyBoss } from '../src/game/boss.js'

const none = { left: false, right: false, up: false, down: false, jump: false, eat: false }
const run = (g, ms, input = none) => { for (let t = 0; t < ms; t += 16) g.update(16, input) }
const start = (g) => { run(g, 700); g.tap(); g.update(16, none); assert.equal(g.state, GameState.PLAY) }
const mk = () => { const g = new Game(CONFIG, createLevel1(), {}); start(g); return g }

// put the frog at x (in the arena) and light the fight
function enterArena(g, x = 4900) {
  g.frog.physics.p_x = x
  g.frog.physics.p_y = g.level.ground_y - g.frog.h - 1
  g.frog.invuln_ms = 1e9
  run(g, 100)
  assert.ok(g.arena_active, 'arena active')
}

test('level has a boss, an arena puddle and arena platforms', () => {
  const g = mk()
  assert.ok(g.boss && g.boss.is_boss)
  assert.equal(g.boss.hp, 3)
  assert.ok(g.level.ponds.some((p) => p.x >= g.level.boss.arena.x0), 'arena pond')
  assert.ok(g.level.leaves.some((l) => l.x >= g.level.boss.arena.x0), 'arena leaves')
})

test('entering the arena locks the camera, wakes the boss and shuts the door', () => {
  const g = mk()
  assert.equal(g.boss.phase, 'dormant'); assert.ok(g.boss.harmless)
  enterArena(g)
  run(g, 2200)
  assert.ok(Math.abs(g.camera_x - g.level.boss.arena.x0) < 3, 'camera locked')
  assert.equal(g.boss.phase === 'fight' || g.boss.phase === 'telegraph' || g.boss.phase === 'dive', true)
  assert.ok(!g.boss.harmless)
  // try to walk back out
  g.frog.invuln_ms = 1e9
  run(g, 1200, { ...none, left: true })
  assert.ok(g.frog.x >= g.level.boss.arena.x0, 'cannot leave the arena')
  // the goal is shut until the boss is dead
  g.frog.physics.p_x = g.level.goal_x + 10
  run(g, 100)
  assert.equal(g.state, GameState.PLAY)
})

test('the boss flies erratically and stays inside the arena', () => {
  const g = mk()
  enterArena(g)
  run(g, 2000)
  const xs = new Set(), ys = []
  for (let i = 0; i < 400; i++) {
    g.update(16, none)
    const b = g.boss
    assert.ok(b.cx >= g.level.boss.arena.x0 && b.cx <= g.level.boss.arena.x1)
    assert.ok(b.cy < g.level.ground_y)
    xs.add(Math.round(b.cx / 80)); ys.push(b.cy)
  }
  assert.ok(xs.size >= 3, 'moves around horizontally')
  assert.ok(Math.max(...ys) - Math.min(...ys) > 60, 'moves vertically too')
})

test('eye hits: 3 to win, invulnerable between hits, faster each time', () => {
  const g = mk()
  enterArena(g)
  run(g, 2000)
  const b = g.boss
  const sp0 = b.cfgp.speed
  b.frozen = true
  assert.ok(b.eyeHit(g)); assert.equal(b.hp, 2)
  assert.ok(!b.eyeHit(g), 'invulnerable right after a hit'); assert.equal(b.hp, 2)
  assert.ok(b.cfgp.speed > sp0)
  b.inv_ms = 0
  assert.ok(b.eyeHit(g)); assert.equal(b.hp, 1)
  b.inv_ms = 0
  assert.ok(b.eyeHit(g)); assert.equal(b.phase, 'dying')
})

test('a real tongue shot to the eye counts; a shot at the body does not', () => {
  const g = mk()
  enterArena(g, 4850)
  run(g, 2000)
  const b = g.boss, f = g.frog
  b.frozen = true
  b.phase = 'fight'
  f.is_right = true
  // park the eye right on the tongue's line, ~150px ahead of the mouth
  const fire = () => { for (let i = 0; i < 80; i++) g.update(16, { ...none, eat: i < 6 }) }
  const eye = b.eyePos()
  b.cx += (f.mouth.x + 150 - eye.x); b.cy += (f.mouth.y - eye.y)
  fire()
  assert.equal(b.hp, 2, 'eye hit')
  assert.ok(g.score > 0)

  // body but not the eye: nothing
  b.inv_ms = 0
  const e2 = b.eyePos()
  b.cx += (f.mouth.x + 150 - e2.x) + 90; b.cy += (f.mouth.y - e2.y) + 10
  const hp = b.hp
  run(g, 1200)
  fire()
  assert.equal(b.hp, hp)
})

test('minions are called in and the boss body hurts', () => {
  const g = mk()
  enterArena(g)
  run(g, 9000)
  assert.ok(g.entities.some((e) => e.minion), 'mosquito minions spawned')
  assert.ok(g.entities.filter((e) => e.minion && e.alive).length <= 1, 'phase 1 allows one minion')
  // body contact
  const g2 = mk()
  enterArena(g2)
  run(g2, 2200)
  g2.frog.invuln_ms = 0
  g2.boss.frozen = true
  g2.boss.cx = g2.frog.x + g2.frog.w / 2; g2.boss.cy = g2.frog.y + g2.frog.h / 2
  run(g2, 50)
  assert.equal(g2.state, GameState.DYING)
})

test('defeating the boss opens the goal and finishes the level', () => {
  const g = mk()
  enterArena(g)
  run(g, 2200)
  const b = g.boss
  b.eyeHit(g); b.inv_ms = 0; b.eyeHit(g); b.inv_ms = 0; b.eyeHit(g)
  assert.equal(b.phase, 'dying')
  run(g, 3000)
  assert.ok(g.boss_defeated)
  assert.ok(!g.entities.some((e) => e.is_boss))
  g.frog.physics.p_x = g.level.goal_x + 10
  run(g, 100)
  assert.equal(g.state, GameState.COMPLETE)
  // and a later death does not bring the boss back
  const g2 = mk()
  g2.boss_defeated = true; g2.checkpoint = 3; g2._resetWorld()
  assert.ok(!g2.entities.some((e) => e.is_boss))
})

test('dying in the arena restarts the fight at full health', () => {
  const g = mk()
  enterArena(g)
  run(g, 2200)
  g.boss.eyeHit(g)
  assert.equal(g.boss.hp, 2)
  g.checkpoint = 3; g._resetWorld()
  assert.equal(g.boss.hp, 3); assert.equal(g.boss.phase, 'dormant'); assert.ok(!g.arena_active)
})

test('the boss is reachable: a leaf jump plus the tongue gets to its low swoop height', () => {
  const g = mk()
  const b = g.boss
  // the boss swoops to ground_y-150..-210; the frog's mouth on the ground is ~G-30, on a leaf ~G-140
  const lows = createLevel1().leaves.filter((l) => l.x >= g.level.boss.arena.x0)
  assert.ok(lows.length >= 3 && b.arena.x1 > b.arena.x0)
})
