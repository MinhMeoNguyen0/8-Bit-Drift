# r3-ui handoff (round 3)

> **Historical record — current baseline updated October 29, 2026.** Archived agent handoff for its named stage. Its source snapshots, ownership rules, defaults, and successful check counts apply only to that snapshot; they are not the current implementation or QA result. Read [Current game state](../../CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

Base: `tasks/handoffs/r3-base/dist/index.html` + `verify-current.cjs`. Files: `tasks/handoffs/r3-ui/dist/index.html`,
`tasks/handoffs/r3-ui/verify-current.cjs`. LF endings throughout. All edits are in UI-owned regions (`git diff --no-index -U0
r3-base/dist/index.html r3-ui/dist/index.html` lists the hunks). Nothing touched in `canvasTextMask`, `buildGround`, the paint
functions, `drawGround`, `buildCourse`/`TRACKS`/`setTrack` or other course code.

## What changed

- **Zoom (lead request):** the `viewShort` TUNING_SPEC line is now exactly
  `{key:'viewShort',group:'view',label:'Zoom out',unit:'px',min:300,max:1000,step:25,def:750}`.
- **Decorative unit no longer follows the zoom:** `--u` (stripes, borders, pedal/recover label sizes) used to be
  `view.u` (CSS px per logical px), so zooming out to 750 made every control's paint thin and its labels tiny. It is now
  `uiPx(cssW, cssH)` = short CSS side / 400, clamped to 1..2.5. The desktop Settings panel width uses the same unit.
  Positioning still uses `view.u`.
- **Speed readout:** `layoutUI` sizes `--sp` with the new `speedFit(w, h, manual)` helper. It was hard-coded at 24px.
  The size is about 82% of the row, limited by the text width. If a manual readout would shrink below 80% of the row on one
  line (portrait phones), it stacks the gear line under the speed (`.speed.stack`). The stripes now scale with the font.
  `KM/H` and `GEAR` use Arial Black italic. The speed zone is wider: `uiMetrics.spW` went from 3.4 to 4.2 HUD buttons.
  It stays inside the instructions column below it, and on phones the course's top band is already reserved. I checked
  that no lane comes near the wider zone for any track at 1600×800, 1366×768, 844×390 and 390×844. Results: desktop 50px,
  844×390 44px, 390×844 37px (stacked).
- **Gear shift indicator:** `#stick-cue` and its `renderSpeed` line are removed, and so is the "UP↗" word in the speed
  readout. In their place are two 2.5D keycaps with no words, in a column at the left of the gear zone: E with an up arrow
  at the plate's top and Q with a down arrow at its bottom. They are `aria-hidden` indicators; the stick keeps
  `aria-keyshortcuts="Q E"`.
  - Keycap style: light face, ink outline, and an ink side extruded to the bottom-right.
  - `.hot`: the up key pulses inverted while `gearTelemetry(world).shiftUp` is set (static inverted under reduced motion).
    `down.hot` follows `shiftDown` only if telemetry ever gains that flag; today it never fires.
  - `.off`: a dashed, flat key when that shift is impossible (gear 5, gear 1, or a downshift `shiftGear` would refuse).
    `gearCues(w)` uses the same rule as `shiftGear`.
  - Layout comes from `shiftKeyLayout(w, h)`, set as CSS variables on `#gearstick`. `.gear-face` is now inset by `--fl`;
    `stickPoint` is unchanged because it measures the face's own rect.
  - On desktop the keys sit inside the existing gear zone, so the stick plate shrinks from about 209 to 157 CSS px wide.
  - **Zone change:** on phones (`controlZones` mobile branch) the gear zone is widened leftwards by the key column, so the
    stick keeps its size. The tests check that it stays within the pedals' horizontal span, so it reserves no new
    horizontal band.
- **Track picker:** the `<select id="track-choice">` is replaced by `.track-pick` with `#track-row`, filled from `TRACKS`
  (ids and names only).
  - Each entry is a `<button class="track-choice" aria-pressed>` holding a 1-bit thumbnail canvas and the track name.
  - Each thumbnail is `trackThumb(buildCourse({...arena, E: edgeClear(arena)}, [], id).track.pts → screen px, ...)` at
    `trackThumbSize(arena)`: the arena's aspect, long side 64px. It is cached per arena and redrawn by `syncTracks()`
    when the menu opens, after a relayout while the menu is open, and after a pick. The chosen track is drawn inverted.
  - Choosing one runs `pickTrack(id)`: `setTrack(id)`, then `reset()` (which rebuilds the ground), then `syncTracks()`,
    then a live announcement.
  - A `buildCourse` failure leaves a blank thumbnail (try/catch).
- **Theme restyle:**
  - Two inks only: `--paper`, `--muted`, `--line` and `--panel` are now ink or paper.
  - All DOM text is heavy italic capitals (`body` uses Arial Black italic 900 with uppercase; buttons and inputs inherit
    it).
  - The Settings heading and the entry prompt use striped letters.
  - Rows are 2.5D keys (2px outline, ink offset, press-in on `:active`, inverted on hover).
  - The "PAUSED · PRESS W TO DRIVE" `.entry` is a big extruded key. Its text sits in a span so the stripes can clip to
    it; the new `setEntry()` replaces the three `ui.enter.textContent=` writes.
  - The wide (phone landscape) panel grid gains a `track` area under the heading.
- **Exports:** appended to the existing `// ui extra exports (r2-ui, r3-ui)` line: `uiPx`, `SPEED_EM`, `speedFit`,
  `shiftKeyW`, `shiftKeyGap`, `shiftKeyLayout`, `gearCues`, `trackThumbSize`, `trackThumb`.

## Tests (`verify-current.cjs`, under `// ==== Round 3 tests: r3-ui ====`)

1. Speed readout is big and fits its zone at 1600×800, 1920×1080, 1366×768, 844×390@3 and 390×844@3, at zoom
   300/750/1000. Also covers the `uiPx` values.
2. Shift keycaps: inside the gear zone, a gap from the stick face, E and Q caps not touching, stick plate at least 55px.
   The gear zone stays clear of the pedals and wheel, and on phones stays within the pedals' horizontal span.
3. `gearCues`: up is hot at the shift-up point and off in 5th; down is off when too fast, and `shiftGear` agrees; automatic
   cars show nothing.
4. Track thumbnails: 1-bit, padded, deterministic, every lane point lands on ink (the line is continuous), and each track's
   picture differs. Run for every `TRACKS` id on real arenas. It does not depend on track shapes.

Result: `node tasks/handoffs/r3-ui/verify-current.cjs`, 17 checks passed (13 base + 4 new).

## Browser checks

- **Built-in browser** (own tab), 1600×800, 844×390 and 390×844 (mobile preset, touch):
  - The picker works by click and by keyboard (Enter on a focused button). Escape closes the menu and returns focus.
  - The wide panel fits at 844×390 (bottom at 356 of 390).
  - Holding W in the Supercar lights the E key at the shift-up point. Pressing E shifts, and the Q key goes flat when
    too fast.
  - Measured rects: keys, stick face, pedals and wheel do not overlap at 844×390 and 390×844.
  - No console messages. Viewport reset to desktop afterwards.
- **Headless Chrome** full-resolution screenshots of a scratch copy (outside the repo) at 1600×800 and 844×390@3 to judge
  the look.

## Known issues and untested

- Real multitouch and real phones are untested. The touch layout was checked only with the browser's mobile emulation.
  Phone landscape (844×390) was checked with a fine pointer, so with the painted keycaps rather than the touch wording.
- The keycap letters are solid; at 22–46px, stripes made them unreadable. The striping on the speed readout, the Settings
  heading and the entry prompt follows the reference.
- On desktop the gear stick plate is about 25% narrower, because the keys take a column inside the unchanged desktop gear
  zone. Widening that zone would move a course keep-out, so I did not.
- Before merging, check that the r3-course lane tests still pass against my two zone changes: the wider speed zone, and
  the wider phone gear zone (which stays above the pedals).
- The "8-Bit Drift" monospace title and the W A S D keycaps on the ground belong to r3-paint and are unchanged here.
- `syncTracks()` also runs once at load (three `buildCourse` calls on the default arena) to set `aria-pressed`. It costs
  little; drop the call if r3-course makes `buildCourse` expensive.
