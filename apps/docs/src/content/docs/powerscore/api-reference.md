---
title: PowerScore API reference
navLabel: API reference
description: Every function and constant powerscore exports, with its signature, parameters, return value, and behavior when an input is missing or invalid.
section: powerscore
order: 6
---

Everything here is exported from the package's root: `import { ... } from 'powerscore'`. The order mirrors `src/index.ts`: five functions, then the types covered in [PowerScore's TypeScript types](/arenaswap/docs/powerscore/types/), then the constants below.

## Functions

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	stallCount?: number,
	winProbabilityHistory?: number[],
): PowerScoreResult
```

The main entry point. Scores a game's five signals, applies the stall penalty and the win probability modifier, and returns a full `PowerScoreResult`.

| Parameter | Default | Notes |
|---|---|---|
| `game` | required | The current game state. |
| `history` | `[]` | Recent score snapshots. Momentum, lead changes, and comeback stay at 0 until this holds at least 3 entries. |
| `stallCount` | `0` | Consecutive polls where the clock hasn't moved. See [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/#stall-penalty). |
| `winProbabilityHistory` | `[]` | Recent win-probability values, 0 to 1. Needs at least 5 finite entries to contribute anything. |

Never throws. An unrecognized `league` or `sportType` falls back rather than erroring. A non-finite value anywhere in the inputs is treated as absent, rather than propagated as `NaN`. Returns an all-zero result immediately when `isPlayFrozen(game)` is true, without reading `history` or either optional argument. Doesn't check `game.status` itself. A `'pre'` or `'post'` game scores the same as an `'in'` one, given the same other fields.

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game): number
```

Returns `0` unless `game.status === 'in'` and `isPlayFrozen(game)` is `false`. Otherwise returns 0 to 10 for baseball and softball, by runner count, or 0 to 15 for football, by red-zone margin and down. Full tables in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/#scoring-opportunity-boost). Returns `0` for every other `sportType`. Not included in `computePowerScore`'s `total`. Adding it to a total is covered in [Score a game from live data](/arenaswap/docs/powerscore/scoring-a-game/#add-a-scoring-opportunity-boost).

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

Maps a win-probability history to the modifier `computePowerScore` applies on top of the five signals when it's given the same history as a fourth argument. Filters out non-finite entries first, then returns `undefined` if fewer than 5 finite values remain. Otherwise returns an integer from `-scoreWinProbVarianceMax` to `scoreWinProbVarianceMax`.

### isPlayFrozen

```ts
function isPlayFrozen(game: Game): boolean
```

Returns `true` when `game.intermission === true` or `game.delayed === true`, and `false` otherwise, including when both fields are absent. `computePowerScore` and `computeScoringOpportunityBoost` both check `isPlayFrozen` before scoring anything. A boost added without the same check can let a stopped game out-score one that's being played.

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

Takes a partial, possibly untrusted `PowerScoreResult` (only `gameId` is required) and returns a fully clamped, valid one. `computePowerScore` calls this internally on every result it produces. A consumer building or patching a result by hand calls it directly instead, typically after adding its own boosts.

Each of the five signal fields is clamped to its own ceiling. `total` is clamped to `scoreMaxTotal` unless `options.allowTotalOverflow` is `true`. With that option, it's only clamped to a minimum of `0`, letting a manual boost push it past 100 on purpose. A missing or non-finite `total` falls back to the five signals' sum minus `stallPenalty`, not the raw sum. The fallback keeps a bad input from handing a stalled game back its deduction. `reason` falls back to `scorerTunables.reasons.fallback` ("best game available") when it isn't a string. `favoriteBonus`, `favoriteTeamCount`, `gameBoost`, `scoringOpportunityBoost`, and `postseasonBoost` are rounded and floored at `0` when supplied. When they aren't, they're left off the result entirely, not defaulted to `0`.

Never throws.

## Constants

| Constant | Value |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156 (the sum of the five ceilings above) |
| `scoreMaxTotal` | 100 |
| `scoreWinProbVarianceMax` | 5 |

Why the five signal ceilings outrun the 100-point cap is in [The five PowerScore signals](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-100).

`stallPenaltySteps`, `scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers`, and `thirdAndShortDistance` hold the exact values behind the two boosts and the stall penalty, tabulated in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/).

`scorerTunables` holds every tier value and every reason string `computePowerScore` can produce, the same numbers `scoreMax*` and the boosts-and-penalties tables already give by name. It's exported so a consumer can read a tier's value or match against a reason string directly instead of hardcoding either.

`sportTypeConfigs`, `sportTypeConfigMap`, `leagueConfigs`, `leagueConfigMap`, and `allLeagueIds` hold the sport and league tuning `computePowerScore` reads on every call. Their fields and every sport and league's actual values are in [Sport and league configuration](/arenaswap/docs/powerscore/configuration/).
