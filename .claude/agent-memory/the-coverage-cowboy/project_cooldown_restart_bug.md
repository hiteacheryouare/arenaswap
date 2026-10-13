---
name: cooldown-restart-bug
description: FIXED — the future-dated lastSwitchTime freeze; readStoredSwitchTime now clamps it and the once-red test is green
metadata:
  type: project
---

The cooldown-across-restart bug and its successor (a future-dated `lastSwitchTime` freezing switching)
are both fixed: `readStoredSwitchTime` in `background.ts` rejects anything negative or later than now.
`backgroundSession.test.ts` -> `does not freeze switching when the stored switch time is in the future`
was green on 2026-10-12, and the whole extension unit suite was green at the qa-sweep baseline.

**How to apply:** a red test in that file is now a real regression, not the known bug.

Related: [[qa-sweep-20261012-bugs]]
