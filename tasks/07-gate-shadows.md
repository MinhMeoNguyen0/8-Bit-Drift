# 07 — Drivable half-ring gate and shadows

> **Historical record — current baseline updated October 29, 2026.** Procedural gate/posts and shadows are implemented. Race arming/finish uses forward swept crossing of the current gate geometry. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** 00, 01, 08 vehicle dimensions. **Coordinate with:** 06 placement, 10 collisions, 11 roll height.

Recreate the supplied reference's upright dark half-ring arch using procedural pixels, with a dotted ground shadow. The opening is wide and high enough for every enlarged vehicle. Only the two posts block the car; do not treat the empty center as a solid collider. Support both travel directions and safe high-speed collisions.

Agree on one fixed light direction across car, cone and arch shadows; shadows are ground-anchored and use the game's two opaque tones. Define draw ordering for rear arch, car, foreground structure and shadows so the car visually passes under the arch. Consider overlap, upside-down frames, resizing and post hits.

**Acceptance:** each car drives through the center in both directions; both posts collide predictably without tunneling or explosion; the gate draws in correct depth order and its dithered shadow has a stable offset and matches the reference's style.
