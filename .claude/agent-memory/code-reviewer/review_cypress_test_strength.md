---
name: review-cypress-test-strength
description: Cypress component tests in arenaswap that look like they guard something but cannot fail — StrictMode wrappers, growing alias counts — plus how to mutation-check a PR head
metadata:
  type: reference
---

Measured 2026-10-06 on PR #199 (React 19.3, Cypress 16.1):

- `cy.mount(<StrictMode>...</StrictMode>)` does **not** double-run effects in this harness. A probe component with a `useEffect` counter ran once with NODE_ENV=development. Any spec claiming "asks once under StrictMode" is vacuous; don't credit it as coverage.
- `cy.get('@alias.all').should('have.length', 1)` retries until it sees 1. On a request count that can only grow, it passes on the first instant the count is 1, so it only catches a second request that landed *before* the assertion started. It is only meaningful when something earlier in the test (a rendered element that needs the response) already forced the extra request to land.
- CI's "Unit & component tests" job: when a jest suite fails (e.g. core's apiClient retention-window tests), turbo stops and `cypress run --component` never runs. A red job there means the Cypress specs in the PR were not exercised by CI.

Mutation-checking a PR head without touching the shared checkout: `git worktree add --detach /tmp/<name> origin/<branch>`, symlink the four `node_modules` dirs (root, apps/extension, packages/core, packages/powerscore) into it, `cd apps/extension && env -u ELECTRON_RUN_AS_NODE npx cypress run --component --spec <files>`, edit the source there to break the behaviour, rerun. `git worktree remove --force` unlinks the symlinks without touching their targets.

Related: [[reference-review-targets]], [[review-popup-failure-map]].
