# Race scoring — current implementation handoff

Updated October 29, 2026. Status: implemented in the local standalone game, with the QA limits below. The original planning-only handoff has been superseded by the user's implementation request and subsequent layout/rejoin feedback. This file is not a deployment instruction.

Use [CURRENT_STATE.md](CURRENT_STATE.md) as the detailed current reference and [README.md](../README.md) for play instructions. Edit the existing `dist/index.html`; do not restore the unavailable earlier race prototype or historical source snapshots.

## Implemented flow

Road courses open in Ready at the standard spawn. A tap or W/Enter starts the clock; a fresh input then drives. First forward gate crossing arms the lap. A full eligible route followed by a swept forward gate crossing finishes. Pause/menu/foreground loss pause the clock independently of the physics accumulator.

Finished freezes the world and displays a centered pause-style result. **Hold R** or use the restart button to reset to the Ready prompt; **Tap to continue / Enter** enters free drive and hides race figures. Reset scene and course/vehicle changes create fresh attempts on road courses. Parking remains free drive with no race route or best record.

The click that dismisses Settings is fully consumed, including a click over gas or the start-prompt position. Returning from Settings leaves the game paused. Wraps, recovery displacement, relevant tuning, and physical route resize end an active timed attempt with a notice.

## Changes from the original plan

- The driving HUD has only the enlarged striped time and percentage, side by side at upper left (below the selector on narrow screens). No Track quality label or persistent best text is shown there. Speed and gear are stacked at the right edge below Settings.
- Time format is `MM:SS:CC`, with two digits of hundredths. It is not three-digit milliseconds.
- The result moved from the top-left HUD to the same centered anchor as the pause screen. It shows elapsed time/percentage plus compact ranked/best text and new-best/session-only status. The penalty formula remains in Settings/help; the result does not show the original separate numeric penalty line.
- Rejoining is deliberately more forgiving. There are no discrete checkpoints: the lost cursor searches up to 20% of route length around its last accepted position, with road proximity and actual excursion-distance bounds. A 20% lap-length budget caps excess credit beyond excursion distance. A brief missed section can rejoin and finish without another lap; a remote jump still cannot manufacture completion. See the exact constants and conditions in CURRENT_STATE.
- The original keycap instructions were restored after a temporary plain-text replacement. The artwork is enlarged, key/label letter heights match, Brake is fitted horizontally, and left alignment prevents overlap with the landscape start prompt.

## Scoring and storage

Quality starts at 100 and falls with weighted off-road distance divided by fixed route length; it never rises. Inside the road half-width plus a quarter vehicle width there is no penalty. Weight ramps to full over the next half road half-width. Road proximity and route completion are separate; both crossing branches count as road surface, but cursor continuity protects lap order.

Ranking remains `elapsedSeconds + .02 * (100 - clamp(quality, 0, 100)) ** 2`, scoring version `quadratic-v1-c0.02`. Lower ranked time wins; ties prefer quality, then elapsed time. Personal bests use a bounded local collection (100 records), setup/geometry fingerprints, validation, and guarded storage/session fallback.

Debug mode in Settings draws the route and cursor, and reports race state, gate arming, lost/tracking state, cursor/progress, route length, weighted off-track distance, and quality. It adds no mandatory visible checkpoints.

## Integration locations

| Concern | Current entry points |
| --- | --- |
| Pure scoring | `raceRoute`, `raceProject`, `raceCross`, `raceNew`, `raceMove`, `raceTime`, `raceRank`, `raceBetter` |
| Setup/persistence | `raceFingerprint`, `raceRecords`, `raceSave`, `raceSetup` |
| Browser state/clock | `raceBegin`, `raceElapsed`, `raceFinish`, `raceDismiss`, `raceReset`, `raceInvalidate`, `onModeChange`, `animate` |
| HUD/layout | `raceDisplay`, `controlZones`, `layoutUI`, `sizeSpeed`, result markup/styles |
| Input safety | capture-phase race listeners, Settings dismissal pointer/click handlers, `createControls` |
| Discontinuities | wrap check in `animate`, `doRecover`, `applyTuning`, `applyView`, vehicle/course/reset actions |
| Focused tests | `verify-race.cjs`, also invoked at the start of `verify.cjs` |

## Verification and follow-up

Seven focused test groups pass, including all three road courses at desktop/phone geometry, quality/ranking/storage, reverse/gate oscillation, bounded forward rejoining followed by finish, distant-jump rejection, and time formatting. The full regression script still stops at the pre-existing `hud.l integer` assertion; the later-feature script stops at the pre-existing phone gear-zone assertion. Both failures were reproduced on the pre-race baseline. Do not cite historical ten-check prototype reports as current verification.

Browser validation includes short drives, acceleration/pause, on-screen gas, menu/reset dismissal, and visuals at 1366×768, 864×930, 390×844, 844×390, and 320×568. A temporary simulated-finish fixture checked the centered result and both actions; it is not an actual driven lap. Remaining work includes a complete browser-driven lap, real-device multitouch/safe areas, direct-file browser verification, long-run performance, broader test migration, and quality/rejoin/penalty balance. Keep these limitations visible in future reports.
