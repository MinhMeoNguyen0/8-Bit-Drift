# Tiny Drive

A single-screen driving playground. The complete game is **dist/index.html**: HTML, CSS, JavaScript, and procedurally drawn Canvas graphics in one file. There are no libraries, imported images, fonts, models, audio files, or application network requests.

## Play

Open `dist/index.html` in a desktop browser. Click the playground to drive. A keyboard is required.

- W: accelerate; brake first if reversing.
- S: brake, then reverse.
- A / D: steer.
- Escape: pause.
- Cross any edge to return on the opposite side with the same momentum.

The side panel selects Compact, Coupe, or Van; enables/hides skid marks; clears tracks; and resets the scene. Vehicle changes reset the scene. Clicking a control pauses driving. Click the playground again to resume. Skids appear under hard braking or lateral slip.

The camera is fixed. Cars, cones, shadows, and dither patterns are all drawn from numeric shapes in JavaScript. Heading images are cached only in memory. The game uses a 400 × 240 logical canvas, a fixed 120 Hz physics update, and requestAnimationFrame rendering.

## Optional developer commands

Node is only needed for these helpers, not for playing or hosting the HTML file:

```
node verify.cjs
node preview.cjs
```

The preview serves http://127.0.0.1:4173. Only `dist/index.html` is needed on a static host. `.openai/hosting.json` is deployment metadata; `verify.cjs` and `preview.cjs` are development helpers, not game dependencies.

## Validation

12 automated checks passed: wrapping and overshoot, edge/angle interpolation, track seam splitting, acceleration/coasting/braking/reverse, stationary and reverse steering, simultaneous input, drifting, horizontal and vertical seam collisions, degenerate contacts, identical fixed-step results under 30/60/120/144 Hz render schedules, and five simulated minutes for each vehicle without invalid or out-of-bounds state.

The initial screen and keyboard acceleration were inspected in Chrome, with no reported browser console errors. The automation preview was running at a throttled background frame rate. Foreground testing ended when Computer Use could not verify the active browser URL on Windows. Sustained 60 fps, direct-file browser launch, all panel interactions, responsive layouts, Firefox, and Safari remain unverified in a live browser. The simulation runs are not a browser frame-rate benchmark.

The visual reference is [Daily Driver (Tech Demo)](https://gingerbeardman.itch.io/daily-driver). This page is a new procedural implementation; no assets or source from that game are included.
