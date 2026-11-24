# Hungry Hopper

A game made by the Kunzler family. You are a frog. Hop, aim, and eat.

## ▶ Play it now: https://jwkunz.github.io/hungry_hopper/

**Current version: 2.1.0** (React edition). See [PLAN.md](PLAN.md) for the roadmap. The original vanilla-JS game is
version 1.0.0 and lives on in git as the `v1.0.0` tag.

## Controls

| Key | Action |
| --- | --- |
| ← / → (or ◀ ▶ buttons) | Walk left / right |
| F (or JUMP) | Jump — hold for a higher jump |
| Space (or TONGUE) | Shoot tongue (eat) |
| ↑ / ↓ (or ▲ ▼ buttons) | Aim the tongue up / down |

The on-screen buttons are always shown so the game works on touch devices
(it is intended to be embedded in an Android app).

## Getting started

Requires Node.js 18+.

All web content lives in `web/`:

```bash
cd web
npm install
npm run dev      # dev server with hot reload (http://localhost:5173)
npm test         # unit tests (collision, level jumpability)
npm run build    # build the single-file distributable
```

## Distributable build

`npm run build` runs `scripts/build-single.mjs`, which uses Vite plus
`vite-plugin-singlefile` to produce **one self-contained HTML file**:

```
web/dist/hungry_hopper-v<version>.html
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
PLAN.md                  Game vision, mechanics and milestone roadmap
.github/workflows/       Builds + deploys to GitHub Pages on push to main
web/                     All web content
  index.html             Vite entry
  vite.config.js         React + single-file plugin, injects __APP_VERSION__
  scripts/build-single.mjs  Deployment build script
  test/                  node:test unit tests
  src/
    main.jsx, App.jsx, styles.css
    components/
      GameCanvas.jsx     Scaled 16:9 canvas, game loop, keyboard wiring
      TouchControls.jsx  On-screen buttons (Pointer Events)
    game/                Framework-free game core (no React in here)
      config.js          Tunable constants
      engine.js          Game class: fixed-step update, camera, draw
      frog.js            Frog: movement/jump/tongue state machine
      collision.js       AABB vs solids and one-way platforms
      level.js           Level 1 data (ground, leaves, puddles)
      render.js          Placeholder background/world drawing
      sprite.js, physics.js, input.js
    assets/              sprites (frog in use; creatures, sounds, music not yet)
```

### Architecture notes

React renders the page chrome and owns the canvas and animation loop; the game
itself is plain JavaScript classes in `web/src/game/` so it stays easy to test
and reason about. The game draws in a fixed 960×540 logical view that is scaled
to fit any screen. Each frame `GameCanvas` calls `game.update(dt_ms, input)`
(which runs a fixed 120 Hz physics step) then `game.draw(ctx)`. Keyboard and
touch buttons both write to the same `input` object. Game state lives in the `Game` object, not React state, so
60 fps updates don't cause re-renders.

### Assets

Sprites are imported from JS (`import img from '.../frog.png'`) so Vite
inlines them. The sound and music `.wav` files total about 9 MB; they are
kept in `src/assets` but deliberately not imported yet, so they don't bloat the
single-file build. Import them when the audio code is added (consider
compressing to `.ogg`/`.mp3` first).

## Changelog

### 2.1.0
- Added `PLAN.md` (vision + roadmap) and moved all web content into `web/`.
- Scrolling swamp level: ground, pits, one-way leaf platforms, puddles, parallax.
- Platformer physics: variable-height jump, coyote time, jump buffering, fixed timestep.
- Always-visible on-screen touch buttons; scaled 16:9 view for phones/tablets.
- Falling into a pit respawns the frog. Added unit tests (CI runs them).

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
