---
name: project-settings-drilldown-review
description: Corrections made 2026-08-15 to the 37 new setup.* keys (settings index groups + search keywords) added for the six-category drill-down settings screen
metadata:
  type: project
---

Ryan wrote a first pass of 37 new `setup.*` keys himself (group names/descriptions, search UI, 22 `keywords*` synonym lists) across all 8 locales for the new settings drill-down index (`apps/extension/entrypoints/popup/components/setupView.tsx`, catalog in `settingsCatalog.ts`). Audited to native-reviewer standard; found and fixed:

## Register-consistency bugs (the recurring category worth checking every time)
- **fr**: 3 of 6 group descriptions used formal `vous` even though fr.json is `tu` throughout the rest of the file (confirmed via `noGames`, `reviewPrompt`, etc.). Fixed `groupSwitchingDesc`/`groupStandbyDesc`/`groupDemoDesc` to `te`/`tu`.
- **pt_PT**: `groupSwitchingDesc` used formal object pronoun `o` ("o ArenaSwap o leva") instead of the file's established informal `tu` register (per [[project-pregame-gameinfo-translations]] ruling: pt_PT is `tu` throughout, `Prepara-te` not `Prepare-se`). Fixed to `te leva`. Also `groupDemoDesc` used `quiser` (você/ele conjugation) instead of the grammatically correct tu future-subjunctive `quiseres`. Both fixed.
- **zh_CN**: `groupSwitchingDesc` and `groupStandbyDesc` used informal `你` where the file uses formal `您` everywhere except the intentional `ludicrousSpeed` easter egg (per existing precedent). Fixed both to `您`.
- **de/es/ja**: no register issues found in this batch — de/es already consistently `du`/`tú`, ja has no explicit pronoun to get wrong.

**Why this keeps happening:** these are one-line descriptions written in a single first pass without cross-referencing the rest of the file's established address form. **How to apply:** whenever auditing a new batch of user-facing strings, specifically grep the file for its established 2nd-person register before reviewing content, then check every new string with a pronoun against it — this is now 3-for-3 locales catching a real bug.

## Mechanical fix: German ß does not decompose under `normalize('NFD')`
`"ß".normalize('NFD')` stays `ß` — it has no combining-mark decomposition, unlike ä/ö/ü (which do decompose and are correctly stripped by the project's `normalize()` in `settingsCatalog.ts`). Ryan's original `keywordsLeagues` for de had only `fussball` (manual ß→ss substitution); a user typing `fußball` with the actual eszett would NOT match. Fixed by keeping both spellings: `fussball, fußball`. **This is worth checking any time a German keyword list contains a word with ß** — ä/ö/ü need no such duplication, ß does.

## Semantic collision: a keyword must not just be "close enough," it must not steal traffic from a different, already-labeled setting
- **pt_BR**: `keywordsLeadChanges` included `viradas`, but `virada` is the exact, sole displayed label for the separate "Comeback" signal (`signalComeback`/`legendComeback` = "Virada"). In Brazilian sports usage `virada` specifically means a from-behind comeback win, not a generic lead swap — a user searching it would expect Comeback, not Lead Changes. Replaced with `troca de lideranca`. Confirmed by contrast: pt_PT's equivalent list uses `reviravoltas` for lead changes and its Comeback label is the unrelated word `Remontada`, so pt_PT has no such collision — this is what "right" looks like.
- **ja**: `keywordsBetting` included `ライン`, which the maintainer's own prior review ([[project-pregame-gameinfo-translations]]) explicitly ruled unusable for "Line" because it reads as the LINE messaging app in Japanese. That ruling had only been applied to the displayed `infoLine` label, not carried forward into this new keyword list. Removed `ライン` from `keywordsBetting`. **Lesson: prior single-string rulings need to be reapplied to every new list that touches the same concept, not just the original key.**

## Flagged, not changed (judgment calls for human sign-off)
- **ja**: `待機` appears in both `keywordsCooldown` and `keywordsStandby`; `逆転` appears in `keywordsLeadChanges` even though it's also the literal Comeback label. Judged these as genuine, defensible overlaps in native Japanese usage (逆転 legitimately covers both "lead reversal" and "comeback") rather than errors — flagged for Ryan rather than force-changed.
- **pt_PT**: `keywordsPostseasonBoost` uses `quadro` for "bracket" — plausible but not independently verified against real European Portuguese sports usage the way [[project-shootout-translations]] verified other pt_PT terms. Worth a follow-up check if it's ever questioned.

## Confirms "es" locale leans Latin American, not Iberian
Evidence stacked up during this review: `loading.m45` already used `asado` (LatAm/Argentine BBQ term, not Iberian `barbacoa`), and the new `keywordsBetting` included `momio` (genuine Mexican Spanish betting-odds slang) and `keywordsMomentum` included `seguidilla` (a Latin American baseball-streak term, not standard in Iberian Spanish where it usually means a flamenco verse form). **No es-MX/es-ES split exists in this project — there's just one `es` locale — but its vocabulary should be chosen assuming a Latin American (leaning Mexican) audience, not Spain**, consistent with prior choices in the file.

See [[reference-locale-file-mechanics]] for the CRLF/tab/EOF constraints this review had to preserve (Edit tool's whitespace matching failed against these files' raw tabs+CRLF; raw Python byte-level `bytes.replace()` was reliable and is the recommended approach for future edits to these 8 files).
