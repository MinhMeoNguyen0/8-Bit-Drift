# Repository Guidelines

## Project Structure & Architecture

`dist/index.html` is the complete Tiny Drive application: HTML, CSS, game logic, and procedural Canvas artwork live in one standalone file. It is also the deployable artifact, so edit it directly. `verify.cjs` contains the broad Node-based regression checks and invokes the focused race checks in `verify-race.cjs`; `verify-current.cjs` covers later camera/course/tuning/vehicle checks; `preview.cjs` serves the page locally. `.openai/hosting.json` contains hosting metadata. `tasks/CURRENT_STATE.md` describes the latest implemented baseline (October 29, 2026). Read it and `tasks/README.md` before changing behavior. Older numbered tasks, round plans, work-division notes, and agent handoffs are historical records, not active ownership or instructions to restore an earlier snapshot. `tasks/CONTRACT.md` identifies the applicable precedence.

Keep the game self-contained: do not add runtime libraries, external assets, fonts, backend services, or application network requests. Preserve direct file opening as well as static hosting.

## Development & Verification

Node.js is needed for the helper scripts, but not to play the game. There is no package installation or build step.

- `node preview.cjs` serves the game at `http://127.0.0.1:4173`.
- `node verify-race.cjs` runs the seven focused race test groups.
- `node verify-current.cjs` runs the later feature checks.
- `node verify.cjs` runs the race checks and broad regression checks against the inline JavaScript.
- Current known stops: `verify.cjs` fails at `hud.l integer`; `verify-current.cjs` fails at the phone gear-zone assertion. Both predate race implementation. Report these explicitly; do not weaken assertions to claim a green suite. See `tasks/CURRENT_STATE.md` for browser evidence and remaining QA.
- Open `dist/index.html` in a browser for direct-file testing. Check the affected controls, layout, and console when changing browser behavior.

## Coding Style & Naming

Follow the surrounding compact HTML, CSS, and JavaScript style, including its indentation; avoid unrelated reformatting of the single-file application. Use descriptive `camelCase` names for functions and variables and uppercase names for constants, matching existing code. Keep simulation logic testable independently of browser-only code. No formatter or linter is configured.

## Testing Guidelines

Add behavior-focused checks to the appropriate verification script using its `test` helper and Node's strict assertions. Race checks belong in `verify-race.cjs`, which is also invoked by `verify.cjs`. Cover relevant edge cases for physics, input, and rendering calculations; do not weaken existing checks merely to make a change pass. Run the full verification script before submitting. Automated simulation checks do not replace browser checks for visual layout, touch, keyboard interaction, or performance. No coverage threshold is configured.

## Commits & Pull Requests

The available Git history uses a short, imperative subject (for example, `Update Site source`); keep commit subjects concise and descriptive. Pull requests should explain the behavior changed, list verification performed, and link the relevant issue or task when available. Include screenshots or a short recording for visual or interaction changes.
