---
name: content-aware-switching-breaks
description: 2026-10-20 Content Aware Switching: per-sport natural-break definitions, poll-diff proxies, measured wait-to-break residuals, recommended hold caps, no-hold and target-override rules
metadata:
  type: project
---

# Content Aware Switching (2026-10-20)

Hold a switch away from the current game until it reaches a natural break, capped per sport. Soccer exempt; baseball break = PA end (both decided by Ryan). Single on/off toggle, caps are constants. Switch Delay applies after detection.

## Measured from cached pbp wallclocks (temporary/commercials/pbp, recorded 2026-10-03..11)
Residual = wait from a random in-play moment to the next break (length-weighted), before detection lag.
- MLB (15 postseason games): PA start->result p50 67s p90 135 p95 157; residual p50 43 p90 112 p95 138; 4.2 pitches/PA. Regular season likely ~10-15% faster.
- NBA (7 preseason) game-clock live between dead balls p50 26 p90 77; residual p50 23 p90 68 p95 84. WNBA (2 Finals games) residual p50 27 p90 108 (thin sample).
- NHL (9 games) faceoff->whistle clock p50 46 p90 127; residual p50 41 p75 79 p90 135 p95 178. Stoppage lengths: icing p50 31, goalie freeze 38, goal 49, penalty 59, TV timeout 148.
- NFL play->play wallclock p50 43 p75 54; CFB p50 42 p75 57. Gaps >150s are Official Timeout / two-minute warning (NFL) or kickoff/punt/TD (CFB, which logs no TV timeouts).

## Recommended caps (from first switch decision, detection included)
MLB 120s, college baseball 150s, softball 100s; NFL/UFL/CFB 60s; NBA/WNBA/Olympic 75s, NCAA hoops 90s; NHL/NCAA/Olympic hockey 90s.

## Key rules decided/recommended
- Baseball proxy: batter id differs from hold-start batter (not previous poll); ignore if count carried over (pinch hitter mid-count). Pitcher id change, inning Mid/End = immediate. Outs/runners/score changes alone are not PA ends (CS, WP, balk).
- Football: any new play id = break; score, possession change, timeout/two-minute/end-period = immediate; lastPlay id unchanged for >= ~50s = extended stoppage, switch. Clock is useless as a dead-ball proxy. NCAA clock stops on first downs only in last 2:00 of each half since 2023.
- Basketball/hockey: clock frozen across two polls = dead now; game-clock delta < wall delta minus ~6s = a whistle happened between polls. Every whistle counts (icing, OOB included); made baskets are not breaks except when the clock stops (NBA/WNBA/FIBA last 2:00 of 4th/OT; NCAA last 59.9s). Clutch FTs: wait for the last FT of the trip.
- Cap never resets when the target changes mid-hold. Cancel hold if the switch decision reverses.
- Target override recommended (narrow): walk-off/last-out PA, final-30s one-possession, final-2:00 one-score in scoring range or 4th down, NCAA football OT, hockey shootout. Not overriding when the leaving game is itself in such a state.

**How to apply:** Reuse these numbers rather than re-measuring; re-measure MLB on regular-season and NBA on regular-season recordings when they exist. Related: [[commercial-break-signals]], [[live-moment-signals-audit]], [[powerscore-stall-penalty]].
