# 02 — Compact HUD, car selector and settings

> **Historical record — current baseline updated October 29, 2026.** Current HUD has side-by-side race figures at upper left, stacked speed/gear at the right edge, a centered finish result, and keycap-style ground instructions. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** 00 and 01's overlay interface. **Coordinate with:** 03 and 11.

Put the car chooser in the top right and a compact settings button next to it. Settings contains skid marks on/off, clear tracks and reset scene. Embed readable translucent instructions at bottom right. Design with ordinary HTML/CSS and code-drawn icons; no imported assets. Keep UI translucency separate from the two-tone game canvas.

Preserve existing vehicle-change and reset semantics unless revised explicitly: switching cars resets the scene and tracks; reset clears tracks and restores cones; skid toggle hides/pauses recording without erasing retained tracks. Provide labelled buttons, selected and checked states, focus visibility, Escape behavior, and a safe menu dismissal and resume flow. Coordinate any right-car recovery affordance with task 11.

**Acceptance:** all controls work with keyboard and pointer; settings do not overlap the car chooser or become unreachable on narrow or rotated displays; opening a menu releases inputs, closing it does not unexpectedly accelerate; controls remain usable at browser zoom and in safe areas.

**Update (user request, stage 2):** the bottom instructions are painted on the ground. They are drawn into the game canvas in a code-defined pixel font, two tones only, squashed by K like the parking lines, with cars, shadows and tracks drawn over them. The same text stays available to screen readers. The instructions area is reported in `controlZones(view)` so the course stays off it.
