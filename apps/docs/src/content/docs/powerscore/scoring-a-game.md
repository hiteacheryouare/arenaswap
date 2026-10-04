---
title: Score a game from live data
description: Map your own feed onto a Game object, keep a score history across polls, switch on the boosts and modes your data supports, and add favorite and manual boosts.
section: powerscore
order: 2
navLabel: Score from live data
faq:
  - q: Does scoreGame check whether a game is actually live?
    a: Only the boosts do. They pay nothing unless the game's status is 'in'. The signals still score a game that hasn't started or has ended, and a game in an intermission or delay scores 0. Filter to live games yourself first, the same way ArenaSwap does before it ever calls the scorer.
  - q: Can I use PowerScore with leagues it doesn't list?
    a: Yes. Game is generic over the league id, and an id the built-in table doesn't know is scored with its sport's defaults. Override the period count and length per call with options.league if the defaults are wrong.
---

`scoreGame` doesn't fetch anything. It scores whatever `Game` object and context you hand it. This page builds both from a made-up feed, then switches on more of the engine as your data allows.

## Map your feed onto a Game

Only `id`, `league`, `sportType`, and the two team scores are required. Everything else narrows the score when your feed has it, and counts as unknown when it doesn't. Map what you have, and skip the rest.

```ts
import { scoreGame } from 'powerscore';
import type { Game } from 'powerscore';

// Whatever your feed sends. This one is invented.
interface FeedEvent {
	id: string;
	state: 'scheduled' | 'live' | 'final';
	period: number;
	clock: string; // '0:45'
	halftime: boolean;
	home: { name: string; points: number };
	away: { name: string; points: number };
}

const toGame = (event: FeedEvent): Game => ({
	id: event.id,
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { score: event.home.points, abbreviation: event.home.name },
	awayTeam: { score: event.away.points, abbreviation: event.away.name },
	period: event.period,
	clockSeconds: parseClock(event.clock), // '0:45' -> 45
	status: event.state === 'live' ? 'in' : event.state === 'final' ? 'post' : 'pre',
	intermission: event.halftime,
});

const score = scoreGame(toGame(event));
```

Set `status` honestly. `'in'` is what the boosts check before they pay anything. An `intermission` or `delayed` flag makes the whole score 0 until play resumes, so a game in a commercial break or a rain delay can't out-score one being played.

## Give it more, and more switches on

Each optional field turns on the part of the engine that needs it. Leave one out and that part scores 0. Nothing throws.

| Give it | In | And these switch on |
|---|---|---|
| Score snapshots, oldest first | `context.history` | Momentum, Lead Changes, Comeback Factor. Needs at least 3 snapshots. |
| Win probability, 0 to 1 per poll | `context.winProbability` | The ±5 win probability modifier. Needs at least 5 values. |
| Consecutive polls with a frozen clock | `context.stallCount` | The stall deduction. |
| `possession`, `yardsToEndZone`, `down`, `distance`, and `timeouts` on the team | `game`, `game.homeTeam` | The two-minute drill, the red zone boost, and Fantasy's football situation. |
| `baseRunners`, `outs`, `topOfInning` | `game` | Runners on base and the go-ahead run. |
| `hits` on each team | `game.homeTeam`, `game.awayTeam` | The no-hitter. |
| `series`, and `rank` on each team | `game`, `game.homeTeam` | Stakes: a series on the brink, two ranked teams. |
| `context.stakes` | `context` | Stakes: a late-season race. |
| `pregameLine` | `context` | Upset watch. Use the line from before the game. |
| `redCards` | `game` | The red card boost, soccer. |
| `powerPlay`, `emptyNet` | `context` | The power play and empty net boosts, hockey. |
| `fantasy` | `context` | The Fantasy mode. |

The fields are all on [the types page](/arenaswap/docs/powerscore/types/#game), and what each boost pays is in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Keep a score history for momentum, lead changes, and comeback

Those three signals read from `context.history`, a list of a game's past scores, and stay at 0 until it has at least three snapshots. Keep one on every poll, in order, oldest first, with a timestamp in milliseconds. The timestamps only need to be relative to each other. They don't have to be wall-clock time.

```ts
import { scoreGame } from 'powerscore';
import type { Game, ScoreSnapshot } from 'powerscore';

const game: Game = {
	id: 'g-401',
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

const score = scoreGame(game, { history });
```

Boston just took the lead on the back of a 13-2 run:

```ts
score.total;  // 70
score.reason; // 'BOS outscoring LAL 13-2, just took the lead'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 0
```

Trim snapshots older than the sport's `historyWindowMs` so the array doesn't grow forever. That window, and the rest of the sport-specific tuning, is in [Sport and league configuration](/arenaswap/docs/powerscore/configuration/).

## Track stalls and win probability, if you have them

Both go in the context. `stallCount` is however many consecutive polls the clock hasn't moved, which you track yourself by comparing `clockSeconds` between polls:

```ts
const stallCount = game.clockSeconds === previousClockSeconds ? previousStallCount + 1 : 0;
const score = scoreGame(game, { history, stallCount, winProbability });
```

`winProbability` is a list of recent win-probability values from 0 to 1, for either team. Only the distance from 50% matters. Both are optional, and PowerScore scores fine without them. What each one changes is in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Let the boosts see the moment

Baseball, football, hockey, and soccer each carry a situation the score alone doesn't show. Add the fields your feed has, and `scoreGame` pays for them. Here's a baseball game in the bottom of the 9th, tied, bases loaded, one out:

```ts
const score = scoreGame({
	id: 'g-402',
	league: 'mlb',
	sportType: 'baseball',
	status: 'in',
	homeTeam: { score: 3, hits: 5 },
	awayTeam: { score: 3, hits: 4 },
	period: 9,
	topOfInning: false,
	outs: 1,
	baseRunners: { first: true, second: true, third: true },
});

score.boosts.filter(boost => boost.points > 0);
// [
//   { id: 'scoringOpportunity', points: 10 },
//   { id: 'goAheadRun', points: 10 },
// ]
```

Those two together fill the moments bucket's cap of 20. Football gets the red zone and the two-minute drill from `possession`, `yardsToEndZone`, and `down`. Hockey needs `context.powerPlay` and `context.emptyNet`. Soccer needs `redCards`.

## Score it in a different mode

Pick a mode with `options.mode`. Blowouts needs nothing extra. Fantasy needs your roster in the context, one entry per player:

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

`pointEvents` is how Production sees a player scoring fantasy points a minute ago. To turn a box-score line into those points, use [`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints). A game with none of your players in it is scored as Classic, and `score.modeId` says so.

## Add favorite, postseason, and manual boosts

Score the game first, and let options add the things PowerScore doesn't know about, like a viewer's favorite team. The same options work in every mode.

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 90
```

The favorite and postseason boosts are added to the total and capped at 100. `gameBoost` is added after that, and it is the only thing allowed past 100, so a game a viewer pins can beat a perfect score. A frozen game skips them all: a stopped game can't out-score one being played.

ArenaSwap's own [scoring code](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts) builds its options the same way before handing scores to the tab switcher.

## The 2.x way

`computePowerScore(game, history, stallCount, winProbabilityHistory)` still works and returns the flat 2.x result, with no moment boosts. It's the right call if you only want the number you always got. [The API reference](/arenaswap/docs/powerscore/api-reference/#the-2x-api) lists everything that's still there.
