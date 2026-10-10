---
name: review-baseball-situation-timing
description: When ESPN's MLB situation fields actually appear (dueUp only between half-innings, never beside atBat), End-of-inning topOfInning is undefined, and the recordings to check any ESPN shape against when nothing is live
metadata:
  type: project
---

Measured 2026-10-09 (PR #206 review) over every live MLB frame in `scripts/powerscore/recordings/` (2026-10-03..09):

- `situation.dueUp` (always 3 entries) appears at `Mid`/`End` and at the start of a half before the first batter. It is **absent in ~4,150 of ~4,160 frames that have a batter**. `batter`/`pitcher` (so `Game.atBat`) are absent between innings. So the at-bat panel and a due-up list are effectively mutually exclusive; a fixture or test with both is a state the runtime does not produce.
- Each dueUp entry carries `athlete.team.id`, `batOrder` (wraps: 8, 9, 1), `period`, `summary` ("0-0" at the top of a game).
- `parseTopOfInning`: `Mid` → false (home bats next, correct), but `End` → **undefined** (only `inningEnded: true`). Anything colouring "the batting team" from `topOfInning` goes neutral at every End frame; away bats next there.

**Why:** PR #206 shipped docs, CHANGELOG and a placement test built on the opposite assumption ("absent between innings"), because the issue text said dueUp was "on every poll".

**How to apply:** when a PR claims when an ESPN field is present, check it against the recordings instead of the issue text. Recordings are gzipped JSONL (`{"t":"scoreboard","league":...,"events":[...]}`); the newest hourly file is still being written, so catch `EOFError`. Parse frames through the PR's own code with `parseScoreboardEvents` from the worktree's `packages/core/dist/index.js` (check dist contains the change first). Related: [[review-powerscore-replay-harness]], [[history-window-footgun]].
