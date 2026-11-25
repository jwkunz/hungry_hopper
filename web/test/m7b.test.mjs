import test from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG } from '../src/game/config.js'
import { Game, GameState } from '../src/game/engine.js'
import { createLevel1 } from '../src/game/level.js'
import { GlowBug, Log } from '../src/game/items.js'
import { lightSources } from '../src/game/render.js'

const none = { left: false, right: false, up: false, down: false, jump: false, eat: false }
const run = (g, ms, input = none) => { for (let t = 0; t < ms; t += 16) g.update(16, input) }
const start = (g) => { run(g, 700); g.tap(); g.update(16, none); assert.equal(g.state, GameState.PLAY) }
const mk = () => { const g = new Game(CONFIG, createLevel1(), {}); start(g); g.frog.invuln_ms = 0; return g }

const only = (g) => { g.entities = g.entities.filter((e) => e instanceof Log); return g }
const log = (g) => g.entities.find((e) => e instanceof Log)
// stand at the near edge and tongue the drooping end of the log
function pullLog(g) {
  const f = g.frog
  f.physics.p_x = 2100 - f.w - 2 // right at the edge of the pit
  f.physics.p_y = g.level.ground_y - f.h - 1
  g.camera_x = g._cameraTarget()
  run(g, 150)
  const lg = log(g)
  const r = lg.pullRect()
  const tx = r.x + r.w / 2, ty = r.y + r.h / 2
  f.is_right = true
  f.tongue_angle_deg = (Math.atan2(ty - f.mouth.y, tx - f.mouth.x) * 180) / Math.PI
  const nx = Math.max(r.x, Math.min(f.mouth.x, r.x + r.w)), ny = Math.max(r.y, Math.min(f.mouth.y, r.y + r.h))
  return { lg, dist: Math.hypot(nx - f.mouth.x, ny - f.mouth.y), angle: f.tongue_angle_deg }
}

test('the wide gap cannot be jumped, so the bridge is required', () => {
  const g = mk()
  const gap = g.level.items.logs[0]
  const airtime = (2 * CONFIG.jump_speed) / CONFIG.gravity
  const jumpable = CONFIG.run_speed * airtime
  assert.ok(gap.gap_right - gap.gap_left > jumpable + 100, `gap ${gap.gap_right - gap.gap_left} vs jump ${jumpable | 0}`)
  // running straight in kills you
  g.frog.physics.p_x = 1900
  g.frog.invuln_ms = 1e9
  for (let i = 0; i < 400 && g.state === GameState.PLAY; i++) g.update(16, { ...none, right: true, jump: i % 40 < 8 })
  assert.equal(g.state, GameState.DYING)
})

test('tongue the log: it slides over the gap and you can walk across the bridge', () => {
  const g = only(mk())
  const { lg, dist, angle } = pullLog(g)
  assert.ok(dist < 180, `log end within tongue reach (${dist | 0})`)
  assert.ok(angle <= CONFIG.frog_tongue_angle_limit_down_deg, `angle ${angle.toFixed(0)} within the aim limit`)
  assert.equal(lg.state, 'stuck')
  assert.ok(!g.level.solids.some((s) => s.kind === 'log'), 'not solid yet')
  for (let i = 0; i < 25 && lg.state === 'stuck'; i++) g.update(16, { ...none, eat: i < 3 })
  assert.equal(lg.state, 'sliding')
  run(g, 1400)
  assert.equal(lg.state, 'bridge')
  assert.ok(g.level.solids.some((s) => s.kind === 'log'))
  // the bridge spans the whole gap with overlap on both banks
  assert.ok(lg.solid.x <= 2100 && lg.solid.x + lg.solid.w >= 2500 + 40)
  // walk across
  g.frog.invuln_ms = 1e9
  const f = g.frog
  f.physics.p_x = 2000
  for (let i = 0; i < 500 && f.x < 2650; i++) { g.update(16, { ...none, right: true }); }
  assert.ok(f.x >= 2650, `crossed to ${f.x | 0}`)
  assert.equal(g.state, GameState.PLAY)
  // dying before the next checkpoint resets the puzzle
  g.checkpoint = 0; g._resetWorld()
  assert.ok(!g.level.solids.some((s) => s.kind === 'log'))
  assert.equal(log(g).state, 'stuck')
})

test('dark areas: darkness ramps in and out, and lights cut holes in it', () => {
  const g = mk()
  const L = g.level
  assert.equal(L.darknessAt(1000), 0)
  assert.equal(L.darknessAt(4000), 1)
  const edge = L.darknessAt(L.dark[0].x0 - 90)
  assert.ok(edge > 0 && edge < 1, 'soft edge')
  g.frog.physics.p_x = 3000
  const base = lightSources(g)[0].r
  assert.equal(base, CONFIG.base_light)
  g.frog.light_ms = 10000
  assert.ok(lightSources(g)[0].r === CONFIG.light_radius)
  g.frog.light_ms = 500
  assert.ok(lightSources(g)[0].r < CONFIG.light_radius && lightSources(g)[0].r > base, 'fades out near the end')
})

test('glow bug: collect it to light up the dark; fireflies and bugs are light sources', () => {
  const g = mk()
  const f = g.frog
  g.entities = [new GlowBug(f.x + f.w / 2, f.y + f.h / 2)]
  assert.ok(g.entities[0].light > 100)
  run(g, 100)
  assert.ok(f.light_ms > CONFIG.light_ms - 400)
  const g2 = new Game(CONFIG, createLevel1(), {})
  assert.ok(g2.entities.some((e) => e instanceof GlowBug))
  assert.ok(lightSources(g2).length > 3, 'fireflies/bugs/etc. glow')
  const dark = g2.level.dark[0]
  assert.ok(g2.entities.some((e) => e instanceof GlowBug && e.cx > dark.x0 && e.cx < dark.x1), 'a bug inside the dark zone')
})
