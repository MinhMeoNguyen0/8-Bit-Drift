# 01 — Full-viewport responsive playground

> **Historical record — current baseline updated October 29, 2026.** Full-viewport play and safe resize exist. Current zoom uses continuous scaling and separate road/parking defaults. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** 00. **Coordinate with:** 02, 04, 05, 06.

Replace header/sidebar layout with a game canvas that covers the available browser viewport. Retain a fixed orthographic camera and square, crisp logical pixels. Fit different aspect ratios by adapting the visible ground bounds, not stretching the car, and avoid using the permission-based Fullscreen API. Honor dynamic viewport height and safe-area insets. DOM overlay hit zones must not prevent unrelated game interactions.

Define how a resize or orientation change updates game bounds, objects, background and track layer together; avoid surprise resetting of the car. Keep simulation speed independent of screen resolution. Preserve a readable accessible canvas label and fallback.

**Acceptance:** at common desktop, narrow portrait and landscape sizes the screen is filled, car proportions stay constant, controls remain visible and the fixed camera does not follow the car. Check rotation, browser chrome changes, high-DPI pixel edges, zoom and resize while moving. Direct-file opening remains supported.
