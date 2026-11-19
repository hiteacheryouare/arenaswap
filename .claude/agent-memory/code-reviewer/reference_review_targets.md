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

Safe partial verification when `turbo build/test/typecheck` is off-limits: `npx tsc --noEmit -p apps/docs/tsconfig.typecheck.json`, `npx tsc --noEmit -p packages/ui/tsconfig.json`, and `cd packages/ui && npx jest --selectProjects unit` are all pure and touch nothing. `apps/docs/tsconfig.json` does not cover `.astro` at all (no `@astrojs/check` — it peers on TS ^5/^6 while the repo is on ^7), so `.astro` frontmatter is unchecked by any tool.

The built site is not tracked (since 2026-11-19). To prove a build-time claim, run `npx astro build --outDir <scratch>` in `apps/docs` and inspect that: grep `<scratch>/**/*.html` for canonicals, `robots`, `alt`, and resolved internal links; grep `<scratch>/_astro/*.{js,css}` for emitted banners, duplicate custom-property declarations and bundle contents. Check a known-new string first to confirm the output is not stale.

Locale parity is easy to verify mechanically: flatten `apps/extension/locales/*.json` (CRLF/tab, nested, WXT-i18n plural leaves look like `{"1": ..., "n": ...}`) and diff key sets against `en.json`. Treat plural objects as leaves or you will get false "missing key" reports.

**Firefox cannot be driven from the agent sandbox (2026-10-09).** Firefox 157 is installed and `cypress info` lists it,
but `cypress run --component --browser firefox` never connects, and headless `firefox -screenshot` reports
"Could not find profile folder". Don't burn time on it: say the Firefox check is unverified and ask Ryan to hand-test.
