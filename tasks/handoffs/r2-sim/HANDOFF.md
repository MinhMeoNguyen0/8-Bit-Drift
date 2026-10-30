# r2-sim handoff (round 2, requests 1–4)

> **Historical record — current baseline updated October 29, 2026.** Archived agent handoff for its named stage. Its source snapshots, ownership rules, defaults, and successful check counts apply only to that snapshot; they are not the current implementation or QA result. Read [Current game state](../../CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

Base: `tasks/handoffs/r2-base` (99 checks). Result: `node tasks/handoffs/r2-sim/verify.cjs` → **104 checks passed** (~45 s).
CRLF kept. Edits stay inside the sim/course/gate regions, plus two one-line page hooks for the split gate legs (see below).

## What changed (dist/index.html)

1. **Handling tuning (request 1)**: `drive()` reads `TUNING` live:
   - `steerAngle` multiplies the full-lock front-wheel angle (`p.steer`)
   - `steerFade` replaces the fixed 0.48 lock loss at top speed
   - **new key `steerSpeed`** (front-wheel follow rate, was a hard-coded 10/s)
   - `turnRate` scales the yaw response (8.5/s gain and its ±8 clamp)
   - `grip` multiplies `p.grip`

   New `car` defaults in `TUNING_SPEC`: steerAngle .9, steerFade .48, steerSpeed 12, turnRate 1.35, grip 1.15. The front wheels turn a little less, the car slides a little less, and turn-in is quicker. The Supercar still drifts and the task 11 no-flip tests pass. `OMEGA_MAX` is unchanged.
2. **Gate legs = colliders (request 2)**: the legs are now round columns (radius r) on the post circles, up to `archShape().col` (14, above every car roof). The beam and shoulders keep their square section.
   - New `inGate(s,u,v,z)` is the gate solid.
   - `gateArt` is rewritten as a per-pixel ray march, so it works at any rotation; the old version divided by cos(rotation) and broke at ±90°. It also outputs `art.legs[0|1]` (one sprite per leg; `art.posts` is still their union).
   - `gateDrawables` now returns `leg0`, `leg1` and `arch`. Each leg sorts at its own post's ground line. Before, both legs shared the gate-centre key, so on a turned gate a car next to the front or back leg was drawn on the wrong side of it and looked sunk into it. That, plus the square-leg/round-collider mismatch, caused the "sinking".
   - Colliders, `carPost` and `conePost` are unchanged (posts are still the only colliders).
3. **Circuit (request 3)** replaces the figure-eight. Everything from `laneHalf` to `drawGround` is new: `circuitVerts`, `roundedPath`, `laneSelfClear`, `gateSpot`, `placeOn`, `placeOk`, `fitTrack`, `fallbackTrack`, `buildCourse`, `trackMarks`, `drawGround`.
   - The centreline is a rounded polygon (straights plus arcs), so it cannot cross itself. In driving order: main straight → fast two-part sweeper → turn down into a hairpin notch and back → corner → S-bend chicane → corner.
   - The gate spans the main straight at right angles, 30% along it. The spawn is `GATE_LEAD` = 46 px before the gate, facing through it.
   - Cones sit just off the lane at each corner apex and outside, plus extra cones round the sweeper. None go on the lane, the straights, the gate approach or the spawn.
   - Ground markings: two lane edges (± half-width in world units, so a lane running across the screen looks narrower in perspective), a dashed centre guide line, and a two-row checker start line under the gate.
   - Lane half-width is `laneHalf(A)` = 16–22 (20 at a short side of 400).
   - `layout.figure` is gone. It is replaced by `layout.track = {kind, half, pts, length, straight:{x0,y0,x1,y1,len}, box}`. `spawn`, `gate` (+ `lane`), `cones` and `parking:[]` keep their shapes.
4. **Fitting (request 4)**: `fitTrack` works generically against whatever `keepOuts(A)` returns.
   - It builds a 4-unit grid of lane-centre positions whose lane disc clears the edge strip and every zone.
   - It tries 8 orientations × 5 proportions. For each it scans down in size, then bisects, with score pruning. Score = straight + 0.25 × lap length.
   - Fallbacks, in order: the full circuit → a plain oval → an oval with a narrower lane (`LANE_MIN` 13) → a centred oval that ignores the zones (`kind:'fallback'`, only on tiny arenas).
   - Arenas larger than `FIT_MAX` = 1600 use a centred window. Results stay cached per size and zone set.
   - Cost: about 50–250 ms per new arena under node:vm (less in a browser).
   - Spawn headings are normalised to [-π, π).

### Page (browser section) edits — r2-ui's region, 2 lines

- `gateSprites` builds `leg0`/`leg1` canvases instead of `posts`.
- `drawShadow` draws the gate shadow on part `leg0` instead of `posts`.
- `drawItem` was already generic (`g[o.part]`).

## Exports

My line adds: `buildCourse`, `fitTrack`, `roundedPath`, `circuitVerts`, `laneHalf`, `laneSelfClear`, `gateSpot`, `trackMarks`, `LANE_PAD`, `LANE_GAP`, `GATE_LEAD`, `TRACK_STEP`, `CONE_OFF`, `inGate`.

Nothing on the shared line was removed. `CROSS_GAP` is kept but no longer used.

## Tests

**Replaced** (they encoded the figure-eight, a vertical-travel gate or the 2-drawable gate; each now checks the circuit's equivalent):
- "centered figure eight…" → "a closed circuit with the gate across its main straight…"
- "all cars can drive through the gate from the start" → 240 steps (the start is now 46 px back).
- "compact landscape…" → not a fallback, straight ≥ 100, ≥ 6 cones.
- "cones outside the lane" → distance to the polyline.
- "drawGround…" → lane edges, dashed guide line and start line.
- "course finish…crossing corridor" → the whole lane clears the edge strip and zones.
- "Van can follow the figure-eight" → every car follows the circuit centreline without touching a post.
- task 10 "passes cleanly through the gate" → drives along `gate.a`.
- task 07 sprites / fits-through / shadow (sweep uses `inGate`) / depth (uses a face-on gate) / drawables (3 parts, `leg0`/`leg1` canvases).
- `sceneItems` key rule (legs key at their post).
- task 11 "light mass": adds a cone field, because the circuit keeps cones off the lane and the scripted drive no longer hit more than 3.

**Added** (r2-sim section):
- The circuit fits hand-made round 2-sized zones (`r2Zones`: speed, big instructions, bigger wheel, pedals + gear) at 711×400, 1100×400, 844×390, 400×867, 390×844, 533×300 and 640×360. Lane, posts, spawn and cones all clear; the result is deterministic.
- Never self-crossing, total turning 2π, lane parts never touch; it has a hairpin, a sweeper (radius ≥ 55), a chicane and a long straight (≥ 250 at short side ≥ 390, else ≥ 180).
- The Supercar reaches 5th gear from the start on the straight (4th at 533×300).
- Gate legs:
  - Below the round-leg height (`col`) the solid equals the collider circle exactly, at 5 rotations.
  - Cars driven into each leg from 16 directions stop with |gap| ≤ 0.05 px.
  - At the contact, the depth order with that leg is correct.
- Tuning wired: each key has the expected effect; the new defaults give less lock and less slide than the old feel.

Logged numbers (round 2 zones, straight/lap in world px): 711×400 256/1425, 844×390 405/1577, 1100×400 614/2257, 400×867 521/1945.

## Browser check

- Looked at my copy at 1280×720, at a pane-width landscape (~1060×431), at 844×390 and at 390×844. The course fits around the controls and there are no page errors.
- Gate contact was checked visually on 6× renders of car + leg sprites with real depth sorting at rotations 0°, -45° and -90°: the car's body meets the leg's pixels with no overlap and no gap.
- Driving was checked with a path-following bot in Node (all cars lap without leaving the lane except the slidey Supercar at high targets).
- Live driving in the pane was brief: the user was interacting with the same pane.

## Known issues / for the lead

- On landscape phones the main straight is usually horizontal, so the gate is seen **end-on**. In this camera, an arch across a left-right road is physically a vertical bar (the beam's top plus the front leg) with a checker start line under it. It reads as an overhead gantry rather than an arch. Face-on arches appear when the straight runs up/down (portrait, some aspect ratios). A diagonal straight would need a rotated template; I did not do that.
- On old small arenas (short side ≤ 270) with the current zones the course is a plain oval.
- `layoutCourse` takes ~100–250 ms per new size, which can show as a hitch on rotation.
- The Drone still collides with the legs at ground level (unchanged behaviour).
- My tests use synthetic round 2 zones. With r2-ui's real zones, rerun: "course finish" and the round 2 fit tests check `controlZones` too.
