---
name: project-open-reveal-translations
description: setup.openReveal/openRevealExplainer/keywordsOpenReveal (opening-animation toggle) across 11 locales, 2026-09-19 — matchup-poster wording per language and the fil literal-English label call
metadata:
  type: project
---

Added a new Display-group toggle (`setup.openReveal`, `openRevealExplainer`,
`keywordsOpenReveal`) that turns off the popup's opening card-reveal animation.
Sits between `temperatureUnitRomer` and `holidayDecorations` in every locale file;
`keywordsOpenReveal` sits between `keywordsTemperature` and `keywordsHoliday`.

## "Matchup poster" — the interesting translation problem

The explainer's key phrase ("arrives as a matchup poster") had a real answer in
several locales because sports journalism already has a word for "the matchup" that
doubles as "poster/bill":

- **fr**: `affiche` — genuinely means both "poster" and "the matchup" in French sports
  slang ("quelle affiche!" = what a matchup!). Used "Chaque match apparaît en affiche"
  — a real pun, not a coinage.
- **it**: `locandina` (poster/bill, esp. fight-poster register) + `sfida` (matchup) →
  "locandina della sfida".
- **zh_CN** / **zh_TW**: `对阵`/`對戰` is the file's own pre-existing word for
  "matchup" (verified 4 prior uses each, e.g. `"{away} 对阵 {home}"` = "{away} vs
  {home}", `keywordsPostseasonBoost` has `对阵表`/`對戰表` = bracket) — combined with
  `海报`/`海報` (poster) to get `对阵海报`/`對戰海報`. Not a novel coinage, reuses
  established vocabulary.
- **de**: no attested German term for this concept — coined `Duellposter`
  (Duell = matchup/duel, commonly used for team matchups in German sports media, e.g.
  "Top-Duell der Bundesliga"). Flagged as a judgment call, unlike the fr/it/zh terms
  above which have real precedent.
- **es**: `póster del enfrentamiento` (enfrentamiento is the file's established
  matchup word, from `favoriteTeamsInMatchup`).
- **pt_BR**: `pôster do confronto`; **pt_PT**: `cartaz do confronto` — same
  "confronto" matchup word in both dialects, but poster noun differs regionally
  (pôster = BR loanword spelling, cartaz = the standard PT word; pôster is rare/odd
  in European Portuguese).
- **ja**: `対戦ポスター` (対戦 = face-off/matchup, already used for `favoriteTeamsInMatchup`
  as マッチアップ but 対戦 is the more natural compounding partner for ポスター).
- **ko**: `매치업 포스터` (매치업 is the file's loanword for matchup from
  `favoriteTeamsInMatchup`).
- **fil**: kept `matchup poster` as an English loanword phrase, consistent with
  `matchup` already being an English loanword elsewhere in fil.json
  (`favoriteTeamsInMatchup` = "... sa matchup").

## Register / pronoun choices for "when you open ArenaSwap"

Followed the existing per-locale address rulings from
[[project_pregame_gameinfo_translations]] rather than defaulting to an impersonal
construction: de `wenn du ArenaSwap öffnest`, es `cuando abres ArenaSwap`, fr `quand
tu ouvres ArenaSwap` (all informal 2nd person, matching established du/tú/tu
register), pt_BR `quando você abre o ArenaSwap`, pt_PT `quando abres o ArenaSwap`
(tu-conjugated, no explicit pronoun needed). it used `quando apri ArenaSwap` (tu
form) for consistency with the same rule, though it.json's own explicit-register
evidence was thinner than de/es/fr/pt.

## fil.json: kept `openReveal` label as literal English "Opening animation"

Mirrored the immediate neighbor `holidayDecorations`, which ships as the literal
untranslated string `"Holiday decorations"` in fil.json (title kept English, but its
explainer IS translated into Taglish — same split applied here: label stayed
English, `openRevealExplainer` was fully translated). This is a judgment call, not a
hard rule confirmed by the user — flagged in case a human reviewer prefers a
translated label instead. See [[locale_fil_terminology]] for the broader
loanword-retention conventions this follows.

## Keyword-list mechanics reused

Followed [[reference_locale_file_mechanics]]'s stripped-diacritics convention for
keyword lists in de/es/fr/it/pt_BR/pt_PT (e.g. de `enthullung`/`offnung` for
Enthüllung/Öffnung, es `revelacion`/`poster` for revelación/póster, pt
`animacao`/`introducao` for animação/introdução) — this list-only stripping doesn't
apply to the actual label/explainer strings, only to `keywords*` search-index values.
zh_CN/zh_TW keyword lists use ASCII `, ` separators even though prose uses Chinese
punctuation — confirmed pre-existing pattern, not new.

Related: [[project_pregame_gameinfo_translations]], [[reference_locale_file_mechanics]],
[[locale_fil_terminology]], [[reference_cjk_punctuation_and_spacing]].
