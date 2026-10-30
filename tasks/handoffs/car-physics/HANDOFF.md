# Agent 3 handoff: task 11, rollover physics and recovery (stage 3)

> **Historical record — current baseline updated October 29, 2026.** Archived agent handoff for its named stage. Its source snapshots, ownership rules, defaults, and successful check counts apply only to that snapshot; they are not the current implementation or QA result. Read [Current game state](../../CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

- **Base revision:** `tasks/handoffs/base/index.html` + `base/verify.cjs` (stage 3 base: integrated stage 2, 61 checks).
- **Patch:** `tasks/handoffs/car-physics/index.html` and `verify.cjs`. See it with `diff -u tasks/handoffs/base/index.html tasks/handoffs/car-physics/index.html` (19 hunks, all in my areas except the one-token `createWorld` change below). LF endings.
- **Tests:** `node tasks/handoffs/car-physics/verify.cjs` gives **74 checks passed**: the 61 base checks, unchanged and not weakened, plus 13 new task 11 checks. It takes about 37 s, up from about 18 s (see "Cost").

## Changed regions (index.html)

| Where | Change |
|---|---|
| `PRESETS` | New fields `comHeight` and `rollThreshold` (table below). Nothing else changed. |
| After `FRAMES` | `ROLL_STEPS = 12`: roll frames are 30° steps. |
| `carModel` … `spriteBox` | New `rollFrame(roll)`, `rolledModel(p,k)`, `rollShadowPolys`, `rollSpritePoints`, `pointsBox`, `rollFrameBounds` (memoised), `unionBox`, `squareBox`, `rollSpriteBox(p)`.<br>`frameBounds(p,i)` lost its placeholder `roll` argument; upright results are unchanged.<br>`carScreenBounds(p,a,roll)` now caches both cases. For `roll ≠ 0` it returns the real roll box (details below). |
| `createWorld` | The car literal gains `...uprightState()`. This is the only edit inside Agent 2's function. |
| `drive()` | Stores the tyres' lateral acceleration in `c.aLat`. The arithmetic is identical (`lateral += tyreY*dt`). Nothing else changed. |
| New block before `step()` | Roll constants, `uprightState`, `rollKappa`, `tipAngle`, `tumble`, and `rollover` (the state machine). |
| `step()` | Each substep now:<br>• calls `drive` only while driving; tipping calls `drive(NO_INPUT)`; the other states call `tumble`;<br>• records `c.vx/vy` before the collision pass;<br>• calls `rollover(w,h,Δvx,Δvy)` before `transferEdges`. |
| New block after `step()` | `carHidden`, `canRecover`, `RECOVER_GAP`, `boxDistance`, `recoverSpot`, `recover`. |
| After `carShadow` | `carRollSprite(p,a,k)` and `carRollShadow(p,a,k)`, the code-drawn roll frames. |
| Node exports | The new names are added (task 11 list). |
| Browser: `drawCar` | This is the drawing change (exact text below). Roll frames are rendered lazily into an LRU cache of 384 canvases. |
| Browser: sheet warm-up | Idle-time `setTimeout` also calls `rollSpriteBox(PRESETS[id])`, so the first roll doesn't stall. |

Untouched: `sceneItems`, `drawOrder`, `draw()`, `transferEdges`, `carCone`, `carPost`, the layout, the DOM and the CSS.

## Drawing change the lead must re-apply onto Agent 2's `draw()`

**Nothing**, provided Agent 2's car drawable still calls `drawCar(ctx, world.id, layer, frameIndex(o.a, FRAMES), o.x, o.y)`:

- My `drawCar` gained a 7th parameter, `roll = world.car.roll || 0`.
- When `roll ≠ 0`, it draws the roll frame `rollFrame(roll)` of heading `i`, anchored with `rollSpriteBox(p)`, for both the `'shadow'` and the `'car'` layers.
- `sceneItems` already culls the car with `carScreenBounds(w.p, pc.a, c.roll || 0)`.

If Agent 2's new car drawable does not go through `drawCar`, copy my block into it: it is the lines from `// ---- Task 11 (Agent 3) roll-frame drawing` to `// ---- end of task 11 roll-frame drawing.`, which hold `rollCanvases`, `rollCanvas` and `drawCar`. Then pass the car's roll explicitly.

## New preset fields

| Car | comHeight | rollThreshold | Static index (grip·κ / threshold) | Tip angle |
|---|---|---|---|---|
| Compact | 5.3 | 1.1 | 0.37 | 51° |
| Coupe | 4.2 | 1.2 | 0.15 | 59° |
| Van | 7.6 | 1.0 | 0.62 | 45° |

- κ = `comHeight / (ROLL_G · trackWidth/2)`, with `ROLL_G = 226` px/s² (arcade gravity).
- The static index is the largest steady cornering load each car can reach, because the tyres saturate at `grip`. It is below 0.75 for every car, so **steady cornering, at any speed, never lifts a wheel**.
- The Van is the most roll-prone (tall and grippy). The Coupe is the least (low and slidey).

## Model and state machine

**`car.load`**
- It is the dynamic lateral load-transfer ratio: dimensionless, and `+` means the weight is on the car's right-hand wheels.
- Its target is `u = -aLat·κ`. `aLat` is the real tyre lateral acceleration, which is at most `grip`, so **mass never enters it**.
- It follows `u` through a damped spring (`LOAD_W = 5` rad/s, `LOAD_ZETA = 0.2`). A steady turn settles at `u`, but reversing a loaded turn (a fishhook, or a slalom at speed) overshoots. That is the classic rollover manoeuvre.
- Collisions kick its rate: `Δload' = -Δv_lat·κ·LOAD_W²·IMPACT_GAIN` (0.8), where `Δv_lat` is the car's lateral velocity change across the substep's collision pass (cones and posts). A sideways hit trips the car. A head-on or clipping hit has almost no lateral Δv, so it never tips the car.

**`car.roll`**
- It is the visual roll angle in radians: `+` means toward the car's right side, ±π/2 is on a side, π is on the roof.
- It is exactly 0 while `'driving'` or `'recovering'`.

**States**
- **`driving`**: normal `drive()`. When `|load| > rollThreshold`, the car becomes `tipping`. Its side is `sign(load)`, and `trackBreak = true`.
- **`tipping`**: on two wheels, inputs ignored (`drive` with neutral input).
  - The restoring spring is softer (`TIP_SOFT = 0.6`).
  - `roll` runs from `TIP_MIN` (0.3) up to `tipAngle = atan(trackWidth/2 / comHeight)`.
  - Load ≥ `TIP_COMMIT × threshold` (1.15): the car becomes `rolling`, with `trackBreak = true`.
  - Load < `TIP_DROP × threshold` (0.85): the car lands back in `driving`. This band is the hysteresis.
- **`rolling`**: `tumble()`.
  - The body slides under ground friction (180 px/s²) and its spin decays. Inputs are ignored and `skidding` is false.
  - The roll rate starts at 5–9 rad/s (faster with speed) and decays at 5 rad/s².
  - Below 2.2 rad/s the body settles onto the nearest stable face (wheels, a side or the roof) at 4 rad/s.
  - Once settled and below 1 px/s, it becomes `resting` (on a side or the roof, everything zero). If it settled on its wheels after a full turn, it goes straight back to `driving`.
- **`resting`**: frozen, and `canRecover` is true.
- **`recovering`**: set by `recover()`. It lasts `RECOVER_TIME` = 0.3 s, upright and ignoring inputs, then returns to `driving`.

**Collision footprint while not driving**
- It is the same upright box (length × width), so contacts are the same in every state.
- Substeps, collision limits and the post and cone tests are unchanged.

**Roll bounds**
- `carScreenBounds(p,a,roll≠0)` is the union of every roll frame (sprite and roll shadow) at the two headings around `a`.
- So the box never changes mid-tumble, and transfers cannot flip-flop. It changes only when a roll starts (it grows, which can never trigger a transfer) and when the car becomes upright again.
- Agent 2's envelope test (roll 0 and 1) therefore covers the real maximum box.

## Recovery API (contract §4, §12)

**`canRecover(w)`** is true when either:
- `car.state === 'resting'`; or
- the state is not `'recovering'` and the car's whole box (at its heading and roll) lies outside the arena. The car has not transferred, so it is in the 2 px margin.

**`recover(w)`** returns `false` and changes nothing when `canRecover` is false. Otherwise it searches for the nearest anchor to the car:
- on a 2 px grid, in 8 px distance bands, nearest first; the grid is coarser only for arenas far larger than a screen;
- first with the car's current heading, then with the spawn heading.

A valid anchor meets every rule below, all checked on the screen y the car will really have:
- it is at least `edgeClear(A)` from every edge;
- the whole upright `carScreenBounds` box is at least `SPAWN_INSIDE` (4) px inside the arena;
- the box is off every `keepOuts(A)` zone;
- the body is `RECOVER_GAP` (2) clear of every cone (at its current position) and every gate post.

The fallback, when no spot is found, is the layout spawn.

Once a spot is found, `recover`:
- sets the car upright and still: velocity, spin, steer, load and roll all 0;
- sets `px/py/pa` to the new position (interpolation reset);
- sets `state = 'recovering'` and `trackBreak = true`;
- returns `true`.

It takes about 0.5 ms natively. Under `node:vm` it takes about 10 ms, because of global lookups.

## Contract assumptions and problems

1. **`createWorld` gains `...uprightState()`.** This is the only edit inside Agent 2's code. Pre-task-11 car objects without `state` are treated as `'driving'`.
2. **The roll-risk kick does not use `carPost`'s return value.** It uses the car's measured Δv across the whole collision pass, which covers posts and cones and includes friction. `carPost` still returns its normal impulse, unchanged.
3. **`canRecover` follows §12 literally.** It is also true while a fast car crosses the 2 px margin, which lasts about one frame. **Agent 1** may want to show the button only after `canRecover` has been true for about 0.25 s. The R key is safe either way, because `recover` refuses unless `canRecover` is true.
4. **Recovery keep-outs.** The whole car box (not just the anchor) must avoid the control zones and stay 4 px inside. The anchor obeys the edge strip.
5. **Inputs.** While not driving, `step` ignores its input, so held keys cannot act. Releasing inputs and resetting the input state is the page's job (Agent 1), as agreed.
6. **`frameBounds` signature.** It is now `frameBounds(p,i)`: the unused placeholder `roll` argument is gone. Roll frames use `rollFrameBounds(p,i,k)`.

## Tests added (verify.cjs, "Task 11" section; results)

1. **Preset fields and proneness.** The static index is van 0.62 > compact 0.37 > coupe 0.15, every value is < 0.75, and centre-of-mass heights are ordered the same way.
2. **Low speed, all cars, 15–50 px/s.** Full lock both ways, slaloms with 0.4–2 s periods, and full-lock circling from rest never leave `driving`. Peak loads are 0.52, 0.32 and 0.40, all below 0.75 × threshold.
3. **Drifting coupe.** The stage 1 drift test still slides. At top speed and full lock the slip is > 100 px/s. Slaloms and flicks never tip it.
4. **The Van rolls from sustained aggressive cornering.**
   - A top-speed flick (0.6 s one way, then the other), in both directions, gives exactly `driving > tipping > rolling > resting`. `trackBreak` is set at the tipping and rolling starts. It rolls toward the outside of the final turn and rests on a side or the roof with zero velocity.
   - Top-speed slaloms (1.4 s and 2 s) also roll it.
   - One full-lock turn at top speed does not tip it.
   - A short flick tips and lands (`dtd`), which shows the hysteresis.
   - The same flicks never roll the compact or the coupe.
5. **Post hits.**
   - Broadside into a post: van at 100 px/s gives `dtrs` (it trips toward the post); van at 40 stays `d`; compact at 150 gives `dtrs`; compact at 80 stays `d`; coupe at 100 stays `d`.
   - Straight or clipping hits at top speed never tip any car. No car ever enters the post.
6. **Light mass.** Mass ×0.15 or ×3 gives a bit-identical load trace. A compact or coupe at mass ×0.15 thrashing the full course for 60 s never rolls.
7. **Inputs ignored.** From tipping through rolling to resting, three different inputs give identical car state at every step. A resting car with the throttle held does not move. While `recovering` the car stays put, then it drives normally.
8. **canRecover and recover.**
   - They are refused while driving, tipping, rolling (visible) or recovering, and the car is unchanged.
   - Resting in the open: righted where it lay, with its heading kept.
   - After a real roll on the course.
   - Hanging half over every edge and corner (3 cars × 8 positions × 3 headings).
   - Invisible inside the margin on all 4 edges.
   - Lying on or across both posts, and on top of cones.
   - Among scattered cones.
   - No clear spot anywhere: it falls back to the spawn.
   - Every case checks: upright, still, interpolation reset, `trackBreak`, box ≥ 4 px inside, anchor outside the edge strip, off every control zone, ≥ 2 clear of cones and posts, `canRecover` now false, and no resting cone moves on the next step.
9. **Anywhere on 4 arenas.** 400×240, 234×506, 506×234 and 480×270, 3 cars, a 4×3 grid that includes off-arena points: 144 recoveries, all valid.
10. **Roll-frame containment.**
    - It covers 3 cars × 12 roll frames × 64 headings.
    - Every sprite and roll-shadow pixel is inside `carScreenBounds(roll)` for any heading within half a frame, and inside the roll raster.
    - The shadow covers the ground under the anchor (it is ground-anchored).
    - Rasters are two-tone and opaque, with the `SHADOW_INK` density.
    - The box is the same for every non-zero roll value.
    - The roof frame differs from the upright sprite.
    - Worst slack is 3 px per side. Roll rasters are 43, 48 and 52 px.
11. **Rolling across an edge.** A rolling car transfers exactly once with its roll box, the overshoot is kept, and it never flip-flops (3 cars × 4 edges).
12. **Fixed-step determinism at 30/60/120/144 Hz.** A van run with a roll, rest, recovery and further driving gives an identical state sequence and final state.
13. **Long drives.** Two minutes per car of fishhooks at full speed on the real course, with recovery 0.5 s after it is offered:
    - checks: finite state, valid states, speed and spin bounded, inside the envelope, roll 0 while upright, never inside a post;
    - result: the van rolled and recovered 8 times, the compact and coupe 0 times.

Agent 2's tests still pass unchanged:
- In the five-minute drive the van tips 8 times but always lands.
- Full-lock edge circling never leaves `driving`, with the same 546 transfers as before.

## Cost

- **Suite time.** It now takes about 37 s, up from about 18 s. The biggest new costs are:
  - rasterising the 4,608 roll frames in the containment test: about 5 s;
  - the 2-minute drives: 4.4 s;
  - the recovery tests: about 5 s.
- **In the game:**
  - roll frames are rendered on first use (2 rasters per new heading/roll pair, well under 1 ms each in a browser), in an LRU of 384;
  - roll bounds are memoised and warmed up in idle time;
  - the roll state machine adds a few flops per substep.

## Known issues and untested

- **Not playtested live.** The preview pane is hidden (`document.hidden`), so the page pauses itself. Instead I checked:
  - the page loads with no console errors;
  - a contact sheet of roll frames rendered from the real rasterisers looks right: the car on two wheels, on its sides, on its roof, and the shadows.

  Please playtest:
  - how often a keyboard driver rolls the van with quick S-turns at top speed (that is intended, but it is the main tuning question);
  - whether the compact's occasional two-wheel moments read well.
- **Tuning knobs.**
  - Per car: `rollThreshold`.
  - Globally: `LOAD_W`, `LOAD_ZETA`, `TIP_COMMIT`, `IMPACT_GAIN`.
  - Raising the van's `rollThreshold` to about 1.1 makes it fishhook-proof except at resonance.
- **Simplified roll frames.** They leave out the upright sprite's small details (lights, pillars, arch lines). The roof view is mostly the dark dithered underside with the tyres on top.
- **Footprint.** The collision footprint stays the upright box while the car is on its side or roof.
- **Button flicker.** `canRecover` flickers for about one frame when a fast car crosses the transfer margin (see assumption 3).
- **Untested:**
  - a resize during a roll (the state and roll are kept, and the bounds are recomputed, but there is no test);
  - mobile analog steering against rollover (smoother input gives less overshoot, so it should be safer than keyboard);
  - recovery when the safe-area insets make the zones larger than the free arena (it falls back to the spawn).
