# 12 — Integration, regression and performance review

> **Historical record — current baseline updated October 29, 2026.** Integration has progressed through the race/UI revisions, but QA is not fully signed off. Focused race checks pass; both broad suites still stop at known layout assertions. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** all feature tasks. **Owner:** integrating agent.

Apply separate patches sequentially and reconcile shared boundaries. Preserve the one HTML file, inline JavaScript and CSS, direct-file use and no external assets or APIs. Update `verify.cjs` for deliberate changes; retain existing meaningful driving and physics coverage rather than merely deleting failing tests. Run the automated checks after the final integration.

Manually verify desktop and mobile: portrait/landscape and resize; keyboard wheel/pedal feedback; real multitouch wheel+gas and wheel+brake; cancellation, focus, menus, skid settings and reset; all four fully offscreen exits/corners and reversal; figure-eight, parking, moving cones; gate clearance and both posts; three cars, shadows, faster driving, rollover and recovery. Compare visuals with both user-supplied references and inspect 1-bit drawing/heading frames.

Specifically verify that cancelling one finger leaves another finger's control active; car recovery is available when a rollover occurs at an edge; and the entry edge is not occupied in a way that causes repeated transfers or an unstable collision. If a real mobile device or Safari is unavailable, record the missing test instead of treating desktop emulation as proof of touch behavior.

Measure frame pacing and memory for a representative long drive with cones, tracks and rollovers on a documented desktop and actual mobile device. The target is smooth 60 fps where hardware allows; record measured conditions and report untested devices or browser limitations. Test direct `file://` opening and hosted static use, verify zero app-initiated network requests and no accumulated animation loops/listeners. Chrome/Edge and Firefox when available; Safari only if an actual Safari environment is available.

**Acceptance:** regressions and serious failures fixed, evidence and limitations recorded, source and hosting audience preserved. For an implementation turn, follow the applicable Sites workflow and use the existing Site rather than creating a duplicate.
