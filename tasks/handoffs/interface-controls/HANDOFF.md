# Agent 1 handoff — stage 3 (right-the-car control, integration fixes, accessibility/mobile pass)

> **Historical record — current baseline updated October 29, 2026.** Archived agent handoff for its named stage. Its source snapshots, ownership rules, defaults, and successful check counts apply only to that snapshot; they are not the current implementation or QA result. Read [Current game state](../../CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Base revision:** the integrated stage 2 game: `tasks/handoffs/base/index.html` (md5 `c4aac22695080f4099d0239d51ae4d90`, same as `dist/index.html`) and `tasks/handoffs/base/verify.cjs` (61 checks).
**Patch:** `tasks/handoffs/interface-controls/index.html` and `verify.cjs`, LF line endings. Diff with
`diff -u tasks/handoffs/base/index.html tasks/handoffs/interface-controls/index.html`.

I did not edit `drive`, `step` (only a comment line after it), car state, `carScreenBounds`, sprites, `sceneItems`, `drawOrder`, `draw`, gate art, `addTracks`, `plotLine`, `drawGround`, `layoutCourse` or `keepOuts`.

## What Agent 3 must provide (exact names)

- **`canRecover(w)`**: a function declaration in the pure section, returning a real boolean. The UI shows the button only when the result is `=== true`. It is called once per animation frame while running, and on every mode change, resize or reset, so it must be cheap.
- **`recover(w)`**: a function declaration in the pure section. It takes only the world, so it cannot reach the input module. The UI releases the inputs itself.
- I left a marker comment where they go: `// TEMP (Agent 1, stage 3): Agent 3's canRecover(w) and recover(w) ... are declared here.` It sits right after `step()`.
- The page reaches them only through this adapter in the browser section:
  `const recoveryApi={can:w=>typeof canRecover==='function'?canRecover(w)===true:false,run:w=>{if(typeof recover==='function')recover(w);}};`
  - Before the merge, `typeof` reads `'undefined'` and never throws. The button stays hidden and R does nothing.
  - After the merge, nothing in my code has to change.
- Agent 3 should add `canRecover` and `recover` to `module.exports` for their own tests. My tests use a fake api and do not need them.

## Changed regions and functions

### 1. "Right the car" control (task 11 UI, contract §4 and §12)

**Pure, exported**
- `recoverAvailable(api, w, mode)` is true only if `mode !== 'menu'` and `api.can(w) === true`. Both `running` and `paused` qualify.
- `tryRecover(api, w, mode, controls)` does nothing unless `recoverAvailable` is true. Otherwise it:
  - calls `controls.releaseAll()`, then `api.run(w)`, then `releaseAll()` again;
  - resets `car.px/py/pa` to the current `x/y/a`;
  - sets `w.trackBreak = true`.
  It never changes the mode: recovering while paused stays paused. It returns whether recover ran. The interpolation reset and `trackBreak` repeat what §4 asks of `recover()`, so they are harmless if Agent 3 does them too.
- `isRecoverKey(ev)` matches physical `KeyR` on any layout, or the character `r`/`R` when no code is reported. It rejects auto-repeat, IME composition and Ctrl/Cmd/Alt chords, so Ctrl+R still reloads. Shift and Caps Lock still count.
- `recoverFromKey(ev, mode, focusOwnsKeys)` combines `isRecoverKey` with "not in the menu" and "focus does not own the keys".

**Zone:** `controlZones` now returns a fifth rect, `{id:'recover'}`, **appended last**. The first four keep their order and positions.
- It sits on the HUD's row, just left of the HUD (`r = hud.l - UI_GAP`), one HUD button tall and `uiMetrics(S).recW = round(2.6 b)` wide.
- If that row is too narrow it falls back to the space under the HUD, right-aligned. No tested device needs the fallback.
- That top band is mostly inside the edge strip already, so **reserving it changes no course layout**: figure sizes are identical with and without the zone on every arena I checked.
- `keepOuts(A)` picks it up automatically, so cones, spawn and Agent 3's recovery spot stay off it.
- Values:
  - 1366×768@1: `{"l":211,"t":4,"r":294,"b":36}`
  - 375×812@2: `{"l":11,"t":4,"r":92,"b":35}`
  - 844×390@1: `{"l":236,"t":4,"r":298,"b":28}`

**Markup and CSS**
- `<button class="ui-box recover" id="recover" type="button" hidden aria-label="Right the car" aria-keyshortcuts="R">`, placed in the DOM between the HUD and the settings panel. Tab order: canvas › 3 car buttons › settings › **Right the car** › wheel › brake › gas.
- Ink background with paper text, a code-drawn circular-arrow SVG icon (capped at 24 CSS px), and a two-line label "RIGHT / THE CAR".
- A `<kbd>R</kbd>` hint, hidden on screens with no fine pointer (`@media not all and (any-pointer:fine)`).
- `.recover[hidden]{display:none}` is required, because `display:flex` would otherwise override the attribute.

**Browser behaviour**
- `syncRecover()` shows or hides the button exactly while `recoverAvailable(recoveryApi, world, mode)` holds.
  - It runs every animation frame and on mode change, `applyView` and `reset`, and writes the DOM only on change.
  - When the button appears it announces "The car is stuck. Press R or use the Right the car button."
  - If the button had focus when it hides, focus moves to the canvas.
  - It also sets `#playground[data-recover]` for QA.
- `doRecover()` runs `tryRecover`, drops any stale wheel drag, resets the accumulator and wheel-track continuity, redraws and announces **"Car righted."** through the existing `#announcement` live region. A new `say()` helper appends a no-break space when the same text repeats, so screen readers announce it again.
- The button's click calls `doRecover()`.
- The window `keydown` checks `recoverFromKey(event, mode, ownsKeys(document.activeElement))` right after the Escape handling, and calls `preventDefault` only if a recovery ran.
- While the menu is open the button is hidden (the panel covers its area anyway) and R is ignored. Reset scene in the settings panel is unchanged.

### 2. Integration fixes from my stage 2 known issues

**Arrow keys and A/D are independent**
- `createControls` has four new key slots: `arrowLeft`, `arrowRight`, `pedalGas` and `pedalBrake`.
- `sample()` merges them: steering is `(d||arrowRight) - (a||arrowLeft)`, throttle is `max(w||pedalGas, touch)` and brake is `max(s||pedalBrake, touch)`.
- `holdKeys` maps arrows on the focused wheel to the arrow slots, and Space/Enter on the focused pedals to the pedal slots. Releasing an arrow, or Space on the gas pedal, no longer releases a held A/D or W/S.
- `releaseAll` and the repeat rule cover the new slots.

**Settings panel at 844×390**
- Measured in the browser: it overflowed by 47 px (the help wraps to 147 px at 280 px wide).
- Short landscape screens (CSS width > height and height ≤ 500) now get `.panel.wide`, a two-column grid up to 540 CSS px wide: header, switch, Clear and Reset on the left; help and the readout on the right. `layoutUI()` toggles the class.
- The grid rule is `.panel.wide:not([hidden])`, so `[hidden]` still wins.
- Result: 844×390 gives 540×191 with 0 overflow; 667×375 has 0 overflow.

**Help texts**
- Canvas `aria-label`: adds "R rights the car after a rollover."
- `#driving-help`: adds "If the car rolls over, press R or use the Right the car button that appears next to the car chooser."
- Settings help: the lines are now "W go · S brake, then reverse" / "A D steer · Esc pause" / "R right the car · edges wrap" / the touch line.
- The **painted ground text is unchanged**. Adding R would have resized the instructions zone and moved the course.

### 3. Accessibility and mobile pass

**Touch-target size**
- `uiMetrics`: HUD button `b = clamp(round(.125 S), 24, 34)` (was `.11 S`, max 32). Phones then get HUD buttons of at least 44 CSS px wherever the CSS short side is at least 360 px:
  - 375×812@2: 44.5–46.5 px.
  - 844×390@1: 46–48 px.
  - 360×800@3 and 740×360@3: 45 px.
- **Exception:** the 320 px iPhone SE (1st gen) class gets 40.5 px, because the HUD-width cap (≤ 62 % of W) binds.
- **Course side effect:** the bigger HUD changes some layouts. The long semi-axis of the figure-eight:
  - 455×256 (the 1366×768 desktop): 151.8 → 138.8 (−8.6 %);
  - 480×270: 161.1 → 159.0;
  - 506×234: 148.5 → 157.6;
  - unchanged at 400×240, 234×506, 320×320, 250×542 and 422×195.
  All course tests still pass.

**Focus and controls**
- Focus styles:
  - The settings button while expanded, a pressed pedal (`.on`) and the recover button get a paper ring (`box-shadow 0 0 0 2px paper`) inside the ink outline, so focus shows on dark buttons.
  - Car buttons use an inset outline (`outline-offset:-4px`), so a neighbour cannot cover it.
- The panel's close button is now `clamp(30px, --b, 40px)` square: 40 px on phones, was 30.
- Escape and focus return are unchanged and re-checked: Escape or close puts focus back on the settings button; opening the menu focuses the skid switch.

## Contract assumptions and problems

1. **`controlZones` has five zones.** Anything that expects exactly four, or indexes by position beyond `[3]`, has to change. `keepOuts` maps all of them, which is what we want.
2. **The recovery spot must avoid the `recover` zone.** It does automatically, as long as Agent 3 uses `keepOuts(A)` as §12 says.
3. **The button is offered while paused too**, since an overturned car can be paused with Esc. Recovering does not resume: the next fresh drive key, canvas tap or control grab does, as for the menu.
4. **R releases every input**, the same as opening the menu. A key or finger held through the recovery is dead until pressed again, so the throttle can never stick. The finger's later `pointerup` is a harmless no-op.
5. **Touch-target size still depends on the integer scale** (§12 accepted this). Zones depend only on W×H and the safe insets, not on dpr or the pointer type, so the course is the same on touch and mouse.
6. **The adapter also picks up `window.canRecover` / `window.recover`** if a page defines them, because `typeof` looks past the IIFE. I used that for the browser check. Agent 3's declarations shadow them after the merge.

## Tests

`node tasks/handoffs/interface-controls/verify.cjs` → **67 checks passed** (61 existing + 6 new, about 25 s).
- The only edit to an existing test is in my own stage 2 `checkZones`: the expected id list now ends with `'recover'`. Every other agent's test is untouched and passes.
- New tests:
  1. **recovery: offered only while canRecover is true and no menu is open.** Covers running and paused, true and false, never in the menu, rejection of truthy non-booleans and of a missing world or api, and that the answer follows the world's state.
  2. **recovery: tryRecover gates on canRecover.** For can ∈ {true, false} × mode ∈ {running, paused, menu}:
     - `recover` runs exactly when allowed;
     - every key (including the new slots) and pointer is released, and an old finger cannot write;
     - `trackBreak` and the interpolation reset happen;
     - a held key's auto-repeat stays dead and a fresh press drives;
     - when blocked, nothing changes.
  3. **recovery: the R key.** Covers KeyR, Shift/Caps Lock, a non-Latin layout and the no-code fallback. Repeat, Ctrl, Meta, Alt, composition and other keys are rejected. It is blocked in the menu or while focus owns keys. End to end, R without a recovery keeps driving.
  4. **controls: arrow keys and Space are independent of A/D and W/S.** A plus left arrow is −1, not −2; releasing either keeps the other; right plus left cancels; Space up on the gas pedal keeps W; the wheel pointer still owns steering; `visual()` equals `sample()`; `releaseAll` clears the slots. The page's `holdKeys` mappings are checked.
  5. **controlZones stage 3.** Runs on 15 devices, including 667×375@2, 740×360@3, 360×800@3, 320×568@2, 1024×768, 768×1024, 600×350@1 and 3840×2160@1.5, each with three safe-area cases. For every case:
     - all five zones are inside the arena and safe area, and no pair overlaps;
     - the recover slot is on the HUD row (or under the HUD), one button tall, `recW` wide and at least 2.5 b;
     - `keepOuts(A)` equals `controlZones`;
     - phone HUD buttons are at least 44 CSS px (at least 40 for the 320 px class).
  6. **page.** The recover button is labelled, hidden by default and has `aria-keyshortcuts`; `[hidden]` CSS hides it; focus-visible styles exist; its tab order is right; the canvas label, sr-only help and panel help mention R and the button; the adapter has its exact shape; "Car righted." goes to the live region; R uses the tested gate; the wide-panel rule keeps `[hidden]` winning.

**Browser check** (built-in pane, in my own new tabs only; closed afterwards and the viewport reset to desktop). I used fake `window.canRecover` / `window.recover`.
- **Desktop 1031×547, 1366×768 and 844×390, mouse:**
  - The button appears top right, beside the car chooser. The label fits at every size (`scrollWidth ≤ clientWidth`), and the R hint is shown.
  - There are no overlaps among the HUD, recover, wheel and pedals, no page scroll and no console errors.
  - R while driving with W+D held: recover ran once, input went to 0,0,0, "Car righted." was announced, the button hid and the mode stayed running. Auto-repeat W stayed dead afterwards.
  - Repeat R and Ctrl+R did nothing. R with nothing to recover did nothing.
  - The settings menu hides the button and R is ignored there. Escape restores the button with focus on the settings button.
  - A real Tab from the settings button reached the button with the paper and ink focus ring. A real Enter righted the car and moved focus to the canvas.
  - A held gas finger plus a click on the button released the gas.
  - A held plus an arrow on the focused wheel, then the arrow released: steering stays −1. W held plus Space up on the gas pedal: throttle stays 1.
- **Mobile preset 375×812@2 (touch):**
  - Arena 250×542, scale 3. HUD buttons 44.5–46.5 CSS px, wheel 135, pedals 52.5×84.
  - Recover button 121×46 CSS px, no R hint.
  - Panel 220×335 with 0 overflow.
  - Gas finger plus wheel finger, then a tap on the button: both released and the car righted.
- **Landscape 844×390@1 and 667×375:** two-column panel, 0 overflow.
- **Screenshots** at 844×390, 375×812 and 1366×768 confirm the look.

## Known issues
- **The painted ground text does not mention R.** The button is self-labelled, and the sr-only help, canvas label and settings help mention R.
- **The 320 px wide iPhone SE (1st gen) class** gets 40.5 CSS px HUD buttons, not 44.
- **The 1366×768 course is about 9 % smaller** because the HUD buttons grew (see §3). This is a trade-off for the touch-target requirement; the lead may prefer `.12 S`.
- **On desktop the recover button is large** (249×96 CSS px at scale 3) with a 13 px label. The label is capped so it fits the tightest landscape case (844×390@1).
- **A `.wide` panel overlaps the course**, as the narrow one did. The game is paused while it is open.
- **Safe-area-only changes** still do not re-lay out the course (the known §12 gap).

## Not tested
- **Agent 3's real `canRecover` / `recover`**: only fakes were used. Not seen with real roll states or real recovery placement.
- **Real touch hardware:** real multitouch (finger on the pedal while tapping the button), real `pointercancel` and real rotation. Synthetic pointer events only.
- **Real screen readers** reading "Car righted." and the stuck message (VoiceOver/TalkBack/NVDA).
- **Platform details:** iOS Safari's safe areas and dynamic toolbar, and browser zoom with the wide panel.
- **Live driving:** the preview pane throttles animation frames, so I judged DOM state and input values, not motion.
