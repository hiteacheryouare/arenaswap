---
name: live-moment-signals-audit
description: 2026-10-01 audit of live "flip-to" moments PowerScore misses per sport, the verified API fields behind each, proposed thresholds, and the new-sport priority order
metadata:
  type: project
---

# Live moment signals audit (2026-10-01, from real payloads probed 2026-09-30)

## Verified field facts (from live payloads, not docs)
- Core `competitions/{c}/situation` is per-sport and richer than scoreboard `situation`:
  - NHL: `powerPlay`, `emptyNet` booleans (only `false` observed so far). Scoreboard NHL situation has lastPlay only.
  - WNBA: `homeTimeouts.timeoutsRemainingCurrent`, `homeFouls.{teamFoulsCurrent,foulsToGive,bonusState}` (`NONE`/`DOUBLE` seen).
  - MLB: balls/strikes/outs + `dueUp[]`. NFL: down/yardLine/distance/isRedZone/home+awayTimeouts.
  - Tennis: `server` only.
- Core `lastPlay`: basketball carries `possessionTeam`; soccer carries `redCard`, `yellowCard`, `penaltyKick`, `ownGoal`, `addedClock`.
- Poll log: Core situation ran about one poll (~15s) ahead of the Site scoreboard. CDN game package lagged 20+ plays. Do not use CDN for live state.
- NO win probability for NHL (Core probabilities 400, summary `winprobability` absent) or EPL (no key in summary). The WP-variance boost is silently neutral for hockey and soccer.
- NHL summary plays: penalties carry `type.penaltyMinutes`, `type.penaltyType`; goals carry `strength` (Power Play / Even Strength).
- Soccer scoreboard already has `details[]` (redCard/penaltyKick/ownGoal flags; penaltyKick marks a scored penalty, too late for "awarded") and competitor stats `shotsOnTarget`, `wonCorners`, `possessionPct` — currently thrown away.
- Soccer Core `momentum`: one item per minute, attributed to one competitor, `probability` peaks ~0.10 (per-minute threat). Shape verified on a final match; live cadence unverified. Returns empty for NHL/NFL/MLB/WNBA/CFB.
- Core `relevancy`: `{type, value, factors[]}` e.g. CFB IMPORTANT 80; WNBA `NO_CONFIGURATION` 0. Feeds issue #158, not a new pitch.
- Soccer stoppage time already maps to max lateGame (see [[powerscore-soccer-clock]]); not a gap.
- Tennis live: per-set games in `linescores`, `possession` = server, ~10 concurrent ATP matches. No point score, no plays, no probabilities → break points undetectable.
- Cricket: summary `linescores[]` has runs/wickets/overs/target/isBatting. Traps: "Stumps" reports `state:"in"`; domestic women's games report live with empty scores. Site scoreboard 404.
- Golf web leaderboard per player: hole, thru, position, `playoff`, `featured`, movement.
- MMA status: round, clock, result; no live scoring. Racing: NASCAR Kansas summary 500; still rejected ([[racing-feasibility]]).

## Ranked ideas (fan value x data confidence)
1. Baseball: re-weight runner boost by tying/go-ahead run position + outs (all on scoreboard).
2. Football: one-score two-minute drill (possession, timeouts, yardLine already read, not scored).
3. Soccer red card from scoreboard `details[]`.
4. Hockey empty net / power play via Core situation.
5. Add Ligue 1 and other big soccer leagues (same schema).
6. Football 4th-and-short outside the red zone, late.
7. Basketball last-possession (Core lastPlay.possessionTeam + numeric clock).
8. NCAA women's volleyball, then tennis, then CFL.
Soccer penalty-awarded is high value but the pre-kick play type is unverified.

**How to apply:** Reuse these field paths and thresholds rather than re-deriving; re-probe the unverified items (NHL powerPlay true, soccer penalty-awarded play type, volleyball live point updates) before building.
