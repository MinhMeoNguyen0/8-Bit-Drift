# 06 — Figure-eight cone course and ground markings

> **Historical record — current baseline updated October 29, 2026.** The game now has Signature circuit, Easy oval, Figure eight, and a separate modeled parking lot. Parking has no gate/lap scoring. Read [Current game state](CURRENT_STATE.md) before using this document. The original instructions and status statements below are preserved as history and do not override the latest game or user decisions.

**Depends on:** 00 and 01 arena bounds. **Coordinate with:** 07 gate placement and 05 edge behavior.

Replace the current circular arrangement with a recognizable figure-eight course of movable cones. Add a few parking bays and ground lines while leaving enough unobstructed driving space. Use deterministic procedural two-tone pixels; keep texture quieter than the car and skid marks. Fit or adapt the course to portrait/landscape bounds without placing objects underneath controls or the spawn.

**Acceptance:** the infinity shape is recognizable at normal scale, cones remain physical and reset correctly, parking bays are readable and driving space remains usable; scenery and collision positions agree after resize. No imported images or random flickering.
