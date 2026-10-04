---
name: project-powerscore3-docs
description: PowerScore 3 docs pass (2026-10-03): which content pages were rewritten, the source-of-truth conflicts found, and rulings made
metadata:
  type: project
---

Docs content (apps/docs/src/content/docs) was rewritten for PowerScore 3: powerscore/{signals,boosts-and-penalties,types,api-reference,configuration,getting-started,scoring-a-game}.md plus new extension/scoring-modes.md (order 6; settings 7, demo 8, troubleshooting 9) and the Scoring table in extension/settings.md.

- Package examples were verified by running `packages/powerscore/dist/index.js` (dist is current). Do this again for any numeric example.
- No data-source name anywhere, including the `espnPath` identifier: the league table drops that column and prose says "fields ArenaSwap uses for its own fetching".
- Extension postseason boost default is 8 (core constants), the old settings page said 5.
- README.md for powerscore says Upset Rout needs "more than two scores"; code uses `closenessMargins[2]` (the fringe margin). Docs follow the code.
- Settings UI was mid-build, so settings are described by effect, not control labels.

**Why:** pages cross-link by heading anchor; renaming a heading breaks links across files. **How to apply:** grep for `docs/powerscore/<page>/#` before renaming any heading, and finish with `npx --no-install astro sync` in apps/docs.
