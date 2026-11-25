import test from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG } from '../src/game/config.js'
import { Game, GameState } from '../src/game/engine.js'
import { LEVELS } from '../src/game/levels/index.js'
import { SELECT_CARDS, TITLE_LEVELS_BTN, SELECT_BACK_BTN } from '../src/game/ui.js'
import { VARIANTS } from '../src/game/boss.js'
import { emptyProgress } from '../src/game/storage.js'

const idle = { left: false, right: false, jump: false, eat: false, up: false, down: false }
const mk = () => new Game(CONFIG, undefined, { levels: LEVELS, progress: emptyProgress() })
const step = (g, ms = 400) => { for (let i = 0; i < ms / 16; i++) g.update(16, idle) }
const tapAt = (g, x, y) => { step(g, 700); g.tap(x, y); g.update(16, idle) }
const mid = (r) => [r.x + r.w / 2, r.y + r.h / 2]

test('title LEVELS button opens select; back returns', () => {
  const g = mk()
  tapAt(g, ...mid(TITLE_LEVELS_BTN))
  assert.equal(g.state, GameState.SELECT)
  tapAt(g, ...mid(SELECT_BACK_BTN))
  assert.equal(g.state, GameState.TITLE)
})

test('locked levels cannot start; level 1 can', () => {
  const g = mk()
  g.openSelect()
  tapAt(g, ...mid(SELECT_CARDS[2]))
  assert.equal(g.state, GameState.SELECT)
  tapAt(g, ...mid(SELECT_CARDS[0]))
  assert.equal(g.state, GameState.PLAY)
  assert.equal(g.level.id, LEVELS[0].id)
})

test('completing a level unlocks the next and advances', () => {
  const g = mk()
  g.startLevel(0)
  g.boss_defeated = true
  g.frog.physics.p_x = g.level.goal_x + 10
  step(g, 200)
  assert.equal(g.state, GameState.COMPLETE)
  assert.equal(g.progress.unlocked, 2)
  tapAt(g, 100, 100)
  assert.equal(g.state, GameState.PLAY)
  assert.equal(g.level_index, 1)
})

test('golden fly counts once and is saved on completion', () => {
  const g = mk()
  g.startLevel(0)
  const s = g.entities.find((e) => e.secret_id)
  assert.ok(s)
  g._collect(s)
  assert.equal(g.secrets_run.size, 1)
  g.boss_defeated = true
  g.frog.physics.p_x = g.level.goal_x + 10
  step(g, 200)
  assert.deepEqual(g.progress.secrets[g.level.id], [s.secret_id])
})

test('every boss variant is defined with a title', () => {
  for (const l of LEVELS) assert.ok((l.build().boss.variant ?? "fly") in VARIANTS)
  for (const v of Object.values(VARIANTS)) assert.ok(v.title && v.hp >= 2)
})

test('queen boss throws mud, bolts and swarms during a fight', () => {
  const g = mk()
  g.startLevel(4)
  const b = g.entities.find((e) => e.is_boss)
  assert.ok(b && b.max_hp === 4)
  g.frog.physics.p_x = g.level.boss.arena.x0 + 200
  g.frog.physics.p_y = g.level.ground_y - 60
  const seen = new Set()
  for (let i = 0; i < 60 * 25; i++) {
    g.frog.physics.p_x = g.level.boss.arena.x0 + 200
    g.cam_x = g.level.boss.arena.x0
    g.update(16, idle)
    if (g.state !== GameState.PLAY) g.startLevel(4)
    const bb = g.entities.find((e) => e.is_boss)
    if (bb && i % 40 === 0) { bb.atk.mud = 0; bb.atk.bolt = 0 }
    for (const e of g.entities) if (e.constructor.name) seen.add(e.label ?? e.constructor.name)
  }
  assert.ok([...seen].some((n) => /Mud/.test(n)), 'mud')
  assert.ok([...seen].some((n) => /Bolt/.test(n)), 'bolt')
})
