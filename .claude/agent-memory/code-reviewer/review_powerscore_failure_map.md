---
name: review-powerscore-failure-map
description: Where packages/powerscore v2 breaks — unknown-clock coercion, NaN reaching rawTotal, soccer "overtime" strings, README drift from constants, and the orphaned test tsconfigs
metadata:
  type: project
---

Characteristic defects in `packages/powerscore` after the 2.0.0 rebuild. Check these first on any
scorer diff.

**Why:** the scorer is a published npm package with no CI, so its only guard is the 126-test jest
suite, and several failure classes sit exactly where that suite does not look.

**How to apply:**

- **`game.clockSeconds ?? 0` (`scorer.ts:186`) conflates "unknown" with "0:00".** `period` and
  `clockSeconds` became optional in 2.0, but the scorer still coerces a missing clock to 0. For
  countdown sports that reads as the final buzzer and pays the full `closeCeiling` (36) — an NFL Q4
  game with 12:00 left jumps from lateGame 4 to 36, total 35 → 70. For count-up soccer the same 0
  reads as kickoff and under-scores. `apiClient.ts` defaults `status.displayClock ?? '0:00'` and
  `parseClockToSeconds` returns 0 for any unparsed format, so the extension reaches this too.
- **Any NaN entering `rawTotal` silently discards the stall penalty.** `normalizePowerScoreResult`
  falls back to `toFiniteNumber(score.total, rawTotal)` where the fallback is the *clamped signal
  sum* — which never had the penalty subtracted. One NaN in `winProbabilityHistory` takes a stalled
  game from 54 back to 79. `computeWinProbVarianceScore` returns NaN despite a `number | undefined`
  signature; only `fetchWinProbability`'s `Number.isFinite` filter protects the extension.
- **"Soccer has no overtime" keeps regressing in reason strings.** The 2026-08-03 release fixed the
  *game card* (`ET1`/`ET2`/`PENS`); the scorer's reason line still says `overtime` for soccer extra
  time and for a period-5 penalty shootout, and the new OT pre-boost adds
  "tied — overtime looming" to ordinary league draws. Whenever a reason string mentions overtime,
  check it against soccer and against hockey's shootout.
- **A tie in the middle of the window double-counts as two lead changes** (`findLeadChanges`, sign
  0 counts as its own state). 17-24 → 24-24 → 31-24 scores the `multiple` tier (18, "trading
  leads") for one actual lead change. Pre-existing, unchanged in 2.0.
- **The momentum reason says `N-0 run` where N is the score *differential*, not an unanswered run.**
  Home +10 / away +2 renders "BOS on an 8-0 run". Pre-existing string, `scorer.ts:352`.
- **README drift from `constants.ts` is the recurring documentation defect.** The 2026-08-19 entry
  fixed the *docs site* PowerScore page (30/28/28/18/14 → real 42/38/38/18/20) by generating the
  cards from the imported `scoreMax*` constants, but the package README carries the identical stale
  table and was missed. Any calibration change needs a README pass, and the README is the migration
  surface for a published major (`stallPenaltySteps[].multiplier` → `.deduction` is documented
  nowhere).
- **The test suite is not typechecked.** `typecheck` is `tsc --noEmit` against a tsconfig whose
  `include` is `src/**/*` only — 0 test files. The 2.0 swap from ts-jest to `@swc/jest` removed the
  only type checking the tests had, and left `tsconfig.jest.json` (invalid under TS 7:
  `moduleResolution: "Node"` → TS5108) and `tests/tsconfig.json` wired to nothing.
- **`leagueConfigMap[game.league]` is unguarded** in `getGameProgress` and `getLateGame` and throws
  a TypeError on an unknown league, while `sportTypeConfigMap[game.sportType]` two lines away has a
  `?? basketball` fallback.

Verified-correct things not worth re-flagging: totals cannot leave [0, 100] out of
`computePowerScore` (156 + 5 raw, clamped; the −5 variance floor clamps to 0); `historyWindowMs` is
≥ 4× the longest half-life for all six sports; boosts in `background.ts` cap automatic sources at
`scoreMaxTotal` and only a manual `gameBoost` uses `allowTotalOverflow`; every league's
`periodDurationSecs` matches its real rules (NBA 720, WNBA/FIBA 600, NCAAB 2×1200, NFL 900,
soccer 2700).

See [[project-powerscore-reason-strings]], [[project-review-failure-map]].
