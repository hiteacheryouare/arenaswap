---
name: project-ci-and-enforcement
description: What CI runs on arenaswap PRs (ci.yml, workspaces only — scripts/ is never linted or typechecked) and which rule classes no tool checks — read before deciding a finding is "lint will catch it"
metadata:
  type: project
---

As of 2026-10-06, `.github/workflows/ci.yml` runs on PRs: `turbo run lint typecheck --continue`, `turbo run test`, `turbo run test:e2e`, and a build & zip matrix (chrome/edge/firefox). Also `dependabot-automerge.yaml` and `docs.yml` (deploys the docs site on push to `mega`, commits built `docs/` back). Whether checks are *required* for merge is unknown.

**Why:** CI was added after an earlier period with no gating; the maintainer still hand-tests while watching sports.

**How to apply:**
- Turbo tasks only cover npm workspaces (`apps/*`, `packages/*`). Everything under `scripts/` is never linted or typechecked by CI, even if it has its own tsconfig. Treat scripts/ code as unverified. Stack #221 (2026-10-12) moved the PowerScore tools to `packages/powerscore-tools` and the films to `apps/film`, so those get lint + typecheck once it lands; CI still never runs `build:film` or a render.
- **Lint vs rolldown race (pre-existing since 09cc4e15):** `lint` has no `dependsOn`, and every package whose build is `rolldown -c` with a `.ts` config (core, powerscore, powerscore-tools, apps/film) briefly writes an un-ignored `rolldown.config.<hash>.js` beside it. If `oxlint .` walks the dir mid-build it fails with "Failed to open file …rolldown.config.XXXX.js". Rerun passes. Each new package dragged into the lint+typecheck graph widens it (#220 pulled powerscore-tools#build in via film's ^build). Fix is one ignore pattern; until then, a single red Lint job with that message is a flake, not a finding.
- oxlint (`.oxlintrc.json`) enables only the `react`, `typescript`, `jsx-a11y`, and `unicorn` plugins. **`react-hooks` is NOT enabled**, so Rules-of-Hooks and exhaustive-deps violations are invisible to tooling and are always worth reporting. Any `// eslint-disable-next-line react-hooks/...` comment in the tree is inert.
- `apps/extension` `npm test` = jest unit projects **plus** `cypress run --component`.
- `docs.yml` uses `npm install`, not `npm ci`, so lockfile drift is not caught there.
- The docs workflow committing `docs/` back to `mega` is why `docs/**/*.html` shows up in almost every merge conflict — those conflicts are regenerable, not semantic.
- WXT's Firefox sources zip uses sourcesRoot = apps/extension with `dot: false`, so `.output/<anything>` and anything outside apps/extension never enters it.
