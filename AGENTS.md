# Repository Guidelines

## Project Structure & Architecture

`dist/index.html` is the complete Tiny Drive application: HTML, CSS, game logic, and procedural Canvas artwork live in one standalone file. It is also the deployable artifact, so edit it directly. `verify.cjs` contains the Node-based simulation checks; `preview.cjs` serves the page locally. `.openai/hosting.json` contains hosting metadata. `tasks/` holds planning documents, contracts, and integration handoffs for ongoing work; consult the relevant task and `tasks/CONTRACT.md` when working on that iteration.

Keep the game self-contained: do not add runtime libraries, external assets, fonts, backend services, or application network requests. Preserve direct file opening as well as static hosting.

## Development & Verification

Node.js is needed for the helper scripts, but not to play the game. There is no package installation or build step.

- `node preview.cjs` serves the game at `http://127.0.0.1:4173`.
- `node verify.cjs` runs the automated checks against the inline JavaScript in `dist/index.html`.
- Open `dist/index.html` in a browser for direct-file testing. Check the affected controls, layout, and console when changing browser behavior.

## Coding Style & Naming

Follow the surrounding compact HTML, CSS, and JavaScript style, including its indentation; avoid unrelated reformatting of the single-file application. Use descriptive `camelCase` names for functions and variables and uppercase names for constants, matching existing code. Keep simulation logic testable independently of browser-only code. No formatter or linter is configured.

## Testing Guidelines

Add behavior-focused checks to `verify.cjs` using its `test('description', ...)` helper and Node's strict assertions. Cover relevant edge cases for physics, input, and rendering calculations; do not weaken existing checks merely to make a change pass. Run the full verification script before submitting. Automated simulation checks do not replace browser checks for visual layout, touch, keyboard interaction, or performance. No coverage threshold is configured.

## Commits & Pull Requests

The available Git history uses a short, imperative subject (for example, `Update Site source`); keep commit subjects concise and descriptive. Pull requests should explain the behavior changed, list verification performed, and link the relevant issue or task when available. Include screenshots or a short recording for visual or interaction changes.
