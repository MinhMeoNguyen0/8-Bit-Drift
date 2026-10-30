# r3-paint handoff (round 3: ground paint)

> **Historical record — current baseline updated October 29, 2026.** Archived agent handoff for its named stage. Its source snapshots, ownership rules, defaults, and successful check counts apply only to that snapshot; they are not the current implementation or QA result. Read [Current game state](../../CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

Base: `tasks/handoffs/r3-base`. Files: `dist/index.html`, `verify-current.cjs` (LF line endings throughout).
`node tasks/handoffs/r3-paint/verify-current.cjs` → **23 checks pass** (13 base + 10 new).

## What changed (`dist/index.html`)

- **Zoom spec line** (lead's mid-round update): `viewShort` is now
  `{key:'viewShort',group:'view',label:'Zoom out',unit:'px',min:300,max:1000,step:25,def:750}`. r3-ui owns this line, and their
  copy should have the identical edit.
- **`drawGround`**: only the monospace `"8-Bit Drift"` `fillText` line is removed. Nothing else in that function changed.
- **`buildGround`**: the 48%-alpha monospace keycaps are gone. It now calls
  `drawPaint(gc,A,zoneOf('instructions'),o)` and `drawTitle(gc,A,world.layout,o)` with
  `o={touch:isTouch(),shift:!!world.manual,mask:canvasTextMask,px:paintPx(view.u)}`. Everything it paints is opaque INK.
- **Paint region (`PAINT_*` … `drawPaint`)**:
  - Stripes are now 2 ink rows and 1 paper row (`PAINT_STRIPE=3`), like the CSS stripes on the speed readout. They are
    counted from each item's top row. `stripeH(v)` picks heights whose top and bottom rows are both ink.
    `PAINT_KEY_SOLID_BELOW` is now 9, so the letters on the keys are striped as well.
  - `keycapRuns(x,y,w,h,d,out,t=1)`: optional outline thickness. Keys with `k>=30` get a 2 px outline. With `t=1` the
    output is byte-identical to round 2 (tested).
  - `paintLayout` keyboard board: faces are almost square (`kh=.9k`), the extrusion is deeper (`k/6`), and the gaps are
    tighter. Label height is about `.36k`. The search tries the reference arrangement `'side'` (GAS right of W, LEFT left of A,
    RIGHT right of D, BRAKE under S) at every key size before `'under'`, then `'bare'`. Keys go up to 64 px.
    The Supercar still gets Q/E with DOWN/UP and GAS above W. The touch-line loop uses stripe-friendly heights.
  - `paintRuns(A,zone,o)` takes `o.px`, the size of one paint pixel in ground px. The layout is made on a grid that is `px`
    times coarser. The new `scaleRuns` then clips it and expands it into 1-row ground runs.
- **New pure functions** (right after `drawPaint`): `PAINT_PX_CSS`, `TITLE_*`, `paintPx(u)`, `titleFit`, `titleFallbackSpot`,
  `titleRuns`, `titleRect`, `drawTitle`.
  - `paintPx(u)=max(1,round(1.2/u))`: 1 on desktop at the 750 view (≈1.07 CSS px per ground px), 2 on dense phones (u≈.52).
    Stripes therefore never get thinner than about 1 CSS px.
  - `titleRect(layout,A,o)` uses `titleSpot(layout,A)` when `typeof titleSpot==='function'` (r3-course). Otherwise it uses
    `titleFallbackSpot(layout,A,zones,ar,maxH,minH)`.
  - The fallback searches a grid of 4 px cells. It blocks the lane (centreline ± half + 8 px gap + cell slack, in world
    units, with screen y = world y × K), every `keepOuts(A)` zone + 8 px, the arena edge (16 px), the cones and the gate.
    A summed-area table then finds the tallest free rect with the title's aspect. Ties go to the rect nearest (W/2, 0.6·H),
    which keeps it clear of the paused "PRESS W" box in the centre. It returns `null` when nothing ≥ minH fits, and then the
    title is skipped.
  - `titleRuns` fits the biggest "8-BIT DRIFT" into the rect (height ≤ `TITLE_MAX`=44 paint px, ≥ `TITLE_MIN`=11),
    centred, striped, on the px grid.
- **Exports**: the new names are on the "ground paint extra exports (r2-paint)" line.

## Phones and touch (decision)

On touch, `controlZones` makes the instructions zone empty (`mobile` ⇒ `i.r=i.l`), so `paintRuns` returns `[]` and phones get
**no painted instructions**. The wheel, the pedals and the "TAP GAS…" entry box already explain the controls. The touch-line
code path (`o.touch`) still works for any non-empty zone. Phones do still get the painted title, at px=2.

## Tests added (`// ==== Round 3 tests: r3-paint ====`)

1. `paintPx` values and guards.
2. Stripe pattern (2 ink / 1 paper, top and bottom rows inked; `stripeH`).
3. `keycapRuns`: unchanged with a 1 px outline (compared against an inline copy of the round 2 function), and a valid 2 px ring.
4. Desktop 750-view layout (1600×800, 1920×1080, 1366×768): `'side'` arrangement, W above S, every label in its reference
   spot, keys ≥ 30 px, letters and labels striped, labels smaller than the key letters, Supercar Q/E fits.
5. px-grid runs stay inside the zone and are px-aligned. Empty and tiny zones paint nothing.
6. `titleFit` sizes and null cases.
7. to 9. For each track id (`signature`, `oval`, `eight`) on 1600×800, 1920×1080 and 1366×768 at 750, 1600×800 at 400, and
   the phones 844×390@3 and 390×844@3: a spot is found and is deterministic, inside the arena and ≥ 150×24, clear of every zone,
   off the lane (sampled distance ≥ gap), and clear of the cones. Every title ink run is inside its rect and off the lane, and
   the title is taller than the labels.
10. The title is skipped when no spot fits. `drawGround` no longer calls `fillText`. `drawPaint` and `drawTitle` only use the
    INK colour.

## Browser check

I checked `file:///…/r3-paint/dist/index.html` in my own tab:
- **1600×800**: Compact and Supercar, signature, oval and eight tracks.
- **844×390**: Compact and Supercar.
- **390×844**: mobile emulation (touch), where no instructions are painted and the title sits off the lane.

Zoomed crops matched the reference: big 2.5D keycaps with a light face, ink outline and a solid ink extrusion to the
bottom-right; heavy, wide, italic striped letters; striped GAS/LEFT/RIGHT/BRAKE labels; a large striped "8-BIT DRIFT" in
the infield. No console errors. Changing the car rebuilds the ground in about 20–30 ms. I reset the viewport and closed the tab.

## Known issues / for the lead

- **Course overlaps the instructions (r3-base / r3-course)**: at 1600×800 and 844×390 (750 view), the signature, oval and
  eight lanes run *through* the instructions zone. The centreline comes within 0 px of the zone, and the lane edges cross the
  RIGHT/BRAKE labels. The lane also passes within half a lane of the wheel and gear zones. This is not in my code, but r3-course
  should keep the lane clear of `instructions`.
- When `titleSpot` arrives, `titleRect` uses its rect as given and fits the title inside it. If it is small (e.g. 150×30),
  the title will be about 29 px tall.
- The title rect from `titleSpot` is trusted to avoid the instructions, the controls and the cones. My fallback avoids them
  explicitly.
- Downscaled screenshots alias the 1-px stripes (the title can look broken in a thumbnail). At real size it is clean.
