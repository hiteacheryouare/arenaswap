---
name: powerscore3-open-questions
description: PowerScore 3 (scoreGame/modes) design questions found while verifying it on 2026-10-03, none proven as red tests yet
metadata:
  type: project
---

Found while writing `packages/powerscore/tests/{scoreGame,portability}.test.ts` and `packages/core/tests/scoring.test.ts` (2026-10-03, branch ps3/recorder). All suites green; these were reported, not tested red.

- `appliesTo` fallback to Classic still applies `options.disabledSignals` (the custom mode's ids) instead of `classicDisabledSignals`, so a fallback game and a floored game on the same slate get different Classic switches. Latent while `fantasy`/`blowouts` alias Classic.
- A custom signal or boost returning NaN poisons the total: `clamp`/`Math.max` pass NaN through, unlike options and win probability, which are scrubbed.
- `frozenScore` marks signals disabled from the raw list, ignoring the rule that switching every signal off switches none off.
- background.ts scores before appending the poll's snapshot, so momentum, comeback and lead changes lag one poll (a tying TD scored 69, then 100 on the next poll).
- The future-dated `lastSwitchTime` freeze ([[cooldown-restart-bug]]) now lives in core `chooseSwitchTarget`. I didn't add a second red test for it.

**How to apply:** check whether these are fixed before you write tests in this area. If Ryan decides one is a bug, prove it with a red test.
