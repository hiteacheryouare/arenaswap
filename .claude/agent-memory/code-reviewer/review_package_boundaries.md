---
name: review-package-boundaries
description: How core / sideline / consumers resolve each other at bundle, test and typecheck time after the 2026-10 package spin-outs, and the cheap recipe that proves a package move duplicated no module state
metadata:
  type: project
---

As of PR #219 (2026-10-12), `packages/sideline` (`@arenaswap/sideline`) holds the data-source client and every
summary/standings/box-score parser. It is a **source** package (exports point at `.ts`, no build script) and
imports core only through `@arenaswap/core` root. Core never imports sideline.

**Resolution per environment:** `wxt build` resolves `@arenaswap/core` to core's `dist` (stale-dist trap still
applies to core) but sideline to source. Jest, Cypress component, tsconfig `paths`, powerscore-tools and
`scripts/film/rolldown.config.ts` all alias core to `src`; sideline always resolves via its `exports`. Because
sideline's own `@arenaswap/core` import goes through the same alias/resolution as the app's, each JS context
gets one copy of core (logger, `leagueConfigMap`) — verified in the popup, background and film bundles.

**Turbo:** a package with no `build` script still appears as `<pkg>#build` with command `<NONEXISTENT>` and a
hash of its files, so editing sideline source changes the extension's build/test hash (verified by dry run).

**How to apply:** for any future package move, prove "no duplicated module state" cheaply: build base and head
in throwaway worktrees ([[reference-worktree-node-modules-clone]] — add relative symlinks under
`node_modules/@arenaswap/` for workspaces the shared checkout's branch lacks), then count a unique core string
such as the logger's `ArenaSwap:` prefix per chunk, and compare chunk sizes. Test-count parity: sum Jest totals
across the packages on both sides.

Known leftovers worth not re-reporting as new: `matchupSpecs.ts` in sideline carries popup i18n keys
(`detail.stat*`); `tsconfig.jest.json` is unreferenced in both core and sideline; `tests/timeZoneEnvironment.ts`
exists in both core and sideline.
