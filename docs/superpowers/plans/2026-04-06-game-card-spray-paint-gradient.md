# Game Card Spray Paint Edge Gradient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the muddy low-opacity team color edge gradients on game cards with full-color strips that fade into white via a spray-paint-style turbulence mask.

**Architecture:** The card `div` gets a two-layer visual treatment: (1) a `linear-gradient` background with solid team colors at the edges and white in the center, (2) a CSS `mask-image` pointing to an inline SVG that uses `feTurbulence` + `feDisplacementMap` to distort the gradient-to-transparent boundary, creating a scattered/spray-paint edge. The mask is the same shape for all cards and lives as a module-level constant.

**Tech Stack:** React, TypeScript, CSS `mask-image`, SVG filters (`feTurbulence`, `feDisplacementMap`)

---

## Files

- **Modify:** `apps/extension/entrypoints/popup/components/GameCard.tsx`
  - Remove `TEAM_EDGE_OPACITY` and `TEAM_FADE_OPACITY` constants
  - Update `teamColorBackground()` to use full-opacity `rgb()` colors with a hard-edge gradient
  - Add `TEAM_COLOR_MASK_SVG` string constant (raw SVG)
  - Add `TEAM_COLOR_MASK` string constant (encoded data URI ready for `maskImage`)
  - Apply `maskImage`, `WebkitMaskImage`, `maskSize`, `WebkitMaskSize` to both card `div`s

---

### Task 1: Update `teamColorBackground` to use full team colors

**Files:**
- Modify: `apps/extension/entrypoints/popup/components/GameCard.tsx`

The current function uses low-opacity `rgba()` colors which produce a muddy tint. The new version uses full `rgb()` colors in a hard-edged strip on each side (0–20% left, 80–100% right), with pure white in the center. The mask (added in Task 2) will handle all the fading.

- [ ] **Step 1: Remove the two opacity constants**

In `GameCard.tsx`, delete these two lines (currently around line 51–52):

```typescript
const TEAM_EDGE_OPACITY = 0.14;
const TEAM_FADE_OPACITY = 0.03;
```

- [ ] **Step 2: Replace `teamColorBackground` with the full-color version**

Replace the entire `teamColorBackground` function (lines ~71–79) with:

```typescript
const teamColorBackground = (awayColor?: string, homeColor?: string): string => {
	const leftRgb = awayColor ? hexToRgbComponents(awayColor) : null;
	const rightRgb = homeColor ? hexToRgbComponents(homeColor) : null;
	const left = leftRgb ? `rgb(${leftRgb})` : '#ffffff';
	const right = rightRgb ? `rgb(${rightRgb})` : '#ffffff';
	return `linear-gradient(to right, ${left} 0%, ${left} 20%, #ffffff 20%, #ffffff 80%, ${right} 80%, ${right} 100%)`;
};
```

This creates hard color strips at the edges (0–20% away color, 80–100% home color) with white in between. The hard edges will be smoothed by the mask in Task 2.

- [ ] **Step 3: Commit**

```bash
git add apps/extension/entrypoints/popup/components/GameCard.tsx
git commit -m "refactor(game-card): use full team colors in edge gradient, remove opacity constants"
```

---

### Task 2: Add the spray-paint SVG mask constant

**Files:**
- Modify: `apps/extension/entrypoints/popup/components/GameCard.tsx`

The mask is an SVG with a linear gradient rect (opaque center, transparent edges) run through a turbulence displacement filter. When used as a CSS `mask-image`, opaque areas show the element and transparent areas let the container (white) show through — the turbulence distorts the transition boundary into a scattered spray-paint edge.

- [ ] **Step 1: Add the mask constants just below `teamColorBackground`**

Insert these two constants after the `teamColorBackground` function:

```typescript
const TEAM_COLOR_MASK_SVG = [
	'<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">',
	'<defs>',
	'<filter id="spray" x="-30%" y="-30%" width="160%" height="160%">',
	'<feTurbulence type="turbulence" baseFrequency="0.04 0.15" numOctaves="4" seed="2" result="noise"/>',
	'<feDisplacementMap in="SourceGraphic" in2="noise" scale="25" xChannelSelector="R" yChannelSelector="G"/>',
	'</filter>',
	'<linearGradient id="g" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0">',
	'<stop offset="0%" stop-color="white" stop-opacity="0"/>',
	'<stop offset="20%" stop-color="white" stop-opacity="1"/>',
	'<stop offset="80%" stop-color="white" stop-opacity="1"/>',
	'<stop offset="100%" stop-color="white" stop-opacity="0"/>',
	'</linearGradient>',
	'</defs>',
	'<rect width="100%" height="100%" fill="url(#g)" filter="url(#spray)"/>',
	'</svg>',
].join('');

const TEAM_COLOR_MASK = `url("data:image/svg+xml,${encodeURIComponent(TEAM_COLOR_MASK_SVG)}")`;
```

**How the mask works:**
- The SVG gradient rect is opaque white in the center (20–80%) and fades to transparent at edges (0%, 100%)
- `feTurbulence` generates fractal noise; `feDisplacementMap` uses it to displace rect pixels by up to 25px
- The displaced boundary creates an organic, scattered edge — like spray paint
- `x="-30%" y="-30%" width="160%" height="160%"` on the filter prevents clipping of displaced pixels that shift outside the original rect bounds

- [ ] **Step 2: Commit**

```bash
git add apps/extension/entrypoints/popup/components/GameCard.tsx
git commit -m "feat(game-card): add SVG turbulence spray-paint mask constant"
```

---

### Task 3: Apply the mask to both card divs

**Files:**
- Modify: `apps/extension/entrypoints/popup/components/GameCard.tsx`

There are two card `div`s in `GameCard`: the pre-game card (around line 194) and the live game card (around line 222). Both need the mask applied alongside the existing background style.

- [ ] **Step 1: Update the pre-game card div (status === 'pre')**

Find this (around line 194):

```tsx
<div className='game-card' style={{ background: teamColorBackground(game.awayTeam.color, game.homeTeam.color) }}>
```

Replace with:

```tsx
<div className='game-card' style={{
	background: teamColorBackground(game.awayTeam.color, game.homeTeam.color),
	maskImage: TEAM_COLOR_MASK,
	WebkitMaskImage: TEAM_COLOR_MASK,
	maskSize: '100% 100%',
	WebkitMaskSize: '100% 100%',
}}>
```

- [ ] **Step 2: Update the live game card div**

Find this (around line 222):

```tsx
<div className={`game-card${isOt ? ' is-ot' : ''}`} style={{ background: teamColorBackground(game.awayTeam.color, game.homeTeam.color) }}>
```

Replace with:

```tsx
<div className={`game-card${isOt ? ' is-ot' : ''}`} style={{
	background: teamColorBackground(game.awayTeam.color, game.homeTeam.color),
	maskImage: TEAM_COLOR_MASK,
	WebkitMaskImage: TEAM_COLOR_MASK,
	maskSize: '100% 100%',
	WebkitMaskSize: '100% 100%',
}}>
```

- [ ] **Step 3: Build and verify visually**

```bash
cd apps/extension && npm run dev
```

Open the extension popup. Expected results:
- Each game card shows the actual team color peeking in from the left and right edges
- The color fades into white with a scattered/organic edge (not a clean straight line)
- The center of the card is pure white
- Cards with missing team colors (`undefined`) show no color (white on both sides)

- [ ] **Step 4: Commit**

```bash
git add apps/extension/entrypoints/popup/components/GameCard.tsx
git commit -m "feat(game-card): apply spray-paint mask to game card divs"
```
