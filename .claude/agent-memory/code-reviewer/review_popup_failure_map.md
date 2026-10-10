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
- **`useSummaryData.ts` casts rather than validates, but it is NOT the soft spot it looks like.**
  Re-reviewed at PR #18 (2026-08-19): it fetches the ESPN `summary` endpoint and casts
  (`data?.seasonseries as SeriesInfo[]`), yet every read is guarded — `parseTeamRecords` optional-chains
  the whole `header.competitions[0].competitors` hop and `Array.isArray`-checks before use, `!r.ok`
  throws, `winprobability` is length-checked with `?? 0.5` per point, and the whole `.then` sits under a
  `.catch`. Stale answers are dropped by a per-effect `cancelled` flag (no AbortController since
  at least 2026-10), plus a request sequence id once PR #207 added the live 60s refresh. Do not open a generic "unvalidated boundary" finding
  here without naming an actual unguarded hop. The `teamIdsRef`/`scoreRef` effect with no dep array is
  also correct: effects run in declaration order, so the refs are current before the fetch effect runs.
  Its `mockSeriesMap`/`mockRecordsMap` demo tables cover exactly the 15 ids `mockGames.ts` defines
  (there is no mock-7/8) — that apparent gap is not one.
- **`.popup-container` (`packages/ui/src/_popup.scss`) is the scroll container** — fixed 320x560 with `overflow-y: auto`. Sticky headers and `IntersectionObserver({ root })` in the detail view depend on this; it is *not* `.popup-root`, which does not scroll.
- **A root `ErrorBoundary` wraps `<App/>`** (`entrypoints/popup/main.jsx`). A render throw yields a crash screen rather than a blank popup, so "unguarded property access" findings are user-visible-degradation, not silent-white-screen — rate them accordingly.
- **`ludicrousSpeedOverlay` is stubbed out in `cypress.config.ts`**, so no component test exercises its ~50s scripted timeline. Review it by reading, not by trusting CI.

**How to apply:** treat these as the default checklist for popup diffs before looking for anything else.

Related: [[review-i18n-contract]], [[project-platform-floor]]

**Detail tab strip (`detailTabs.tsx`) — Bootstrap owns the active classes after first render.** A tab that disappears while the strip stays mounted leaves *nothing* active (blank body). Real-data game swaps are safe only because the `useSummaryData` reset empties standings/box/matchup in one commit, so `tabbed` drops to false and the strip unmounts. The demo path re-sets standings synchronously in the same effect, so there `tabbed` stays true across a swap. The Matchup tab (pre-game only) is handled with a `Fragment key={isPreGame}` remount; any new conditional tab needs the same thinking.

**Calendar-day math in the popup runs in the viewer's timezone** (`setHours(0,0,0,0)`), not the venue's. Anything "days since last game" misreads for non-US viewers whenever one game crosses their midnight and the other does not.

**`GameDetailView` is mounted in two hosts**: the popup (unmounts on close) and the guide tab's drawer (`entrypoints/guide/app.tsx`), a long-lived page that sits hidden in the tab strip. Any "it stops when the popup closes" argument for a timer or poll in the detail view is false for the guide. Nothing in `entrypoints/` listens for `visibilitychange`.

**The detail `game` prop is a new object on every `SCORES_UPDATED`**, so every chart option memo that lists `game` rebuilds and `setOption(option, true)` runs at broadcast cadence already. Guards that keep an array identity "so the chart doesn't redraw" save nothing while `game` is in the deps.

**Repeated summary refreshes make sparse answers matter**: the tab list is derived from summary state (box score, standings), and `detailTabs.tsx` sends the reader to Overview when the open tab vanishes. A one-shot fetch could not bounce a reader; a 60s refresh can, unless a sparse answer keeps the previous value the way the win-probability line does.

**A card in the popup is ~289px outer, ~263px inside** (`assets/bootstrap.scss` comment near the
top), not 320. Cypress specs that mount a card in a 320px wrapper give text ~30px more room than the
real popup, so their "fits on one line in every locale" checks overstate the margin. Measured
2026-10-09 at the real width: the Filipino stale line (0.6rem DM Sans) is 260px of 263. Re-measure at
289px outer before trusting a fit test.
