<div align="center">

# `powerscore`

**PowerScore** is an excitement-scoring algorithm for live sports games. It produces a 0–100 score measuring how exciting any game is *right now* across five independent signals.

![npm](https://img.shields.io/npm/v/powerscore?color=CB3837&logo=npm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-30-C21325?logo=jest&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)

</div>

---

## Website

- PowerScore package page: https://hiteacheryouare.github.io/arenaswap/powerscore/
- npm package: https://www.npmjs.com/package/powerscore

---

## Installation

```bash
npm install powerscore
```

---

## What It Does

Given a live game and a short history of score snapshots, PowerScore outputs a number from 0 to 100. The higher the score, the more ArenaSwap wants to show you that game. Five signals feed into the total:

| Signal | Ceiling | What It Measures |
|---|---|---|
| Closeness | 42 | How tight the margin is — a tied game scores highest, scaled up as the game progresses. |
| Late-Game Pressure | 38 | Tension that rises near-linearly across the whole final period (only when the game is close), plus a pre-boost for tied games heading to overtime. |
| Momentum | 38 | How lopsided the scoring has been across the window — spikes on a swing, then fades. |
| Lead Changes | 18 | Back-and-forth games beat one-sided affairs. |
| Comeback Factor | 20 | Is the trailing team clawing back? |

A sixth input, **win probability balance**, sits on top as a ±5 modifier rather than a signal of its own.

Three ideas shape v2 of the scoring model:

- **The full range is used.** The per-signal ceilings deliberately sum to 156 ("overcomplete"), and the headline total is capped at 100. So a genuinely exciting game — close, back-and-forth, with a run — stacks into the 80s/90s even mid-game, and a true classic saturates at 100, while a dull game still scores low. The scale spans 0–100 instead of compressing every game into the bottom two-thirds.
- **Games build.** State signals (closeness, comeback) pay out a small flat floor early and ramp toward their ceiling as the game progresses (on a concave curve, so they reach most of their value by mid-game), and late-game pressure only counts when the game is close. An early or lopsided game scores low; tension builds toward the final buzzer.
- **The pulse fades.** The live-action signals (momentum, lead changes, comeback) spike on a scoring event and then decay on sport-scaled half-lives, so even low-scoring sports keep a moving graph between scores instead of drawing flat lines.

Games with frozen clocks (commercial breaks, stoppages) take a graduated **stall deduction** so ArenaSwap doesn't switch during dead time.

---

## API

### `computePowerScore`

The main entry point. Takes a game, its score history, an optional stall count and an optional win-probability history; returns a full `PowerScoreResult`.

```ts
import { computePowerScore } from 'powerscore';

const result = computePowerScore(game, history, stallCount, winProbabilityHistory);
// result.total → 0–100
```

**Parameters**

| Name | Type | Description |
|---|---|---|
| `game` | `Game` | Current game state (scores, period, clock, league, etc.) |
| `history` | `ScoreSnapshot[]` | Recent score snapshots for momentum/lead change/comeback calculation. Needs at least 3 entries for those signals to activate. Defaults to `[]`. |
| `stallCount` | `number` | Number of consecutive polls where the clock hasn't moved. Defaults to `0`. A flat deduction applies at ≥8 polls (−15) and deepens at ≥15 polls (−25). |
| `winProbabilityHistory` | `number[]` | Recent win-probability values, each 0–1. Only the distance from 50% matters, so either team's line works. Needs at least 5 finite entries to contribute; non-finite entries are dropped. Defaults to `[]`. |

### `isPlayFrozen`

True when the game is at halftime, in an intermission, or delayed — the states where `computePowerScore` returns a flat 0 and `computeScoringOpportunityBoost` pays nothing. Consumers that add their own boosts on top of the scorer's total should check this and suppress them too, so a stopped game can't out-score one that's being played.

```ts
import { isPlayFrozen } from 'powerscore';

const boost = isPlayFrozen(game) ? 0 : favoriteTeamBonus;
```

### `normalizePowerScoreResult`

Clamps and sanitizes a partial result into a valid `PowerScoreResult`. Useful when constructing or patching results manually.

```ts
import { normalizePowerScoreResult } from 'powerscore';

const normalized = normalizePowerScoreResult({ gameId: 'abc', total: 110, ... });
// total is clamped to 100
```

### `computeScoringOpportunityBoost`

Extra points for a scoring threat the score itself doesn't show yet: runners on base, or a football drive inside the red zone. Returns `0` unless the game is in progress (`status: 'in'`) and play isn't frozen, so it can't keep paying out through a commercial or a rain delay while the situation is held in place.

```ts
import { computeScoringOpportunityBoost } from 'powerscore';

const boost = computeScoringOpportunityBoost(game); // 0–15
```

- **Baseball / softball:** by runner count — `0`, `3`, `6`, `10` for none, one, two and three runners.
- **Football:** `10` in the red zone while the game is within the close band, `5` in the fringe band, `0` once it's out of reach — then weighted by the down (×1.5 on 4th and goal, ×1.35 on 4th down, ×1.15 on 3rd and 3 or less).

The boost is not folded into `total`. Add it on top yourself, the way ArenaSwap's background loop does, and check `isPlayFrozen` before adding any boosts of your own.

### `computeWinProbVarianceScore`

Maps a win-probability history to the ±5 modifier that `computePowerScore` applies on top of the five signals. Lines that hug 50% earn the boost; a decided game takes the penalty. Returns `undefined` when fewer than 5 finite values are supplied.

```ts
import { computeWinProbVarianceScore } from 'powerscore';

computeWinProbVarianceScore([0.51, 0.49, 0.50, 0.52, 0.48]); // +5, a coin flip
computeWinProbVarianceScore([0.92, 0.94, 0.90, 0.95, 0.93]); // -5, decided
```

Despite the name it measures mean absolute distance from 50%, not variance, so a line oscillating between 10% and 90% scores the same penalty as one held steadily at 90%.

---

## Types

### `Game`

The minimal game shape required by the scorer.

```ts
interface Game {
  id: string;
  league: LeagueId;         // e.g. 'nba', 'nfl', 'mlb' — 31 supported
  sportType: SportType;     // 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer'
  homeTeam: { score: number; abbreviation?: string };
  awayTeam: { score: number; abbreviation?: string };
  period?: number;          // absent → scores as if the game hasn't started
  clockSeconds?: number;    // absent → unknown, not 0:00; the ramp holds at the period start
  intermission?: boolean;   // halftime, end of period — scorer returns 0 across all signals
  delayed?: boolean;        // weather, injury, any extended stoppage — also scores 0
  status?: 'pre' | 'in' | 'post';
  topOfInning?: boolean;    // baseball/softball: the bottom of the 9th outscores the top of it
  baseRunners?: { first: boolean; second: boolean; third: boolean };
  isRedZone?: boolean;      // football, from here down
  down?: number;
  distance?: number;
  isGoalToGo?: boolean;
}
```

Only `id`, `league`, `sportType` and the two team scores are required. Everything else narrows the score when it's available and is treated as unknown when it isn't — a missing clock holds the late-game ramp at the start of the period rather than reading as the final buzzer.

### `ScoreSnapshot`

A point-in-time record of a game's score, used to detect momentum, lead changes, and comebacks.

```ts
interface ScoreSnapshot {
  gameId: string;
  timestamp: number;
  homeScore: number;
  awayScore: number;
}
```

### `PowerScoreResult`

The full output of `computePowerScore`.

```ts
interface PowerScoreResult {
  gameId: string;
  total: number;                    // 0–100, the headline score (capped; ceilings sum to 156)
  closeness: number;                // 0–42
  lateGame: number;                 // 0–38
  momentum: number;                 // 0–38
  leadChanges: number;              // 0–18
  comeback: number;                 // 0–20
  winProbabilityVariance?: number;  // −5 to +5. Absent when no win-probability history was given
  reason: string;                   // e.g. "BOS outscoring LAL 10-2, under 2 min left"
  stalled?: boolean;                // true when a stall deduction was applied
  stallPenalty?: number;            // points removed, always ≥ 0
  baseTotal?: number;               // the pre-stall signals subtotal, set by computePowerScore
  favoriteBonus?: number;           // extra points for favorite teams (set externally)
  favoriteTeamCount?: number;
  gameBoost?: number;               // manual per-game boost (set externally)
  scoringOpportunityBoost?: number; // see computeScoringOpportunityBoost (set externally)
  postseasonBoost?: number;         // extra points for postseason games (set externally)
}
```

`total` is `baseTotal` minus `stallPenalty`, plus `winProbabilityVariance`, capped at 100. The externally-set fields are passed through untouched by `normalizePowerScoreResult` so a breakdown can show them; the scorer itself never adds them to `total`.

---

## Supported Leagues

| Sport | Leagues |
|---|---|
| 🏀 Basketball | NBA, WNBA, NCAA Men's, NCAA Women's, Olympic Men's, Olympic Women's |
| 🏈 Football | NFL, NCAA Football, UFL |
| 🏒 Hockey | NHL, NCAA Men's Hockey, Olympic Men's, Olympic Women's |
| ⚾ Baseball | MLB, NCAA Baseball, Olympic Men's Baseball, World Baseball Classic |
| 🥎 Softball | NCAA Softball |
| ⚽ Soccer | MLS, Premier League, La Liga, Bundesliga, Serie A, Liga MX, NWSL, Champions League, Europa League, FIFA World Cup, FIFA Women's World Cup, Olympic Men's, Olympic Women's |

31 leagues in all. Each one maps to one of six sport-type configurations (basketball, football, hockey, baseball, softball, soccer) that tune the closeness margins, momentum thresholds, decay half-lives and late-game curves to feel natural for that sport. `allLeagueIds` and `leagueConfigMap` are exported if you need the full list at runtime.

---

## Signal Details

### Closeness

Compares the current score margin against sport-specific thresholds to pick a tier, then scales the tier by **game progress** (on a concave curve) with a small always-on flat floor: `floor + (tierCeiling − floor) × progress^0.55`. So an early close game sits near the floor, reaches most of its value by mid-game, and tops out at the buzzer. The points below are the tier **ceilings**:

| State | Basketball | Football | Hockey / Soccer | Baseball / Softball | Ceiling |
|---|---|---|---|---|---|
| Tied | — | — | — | — | 42 |
| Tight | ≤5 pts | ≤3 pts | ≤1 goal | ≤1 run | 34 |
| Close | ≤10 pts | ≤9 pts | ≤2 goals | ≤3 runs | 20 |
| Fringe | ≤18 pts | ≤14 pts | ≤3 goals | ≤5 runs | 8 |
| Out of reach | >18 pts | >14 pts | >3 goals | >5 runs | 0 |

The flat floor is 12, clamped to the tier ceiling — so fringe games stay at 8 rather than being lifted by it.

0–0 is scored separately from an ordinary tie, because early on it means nothing has happened yet. Hockey gets full tie credit for it from the 3rd period on and soccer from the 2nd half on; before that, and in every other sport, it earns the reduced `zeroZero` ceiling of 22.

### Late-Game Pressure

Clock-based sports (basketball, football, hockey, soccer) ramp **near-linearly across the entire final period** — from 3 points at the start of the period up to a closeness-gated ceiling at the buzzer, with a gentle "touch" of pressure (up to 3) carried through the prior period. There is no final-seconds spike; the tension is spread out. The ceiling is picked by how close the game is, because a 30-point game in the final minute has no tension:

| Margin | Ceiling at the buzzer |
|---|---|
| Tied, tight or close (within the `close` band) | 36 |
| Fringe | 22 |
| Out of reach | 15 |

Tied games earn an additional **overtime pre-boost** (36 → 38) ramping up through the final 60 seconds, so games heading for overtime separate from ordinary close ones. Overtime and extra innings return the reserved maximum, 38.

Baseball and softball use the same closeness-gated ramp keyed to innings instead of a clock: baseball activates in the 6th and climbs to the ceiling by the 9th, softball in the 5th climbing by the 7th.

**Soccer never says "overtime."** Extra time reads *extra time*, a penalty shootout reads *penalties*, and a level match late in the second half reads *still level late* — a draw is an ordinary league result, not a stop on the way to overtime. The pre-boost still applies, because a late deadlock is genuinely tense.

A missing clock is treated as unknown rather than 0:00. On a countdown sport, coercing it to zero used to read as the final buzzer and pay the full ceiling; now the ramp holds where the period started and no clock is quoted in the reason.

### Momentum

Measures the **swing in the score differential** between the oldest and newest snapshot in the window, then **decays on a sport-scaled half-life** so a burst spikes and then fades. A stretch where one team goes +10 and the other +2 is a swing of 8, not a 10-0 run — the reason string names both numbers for exactly that reason. What counts as a big swing is sport-aware:

| Sport | Big swing → 38 | Small swing → 20 | Half-life |
|---|---|---|---|
| Basketball | 8 | 4 | 45s |
| Football | 10 | 4 | 135s |
| Hockey | 2 | 1 | 180s |
| Soccer | 2 | 1 | 240s |
| Baseball / Softball | 3 | 1 | 150s |

### Lead Changes

Counts how many times the lead actually changed hands across the history window, then decays from the most recent change on the sport's half-life.

- 2+ lead changes → 18 pts
- 1 lead change → 12 pts

A tie is not a lead change on its own. Going behind, level, then ahead is **one** change, and going ahead, level, then ahead again is **none** — the differential skips zeros rather than treating 0 as a third sign.

Half-lives: 60s basketball, 180s football and baseball/softball, 240s hockey, 300s soccer.

### Comeback Factor

Compares how much the margin has shrunk since the oldest snapshot. Progress-scaled like closeness (with a flat floor of 2) and then decayed like momentum.

| Sport | Big shrinkage → 20 | Moderate → 11 |
|---|---|---|
| Basketball | 6 | 3 |
| Football | 7 | 3 |
| Hockey / Soccer | 2 | 1 |
| Baseball / Softball | 2 | 1 |

### Win Probability Balance

A ±5 modifier applied on top of the five signals, from the mean absolute distance of the supplied win-probability line from 50%. A line hugging 50% earns +5; an average distance of 0.35 or more saturates the −5 penalty. Needs at least 5 finite data points, and is absent from the result entirely when fewer are supplied.

---

## Stall Detection

When a game's clock stops moving, a **flat point deduction** comes off the signals subtotal so ArenaSwap doesn't switch to a game stuck in a commercial break or a timeout:

- **≥8 consecutive frozen polls** → −15 points
- **≥15 consecutive frozen polls** → −25 points

```ts
// stall deduction steps (exported from constants.ts), highest threshold first
stallPenaltySteps // [{ minPolls: 15, deduction: 25 }, { minPolls: 8, deduction: 15 }]
```

It is a deduction, not a multiplier: a game whose signals total 79 with a deep stall lands at 54, not at 55. ArenaSwap polls on a dynamic interval — 6–25 seconds while games are live, 40 during an intermission — so 8 frozen polls is somewhere between about 50 seconds and 3 minutes of dead air, and 15 polls between about 1.5 and 6 minutes.

The deduction applies to the five signals only. `winProbabilityVariance` sits on top of the stalled subtotal and is not reduced by it. `baseTotal` holds the pre-deduction subtotal, so a breakdown can show what the stall cost.

---

## Migrating from 1.x

2.0.0 recalibrated the model and changed public shapes. Four things are most likely to break a 1.x consumer.

**`stallPenaltySteps` is a flat deduction, not a multiplier.** The field was renamed along with the mechanic, so the old one silently disappears rather than erroring.

```ts
// 1.x
stallPenaltySteps // [{ minPolls: 15, multiplier: 0.70 }, { minPolls: 8, multiplier: 0.85 }]
const total = rawTotal * step.multiplier;

// 2.0
stallPenaltySteps // [{ minPolls: 15, deduction: 25 }, { minPolls: 8, deduction: 15 }]
const total = Math.max(0, rawTotal - step.deduction);
```

Reading `step.multiplier` on 2.0 returns `undefined`, and multiplying by it gives `NaN`.

**`ScorerTunables.scores.lateGame` was reshaped.** The single ramp ceiling became three, picked by how close the game is, and the two fields deprecated in 1.x are gone.

| 1.x | 2.0 |
|---|---|
| `otEdgeMax: 26` | `closeCeiling: 36`, `fringeCeiling: 22`, `blowoutCeiling: 15` |
| `clockBased: { critical, tense, previousPeriod }` | removed |
| `baseballInningTiers` | removed |

**The clock late-game curve types are gone.** `ExponentialLateGameCurve` and `ClockLateGameCurveConfig` were removed, and `LateGameCurveConfig` is no longer a union — it is now just `BaseballLateGameCurveConfig`. Clock sports derive their ramp from period plus clock and carry no curve config at all. `BaseballInningScoreTier` went with them, and `BaseballLateGameCurveConfig.extraInningsStartInning` is gone too, since extra innings are detected from `period > league.regularPeriods` and the field was never read.

**Everything else worth knowing.** Signal ceilings were raised across the board except lead changes (30→42 closeness, 28→38 late-game, 28→38 momentum, 14→20 comeback), so any threshold you calibrated against 1.x totals needs revisiting. `Game.period`, `Game.clockSeconds` and both `abbreviation` fields are now optional, and a missing clock is treated as unknown rather than 0:00. `SportType` gained `'softball'` and `LeagueId` went from 12 leagues to 31. `computePowerScore` takes a fourth `winProbabilityHistory` parameter, and `PowerScoreResult` gained `winProbabilityVariance`, `stallPenalty`, `scoringOpportunityBoost` and `postseasonBoost`. `baseTotal` is now set by `computePowerScore` itself, holding the pre-stall signals subtotal.

Reason strings changed wording throughout. They are display text, not an API — match on them at your own risk.

---

## Development

```bash
# standalone (from packages/powerscore)
npm install
npm run build
npm test

# from the ArenaSwap monorepo root
npm run typecheck --workspace powerscore
npm run test --workspace powerscore
npm run build --workspace powerscore
```

---

## License

ISC. See the [LICENSE](./LICENSE) file for details.

---

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/hiteacheryouare/arenaswap/mega/.github/assets/latticeco-white.png">
  <img alt="Lattice &amp; Company" src="https://raw.githubusercontent.com/hiteacheryouare/arenaswap/mega/.github/assets/latticeco-black.png" width="200">
</picture>

<br />
<br />

<sub>Part of <a href="https://github.com/hiteacheryouare/arenaswap">ArenaSwap</a>, a <a href="https://github.com/latticeandcompany">Lattice &amp; Company</a> project, built and maintained by <a href="https://github.com/hiteacheryouare">Ryan Mullin</a>.</sub>

</div>
