---
name: project-gameclock-decimal-discontinuity
description: OPEN BUG, one deliberately red jest test — parseClockToSeconds is discontinuous at 1, reading "1.0" as 1 second and "0.9" as 54 seconds
metadata:
  type: project
---

`packages/core/src/gameClock.ts` reads a single-part clock two contradictory ways: values below 1
are treated as decimal **minutes** (`0.75` -> 45 s), values at or above 1 as **seconds**
(`24.7` -> 24 s). A countdown clock ticking `1.0` -> `0.9` is therefore read as 1 s -> **54 s**,
which is impossible for a clock that only decreases.

**Why:** the two halves cannot both be right. If single-part values are seconds then `0.9` is 0,
not 54. If they are minutes then `1.5` is 90, not 1. Proven by dichotomy, so it does not depend on
knowing ESPN's convention — which is good, because **nothing captured anywhere in this repo has a
single-part decimal clock in it**. Settling which half is wrong needs a real ESPN capture of an
NBA/NFL sub-minute clock.

**How to apply:** the damage is the clock on screen, not the ranking. `computePowerScore` moves
only 2 points (68 vs 70) because the late-game signal is near its ceiling either way, but the
reason string becomes `0:54 left, 2-point game` and the card prints `0:54` when there is nine
tenths of a second left — at the single most dramatic moment the product exists to catch. Do not
"fix" it by clamping one branch without a captured payload; pick the interpretation the wire
actually uses.

Red test (left failing on purpose, matching the repo's `// FAILING ON PURPOSE.` convention):
`packages/core/tests/liveClock.test.ts` -> `the clock never reads higher as it winds down`.

Re-run: `cd packages/core && npx jest --selectProjects unit --testPathPatterns liveClock`

Negative and hex inputs (`-5:30` -> -270, `0x10:00` -> 960) are also unclamped, but are unreachable
from ESPN and are pinned as characterisation in the same file rather than treated as bugs.

Related: [[project-cooldown-restart-bug]], [[feedback-coverage-setup]]
