---
title: Sport and league configuration
description: Every field on SportTypeConfig and LeagueConfig, their defaults across all six sports and 31 leagues, and how a sport's idea of "close" is set.
section: powerscore
order: 5
navLabel: Configuration
---

`scoreGame` looks up two exported maps at the top of every call. `sportTypeConfigMap`, keyed by `SportType`, holds how a sport plays. `leagueConfigMap`, keyed by `LeagueId`, holds how long a league's periods run. If the built-in values don't fit your data, you can override either one per call through `options.sport` and `options.league`. [Tune it for your own league](#tune-it-for-a-league-powerscore-doesnt-ship) shows how.

## SportTypeConfig

One entry per `SportType`, exported as `sportTypeConfigs` (an array) and `sportTypeConfigMap` (keyed by `id`). Field meanings are in [PowerScore's TypeScript types](/arenaswap/docs/powerscore/types/#sporttypeconfig-and-leagueconfig). This table holds the six sports' actual values. Classic reads all of it. Blowouts reads `closenessMargins`, `momentumBigRun` and `momentumSmallRun`, the momentum half-life, and `historyWindowMs`.

| Field | basketball | football | hockey | soccer | baseball | softball |
|---|---|---|---|
| `clockBased` | true | true | true | true | false | false |
| `closenessMargins` (t1, t2, t3) | 5, 10, 18 | 3, 9, 14 | 1, 2, 3 | 1, 2, 3 | 1, 3, 5 | 1, 3, 5 |
| `momentumBigRun` / `momentumSmallRun` | 8 / 4 | 10 / 4 | 2 / 1 | 2 / 1 | 3 / 1 | 3 / 1 |
| `comebackThresholdBig` / `comebackThresholdSmall` | 6 / 3 | 7 / 3 | 2 / 1 | 2 / 1 | 2 / 1 | 2 / 1 |
| `clockCountsUp` | false | false | false | true | false | false |
| `clockIsFullGameElapsed` | false | false | false | true | false | false |
| `zeroZeroAsFullTie` | false | false | true | true | false | false |
| `zeroZeroPenaltyPeriods` | none | none | 1, 2 | 1 | none | none |
| `otPreBoostWindowSecs` | 60 | 60 | 60 | 60 | 0 | 0 |
| `decayHalfLifeMs.momentum` | 45,000 | 135,000 | 180,000 | 240,000 | 150,000 | 150,000 |
| `decayHalfLifeMs.leadChange` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `decayHalfLifeMs.comeback` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `historyWindowMs` | 300,000 (5 min) | 720,000 (12 min) | 960,000 (16 min) | 1,200,000 (20 min) | 720,000 (12 min) | 720,000 (12 min) |
| `lateGameCurve` | none | none | none | none | 9 innings, starts at 6 | 7 innings, starts at 5 |

`historyWindowMs` is the span of score history each sport needs to hold onto for momentum, lead changes, and comeback to work. Blowouts' Sustained signal is measured over the same window. It is at least four times the sport's longest half-life. That margin lets a signal fully decay before it falls out of the window, no matter how often a caller polls.

## LeagueConfig

One entry per `LeagueId`, exported as `leagueConfigs` (an array) and `leagueConfigMap` (keyed by `id`), plus `allLeagueIds` for the bare list. `periodFormat` is display text only, and doesn't affect scoring. Each entry also carries a few fields ArenaSwap uses for its own fetching and for how long a game occupies a schedule bar. The scorer doesn't read them, so they're not tabulated here.

| League | Sport | Periods | Period length |
|---|---|---|---|
| NBA (`nba`) | basketball | 4 | 720s |
| WNBA (`wnba`) | basketball | 4 | 600s |
| NCAA Basketball (`ncaab`) | basketball | 2 | 1200s |
| NCAA Women's Basketball (`ncaaw`) | basketball | 4 | 600s |
| Olympic Men's Basketball (`olybkm`) | basketball | 4 | 600s |
| Olympic Women's Basketball (`olybkw`) | basketball | 4 | 600s |
| NFL (`nfl`) | football | 4 | 900s |
| NCAA Football (`ncaaf`) | football | 4 | 900s |
| UFL (`ufl`) | football | 4 | 900s |
| NHL (`nhl`) | hockey | 3 | 1200s |
| NCAA Men's Hockey (`ncaamh`) | hockey | 3 | 1200s |
| Olympic Men's Ice Hockey (`olymih`) | hockey | 3 | 1200s |
| Olympic Women's Ice Hockey (`olywih`) | hockey | 3 | 1200s |
| MLB (`mlb`) | baseball | 9 innings | 0 |
| NCAA Baseball (`cbase`) | baseball | 9 innings | 0 |
| Olympic Men's Baseball (`olybb`) | baseball | 9 innings | 0 |
| World Baseball Classic (`wbbc`) | baseball | 9 innings | 0 |
| NCAA Softball (`csoft`) | softball | 7 innings | 0 |
| MLS (`mls`) | soccer | 2 | 2700s |
| English Premier League (`epl`) | soccer | 2 | 2700s |
| La Liga (`laliga`) | soccer | 2 | 2700s |
| Bundesliga (`bundesliga`) | soccer | 2 | 2700s |
| Serie A (`seriea`) | soccer | 2 | 2700s |
| Liga MX (`ligamx`) | soccer | 2 | 2700s |
| UEFA Champions League (`ucl`) | soccer | 2 | 2700s |
| UEFA Europa League (`uel`) | soccer | 2 | 2700s |
| NWSL (`nwsl`) | soccer | 2 | 2700s |
| FIFA World Cup (`fifawc`) | soccer | 2 | 2700s |
| FIFA Women's World Cup (`fifawwc`) | soccer | 2 | 2700s |
| Olympic Men's Soccer (`olysocm`) | soccer | 2 | 2700s |
| Olympic Women's Soccer (`olysocw`) | soccer | 2 | 2700s |

31 leagues in all, matching `LeagueId`'s 31 members.

## How a sport's idea of "close" is set

One tuple, `closenessMargins: [t1, t2, t3]`, decides several things for a sport. It picks which closeness tier a margin lands in: tight at `t1`, close at `t2`, fringe at `t3`, out of reach beyond it. It also picks the ceiling late-game pressure ramps toward, the band the football red zone boost pays out at, where Blowouts starts paying (two scores apart, past `t2`), and how much weight stakes gets.

Basketball's `[5, 10, 18]` means a 2-point game is tight and a 9-point game is close. An 18-point game is the last one that still counts as fringe. Hockey and soccer's `[1, 2, 3]` treats a 2-goal game the way basketball treats a 9-point one. Changing what "close" means for a sport is changing one tuple, not a handful of separate thresholds.

## Tune it for a league PowerScore doesn't ship

`Game` is generic over the league id, so a feed with its own ids works as it is: `Game<string>`. A league the table doesn't know is scored with its sport's defaults. Each sport maps to its best-known league for period count and clock:

| Sport | Defaults to |
|---|---|
| Basketball | NBA |
| Hockey | NHL |
| Baseball | MLB |
| Football | NFL |
| Softball | NCAA Softball |
| Soccer | MLS |

`sportType` is the one thing you have to get right. It governs most of what a signal does, whatever the `league` is. An unrecognized `sportType` falls back separately, to basketball's signal tuning. Both fallbacks mean the game still scores instead of throwing.

If the defaults are wrong for your league, override them per call:

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

`options.league` takes any part of a `LeagueConfig`, usually the period count and length. `options.sport` takes any part of a `SportTypeConfig`, such as the closeness margins, momentum thresholds, or half-lives. Overrides apply to that call only, and the exported maps stay as they were.

`sportTypeConfigMap` and `leagueConfigMap` are plain exported objects, read on every call rather than from a cached copy. Mutating them at runtime does change scoring behavior, but nothing in the package's types or exports treats that as a supported extension point, and a future version is not obligated to keep it working. Use the options.
