# 00 — Shared contracts and coordination

> **Historical record — current baseline updated October 29, 2026.** Shared arena/input/render interfaces are implemented. Original fixed-canvas assumptions and old test expectations below are historical. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Goal:** Agree on boundaries before parallel implementation. Integrator owns this task and the final shared HTML.

**Current facts:** `WIDTH`, `HEIGHT`, `WORLD_H`, `normalize`, `position`, `wrappedLine`, `wheelPoints`, `step`, `draw`, `resize`, and `start`/`pause` all assume the original fixed canvas or focus policy. `verify.cjs` has tests that expect old immediate toroidal wrapping; replace only those expectations once the new behavior is implemented.

**Define and communicate:**

- Arena coordinates and projected screen bounds; fixed camera; world units vs CSS pixels; resize/orientation mapping without stretching. Decide how objects and existing marks are preserved or clipped when visible bounds change.
- Actual rendered vehicle bounds per heading and roll frame, including sprite anchor, so the edge-transfer logic and graphics agree on “fully offscreen.” Consider shadows separately; no early destination copies.
- A shared sampled input with steering in [-1,1], throttle/brake in [0,1]; define precedence for simultaneous keyboard/touch and W+S (braking wins); wheel and pedal visual values derive from the same driving state. Keep compatibility with fixed-step physics during migration.
- Define pointer ownership explicitly: releasing/cancelling/loss of capture for one pointer neutralizes only the control owned by that pointer; other active pointers remain active. App/window background, menu open, explicit pause and teardown release all inputs. A normal pointer release must never pause the entire game.
- An event/flag for one edge transfer to reset interpolation and break tracks; explicit handling of simultaneous diagonal/corner crossings and collision position during the transfer.
- One vehicle definition for dimensions, wheel anchors, mass, grip, roll thresholds, sprite bounds, and gate clearance. One shared fixed light direction and render-depth contract.
- Running, paused/menu, overturned, and recovery transitions, including release of every held key/pointer. A menu must not resume with a stale accelerator.
- Agree how a car that stops or overturns partly outside the visible area can be recovered, and ensure recovery remains visible and accessible. Treat the right-car action as a proposed default, not an earlier user-confirmed requirement.

**Deliverable:** concise interface contract plus integration notes, no premature general engine or added runtime dependencies. **Acceptance:** task owners can independently implement compatible patches; no conflicts about who owns the shared file; existing and new edge behaviors are explicitly distinguished.
