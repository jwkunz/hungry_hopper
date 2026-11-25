// Level 1 compatibility shim (the levels live in ./levels/).
import { buildLevel, GROUND_Y } from './levels/builder.js'
import { LEVEL1 } from './levels/level1.js'

export { GROUND_Y }
export function createLevel1() {
  const lv = buildLevel(LEVEL1)
  return lv
}
