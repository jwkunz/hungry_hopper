# Hungry Hopper: how to play

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

The on-screen buttons work on touch devices; the Android app is the same page in a WebView.


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


## Tongue tricks and power-ups (M7)

- **Grapple:** glowing knobs on vines (over both pits) are grapple anchors. Aim and shoot your tongue at one: it reels you in and you hang there. Press **JUMP** to fling yourself off (hold ◀/▶ to pick the direction), or ▼ to let go. You drop on your own after about 2.4 s.
- **Dragonfly (glide):** eat or touch it, then **hold JUMP while falling** to glide down slowly and steer a little faster. About 9 s.
- **Pepper (fire tongue):** eat or touch it for about 9 s of a burning tongue. It burns through beetle shells and the crane, and torches the briar sections around the one you hit.
- **Combo:** kills (tongue, stomp or fire) within about 3 s of the last one chain: x2, x3 ... up to x5 points. Getting hurt breaks the chain.
- **Bridge log (puzzle):** the wide pit before the second checkpoint is too far to jump. A light log is wedged on the far bank with its near end drooping into the pit. Stand at the edge, aim down at the end of the log (it has a pulsing ring) and shoot: the log slides across and settles as a bridge. Dying before the next checkpoint resets the puzzle.
- **Dark areas and the glow bug:** the stretch after the third checkpoint is dark; you only see a small circle around you plus anything glowing (fireflies, pickups). Eat or touch a **glow bug** to light up a big radius for about 15 s (it fades out at the end). A fire tongue also lights its tip.
- Power-up timers and the combo show on the right of the HUD.


## The Fly Boss

The end of level 1 is a boss arena (a puddle plus four leaf platforms). Cross the arena line and the door shuts behind you, the camera locks and the Fly Boss wakes up.

- **Win:** tongue its glowing red eye **three times**. It blinks and is invulnerable for 2 s after each hit; hitting the body with the tongue does nothing.
- **It flies erratically** between random points and sometimes swoops low near you. That is your chance: from the ground the tongue only reaches its eye on a low swoop, so hop onto a leaf to reach higher.
- **Dive:** it shudders for a moment (warning), then lunges at you at high speed. Duck into the puddle (underwater, you are hidden) or jump.
- **Minions:** it calls mosquitos (1, then 2, then 3 at a time). Eat or stomp them.
- Each hit makes it faster and its dives more frequent. Touching its body kills you; dying restarts the fight at full health. The goal flag only counts once the boss is beaten.


## Levels (M8)

Five areas, each unlocked by finishing the one before. Pick any unlocked one from **LEVELS** on the title
screen (or *Level select* in the pause menu). Progress and best scores are saved in the browser.

| # | Area | Flavour | Boss |
|---|------|---------|------|
| 1 | Mossy Marsh | reeds, fireflies, glow bug cave | The Fly Boss |
| 2 | Bog | drifting spores | The Bog Fly (spits mud, eat it out of the air) |
| 3 | Cypress Forest | tall trunks, long log bridge | The Forest Fly (calls extra minions) |
| 4 | Night Storm | rain, lightning, dark stretches | The Storm Fly (telegraphed lightning strikes) |
| 5 | The Hive | honeycomb, sticky honey | The Hive Queen (all of the above, 4 hits) |

Every level hides **golden flies** (★). Touch or tongue one for 1000 points; finding them all fills the stars on the select screen.
Settings has a **Low-power graphics** switch; it also turns on by itself if the game runs slowly.

