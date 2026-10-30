# Tiny Drive — small-team work division

> **Historical record — current baseline updated October 29, 2026.** Archived team plan only. It does not assign current ownership or request agents. Maintain the live standalone file according to current repository guidance. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

The 13 task files describe **pieces of work**, not 13 agents. A practical setup is **three subagents plus one lead/integrator**. Reuse the same subagents for subsequent assignments as earlier work finishes. This document is a delegation plan; no game changes are made by creating it.

## Responsibilities

| Role | Owns | Task files |
| --- | --- | --- |
| Lead / integrator | Shared interfaces, input-shape migration, integration, final testing and hosting workflow | 00, 12 |
| Agent 1 — interface and controls | Full-screen layout, settings, selector, keyboard and mobile controls, recovery button UI | 01, 02, 03, 04 (+ UI part of 11) |
| Agent 2 — playground | Figure-eight course, parking, delayed edge wrapping, gate, cone/gate shadows and skid marks | 05, 06, 07, 09 |
| Agent 3 — car and physics | Larger car art and car shadow, faster driving, collision stability, rollover and recovery logic | 08, 10, 11 |

### Why the gate (07) belongs to Agent 2

- The gate is a playground object placed inside the cone course; task 07 must coordinate placement with task 06. One owner for the whole layout removes that cross-agent handoff.
- Task 10 depends only on 00 and 08, so Agent 3 can start it in stage 2 (matching the wave plan in `README.md`). Rollover (11), the riskiest task, then starts as soon as 10 is integrated instead of waiting behind the gate.
- Split of responsibility inside 07: the lead defines a static **gate-post collider** shape and the shared light direction in 00. Agent 2 draws the arch, places both posts and draws cone and gate shadows. Agent 3 makes cone and post collisions stable at top speed in 10 and draws the car (and roll-frame) shadow in 08/11 using the same light direction.

### Why the recovery button belongs to Agent 1

Agent 1 has the lightest stage 3. Agent 3 exposes the recovery state and action (when recovery is available, and the recovery call); Agent 1 builds the labelled button, its keyboard access and its place in the compact UI. This covers the 02 ↔ 11 coordination both task files mention.

## Work in stages

### Stage 1 — agree on the foundations

The **lead** completes task 00 first: fix the shared coordinate, input, rendering, vehicle-size and edge-transfer contracts. Agree how resize affects the arena and marks, and how an occupied entry point and a rollover near an edge are handled. Also fix in 00:

- **Input shape.** `step()` and every physics test in `verify.cjs` currently take `{w,s,a,d}` booleans. The lead migrates `step()` to the shared `{steering, throttle, brake}` input (with a small adapter for the old shape) before any agent writes tests, so Agents 2 and 3 do not break mid-task when Agent 1 lands task 03.
- **Draw order.** Ground, tracks, shadows, rear arch, cones, car, front arch, overlays — so 01, 05, 07, 08, 09 and 11 all draw into agreed layers.
- **Gate-post collider** and **light direction**, as described above.
- **Track-break signal.** One flag/event raised on edge transfer, pause, vehicle change, recovery and roll start, which 09 reads and 05/11 raise.

Tell all agents the same contract and base revision. Then work in parallel:

1. **Agent 1:** prototype full-viewport layout and the shared input system (01, 03).
2. **Agent 2:** draft the figure-eight and parking arrangement against the planned viewport contract, reserving a slot for the gate (06); identify the existing wrap and track code to replace.
3. **Agent 3:** prototype the larger procedural cars and report their projected bounds per heading, anchors, footprint and rear-wheel points (08).

The lead integrates and checks the viewport/input/car foundation before dependent patches are treated as complete. Agent 2 can prepare layout work in parallel but finalizes it only against the integrated viewport.

### Stage 2 — connect the controls, playground and speed

1. **Agent 1:** build the compact car selector/settings/instructions and interactive wheel plus pedals (02, 04), using the integrated input contract. Verify two-finger control and cancellation.
2. **Agent 2:** implement the car's fully-offscreen wrap (05), using the integrated viewport and car bounds. Then complete the figure-eight and parking layout (06).
3. **Agent 3:** tune faster driving and collision limits (10) against the enlarged footprint. Test post impacts against a gate-post fixture built from the 00 collider shape until 07 is integrated.

The lead applies these patches in order (05 before 10, since both change `step()`), checks cross-feature collisions and layout, and returns any integration fixes to the relevant owner.

### Stage 3 — finish driving behavior

1. **Agent 1:** build the recovery button (UI part of 11) against Agent 3's recovery API; fix control, focus, accessibility and mobile-layout issues discovered during integration.
2. **Agent 2:** implement the procedural gate and cone/gate shadows (07) in the reserved slot, then skid marks for the new delayed wrap and resize behavior (09). Verify tracks and cone collisions at all edges.
3. **Agent 3:** implement rollover and recovery (11), including roll frames and their shadow and bounds. Coordinate with Agent 2 on trail breaks and edge handling, and with Agent 1 on the recovery button.

09 and 11 run in parallel: both use the 00 track-break signal rather than calling each other's code. The lead integrates in dependency order: 07 and 09, then re-run 10's post tests against the real gate, then 11 and its button. Resolve actual conflicts against the current integrated revision, not stale patches.

### Stage 4 — verify the complete game

The **lead owns task 12** and runs the combined regression checks. All agents help address bugs in their areas. Test the whole experience: desktop keyboard, real mobile multitouch if a device is available, resizing, camera and full-offscreen wrap, figure-eight and gate, skid controls, all cars, rollover/recovery, and performance. Report what could not be tested; do not claim 60 fps or mobile compatibility without evidence.

## Summary by stage

| Stage | Lead | Agent 1 | Agent 2 | Agent 3 |
| --- | --- | --- | --- | --- |
| 1 | 00 contracts, input migration | 01, 03 | 06 draft | 08 |
| 2 | Integrate stage 1 | 02, 04 | 05, finish 06 | 10 |
| 3 | Integrate 05 → 07/09 → 10 → 11 | Recovery button, fixes | 07, 09 | 11 |
| 4 | 12 | Bug fixes | Bug fixes | Bug fixes |

## Avoiding work conflicts

- The deliverable remains **one self-contained `dist/index.html`** with no external assets or runtime libraries.
- Do not have agents edit the same HTML file or `verify.cjs` at the same time in the shared checkout. Agents prepare isolated patches or temporary snippets/tests against the agreed base; only the lead applies them to the shared deliverable.
- Shared hotspots: `step()` (05, 10, 11), `draw()` (01, 05, 07, 08, 09, 11) and the input state (03, 04, 11). Patches touching these are applied one at a time in the order above.
- Each agent writes new tests in its own scratch test file; the lead merges them into `verify.cjs`. Agent 2 owns replacing the old immediate-wrap, seam-collision and five-minute bounds tests (task 05).
- Each handoff should state the base revision, changed areas, assumptions, tests run, known issues and patch location. Rebase or revise a patch when the lead integrates an upstream change.
- An agent can prototype a dependent task early but must verify it against the integrated prerequisite before marking it complete.
- Keep the current private Site and audience when a later implementation is published; follow the applicable Sites workflow.

## Optional smaller team

With only **two subagents**, combine the playground and car/physics assignments into one sequential workstream (08 → 05 → 06 → 10 → 07 → 09 → 11). The other agent owns interface and controls, including the recovery button; the lead still handles contracts, integration and final QA. This takes longer but avoids requiring additional agents.
