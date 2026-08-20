---
name: reference-review-targets
description: Where the shipping runtime lives vs generated/duplicated code, and the exact commands that verify an arenaswap branch
metadata:
  type: reference
---

Verification commands (npm only — never pnpm):
- `npx turbo run typecheck --force` — includes `wxt prepare` and a separate `tsc -p cypress` pass.
- `npx turbo run test --force` — extension task is jest unit **plus** `cypress run --component`; a failure here can be Cypress, not jest.
- `npx turbo run lint --force` — oxlint.
- Cypress writes `apps/extension/cypress/screenshots/` on failure (gitignored). Delete it after a review run.

Reading a branch without touching the shared checkout: `git show <ref>:<path>` and `git diff origin/mega...origin/dev -- <paths>`. `git merge-tree --write-tree --messages origin/mega origin/dev` lists conflicts without a checkout.

Safe partial verification when `turbo build/test/typecheck` is off-limits (those tasks rewrite the tracked `docs/` tree): `npx tsc --noEmit -p apps/docs/tsconfig.typecheck.json`, `npx tsc --noEmit -p packages/ui/tsconfig.json`, and `cd packages/ui && npx jest --selectProjects unit` are all pure and touch nothing. `apps/docs/tsconfig.json` does not cover `.astro` at all (no `@astrojs/check` — it peers on TS ^5/^6 while the repo is on ^7), so `.astro` frontmatter is unchecked by any tool.

The tracked `docs/` tree is a real build of the branch, so it is the cheapest way to prove a build-time claim without building: grep `docs/**/*.html` for canonicals, `robots`, `alt`, and resolved internal links; grep `docs/_astro/*.{js,css}` for emitted banners, duplicate custom-property declarations and bundle contents. Check a known-new string first to confirm the output is not stale.

Locale parity is easy to verify mechanically: flatten `apps/extension/locales/*.json` (CRLF/tab, nested, WXT-i18n plural leaves look like `{"1": ..., "n": ...}`) and diff key sets against `en.json`. Treat plural objects as leaves or you will get false "missing key" reports.
