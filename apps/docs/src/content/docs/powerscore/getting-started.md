---
title: Score your first game with PowerScore
navLabel: Getting started
description: Install the powerscore package and score one live game in a few lines of code, ending with a number you can see printed to your terminal.
section: powerscore
order: 1
faq:
  - q: Does powerscore need an ESPN API key or account?
    a: No. It only scores the game state you hand it. Fetching that state from ESPN, or anywhere else, is your own code's job.
  - q: Does powerscore run in the browser?
    a: Yes. It has no runtime dependencies and touches nothing but plain objects and math. It bundles into a browser extension the same way it runs in Node.
---

This installs `powerscore` and scores one live game, ending with a single number printed to your terminal.

## Install the package

```bash
npm install powerscore
```

The package is also on [npm](https://www.npmjs.com/package/powerscore). To see it scoring tonight's real games, visit the [PowerScore page](/arenaswap/powerscore/).

## Describe the game

`computePowerScore` needs a `Game` object: the two scores, which league and sport it is, and where the game stands right now.

```ts
import { computePowerScore } from 'powerscore';
import type { Game } from 'powerscore';

const game: Game = {
	id: 'demo-1',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { score: 101, abbreviation: 'BOS' },
	awayTeam: { score: 99, abbreviation: 'LAL' },
	period: 4,
	clockSeconds: 45,
};
```

Boston is up two points with 45 seconds left in the fourth quarter. That's close, and it's late: exactly what PowerScore looks for.

## Score it

```ts
const result = computePowerScore(game);
console.log(result.total);
```

Run that, and the terminal prints:

```text
68
```

## Read the breakdown

`result` carries more than the headline number: each signal's own contribution, and a short reason string.

```ts
console.log(result);
// {
//   gameId: 'demo-1',
//   total: 68,
//   closeness: 34,
//   lateGame: 34,
//   momentum: 0,
//   leadChanges: 0,
//   comeback: 0,
//   reason: '0:45 left, 2-point game',
//   stalled: false,
//   stallPenalty: 0,
//   signalsSubtotal: 68
// }
```

Closeness and late-game pressure make up the whole score here. With no score history to look back on, momentum, lead changes, and comeback factor have nothing to measure yet, so they sit at 0.

To score a game your own code is polling, read [Score a game from live data](/arenaswap/docs/powerscore/scoring-a-game/). For what each signal measures and why, read [The five PowerScore signals](/arenaswap/docs/powerscore/signals/).
