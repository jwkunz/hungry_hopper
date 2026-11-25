// Tiny localStorage helpers that never throw (private mode, tests, WebViews).
const HIGH_KEY = 'hungry_hopper.high_score'

export function loadHighScore() {
  try {
    return parseInt(globalThis.localStorage?.getItem(HIGH_KEY) ?? '0', 10) || 0
  } catch {
    return 0
  }
}

export function saveHighScore(score) {
  try { globalThis.localStorage?.setItem(HIGH_KEY, String(score)) } catch { /* ignore */ }
}
