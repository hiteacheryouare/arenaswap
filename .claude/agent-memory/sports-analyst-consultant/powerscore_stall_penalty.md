---
name: powerscore-stall-penalty
description: Stall penalty design decisions: flat vs percentage, intermission vs stall distinction, sport-specific applicability. The key insight is that intermission=true already zeroes the score.
metadata:
  type: project
---

# Stall Penalty Design (PR #68, 2026-07-21)

## Two-step graduated flat deduction
- 8 polls (≈120s): -15 — targets commercial breaks / clock stoppages
- 15 polls (≈225s): -25 — targets extended stops (long replay reviews, weather holds)

## Critical distinction: intermission=true vs stall
The PR description frames stall as affecting "halftime" but this is misleading.
True halftime sets `game.intermission = true`, which returns a zeroed PowerScore (total=0) immediately.
The stall penalty applies ONLY when the clock is frozen but `intermission` is not set — i.e.:

- Mid-quarter TV timeouts (NBA/NFL/NBA replay reviews)
- NFL coach challenges (clock frozen 2-5 min for replay)
- Soccer VAR reviews (clock frozen 2-10 min, game not in intermission)
- Baseball weather delays (no clock, but score polling freezes)
- NHL icing / extended injury timeouts

## Practical impact for a tied NBA Q4 game under heavy penalty
- Base score: closeness=42 + lateGame≈36 = ~78
- After -25 stall: 78 - 25 = 53
- Still above all reasonable switch thresholds (p97 gap ≈ 38). Game correctly stays prioritized.

## Is flat better than percentage?
Flat deduction is correct here because:
1. The purpose is to signal "clock isn't moving" — a binary state that shouldn't scale with game quality
2. A great tied game under commercial break should still outscore a dull mid-game blowout
3. Percentage would unfairly crush high-scoring games more than low-scoring ones

## Sport-specific notes
- Basketball: End-of-Q3 break (not intermission in some data sources) may trigger 120s penalty. Acceptable.
- Soccer: VAR review of 5+ min would hit -25. During a 1-0 game with 10 min left, score drops
  from ~60 to ~35. This correctly signals "nothing is happening right now."
- Baseball: No clock, so stall only triggers if ESPN stops reporting score data (rare, but weather delays)
- Football: 2-min warning timeout (~60-90s) would NOT trigger stall (below 8-poll threshold). Correct.

**How to apply:** If ESPN data source ever reports mid-game intermission states separately, check
whether those maps to `game.intermission=true` or just a frozen clock. The distinction matters.
