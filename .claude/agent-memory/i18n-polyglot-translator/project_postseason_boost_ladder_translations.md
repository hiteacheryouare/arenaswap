---
name: project-postseason-boost-ladder-translations
description: postseasonBoost.points/explainer rewritten for the ceiling+ladder mechanic (2026-09-09) across all 12 locales; first time "semifinal"/"quarterfinal"/"title game"/"exhibition game" needed translating in this project
metadata:
  type: project
---

2026-09-09: the postseason boost changed from a flat bonus to a ceiling scaled by round —
semifinal 75%, quarterfinal 50%, anything earlier 25%, and some ESPN-tagged "postseason" games
(non-playoff bowl games, NFL Pro Bowl, early NIT/WBIT rounds) now earn 0. Rewrote
`postseasonBoost.points` and `postseasonBoost.explainer` in all 12
`apps/extension/locales/*.json` files. Only those two keys changed per file — verified via
per-locale diff (2 lines changed, nothing reordered) and JSON-parse + CRLF/trailing-newline
checks per [[reference_locale_file_format]].

**English locked in:**
- `points`: `"up to +$1 pts"`
- `explainer`: `"The most a title game can add. Earlier rounds earn a share — three quarters for
  a semifinal, half for a quarterfinal, a quarter for anything earlier. Exhibitions earn
  nothing."`

**New terminology this namespace established — reuse for consistency if these concepts
reappear anywhere else (playoff bracket UI, etc.):**

| concept | de | es | fil | fr | it | ja | ko | pt_BR | pt_PT | zh_CN | zh_TW |
|---|---|---|---|---|---|---|---|---|---|---|---|
| semifinal | Halbfinale | semifinal(es) | semifinal (EN loan) | demi-finale | semifinale | 準決勝 | 준결승 | semifinal | **meias-finais** (plural) | 半决赛 | **準決賽** |
| quarterfinal | Viertelfinale | cuartos de final | quarterfinal (EN loan) | quart de finale | quarto di finale | 準々決勝 | **8강** | quartas de final | **quartos-de-final** | 四分之一决赛 | 四分之一決賽 |
| title/champ. game | Finale | la final | championship game (EN loan) | une finale | una finale | 決勝 | 결승 | a final | a final | 决赛 | 決賽 |
| exhibition game | Freundschaftsspiel | partido de exhibición | exhibition game (EN loan, "mga" + singular per [[locale_fil_terminology]]) | match d'exhibition | partita di esibizione | エキシビションマッチ (loan) | 이벤트성 경기 | jogo de exibição | jogo de exibição | 表演赛 | 表演賽 |

**pt_BR vs pt_PT structural divergence, confirmed real football terminology (not a guess):**
pt_BR uses singular "semifinal" + plural "quartas de final"; pt_PT uses plural "meias-finais" +
"quartos-de-final" (note *quartos* not *quartas*). This is an established difference in
Brazilian vs. European football commentary, independent of the general pt_BR/pt_PT split
already logged elsewhere.

**ko round-name choice:** used 준결승/8강 rather than 준결승/준준결승 — Korean sports
broadcasting overwhelmingly uses the "X강" (final-X) convention for rounds of 8 (see also 4강
for Final Four), and "준준결승" (double 준-) is a stilted, rarely-used calque. This sits beside
the existing [[project_ko_terminology]] approved-term map; 포스트시즌/부스트 unchanged.

**zh_TW vs zh_CN semifinal divergence:** zh_TW uses 準決賽 (attested in CPBL/SBL/PLG playoff
coverage) rather than zh_CN's 半决赛 — consistent with [[project_zh_tw_terminology]]'s standing
rule that zh_TW is never a script conversion of zh_CN. Quarterfinal (四分之一决赛/四分之一決賽)
and title game (决赛/決賽) are script-only differences, kept parallel deliberately since both are
formal, unambiguous, and this string has to cover all six sports generically rather than one
league's own colloquial shorthand (e.g. Taiwan's casual "八強賽" was considered and rejected for
this specific string for that reason).

**fil fraction handling:** used numeral percentages (75%/50%/25%) rather than fraction words —
"kalahati" (half) is natural Filipino but "three-quarters" has no equally natural single-word
Taglish form, and percentages read as unambiguous and idiomatic in Philippine sports Taglish.
Kept "semifinal"/"quarterfinal"/"championship game"/"exhibition game" as English loans per the
file's established Taglish register from [[locale_fil_terminology]] and [[project_favorite_teams_settings_translations]]'s
precedent — applied the "mga + singular English noun" rule to "mga exhibition game".

**ja/ko points key still diverges as before:** ja keeps English "pts" loanword ("最大+$1 pts"),
ko uses native 점 ("최대 +$1점") — this was already the case pre-change, not a new decision, just
preserved when adding the "up to"/최대 prefix. CJK placeholder-spacing rules from
[[reference_cjk_prose_vs_heading_split]]'s sibling note (see
[[reference_locale_file_format]] pointer) were followed: space before/after the `+$1` token in
zh_CN/zh_TW ("最多 +$1 分"), no space in ja before the token, space before but not after in ko.

Related: [[reference_locale_file_format]], [[project_ko_terminology]],
[[project_zh_tw_terminology]], [[locale_fil_terminology]]
