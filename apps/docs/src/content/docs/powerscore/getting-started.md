---
title: Score your first game with PowerScore
navLabel: Getting started
description: Install the powerscore package and score one live game with scoreGame in a few lines of code, ending with a number and a reason you can see in your terminal.
section: powerscore
order: 1
faq:
  - q: Does powerscore need an API key or account?
    a: No. It only scores the game state you hand it. Fetching that state, from wherever your scores come from, is your own code's job.
  - q: Does powerscore run in the browser?
    a: Yes. It has no runtime dependencies and touches nothing but plain objects and math. It bundles into a browser extension the same way it runs in Node.
  - q: Do I have to rewrite my 2.x code for PowerScore 3?
    a: No. computePowerScore and the 2.x types still work and return the same totals they did. Move to scoreGame when you want modes or the new boosts.
---

This installs `powerscore` and scores one live game, ending with a number and the reasons behind it.

## Install the package

```bash
npm install powerscore
```

The package is also on [npm](https://www.npmjs.com/package/powerscore). To see it scoring tonight's real games, visit the [PowerScore page](/arenaswap/powerscore/).

## Describe the game

`scoreGame` needs a `Game` object: the two scores, which league and sport it is, and where the game stands right now. Set `status: 'in'` for a live game, since that's what the boosts check before they pay anything.

```ts
import { scoreGame } from 'powerscore';
import type { Game } from 'powerscore';

const game: Game = {
	id: 'demo-1',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	homeTeam: { score: 101, abbreviation: 'BOS' },
	awayTeam: { score: 99, abbreviation: 'LAL' },
	period: 4,
	clockSeconds: 45,
};
```

Boston is up two points with 45 seconds left in the fourth quarter. That's close, and it's late: exactly what PowerScore looks for.

## Score it

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

Run that, and the terminal prints:

```text
68
0:45 left, 2-point game
```

`scoreGame` takes two more arguments, and both are optional: a `context` for everything the game doesn't carry (score history, win probability, the pregame line, a fantasy roster) and `options` for how to score it (which mode, which signals to switch off). With neither, you get Classic, the mode that asks whether a game is close and late.

## Read the breakdown

`score` carries more than the headline number. Every signal is on it as a list entry with its own points and ceiling, along with the boosts and the reasons.

```ts
console.log(score.signals);
// [
//   { id: 'closeness',   points: 34, ceiling: 42, disabled: false },
//   { id: 'lateGame',    points: 34, ceiling: 38, disabled: false },
//   { id: 'momentum',    points: 0,  ceiling: 38, disabled: false },
//   { id: 'leadChanges', points: 0,  ceiling: 18, disabled: false },
//   { id: 'comeback',    points: 0,  ceiling: 20, disabled: false },
// ]
```

Closeness and late-game pressure make up the whole score here. With no score history to look back on, momentum, lead changes, and comeback factor have nothing to measure yet, so they sit at 0. Hand `scoreGame` a `history` in the context and they wake up. The boosts are on `score.boosts`, all at 0 for this game, because a basketball game has no runners, red zone, or pulled goalie to pay for.

Use `signalPoints(score, 'momentum')` and `boostPoints(score, 'noHitter')` to look one up by id.

## Try another mode

The same game can answer a different question. Modes are picked with `options.mode`:

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

Blowouts asks whether somebody is running away with it. A 2-point game isn't, so it scores 30% of its Classic 68 and nothing more. That floor is what keeps a close game eligible on a night with no beatdown. Fantasy asks whether something is about to happen to your players. [The signals page](/arenaswap/docs/powerscore/signals/) covers all three.

To score a game your own code is polling, read [Score a game from live data](/arenaswap/docs/powerscore/scoring-a-game/). For what each signal measures and why, read [PowerScore signals in every mode](/arenaswap/docs/powerscore/signals/).
