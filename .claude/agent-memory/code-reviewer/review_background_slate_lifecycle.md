---
name: background-slate-lifecycle
description: refreshSlate runs on every worker start (never on a timer) and now costs one ESPN request per Eastern day per league; only tickLeague polls, and two empty polls is all it takes to walk a league quiet
metadata:
  type: project
---

In `apps/extension/entrypoints/background.ts`, non-demo polling is **per league only**:
`startLeaguePolling` → `setTimeout(tickLeague)`. `tick()`/`refreshScores` (the whole-slate refresh)
runs at worker startup and on a popup `forceRefresh`. `refreshSlate()` — the only caller that passes
`includeUpcoming: true` — runs at startup and inside the `UPDATE_PREFS` handler. It is never
scheduled.

**Startup is not rare.** `stateReady.then(...)` sits at the top level of `defineBackground`, so
`refreshSlate()` → `refreshScores(false)` → `startLeaguePolling()` re-run on **every** service-worker
start, and it `await`s them in that order — nothing reaches the popup until the slate sweep finishes.
There is no `browser.alarms` anywhere (see [[project-extension-runtime-footguns]]), so a quiet worker
is torn down and woken by user events instead.

**Since 2026-09-16 a window is a list of Eastern days, one ESPN request each** (`buildDayWindowKeys`
in `packages/core/src/apiClient.ts`); ESPN now 400s every ranged `dates=` in all 31 leagues. So
`refreshSlate` costs `(upcomingGamesDays + 3)` requests per league — ~310 at the defaults, ~530 at
`upcomingGamesDays: 14` — against 62 for the two-leg version, all paced by the 16-token/10-per-second
bucket. An in-memory `dayCache` (module scope, keyed `league:day`) pays for it and dies with the
worker.

**How to apply:**

- Anything that has to survive across polls: ask (1) is it populated *only* by `refreshSlate`? then
  it is a snapshot from worker start. (2) does `tickLeague` re-derive it, or does it fall into
  `otherGames = games.filter(g => g.league !== leagueId)` and get carried untouched? `absorbFinalGames`
  and the poll's own live window do restore today's finals and kickoffs, which is what makes
  `fetchLeagueGames` tolerating a failed *today* on a wide window safe.
- **`pollDormantThresholdPolls` is 2.** Two consecutive polls with nothing live is the whole budget,
  so any path that can hand `tickLeague` a stale or empty live board — even for a minute — walks the
  league to a 2–3 minute cadence or asleep while games are on. Weigh "briefly stale live data"
  findings accordingly; this is not a cosmetic class of bug in this repo.
- Any new per-league or per-day in-memory cache in `packages/core` should be checked against the
  MV3 worker lifetime before its comment is believed. The 2026-09-15 entry moved the team marks out
  of a module-scope `let` into `storage.local` for exactly this reason; the day cache reintroduced
  the pattern one commit later.
