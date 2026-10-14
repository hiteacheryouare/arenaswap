---
name: commercial-break-signals
description: 2026-10-12 commercial-break detection audit: per-sport feed signatures (Official Timeout, TV Timeout, Middle/End inning), measured break lengths, why clock-stall misfires, MLB breaks invisible today
metadata:
  type: project
---

# Commercial-break signals (2026-10-12, measured on recordings 2026-10-03..11)

Full write-up: `temporary/commercials/analyst.md` (gitignored, may be gone).

## Gaps found in our code
- MLB `Middle 5th`/`End 5th` arrive as `STATUS_IN_PROGRESS`, so the intermission regex in
  sideline apiClient (`HALFTIME|END_PERIOD|INTERMISSION` on status name) never fires. Baseball
  is clockless, so stall never runs either. Half-inning breaks got zero penalty.
- `End of Nth Quarter/Period` detail shows under IN_PROGRESS for several polls before END_PERIOD (ncaaf worst).
- Soccer `status.clock` freezes at 2700/5400 through stoppage time. Our parser uses displayClock prime
  notation, which ticks once a minute, so 8 polls at ≤7.5s can trip the stall within a minute.

## Feed signatures (lastPlay on scoreboard situation), measured gap after
- NFL `Official Timeout` = the network TV break, p50 169s. `Two-minute warning` p50 181s. Team `Timeout` p50 61s.
- CFB logs NO TV timeouts. Infer from `Extra Point Good` (p50 184s), FG Good 121s, End Period 258s.
- NHL `Stoppage` with text `TV Timeout` p50 121s, clusters at 13/9/5 min remaining (rule: after 6/10/14 elapsed).
- NBA `Full Timeout` p50 169s, peaks at 6:xx and 2:xx (mandatory under 7/under 3). WNBA `Official Timeout` at ~4-5 min, p50 196s. `Reset Timeout` is not a commercial.
- MLB: postseason break p50 ~160s in detail state (3:10 timer); mid-inning pitcher-id change p50 197s pitch-to-pitch. ABS `- Overturned/- Confirmed` are 15-30s, not breaks.
- ncaamh scoreboard has no lastPlay, so stall is the only in-play signal there.

## Rules (2026)
MLB break timer 2:15 local / 2:40 national / 3:10 postseason (same for pitching changes). NCAA softball 90s.
cbase ~2:00 (2:30 new pitcher), unconfirmed. CFB 3-4-3-4 or 4-4-4-4 TV format, 2-min timeout since 2024. NCAA men's
under-16/12/8/4; May 2026: clock must run between back-to-back media TOs. FIFA WC 2026: 3:00 hydration break ~22' each half.

**How to apply:** Recommended replacing the stall penalty with per-sport "break evidence": stall off for soccer, gated
for CFB, fallback-only for ncaamh. Never penalise reviews or late one-possession timeouts. Re-verify the ncaab/ncaaw/UFL
play-type text when their seasons start; those leagues had no recordings. Related: [[powerscore-stall-penalty]], [[live-moment-signals-audit]].
