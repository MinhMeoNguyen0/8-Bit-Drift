# 8-Bit Drift documentation

Updated October 29, 2026. The latest baseline is the saved `dist/index.html`, including timed races, forgiving rejoining, the centered finish result, the side-by-side race figures, right-edge speed/gear, and restored/enlarged keycap instructions. This index replaces the old expansion-planning entry point.

## Start here

| Document | Purpose |
| --- | --- |
| [Current state](CURRENT_STATE.md) | Current architecture, controls, scoring/rejoin rules, interface, tuning, and exact QA status |
| [Player/developer README](../README.md) | How to play, run, and verify the current game |
| [Repository guidelines](../AGENTS.md) | Editing, testing, and review conventions |
| [Contract](CONTRACT.md) | Current precedence plus preserved historical interface decisions |
| [Race implementation handoff](RACE_SCORING_HANDOFF.md) | Implemented race behavior and differences from the original plan |

The user's latest instructions take precedence. Use the current-state reference and live source for maintenance. Earlier files remain for design history; their original delegation rules, planned features, paths, and successful test counts do not describe the current checkout. There is no current agent ownership split. Deploying the local game requires a separate publication request.

## Historical feature tasks

These record the initial expansion. Implemented features have evolved through later rounds; use the current-state document before editing.

| Task | Current relationship |
| --- | --- |
| [00 — Contracts](00-contracts-and-coordination.md) | Shared input/world/render contracts are implemented; original fixed-canvas assumptions are obsolete |
| [01 — Viewport](01-full-viewport.md) | Full-viewport fixed camera, continuous zoom, resize handling |
| [02 — HUD/settings](02-hud-settings.md) | Selector top-right, speed/gear at right edge, race figures top-center; instructions use keycap art |
| [03 — Input](03-shared-input.md) | Keyboard/pointer merge, pause release, S/Down reverse-aware mapping |
| [04 — Wheel/pedals](04-wheel-pedals.md) | Wheel, gas/brake, pointer ownership, all-vehicle gear stick |
| [05 — Wrapping](05-delayed-wrapping.md) | Whole-car exit before transfer; timed attempt ends on wrap |
| [06 — Courses/parking](06-course-parking.md) | Three road courses plus a distinct parking lot; no race in parking |
| [07 — Gate/shadows](07-gate-shadows.md) | Procedural gate/posts and shared shadows; swept race crossing |
| [08 — Vehicle artwork](08-car-art.md) | Compact, Supercar, Drone; old Van art/physics are historical |
| [09 — Skids](09-skid-marks.md) | Delayed ground-car rear-tyre marks, smoke, bounded layer |
| [10 — Speed/collisions](10-speed-collisions.md) | Faster vehicles, collision substeps, protected transmissions, burnout/launch |
| [11 — Recovery](11-rollover-recovery.md) | Ground-car rollover/recovery; teleport recovery ends a timed attempt |
| [12 — Integration/QA](12-integration-qa.md) | Historical checklist; current QA remains incomplete as documented |

## Historical iterations and handoffs

- [ROUND2.md](ROUND2.md), [ROUND3.md](ROUND3.md): user feedback and ownership for those rounds only. Later parking, transmission, race, and UI changes supersede conflicting details.
- [WORK_DIVISION.md](WORK_DIVISION.md): archived team plan; it is not an instruction to spawn agents for new work.
- [handoffs/](handoffs/): archived agent reports and source/test snapshots. Read their new status notes before using them. Do not deploy those snapshots or overwrite the current standalone HTML with them.

## Verification at this baseline

Nine focused race test groups pass. `node verify.cjs` stops at the pre-existing integer HUD-coordinate assertion; `node verify-current.cjs` stops at the pre-existing phone gear-zone assertion. Historical pass counts do not supersede these results. Browser validation covered desktop, tall-window, portrait, landscape, and small-phone viewports plus short drives and on-screen gas. See [Current state — verification](CURRENT_STATE.md#verification-status-and-remaining-work) for limitations, including the outstanding full browser-driven lap and physical-device tests.
