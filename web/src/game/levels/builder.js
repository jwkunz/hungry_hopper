// Turns a compact level spec (plain data) into the level object the engine,
// renderer and entity spawner use. Heights are written relative to the ground.

export const GROUND_Y = 400 // top surface of the ground
const GROUND_DEPTH = 300
const LEAF_THICKNESS = 14

// Look & weather per area. Missing keys fall back to the marsh.
export const THEMES = {
  marsh: {
    sky: ['#16302a', '#2c5a43', '#3b6b4a'], hills: '#1b3d30', decor: '#244d37', decor_kind: 'reeds',
    mist: '205,232,218', dirt: '#3a2a1a', grass: '#4a8a3c', grass2: '#5fa24a',
    leaf: '#3f9a45', leaf_vein: '#2a6e30', flies: '235,255,170', weather: null,
  },
  bog: {
    sky: ['#1f2a1c', '#3b4a2a', '#52572f'], hills: '#2a3320', decor: '#3a4527', decor_kind: 'reeds',
    mist: '190,200,150', dirt: '#2f2414', grass: '#6a7a30', grass2: '#869a3c',
    leaf: '#6a9a3a', leaf_vein: '#3f6a22', flies: '210,255,120', weather: 'spores',
  },
  cypress: {
    sky: ['#0f2430', '#1d4a52', '#2c6a5a'], hills: '#143a3e', decor: '#10343a', decor_kind: 'trees',
    mist: '170,215,215', dirt: '#2d2a22', grass: '#3a8a5a', grass2: '#4cae70',
    leaf: '#2f9a6a', leaf_vein: '#1d6a46', flies: '180,255,230', weather: 'drift',
  },
  storm: {
    sky: ['#070a18', '#141b36', '#212c4e'], hills: '#0e1428', decor: '#141c34', decor_kind: 'reeds',
    mist: '140,160,200', dirt: '#1f1a18', grass: '#2f6a58', grass2: '#3f8a70',
    leaf: '#2a7a66', leaf_vein: '#1a4a3e', flies: '170,200,255', weather: 'storm',
  },
  hive: {
    sky: ['#2a1704', '#5a3a0a', '#8a5a14'], hills: '#4a2c08', decor: '#6a4510', decor_kind: 'hex',
    mist: '255,215,140', dirt: '#4a2f0c', grass: '#c28a1c', grass2: '#e0a82c',
    leaf: '#d6a62c', leaf_vein: '#8a6410', flies: '255,235,150', weather: 'embers',
  },
}

export function buildLevel(spec) {
  const G = GROUND_Y
  const width = spec.width
  let segments = [...spec.segments]
  let ponds = [...(spec.ponds ?? [])]
  let leaves = [...(spec.leaves ?? [])]
  let fireflies = [...(spec.fireflies ?? [])]
  let checkpoints = [...(spec.checkpoints ?? [])]
  let boss = null

  // Standard boss arena at the end of the level (puddle, leaves, a shield, a checkpoint)
  if (spec.boss) {
    if (spec.boss.arena) {
      boss = { type: 'fly', ...spec.boss, variant: spec.boss.variant ?? 'fly' }
    } else {
      const x0 = width - 960
      segments.push([x0, 350], [x0 + 510, 450])
      ponds.push([x0 + 350, 160])
      leaves.push([x0 + 140, 120, 150], [x0 + 390, 215, 140], [x0 + 610, 120, 150], [x0 + 800, 225, 110])
      fireflies.push([x0 + 550, 270])
      checkpoints.push(x0 + 60)
      boss = {
        type: 'fly', variant: spec.boss.variant ?? 'fly', x: x0 + 660, y: G - 330,
        arena: { x0, x1: width, trigger: x0 + 180 },
      }
    }
  }

  segments = segments.map(([x, w]) => ({ x, w }))
  ponds = ponds.map(([x, w]) => ({ x, w, surface_y: G + 14, floor_y: G + 112 }))
  leaves = leaves.map(([x, above, w]) => ({
    x, w, y: G - above, y0: G - above, h: LEAF_THICKNESS, dip: 0, oneWay: true, kind: 'leaf',
  }))
  const mud = (spec.mud ?? []).map(([x, w]) => ({ x, w }))
  const briars = (spec.briars ?? []).map(([x, w, h]) => ({ x, w, h }))
  const mosquitos = (spec.mosquitos ?? []).map(([x, above, range]) => ({ x, y: G - above, range }))
  fireflies = fireflies.map(([x, above]) => ({ x, y: G - above }))
  checkpoints = checkpoints.map((x) => ({ x }))

  // items are written with heights above the ground
  const it = spec.items ?? {}
  const up = (list = []) => list.map(([x, above]) => [x, G - above])
  const items = {
    dragonflies: up(it.dragonflies),
    peppers: up(it.peppers),
    anchors: up(it.anchors),
    glowbugs: up(it.glowbugs),
    logs: it.logs ?? [],
  }
  const secrets = (spec.secrets ?? []).map(([x, above], i) => ({ id: `${spec.id}:${i}`, x, y: G - above }))

  const solids = [
    ...segments.map((s) => ({ x: s.x, y: G, w: s.w, h: GROUND_DEPTH })),
    ...ponds.map((p) => ({ x: p.x, y: p.floor_y, w: p.w, h: 80 })),
    ...leaves, // same objects, so a dipping leaf's collision follows its drawing
  ]

  return {
    id: spec.id,
    name: spec.name,
    subtitle: spec.subtitle ?? '',
    theme: { ...THEMES.marsh, ...(THEMES[spec.theme] ?? {}) },
    width,
    height: 540,
    ground_y: G,
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
    bestiary: spec.bestiary ?? {},
    items,
    secrets,
    // Dark areas: only light sources (you, glow bugs, fireflies) show what is inside
    dark: spec.dark ?? [],
    darknessAt(x) {
      let d = 0
      for (const z of this.dark) d = Math.max(d, Math.max(0, Math.min(1, Math.min(x - (z.x0 - z.fade), z.x1 + z.fade - x) / z.fade)))
      return d
    },
    // Boss: lives in the arena at the end of the level. The arena locks the
    // camera to [x0, x0+view] once you pass `trigger`.
    boss,
    solids,
    pondAt: (cx) => ponds.find((p) => cx > p.x && cx < p.x + p.w) ?? null,
    mudAt: (cx) => mud.some((m) => cx >= m.x && cx <= m.x + m.w),
  }
}
