// Hit areas of the tappable buttons (logical view coordinates); drawn by render.js
export const TITLE_LEVELS_BTN = { x: 380, y: 372, w: 200, h: 46 }
export const SELECT_BACK_BTN = { x: 20, y: 20, w: 130, h: 40 }
export const SELECT_CARDS = Array.from({ length: 5 }, (_, i) => ({ x: 65 + i * 170, y: 150, w: 150, h: 230 }))
export const hitRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
