---
title: PowerScore API reference
navLabel: API reference
description: Every function and constant powerscore exports, with its signature, parameters, return value, and behavior when an input is missing or invalid. Includes the deprecated 2.x API.
section: powerscore
order: 6
---

Everything here is exported from the package's root: `import { ... } from 'powerscore'`. The 3.0 functions come first, then the helpers, the pieces the built-in modes are made of, the constants, and last the 2.x API, which is deprecated but works exactly as it did. The types are in [PowerScore's TypeScript types](/arenaswap/docs/powerscore/types/).

## Scoring

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

The main entry point. Scores a game in a mode and returns a [`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore): the total, every signal and boost as a list, and the reasons.

| Parameter | Default | Notes |
|---|---|---|
| `game` | required | The current game state. Only `id`, `league`, `sportType`, and both scores are required. |
| `context` | `{}` | History, win probability, the pregame line, the fantasy roster, and the rest of what the game doesn't carry. See [`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext). |
| `options` | `{}` | Which mode, which signals to switch off, and the favorite, postseason, and manual boosts. See [`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions). |

Never throws on a missing optional field: the part of the engine that needs it scores 0. An unrecognized `league` is scored with its sport's defaults. A non-finite value anywhere in the inputs is treated as absent, rather than propagated as `NaN`.

A frozen game (`intermission` or `delayed`) scores 0 across the board, including every boost, and `reason` is empty. `game.status` is read only by the boosts, which pay nothing unless it's `'in'`.

The total is built in a fixed order:

1. Signals score. Disabled ones are rescaled out.
2. The stall deduction comes off.
3. The win probability modifier is added (Classic only). The result is clamped to 0 to 100.
4. The mode's own boosts are added, within their bucket caps, and the total is capped at 100.
5. If the mode blends with Classic (floor, mix, or boost), that happens here.
6. The favorite and postseason boosts are added, and the total is capped at 100 again. A mode with `paysPostseason: false` skips the postseason boost.
7. `gameBoost` is added last. It's the only thing allowed past 100.

```ts
const score = scoreGame(game, { history }, { mode: 'blowouts' });
score.total;  // 0–100
score.reason; // 'BOS piling on, 28-point lead'
```

### signalPoints and boostPoints

```ts
function signalPoints(score: Pick<PowerScore, 'signals'>, id: string): number
function boostPoints(score: Pick<PowerScore, 'boosts'>, id: string): number
```

Look up one entry on a result by id. Both return `0` for an id that isn't there.

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

Builds the [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput) a signal or boost's `compute` receives: the game, the context, the resolved sport and league config, `progress`, `now`, and `margin`. It's what `scoreGame` calls internally, exported so a signal you write can be tested on its own.

## Modes

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

Checks a mode once, up front, and returns it unchanged. It throws if two signals share an id, if a signal's ceiling isn't positive, or if the mode has no signals.

```ts
import { defineMode, scoreGame, type PowerScoreMode } from 'powerscore';

const overtimeOnly: PowerScoreMode = defineMode({
	id: 'overtimeOnly',
	signals: [
		{
			id: 'extraTime',
			ceiling: 100,
			compute: ({ game, league }) => (
				(game.period ?? 0) > league.regularPeriods
					? { points: 100, reason: { key: 'overtime' } }
					: { points: 0 }
			),
		},
	],
	boosts: [],
	reasonPriority: ['extraTime'],
	reasonLimit: 1,
	usesStallPenalty: false,
	usesWinProbability: false,
});

scoreGame(game, context, { mode: overtimeOnly });
```

A signal's `compute` receives the game, the context, the resolved sport and league config, the game's `progress` (0 at the start, 1 at the end of regulation and through overtime), and the `margin`. It returns `points`, clamped to the ceiling, and an optional `reason`. A mode can also carry `boosts`, `bucketCaps`, a `classicBlend`, and an `appliesTo(game, context)` that sends games it has nothing to say about to Classic.

A reason key the built-in modes know renders as English in `score.reason`. A key of your own renders as itself, so translate from `score.reasons`, not from the string.

### classicMode, blowoutsMode, fantasyMode, builtInModes, and getMode

`classicMode`, `blowoutsMode`, and `fantasyMode` are the three built-in `PowerScoreMode` objects. `builtInModes` is the same three keyed by id, and `getMode(idOrMode)` resolves an id, a mode object, or nothing (which gives Classic). Spread one to build on it. To get Classic without the 3.0 boosts:

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### Signals and boosts

The pieces the built-in modes are made of are exported too, so a custom mode can reuse them:

| Export | What it is |
|---|---|
| `classicSignals`, `blowoutsSignals`, `fantasySignals` | Each mode's signal list. |
| `closenessSignal`, `lateGameSignal`, `momentumSignal`, `leadChangesSignal`, `comebackSignal` | Classic's five, one by one. |
| `scoringOpportunityBoost`, `goAheadRunBoost`, `twoMinuteDrillBoost`, `noHitterBoost`, `redCardBoost`, `powerPlayBoost`, `emptyNetBoost`, `upsetWatchBoost`, `upsetRoutBoost`, `stakesBoost` | Each boost's `BoostDefinition`. What each one pays is in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/). |
| `underdogProbability(line, sportType, league)` | The underdog's chance before the game, from a `PregameLine`. `undefined` when the line can't say. |
| `postseasonBoostShare(round)` | The share of the postseason boost a round earns: 1, 0.75, 0.5, 0.25, or 0 with no round. |
| `applyProgressFloor`, `findLeadChanges` | The two helpers behind closeness and lead changes. |

## Reasons

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

Render one reason fragment, or a list joined with commas, as English. It's what fills `score.reason`. Use them when you build reasons of your own and want them to read the same way.

## Config and progress

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

`resolveSportConfig` and `resolveLeagueConfig` do what `scoreGame` does at the top of every call. An unknown `sportType` falls back to basketball's tuning. An unknown league falls back to its sport's best-known league: the NBA for basketball, the NHL for hockey, MLB for baseball, the NFL for football, NCAA softball, and MLS for soccer. `getGameProgress` is 0 at the start, 1 at the end of regulation and through overtime. `scoreMargin` is the absolute score difference.

## Fantasy scoring

Fantasy's Production signal wants fantasy points. These turn a box-score line into them. You name the stats, they score them.

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

Returns the total for one stat line, rounded to two decimals. Unknown stats and non-finite values are ignored. A defense's `pointsAllowed` is scored by tier.

```ts
import { computeFantasyPoints } from 'powerscore';

computeFantasyPoints('football', {
	passingYards: 310,
	passingTouchdowns: 3,
	interceptionsThrown: 1,
	rushingYards: 22,
}); // 12.4 + 12 − 2 + 2.2 = 24.6
```

### defaultFantasyScoring, resolveFantasyScoring, and fantasySportOf

`defaultFantasyScoring` holds the default rules for `'football'` (full PPR), `'basketball'`, `'baseball'`, and `'hockey'`. Each rule is `{ points, min, max }`, so a settings screen can enforce the bounds.

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

`resolveFantasyScoring(sport, overrides?)` returns the rules as plain numbers. An override is clamped to its rule's bounds, and a rule that doesn't exist is ignored.

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

`fantasySportOf(sportType)` maps a `sportType` to one of the four fantasy sports. Softball counts as baseball, and soccer has none, so it returns `undefined`.

## Constants

| Constant | Value |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156 (the sum of Classic's five ceilings) |
| `scoreMaxTotal` | 100 |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

Why Classic's ceilings outrun the 100-point cap is in [PowerScore signals in every mode](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total). The caps are explained in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets).

`stallPenaltySteps`, `scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers`, and `thirdAndShortDistance` hold the exact values behind the stall deduction and the scoring opportunity boost, tabulated in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/). The newer boosts keep their numbers in `goAheadRunTunables`, `twoMinuteDrillTunables`, `noHitterTunables`, `redCardTunables`, `upsetTunables`, `stakesTunables`, and `hockeyTunables`.

`scorerTunables` holds every tier value and every reason string the engine can produce, the same numbers the constants above already give by name. It's exported so a consumer can read a tier's value or match against a reason string directly instead of hardcoding either.

`sportTypeConfigs`, `sportTypeConfigMap`, `leagueConfigs`, `leagueConfigMap`, and `allLeagueIds` hold the sport and league tuning the engine reads on every call. Their fields and every sport and league's actual values are in [Sport and league configuration](/arenaswap/docs/powerscore/configuration/).

## The 2.x API

Still exported, still working, and marked deprecated where noted. Nothing here was removed in 3.0. Move to `scoreGame` when you want modes or the new boosts. Until then, these return the numbers they always did.

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	stallCount?: number,
	winProbabilityHistory?: number[],
): PowerScoreResult
```

Deprecated. Scores Classic's five signals, applies the stall penalty and the win probability modifier, and returns the flat `PowerScoreResult` (`closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`, `total`, `reason`, and friends). It's `scoreGame` in Classic with the signals only, flattened, so it doesn't include any of the moment boosts.

| Parameter | Default | Notes |
|---|---|---|
| `game` | required | The current game state. |
| `history` | `[]` | Recent score snapshots. Momentum, lead changes, and comeback stay at 0 until this holds at least 3 entries. |
| `stallCount` | `0` | Consecutive polls where the clock hasn't moved. See [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/#stall-deduction). |
| `winProbabilityHistory` | `[]` | Recent win-probability values, 0 to 1. Needs at least 5 finite entries to contribute anything. |

Never throws. Returns an all-zero result immediately when `isPlayFrozen(game)` is true. Doesn't check `game.status`: a `'pre'` or `'post'` game scores the same as an `'in'` one, given the same other fields.

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

Deprecated: the number is in `scoreGame`'s `boosts` list as `scoringOpportunity`. Returns `0` unless `game.status === 'in'` and the game isn't frozen. Otherwise returns 0 to 10 for baseball and softball, by runner count, or 0 to 15 for football, by red-zone margin and down. Returns `0` for every other `sportType`. Not included in `computePowerScore`'s `total`.

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

Maps a win-probability history to the ±5 modifier. Filters out non-finite entries first, then returns `undefined` if fewer than 5 finite values remain. Otherwise returns an integer from `-scoreWinProbVarianceMax` to `scoreWinProbVarianceMax`.

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

Returns `true` when `game.intermission === true` or `game.delayed === true`, and `false` otherwise, including when both fields are absent.

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

How far through regulation the game is, 0 to 1, from the same clock the late-game signal reads. Handy for drawing a game on a timeline.

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

Deprecated. Takes a partial, possibly untrusted `PowerScoreResult` (only `gameId` is required) and returns a fully clamped, valid one. `computePowerScore` calls this internally on every result it produces.

Each of the five signal fields is clamped to its own ceiling. `total` is clamped to `scoreMaxTotal` unless `options.allowTotalOverflow` is `true`. With that option, it's only clamped to a minimum of `0`, letting a manual boost push it past 100 on purpose. A missing or non-finite `total` falls back to the five signals' sum minus `stallPenalty`, not the raw sum. `reason` falls back to `scorerTunables.reasons.fallback` ("best game available") when it isn't a string. `favoriteBonus`, `favoriteTeamCount`, `gameBoost`, `scoringOpportunityBoost`, and `postseasonBoost` are rounded and floored at `0` when supplied. When they aren't, they're left off the result entirely, not defaulted to `0`. Never throws.

### What changes if you move

Classic through `scoreGame` includes the new boosts, so the same game can score higher there than in `computePowerScore`, by up to the bucket caps. The favorite, postseason, and manual boosts you used to add by hand around `normalizePowerScoreResult` are options on `scoreGame` now. Everything else carries over. The `Game` type gained optional fields and a league type parameter, and a bare `Game` means what it did. A league id the table doesn't know used to be scored with the NBA's configuration whatever the sport. Now it gets its own sport's defaults, so a hockey game in an unknown league gets the NHL's periods and clock.
