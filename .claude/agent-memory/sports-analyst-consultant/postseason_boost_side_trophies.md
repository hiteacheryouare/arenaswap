---
name: postseason-boost-side-trophies
description: Ruling on which season.type===3 games earn championship-path treatment: non-playoff bowls get zero, secondary tournaments and conference finals are capped at the bottom tier, and the "whose trophy" rule that decides all of it
metadata:
  type: project
---

# Postseason boost: the side-trophy rule (decided 2026-09-09)

The governing rule, which resolves every ambiguous `season.type: 3` case without a
hand-maintained list of event names:

**A game earns distance-from-trophy treatment only if the trophy at the end of its
bracket is the one the sport's entire field was competing for. Every other trophy is a
side trophy: its final gets one flat bottom-tier nudge and its earlier rounds get zero.**

Corollary that keeps the ladder honest: distance-from-trophy measures *distance*, not the
*size* of the trophy. A WCWS final and a Stanley Cup Game 7 both sit at distance 0. Do not
add a league-prestige multiplier — the tracked-league allowlist is already the prestige filter,
and a per-competition tier list rots yearly.

## Verdicts by category

| Category | ESPN stamp | Boost |
|---|---|---|
| CFP round games (First Round / Quarterfinal / Semifinal / National Championship) | type 3, named in note headline | full ladder, 3 / 2 / 1 / 0 |
| Non-playoff bowls (~26 of ~40 CFB postseason games) | type 3, week 1, no round signal | **zero** |
| NIT / WBIT / College Basketball Crown — championship game | type 3 | bottom tier only |
| NIT / WBIT / Crown — every earlier round | type 3 | zero |
| Women's NIT (WNIT, Triple Crown Sports) | type 3 | zero, including its final |
| College hockey conference tournament final | type 2, note headline only | bottom tier (build only if a headline parser already exists) |
| Conference tournament semifinal or earlier, any sport | type 2 or 3 | zero |
| NCAA basketball conference tournament final | UNVERIFIED (2 or 3) | bottom tier |
| NCAA baseball/softball type 3 / 4 / 5 / 6 | Regionals / Supers / CWS / Finals | 3 / 2 / 1 / 0 — mapping confirmed sound |

CFB detection inverts: in college football postseason, **require** an affirmative round
signal in the note headline to pay anything. Absence of a round name means a bowl. That
survives bracket expansion, since a 16-team CFP will still name its games.

## Why non-playoff bowls get nothing rather than the bottom tier

A non-playoff bowl is the lowest-stakes game college football plays all year — lower than a
Week 8 conference game, which at least moves standings. It also carries draft opt-outs, an
open transfer portal, and frequently an interim coach. Bowl season overlaps NFL Weeks 15-17,
the NBA and the NHL, so any positive boost pushes an exhibition above a tight pro game on a
crowded slate. If a bowl turns into a good game, closeness and late-game surface it on their
own; that is the division of labour — **live signals encode what the scoreboard shows, the
boost encodes only stakes, and these have none.**

## Rank, not bowl name, is the right discriminator

`curatedRank` beats any bowl-tier list, but it belongs in a separate always-on
matchup-quality boost rather than in the postseason ladder — a top-10 vs top-10 November
game deserves the same nudge and currently gets nothing. Suggested: both ranked +2, both
top-10 +3 to +4, one ranked 0 to +1. Traps: unranked arrives as 99 rather than absent;
ESPN may put the *tournament seed* in `curatedRank` for bracket games, which would make a
"≤25" test meaningless; poll data is college-only. See [[powerscore-calibration]].

## The college hockey inversion worth remembering

Stakes run *opposite* to conference prestige. Atlantic Hockey America and the CCHA never
receive at-large bids, so their tournament final is the only route to the NCAA tournament —
strictly higher stakes than a Hockey East final, where both teams are usually already in on
PairWise. So never tier conference finals by conference strength: the ranking you would
build is backwards from the stakes, and it needs the name list the whole design avoids.

Same argument, stronger, for one-bid basketball leagues: UMBC reached the 2018 tournament
(and the first 16-over-1) by winning the America East final on a buzzer-beater.

## Double elimination breaks the distance ladder

Within a CWS/WCWS or regional bracket, an opening game and a bracket final sit at the same
distance while carrying very different stakes, and correcting it needs per-team loss counts
we do not track. Accepted imprecision. If ESPN's note headline reliably marks elimination
or regional-championship games, that is the cheap upgrade — sample before relying on it.
