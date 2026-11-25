import { useState } from 'react'

// One on-screen button. Uses Pointer Events so mouse, touch and pen all work,
// and pointer capture so a finger sliding off the button still releases it.
// Mutates the shared `input` object (same one the keyboard writes to).
function PadButton({ input, action, className = '', label, aria }) {
  const [down, setDown] = useState(false)
  const set = (v) => {
    input[action] = v
    setDown(v)
  }
  return (
    <button
      type="button"
      aria-label={aria ?? label}
      className={`pad ${className} ${down ? 'down' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        set(true)
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
}

export default function TouchControls({ input }) {
  return (
    <div className="touch">
      <div className="cluster left">
        <PadButton input={input} action="left" label="◀" aria="Move left" className="dir" />
        <PadButton input={input} action="right" label="▶" aria="Move right" className="dir" />
        <div className="aim">
          <PadButton input={input} action="up" label="▲" aria="Aim tongue up" className="small" />
          <PadButton input={input} action="down" label="▼" aria="Aim tongue down" className="small" />
        </div>
      </div>
      <div className="cluster right">
        <PadButton input={input} action="eat" label="TONGUE" aria="Shoot tongue" className="action eat" />
        <PadButton input={input} action="jump" label="JUMP" aria="Jump" className="action jump" />
      </div>
    </div>
  )
}
