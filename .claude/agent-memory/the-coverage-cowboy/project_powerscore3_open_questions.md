---
name: powerscore3-open-questions
description: PowerScore 3 boosts and liveExtras on 2026-10-03, which bugs have red tests, and the design questions still open
metadata:
  type: project
---

Verified 2026-10-03 on branch ps3/recorder. Spec: `temporary/powerscore3/analystSpec.md` §0-1. Tests: `packages/powerscore/tests/{boosts,contextBoosts,scoreGame,portability}.test.ts`, `packages/core/tests/{liveExtras,scoring}.test.ts`, real fixtures in `packages/core/tests/fixtures/liveExtras/`.

**Red tests left on purpose (no expected-failure convention in this repo):**
- core `a red card shown in stoppage time pays in full when it is shown`: scoreboard detail clock.value caps at 5400 in stoppage while the live clock parses 90'+6' as 96 min, so the fade starts 6 min old.
- core `keeps the bid through the break at the end of an inning`: "End Nth" leaves topOfInning undefined, so the no-hit boost drops to 0 for the ~2.5 min break ("Mid" still pays).
- core `a change after a quiet stretch is dated within a poll...`, `changes from before the scorer's window...`, `a lead change the scoreboard just saw scores as fresh...`: box samples are stored only on increases, so lastAt is the midpoint between increases, and with no sample in the window the baseline is the game's first sample.
- powerscore `a flip the snapshots saw keeps its own timestamp when the log counts one more`: the spec says the snapshot timestamp wins.

**Open, reported without red tests:** clinched-berth teams get full division-clinch credit (spec says half). Races can never fire for NBA, NHL or WNBA, because their standings carry no magic numbers or playoffPercent. NWSL seasonLength 26 is stale (teams have played 27). Each MLS conference's 1st-vs-2nd counts as a title line. Power-play side is never fed. emptyNet:true has never been seen live. Older items: appliesTo fallback switches, NaN poisoning, frozenScore switch rule, one-poll scoring lag.

**How to apply:** before testing here, check whether these are fixed. If a red test now passes, the fix landed. Confirm it, then update this note.
