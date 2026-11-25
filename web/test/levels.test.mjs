import test from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG as cfg, frogHitbox } from '../src/game/config.js'
import { LEVELS } from '../src/game/levels/index.js'

const hb = frogHitbox(cfg)
// how far each walker can wander from its x (patrol + the extra it uses when angry/rolling)
const REACH = { beetles: (r) => r + 40, centipedes: (r) => r + 140, pillbugs: (r) => r + 150, cranes: (r) => r + 50, moles: () => 45 }

for (const L of LEVELS) {
  const level = L.build()
  const onGround = (x0, x1) => level.segments.some((s) => x0 >= s.x && x1 <= s.x + s.w)

  test(`${L.id}: every platform is reachable with the jump physics (logs count as ground)`, () => {
    const apex = (cfg.jump_speed ** 2) / (2 * cfg.gravity)
    const travel = cfg.run_speed * ((2 * cfg.jump_speed) / cfg.gravity)
    const nodes = [
      ...level.segments.map((s) => ({ x: s.x, w: s.w, y: level.ground_y })),
      ...level.leaves.map((l) => ({ x: l.x, w: l.w, y: l.y })),
      ...level.items.logs.map((l) => ({ x: l.gap_left - 40, w: l.length, y: level.ground_y })),
      // an anchor lets you cross a gap: model it as ground where you land
      ...level.items.anchors.map(([x, y]) => ({ x: x - 150, w: 300, y: level.ground_y })),
    ]
    const hgap = (a, b) => Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w))
    const canJump = (a, b) => {
      const rise = a.y - b.y
      if (rise > apex * 0.85) return false
      return hgap(a, b) <= 0.8 * travel * (1 - Math.max(0, rise) / apex / 2) + 0.5 * hb.w
    }
    const seen = new Set([0]); const q = [0]
    while (q.length) { const i = q.shift(); nodes.forEach((n, j) => { if (!seen.has(j) && canJump(nodes[i], n)) { seen.add(j); q.push(j) } }) }
    assert.deepEqual(nodes.filter((_, i) => !seen.has(i)), [], 'unreachable')
  })

  test(`${L.id}: spawn and goal are on the ground; checkpoints on ground; the boss arena exists`, () => {
    assert.ok(onGround(level.spawn_x, level.spawn_x + 5))
    assert.ok(onGround(level.goal_x, level.goal_x + 5))
    for (const c of level.checkpoints) assert.ok(onGround(c.x, c.x + 1), `checkpoint ${c.x}`)
    assert.ok(level.boss && level.boss.arena.x1 === level.width)
    assert.ok(level.secrets.length >= 1)
    assert.ok(L.name && L.subtitle)
  })

  test(`${L.id}: walkers stay over solid ground (no floating over pits)`, () => {
    for (const [kind, f] of Object.entries(REACH)) {
      for (const [x, r] of level.bestiary[kind] ?? []) {
        const reach = f(r ?? 0)
        const inSeg = level.segments.some((s) => x - reach >= s.x && x + reach <= s.x + s.w)
        assert.ok(inSeg, `${kind} at ${x} (reach ${reach}) hangs over a gap`)
      }
    }
  })

  test(`${L.id}: anchors, logs and bridge gaps make sense`, () => {
    for (const lg of level.items.logs) {
      assert.ok(lg.length >= lg.gap_right - lg.gap_left + 80, 'log long enough to span the gap')
      assert.ok(onGround(lg.gap_left - 50, lg.gap_left - 40), 'near bank exists')
      assert.ok(onGround(lg.gap_right + 10, lg.gap_right + 20), 'far bank exists')
    }
    // every gap wider than a jump has a log (or is water you can swim)
    const jump = cfg.run_speed * ((2 * cfg.jump_speed) / cfg.gravity)
    const segs = [...level.segments].sort((a, b) => a.x - b.x)
    for (let i = 0; i + 1 < segs.length; i++) {
      const gap = segs[i + 1].x - (segs[i].x + segs[i].w)
      const isWater = level.ponds.some((p) => p.x >= segs[i].x + segs[i].w - 1 && p.x + p.w <= segs[i + 1].x + 1)
      if (gap > jump && !isWater) assert.ok(level.items.logs.some((l) => l.gap_left === segs[i].x + segs[i].w), `gap at ${segs[i].x + segs[i].w}`)
    }
  })
}

test('the campaign has five levels with distinct ids and themes', () => {
  assert.equal(LEVELS.length, 5)
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, 5)
  assert.equal(new Set(LEVELS.map((l) => l.theme)).size, 5)
})
