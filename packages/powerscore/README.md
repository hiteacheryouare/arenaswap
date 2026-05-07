<div align="center">

# `powerscore`

**PowerScore** is an excitement-scoring algorithm for live sports games. It produces a 0–100 score measuring how exciting any game is *right now* across five independent signals.

![npm](https://img.shields.io/npm/v/powerscore?color=CB3837&logo=npm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-30-C21325?logo=jest&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)

</div>

---

## Installation

```bash
npm install powerscore
```

---

## What It Does

Given a live game and a short history of score snapshots, PowerScore outputs a number from 0 to 100. The higher the score, the more ArenaSwap wants to show you that game. Five signals feed into the total:

| Signal | Max Points | What It Measures |
|---|---|---|
| Closeness | 30 | How tight the margin is — a tied game scores maximum. |
| Late-Game Pressure | 30 | Exponential boost as the clock winds down. Overtime maxes the scale. |
| Momentum | 20 | Unanswered scoring runs. |
| Lead Changes | 12 | Back-and-forth games beat one-sided affairs. |
| Comeback Factor | 8 | Is the trailing team clawing back? |

Games with frozen clocks (commercial breaks, stoppages) take a **30% stall penalty** so ArenaSwap doesn't switch during dead time.

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
| `stallCount` | `number` | Number of consecutive polls where the clock hasn't moved. Defaults to `0`. Stall penalty kicks in at ≥5 polls (~75 seconds). |

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
  total: number;          // 0–100, the headline score
  closeness: number;      // 0–30
  lateGame: number;       // 0–30
  momentum: number;       // 0–20
  leadChanges: number;    // 0–12
  comeback: number;       // 0–8
  reason: string;         // human-readable explanation (e.g. "LAL heating up, under 2 min left")
  stalled?: boolean;      // true when stall penalty was applied
  baseTotal?: number;     // pre-bonus total (set externally by ArenaSwap core)
  favoriteBonus?: number; // extra points added for favorite teams (set externally)
  favoriteTeamCount?: number;
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

Compares the current score margin against sport-specific thresholds.

| State | Basketball | Football | Hockey / Soccer | Baseball |
|---|---|---|---|---|
| Tied | 30 | 30 | 30 | 30 |
| Tight | ≤5 pts (26) | ≤3 pts (26) | ≤1 goal (26) | ≤1 run (26) |
| Close | ≤10 pts (14) | ≤8 pts (14) | ≤2 goals (14) | ≤3 runs (14) |
| Fringe | ≤18 pts (5) | ≤14 pts (5) | ≤3 goals (5) | ≤5 runs (5) |
| Out of reach | — (0) | — (0) | — (0) | — (0) |

0–0 scores: full tie credit for hockey and soccer; reduced credit for all other sports.

### Late-Game Pressure

Clock-based sports (basketball, football, hockey, soccer) use an **exponential curve** that ramps steeply as time runs out. Overtime always returns the maximum (30).

Baseball uses an **inning-based curve** that activates from the 6th inning onward, reaching its ceiling in extra innings.

### Momentum

Looks at the oldest vs. newest snapshot in the history window and measures unanswered scoring runs. What counts as a "big run" is sport-aware:

- Basketball: 8+ unanswered → 20 pts
- Football: 10+ unanswered → 20 pts
- Hockey/Soccer: 2+ unanswered → 20 pts
- Baseball: 3+ unanswered → 20 pts

### Lead Changes

Counts sign changes in the score-differential across the history window.

- 2+ lead changes → 12 pts
- 1 lead change → 10 pts

### Comeback Factor

Compares how much the margin has shrunk since the oldest snapshot.

- Basketball: shrinkage ≥6 → 8 pts; ≥3 → 6 pts
- Football: shrinkage ≥7 → 8 pts; ≥3 → 6 pts
- Hockey/Soccer: shrinkage ≥2 → 8 pts; ≥1 → 6 pts

---

## Stall Detection

When a game's clock hasn't moved for **5 or more consecutive polls** (~75 seconds at the default 15s interval), a **30% penalty** is applied to the raw total. This prevents ArenaSwap from switching to a game stuck in a commercial break or timeout.

```ts
// stall penalty constants (exported from constants.ts)
stallThresholdPolls   // 5
stallPenaltyMultiplier // 0.7
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
