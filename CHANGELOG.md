# Changelog

## Ludicrous Speed animation — 2026-06-10

### Sensitivity slider level 7
- Renamed "Overkill" to "Ludicrous Speed" (Spaceballs reference).
- When the slider hits level 7, the label animates with a rapid fire/electric color cycle — orange → gold → white → cyan → magenta — with a matching glow and a hair-thin shake, looping every 0.5s.

---

## Switch threshold fixes — 2026-06-10

### Score-0 games are now reachable at max sensitivity
- When the active tab is not a registered game (nothing is "on"), ArenaSwap will now switch to the best available game even if its PowerScore is 0. Previously, the min threshold of 1 blocked any switch when all games scored 0.
- Level 7 (Ludicrous Speed) threshold corrected to 1 with a `>=` comparison — label now accurately reads "gap ≥ 1" instead of the misleading "gap ≥ 0".
- Tie-switching is still blocked for active registered games; the score-0 bypass only applies when no registered game is currently being watched.

---

## Playful empty state — 2026-06-06

### No-games empty state
- Replaced the static "No games right now 💔" copy with a pool of 7 rotating messages, each with a distinct title + subtitle, picked randomly on each render.
- Messages match the loading-screen brand voice: sports-native, lightly self-aware, with the occasional PowerScore reference and a mandatory "go birds."
- `noGamesMessages` array and `getRandomNoGamesMessage` helper added to `popupHelpers.ts` alongside the existing `loadingMessages` pattern.

---

## UI refresh — 2026-06-06

### Live game cards
- Replaced the expandable inline PowerScore breakdown with a Bootstrap `.progress` bar at the card bottom. Bar fills proportionally to `total / scoreMaxTotal` using the existing dynamic colour gradient; `PowerScore X / 100` label sits to the right.
- Removed the collapsible breakdown button and `showPowerScoreDetails` state entirely.
- Tab-assignment dropdown moved to a consistent footer on both live and pre-game cards.
- `● LIVE` status row restored as a clean top-of-card indicator; reason string removed from card surface (detail view only).

### Game detail view
- Matchup card restructured to `flex-direction: column`: teams row on top, PowerScore bar + reason caption at the card bottom.
- Removed the coloured `PowerScore: X/100` badge that lived inside the matchup card; replaced by the same bar treatment.
- Reason text shows as a quiet muted caption below the bar, capitalised at display time. Buried `"Headline reason:"` row removed from the breakdown section.

### PowerScore reason strings
- `"tied"` → `"it's tied"`, `"tied — OT in sight"` → `"tied — overtime looming"`, `"heating up"` → `"on a roll"`, `"back and forth scoring"` → `"trading leads"`, `"comeback"` → `"big comeback"`, `"rallying"` → `"making a run at it"`, `"Top game right now"` → `"best game available"`.
- Fixed grammar: momentum run strings now correctly use "an" before 8, 11, 18 (`"LAL on an 8-0 run"`).

### Settings page — Switching tab
- Switching tab restored to its original layout: `popup-section-label` headings with icon + bold text, plain `mt-2` toggle rows with no separators, and all slider/input components back to the original inline label+value format.

### Settings page — Leagues tab
- League toggles reorganised into a 2-column CSS grid.
- Each cell is a small dark card with a stacked layout: logo + toggle on the top row, full-width league name on the bottom row. Eliminates truncation for long names (NCAAB, NCAAF, etc.).
- League logo shape changed from circle to rounded square (36 × 36 px) for better brand mark legibility.
- Sport group headings use the original `fw-semibold text-body-secondary` label + all/none button row — no horizontal rules.

## Onboarding Page
- Made the logo smaller, matching the width of the logo on the error page

---

## Game detail view improvements — 2026-06-06

### Header
- The "Game Detail" title now shows the actual matchup — e.g. `BOS @ NYK` — instead of the generic label.

### PowerScore breakdown
- The five signal rows (Closeness, Late-game, Momentum, Lead changes, Comeback) now render as Bootstrap progress bars with a colored dot matching the chart legend, making the relative contribution of each signal scannable at a glance.
- Each bar uses the same color as the corresponding series in the PowerScore components chart.

### Score margin chart (new)
- Added a fourth chart below "Game score over time" showing the point differential over time (`awayScore − homeScore`).
- Uses two clamped series — away team color fills above zero, home team color fills below zero — with a tooltip that reads e.g. "BOS +7" or "Tied".
- No `visualMap` used; the split-series approach avoids the ECharts crossing-zero hang.

---

## Dev tooling — 2026-06-04

### Zod validation
- Added Zod v4 to `@arenaswap/core` for runtime schema validation at external API boundaries.
- Created `espnSchemas.ts`: Zod schemas for all ESPN API response types (`EspnScoreboardSchema`, `EspnTeamsResponseSchema`). The hand-written TypeScript interfaces they replaced are removed; types are now inferred via `zod.infer<>`.
- `fetchScoreboard` and `fetchTeamsForLeagues` now use `safeParse` — a malformed ESPN response degrades gracefully to an empty-events result instead of silently passing a mistyped object.
- Created `backgroundSchema.ts`: `BackgroundStateSchema` wraps the existing background-state normalization helpers as Zod transforms, giving a schema-driven parse at the background-worker→popup boundary.
- `normalizeBackgroundState` in `popupHelpers.ts` is now a one-liner that delegates to `BackgroundStateSchema.parse()`.
- All `z` import aliases renamed to `zod` for readability (`import { z as zod } from 'zod'`).

### PowerScore dev scripts
- Replaced `vite-node` (transitive, not directly installed) with `esbuild --bundle | node` in `powerscore:simulate` and `powerscore:validate-live`. No new dependencies added — esbuild is already present transitively.
- Compiled `.cjs` artifacts added to `.gitignore`.

---

## PowerScore v2 — 2026-06-04

### Scoring algorithm
- **Full-range scale.** Signal ceilings now deliberately stack past 100 and the headline is capped at 100, so a genuinely exciting game climbs into the 80s/90s and a dull one stays low — previously every game compressed into roughly the bottom two-thirds (~0–72).
- **Scores build with the game.** State signals (closeness, comeback) start near a small floor and ramp up on a concave progress curve, instead of sitting at a flat 20–30 baseline from the opening tip.
- **Near-linear late-game pressure** spread across the whole final period (no final-seconds spike), and it now only counts when the game is close — a blowout in the final minute no longer reads as exciting.
- **Overtime anticipation.** Tied games get a ramping pre-boost through the final minute so likely-OT games stand out.
- **Live-action decay.** Momentum, lead changes, and comeback spike on a score and then fade on sport-scaled half-lives, so even low-scoring sports keep a moving graph instead of flat lines.
- Rebalanced signal ceilings to Closeness 30 / Late-Game 28 / Momentum 28 / Lead Changes 18 / Comeback 14.
- Recalibrated tab-switch sensitivity thresholds for the new score distribution.

### Demo mode
- Realistic per-sport scoring cadence (hockey/soccer score sparingly, basketball constantly, etc.).
- Fixed demo team logos that showed the wrong team; all now use ESPN's official logo URLs.

### Tooling & docs
- Added a simulation + live-ESPN validation harness: `npm run powerscore:simulate` and `npm run powerscore:validate-live`.
- Expanded the test suite (progress scaling, decay, near-linear late-game, overtime boost, edge cases).
- Updated the README, package page, website, and store listing to match the new model.
- Updated zip scripts to use native WXT bindings instead of custom shell scripts