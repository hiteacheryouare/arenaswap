---
name: review-powerscore-failure-map
description: Where packages/powerscore breaks — v3 seams (core adapter, mode blends, in-memory liveExtras state, locale parity of reason keys), soccer "overtime" strings, README drift, unknown-league fallback
metadata:
  type: project
---

Characteristic defects in `packages/powerscore`. Check these first on any scorer diff.

**Why:** the scorer is a published npm package with no CI, so its only guards are its jest suite
and the 20k-game `tests/classicParity.test.ts` sweep, and several failure classes sit exactly
where those do not look.

**How to apply:**

- **v3 layout (PS3 branch `ps3/recorder`, 2026-10-03).** `scoreGame(game, context, options)` in
  `src/compose.ts` runs modes (`src/modes`) made of signal/boost definitions; `src/scorer.ts` keeps
  the 2.x API as wrappers. The extension reaches it via `packages/core/src/scoring.ts`
  (`toScoringGame` → `scoreLiveGame` → `toLegacyPowerScoreResult`), and `chooseSwitchTarget` /
  `nextClockStall` / `retainSnapshots` moved there from background.ts.
- **The parity sweep only pins the engine, not core's adapter.** It calls `scoreGame` directly with
  known leagues, so `toScoringGame` field mapping, `toLegacyPowerScoreResult`, unknown-league
  fallbacks, and the frozen-game legacy fields are untested by it. Check those by hand.
- **Reasons: the popup now translates structured `breakdown.reasons` keys** (b36ffe59), so the
  English round-trip is only the fallback for scores without a breakdown. New reason keys must be
  mapped in `apps/extension/utils/powerScoreReason.ts` AND translated in all 12 locales; PS3 shipped
  75 en-only keys (mixed-language reason lines like "Gleichstand, Mahomes has the ball").
- **Mode blends are where PS3 math goes wrong, not the boost files.** The boosts matched the analyst
  spec (`temporary/powerscore3/analystSpec.md`) line by line on 2026-10-03. The defects were in
  composition: Fantasy's 0.6/0.4 mix plus "no rostered player → plain Classic" makes a game WITH
  your player score below an identical game without one (verified: 57 vs 67, late close NBA);
  `compose.ts` adds the postseason boost in every mode though the spec drops it from Blowouts. For
  any blend/floor change, score the same game with and without the mode's trigger and compare.
- **`createLiveExtras` (core) is in-memory, per worker.** Anything "first seen" (pregame line,
  fantasy baselines, box lead-change baseline) resets on every worker start, and anything derived
  from a user setting (fantasy scoring overrides) must re-baseline when the setting changes or it
  reads as a fresh event. Situation fetches ride `afterFetch`, which also runs on popup refresh,
  game-boost clicks and demo ticks, so "per poll" counters there count fetches, not polls.
- **Unknown league fallback changed in 3.x:** v2 fell back to NBA config; `resolveLeagueConfig` now
  falls back by sport (soccer → MLS). Affects 2.x wrappers (`computePowerScore`,
  `computeGameProgress`) for npm consumers with their own league ids.
- **"Soccer has no overtime" keeps regressing in reason strings.** Whenever a reason mentions
  overtime, check it against soccer extra time/penalties and hockey's shootout.
- **README drift from `constants.ts`/API is the recurring documentation defect.** Any calibration
  or API change needs a README pass; the README is the migration surface for a published major.
- Fixed and verified, don't re-flag: unknown clock is now `null` (not 0:00); NaN win-prob samples
  are filtered; the tests ARE typechecked now (`typecheck` runs `tsc --noEmit -p tests`).

Verified-correct things not worth re-flagging: totals cannot leave [0, 100] except via manual
`gameBoost`; `historyWindowMs` is ≥ 4× the longest half-life for all six sports; every league's
`periodDurationSecs` matches its real rules.

See [[project-powerscore-reason-strings]], [[project-review-failure-map]], [[history-window-footgun]].
