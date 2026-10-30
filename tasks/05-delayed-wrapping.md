# 05 — Car fully exits before reappearing

> **Historical record — current baseline updated October 29, 2026.** Delayed whole-car edge transfer is implemented. A wrap during a timed run ends race eligibility and returns to free drive. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** 00, 01 and 08's projected car bounds. **Coordinate with:** 09, 10, 11.

Keep the fixed camera and fixed arena. Remove the current duplicate car and shadow drawn immediately across the opposite edge. Let the whole projected car sprite travel outside the departing edge, then transfer it just beyond the opposite side so it re-enters naturally. Preserve velocity, heading, steering, roll state and movement overshoot. Use actual sprite bounds per heading and roll state rather than center-point wrapping.

Before transfer, a partial exit followed by a reversal returns through the same edge. Handle diagonal/corner exits deterministically, including two-axis crossings, without visible double copies or long interpolation jumps. During departure do not apply invisible destination-side collisions; after transfer collision checks use destination coordinates. Inform task 09 exactly when to break tracks. Cone behavior is separate from the user-requested car delay and must not create duplicate collisions.

The 00 contract must state how crossing is detected when a car turns or rolls while partially offscreen, how overshoot is mapped without creating a destination overlap, and how a car that stops or overturns at an edge remains recoverable. Choose behavior that does not strand the player or immediately transfer repeatedly; document any placement adjustment made to resolve an occupied entry point.

**Acceptance:** automated and visual checks cover left/right/top/bottom, all corners, different headings/sizes and rollover frames, partial exit/reverse, full disappearance before entry, speed/overshoot preservation, collision timing and no center flash. Replace current tests that require immediate wrap or periodic car-cone collisions; retain independently valid cone checks. Update the five-minute bounds test to allow the car's bounded offscreen transit envelope while keeping cone and finite-state checks; the current `0 <= x < WIDTH` car assertion is incompatible with the requested behavior.
