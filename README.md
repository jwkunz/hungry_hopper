# Hungry Hopper

A game made by the Kunzler family. You are a frog. Hop, aim, and eat.

## ▶ Play it now: https://jwkunz.github.io/hungry_hopper/

**Current version: 2.0.0** (React edition). The original vanilla-JS game is
version 1.0.0 and lives on in git as the `v1.0.0` tag.

## Controls

| Key | Action |
| --- | --- |
| ← / → | Walk left / right |
| ↑ / ↓ | Aim the tongue up / down |
| F | Jump |
| Space | Shoot tongue (eat) |

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev      # dev server with hot reload (http://localhost:5173)
npm run build    # build the single-file distributable
```

## Distributable build

`npm run build` runs `scripts/build-single.mjs`, which uses Vite plus
`vite-plugin-singlefile` to produce **one self-contained HTML file**:

```
dist/hungry_hopper-v<version>.html
```

All JavaScript, CSS and sprite images are inlined, so the file can be opened
straight from disk, emailed, or uploaded to any static host. Nothing else
needs to be shipped. Only assets that are `import`ed by the code are bundled
(see *Assets* below).

## Deployment (GitHub Pages)

`.github/workflows/pages.yml` runs on every push to `main` (and manually via
*Actions → Run workflow*). It installs dependencies, runs `npm run build`, and
publishes the single HTML file as `index.html` on GitHub Pages. One-time setup:
in the repo go to **Settings → Pages → Build and deployment → Source** and choose
**GitHub Actions**. The live site is at <https://jwkunz.github.io/hungry_hopper/>.

## Project layout

```
index.html               Vite entry
vite.config.js           React + single-file plugin, injects __APP_VERSION__
scripts/build-single.mjs Deployment build script
src/
  main.jsx, App.jsx      React entry and top-level layout
  styles.css
  components/
    GameCanvas.jsx       Owns the <canvas>, rAF loop, resize, keyboard wiring
  game/                  Framework-free game core (no React in here)
    config.js            Tunable constants (was the global `GM` in v1)
    engine.js            Game class: state, update(dt, input), draw(ctx)
    frog.js              Frog state machine, sprite masks, tongue placement
    sprite.js            Sprite + SpriteMask (sprite-sheet drawing)
    physics.js           2D point-mass integrator with drag and gravity
    input.js             Keyboard -> abstract input mapping
  assets/
    sprites/frog         frog, tongue, crosshairs sheets (in use)
    sprites/creatures    mosquito sheet, beetle boss (not used yet)
    sounds, music        .wav files (not used yet)
```

### Architecture notes

React renders the page chrome and owns the canvas and animation loop; the game
itself is plain JavaScript classes in `src/game/` so it stays easy to test and
reason about. Each frame `GameCanvas` calls `game.update(dt_ms, input)` then
`game.draw(ctx)`. Game state lives in the `Game` object, not React state, so
60 fps updates don't cause re-renders.

### Assets

Sprites are imported from JS (`import img from '.../frog.png'`) so Vite
inlines them. The sound and music `.wav` files total about 9 MB; they are
kept in `src/assets` but deliberately not imported yet, so they don't bloat the
single-file build. Import them when the audio code is added (consider
compressing to `.ogg`/`.mp3` first).

## Changelog

### 2.0.0
- Rewrote the project in React (Vite). Game core split into `src/game/`.
- Added `npm run build` single-file HTML build.
- Fixed: stray duplicate `game_state_init` symbol; mismatched
  `state_eat`/`state_eating` names; huge first-frame time step (dt is now
  clamped); leaked globals; the left-facing tongue frame 3 used the wrong
  sprite row; the frog faced left whenever it stood still; frog could walk
  off-screen.
- Tongue animation is now a data-driven frame sequence instead of 12 `case`s.

### 1.0.0
- Original vanilla JS prototype: walking, jumping, tongue aiming and eating.
