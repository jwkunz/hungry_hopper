# Hungry Hopper

A game made by the Kunzler family. You are a frog. Hop, aim, and eat.

## ▶ Play it now: https://jwkunz.github.io/hungry_hopper/

**Current version: 2.6.5** (React edition). See [PLAN.md](PLAN.md) for the roadmap. The original vanilla-JS game is
version 1.0.0 and lives on in git as the `v1.0.0` tag.

## Controls

| Key | Action |
| --- | --- |
| ← / → (or ◀ ▶ buttons) | Walk left / right |
| F (or JUMP) | Jump — hold for a higher jump |
| Space (or TONGUE) | Shoot tongue — on the ground or in mid-air |
| ↑ / ↓ (or ▲ ▼ buttons) | Aim the tongue up / down |

**Rules:** eat enemies with the tongue, or land on top of them to stomp. Any
other contact kills you instantly — unless you hold a **shield** from a glowing
firefly, which absorbs one hit. Falling into a pit is always fatal. **Ponds** can be swum (JUMP kicks you up; with your head out it hops you onto land) and hide you from enemies — but you only have a few seconds of air. **Briars** kill on touch; cut them with the tongue — each shot removes just the one section it touches (thorn walls are one section thick, so one shot at ground level opens a frog-sized gap; aim higher to open a different spot). Mud slows you down; leaves sink a little under your weight. You have 3 lives and respawn at the last
checkpoint flag; reach the red flag at the end to win. Tap the speaker button (or
press **M**) to mute. Add `?debug` to the URL to see hitboxes.

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
tools/                   Asset scripts: make_mosquito_atlas.py, convert_audio.sh
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
      frog.js            Frog: movement, jump, tongue, shield, death
      entities.js        Mosquito, Firefly, Briar
      collision.js       World collision + tongue/stomp/overlap tests
      level.js           Level 1 data (ground, ponds, leaves, mud, briars, enemies)
      render.js          Placeholder world art, HUD, debug overlay
      audio.js           Web Audio sfx + music, mute
      storage.js         High-score persistence
      sprite.js, physics.js, input.js
    assets/              sprites, audio/ (MP3s in use), audio_source/ (original WAVs)
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
inlines them. Sounds and music live in `src/assets/audio` as small MP3s
(generated from the original WAVs in `audio_source/` by `tools/convert_audio.sh`)
so the single-file build stays around 2.7 MB.

## Bestiary

| Creature | Behaviour | How to beat it |
|---|---|---|
| Mosquito | Patrols; dives at you faster the closer it gets | Tongue it or stomp it |
| Bat | Hangs in place. Turns toward you, opens its mouth (warning), then shrieks one way: a short blast in front of its mouth and one sonic shockwave along the ground | Hop over the shockwave, stand on a leaf, hide underwater, use a shield, or tongue/stomp the bat |
| Owl | Dozes; eyes flare (warning), then a fast straight glide | Dodge the glide, then tongue or stomp it |
| Mole | Mound shakes, then pops up briefly | Tongue or stomp it while it is up; harmless when hidden |
| Beetle | Armoured: contact hurts and the tongue bounces off | Stomp to flip it, then tongue the helpless beetle before it rights itself |
| Centipede | Long and low; speeds up when it spots you | Stomp or tongue it (jump early: it is long) |
| Pill bug | Curls up, then rolls at you; rolling bugs cannot be stomped | Tongue it while it rolls, or stomp it when it uncurls |
| Crane | Coils its neck (warning), then stabs along the ground | Tongue-proof; right after a stab its beak is stuck: tongue its head to eat it |

Creature art is drawn in code (`web/src/game/bestiary.js`); placements are in `level.js` (`bestiary`).

## Changelog

### 2.6.5
- Briar thickets are now one section thick (was three): one tongue shot at ground level opens a frog-sized gap in a thorn wall.

### 2.6.4
- Bat shriek is smaller and one-directional: it faces you, the close-range blast only reaches ~60 px in front of its mouth, and a single shockwave travels toward you (shorter lifetime, 1.5 s).

### 2.6.3
- Bats no longer fly: they hang in place and emit a sonic shriek that hurts (close-range blast + two ground shockwaves you can jump over). They warn first with an open mouth.

### 2.6.2
- Level 1 is less crowded: 5 mosquitos (was 8) and 11 bestiary creatures (was 17): 2 bats, 2 moles, 2 beetles, 2 centipedes, 2 pill bugs, 1 owl, 1 crane.

### 2.6.1
- Balance: bat swoops take ~1.5 s (was ~1 s) and bats fly home slower; mosquitos are slower (patrol 50, chase `chase_k` 24000 capped at 160 px/s, return 80).

### 2.6.0 (M5: bestiary)
- New creatures: bat, mole, beetle, centipede, pill bug, owl and crane (see the Bestiary table), placed through level 1.
- Engine hooks: `harmless` (no contact), `deflects` (tongue bounces off armour) and `onStomp()` (custom stomp reaction).

### 2.5.1
- Fix: respawning on a briar (or under a mosquito) and dying repeatedly. Checkpoint 2 sat inside a thicket. Now a safe zone is cleared around every respawn point (`spawn_clear_behind/ahead`) and you get 1.5 s of invulnerability after a death (`spawn_invuln_ms`).

### 2.5.0
- Pause and settings menu: ⏸ button (top right) or Esc / P pauses and freezes the game and audio. The game also auto-pauses when the tab or app goes to the background. The ⚙ button on the title screen opens the same panel.
- Settings (saved in localStorage): music volume, effects volume, mute, and show/hide on-screen buttons. While paused: Resume, Restart run, Quit to title.

### 2.4.6
- Touch controls: the tongue aim ▲/▼ buttons now sit next to the ◀/▶ movement buttons (left cluster); TONGUE and JUMP stay on the right.

### 2.4.5
- Mosquitos are aggressive: within `aggro_range` (480) they dive at you with speed = `chase_k` / distance (so they swoop faster the closer they get; clamped between `chase_min_speed` and `chase_max_speed`). They flap faster while chasing, lose interest if you hide underwater or die, and drift back to their patrol spot. Tune in `config.js`.

### 2.4.4
- Fixed a stray pink piece of tongue floating off the frog while jumping: the tucked-away tongue frame is no longer drawn (the tongue only draws while it is out). Added a draw test.

### 2.4.3
- Briars are now made of sections. A tongue shot cuts only the section it touches (the nearest one), instead of shrinking the whole thicket. Thorn walls are 3 sections thick and 6 tall, so a frog-sized tunnel at ground level takes three shots; the rest of the wall stays. Cut sections crumble away; 10 points each.

### 2.4.2
- Walk animation: the frog squashes and bobs in time with the distance it walks (faster = bigger bounce), and breathes a little when idle. Purely visual — the hitbox doesn't change. The frog sheet has no walk frames, so this is done in code (see `walk_*` in `config.js`).

### 2.4.1
- Tongue aim range widened: up to 60° above and 35° below horizontal (faster sweep), so you can reach bugs overhead.
- The tongue's hit line is now derived from the drawn sprite, so it is exact at any angle.
- Eaten enemies and fireflies are grabbed by the tongue tip, reeled in, shrink into the mouth and are swallowed (grab sound, then gulp).

### 2.4.0
- Ponds: swimming, hiding underwater, air meter and drowning, bubbles.
- Briars cut with the tongue (3-lick walls shrink as you cut them); mud slows; leaves dip.
- Mist and ambient fireflies; nearest-thing-first tongue targeting.
- Level heights are now relative to the ground; more tests (water, briars, leaves, mud).

### 2.3.0
- Title, game-over and level-complete screens; 3 lives; checkpoints; level goal with life bonus.
- Sound effects and music (compressed to MP3), mute button / `M` key.
- High score saved locally. Test harness can now import the whole game core.

### 2.2.0
- Tongue now works in mid-air; its hit area follows the animation and aim angle.
- Mosquito enemies (patrol/hover). Eat them with the tongue (+200) or stomp them (+100).
- One-hit death; firefly pickups grant a one-hit shield. Death hop and respawn.
- Score, floating popups, HUD; `?debug` hitbox overlay.
- More tests (tongue/stomp geometry, entity placement).

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
