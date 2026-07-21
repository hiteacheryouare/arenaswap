---
name: powerscore-soccer-clock
description: Soccer clock encoding: clockIsFullGameElapsed=true, period=2, and how the scorer strips completed periods to get within-period position. 85th minute = clockSeconds=5100.
metadata:
  type: project
---

# Soccer Clock Math (PR #68, 2026-07-21)

## Key design: clockIsFullGameElapsed = true

ESPN reports soccer time as a continuously counting-up clock (0'→90'+) without resetting between halves.
The scorer handles this with `clockIsFullGameElapsed=true` in the soccer SportTypeConfig.

## How the scorer strips completed periods (scorer.ts: getClockSecondsRemaining)
```
if (config.clockIsFullGameElapsed && period > 1) {
  rawClock = clockSeconds - (period - 1) * periodDurationSecs
}
```

For MLS (periodDurationSecs=2700 = 45 min):
- 85th minute total: clockSeconds = 5100
- period=2, so: rawClock = 5100 - 2700 = 2400s (40 min into P2)
- secsRemaining = 2700 - 2400 = 300s (5 min left) ✓

## Injury time behavior
If clockSeconds > (2 * periodDurationSecs) = 5400 (90 min), rawClock in P2 exceeds 2700.
The scorer clamps to periodDurationSecs: boundedClock=2700, secsRemaining=0.
This correctly maps all injury time to maximum late-game score (closeCeiling). ✓

## Stress-test scenario validation
Soccer scenario in simulateDistribution.ts: period=2, clockSeconds=5100
- Verified: correctly resolves to 85th minute, 5 min remaining
- Score: closeness=41, lateGame=32, total=73 ✓
- closeness=41 (not 42): game progress=0.944 at 85th min, so progress-floor scaling gives 41
- At final whistle (clockSeconds≈5400), progress=1.0, closeness reaches 42

## Period convention
Soccer period numbers follow the standard: period=1 = first half, period=2 = second half.
Overtime periods in knockout competitions would be period=3/4 (extra time).
`zeroZeroPenaltyPeriods: [1]` means 0-0 in the first half gets reduced tie credit (not full 42).

**How to apply:** When debugging soccer score oddities, always check clockSeconds and convert:
  P2 elapsed = clockSeconds - 2700; minutes into 2nd half = P2_elapsed / 60
