---
name: racing-feasibility
description: Motorsport (F1/NASCAR/IndyCar) feasibility audit for PowerScore — ESPN API verification results, product verdict (not worth auto-switch integration yet), and the design deltas if ever pursued
metadata:
  type: project
---

# Racing/Motorsport Feasibility (audited 2026-08-03, ESPN racing API)

## Verdict: NOT worth building into the auto-switch PowerScore engine today
Two independent blockers, either one alone would be disqualifying:

1. **Cadence mismatch with the product's core mechanic.** ArenaSwap auto-switches among
   *simultaneous* live candidates. Racing has ~1 live event across all 5 leagues at any given
   time (F1 biweekly, NASCAR/IndyCar weekly, no overlap most weeks) — checked 2026-08-03 and the
   nearest events across f1/nascar-premier/nascar-secondary/nascar-truck/irl were ALL `pre`,
   3-13 days out. There's nothing to switch away to during a race, which defeats the premise.
2. **Live in-race data is unverified and likely thin.** See API findings below — every event
   sampled (including ones ESPN has fully "scrubbed") reports `liveAvailable: false`. What's
   confirmed rich is post-race classification data, not lap-by-lap live state. Could not verify
   real-time lap/position/gap/flag update granularity because no session was `in` progress
   during the audit window.

If pursued anyway: build it as a standalone opt-in "Race Mode" (position tracker + caution/
restart alerts), NOT folded into the same engine that competes for tab-switch priority against
basketball/football/etc. See [[powerscore_calibration]] for how the existing engine is tuned.

## ESPN racing API — what's actually there (verified via curl, 2026-08-03)

Sampled: NASCAR Cup at Indianapolis (event 202607260012, completed 2026-07-26), F1 Hungarian GP
Race session (event 600057440, competition 401839092, completed 2026-07-26), IndyCar Indy 500
(event 202605240106, completed 2026-05-24).

- **`gameSource` differs sharply by league** — this is the single most load-bearing finding:
  - NASCAR (nascar-premier): `{"id":"1","description":"basic/manual","state":"basic"}`. Several
    per-competitor stat fields are hard-zeroed even in a completed race: `fastestLap`,
    `tookLead`, `highPos`, `pitsTaken`, `lastPitLap` all `0`. The `gapToLeader` stat category
    exists but `stats: []` (empty) — gap-to-leader is not actually populated for NASCAR.
  - F1: `{"id":"3","description":"scrubbed","state":"full"}`. Real data: `behindTime` (gap to
    leader in ms, e.g. `15080.0` = +15.080s for P2), `pitsTaken` populated, `lapsLead`, `place`,
    per-competitor `status` sub-resource with typed states (`STATUS_CLASSIFIED` seen post-race).
    NASCAR competitor objects have NO `status` sub-resource at all (F1's does) — NASCAR doesn't
    even model per-driver live state (running/retired/pit) the way F1 does.
  - IndyCar (irl): competition-level stats populated well post-race (`cautionFlags: 7`,
    `cautionLaps`, `victoryMargin: 0.023` for the 2026 Indy 500) — closer to F1's richness than
    NASCAR's, but per-competitor `gapToLeader` behavior not fully checked.
  - **Implication:** the league most suited to PowerScore's excitement model (NASCAR, frequent
    lead changes) has the thinnest ESPN data feed; the league least suited (F1, processional) has
    the richest. That mismatch alone undercuts a "just do NASCAR first" plan.

- **Status schema (`/competitions/{id}/status`) is shaped for live tracking but unverified live**:
  fields are `period` (doubles as current lap — F1 final status showed `period: 70` for a
  70-lap race), `clock`/`displayClock`, and critically **`flag`** (observed value `"CHECKER"`
  post-race). The presence of a dedicated flag field strongly implies live values like
  `GREEN`/`YELLOW`/`RED`/`SC` exist in-session — this would be the caution/safety-car signal —
  but this is inferred from schema shape, not observed live, since no race was in progress
  during the audit.
  - `liveAvailable: false` was true for every single competition sampled, across all three
    leagues, including F1's fully-"scrubbed" Race session. That field name existing alongside
    a value that's always `false` (even in objects ESPN clearly re-processed with rich stats) is
    a yellow flag on its own — either ESPN never turns it on for racing, or it only flips during
    the live window and reverts after, which the audit couldn't observe either way.

- **No overtake/DRS event feed.** No field resembling a discrete "pass" or "DRS activation"
  event was found anywhere in event, competition, competitor, or statistics payloads. Anything
  needing overtake-attempt granularity (not just position-at-poll-time) would need a different
  data source than ESPN's public racing API (e.g., F1's own live timing feed).

- **Multi-session structure (F1 only):** each F1 "event" (a race weekend) contains 5 separate
  `competitions` — FP1, FP2, FP3, Qualifying, Race — each with its own id, date, and status.
  NASCAR/IndyCar events are single-session (just the race). Any adapter needs to filter to the
  Race-type competition specifically for F1, not just grab the first competition on the event.

## Architectural mismatch with the existing PowerScore model
The `Game` type (`packages/powerscore/src/types.ts`) is built around exactly two sides
(`homeTeam`/`awayTeam`, each `{ score }`), a fixed period/clock structure, and score-margin-based
closeness/momentum/leadChanges/comeback signals. Racing breaks nearly every assumption:
- N-way field (20-43 competitors), not two sides — no "home/away" concept at all.
- No score — ordinal position + time gap is the analog, and "margin" (closenessMargins tiers in
  `constants.ts`) would have to become "gap in seconds," which means something totally different
  per league (a 2s gap is safe in F1, closeable in one lap of NASCAR draft racing).
  - `zeroZeroAsFullTie`/`comebackThresholdBig` etc. as concepts DO translate reasonably (closing
    gap to leader ≈ comeback; on-track pass for P1 ≈ lead change) but need a from-scratch
    aggregation across N competitors, not a drop-in `SportTypeConfig` entry.
- Laps-remaining is an estimate (laps_remaining × avg lap time), not a hard countdown like
  `clockSeconds` — and F1 additionally has a hard 2-3hr time cap independent of laps remaining
  that the other leagues don't have to worry about.
- Caution/safety car is NOT equivalent to `intermission`/`delayed` (which zero the score) — a
  yellow flag suppresses passing (should suppress momentum, like the stall penalty in
  [[powerscore_stall_penalty]]) but the restart immediately after is peak excitement (should
  spike it). Existing stall-penalty logic has no concept of "this frozen state will produce a
  boost the moment it ends" — that's new.
- The most exciting on-track battle is often NOT for the lead (e.g. a 3-wide fight for P9) —
  PowerScore has never needed to scan across N entities for the best sub-battle; every existing
  sport's excitement is fully defined by the two registered sides.

## If ever pursued: per-league design deltas
- **F1**: gap-based closeness with tight bands (sub-1s ≈ DRS/passing range = high tension,
  1-3s = "in the hunt," >5s = processional/safe). Lead changes should be rare-event scored (not
  the basketball-style "multiple = max" threshold) and must exclude pit-cycle/undercut swaps
  (administrative position changes, not on-track passes) from the lead-change signal.
- **NASCAR**: pack-relative closeness (e.g. "cars within 1 lap of leader," field bunching) rather
  than gap-to-leader seconds — drafting means large chunks of the field run nose-to-tail. Lead
  changes need a much higher saturation threshold or a rate-based (per-N-laps) metric — pack
  tracks (Daytona/Talladega) can post 20-30+ lead changes in a single race, which would pin a
  basketball-tuned "multiple lead changes = max score" threshold constantly and make it useless
  as a signal.
- **IndyCar**: needs a track-type dimension the current `LeagueConfig` (one config per league)
  doesn't support — ovals behave like NASCAR-lite pack racing, road/street courses behave like F1
  (rare, strategic passes, push-to-pass windows).
- **All three**: final-lap / white-flag scenarios deserve a distinct spike (like a buzzer-beater),
  and a restart-window boost (~3-5 laps after caution clears) is probably the single highest-value
  new signal, since it's racing's most reliable recurring "must-watch" moment and has no
  stick-and-ball analog in the current model.

**How to apply:** If this is revisited, do NOT try to wedge racing into the existing
`SportTypeConfig`/`Game` shape — it needs a parallel `Race`/`RaceConfig` type and a separate
scorer path. Re-verify `liveAvailable` and the `flag` field's live values against an actual
in-progress session (poll during a real NASCAR Sunday) before committing to any of the above —
this audit only confirmed post-race data richness, not live update behavior.
