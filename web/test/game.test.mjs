import test from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG, frogHitbox } from '../src/game/config.js'
import { createLevel1 } from '../src/game/level.js'
import { moveAndCollide } from '../src/game/collision.js'
import { PhysicsODE2D } from '../src/game/physics.js'

const cfg = CONFIG
const hb = frogHitbox(cfg)
const level = createLevel1()

test('level 1: every platform is reachable with the current jump physics', () => {
  const apex = (cfg.jump_speed ** 2) / (2 * cfg.gravity)
  const airtime = (2 * cfg.jump_speed) / cfg.gravity
  const travel = cfg.run_speed * airtime // horizontal distance of a level jump

  // Surfaces: ground segments and leaves
  const nodes = [
    ...level.segments.map((s) => ({ x: s.x, w: s.w, y: level.ground_y, ground: true })),
    ...level.leaves.map((l) => ({ x: l.x, w: l.w, y: l.y })),
  ]
  const hgap = (a, b) => Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w))
  const canJump = (a, b) => {
    const rise = a.y - b.y // > 0 means b is higher
    if (rise > apex * 0.85) return false
    const reach = 0.8 * travel * (1 - Math.max(0, rise) / apex / 2) + 0.5 * hb.w
    return hgap(a, b) <= reach
  }
  const seen = new Set([0])
  const queue = [0]
  while (queue.length) {
    const i = queue.shift()
    nodes.forEach((n, j) => {
      if (!seen.has(j) && canJump(nodes[i], n)) { seen.add(j); queue.push(j) }
    })
  }
  const unreachable = nodes.filter((_, i) => !seen.has(i))
  assert.deepEqual(unreachable, [], 'unreachable surfaces')
})

test('level 1: spawn and goal are on the ground', () => {
  const onGround = (x) => level.segments.some((s) => x >= s.x && x <= s.x + s.w)
  assert.ok(onGround(level.spawn_x))
  assert.ok(onGround(level.goal_x))
})

function drop(body, prevY, solids) {
  const p = body
  return moveAndCollide(p, hb.w, hb.h, p.p_x, prevY, solids)
}

test('frog lands on solid ground and stops', () => {
  const p = new PhysicsODE2D()
  p.p_x = 100; p.p_y = level.ground_y - hb.h - 1; p.g = cfg.gravity
  for (let i = 0; i < 120; i++) {
    const [px, py] = [p.p_x, p.p_y]
    p.step(cfg.step_ms / 1000)
    const r = moveAndCollide(p, hb.w, hb.h, px, py, level.solids)
    if (i > 5) assert.ok(r.grounded)
  }
  assert.ok(Math.abs(p.p_y + hb.h - level.ground_y) < 0.01)
  assert.equal(p.v_y, 0)
})

test('walls block horizontal motion', () => {
  const solids = [{ x: 200, y: 0, w: 50, h: 500 }]
  const p = new PhysicsODE2D()
  p.p_x = 200 - hb.w - 1; p.p_y = 100; p.v_x = 300
  const [px, py] = [p.p_x, p.p_y]
  p.p_x += 10
  moveAndCollide(p, hb.w, hb.h, px, py, solids)
  assert.ok(Math.abs(p.p_x - (200 - hb.w)) < 0.01)
  assert.equal(p.v_x, 0)
})

test('one-way leaves: pass up through them, land on them from above', () => {
  const leaf = [{ x: 0, y: 300, w: 200, h: 14, oneWay: true }]
  // Rising through the leaf: no collision
  let p = new PhysicsODE2D()
  p.p_x = 50; p.p_y = 320; p.v_y = -500
  let [px, py] = [p.p_x, p.p_y]
  p.p_y -= 10
  let r = moveAndCollide(p, hb.w, hb.h, px, py, leaf)
  assert.equal(r.grounded, false)
  assert.equal(p.p_y, 310)
  // Falling onto the leaf from above: lands
  p = new PhysicsODE2D()
  p.p_x = 50; p.p_y = 300 - hb.h - 2; p.v_y = 500;
  ;[px, py] = [p.p_x, p.p_y]
  p.p_y += 5
  r = moveAndCollide(p, hb.w, hb.h, px, py, leaf)
  assert.equal(r.grounded, true)
  assert.ok(Math.abs(p.p_y - (300 - hb.h)) < 0.01)
})
