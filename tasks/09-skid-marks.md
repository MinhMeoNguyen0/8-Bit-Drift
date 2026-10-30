# 09 — Skid marks and delayed wrap

> **Historical record — current baseline updated October 29, 2026.** Delayed ground-car rear-tyre marks and transient smoke are implemented, including burnout/launch behavior. Drone produces no tyre marks. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** 00, 01, 05, 08. **Coordinate with:** 02 and 11.

Keep a bounded, fixed-playground track layer. Emit broken two-tone marks from rear tyre contact positions only during significant lateral slip or hard braking. Clip each track at the visible edge; break continuity on delayed car transfer, then resume as the tyres re-enter. Do not create a line across the arena or show the car's trail at the opposite edge before transfer.

Preserve toggle, clear and reset semantics, and break paths on pause/input cancellation, vehicle change, recovery and beginning a roll. Agree how tracks are retained/clipped across viewport resizing without distorting or causing memory growth.

**Acceptance:** tight turns and braking make plausible marks, gentle driving does not create a constant trail, all four edges and corners render without long connecting lines, toggling does not connect across gaps, and clear/reset works. Test tyre contact at partial exits and resize.
