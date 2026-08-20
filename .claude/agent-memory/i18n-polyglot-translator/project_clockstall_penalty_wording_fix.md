---
name: project-clockstall-penalty-wording-fix
description: 2026-08-20 fix of powerScore.tooltipClockStallPenalty (multiplier → flat deduction) across all 11 non-English locales, plus deletion of the unused clockFrozenNote key
metadata:
  type: project
---

`en.json`'s `powerScore.tooltipClockStallPenalty` was corrected because the engine actually applies
a flat point deduction, not a multiplier — the old EN and every locale's translation said
"multiplier"/similar (moltiplicatore, multiplicador, 배율, 乘数, etc.), which was simply wrong
about how the mechanic works, not a translation error. Also deleted the now-unused
`powerScore.clockFrozenNote` key (UI no longer renders that note) from all 12 locales.

**How to apply:** if `en.json`'s PowerScore tooltip text changes again to correct a *mechanic*
description (not just wording polish), re-check every locale's translation for the same stale
mechanic claim — they were all translated faithfully from the old (wrong) English, so they all
inherited the error identically.

**"Flat"/fixed-amount vocabulary reused per locale** (mirrors each locale's existing "flat bonus"
term in `tooltipPostseasonBoost`, kept for consistency):
- de: `pauschalen Punktabzug` (pauschal = flat, matches `Pauschalbonus`)
- es: `una cantidad fija de puntos` (fija = fixed, matches `bono fijo`)
- fil: `flat na bilang ng puntos` — kept "flat" as the English loanword (matches fil's
  `tooltipPostseasonBoost` "flat bonus"); used "puntos" (naturalized Spanish-derived loanword,
  common in Filipino sports speech) rather than English "points"
- fr: `un nombre fixe de points` (fixe = fixed, matches `bonus fixe`)
- it: `un numero fisso di punti` (fisso = fixed, matches `bonus fisso`)
- ja: `一定のポイント` (a set/fixed amount of points) — deliberately did NOT reuse the
  `tooltipPostseasonBoost` loanword フラット here; フラットに減点 read awkward as a manner
  adverb, whereas 一定の as a modifier on the noun is idiomatic Japanese
- ko: `고정된 점수` (fixed points) — reuses 고정 from `tooltipPostseasonBoost`'s "고정 보너스";
  kept 해요체 register throughout, no direct-address pronoun needed (string is impersonal)
- pt_BR: `uma quantidade fixa de pontos` (fixa = fixed, matches `bônus fixo`, você-register file
  but this string has no direct address)
- pt_PT: `uma quantidade fixa de pontos` (fixa, matches `bónus fixo`); no pre-AO90 orthography
  words appear in this particular string so that convention wasn't triggered
- zh_CN: `固定扣除一定分数` (固定 = fixed, matches `固定加分` in postseasonBoost); formal 您
  register not triggered since string is impersonal
- zh_TW: same construction as zh_CN (`固定扣除一定分數`), informal 你 register not triggered
  for the same impersonal-string reason

No brand terms (PowerScore, ArenaSwap, Standby Stream) appear in this string in any locale, so no
brand-casing check was needed here — see [[project_brand_term_leakage]] for where that check
actually matters.

Mechanically: used the byte-level `bytes.replace()`-on-decoded-text approach from
[[reference_locale_file_mechanics]] (Python `str.replace` on the full decoded UTF-8 text since tab/
CRLF fidelity is preserved by not touching anything outside the exact substrings), asserted
occurrence count == 1 before writing, wrote with `open(..., encoding='utf-8', newline='')`, and
verified: (1) `json.loads` still parses, (2) `powerScore` key order matches en.json's expected
order minus `clockFrozenNote`, (3) `git diff --stat` shows exactly 3 changed lines per file
(1 deletion for the removed note key, 1 deletion + 1 insertion for the tooltip line). All 11
locales came back clean on that check.
