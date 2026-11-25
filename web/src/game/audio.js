// Web Audio wrapper: sound effects + looping music, with a mute toggle.
//
// Browsers (and Android WebViews) only allow audio after a user gesture, so
// call audio.unlock() from the first pointer/key event. Everything is a no-op
// until then, and in environments without Web Audio (tests).
import boing from '../assets/audio/boing.mp3'
import slurp from '../assets/audio/frog_slurp.mp3'
import gulp from '../assets/audio/frog_gulp.mp3'
import splat from '../assets/audio/splat.mp3'
import pickup from '../assets/audio/pickup.mp3'
import hit from '../assets/audio/hit.mp3'
import hurt from '../assets/audio/hurt.mp3'
import thud from '../assets/audio/thud.mp3'
import zoink from '../assets/audio/zoink.mp3'
import musicTitle from '../assets/audio/music_homescreen.mp3'
import musicPlay from '../assets/audio/music_running.mp3'

// Game event name -> { file, volume }
const SFX = {
  jump: { src: boing, volume: 0.6 },
  tongue: { src: slurp, volume: 0.7 },
  eat: { src: gulp, volume: 0.9 },
  stomp: { src: splat, volume: 0.9 },
  bounce: { src: zoink, volume: 0.5 },
  pickup: { src: pickup, volume: 0.8 },
  shield_lost: { src: hit, volume: 0.9 },
  die: { src: hurt, volume: 1.0 },
  land: { src: thud, volume: 0.45 },
  checkpoint: { src: zoink, volume: 0.8 },
  win: { src: pickup, volume: 1.0 },
  splash: { src: splat, volume: 0.4 },
  cut: { src: hit, volume: 0.55 },
  grab: { src: zoink, volume: 0.6 },
}
const MUSIC = { title: musicTitle, play: musicPlay }
const MUSIC_VOLUME = 0.35

const MUTE_KEY = 'hungry_hopper.muted'

class AudioManager {
  constructor() {
    this.ctx = null
    this.buffers = new Map() // src -> AudioBuffer
    this.loading = new Map() // src -> Promise
    this.muted = this._loadMuted()
    this.music_name = null
    this.music_node = null
    this.listeners = new Set()
  }

  _loadMuted() {
    try { return globalThis.localStorage?.getItem(MUTE_KEY) === '1' } catch { return false }
  }

  get available() {
    return typeof globalThis.AudioContext !== 'undefined' || typeof globalThis.webkitAudioContext !== 'undefined'
  }

  // Call from a user gesture. Safe to call repeatedly.
  unlock() {
    if (!this.available) return
    if (!this.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(this.ctx.destination)
      // Preload everything (small after MP3 compression)
      Object.values(SFX).forEach((s) => this._load(s.src))
      Object.values(MUSIC).forEach((src) => this._load(src))
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    if (this.music_name && !this.music_node) this._startMusic(this.music_name)
  }

  _load(src) {
    if (this.buffers.has(src)) return Promise.resolve(this.buffers.get(src))
    if (this.loading.has(src)) return this.loading.get(src)
    const p = fetch(src)
      .then((r) => r.arrayBuffer())
      .then((ab) => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
      .then((buf) => { this.buffers.set(src, buf); return buf })
      .catch(() => null)
    this.loading.set(src, p)
    return p
  }

  play(name) {
    const s = SFX[name]
    if (!s || !this.ctx || this.muted) return
    const buf = this.buffers.get(s.src)
    if (!buf) return
    const g = this.ctx.createGain()
    g.gain.value = s.volume
    const node = this.ctx.createBufferSource()
    node.buffer = buf
    node.connect(g).connect(this.master)
    node.start()
  }

  // Start looping music by name ('title' | 'play'), or stop with null.
  music(name) {
    if (name === this.music_name) return
    this._stopMusic()
    this.music_name = name
    if (name) this._startMusic(name)
  }

  _startMusic(name) {
    if (!this.ctx) return // will start on unlock()
    const src = MUSIC[name]
    this._load(src).then((buf) => {
      if (!buf || this.music_name !== name || this.music_node) return
      const g = this.ctx.createGain()
      g.gain.value = MUSIC_VOLUME
      const node = this.ctx.createBufferSource()
      node.buffer = buf
      node.loop = true
      node.connect(g).connect(this.master)
      node.start()
      this.music_node = node
    })
  }

  _stopMusic() {
    try { this.music_node?.stop() } catch { /* already stopped */ }
    this.music_node = null
  }

  setMuted(m) {
    this.muted = m
    try { globalThis.localStorage?.setItem(MUTE_KEY, m ? '1' : '0') } catch { /* private mode */ }
    if (this.master) this.master.gain.value = m ? 0 : 1
    this.listeners.forEach((fn) => fn(m))
  }
  toggleMuted() { this.setMuted(!this.muted) }
  onMuteChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }

  // Handle an event emitted by the game core
  handle(event) {
    if (event.startsWith('music:')) {
      const n = event.slice(6)
      this.music(n === 'stop' ? null : n)
    } else {
      this.play(event)
    }
  }
}

export const audio = new AudioManager()
