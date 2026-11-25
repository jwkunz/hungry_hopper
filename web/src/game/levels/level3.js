// Level 3 — The Cypress Forest: tall platforms, owls, a bridge log and anchors.
// Boss: the Forest Fly (calls swarms of mosquitos).
export const LEVEL3 = {
  id: 'cypress',
  name: 'Cypress Forest',
  subtitle: 'Climb the canopy',
  theme: 'cypress',
  width: 5600,
  segments: [[0, 800], [1000, 900], [2400, 700], [3300, 900], [4400, 240]],
  ponds: [[3100, 200]],
  leaves: [
    [250, 120, 140], [430, 220, 130], [600, 320, 110],
    [1100, 110, 140], [1300, 210, 140], [1500, 310, 120], [1700, 200, 130],
    [2450, 110, 150], [2650, 210, 140], [2850, 300, 120],
    [3150, 75, 110], [3400, 110, 150], [3600, 210, 140], [3800, 310, 120], [4000, 200, 130],
  ],
  briars: [[700, 36, 340], [1400, 36, 56], [2600, 36, 340], [3500, 36, 340]],
  mosquitos: [[400, 150, 130], [1200, 260, 130], [1750, 140, 150], [2750, 160, 140], [3600, 260, 150], [3950, 150, 130]],
  bestiary: {
    owls: [[1450, 300], [3650, 300]],
    bats: [[600, 240], [2800, 240]],
    moles: [[300], [1650], [3400]],
    centipedes: [[1250, 100]],
    beetles: [[2750, 90], [3950, 100]],
    pillbugs: [[550, 70], [3650, 80]],
    cranes: [[2650, 80]],
  },
  items: {
    dragonflies: [[1600, 150], [3100, 160]],
    peppers: [[1170, 128], [3475, 128]],
    anchors: [[900, 190], [4300, 190]],
    logs: [{ gap_left: 1900, gap_right: 2400, length: 600 }],
  },
  fireflies: [[1750, 255], [3000, 255], [4100, 250]],
  checkpoints: [1100, 2500, 3400],
  secrets: [[650, 380], [2910, 370]],
  boss: { variant: 'cypress' },
}
