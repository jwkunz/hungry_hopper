// Level 1 — hand-built for now. Everything is plain data so it can move to a
// JSON/Tiled format later. Heights are written relative to the ground.

export const GROUND_Y = 400 // top surface of the ground
const GROUND_DEPTH = 300
const LEAF_THICKNESS = 14

export function createLevel1() {
  // [x, width] — gaps between segments are ponds (swimmable) or pits (fatal)
  const segments = [
    [0, 1200],
    [1400, 900],
    [2500, 800],
    [3500, 900],
    [4600, 1000],
  ].map(([x, w]) => ({ x, w }))

  // Ponds fill some gaps: 1200-1400 and 3300-3500. (2300-2500 and 4400-4600
  // are bottomless pits.)
  const ponds = [
    [1200, 200],
    [3300, 200],
  ].map(([x, w]) => ({ x, w, surface_y: GROUND_Y + 14, floor_y: GROUND_Y + 112 }))

  // One-way leaf platforms: [x, height above ground, width]. They dip a few
  // pixels when stood on (see Game._updateLeaves).
  const leaves = [
    [600, 110, 140], [800, 210, 140],
    [1240, 75, 110],
    [1700, 110, 160], [1920, 210, 140], [2120, 110, 140],
    [2370, 75, 110],
    [2800, 110, 150], [3000, 200, 130], [3200, 110, 140],
    [3410, 75, 110],
    [3900, 110, 150], [4120, 210, 140], [4320, 110, 140],
    [4510, 75, 110],
  ].map(([x, above, w]) => ({
    x, w, y: GROUND_Y - above, y0: GROUND_Y - above, h: LEAF_THICKNESS, dip: 0, oneWay: true, kind: 'leaf',
  }))

  // Mud patches slow you down: [x, width]
  const mud = [[820, 170], [2000, 200], [3800, 200]].map(([x, w]) => ({ x, w }))

  // Briars: [centre x, width, height]. Each is a grid of 36x60 sections that
  // the tongue cuts away one at a time. Tall walls are 3 sections thick, so
  // tunnelling through one at frog height takes three shots; low patches are
  // hoppable.
  const briars = [
    [950, 108, 340], [1750, 108, 56], [2680, 108, 340], [4050, 108, 340], [4900, 108, 56],
  ].map(([x, w, h]) => ({ x, w, h }))

  // Enemies and pickups: [centre x, height above ground, patrol range]
  const mosquitos = [
    [700, 130, 140], [2020, 270, 120], [2750, 120, 160],
    [4000, 130, 160], [5000, 180, 120],
  ].map(([x, above, range]) => ({ x, y: GROUND_Y - above, range }))
  // Bestiary (M5): [x, extra]. Bats/owls: height above ground. Walkers: patrol range.
  const bestiary = {
    bats: [[1350, 250], [4250, 240]],
    moles: [[1100], [4300]],
    beetles: [[620, 100], [4420, 110]],
    centipedes: [[3080, 120], [5120, 100]],
    pillbugs: [[1950, 90], [5260, 90]],
    owls: [[2250, 285]],
    cranes: [[3900, 90]],
  }
  // Shield fireflies: [centre x, height above ground]
  const fireflies = [
    [870, 255], [1990, 265], [3065, 245], [4190, 255],
  ].map(([x, above]) => ({ x, y: GROUND_Y - above }))

  // Checkpoints (lily-pad flags on the ground): x position
  const checkpoints = [1500, 2600, 3600, 4700].map((x) => ({ x }))

  const solids = [
    ...segments.map((s) => ({ x: s.x, y: GROUND_Y, w: s.w, h: GROUND_DEPTH })),
    ...ponds.map((p) => ({ x: p.x, y: p.floor_y, w: p.w, h: 80 })),
    ...leaves, // same objects, so a dipping leaf's collision follows its drawing
  ]

  const width = 5600
  return {
    name: 'Level 1 — The Marsh',
    width,
    height: 540,
    ground_y: GROUND_Y,
    spawn_x: 120,
    goal_x: width - 150,
    segments,
    ponds,
    leaves,
    mud,
    briars,
    checkpoints,
    mosquitos,
    fireflies,
    bestiary,
    solids,
    pondAt: (cx) => ponds.find((p) => cx > p.x && cx < p.x + p.w) ?? null,
    mudAt: (cx) => mud.some((m) => cx >= m.x && cx <= m.x + m.w),
  }
}
