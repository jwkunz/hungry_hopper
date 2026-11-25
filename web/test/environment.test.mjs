import test from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG } from '../src/game/config.js'
import { Game, GameState } from '../src/game/engine.js'
import { createLevel1 } from '../src/game/level.js'
import { BriarCell, spawnBriar } from '../src/game/entities.js'

const none = { left: false, right: false, up: false, down: false, jump: false, eat: false }
const mk = () => {
  const g = new Game(CONFIG, createLevel1(), { onEvent: () => {} })
  for (let t = 0; t < 700; t += 16) g.update(16, none)
  g.tap(); g.update(16, none)
  assert.equal(g.state, GameState.PLAY)
  g.entities = [] // clean room unless a test adds things
  return g
}
const run = (g, ms, input = none) => { for (let t = 0; t < ms; t += 16) g.update(16, input) }
const place = (g, x, y) => { const p = g.frog.physics; p.p_x = x; p.p_y = y; p.v_x = p.v_y = 0 }

test('level data: ponds sit in gaps, briars and mud sit on ground', () => {
  const lv = createLevel1()
  const onGround = (x) => lv.segments.some((s) => x > s.x && x < s.x + s.w)
  for (const p of lv.ponds) {
    assert.ok(!onGround(p.x + p.w / 2), 'pond centre is in a gap')
    assert.ok(p.floor_y - p.surface_y > 57 + 20, 'deep enough to submerge the frog')
  }
  for (const b of lv.briars) assert.ok(onGround(b.x), `briar at ${b.x} is on the ground`)
  for (const m of lv.mud) assert.ok(onGround(m.x + 1) && onGround(m.x + m.w - 1))
  assert.ok(!lv.mudAt(lv.spawn_x), 'spawn is not in mud')
})

test('falling into a pond lands on its floor, submerged and hidden; breath drains then drowns', () => {
  const g = mk()
  const pond = g.level.ponds[0]
  place(g, pond.x + pond.w / 2 - g.frog.w / 2, g.level.ground_y - 80)
  run(g, 1500)
  const f = g.frog
  assert.ok(f.in_water && f.hidden, 'swimming and hidden')
  assert.ok(Math.abs(f.y + f.h - pond.floor_y) < 1, 'resting on the pond floor')
  assert.ok(f.breath_ms < CONFIG.breath_ms)
  assert.equal(g.state, GameState.PLAY)
  run(g, CONFIG.breath_ms + 500)
  assert.equal(g.lives, CONFIG.start_lives - 1, 'drowned and lost a life')
})

test('you can swim up with jump strokes, hop out onto land, and breathe again', () => {
  const g = mk()
  const pond = g.level.ponds[0]
  // sit on the floor against the left wall, then swim up
  place(g, pond.x + 1, pond.floor_y - g.frog.h - 1)
  run(g, 300)
  let top = Infinity
  for (let i = 0; i < 40 && g.state === GameState.PLAY; i++) {
    g.update(16, { ...none, jump: true, left: true })
    g.update(16, { ...none, left: true })
    run(g, 160, { ...none, left: true })
    top = Math.min(top, g.frog.y + g.frog.h)
    if (!g.frog.in_water && g.frog.grounded) break
  }
  assert.equal(g.state, GameState.PLAY)
  assert.ok(top < g.level.ground_y - 2, 'frog bottom rose above the ground line (hopped out)')
})

test('hiding underwater: enemies overlapping a submerged frog do nothing', () => {
  const g = mk()
  const pond = g.level.ponds[0]
  place(g, pond.x + pond.w / 2 - g.frog.w / 2, pond.floor_y - g.frog.h - 1)
  run(g, 300)
  assert.ok(g.frog.hidden)
  const m = new BriarCell(0, 0, 10, 10, 0, 0, 0) // just to get an entity to repurpose
  m.kind = 'enemy'; m.lickable = false
  Object.assign(m, { cx: g.frog.x + g.frog.w / 2, cy: g.frog.y + g.frog.h / 2, w: 40, h: 30, alive: true, update() {}, draw() {} })
  g.entities = [m]
  run(g, 200)
  assert.equal(g.state, GameState.PLAY)
})

test('leaves dip under the frog, carry it down, and spring back', () => {
  const g = mk()
  const leaf = g.level.leaves[0]
  place(g, leaf.x + 20, leaf.y0 - g.frog.h - 1)
  run(g, 1000)
  assert.ok(g.frog.grounded, 'standing on the leaf')
  assert.ok(Math.abs(leaf.dip - CONFIG.leaf_dip) < 0.5, `dipped (${leaf.dip})`)
  assert.ok(Math.abs(g.frog.y + g.frog.h - leaf.y) < 1.5, 'frog rides the leaf')
  place(g, leaf.x + leaf.w + 200, g.level.ground_y - 200) // leave
  run(g, 600)
  assert.equal(leaf.dip, 0)
})

test('mud slows walking', () => {
  const g = mk()
  const mud = g.level.mud[0]
  const speedOn = (x) => {
    place(g, x, g.level.ground_y - g.frog.h - 1)
    run(g, 200)
    run(g, 700, { ...none, right: true })
    return g.frog.physics.v_x
  }
  const normal = speedOn(200)
  const slow = speedOn(mud.x + 5) // starts in mud; measure before leaving it
  assert.ok(slow < normal * 0.75, `mud ${slow.toFixed(0)} vs ground ${normal.toFixed(0)}`)
})

test('briar thickets are grids of sections; tall walls are 3 sections thick', () => {
  const gy = createLevel1().ground_y
  const wall = spawnBriar({ x: 500, w: 108, h: 340 }, gy)
  assert.equal(wall.length, 3 * 6, '3 columns x 6 rows')
  const patch = spawnBriar({ x: 500, w: 108, h: 56 }, gy)
  assert.equal(patch.length, 3)
  // sections tile the thicket exactly: bottom row sits on the ground, no gaps
  const bottom = wall.filter((c) => c.row === 0)
  assert.ok(bottom.every((c) => Math.abs(c.y + c.h - gy) < 1e-6))
  const xs = bottom.map((c) => c.x).sort((a, b) => a - b)
  assert.ok(Math.abs(xs[0] - (500 - 54)) < 1e-6)
  assert.ok(Math.abs(bottom[0].w * 3 - 108) < 1e-6)
  assert.ok(Math.abs(Math.min(...wall.map((c) => c.y)) - (gy - 340)) < 1e-6, 'top of the wall')
})

test('briar sections are lethal on contact; a shield absorbs it', () => {
  const g = mk()
  const sec = (g2) => new BriarCell(g2.frog.x + g2.frog.w, g2.level.ground_y - 30, 36, 60, 0, 0, g2.level.ground_y)
  g.entities = [sec(g)]
  run(g, 100)
  assert.equal(g.state, GameState.DYING)

  const g2 = mk()
  g2.frog.shield = true
  g2.entities = [sec(g2)]
  run(g2, 100)
  assert.equal(g2.state, GameState.PLAY)
  assert.equal(g2.frog.shield, false)
})

test('each tongue shot cuts exactly one section (the nearest); you can tunnel through a wall in 3 shots', () => {
  const g = mk()
  const gy = g.level.ground_y
  const wall = spawnBriar({ x: 900, w: 108, h: 340 }, gy)
  g.entities = [...wall]
  place(g, 900 - 54 - 190, gy - g.frog.h - 1)
  g.frog.is_right = true
  run(g, 100)
  const alive = () => g.entities.filter((e) => e.alive).length
  assert.equal(alive(), 18)
  for (let shot = 1; shot <= 3; shot++) {
    run(g, 160, { ...none, eat: true })
    run(g, 900) // finish + reload
    assert.equal(alive(), 18 - shot, `after shot ${shot} exactly one more section is gone`)
    assert.equal(g.state, GameState.PLAY)
  }
  // Row 0 (frog height) is now clear all the way through; everything above remains
  const cleared = wall.filter((c) => !c.alive)
  assert.ok(cleared.every((c) => c.row === 0), 'only the ground row was cut')
  assert.ok(cleared.map((c) => c.col).sort().join() === '0,1,2', 'all three columns of that row')
  // ...so the frog can now walk straight through the wall without being hurt
  run(g, 3500, { ...none, right: true }) // (this wall sits in mud, so it is slow going)
  assert.equal(g.state, GameState.PLAY, 'walked through the tunnel unharmed')
  assert.ok(g.frog.x > 900 + 54, 'came out the other side')
  assert.ok(g.score >= 3 * CONFIG.points_briar)
})

test('aiming higher cuts a different section of the wall', () => {
  const g = mk()
  const gy = g.level.ground_y
  const wall = spawnBriar({ x: 900, w: 108, h: 340 }, gy)
  g.entities = [...wall]
  place(g, 900 - 54 - 190, gy - g.frog.h - 1)
  g.frog.is_right = true
  run(g, 100)
  run(g, 300, { ...none, up: true }) // aim up ~27°
  run(g, 160, { ...none, eat: true })
  run(g, 900)
  const cut = wall.filter((c) => !c.alive)
  assert.equal(cut.length, 1)
  assert.ok(cut[0].row >= 1, `cut a higher row (${cut[0].row})`)
})
