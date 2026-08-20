---
name: project-ci-and-enforcement
description: What actually gates merges in arenaswap (almost nothing) and which rule classes no tool checks — read before deciding a finding is "lint will catch it"
metadata:
  type: project
---

There is no CI that runs tests, typecheck, or lint on pull requests. `.github/workflows/` holds only `dependabot-automerge.yaml` and `docs.yml` (deploys the docs site on push to `mega`, and commits the built `docs/` tree back to the branch).

**Why:** the project is maintained by one person who hand-tests the extension while watching sports; automated gating was never set up.

**How to apply:**
- Never assume a red test or type error would have been caught before the PR. Run `npx turbo run test typecheck lint` yourself and paste real output — it is often the only verification a branch has had.
- oxlint (`.oxlintrc.json`) enables only the `react`, `typescript`, `jsx-a11y`, and `unicorn` plugins. **`react-hooks` is NOT enabled**, so Rules-of-Hooks and exhaustive-deps violations are invisible to tooling and are always worth reporting. Any `// eslint-disable-next-line react-hooks/...` comment in the tree is inert.
- `apps/extension` `npm test` = jest unit projects **plus** `cypress run --component`. Cypress component specs are real gating in that command but run nowhere automatically.
- `docs.yml` uses `npm install`, not `npm ci`, so lockfile drift is not caught either.
- The docs workflow committing `docs/` back to `mega` is why `docs/**/*.html` shows up in almost every merge conflict — those conflicts are regenerable, not semantic.
