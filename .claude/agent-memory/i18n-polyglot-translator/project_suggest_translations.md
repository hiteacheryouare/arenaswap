---
name: project-suggest-translations
description: Approved translations for the new suggest.* namespace (tab-suggestion banner/review-sheet feature) across all 11 non-English locales, added 2026-08-27
metadata:
  type: project
---

Added `suggest.*` (bannerTitle/bannerCopy/bannerAction/bannerDismiss/header/lede/empty/rowLabel/apply/applyNone/toastApplied) immediately after `tabAssign` in all 12 locale files. This is the tab-suggestion feature: inspects open browser tabs, guesses which show which of today's games, offers pairings for review with checkboxes + a per-row dropdown fallback.

**"Slate" (the day's set of games) — translated for meaning, not literalized, per locale:**
de `Spielplan`, es `cartelera`, fil `mga laro ... ngayon` (no single noun, folded into "your games today"), fr `programme`, it `palinsesto`, pt_BR `grade` (grade de jogos, real BR sports term), pt_PT `calendário`, ja/ko folded into "today's games" (今日の試合 / 오늘 경기, no separate noun), zh_CN/zh_TW `赛程`/`賽程`. No locale attempted a literal "slate" loanword or calque — every one substituted its own real sports-schedule vocabulary.

**"Have the final say" idiom, per locale** (re-derived rather than calqued):
de `hat ... das letzte Wort` · es `tiene la última palabra` · fr `garde ... le dernier mot` · it `ha ... l'ultima parola` · pt_BR `tem a palavra final` · pt_PT `a ter a última palavra` · fil `may huling say pa rin` (Taglish, "say" kept English per the file's established loanword calibration) · ja `最終的な決定権を持っています` (final decision-making authority) · ko `최종 결정권을 가지고 있어요` (same construction) · zh_CN `仍拥有最终决定权` · zh_TW `依然握有最終決定權`.

**"Look like" vs. "line up with/match" — two distinct verb families in the English source** (bannerTitle+empty use "look like"; bannerCopy uses "line up with"). Every locale preserved this distinction with two different verbs rather than collapsing to one — worth checking for on any future addition to this namespace, since it's easy to flatten by accident (caught and fixed for ja/ko during this pass, where an early draft used the "matches" verb for `empty` instead of the "looks like" verb family).

**pt_PT deliberately diverges from pt_BR on `bannerAction`**: pt_BR `Dar uma olhada` (infinitive, neutral) vs. pt_PT `Espreitar` (to peek/spy — a characteristically European-Portuguese single-word choice, more playful, matches pt_PT's tendency toward distinct idiom rather than a shared Lusophone term). Both are infinitive-style, matching each file's established button convention (`Voltar`/`Seguinte`/`Tentar novamente`), not the reflexive-imperative register used in pt_PT body prose.

**Filipino (fil) notes:**
- "mungkahi" (native word for suggestion) used for header/dismiss, NOT an English loanword — judgment call that "suggestion" isn't sports/gaming jargon (unlike tab/card/dropdown which stay English per [[locale-fil-terminology]]'s calibration), so the native word reads more natural here.
- Header settled on `Mga Iminumungkahing Tab` (grammatical i-...-in passive gerund of "mungkahi", parallel to real Filipino UI/gov-form usage like "iminumungkahing aksyon"). Flagged as the one construction in this batch worth a native-speaker sanity check — correct but denser than the rest of fil's UI copy.
- `toastApplied` uses verb-first passive `Na-assign ang $1 na tab.` rather than trailing `na-assign` after the counted noun, specifically to avoid an awkward "na tab na na-assign" linker collision (the plural linker "na" immediately followed by the na- verb prefix reads clumsy) — this is the one place in this batch that deviated from the usual object-first sentence order for a mechanical/readability reason, not a register choice.

**Korean (ko) mechanical note:** `rowLabel` avoids attaching an object particle (을/를 or 과/와) directly to the `{tab}` placeholder, since the substituted value's final sound is unknown at translation time and Korean particle choice depends on it. Followed the file's own established pattern for this exact problem (`{label} 전환`, `{team} 응원팀으로 등록` — particle-bearing words never sit directly against an unpredictable placeholder) by using bare juxtaposition: `{tab} {away} vs {home} 경기 연결`. Apply this same avoidance whenever a new Korean string would otherwise need a case particle stuck straight onto a placeholder.

**away/home fixture-pairing phrasing (`rowLabel`, "Pair {tab} with {away} at {home}")** — deliberately mirrored each locale's own established away/home connector rather than reusing the bare `vs` badge (`gameCard.vs`), because `gameCard.openDetails` already set precedent that some locales localize this connector and some don't:
- Literal `vs` kept (matches `openDetails`): ja, ko
- Localized connector (matches `openDetails`): zh_CN `对阵`, zh_TW `對戰` (deliberately different from zh_CN's `对阵`, matching the project's standing zh_TW-independent-vocabulary policy — see [[project-zh-tw-terminology]])
- Latin-script locales used a natural two-preposition structure to avoid repeating the same preposition twice ("with X at Y"): de `mit ... bei ...`, es `con ... en ...`, pt_BR `com ... em ...`, pt_PT `a ... em ...`
- it used an idiomatic sports phrase instead of a bare preposition: `in casa di {home}` ("at {home}'s house") — genuinely how Italian sports media expresses an away-at-home fixture, a stronger fit than a literal preposition.
- fr restructured to insert "au match" between the verb and the away team specifically to avoid two consecutive `à`: `Associer {tab} au match {away} à {home}`.

**Mechanics:** used the byte-level `bytes.replace()`-on-decoded-UTF-8-text technique from [[reference-locale-file-mechanics]] (found the exact `\t},\r\n\t"favoriteTeamBonus": {` marker following `tabAssign` in every file, inserted the new block immediately before it). Verified per file: `json.loads` succeeds, CRLF count increased by exactly 22 (the block's own line count) with zero bare LF bytes introduced, trailing-newline state unchanged, and key-order/key-set equality against `en.json` at every level. All 11 non-English locales came back clean; `en.json` itself was not touched (its `suggest` block pre-existed as the task's given source).
