---
name: project_powerscore_reference_docs
description: 2026-08-23 build + revision pass on the seven powerscore package docs at apps/docs/src/content/docs/powerscore/; branch-link convention, a reproducibility bug the revision pass caught, and the mutable-config-object fact
metadata:
  type: project
---

Wrote all seven pages at `apps/docs/src/content/docs/powerscore/` (getting-started, scoring-a-game, signals, boosts-and-penalties, configuration, api-reference, types) against `packages/powerscore/src/*.ts` and its tests at that commit, then ran a dedicated `/technical-writing` + `unslop` revision pass per [[feedback_technical_writing_revision_pass]]. All seven from the brief were kept; none dropped, none added.

**Branch for outbound GitHub links: `mega`, not `dev`.** The existing `pages/powerscore/index.astro` links to `.../tree/dev/packages/powerscore`, which is stale. `package.json`'s own `homepage` field and the README's raw-asset URLs both point at `mega`, and `git status` confirms `mega` is the live branch. Used `mega` for the `background.ts` source link in `scoring-a-game.md`. Don't copy the astro page's `dev` link as precedent.

**Reproducibility bug the revision pass caught, checklist item 8:** `scoring-a-game.md` showed an abstract `toGame(event): Game` mapper function, then a later section called `computePowerScore(game, history)` and printed a verified result, but `game` there was still just the mapper's abstract return type, not a concrete literal a reader could run. The fix was a concrete `const game: Game = { ... }` literal with the exact fields the printed result was actually verified against (period 3, clockSeconds 300 specifically, not 200 or 600, since lateGame differs at each). Watch for this pattern generally: an earlier code block that returns an abstract/generic shape, reused by name in a later block that prints concrete output, is a silent reproducibility gap even when both blocks are individually correct.

**`sportTypeConfigMap` and `leagueConfigMap` are not frozen.** `computePowerScore` reads them by live reference on every call, not from a snapshot taken at import time, and nothing in `constants.ts` calls `Object.freeze` on any exported config object. This means a consumer mutating them at runtime does change scoring behavior, though it is not a documented or supported extension point. Wrote this into `configuration.md`'s "Adding a league" section as a fact, not a recommendation.

**Verification method used throughout:** the package's `dist/` build emits extensionless relative imports (`from './scorer'`), so `node dist/index.js` fails with `ERR_MODULE_NOT_FOUND` even after a fresh `npm run build`. Verify example output by writing a throwaway `tests/zzz-*.test.ts` that imports from `../src/*` and running it with `npx jest --selectProjects unit --testPathPatterns <name> --verbose` (console output is otherwise swallowed by the default reporter). Delete the scratch file immediately after and confirm `git status` is clean in `packages/powerscore`.
