---
name: project-extension-runtime-footguns
description: Recurring risk areas in the ArenaSwap MV3 background worker — session-storage growth, history hydration, and the mute-state ledger
metadata:
  type: project
---

Areas of `apps/extension/entrypoints/background.ts` that have repeatedly needed fixing and are worth reading closely on any change near them.

**Why:** the MV3 service worker is torn down whenever it goes idle, so every piece of in-memory state either has a session-storage mirror or a bug. Several rounds of fixes (tab-mute ledger, closed-tab reconciliation, pending-switch re-validation) exist because of this.

**How to apply:**
- `history` / `powerScoreHistory` (score + PowerScore snapshots) are **never evicted for games that have finished** — only cleared on hydrate. `persistHistoryToSession()` re-serializes *both maps in full* on every league tick. Any change that raises per-game retention multiplies a per-tick serialization cost and pushes toward the `storage.session` quota. Check retention math before approving a window/cap increase.
- `hydrateHistoryMaps` runs before the first fetch, so it has no `Game` to read a per-sport window from and falls back to the global default. Per-sport history windows therefore do not survive a worker restart. Re-trimming later cannot restore data already dropped at hydrate.
- `computePowerScore` derives "now" from the newest snapshot in the array it is handed, not wall-clock. Stale hydrated history is scored as if current; `updateHistory` only trims *after* scoring in `afterFetch`.
- `mutedTabIds` is a ledger of tabs ArenaSwap muted, mirrored to session storage. Anything that changes which tabs are "managed" (registry, standby tab, `standbyStreamEnabled`, master toggle) must go through `syncManagedTabMuteState` or it will strand a user's tab silently muted.

**Timer-chain discipline is the recurring MV3 bug shape here — and the repo contains both the right
and the wrong version side by side.** `scheduleLeagueTick` keeps one timer per league in a Map and
always clears before setting, so no amount of concurrent rescheduling can produce two chains.
`scheduleWinProbabilityPolling` (added PR #18) does not: its `run()` unconditionally reassigns
`winProbTimer` after `await refreshWinProbabilities()`, so (a) `stopWinProbabilityPolling()` cannot
cancel an in-flight sweep — `clearTimeout` no-ops on an already-fired timer — and (b) scheduling
during a sweep sets a timer that the resolving `run` then overwrites *without clearing*, orphaning it
into a second live chain. Toggling demo mode while a sweep is in flight permanently adds a chain,
each issuing one ESPN summary request per live game per minute.
**How to apply:** for any new `setTimeout` self-rescheduling loop in the worker, check that stopping
it is possible mid-await (a generation counter or a `stopped` flag), and compare against
`scheduleLeagueTick`. Also note all scheduling here is `setTimeout`/`setInterval` with **no
`browser.alarms` anywhere** and no alarms permission — the 2-3 minute dormant interval
(`pollDormantMinMs/MaxMs`) is far longer than Chrome's ~30s idle worker teardown, so those timers are
unreliable by construction. Pre-existing (present on `mega`), self-healing because every worker start
re-runs `startLeaguePolling()`; raise it as a standing design gap, not as a regression.
