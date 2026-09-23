---
name: project-box-namespace-terminology
description: Terminology decisions for the `box` namespace (98-key box score section) added 2026-09-07 across all 11 non-English locales
metadata:
  type: project
---

`apps/extension/locales/*.json` gained a `box` namespace (98 keys, box score section on
the game detail screen), inserted immediately after `detail` in all 12 files. Translated
into de, es, fil, fr, it, ja, ko, pt_BR, pt_PT, zh_CN, zh_TW on 2026-09-07.

**Core rule, extending [[reference_locale_file_format]]'s established precedent**: for
narrow-column stat abbreviations (the ~37 keys from `runs` through `savePct`), every
locale except German, French and Chinese copies the English abbreviation verbatim —
this matches the already-shipped `detail.leaderAvg`…`leaderReceiving` keys, where even
Spanish, Italian, Portuguese, Japanese, Korean and Filipino keep `AVG`/`HR`/`RBI`/`PTS`
in English despite some of those languages (Spanish baseball, Japanese/Korean baseball)
having their own genuine native stat vocabulary. **Do not introduce native baseball/
football abbreviations for es/fil/fr/it/ja/ko/pt_BR/pt_PT even where you know a real one
exists** — consistency with the shipped leader block outranks authenticity here, per
Ryan's explicit instruction on this task.

**Established exceptions, all inherited from the leader block:**
- German hockey: `goals` → `T` (Tore). `hockeyAssists` stayed `A`, identical to English,
  because that's what `leaderHockeyAssists` already shipped as.
- French hockey: `goals` → `B` (buts). `hockeyAssists` likewise stays `A`.
- Chinese (both): baseball trio localized in full — `runs`→得分/得分, `hits`→安打,
  `errors`→失误/失誤, `hitsAtBats`→安打-打数/安打-打數, `rbi`→打点/打點,
  `homeRuns`→全垒打/全壘打, `walks`→保送, `strikeouts`→三振, `inningsPitched`→局数/局數,
  `earnedRuns`→自责分/自責分. Basketball: `points`→得分, `rebounds`→篮板/籃板,
  `assists`→助攻, `fieldGoals`→投篮/投籃, `threePointers`→三分. Hockeys's `goals`→进球/進球,
  `hockeyAssists`→助攻 (reuses the basketball assist word — Chinese doesn't lexically
  distinguish). Confirmed via CBA/CPBL box-score conventions, not guessed.
- Everything else — all American-football abbreviations, all hockey stats beyond
  goals/assists (`plusMinus`, `shots`, `penaltyMinutes`, `timeOnIce`, `goalsAgainst`,
  `shotsAgainst`, `saves`, `savePct`), `minutes`, `average` — stays English in **every**
  locale including Chinese. `average` in particular is reused across a baseball-AVG
  context and a football per-attempt-yards context, so translating it natively in any
  one language risks mislabeling the other sport.

**Taiwan/mainland basketball vocabulary genuinely differs**: `blocks` is 盖帽 (gài mào)
in zh_CN (mainland/CBA convention) but 阻攻 (zǔ gōng) in zh_TW (Taiwan SBL/P.LEAGUE+
convention) — not a typo, a real regional split. `steals` is 抢断/搶斷 in both (CBA
term, confirmed by search). Soccer's penalty kick is 点球/點球 in both (Taiwan Mandarin),
**not** 十二碼 — that literal "12-yard ball" term is Hong Kong Cantonese usage and does
not belong in zh_TW (Taiwan Mandarin, traditional characters but a different register).

**Group 3 (team-comparison full-word labels, ~33 keys, `possession`…`takeaways`)** were
translated properly per language rather than kept English, since these sit on a wide row
rather than a narrow column. American-football vocabulary leans on real loanword
patterns confirmed by research into each language's actual NFL coverage: German and
French keep "Down"/"Yards"/"Turnover" as loanwords (ran.de, RMC Sport style); Spanish
uses "yardas"/"acarreo"/"castigos" (ESPN Deportes style); Japanese and Korean render
American-football terms as katakana/Hangul phonetic loanwords (ファーストダウン,
퍼스트다운) per NFL Japan's and Korean sports media's own glossaries; Portuguese
(both variants) uses "jardas"/"down" per ESPN Brasil style.

**Filipino (`fil`) stays Taglish** per [[locale_fil_terminology]]'s register note:
the sport *nouns* (batting, pitching, passing, rushing, receiving, forward, defenseman,
possession, offside, corner, power play, takeaway, first down, etc.) are kept in English,
because PBA/UAAP/PFL broadcasts use exactly those loanwords and there is no live Filipino
vocabulary for hockey or American football at all.

**Corrected 2026-09-07 (second pass).** The first pass over-applied that rule and left 17
of 26 multi-word `box` keys byte-identical to English — a 65% rate against the file's own
12% baseline — and shipped `box.onGoal` as a copy of `box.shotsOnGoal`, substituting the
longer hockey string into the soccer row. Both are fixed. The soccer row is now "On goal"
and the hockey row "Mga shot sa goal". The rate is back to 12%.

What the fix turned on is that **English nouns are right and English plural `-s` is wrong**:
Filipino marks plurality with `mga` and does not double-mark, so a plural-count row label is
`Mga <singular English noun>` ("Mga rebound", "Mga yellow card", "Mga power play goal").
That shape was already shipped in `detail.probableGoalies` = "Mga Posibleng Goalie", so it
fights nothing. Rates (`possession`, `faceoffPct`), gerund headings (`batting`, `pitching`,
`goaltending`) and named singular game states (`thirdDown`) correctly stay bare English.
Full ruleset and the other structures used (Kabuuan, Minuto sa, Yards sa, pagkakataon,
"Stats ng Team") are in [[locale_fil_terminology]].

Related: [[reference_locale_file_format]], [[project_locale_codes]]

## Period-label columns vs stat columns (added 2026-09-07)

`box.periodEt1` / `periodEt2` / `periodPen` / `periodSo` were added after
`box.overtimeNumbered` in all 12 files (715 leaf keys). They are line-score column
headings for soccer extra time, the soccer penalty shootout, and the hockey shootout —
previously rendered wrongly as `OT`/`2OT`/`3OT`.

**The line that resolves the apparent contradiction in this namespace:** *stat* columns
stay English (the leader-block precedent above), but *period and result* labels go native,
because [[project_shootout_translations]] already established exactly that for
`gameCard.shootout` in de/fr/it/ja/pt_PT/zh_CN. Do not read the "keep English" rule as
covering period labels.

**Why `box.overtime` = `OT` in all 12 is not a counterexample:** `OT` is a genuine
international loan in the sports where it appears — DEL, B.League and the CBA all print
`OT` in their own box scores. Soccer extra time and penalties are the opposite case:
soccer is the sport every one of these languages actually covers, so every one has its
own settled abbreviation and an English import reads as foreign.

| locale | ET1 | ET2 | PEN | SO | notes |
|---|---|---|---|---|---|
| en | ET1 | ET2 | PEN | SO | source |
| es | TE1 | TE2 | PEN | SO | tiempo extra (LatAm register — this locale ships LatAm Spanish); PEN root reused from the badge |
| pt_BR | PR1 | PR2 | PEN | SO | prorrogação; `PR` is what NBB box scores print for extra periods |
| pt_PT | PR1 | PR2 | **GP** | SO | prolongamento also → PR (the two variants converge here); GP = grandes penalidades, the deliberate pt_PT/pt_BR divergence from the badge |
| it | TS1 | TS2 | **RIG** | SO | tempi supplementari; RIG (rigori) not DCR — `d.c.r.` describes a final *result*, a column holds the shootout tally, and RIG matches the shipped badge |
| fr | PR1 | PR2 | **TAB** | **TB** | prolongations; TAB = tirs au but (soccer). TB = tirs de barrage, NHL.com/fr's own glossary term — the same source that gave this namespace `B`/`A` for French hockey. Using TAB for both would have collided. |
| de | V1 | V2 | **i.E.** | SO | Verlängerung (BBL score-sheet form); `i.E.` = im Elfmeterschießen, lowercase `i` because this row has no ALL-CAPS convention (the badge was uppercased to `I.E.` to match one). `i.E.` not `n.E.` — the column is the shootout itself, `n.E.` is only the post-shootout result. |
| fil | ET1 | ET2 | PEN | SO | no native form for any of the four; PH football says extra time/penalties in English and there is no Filipino ice-hockey vocabulary at all |
| ja | 延前 | 延後 | **PK** | SO | 延前/延後 = J.League/NHK's own extra-time half notation, 2 glyphs so it fits where 延長1 (3 glyphs) would not |
| ko | ET1 | ET2 | **PK** | SO | Korean names extra time 연장전 in prose but has no column form, and 3 Hangul syllables overflow the column; PK is Korean media's real shootout form |
| zh_CN | 加1 | 加2 | **点球** | SO | 加N is CBA box-score notation for extra periods |
| zh_TW | 加1 | 加2 | **點球** | SO | 點球 per the Taiwan-Mandarin ruling above, never 十二碼 (HK Cantonese) |

**`SO` stays English in 11 of 12** and that is the researched answer, not a default: the
hockey shootout column is NHL.com's and ESPN's own `1 2 3 OT SO T`, and German (DEL),
Japanese, Korean and Chinese hockey coverage carry that same Latin row — which is why
`box.overtime` already ships as `OT` for all of them. French is the only locale with its
own glossary term. Filipino has no ice-hockey vocabulary whatsoever.

**Intentional same-value pairs, not substitution bugs:** `ja.periodPen` == `ja.penaltyKicks`
(`PK`) and the same in both Chinese (`点球`/`點球`). Japanese and Chinese have exactly one
compact term for a penalty kick; 戦 / 大战 are prose suffixes that a column does not take.
The two render in different tables. Do not "fix" these by inventing a distinction.

**Width budget:** these columns run ~26px at `font-size: 0.6rem`. Two CJK glyphs ≈ 18px
and fit; three ≈ 27px and do not. That is why ja is 延前 rather than 延長1 and ko fell back
to Latin. No Cypress spec measures the line-score header row — `boxScore.cy.tsx`'s
locale specs cover `.gd-setup-heading` and the player-table columns only.

## `pt_PT.box.defensemen`: Defesas → Defensores (fixed 2026-09-07)

pt_PT shipped `defensemen` = "Defesas" and `savesMade` = "Defesas", and unlike the other
same-value pairs in this namespace **those two render on the same hockey screen** — one as
the player-table section heading, one as the goaltending row in the team comparison.

**Why it happened, and why it was not carelessness:** the translator was following genuine
European Portuguese position vocabulary throughout — `forwards` = "Avançados" (not pt_BR's
"Atacantes"), `goaltending` = "Guarda-redes" (not "Goleiros"). Those are the *hóquei em
patins* position names, which is the right register for pt_PT, and in that register a
defender really is a *defesa*. The collision is a genuine lexical fact of European
Portuguese: the same word means "defender" and "goalkeeper's save".

**Why "Defensores" rather than copying pt_BR on faith:** the two locales legitimately
diverge everywhere else in this group, so parity was not the argument. "Defensores" is
correct and current in European Portuguese, it is unambiguous against *defesas*, and it is
the only option that keeps the meaning — the more idiomatic "Defesas" is unusable in this
one slot and the singular "Defesa" would collide with `box.defensive` instead. This is a
disambiguation-driven choice and should be recorded as such rather than re-litigated
toward the more idiomatic term.

**How to apply:** when a Romance locale's position noun and its goalkeeping noun are the
same word, check whether the two keys can co-render before accepting the idiomatic form.
es ("Defensas"/"Atajadas"), it ("Difensori"/"Parate"), fr ("Défenseurs"/"Arrêts") and
pt_BR ("Defensores"/"Defesas") were all already clear.

Still outstanding, deliberately not fixed on this branch: `zh_TW.gameCard.shootout` is
`"PENS"` where zh_CN is `"点球"` — an untranslated leftover from when that key shipped to
only eight locales, now inconsistent with `zh_TW.box.periodPen` = `點球`. It predates this
branch and belongs to a different feature. Related: [[project_shootout_translations]].
