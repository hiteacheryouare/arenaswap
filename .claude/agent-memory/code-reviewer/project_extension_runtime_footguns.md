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
- **`prefs.enabled` reaches the worker by three paths**: the `UPDATE_PREFS` handler, the `GET_STATE` reload (`loadStoredUserPreferences`, the recovery for a popup that persisted then closed before sending), and the `stateReady` load on every worker start. Any state that must be cleared "when the user turns switching back on" and is cleared only in `UPDATE_PREFS` goes stale via the other two. PR #213's `bossHushed` (storage.session) did exactly this — repro'd: hushed + enabled:true after a restart mutes the watched tab while switching runs. Safer shape: gate the flag on `!enabled` in the mute rule and clear it inside `syncManagedTabMuteState` when `enabled` is true. Also: `afterFetch` calls the mute sync every poll even while paused, so any "keep muted" rule re-mutes a tab the user unmuted by hand (Ryan confirmed that is intended for the boss hush).
- **`executeSwitch` checks nothing after its awaits and calls `syncManagedTabMuteState(true)` hard-coded.** `afterFetch`/`executePendingSwitch` test `prefs.enabled` once, then await 3-4 tab queries before the switch lands. Anything that pauses mid-flight (a boss press, the header switch) still gets one switch, and the `true` overrides the pause in the mute sync. Repro recipe: in `backgroundSession.test.ts`, have the `tabsQuery` mock fire `onCommandHandler('boss-button')` on the 2nd `{}` query of a poll. Fix: `if (!prefs.enabled) return` right before `tabs.update`, and pass `prefs.enabled`.

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

**`games`, `slateShedLeagues` and `leagueLastGoodAt` are in memory only.** None are written to
`storage.session`. `BackgroundStateSchema` parses the `GET_STATE`/`SCORES_UPDATED` *message*, not
storage, even though `packages/core/tests/persistedState.test.ts` frames its round trips as a worker
restart. A worker restart loses all three together and the startup fan-out rebuilds them, so they stay
consistent with each other. Don't credit a schema round-trip test as proof something survives a
restart; grep for the `storage.session.set` that would write it.
