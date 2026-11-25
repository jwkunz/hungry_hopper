# Hungry Hopper — Game Plan

Living design + roadmap document. Update the checkboxes as milestones land.

## Vision

A Super-Mario-style **side-scrolling platformer** set in a **swamp**. You are a
frog. You move left/right, jump, and use your **tongue** to eat enemies, break
through briars and (later) grab and swing from things. You can also **stomp**
enemies by landing on them. Touching an enemy any other way kills you
instantly. The game ends at a **Fly Boss** (Bowser-like) that is erratic and
hard to hit: tongue it in the **eyes three times** to win. The boss is
defended by **mosquito minions**.

### Pillars
1. **The tongue is the star.** Attack, tool, and (later) traversal.
2. **Fair, instant, fast.** One hit kills; respawns are immediate, checkpoints are generous.
3. **Swamp personality.** Puddles, big leaves, briars, mist, fireflies.
4. **Touch-first.** Everything must be playable with on-screen buttons (the game
   will be embedded in an Android app); keyboard is a convenience.

## Controls

| Action | Keyboard | On-screen button |
| --- | --- | --- |
| Move | ← / → | ◀ / ▶ |
| Jump (hold = higher) | F | JUMP |
| Tongue | Space | TONGUE |
| Aim tongue | ↑ / ↓ | ▲ / ▼ |

All input flows through one abstract `input` object (`src/game/input.js`);
keyboard and touch buttons both just set flags on it.

## Technical decisions

- **Project layout:** all web content lives in `web/` (Vite + React). Repo root
  holds docs, CI and `.github`.
- **Game core is framework-free** (`web/src/game/`); React owns the canvas, loop
  and UI chrome. Game state lives in classes, not React state.
- **Fixed logical view** of 960×540 world units, uniformly scaled to fit any
  screen (letterboxed). Rendering is DPR-aware. The same level looks the same
  on a phone, a tablet and a desktop.
- **Fixed 120 Hz physics step** with accumulator; collision is AABB vs. solid
  rects and one-way platforms (leaves).
- **Single-file deploy:** `npm run build` → one HTML with everything inlined;
  GitHub Pages serves it. For Android, load that file in a `WebView`
  (`file:///android_asset/…` or `WebViewAssetLoader`), landscape, immersive.
- **Android/WebView notes:** no hover; use Pointer Events (done); unlock audio
  on first touch; avoid `alert/confirm`; respect safe-area insets; keep the
  bundle small (compress music to ogg/mp3 before importing it).
- **Tests:** `npm test` (node:test) covers pure logic — collision and level
  reachability (every gap/leaf must be jumpable with the current physics).

## Milestones

### M1 — Scrolling world *(2.1.0)*
- [x] Move web content to `web/`
- [x] Fixed-resolution scaled canvas, camera following the frog
- [x] Ground segments, gaps, one-way leaf platforms, decorative puddles
- [x] Platformer physics: variable-height jump, coyote time, jump buffer
- [x] On-screen touch buttons + keyboard, via one input object
- [x] Fall into a gap → respawn
- [x] Tests for collision and level jumpability

### M2 — Enemies, tongue & stomp *(2.2.0)*
- [x] Entity base class + AABB overlap tests
- [x] Tongue hitbox that follows the tongue animation/aim → eat on hit (tongue retracts early on a hit)
- [x] **Tongue works in the air** as well as on the ground
- [x] First enemy: **mosquito** (hover/patrol, flaps, flips to face its direction)
- [x] Stomp detection (land on top ⇒ kill + bounce, higher if jump is held)
- [x] **Health model: one hit kills; a shield power-up absorbs one hit** (see below)
- [x] Firefly pickup grants the shield (touch it or tongue it); 1.5 s invulnerability after it pops
- [x] Death hop → respawn; score + popups + HUD (eat = 200, stomp = 100, pickup = 50)
- [x] `?debug` URL flag draws hitboxes and the tongue segment

### M3 — Game flow *(2.3.0)*
- [x] States: title → play → dying → game over / level complete → title (tap or JUMP/TONGUE to continue)
- [x] 3 lives; death respawns at the last checkpoint (lily-pad flags); cleared enemies behind it stay cleared
- [x] Level goal flag, life bonus (500 per life left)
- [x] Sound effects and looping music (Web Audio, unlocked on first tap/key), mute button + `M`
- [x] Local high score (localStorage)
- [x] Audio shipped as small MP3s (`tools/convert_audio.sh`; WAV originals kept in `audio_source/`)
- [x] Game-flow unit tests (title, lives, checkpoints, goal, shield)
- [ ] Pause button (still to do)

### M4 — Environment *(2.4.0)*
- [x] **Ponds**: swim (jump = kick up; head out of water = hop out), hidden from enemies when fully submerged, 7 s of air then you drown; air bar HUD, bubbles
- [x] Leaves dip a few pixels under the frog and spring back
- [x] Mud patches slow walking and shave the jump
- [x] **Briars**: lethal on touch (a shield absorbs it); the tongue cuts them — low patches take 1 lick, tall walls take 3 and shrink each time (hoppable after the second)
- [x] Tongue now hits the nearest thing first, so a briar shields what is behind it
- [x] Parallax, drifting mist, ambient fireflies; level now written in heights above the ground
- [ ] Sinking lily pads / tide timers (stretch)

### M5 — Bestiary
Mole (pops from ground) · bat (swoops, hangs) · centipede (walls/ceilings) ·
beetle (armoured: belly-tongue or stomp) · pill bug (rolls) · more mosquitos
(stinger wind-up/strike) · other swamp creatures.

### M6 — Fly Boss
- [ ] Large erratic flyer, two glowing eyes as weak points
- [ ] 3 eye hits to kill, behaviour changes after each hit (speed, minion waves, hazards)
- [ ] Mosquito minion spawns; arena with leaves + puddles

### M7 — Tongue traversal & power-ups
- [ ] Grapple/swing from branches; pull light objects; spit captured enemies
- [ ] Eat-to-power-up: glow fly (light), dragonfly (glide), pepper (fire), shield firefly
- [ ] Combo multiplier (tongue → stomp → tongue)

### M8 — Content & polish
- [ ] Multiple levels / areas (marsh, bog, cypress forest, night storm, hive)
- [ ] Mini-bosses, secrets, level select
- [ ] Android wrapper project, performance pass on low-end devices

## Decisions
- **Tongue works while airborne** (decided; implemented in M2). While the tongue
  is out on the ground the frog is planted; in the air you keep steering.
- **One health.** Any non-stomp contact with an enemy kills the frog instantly,
  *unless* it holds a **shield** (from eating/touching a glowing firefly). The
  shield absorbs exactly one hit, then gives a short invulnerability window.
  Shield does not stack. Hazards that should ignore the shield (e.g. pits) are
  always lethal; briars (M4) should respect it.

## Open questions
- Level format: hand-coded for now; move to JSON/tiled map once M5 starts?
