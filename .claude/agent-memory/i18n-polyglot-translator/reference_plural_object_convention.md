---
name: reference-plural-object-convention
description: How each locale renders the {"1": ..., "n": "$1 ..."} two-form plural object used for counts in locale JSON
metadata:
  type: reference
---

The repo's plural shape for small numeric counts (1 vs. many, no full CLDR few/many
distinction) is a two-key object: `{"1": "<singular, numeral literal>", "n": "$1 <plural
noun>"}`. First seen in `powerScore.favoriteTeamsInMatchup`; `setup.upcomingDaysValue`
was converted to this shape on 2026-08-19 (previously a plain `"{days} days"` string).

Per-locale pattern to follow for any *new* key using this shape:

- **de/es/fr/it/pt_BR/pt_PT**: ordinary singular/plural noun (and adjective, where
  applicable) agreement — e.g. days: `Tag`/`Tage` (de), `día`/`días` (es),
  `jour`/`jours` (fr), `giorno`/`giorni` (it), `dia`/`dias` (pt_BR & pt_PT, identical
  in both dialects for this word).
- **fil**: singular form has no linker; the `"n"` form inserts the linker particle
  `na` between `$1` and the noun — e.g. `favoriteTeamsInMatchup.n` =
  `"$1 na paboritong team sa matchup"`, and `upcomingDaysValue.n` =
  `"$1 na araw"` (araw = day, already used natively elsewhere in fil.json, e.g.
  `noGames.title` = "Tahimik na araw sa sports..."). Singular stays `"1 araw"`
  (no `na`), matching `favoriteTeamsInMatchup`'s `"1 paboritong team"`.
- **ja/ko/zh_CN/zh_TW**: no grammatical plural — both forms are identical except for
  the numeral, using a bound counter/measure word with **no space** in ja/ko
  (`1日`/`$1日` ja; `1일`/`$1일` ko) but **with a space** in zh_CN/zh_TW (`1 天`/
  `$1 天`) — this spacing split matches each locale's own pre-existing convention
  for numeral+unit (`detail.unitDays`, and the original un-pluralized
  `upcomingDaysValue` string before this change: ja/ko had no space, zh_CN/zh_TW had
  one).

**How to apply:** when adding a new plural-shaped key, first translate the singular
and plural nouns as you would normally, then apply the locale-specific mechanical
rule above (linker particle for fil; space-vs-no-space for CJK) rather than
inventing the treatment fresh.

Related: [[reference-cjk-punctuation-and-spacing]].
