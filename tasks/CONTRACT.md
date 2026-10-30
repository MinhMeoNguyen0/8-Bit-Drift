# Tiny Drive — shared contract (task 00)

## Current contract and precedence — October 29, 2026

Read [CURRENT_STATE.md](CURRENT_STATE.md) and the root [README](../README.md) for the latest implementation. They supersede conflicting behavior, formulas, defaults, ownership, and test-status claims in the historical sections below. The user's latest instructions remain authoritative.

Current maintenance requirements:

- Edit `dist/index.html` directly; preserve its standalone/static, procedural, two-tone architecture. No runtime dependencies, shipped media assets, external fonts, backend, or application requests.
- Preserve `STEP=1/120`, arena-based world coordinates, one car copy, delayed edge transfer, pointer ownership/release, collision substeps, and bounded/cached rendering layers.
- Use `cameraGeometry` and `visibleBounds` for viewport scaling and world visibility; use `controlZones` for UI placement. Historical integer scale and fixed layout numbers below are obsolete.
- Keep Compact/Drone automatics in D at spawn and Supercar manual in 1. Space brakes; S/Down is reverse throttle only with R selected. Ground cars support burnout/launch; Drone clears cones and does not skid or roll like the old Van.
- Race state is independent of pause/menu mode. Consume start/resume/dismiss/retry gestures and the entire Settings-dismiss gesture. Reset/New race must not leak into immediate driving.
- Preserve the bounded forward rejoin policy, nonrecovering quality budget, quadratic ranking/versioned setup records, centered frozen result, and distinct Try Again/free-drive actions described in CURRENT_STATE.
- Preserve the painted keycap guide, race time/percentage side by side, and speed/gear stacked at the right edge. The fixed course is independent of the overlay zones.
- Run appropriate focused checks and the full regression script; report the known broad-suite stops instead of claiming all tests pass. Browser checks supplement simulation tests.

## Historical contract and integration decisions

Everything below is retained as a record of the original task 00 and stages 1–3, including their then-current ownership and pass counts. References to “wins,” “current,” “base,” and “every agent” below apply to that historical iteration only.

Owner: lead/integrator. Every agent builds against this. If something here blocks you, report it to the lead; do not change the contract on your own.

**Base revision (stage 4):** `tasks/handoffs/base/index.html` and `tasks/handoffs/base/verify.cjs`, identical to `dist/index.html` and `verify.cjs` after the lead integrated stage 3 (task 07 gate and shadows, task 09 skid marks, task 11 rollover and recovery, the "Right the car" button and R key). 91 checks pass.

**§11–§13 list the stage 1–3 decisions. Where they differ from an earlier section, the later section wins.**

---

## 1. Arena, viewport and resize

- **Logical pixels.** The canvas backing store is `W × H` logical pixels. Each logical pixel is an integer number of *device* pixels (`scale`). The canvas element is sized to `W*scale/devicePixelRatio` CSS px, `image-rendering: pixelated`, covering the whole viewport (overflow of less than one logical pixel is clipped).
- **Picking the scale** (task 01 implements it as a pure, exported function):
  `computeView(cssW, cssH, dpr) → {scale, W, H}`, where `devW = cssW*dpr`, `devH = cssH*dpr`, `scale = max(1, round(min(devW, devH) / 250))`, `W = ceil(devW/scale)`, `H = ceil(devH/scale)`. The short side therefore shows about 250 logical px on every device, so the car stays the same size relative to the screen's short side. Agent 1 may tune the 250 constant, but not the formula's shape.
- **World units.** `x` is in logical px. `y` is ground depth: screen `y = world y * K`, `K = 0.66`. `makeArena(W, H) → {W, H, WH: H/K}`. Every physics function reads `w.arena`; never use the `WIDTH/HEIGHT/WORLD_H` globals in new code (they stay only as the 400×240 test default).
- **Fixed camera.** Arena `[0, W) × [0, WH)` is exactly the visible screen. No camera follow.
- **Resize / rotation.** If `W` or `H` changes: `resizeWorld(w, newArena)` scales every object's position proportionally and sets `trackBreak`. Static scenery (ground, parking, gate, cone home positions) is rebuilt from `layoutCourse(newArena)`. **The track layer is cleared** on any arena size change (keeps memory bounded and avoids distortion). A change in `scale` only, with the same `W × H`, keeps tracks. Car speed, heading and state are kept; the car is never reset by a resize.
- **Direct `file://` opening** must keep working. Do not use the Fullscreen API.

## 2. Vehicle definition and bounds

- `PRESETS[id]` is the single vehicle definition. Existing fields stay (`length, width, height, roof, wheelbase, mass, accel, brake, max, reverse, grip, steer, drag`). Agent 3 may add: `trackWidth` (rear-wheel lateral offset), `comHeight`, `rollThreshold`, `sprite: {size, ax, ay}` (raster size and anchor). Other agents read these, never copy the numbers.
- **Screen anchor.** A car at world `(x, y)` has screen anchor `(x, y*K)`. Sprites are drawn so their anchor lands there.
- **`carScreenBounds(p, a, roll=0) → {l, t, r, b}`**: a conservative box in screen px *relative to the anchor*, covering the car sprite **and its shadow** for heading `a` and roll amount `roll` (0 = upright). It is a pure function, usable in Node tests.
  - Agent 3 owns it: when the car grows (08) or gains roll frames (11), update it, and add a check that every rendered sprite and shadow pixel lies inside it (in the browser, or by rasterising in a test).
  - Agent 2 uses it, and only it, to decide "fully offscreen" (05).
- **Wheel points.** `wheelPoints(w)` returns the two rear tyre contact points in screen px. Agent 3 keeps it accurate for the new sizes; Agent 2 consumes it for tracks (09).
- **Gate clearance.** Gate opening (inside width) ≥ `max over presets of (r - l of carScreenBounds at the heading facing through the gate) + 8`, and opening height ≥ `max roof + 6`, measured in screen px.

## 3. Input

- **Physics input** is `{steering, throttle, brake}`: steering in `[-1, 1]` (positive = right / D), throttle and brake in `[0, 1]`. `normalizeInput` clamps it. `step(w, input)` takes this shape; tests use `keysToInput({w,s,a,d})`.
- **Driving rules** (already in `drive()`): brake wins when both are pressed; throttle while moving backwards brakes first; brake while moving forwards brakes first, then reverses. Analog values scale acceleration, braking and steering; 1/0 values behave exactly as before.
- **Input module** (task 03, Agent 1): `createControls()` returning
  - `sample() → {steering, throttle, brake}`: called once per fixed physics step.
  - `releaseAll()`: clears every key and pointer.
  - `visual() → {steering, throttle, brake}`: what the wheel and pedals display; must be derived from the same state as `sample()`.
- **Merging keyboard and touch** (deterministic): `throttle = max(key, touch)`, `brake = max(key, touch)`; `steering = touch wheel value while a pointer owns the wheel, otherwise the keyboard value` (A and D together = 0).
- **Pointer ownership.** Each control (wheel, gas, brake) is owned by at most one pointer ID, with pointer capture. `pointerup`, `pointercancel` or `lostpointercapture` for that ID neutralises only that control; other pointers keep working. A normal pointer release never pauses the game.
- **Release everything** on: window blur, `visibilitychange` to hidden, Escape/pause, opening a menu, orientation change, and teardown. After a menu closes, keys still physically held do not count until pressed again (no stale accelerator).
- `touch-action: none` only on the wheel and pedals.

## 4. Game state

- `mode`: `'running' | 'paused' | 'menu'`, owned by Agent 1. Entering `paused` or `menu` calls `controls.releaseAll()` and sets `world.trackBreak = true`.
- Car state (Agent 3, task 11): `car.state` is `'driving' | 'tipping' | 'rolling' | 'resting' | 'recovering'`. Default `'driving'`; code that predates task 11 can assume it.
- **Recovery API** (Agent 3 provides, Agent 1 shows a button): `canRecover(w) → boolean` and `recover(w)`. Recovery places the car upright at the nearest spot fully inside the arena (its whole `carScreenBounds` box on screen) that is clear of cones and gate posts, outside the edge strip (§5), and not under the controls (§7). It clears held inputs, resets interpolation and sets `trackBreak`.

## 5. Edge transfer (task 05, Agent 2)

Rules for the **car**, using `carScreenBounds` at the current heading and roll, in screen px:

- **Fully offscreen right** when `x + l >= W`. Transfer: `x -= W + (r - l)`, so the car's right edge reappears at `0 + overshoot`, where `overshoot = (x + l) - W` before the move. Mirror the rule for left (`x + r <= 0`), bottom (`y*K + t >= H`) and top (`y*K + b <= 0`); vertical distances are converted to world units by dividing by `K`.
- **Never two copies.** The car is drawn only at its real position. No wrapped copies of the car, its shadow or its tyres, ever.
- **Partial exit then reverse** goes back through the same edge, because nothing happens until the car is fully out.
- **Corners.** Check X, then Y, in the same physics substep. Both may transfer in one step. That counts as one event: one interpolation fix and one `trackBreak`.
- **Interpolation.** On transfer, move `px/py` by the same offset as `x/y`, so the rendered motion stays continuous and never sweeps across the screen.
- **Collisions.** Car-vs-cone and car-vs-post use plain arena coordinates, with no seam wrapping (remove the `delta(…, W)` seam maths). A departing car cannot touch objects on the other side; after transfer it collides at its new position.
- **Edge strip.** No static collider (gate post), parking bay, spawn point or recovery point may sit within `EDGE_CLEAR = 40` logical px of any edge. Cones may be pushed into it. This prevents an occupied entry point that causes repeated transfers or stuck collisions. If a cone does sit at the entry point, normal collision pushes it; the car is not moved.
- **Car offscreen envelope.** Car `x` stays inside `[-(r-l), W + (r-l)]` and screen `y` likewise. Tests replace the old `0 <= x < WIDTH` check with this.
- **Cones** use the same transfer rule with their own small bounds (sprite plus shadow). Agent 2 may choose a simpler rule if documented, but cones must not create duplicate collisions.
- Each transfer increments `w.wraps` (kept for diagnostics and tests) and sets `w.trackBreak = true`.

## 6. Rendering, light and depth

- **Two tones only** on the canvas: `INK [48,52,45]` and `PAPER [191,193,177]`, with ordered (Bayer) dithering for greys. Translucency is only allowed in the DOM UI.
- **Light.** Shadows fall down-right. Shadow offset in screen px = `LIGHT × height`, where `LIGHT = {x: .45, y: .3}` and `height` is the object's top height in world units. Shadows are the object's ground footprint shifted by that offset, filled with dither shade ≈ 0.55, opaque two-tone pixels.
- **Draw order**, back to front:
  1. ground layer (texture, parking lines, course markings): static canvas, rebuilt on arena change;
  2. track layer;
  3. all shadows (car, cones, gate);
  4. depth-sorted drawables: cones, car, gate parts, sorted by `key` = screen y of the object's ground base (ties: lower key first, then car last);
  5. DOM overlays (HUD, wheel, pedals).
- **Drawable interface:** `{key, draw(ctx)}`. The gate supplies its posts and arch as one or more drawables so the car passes "under" it by ordinary depth sorting. If one drawable is not enough for correct overlap, Agent 2 splits the gate into a back and a front part with different keys.

## 7. Course layout (Agent 2) and control zones (Agent 1)

- `layoutCourse(arena) → {cones: [{x, y}], parking: [segments], gate: {x, y, ...}, spawn: {x, y, a}}`: a pure function, in world units. It must respect the edge strip (§5) and keep clear of the control zones.
- **Control zones** (keep-out areas for the course, spawn and recovery), as fractions of the arena in screen px, until Agent 1 publishes exact rects through `controlZones(view)`:
  - wheel: `x 0–0.28 W`, `y 0.40–0.95 H`;
  - pedals: `x 0.76–1.0 W`, `y 0.55–1.0 H`;
  - HUD (car chooser, settings): `x 0.55–1.0 W`, `y 0–0.12 H`;
  - instructions: bottom right, inside the pedal zone's width, under the pedals or merged with them.
- `createWorld(id, arena)` places cones and the car from `layoutCourse(arena)` once task 06 lands.

## 8. Tracks (task 09, Agent 2)

- Tracks are drawn into one track canvas the size of the arena. Each mark is clipped to the arena; no wrapped line segments.
- The renderer starts a new mark segment whenever `w.trackBreak` is true (and clears the flag), and whenever skid recording turns off.
- `trackBreak` is set by: edge transfer, resize, pause/menu, vehicle change, reset, recovery and the start of a roll.

## 9. Tests

- Each agent writes new tests in its own copy of `verify.cjs`. The lead merges them.
- Agent 2 replaces these old tests, keeping what is still valid: "positive modulo preserves overshoot", "edge and angle interpolation use the short path", "tracks split across edges", "car-cone collision across the horizontal seam", "cone collision across vertical seam", and the five-minute bounds check.
- Never weaken a physics test just to make it pass. If a tuning change (task 10) breaks a threshold, say so in the handoff and propose the new value with a reason.

## 10. Work rules (all agents)

- Work only in your folder: `tasks/handoffs/<agent>/index.html` and `tasks/handoffs/<agent>/verify.cjs`, copies of the base. Never edit `dist/index.html`, the root `verify.cjs`, another agent's folder, or `tasks/handoffs/base/`.
- Run your copy's tests with `node tasks/handoffs/<agent>/verify.cjs` (the copy reads the `index.html` next to it).
- One file, inline CSS/JS, code-drawn art; no assets, libraries, fonts or network requests.
- Finish each task with a handoff note at `tasks/handoffs/<agent>/HANDOFF.md`: base revision, changed regions/functions, contract assumptions, tests run with results, known issues, untested items.

## 11. Stage 1 decisions (lead, after integrating stage 1)

**Viewport and input (Agent 1's questions)**
- §1: with integer scales the short side ranges from about 170 to 375 logical px on low-resolution screens (about 214–300 at scale 3 or more). Accepted. Course, HUD and controls must work across that range.
- §7: the fraction-based HUD zone is too small for a portrait phone. In stage 2 Agent 1 exports `controlZones(view) → [{id, l, t, r, b}]` in screen px for the HUD, wheel, pedals and instructions. Agent 2's `keepOuts(A)` switches to it; the fractions in §7 stay only as a fallback.
- §3: orientation change releases all input but does not pause. Accepted.
- §3: a pointer owns at most one control, and a control has a value only while a pointer owns it. Accepted.

**Course and edges (Agent 2's questions)**
- **Gate-post collider:** two static circles in world units, radius `POST_R = 4`, exposed as `layout.gate.posts = [{x, y, r}]`. Collision code (task 10) treats them as immovable. Only the posts collide; the opening is empty.
- **Transfer hysteresis:** "fully offscreen" uses a margin `TRANSFER_MARGIN = 2` screen px. Right exit happens when `x + l >= W + 2`; mirror the rule for the other edges. Placement is unchanged: the car's right edge reappears at `overshoot`, which is now always at least 2.
- **Wrap counting:** `w.wraps` increments once per transfer event; a corner that moves both axes in one substep is one event.
- **EDGE_CLEAR** is in screen px on all four sides. It becomes `EDGE_CLEAR = clamp(round(0.12 × short side), 24, 40)` for cones, parking, the gate posts and the gate lanes. Spawn and recovery points have an extra rule: the car's whole `carScreenBounds` box (any heading) stays at least 4 px inside the arena.
- **Offscreen envelope** in tests uses the largest `carScreenBounds` width/height over all headings and roll values.
- **Spawn clearance** is now derived from the presets: `SPAWN_CLEAR = ceil(1.25 × longest car length)`. The lead fixed this during integration because the hard-coded 36 assumed the old car sizes.

**Cars and shadows (Agent 3's questions)**
- **Shadow shade:** `SHADOW_INK = 0.55` means the dark-pixel fraction, about 56% dark on a 4×4 ordered dither. Every shadow (car, cones, gate) uses Agent 3's shared shadow pixel function and `SHADOW_INK` so all shadows match.
- **`trackWidth`** is the centre-to-centre distance between the rear tyres.
- **Shadow shape:** the sweep from the footprint to `LIGHT × height` is accepted, and stays included in `carScreenBounds`.
- **Turn-rate limit:** bounds stay valid only while the heading moves less than half a frame per physics step. Task 10 must keep `|omega| < 5.9 rad/s`, or widen the bounds and update the containment test.
- **Presets are constant after first use** (bounds and sprite models are cached). Task 10 tuning edits the preset numbers in the source, never at runtime.

**Integration notes**
- In stage 1 `createWorld(id, arena)` builds the course from `layoutCourse(arena)`. On the first view the page creates the world at the real arena size; later size changes call `resizeWorld`, which also rebuilds the layout and cone homes.
- `layoutCourse` takes about 50 ms per call. Agent 2 caches it per arena size in stage 2.
- Known cosmetic gap: cone shadows still use the old sprite until task 07.

## 12. Stage 2 decisions (lead, after integrating stage 2)

**Done during integration**
- `keepOuts(A)` now returns `controlZones(A, A.safe)`: the real HUD, wheel, pedals and painted-instructions rects. The page sets `A.safe` (safe-area insets in logical px) before creating or resizing the world. The course tests check against `controlZones` too. Known gap: if only the safe insets change while W×H stays the same, the course is not re-laid out.

**Decisions**
- **Resize:** cones still sitting untouched at home move to the new layout's home positions; the car and disturbed cones scale proportionally (replaces the §1 rule for resting cones).
- **`w.wraps`** counts car transfers only. Cone transfers don't count.
- **Menu close** always leaves the game paused. Only a fresh drive key, a canvas tap or a wheel/pedal grab resumes.
- **Touch targets** depend on the integer scale. They can fall to 24–32 CSS px in rare 1:1 cases; accepted.
- **Turn rate** stays capped at `OMEGA_MAX = 4.4 rad/s` (below the §11 limit of 5.9).
- **Painted instructions** (user request): drawn into the ground layer by `drawGroundText` in a 3×5 code font, INK only, squashed by K. Their rect is the `instructions` zone.

**For stage 3**
- **Recovery API (Agent 3, task 11):** export `canRecover(w)` and `recover(w)`. `canRecover` is true when the car has settled overturned, and also when the car's whole box lies outside the arena but within the 2 px transfer margin, so it is invisible but not transferred. `recover` follows §4: upright, nearest clear spot fully inside the arena, outside the control zones (`keepOuts`), clear of cones and posts, inputs released, interpolation reset, `trackBreak` set. `carPost` already returns the impulse, for use in roll risk.
- **Recovery control (Agent 1):** a labelled "Right the car" button in the HUD, shown or enabled only while `canRecover(world)` is true, plus the keyboard key **R**. It calls `recover(world)` and announces it to screen readers. Reset Scene stays available in settings.
- **Gate (Agent 2, task 07):** draw the arch over the existing `layout.gate` posts and opening (56 px wide, 26 high). Update `CONE_BOX` for the new cone shadow, and use `SHADOW_INK` and Agent 3's shadow pixel function for cone and gate shadows. Depth is per §6 (`sceneItems` / `drawOrder`).
- **Skid marks (Agent 2, task 09):** marks come from rear tyres only, are clipped to the arena, break on `trackBreak` (raised by transfer, pause or menu, resize, car change, reset, recovery and roll start), and the layer stays bounded.

## 13. Stage 3 decisions (lead, after integrating stage 3)

**Done during integration**
- Agent 3's real `canRecover` / `recover` replace Agent 1's placeholder. The page reaches them through `recoveryApi`.
- **Button flicker fix:** the "Right the car" button shows at once for an overturned (`resting`) car. For a car hidden just past an edge, it shows only after recovery has been possible for `RECOVER_SHOW_MS = 250`. The R key works whenever `recover()` allows it.
- Roll frames need no drawing change: `drawCar` reads `world.car.roll` itself, and Agent 2's `drawCarItem` calls it.

**Decisions**
- **HUD buttons:** size `clamp(round(.125 × short side), 24, 34)` is accepted for ≥44 CSS px touch targets on phones. It makes the 1366×768 course about 9% smaller.
- **`controlZones`** has a fifth zone, `recover`, on the HUD row.
- **Gate depth:** the arch top is drawn last (key `GATE_FRONT`). `GATE_SPLIT` is max roof + 2 = 20 world units. Roll frames can briefly reach about that height; any visible error is limited to a frame or two mid-roll under the arch.
- **Skid marks** come from `recordTracks`, which decides from slip and deceleration; `c.skidding` only drives the HUD status.
- **Shadows:** `LIGHT` stays as it is. Cone shadows are subtle (1–3 px), matching the car's.

**For stage 4 (task 12, lead)**
- Needs hand playtesting: driving feel at the new speeds, how often the Van rolls, passing through the gate, skid-mark look, and the edge crossing.
- Real-device checks: two-finger wheel + gas, pointer cancel, rotation, safe areas. Frame rate and memory over a long drive.
- `verify.cjs` takes about 45 s; acceptable.

## 14. User changes after stage 3 (lead) — wins over earlier sections

The user asked for these after playing the stage 3 build. Same ownership rules as before.

**Agent 1 — controls and text**
- **Wheel:** anchored at the bottom-left corner, with only the top ~3/5 visible and the lower part cut off below the screen edge. It must still be grabbable, and its `wheel` zone is the visible part, clipped to the arena.
- **Pedals:** slightly closer to the bottom-right corner, with a clearly larger gap between brake and gas. The user said "closer"; the lead reads that as closer to the corner/edge (thumb reach). Keep it easy to change.
- **Instructions:** normal readable text, not the pixel font, but still looking painted on the ground: a DOM text layer in the page's ink colour with no box, squashed into the ground perspective (e.g. a CSS `scaleY(0.66)` or a light `rotateX`), with `pointer-events: none`, drawn under the HUD and controls. Remove `drawGroundText` from the ground layer. Keep the `instructions` zone and the screen-reader text.
- **Force feedback, visuals:** the on-screen wheel shows `steering + kickback`, where kickback comes from `car.ffb` plus a short shake from `car.kick`, smoothed with a spring. The wheel returns to centre with a spring that settles into the countersteer angle while drifting. Haptics: `navigator.vibrate` (when present, on touch only) for big kicks; keep it short and rare.
- **Input source:** `sample()` adds a field `src`: `'wheel'` while a pointer owns the wheel, `'keys'` when A/D/arrows steer, otherwise `'none'`.

**Agent 2 — course and skid marks**
- **Parking bays:** removed (`layout.parking = []`, nothing drawn).
- **Guide line:** a traced dotted or dashed line on the ground along the figure-eight path the player should follow. It must be easy to read but quieter than the cones and tracks, and in two tones. Cones mark the path; the line must not run through cones.
- **Middle start and gate:** the gate sits at the figure-eight's crossing in the middle of the screen. The car spawns in the middle, on the guide line, facing so that driving forward goes through the gate and continues along the line. The gate's opening faces along the path at the crossing; generalise the gate art to any heading if needed (cached per angle), with the posts still the only colliders. Remove or move crossing cones that would block the gate. `recover()` still uses `layout.spawn` as its fallback.
- **Skid build-up:** marks no longer start the instant slip crosses a threshold. A slide must build for about 0.3–0.5 s (or about 0.25 s of hard braking) before marks appear, start sparse or faint and darken as it continues, and stop quickly when grip returns. Short wiggles leave nothing.

**Agent 3 — force-feedback physics**
- `car.ffb` in `[-1, 1]` is the self-aligning pull on the wheel (positive = pulls toward steering right). It comes from front slip angle and speed: zero when parked or gripping straight, strongest when drifting, and it points toward countersteer.
- `car.kick` in `[-1, 1]` is a short decaying jolt from collision impulses (cones, posts) and from landing out of a tip.
- **Physics coupling:** when `input.src === 'wheel'`, the effective steering is `clamp(steering + FFB_PULL × ffb)`, so the finger feels the wheel fight back. When `src === 'none'`, steering relaxes toward `FFB_FREE × ffb`, so a released wheel self-centres into countersteer. Keyboard steering (`'keys'`) is not changed. Keep it subtle: `FFB_PULL ≈ 0.25` and `FFB_FREE ≈ 0.3`, tuned so drifting is still possible and nothing feels like it steers by itself on a straight. It must stay deterministic.
