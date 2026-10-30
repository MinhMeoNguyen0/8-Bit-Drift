# r2-ui handoff (ROUND2.md requests 5–13)

> **Historical record — current baseline updated October 29, 2026.** Archived agent handoff for its named stage. Its source snapshots, ownership rules, defaults, and successful check counts apply only to that snapshot; they are not the current implementation or QA result. Read [Current game state](../../CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

Base: `tasks/handoffs/r2-base` (99 checks). Files: `dist/index.html`, `verify.cjs` (CRLF kept).

## What changed

**TUNING_SPEC (my lines only):** `wheelRange` def 270 (90–540), `wheelCurve` def 1.2, `kickback` def 0.5, `viewShort` def 400 (260–560).

**Pure section**
- `computeView(cssW, cssH, dpr, short = TUNING.viewShort)`. `VIEW_SHORT` = `TUNING_DEFAULTS.viewShort` (400). A bad `short` falls back to 400.
- `uiMetrics(S)`: wheel `D = clamp(.58 S, 64, 240)` (was .36 S, max 112). Pedals `pw = clamp(.15 S, 28, 60)`, `ph = 1.65 pw`, `pg ≤ 18`. New fields: `pedalIn = clamp(.07 S, 6, 32)` (pedals moved left), `spW` (speed), `iw × ih` (instructions, `.6 S × .3 S`, capped at 260 × 140) and `gw × gh` (gear stick).
- `controlZones(view, safe)` returns `[hud, wheel, pedals, instructions, recover, speed, gear]` (the first five ids keep their order).
  - **Top row:** speed at top-left, HUD at top-right. The recover slot sits left of the HUD, or under it when it would reach the speed zone.
  - **Left side:** instructions under the speed row, clear of recover and gear, ending at least `UI_GAP` above the wheel.
  - **Bottom row:** wheel at bottom-left (60% visible). Its D shrinks only on narrow screens. Pedals at bottom-right, inset by `pedalIn`.
  - **Gear zone:** just left of the pedals, or above them when the wheel would lose more than 15% (portrait, 4:3, square). It is always reserved, so the course does not depend on the car.
  - Sample zones, 844×390: wheel 226 px wide, instructions 234×117, gear 129×117. iPhone 13 portrait: wheel 216 px (was ~140 CSS px).
- **Wheel maths:**
  - `WHEEL_MAX` is removed and replaced by `wheelLimit()`, which reads `TUNING.wheelRange`.
  - `wheelInput(angle)` maps the angle to an input (linear / range, then `^wheelCurve`); `wheelAngle(steering)` is its inverse.
  - `wheelValue(s) = wheelInput(s.angle)`.
  - `wheelDrag` clamps to `±wheelLimit()`. The angle accumulates, so the finger can wind past ±180°.
  - `wheelKickback` is scaled by `TUNING.kickback`.
- **Gear stick (new, pure):** `GEAR_GATE`, `gearSlot(g)`, `stickMove(p, target)`, `stickSlot(p)`, `stickPath(p, g)` and `pathPoint(pts, f)`.
  - `stickMove` keeps the knob on the H gate: sideways only along the neutral channel, up and down only inside a column, with magnetic catch at the columns.
  - `stickSlot` reports a gear when the knob is within `engage` of a slot end.
  - `stickPath` gives the path the knob follows for Q/E and for the spring-back.
- **Tuning store (new):** `TUNING_STORE = 'tinydrive.tuning.v1'`, `tuningGroups()`, `loadTuning(store)` and `saveTuning(store)`. Only keys that differ from the defaults are stored, and every storage access is wrapped in try/catch.

**HTML / CSS / browser section**
- **Gear stick:** the five tap buttons and `.drive-console` are gone. `#gearstick` / `#gear-face` is now an SVG H-gate plate (2.5D extrusion, dithered slots, knob with gear number, shaft, shadow).
  - Relative pointer drag with capture. A gear engages through `requestGear` → `shiftGear` when the knob reaches its slot.
  - A refused shift (or a release between slots) springs the knob back along the gate to the engaged gear.
  - Q / E, the arrows, Home/End and 1–5 on the focused stick animate the knob along the gate.
  - The stick lets go on pause, menu, blur, rotation and reset.
  - `role=slider`, `aria-keyshortcuts="Q E"`; shifts and refusals are announced.
  - `touch-action:none` now applies to `.wheel-face`, `.pedal` and `.gear-face` only.
- **Wheel art:** the paper strip at 12 o'clock is removed. In its place: a striped top-centre marker with an ink pointer, and a chain-link grip band (dashed dither links plus ink links). Two inks only.
  - The rim rotates by the full angle: `drag.angle` while dragging, otherwise `wheelAngle(input)`. So A/D shows the full 270° lock, with a 0.2 s transition.
- **Speed readout:** `#speed` in the `speed` zone is plain floating text with no box: heavy italic, horizontally striped digits (`background-clip:text`). It shows km/h, plus gear and a "UP" shift hint on the Supercar. The font size is fitted to the zone (`--sp`).
- **Pedals:** bigger and inset (zones). The fine-pointer visual scale goes from .62 to .85.
- **Drone thumbnail:** flying presets are centred on the body, not body plus shadow (`thumbY`); up to 6 px of shadow may be clipped.
- **Settings:** the help text (`#panel-help`) is removed. A **Tuning** section is generated from `TUNING_SPEC`: grouped fieldsets, a labelled range per key with a live `<output>`, and a "Reset tuning" button.
  - Input applies `setTuning` and saves at once. The Zoom out slider re-runs `applyView` on `change` (release).
  - Short landscape keeps two columns, with the tuning list scrolling inside (`--panel-max`).
  - Saved tuning loads before the first layout.
- **Instructions:** the DOM `#instructions` overlay and its CSS are removed; `zoneEls` no longer lists it. The zone stays, and so does the sr-only `#driving-help`, which now also explains the gear stick.
- **Ground rebuilds:** `reset()` calls `buildGround(world.arena)`. `groundKeyFor()` includes the zones, `isTouch()`, `world.id` and the arena size. (`buildGround` itself is untouched.)
- **Bug fix:** `doRecover()` assigned to an undeclared `previousWheels`. That throws in strict mode, which aborted the redraw after "Right the car". The assignment is removed.

## Tests
- **Replaced** (design changed by the user):
  - `computeView` test: new 400 expectations; the 300 cases are kept via the 4th argument.
  - `controlZones` device test: rewritten for the new layout (big wheel, inset pedals, speed and gear zones, instruction size, phone touch sizes: wheel ≥ 190 CSS px).
  - "tutorial" DOM legend test → "no DOM overlay, sr help kept, wheel without the light strip, two inks".
  - `wheel maths` test: uses `wheelLimit()` (270°) instead of `WHEEL_MAX`.
- **Updated:**
  - `page:` test: touch-action list includes `.gear-face`; checks for no help text and for the Tuning section.
  - stage 3 recover test: prefers the HUD row unless it would reach the speed zone.
  - `R help` test: drops the settings-help assertion, because that text was removed at the user's request.
- **Added** (r2-ui section, 7 tests): tuning defaults; range/curve/kickback round trips and 540° winding; H-gate constraints, slots, paths and realistic drags; stick → `shiftGear` with refusal and spring-back; tuning persistence with fake and throwing storage; speed/gear zones on the r2-sim arenas (711×400, 1100×400, 400×867, 533×300, …) with instructions inside r2-paint's 120×50 to 260×140 range; page wiring.
- **Result:** 102 of 106 pass, run with a non-stopping runner. Plain `node verify.cjs` stops at the first failure below.
- **Known failures (r2-sim area, not changed by me):**
  - `course: centered figure eight…`
  - `compact landscape retains a usable course…`
  - `course finish: … crossing corridor`
  - `task 11: light mass alone never flips a car` (expects > 3 course hits)

  All four are figure-eight course tests that now see the larger keep-out zones (bigger wheel, instructions, gear, speed). r2-sim's new circuit must be fitted to these zones, and its tests run against them once merged.

## Browser checks (built-in browser, own tabs)
- **1280×720 (arena 640×360):**
  - Every zone is placed and nothing overlaps.
  - A mouse drag on the knob from 1 to 2 shifted gear and resumed driving.
  - A pointer drag 2 → neutral → 3 shifted.
  - A straight diagonal pull from 3 toward 5 did not move the knob.
  - E animated the knob to 4.
  - The rim showed `rotate(270deg)` with D held.
- **844×390:**
  - Two-column settings, with the tuning list scrolling.
  - Zoom out and Reset tuning re-lay out the view.
  - On the `data:` page, localStorage throws SecurityError; this is handled silently.
- **390×844 (touch):**
  - The gear stick sits above the pedals; the wheel is 216 px.
  - A wheel drag wound 290° and clamped at 270° (100% right).
  - The settings panel fits and scrolls.
- **Console:** no errors from the page. The only error came from my own `location.reload()` on the harness's data URL.

## Notes for the lead
- Export line `// ui (r2-ui)`: `WHEEL_MAX` was removed (now `wheelLimit()`). The new names are on the `ui extra exports (r2-ui)` line.
- `world.manual` is still set in `reset()` / `applyView` as before.
- The painted instructions are blank in my copy, as expected (r2-paint). The `instructions` zone is now about 234×117 on an iPhone 13 and 216×108 at 1280×720.
