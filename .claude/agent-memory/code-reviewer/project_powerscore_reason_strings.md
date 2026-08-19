---
name: project-powerscore-reason-strings
description: PowerScore `reason` strings are intentionally English-only inside the npm package — don't flag them as i18n misses
metadata:
  type: project
---

The `scorerTunables.reasons` tokens and the inline reason strings in `packages/powerscore/src/scorer.ts`
("cutting into it", "on an 8-0 run", "best game available") are English-only and are **not** wired into
any locale file. Verified: no locale JSON anywhere in the repo contains them.

**Why:** `powerscore` is a standalone npm package with no i18n runtime, and the reason string is
displayed as-is. AGENTS.md's "internationalize every change" rule applies to the extension UI, not to
this package's algorithm output.

**How to apply:** Do not raise reason-string English as an i18n regression when reviewing
`packages/powerscore`. Locale-aware strings in the *extension* (e.g. the down-distance halves that
`apiClient.ts` deliberately keeps split so they can be joined through locale files) are a different
thing and do belong in locale JSONs.

See [[project-review-failure-map]].
