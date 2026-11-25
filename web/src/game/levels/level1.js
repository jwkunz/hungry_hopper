// Level 1 — The Marsh. The tutorial level: everything is taught here, the
// boss is the plain Fly Boss.
export const LEVEL1 = {
  id: 'marsh',
  name: 'The Marsh',
  subtitle: 'Hop, tongue, stomp',
  theme: 'marsh',
  width: 5600,
  // ground segments; gaps are ponds (swimmable), pits (fatal) or bridged by a log
  segments: [[0, 1200], [1400, 700], [2500, 800], [3500, 900], [4600, 350], [5110, 490]],
  ponds: [[1200, 200], [3300, 200], [4950, 160]],
  // [x, height above ground, width]
  leaves: [
    [600, 110, 140], [800, 210, 140],
    [1240, 75, 110],
    [1700, 110, 160], [1920, 210, 140],
    [2800, 110, 150], [3000, 200, 130], [3200, 110, 140],
    [3410, 75, 110],
    [3900, 110, 150], [4120, 210, 140], [4320, 110, 140],
    [4510, 75, 110],
    [4780, 120, 150], [5030, 215, 140], [5250, 120, 150], [5440, 225, 110], // arena
  ],
  mud: [[820, 170], [2000, 100], [3800, 200]],
  briars: [[950, 36, 340], [1750, 36, 56], [2680, 36, 340], [4050, 36, 340]],
  mosquitos: [[700, 130, 140], [2020, 270, 120], [2750, 120, 160], [4000, 130, 160]],
  bestiary: {
    bats: [[1350, 250], [4250, 240]],
    moles: [[1100], [3700]],
    beetles: [[620, 100], [4290, 60]],
    centipedes: [[3050, 100]],
    pillbugs: [[1800, 70]],
    owls: [[3020, 285]],
    cranes: [[3900, 90]],
  },
  items: {
    dragonflies: [[1300, 150], [3400, 150]],
    peppers: [[670, 128], [4390, 128]],
    anchors: [[4500, 190]],
    glowbugs: [[3700, 130], [4130, 125]],
    logs: [{ gap_left: 2100, gap_right: 2500, length: 520 }],
  },
  fireflies: [[870, 255], [1990, 265], [3065, 245], [4190, 255], [5190, 270]],
  checkpoints: [1500, 2600, 3600, 4700],
  dark: [{ x0: 3560, x1: 4400, fade: 180 }],
  // [x, height above ground]: gold flies hidden around the level
  secrets: [[830, 340], [1300, -92]],
  boss: { x: 5300, y: 70, arena: { x0: 4640, x1: 5600, trigger: 4820 } },
}
