---
title: PowerScore signals in every mode
description: The signals behind Classic, Blowouts, and Fantasy PowerScore, with each one's ceiling, what it measures, and what it ignores. Plus how to switch signals off.
section: powerscore
order: 3
navLabel: Signals by mode
---

A signal measures one thing about a game and ignores everything else, including the other signals in its mode. A mode is a list of signals plus the boosts that suit it. PowerScore 3 ships three, and each one asks a different question.

| Mode | The question | Signals (ceiling) |
|---|---|---|
| `'classic'` (the default) | Is it close, late, and swinging? | Closeness 42, Late-Game Pressure 38, Momentum 38, Lead Changes 18, Comeback Factor 20 |
| `'blowouts'` | Is somebody running away with it? | Blowout Margin 50, Sustained 30, Timing 25, Pile-On 15 |
| `'fantasy'` | Is something about to happen to my players? | Situation 50, Production 35, Exposure 15 |

Pick one with `options.mode`. In the ids as they appear in `score.signals`, that's `closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`; `blowoutMargin`, `sustained`, `timing`, `pileOn`; and `situation`, `production`, `exposure`.

Blowouts and Fantasy don't replace Classic. Each builds on it, so a game with nothing to say in the new mode still has a sensible score. [How the modes blend](#how-the-modes-blend-with-classic) covers the arithmetic.

## Why the ceilings add up to more than the total

Classic's ceilings sum to 156, and the total is capped at 100. A scale that only ever paid out 60 of its 100 points would waste the other 40 on games that can never reach the top. Summing the ceilings past the cap keeps every point in play. A close game trading the lead and riding a run stacks several signals near their own maximums at once and reaches the 80s or 90s well before the final buzzer. A true classic, tied late with a run behind it, saturates at 100. A dull game still scores low, because none of its signals fire in the first place.

The same goes for Blowouts (120) and Fantasy (100). The sums are `scoreMaxSignalsSubtotal` for Classic and `signalCeiling` on any `PowerScore` result for the mode that scored it.

## Switch a signal off

Pass its id in `options.disabledSignals`. The signals still on are rescaled to the mode's full range, so a mode with one signal off still spans 0 to 100 instead of topping out early. Switch them all off and none of them are: there's nothing to rescale to.

```ts
scoreGame(game, context, { disabledSignals: ['momentum', 'comeback'] });
```

Each entry on `score.signals` carries `disabled: true` when you've done this, so a breakdown can grey it out. When a mode blends with Classic, `options.classicDisabledSignals` is Classic's own switch list.

## Classic

The 2.x model, with the moment boosts from [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/) added on top.

### Closeness

Ceiling: `scoreMaxCloseness`, 42.

Compares the score margin against sport-specific thresholds to pick a tier, then scales that tier by how far the game has progressed. The curve reaches most of its value by mid-game rather than waiting for the final buzzer: `floor + (tierCeiling − floor) × progress^0.55`. A small flat floor of 12 always pays out, clamped to the tier's own ceiling. A tied game in the first minute already reads as something because of it.

The tier ceilings:

| State | Basketball | Football | Hockey and soccer | Baseball and softball | Ceiling |
|---|---|---|---|---|---|
| Tied | | | | | 42 |
| Tight | ≤ 5 points | ≤ 3 points | ≤ 1 goal | ≤ 1 run | 34 |
| Close | ≤ 10 points | ≤ 9 points | ≤ 2 goals | ≤ 3 runs | 20 |
| Fringe | ≤ 18 points | ≤ 14 points | ≤ 3 goals | ≤ 5 runs | 8 |
| Out of reach | > 18 points | > 14 points | > 3 goals | > 5 runs | 0 |

0-0 is scored apart from an ordinary tie, because early on it usually means nothing has happened yet rather than that the game is contested. Hockey grants full tie credit for 0-0 from the third period on, and soccer from the second half on. Earlier than that, and in every other sport, 0-0 earns a reduced ceiling of 22.

**Ten men.** In soccer, a team a man down while protecting a one-goal lead concedes far more often than a full side does. So the game is closer than the score says, and Closeness adds 4 points (still capped at 42) while that's the situation. It's the one place a red card touches a signal. The red card boost is separate, and it's in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/#red-card).

What closeness ignores: which team is ahead, and the absolute score level. A 2-point game at 12-10 reads the same as one at 112-110, because closeness only ever looks at the number on the board right now.

### Late-Game Pressure

Ceiling: `scoreMaxLateGame`, 38.

Ramps near-linearly across the entire final period of a close game, rather than spiking only in the closing seconds. The tension builds steadily instead of arriving all at once. The ceiling it ramps toward depends on how close the game already is, because a 30-point game in the final minute has no tension left to build:

| Margin | Ceiling at the buzzer |
|---|---|
| Tied, tight, or close | 36 |
| Fringe | 22 |
| Out of reach | 15 |

Tied games ramp past 36 in the final minute, toward an overtime pre-boost that tops out at 38. It separates a game heading for extra basketball from one that's merely close. Overtime and extra innings pay the full 38 outright.

Baseball and softball have no clock, so the same closeness-gated ramp runs across innings instead. It starts in the 6th inning for baseball, or the 5th for softball, and reaches its ceiling by the end of regulation.

Soccer never says "overtime." Extra time reads *extra time*, a shootout reads *penalties*, and a level match late in the second half reads *still level late*. A draw is an ordinary league result, not a stop on the way to overtime. The pre-boost still applies, because a late deadlock is genuinely tense.

What late-game pressure ignores: recent scoring pace, which is momentum's job, and anything about the first three quarters of a game that's since turned lopsided.

### Momentum, Lead Changes, and Comeback Factor

These three all read from `context.history`, the list of a game's past scores, and each needs at least three snapshots before it activates. Each one spikes on a triggering event, then fades on a sport-scaled half-life. The fade keeps a moving line between goals even in a low-scoring sport, instead of a flat one. The half-lives, along with everything else that varies per sport, live in [Sport and league configuration](/arenaswap/docs/powerscore/configuration/).

**Momentum** (ceiling 38) measures the swing in the score differential between the oldest and newest snapshot in the window. If one team scores 10 and the other answers with 2, that's a swing of 8, not a 10-0 run. The reason string names both numbers, because a differential isn't a shutout. What counts as a big swing scales with the sport: 8 points in basketball, 2 goals in hockey, 3 runs in baseball. It ignores which team is actually ahead. A team can be losing by 20 and still register a momentum spike by outscoring its opponent over the window.

**Lead Changes** (ceiling 18) counts how many times the lead changed hands across the window: 18 points for two or more, 12 for one. A tie doesn't count as a lead on its own. Trailing, tying, then taking the lead is one change. Taking the lead, tying, then taking it back is none. It ignores the size of any swing. Two flips or twenty score the same, because past that point the game has already established that it's unpredictable.

**Comeback Factor** (ceiling 20) compares how much the margin has shrunk since the oldest snapshot in the window, scaled by game progress the same way closeness is. Cutting a lead in the first quarter counts for less than cutting the same lead with two minutes on the clock. It scores the trend while it's happening, without waiting to see whether the trailing team completes it.

### Two modifiers that aren't signals

Classic also applies the win probability modifier (±5) and the stall deduction. Both belong to Classic's pipeline, and both are covered in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance).

## Blowouts

Closeness turned inside out. Blowouts pays nothing until a game is two scores apart (the sport's second closeness margin), then climbs to full credit at a rout.

| Signal | Ceiling | What it measures |
|---|---|---|
| Blowout Margin | 50 | The margin, scaled up as the game goes on so a rout late is surer than one early. Full credit at 30 points in basketball, 28 in football, 5 goals in hockey and soccer, 10 runs in baseball and softball. |
| Sustained | 30 | How much of the history window the current leader has been more than two scores up. A lead that has been built and held scores here. A run that may revert doesn't. Needs 3 snapshots. |
| Timing | 25 | An early rout has more beatdown left to watch than one that is nearly over. Falls toward 0 as regulation ends. |
| Pile-On | 15 | The leader is still extending. It reads momentum in the leader's direction only, so a team hanging on to a big lead scores nothing here. Needs 3 snapshots. |

What Blowouts ignores: how a close game is going. A game inside two scores scores next to nothing here. That's where the blend comes in.

Blowouts also pays no postseason boost. A playoff blowout has settled its result, so the round adds nothing to it. The mode sets `paysPostseason: false`.

## Fantasy

Scores what your players are doing. It reads `context.fantasy`, one entry per rostered player, so it has nothing to say until you hand it a roster.

| Signal | Ceiling | What it measures |
|---|---|---|
| Situation | 50 | Where your players are in the game. Football: who has the ball, red zone, goal line, your kicker in range, your defense on the field. Baseball: at bat, on deck, or pitching with runners on. Basketball and hockey: how close and late the game is. The player with the most going on counts in full and everyone else at a quarter. |
| Production | 35 | Fantasy points your players scored lately, fading the way a lead change does. A full burst (a touchdown, a home run, a goal) fills it. Negative plays don't count: nobody switches in to watch an interception they already missed. |
| Exposure | 15 | How many of your players are in the game: 5 each, up to 15. |

Football is the only sport with a live feel for who has the ball. Basketball and hockey have no live on-court data, so a rostered player in a game there is worth as much as the game itself is close and late. A player marked `active: false` (benched, injured, ejected) counts for nothing.

## How the modes blend with Classic

Neither of the new modes stands on its own. Each one is combined with Classic, so a quiet game never falls off the map.

| Mode | Blend | Formula | Why |
|---|---|---|---|
| Blowouts | Floor | `total = max(blowouts, 0.3 × classic)` | A close game keeps 30% of its Classic score, so a night with no beatdown still has something to switch to. Any real beatdown outranks the best of them. |
| Fantasy | Boost | `total = min(100, classic + 0.6 × fantasy)` | Your players' games can only rise above their Classic score, and a game without them is plain Classic. An earlier 0.6/0.4 mix ranked a late one-point game with your player below the identical game without one. |

Change Fantasy's weight with `options.classicBlend`:

```ts
scoreGame(game, context, {
	mode: 'fantasy',
	classicBlend: { kind: 'boost', weight: 0.8 },
});
```

A game with no active player in it has nothing for Fantasy to say. It's scored as Classic, and `score.modeId` says `'classic'` so you can tell. `score.classicTotal` carries Classic's own total whenever a mode blends with it, and `score.blend` carries the arithmetic: `{ kind, weight, ownTotal, classicTotal, floorApplied? }`. A breakdown can use it to show "Classic 70 × 30% = 21" when the floor won, or "+30" for a Fantasy score of 50 at a weight of 0.6.

## Where these numbers come from

Classic's ceilings are exported constants: `scoreMaxCloseness`, `scoreMaxLateGame`, `scoreMaxMomentum`, `scoreMaxLeadChanges`, `scoreMaxComeback`, and `scoreMaxTotal`. The Blowouts and Fantasy ceilings live on their signal definitions, `blowoutsSignals` and `fantasySignals`, so you can read them at runtime. If none of the three modes asks your question, [build your own with `defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode). The full signatures are in the [API reference](/arenaswap/docs/powerscore/api-reference/).
