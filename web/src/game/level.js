// Level 1 — hand-built for now. Everything is plain data so it can move to a
// JSON/Tiled format later.

export const GROUND_Y = 460 // top surface of the ground
const GROUND_DEPTH = 200

export function createLevel1() {
  // [x, width] — gaps between segments are pits
  const segments = [
    [0, 1200],
    [1400, 900],
    [2500, 800],
    [3500, 900],
    [4600, 1000],
  ].map(([x, w]) => ({ x, w }))

  // One-way leaf platforms (x, top y, width)
  const leaves = [
    [600, 350, 140], [800, 250, 140],
    [1240, 385, 110],
    [1700, 350, 160], [1920, 250, 140], [2120, 350, 140],
    [2370, 385, 110],
    [2800, 350, 150], [3000, 260, 130], [3200, 350, 140],
    [3410, 385, 110],
    [3900, 350, 150], [4120, 250, 140], [4320, 350, 140],
    [4510, 385, 110],
  ].map(([x, y, w]) => ({ x, y, w, kind: 'leaf' }))

  // Decorative puddles on the ground (submerging comes in a later milestone)
  const puddles = [
    [300, 220], [1650, 180], [2900, 200], [4000, 220], [5100, 240],
  ].map(([x, w]) => ({ x, w }))

  // Enemies and pickups: [centre x, centre y, patrol range]
  const mosquitos = [
    [700, 330, 140], [1500, 300, 160], [2020, 190, 120], [2750, 340, 160],
    [3300, 300, 140], [4000, 330, 160], [4700, 320, 150], [5000, 280, 120],
  ].map(([x, y, range]) => ({ x, y, range }))
  // Shield fireflies: [centre x, centre y]
  const fireflies = [
    [870, 205], [1990, 195], [3065, 215], [4190, 205],
  ].map(([x, y]) => ({ x, y }))

  // Checkpoints (lily-pad flags on the ground): x position
  const checkpoints = [1500, 2600, 3600, 4700].map((x) => ({ x }))

  const solids = [
    ...segments.map((s) => ({ x: s.x, y: GROUND_Y, w: s.w, h: GROUND_DEPTH })),
    ...leaves.map((l) => ({ x: l.x, y: l.y, w: l.w, h: 14, oneWay: true })),
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
    leaves,
    puddles,
    checkpoints,
    mosquitos,
    fireflies,
    solids,
  }
}
