# r3-course handoff

> **Historical record — current baseline updated October 29, 2026.** Archived agent handoff for its named stage. Its source snapshots, ownership rules, defaults, and successful check counts apply only to that snapshot; they are not the current implementation or QA result. Read [Current game state](../../CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

Base: `tasks/handoffs/r3-base` (dist/index.html + verify-current.cjs). Files: `dist/index.html`, `verify-current.cjs`.
`node tasks/handoffs/r3-course/verify-current.cjs` → **20 current-feature checks passed** (~11 s; the new track checks do ~45 layouts).

## What changed (dist/index.html)

All diff hunks vs r3-base:

| Line (base) | Change |
| --- | --- |
| 201 | `viewShort` spec line → exactly `{key:'viewShort',group:'view',label:'Zoom out',unit:'px',min:300,max:1000,step:25,def:750}` (identical to the lead's text) |
| 590–605 | `let unusedTrackDeclaration;` and the old `buildCourse` body replaced by the round 3 track code (below). The `function buildCourse(A,zones,id=SELECTED_TRACK){` line itself is unchanged. |
| 1077 | `uiMetrics`: `spW:Math.round(4.2*b)`. This is r3-ui's identical text, copied only so I could test against the wider speed zone. |
| 1540 | "sim + course extra exports" line: adds `TRACK_SHAPES,TRACK_HALF,TRACK_FILL,shapeUnit,trackSelfClear,insideLoop,titleSpot,trackRadiusOk,TRACK_MIN_R` |

`TRACKS`, `setTrack`, `layoutCourse`, the legacy helpers (`fitTrack`, `legacyBuildCourse`, …), `trackMarks` and `drawGround`
are unchanged. The "8-Bit Drift" line in `drawGround` is untouched, so r3-paint owns it.

### New track code (between `legacyBuildCourse` and the ground layer)

- `TRACK_SHAPES`: `signature` (new control points; same character: long bottom straight, big right sweeper, top-left
  sweep into a hairpin, inner loop, and the diagonal with the gate), `oval` (unchanged points), and `eight` (lemniscate,
  two loops crossing once in the middle, like the original course's `fitEight`).
- `shapeUnit`: dense centreline in a unit box. It uses centripetal Catmull-Rom, which avoids the cusps and loops the old
  uniform spline made at the bottom corners.
- `buildCourse(A, zones, id)`: `trackGrid` finds the free lane-centre spots. These clear the edge strip, and every zone grown
  by `TRACK_ZONE_GAP` = 10 px, by the half lane plus 6. `fitShape` searches proportions (12% steps) and both orientations
  (transposed on portrait), and bisects for the largest box. It then lays the shape out at `TRACK_FILL` = 0.83 of that box
  around the same centre, or at the next larger step (.87 … 1) if the lane would overlap itself or bend too tightly.
  - Lane parts must stay ≥ 2·half + `LANE_GAP` apart (`trackSelfClear`). The eight's crossing is exempt within 1.25 lane
    widths.
  - Every bend needs a radius ≥ half + 2 (`trackRadiusOk`).
  - The posts must be off the lane and off the zones, and the whole spawn car box must be clear of the zones (`gateOk`).
  - Fallback chain: signature → oval, eight → oval, then a centred oval that ignores the zones (`kind:'fallback'`).
- Gate and spawn (`trackGate`):
  - Signature: the gate is at a fixed point on the diagonal.
  - Oval: the gate is in the middle of the top straight.
  - Eight (`eightGate`): the straightest stretch at least 2.5 lane widths + half from the crossing, with posts and spawn
    clear.
  - The spawn is 70 units back along the centreline, facing the middle of the gate.
- Cones, spaced every ~length/18 at half + CONE_R + 4 off the centreline:
  - Signature and oval: on both sides of the lane.
  - Eight: only on the outside of the loops, and not near the crossing.
  - All tracks: never on any lane part, a zone, the edge strip, the gate approach or the spawn, and never touching each other.
- Layout fields: same as before (`cones, parking:[], spawn, gate{x,y,width,height,a,rotation,lane,posts}, track{kind,half,
  pts,length,straight,box}`), plus `track.id` (requested id), `track.cross` (`{x,y}` world units for the eight, else `null`)
  and `track.box.o`.
- `titleSpot(layout, A)` → `{l,t,r,b}` screen px, or `null`:
  - The rect is 5:1 and at least 100×20 px. Its height is capped at 8% of the arena's short side (300×60 at 750).
  - No lane (± half + 8), gate (posts plus arch above them), cone, spawn car, edge strip or `keepOuts(A)` zone (+4 px)
    touches it. It reads the zones from `A` itself.
  - It prefers a loop's infield and is placed where it has the most room around it.

## Tests (verify-current.cjs)

- **Replaced** the old `<id> circuit has two usable lanes and mobile clearance` line. Its mobile check used a synthetic
  650×1400 arena with mismatched UI numbers and only checked "bottom < H − 416". The new version, `<id> track has two usable
  lanes on desktop and phone arenas`, uses real page arenas (1600×800 desktop, 390×844 phone). It keeps the lane width,
  point count, length and gate width checks, and adds kind === id.
- **Added** under `// ==== Round 3 tests: r3-course ====` (arenas built like the page: computeView + safe/uiU/uiW/uiH/mobile;
  views 1600×800, 1920×1080, 1366×768 desktop; 844×390, 390×844 phones at dpr 3):
  1. At 750 every track is the chosen shape, and its lane band clears the edge strip and every zone (instructions, wheel,
     gear included) by ≥ 8 px.
  2. At 400 and 1000 the lanes still clear everything by ≥ 4 px (oval fallback allowed at 400). At 1000 every track is the
     chosen shape.
  3. At 400, 750 and 1000:
     - No self-overlap: parts more than 2 lane widths apart along the lane keep ≥ 2·half + 8 apart. The eight is exempt
       only near its crossing.
     - No bend is tighter than the half lane.
     - Signature and oval have zero centreline crossings.
     - The eight has exactly one crossing, at `track.cross` in the middle of its box, with two loops (an infield point in
       each half).
  4. Gate:
     - It sits on the centreline, on a straight-ish part (heading change < 0.5 rad over ±60 units).
     - On the eight it is ≥ 2 lane widths from the crossing.
     - Posts are off the lane.
     - The spawn is ~70 back on the centreline, faces the gate, and points in the lane direction.
  5. Cones: ≥ 12 per track, off every lane part, outside the zones, and outside the eight's loops.
  6. Determinism (same JSON twice), `setTrack('club') === false`, and the zone-less thumbnail call
     `buildCourse(A,[],id)` still gives each id its own shape.
  7. `titleSpot`:
     - Returns null for no layout.
     - At 750 on all 5 views and 3 tracks: ≥ 150×30 px, inside the edge strip, off the zones, more than half a lane from
       every centreline point, and clear of cones, posts and spawn.
     - On desktop its centre is inside a loop's infield.

## Results

- 20/20 checks pass.
- Scratch check against **r3-ui's zones** (their `keepOuts` with the 4.2·b speed zone and the wider phone gear zone), at
  zooms 400/600/750/1000 on all 5 views. The smallest lane-to-zone gap was the same as or within ~16 px of my own zones,
  and never below 14 px. At 750 it is ≥ 40 px everywhere. The title rect never overlapped an r3-ui zone.
- Browser check (own tab, file URL), 1600×800, 844×390 and 390×844:
  - The canvas shows the new signature. The eight and oval were also checked by adding an `eight` option to the old
    `<select>` in the DOM only; the file was not edited.
  - No console errors.
  - The pane was hidden, so screenshots timed out. I read the canvas back as ASCII thumbnails instead, and they match the
    Node layout renders.
  - The viewport was reset afterwards.

## Known issues / notes for merge

- **Signature needs zoom ≥ ~600** to fit between the controls without overlapping itself. Below that, it falls back to the
  oval (`track.kind === 'oval'`, `track.id === 'signature'`). The eight works down to ~400. At 300 everything is the oval.
- **Layout cost**: 30–300 ms per arena (cached per arena and zone set). r3-ui's thumbnails call `buildCourse` 3× more
  without zones at start-up.
- r3-base's `<select id="track-choice">` still offers `club`. `buildCourse` maps unknown ids to `signature`, so it does not
  crash. r3-ui replaces the select.
- The lane half-width is fixed at 34 world units at every zoom (sized to the cars). At high zoom the track grows relative to
  the cars, because it is fit to the free area.
- The eight's crossing lands exactly on a centreline vertex on some arenas; the test handles that. `trackMarks` simply
  draws the crossing lines over each other, as the brief allows.
