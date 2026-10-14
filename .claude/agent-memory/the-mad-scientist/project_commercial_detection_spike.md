---
name: project-commercial-detection-spike
description: 2026-10-12 commercial-break detection spike; recordings lack play-by-play, ground truth came from cached post-game summaries; harness lives in temporary/commercials
metadata:
  type: project
---

Commercial-break spike (2026-10-12) lives in gitignored `temporary/commercials/` (`reproduce.sh` rebuilds every number; `notebook.md` has every attempt).

- The powerscore recorder does NOT store summary `plays`, so wallclock ground truth had to come from post-game summaries fetched once and cached in `temporary/commercials/pbp/`. Don't refetch; reuse the cache.
- Scoreboard `situation.lastPlay` exists for MLB/NFL/NCAAF/NBA/WNBA/NHL, not college hockey or soccer. Feed lag vs wallclock is ~27–41s median.
- Winners: MLB `Mid/End` shortDetail + mid-half pitcher-id change; NFL `Official Timeout`; NBA `Full Timeout`; NHL first-stoppage-after-14/10/6 predictor. NCAAF scoreboard clock freezes while plays continue (35% of stall runs), the stall rule's worst case.

**Why:** the next pass will turn this into real code; future runs shouldn't rediscover the missing-pbp problem.
**How to apply:** start any commercial/stall follow-up from that folder; the analyst's sport rules are in `analyst.md` there and in [[sports-analyst commercial_break_signals]].
