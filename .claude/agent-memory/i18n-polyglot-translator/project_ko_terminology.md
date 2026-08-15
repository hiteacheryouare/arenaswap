---
name: project-ko-terminology
description: Approved standard-Korean (ko) terminology decisions for ArenaSwap — use these consistently when adding new strings to ko.json
metadata:
  type: project
---

Created 2026-08-15: `apps/extension/locales/ko.json`, translated from `en.json` (~650 lines,
590 leaf/branch keys), standard Korean (no regional variant requested — South Korea is a single
standard-language market, unlike es/pt/zh/fr which need regional variants). Register: casual-polite
해요체 for sentences/toasts/tooltips (matches ArenaSwap's "casual but not sloppy" energetic tone;
modern Korean apps like Toss/Coupang lean this way for warmth), noun-phrase/verb-stem for buttons
and labels (뒤로, 다음, 재시도, 완료 — no ending needed, universal UI convention). The
`ludicrousSpeed.*` Spaceballs-parody dialogue uses informal 반말/command register instead, since
it's in-character movie dialogue, not app UI copy.

**Do not translate** (kept in Latin script, matching [[reference_locale_file_format]] /
ja.json convention): ArenaSwap, PowerScore, Standby Stream. Korean particles/postpositions attach
to these with a **space** before the Hangul word (e.g. "PowerScore 시그널"), unlike Japanese which
agglutinates with no space — Korean orthography requires 띄어쓰기 (word spacing) that Japanese
doesn't use.

**Approved term map** (reuse for any future ko.json additions):
- Signal → 시그널 (loanword, standard in Korean sports-analytics/betting contexts)
- Closeness → 접전도 · Late-game → 종반 · Momentum → 모멘텀 · Lead changes → 리드 변화 · Comeback → 역전
- Volatility → 변동성 · Boost → 부스트 · Penalty → 페널티 · Postseason → 포스트시즌 · Playoffs → 플레이오프
- Favorite team (concept) → **응원팀** (team you root for) — chosen over generic loanword "즐겨찾기"
  (bookmark-style) because this is a sports-fandom context and 응원팀 is genuinely how Korean fans/
  broadcasters describe a supported team; more natural and equally compact. The favoriting
  action itself uses 등록/해제 (register/remove), e.g. "{team} 응원팀으로 등록" / "{team} 응원팀에서 해제".
  Search-keyword strings (`keywordsFavoriteBonus`) still list 즐겨찾기/별표 as synonyms since users
  might type either.
- Threshold → 기준점 (used consistently: standbyBelow, standbyGuide.thresholdTitle, keywords)
- Scoring opportunity → 득점 기회 (established native sports term, not a loanword issue)
- Odds → 배당률, Betting → 베팅, Betting line → 라인 (judgment call, flagged for review — "라인" is
  compact Korean sports-betting slang for point spread but somewhat informal/forum-derived rather
  than broadcast-standard; "핸디캡" is an alternative if a more formal register is wanted later)
- Sensitivity 7-level scale (used in `sensitivity.level.l1-7` and `stepSettings.sensitivity1-7`,
  must stay in sync): 거의 반응 없음 · 소극적 · 신중 · 균형 · 적극적 · 성급함 · 미친 속도
- "Ludicrous Speed" (Spaceballs reference, sensitivity7 + all of `ludicrousSpeed.*`) → localized
  as **미친 속도** ("insane speed") rather than transliterated — the Spaceballs film reference
  itself doesn't land for a Korean audience, so the joke is carried by hyperbolic native Korean
  slang instead, matching how ja.json also dropped literal fidelity for a localized "バカ速モード".
  Sign progression: 광속 (light) → 황당한 속도 (ridiculous) → 미친 속도 (ludicrous).
- Baseball: 초/말 for top/bottom of inning (real KBO scoreboard convention, not "이닝의 표/뒤" —
  do NOT purify this into a literal calque). B/S/O kept as Latin letters (matches actual Korean
  broadcast graphics). 플레이볼 for "first pitch" get-ready state. 4다운 style (numeral + 다운) for
  NFL down-and-distance references in the loading-message easter eggs.
- Basketball tip-off → 점프볼 (jump ball). Soccer/football kickoff → 킥오프.

**Resolved: `gameCard.shootout` is soccer, not hockey** — despite reading as sport-agnostic from
the locale file alone, `packages/ui/src/components/gameCardShared.tsx:23` gates this string on
`game.sportType === 'soccer'` explicitly (soccer's periods 3/4 are extra-time halves, period 5 is
the shootout; hockey overtime returns plain `OT` and never reaches this key). Every other shipped
locale independently confirms soccer vocabulary: es "PEN", pt_BR "PEN", ja "PK", zh_CN 点球, it
"RIG" (rigori). Corrected ko from 슛아웃 (my original hockey-leaning guess) to **"PK"**, matching
ja's exact choice — "PK" is compact enough for a badge next to a scoreline (`PK 3–5`) where
승부차기 (~5 syllables) would visibly widen it, and Korean football media already shorthand the
shootout as "PK전" in headlines, so it's an attested colloquialism, not an invented abbreviation.

**Checked and confirmed correct: `detail.intermission` genuinely is hockey-specific.**
`apps/extension/entrypoints/popup/components/gameSituation.ts:19` shows
`game.intermission ? (isHalftime(game) ? t('detail.halftime') : t('detail.intermission'))` —
`detail.halftime` absorbs every 2-period sport (soccer/football/basketball), leaving
`detail.intermission` as strictly the between-period break in 3+-period sports. Of ArenaSwap's six
sports only hockey has that shape (baseball/softball use innings, not periods), confirmed by
`gameSituation.test.ts:38` testing this at `period: 3`. Kept **인터미션** (loanword) unchanged —
it's the term Korean hockey broadcasts (Asia League Ice Hockey / KIHF coverage) actually use,
parallel to borrowing "피리어드" for period rather than coining a native term.

**Still worth a native-speaker sanity check, lower confidence:**
- `detail.getReadyPuckDrop` → 페이스오프 (faceoff) — reasonably confident since ja.json independently
  landed on the same loanword (フェイスオフ), suggesting it's the real East-Asian broadcast term,
  but still hockey-specific and not verified against an actual Korean broadcast.

**Lesson for future locale work in this repo:** don't infer a string's sport from its English key
name or content alone — check for a `sportType ===` gate in the component that renders it
(`grep` the string's translation key in `apps/extension` and `packages/ui`) before guessing at
cross-sport genericness. The English source string can look sport-agnostic (`shootout`,
`PENS {away}–{home}`) while the actual render path is hardcoded to one sport.

Related: [[reference_locale_file_format]]
