---
title: Sport and league configuration
description: Every field on SportTypeConfig and LeagueConfig, their defaults across all six sports and 31 leagues, and how a sport's idea of "close" is set.
section: powerscore
order: 5
navLabel: Configuration
---

`computePowerScore` doesn't take a config argument. It looks up two exported maps at the top of every call. `sportTypeConfigMap`, keyed by `SportType`, holds how a sport plays. `leagueConfigMap`, keyed by `LeagueId`, holds how long a league's periods run.

## SportTypeConfig

One entry per `SportType`, exported as `sportTypeConfigs` (an array) and `sportTypeConfigMap` (keyed by `id`). Field meanings are in [PowerScore's TypeScript types](/arenaswap/docs/powerscore/types/#sporttypeconfig). This table holds the six sports' actual values.

| Field | basketball | football | hockey | soccer | baseball | softball |
|---|---|---|---|---|---|---|
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

`historyWindowMs` is the span of score history each sport needs to hold onto for momentum, lead changes, and comeback to work. It is at least four times the sport's longest half-life. That margin lets a signal fully decay before it falls out of the window, no matter how often a caller polls.

## LeagueConfig

One entry per `LeagueId`, exported as `leagueConfigs` (an array) and `leagueConfigMap` (keyed by `id`), plus `allLeagueIds` for the bare list. `espnPath` is the path segment ArenaSwap appends to ESPN's scoreboard base URL. `periodFormat` is display text only, and doesn't affect scoring.

| League | Sport | `espnPath` | Periods | Period length |
|---|---|---|---|---|
| NBA (`nba`) | basketball | `basketball/nba` | 4 | 720s |
| WNBA (`wnba`) | basketball | `basketball/wnba` | 4 | 600s |
| NCAA Basketball (`ncaab`) | basketball | `basketball/mens-college-basketball` | 2 | 1200s |
| NCAA Women's Basketball (`ncaaw`) | basketball | `basketball/womens-college-basketball` | 4 | 600s |
| Olympic Men's Basketball (`olybkm`) | basketball | `basketball/mens-olympics-basketball` | 4 | 600s |
| Olympic Women's Basketball (`olybkw`) | basketball | `basketball/womens-olympics-basketball` | 4 | 600s |
| NFL (`nfl`) | football | `football/nfl` | 4 | 900s |
| NCAA Football (`ncaaf`) | football | `football/college-football` | 4 | 900s |
| UFL (`ufl`) | football | `football/ufl` | 4 | 900s |
| NHL (`nhl`) | hockey | `hockey/nhl` | 3 | 1200s |
| NCAA Men's Hockey (`ncaamh`) | hockey | `hockey/mens-college-hockey` | 3 | 1200s |
| Olympic Men's Ice Hockey (`olymih`) | hockey | `hockey/olympics-mens-ice-hockey` | 3 | 1200s |
| Olympic Women's Ice Hockey (`olywih`) | hockey | `hockey/olympics-womens-ice-hockey` | 3 | 1200s |
| MLB (`mlb`) | baseball | `baseball/mlb` | 9 innings | 0 |
| NCAA Baseball (`cbase`) | baseball | `baseball/college-baseball` | 9 innings | 0 |
| Olympic Men's Baseball (`olybb`) | baseball | `baseball/olympics-baseball` | 9 innings | 0 |
| World Baseball Classic (`wbbc`) | baseball | `baseball/world-baseball-classic` | 9 innings | 0 |
| NCAA Softball (`csoft`) | softball | `baseball/college-softball` | 7 innings | 0 |
| MLS (`mls`) | soccer | `soccer/usa.1` | 2 | 2700s |
| English Premier League (`epl`) | soccer | `soccer/eng.1` | 2 | 2700s |
| La Liga (`laliga`) | soccer | `soccer/esp.1` | 2 | 2700s |
| Bundesliga (`bundesliga`) | soccer | `soccer/ger.1` | 2 | 2700s |
| Serie A (`seriea`) | soccer | `soccer/ita.1` | 2 | 2700s |
| Liga MX (`ligamx`) | soccer | `soccer/mex.1` | 2 | 2700s |
| UEFA Champions League (`ucl`) | soccer | `soccer/uefa.champions` | 2 | 2700s |
| UEFA Europa League (`uel`) | soccer | `soccer/uefa.europa` | 2 | 2700s |
| NWSL (`nwsl`) | soccer | `soccer/usa.nwsl` | 2 | 2700s |
| FIFA World Cup (`fifawc`) | soccer | `soccer/fifa.world` | 2 | 2700s |
| FIFA Women's World Cup (`fifawwc`) | soccer | `soccer/fifa.wwc` | 2 | 2700s |
| Olympic Men's Soccer (`olysocm`) | soccer | `soccer/fifa.olympics` | 2 | 2700s |
| Olympic Women's Soccer (`olysocw`) | soccer | `soccer/fifa.w.olympics` | 2 | 2700s |

31 leagues in all, matching `LeagueId`'s 31 members.

## How a sport's idea of "close" is set

One tuple, `closenessMargins: [t1, t2, t3]`, decides three separate things for a sport. It picks which closeness tier a margin lands in: tight at `t1`, close at `t2`, fringe at `t3`, out of reach beyond it. It also picks the ceiling late-game pressure ramps toward, and the band the football red zone boost pays out at.

Basketball's `[5, 10, 18]` means a 2-point game is tight and a 9-point game is close. An 18-point game is the last one that still counts as fringe. Hockey and soccer's `[1, 2, 3]` treats a 2-goal game the way basketball treats a 9-point one. Changing what "close" means for a sport is changing one tuple, not three separate thresholds.

## Adding a league PowerScore doesn't ship

`LeagueId` is a closed union of the 31 ids above. There's no supported way to register a new one, and nothing in the package's public API takes a config override.

A JavaScript caller can pass a `game.league` outside the 31. A TypeScript caller needs a type assertion to do the same. Either way, `leagueConfigMap[game.league]` misses, and `computePowerScore` falls back to the NBA's period count and duration, independent of `sportType`. An unrecognized `sportType` falls back separately, to basketball's signal tuning. Both fallbacks mean the game still scores instead of throwing, just without sport-correct timing, tested directly against a made-up league id.

`sportType` governs most of what a signal does, regardless of `league`. Setting it to one of the six shipped values applies that sport's tuning even to an unrecognized league. Period timing then either falls back to the NBA's shape, or matches whichever shipped `league` has the closest `regularPeriods` and `periodDurationSecs`.

`sportTypeConfigMap` and `leagueConfigMap` are plain exported objects. `computePowerScore` reads them directly on every call, rather than from a cached copy taken at import time. Mutating them at runtime does change scoring behavior. Nothing in the package's types or exports treats that as a supported extension point. A future version is not obligated to keep it working.
