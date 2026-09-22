---
name: extension-coverage-wiring
description: Two non-obvious traps when wiring istanbul coverage into the extension's three test runners
metadata:
  type: reference
---

Two things about `apps/extension` coverage that are not visible from reading the config:

- **Both Cypress runners share one working directory.** `@cypress/code-coverage` reads its
  report/temp directories from an nyc config resolved against `process.cwd()` at module load, so
  component and e2e would overwrite each other's report. `nyc.config.cjs` is a `require()`, which
  is why the target comes from `ARENASWAP_COVERAGE_TARGET` rather than a static path. A plain
  `.nycrc.json` cannot do this.
- **`vite-plugin-istanbul` is ESM-only** (`"require": null` in its exports map) and both
  `cypress.config.ts` and `wxt.config.ts` load as CommonJS. It has to come in through a dynamic
  `await import()` inside an async `viteConfig` / `vite()` function.

Instrumentation of the e2e build is gated on `ARENASWAP_COVERAGE_TARGET === 'e2e'` in
`wxt.config.ts`. Verify a shipped build is clean with
`grep -rl "__coverage__" .output/chrome-mv3/` after `npm run build` — it must return nothing.
