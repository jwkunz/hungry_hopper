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
