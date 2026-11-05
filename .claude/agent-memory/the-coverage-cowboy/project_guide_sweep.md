---
name: project-guide-sweep
description: Guide sweep 2026-11-04 - where bar/axis geometry bugs live (buildBar, recordGameEnds, period 0 progress) and test traps
metadata:
  type: project
---

Report: `temporary/uiSweep/guide.md`. 7 reds: tests/guideGeometry.test.ts (6) and guideTimeEdges.cy.tsx (1).

Causes: buildBar ends an unseen final at its estimate even in the future; computeGameProgress gives football period 0 = 0.25 (real STATUS_DELAYED ncaaf 401868347); recordGameEnds stamps discovery time and a suspended soccer game (STATUS_SUSPENDED arrives as state post, laliga 401882849).

**Traps:** Guide containment fixtures must use realistic bars (live start = now - progress*run); a live game starting in the future gets a 24px bar and floods false escapes. Click `.guide-bar-content`, not `.guide-bar-shape` (covered). jest needs `--runTestsByPath` or it runs all suites. Recordings: scoreboard lines have `events` and `ts`; real status names include STATUS_DELAYED and STATUS_SUSPENDED (state post).

Related: [[project-ui-safety-net]]
