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
    // a pulled bridge log counts as ground (that is the puzzle's solution)
    ...(level.items.logs ?? []).map((l) => ({ x: l.gap_left - 40, w: l.length, y: level.ground_y })),
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

import { segmentHitsRect, isStomp, rectsOverlap } from '../src/game/collision.js'

test('segmentHitsRect: hits, misses, and thickness', () => {
  const r = { x: 100, y: 100, w: 40, h: 30 }
  assert.ok(segmentHitsRect(0, 115, 120, 115, r), 'passes through the box')
  assert.ok(!segmentHitsRect(0, 115, 90, 115, r), 'stops short')
  assert.ok(!segmentHitsRect(0, 90, 200, 90, r), 'passes above')
  assert.ok(segmentHitsRect(0, 90, 200, 90, r, 12), 'thickness reaches it')
  assert.ok(segmentHitsRect(120, 0, 120, 200, r), 'vertical segment')
  assert.ok(segmentHitsRect(0, 0, 200, 200, r), 'diagonal')
})

test('isStomp: only when coming down onto the top half', () => {
  const e = { x: 0, y: 100, w: 50, h: 40 }
  assert.ok(isStomp(95, 200, e), 'falling from above')
  assert.ok(!isStomp(95, -200, e), 'rising into it from below is not a stomp')
  assert.ok(!isStomp(130, 200, e), 'feet already below the midline = side hit')
})

test('rectsOverlap', () => {
  assert.ok(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 10, h: 10 }))
  assert.ok(!rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }))
})

test('level 1: enemies and pickups are in bounds and not inside solid ground', () => {
  const things = [...level.mosquitos, ...level.fireflies]
  for (const t of things) {
    assert.ok(t.x > 0 && t.x < level.width, `x in bounds: ${t.x}`)
    assert.ok(t.y < level.ground_y - 20, `above the ground: ${t.x},${t.y}`)
  }
  // Fireflies must be reachable by tongue or jump: within ~apex+frog height of some surface
  const apex = (cfg.jump_speed ** 2) / (2 * cfg.gravity)
  for (const f of level.fireflies) {
    const surfaces = [
      ...level.segments.map((s) => ({ x: s.x, w: s.w, y: level.ground_y })),
      ...level.leaves,
    ].filter((s) => f.x >= s.x - 120 && f.x <= s.x + s.w + 120)
    assert.ok(surfaces.some((s) => s.y - f.y <= apex + 90), `firefly at ${f.x} reachable`)
  }
})
