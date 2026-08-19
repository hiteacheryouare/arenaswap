---
name: review-i18n-contract
description: How to verify i18n in apps/extension during review — every user-facing string goes through i18n.t, keys live in locales/en.json, 12 locales ship
metadata:
  type: project
---

Every user-facing string in `apps/extension` must go through `i18n.t('<dotted.key>')`, with the key defined in `apps/extension/locales/en.json` (nested JSON, dotted access) and mirrored across all 12 shipped locales. `apps/extension/.wxt/i18n/structure.d.ts` is generated and lists every valid key plus its substitution count.

**Why:** 12 locales ship, and untranslated literals show up as English text sitting next to translated text in the same view — most visibly for `fr`, `ja`, `zh_CN`, `zh_TW`, where even short labels like `gameCard.live` ("EN DIRECT" / "ライブ" / "直播") differ.

**How to apply:** during review, extract dotted string literals from changed components and diff them against a flattened `locales/en.json` — cheap and catches typo'd keys. Then separately grep the changed files for bare uppercase/English literals in JSX text, `title=`, and `aria-label=`; those are the ones the key check cannot see. Numeric substitution arrays (`i18n.t('x.step', [1, 8])`) are the established pattern and are fine — do not flag them. `PowerScore` is untranslated in every locale, so hardcoding that one word is harmless.

Related: [[review-popup-failure-map]]
