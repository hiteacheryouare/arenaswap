<div align="center">

# `powerscore`

**PowerScore** turns a live game into one number from 0 to 100: how worth watching it is right now. Give it the score, the clock and whatever else your feed knows. It gives back a score and the reasons for it.

![npm](https://img.shields.io/npm/v/powerscore?color=CB3837&logo=npm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-30-C21325?logo=jest&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)

</div>

---

3.0 adds **modes**. The same game can be scored as *Classic* (is it close and tense?), *Blowouts* (is somebody getting run off the field?) or *Fantasy* (are my players about to do something?). It also adds **moment boosts**: a runner on third in the 9th, a two-minute drill, a red card, a pulled goalie, a no-hitter still going. Everything runs locally, with no dependencies and no network calls.

- Website: https://hiteacheryouare.github.io/arenaswap/powerscore/
- npm: https://www.npmjs.com/package/powerscore
- Source: https://github.com/hiteacheryouare/arenaswap

---

## Installation

```bash
npm install powerscore
```

---

## Quick start

```ts
import { scoreGame } from 'powerscore';

const score = scoreGame({
	id: 'game-1',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	homeTeam: { score: 98 },
	awayTeam: { score: 96 },
	period: 4,
	clockSeconds: 74,
});

score.total;  // 0–100
score.reason; // "under 2 min left, 2-point game"
```

`scoreGame(game, context, options)` takes three things:

| Argument | What it is |
|---|---|
| `game` | The state of the game right now. Required: `id`, `league`, `sportType`, both scores. `period` and `clockSeconds` are how it knows how late it is. |
| `context` | Everything the game itself doesn't carry: history, win probability, the pregame line, rosters. All optional. |
| `options` | How to score: which mode, switched-off signals, favorite and postseason boosts, config overrides. All optional. |

That minimum gets you the two score-and-clock signals (Closeness and Late-Game Pressure). Status `'in'` is what the boosts check before they pay anything. Each optional field below switches more on. Leave one out and the part that needs it scores 0. Nothing throws.

| Give it | In | And these switch on |
|---|---|---|
| Score snapshots, oldest first | `context.history` | Momentum, Lead Changes, Comeback Factor. Needs at least 3 snapshots. |
| Win probability, 0–1 per poll | `context.winProbability` | The ±5 win probability modifier. Needs at least 5 values. |
| Consecutive polls with a frozen clock | `context.stallCount` | The stall deduction. |
| `possession`, `yardsToEndZone`, `down`, `distance`, and `timeouts` on the team | `game`, `game.homeTeam` | The two-minute drill, the red zone boost, and Fantasy's football situation. |
| `baseRunners`, `outs`, `topOfInning` | `game` | Runners on base, go-ahead run on base. |
| `hits` on each team | `game.homeTeam`, `game.awayTeam` | The no-hitter. |
| `series`, `rank` on each team | `game`, `game.homeTeam` | Stakes: a series on the brink, two ranked teams. |
| `context.stakes` | `context` | Stakes: a late-season race (clinch, elimination, a table line). |
| `pregameLine` | `context` | Upset watch. Use the line from *before* the game. A live line moves with the score and would erase the upset. |
| `redCards` | `game` | The red card boost (soccer). |
| `powerPlay`, `emptyNet` | `context` | The power play and empty net boosts (hockey). |
| `fantasy` | `context` | The Fantasy mode. |

Here is a fuller call: a football game in the final two minutes, trailing team with the ball.

```ts
const score = scoreGame(
	{
		id: 'game-2',
		league: 'nfl',
		sportType: 'football',
		status: 'in',
		homeTeam: { score: 20, timeouts: 2 },
		awayTeam: { score: 17, timeouts: 1 },
		period: 4,
		clockSeconds: 95,
		possession: 'away',
		yardsToEndZone: 41,
		down: 2,
		distance: 7,
	},
	{ history, winProbability },
);

score.boosts.find(boost => boost.id === 'twoMinuteDrill');
// { id: 'twoMinuteDrill', points: 6, meta: { secondsLeft: 95, trailBy: 3 } }

score.reason; // "under 2 min left, 3-point game, two-minute drill (+6)"
```

---

## Use it with any data source

`Game` is generic over the league id. Your feed's own ids work as they are. A league the built-in table doesn't know is scored with its sport's defaults (the NBA's for basketball, the NHL's for hockey, MLB, the NFL, NCAA softball, MLS), so the right number of periods and the right clock length come for free.

If the defaults are wrong for your league, override them per call with `options.league` (period count, period length) or `options.sport` (margins, momentum thresholds, half-lives).

A Tuesday-night beer league hockey feed: three 15-minute periods, no stats beyond the score.

```ts
import { scoreGame, type Game } from 'powerscore';

interface BeerLeagueRow {
	rink: string;
	home: number;
	away: number;
	frame: number;
	minutesLeft: number;
}

const fromRink = (row: BeerLeagueRow): Game<string> => ({
	id: row.rink,
	league: 'tuesday-d-league',
	sportType: 'hockey',
	status: 'in',
	homeTeam: { score: row.home },
	awayTeam: { score: row.away },
	period: row.frame,
	clockSeconds: row.minutesLeft * 60,
});

const score = scoreGame(fromRink(row), {}, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

`sportType` is the one thing you have to get right: `'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer'`.

The 31 built-in league ids (`allLeagueIds`) still work and carry their own tuning. See [Supported leagues](#supported-leagues).

---

## Modes

A mode answers one question about a game. Pick it with `options.mode`.

```ts
scoreGame(game, context, { mode: 'blowouts' });
```

| Mode | The question | Signals (ceiling) | Boosts it keeps |
|---|---|---|---|
| `'classic'` (default) | Is it close, late and swinging? | Closeness 42, Late-Game Pressure 38, Momentum 38, Lead Changes 18, Comeback Factor 20 | All of them (below), plus the stall deduction and the win probability modifier |
| `'blowouts'` | Is somebody running away with it? | Blowout Margin 50, Sustained 30, Timing 25, Pile-On 15 | No-hitter, Upset Rout. Keeps the stall deduction. |
| `'fantasy'` | Is something about to happen to my players? | Situation 50, Production 35, Exposure 15 | None. No stall deduction. |

The signal ids, as they appear in `score.signals`: `closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`; `blowoutMargin`, `sustained`, `timing`, `pileOn`; `situation`, `production`, `exposure`.

Switch signals off with `options.disabledSignals`. The rest are rescaled to the mode's full range. Switch them all off and none of them are.

### Classic

The 2.x model, with the moment boosts added. Its signals are described under [Classic signal details](#classic-signal-details).

### Blowouts

Closeness turned inside out. Nothing until the game is two scores apart (the sport's second closeness margin), then climbing to full credit at a rout.

| Signal | Ceiling | What it measures |
|---|---|---|
| Blowout Margin | 50 | The margin, scaled up as the game goes on. Full credit at 30 points in basketball, 28 in football, 5 goals in hockey and soccer, 10 runs in baseball. |
| Sustained | 30 | How much of the history window the current leader has been more than two scores up. Needs 3 snapshots. |
| Timing | 25 | An early rout has more beatdown left to watch than one that is nearly over. |
| Pile-On | 15 | The leader is still extending: scoring runs counted in the leader's direction only. |

Blowouts is blended with Classic as a **floor**: `total = max(blowouts, 0.3 × classic)`. A close game keeps 30% of its Classic score, so a night with no beatdown still has something to switch to. Any real beatdown outranks the best of them.

### Fantasy

Scores what your players are doing. It reads `context.fantasy`, one entry per rostered player.

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

| Signal | Ceiling | What it measures |
|---|---|---|
| Situation | 50 | Where your players are in the game. Football: who has the ball, red zone, goal line, your kicker in range, your defense on the field. Baseball: at bat, on deck, pitching with runners on. Basketball and hockey: how close and late the game is. The best player counts in full, everyone else at a quarter. |
| Production | 35 | Fantasy points scored lately, fading like a lead change. Negative plays don't count. |
| Exposure | 15 | How many of your players are in the game: 5 each, up to 15. |

Fantasy is blended with Classic as a **mix**: `total = 0.6 × fantasy + 0.4 × classic`, so a dead game with your player in it doesn't beat a classic without one. Change the weight with `options.classicBlend`:

```ts
scoreGame(game, context, {
	mode: 'fantasy',
	classicBlend: { kind: 'mix', weight: 0.8 },
});
```

A game with no active player in it (nobody in `context.fantasy`, or all marked `active: false`) has nothing for Fantasy to say. It is scored as Classic, and `score.modeId` says `'classic'` so you can tell. `options.classicDisabledSignals` is Classic's own switch list for that case, and for the blend.

### Classic boosts

Boosts are the smaller, moment-shaped inputs. They pay nothing while the game isn't live (`status: 'in'`) or play is frozen.

| Boost | Id | Pays for | Max |
|---|---|---|---|
| Scoring opportunity | `scoringOpportunity` | Runners on base; a football drive inside the red zone, weighted by down. | 15 |
| Go-ahead run | `goAheadRun` | Baseball and softball. The batting team has the go-ahead run on base, or failing that the tying run. Stronger late, and strongest when it's the last chance. Pays nothing at 3 outs. | 10 |
| Two-minute drill | `twoMinuteDrill` | Football. The team with the ball is tied or down one score, inside the last 2 minutes (4 when trailing), weighted by field position and timeouts. | 12 |
| Empty net | `emptyNet` | Hockey. A pulled goalie in the last 4 minutes of the 3rd of a one- or two-goal game. | 12 |
| Power play | `powerPlay` | Hockey. A man advantage in a tied or one- or two-goal game. | 10 |
| Red card | `redCard` | Soccer. A red card in a tied or one-goal game, fading over the next 10 game minutes. | 15 |
| No-hitter | `noHitter` | Baseball and softball. One team has no hits, from the 6th inning (the 4th in softball), growing with each hitless inning. | 70 |
| Upset watch | `upsetWatch` | The pregame underdog leading, level or within one score, past halfway. Bigger the longer the odds. | 12 |
| Stakes | `stakes` | A playoff series on the brink, two ranked teams, a late-season race. Halved when the game isn't close. | 10 |

Boosts share caps. All of the moment boosts together can add at most **20**. The no-hitter has its own cap of **70**, because a bid lasts innings and has to lift a 6-0 game past tied ones. Upset watch and stakes together add at most **16**, so context never outranks live action.

Blowouts' Upset Rout is the underdog running the favorite off the field. It pays whenever the pregame underdog leads by more than the sport's blowout margin (its third closeness margin: 18 points in basketball, 14 in football, 3 goals, 5 runs).

---

## Build your own mode

`defineMode` checks a mode once, up front: no duplicate signal ids, positive ceilings, at least one signal.

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

A signal's `compute` gets the game, the context, the resolved sport and league config, the game's `progress` (0 at the start, 1 at the end of regulation and through overtime) and the `margin`. It returns `points` (clamped to the ceiling) and an optional `reason`.

A mode can also carry `boosts`, `bucketCaps`, a `classicBlend` (`{ kind: 'floor', factor }` or `{ kind: 'mix', weight }`) and an `appliesTo(game, context)` that sends games it has nothing to say about to Classic.

Reason keys the built-in modes know render as English in `score.reason`. A key of your own renders as itself, so translate from `score.reasons` rather than from the string.

---

## The result

`scoreGame` returns a `PowerScore`.

```ts
interface PowerScore {
	gameId: string;
	modeId: string;                 // the mode that actually scored it
	total: number;                  // 0–100, above 100 only through gameBoost
	signals: ScoredSignal[];        // { id, points, ceiling, disabled }
	signalsSubtotal: number;        // enabled signals, before rescaling
	scaledSubtotal: number;         // after rescaling for disabled signals
	signalCeiling: number;
	frozen: boolean;                // halftime, intermission or delay
	stalled: boolean;
	stallPenalty: number;           // points removed, always ≥ 0
	winProbabilityVariance?: number; // −5 to +5, absent without enough history
	baseTotal: number;              // signals less stall plus variance, before any boost
	classicTotal?: number;          // Classic's own total, when the mode blends with it
	boosts: ScoredBoost[];          // { id, points, meta? }
	reasons: ReasonFragment[];      // { key, params? }, ready to translate
	reason: string;                 // the same, in English
}
```

- **`signals` and `boosts` are lists.** Every signal the mode defines is there, with its ceiling, even at 0. So is every boost the mode pays, at 0 when it isn't paying. Boost ids are listed above, plus `favoriteBoost`, `postseasonBoost` and `gameBoost` when you asked for them. Look one up with `signalPoints(score, 'momentum')` or `boostPoints(score, 'noHitter')`.
- **`reasons` are structured** (`{ key: 'outscoring', params: { team: 'BOS', ... } }`) so a UI can translate them. `reason` is the same list in English, joined with commas, for when you don't have translations. It's display text, not an API. Don't match on it.
- **`frozen`** is true at halftime, in an intermission or in a delay. Everything scores 0 until play resumes, and `reason` is empty.
- **`stalled`** is true when a stall deduction applied. `stallPenalty` is how many points it took. 8 consecutive frozen polls cost 15, 15 cost 25.
- **`meta`** on a boost carries what a UI might want to say, such as `{ inning: 8 }` on a no-hitter.

### How the total is built

The order is fixed:

1. Signals score. Disabled ones are rescaled out.
2. The stall deduction comes off.
3. The win probability modifier is added (Classic only). The result is clamped to 0–100.
4. The mode's own boosts are added, within their caps, and the total is capped at 100.
5. If the mode blends with Classic (floor or mix), that happens here.
6. The favorite and postseason boosts are added. Capped at 100 again.
7. `gameBoost`, a manual per-game boost, is added last. **It is the only thing allowed past 100.**

The options that feed steps 6 and 7:

| Option | What it does |
|---|---|
| `favoriteTeamCount` and `favoriteBoostPoints` | Points per favorite team in the game. |
| `postseasonBoostPoints` and `game.postseasonRound` | Points for a title-deciding round (`0`), and a share for earlier ones: `1` semifinal 75%, `2` quarterfinal 50%, `3` anything earlier 25%. |
| `gameBoost` | A flat manual boost. |

---

## Fantasy scoring helpers

Fantasy's Production signal wants fantasy points. These turn a box-score line into them. You name the stats, they score them.

```ts
import { computeFantasyPoints } from 'powerscore';

computeFantasyPoints('football', {
	passingYards: 310,
	passingTouchdowns: 3,
	interceptionsThrown: 1,
	rushingYards: 22,
}); // 12.4 + 12 - 2 + 2.2 = 24.6
```

- **`computeFantasyPoints(sport, stats, overrides?)`** returns the total, rounded to two decimals. Unknown stats are ignored. A defense's `pointsAllowed` is scored by tier.
- **`defaultFantasyScoring`** holds the default rules for `'football'` (full PPR), `'basketball'`, `'baseball'` and `'hockey'`. Each rule is `{ points, min, max }`, so a settings screen can enforce the bounds.
- **`resolveFantasyScoring(sport, overrides?)`** returns the rules as plain numbers. Overrides are clamped to each rule's bounds, and rules that don't exist are ignored.
- **`fantasySportOf(sportType)`** maps a `sportType` to one of those four (softball counts as baseball, soccer has none).

```ts
import { defaultFantasyScoring, resolveFantasyScoring } from 'powerscore';

defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5 (half PPR)
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

---

## Supported leagues

| Sport | Leagues |
|---|---|
| 🏀 Basketball | NBA, WNBA, NCAA Men's, NCAA Women's, Olympic Men's, Olympic Women's |
| 🏈 Football | NFL, NCAA Football, UFL |
| 🏒 Hockey | NHL, NCAA Men's Hockey, Olympic Men's, Olympic Women's |
| ⚾ Baseball | MLB, NCAA Baseball, Olympic Men's Baseball, World Baseball Classic |
| 🥎 Softball | NCAA Softball |
| ⚽ Soccer | MLS, Premier League, La Liga, Bundesliga, Serie A, Liga MX, NWSL, Champions League, Europa League, FIFA World Cup, FIFA Women's World Cup, Olympic Men's, Olympic Women's |

31 leagues in all. Each one maps to one of six sport-type configurations that tune the closeness margins, momentum thresholds, decay half-lives and late-game curves to feel natural for that sport. `allLeagueIds` and `leagueConfigMap` are exported if you need the full list at runtime. Anything else is scored with its sport's defaults. See [Use it with any data source](#use-it-with-any-data-source).

---

## Classic signal details

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

### Stall detection

When a game's clock stops moving, a **flat point deduction** comes off the signals subtotal so ArenaSwap doesn't switch to a game stuck in a commercial break or a timeout:

- **≥8 consecutive frozen polls** → −15 points
- **≥15 consecutive frozen polls** → −25 points

```ts
// stall deduction steps (exported from constants.ts), highest threshold first
stallPenaltySteps // [{ minPolls: 15, deduction: 25 }, { minPolls: 8, deduction: 15 }]
```

It is a deduction, not a multiplier: a game whose signals total 79 with a deep stall lands at 54, not at 55. ArenaSwap polls on a dynamic interval — 12–25 seconds while games are live, 40 during an intermission — so 8 frozen polls is about 1.5 to 3.5 minutes of dead air, and 15 polls about 3 to 6 minutes.

The deduction applies to the five signals only. `winProbabilityVariance` sits on top of the stalled subtotal and is not reduced by it. `signalsSubtotal` holds the pre-deduction subtotal, so a breakdown can show what the stall cost.

---

---

## The 2.x API

Still exported, still working, marked deprecated. `computePowerScore(game, history, stallCount, winProbabilityHistory)` returns the flat `PowerScoreResult` (`closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`, `total`, `reason` and friends) it always did. It is `scoreGame` in Classic with the signals only, then flattened. `normalizePowerScoreResult`, `computeScoringOpportunityBoost`, `computeWinProbVarianceScore`, `computeGameProgress` and `isPlayFrozen` are unchanged.

```ts
import { computePowerScore } from 'powerscore';

const result = computePowerScore(game, history, stallCount, winProbabilityHistory);
result.total; // 0–100, the same number 2.x gave you
```

---

## Migrating from 2.x

Nothing breaks. Upgrade, run your tests, and move to `scoreGame` when you want modes or the new boosts.

- **`computePowerScore` and its friends still work.** They are deprecated, not removed. `PowerScoreResult` is unchanged, and `computePowerScore` keeps 2.x's boost-free behavior: it returns the same totals it did.
- **`Game` gained optional fields and a type parameter.** `Game<League extends string = LeagueId>`, so a bare `Game` means what it meant. New fields: `possession`, `yardsToEndZone`, `outs`, `series`, `redCards`, `seasonType`, `postseasonRound`, plus `rank`, `hits`, `errors` and `timeouts` on each team.
- **Unknown leagues now fall back by sport, not to the NBA.** A league id the table doesn't know used to be scored with the NBA's configuration whatever the sport. Now a hockey game in an unknown league gets the NHL's periods and clock, and so on. If you relied on the old fallback for a non-basketball sport, scores will move, and for the better.
- **`ScorerTunables.reasons` gained optional fields** (`comebackBig`, `comebackModerate`, `boosts`, and the Blowouts reason strings). They're optional, so a 2.x tunables object still type-checks and the built-in English fills the gaps.
- **Classic through `scoreGame` includes the new boosts.** The same game can score higher there than in `computePowerScore`, by up to the boost caps. If you want the 2.x number from `scoreGame`, pass a Classic mode with `boosts: []`.

```ts
import { classicMode, scoreGame } from 'powerscore';

scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

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

**Everything else worth knowing.** Signal ceilings were raised across the board except lead changes (30→42 closeness, 28→38 late-game, 28→38 momentum, 14→20 comeback), so any threshold you calibrated against 1.x totals needs revisiting. `Game.period`, `Game.clockSeconds` and both `abbreviation` fields are now optional, and a missing clock is treated as unknown rather than 0:00. `SportType` gained `'softball'` and `LeagueId` went from 12 leagues to 31. `computePowerScore` takes a fourth `winProbabilityHistory` parameter, and `PowerScoreResult` gained `winProbabilityVariance`, `stallPenalty`, `scoringOpportunityBoost` and `postseasonBoost`. `signalsSubtotal` is now set by `computePowerScore` itself, holding the pre-stall signals subtotal.

Reason strings changed wording throughout. They are display text, not an API — match on them at your own risk.

---

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
