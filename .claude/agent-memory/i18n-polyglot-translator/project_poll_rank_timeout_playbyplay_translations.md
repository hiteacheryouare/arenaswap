---
name: project-poll-rank-timeout-playbyplay-translations
description: 2026-09-20 — gameCard.teamRank/timeoutsRemaining/timeoutsShort + detail.latestPlayHeading/pitchingLabel/atBatLabel across 11 locales; "TO" universal-broadcast-notation ruling, pt_BR/pt_PT timeout-word split, and the atBat real-idiom research
metadata:
  type: project
---

Translated six new keys added alongside the poll-rank/timeout-dots/latest-play feature
(CHANGELOG "Three things the scoreboard poll was already carrying — 2026-09-20"):
`gameCard.teamRank`, `gameCard.timeoutsRemaining`, `gameCard.timeoutsShort`,
`detail.latestPlayHeading`, `detail.pitchingLabel`, `detail.atBatLabel`. Inserted after
`downDistanceAt` and `gameInfoHeading` respectively, in all 11 non-English locales.

**"TO" (timeoutsShort) is kept identical — `{count} TO` — in ALL 11 locales, including
zh/ja/ko.** Reasoning: `box.overtime` = "OT" and `box.overtimeNumbered` = "{count}OT" are
already kept universally literal even in zh_CN/zh_TW, which otherwise fully localize every
other box-score abbreviation (投球/打撃/得分 etc. instead of P/AB/R). That's the established
precedent for compact broadcast-scoreboard notation specifically (as opposed to a spelled-out
stat-category label) — "TO" for timeout follows the same rule as "OT" for overtime, not the
box-namespace localize-everything rule. Don't reinvent a zh single-character abbreviation for
this key; there's no precedent for one and OT already proves the alternative works.

**Real full-word "timeout" per locale was cross-checked against `loading.m10`** ("Counting
the timeouts...", already translated in all locales) rather than invented fresh:
de "Auszeiten", es "tiempos fuera", fr "temps morts", ja "タイムアウト" (タイムアウト),
ko "타임아웃", fil "mga timeout" (loanword + mga, confirms
[[locale-fil-terminology]]'s pluralization rule). **it uses "time-out" (hyphenated
loanword)** per m10 — not a native Italian word, correct this if you see a bare "timeout"
elsewhere in it.json describing the same concept.

**pt_BR/pt_PT timeout-word split (new, not previously documented):** pt_PT's m10 says
"tempos mortos" (dead times) — the real, standard European Portuguese term for a game
timeout (basketball/handball), cognate with French "temps morts". pt_BR's m10 says only
"tempos" (bare "times"), which reads as an existing minor mistranslation/ambiguity, not a
deliberate term — did not propagate it. Used "tempo técnico" (technical time) for pt_BR
instead, the real standard Brazilian broadcast term (Globo/ESPN Brasil basketball/volleyball
commentary). If `loading.m10` for pt_BR is ever revisited, "tempos técnicos" is the more
accurate fix.

**`detail.atBatLabel` ("At bat") got real target-language baseball idioms, not a reuse of
`box.batting`.** English deliberately uses a different word for "who's up right now"
(At bat) vs. the stat-category heading (Batting) — that distinction is intentional and worth
preserving, unlike `pitchingLabel`, where English reuses "Pitching" for both senses (so
`pitchingLabel` safely reuses each locale's existing `box.pitching` translation verbatim).
Idioms used, all verified as genuine established sports terminology, not invented:
- es: **"Al bate"** (standard MLB-en-español term, distinct from "Bateo")
- fr: **"Au bâton"** (Quebec/RDS baseball term, distinct from "Frappe")
- it: **"In battuta"** (Italian Baseball League term, distinct from "Battuta" alone)
- de: **"Am Schlag"** (German baseball-Bundesliga term, distinct from "Schlagen")
- ja: **"打席"** (precise "this plate appearance" term, distinct from 打撃 = batting-the-skill;
  ko mirrors with **"타석"** vs 타격; zh_CN/zh_TW both use **"打席"** too — same characters
  work in both, distinct from 打击/打擊)
- pt_BR/pt_PT: no confidently-attested distinct idiom found (baseball is niche in both
  markets) — used a grammatical progressive instead, which also showcases the real BR/PT
  grammar fork: **pt_BR "Rebatendo"** (gerund, the BR-PT way to express ongoing action) vs.
  **pt_PT "A rebater"** ("a" + infinitive, the EU-PT progressive construction). Flagged as
  the weakest-confidence pair in this batch — a native reviewer call is welcome.
- fil: kept **"At Bat"** fully literal English, matching the already-established
  `box.pitching` fil = "Pitching" (bare-loanword) precedent for baseball terms.

**`gameCard.teamRank` ("Ranked #{rank}")** is a tooltip with no width constraint (unlike the
other two `gameCard` keys). Used "[translated verb/noun] #{rank}" keeping the `#` glyph
literal to match the visible "#2" badge next to it: de "Rang #{rank}", es "Puesto #{rank}",
fr "Classé #{rank}", it "Classificato #{rank}", pt_BR/pt_PT "Classificado #{rank}" (gender
left masculine-default, standard for unattached ranking labels), fil "Ranked #{rank}"
(literal). ja/ko/zh drop the `#` glyph for native ordinal grammar instead: ja "ランキング{rank}位",
ko "랭킹 {rank}위", zh_CN/zh_TW "排名第{rank}" (identical string in both dialects — no
simplified/traditional divergence for this particular phrase).

**Colon-spacing verified per-locale before writing `timeoutsRemaining`, not assumed:**
scanned every existing colon-bearing string in each file via a JSON-value walk (not naive
grep — plain `grep -oP` on a tabbed/CRLF JSON file matches garbage against the `"key": "value"`
syntax itself). Findings, some of which override the general
[[reference-cjk-punctuation-and-spacing]] rule of thumb:
- fr uses `" : "` (space both sides) consistently — French typographic rule, already established.
- de/es/it/pt_BR/pt_PT/fil/ko use plain `": "` (no space before, space after), matching English.
- **ja uses full-width `：` with no space, attached directly to the placeholder** (see
  `stepPowerScore.signalAriaLabel` = "シグナル：{signal}") in 5 of 6 existing instances.
  `detail.teamRecord` = "戦績: {record}" (half-width, spaced) is the one outlier — don't copy
  it, it's inconsistent with the file's own majority pattern.
- zh_CN/zh_TW always use full-width `：`, no space, and always put a space around a counted
  Latin placeholder + measure word inside a sentence (`"1 场比赛"`, `"$1 个标签页"`) — so
  `timeoutsRemaining` reads `"{team}：还剩 {count} 次暂停"` (space around `{count}`, no space
  at the `：`).

Related: [[locale-fil-terminology]], [[reference-cjk-punctuation-and-spacing]],
[[reference-plural-object-convention]], [[reference-locale-file-mechanics]],
[[project-fr-fr-ca-split]], [[project-box-namespace-terminology]].
