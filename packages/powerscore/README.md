<div align="center">

# `powerscore`

**PowerScore** is an excitement-scoring algorithm for live sports games. It produces a 0–100 score measuring how exciting any game is *right now* across five independent signals.

![npm](https://img.shields.io/npm/v/powerscore?color=CB3837&logo=npm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
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
| Closeness | 30 | How tight the margin is — a tied game scores highest, scaled up as the game progresses. |
| Late-Game Pressure | 28 | Tension that rises near-linearly across the whole final period (only when the game is close), plus a pre-boost for tied games heading to overtime. |
| Momentum | 28 | Unanswered scoring runs — spikes on a run, then fades. |
| Lead Changes | 18 | Back-and-forth games beat one-sided affairs. |
| Comeback Factor | 14 | Is the trailing team clawing back? |

Three ideas shape v2 of the scoring model:

- **The full range is used.** The per-signal ceilings deliberately sum to more than 100 ("overcomplete"), and the headline total is capped at 100. So a genuinely exciting game — close, back-and-forth, with a run — stacks into the 80s/90s even mid-game, and a true classic saturates at 100, while a dull game still scores low. The scale spans 0–100 instead of compressing every game into the bottom two-thirds.
- **Games build.** State signals (closeness, comeback) pay out a small flat floor early and ramp toward their ceiling as the game progresses (on a concave curve, so they reach most of their value by mid-game), and late-game pressure only counts when the game is close. An early or lopsided game scores low; tension builds toward the final buzzer.
- **The pulse fades.** The live-action signals (momentum, lead changes, comeback) spike on a scoring event and then decay on sport-scaled half-lives, so even low-scoring sports keep a moving graph between scores instead of drawing flat lines.

Games with frozen clocks (commercial breaks, stoppages) take a graduated **stall penalty** so ArenaSwap doesn't switch during dead time.

---

## API

### `computePowerScore`

The main entry point. Takes a game, its score history, and an optional stall count; returns a full `PowerScoreResult`.

```ts
import { computePowerScore } from 'powerscore';

const result = computePowerScore(game, history, stallCount);
// result.total → 0–100
```

**Parameters**

| Name | Type | Description |
|---|---|---|
| `game` | `Game` | Current game state (scores, period, clock, league, etc.) |
| `history` | `ScoreSnapshot[]` | Recent score snapshots for momentum/lead change/comeback calculation. Needs at least 3 entries for those signals to activate. |
| `stallCount` | `number` | Number of consecutive polls where the clock hasn't moved. Defaults to `0`. A graduated stall penalty kicks in at ≥8 polls (~120s → 15% off) and deepens at ≥15 polls (~225s → 30% off). |

### `normalizePowerScoreResult`

Clamps and sanitizes a partial result into a valid `PowerScoreResult`. Useful when constructing or patching results manually.

```ts
import { normalizePowerScoreResult } from 'powerscore';

const normalized = normalizePowerScoreResult({ gameId: 'abc', total: 110, ... });
// total is clamped to 100
```

---

## Types

### `Game`

The minimal game shape required by the scorer.

```ts
interface Game {
  id: string;
  league: LeagueId;       // e.g. 'nba', 'nfl', 'mlb'
  sportType: SportType;   // 'basketball' | 'football' | 'hockey' | 'baseball' | 'soccer'
  homeTeam: { score: number; abbreviation: string };
  awayTeam: { score: number; abbreviation: string };
  period: number;
  clockSeconds: number;
  intermission?: boolean; // if true, scorer returns 0 across all signals
}
```

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
  total: number;          // 0–100, the headline score (capped; signal ceilings sum to >100)
  closeness: number;      // 0–30
  lateGame: number;       // 0–28
  momentum: number;       // 0–28
  leadChanges: number;    // 0–18
  comeback: number;       // 0–14
  reason: string;         // human-readable explanation (e.g. "LAL heating up, under 2 min left")
  stalled?: boolean;      // true when stall penalty was applied
  baseTotal?: number;     // pre-bonus total (set externally by ArenaSwap core)
  favoriteBonus?: number; // extra points added for favorite teams (set externally)
  favoriteTeamCount?: number;
  gameBoost?: number;     // manual per-game boost (set externally)
}
```

---

## Supported Leagues

| Sport | Leagues |
|---|---|
| 🏀 Basketball | NBA, WNBA, NCAAB, NCAAW |
| 🏈 Football | NFL, NCAAF |
| 🏒 Hockey | NHL, NCAA Men's Hockey |
| ⚾ Baseball | MLB |
| ⚽ Soccer | MLS, English Premier League, FIFA World Cup |

Each league is mapped to one of five sport-type configurations (basketball, football, hockey, baseball, soccer) that tune the closeness margins, momentum thresholds, and late-game curves to feel natural for that sport.

---

## Signal Details

### Closeness

Compares the current score margin against sport-specific thresholds to pick a tier, then scales the tier by **game progress** (on a concave curve) with a small always-on flat floor: `floor + (tierCeiling − floor) × progress^0.55`. So an early close game sits near the floor, reaches most of its value by mid-game, and tops out at the buzzer. The points below are the tier **ceilings**:

| State | Basketball | Football | Hockey / Soccer | Baseball | Ceiling |
|---|---|---|---|---|---|
| Tied | — | — | — | — | 30 |
| Tight | ≤5 pts | ≤3 pts | ≤1 goal | ≤1 run | 25 |
| Close | ≤10 pts | ≤8 pts | ≤2 goals | ≤3 runs | 15 |
| Fringe | ≤18 pts | ≤14 pts | ≤3 goals | ≤5 runs | 6 |
| Out of reach | — | — | — | — | 0 |

0–0 scores: full tie credit for hockey and soccer (outside penalty periods); reduced credit otherwise.

### Late-Game Pressure

Clock-based sports (basketball, football, hockey, soccer) ramp **near-linearly across the entire final period** — from a low value at the start of the period up to the overtime edge (26) at the buzzer, with a gentle "touch" of pressure carried through the prior period. There is no final-seconds spike; the tension is spread out. Crucially, the ramp is **scaled by closeness** (full for a one-score game, half for a fringe game, a sliver for a blowout) — a 30-point game in the final minute has no tension. Tied games earn an additional **overtime pre-boost** (26 → 28) ramping up through the final minute, so OT-bound games separate from ordinary late games. Overtime / extra innings return the reserved maximum (28).

Baseball uses the same closeness-gated near-linear ramp keyed to innings: it activates from the 6th inning and climbs to the overtime edge by the 9th.

### Momentum

Measures unanswered scoring runs (oldest vs. newest snapshot in the window), then **decays on a sport-scaled half-life** so a run spikes and then fades. What counts as a "big run" is sport-aware:

- Basketball: 8+ unanswered → 28 pts (half-life ~45s)
- Football: 10+ unanswered → 28 pts (half-life ~135s)
- Hockey/Soccer: 2+ unanswered → 28 pts (half-life ~180–240s)
- Baseball: 3+ unanswered → 28 pts (half-life ~150s)

### Lead Changes

Counts sign changes in the score-differential across the history window, then decays from the most recent lead change on the sport's half-life.

- 2+ lead changes → 18 pts
- 1 lead change → 12 pts

### Comeback Factor

Compares how much the margin has shrunk since the oldest snapshot. Progress-scaled (like closeness) and then decayed (like momentum).

- Basketball: shrinkage ≥6 → 14 pts; ≥3 → 8 pts
- Football: shrinkage ≥7 → 14 pts; ≥3 → 8 pts
- Hockey/Soccer: shrinkage ≥2 → 14 pts; ≥1 → 8 pts

---

## Stall Detection

When a game's clock stops moving, a **graduated penalty** is applied to the raw total so ArenaSwap doesn't switch to a game stuck in a commercial break or timeout:

- **≥8 consecutive frozen polls** (~120s at the 15s interval) → 15% penalty (×0.85)
- **≥15 consecutive frozen polls** (~225s) → 30% penalty (×0.70)

```ts
// stall penalty steps (exported from constants.ts), highest threshold first
stallPenaltySteps // [{ minPolls: 15, multiplier: 0.70 }, { minPolls: 8, multiplier: 0.85 }]
```

---

## Development

```bash
# standalone (from packages/powerScore)
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
