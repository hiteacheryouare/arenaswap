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

Locale parity is easy to verify mechanically: flatten `apps/extension/locales/*.json` (CRLF/tab, nested, WXT-i18n plural leaves look like `{"1": ..., "n": ...}`) and diff key sets against `en.json`. Treat plural objects as leaves or you will get false "missing key" reports.
