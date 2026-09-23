---
name: history-window-footgun
description: Score and PowerScore history in background.ts is trimmed to a 5-20 min rolling window, so any feature assuming a full-game history is dead on arrival
metadata:
  type: project
---

`background.ts` trims both `history` (scores) and `powerScoreHistory` on **every poll** via
`trimSnapshots(snapshots, now - getHistoryWindowMsForGame(game))`. The window is per sport, from
`powerscore`'s `sportTypeConfigMap[...].historyWindowMs`:

| sport | window |
| --- | --- |
| basketball | 5 min |
| baseball / football / softball | 12 min |
| hockey | 16 min |
| soccer | 20 min |

`hydrateHistoryMaps` also re-trims to `maxHistoryWindowMs` (20 min) on worker wake, and the popup
reads these already-trimmed maps out of `BackgroundState`. There is no long-form history anywhere.

**Why:** it is a live switching signal, not an archive; unbounded arrays would fill session storage.

**How to apply:** any code that reasons about a history *spanning* a game — "does this chart cover
the whole game", "when did this game start according to history", "replay the game's arc" — is
provably false in production, however well its unit tests pass. Unit tests that build snapshots at
fractions of a game's length fabricate data the runtime cannot produce. This exact trap shipped in
the keep-finished-games PR (`wrapCoverage.ts` / `coversWholeGame`), where 13 green unit tests and 3
green Cypress tests gated three charts behind a condition that can never be true.
See [[review-powerscore-failure-map]] and [[project-extension-runtime-footguns]].
