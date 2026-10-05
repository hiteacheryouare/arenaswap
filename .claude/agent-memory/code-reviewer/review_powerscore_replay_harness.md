---
name: review-powerscore-replay-harness
description: Traps in scripts/powerscore (recorder + replay + blind labels) — tie-break luck in hit@1, dist/src engine mix, non-self-contained hourly files, recorder lifecycle, describe.ts inning-break text
metadata:
  type: project
---

Checked 2026-10-04 against the slates a–d scorecard. A probe that bundles the replay's own modules
into the scratchpad (rolldown → node) reproduces the reported numbers exactly and runs in ~6 s, so
measuring a finding's effect is cheap; do it instead of arguing about it.

**Why:** these scripts decide PowerScore tuning, and their failure modes move the headline numbers
by as much as the tuning does, without any test noticing.

**How to apply:**

- **Integer totals tie at the top.** `toSorted` (stable, league-insertion order) picks the first of a
  tie for hit@1; `chooseSwitchTarget`'s reduce picks the last. On a–c this swung v3 Classic by up to
  2.6 points (67.3% current vs 64.7% if ties count as misses), the same size as the tuning gain. Any
  new metric or tuning claim: check tie sensitivity first.
- **The replay bundle holds two engines:** `packages/powerscore/dist` (through core's
  `import 'powerscore'`: sportTypeConfigMap, computeFantasyPoints) and `packages/powerscore/src`
  (scorers/session). Tuning a constant core reads, then replaying without rebuilding powerscore,
  gives a hybrid. Compare dist mtime with the last src change.
- **Hourly recordings are not self-contained.** `unchanged` ids point at earlier files, so replaying
  one day folder or one file drops games that sat unchanged (24 min of an NHL intermission seen).
- **The recorder runs as a child of the Claude session** (npm → zsh → claude). Session teardown sends
  SIGTERM; the handler closes the gzip cleanly, so nothing is lost, but the recording stops.
- **Labels are UTC ISO strings with exact frame timestamps**, so the 90 s window and time zones were not
  the problem. The first 20 min after a recorder start are cold (no history), and slate a's labels
  start 40 s in.
- describe.ts: ESPN sends `Mid`/`End` innings as STATUS_IN_PROGRESS with outs 0 and empty bases, so
  the blind timeline shows "B5 --- 0out" / "5 --- 0out", not a break.

See [[review-powerscore-failure-map]], [[history-window-footgun]].
