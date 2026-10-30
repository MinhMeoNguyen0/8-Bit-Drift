# Tiny Drive — round 2 (user playtest feedback, 2026-10-29)

> **Historical record — current baseline updated October 29, 2026.** Historical round-2 feedback and ownership only. Current vehicles, course selection, parking, transmissions, races, and layout supersede conflicting details below. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

Lead: the main session. This file wins over `tasks/CONTRACT.md` where they differ. Everything else in the contract still holds
(single self-contained file, two tones on the canvas, fixed-step deterministic physics, no wrapped copies, etc.).

## Base revision

`tasks/handoffs/r2-base/dist/index.html` + `tasks/handoffs/r2-base/verify.cjs` (99 checks pass). It already contains:

- **`TUNING_SPEC` / `TUNING` / `TUNING_DEFAULTS` / `setTuning(patch)` / `resetTuning()`** (search "Round 2: live tuning"). Every
  tunable value the user can change in Settings. `TUNING` is a mutable module-level object read on every use, so a change applies at
  once. Defaults currently reproduce the old feel; agents change the `def` of the keys they own (one spec line per key).
- **Node exports split by owner** (bottom of the simulation section): edit only your own `Object.assign(module.exports, …)` line(s).
  If you delete or rename a function that is listed on another owner's line, tell the lead in your handoff instead of editing it.
- **verify.cjs sections**: new tests go inside your own `// ==== Round 2 tests: … ====` section near the end of the file.

## Work rules

- Work only in `tasks/handoffs/<agent>/` (`dist/index.html`, `verify.cjs`, `HANDOFF.md`). Run `node tasks/handoffs/<agent>/verify.cjs`.
  Never edit `dist/` or `verify.cjs` at the repo root, `r2-base`, or another agent's folder.
- The lead merges with a 3-way line merge (`git merge-file`) against `r2-base`. So: **keep edits local to the regions you own,
  do not reformat, re-indent, reorder or re-wrap code you do not need to change**, and keep CRLF line endings.
- Never weaken a test just to make it pass. Tests that encode an old design the user has now replaced (e.g. the figure-eight) are
  rewritten to check the new design's equivalent properties. Say in the handoff which tests you replaced and why.
- Look at your result in the built-in browser (open `file:///…/tasks/handoffs/<agent>/dist/index.html`; use your own tab) at a
  desktop size and at iPhone 13 landscape (844 × 390 CSS px) and portrait (390 × 844). Check the console for errors.
- Finish with `tasks/handoffs/<agent>/HANDOFF.md`: what changed (functions/regions), tests added/replaced, results, known issues.

## The user's requests and who owns them

### r2-sim — simulation, course, gate (owns: PRESETS physics numbers, `drive()`, collisions, gate geometry/art/colliders, course layout, `drawGround`, the `car` `TUNING_SPEC` lines)

1. **Handling tuning, all configurable.** Wire `TUNING.steerAngle` (multiplies max front-wheel angle), `steerFade` (replaces the
   0.48 lock loss at top speed), `turnRate` (yaw response: how fast the car's rotation follows the wheels), `grip` (lateral grip;
   higher = less drift) into `drive()`. You may add more `car` keys (e.g. how fast the front wheels follow the input) if the feel
   needs them. **New defaults** from the user: the front-wheel angle a little smaller, a little less drift, but turns that feel
   *sharper* (more immediate rotation). Suggested start: steerAngle ≈ 0.9, grip ≈ 1.15, turnRate ≈ 1.35; tune by driving.
   Drifting must stay possible on the Supercar; no car may flip in low-speed turns (existing task 11 tests).
2. **Gate collision is junky**: the car visibly sinks into a gate leg before it stops. The legs are drawn as square columns
   (2r × 2r) but collide as circles of radius r, and the art may not line up with the collider at the gate's rotation. Make the
   drawn leg and the collider match (e.g. an oriented-box leg collider, or round legs), so contact happens exactly when the car's
   pixels meet the leg's pixels — no visible overlap, no gap. Add a test.
3. **A better course** replacing the figure-eight (its crossing makes the paths overlap, and the gate at the crossing blocks one
   path). Build a proper closed **circuit** with no self-crossing: a long main straight (room to run up through the Supercar's five
   gears — this is why the view is being zoomed out), at least one hairpin, a fast sweeper and a chicane/S-bend. The gate spans the
   main straight (perpendicular to travel, posts outside the lane). The car spawns on the straight before the gate, facing through
   it. Keep: a dashed/dotted guide line on the centreline, two track-edge lines, cones marking corner apexes/outsides and the
   chicane (not a dense wall along the straights, and never on the lane), the edge strip, the control-zone keep-outs, caching,
   determinism, `layout.spawn` as the recovery fallback. The whole track lane (centreline ± half-width) must clear the edge strip
   and every control zone (`keepOuts(A)`): fit the circuit to the space that is left (shrink/shift; a simpler fallback shape on
   tiny or portrait arenas is fine). Wider lane is welcome at the new speeds. Rewrite the figure-eight tests for the circuit.
4. The view is being zoomed out (r2-ui sets `viewShort` ≈ 400 logical px on the short side, i.e. ~33% more area). Make sure
   the course uses the bigger arena well; test at `makeArena(711,400)`, `(1100,400)`, `(400,867)`, `(533,300)` and the old sizes.

### r2-ui — page, controls, settings (owns: HTML, CSS, `uiMetrics`, `controlZones`, `computeView`, input module, wheel maths and art, pedals, HUD, settings, gear stick, speed readout, everything after "Browser only below" except `buildGround`; the `wheel` and `view` `TUNING_SPEC` lines)

5. **Gear stick = an actual stick.** Replace the five tap buttons with a draggable lever in an H-pattern gate: grab the knob,
   push it along the neutral channel and up/down into a slot (1–5); it engages when it reaches the slot (`shiftGear`). A refused
   shift (unsafe downshift) springs the knob back to the current gear. Q / E keep working and animate the knob. Keyboard and
   screen-reader accessible. Only shown for the manual Supercar.
6. **Steering wheel**: remove the light (paper-coloured) strip at the top of the rim and replace it with something cooler in the
   two inks (e.g. a stitched/chain-link grip band or a bold top-centre marker). The wheel must turn much further, like a real car:
   `TUNING.wheelRange` degrees each way (default ≈ 270, range 90–540), so lower sensitivity per degree. `wheelCurve` (≥ 1) makes
   the centre softer; `kickback` scales the visual wheel shake (user: "less movement" — default lower, e.g. 0.5).
7. **Pedals**: move them a little to the left (away from the right edge) and make them a little bigger.
8. **Zoom out more**: `viewShort` default ≈ 400 (setting range 260–560). `computeView(cssW, cssH, dpr, short = TUNING.viewShort)`.
9. **Speed readout**: move it out of the bottom centre; plain floating text with **no box/background** (the car drives under it),
   e.g. top-left. Shows km/h (and the gear on the Supercar).
10. **Mobile (iPhone 13)**: the wheel is far too small — make it much bigger on touch screens. The Drone thumbnail in the car
    chooser sits too high — pull it down a little so it is centred like the others.
11. **Settings**: remove the instructions text from the panel. Add a **Tuning** section built from `TUNING_SPEC` (grouped, each a
    labelled slider with its live value, plus "Reset tuning"), saved in `localStorage` (`tinydrive.tuning.v1`; wrap in try/catch),
    applied with `setTuning`. Changing `viewShort` re-runs the view layout. Keep it usable on an 844 × 390 phone (scrolls or two
    columns).
12. **Remove the DOM instructions overlay** (it floats above the car). The instructions become ground paint (r2-paint). Keep the
    `instructions` zone in `controlZones` (bigger now, see below) and the screen-reader text. Call `buildGround(world.arena)` again
    whenever the car changes (paint can differ per car) and whenever the pointer type changes.
13. **Zones** (`controlZones`): keep ids `hud`, `wheel`, `pedals`, `instructions`, `recover`; add `speed` and `gear` (gear always
    reserved, so the course does not move when the car changes). Target landscape layout: HUD top-right; speed top-left (one HUD
    row); instructions on the left below speed, large (≈ 0.55–0.65 × short side wide, ≈ 0.3 × short side tall, never touching
    the wheel); wheel bottom-left, bigger; pedals bottom-right, moved left, bigger; gear just left of the pedals at the bottom.
    Portrait: your call, but nothing overlaps and the course keeps a usable middle. Update the zone tests.

### r2-paint — ground-painted instructions (owns: the old painted-text block `GROUND_TEXT … drawGroundText` (replace it), `buildGround`, the paint export lines)

14. The instructions are **painted on the road**, in the style of the user's reference screenshots: heavy, wide, italic
    sans-serif lettering made of horizontal stripes (1–2 px ink lines with paper gaps), so it reads as half-transparent paint on
    the ground, under the tracks, shadows and cars. Two tones only (contract §6). Use the canvas text API into an offscreen
    canvas, threshold to 1 bit, shear for italic, apply the stripe mask, then paint INK pixels onto the ground (`buildGround`);
    keep a deterministic fallback for Node and test the pure mask/stripe/layout functions.
15. **Keyboard (fine pointer)**: W A S D as **2.5D keycaps laid out like a real keyboard** (W above S; A, S, D in a row), each a
    top face plus a visible extruded side toward the light's shadow side (down-right), the letter on the face, with short striped
    labels (GAS, BRAKE, STEER / LEFT, RIGHT). On the Supercar also Q / E SHIFT; R RESCUE is optional if it fits. **Touch**: a
    painted line such as "DRAG WHEEL TO STEER" / "HOLD PEDALS". No "·" separators.
16. Everything fits inside the `instructions` zone (any size from ~120 × 50 up to ~260 × 140 logical px; degrade gracefully, e.g.
    drop labels, then shrink). Deterministic, never drawn outside the zone/arena.
