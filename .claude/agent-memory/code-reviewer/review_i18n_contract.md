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

**`pt_PT.json` spelling: CORRECTED 2026-10-21.** An earlier note said pt_PT used pre-1990-Agreement
spelling ("Actualizar", "directo"). At HEAD e9d15c29 it uses the modern forms throughout ("Ativa" x6,
"atualização" x4, "Desativado" x4, zero "actual-"/"activ-" hits). Do not flag "Ativado"/"Atualiza" in new
pt_PT strings. Re-grep `git show HEAD:apps/extension/locales/pt_PT.json` before raising spelling at all.

**Filipino and Italian often keep English** (fil: "Scoring mode", "Fantasy roster", "Onboarding", "Settings file";
it: "On"/"Off"). A same-as-English check flags them; they read as loanword choices. Check
`.claude/agent-memory/i18n-polyglot-translator/` for the term list before calling one a miss.
