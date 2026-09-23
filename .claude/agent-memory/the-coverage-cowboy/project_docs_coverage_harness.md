---
name: project-docs-coverage-harness
description: apps/docs writes its build to the tracked docs/ directory; the two env vars that let a test or coverage run avoid clobbering it
metadata:
  type: project
---

`apps/docs/astro.config.mjs` sets `outDir: '../../docs'`, and `/docs` is **tracked in git** and
served by GitHub Pages. A plain `astro build` overwrites committed files; an instrumented one would
publish istanbul-instrumented JavaScript to the live site.

Two escape hatches now exist (added 2026-09-21):

- `npx astro build --outDir <scratch>` — redirects output. The override also drops the `/arenaswap/`
  base prefix from the emitted paths, so pages land at `<scratch>/legal/privacy/index.html`.
- `ARENASWAP_SITE_DIR=<dir>` — makes `cypress.config.ts` serve that directory instead of `docs/`.
- `ARENASWAP_SITE_COVERAGE=1` — turns on `vite-plugin-istanbul` in the Astro config *and*
  `@cypress/code-coverage` in `cypress/support/e2e.ts`. Off by default, so normal builds ship clean.

**Why:** publishing instrumented JavaScript to the live marketing site is the worst possible
outcome of a coverage task, and turbo tasks (`test`, `zip`, `typecheck`) silently rebuild `docs/`
from the working tree.

**How to apply:** never run a root-level turbo command while working in `apps/docs`, and always
pass `--outDir` plus `ARENASWAP_SITE_DIR`. Check `git status docs/` before finishing. If `docs/`
shows modifications you did not cause, leave it alone — other agents rebuild it too.

Related: [[project-docs-site-metrics]]
