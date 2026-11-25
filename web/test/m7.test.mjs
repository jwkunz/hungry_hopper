import test from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG } from '../src/game/config.js'
import { Game, GameState } from '../src/game/engine.js'
import { createLevel1 } from '../src/game/level.js'
import { Dragonfly, Pepper, Anchor } from '../src/game/items.js'
import { Beetle } from '../src/game/bestiary.js'
import { spawnBriar } from '../src/game/entities.js'

const none = { left: false, right: false, up: false, down: false, jump: false, eat: false }
const run = (g, ms, input = none) => { for (let t = 0; t < ms; t += 16) g.update(16, input) }
const start = (g) => { run(g, 700); g.tap(); g.update(16, none); assert.equal(g.state, GameState.PLAY) }
const mk = () => { const g = new Game(CONFIG, createLevel1(), {}); start(g); g.entities = []; g.frog.invuln_ms = 0; return g }

test('level has dragonflies, peppers and grapple anchors', () => {
  const g = new Game(CONFIG, createLevel1(), {})
  assert.ok(g.entities.some((e) => e instanceof Dragonfly))
  assert.ok(g.entities.some((e) => e instanceof Pepper))
  assert.ok(g.entities.filter((e) => e.grapple).length >= 1)
})

test('dragonfly: glide slows the fall only while JUMP is held, and wears off', () => {
  const g = mk()
  const f = g.frog
  g.entities = [new Dragonfly(f.x + f.w / 2, f.y + f.h / 2)]
  run(g, 100)
  assert.ok(f.glide_ms > 8000, 'power-up collected')
  const drop = (held) => {
    f.physics.p_y = g.level.ground_y - 340; f.physics.v_y = 0; f.physics.p_x = 300
    let vmax = 0
    for (let i = 0; i < 30; i++) { g.update(16, { ...none, jump: held }); vmax = Math.max(vmax, f.physics.v_y) }
    return vmax
  }
  assert.ok(drop(true) <= CONFIG.glide_fall + 1, 'capped fall speed')
  assert.ok(drop(false) > 300, 'normal fall when not holding')
  f.glide_ms = 10; run(g, 100)
  assert.equal(f.glide_ms, 0)
})

test('pepper: fire tongue burns an armoured beetle that deflects a normal tongue', () => {
  const shoot = (fire) => {
    const g = mk()
    const f = g.frog
    f.physics.p_x = 300
    run(g, 100)
    if (fire) f.fire_ms = 5000
    const b = new Beetle(f.mouth.x + 110, g.level.ground_y, 0)
    b.speed = 0
    g.entities = [b]
    f.is_right = true; f.tongue_angle_deg = 0
    for (let i = 0; i < 40; i++) g.update(16, { ...none, eat: i < 4 })
    return { b, g }
  }
  const a = shoot(false)
  assert.ok(a.b.alive, 'plain tongue bounces off the shell')
  const c = shoot(true)
  assert.ok(!c.b.alive, 'fire burns it')
  assert.ok(c.g.score > 0)
})

test('pepper: fire tongue torches neighbouring briar sections', () => {
  const g = mk()
  const f = g.frog
  f.physics.p_x = 300
  run(g, 100)
  const cells = spawnBriar({ x: f.mouth.x + 100, w: 36 * 3, h: 120 }, g.level.ground_y) // 3x2 block
  g.entities = cells
  f.fire_ms = 5000
  f.is_right = true; f.tongue_angle_deg = 0
  for (let i = 0; i < 40; i++) g.update(16, { ...none, eat: i < 4 })
  const gone = cells.filter((c) => !c.alive || c.gone).length
  assert.ok(gone >= 3, `burned ${gone} sections`)
})

test('grapple: tongue an anchor, get reeled in, hang, then JUMP flings you forward', () => {
  const g = mk()
  const f = g.frog
  f.physics.p_x = 300
  run(g, 100)
  const ax = f.mouth.x + 130, ay = f.mouth.y - 90
  const a = new Anchor(ax, ay)
  g.entities = [a]
  f.is_right = true
  f.tongue_angle_deg = -(Math.atan2(90, 130) * 180) / Math.PI
  for (let i = 0; i < 20 && !f.grapple; i++) g.update(16, { ...none, eat: i < 3 })
  assert.ok(f.grapple, 'latched on')
  run(g, 700)
  assert.equal(f.grapple?.phase, 'hang', 'hanging at the knob')
  assert.ok(Math.abs(f.x + f.w / 2 - ax) < 10 && Math.abs(f.y + f.h * 0.35 - ay) < 12, 'at the anchor')
  assert.ok(f.physics.v_y === 0 && f.physics.v_x === 0)
  // fling: press jump
  g.update(16, { ...none, jump: true, right: true })
  g.update(16, { ...none, jump: true, right: true })
  assert.equal(f.grapple, null, 'released')
  assert.ok(f.physics.v_x >= CONFIG.grapple_launch_x * 0.8, `launched forward (${f.physics.v_x})`)
  assert.ok(f.physics.v_y < 0, 'and upward')
  // hanging too long drops you
  const g2 = mk()
  const f2 = g2.frog
  f2.physics.p_x = 300; run(g2, 100)
  g2.entities = [new Anchor(f2.mouth.x + 130, f2.mouth.y - 90)]
  f2.is_right = true; f2.tongue_angle_deg = -(Math.atan2(90, 130) * 180) / Math.PI
  for (let i = 0; i < 20 && !f2.grapple; i++) g2.update(16, { ...none, eat: i < 3 })
  assert.ok(f2.grapple)
  run(g2, 4000)
  assert.equal(f2.grapple, null)
})

test('an anchor never hurts, and survives the respawn clear zone', () => {
  const g = mk()
  const f = g.frog
  g.entities = [new Anchor(f.x + f.w / 2, f.y + f.h / 2)]
  run(g, 100)
  assert.equal(g.state, GameState.PLAY)
  const g2 = new Game(CONFIG, createLevel1(), {})
  start(g2)
  g2.checkpoint = 0; g2.deaths = 1; g2._resetWorld()
  assert.ok(g2.entities.filter((e) => e.grapple).length >= 1, 'anchors stay')
})

test('combo multiplier: chained kills score x2, x3...; it times out and resets when hurt', () => {
  const g = mk()
  const e = { cx: 0, cy: 0 }
  g._award(100, e); assert.equal(g.score, 100)
  g._award(100, e); assert.equal(g.score, 300, 'second kill x2')
  g._award(100, e); assert.equal(g.score, 600, 'third kill x3')
  for (let i = 0; i < 20; i++) g._award(100, e)
  assert.equal(Math.min(CONFIG.combo_max, g.combo), CONFIG.combo_max)
  const before = g.score
  g._award(100, e); assert.equal(g.score - before, 100 * CONFIG.combo_max, 'capped')
  run(g, CONFIG.combo_window_ms + 200)
  assert.equal(g.combo, 0)
  g._award(100, e); assert.equal(g.combo, 1)
  g.frog.shield = true; g._hurt(); assert.equal(g.combo, 0)
})
