---
name: review-powerscore-failure-map
description: Where packages/powerscore breaks — v3 pipeline seams (core toScoringGame, legacy flat shape, English reason round-trip), soccer "overtime" strings, README drift, unknown-league fallback
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
- **Reasons still round-trip through English.** The popup's `translateReason` regex-parses the
  English `reason` string; boost labels exist twice (`scorerTunables.reasons.boosts` in powerscore
  and `boostLabels` in `apps/extension/utils/powerScoreReason.ts`). Any label change must touch both
  until the popup reads structured `reasons`.
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
