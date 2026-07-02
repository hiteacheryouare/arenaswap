# Changelog

## Easter egg: Ludicrous Speed warp tunnel — 2026-07-02

When the sensitivity slider is cranked to max (level 7), the rainbow "Ludicrous Speed" label becomes clickable. Clicking it hijacks the popup with a full-screen warp tunnel: the speed ramps through LIGHT SPEED → RIDICULOUS SPEED → LUDICROUS SPEED, then fires the entire Spaceballs Colonel Sandurz dialogue while the tunnel accelerates past all reason. At "THEY'VE GONE TO PLAID!" the star colors cycle through PowerScore colors at ludicrous rate. "STOP!" decelerates everything and closes the overlay. Click anywhere to skip.

## Fix: Spanish dev server named substitution bug + i18n adapter refactor — 2026-07-02

Fixes two broken Spanish translations in dev mode and cleans up the Spanish dev server implementation.

### Bug fix
The dev-mode i18n adapter (`ARENASWAP_LOCALE=es wxt`) wasn't applying named substitutions — calls like `i18n.t('sensitivity.valueLabel', { label, gap })` and `i18n.t('detail.totalLabel', { total, max })` returned the raw template string with `{label}`, `{gap}`, `{total}`, `{max}` unexpanded. Root cause: the adapter's `t()` loop only handled `number` and `Array` args, silently dropping plain objects. Added a `namedSub` branch (matching the production `@wxt-dev/i18n` behavior) and passed it to `_sub()` ahead of the positional `sub`.

### Refactor
Replaced the old "write temp file → alias to it" mechanism with a Vite virtual module plugin (`enforce: 'pre'`, `resolveId` / `load` hooks). The adapter code is now generated inside a proper `buildDevI18nModule()` function rather than as an escaped inline string. No temp file is written; the Chrome profile setup (needed for macOS locale forcing) is unchanged.

## Internationalization: Spanish support for the popup — 2026-07-02

First step toward serving sports fans outside the US market: the extension popup is now fully localized and ships with a Spanish translation, auto-selected from the browser UI locale.

### Framework
- Added the [`@wxt-dev/i18n`](https://wxt.dev/i18n) module (registered in `wxt.config.ts`) and set `manifest.default_locale: 'en'`. WXT compiles `locales/*.yml` into the standard extension `_locales/**/messages.json` at build time.
- Message files live in `apps/extension/locales/en.yml` (source of truth) and `apps/extension/locales/es.yml` — 339 keys each, structurally aligned.
- Strings are accessed via `i18n.t('key')` from the generated `#i18n` module, with `$1` positional / `{named}` substitutions and `0`/`1`/`n` plural forms where needed.

### Scope
- Every user-facing string in the popup — onboarding, walkthrough, game cards, PowerScore breakdown, settings, standby-stream guide, empty/loading/error states, toasts, pro tips, and the 73 flavor loading messages — now resolves through the locale files. Sport/team data from the ESPN API is left untranslated.
- Language is auto-detected from the browser; no in-app switcher in this pass. Store metadata and the docs site are intentionally out of scope for now.

### Dev scripts
- `npm run dev:es` and `npm run dev:firefox:es` launch the dev browser with its UI language forced to Spanish (via the `ARENASWAP_LOCALE` env var). When set, `wxt.config.ts` generates a self-contained JS adapter at startup and aliases `@wxt-dev/i18n` → that adapter via Vite's `resolve.alias`. The adapter inlines the parsed YAML data and implements the same `createI18n()` API — completely bypassing `chrome.i18n.getMessage()`, which is unreliable for locale selection on macOS in dev. Aliasing the npm package (rather than the virtual `#i18n` module) guarantees the adapter wins over any WXT-generated alias. Unset → the real `@wxt-dev/i18n` module and Chrome's UI locale.

### Tooling / tests
- Added `#i18n` path mappings to `tsconfig.json` and `tsconfig.jest.json`; disabled declaration emit in the extension's leaf tsconfig (it's bundled by WXT, not `tsc`).
- New `tests/stubs/i18n.ts` (Jest) and `cypress/stubs/i18n.ts` (Cypress) stubs load `en.yml` and reimplement `i18n.t` (substitutions + plurals) so tests exercise real message resolution against the `#i18n` module. All 101 unit + 16 component tests pass.

## Fix: game detail matchup card centering — 2026-06-27

The teams row in the game detail card (logo / score / logo) was visually shifted slightly to the right due to sub-pixel rounding when `justify-content: space-between` distributed leftover space across fixed-width team wraps and a fixed `min-width` center div. Replaced `min-width: 116px` on `.game-detail-center` with `flex: 1` so the center absorbs all remaining space exactly, guaranteeing symmetric gaps and perfect score centering.

## Scoring opportunity boost — 2026-06-27

Automatic PowerScore boost that activates when live game state signals an imminent scoring threat.

### How it works
- **Baseball / softball** — scales with runners on base: 1 runner +3, 2 runners +6, bases loaded +10.
- **NFL / NCAAF / UFL** — red zone possession (ESPN `isRedZone` flag) adds +10.
- Boost is additive, applying on top of the existing favorite team bonus and manual game boost.
- Only fires for in-progress games (`status === 'in'`); has no effect pre- or post-game.

### PowerScore breakdown UI
- New **Scoring opportunity** row in the PowerScore breakdown card on the game detail view, showing the active boost value or `0` when the situation has cleared.

### ESPN data
- `isRedZone` was already present in the ESPN situation schema but not exposed on the `Game` type; it is now parsed and forwarded for all football sports.
- Investigated NHL power play data — ESPN's scoreboard `situation` object is always empty for hockey (power play state exists only in the play-by-play endpoint, which would require a separate per-game poll). NHL support deferred.

### Tests
Added **10 new unit tests** in `packages/powerscore/tests/scorer.test.ts` covering `computeScoringOpportunityBoost`: non-live guard, baseball with 0/1/2/3 runners, softball runner scaling, football with and without red zone, and non-applicable sport types.

## Live game context — 2026-06-27

Four new data points surfaced from the ESPN scoreboard API, a reorganized game detail card, and full demo-mode support for all of it.

### Win probability chart
- Game detail view now shows **Win Probability** as a simple double-line chart — one line per team in their team color — replacing the score margin chart.
- Both lines are independent (no stacking); their values always sum to 100%, so a crossing of the lines clearly marks a momentum shift.
- Tooltip shows a colored `●` bullet with team abbreviation and percentage for each team.
- Empty state shown when the game is not yet live ("Win probability loads when the game is live.").

### BSO indicator (baseball / softball)
- Live game cards and the game detail center column now show a **Balls / Strikes / Outs** indicator for in-progress baseball and softball games.
- Each category renders as Bootstrap icon circles (`bi-circle-fill` / `bi-circle`): green for balls (max 3), orange for strikes (max 2), red for outs (max 2).
- Each B / S / O label is grouped with its dots so sections are clearly separated.
- Sourced from `situation.balls`, `situation.strikes`, `situation.outs` in the ESPN scoreboard response; only populated for live games.

### Down & distance (gridiron football)
- Live game cards and the game detail center column now show a **down & distance** string (e.g. "3rd & 7") for in-progress NFL, NCAAF, and UFL games.
- Uses `shortDownDistanceText` from the ESPN situation when available; otherwise builds from `down` / `distance` fields, with "Nth & Goal" when distance is 0.
- `down = 0` (between-play state) correctly returns `undefined` — no label shown.
- Confirmed via ESPN core API (`/v2/sports/football/leagues/nfl/events/{id}/competitions/{id}/situation`) which returns `down`, `yardLine`, `distance`, `isRedZone`.

### Series dots (baseball, basketball playoffs, hockey playoffs, softball)
- Game detail card shows a row of **series progress dots** for sports that play multi-game series.
- Filled dot = game played; team color indicates the winner. Empty dot = game not yet played.
- Basketball and hockey only show series when ESPN returns a `seasonseries` entry with `type: 'current'` — this naturally excludes regular-season games.
- Uses a single `summary` endpoint request per game detail open (no per-card polling).
- Rendered using Bootstrap icon circles (`bi-circle-fill` / `bi-circle`).

### Game detail card reorganization
- Series dots now appear **between the teams row and the PowerScore bar** — game context before the excitement metric.
- Removed the dividing line (`border-top`) that previously separated series dots from the card body.
- Watch/broadcast line hidden from live game cards via a new `hideBroadcasts` prop on `GameMeta`; preserved on the game detail view.

### Demo mode
- All four new features work in demo mode:
  - mock-4 (PHI vs NYM, MLB) and mock-16 (HOU vs LAD, MLB) start with realistic BSO counts that cycle on every tick.
  - mock-5 (PHI vs DAL, NFL) starts with `downDistance: '3rd & 7'` that rotates through a pattern of downs on each tick.
  - `useSummaryData` detects `mock-` game IDs and returns deterministic LCG-generated win probability curves instead of calling ESPN.
  - Hardcoded playoff series data shown for mock-4 ("PHI leads 2-1"), mock-14 ("BOS leads 3-2"), and mock-16 ("Series tied 2-2").
  - Post-game reset zeroes out BSO and resets downDistance to "1st & 10".

### Tests
Added **23 new unit tests** across three files:
- `packages/core/tests/apiClient.test.ts` — 5 BSO parsing tests (live MLB gets `bso`; defaults strikes/outs to 0; undefined for no-balls situation, pre-game, non-baseball) and 8 downDistance tests (all four ordinals; `shortDownDistanceText` precedence; `& Goal` when distance=0; undefined for down=0, down>4, pre-game, non-football).
- `packages/core/tests/mockGames.test.ts` — 4 BSO simulation tests (initial field, range bounds, deep-copy, post-game reset) and 4 downDistance tests (initial field, non-football undefined, cycles on low random, stable on high random, post-game reset).
- `apps/extension/tests/gameDetailChartOptions.test.ts` *(new)* — 10 tests for `buildWinProbabilityOption`: empty input, two series, no `stack`, y-axis 0–100, home+away values sum to 100, rounding, team name labels, `showSymbol: false`, tooltip format (colored bullet + `%`), downsampling for large inputs.

## Betting & Odds — 2026-06-22

Added a **Betting & Odds** section to Settings (Switching tab). When enabled, game cards and the detail view show the spread, over/under, and odds provider logo sourced directly from the ESPN scoreboard — no extra API calls required.

### Settings added
- **Show betting & odds** — master toggle (off by default)

## 19 new leagues + US audience audit — 2026-06-20

### New leagues added (21 originally, 2 removed after US audience audit = 19 net)

**Baseball & Softball**
- `cbase` — NCAA Baseball (`baseball/college-baseball`)
- `csoft` — NCAA Softball (`baseball/college-softball`) — introduced a new `softball` sport type with 7-inning late-game calibration (vs baseball's 9) so regulation pressure fires at the correct innings
- `olybb` — Olympic Men's Baseball (`baseball/olympics-baseball`)
- `wbbc` — World Baseball Classic (`baseball/world-baseball-classic`)

**Football**
- `ufl` — United Football League (`football/ufl`) — 4×15-min quarters, same calibration as NFL/NCAAF

**Hockey**
- `olymih` — Olympic Men's Ice Hockey (`hockey/olympics-mens-ice-hockey`)
- `olywih` — Olympic Women's Ice Hockey (`hockey/olympics-womens-ice-hockey`)

**Basketball**
- `olybkm` — Olympic Men's Basketball (`basketball/mens-olympics-basketball`) — FIBA uses 10-min quarters (600s); using NBA's 720s would fire late-game pressure too early
- `olybkw` — Olympic Women's Basketball (`basketball/womens-olympics-basketball`) — same FIBA spec

**Soccer**
- `olysocm` — Olympic Men's Soccer (`soccer/fifa.olympics`)
- `olysocw` — Olympic Women's Soccer (`soccer/fifa.w.olympics`)
- `laliga` — La Liga (`soccer/esp.1`)
- `bundesliga` — Bundesliga (`soccer/ger.1`)
- `seriea` — Serie A (`soccer/ita.1`)
- `ligamx` — Liga MX (`soccer/mex.1`)
- `ucl` — UEFA Champions League (`soccer/uefa.champions`)
- `uel` — UEFA Europa League (`soccer/uefa.europa`)
- `nwsl` — NWSL (`soccer/usa.nwsl`)
- `fifawwc` — FIFA Women's World Cup (`soccer/fifa.wwc`)

### New sport type: `softball`
Added `softball` as a distinct `SportType` (previously would have fallen back to `baseball`). The key difference is `regulationInnings: 7` in `lateGameCurve`, with `regulationStartInning: 5` and `extraInningsStartInning: 8` — using baseball's 9-inning config would misfires late-game pressure in the 5th/6th innings of a softball game. Added `softball: { normalScoreProb: 0.07, streakScoreProb: 0.25, offScoreProb: 0.03, scoreValues: [1, 2] }` to `mockGames.ts` sportParams.

### TypeScript fix: `leagueLogoFallbacks`
Changed `leagueLogoFallbacks` in `packages/core/src/constants.ts` from `Record<LeagueId, string>` (exhaustive — requires every ID) to `Partial<Record<LeagueId, string>>`, and updated `resolveLeagueLogoUrl` to use `?? ''` null-coalescing. This prevents stale dist caches on stacked branches from breaking the TypeScript build when the core package has fewer league IDs than powerscore.

### US audience audit
Each new league was evaluated against two criteria: (1) can it be watched in the USA via cable or a mainstream streaming service, and (2) is it popular enough in America to warrant tracking? Two leagues were cut:
- **CWHOC** (NCAA Women's Hockey): not available on mainstream US streaming and niche audience
- **Ligue 1** (French football): only on beIN Sports, smallest US following of the added European leagues

All other 19 leagues survived — Olympic sports on NBC/Peacock, European leagues on ESPN+/Paramount+, Liga MX on Univision/TUDN, NWSL on Paramount+/CBS Sports.

### Tests
Added 12 new test cases covering: baseball & softball league configs, softball sport type config (7-inning curve, no OT boost), UFL league config, new hockey league configs, Olympic basketball FIBA spec (600s quarters), and a parameterized `it.each` across all 10 new soccer leagues. Total: **72 passing** unit tests in `packages/powerscore`.

### Marketing
All marketing surfaces updated to reflect 31 leagues: docs site carousel, README badge and league table, Chrome/Edge/Firefox store descriptions, short summaries. Removed CWHOC and Ligue 1 entries from all surfaces.

## Cypress component testing — 2026-06-15

### Replace Jest component tests with Cypress Component Testing
- Replaced `jest-environment-jsdom` + `@testing-library/react` component tests with Cypress Component Testing, which runs in a real browser (Electron) and gives a more accurate rendering environment for the popup UI.
- **Removed packages:** `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jest-environment-jsdom` — none are needed now that the component project is gone from Jest.
- **Added:** `cypress@15.17.0` as a dev dependency.
- `jest.config.cjs` — removed the `component` project; only the `unit` project (Node environment, `.test.ts` files) remains.
- `tsconfig.jest.json` — dropped `@testing-library/jest-dom` from the `types` array since the package is no longer installed.
- New `cypress.config.ts` — Vite + React dev server; string/regex aliases redirect workspace packages (`@arenaswap/core`, `powerscore`, `wxt/browser`) to source files; a custom `enforce: 'pre'` Vite plugin intercepts relative component imports and redirects them to stub doubles, mirroring what Jest's `jest.mock()` did.
- New `cypress/support/component-index.html` — HTML template with `data-cy-root` mount point required by `cypress/react`.
- New `cypress/support/component.ts` — registers `cy.mount()` from `cypress/react`.
- New `cypress/tsconfig.json` — Cypress-specific TypeScript config with Cypress types and matching path mappings.
- New `cypress/stubs/*.tsx` — 8 minimal stub components (flipScore, baseDiamond, tabAssignSelect, gameCard, popupFooter, proTip, emptyGameState, reviewPromptBanner) that mirror the original Jest mocks and expose the `data-testid` attributes the specs assert against.
- New `cypress/component/liveGameCard.cy.tsx` — 4 component specs equivalent to the deleted `tests/liveGameCard.test.tsx`.
- New `cypress/component/mainView.cy.tsx` — 12 component specs equivalent to the deleted `tests/mainView.test.tsx`.
- `package.json` scripts: `test:component` now runs `cypress run --component`; added `cypress:open` for interactive mode.
- `.gitignore` — added `cypress/screenshots/` and `cypress/videos/`.
- **Result:** 87 Jest unit tests ✓ + 16 Cypress component tests ✓, all green.

---

## OXLint (agent-only linting) — 2026-06-15

### Strict linting wired for AI agents, invisible to human devs
- `oxlint@^1.70.0` added as a root devDependency (backed by Voidzero Inc / Evan You).
- `.oxlintrc.json` at repo root — auto-discovered by all workspaces.
- `lint` script added to all 4 workspace packages and root `package.json` (`turbo lint`).
- `lint` task in `turbo.json` with `cache: true` and **no `dependsOn`** — never fires during `build`, `test`, or `dev`. Agents call `npm run lint` explicitly; human devs never encounter it.
- Rules enabled: `correctness` + `suspicious` → error; `no-var`, `prefer-const`, `no-debugger` → error; `no-console` → warn. Plugins: `react`, `typescript`, `jsx-a11y`, `unicorn`.
- Disabled: `typescript/no-explicit-any` (pragmatic `any` is fine), `react/display-name` (arrow components), `react/react-in-jsx-scope` (React 19 auto JSX runtime), `jsx-a11y/prefer-tag-over-role` (Bootstrap spinner pattern), `no-new` (Notifications API side-effect usage).

---

## Soccer clock fix — 2026-06-13

### Correct late-game scoring and notification clock for soccer
- **Root cause:** ESPN reports soccer's `displayClock` as a continuous total-game elapsed time (e.g. `56'` = 3360 s), not a per-half clock. The scorer's `periodDurationSecs` for soccer is 2700 (45 min), so 3360 clamped to 2700 → `secsRemaining = 0` for the entire 2nd half — making late-game pressure read 26/28 from the opening of the half and notifications say "0:00 left" on every FWC game.
- **Fix:** Added `clockIsFullGameElapsed?: boolean` to `SportTypeConfig`. When set, `getClockSecondsRemaining` subtracts `(period − 1) × periodDurationSecs` from the raw clock before clamping, giving the correct within-period elapsed time.
- `clockIsFullGameElapsed: true` applied to the soccer sport config; affects all three soccer leagues: MLS, EPL, FIFA World Cup.
- Notification messages now correctly reflect actual time remaining (e.g. "34 min left" at 56').
- Test suite updated: period-2 soccer clock values now use full-game elapsed times matching ESPN's wire format; `toClockSeconds` helper updated accordingly.

---

## Guided walkthrough — 2026-06-13

### Opt-in interactive tutorial at the end of onboarding
- After completing the 3-step onboarding (leagues + teams), users land on a new choice screen: **"Take the tour"** or **"Jump right in"**.
- The walkthrough is a self-contained 4-step experience that only appears once, as part of the onboarding flow. Preferences are saved before it launches so the main extension is ready when the tour ends.
- **Step 1 — On/Off toggle:** Simplified header replica with an interactive toggle (try it). A live status line inside the card updates between "ArenaSwap is active" and "Auto-switching paused" as you flip it.
- **Step 2 — Tab assignment:** Mock Eagles vs Giants game card (with team color circles, gradient background, and PowerScore bar) showing a functional tab dropdown with fake options. Explains that ArenaSwap only touches tabs you register.
- **Step 3 — Auto-switch demo:** Two live game cards (Eagles + 76ers). After ~0.8s the 76ers PowerScore animates from 31 → 89, a flash simulates the tab switch, and "Did you see that? 👀" explanation appears. Next button is disabled until the animation completes.
- **Step 4 — Settings:** Interactive sensitivity and cooldown sliders (drag to explore). Descriptions use the real label copy from the extension. League badges shown inside the settings box.
- **Done screen:** Brand-colored confetti burst (`canvas-confetti`, lazy-loaded) in orange, blue, pink, green, and yellow. Subtext: "Ready to always watch the best game?"
- New files: `walkthroughView.tsx`, `walkthroughStepToggle.tsx`, `walkthroughStepTabAssign.tsx`, `walkthroughStepAutoSwitch.tsx`, `walkthroughStepSettings.tsx`
- Modified: `onboardingView.tsx` (step 4 choice screen, `onStartWalkthrough` prop), `app.tsx` (`walkthroughActive` state, `WalkthroughView` render branch)
- Dependency added: `canvas-confetti`

---

## Popup section heading polish — 2026-06-10

### Visual hierarchy for section labels
- Section titles ("Active Live Tabs", "Other Live Games", "Up Next") reworked: DM Sans, larger bold text, with a 3px `$primary` orange left accent bar. No longer plain centered text.
- League headers (`popup-section-label`) bumped to 0.875rem DM Sans — no longer fine print.
- Removed redundant `fw-bold text-uppercase` Bootstrap classes from `LeagueSectionHeader` JSX; SCSS handles weight and case.
- First section at the top of the popup now uses a reduced `marginTop` (0.25rem) to avoid the awkward gap that appeared when nothing preceded it. Subsequent sections keep the full 1rem breathing room above them.

---

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