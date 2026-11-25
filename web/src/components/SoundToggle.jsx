import { useEffect, useState } from 'react'
import { audio } from '../game/audio.js'

// Mute / unmute button (top-left of the playfield). Shortcut: M.
export default function SoundToggle() {
  const [muted, setMuted] = useState(audio.muted)
  useEffect(() => audio.onMuteChange(setMuted), [])
  return (
    <button
      type="button"
      className="sound"
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      onPointerDown={(e) => {
        e.preventDefault()
        audio.unlock()
        audio.toggleMuted()
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
