# GitHub Pages publishing

The workflow is `.github/workflows/pages.yml`. It requires GitHub Pages to be enabled with **GitHub Actions** as its source in repository Settings → Pages. Private repositories require a supported paid GitHub plan. Do not change repository visibility without the owner's approval.

## Publishing flow

1. Edit the game in `dist/index.html` and save it.
2. Commit and push changes to a feature branch; open a pull request into `main`.
3. GitHub Actions runs `verify-deploy.cjs` on Node 24: it checks the standalone HTML and executable inline code, then simulates every vehicle on every course for invalid state. Failure blocks publishing; pull requests never publish.
4. After merging into `main`, Actions repeats the deployment checks, uploads only `dist`, then publishes it through GitHub Pages. The Actions run shows the live website link.
5. Saving a local file does not publish it. A successful push/merge and deployment are required. The workflow can also be run manually against `main` from Actions.

**CI** means continuous integration: automatic checks of each proposed change. **CD** means continuous deployment: publishing the checked version automatically. There is no compilation or package installation for this standalone game. GitHub supplies a temporary deployment token; no personal token is saved in the workflow.

To roll back, revert the relevant commit on `main` and push the revert. The same deployment checks run before the old version is republished. A failed deployment leaves the previously published version in place.

The separate `regression.yml` workflow runs the broad, current-feature and mobile suites independently. The publishing workflow now also requires all of them before uploading `dist`. All suites passed locally following the [October 30 regression audit](REGRESSION_AUDIT.md). No failed assertion is ignored. Browser and physical-device QA remain separate from the deployment gate.

## Initial setup status — October 30, 2026 (historical verification below)

The connected repository is `MinhMeoNguyen0/8-Bit-Drift`; its default branch is `main`. The owner explicitly authorized changing the existing repository to public after GitHub rejected private-repository Pages on the current plan. The repository is now public and Pages is enabled with GitHub Actions as its source.

Live URL: https://minhmeonguyen0.github.io/8-Bit-Drift/

Initial publication verified October 30, 2026: the publishing job succeeded, the live URL returned HTTP 200, and the hosted page rendered the game. Pressing the on-screen gas pedal started the race and advanced its timer; no browser console errors were captured. This was a startup smoke check, not a completed lap or full device QA.

No existing game assertions have been weakened. Full regression results are reported separately from the deployment gate:

- `node verify.cjs` currently stops inside the race suite at `gear stays above pedals`, after eight race groups pass.
- `node verify-current.cjs` currently stops at `tuning extremes have materially different effects`, specifically `assert(Math.abs(a.a-b.a)>.2)`, after nine groups pass.

These are the observed failures in the saved working tree. The earlier documented baseline stops (`hud.l integer` and the phone gear-zone assertion) remain historical known issues; these runs stop earlier and do not establish that later assertions pass. Browser verification was not repeated because this setup changes no game behavior.
