---
name: review-popup-failure-map
description: Fragile spots in apps/extension/entrypoints/popup — fixed 320x560 geometry, the one unvalidated ESPN boundary, which element actually scrolls, JS/SCSS duration coupling, cypress stubs
metadata:
  type: project
---

Characteristic risk areas in the extension popup, worth checking on every review that touches `entrypoints/popup/components`:

- **`.popup-root` is a fixed 320x560** (`assets/bootstrap.scss`). Components sometimes hardcode pixel geometry derived from that box (e.g. a bloom-animation origin of `160, 181`). The width is safe; any hardcoded *vertical* offset is not, because a longer translated title wraps and pushes everything below it down. Prefer `getBoundingClientRect()` on the element being anchored to.
- **Animation durations are duplicated** between component constants and `assets/global.scss` keyframes (e.g. `BLOOM_IN_DURATION = 450` vs `animation: psBloomIn 0.45s`). A JS state machine driving a CSS animation by `setTimeout` desyncs silently if only one side is edited.
- **Mock/demo components hand-copy the game-card markup** instead of rendering `packages/ui/src/components/liveGameCard.tsx`. Each copy is a place where labels and layout drift from the real card. Same principle as the site demos: prefer rendering the real component.
- **The popup re-renders on pushed `SCORES_UPDATED` messages** (`app.tsx` → SWR `mutate`), with each enabled league on its own stagger inside a 15s `pollIntervalMs`. So any `useEffect` whose deps include an inline parent callback can have its timer restarted at unpredictable moments. Watch for close/dismiss timers gated on `[state, onCallbackProp]`.
- **`useSummaryData.ts` is the popup's one unvalidated ESPN boundary.** `apiClient.ts` zod-parses and defaults everything it returns, but `useSummaryData` fetches the ESPN `summary` endpoint and *casts* (`data?.seasonseries as SeriesInfo[]`, `parseTeamRecords(data, ...)`). Every `seriesInfo` / `records` consumer (`seriesDots`, `detailHero`, `detailPosterHero`) is therefore reading shapes nothing checked — that is where to look for unguarded property hops in detail-view diffs.
- **`.popup-container` (`packages/ui/src/_popup.scss`) is the scroll container** — fixed 320x560 with `overflow-y: auto`. Sticky headers and `IntersectionObserver({ root })` in the detail view depend on this; it is *not* `.popup-root`, which does not scroll.
- **A root `ErrorBoundary` wraps `<App/>`** (`entrypoints/popup/main.jsx`). A render throw yields a crash screen rather than a blank popup, so "unguarded property access" findings are user-visible-degradation, not silent-white-screen — rate them accordingly.
- **`ludicrousSpeedOverlay` is stubbed out in `cypress.config.ts`**, so no component test exercises its ~50s scripted timeline. Review it by reading, not by trusting CI.

**How to apply:** treat these as the default checklist for popup diffs before looking for anything else.

Related: [[review-i18n-contract]], [[project-platform-floor]]
