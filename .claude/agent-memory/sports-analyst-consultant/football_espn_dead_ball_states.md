---
name: football-espn-dead-ball-states
description: Every ESPN gridiron situation state where down/distance/yardLine are stale, wrong or garbage — the gate a field-position diagram must apply before drawing
metadata:
  type: project
---

Verified against live ESPN payloads on 2026-09-04. Companion to
[[football_field_position_model]].

## The gate

Draw the full diagram only when **all** of these hold:

```
typeof down === 'number' && down >= 1
typeof distance === 'number' && distance >= 0
possessionText is a non-empty string
shortDownDistanceText is a non-empty string
```

`down` alone is not a gate, and `down` is not consistent between leagues.

**Why:** each failure below was observed in live data, not inferred.

## Observed failure states

| State | What ESPN sends |
|---|---|
| NFL kickoff (play data) | `down: 0, distance: 0`, all text fields `null` |
| NCAAF kickoff (play data) | `down: 1, distance: 10`, all text fields `null` — reads as a legitimate 1st & 10 |
| Timeout / two-minute warning (scoreboard) | `down: 0`, `possession` absent, all text `null`, `yardLine` stale but still correct |
| After any scoring play (scoreboard) | `down: -1, distance: -1`, `possession` absent, `yardLine` **garbage** |
| Official Timeout (NFL play data) | `downDistanceText` corrupted — a snap that was truly `1st & Goal at KC 1` was published as `1st & 1 at KC 1` |
| End of Period / End of Game | stale down/distance, `yardsToEndzone: 0` |

`yardLine` after a score is contradictory between games: a home FG produced `35` (home-anchored)
while a home TD+XP produced `65` (a relative "kicking from own 35"). Never draw at `down <= 0`.

`isRedZone` also drops to `false` during timeouts while the ball is still on the opponent's 16.

## `yardsToEndzone` is unreliable — derive it

29 of 186 plays in the NFL sample (15.6%) sent `yardsToEndzone: 0` on a snap that was nowhere near
the goal line. Compute it from `yardLine` and possession instead.

## `possession` goes missing on the snap after a kickoff

Observed on 2 of 24 otherwise-valid live states, and it is systematic rather than random: the first
snap of a drive following a kickoff carries valid `down`, `distance` and `possessionText` but **no
`possession` key at all** (`lastPlay.type.text === 'Kickoff'`).

**How to apply:** cache the last non-null `possession` per game, or infer the receiving team from
`possessionText` on a post-kickoff `1st & 10`. Do not let the first-down line disappear after every
kickoff.

## `down` can lag a change of possession

Verified case, FRES @ USC, Q2 2:24 on 2026-09-04. Mandal was sacked and fumbled on 3rd & 3; USC
recovered. The true state was **USC, 1st & 10 at FRES 38**. For roughly seven seconds (two
consecutive polls) the scoreboard published `possession: 30` (USC, correct), `yardLine: 62`
(correct), `possessionText: 'FRES 38'` (correct) and `down: 4, shortDownDistanceText: '4th & 10'`
(**wrong** — carried over from Fresno State's series).

Geometry survived because `distance` was 10 either way; only the down label was wrong.

**How to apply:** treat `down` as the least trustworthy field. Do not latch state, fire animations,
or trigger PowerScore effects on a down transition without confirming it across two polls.

Related: ESPN's play `type.text` is also unreliable here — that turnover was typed
`Fumble Recovery (Own)` even though the defense recovered.

## `lastPlay.drive.start.yardLine` is `0` on a freshly-started drive

Observed in three separate live games simultaneously. ESPN publishes `drive.start.yardLine: 0` with
`drive.start.text: '<HOME> 0'` for the first snap or two of a new drive, before the real starting
spot is filled in:

```
STAN (home) poss, curYl 40, driveStart 0, description '1 play, 5 yards, 0:06'
USC  (home) poss, curYl 62, driveStart 0, description '1 play, 9 yards, 0:07'
```

The description is truthful; the coordinate is not. A drive bar drawn from `driveStartYardLine`
would run 40 yards for a drive that gained 5.

**How to apply:** reject `driveStartYardLine` when it is exactly 0 or exactly 100. A real drive
starts at the 25/30/35 after a touchback, or at a recovery spot reported as 1/99 — never 0/100.
A `gained > 0` guard does **not** catch this, because the bogus value inflates the gain rather than
inverting it.

## `lastPlay.team.id` semantics

Matched `possession` in every live sample where both were present, including a turnover
(`Fumble Recovery (Opponent)` -> the recovering team) and a `Kickoff` (-> the receiving team, not
the kicking team). It is a reasonable fallback for direction while the ball sits still.

Two cautions:
- After a scoring play it names the team that just scored, who are about to **kick**, not receive.
  Harmless only because `down: -1` should already be blocking the draw.
- In summary play-by-play, `team` is **absent** on every Timeout and Kickoff play, so the scoreboard
  and the play feed disagree about this field.

`down` and `lastPlay` are not synchronised with each other or with `possession`. A second turnover
sample showed `down` already advanced to 2 while `lastPlay` still described the fumble recovery —
the opposite lag direction from the FRES @ USC case above. Assume any one of the three can be a
poll or two stale.
