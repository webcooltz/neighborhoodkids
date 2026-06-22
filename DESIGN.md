# Neighborhood Kids – Game Design Document

## Overview

Browser-based 3D minigame anthology. Each level stars a different kid from the neighborhood. Built with Three.js (CDN, no build step). Single `index.html` per level, or a shared shell with level modules — TBD.

**Stack:** Three.js r160, Web Audio API, vanilla JS, no frameworks.

---

## Shared Architecture (from Level 1)

- `World` class — builds environment (ground, house, fence, clouds, trees, flowers)
- `Player` class — block-person with walking/kick animation, WASD + camera-relative movement
- Camera — orbit cam, right-drag rotates, smooth lerp follow
- Intro screen → gameplay → win screen flow
- HUD badges top-right, progress HUD top-center, instructions bottom-left
- Web Audio API for all sound (oscillators + noise buffers, no audio files)

When adding levels, reuse `World`, `Player`, camera, and the intro/win screen HTML pattern.

---

## Levels

### Level 1 — Dawson 🟡 IN PROGRESS

- **Kid:** Dawson, 9yo boy, blonde hair, blue shirt
- **Activity:** Soccer in the front yard
- **Mechanic:**
  1. Dribble ball through 5 rings **in order** (ring types: standard, low, narrow, angled, moving)
  2. After all 5 rings done, goal activates → kick ball into net
- **Controls:** WASD move, Shift sprint, Space jump, hold LMB near ball to charge kick, release to shoot, R resets ball
- **Win condition:** Ball crosses goal mouth plane (x = -7.5), within z/y bounds, after all rings done
- **HUD:** Ring progress pips + goal pip top-center; kick count + speed top-right

---

### Level 2 — Marshall, 13yo boy, Guitar Hero

- **Activity:** Plays violin (visually), Guitar Hero-style note highway
- **Setting:** Bedroom or garage interior. Can reuse/simplify World, or build a simple room.
- **Mechanic:**
  - Scrolling note lane (3–5 lanes) comes toward camera from top of screen (or 3D lane tilted toward player)
  - Notes are colored boxes; player hits corresponding keys (A S D J K or similar) when note reaches hit zone at bottom
  - Perfect / Good / Miss feedback per note
  - Song ends → win screen with accuracy %
- **Visual:** 3D note highway in the scene, Marshall character stands to side with a violin/guitar mesh doing a strum animation on each hit
- **Audio:** Each lane plays a different synth tone (Web Audio oscillator, musical notes). Build a simple 8–16 bar "song" as an array of `{lane, time}` events. On hit: correct note tone. On miss: short buzz.
- **Win condition:** Reach end of song with accuracy ≥ 60% (tunable)
- **HUD:** Score, combo multiplier, accuracy %

---

### Level 3 — Brady, 11yo boy, Skateboarding

- **Activity:** Skateboards down the street doing tricks
- **Setting:** Straight street/path that scrolls (or camera moves forward), obstacles and ramps along route
- **Mechanic:**
  - Auto-scrolling runner: Brady skates forward automatically
  - Player steers left/right (A/D), jumps (Space), and inputs trick combos on ramps/rails
  - Trick system: hold a direction + press trick key (e.g. Space = ollie, Space+W = kickflip, Space+A/D = heelflip). Show trick name popup.
  - Ramps let Brady go airborne for trick window
  - Obstacles (cones, cars, cracks) must be avoided or jumped
- **Visual:** Brady on a skateboard mesh (simple box deck + cylinder wheels), leans on turns, spins on tricks
- **Audio:** Wheel roll sound (noise buffer, pitch tied to speed), trick landing thud, crowd cheer on combo
- **Win condition:** Reach end of street / reach score threshold
- **HUD:** Score top-center, combo multiplier, trick name flash

---

### Level 4 — Brooklynn, 14yo girl, Drawing

- **Activity:** Traces a picture to a target accuracy to finish the level
- **Setting:** 2D overlay or flat canvas in 3D scene (e.g. Brooklynn sits at a desk, drawing tablet in front)
- **Mechanic:**
  - A faint "ghost" outline of a simple shape is displayed (star, house, cat, etc.)
  - Player holds LMB and draws over the ghost line with mouse/touch
  - As player draws, compute overlap % between drawn path and ghost path (sample ghost path as point set, check drawn path coverage within tolerance radius ~8–12px)
  - Progress bar fills as accuracy improves
  - Player can lift and re-draw sections; only best coverage counts
- **Visual:** Brooklynn character visible to side. Drawing surface is a flat plane mesh or HTML canvas element overlaid.
- **Audio:** Pencil scratch sound (short noise burst on mouse move), success chime
- **Win condition:** Coverage ≥ 85% of ghost outline
- **HUD:** Accuracy % large center-bottom, "keep tracing!" hint

---

### Level 5 — TJ, 10yo boy, Spiderman

- **Activity:** Transforms into Spiderman and webs up neighborhood bullies
- **Setting:** Same neighborhood yard / street, bullies are blocky enemy characters roaming the yard
- **Mechanic:**
  - TJ auto-transforms at level start (quick animation: spin + costume change to red/blue)
  - Player aims with mouse, clicks to shoot web at bully
  - Web projectile flies in arc toward click point; on hit, bully gets wrapped in white web mesh and frozen
  - Web up all N bullies (3–5) to win
  - Optional: bullies move/flee slowly, player can use Space to jump + web from air for style bonus
- **Visual:** TJ mesh swaps to red/blue Spidey colors. Web = thin white cylinder between TJ's hand and target. Webbed bully = wrapped in white sphere/cocoon mesh.
- **Audio:** Web-shoot "thwip" (short high-pitched synth), bully "oof" on hit, victory fanfare
- **Win condition:** All bullies webbed
- **HUD:** Bully counter "X / N webbed", web ammo (unlimited or limited + auto-regen)

---

### Level 6 — Mackayla, 14yo girl, Karate

- **Activity:** Chops boards in karate class
- **Setting:** Dojo interior (simple room: wooden floor, plain walls, maybe a banner)
- **Mechanic:**
  - Boards are presented one at a time on a stand (simple box mesh)
  - Hit-zone indicator (glowing line or shrinking ring) appears on the board
  - Player presses Space (or LMB) at the right moment when indicator aligns with sweet spot → board cracks/shatters
  - Timing window: Perfect (center) = full break + bonus; Good (near center) = break; Miss = board doesn't break, lose a life
  - N boards per level (e.g. 6), increasing speed each round
- **Visual:** Mackayla character raises hand, chop animation on input. Board splits into 2 pieces that fall to floor (simple physics: two half-boxes fly apart).
- **Audio:** Crack/snap sound on break (filtered noise burst), Ki-ya voice synth on perfect, crowd cheer
- **Win condition:** Chop all N boards without running out of lives (3 lives)
- **HUD:** Board count, lives, timing feedback popup (PERFECT / GOOD / MISS)

---

### Level 7 — Wyatt, 12yo boy, Fishing

- **Activity:** Catches fish with a fishing minigame
- **Setting:** Lakeside or backyard pond. Simple water plane (animated sine waves on vertex shader or simple blue plane), dock or shore, Wyatt holding a rod.
- **Mechanic:**
  1. Press Space to cast line (power meter: hold Space, release = cast distance)
  2. Wait (random 2–5s) for a fish to bite → visual bobber dip + audio cue
  3. **Catch phase:** A horizontal slider appears with a moving needle. A "sweet spot" (green zone) is shown. Press Space when needle is inside sweet spot → catch. Miss = fish escapes.
  4. Catch N fish to win (e.g. 5)
- **Visual:** Fishing rod mesh (cylinder), line (thin cylinder from rod tip to bobber), bobber (small sphere on water). Fish mesh briefly visible when caught (jumps out of water).
- **Audio:** Cast whoosh, water splash, bobber dip blip, reel click on press, happy tune on catch, "got away" sad trombone synth on miss
- **Win condition:** Catch N fish
- **HUD:** Fish count, slider/sweet-spot UI full-width bottom-center during catch phase

---

### Level 8 — Sawyer, 7yo girl, Unicorn Flight

- **Activity:** Flies a unicorn to collect powerups and finish the level before time runs out
- **Setting:** Sky scene — blue sky background, clouds at various heights, floating platforms/rings
- **Mechanic:**
  - Side-scrolling or free-flight: camera locks to side-view OR follows unicorn in 3D free-flight (free-flight preferred for 3D consistency)
  - Player controls unicorn with WASD (up/down/left/right in air), Space for speed boost (limited)
  - Collect star/gem powerups scattered in air (sphere meshes, spin + pulse)
  - Avoid obstacles: birds, thunderclouds, floating rocks
  - Timer counts down from 90s; collecting powerups adds +5s each
  - Reach finish ring before timer hits 0
- **Visual:** Unicorn mesh — horse body (boxes), mane (colored planes), horn (cone on head), wings (flat planes that flap). Sawyer character sits on top. Rainbow particle trail when boosting.
- **Audio:** Wind whoosh ambience, sparkle sound on powerup collect, collision thud on obstacle hit (brief stun), countdown beeps last 10s, victory fanfare
- **Win condition:** Cross finish ring before time runs out
- **HUD:** Timer large center-top (red when <15s), powerup count, boost meter

---

## Level Select / Hub (Future)

- Main menu shows all 8 kids as clickable cards in a neighborhood panorama
- Cards unlock sequentially (or all unlocked)
- Each card shows kid name, activity icon, and best time/score

---

## Shared UI Patterns (copy from Level 1)

```
Intro screen:  dark overlay → level tag + character name → description → PLAY button
Win screen:    dark overlay → emoji + title → stats (time, score) → Play Again / Next Level
HUD badges:    top-right, rgba black pills, white text
Progress HUD:  top-center, contextual to level mechanic
Instructions:  bottom-left, rgba white text
```

## Audio Conventions

All audio via Web Audio API (no external files):
- Oscillators for tones/music
- `createBuffer` white noise for impacts/scratches
- `gainNode` envelope: attack → exponentialRampToValueAtTime decay
- Resume `audioCtx` on first user gesture

## Performance Targets

- 60fps on mid-range laptop
- No texture files (all MeshLambertMaterial with flat colors)
- Shadow map 2048×2048, one directional light + ambient
- Geometry: low-poly boxes/spheres/cylinders only
