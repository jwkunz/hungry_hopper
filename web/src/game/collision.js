// AABB-vs-world collision for a moving box. Pure functions, no DOM.
//
// A solid is { x, y, w, h, oneWay? }. One-way solids (leaves) only stop a box
// that is falling onto them from above.

const EPS = 0.001

const overlaps = (x, y, w, h, s) =>
  x < s.x + s.w - EPS && x + w > s.x + EPS && y < s.y + s.h - EPS && y + h > s.y + EPS

// `body` is a physics object whose p_x/p_y were just integrated from
// (prevX, prevY). Moves X first, then Y, snapping against solids and zeroing
// velocity on contact. Returns { grounded, hitCeiling }.
export function moveAndCollide(body, w, h, prevX, prevY, solids) {
  let x = body.p_x
  let y = body.p_y
  let grounded = false
  let hitCeiling = false

  // --- X axis (at the old y) ---
  const dx = x - prevX
  if (dx !== 0) {
    for (const s of solids) {
      if (s.oneWay) continue
      if (overlaps(x, prevY, w, h, s)) {
        x = dx > 0 ? s.x - w : s.x + s.w
        body.v_x = 0
      }
    }
  }

  // --- Y axis (at the resolved x) ---
  const dy = y - prevY
  for (const s of solids) {
    if (!overlaps(x, y, w, h, s)) continue
    if (s.oneWay) {
      if (dy >= 0 && body.v_y >= 0 && prevY + h <= s.y + EPS) {
        y = s.y - h
        body.v_y = 0
        grounded = true
      }
    } else if (dy >= 0) {
      y = s.y - h
      body.v_y = 0
      grounded = true
    } else {
      y = s.y + s.h
      body.v_y = 0
      hitCeiling = true
    }
  }

  body.p_x = x
  body.p_y = y
  return { grounded, hitCeiling }
}

// ---- Combat helpers ----

export const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

// Does the segment (x1,y1)-(x2,y2), thickened by `pad` on every side, touch
// rect r? (Slab method on the padded rect.)
export function segmentHitsRect(x1, y1, x2, y2, r, pad = 0) {
  let t0 = 0
  let t1 = 1
  const axes = [
    [x1, x2 - x1, r.x - pad, r.x + r.w + pad],
    [y1, y2 - y1, r.y - pad, r.y + r.h + pad],
  ]
  for (const [p, d, min, max] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (p < min || p > max) return false
    } else {
      let ta = (min - p) / d
      let tb = (max - p) / d
      if (ta > tb) [ta, tb] = [tb, ta]
      t0 = Math.max(t0, ta)
      t1 = Math.min(t1, tb)
      if (t0 > t1) return false
    }
  }
  return true
}

// Was this a stomp? The frog must have been moving down (or level) and its
// feet must have started above the middle of the enemy.
export function isStomp(prevBottom, prevVy, rect, frac = 0.5) {
  return prevVy >= 0 && prevBottom <= rect.y + rect.h * frac
}
