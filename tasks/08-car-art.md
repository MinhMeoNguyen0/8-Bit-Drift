# 08 — Larger, clearer procedural car graphics

> **Historical record — current baseline updated October 29, 2026.** Current vehicles are Compact, Supercar, and a hovering Drone (internal id van). Earlier ground Van artwork/physics are not the active third vehicle. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** 00. **Coordinate with:** 05, 07, 09, 10, 11.

Increase the car size by roughly 20–30% as an initial tuning value. Improve roof, windshield, windows, wheels and front/rear silhouettes based on the user's car screenshot. Keep the small 1-bit pixel-art aesthetic and draw every shape from code. Preserve three recognizable vehicle choices.

Expose accurate per-heading sprite bounds, anchors, physical footprint and rear-wheel points to the integrator. Resize in-memory heading caches to avoid clipping, maintain two-tone pixels and use a shared shadow direction. Coordinate with rollover so the new dimensions also cover roll frames and gate clearance.

**Acceptance:** inspect all 64 headings for clipping and legibility; car, wheel contacts, tyre tracks, shadow, collider and delayed edge transfer align. Compare with reference at normal game scale and ensure no external art files or runtime generation stalls.
