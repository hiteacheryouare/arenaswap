---
title: PowerScore TypeScript types
description: Every field on Game, ScoreSnapshot, PowerScoreResult, and the config types, which ones are optional, and what happens when an optional one is missing.
section: powerscore
order: 7
navLabel: Types
---

## Game

The minimal shape `computePowerScore` and `computeScoringOpportunityBoost` need. Only `id`, `league`, `sportType`, and the two team scores are required. Everything else narrows the score when it's present. Each of those optional fields is treated as unknown, not as a default value, when it's absent.

| Field | Type | Missing means |
|---|---|---|
| `id` | `string` | Required. |
| `league` | `LeagueId` | Required. An id `leagueConfigMap` doesn't recognize falls back to the NBA's period timing. |
| `sportType` | `SportType` | Required. A value `sportTypeConfigMap` doesn't recognize falls back to basketball's tuning. |
| `homeTeam` / `awayTeam` | `{ score: number; abbreviation?: string }` | Required. A missing `abbreviation` shows as `?` in reason strings that name a team. |
| `period?` | `number` | Late-game pressure reads as `0`. Closeness still scores, but game progress reads as `0` too, so it pays only its flat floor rather than the fuller tier value. |
| `clockSeconds?` | `number` | Treated as unknown, not `0:00`. The late-game ramp holds at the start of the period instead of reading as the final buzzer. |
| `intermission?` | `boolean` | `false`. `true` makes `isPlayFrozen` return `true`. |
| `delayed?` | `boolean` | `false`. `true` makes `isPlayFrozen` return `true`, the same as `intermission`. |
| `status?` | `'pre' \| 'in' \| 'post'` | Not read by `computePowerScore` at all. `computeScoringOpportunityBoost` treats anything other than `'in'`, including a missing value, as `0`. |
| `topOfInning?` | `boolean` | Baseball and softball only. Scores between the top and bottom of the inning's closeness values. |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | Baseball and softball only. Treated as no runners on, so `computeScoringOpportunityBoost` returns `0`. |
| `isRedZone?` | `boolean` | Football only. `false` or missing means `computeScoringOpportunityBoost` returns `0` for the red-zone case. |
| `down?` | `number` | Football only. Falls through to the unweighted (×1) multiplier rather than losing the boost entirely. |
| `distance?` | `number` | Football only. On 3rd down, a missing value can't qualify as 3rd-and-short, so it falls through to ×1. |
| `isGoalToGo?` | `boolean` | Football only, and only changes anything on 4th down. |

`SportId` is a deprecated alias for `LeagueId`, kept for 1.x compatibility. Use `LeagueId`.

## ScoreSnapshot

A point-in-time record of a game's score, used to detect momentum, lead changes, and comebacks. All four fields are required.

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

`timestamp` only needs to be relative to the other snapshots in the same array. Decay is measured against the newest snapshot's timestamp, not against wall-clock time. Replaying the same history produces the same result, no matter when it's replayed.

## PowerScoreResult

The full output of `computePowerScore`, and the shape `normalizePowerScoreResult` accepts a partial version of.

| Field | Type | Missing means |
|---|---|---|
| `gameId` | `string` | Required everywhere this type appears. |
| `total` | `number` | Set by `computePowerScore`. 0 to `scoreMaxTotal` (100), unless produced through `normalizePowerScoreResult` with `allowTotalOverflow`. |
| `closeness` | `number` | 0 to `scoreMaxCloseness` (42). |
| `lateGame` | `number` | 0 to `scoreMaxLateGame` (38). |
| `momentum` | `number` | 0 to `scoreMaxMomentum` (38). |
| `leadChanges` | `number` | 0 to `scoreMaxLeadChanges` (18). |
| `comeback` | `number` | 0 to `scoreMaxComeback` (20). |
| `winProbabilityVariance?` | `number` | −`scoreWinProbVarianceMax` to `scoreWinProbVarianceMax` (±5). Absent, not `0`, when no win-probability history was supplied or too little of it was usable. |
| `reason` | `string` | Falls back to `scorerTunables.reasons.fallback` ("best game available") when absent or not a string. Display text, not an API: it can change wording between versions. |
| `stalled?` | `boolean` | Absent reads as `false`. `normalizePowerScoreResult` always sets it explicitly to `true` or `false`, and never leaves it out. |
| `stallPenalty?` | `number` | Points removed, always ≥ 0. Absent, not `0`, when no stall count was supplied. |
| `signalsSubtotal?` | `number` | The five signals' sum before the stall penalty, 0 to `scoreMaxSignalsSubtotal` (156). Set by `computePowerScore`. Absent when a result is built by hand without it. |
| `favoriteBonus?` | `number` | Not computed by the package. Absent unless a caller supplies it. |
| `favoriteTeamCount?` | `number` | Same as `favoriteBonus`. |
| `gameBoost?` | `number` | Same as `favoriteBonus`. |
| `scoringOpportunityBoost?` | `number` | Same as `favoriteBonus`. `computeScoringOpportunityBoost` computes this number elsewhere, but the two are not wired together automatically. |
| `postseasonBoost?` | `number` | Same as `favoriteBonus`. |

## SportTypeConfig and LeagueConfig

`SportTypeConfig` holds everything about how a sport plays. That covers closeness thresholds, momentum and comeback thresholds, decay half-lives, whether the sport has a clock, and (baseball and softball only) a `lateGameCurve`. `LeagueConfig` holds how long a specific league's periods run and where to find it on ESPN: `id`, `label`, `sportType`, `espnPath`, `regularPeriods`, `periodDurationSecs`, and `periodFormat`. Neither type has any optional fields. Every shipped sport and league fills in every one of them. Field-by-field meaning and every sport and league's actual values are in [Sport and league configuration](/arenaswap/docs/powerscore/configuration/).

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

Only baseball and softball set `SportTypeConfig.lateGameCurve`. Clock sports derive their late-game ramp from `period` and `clockSeconds` directly, and leave the field `undefined`. There is nothing else for a clock-based sport to configure here, so the type currently has only one shape.

## ScorerTunables

The single exported object holding every tier value and every reason string `computePowerScore` can produce. No field is optional. It's a fully populated constant, not a partial config.

| Branch | Holds |
|---|---|
| `scores.closeness` | The five closeness tier ceilings (`tied`, `tight`, `zeroZero`, `close`, `fringe`, `none`). See [The five PowerScore signals](/arenaswap/docs/powerscore/signals/#closeness). |
| `scores.closenessFlatFloor` | The flat floor every closeness tier pays out before progress scaling. |
| `scores.lateGame` | The late-game ceilings, the overtime pre-boost, and the previous-period touch. See [Late-game pressure](/arenaswap/docs/powerscore/signals/#late-game-pressure). |
| `scores.momentum` | The two momentum tier values. See [Momentum](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor). |
| `scores.leadChanges` | The two lead-change tier values. |
| `scores.comeback` | The two comeback tier values and its flat floor. |
| `scores.winProbabilityVariance` | `maxAvgDist` and `minDataPoints`, tabulated in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance). |
| `reasons` | Every string a reason can contain, from `"it's tied"` to `"best game available"`. Display text, not an API. |

## SportType and LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

Both are closed unions. `Game.league` and `Game.sportType` are typed to them, so a TypeScript caller needs a type assertion to pass a value outside either list. A JavaScript caller can pass any string instead, and `computePowerScore` falls back rather than throwing. The full list of 31 league ids is in [Sport and league configuration](/arenaswap/docs/powerscore/configuration/). It is also available at runtime as `allLeagueIds`.
