import { useEffect, useState } from 'react'
import { audio } from '../game/audio.js'
import { settings } from '../game/settings.js'

function useSettings() {
  const [v, setV] = useState(settings.values)
  useEffect(() => settings.subscribe(setV), [])
  return v
}

function useMuted() {
  const [m, setM] = useState(audio.muted)
  useEffect(() => audio.onMuteChange(setM), [])
  return m
}

// Corner button that opens the pause / settings menu (Esc or P also work).
export function MenuButton({ playing, onOpen }) {
  return (
    <button
      type="button"
      className="menu-btn"
      aria-label={playing ? 'Pause' : 'Settings'}
      onPointerDown={(e) => {
        e.preventDefault()
        audio.unlock()
        onOpen()
      }}
    >
      {playing ? '⏸' : '⚙'}
    </button>
  )
}

// The pause / settings panel. `inRun` = a run is in progress (shows Restart / Quit).
export function MenuPanel({ inRun, onResume, onRestart, onQuit }) {
  const v = useSettings()
  const muted = useMuted()
  return (
    <div className="menu-backdrop" role="dialog" aria-modal="true" aria-label={inRun ? 'Paused' : 'Settings'}>
      <div className="menu">
        <h2>{inRun ? 'Paused' : 'Settings'}</h2>

        <label className="row">
          <span>Music</span>
          <input type="range" min="0" max="1" step="0.05" value={v.music}
            onChange={(e) => settings.set('music', e.target.value)} />
        </label>
        <label className="row">
          <span>Effects</span>
          <input type="range" min="0" max="1" step="0.05" value={v.sfx}
            onChange={(e) => settings.set('sfx', e.target.value)} />
        </label>
        <label className="row check">
          <span>Mute all sound</span>
          <input type="checkbox" checked={muted} onChange={(e) => audio.setMuted(e.target.checked)} />
        </label>
        <label className="row check">
          <span>On-screen buttons</span>
          <input type="checkbox" checked={v.touch} onChange={(e) => settings.set('touch', e.target.checked)} />
        </label>

        <div className="menu-actions">
          <button type="button" className="primary" onClick={onResume}>{inRun ? 'Resume' : 'Close'}</button>
          {inRun && <button type="button" onClick={onRestart}>Restart run</button>}
          {inRun && <button type="button" onClick={onQuit}>Quit to title</button>}
        </div>
        <p className="hint">Esc / P: pause · M: mute</p>
      </div>
    </div>
  )
}
