---
name: review-win-probability-sources
description: Win probability has two sources after PR #212 (scoreboard tracker, persisted; summary line, in-memory) — check precedence, seeding, and which "seen" flags survive restarts and demo toggles
metadata:
  type: project
---

PR #212 (issue #168, reviewed 2026-10-09) added `packages/core/src/scoreboardWinProbability.ts`: a
per-play tracker fed from the scoreboard's `situation.lastPlay.probability` for NFL/NCAAF, persisted to
`storage.session` as `scoreboardWinProbHistory`. The summary line (`winProbHistory` in background.ts)
is still in-memory only, and the summary is skipped once `summaryStillNeeded` says so.

**Why:** the variance boost (`computeWinProbVarianceScore`) averages |p − 0.5| over the *whole* line it
is handed (min 5 points, ±5 range), so whichever source wins precedence decides the boost. A short
line that starts mid-game scores a different game than the full one.

**How to apply:**
- `tracker.historyOf(id) ?? winProbHistory.get(id)` lets a one-reading tracker line shadow a full
  summary line that was fetched the same minute (fresh session, extension reload, league enabled
  mid-game). Look for the summary line being adopted into the tracker when longer.
- `liveExtras` state (`summarySeen`, pregame line, fantasy baselines) is in-memory and is NOT reset on
  demo toggle, while `winProbHistory`/tracker are cleared — so "already seen" flags can outlive the
  data they gate. Check every new skip-gate against the demo on→off path.
- "Has scoreboard readings" means "ever had", not "this poll had": a scoreboard that stops sending the
  value freezes the line with the summary switched off.
- Basketball was deliberately left on the summary because `readBoxLeadChanges` rides it.
- All three were fixed before merge (5c28f9bd): `tracker.adopt()` takes a longer summary line only
  for games the tracker already holds, the gate is `winProbHistory.has(id)` plus "this poll carried
  a value", and pruning is skipped when `games` is empty. Over-pruning is cheap now, since a dropped
  line comes back through adopt on the next summary. Re-check this if either gate changes.

See [[project-extension-runtime-footguns]], [[review-powerscore-failure-map]].
