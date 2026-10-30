# 04 — Interactive steering wheel and pedals

> **Historical record — current baseline updated October 29, 2026.** Wheel/pedal pointer ownership is implemented. Every vehicle now also has a draggable transmission stick; fresh race start/resume gestures are consumed. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** 00, 01, 03. **Coordinate with:** 02.

Draw an interactive steering wheel around the left-middle of the viewport and gas plus brake/reverse pedals on the right using CSS/Canvas and native accessible controls. A/D visibly steer the wheel; W depresses gas; S depresses brake/reverse. Dragging the wheel changes steering; it is clamped and returns to center after release. Pedals are momentary, not toggles.

Use independent pointer IDs and capture so one finger can steer while a second holds either pedal. Correctly compute angle across the ±180° seam; release only the affected control on that pointer's release outside, cancel or lost capture. Clear all controls on device rotation, app background and menu open. Apply `touch-action: none` only on actual controls. Show actual steering feedback consistently during keyboard and touch driving; define safe fallback controls for users unable to drag.

**Acceptance:** real-device two-finger wheel+gas and wheel+brake work together; moving/losing one pointer does not cancel the other; every released/cancelled control returns to neutral; keyboard indicators match actual input. All controls have clear labels, visible focus and adequate touch targets in portrait and landscape.
