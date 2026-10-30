# 11 — Rollover physics and recovery

> **Historical record — current baseline updated October 29, 2026.** Ground-car recovery exists. An in-place righting can retain a timed run; a recovery that moves the car ends it. The active Drone does not use old Van rollover behavior. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** 00, 08, 10. **Coordinate with:** 02, 05, 07, 09.

Implement an arcade state machine for driving, tipping/rolling, resting and recovery. Base risk on sustained lateral load, grip, track width, center-of-mass height and collision impulses; a fast light car may achieve risky loads, but light mass alone must not automatically cause a flip. Add hysteresis/damping, reasonable thresholds and per-vehicle tuning. Create a few code-drawn roll frames and a ground-anchored shadow; retain a safe, defined collision footprint while rolling.

Proposed default: provide a clearly labelled right-car action once the vehicle has settled, available on both touch and keyboard, plus Reset Scene. This is a design choice to validate during playtesting, not a user-specified control. Define recovery placement to avoid spawning inside a cone or gate post, including when the car overturns partly offscreen. Disable normal acceleration while overturned, clear held inputs, reset interpolation and break skid trails during recovery. Coordinate delayed wrapping with the bounds of every roll frame.

**Acceptance:** low-speed turns never flip; normal drifting remains possible; reproducible sustained aggressive cornering or strong impact can roll susceptible vehicles. Recovery is discoverable and works on mobile/keyboard; no stuck throttle, unstable collision or NaN state. Verify across all vehicles, both directions, at edges and near the gate.
