---
name: project-test-speed-lab
description: 2026-11-17 npm test speed lab - memory not CPU is the wall on Ryan's 18 GB Mac; what won, what lost, how flakes do and don't reproduce
metadata:
  type: project
---

`npm test` speed lab, 2026-11-17. The full lab report was left in Ryan's checkout at `temporary/testSpeed/REPORT.md` (gitignored, may be gone).

- Default turbo concurrency (10) ran every Cypress group at once, ~2 GB each; Ryan's Mac idles with ~10 GB swap already used, so it thrashed: 790 s with 7 timing failures, and once a group hung for 25 min. `"concurrency": "5"` in root turbo.json fixed it (307 s on unchanged tests).
- Turbo's start order among equally-ready tasks is effectively random per run, so the biggest single group decides the bad-luck wall. Balance groups (keep each under ~90 s at concurrency 5) rather than trying to order them.
- Winners also kept: refilling sideline's request bucket in the component `beforeEach`, `experimentalSingleTabRunMode`, fake timers for the sideline fan-out tests.
- Losers worth not retrying: Electron browser (slower, deprecated in Cypress 16), CYPRESS_NO_COMMAND_LOG, numTestsKeptInMemory=0, Chrome GPU / frame-rate flags, waitForAnimations=false (breaks guide drawer specs), traced-import turbo inputs (only 14% fewer reruns).
- CPU burners (`yes` x 30-40) do NOT reproduce the jest backgroundSession or openRevealCrestless flakes; the Cypress one needs a competing Chrome (it shows up in full runs, ~2 in 14).

**Why:** future speed work should start from these measurements instead of re-buying them.
**How to apply:** check the losers list before proposing a test-speed idea; measure with `--force --continue` and read `.turbo/runs/*.json` for per-task timings.
