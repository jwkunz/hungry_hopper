import { spawnEntities as spawnBase } from './entities.js'
import { spawnBestiary } from './bestiary.js'
import { FlyBoss } from './boss.js'
import { spawnItems } from './items.js'

// Everything that lives in a level: briars, mosquitos, fireflies + the bestiary.
export function spawnEntities(level) {
  const list = [...spawnBase(level), ...spawnBestiary(level), ...spawnItems(level)]
  if (level.boss) list.push(new FlyBoss(level.boss.x, level.boss.y, level.boss.arena, level.ground_y, 7, level.boss.variant))
  return list
}
