---
name: powerscore-calibration
description: PowerScore v2 calibration decisions: margin thresholds, late-game ceilings, stress-test outputs, and domain verdict on each sport's tier configuration
metadata:
  type: project
---

# PowerScore v2 Calibration (PR #68, audited 2026-07-21)

## Stress-test outputs (actual, from simulateDistribution.ts --early-game)
All depth=0/1/3 are identical (no history = no momentum/leadChanges/comeback signals):

| Scenario | Score | Closeness | LateGame |
|---|---|---|---|
| Basketball tied buzzer (NBA Q4 1s) | 80 | 42 | 38 |
| Basketball 1-pt final min (NBA Q4 30s) | 69 | 34 | 35 |
| Hockey 1-goal final min (NHL P3 1m) | 68 | 34 | 34 |
| Hockey tied final min (NHL P3 1s) | 80 | 42 | 38 |
| Football 3-pt final min (NFL Q4 1m) | 68 | 34 | 34 |
| Baseball 1-run 9th (MLB) | 69 | 33 | 36 |
| Soccer tied 2nd half 85m (MLS) | 73 | 41 | 32 |
| Basketball blowout Q4 (NBA Q4 mid, 28-pt) | 8 | 0 | 8 |

## PR calibration targets vs reality
- "Tied buzzer, no history → 80": CONFIRMED (closeness=42 + lateGame=38 = 80)
- "1-pt game, final minute → ≥68": CONFIRMED for all tested sports (basketball=69, hockey=68, football=68)
- "Blowout final seconds → ≤8": CONFIRMED (blowout ceiling=15, zero closeness = 8)

## Margin threshold verdicts

### Basketball [5, 10, 18]
- t1=5: CORRECT — 5-pt game is a 2-possession NBA game
- t2=10: SOUND — 10-pt is the standard 2-digit barrier in NBA analytics
- t3=18: ACCEPTABLE — progress-scaling handles the time context (18-pt Q1 game isn't a blowout)
  - Minor note: some analysts use 15 as blowout threshold, but 18 is defensible given progress-gating

### Hockey [1, 2, 3]
- t1=1: CORRECT — 1-goal game is always tight
- t2=2: REASONABLE — 2-goal game requires 2+ goals with few shots remaining
- t3=3: CORRECT — 3-goal NHL lead protected at ~98%+; anything beyond is a genuine blowout

### Baseball [1, 3, 5]
- t1=1: CORRECT — 1-run game is always close (walk-off territory in 9th)
- t2=3: REASONABLE — 3-run game: can be erased with a single HR
- t3=5: SLIGHTLY GENEROUS — 5-run leads are overcome in the 9th ~3-4% historically
  - t3=4 would be more conservative; t3=5 is defensible given early-inning context

### Football [3, 8, 14]
- t1=3: CORRECT — 3-pt (FG) game is the canonical tightest NFL margin
- t2=8: DEFENSIBLE — 8-pt is TD+2pt boundary (1-score to tie). The real 2-score line is 9+,
  so t2=7 would be marginally more conservative. But 8-pt with 5+ min left IS watchable.
- t3=14: CORRECT — 14-pt is a 2-TD game; 15+ is 3-score territory → blowout
  - Key insight: t3=14 captures the 2-score boundary properly; 15 is where the game ends emotionally

### Soccer [1, 2, 3]
- t1=1: CORRECT — 1-goal game is always tight in soccer
- t2=2: REASONABLE — 2-goal cushion; theoretically recoverable
- t3=3: CORRECT — 3-goal lead protected at 99.9%+ historically
  - The 3-0 Liverpool comeback (2019) is the rare exception that proves the rule

## Late-game ceilings
- closeCeiling=36: appropriate for 2-possession games across all sports
- fringeCeiling=22: appropriate for "possible but unlikely" comeback territory
- blowoutCeiling=15: correct — blowouts need late-game acknowledgment but minimal weight
- otPreBoostMax=2 (= 38-36): ensures tied buzzer hits exactly 38, the max. Elegant.

**Why:** The tiered ceiling design correctly separates "clock-based tension" from "game-state tension."
A blowout late in the game should not score high just because the clock is running out.

**How to apply:** When adding new sports, set t3 to the margin where win probability exceeds ~97%.
