# 8-Bit Drift — round 3 (user feedback, 2026-10-29)

> **Historical record — current baseline updated October 29, 2026.** Historical round-3 feedback and ownership only. Later race/rejoin/UI/instruction changes define the current baseline; its former precedence claims are scoped to that round. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

Lead: the main session. This file wins over `tasks/ROUND2.md` and `tasks/CONTRACT.md` where they differ.

## What the user said (summary)

The game no longer looks like the chunky 8-bit theme the user liked (their reference: the speed readout and the W A S D
keycaps painted as heavy, wide, italic, horizontally-striped lettering, scaled up so pixels are big). Specifically:

1. The track is too big, with too much empty space. Make it a little smaller.
2. The "8-Bit Drift" text on the ground is in a plain monospace font that does not match the game's theme.
3. Gear stick: remove the "UP E / Q DOWN" text. Show a small up/down arrow indicator styled like the painted keycaps
   in the top left.
4. Track choice in Settings: not a dropdown. Show a small picture of each of the three tracks.
5. Tracks: keep the oval. Make the first (signature) track smaller. Replace the "club circuit" with the original
   figure-eight track from earlier.
6. The instructions (W A S D keycaps) use the wrong font. They should look like the reference: heavy, wide, italic,
   striped lettering.

## Update from the user (mid-round)

- **Zoom**: `viewShort` default **750**, slider max **1000** (min stays 300). The spec line must read exactly
  `{key:'viewShort',group:'view',label:'Zoom out',unit:'px',min:300,max:1000,step:25,def:750}`. r3-ui owns it; the other
  agents may make the identical change in their copy to test (identical edits merge cleanly). Check every layout at 750.
- **No track overlap**: the signature course currently crosses over itself (two parts of the lane overlap near the gate).
  Apart from the figure-eight's one intended crossing, no track may overlap itself: the lane bands (centreline ± half)
  of non-adjacent parts must keep a clear gap. r3-course fixes this and adds a test for it on every arena size.

## Already done in the base (lead)

- `viewShort` default back to **400** (it was 1200, so the canvas drew less than one device pixel per logical pixel and
  every pixel-art element turned thin and grey). This is the main reason the theme looked broken.
- `TRACKS = [{id:'signature',…},{id:'oval',…},{id:'eight',name:'Figure eight'}]` near `setTrack`. `setTrack(id)` accepts
  only those ids. `buildCourse(A, zones, id = SELECTED_TRACK)` takes the track id explicitly (the old `'club'` id is now
  `'eight'`, still drawn with the old club shape until r3-course replaces it).

Base revision: `tasks/handoffs/r3-base/dist/index.html` + `tasks/handoffs/r3-base/verify-current.cjs` (13 checks pass).
Note: the root `verify.cjs` is stale (it expects the old integer-scale view and fails at its check 21, which is unrelated
to this round). Use `verify-current.cjs` and add your new checks to it.

## Work rules

- Work only in `tasks/handoffs/<your-agent>/` (`dist/index.html`, `verify-current.cjs`, `HANDOFF.md`). Run
  `node tasks/handoffs/<your-agent>/verify-current.cjs`. Never edit `dist/` or the root scripts, `r3-base`, or another
  agent's folder.
- The lead merges with a 3-way line merge (`git merge-file`) against `r3-base`. So: **keep edits inside the regions you
  own; do not reformat, re-indent, reorder or re-wrap code you do not need to change**. Keep LF line endings. Put new
  functions next to your own region, not at random places. Add new tests at the END of `verify-current.cjs` under a
  comment line `// ==== Round 3 tests: <agent> ====`, before the final `e.setTrack('signature');console.log(...)` line.
- Keep the game a single self-contained file: no libraries, external assets, fonts or network requests. Two tones only
  on the canvas (INK `#30342d` / PAPER `#bfc1b1`, dithering for greys).
- Look at your result in the built-in browser: open
  `file:///C:/Users/dminh/OneDrive/Documents/ChatGPT/Portfolio/driving-mvp/tasks/handoffs/<your-agent>/dist/index.html`
  in **your own new tab** (`tabs_create`, then `navigate`; do not touch other tabs). Check a desktop size (e.g. 1600×800)
  and a phone landscape (844×390) and portrait (390×844). Check the console for errors. Reset the viewport afterwards.
- Finish with `tasks/handoffs/<your-agent>/HANDOFF.md`: what changed (functions/regions), tests added or replaced and
  why, results, known issues.

## Owners

### r3-course: tracks (owns `TRACKS`/`setTrack`/`buildCourse`, the legacy course helpers above it, `trackMarks`, `drawGround` except its "8-Bit Drift" line, the "sim + course" export line)

- **Signature**: same character, but its footprint a little smaller (about 80–85% of the free area, centred), so there is
  breathing room between the track and the screen edges and controls, and less empty space inside.
- **Oval**: keep, same smaller-footprint rule.
- **Figure eight** (`'eight'`, replaces the club circuit): a proper figure-eight lane like the original course from
  `tasks/handoffs/base/index.html` (`fitEight`, `eightCones`): two loops crossing once in the middle. The gate must sit
  on a straight-ish part away from the crossing; spawn before the gate facing through it; cones on the outsides of the
  loops, never on the lane. Lane edges and the dotted centre guide as on the other tracks (at the crossing the lines may
  simply cross).
- All three: lane stays clear of every control zone (`keepOuts`) and the edge strip at the 400-short-side view on desktop
  (e.g. arenas from `computeView(1600,800,1)`, `computeView(1920,1080,1)`, `computeView(1366,768,1)`) and phones
  (`computeView(844,390,3)`, `computeView(390,844,3)` with the mobile arena flags the page sets). Deterministic.
- Leave a clear area for the title paint: export `titleSpot(layout, A)` → `{l, t, r, b}` screen-px rect (or `null`)
  inside the arena that the lane does not cross, ideally inside a loop's infield, at least ~150×30 px when the arena
  allows. r3-paint will draw "8-BIT DRIFT" there; until merge, r3-paint uses its own fallback.
- Update/replace the track tests (`signature`/`oval`/`eight` in `verify-current.cjs`); add tests for the figure-eight
  (crossing exists, gate away from crossing, lane clear of zones) and for `titleSpot`.

### r3-ui: page, controls, settings (owns HTML, CSS, `uiMetrics`, `controlZones`, `computeView`, the `view`/`wheel` TUNING_SPEC lines, everything in the browser section except `canvasTextMask`/`buildGround`)

- **Track picker**: replace the `<select id="track-choice">` in Settings with three buttons in a row, each a small
  pixel-art picture of that track (a `<canvas>` rendered from `buildCourse({W,H,E:…}, [], id).track.pts` drawn in the
  two inks, plus a short name under it), `aria-pressed` like the car chooser, keyboard-accessible. Read ids and names from
  `TRACKS` only (the figure-eight shape changes in another agent's copy; your code must not depend on the shape).
  Choosing one calls `setTrack(id)`, resets, rebuilds the ground, and re-renders the thumbnails' selected state.
- **Gear shift indicator**: remove the "UP E / Q DOWN" / "SHIFT UP" text cue (`#stick-cue`). Instead show small 2.5D
  keycap-style indicators in the same look as the painted keycaps at top left (light face, ink outline, extruded ink side
  toward the bottom-right, heavy italic letter): an **E with an up arrow** above the stick and a **Q with a down arrow**
  below it (or both stacked at one side if space is tight). No words. When the game recommends shifting up
  (`gearTelemetry(world).shiftUp`), the up indicator pulses/inverts so it reads as "shift up now"; same for down if there
  is a matching telemetry flag. Must not overlap the stick or pedals at desktop and phone sizes.
- **Speed readout** (top left): make sure it shows the big striped italic number like the reference ("0 KM/H", with the
  gear on the Supercar) at the new 400 view on desktop and phones; it must not be tiny.
- **"PAUSED · PRESS W TO DRIVE" box** and other DOM text (HUD, settings panel headings): restyle in the game's theme
  (heavy italic "Arial Black" capitals like the speed readout, two inks), not Courier.
- Keep the Settings panel usable on an 844×390 phone. Add tests for any pure helpers you add.

### r3-paint: ground paint (owns `GROUND_TEXT`/paint pure functions `PAINT_*`…`drawPaint`, `canvasTextMask`, `buildGround`, the "8-Bit Drift" line in `drawGround`, the "ground paint" export line)

- **Instructions**: `buildGround` currently paints plain monospace keycaps at 48% alpha. Restore the round 2 striped
  paint: `drawPaint(gc, A, zoneOf('instructions'), {touch:isTouch(), shift:<Supercar manual>, mask:canvasTextMask})`
  or equivalent, then tune it to match the user's reference: big 2.5D keycaps W (top), A S D (row), heavy wide italic
  striped letters, labels GAS (right of W), LEFT (left of A), RIGHT (right of D), BRAKE (under S). Opaque two-tone pixels.
  Check it at the new 400 view on desktop (keyboard) and that the touch line still works on phones.
- **Title**: remove the monospace "8-Bit Drift" line from `drawGround` and paint "8-BIT DRIFT" in the same striped heavy
  italic lettering (bigger than the labels). Place it with `titleSpot(layout, A)` if that function exists
  (`typeof titleSpot==='function'`), otherwise with your own fallback that finds a rectangle the lane (`layout.track.pts`
  ± `layout.track.half`), the control zones and the instructions do not touch. Never drawn on the lane. Skip it if no
  spot fits.
- Add tests for any new pure layout functions (title fits its box, never overlaps the lane for each track id).
