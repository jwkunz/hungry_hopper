import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../game/config.js'
import { Game } from '../game/engine.js'
import { attachKeyboard, createInput } from '../game/input.js'
import TouchControls from './TouchControls.jsx'

const ASPECT = CONFIG.view_w / CONFIG.view_h

// Renders the game in a letterboxed 16:9 box that fits its parent, with the
// touch controls overlaid on top of it.
export default function GameCanvas() {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const [input] = useState(createInput)
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
    const dpr = window.devicePixelRatio || 1
    const c = canvasRef.current
    c.width = Math.round(box.w * dpr)
    c.height = Math.round(box.h * dpr)
  }, [box])

  // Keyboard + game loop
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const detachKeys = attachKeyboard(input)
    const debug = new URLSearchParams(window.location.search).has('debug')
    const game = new Game(CONFIG, undefined, { debug })
    window.__game = game // handy for debugging / tests

    let raf = 0
    let last = null
    const loop = (t) => {
      const dt = last === null ? 0 : t - last
      last = t
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
    }
  }, [input])

  return (
    <div className="stage" ref={stageRef}>
      <div className="viewport" style={{ width: box.w, height: box.h }}>
        <canvas ref={canvasRef} style={{ width: box.w, height: box.h }} />
        <TouchControls input={input} />
      </div>
    </div>
  )
}
