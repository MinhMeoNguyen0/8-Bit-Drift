# 8-Bit Drift

A single-screen driving playground. The complete game is `dist/index.html`: HTML, CSS, JavaScript, and procedurally drawn Canvas graphics in one file, with no runtime libraries or external assets.

## Play

Open `dist/index.html` in a browser, or run `node preview.cjs` and visit http://127.0.0.1:4173. Use W to accelerate, S to brake and reverse, A/D to steer, and Escape to pause. On touch screens, drag the wheel and hold the gas or brake pedal. Cross an edge to re-enter on the opposite side. The settings panel offers skid visibility, track clearing, and reset; R rights an overturned ground car.

Choose the Compact, Supercar, or hovering Drone. The Supercar uses five manual gears: Q shifts down, E shifts up, or drag the H-pattern stick. An automatic clutch handles each shift; unsafe downshifts are refused. Higher gears allow a higher top speed, while lower gears give stronger acceleration. The dashboard shows game speed in km/h. The drone flies over cones and leaves no tyre marks. Choose the signature circuit traced from the supplied reference, an easy oval, or a club circuit in Settings. Each road has two lanes. Tuning is collapsible; its expanded ranges change handling and camera scale continuously. Drifting emits temporary smoke. Mobile layouts omit the ground keyboard guide and reserve space below the course for touch controls.

## Development

Node is only needed for the optional helpers. Run `node verify-current.cjs` for current camera, track, tuning and vehicle checks. `verify.cjs` retains the older detailed suite; its tuning and layout expectations predate the current redesign and need migration. The static host needs only `dist/index.html`; `.openai/hosting.json` holds deployment metadata. See `AGENTS.md` for contributor guidance.

The visual reference is [Daily Driver (Tech Demo)](https://gingerbeardman.itch.io/daily-driver). This is a new procedural implementation; no assets or source from that game are included.

The clutch-free manual interaction follows the distinction between manual and manual-with-clutch modes in [Forza](https://forums.forza.net/t/meet-the-most-accessible-forza-motorsport-ever/597587/38), with downshift protection similar to [GT7](https://us.gran-turismo.com/us/gt7/news/00_3200508.html).
