# Game Card Team Color Border Accents

**Date:** 2026-04-06
**Status:** Approved

## Problem

Previous attempts at using team colors (background gradients, spray-paint masks, translucent overlay pills) all interfered with readability or aesthetics. The user wants a tasteful, minimal use of team colors that doesn't compromise the card's clean white layout.

## Design

The game card background returns to plain white. All gradient and mask code is removed. Team colors appear only as left and right card border accents: the left border uses the away team's color, the right border uses the home team's color, both at 3px solid. Top and bottom borders remain at the default `1px solid #dee2e6`.

If a team has no color defined, that border falls back to `#dee2e6`.

## Cleanup Required

The following code added during gradient experimentation is removed entirely:

- `teamColorBackground()` function
- `perceivedLightness()` function  
- `TEAM_COLOR_MASK_SVG` and `TEAM_COLOR_MASK` constants (already removed in a prior commit)
- White logo disc wrapper in `TeamLogo`
- Adaptive text color and `textShadow` on team abbreviation in `TeamColumn`
- Semi-transparent white pill on the center score/info column (both card variants)
- Semi-transparent white pill wrapper on `GameMeta`

All text colors revert to their original hardcoded values.

## Implementation

**File:** `apps/extension/entrypoints/popup/components/GameCard.tsx`

- Remove `teamColorBackground`, `perceivedLightness` functions
- Remove white disc wrapper from `TeamLogo` img branch
- Revert `TeamColumn` abbreviation span to `color: '#111827'`, no `textShadow`
- Revert center column div to `style={{ minWidth: 80 }}` (no background/padding/borderRadius)
- Revert `GameMeta` return to its original single wrapper div (remove outer pill div)
- On both card root divs, replace `style={{ background: ... }}` with:
  ```tsx
  style={{
    borderLeft: `3px solid ${game.awayTeam.color ?? '#dee2e6'}`,
    borderRight: `3px solid ${game.homeTeam.color ?? '#dee2e6'}`,
  }}
  ```

**File:** `apps/extension/assets/bootstrap.scss`

No changes needed — `.game-card` border is `1px solid #dee2e6` which still applies to top/bottom after the inline style overrides left/right.

## Out of Scope

- No changes to any other component
- No changes to team color data or types
