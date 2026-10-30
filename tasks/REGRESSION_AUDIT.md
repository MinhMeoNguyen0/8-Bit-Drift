# Regression audit — October 30, 2026

The red CI runs combined current behavior defects with assertions from superseded designs. No suite is skipped or allowed to fail. The normal test helpers still throw on any assertion failure.

## Product fixes

- Gate sprite layers now map their legs to the actual order of the gate posts. Course generators can reverse that order; the former mapping could give a leg the wrong depth ordering. Existing per-post pixel, solid-geometry, shadow and passage checks now pass.
- Drone thumb pads use symmetric viewport margins. The existing equal-size, separation, minimum-size and HUD-clearance checks pass at desktop and phone sizes.
- The planted F1 no longer records braking skid marks. The hard-braking test now checks that the F1 produces zero marks while other ground cars still produce marks under stress.

## Verification migrations

| Previous assumption | Current check |
| --- | --- |
| Course world resizes with each viewport and fits between world-space controls | Fixtures use the same fixed 1350×675 course as the page. Lane separation, radius, gate/post clearance, spawn, cones, deterministic geometry and pixel bounds remain checked. Viewport controls and mobile camera fitting are tested separately. |
| Logical control coordinates must be integers; wheel extends below the screen; speed is at top left | CSS-pixel bounds, safe insets, visible wheel, speed below HUD, separate controls, recovery placement and actual mobile target sizes are checked. |
| Every road is the former single circuit with a very long straight | Daily Challenge geometry, all three selectable road shapes, the figure-eight crossing and actual gear progression are checked. Maximum-speed gate and cone collision checks remain. |
| Four-key WASD guide, alternating-row stripes, no restart key | Current R / W / Q E / A D / BRAKE layout, hold hint, turn/gas/shift labels, two-ink/one-paper stripes, pixel bounds and small-zone empty fallback are checked. |
| Three courses, old tuning bounds/storage key, P/R/N/D has no valid gear cues | Four course ids, parking thumbnail, current slider endpoints and storage format, and cues matching gear safety rules are checked. |
| High-speed steering counts as gentle driving; every vehicle must skid; every oval needs tight-bend curbs | Low-speed steering/slalom must leave no marks; hard stress must mark ground cars except planted F1. Smooth bends have no curbs; tight-bend curb pixels, stripes and cone clearance remain checked. |

The tuning test previously sampled the high-steering/low-grip car after it spun back, obscuring the earlier difference. It now samples at half a second; the original heading and slip thresholds remain. A finally block restores tuning. Drone heading stability uses a 1e-12 angular tolerance for modulo roundoff. The gate reference ray uses finer sampling to resolve tangent pixels at the wider gate geometry.

## Results

- `node verify.cjs`: 144 broad checks plus its 10 race groups pass.
- `node verify-current.cjs`: 50 checks pass.
- `node verify-mobile.cjs`: 12 checks pass.
- `node verify-deploy.cjs`: both deployment groups pass.
- Chrome phone emulation: 390×844, 844×390, 320×568 and 568×320, all vehicle controls, settings, course selection, first-load control visibility, orientation changes and multitouch ownership. No page errors captured.

Physical iPhone/Safari testing and a complete browser-driven lap remain separate QA. All Node suites now gate publication; the standalone game has no new runtime dependency.
