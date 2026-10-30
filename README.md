# 8-Bit Drift

A full-screen, two-tone driving playground with timed single-lap races. The current game is `dist/index.html`: HTML, CSS, JavaScript, and procedural Canvas artwork in one standalone file. No build, runtime libraries, external assets, fonts, backend, or application network requests are required.

This is the latest local implementation as of October 29, 2026. See [Current state](tasks/CURRENT_STATE.md) for implementation details and verification limits. Earlier task plans and agent handoffs are historical references.

## Play locally

Open `dist/index.html` directly in a browser, or run:

```sh
node preview.cjs
```

Then visit [the local preview](http://127.0.0.1:4173/). The preview reads the saved HTML on each request; refresh after an edit. Local changes do not update the published site automatically.

## Controls and vehicles

| Action | Control |
| --- | --- |
| Accelerate | W / Up arrow, or hold the gas pedal |
| Brake | Space, or hold the brake pedal |
| Steer | A / D, Left / Right arrows, or drag the wheel |
| Brake / reverse throttle | S / Down arrow brakes normally; with R engaged it accelerates in reverse |
| Shift | Q / E, or drag the gear stick |
| Pause | Escape; opening Settings or leaving the foreground also pauses |
| Right a stuck ground car | R or the recovery button when available |

The **Compact** uses a P/R/N/D automatic and starts in Drive. Q moves the automatic selector toward Drive; E moves it toward Park. The **Supercar** is a five-speed manual with reverse below fifth on its H gate; it starts in first. Q from first can select reverse when stopped. Shifts into reverse and Park, and unsafe manual downshifts, are protected. A brake alone never selects reverse.

On a ground car, hold gas and brake near a standstill to build a burnout, then release the brake while holding gas for a boosted launch.

The **Drone** flies like a real drone on a Mode 2 remote (angle mode with altitude hold) and has no gearbox. Its wheel, pedals and gear stick are replaced by two thumb sticks:

| Drone stick | Keyboard | Effect |
| --- | --- | --- |
| Left stick up / down | W / S | Climb / descend (centred holds the height) |
| Left stick left / right | A / D | Turn on the spot |
| Right stick up / down | Up / Down arrows | Tilt nose down / up to fly forward / back |
| Right stick left / right | Left / Right arrows | Tilt to slide left / right |

The right stick tilts the drone, and the tilted thrust moves it: released, it levels out and drifts to a stop. The readout shows its height (M ALT). It flies over cones and leaves no tyre marks. Gate posts stop it unless it flies above them; at the floor it lands and the other sticks wait for lift-off.

## Races and free drive

Choose **Signature circuit**, **Easy oval**, **Figure eight**, or **Parking lot** in Settings. The road courses open in Ready. Tap the playground, press a pedal, or press W / Enter to start the clock. Holding W or the on-screen gas pedal starts and drives in the same gesture. The clock includes the trip from the standard spawn to the gate. The first forward gate crossing arms the lap; complete the route and cross forward again to finish.

The top-center figures show `minutes:seconds:hundredths` and a percentage, side by side in the striped theme. The percentage is **track quality**, a distance budget that falls with off-road travel and never recovers. It is not route completion. Short excursions can rejoin ahead; large route skips still cannot finish the lap. The debug switch in Settings shows the route, cursor, gate state, progress, and off-track distance.

Finishing freezes the game and shows a centered result in the pause-screen style, including elapsed time, percentage, ranked time, and best:

- **Tap to continue** or press Enter to dismiss the result and resume untimed free drive. The race figures disappear.
- **Hold R for 1 second**, or tap the restart button beside the car selector, to reset to the start prompt. A short R press still rights a rolled car.

Opening Settings and dismissing it leaves the game paused. The dismissal click is consumed, including when it lands on the gas pedal. **Reset scene** restores the scene and a fresh Ready race on a road course. Parking stays free drive.

Ranked time is `elapsedSeconds + 0.02 × (100 − quality)²`; lower wins. Personal bests are stored locally per course, vehicle, relevant handling setup, and effective route geometry. Storage failures fall back to session-only bests. Wrapping, teleport recovery, handling changes, or a physical course resize end an active timed attempt; a notice explains the interruption.

## Appearance and settings

Speed and gear are stacked against the right edge below the selector. On keyboard layouts, the ground-painted keycap guide shows R New Race, W Gas, Q/E Shift, A/D Turn, and Brake. The guide is drawn below tyre marks and vehicles. Narrow/mobile layouts omit this guide. On-screen wheel, pedals, and gear stick remain available.

Settings includes skid visibility, clear tracks, reset scene, race debug mode, race rules, course thumbnails, and collapsible tuning. Handling, wheel response, Drone tilt, separate road/parking zoom, burnout, launch, and smoke controls are adjustable. Defaults and ranges are defined in `TUNING_SPEC` in the HTML.

## Development and verification

Node is needed only for helper scripts. Edit `dist/index.html` directly. See [AGENTS.md](AGENTS.md) for repository guidance and [the documentation index](tasks/README.md) for current and historical references.

```sh
node verify-race.cjs
node verify-current.cjs
node verify.cjs
```

`verify-race.cjs` has seven passing test groups. `verify.cjs` invokes them before its older checks. The broader suites remain red: `verify.cjs` stops at `desktop 1920x1080@1 hud.l integer`; `verify-current.cjs` stops at `phone: the widened gear zone stays above the pedals`. These layout failures were reproduced on the pre-race baseline. Later checks after those failures are not covered by those runs.

Browser checks covered 1366×768, 864×930, 390×844, 844×390, and 320×568. Short drives, pause, and on-screen gas were exercised; a landscape instruction/prompt overlap was fixed. A simulated-finish fixture exercised the centered result, mobile restart, and tap-to-free-drive. A full lap through actual browser controls, physical-device multitouch, safe-area hardware, long-session performance, and direct-file browser validation remain outstanding. Do not treat this as a full green QA signoff.

The static deployment contains only `dist/index.html`; `.openai/hosting.json` points hosting at `dist`. Publishing is a separate action.

## References

The visual reference is [Daily Driver (Tech Demo)](https://gingerbeardman.itch.io/daily-driver). All shipped artwork is generated in code. The clutch-free manual design was informed by [Forza's transmission modes](https://forums.forza.net/t/meet-the-most-accessible-forza-motorsport-ever/597587/38) and downshift protection by [GT7](https://us.gran-turismo.com/us/gt7/news/00_3200508.html).
