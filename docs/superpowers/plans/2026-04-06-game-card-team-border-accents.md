# Game Card Team Color Border Accents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all team color gradient/overlay experiments with a clean white card that uses team colors only as left (away) and right (home) border accents.

**Architecture:** All gradient, mask, luminance, and readability-overlay code is removed from `GameCard.tsx`. The two card root divs get an inline `style` with `borderLeft` and `borderRight` set to each team's color. Everything else reverts to its pre-experiment state.

**Tech Stack:** React, TypeScript, inline CSS styles

---

## Files

- **Modify:** `apps/extension/entrypoints/popup/components/GameCard.tsx`

---

### Task 1: Remove all gradient/readability experiment code

**Files:**
- Modify: `apps/extension/entrypoints/popup/components/GameCard.tsx`

- [ ] **Step 1: Remove `teamColorBackground` and `perceivedLightness` functions, and `hexToRgbComponents`**

These three functions are only used by the gradient/luminance experiments. Remove them entirely. The final file should have none of these functions:
- `hexToRgbComponents` (lines ~52–65)
- `perceivedLightness` (lines ~67–78)
- `teamColorBackground` (lines ~80–87)

- [ ] **Step 2: Revert `TeamLogo` — remove white disc wrapper**

The `<img>` branch currently wraps the image in a white disc div. Revert it to the original:

```tsx
const TeamLogo = ({ team }: { team: Team }) => {
	const [failed, setFailed] = useState(false);

	if (team.logo && !failed) {
		return (
			<img
				src={team.logo}
				alt={team.abbreviation}
				width={LOGO_SIZE}
				height={LOGO_SIZE}
				onError={() => setFailed(true)}
				className='object-fit-contain flex-shrink-0'
			/>
		);
	}

	return (
		<div
			className='d-flex align-items-center justify-content-center bg-light rounded-circle flex-shrink-0 fw-bold text-body-secondary'
			style={{ width: LOGO_SIZE, height: LOGO_SIZE, fontSize: '0.7rem' }}
		>
			{team.abbreviation.slice(0, 3)}
		</div>
	);
};
```

- [ ] **Step 3: Revert `TeamColumn` abbreviation span — remove adaptive color and textShadow**

```tsx
const TeamColumn = ({ team }: { team: Team }) => (
	<div className='d-flex flex-column align-items-center gap-1' style={{ minWidth: 60 }}>
		<TeamLogo team={team} />
		<span className='fw-bold text-center text-nowrap' style={{ fontSize: '0.7rem', color: '#111827' }}>
			{team.abbreviation}
		</span>
	</div>
);
```

- [ ] **Step 4: Revert `GameMeta` — remove outer white pill wrapper**

The `GameMeta` return currently has an extra outer `<div>` with the white pill style. Remove it so the return is back to a single wrapper:

```tsx
return (
	<div className='d-flex flex-column align-items-center mt-1' style={{ gap: '0.15rem' }}>
		{game.venueName && (
			<div className='text-center' style={{ fontSize: '0.6rem', color: '#6c757d' }}>
				{game.venueName}
			</div>
		)}
		{networks && (
			<div
				className='text-center'
				style={{ fontSize: '0.58rem', color: '#495057', maxWidth: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.2 }}
			>
				Watch: {networks}
			</div>
		)}
		{odds && (
			<div className='d-flex align-items-center justify-content-center' style={{ gap: '0.3rem', fontSize: '0.58rem', color: '#495057', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
				<span>{odds}</span>
			</div>
		)}
		{hasOddsProvider && (
			<div className='d-flex align-items-center justify-content-center' style={{ gap: '0.25rem', fontSize: '0.58rem', color: '#495057', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
				<span>Odds provided by:</span>
				<OddsProvider game={game} />
			</div>
		)}
	</div>
);
```

- [ ] **Step 5: Revert center column divs — remove white pill styles**

In the pre-game card (inside `game.status === 'pre'` branch), revert the center div:

```tsx
<div className='d-flex flex-column align-items-center' style={{ minWidth: 80 }}>
```

In the live card, revert the center div:

```tsx
<div className='d-flex flex-column align-items-center' style={{ minWidth: 80 }}>
```

- [ ] **Step 6: Commit**

```bash
git add apps/extension/entrypoints/popup/components/GameCard.tsx
git commit -m "refactor(game-card): remove all gradient and readability overlay experiments"
```

---

### Task 2: Add team color border accents

**Files:**
- Modify: `apps/extension/entrypoints/popup/components/GameCard.tsx`

- [ ] **Step 1: Update the pre-game card root div**

Find the pre-game card root div (inside `game.status === 'pre'` branch) and replace its style:

```tsx
<div className='game-card' style={{
	borderLeft: `3px solid ${game.awayTeam.color ?? '#dee2e6'}`,
	borderRight: `3px solid ${game.homeTeam.color ?? '#dee2e6'}`,
}}>
```

- [ ] **Step 2: Update the live card root div**

Find the live card root div and replace its style:

```tsx
<div className={`game-card${isOt ? ' is-ot' : ''}`} style={{
	borderLeft: `3px solid ${game.awayTeam.color ?? '#dee2e6'}`,
	borderRight: `3px solid ${game.homeTeam.color ?? '#dee2e6'}`,
}}>
```

- [ ] **Step 3: Build to verify no errors**

```bash
cd apps/extension && npm run build
```

Expected: build completes with no TypeScript errors and `✔ Finished` in output.

- [ ] **Step 4: Commit**

```bash
git add apps/extension/entrypoints/popup/components/GameCard.tsx
git commit -m "feat(game-card): add team color left/right border accents"
```
