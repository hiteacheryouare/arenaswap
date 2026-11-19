---
name: project-docs-coverage-harness
description: apps/docs builds to the gitignored apps/docs/dist; the env vars that point Cypress at another build or turn on coverage
metadata:
  type: project
---

Since 2026-11-19 `apps/docs` builds to Astro's default `apps/docs/dist`, which is gitignored. The
Deploy Docs workflow uploads that folder as a Pages artifact, so nothing built is committed and a
local build can never reach the live site.

Escape hatches (added 2026-09-21):

- `npx astro build --outDir <scratch>` redirects output. The override also drops the `/arenaswap/`
  base prefix from the emitted paths, so pages land at `<scratch>/legal/privacy/index.html`.
- `ARENASWAP_SITE_DIR=<dir>` makes `cypress.config.ts` serve that directory instead of `dist`.
- `ARENASWAP_SITE_COVERAGE=1` turns on `vite-plugin-istanbul` in the Astro config *and*
  `@cypress/code-coverage` in `cypress/support/e2e.ts`. Off by default, so normal builds ship clean.

**Why:** an instrumented build left in `dist` would be served by the next plain `test:e2e` run.

**How to apply:** build coverage runs into a scratch `--outDir` and point `ARENASWAP_SITE_DIR` at
it, so `dist` only ever holds a clean build.

Related: [[project-docs-site-metrics]]
