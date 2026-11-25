import { spawnEntities as spawnBase } from './entities.js'
import { spawnBestiary } from './bestiary.js'

// Everything that lives in a level: briars, mosquitos, fireflies + the bestiary.
export function spawnEntities(level) {
  return [...spawnBase(level), ...spawnBestiary(level)]
}
