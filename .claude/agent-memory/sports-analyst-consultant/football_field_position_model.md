---
name: football-field-position-model
description: Verified ESPN gridiron situation model — yardLine is a home-anchored 0-100 absolute coordinate, direction of travel, goal-to-go, and every dead-ball state that must not be drawn
metadata:
  type: project
---

Verified against live ESPN payloads on 2026-09-04 (three in-progress NCAAF games, one completed
NCAAF 2OT game, one completed NFL game). ~340 plays checked programmatically.

## The coordinate system

`situation.yardLine` is a single absolute 0-100 coordinate anchored to the **home** team:
**0 = the home team's goal line, 100 = the away team's goal line.** It does not change meaning
based on who has the ball.

- Home offense always drives toward 100. Away offense always drives toward 0.
- `yardsToEndzone` = `100 - yardLine` for home possession, `yardLine` for away possession.
- Absolute position needs only `yardLine`. `possession` is needed only for **direction**.

Disambiguating evidence (an away-possession sample alone cannot distinguish the two candidate
conventions, because they coincide):
- OU (home) with the ball at "UTEP 27" -> `yardLine: 73`. A yards-to-end-zone convention would
  have said 27.
- MIA (away) with the ball at "STAN 14" -> `yardLine: 14`.

**Why:** the two plausible readings ("absolute, home-anchored" vs "always relative to the offense")
produce identical numbers for every away-team possession, so a survey that happens to sample only
away possessions confirms the wrong model.

**How to apply:** derive position from `yardLine` alone. Never parse `possessionText` for geometry —
at midfield the NFL sends it as the bare string `'50'` with no team abbreviation.

## Direction and the first-down line

`direction = possession === homeTeamId ? +1 : -1`
`firstDownYard = yardLine + direction * distance`

That expression is exact and **invariant across a series** (277 of 280 down-to-down transitions
held; the 3 exceptions are pre-snap penalties, which legitimately move both the spot and the
marker). It is a good implementation assertion.

On **goal-to-go**, `distance` equals the yards to the goal line exactly, so the expression lands on
0 or 100 with no clamp needed. Verified: `1st & Goal at STAN 6` sends `down: 1, distance: 6,
yardLine: 6` with MIA (away) driving toward 0.

See [[football_espn_dead_ball_states]] for when not to draw at all.

## League scope

`nfl`, `ncaaf` and `ufl` are the configured football leagues (`sportType: 'football'`).
NFL and NCAAF share the identical `situation` shape and the same 100-yard / 10-yard-end-zone
geometry. UFL play-by-play is absent from ESPN (`drives` came back empty on a completed 2025 game),
so its live `situation` shape is **unverified** and must be re-checked during the spring season.

ESPN's CFL endpoint returns a single stale 2023 event — effectively no live coverage. If CFL is ever
added the strip geometry changes materially: 110 yards between goal lines, 20-yard end zones,
3 downs.

## Overtime

College OT needs **no special coordinate handling** — verified against a 4OT game
(TA&M @ AUB, 2024-11-23, event 401628428). Each possession starts at the opponent's 25 and the
home-anchored frame is unchanged: TA&M (away) at "AUB 25" -> `yardLine: 25`; AUB (home) at
"TA&M 25" -> `yardLine: 75`.

Two things that are **not** obvious:

- ESPN puts **every** overtime period into `period: 5`. A 4OT game reports plays in periods 1-5
  only, so `status.period` never reaches 6+ and cannot be used to count OT periods in college
  football.
- Under the current NCAA rule, OT3 onward is alternating two-point plays from the 3-yard line
  rather than drives from the 25. Those plays **do not appear in the `drives` array at all** — the
  4OT game contains exactly four drives (two per team, from OT1 and OT2) and then jumps to
  `End of Game`. What the live `situation` object publishes during an OT3+ two-point shootout is
  **unverified**; no FBS game reached 3OT in the 2025 season to sample.

## Distance range

`distance` is not bounded by 10. Observed up to 25 (`2nd & 25 at TA&M 29` after a penalty).
The first-down line cannot cross the goal line: once the marker would reach it, ESPN switches to
goal-to-go and sets `distance` to the yards remaining, so a clamp is belt-and-braces rather than
load-carrying.
