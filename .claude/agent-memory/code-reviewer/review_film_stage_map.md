---
name: review-film-stage-map
description: scripts/film ad-film stage — how renders isolate state, which timing seams break (card close vs next shot), zoom vs transform in Desk, and what is safe to ignore
metadata:
  type: project
---

Facts about the frame-by-frame film stage (`scripts/film/stage`) that took tracing to establish (2026-10-06 review of the arrow-to-dot rework):

- **Module-level caches in shot files are safe for renders.** `render/render.ts` launches a fresh Chrome and calls `Page.navigate` once per cut+format, and the frame loop always runs 0..lastFrame in order, `--stills` included. Caches keyed by `shot.from` (card.tsx `lastStops`, endCard.tsx `liveDots`) only go stale if someone scrubs `film.frame(n)` by hand in a dev page.
- **Frame order:** `host.tick(t)` runs popup actions first, then draw, then overlay measure, then draw again. An action at `t` is already applied when that frame's overlay is measured. Actions that return false are retried every frame.
- **An unplaced popup sits at translate(0,0), scale 1, opacity 0.** `measure.inPopup` still returns a box for it, in the wrong place. Any overlay that measures a popup has to do it while some shot is placing it.
- **Orange card seam:** card.tsx closes at `to - 0.62s` (close 0.4 + pop 0.22). The next shot has to be mounted before then, because any shrink uncovers the farthest corner at once. cut15 gets this right; cut30/cut60 as of this review started the next shot at the bar line, about 9 frames late.
- **BrowserWindow uses CSS `zoom`.** Callers divide left/top by zoom, so a raw `translateY(px)` on a Desk gets multiplied by `windowZoom` (1.32 landscape / 1.12 portrait).
- **Cut data imports shots/card.tsx** (`cardSuperWindow`), so render.cjs now bundles the React JSX runtime and the core constants. It works; it just means a cut file is no longer pure data.
- No validator for cuts (clock monotonicity, supers inside shots). Check them by hand. `npx tsc --noEmit -p scripts/film/tsconfig.json` is pure and quick.
- Background state is never checked against the popup's session state in the film. `standbyStreamTabId` lives in session storage only, and suggestTabAssignments excludes it (apps/extension/utils/tabSuggestions.ts).

**Why:** these are the seams where a film change that looks right goes wrong on screen, and Ryan catches problems a few frames long.
**How to apply:** for any cut retime, check every shot that follows a card against the card's close time, and check that every overlay's measured popup is placed at that moment. See [[project-review-failure-map]].
