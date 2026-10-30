# 03 — Keyboard and multitouch input state

> **Historical record — current baseline updated October 29, 2026.** Shared keyboard/pointer input is implemented. Space always brakes; S/Down is brake normally and reverse throttle with R engaged. Menu dismissal consumes its whole gesture. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** 00. **Coordinate with:** 02, 04, 10, 11.

Replace separate canvas-only boolean key handling with the shared sampled steering/throttle/brake state. W accelerates, S brakes then reverses, A/D steer. W+S brakes; opposite steering cancels. Define keyboard/touch merge deterministically with the integrator and reflect the same state in visual controls.

Remove canvas blur as a blanket pause trigger when using on-screen controls. Pause and clear all held controls on actual app/window backgrounding, Escape, and menu opening. On pointer cancellation or lost capture, release only that pointer's control; other active fingers continue driving. Keep Tab navigation and ordinary button operations working. Handle keyboard repeat, keyup after focus change, modifiers and browser shortcuts. Do not interfere with document scrolling outside intended control areas.

**Acceptance:** fixed-step input has consistent values; simultaneous keyboard/touch input follows documented precedence; focus changes never leave throttle/steering stuck; pressing settings doesn't drive the car. Test W+S, A+D, key repeat, window blur, visibility, menu transitions and `pointercancel`. During wheel+gas, cancelling the wheel releases steering while gas remains active, and vice versa.
