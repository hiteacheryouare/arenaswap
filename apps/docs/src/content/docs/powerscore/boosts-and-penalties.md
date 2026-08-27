---
title: PowerScore boosts and penalties
navLabel: Boosts and penalties
description: Every boost and penalty PowerScore applies on top of its five signals, with the exact condition that triggers each one and its effect on the total.
section: powerscore
order: 4
---

Boosts and penalties sit on top of the five signals rather than replacing any of them. Two are computed by the package itself and returned separately from `computePowerScore`. A third is folded into `total` automatically.

## Scoring opportunity boost

`computeScoringOpportunityBoost(game)` returns extra points for a scoring threat the score itself doesn't show yet. It returns `0` unless `game.status` is `'in'` and `isPlayFrozen(game)` is `false`. A frozen game holds its runners, or its down and distance, in place with nothing able to happen.

**Baseball and softball**, by runner count, from `scoringOpportunityBaseRunnerBoosts`:

| Runners on base | Boost |
|---|---|
| None | 0 |
| One | 3 |
| Two | 6 |
| Three (bases loaded) | 10 |

**Football**, gated on how close the game already is, from `scoringOpportunityRedZoneBoost` and `scoringOpportunityRedZoneFringeBoost`:

| Margin (football's `closenessMargins`) | Base value |
|---|---|
| Within the close band (≤ t2) | 10 |
| Within the fringe band (t2 < margin ≤ t3) | 5 |
| Beyond the fringe band | 0 |

The base value is then weighted by down, from `redZoneDownMultipliers`:

| Situation | Multiplier |
|---|---|
| 4th down and goal-to-go | ×1.5 |
| 4th down (not goal-to-go) | ×1.35 |
| 3rd down, `distance` ≤ `thirdAndShortDistance` (3) | ×1.15 |
| Anything else, including a missing `down` | ×1 |

A base value of `0` stays `0` no matter the down. An unconditional boost on top of a blowout would undo what closeness and late-game pressure already scored correctly low. Goal-to-go only raises the multiplier on 4th down, since on an earlier down it describes the odds of a score rather than what decides possession.

This boost is not part of `total`. [Score a game from live data](/arenaswap/docs/powerscore/scoring-a-game/#add-a-scoring-opportunity-boost) shows how to add it to one.

## Win probability balance

`computeWinProbVarianceScore(winProbHistory)` returns a modifier from `-scoreWinProbVarianceMax` to `+scoreWinProbVarianceMax` (±5). Unlike the scoring opportunity boost, `computePowerScore` folds it into `total` on its own, when a `winProbabilityHistory` argument is supplied.

It needs at least `minDataPoints` (5) finite values in the array. Anything else returns `undefined`, and the result's `winProbabilityVariance` field is left off entirely rather than set to `0`. Non-finite entries (`NaN`, `Infinity`) are dropped before that count is checked.

The modifier is the mean absolute distance of the supplied values from 0.5, mapped onto the ±5 range:

| Average distance from 50% | Modifier |
|---|---|
| 0 (a coin flip) | +5 |
| `maxAvgDist` ÷ 2 (0.175) | 0 |
| ≥ `maxAvgDist` (0.35) | −5 |

Despite the name, the modifier measures average distance from 50%, not variance. A win-probability line that oscillates between 10% and 90% scores the same penalty as one held steadily at 90%. Both average the same distance from the midpoint.

The win-probability modifier applies after the stall penalty, not before it. `computePowerScore` deducts the stall penalty from the five signals first, then adds the modifier on top of that reduced subtotal.

## Stall penalty

A flat deduction applies to the five signals' subtotal when a game's clock has stopped moving for several consecutive polls. The deduction keeps ArenaSwap from switching to a game sitting in a commercial break or a timeout.

`computePowerScore` doesn't detect a stall itself. It takes a `stallCount` argument, and the caller counts how many consecutive polls the clock hasn't moved. [Score a game from live data](/arenaswap/docs/powerscore/scoring-a-game/#track-stalls-and-win-probability-if-you-have-them) shows how.

`stallPenaltySteps`, checked highest threshold first:

| Consecutive frozen polls | Deduction |
|---|---|
| ≥ 15 | 25 |
| ≥ 8 | 15 |
| Fewer than 8 | 0 |

The deduction comes straight off the signals subtotal rather than scaling it. A game whose five signals sum to 79 lands at 54 under the heavy penalty, not 55. `signalsSubtotal` on the result holds the pre-deduction sum, so a breakdown can show what the penalty removed. The win-probability modifier is unaffected, since it's added after the deduction, not before.

## Fields the package doesn't compute

`PowerScoreResult` also carries `favoriteBonus`, `favoriteTeamCount`, `gameBoost`, and `postseasonBoost`. `normalizePowerScoreResult` clamps and passes these through when supplied. `computePowerScore` never sets or adds any of them. They exist so a consumer can attach its own boosts and still get back one normalized result. Their exact shape and optionality are in [PowerScore's TypeScript types](/arenaswap/docs/powerscore/types/#powerscoreresult). How ArenaSwap itself turns a viewer's saved preferences into these numbers is covered in [its own docs](/arenaswap/docs/extension/), not this package.
