---
name: review-popup-open-reveal
description: Facts worth reusing about the popup open reveal (gameCardReveal + the "Popup open reveal" block in global.scss) — measured type widths, the DOM nesting the specs do not reproduce, and the JS/SCSS timing duplication
metadata:
  type: project
---

Learned reviewing PR #138 (`popup-open-animation`, 2026-09-15). Verify against the code before
acting on any of it — this is a snapshot.

**Tricode type metrics, measured with fontTools against `apps/extension/public/fonts/DMSans.woff2`
instantiated at `wght=700`.** At the poster's `font-size: 3.4rem` (54.4px) with
`letter-spacing: 0.02em`, advance widths are: 3 letters 105–113px, 4 letters 156–160px (`ARMY`
159.9, `NAVY` 155.6, `MNST` 157.6), 5 letters 177–205px (`UCONN` 204.8). The poster's two tricode
boxes are `8rem` wide with centres `0.25 × cardWidth` and `0.75 × cardWidth` apart — 148px on a
296px card — so anything past ~4 letters collides at the seam. `Team.abbreviation` is passed
through from ESPN with no length cap (`packages/core/src/apiClient.ts:488`), and the repo's own
NCAA fixtures (`apps/docs/src/components/hero/heroGames.ts`) use ARMY/NAVY/MNST.
**How to apply:** any fixed-size type drawn from `team.abbreviation` needs a length budget, not a
3-letter assumption. Reach for fontTools rather than estimating; it takes 30 seconds.

**The Cypress harness nests the card differently from the popup.** `openReveal.cy.tsx` mounts
`GameCardReveal` as a direct child of `.popup-container d-flex flex-column`, which makes it a flex
item. In the real popup the chain is `.popup-container` → `<div className='mt-2'>` (gameSection) →
`<div key={league}>` (leagueRows) → `.game-card-reveal`, i.e. a plain block inside a plain block.
A flex item blocks margin collapsing; a plain block does not. So geometry specs written against
the harness can pass on a layout the popup never has.
**How to apply:** when a popup component spec pins box geometry, check the mount wrapper against
`mainView.tsx`'s real nesting before trusting it.

**Timing is duplicated between `cardReveal.ts` and `global.scss` with nothing tying them.**
`revealBaseDurationMs = 3400` appears as a literal `3400ms` five times in the stylesheet, plus
`3162ms` (the 93% handoff), `2650/2500/2580/2660/2740/2820ms` beats, and `revealSweepAngleDeg`'s
20.5 appears as two hand-written `skewX(±20.5deg)`. The jest spec only asserts the TS constants
against each other, which is circular. This is the same JS/SCSS coupling footgun already recorded
in [[review-popup-failure-map]], now at its largest instance in the repo.

**The reveal's own arithmetic, for future diffs:** `revealSettleMs = revealDelayMs(6, mode) +
revealDurationMs(mode)` = 3880ms full / 3104ms quick, and the per-card `done` timer is
`delay + revealDurationMs(mode)`, so the two agree *only* if every card mounts at the same moment
as `listReady` in `app.tsx`. The last content beat (`.game-card-ps-bar-row`, delay 2820 + duration
620) runs to 3440ms × rate, 40ms past the timeline the timer measures.

Related: [[review-popup-failure-map]], [[project-ci-and-enforcement]]
