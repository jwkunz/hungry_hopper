import { spawnEntities as spawnBase } from './entities.js'
import { spawnBestiary } from './bestiary.js'
import { FlyBoss } from './boss.js'

// Everything that lives in a level: briars, mosquitos, fireflies + the bestiary.
export function spawnEntities(level) {
  const list = [...spawnBase(level), ...spawnBestiary(level)]
  if (level.boss) list.push(new FlyBoss(level.boss.x, level.boss.y, level.boss.arena, level.ground_y))
  return list
}
