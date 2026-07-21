---
name: powerscore-winprob-scales
description: Win probability scale factor audit for simulateDistribution.ts; what each sport's logistic scale produces vs historical reality, and the key finding about basketball scale
metadata:
  type: project
---

# Win Probability Scale Factor Audit (PR #68, 2026-07-21)

The simulator derives synthetic win probability using a logistic function:
  winProb = 1 / (1 + exp(-(diff/scale) * certainty))
  certainty = 0.5 + progress * 2.0
  progress = (period - 0.5) / regularPeriods  [mid-period approximation in simulator]

## Scale values and their outputs at key game states

### Basketball (scale=11)
- Comment says "10-pt NBA Q4 lead = ~70-75% win prob"
- Actual at NBA Q4 midpoint (progress=0.875): **88.5%** — significantly higher than stated
- To get 72.5% at Q4 6:00 would require scale ≈ 23
- Root cause: the 'certainty' amplifier at Q4 (≈2.25) pushes win prob much higher than intended
- VERDICT: The claim in comments is INCORRECT for the mid-period approximation. The scale=11
  would produce 70-75% only very early in Q4 (first 2-3 minutes).
- IMPACT: Low — win prob is only used for winProbVariance (±5 pts max). Systematic overconfidence
  means most leading teams get a variance PENALTY, which actually makes sense: a 10-pt NBA lead
  is being scored as very likely to win, so win prob hugs one value (low variance = penalty).
  The penalty correctly reduces the score of a decided-seeming game.

### Football (scale=7)
- 7-pt NFL Q4 lead: produces ~90.5% (historical ≈ 78-82% with ~8 min left)
- 3-pt NFL Q4: produces ~72.4% (historical ≈ 60-65%)
- VERDICT: OVERCONFIDENT for mid-Q4 but directionally reasonable

### Hockey (scale=1.5)
- 1-goal NHL P3 lead: produces ~80.9% (historical: 75-85% mid-P3, 92-95% final minute)
- This is actually the CLOSEST to reality of all sports — the scale was tuned well
- At final seconds (progress≈1, certainty≈2.5): produces 84.1% vs historical 92-95%
- VERDICT: Underestimates true hockey win prob late, but reasonable given simulator constraints
- To hit 90%+ at final seconds: scale would need to drop to ~1.14

### Soccer (scale=1.2)
- 1-goal at 85th minute: produces ~88% (historical ≈ 90%) — very close
- 2-goal lead: produces ~96.6% (historical ~97%+) — accurate
- VERDICT: GOOD — the best-calibrated sport for win probability

### Baseball (scale=2)
- 1-run lead in 9th: produces ~76.8% (historical ≈ 82-88%)
- 3-run lead in 9th: produces ~97.3% (historical ~97%+) — accurate
- VERDICT: Underestimates 1-run lead certainty but appropriate given comeback frequency

## Practical impact
The win prob variance signal is only ±5 points. Scale errors primarily affect whether a game
earns a small boost or penalty, not whether it fundamentally scores high or low. The closeness
and lateGame signals dominate (up to 80 points combined for close buzzer games). Scale errors
should be fixed if win prob data is ever weighted more heavily.

**How to apply:** If win prob variance weight is ever increased beyond ±5, revisit these scales.
Recommended fix for basketball: raise scale from 11 to ~18-20 to better match NBA analytics data.
