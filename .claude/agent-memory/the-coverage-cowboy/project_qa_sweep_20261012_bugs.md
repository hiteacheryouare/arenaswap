---
name: qa-sweep-20261012-bugs
description: Bugs the 2026-10-12 QA sweep pinned as current behaviour (standby ignores/obeys cooldown, hockey shots on goal) and the .qa.test.ts convention
metadata:
  type: project
---

In the 2026-10-12 QA sweep (branch `qa-sweep`), the lead agent asked that bugs be pinned as **current behaviour**, marked
`// QA: current behavior is a bug — see report`, rather than left red. All new files were `*.qa.test.ts`. Report:
`temporary/qa-sweep/coverage-report.md`.

Pinned bugs:
- Standby entry ignores the cooldown, so a hand-picked quiet game gets yanked back to standby within ~90 s
  (`apps/extension/tests/backgroundStandby.qa.test.ts`).
- Standby exit obeys the cooldown that the park itself started, so a game that wakes up waits the whole cooldown. Same file.
- `fantasyBoxScore.ts` computes hockey shotsOnGoal as shotsTotal - shotsMissed, but shotsTotal already is SOG
  (`packages/sideline/tests/boxScoreFantasyLines.qa.test.ts`, real NHL fixture `nhlMlbBoxScores.qa.json`).

**Why:** if one of these tests goes red, the fix probably landed. Confirm it, then flip the assertion to the correct behaviour.

**How to apply:** this "assert current behaviour" rule was the lead's instruction for this sweep only. Outside a sweep,
[[feedback-coverage-setup]] still applies: leave proven bugs red.
