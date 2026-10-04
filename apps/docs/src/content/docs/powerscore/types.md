---
title: PowerScore TypeScript types
description: Every field on Game, ScoringContext, ScoreOptions, PowerScore, and the mode and config types, which ones are optional, and what happens when an optional one is missing.
section: powerscore
order: 7
navLabel: Types
---

PowerScore 3's types fall in three groups. What you hand `scoreGame`: [`Game`](#game), [`ScoringContext`](#scoringcontext), and [`ScoreOptions`](#scoreoptions). What you get back: [`PowerScore`](#powerscore). And what a mode is made of: [`PowerScoreMode`](#powerscoremode) and its parts. The 2.x types are at the end, still exported and working.

## Game

The state of the game right now. Only `id`, `league`, `sportType`, and the two team scores are required. Everything else narrows the score when it's present. Each optional field is treated as unknown, not as a default value, when it's absent.

`Game` is generic over the league id: `Game<League extends string = LeagueId>`. A bare `Game` means what it always did. A feed with its own league ids uses `Game<string>`.

| Field | Type | Missing means |
|---|---|---|
| `id` | `string` | Required. |
| `league` | `League` | Required. An id `leagueConfigMap` doesn't recognize is scored with its sport's defaults (see [Sport and league configuration](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship)). |
| `sportType` | `SportType` | Required. A value `sportTypeConfigMap` doesn't recognize falls back to basketball's tuning. |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | Required. |
| `period?` | `number` | Late-game pressure reads as `0`. Closeness still scores, but game progress reads as `0` too, so it pays only its flat floor rather than the fuller tier value. |
| `clockSeconds?` | `number` | Treated as unknown, not `0:00`. The late-game ramp holds at the start of the period, and every clock-gated boost pays 0. |
| `intermission?` | `boolean` | `false`. `true` freezes the game: everything scores 0 until play resumes. |
| `delayed?` | `boolean` | `false`. `true` freezes the game, the same as `intermission`. |
| `status?` | `'pre' \| 'in' \| 'post'` | Boosts pay nothing for anything other than `'in'`, including a missing value. The signals don't read it. |
| `topOfInning?` | `boolean` | Baseball and softball. Scores between the top and bottom of the inning's closeness values. Go-ahead run and the no-hitter need it. |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | Baseball and softball. Treated as no runners on. |
| `outs?` | `number` | Baseball and softball. Treated as 0. At 3, runner-based boosts pay nothing. |
| `possession?` | `'home' \| 'away'` | Football, or the puck where a feed reports it. Without it the two-minute drill pays 0 and Fantasy has no football situation. |
| `yardsToEndZone?` | `number` | Football. The yards the team with the ball needs. Needed by the two-minute drill and Fantasy. |
| `isRedZone?` | `boolean` | Football only. `false` or missing means the red-zone case of the scoring opportunity boost pays 0. |
| `down?` | `number` | Football only. Falls through to the unweighted (×1) multiplier rather than losing the boost entirely. In the two-minute drill and Fantasy, a `down` below 1 reads as between plays. |
| `distance?` | `number` | Football only. On 3rd down, a missing value can't qualify as 3rd-and-short, so it falls through to ×1. |
| `isGoalToGo?` | `boolean` | Football only, and only changes anything on 4th down. |
| `series?` | [`SeriesState`](#seriesstate) | No series, so stakes reads none. |
| `redCards?` | [`RedCard[]`](#redcard) | Soccer. No cards. |
| `seasonType?` | `'regular' \| 'postseason'` | Stakes treats the game as postseason when this says so or `postseasonRound` is set, and as regular season otherwise. |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | No postseason boost. `0` decides the title, `1` is a semifinal, `2` a quarterfinal, `3` anything earlier. |

`SportId` is a deprecated alias for `LeagueId`, kept for 1.x compatibility. Use `LeagueId`.

### TeamState

```ts
interface TeamState {
	score: number;
	abbreviation?: string;
	rank?: number;
	hits?: number;
	errors?: number;
	timeouts?: number;
}
```

| Field | Missing means |
|---|---|
| `score` | Required. |
| `abbreviation` | Shows as `?` in reasons that name a team. |
| `rank` | The team is unranked. Leave it out for a bracket seed too: it's a poll ranking, where 1 is best. Stakes needs it on both teams. |
| `hits` | Baseball and softball. No hits count, so the no-hitter can't pay. `0` is a real value: it means a hitless team. |
| `errors` | Baseball and softball. Not read by any score today. |
| `timeouts` | Football. The two-minute drill uses a neutral weight for clock control. |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

A series shorter than a best of 3 pays nothing.

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

Everything the game itself doesn't carry. Every field is optional, and `scoreGame` takes the whole object as its second argument.

| Field | Type | Missing means |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | Momentum, Lead Changes, and Comeback Factor stay at 0 until it holds 3 entries. Oldest first. |
| `stallCount?` | `number` | Consecutive polls with an unchanged clock. No stall deduction. |
| `winProbability?` | `number[]` | Home win probability over the game, 0 to 1. Needs 5 finite values to matter. No modifier otherwise. |
| `pregameLine?` | [`PregameLine`](#pregameline) | Upset watch and Upset Rout pay 0. |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | No race stakes. See [`TeamStakes`](#teamstakes). |
| `powerPlay?` | `'home' \| 'away' \| boolean` | No power play boost. A side when the feed says whose, `true` when it only says one is on. |
| `emptyNet?` | `'home' \| 'away' \| boolean` | No empty net boost. Set it only once the feed has reported it on two polls in a row. |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | Lead changes counted from a feed's own play log, which sees flips between polls, with the time of the latest. Used when it counts more than `history` shows. Lead Changes still needs the 3 snapshots. |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | Fantasy has no players, and the game is scored as Classic. |

### ScoreSnapshot

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

### PregameLine

The line as it stood before the game. A live line moves with the score and would erase an upset.

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

`spread` is the points the favorite was laid, as a positive number, and only basketball and football read it. With both moneylines, the bookmaker's margin is removed before use. `drawMoneyline` is soccer's three-way line. A run line or a puck line alone says who's favored but not by how much, so it isn't enough.

### TeamStakes

Late-season race flags for one team, regular season only.

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

`canClinch` means winning this game clinches a spot, a division, or a title whatever else happens. `canBeEliminated` means losing knocks the team out of contention. `inRace` means still in the hunt, neither safe nor out. `nearLine` is within a few points of a table line.

### FantasyPlayerState

One rostered player in a game.

```ts
interface FantasyPlayerState {
	id: string;
	name?: string;
	side: 'home' | 'away';
	position: FantasyPosition;
	active?: boolean;
	role?: 'atBat' | 'onDeck' | 'inHole' | 'pitching';
	pointEvents?: { at: number; points: number }[];
}
```

`FantasyPosition` is `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'`: football positions, a pitcher and a hitter for baseball, and a generic player elsewhere. `name` appears in reasons, such as "Mahomes in the red zone". `active: false` means the feed says the player is out of the game, and it counts for nothing. `role` is baseball only: where the player is in the inning. `pointEvents` are fantasy points as they came in, so recent production fades like any other event.

## ScoreOptions

How to score. Every field is optional, and `scoreGame` takes the object as its third argument.

| Field | Type | What it does |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | Which mode scores the game. Classic when absent. |
| `disabledSignals?` | `readonly string[]` | Signal ids of the mode to switch off. The rest are rescaled to the mode's full range. |
| `classicDisabledSignals?` | `readonly string[]` | Signal ids to switch off in Classic when it's blended in or used as a floor. |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | Overrides the mode's own blend, such as a viewer's Fantasy slider. |
| `favoriteTeamCount?` | `number` | How many favorite teams are in the game. |
| `favoriteBoostPoints?` | `number` | Points per favorite team. |
| `postseasonBoostPoints?` | `number` | Points for a title-deciding game. Earlier rounds get a share. |
| `gameBoost?` | `number` | A manual boost. The only thing allowed to push the total past 100. |
| `sport?` | `Partial<SportTypeConfig>` | For sports the built-in tables don't match, or to tune them. |
| `league?` | `Partial<LeagueConfig>` | For leagues the built-in table doesn't know. Set `regularPeriods` and `periodDurationSecs`. |

## PowerScore

What `scoreGame` returns.

```ts
interface PowerScore {
	gameId: string;
	modeId: string;
	total: number;
	signals: ScoredSignal[];
	signalsSubtotal: number;
	scaledSubtotal: number;
	signalCeiling: number;
	frozen: boolean;
	stalled: boolean;
	stallPenalty: number;
	winProbabilityVariance?: number;
	baseTotal: number;
	classicTotal?: number;
	boosts: ScoredBoost[];
	reasons: ReasonFragment[];
	reason: string;
}
```

| Field | Meaning |
|---|---|
| `modeId` | The mode that actually scored the game. A mode that doesn't apply, such as Fantasy with no rostered player in the game, falls back to `'classic'`. |
| `total` | 0 to 100, and above 100 only through `gameBoost`. |
| `signals` | Every signal the mode defines, with its ceiling, even at 0. See [`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment). |
| `signalsSubtotal` | The enabled signals' sum before any rescaling for disabled signals. |
| `scaledSubtotal` | The same after rescaling, capped at `signalCeiling`. |
| `signalCeiling` | The sum of the mode's ceilings: 156 for Classic. |
| `frozen` | `true` at halftime, in an intermission, or in a delay. Everything scores 0 and `reason` is empty. |
| `stalled`, `stallPenalty` | Whether a stall deduction applied, and how many points it took (always ≥ 0). |
| `winProbabilityVariance?` | −5 to +5. Absent, not `0`, without enough win-probability data. |
| `baseTotal` | Signals less the stall deduction plus the modifier, 0 to 100, before any boost. |
| `classicTotal?` | Classic's own total, when the mode blends with it. |
| `blend?` | How a blended mode reached its total. See [`BlendResult`](#blendresult). |
| `boosts` | Every boost the mode pays, at 0 when it isn't paying. Plus `favoriteBoost`, `postseasonBoost`, and `gameBoost` once you've asked for them. |
| `reasons` | Structured fragments, ready to translate. |
| `reason` | The same in English, joined with commas. Display text, not an API: it can change wording between versions. Don't match on it. |

### ScoredSignal, ScoredBoost, and ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number> }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

`meta` on a boost carries what a UI might want to say, such as `{ inning: 8 }` on a no-hitter or `{ secondsLeft: 95, trailBy: 3 }` on a two-minute drill. A reason fragment looks like `{ key: 'outscoring', params: { team: 'BOS' } }`. Reason keys the built-in modes know render as English in `reason`. A key of your own renders as itself, so translate from `reasons`, not from the string.

## PowerScoreMode

A mode is a list of signals plus the boosts that suit it. Build one with [`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode), which checks it once, up front.

```ts
interface PowerScoreMode {
	id: string;
	signals: readonly SignalDefinition[];
	boosts: readonly BoostDefinition[];
	bucketCaps?: Readonly<Record<string, number>>;
	reasonPriority: readonly string[];
	reasonLimit: number;
	usesStallPenalty: boolean;
	usesWinProbability: boolean;
	classicBlend?: ClassicBlend;
	appliesTo?: (game: Game<string>, context: ScoringContext) => boolean;
}
```

| Field | Meaning |
|---|---|
| `signals`, `boosts` | In display order. |
| `bucketCaps` | The most a bucket of boosts may add together. Earlier boosts in the list are paid first. |
| `reasonPriority`, `reasonLimit` | Signal ids in the order their reasons are worth reading, and how many reach `reason`. |
| `usesStallPenalty`, `usesWinProbability` | Whether the stall deduction and the ±5 modifier apply. |
| `classicBlend` | How the mode combines with Classic. |
| `paysPostseason?` | `false` withholds the postseason boost in this mode. Defaults to `true`. Blowouts sets it to `false`, since a playoff blowout has settled its result. |
| `appliesTo` | Returns `false` for a game the mode has nothing to say about, and the game is scored as Classic. |

### SignalDefinition and BoostDefinition

```ts
interface SignalDefinition {
	id: string;
	ceiling: number;
	compute: (input: SignalInput) => SignalOutput;
}

interface BoostDefinition {
	id: string;
	bucket?: string; // boosts in one bucket share the mode's cap for it
	compute: (input: SignalInput) => BoostOutput;
}

interface SignalOutput { points: number; reason?: ReasonFragment }
interface BoostOutput extends SignalOutput { meta?: Record<string, number> }
```

A signal's `points` are clamped to its `ceiling`. A boost has no ceiling of its own, but its bucket may have a cap.

### SignalInput

What `compute` receives.

| Field | Meaning |
|---|---|
| `game`, `context` | What was passed to `scoreGame`. |
| `sport`, `league` | The resolved [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig) and `LeagueConfig`, after any overrides in `options`. |
| `progress` | 0 at the start of the game, 1 at the end of regulation and through overtime. |
| `now` | The timestamp of the newest snapshot in `history`, or 0 with none. |
| `margin` | The absolute score margin. |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

Blowouts uses a floor with a factor of 0.3. Fantasy uses a boost with a weight of 0.6, so your players' games can only rise above their Classic score. The built-in modes don't use `mix`, but it's there for modes of your own.

### BlendResult

```ts
interface BlendResult {
	kind: ClassicBlend['kind'];
	weight: number;         // the floor factor or the weight
	ownTotal: number;       // the mode's own total, with its boosts, before blending
	classicTotal: number;   // Classic's, likewise
	floorApplied?: boolean; // for a floor, whether Classic's share won
}
```

`score.blend` carries one when a mode blended with Classic, so a breakdown can show the arithmetic.

## SportTypeConfig and LeagueConfig

`SportTypeConfig` holds everything about how a sport plays. That covers closeness thresholds, momentum and comeback thresholds, decay half-lives, whether the sport has a clock, and (baseball and softball only) a `lateGameCurve`. `LeagueConfig` holds how long a specific league's periods run: `id`, `label`, `sportType`, `regularPeriods`, `periodDurationSecs`, and `periodFormat`. It also carries fields ArenaSwap uses for its own fetching and schedule bars, which the scorer doesn't read.

Neither type has optional fields in the built-in tables. Every shipped sport and league fills in every one of them. Through `options.sport` and `options.league`, you can pass any subset as a `Partial` to override one per call. Field-by-field meaning and every sport and league's actual values are in [Sport and league configuration](/arenaswap/docs/powerscore/configuration/).

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

The single exported object holding every tier value and every reason string the engine can produce. It's a fully populated constant, not a partial config.

| Branch | Holds |
|---|---|
| `scores.closeness` | The closeness tier ceilings (`tied`, `tight`, `zeroZero`, `close`, `fringe`, `none`). See [Classic's closeness signal](/arenaswap/docs/powerscore/signals/#closeness). |
| `scores.closenessFlatFloor` | The flat floor every closeness tier pays out before progress scaling. |
| `scores.lateGame` | The late-game ceilings, the overtime pre-boost, and the previous-period touch. See [Late-Game Pressure](/arenaswap/docs/powerscore/signals/#late-game-pressure). |
| `scores.momentum` | The two momentum tier values. See [Momentum](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor). |
| `scores.leadChanges` | The two lead-change tier values. |
| `scores.comeback` | The two comeback tier values and its flat floor. |
| `scores.winProbabilityVariance` | `maxAvgDist` and `minDataPoints`, tabulated in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance). |
| `reasons` | Every string a reason can contain, from `"it's tied"` to `"best game available"`. Display text, not an API. |

`reasons` gained optional fields in 3.0 (`comebackBig`, `comebackModerate`, `boosts`, and the Blowouts strings). They're optional so a 2.x tunables object still type-checks, and the built-in English fills the gaps.

## FantasyRule and FantasySport

The types behind [`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints).

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

`min` and `max` are the bounds a settings screen can enforce, and `resolveFantasyScoring` clamps an override to them.

## SportType and LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

`SportType` is a closed union. `LeagueId` is the 31 leagues with built-in tuning, but it doesn't limit a `Game`: a game's `league` can be any string with `Game<string>`, and an id the table doesn't know is scored with its sport's defaults. The full list of 31 league ids is in [Sport and league configuration](/arenaswap/docs/powerscore/configuration/). It's also available at runtime as `allLeagueIds`.

## PowerScoreResult (2.x)

Deprecated, still exported, still working. The flat output of `computePowerScore`, and the shape `normalizePowerScoreResult` accepts a partial version of. `scoreGame` doesn't return it.

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
| `reason` | `string` | Falls back to `scorerTunables.reasons.fallback` ("best game available") when absent or not a string. |
| `stalled?` | `boolean` | Absent reads as `false`. `normalizePowerScoreResult` always sets it explicitly. |
| `stallPenalty?` | `number` | Points removed, always ≥ 0. Absent, not `0`, when no stall count was supplied. |
| `signalsSubtotal?` | `number` | The five signals' sum before the stall penalty, 0 to `scoreMaxSignalsSubtotal` (156). |
| `favoriteBonus?`, `favoriteTeamCount?`, `gameBoost?`, `scoringOpportunityBoost?`, `postseasonBoost?` | `number` | Not computed by `computePowerScore`. Absent unless a caller supplies them. |

`scoreGame` folds the favorite, postseason, and game boosts in for you, so you never need to build a `PowerScoreResult` by hand with it. Everything 2.x still exports is listed in [the API reference](/arenaswap/docs/powerscore/api-reference/#the-2x-api).
