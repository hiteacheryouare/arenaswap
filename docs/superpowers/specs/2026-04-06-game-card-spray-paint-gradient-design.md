# Game Card Spray Paint Edge Gradient

**Date:** 2026-04-06
**Status:** Approved

## Problem

The current team color gradient on game cards uses `rgba(color, 0.14)` at the edges, which makes team colors appear muddy and dark rather than showing the actual team colors. Users want a visible, real-color peek at the edges that fades quickly into the white card background.

## Design

### Background Gradient

Replace the current low-opacity gradient with one that uses the full team color (`opacity: 1.0`) at the very edge (0%), dropping sharply to transparent by ~15%. The center remains pure white. Mirrored on the right side for the home team.

Current behavior: edge color is barely distinguishable from a dark smudge.
Target behavior: recognizable team color at the edge that fades cleanly and quickly into white.

### Spray Paint Mask (Approach B)

A CSS `mask-image` applied to the same `div` that holds the background. The mask is an inline SVG data URI containing:

- A `<rect>` filled with a linear gradient: opaque white in the center, transparent at the left and right edges (same proportions as the gradient, ~15% fade zones)
- An SVG filter chain: `feTurbulence` generates fractal noise, `feDisplacementMap` uses that noise to distort the rect's pixels

The result: the boundary between the colored edge and the white center is organically scattered — like spray paint bleeding out — instead of a clean linear line.

The mask shape is identical for every card (it does not depend on team colors), so it is stored as a single `TEAM_COLOR_MASK` constant (SVG data URI string).

Two additional inline style props are added to the card `div`:
- `maskImage` / `WebkitMaskImage`
- `maskSize: '100% 100%'` / `WebkitMaskSize`

### Fallback (Approach A)

To revert to a clean gradient without the spray paint effect: remove `TEAM_COLOR_MASK` and the two mask style props. The fixed gradient alone still looks correct.

## Files Changed

- `apps/extension/entrypoints/popup/components/GameCard.tsx`
  - Update `teamColorBackground()`: use `rgba(color, 1)` at 0%, fade to `rgba(color, 0)` by ~15%, white center
  - Add `TEAM_COLOR_MASK` constant: inline SVG data URI with turbulence displacement mask
  - Apply `maskImage`, `WebkitMaskImage`, `maskSize`, `WebkitMaskSize` to both card `div` elements (live and pre-game)
  - Remove `TEAM_EDGE_OPACITY` and `TEAM_FADE_OPACITY` constants (no longer needed)

## Out of Scope

- No new files
- No changes to other components
- No changes to the gradient logic for missing/undefined team colors (stays as white)
