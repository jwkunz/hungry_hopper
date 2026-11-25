// The campaign: five areas in order. Beating a level unlocks the next.
import { buildLevel } from './builder.js'
import { LEVEL1 } from './level1.js'
import { LEVEL2 } from './level2.js'
import { LEVEL3 } from './level3.js'
import { LEVEL4 } from './level4.js'
import { LEVEL5 } from './level5.js'

const SPECS = [LEVEL1, LEVEL2, LEVEL3, LEVEL4, LEVEL5]

export const LEVELS = SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  subtitle: spec.subtitle,
  theme: spec.theme,
  secrets: (spec.secrets ?? []).length,
  build: () => buildLevel(spec),
}))
