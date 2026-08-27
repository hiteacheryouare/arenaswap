---
title: Score a game from live data
description: Map an ESPN scoreboard response onto a Game object, keep a score history across polls, and add your own boosts on top of the total.
section: powerscore
order: 2
navLabel: Score from live data
faq:
  - q: Does computePowerScore check whether a game is actually live?
    a: No. It only checks isPlayFrozen for an intermission or a delay. Filter to games with status 'in' yourself first, the same way ArenaSwap does before it ever calls the scorer.
---

`computePowerScore` doesn't fetch anything. It scores whatever `Game` object and history you hand it. This page builds both from an ESPN-shaped scoreboard response, the way ArenaSwap itself does.

## Map the raw response onto a Game

Only `id`, `league`, `sportType`, and the two team scores are required. Everything else narrows the score when your feed has it, and counts as unknown when it doesn't. Map what you have, and skip the rest.

```ts
import { computePowerScore } from 'powerscore';
import type { Game } from 'powerscore';

// One event from ESPN's public scoreboard endpoint, e.g.
// site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
function toGame(event: EspnEvent): Game {
	const comp = event.competitions[0];
	const home = comp.competitors.find(c => c.homeAway === 'home')!;
	const away = comp.competitors.find(c => c.homeAway === 'away')!;

	return {
		id: event.id,
		league: 'nba',
		sportType: 'basketball',
		homeTeam: { score: Number(home.score), abbreviation: home.team.abbreviation },
		awayTeam: { score: Number(away.score), abbreviation: away.team.abbreviation },
		period: comp.status.period,
		clockSeconds: parseClock(comp.status.displayClock), // '0:45' -> 45
		status: comp.status.type.state as Game['status'],
		intermission: /HALFTIME|END_PERIOD/i.test(comp.status.type.name),
	};
}
```

Baseball and football carry a few more fields ESPN reports under `situation`: `topOfInning`, `baseRunners`, `down`, `distance`, `isRedZone`, and `isGoalToGo`. All are optional, and each one only sharpens a score that already works without it. The full shape is in [PowerScore's TypeScript types](/arenaswap/docs/powerscore/types/#game).

## Keep a score history for momentum, lead changes, and comeback

Those three signals read from `history`, a list of a game's past scores, and stay at 0 until it has at least three snapshots. Keep one on every poll, in order, with a timestamp in milliseconds. The timestamps only need to be relative to each other. They don't have to be wall-clock time.

```ts
import { computePowerScore } from 'powerscore';
import type { Game, ScoreSnapshot } from 'powerscore';

const game: Game = {
	id: 'espn-401585183',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { score: 88, abbreviation: 'BOS' },
	awayTeam: { score: 82, abbreviation: 'LAL' },
	period: 3,
	clockSeconds: 300,
	status: 'in',
};

const history: ScoreSnapshot[] = [
	{ gameId: game.id, timestamp: 0, homeScore: 75, awayScore: 80 },
	{ gameId: game.id, timestamp: 15_000, homeScore: 79, awayScore: 80 },
	{ gameId: game.id, timestamp: 30_000, homeScore: 88, awayScore: 82 },
];

const result = computePowerScore(game, history);
```

Boston just took the lead on the back of a 13-2 run:

```ts
// { gameId: 'espn-401585183', total: 70, closeness: 18, lateGame: 2, momentum: 38,
//   leadChanges: 12, comeback: 0, reason: 'BOS outscoring LAL 13-2, just took the lead',
//   stalled: false, stallPenalty: 0, signalsSubtotal: 70 }
```

Trim snapshots older than the sport's `historyWindowMs` so the array doesn't grow forever. That window, and the rest of the sport-specific tuning, is in [Sport and league configuration](/arenaswap/docs/powerscore/configuration/).

## Track stalls and win probability, if you have them

`computePowerScore` takes two more optional arguments. `stallCount` is however many consecutive polls the clock hasn't moved, which you track yourself by comparing `clockSeconds` between polls:

```ts
const stallCount = game.clockSeconds === previousClockSeconds ? previousStallCount + 1 : 0;
const result = computePowerScore(game, history, stallCount, winProbHistory);
```

`winProbabilityHistory` is a list of recent win-probability values from 0 to 1, for either team. Only the distance from 50% matters. Both arguments are optional, and PowerScore scores fine without them. What each one changes is in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Add a scoring-opportunity boost

Baseball, softball, and football carry a situation the score alone doesn't show yet: runners on base, or a drive inside the red zone. `computeScoringOpportunityBoost` reads that straight off the `Game` object:

```ts
import { computeScoringOpportunityBoost } from 'powerscore';

computeScoringOpportunityBoost({
	id: 'g1', league: 'mlb', sportType: 'baseball',
	homeTeam: { score: 2 }, awayTeam: { score: 1 }, status: 'in',
	baseRunners: { first: true, second: true, third: false },
}); // 6, two runners on

computeScoringOpportunityBoost({
	id: 'g2', league: 'nfl', sportType: 'football',
	homeTeam: { score: 14 }, awayTeam: { score: 10 }, status: 'in',
	isRedZone: true, down: 4, distance: 1, isGoalToGo: true,
}); // 15, 4th and goal, weighted ×1.5
```

This boost isn't folded into `computePowerScore`'s total. Add it yourself, the same way the next section does.

## Layer your own boosts on top of the total

`computePowerScore`'s total tops out at 100. Score the game first. Add your own points on top afterward, for something PowerScore doesn't know about, like a viewer's favorite team. Before adding them, check `isPlayFrozen`, so a stopped game can't out-score one being played.

```ts
import { computePowerScore, isPlayFrozen, normalizePowerScoreResult, scoreMaxTotal } from 'powerscore';

const base = computePowerScore(game, history, stallCount, winProbHistory);
const frozen = isPlayFrozen(game);
const favoriteBonus = frozen ? 0 : 5;
const gameBoost = frozen ? 0 : 10;

const withBoosts = normalizePowerScoreResult(
	{
		...base,
		signalsSubtotal: base.signalsSubtotal ?? base.total,
		favoriteBonus,
		gameBoost,
		total: Math.min(scoreMaxTotal, base.total + favoriteBonus) + gameBoost,
	},
	{ allowTotalOverflow: true },
);
```

`allowTotalOverflow` matters here. A manual `gameBoost` is meant to push a game past 100 on purpose. Without that option, `normalizePowerScoreResult` clamps `total` back down to `scoreMaxTotal`.

ArenaSwap's own [background script](https://github.com/hiteacheryouare/arenaswap/blob/mega/apps/extension/entrypoints/background.ts) stacks `favoriteBonus`, `gameBoost`, `computeScoringOpportunityBoost`, and `postseasonBoost` the same way, before handing scores to the tab switcher.
