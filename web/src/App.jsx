import GameCanvas from './components/GameCanvas.jsx'

export default function App() {
  return (
    <main className="app">
      <GameCanvas />
      <span className="version">Hungry Hopper v{__APP_VERSION__}</span>
    </main>
  )
}
