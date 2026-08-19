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
