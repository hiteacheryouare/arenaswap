---
title: The five PowerScore signals
description: What closeness, late-game pressure, momentum, lead changes, and comeback factor each measure, why they're weighted the way they are, and what they ignore.
section: powerscore
order: 3
navLabel: The five signals
---

Every PowerScore total is five numbers added together, then capped. Each signal measures one thing about a game and ignores everything else, including the other four.

## Why the ceilings add up to more than 100

`scoreMaxCloseness` (42), `scoreMaxLateGame` (38), `scoreMaxMomentum` (38), `scoreMaxLeadChanges` (18), and `scoreMaxComeback` (20) sum to 156, not 100. `computePowerScore` still caps the total at `scoreMaxTotal` (100).

A scale that only ever paid out 60 of its 100 points would waste the other 40 on games that can never reach the top. Summing the ceilings past the cap keeps every point in play. A close game trading the lead and riding a run stacks several signals near their own maximums at once. It reaches the 80s or 90s well before the final buzzer. A true classic, tied late with a run behind it, saturates at 100. A dull game still scores low, because none of its signals fire in the first place.

## Closeness

Ceiling: `scoreMaxCloseness`, 42.

Compares the score margin against sport-specific thresholds to pick a tier, then scales that tier by how far the game has progressed. The curve reaches most of its value by mid-game rather than waiting for the final buzzer: `floor + (tierCeiling − floor) × progress^0.55`. A small flat floor of 12 always pays out, clamped to the tier's own ceiling. A tied game in the first minute already reads as something because of it.

0-0 is scored apart from an ordinary tie, because early on it usually means nothing has happened yet rather than that the game is contested. Hockey grants full tie credit for 0-0 from the third period on, and soccer from the second half on. Earlier than that, and in every other sport, 0-0 earns a reduced ceiling instead.

What closeness ignores: which team is ahead, and the absolute score level. A 2-point game at 12-10 reads the same as one at 112-110, because closeness only ever looks at the number on the board right now.

## Late-game pressure

Ceiling: `scoreMaxLateGame`, 38.

Ramps near-linearly across the entire final period of a close game, rather than spiking only in the closing seconds. The tension builds steadily instead of arriving all at once. The ceiling it ramps toward depends on how close the game already is. A comfortable win in the final minute has nothing left to build toward. Tied games ramp past that ceiling in the final minute, toward an overtime pre-boost. It separates a game heading for extra basketball from one that's merely close. Overtime and extra innings pay the full 38 outright.

Baseball and softball have no clock, so the same closeness-gated ramp runs across innings instead. It starts in the 6th inning for baseball, or the 5th for softball, and reaches its ceiling by the end of regulation.

What late-game pressure ignores: recent scoring pace, which is momentum's job, and anything about the first three quarters of a game that's since turned lopsided.

## Momentum, lead changes, and comeback factor

These three all read from `history`, the list of a game's past scores, and each needs at least three snapshots before it activates. Each one spikes on a triggering event, then fades on a sport-scaled half-life. The fade keeps a moving line between goals even in a low-scoring sport, instead of a flat one. The half-lives, along with everything else that varies per sport, live in [Sport and league configuration](/arenaswap/docs/powerscore/configuration/).

### Momentum

Ceiling: `scoreMaxMomentum`, 38.

Measures the swing in the score differential between the oldest and newest snapshot in the window. If one team scores 10 and the other answers with 2, that's a swing of 8, not a 10-0 run. The reason string names both numbers, because a differential isn't a shutout. What counts as a big swing scales with the sport: 8 points in basketball, 2 goals in hockey, 3 runs in baseball.

What momentum ignores: which team is actually ahead. A team can be losing by 20 and still register a momentum spike by outscoring its opponent over the window. It also doesn't know who has the ball right now, only what the scoreboard has done recently.

### Lead changes

Ceiling: `scoreMaxLeadChanges`, 18.

Counts how many times the lead changed hands across the window. A tie doesn't count as a lead on its own. Trailing, tying, then taking the lead is one change. Taking the lead, tying, then taking it back is none.

What lead changes ignores: the size of any swing, and how long ago each flip happened, beyond what decay already accounts for. Two flips or twenty score the same, because past that point the game has already established that it's unpredictable.

### Comeback factor

Ceiling: `scoreMaxComeback`, 20.

Compares how much the margin has shrunk since the oldest snapshot in the window, scaled by game progress the same way closeness is. Cutting a lead in the first quarter counts for less than cutting the same lead with two minutes on the clock.

What comeback factor ignores: whether the comeback finishes. It scores the trend the moment it's happening, without waiting to see if the trailing team completes it. It also doesn't distinguish a real defensive stop from garbage-time scoring against a team that's stopped trying.

## Where these numbers come from

Every ceiling above is an exported constant, not a hand-typed number: `import { scoreMaxCloseness, scoreMaxLateGame, scoreMaxMomentum, scoreMaxLeadChanges, scoreMaxComeback, scoreMaxTotal } from 'powerscore'`. The full function signatures are in the [API reference](/arenaswap/docs/powerscore/api-reference/). The modifiers that sit on top of these five signals, scoring opportunity, win probability balance, and the stall penalty, are in [Boosts and penalties](/arenaswap/docs/powerscore/boosts-and-penalties/).
