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
- **A failed poll never changes a league's mode** (`recordPollResult` runs only on success), and the
  mode tracker starts empty on every worker start and on every `startLeaguePolling`. So a league that
  is failing *from* a worker start is stuck `eager` for the whole outage. PR #204 (2026-10-09) capped
  failure backoff at the league's normal interval, which for eager-with-nothing-live is
  `pollMaxEagerMs` (25s): the cold-start IP shed, the most common refusal, gets almost no backoff.
  Any change to failure cadence has to be checked against "failing since startup", not only
  "was quiet, then failed". Also: a hebetudinous schedule expires after `pollLookaheadTtlMs` (6h) and
  the lookahead only runs after a success, so a long outage drifts an asleep league back to dormant.
- Request timeouts (`AbortSignal.timeout`, PR #204) start at `fetch()`, after `takeRequestSlot`, and
  are per underlying request, not per caller: a caller that joins a `dayRequests` dedup entry late
  inherits the remaining budget. Non-today days fall back to `dayCache`; today does not.
- **The Guide's wide fetch has exactly one throttle: `guideSlateAt` + `guideSlateTtlMs`.** The Guide
  page calls `GET_GUIDE_SLATE` on *every* `SCORES_UPDATED`, and `afterFetch` broadcasts that after
  every league tick, failed ticks included — every few seconds with many leagues on. `dayCache` never
  caches today (TTL 0) and a shed league has no cached days, so each un-throttled wide fetch costs
  ≥1 token per league plus the shed league's whole window. Any change that skips stamping
  `guideSlateAt` turns an open Guide into a refetch loop that drains the bucket the live polls share
  and feeds ESPN's volume-based 403s. PR #205 first did exactly that, then fixed it with
  `guideSlateHoldMs` (10 min full / 60 s after any refusal) plus `guideRetryAfter` for no-write
  refusals; only `force` (Guide Retry/Refresh) skips them. `guideSlateAt !== 0` also gates
  `mergeGuideSlate`. Still open: no in-flight dedup, so broadcasts during one slow cold wide fetch
  each start another (pre-existing; `dayRequests` only dedups same league-day).

**The fan-out `tick()` does not carry a refused league's games (measured on PR #208, 2026-10-09).**
Only the all-leagues-refused branch keeps `games`. With one league of several refused, `games` is
rebuilt from the leagues that answered plus `upcomingGames`/finals, so that league's live games
vanish, and any that were still `pre` at the last `refreshSlate` come back as **pre-game cards**,
because `upcomingGames` is never pruned when a game goes live (each caller just filters it by fresh
ids). `tickLeague`'s failure path keeps `games` untouched, so steady-state polling is fine. The
fan-out runs on every popup `fetchState(true)`: closing settings (`closeSetup`), the refresh button,
onboarding finish, plus `GET_STATE` with an empty list. #172's text assumed `tick` keeps games; it
does not. Fix shape: hold `games.filter(g => shed.has(g.league) && g.status === 'in')` and add their
ids to `freshGameIds` before filtering `upcomingGames`, the same "heldFor" idea `refreshSlate` uses.
**How to apply:** any feature keyed on `slateShedLeagues` (stale notes, banners) is only visible
until the user's next settings close or refresh tap unless this is fixed.

**Update: fixed in PR #208 (979f990b).** `tick()` now carries `heldLive` (refused league's `in` games)
and adds their ids to `freshGameIds`. Still open, pre-existing: the two `UPDATE_PREFS` rebuilds
(`games = [...games.filter(in), ...upcomingGames, ...]`) have no id mask, so a game that went live
after the slate, in a league refused during that `refreshSlate`, shows twice (live + pre) until the
league answers. Check any new `games = [...]` rebuild for the same id mask.
