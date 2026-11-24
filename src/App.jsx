import GameCanvas from './components/GameCanvas.jsx'

export default function App() {
  return (
    <main className="app">
      <header className="hud">
        <h1>Hungry Hopper</h1>
        <span className="version">v{__APP_VERSION__}</span>
      </header>
      <GameCanvas />
      <footer className="controls">
        <b>←/→</b> move · <b>↑/↓</b> aim tongue · <b>F</b> jump · <b>Space</b> eat
      </footer>
    </main>
  )
}
