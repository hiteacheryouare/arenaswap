---
name: audit-20261024
description: 2026-10-24 audit + "fix everything" pass — what was closed, the red tests left on purpose, and what is still open
metadata:
  type: project
---

Baseline 2026-10-24 on dev: six Jest workspaces green (3,149 tests). Same day, Ryan said "fix everything" and approved source changes for the drift fix and message typing (asked first via AskUserQuestion; he skipped the real-browser smoke suite).

**Closed that day:**
- Fully drifted league: `fetchScoreboard` in sideline `apiClient.ts` now throws when every event drops, so the league is shed → stale, not dormant. Tests in `espnDrift.test.ts` ("a league whose every event is unreadable").
- Message protocol: every `sendMessage` literal has `satisfies ExtensionMessage`; `cypress/support/fakeBrowser.ts` switch is exhaustive (`never`). Proven by renaming a type: background, sender and fake all fail typecheck. `popupFooter.jsx` is JS and stays untyped.
- Real scoreboards: `packages/sideline/tests/fixtures/scoreboards/*.json` (one live event per sport, with `source`) + `tests/e2e/realScoreboards.e2e.test.ts`.
- Locale parity: `apps/extension/tests/localeParity.test.ts` (keys, placeholders, blanks; split-sentence fragments with edge whitespace may be blank — ja/ko `stepToggle.bodyBeforeOn`).
- Confetti journeys: `cypress/e2e/favoriteConfetti.cy.ts` (canvas pixels + chunk intercept).
- powerscore-tools: jest.config.cjs + tests/ + `fixtures/playByPlay/` (London NFL, Kings–Lakers Q3–Q4); `test` script + jest devDeps added, so it runs in npm test.

**Fixed later the same day (main session):** calibration now includes `blendSteps`; flagged runs split at excluded intervals; backfilled stamps (plays in one period spanning >60s of clock under one wallclock) end an `unrecorded` interval the scorer always leaves out (3 NBA preseason gaps, 71 of 521 NBA dead minutes; zero elsewhere); an unknown `state` is inferred from `completed` then period (>0 live, 0 upcoming), a missing state drops the event (not counted as drift).

**Still open:** No real-browser extension test.

Coverage blind spots that are NOT gaps: guide `useEdgeClipping` (guideGrid.cy), `useToast` (settings.cy), ui `gameCardShared` (tested from apps/extension).

Related: [[project-core-verification-risks]], [[feedback-coverage-setup]]
