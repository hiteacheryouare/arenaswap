---
name: project-livepowerscores-duplicated-helpers
description: Both formerly-red soccer specs now pass, but the clock *format* is still divergent (page prints 95:00 where the popup prints 95') and a third spec is now red on it
metadata:
  type: project
---

`apps/docs/src/components/LivePowerScores.tsx` used to reimplement two helpers the project already
had, and both copies had lost the soccer cases. Fixed 2026-09-21: `formatPeriod` now comes from
`@arenaswap/ui/src/components/periodFormat` and `parseClockToSeconds` from
`@arenaswap/core/gameClock`.

**Verified 2026-09-21** against a real `astro build` (into a scratch `--outDir`) served through
`ARENASWAP_SITE_DIR`. `apps/docs/cypress/e2e/liveBoardSoccer.cy.ts` — both previously-red tests —
now pass, and the whole docs e2e suite is 82/82 green.

**Still divergent — and as of 2026-09-21 a spec is red on it.** Only *two* of the three duplicated helpers were shared.
`LivePowerScores.tsx` still carries its own `formatClock` (~line 149), which is soccer-blind. The
extension uses `formatGameClock` in `packages/ui/src/components/gameCardShared.tsx`, which renders
soccer as `${Math.floor(cs / 60)}'`. So a 95th-minute match prints **`95:00` on the site and `95'`
in the popup** — the exact parity complaint the red spec's header was written about. The original clock test only
asserted `not.contain.text('0:00')`, so `95:00` satisfied it and it went green without the parity
actually holding. A third test — `prints the soccer clock in the notation the extension prints` —
now asserts `95'` and `105'` directly and is **red on purpose**. Docs e2e is 83 tests, 82 passing.

The clean fix is to move `formatGameClock` next to `formatPeriod` in `periodFormat.ts` and have the
island call it.

**Bundle side effect:** importing `periodFormat` drags `@arenaswap/core/constants` (~973 B gzipped)
onto the marketing page, where nothing uses it — see [[project-core-package-json-inlined]].

Related: [[project-docs-site-metrics]], [[project-docs-coverage-harness]],
[[project-gameclock-decimal-discontinuity]]
