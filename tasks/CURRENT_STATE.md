# Current game state

Mobile update — October 30, 2026: Mobile road courses render at 1.35× their earlier fitted scale; parking frames the lot itself, with its portrait title above it. Manual shift arrows and their rev indicator sit to the right of the gate. All vehicles run at 1.5× simulation pace with fixed physics steps while the displayed km/h conversion stays the same; F1 steering is tighter. Race-record fingerprints include pace and steering so older records are not mixed with this handling. Portrait course titles counter-rotate to remain upright, and mobile vehicle and shadow artwork is enlarged without changing collision geometry or physics. Figure Eight is the default course, the former Signature circuit is named Daily Challenge, and the mobile camera fits the course between the controls. Long-press text selection and callouts are suppressed in the game where the browser supports it. compact-car mobile controls use gas for forward and brake for stopping then reverse, with no automatic gear selector. The mobile wheel sits fully inside the safe area; the smaller gear controls, portrait course rotation, tappable shift arrows and release-to-select manual gate apply on mobile. Chrome phone emulation at 390×844, 844×390, 320×568 and 568×320 exercised the automatic pedals, manual diagonal shifts, F1 paddle, drone control visibility and settings; a separate emulation checked simultaneous wheel/gas touches, all four course selections and orientation changes. This is emulation, not a physical-device or Safari test. `node verify-mobile.cjs` and `node verify-deploy.cjs` pass; `verify.cjs` stops at the known desktop HUD integer assertion and `verify-current.cjs` at the known steering-tuning assertion. The orientation/control descriptions below document the earlier baseline where they differ.

Publication update — October 30, 2026: the owner authorized making `MinhMeoNguyen0/8-Bit-Drift` public. GitHub Pages now serves https://minhmeonguyen0.github.io/8-Bit-Drift/ from the `dist` artifact uploaded by `.github/workflows/pages.yml`. Deployment smoke checks gate publication; the existing broad regression suites run separately and remain failing. Current observed stops are the race-suite `gear stays above pedals` and the later-suite steering tuning assertion, earlier than the historical stops below. See [the publishing guide](GITHUB_PAGES.md) for the current status and flow. Local `.openai` hosting metadata remains on disk but is ignored and no longer tracked; GitHub Pages does not use it.

Updated October 29, 2026. This document describes the latest saved local implementation, including the race, interface, instruction-artwork, and validation changes accepted in this chat. It is a snapshot, not a deployment announcement or a claim that all QA has passed.

## Authority and document map

The user's latest instructions govern product choices. `dist/index.html` is the implemented behavior. This document and the root [README](../README.md) describe the current baseline. [CONTRACT.md](CONTRACT.md) links this baseline to historical interface contracts. Numbered tasks, ROUND2/ROUND3, WORK_DIVISION, and files below `handoffs/` record earlier stages; their ownership assignments, requirements, defaults, and green-test counts are not current instructions or current verification evidence. Do not restore their source snapshots over the live application.

## Orientation and controls update

All viewports use the same 1350 × 675 logical course, uniformly fitted and centered. The canvas, cached ground texture, and wrapping bounds extend to the full visible viewport; a change of screen orientation or aspect ratio changes the camera bounds rather than regenerating the course or ending the race. Skid marks are cleared when those bounds change. Portrait shows the whole course smaller; the zoom setting scales this fixed world and can crop its edges. Controls overlay the course. The gear stick is enlarged and placed above the brake, and the restart button is available in both orientations. A procedural rotation symbol is cached in the ground on compact/touch layouts when room permits. The keyboard guide begins at the upper-left safe inset, is drawn as ground paint beneath tyre marks and vehicles, and is ordered R, W, Q/E, A/D, Brake.

Holding R or using the restart button resets the road race to the paused start prompt; pointer activation releases the restart button focus, and keyboard canvas focus uses a small indicator instead of a window border; a fresh start gesture begins the clock. Pressing a pedal can start the race while preserving that pedal's input.

## Architecture and performance boundaries

- Complete application and deployable artifact: `dist/index.html`; edit it directly. No package install or build.
- Inline CSS and JavaScript; procedural Canvas sprites, shadows, ground paint, track layers, and DOM controls. Fixed camera, one active vehicle, two ink colors (`#30342d`, `#bfc1b1`).
- World x is logical horizontal distance; screen y is world y × `K` (`0.66`). `makeArena` supplies the world envelope. Use `w.arena`, not legacy default WIDTH/HEIGHT constants, for live geometry.
- `STEP=1/120`. Animation caps accumulated physics work to eight steps, but race elapsed time uses a monotonic foreground clock independently of dropped simulation work.
- `computeView` sizes UI coordinates; `cameraGeometry` uniformly scales the fixed course into the viewport. Zoom defaults are 675 for roads and 300 for parking; both sliders range 300–1000. Both use the same course reference, so the parking default is 2.25 times the road default scale at the same viewport.
- `controlZones` positions selector, controls, recovery, speed, instructions, and race figures in viewport coordinates. The fixed course is independent of these overlay zones. `cameraGeometry` defines the scale and visible bounds; `visibleBounds` is shared by wrapping, culling, tyre marks, and recovery.
- The final compositing canvas uses at least one pixel per CSS pixel at close zoom, preserving the painted guide; the ground and tyre-mark caches retain logical-world resolution.
- Course layouts, vehicle sprite atlases, glyph masks, and gate artwork are cached. Roll and Drone tilt frames use bounded caches; skid marks use an arena-sized layer; transient smoke is capped. Race route segments are built once per setup, not every frame. Race DOM updates are throttled to about 10 Hz while running; debug route drawing is conditional.
- Preserve standalone file opening and static hosting; do not add runtime libraries, media assets, external fonts, services, or application network calls. No new performance measurement is implied by these implementation choices.

## Vehicles, controls, and scenery

Three selectable presets are Compact (`compact`), Supercar (`coupe`), and Drone (`van`, a retained internal id). The Compact's automatic starts in D; the manual Supercar starts in 1. Both ground cars have a draggable gear stick, Q/E keyboard support, and safety checks; the Drone has no gearbox (Q/E do nothing). Space/brake stops without selecting reverse. S/Down is brake unless R is selected, when it becomes reverse throttle; W/Up remains gas. Ground cars can build a burnout with brake + gas near a stop, then launch when the brake is released. Drone flight clears cones, produces no tyre marks/burnout, and retains gate-post collisions below `FLY.clear`.

### F1 Car (paddle shifters)

A fourth preset, `f1` (F1 Car), sits between the Supercar and the Drone in the chooser (the HUD strip, restart button, race figures and every control zone are unchanged: four car buttons share the width three had, about 33 CSS px each on a 390 px phone). `trans:'paddle'` gives a sequential 8-speed (`PADDLE_GEARS`, `PADDLE_TORQUE`, `topGear`, `ratioOf`, `gearSeq`) with the manual's rules (reverse below first, protected downshifts). `planted:true` removes all sideways speed each step in `drive()` and disables skidding, so it never drifts. Its top speed is 300, the most the substep-cost contract (`cap<=6`) allows. Art: `CAR_ART.f1` (`open`, `bodyW`) draws a slim body, closed canopy, outboard wheels with suspension arms and two wings (`carModel().wings`).

Its gear UI replaces the stick in the same gear zone (`data-paddle` on the playground): a downshift paddle (`#paddle-down`, Q), a gear display and an upshift paddle (`#paddle-up`, E), plus eight shift lights driven by `gearTelemetry().shift` (all lit = shift now). A touch or click on a paddle shifts on press; Enter / Space on a focused paddle shifts too. `verify.cjs` has two F1 tests; generic per-car fixtures were adapted for a planted car (start in open space, wrap-aware chord check, bounding-box shadow centre).

### Drone flight (Mode 2 sticks)

The Drone uses `fly()` instead of `drive()`: angle mode with altitude hold, as on consumer drones. Input is `input.sticks = {lift, yaw, pitch, roll}` (each −1..1, dead zone and expo in `normalizeSticks`). The left stick sets a climb rate (W/S) and a turn rate (A/D); the right stick (arrow keys) sets a target tilt, the body eases to it, and the tilted thrust pushes along the drone's own axes against linear air drag, so full tilt tops out at `p.max` and a released stick levels the drone and drifts it to a stop. `car.z` is its height (`FLY.floor`–`FLY.ceiling`, starting at `flightHeight`); at the floor with no lift it lands. Above `FLY.clear` it passes over posts and draws over the gate arch. Height raises the sprite by Z·dz and pushes the shadow by LIGHT·dz without new sprite frames (`liftOf`, `liftBox`, `carBox`). The drawn tilt is the real attitude × the cosmetic `droneTilt` setting.

On the Drone the arrow keys map to their own control slots (`FLY_KEY_CODES`); in cars they still drive like W/A/S/D. The wheel, pedals and gear stick are hidden (`data-fly`) and two thumb-stick pads (`flyPadZones`) take the wheel's corner and the pedals/gear column. A press puts the knob under the finger, each pad owns its own pointer, and release springs both axes to centre. The painted guide reads W S CLIMB, A D TURN, ARROWS FLY; the speed readout shows height in metres (M ALT).

Keyboard and pointer input merge through `createControls`. Steering is owned by the wheel pointer when held; keyboard otherwise. Pedal strengths merge by maximum. Pointer ownership and capture keep controls independent. Pause, menu, foreground loss, and rotation release controls. A menu dismissal is consumed before underlying race/control handlers, including its generated click.

Courses are Signature circuit, Easy oval, Figure eight, and Parking lot. Road routes are closed centerlines with a gate, two road bands/lanes, curbs, cones, and a standard spawn. Parking has no race gate or lap route: it has stalls, aisles, island paint, props, a cart corral, a movable cart, cones, and fixed colliders. Edge transfer waits until the whole car has exited; only one car copy is drawn. Ground-car rollover/recovery, delayed rear-tyre skid marks, collision response, and shadows remain implemented.

## Race state and gestures

Race state (`ready`, `racing`, `finished`, `free`) is separate from game mode (`paused`, `running`, `menu`).

| Situation | Current behavior |
| --- | --- |
| Load a road course | Ready, stationary, zero time, 100% quality |
| Start | Tap the playground/start prompt or W/Enter; holding W or gas starts the clock and drives in the same gesture |
| First forward gate crossing | Arms the lap; does not finish |
| Complete route and eligible forward crossing | Freeze simulation and elapsed time, record ranked result, show centered result |
| Hold R / restart button | Reset position, motion, quality, cursor, progress, and arming; return to the paused start prompt |
| Tap/Enter from Finished | Enter free drive and hide race figures/result |
| Settings / Escape / blur / hidden tab | Pause driving and racing time; require explicit resume |
| Click outside Settings | Close to paused; consume the gesture so it cannot start/resume the race or hold a pedal |
| Vehicle/course change or Reset scene | Fresh scene and Ready on road courses; free drive in parking |
| Active race wrap or recovery with position displacement | End timed eligibility, enter free drive, show notice |
| In-place recovery | Retain the attempt if no position displacement is granted |
| Active race handling or route-size change | End attempt and preserve safe resize behavior |

A foreground frame stall still counts as race time. The finish timestamp is frozen once; its estimate accounts for the remaining simulation accumulator. Reload preserves valid bests, not the active race.

## Route completion and forgiving rejoining

`raceRoute` caches closed centerline segments, lengths, and cumulative distance, anchored at the gate. `raceProject` can select an unwrapped projection near the cursor. Local continuity prevents a global-nearest lookup from jumping between figure-eight branches. Reverse travel cannot accumulate new forward progress; progress is a high-water mark. Finish uses a swept, forward gate-plane crossing inside the opening.

The latest behavior allows brief missed sections instead of requiring a precise return to one point:

- `RACE_REJOIN_FRACTION=.2`: a lost cursor can search within 20% of lap length around the last cursor. This is a bounded distance window, not discrete checkpoints and not permission to skip half the course.
- Rejoin proximity must be within `1.8 × road half-width`. Accepted cursor change is also bounded by excursion travel (`lostDistance × 1.75 + halfWidth × 1.8`) and that 20% window.
- Excess forward credit beyond excursion distance is accumulated as `skipped`; `RACE_SKIP_BUDGET=.2` caps that excess at 20% of route length. This is not a cap on total distance driven off road.
- Single large movements beyond `max(20, halfWidth × 1.5)` mark tracking lost without progress. Integration separately rejects wrap/teleport displacements.
- Normal tracking uses a generous corridor; if neither normal tracking nor bounded rejoining is valid, show Return to the route. Quality continues to account for actual off-road travel.

Keep these policies distance-based rather than granting a per-render-frame allowance. The focused regression includes leaving the road, rejoining ahead, and finishing without another lap, plus a distant-jump rejection.

## Quality, ranking, and local records

Quality is a nonrecovering lap-distance budget:

```text
weightedOffTrackDistance += travelDistance × offTrackWeight
quality = clamp(100 × (1 − weightedOffTrackDistance / routeLength), 0, 100)
```

The vehicle center is unpenalized through `roadHalfWidth + vehicleWidth × .25`; the weight ramps to 1 over another half road half-width. Movement is sampled at most four world units apart. Nearest road surface governs quality, while the continuous route cursor governs completion. Idling costs no quality; clean extra travel cannot restore it. Drone scoring uses ground position. Display rounds to one decimal; calculations retain precision.

```text
penaltySeconds = .02 × (100 − clamp(quality, 0, 100))²
rankedTime = elapsedSeconds + penaltySeconds
```

Scoring version: `quadratic-v1-c0.02`. Lower ranked time wins, with `1e-7` comparison tolerance; ties prefer higher quality, then lower elapsed time. Equivalent runs do not replace the best. Examples: 95% → 0.50 s penalty; 90% → 2 s; 80% → 8 s; 0% → 200 s.

`tiny-drive-race-v1` stores up to 100 records, validated and bounded on read/write. A compact fingerprint includes scoring version, selected course id, vehicle, effective route geometry/width, and relevant tuning. Cosmetic `kickback`, `droneTilt`, and `burnoutSmoke` are excluded. Guard storage access and fall back to a session-only best on failure; no online leaderboard or tamper protection is provided.

## Current interface and instruction artwork

- Time and percentage are striped and side by side in the top row between the instructions and the restart button beside the selector. The clock is `MM:SS:CC` (hundredths, not three-digit milliseconds). Omit the Track quality label in the driving HUD.
- Speed and gear are stacked at the right edge below the selector/Settings row.
- Finished uses a centered panel at the same 42%-height anchor as the pause prompt. It shows elapsed time and percentage, ranked/best text and Tap to continue. It freezes world simulation.
- Restore and preserve the original procedural keycap arrangement: `[W] GAS`, `[Q][E] SHIFT`, `[A][D] TURN`, a wide BRAKE key, and `[R] NEW RACE` with a hold hint. The temporary plain DOM instruction list has been removed.
- Instruction keys and labels share letter height; the BRAKE word is fitted horizontally without shrinking its height. Instruction glyph shear is .25 and paint resolution is about one CSS pixel per paint pixel; small labels are solid and larger labels striped. The title keeps its own paint styling.
- The guide has an enlarged reserved area and is left aligned within it to clear the landscape start prompt. Mobile/narrow layouts omit the keyboard guide. Do not restore the earlier tiny/bare-key fallback as the default appearance.
- Race debug mode is a Settings checkbox: numerical tracking panel plus a conditional route line and cursor marker. It is not a race checkpoint UI.

## Settings and tuning

Settings includes skid visibility, clear tracks, Reset scene, race debug, race rules, course thumbnails, collapsible tuning, and diagnostics. Tuning is persisted separately from race records. `TUNING_SPEC` is authoritative for labels, ranges, and defaults.

Current defaults: steerAngle 1.1, steerFade .48, steerSpeed 12, turnRate 1.35, grip 1.15, wheelRange 270°, wheelCurve 1.2, kickback .5, droneTilt 1, road zoom 675, parking zoom 300, burnoutBuild .8 s, launchBoost .8, launchTime 1.2 s, burnoutSmoke .5. Skid visibility and other cosmetic choices preserve active eligibility; relevant handling/geometry changes invalidate a timed attempt.

## Verification status and remaining work

Latest local commands on October 29, 2026:

| Command | Observed result |
| --- | --- |
| `node verify-race.cjs` / its invocation by `verify.cjs` | Nine test groups pass: ranking/ties; complete road laps at desktop/phone geometry; reverse/oscillation/lost tracking; forward rejoin plus finish and distant-jump rejection; time format; quality budget; parking/storage/setup isolation |
| `node verify.cjs` | Race groups and earlier simulation/input checks pass, then stops at `desktop 1920x1080@1 hud.l integer` |
| `node verify-current.cjs` | Earlier tuning/course/vehicle/render checks and the ten Drone flight/stick checks pass (21 in all), then stops at `phone: the widened gear zone stays above the pedals` |

Both broad-suite layout failures were reproduced on the pre-race baseline; do not call either suite green. For the Drone flight change, a diagnostic copy of each suite that continues past failures had the same failing tests before and after the change (27 in `verify.cjs`, 7 in `verify-current.cjs`); the old car-style Drone banking checks were replaced by flight checks, and `.fly-face` joined the touch-action list. Tests after the stopping assertions are unverified by those runs. Historical handoff pass counts apply only to those snapshots.

Browser evidence from the current iteration: visual checks at 1366×768, 864×930, 390×844, 844×390, and 320×568; short keyboard drives at desktop/portrait/landscape; start, acceleration, pause, menu/reset dismissal and on-screen gas; no console errors in the inspected runs. A landscape Turn/start-prompt collision was corrected by left-aligning the artwork. A separate temporary simulated-finish fixture verified result layout and mobile restart and tap-to-continue transitions; it was not a completed lap through driving controls.

Outstanding: a complete browser-driven lap, real-device multitouch/cancellation and safe insets, direct-file browser verification (the tool's URL policy blocked file URLs), sustained performance/memory measurement, broader regression migration, and balance playtesting of quality/rejoin tolerances and the quadratic penalty. No performance guarantee, accessibility signoff, or deployment follows from this snapshot.

## Local preview and publication

`node preview.cjs` serves the saved local HTML at http://127.0.0.1:4173. It serves only `/` and `/index.html` (and a no-content favicon). Refresh after edits. `.openai/hosting.json` selects `dist` for static hosting. This documentation refresh does not publish or change the hosted project. Check the intended project/audience before any separately requested deployment.

Latest UI pass: Chrome viewport checks at 1366×768, 390×844, 320×568 and 844×390 covered the top row, instruction artwork and stick placement; held W and gas started driving, and held R and the mobile restart reset a race. A simulated finish checked the result and continuation. Physical-device touch and a complete driven lap remain unverified.

Latest local layout benchmark: a Node process measured a 57.1 ms cold Signature layout and a 0.171 ms mean over 100 cached lookups. This is a single machine sample, not a frame-rate, memory, mobile-device, or overall efficiency measurement.
