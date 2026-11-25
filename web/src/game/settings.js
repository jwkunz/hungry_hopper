// Player settings, persisted to localStorage (never throws).
const KEY = 'hungry_hopper.settings'
const DEFAULTS = { music: 0.35, sfx: 1, touch: true }

const clamp01 = (v) => Math.min(1, Math.max(0, Number.isFinite(+v) ? +v : 0))

function load() {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '{}')
    return {
      music: raw.music === undefined ? DEFAULTS.music : clamp01(raw.music),
      sfx: raw.sfx === undefined ? DEFAULTS.sfx : clamp01(raw.sfx),
      touch: raw.touch === undefined ? DEFAULTS.touch : !!raw.touch,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

class Settings {
  constructor() {
    this.values = load()
    this.listeners = new Set()
  }
  get(k) { return this.values[k] }
  set(k, v) {
    this.values = { ...this.values, [k]: k === 'touch' ? !!v : clamp01(v) }
    try { globalThis.localStorage?.setItem(KEY, JSON.stringify(this.values)) } catch { /* ignore */ }
    this.listeners.forEach((fn) => fn(this.values))
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
}

export const settings = new Settings()
export { DEFAULTS as SETTING_DEFAULTS }
