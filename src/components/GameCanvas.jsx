import { useEffect, useRef } from 'react'
import { Game } from '../game/engine.js'
import { attachKeyboard, createInput } from '../game/input.js'

// Canvas is 90% of the window width and 75% of its height (as in v1).
const viewportSize = () => ({
  width: Math.round(window.innerWidth * 0.9),
  height: Math.round(window.innerHeight * 0.75),
})

export default function GameCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const input = createInput()
    const detachKeys = attachKeyboard(input)

    const size = viewportSize()
    canvas.width = size.width
    canvas.height = size.height
    const game = new Game(size.width, size.height)

    const onResize = () => {
      const s = viewportSize()
      canvas.width = s.width
      canvas.height = s.height
      game.resize(s.width, s.height)
    }
    window.addEventListener('resize', onResize)

    let raf = 0
    let last = null
    const loop = (t) => {
      const dt = last === null ? 0 : t - last
      last = t
      game.update(dt, input)
      game.draw(ctx)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      detachKeys()
    }
  }, [])

  return <canvas ref={canvasRef} id="viewport" />
}
