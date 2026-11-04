---
name: project-turbo-test-groups
description: Since 49c2573c7 (2026-11-03) every suite is its own cached turbo task; Cypress specs live in feature folders guarded by test:specGroups
metadata:
  type: project
---

Commit 49c2573c7 split the suites. `test` and `test:e2e` are script-less umbrellas; `test:e2e` stays out of `test`.

- Jest: `test:unit` in every package; sideline's `test` also gathers its offline Jest `test:e2e`, as it always did.
- Extension Cypress: one folder per group, `cypress/component/{ui,detail,gameList,settings,onboarding,guide,multiview}` and `cypress/e2e/{popup,settings,tabs}`. Script `ARENASWAP_SPEC_GROUP=<g> cypress run --<type>`; the config turns the env var into specPattern, a per-group Vite cacheDir and screenshots folder. The e2e server takes port 0.
- `test:specGroups` (Jest project in apps/extension/tests/specGroups) traces each spec's imports and fails when a group loads a file its turbo inputs omit, a spec sits outside a folder, or a group is missing from its umbrella or from ci.yml. It caught real holes on day one (support/component.ts imports popup's prefetchIntent.ts).
- Builds exclude test files and package-root *.md from inputs, so a test edit reruns only that test.

**Why:** the single `extension#test` task (266 s) reran on any extension edit and was the CI critical path.

**How to apply:** a new spec goes in a feature folder; a new folder needs task + script + umbrella entry + CI matrix entry. Open questions left for Ryan: 7 parallel component groups locally caused one contention timeout (detailTabsOverflow passed alone twice); extension typecheck (~130-175 s) is now the critical path. Related: [[reference-turbo-inputs-gotchas]].
