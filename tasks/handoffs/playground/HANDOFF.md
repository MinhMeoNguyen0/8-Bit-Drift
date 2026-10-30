# Agent 2 (playground): stage 3 handoff

> **Historical record — current baseline updated October 29, 2026.** Archived agent handoff for its named stage. Its source snapshots, ownership rules, defaults, and successful check counts apply only to that snapshot; they are not the current implementation or QA result. Read [Current game state](../../CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

## Tasks 07 (drivable half-ring gate and shadows) and 09 (skid marks with delayed wrap)

**Base revision:** `tasks/handoffs/base/index.html` (sha256 `cf24b69f5d58…`) and `tasks/handoffs/base/verify.cjs` (`5da81276d8de…`), the integrated stage 2 game.
**Patch location:** `tasks/handoffs/playground/index.html` and `tasks/handoffs/playground/verify.cjs`. Get the diff with `git diff --no-index tasks/handoffs/base/index.html tasks/handoffs/playground/index.html`. That's +137 / −30 in the HTML and +194 / −4 in the tests. Both files use LF line endings. Nothing outside this folder was touched.

**Tests:** `node tasks/handoffs/playground/verify.cjs` passes **72 checks** in about 21 s (61 at the start, 11 new). I changed 3 lines of my own stage 2 tests (see below). I did not edit any other agent's tests.

**Browser:** I used my own new tabs and closed them afterwards. To place the car I used a temporary debug copy of the page with a `window.__dbg` hook. I deleted it afterwards, and it is not in the patch.
- **Gate, magnified 4–6×:**
  - It reads like the reference: a dark, thick, rounded upright arch with a dithered top.
  - The dotted shadow falls down-right from the legs and forms a band in front of the gate.
- **Van at three depths:**
  - Behind the gate: the beam covers its middle and only the roof tip shows above it.
  - Straddling the gate line: it is mostly under the beam.
  - In front: the car is drawn over the legs, and the beam never covers it.
- **Skid marks:** these are dotted, broken curves with tread pixels, similar to `rranot.png`.
- **Mobile preset (250×542):** the gate moves with the new layout and the sprites are reused.
- No console errors.

---

### Hook for Agent 3 (car drawing and roll frames)

- **`carDrawable(w, alpha)`** (pure, exported) is the only place the car's draw item is built:
  - it returns `{type:'car', x, y, a, roll, frame, box, key}`;
  - `roll = c.roll || 0`, `frame = frameIndex(a, FRAMES)`, `box = carScreenBounds(p, a, roll)` (used for culling);
  - add your roll-frame fields here.
- **`drawCarItem(o, layer)`** (browser) draws one layer, `'shadow'` or `'car'`. Today it is `drawCar(ctx, world.id, layer, o.frame, o.x, o.y)`; switch it to your roll sheets.
- `drawShadow` and `drawItem` call it. Nothing else draws the car.

### Changed regions

| Region | Change |
|---|---|
| `coneShadowSprite(tipped=false, a=0)`, `CONE_H = 12` | **Cone shadows are redone** (§6, §11):<br>• Each is the hull of the cone's ground footprint plus its top, shifted by `LIGHT × height`, and filled with the shared `r.shadowPixel` (`SHADOW_INK`).<br>• There is an upright shadow and 16 tipped ones; a tipped cone uses its own lying footprint.<br>• `CONE_BOX` stays `{l:-7, t:-10, r:8, b:5}`. The new pixels measure `{-6, -9, 7, 4}`, plus 1 px of margin. The containment test now also covers the 16 tipped shadows. |
| `GATE_TOP_SHADE`, `GATE_SPLIT`, `GATE_FRONT`, `archShape(g)`, `inArch(s, x, z)`, `gateArt(g)` (new, pure) | **The gate** (details under "How the gate works" below). |
| `carDrawable`, `gateDrawables` (new), `sceneItems` | `sceneItems` returns the car (from `carDrawable`), the cones, and the gate's two drawables:<br>• `posts`, with `key = y`;<br>• `arch`, with `key = GATE_FRONT`.<br>Culling and cones are unchanged. |
| `drawGround` | The placeholder dashed threshold and post pads are removed. The gate's sprites and shadow replace them. |
| `SKID`, `createTrackRecorder`, `breakTracks`, `recordTracks(w, rec, plot, enabled, dt)` (new, pure) | **Task 09** (details under "How skid marks work" below). |
| Browser: `gateSprites(g)`, `uprightShade` / `tippedShades`, `drawCarItem`, `drawShadow`, `drawItem`, `draw()` | `draw()` follows the §6 order: ground, tracks, all shadows (car, cones, gate), then the sorted drawables. Gate canvases are converted once per `gateArt` object (WeakMap). |
| Browser: `trackRec`, `addTracks`, `clearTracks`, `resetTrackLayer`, `onModeChange`, the skid toggle | `previousWheels` is replaced by `trackRec`. `addTracks()` is now `trackPixels += recordTracks(world, trackRec, plotTrack, enabled)`, still called once per physics step. Every place that used to reset `previousWheels` now calls `breakTracks(trackRec)`. The semantics are unchanged:<br>• **toggle** hides the layer and pauses recording, keeps the marks, and sets `trackBreak`;<br>• **clear** empties the canvas;<br>• **reset and car change** clear the tracks;<br>• an **arena change** rebuilds (clears) the layer, while a scale-only change keeps it. |
| Exports | Added: `CONE_H, archShape, inArch, gateArt, GATE_SPLIT, GATE_FRONT, carDrawable, gateDrawables, SKID, createTrackRecorder, breakTracks, recordTracks`. |

### How the gate works (task 07)

**Geometry.** The arch is derived from `layout.gate`:
- Legs are the post colliders: columns `2r` wide and `2r` deep, centred on `posts[i]`.
- Inner opening: `gate.width` (56) wide and `gate.height` (26) high.
- Beam thickness: `2r`.
- Outer corner radius: 0.55 × outer half-width (20). Inner corner radius: 12.

**Rasterising.** It happens once per geometry (the cache key is post spacing, `r` and height):
- Each pixel takes the nearest surface along the view ray, across 33 depth slices.
- Front face: INK. Top and outer shoulders: a 25% paper dither, as the lit top.
- The shadow is an exact sweep, by `LIGHT`, of every arch point at every depth onto the ground, drawn with `shadowPixel`.

**The depth split.** A pixel at arch height `z_a` that overlaps a point of height `z_c` hides it exactly when `z_c < z_a` (the point is behind the plane). Pixels at `z ≥ GATE_SPLIT` (max roof + 2 = 20, which is below the 26 opening) are therefore drawn last, with `key = 1e9`. The rest (the legs) sort at the gate's ground line. Result:
- a car behind is covered by both parts;
- a car in front is drawn over the legs and is never reached by the arch top;
- a car mid-crossing has its rear roof hidden by the beam.

### How skid marks work (task 09)

**When the tyres mark.** The decision is per physics step, from the car's own state; it no longer reads `c.skidding`:
- **Slide:** lateral slip > 9 px/s **and** slip angle > 0.12 rad to start. To keep marking: slip > 6 and angle > 0.08.
- **Hard braking:** forward deceleration > 0.7 × `p.brake`.
- The car must be moving faster than 12 px/s.
- Calibration:
  - Cruising at 50–70 % speed with steering of 0.2–0.3, slaloms, straights and coasting from top speed make no marks for any car.
  - The old `c.skidding` drew on most of the coupe's gentle turns and on any brake touch.
  - Full-lock turns and hard stops mark for all three cars.

**What gets drawn.**
- Only the two rear tyres from `wheelPoints(w)` mark.
- A pixel is placed every 2 px of tyre travel, with a gap every 9th dot and a tread pixel beside every 3rd dot.
- Each pixel is clipped to the arena, so a tyre past the edge draws nothing and picks up again when it returns.

**What breaks a mark** (no segment ever crosses one):
- `w.trackBreak`, which is consumed here even while recording is off;
- recording switched off;
- `car.state` set and not `'driving'`;
- a tyre jump longer than `maxSeg` (12 px), as a safety net.

**Memory.** The recorder holds two points and a few numbers; the only retained memory is one arena-sized canvas.

### Tests

**New:**
1. **Gate sprites:**
   - two-tone and opaque;
   - cached: identical object across copies and across all 6 arenas;
   - the legs' ground row covers exactly `[post.x − r, post.x + r)` for both posts on every arena;
   - the inner opening and height match the layout, with no pixel inside the opening below the beam;
   - every roof + 6 ≤ opening height, and `GATE_SPLIT` > every roof.
2. **Fit and drive-through:**
   - Every car's sprite pixels, at headings of ±π/2 ± 0.2, stay inside the opening with 2 px to spare.
   - All cars, both directions, offsets of −4/0/4 px and heading errors of ±0.06 rad give runs **identical** to a run without posts, and the car gets through.
3. **Gate shadow:**
   - it uses exactly the shared 4×4 `SHADOW_INK` dither, with density ≈ 0.55;
   - it matches an independent forward sweep of the arch by `LIGHT` (both directions, ±1 px);
   - it starts at the legs, its depth is `rK + LIGHT.y × top height`, and it reaches far enough right.
   - Cone shadows (upright + 16 tipped) use the shared dither, and the upright tip lands at `LIGHT × CONE_H`.
4. **Depth:** 4 arenas × 3 cars × 4 headings × 3 offsets.
   - Wholly in front: order is legs, car, arch, and **zero car pixels under the arch**.
   - Wholly behind: the car is drawn before both parts.
   - Centred just behind the plane: the beam covers part of the car.
5. **Gate drawables:** they follow the layout and a resize, and reuse the cached art; no layout means no gate. `carDrawable` fields are checked, and the page source keeps the §6 draw order and the cached gate canvases.
6. **Skid thresholds:** gentle cruising, slaloms, straights and coasting make 0 pixels for every car; full-lock turns and hard stops make marks for every car.
7. **Marks:** both rear tyres mark; marks are dotted (well under one pixel per pixel of tyre travel); a sideways slide marks only at the rear axle.
8. **Edges and corners:** 4 edges + 4 corners × coupe/compact, 15 s of full-lock drifting across each.
   - Each step, every pixel lies within 1.8 px of **its own tyre's move this step**, inside the arena; segments are ≤ `maxSeg`.
   - The transfer step draws nothing, and marks resume after transfers.
9. **Partial exits** on all four edges, while sliding:
   - a tyre past the edge plots nothing away from itself;
   - both tyres go fully past;
   - marks resume on re-entry, with no transfer.
10. **Breaks:**
    - `trackBreak` and a 5 px jump: no line, the flag is consumed;
    - recording off: nothing is drawn, the flag is still consumed, and turning it back on draws no line across the gap;
    - each non-driving state: no marks and no line across;
    - `resizeWorld`: no line from the old arena.
11. **Bounded layer:**
    - 3 minutes of hard edge-crossing driving: every pixel in the arena, and the recorder state stays under 200 bytes;
    - page source: one arena-sized layer, clear/reset/car change/toggle semantics, the layer cleared on arena change, and one record per physics step.

**Updated (my stage 2 tests):**
- The page check now looks for `recordTracks(world,trackRec,` instead of the old `plotLine(from.x…` call.
- `sceneItems` "key = y" now exempts the gate's arch item.
- The `CONE_BOX` containment test now includes the 16 tipped shadows.

**Mutation check:** each mutation below makes the suite fail, as it should:
- no break on `trackBreak`;
- no clipping;
- arch `key = y`;
- gate shadow drawn with a 50% dither instead of `shadowPixel`;
- the old slip thresholds;
- ignoring `car.state`.

---

### Assumptions and contract notes

1. **§6 key for the arch top.** The arch item's key is `GATE_FRONT = 1e9`, not its ground y. The split rule above shows this is exactly right for anything up to `GATE_SPLIT` high. The legs keep `key = ground y`. The contract allows a back/front split; this is that split, cut by height instead of by depth.
2. **Rolling cars (Agent 3).** The split assumes no car point is above 20 world units while under the arch. Upright and upside-down cars are within that, since the van roof is 18. A car mid-roll can briefly reach higher. If it does so right at the gate, the beam may cover a pixel or two of a car that is slightly in front. Agent 3: if your roll frames go higher, tell me the maximum height. `GATE_SPLIT` reads it from one place.
3. **Skid emission no longer reads `c.skidding`.** It uses physical slip and deceleration from the car's velocity and heading, so it works whatever `drive()` does with `skidding`. `drive()` still sets `skidding`, and the HUD's "SIDEWAYS" status still uses it. Agent 1 and Agent 3 may keep or drop it.
4. **Hard braking is measured, not read from input.** The track code has no input, and analog braking needs a threshold, so it uses deceleration > 0.7 × `p.brake`. Full keyboard braking always marks; about 0.3 analog brake at top speed is the borderline.
5. **`trackBreak` consumer.** `recordTracks` consumes the flag every step, even with recording off. That matches §8 and the old `addTracks`.
6. **Cone shadows are subtle.** At `LIGHT = {.45, .3}` and a 12-unit cone, the shadow peeks out only 1–3 px down-right of the base, which is physically consistent with the car shadows. Raising `LIGHT` or `CONE_H` would make it more visible. That is a lead call, since `LIGHT` is shared.

### Known issues and untested items

- **Not tested live:** driving through the gate and across edges under real keyboard input, because `requestAnimationFrame` is throttled in the hidden pane. Placement and stepping used the temporary debug hook and Node.
- **No roll frames yet**, so depth with an upside-down car is covered only by the height argument in note 2.
- **`gateArt` first call** takes about 80 ms under node:vm, because of the shadow sweep; it runs once, at the first draw. In the browser it is shorter but not measured. Could be precomputed at idle if needed.
- **Car shadows under the arch.** The posts are drawn as square columns, while the collider is a circle of radius 4. A car brushing a post corner may show a pixel of overlap between its own shadow and the post. This is cosmetic.
