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

// ---- campaign progress: unlocked levels, best score and secrets per level ----
const PROGRESS_KEY = 'hungry_hopper.progress'
export const emptyProgress = () => ({ unlocked: 1, best: {}, secrets: {} })

export function loadProgress() {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(PROGRESS_KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return emptyProgress()
    return {
      unlocked: Math.max(1, Math.floor(raw.unlocked) || 1),
      best: raw.best && typeof raw.best === 'object' ? raw.best : {},
      secrets: raw.secrets && typeof raw.secrets === 'object' ? raw.secrets : {},
    }
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(p) {
  try { globalThis.localStorage?.setItem(PROGRESS_KEY, JSON.stringify(p)) } catch { /* ignore */ }
}
