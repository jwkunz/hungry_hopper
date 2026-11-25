import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../game/config.js'
import { Game } from '../game/engine.js'
import { attachKeyboard, createInput } from '../game/input.js'
import { audio } from '../game/audio.js'
import TouchControls from './TouchControls.jsx'
import SoundToggle from './SoundToggle.jsx'
import { MenuButton, MenuPanel } from './Menu.jsx'
import { settings } from '../game/settings.js'
import { LEVELS } from '../game/levels/index.js'
import { quality } from '../game/render.js'

const playingNow = (g) => !!g && (g.state === 'play' || g.state === 'dying')

const ASPECT = CONFIG.view_w / CONFIG.view_h

// Renders the game in a letterboxed 16:9 box that fits its parent, with the
// touch controls overlaid on top of it.
export default function GameCanvas() {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const [input] = useState(createInput)
  const [menu, setMenu] = useState(false) // pause / settings open
  const [inRun, setInRun] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [touch, setTouch] = useState(settings.get('touch'))
  const [lowfx, setLowfx] = useState(settings.get('lowfx'))
  const [box, setBox] = useState({ w: CONFIG.view_w, h: CONFIG.view_h })

  // Fit the 16:9 box into the stage
  useEffect(() => {
    const stage = stageRef.current
    const fit = () => {
      const r = stage.getBoundingClientRect()
      const w = Math.floor(Math.min(r.width, r.height * ASPECT))
      setBox({ w, h: Math.floor(w / ASPECT) })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  // Backing-store resolution follows the box size and device pixel ratio
  useEffect(() => {
    const dpr = lowfx ? 1 : Math.min(2, window.devicePixelRatio || 1)
    const c = canvasRef.current
    c.width = Math.round(box.w * dpr)
    c.height = Math.round(box.h * dpr)
  }, [box, lowfx])

  useEffect(() => settings.subscribe((v) => { setTouch(v.touch); setLowfx(v.lowfx) }), [])
  useEffect(() => { quality.low = lowfx }, [lowfx])
  useEffect(() => {
    const id = setInterval(() => setPlaying(playingNow(gameRef.current)), 200)
    return () => clearInterval(id)
  }, [])

  const openMenu = () => {
    const g = gameRef.current
    if (!g) return
    const run = g.state === 'play' || g.state === 'dying'
    setInRun(run)
    g.setPaused(true)
    audio.suspend()
    Object.keys(input).forEach((k) => (input[k] = false))
    setMenu(true)
  }
  const closeMenu = () => {
    gameRef.current?.setPaused(false)
    audio.resume()
    setMenu(false)
  }
  const menuRef = useRef({ menu, openMenu, closeMenu })
  menuRef.current = { menu, openMenu, closeMenu }

  // Keyboard + game loop
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const detachKeys = attachKeyboard(input)

    // Audio needs a user gesture; 'm' toggles mute.
    const unlock = () => audio.unlock()
    const onKey = (e) => {
      unlock()
      if (e.key === 'm' || e.key === 'M') audio.toggleMuted()
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        const m = menuRef.current
        if (m.menu) m.closeMenu()
        else m.openMenu()
      }
    }
    // Pause automatically when the tab / app goes to the background
    const onHide = () => {
      if (document.hidden && !menuRef.current.menu) {
        const g = gameRef.current
        if (g && (g.state === 'play' || g.state === 'dying')) menuRef.current.openMenu()
      }
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onHide)
    const debug = new URLSearchParams(window.location.search).has('debug')
    const game = new Game(CONFIG, undefined, { levels: LEVELS, debug, onEvent: (e) => audio.handle(e) })
    gameRef.current = game
    window.__audio = audio
    window.__game = game // handy for debugging / tests

    let raf = 0
    let last = null
    let slow = 16
    let slowFrames = 0
    const loop = (t) => {
      const dt = last === null ? 0 : t - last
      last = t
      // Struggling device? Drop to low-power graphics automatically.
      if (dt > 0 && dt < 250 && !settings.get('lowfx')) {
        slow = slow * 0.97 + dt * 0.03
        if (slow > 30 && ++slowFrames > 150) settings.set('lowfx', true)
      }
      game.update(dt, input)
      const k = canvas.width / CONFIG.view_w
      ctx.setTransform(k, 0, 0, k, 0, 0)
      game.draw(ctx)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      detachKeys()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHide)
      audio.music(null)
    }
  }, [input])

  return (
    <div className="stage" ref={stageRef}>
      <div className="viewport" style={{ width: box.w, height: box.h }}>
        <canvas
          ref={canvasRef}
          style={{ width: box.w, height: box.h }}
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            gameRef.current?.tap(((e.clientX - r.left) / r.width) * CONFIG.view_w, ((e.clientY - r.top) / r.height) * CONFIG.view_h)
          }}
        />
        <SoundToggle />
        <MenuButton playing={playing} onOpen={openMenu} />
        {touch && <TouchControls input={input} />}
        {menu && (
          <MenuPanel
            inRun={inRun}
            onResume={closeMenu}
            onRestart={() => { gameRef.current.restartRun(); closeMenu() }}
            onQuit={() => { gameRef.current.quitToTitle(); closeMenu() }}
            onLevels={() => { gameRef.current.openSelect(); closeMenu() }}
          />
        )}
      </div>
    </div>
  )
}
