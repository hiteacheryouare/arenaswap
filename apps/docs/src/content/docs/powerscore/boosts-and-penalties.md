---
title: PowerScore boosts and penalties
navLabel: Boosts and penalties
description: Every boost and penalty PowerScore 3 applies on top of a mode's signals, with the condition that triggers each one, its maximum, and the caps they share.
section: powerscore
order: 4
---

Signals measure how a game is going. Boosts and penalties handle the smaller, moment-shaped things the signals can't see: a runner on third in the 9th, a pulled goalie, a pregame underdog still alive. They sit on top of the signals and never replace any of them.

A boost pays nothing while the game isn't live (`status: 'in'`) or while play is frozen at halftime, an intermission, or a delay. Each one is recomputed from the current game state on every call, so there's nothing to clear when the moment passes.

Every boost a mode pays shows up in `score.boosts` as `{ id, points, meta? }`, at `0` when it isn't paying. Look one up with `boostPoints(score, 'noHitter')`.

## Which mode keeps which boosts

| Mode | Boosts |
|---|---|
| Classic | Every boost on this page, plus the win probability modifier and the stall deduction |
| Blowouts | No-hitter and Upset Rout, plus the stall deduction |
| Fantasy | None, and no stall deduction |

The favorite, postseason, and manual boosts at the [bottom of the page](#favorite-postseason-and-manual-boosts) apply in every mode.

## Classic's moment boosts

| Boost | Id | Pays for | Max |
|---|---|---|---|
| [Scoring opportunity](#scoring-opportunity) | `scoringOpportunity` | Runners on base, or a football drive inside the red zone | 15 |
| [Go-ahead run](#go-ahead-run) | `goAheadRun` | The go-ahead or tying run on base in baseball and softball | 10 |
| [Two-minute drill](#two-minute-drill) | `twoMinuteDrill` | A football team with the ball, tied or down one score, in the closing minutes | 12 |
| [Empty net](#empty-net-and-power-play) | `emptyNet` | A pulled goalie in a close hockey game | 12 |
| [Power play](#empty-net-and-power-play) | `powerPlay` | A man advantage in a close hockey game | 10 |
| [Red card](#red-card) | `redCard` | A sending-off in a tied or one-goal soccer match | 15 |
| [No-hitter](#no-hitter) | `noHitter` | A baseball or softball game with a team still hitless | 70 |
| [Upset watch](#upset-watch) | `upsetWatch` | The pregame underdog leading or within a score | 12 |
| [Stakes](#stakes) | `stakes` | A series on the brink, two ranked teams, a late-season race | 10 |

Those maximums are per boost. The next section is why they don't all stack.

## Caps on the buckets

Boosts share caps, so a lot of small things happening at once can't push a game past what a one-score swing in the final minute would earn.

| Bucket | Cap | What's in it | Why |
|---|---|---|---|
| Moments | 20 | Scoring opportunity, go-ahead run, two-minute drill, empty net, power play, red card | A tied game at the buzzer scores about 80 before boosts, so a full moment lifts it to 100. A one-score final minute lands in the high 80s, and not every tight game pins at 100. |
| No-hitter | 70 | No-hitter | A bid lasts innings, not a moment, and it has to lift a 6-0 game past tied ones. |
| Context | 16 | Upset watch, stakes | They can happen together (a ranked underdog), but together they stay below a late one-score swing, so context never outranks live action. |

Inside a bucket, boosts earlier in the table above are paid first, and the cap trims whatever's left over. Upset Rout, Blowouts' version of upset watch, has no bucket.

## Scoring opportunity

A scoring threat the score itself doesn't show yet.

**Baseball and softball**, by runner count:

| Runners on base | Boost |
|---|---|
| None | 0 |
| One | 3 |
| Two | 6 |
| Three (bases loaded) | 10 |

It pays nothing at 3 outs. Runners can linger on a scoreboard for a poll after the last out, and nothing can happen with them.

**Football**, gated on how close the game already is. This only applies when `isRedZone` is true.

| Margin | Base value |
|---|---|
| Within the close band (football: 9 points) | 10 |
| Within the fringe band (14 points) | 5 |
| Beyond that | 0 |

The base value is then weighted by down:

| Situation | Multiplier |
|---|---|
| 4th down and goal-to-go | ×1.5 |
| 4th down (not goal-to-go) | ×1.35 |
| 3rd down, 3 yards or fewer to go | ×1.15 |
| Anything else, including a missing `down` | ×1 |

A base value of `0` stays `0` no matter the down. An unconditional boost on top of a blowout would undo what closeness and late-game pressure already scored correctly low. Goal-to-go only raises the multiplier on 4th down, since on an earlier down it describes the odds of a score rather than what decides possession.

The exported constants behind these tables are `scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers`, and `thirdAndShortDistance`.

## Go-ahead run

Baseball and softball. Needs `baseRunners`, `topOfInning`, `outs`, and `period`. Pays on top of the runner count above, and only when the batting team has the run that matters on base:

| On base | Pays |
|---|---|
| The go-ahead run: tied with anyone on, down one with two on, down two with the bases loaded | 8 |
| The tying run: down one with one on, down two with two on, down three with the bases loaded | 5 |

Only the higher row applies. The base value is then weighted by inning:

- Before the 6th inning (the 5th in softball), half. A threat in the 3rd is real, but the game has plenty of innings to answer it.
- From there to the last regulation inning, 75% rising to 100%.
- Extra innings, 100%.
- ×1.25 when it's the last chance: the home team batting in the final inning or later, where the go-ahead run is the winning run, or a trailing road team in the top of it, which may not bat again.

The maximum is 10: an 8 at full weight, times the last-chance bump. At 3 outs it pays nothing.

## Two-minute drill

Football. Needs `possession`, `yardsToEndZone`, and a live `down`. Pays in the 4th quarter and overtime, and only to the team with the ball, and only when it can still tie or win with one score:

- **Tied:** the last 2 minutes.
- **Trailing by one score** (8 points, or 9 in the UFL, where a try can be worth 3): the last 4 minutes.

A team running out the clock with a lead pays nothing. Neither does an NCAA overtime, which has no game clock.

The 12 points are scaled by four things: how little time is left (full at 40 seconds), field position (full from the opponent's 35, or 30 in college, down to 40% at your own 20), timeouts left (70% with none, 100% with three), and the margin (full when tied or down 1 or 2, shrinking to 70% at 8 down). Between plays, after a score, a feed sends a down that means nothing, and the boost pays 0 until the next snap.

## Empty net and power play

Hockey. Both read `context`, because they come from the situation feed rather than the scoreboard.

**Empty net** pays in the last 4 minutes of the 3rd period when the game is one or two goals apart: **12** at one goal, **7** at two. When the feed says whose net is empty, it only pays for the trailing team's. A leader's empty net means a delayed penalty, and the goalie is back in seconds. Set `context.emptyNet` only once the feed has reported it on two polls in a row, for the same reason.

**Power play** pays in tied and one- or two-goal games. Late (3rd period or later) it pays more:

| Game | Late | Earlier |
|---|---|---|
| Tied | 10 | 4 |
| One goal, the trailing team has the man advantage | 10 | 4 |
| One goal, the leading team has it | 5 | 2 |
| Two goals, the trailing team has it | 5 | 2 |
| Two goals, the leading team has it | 0 | 0 |

When the feed only says that a power play is on, not whose, power play assumes the trailing team is as likely to have it as not and pays a little less: 7 or 3 at one goal, 3 or 2 at two.

## Red card

Soccer. Needs `redCards`, a list of `{ side, minute }`. A red card in a tied or one-goal match is the kind of thing a fan flips over for, and it pays most right after it happens:

| When the card came | Pays |
|---|---|
| Tied, or the carded team leads by one | 10 |
| The carded team trails by one | 7 |
| The carded team leads by two | 5 |
| Anything wider | 0 |

It pays in full for 2 game minutes, then fades to 0 by the 10th. A second card for the same team pays 1.5 times as much, which is the 15 maximum. It's rechecked against the score on every poll, so a goal that opens the game up ends the boost early.

**Ten men.** A red card also bumps [Closeness](/arenaswap/docs/powerscore/signals/#closeness) by 4 points when the team a man down is the one protecting a one-goal lead. They concede far more often than a full side does, so the game is closer than the score says. This stays on for as long as that's the situation, not just for ten minutes.

## No-hitter

Baseball and softball. Needs `hits` on each team. One team with no hits pays for a **no-hit bid**, which starts late and grows with each hitless inning:

- **Starts** after the 5th complete inning of a 9-inning game, and after the 3rd in softball.
- **Climbs** with every complete hitless inning: 10, 22, 38, then 52 and holding. While the pitching staff chasing the bid is on the field, it also adds points out by out, so it keeps growing inside an inning.
- **Weighs down** by 30% while that staff is in the dugout, since nothing is happening to the bid. Softball bids are scaled to 60%.

When both teams are hitless, the bigger bid pays in full and the other at half. The no-hitter has its own cap of 70, outside the moments, because a bid lasts innings and has to lift a 6-0 game past tied ones.

## Upset watch

Any sport. Needs `context.pregameLine`, and it has to be the line from before the game. A live line moves with the score and would erase the very upset you're trying to see.

It pays when the pregame underdog is leading, level, or within one score, once the game is past halfway. Three things set the number, up to a maximum of 12:

- **Odds.** A coin-flip game pays nothing. The longer the odds, the more it pays, and it's full for a long shot. Moneylines work in any sport, and a spread works for basketball and football. A draw in soccer counts as half an upset.
- **Time.** Nothing before halfway, half from halfway, and full once the game is late (three quarters through in basketball and football, two thirds in most other sports).
- **State.** Full when the underdog leads, 80% when it's level (70% in soccer), and half when it trails by a score or less.

### Upset Rout

Blowouts' version. The underdog isn't hanging around: it's running the favorite off the field. It pays when the pregame underdog leads by more than the sport's out-of-reach margin (18 points in basketball, 14 in football, 3 goals in hockey and soccer, 5 runs in baseball), using the same odds and time scaling as upset watch and the same maximum of 12.

## Stakes

What the result decides. The maximum is 10, and the number is scaled by how close the game is: in full inside the sport's close band, halved for a fringe-margin game or a rout still in its first half, and nothing for a rout that's already late. A decided Game 7 has nothing left to decide.

Stakes is kept apart by season so it never double-counts the postseason boost. In the postseason it reads the series. Otherwise it reads rankings and the table.

| Stakes | Needs | Pays |
|---|---|---|
| A series on the brink | `game.series`, postseason only | 10 when both teams are one win from the series in a best of 7 (9 in a best of 5, 8 in a best of 3). 4 to 7 when one team faces elimination: 7 for a 3-2 series in a best of 7, 4 for a sweep bid. |
| Two ranked teams | `rank` on each team, regular season only | 6 when the lower-ranked team is top 5. 5 when it's top 10. 4 when one team is top 10. 3 for any other pair in the top 25. |
| A late-season race | `context.stakes`, regular season only | 5 when winning clinches something or losing eliminates a team. 6 within a few points of the title or the relegation line. 4 for the top European places. 3 for any other table line or when still in the hunt. |

For a race, the team with the most at stake pays in full and the other team at half, capped at 6. Ranked and race add together, and the total is capped at 10.

## Win probability balance

Classic only. `computeWinProbVarianceScore(winProbHistory)` returns a modifier from `-scoreWinProbVarianceMax` to `+scoreWinProbVarianceMax` (±5). Pass `context.winProbability` to `scoreGame`, and the modifier is folded into the total on its own.

It needs at least `minDataPoints` (5) finite values. Anything else returns `undefined`, and the result's `winProbabilityVariance` field is left off entirely rather than set to `0`. Non-finite entries (`NaN`, `Infinity`) are dropped before that count is checked.

The modifier is the mean absolute distance of the supplied values from 0.5, mapped onto the ±5 range:

| Average distance from 50% | Modifier |
|---|---|
| 0 (a coin flip) | +5 |
| `maxAvgDist` ÷ 2 (0.175) | 0 |
| ≥ `maxAvgDist` (0.35) | −5 |

Despite the name, the modifier measures average distance from 50%, not variance. A win-probability line that oscillates between 10% and 90% scores the same penalty as one held steadily at 90%. Both average the same distance from the midpoint.

The modifier is added after the stall deduction, not before it, and the result is clamped to 0 to 100 before any boost is added.

## Stall deduction

A flat deduction comes off the signals subtotal when a game's clock has stopped moving for several consecutive polls. It keeps ArenaSwap from switching to a game sitting in a commercial break or a timeout. Classic and Blowouts apply it. Fantasy doesn't.

`scoreGame` doesn't detect a stall itself. It reads `context.stallCount`, and the caller counts how many consecutive polls the clock hasn't moved. [Score a game from live data](/arenaswap/docs/powerscore/scoring-a-game/#track-stalls-and-win-probability-if-you-have-them) shows how.

`stallPenaltySteps`, checked highest threshold first:

| Consecutive frozen polls | Deduction |
|---|---|
| ≥ 15 | 25 |
| ≥ 8 | 15 |
| Fewer than 8 | 0 |

The deduction comes straight off the signals subtotal rather than scaling it. A game whose signals sum to 79 lands at 54 under the heavy penalty, not 55. `signalsSubtotal` on the result holds the pre-deduction sum, and `stallPenalty` says how much came off, so a breakdown can show what the stall cost. `stalled` is `true` whenever a deduction applied.

## Favorite, postseason, and manual boosts

These three come from you, not from the game, and they work in every mode. Pass them in `options`:

| Option | What it does |
|---|---|
| `favoriteTeamCount` and `favoriteBoostPoints` | Points for each favorite team in the game, so a matchup of two favorites pays twice. |
| `postseasonBoostPoints` and `game.postseasonRound` | Points for a title-deciding round (`0`), with a share for earlier ones: `1` semifinal 75%, `2` quarterfinal 50%, `3` anything earlier 25%. |
| `gameBoost` | A flat manual boost, such as one a viewer sets on a game. |

They show up in `score.boosts` as `favoriteBoost`, `postseasonBoost`, and `gameBoost`, once you've asked for them. The favorite and postseason boosts are added after the mode's own boosts and its blend, and the total is capped at 100 again. `gameBoost` is added last, and it is the only thing allowed past 100. That's deliberate: a game a viewer pins should be able to beat a perfect score.

None of them pay anything unless you give them points. The package has no default for any of them. How ArenaSwap turns a viewer's saved settings into these numbers is in [its own docs](/arenaswap/docs/extension/settings/#scoring), not this package.

## If you're still on the 2.x API

`computePowerScore` keeps its 2.x behavior: signals, win probability, and the stall deduction, with none of the moment boosts. `computeScoringOpportunityBoost(game)` still returns the scoring-opportunity number on its own, and `normalizePowerScoreResult` still clamps and passes through `favoriteBonus`, `gameBoost`, and `postseasonBoost` for a result you build by hand. All of these are deprecated but working. See [the API reference](/arenaswap/docs/powerscore/api-reference/#the-2x-api) for the full list.
