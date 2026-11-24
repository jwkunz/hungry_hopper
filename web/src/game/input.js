// Maps keyboard events to the abstract input the game consumes.
const KEY_TO_ACTION = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ' ': 'eat',
  f: 'jump',
}

export function createInput() {
  return { left: false, right: false, up: false, down: false, jump: false, eat: false }
}

// Attach listeners; returns a cleanup function. Mutates `input` in place.
export function attachKeyboard(input, target = window) {
  const actionFor = (e) => KEY_TO_ACTION[e.key] ?? KEY_TO_ACTION[e.key.toLowerCase()]
  const down = (e) => {
    const a = actionFor(e)
    if (!a) return
    e.preventDefault() // stop arrows / space from scrolling the page
    input[a] = true
  }
  const up = (e) => {
    const a = actionFor(e)
    if (a) input[a] = false
  }
  const clear = () => Object.keys(input).forEach((k) => (input[k] = false))
  target.addEventListener('keydown', down)
  target.addEventListener('keyup', up)
  window.addEventListener('blur', clear)
  return () => {
    target.removeEventListener('keydown', down)
    target.removeEventListener('keyup', up)
    window.removeEventListener('blur', clear)
  }
}
