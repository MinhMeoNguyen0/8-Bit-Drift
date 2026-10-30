# 10 — Faster driving and collision stability

> **Historical record — current baseline updated October 29, 2026.** Faster motion and collision substeps remain. Current protected transmissions, burnout/launch, and Drone behavior supersede older vehicle assumptions. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** 00, 08. **Coordinate with:** 03, 05, 07, 11.

Increase acceleration and top speed moderately for all three presets and tune distinct handling, braking, grip and reverse. Preserve controllable low-speed driving and the ability to drift. Update collision movement bounds, microsteps and velocity limits for the fastest car and the enlarged footprint; the current four-substep cap was designed for slower motion.

**Acceptance:** playtest the faster feel; tests cover maximum-speed cone and gate-post impacts, grazing and off-center hits, high relative velocity, bounds and no tunneling/NaNs/explosive impulses. Fixed-step behavior remains consistent at 30/60/120/144 Hz rendering, and W+S braking and reverse steering remain correct.
