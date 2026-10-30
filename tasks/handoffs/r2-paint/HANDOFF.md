# r2-paint handoff: ground-painted instructions (ROUND2.md requests 14 to 16)

> **Historical record — current baseline updated October 29, 2026.** Archived agent handoff for its named stage. Its source snapshots, ownership rules, defaults, and successful check counts apply only to that snapshot; they are not the current implementation or QA result. Read [Current game state](../../CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

## What changed (`dist/index.html`)

1. **Painted-text block** (the old `GROUND_TEXT … drawGroundText` region, just after `uiMetrics`). I replaced it with the new painter. Everything in it is pure and Node-testable. It returns INK runs `[x, y, length]`.
   - `PAINT_SLANT=.5`, `PAINT_STRIPE=2`, `PAINT_SOLID_BELOW=9`, `PAINT_KEY_SOLID_BELOW=15`.
   - `PAINT_COPY`: GAS, BRAKE, LEFT, RIGHT, DOWN, UP. The touch lines are `DRAG WHEEL TO STEER` and `HOLD PEDALS`. On the Supercar, touch adds `MOVE STICK TO SHIFT`. There are no `·` separators, and the `·` glyph has been removed from the font.
   - `GLYPHS` is still there (the 3×5 font). `glyphMask(text,h)` is the deterministic fallback mask (used by Node, or by a browser with no canvas text): the 3×5 font scaled up and made heavy.
   - `shearMask(mask)` makes the italic. Row y moves right by `floor((h-1-y)·0.5)`. Text heights are odd, so each ink stripe steps 1 px, like the reference.
   - `maskRuns(mask,ox,oy,out,stripe)` paints only every 2nd **absolute** ground row. The stripe phase is tied to the ground, and every item's top row is placed on an even row.
   - `keycapRuns(x,y,w,h,d)` draws a 2.5D keycap. The top face has a 1 px outline and rounded corners. The extruded side is solid ink, d px toward the shadow side (down-right, §6).
   - `wrapPhrases`, `paintLayout(zw,zh,{touch,shift,mask})` → `{items,w,h,mode}`.
     - Keyboard: W sits above S, and A S D sit in a row. On the Supercar (`shift`), Q and E sit in the top row at their real keyboard positions, with the top row offset left by p/4. Two label arrangements are tried:
       - `side`: LEFT/RIGHT beside A/D, BRAKE under S, GAS right of W (above W on the Supercar), DOWN/UP beside Q/E.
       - `under`: LEFT BRAKE RIGHT under the keys.
     - It picks the biggest key size (40 down to 14) at which labels fit without touching. If none fits, it falls back to bare keys (40 down to 8).
     - Touch: the largest odd text height (25 down to 5) whose word-wrapped lines fit.
   - `paintRuns(A,zone,o)` centres the layout in the zone (top snapped to an even row) and clips every run to the zone and the arena. Text shorter than 9 rows, and keycap letters shorter than 15 rows, are painted solid instead of striped, because single striped letters on small keys were illegible in the browser.
   - `drawPaint(gc,A,zone,o)` does `fillRect(x,y,n,1)` with `ink` only and returns the run count.
2. **Browser section**: `buildGround` (my region) and the new `canvasTextMask(text,h)` just above it.
   - `canvasTextMask` uses a heavy face: `900 "Arial Black"`, or bold Arial thickened by 1 px when Arial Black is missing (it detects this by measuring). The size is set so that the cap height equals h. It is drawn into an offscreen canvas stretched 1.2× wide, then thresholded at alpha ≥ 128 into a 1-bit mask, cropped and cached. If anything throws, it uses `glyphMask`.
   - `buildGround` calls `drawGround(...)`, then `drawPaint(gc,A,zoneOf('instructions'),{touch:isTouch(),shift:world.id==='coupe',mask:canvasTextMask})`.
3. **Export line** (ground paint, r2-paint) is now `{PAINT_SLANT,PAINT_STRIPE,PAINT_SOLID_BELOW,PAINT_KEY_SOLID_BELOW,PAINT_COPY,GLYPHS,glyphMask,shearMask,maskRuns,keycapRuns,wrapPhrases,paintLayout,paintRuns,drawPaint}`. Removed from it: `GROUND_TEXT, TEXT_ROWS, TEXT_LINE, textWidth, groundTextLines, textBlock, drawGroundText`. Nobody else used them, and they are only on my line.

Nothing outside these regions was changed. The diff against r2-base has 4 hunks, all in my regions. CRLF is kept.

## Tests (`verify.cjs`): 104 pass (99 base + 5 new)

- **Replaced one assertion** in `page: accessible HUD, settings dialog, controls and painted-text fallbacks`. It said `!/fillText/`, which encoded the old "no canvas text API" design, and ROUND2 #14 now asks for canvas text. The new check: `fillText` appears exactly once, inside `canvasTextMask`, and is thresholded (`>=128`). The DOM-legend test (`tutorial: each key has its own label…`) belongs to r2-ui and is untouched. r2-ui removes the overlay, so that test is theirs to rewrite.
- **New tests** (r2-paint section):
  - masks, shear and stripes;
  - the keycap 2.5D extrusion;
  - keyboard layout geometry: W above S, A S D in a row, labels, Q/E only on the Supercar, the touch line, and the stick line on the Supercar;
  - every zone from 120×50 to 260×140 (plus 300×90 and 130×140), for touch/keys and shift/no shift: it fits, always shows the four keys, paints inside the zone, is deterministic and degrades gracefully. A tiny zone paints nothing, and a zone hanging over the arena edge is clipped;
  - `drawPaint` paints INK only, as 1-px-tall runs, and `buildGround` is wired correctly.

## Browser check

I checked in a temporary hacked copy (deleted): zone set to 0.6 × 0.3 of the short side, `viewShort` 400, and the DOM legend hidden.
- **1280×720**: keyboard and Supercar keycaps.
- **844×390**: keyboard, plus touch forced on (the Supercar's 5 lines).
- **390×844** with mobile emulation: real `isTouch()`, "DRAG WHEEL / TO STEER / HOLD PEDALS".
- **The real file at the current base zone (150×52)**: small keys with solid letters and solid labels.

No console errors. It is legible and chunky, and the big text matches the reference stripe look.

## Known issues / notes for the lead

- **Q/E labels.** On the Supercar they read "DOWN" / "UP" (beside or above Q / E), not the word "SHIFT", because "SHIFT" did not fit per key. The touch Supercar line does say "MOVE STICK TO SHIFT".
- **Car changes.** r2-ui must call `buildGround` again on car change (ROUND2 #12). The base only rebuilds when zones, touch or arena change.
- **Course lines.** The current figure-eight course runs through a larger instructions zone. r2-sim's `keepOuts` (which uses `controlZones`) will handle this once r2-ui enlarges the zone.
- **Fonts.** Font rendering differs by platform. iOS has no Arial Black, so it uses bold Arial + 1 px. The layout measures real masks, so it still fits. Tests use the deterministic `glyphMask`.
- **R RESCUE.** It is not painted (it was optional).
