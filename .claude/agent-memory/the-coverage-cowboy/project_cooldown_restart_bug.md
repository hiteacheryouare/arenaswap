---
name: cooldown-restart-bug
description: One Jest test in apps/extension is red on purpose — a lastSwitchTime from the future freezes auto-switching for the whole clock skew
metadata:
  type: project
---

`apps/extension/tests/backgroundSession.test.ts` carries one test that is **red on purpose**:
`does not freeze switching when the stored switch time is in the future` (around line 230).

The original form of this bug — `lastSwitchTime` living only in the worker closure, so an MV3
teardown handed back a free switch — **has been fixed**: the value is now written to
`browser.storage.session` alongside the rest of the switching state. The fix opened the successor
bug this test proves. `Number.isFinite` rejects a string and lets a number through, but a timestamp
from the future is a finite number, and session storage now carries it across every worker restart
instead of losing it on the next teardown. A clock that ran fast when a switch was recorded refuses
every switch for the whole hour of skew, and nothing in the UI says why.

**How to apply:** if a run reports "1 failed" in the extension unit suite, check whether it is this
test before treating it as a regression. Observed still red on 2026-09-21. Ryan fixes source bugs;
the agent proves them — do not soften it.
