# Changelog

## Standby Stream tabs now mute like every other tab (#72) — 2026-07-28

### Extension background
- The standby stream tab is now muted whenever you're watching one of your game tabs. It was tracked separately from the game registry, so mute syncing skipped it entirely and it kept playing audio over the game you were actually watching
- Parking on the standby stream now unmutes the standby tab and mutes every game tab, so exactly one tab is ever audible
- Designating a standby tab mutes it immediately instead of leaving it blaring until the next poll
- ArenaSwap now remembers which tabs it muted and unmutes them when they leave its control — turning Standby Stream off, picking a different standby tab, or disabling the extension no longer leaves a tab silently muted with nothing in the UI explaining why

## Delayed games score 0 (#71) — 2026-07-28

A suspended game used to keep the PowerScore it earned while it was live, so a rain-delayed thriller could out-score every game that was actually being played and pull your tab to a frozen stream — closes #71.

### PowerScore
- `computePowerScore` now returns a zeroed result for `delayed` games, exactly like it already did for halftime/intermission
- `computeScoringOpportunityBoost` returns 0 for delayed games — a delay freezes the situation (runners stranded on base, offense parked in the red zone), so the boost would otherwise keep paying out while nothing can happen
- Added `delayed` to the PowerScore `Game` type

### Core
- `computeLeagueIntervalMs` treats delayed games as frozen alongside intermission games: a league whose live games are all suspended backs off to the 40s intermission poll interval instead of polling eagerly for a score that cannot change

## PowerScore caps at 100 unless manually boosted — 2026-07-27

### Extension & core
- The headline PowerScore now saturates at 100 for everything the engine computes on its own: the base signals plus the favorite-team bonus, scoring-opportunity boost, and postseason boost are summed and clamped to 100 before the total is shown
- Only a manually-added per-game boost can push a score above 100 — a game boost is applied on top of the capped automatic total, so a maxed-out game with a `+15` boost reads `115` (previously any stacked automatic boost could drift a game past 100 on its own)
- Exposed `scoreMaxTotal` from `@arenaswap/core` so the background scorer clamps against the single shared ceiling constant

## Animated explainer on the docs site — 2026-07-22

### Docs website
- Added an auto-playing, looping explainer section to the landing page (just before the 30+ leagues section) that walks through the ArenaSwap engine in four beats: it watches every live game across your leagues, scores each one live, opens a game to reveal the full PowerScore breakdown (team logos, score, a live PowerScore trend graph, and the five signal bars), and switches your browser tab to the best game (issue #41)
- The illustrative scenes (a radial network of every league we support and the tab switch) are built with SVG and CSS so logos keep their aspect ratio and the data wires fan out cleanly without crossing; the PowerScore trend is a real ECharts line graph
- ECharts is imported modularly (only the line, grid, and canvas-renderer modules) and loaded lazily via `client:visible`, so it stays off the initial page load; the loop pauses while the tab is hidden
- `prefers-reduced-motion` and no-JS visitors get a static "Watch · Score · Switch" three-card summary instead of the animation — no motion at all
- Removed the older static "watch → score → switch" diagram from the Leagues section (the new animated explainer now tells that story); the scrolling league-logo marquee stays

## Performance, accuracy & tooling pass — 2026-07-22

A broad sweep for performance, correctness, dead code, accessibility, and tooling gaps across the monorepo. PowerScore scoring output and the extension visual design are unchanged (verified by the existing calibration tests and component tests).

### PowerScore & core (scoring output unchanged)
- Removed dead scorer tunables never read by the algorithm: `reasons.momentumRunPrefix`, `reasons.comebackBig`, `reasons.comebackModerate` (from both `constants.ts` and the `ScorerTunables` type)
- `otPreBoostMax` now derives from a shared `lateGameCloseCeiling` constant instead of a duplicated magic `36`, so the tied-overtime pre-boost stays in sync with `closeCeiling` (value unchanged: 2)
- Fixed the `PowerScoreResult.winProbabilityVariance` doc comment (said −10 to +10; the actual clamp is −5 to +5)
- Corrected the scoring-opportunity comment (only football uses the flat red-zone value; there is no hockey path)
- `isPowerScoreSnapshotLike` now validates `postseasonBoost`, consistent with the other optional boost fields
- Demo simulator now advances a realistic baseball/softball count — walk on the 4th ball, strikeout on the 3rd strike, side retired on the 3rd out (was 3/2/2, so demo mode could never show a 3-2 full count or 2 outs)

### Shared UI (`packages/ui`) — no visual change
- Team and odds-provider logos retry when their URL changes: the components track the failed `src` instead of a boolean, so a transiently-broken logo no longer stays hidden for the life of a reused card
- Empty team abbreviations now fall back to `?` (previously `??` let an empty string through)
- Deduplicated the PowerScore color computation in the live card
- The fallback translator now substitutes every occurrence of a placeholder and no longer misinterprets ` in substituted values

### Extension popup — no visual change
- Internationalized the error boundary (previously hardcoded English); added `errorBoundary.*` keys to all 8 locales
- Added accessible names to the master auto-switch toggle, the game-boost input, and the standby-tab selector; added `main.enableToggleLabel` to all 8 locales
- The ludicrous-speed overlay and footer now track and clear their ad-hoc timers on unmount (no setState after unmount)
- Preferences persistence: a failed `storage.local` write no longer aborts the whole save and skips the `storage.sync` write — each store is caught independently
- Removed the dead `buildScoreMarginOption` chart builder (never imported)

### Docs website
- Fixed the broken Chrome Web Store install links — 4 call-to-action buttons pointed at a malformed 27-character extension ID; they now use the canonical 32-character ID
- League logos (featured grid + marquee) now declare explicit dimensions and use `loading="lazy"` / `decoding="async"`, cutting layout shift and deferring ~60 off-screen image loads
- Below-the-fold PowerScore widgets hydrate with `client:visible` instead of `client:load`
- Content is visible without JavaScript (a `<noscript>` fallback for `.reveal`) and now respects `prefers-reduced-motion`

### Build & tooling
- `packages/ui` is now typechecked and linted (added `tsconfig.json` + `typecheck`/`lint` scripts, removed the oxlint ignore) — the shared UI library previously had no static analysis
- Unified TypeScript on `^7.0.2` across all packages; the extension, core, and powerscore declared `^6.0.3`, which had pulled three redundant nested TypeScript 6 installs
- `powerscore/tsconfig.json` now extends the shared base config (adds `noUncheckedIndexedAccess`)
- turbo: added `globalDependencies` for `tsconfig.base.json` and `.oxlintrc.json` so shared-config edits invalidate task caches
- The docs deploy workflow now also triggers on `packages/ui`, `packages/core`, `packages/powerscore`, and lockfile changes (it renders components and the PowerScore algorithm from those packages)
- Fixed a typo in the root package description ("30+w" → "30+")

## Game Boost pregame guard (#60) — 2026-07-22

Hides the manual Game Boost control for games that haven't started yet — closes #60.

- `gameDetailView` no longer renders `GameBoostInput` when `game.status === 'pre'`
- Boosting a pregame game previously triggered a state update that bounced the popup back to the main view; the control is now unavailable until a game is live, matching the expected behavior in the issue

## Delay State (#59) — 2026-07-21

Visual indicator for suspended games (rain delay, lightning delay, etc.) — closes #59.

- Added `delayed` and `delayDescription` fields to the `Game` type in `packages/core`
- ESPN status names matching `/delay/i` (e.g. `STATUS_RAIN_DELAY`) now populate these fields; description is taken from `status.type.description` (e.g. "Rain Delay")
- `EspnCompetitionStatusSchema` extended to parse the `description` field from ESPN's status type object
- Live game card shows a `⏸ DELAY` header row (amber, using `shade-color($warning, 40%)`) replacing the `● LIVE` row when a game is delayed
- Scores and clock dim to 40% opacity to signal the game is frozen
- A compact pill badge below the period shows the specific delay reason (e.g. "Rain Delay"); falls back to generic "Delay" if no description is available
- Badge follows the existing `.gc2-status-chip` design pattern using the brand `$warning` (#F1C40F) color with `rgba` tints
- New i18n keys `gameCard.delay` and `gameCard.delayFallback` added to all supported locales
## PowerScore Rewrite (#62) — 2026-07-21

Rewrites the PowerScore algorithm for sharper calibration across all sports — closes #62.

### Signal ceilings (per-signal max raised, overcomplete design)
- `scoreMaxCloseness` 40 → 42, `scoreMaxLateGame` 26 → 38, `scoreMaxMomentum` 30 → 38, `scoreMaxLeadChanges` 12 → 18, `scoreMaxComeback` 10 → 20
- Overcomplete ceilings sum to well above 100; headline total is capped at 100 so exciting multi-signal games saturate while dull games stay low

### Dynamic lateGame ceiling (replaces fixed `otEdgeMax`)
- Per-closeness-tier ceilings: `closeCeiling=36` (tight/close games), `fringeCeiling=22` (fringe), `blowoutCeiling=15` (blowout)
- Blowout games no longer earn near-max lateGame pressure regardless of margin
- `otPreBoostMax = 2`: tied games earn 2 extra points ramping through the final minute toward the reserved OT max

### Additive stall penalty (replaces multiplicative)
- `stallPenaltySteps: [{ minPolls: 15, deduction: 25 }, { minPolls: 8, deduction: 15 }]`
- Penalty is a flat deduction, not a fraction — same cut regardless of base score

### Win probability history wired into background loop
- `background.ts` now synthesizes per-game win probability histories (logistic function of score margin × game progress) and passes them to `computePowerScore` as the 4th argument
- Enables `computeWinProbVarianceScore` to apply a ±5 boost/penalty based on win-prob contestedness

### Calibration
- Tied buzzer with no history → 80 (closeness=42 + lateGame=38)
- 1-pt game final minute → ≥ 68 across basketball/hockey/football
- Blowout final seconds → ≤ 8 (blowoutCeiling=15, zero closeness)

### Simulator improvements
- `--early-game` flag: skips main simulation, runs 8 representative scenarios × 3 history depths (0, 1, 3 snapshots) in a table
- History-depth breakdown: samples bucketed into `0 / 1-2 / 3-9 / 10+` depths to surface early-game regressions

### Test suite
- Updated all `otEdgeMax` references → `closeCeiling`
- Updated stall penalty assertions to flat-deduction form (`deduction` not `multiplier`)
- Added calibration-target tests: tied buzzer ≥ 78, 1-pt final minute ≥ 63, stall = flat deduction, blowout lateGame < close lateGame, sport-agnostic hockey/football

## German i18n (#51) — 2026-07-21

Adds German (`de.json`) locale — closes #51.

- Standard High German (Hochdeutsch), suitable for Germany, Austria, and Switzerland
- Compound nouns used naturally throughout (e.g., "Wechselempfindlichkeit", "Spielstandverlauf", "Uhr-Stagnationsstrafe")
- `loading.m31`: "Cheesesteak holen" → "Bratwurst holen" — culturally equivalent stadium-food swap
- `loading.m45`: "tailgate party" → "Fangrillparty vor dem Stadion" — functionally equivalent German fan culture expression
- `stepSettings.sensitivity6` / `sensitivity.level.l6`: "Trigger Happy" → "Abzugsfinger" — idiomatic German equivalent
- `sensitivity.level.l7` / `stepSettings.sensitivity7`: kept as "Ludicrous Speed" (Spaceballs is known by the same title in German-speaking markets)
- `ludicrousSpeed.*`: Spaceballs dialogue translated in a punchy, theatrical style matching the film's German dub spirit; `prelaunch.l12` rendered as "Den Gurt kannst du dir sonst wohin stecken!" for maximum comedic punch
- `ludicrousSpeed.plaid`: "THEY'VE GONE TO PLAID" → "SIE SIND IM KAROMUSTER!" — accurate and funny
- `bso.balls/strikes/outs`: preserved as B/S/O (universal baseball scorecard abbreviations)
- `loading.m56`: "go birds" preserved exactly as-is (untranslatable Easter egg)
- All `$1`, `{placeholder}` interpolation markers preserved in correct grammatical positions
## French i18n (#52) — 2026-07-21

Adds French (`fr.json`) locale — closes #52.

- All 463 keys translated; zero keys missing, zero extras
- Register: informal *tu* throughout, modern casual tone matching ArenaSwap's sport-fan energy
- **Proprietary terms preserved untranslated**: ArenaSwap, PowerScore, Standby Stream, `go birds`
- **BSO abbreviations**: B/S/O kept as single capitals (universal baseball scorecard convention)
- **`sensitivity.level.l7`**: kept as "Ludicrous Speed" — the untranslated brand name carries the same punch in French
- **`ludicrousSpeed.*`**: Spaceballs is released in France as *La Folle Histoire de l'espace*; dialogue translated in a natural, idiomatic French register that matches the film's irreverent humor (e.g. "Poule mouillée ?" for "Chicken?"; "Au diable la ceinture !" for "Oh, buckle this!")
- **`ludicrousSpeed.signs`**: light/ridiculous translated ("VITESSE DE LA LUMIÈRE" / "VITESSE RIDICULE"); ludicrous rendered as "VITESSE LUDICROUS" to keep the proprietary speed-tier branding legible
- **`loading.m45`** "tailgate party" → "barbecue d'avant-match" — culturally equivalent pre-game gathering term
- **`footer.credit`**: "à Philadelphia & Boston par Ryan Mullin" — city names in English, framing words in French
- **`noGames` humor**: "Même les arbitres font la sieste." for the refs joke; "Le vendeur de hot-dogs est parti." preserves the absurdist energy
## Japanese i18n (#49) — 2026-07-21

Adds Japanese (`ja.json`) locale — closes #49.

- **Register**: Standard Japanese (標準語), polite-but-approachable です/ます form for UI text; casual register for humor strings (loading messages, noGames messages)
- **Spaceballs quotes** (`ludicrousSpeed.*`): Translated as faithful adaptations of the Japanese theatrical dub register — punchy, dramatic, and fun. "Ludicrous Speed" rendered as「バカ速モード」(lit. "ridiculous fast mode") for maximum comedic energy; the speed signs escalate as 光速 → ありえない速さ → バカ速モード
- **BSO abbreviations**: B/S/O preserved as-is — universally understood in Japanese baseball (野球)
- **`sensitivity.level.l7`**: "Ludicrous Speed" → 「バカ速モード」— intentionally over-the-top translation matching the English's tongue-in-cheek humor
- **`footer.credit`**: Rendered as「Ryan MullinがPhiladelphiaとBostonで作りました」— city names kept in Roman letters as is customary in Japanese for Western proper nouns
- **`loading.m56`**: "go birds" preserved exactly as instructed (proprietary/untranslatable Easter egg)
- **Sport terminology**: Standard Japanese used throughout — 野球, バスケットボール, アメリカンフットボール, サッカー, ホッケー, ソフトボール
- **`standbySection` / `standbyGuide.title`**: "Standby Stream" preserved as proprietary feature name
- **PowerScore signals**: Consistent naming across all three sections that reference them (detail, powerScore, stepGameDetail) — 接戦度 / 終盤 / 勢い / リード交代 / 逆転
## Chinese Simplified i18n (#50) — 2026-07-21

Adds Simplified Chinese (`zh_CN.json`) locale — closes #50.

- Standard Mainland China sports vocabulary throughout: 篮球 (basketball), 美式橄榄球 (American football), 冰球 (hockey), 棒球/垒球/足球 (baseball/softball/soccer)
- B/S/O scoreboard abbreviations preserved exactly — universally used in Chinese baseball broadcasts
- Proprietary terms ArenaSwap, PowerScore, and Standby Stream left untranslated; `go birds` (loading.m56) preserved verbatim per spec
- Spaceballs `ludicrousSpeed` dialogue adapted for natural humor without relying on film recognition — "荒唐速度" (ludicrous/absurd speed) lands the comedic energy in context
- `sensitivity.level.l7` rendered as "荒唐速度" matching the film section's tone
- `footer.credit` rendered as "Philadelphia 与 Boston，由 Ryan Mullin 打造" — city names kept in English per spec, surrounded by natural Chinese phrasing
- Informal register (您-form for respectful but approachable tone consistent with the platform's style) used throughout
- All `$1`, `{placeholder}` interpolation markers preserved exactly in their correct grammatical positions
## Portuguese i18n (#48) — 2026-07-21

Adds European Portuguese (`pt.json`) and Brazilian Portuguese (`pt_BR.json`) locales — closes #48.

- **Regional vocabulary split**: European Portuguese uses "separador" (browser tab), "definições" (settings), "desporto" (sport), "basebol", "basquetebol", "telemóvel"-register vocabulary, and pre-2009 spelling reform orthography (e.g. "directo", "activo", "óptimo"). Brazilian Portuguese uses "aba" (browser tab), "configurações" (settings), "esporte" (sport), "beisebol", "basquete", and post-reform spelling (e.g. "ativo", "direto").
- **Cultural loading message localization**: `loading.m31` — European PT localizes the cheesesteak to "bifana" (iconic Portuguese pork sandwich); Brazilian PT localizes it to "coxinha" (beloved deep-fried street snack). The hot-dog vendor (`loading.m6`, `loading.m58`) becomes "o tipo das bifanas" in PT and "o cara do coxinha" in pt-BR.
- **Sport idiom for `noGames.m4`**: European PT keeps a neutral tone ("Até os árbitros foram descansar"); Brazilian PT goes colloquial ("Até os árbitros foram bater um bolão" — they went to play a quick pick-up game).
- **`walkthrough.letsGo`**: European PT uses "Vamos lá" (measured enthusiasm); Brazilian PT uses "Bora!" (high-energy Brazilian slang).
- **Ludicrous Speed (Spaceballs)**: Both locales render "ludicrous speed" as "velocidade absurda", which is unambiguously over-the-top in both variants. "THEY'VE GONE TO PLAID" becomes "FORAM PARA O XADREZ!" in PT and "FORAM PRO XADREZ!" in pt-BR (casual contraction typical of Brazilian speech). The prelaunch "Que se lixe o cinto!" (PT) vs. "Que se dane o cinto!" (pt-BR) captures the same expletive dismissal with regionally appropriate vocabulary.
- **"Comeback"**: European PT uses "remontada" (also the standard Spanish term, widely understood in Portugal via football coverage); Brazilian PT uses "virada" (the dominant Brazilian Portuguese term for a comeback).
- **Proprietary terms preserved untranslated**: ArenaSwap, PowerScore, Standby Stream, `go birds`, all `$1`/`{placeholder}` markers, BSO abbreviations (B/S/O).

## Rewrite README (#28) — 2026-07-19

Creates a clean, professional README from scratch in `.github/README.md`.

- Dark/light mode logo via `<picture>` using SVG (dark) and transparent-background PNG (light)
- 11 badges: version, license, Chrome/Firefox/Edge support, TypeScript, React, WXT, Turborepo, Node.js, npm
- Three new demo screenshots from marketing assets shown side by side
- Correct homepage URL, no trademarked taglines, concise feature list, dev setup table, and monorepo map

## Spanish i18n cleanup (#53) — 2026-07-18

Polishes the existing Spanish (`es.json`) translation for quality, consistency, and natural phrasing across all Spanish-speaking regions.

- **Signal name consistency**: Standardized PowerScore signal names across all three sections that reference them (`detail`, `powerScore`, `stepGameDetail`). "Closeness" → "Igualdad" everywhere; "Late-game" → "Recta final" everywhere; "Lead changes" → "Cambios de ventaja" everywhere
- **Sport-agnostic `noGames.m1`**: "saque inicial" (soccer-specific) → "pitazo inicial" (referee whistle — works across all sports)
- **Livelier copy**: `stepAutoSwitch.revealBody` now uses "se puso al rojo vivo" instead of the flat "se puso emocionante"
- **Tailgate localization**: `loading.m45` changed to "asado antes del partido" — culturally resonant equivalent of "tailgate party" across Latin America and Spain
- **Gender-neutral copy**: `stepReAccess.body` changed "un amigo" → "alguien" for inclusive phrasing
- **Lexical consistency**: `tooltipGameBoost` and `postseasonBoost.explainer` changed from "juego" → "partido" to match the rest of the file
- **Energy fixes**: `walkthrough.letsGo` now correctly uses "¡Vamos!" (both exclamation marks); `proTip.general.t5` tightened to "mejora cuanto más tiempo lo dejas correr"

## Expand walkthrough to 8 steps — 2026-07-18

Implements #25. Adds three new walkthrough steps (game detail, leagues & favorites, and re-accessing the tour), expanding the total from 5 to 8 steps. Updates all step counters across existing steps and refreshes Cypress tests to cover the full 8-step flow.

- **Step 6 — Dive into any game** (`walkthroughStepGameDetail.tsx`): Interactive mock game card the user taps to reveal a live PowerScore breakdown preview (Closeness, Late Game, Momentum, Lead Changes, Comeback bars), explaining that any game card opens a full detail view with signal history and a manual Game Boost slider
- **Step 7 — Leagues & favorites** (`walkthroughStepLeaguesFavorites.tsx`): Two-tab panel (Leagues / Favorites) with interactive toggles and star controls. Leagues tab explains that enabling a league tells ArenaSwap to monitor that competition; Favorites tab shows that starring a team adds a PowerScore bonus to their games — not a filter, just a boost. A yellow hint banner appears once a team is starred
- **Step 8 — Coming back here** (`walkthroughStepReAccess.tsx`): Shows a decorative mock of the main-view header with the `?` button highlighted and a callout arrow, explaining the tour can be replayed any time
- Updated step counters in `walkthroughStepToggle`, `walkthroughStepPowerScore`, `walkthroughStepTabAssign`, `walkthroughStepAutoSwitch`, and `walkthroughStepSettings` from `X of 5` → `X of 8`
- Updated `walkthroughView.tsx`: extended `walkthroughStep` type, added `next`/`back` cases for steps 6–8, and mounted all three new step components
- Added `stepGameDetail`, `stepLeaguesFavorites`, and `stepReAccess` translation keys to `en.json` and `es.json`
- Updated `walkthroughView.cy.tsx`: updated all step-counter assertions (`of 5` → `of 8`), added tests for steps 6–8 including the tap-to-reveal interaction on step 6, the tab-switcher on step 7, and the done-screen flow through all 8 steps

## Tutorial UX polish — 2026-07-17

PowerScore walkthrough visual improvements and demo game logos.

- **Solid orbit dots**: Each PowerScore signal dot is now rendered as a solid filled circle (previously was a hollow ring outline with glow only) with a double box-shadow glow for extra pop
- **Bloom-to-fullscreen animation**: Tapping the active glowing dot in the signal sub-steps triggers a circle-clip reveal that expands from the dot position, flooding the full popup in the signal's color; the overlay shows the signal name, max points badge, measurement explanation, and description with auto-contrasting text (black on light colors, white on dark); a "Got it" button collapses it back with a matching shrink animation
- **Boost/penalty contrast fix**: The info cards for boosts and penalties now use an on-brand semi-transparent colored background (`color + 18` opacity) with proper light `#e6edf3` body text and muted `#8b949e` section headers instead of the previous illegible white text on a gray `bg-dark-subtle` card
- **Demo game logos**: `walkthroughStepAutoSwitch` and `walkthroughStepTabAssign` now render real ESPN CDN team logos (Eagles, Giants, 76ers, Celtics) via `<img>` tags with a colored-circle fallback if the network request fails
- **CSS additions in [global.scss](file:///Users/rpmul/source/arenaswap/apps/extension/assets/global.scss)**: New `@keyframes psBloomIn` / `psBloomOut` using `clip-path: circle()` anchored to a CSS custom property `--bloom-origin-x/y`, plus supporting classes `.ps-bloom-overlay`, `.ps-bloom-content`, `.ps-bloom-dot-badge`, `.ps-bloom-label`, `.ps-bloom-max-badge`, `.ps-bloom-section-head`, `.ps-bloom-body`, `.ps-bloom-got-it`

## PowerScore Tutorial Bloom and Description Boxes Update — 2026-07-17

Streamlined the PowerScore tutorial visual overlays and automated the bloom animation cycles.

- **Removed Description Boxes**: Stripped the long description heading, body text, and max points badge from the `BloomOverlay` inside [walkthroughStepPowerScore.tsx](file:///Users/rpmul/source/arenaswap/apps/extension/entrypoints/popup/components/walkthroughStepPowerScore.tsx) to focus only on clean visual indicators. Also removed the textual info card section below the visual in the boosts/penalties phases.
- **Automated Looping Bloom**: Programmed the signal dots to bloom automatically when active. The overlay blooms in, holds for 1.5 seconds, shrinks back down to a dot, pauses for 0.5 seconds, and loops repeatedly on its own.
- **Navigation Safety**: Configured the loop to safely clear, reset, and stop when the user advances, backs up, or steps away from the slide.


## PowerScore walkthrough introduction — 2026-07-17

Implements #36. Introduces a comprehensive walkthrough step for PowerScore right after the initial toggle step. It walks the user through all five excitement signals (Closeness, Late-game, Momentum, Lead changes, Comeback) and six boosts/penalties (Clock stall, Volatility, Favorite teams, Manual boost, Scoring opportunity, Postseason) with a custom orbital animation, interactive progress indicators, and rich visual highlights.

- Created new walkthrough step component [walkthroughStepPowerScore.tsx](file:///Users/rpmul/source/arenaswap/apps/extension/entrypoints/popup/components/walkthroughStepPowerScore.tsx) with a step-by-step presentation, active highlighting of active signals, centered icons for adjustments, and interactive progress-dot navigation
- Updated [walkthroughView.tsx](file:///Users/rpmul/source/arenaswap/apps/extension/entrypoints/popup/components/walkthroughView.tsx) to handle 5 total steps, support transitions, and manage passing `initialSubStep` when going back from the tab assignment step
- Shifted step numbering for subsequent steps ([walkthroughStepToggle.tsx](file:///Users/rpmul/source/arenaswap/apps/extension/entrypoints/popup/components/walkthroughStepToggle.tsx), [walkthroughStepTabAssign.tsx](file:///Users/rpmul/source/arenaswap/apps/extension/entrypoints/popup/components/walkthroughStepTabAssign.tsx), [walkthroughStepAutoSwitch.tsx](file:///Users/rpmul/source/arenaswap/apps/extension/entrypoints/popup/components/walkthroughStepAutoSwitch.tsx), [walkthroughStepSettings.tsx](file:///Users/rpmul/source/arenaswap/apps/extension/entrypoints/popup/components/walkthroughStepSettings.tsx)) and updated their step translation parameters to match Step 3, 4, and 5 of 5
- Appended custom CSS animation styles for the rotating orbital ring, pulsing highlighted signal dots, custom boost icons, and progress indicators to [global.scss](file:///Users/rpmul/source/arenaswap/apps/extension/assets/global.scss)
- Added fully translated strings in English ([en.json](file:///Users/rpmul/source/arenaswap/apps/extension/locales/en.json)) and Spanish ([es.json](file:///Users/rpmul/source/arenaswap/apps/extension/locales/es.json)) for the new walkthrough screens
- Installed `@types/bootstrap` as a devDependency in [package.json](file:///Users/rpmul/source/arenaswap/apps/extension/package.json) to fix type-checking errors
- Updated Cypress component tests in [walkthroughView.cy.tsx](file:///Users/rpmul/source/arenaswap/apps/extension/cypress/component/walkthroughView.cy.tsx) to cover the new 5-step flow, sub-step click navigations, and back-button behavior

## i18n API cleanup — 2026-07-17

Implements #54. Brings the i18n setup fully in line with the `@wxt-dev/i18n` spec.

- Converted `locales/en.yml` and `locales/es.yml` to `locales/en.json` and `locales/es.json` — the module supports `.json` natively and no conversion step is needed
- Removed the custom dev-mode Vite plugin from `wxt.config.ts` that bypassed `chrome.i18n.getMessage()` by reading YAML directly at dev-server startup
- Removed the `yaml` import and all related helpers (`DEV_I18N_ID`, `buildDevI18nModule`, `devLocale`) from `wxt.config.ts`
- Removed `dev:es` and `dev:firefox:es` scripts that relied on `ARENASWAP_LOCALE`
- Updated the Jest and Cypress i18n stubs to load `en.json` directly via `JSON.parse` / Vite's native JSON import instead of YAML parsing
- Fixed a YAML-to-JSON conversion artifact: the `switchDelay.off` key was incorrectly serialized as `false` (YAML 1.1 boolean coercion) — corrected to `"off"` in both locale files

## Use native Astro Image component on docs website — 2026-07-16

Implements #40. Replaces bare `<img>` tags with Astro's `<Image>` component across the docs site for all locally-served assets, unlocking build-time WebP conversion, automatic `width`/`height` inference, and `decoding="async"` + `loading="lazy"` defaults.

- Moved `full_logo_white_on_transparent.svg`, `icon_white_on_transparent.svg`, `leagues/mlb.png`, `leagues/nfl.png`, and `128.png` to `src/assets/` so Astro can optimize them at build time
- Updated `Nav.astro`, `Footer.astro`, `Hero.astro`, `Leagues.astro`, and all four screenshot pages to import assets and use `<Image>`
- Above-the-fold images (nav logo, hero logo) set `loading="eager"` to avoid lazy-loading critical content
- External URLs (ESPN CDN league logos, Wikipedia photos) and dynamic blog post images remain as `<img>` tags — these cannot be optimized without configuring a remote image service
- Original assets retained in `public/images/` for URL-based references (favicons, OG meta tags, Notification API)

## Normalization indicator in PowerScore Breakdown — 2026-07-16

When one or more signals are disabled, the Signals Total row in the PowerScore Breakdown now shows the normalization effect visually: the raw enabled-signal sum (strikethrough, gray) followed by an arrow and the re-scaled value (e.g. ~~78~~ → 89). A brief note below explains the re-scaling, and a tooltip on the "Signals total" label describes the mechanism. Fully translated (English + Spanish).

## PowerScore signal toggles — 2026-07-16

Implements #34. Users can now turn individual PowerScore signals (Closeness, Late-game, Momentum, Lead changes, Comeback) on or off from Settings → Switching.

- Added `disabledSignals: SignalName[]` to `UserPreferences`; persisted and synced across devices
- New `applyDisabledSignals` helper in `@arenaswap/core/constants` zeros out disabled signals and re-normalizes the remaining ones to keep PowerScores in the 0–100 range
- Background scorer applies signal filtering immediately after computing each game's base score, so tab-switching decisions reflect disabled signals
- Settings UI: a new "PowerScore Signals" section with a toggle per signal; the last active signal's toggle is disabled to prevent turning off all signals
- PowerScore Breakdown: disabled signals display greyed-out with an "Off" badge instead of a progress bar
- Fully translated (English + Spanish)

## Signal tooltips — 2026-07-15

Implements #35. Users can now hover (or focus) any signal or boost/penalty row in the PowerScore Breakdown to see a plain-English explanation of what it measures.

- Added `SignalTooltipIcon` component — a tiny Bootstrap 5 `Tooltip`-powered `(?)` button, initialized via `useEffect`, disposed on unmount
- Tooltips wired up for all 5 signals (Closeness, Late-game, Momentum, Lead changes, Comeback) and all 6 boosts/penalties (Clock stall, Volatility, Favorite, Game boost, Scoring opportunity, Postseason)
- New `.signal-tooltip-btn` CSS class for compact, unobtrusive icon styling
- Fully translated (English + Spanish)

## Date-range setting for upcoming games — 2026-07-14

Implements #33. Users can now control how many days ahead the "Up Next" section looks for upcoming games (1–14 days, default 7). The setting appears in Settings → Switching below the "Show upcoming games" toggle — only when that toggle is on.

- Added `upcomingGamesDays` preference (default 7, clamped to 1–14 on load)
- Settings UI: range slider labeled "Days ahead" — gated behind the `showUpcomingGames` toggle
- ESPN fetch window now respects the preference (previously hardcoded to 4 days); background re-fetches upcoming games when the value changes
- "Show more" button in the Up Next section: initially shows up to 10 games, reveals the rest on demand to prevent excessive popup scrolling
- Fully translated (English + Spanish)

## Fix TypeScript 7 type errors — 2026-07-14

Fixed three type errors in `ludicrousSpeedOverlay.tsx` introduced by the TypeScript 7 upgrade. The `introLines`, `prelaunchLines`, and `panicLines` arrays were annotated as `{ key: string; ms: number }[]`, but `i18n.t()` only accepts specific literal key types (not the broad `string`). TypeScript 7 correctly enforces this. Fixed by adding `as const` to each array so keys are inferred as their literal types.

## Improve Cypress component test coverage — 2026-07-14

Adds 5 new Cypress component test files covering UI surfaces that had no test coverage:

- **`powerScoreBreakdown.cy.tsx`** (15 tests) — signal progress bars, stall penalty display, win probability variance labels (Volatility Boost / Penalty / neutral), favorite and game boost rows
- **`gameBoostInput.cy.tsx`** (5 tests) — renders, displays current value, fires `onSetGameBoost`, clamps negatives to 0, uses game ID in the input `id`
- **`postseasonBoostInput.cy.tsx`** (4 tests) — renders label and explainer, displays current value, fires `onChange`, clamps negatives to 0
- **`walkthroughView.cy.tsx`** (13 tests) — full step navigation (1→2→3→4→done), back navigation, step 3 Next-button disabled until animation timer fires, done-screen completion callback, step 1 interactive toggle demo
- **`setupView.cy.tsx`** (21 tests) — Switching/Leagues tab switching, standby stream threshold visibility, no-leagues warning badge, temperature unit toggle label, demo mode toggle

Also adds a `ludicrousSpeedOverlay` Cypress stub and registers it in `cypress.config.ts` so `sensitivitySlider` (imported by `setupView`) resolves cleanly in the component test environment.

## Fix series dots ordering — 2026-07-12

Fixed a bug where series win dots were rendered in the wrong positions. The ESPN API returns series events with future (unplayed) games listed first and completed games at the end of the array. The dots component now sorts completed events to the front before rendering, so filled dots correctly appear on the left for each win earned so far.

## PowerScore breakdown display fixes — 2026-07-12

- **Clock stall penalty** now shows a signed number (`0` or `-X`) instead of "none"/"applied" text
- **Volatility label** is now dynamic: "Volatility Boost" when positive, "Volatility Penalty" when negative, "Volatility" when neutral
- **Favorite bonus** renamed to "Favorite Boost" for consistent boost/penalty language
- Added `stallPenalty` field to `PowerScoreResult` and `PowerScoreSnapshot` types — the scorer now exposes the exact points removed by the stall penalty

## Volatility boost/penalty reclassification — 2026-07-12

Reclassifies the win probability variance modifier from a "signal" to a proper boost/penalty. The score calculation is unchanged; this is a UI, language, and visual style update. The breakdown now shows Volatility alongside other boosts (Favorite, Game boost, Scoring opportunity, Postseason) with a signed +/− value instead of a progress bar. Positive volatility is colored purple; negative (blowout penalty) is red.

## Win Probability Variance boost/penalty — 2026-07-12

Adds a new ±10-point PowerScore modifier that rewards games with volatile win probability swings and penalises one-sided blowouts. Closes [#32](https://github.com/hiteacheryouare/arenaswap/issues/32).

### How it works

ESPN's summary API returns the full win-probability history for a live game in a single call. The scorer computes the statistical variance of the `homeWinPercentage` array and maps it linearly from [0, `maxVariance`] → [−10, +10]:

- **+10** — win probability is swinging wildly all game; neither team has a comfortable lead for long
- **0** — neutral variance (the midpoint between a stable and a chaotic game)
- **−10** — perfectly stable; one team has been dominant from the opening whistle

The background service refreshes win-probability data every 60 seconds per live game (much less often than the scoreboard poll) and evicts stale entries when games go final.

### What changed

**`packages/powerscore/src/types.ts`**
- `PowerScoreResult` — added optional `winProbabilityVariance?: number`
- `ScorerTunables` — added `winProbabilityVariance: { maxVariance, minDataPoints }` config block

**`packages/powerscore/src/constants.ts`**
- `scoreWinProbVarianceMax = 10` — the ±10 cap exported for UI consumers
- `scorerTunables.scores.winProbabilityVariance` — tunable `maxVariance: 0.10`, `minDataPoints: 5`

**`packages/powerscore/src/scorer.ts`**
- `computeWinProbVarianceScore(winProbHistory)` — new exported helper; returns a rounded integer in [−10, +10] or `undefined` when data is insufficient
- `computePowerScore` — accepts optional 4th argument `winProbabilityHistory: number[]`; integrates the variance modifier into `rawTotal` and always emits `baseTotal`
- `normalizePowerScoreResult` — normalises and passes through `winProbabilityVariance`

**`packages/powerscore/tests/scorer.test.ts`**
- 12 new tests covering `computeWinProbVarianceScore` (stable → −10, extreme → +10, neutral ≈ 0) and the integration with `computePowerScore` / `normalizePowerScoreResult`

**`packages/core/src/apiClient.ts`**
- `fetchWinProbabilityHistory(espnPath, gameId)` — hits ESPN's summary endpoint, extracts `winprobability[].homeWinPercentage`, returns `number[]`

**`packages/core/src/constants.ts`** / **`packages/core/src/index.ts`**
- Re-exports `scoreWinProbVarianceMax` and `computeWinProbVarianceScore` so consuming apps don't need a direct `powerscore` import

**`packages/core/src/types.ts`**
- `PowerScoreSnapshot` — added `winProbabilityVariance?: number` to match `PowerScoreResult`

**`apps/extension/entrypoints/background.ts`**
- `winProbabilityCache` map (keyed by game ID) — stores `{ data, fetchedAt }` and evicts finished games
- `refreshWinProbability(liveGames)` — fire-and-forget refresh every 60 s; failures silently ignored
- `computePowerScore` call now passes `winProbabilityCache.get(g.id)?.data ?? []` as the 4th argument

**`apps/extension/entrypoints/popup/components/powerScoreBreakdown.tsx`**
- New `winProbabilityVariance?: number` prop
- Renders a purple `●` row between the five core signals and "Signals total" when data is present; shows the signed value (`+8`, `−4`) against a `/10` max and a proportional progress bar

**`apps/extension/entrypoints/popup/components/gameDetailView.tsx`**
- Extracts `winProbabilityVariance` from the active PowerScore result and passes it to `PowerScoreBreakdown`

**`apps/extension/locales/en.yml`** / **`es.yml`**
- `powerScore.signalWinProbVariance` added in English ("Win prob variance") and Spanish ("Varianza de prob. victoria")
- `proTip.detail.t0` updated to mention win probability variance alongside the other five signals

## Screenshot popup sizing + hero real-card swap — 2026-07-11

Real game cards (from the ui package) are taller than the old hand-coded mockups. Scaled screenshot popups to 82% so they fit within the 1280×800 canvas, and replaced the hero section's hand-coded demo cards with real `LiveGameCard` components.

### What changed

**`apps/docs/src/pages/screenshots/_screenshot.scss`**
- Added `transform: scale(0.82)` to `.popup-overlay .popup` and `.popup-float .popup` so card content fits within the canvas without overflow

**`apps/docs/src/pages/screenshots/3.astro`**
- Updated `.popup-large { transform: translateX(-50%) scale(0.82); transform-origin: top center; }`
- Adjusted `.dropdown-menu-fake { top: 495px; }` (was 380px) to align with scaled card position

**`apps/docs/src/styles/global.scss`**
- Added `@import '@arenaswap/ui/src/game-card';` so game card CSS is available site-wide
- Removed `height: 560px` from `.demo-popup` (popup auto-sizes to real card content)
- Removed all hand-coded `.demo-card` / `.demo-matchup` / `.demo-ps-*` CSS (replaced by real component styles)

**`apps/docs/src/components/HeroCard.tsx`** (new)
- Thin wrapper around `LiveGameCard` for the hero section (same pattern as `ScreenshotCard.tsx`)

**`apps/docs/src/components/Hero.astro`**
- Added game data for BU vs NU (NCAAB) and KC vs BAL (NFL)
- Replaced two `.demo-card` HTML blocks with `<HeroCard>` components

## UI package refactor — 2026-07-11

Extracted all game card components from `apps/extension` into `packages/ui` so they can be shared across all surfaces (extension and docs). Screenshot pages in `apps/docs` now render real extension components instead of hand-coded HTML mockups.

### What changed

**`packages/ui/src/components/`** (all new)
- `colorUtils.ts` — `resolveTeamColorPair` and its private helpers extracted from `gameDetailChartOptions.ts`; now shared between game cards and charts
- `i18nContext.tsx` — `TranslationContext` + `useT()` hook with default English strings; lets game card components work without WXT's `#i18n` virtual module
- `gameCardTypes.ts` — `GameCardDisplayProps` interface (no WXT/browser deps); uses `tabSlot?: ReactNode` instead of tab-specific props
- `gameCardShared.tsx`, `gameCard.tsx`, `liveGameCard.tsx`, `preGameCard.tsx`, `bsoIndicator.tsx` — moved from extension; use `useT()` and `tabSlot` pattern
- `_game-card.scss` — all game card CSS extracted from extension's `bootstrap.scss`
- `components/index.ts` — barrel exports for all moved components

**`packages/ui/package.json`**
- Added `peerDependencies: { react: ">=18", react-dom: ">=18" }` and `dependencies: { "@arenaswap/core": "*" }`

**`apps/extension/`**
- `app.tsx` — wraps popup in `<TranslationContext.Provider value={i18n.t}>`
- `liveGameCard.tsx`, `preGameCard.tsx` — replaced with thin wrappers that inject `<TabAssignSelect>` as `tabSlot`
- `gameCard.tsx` — real dispatcher using extension wrappers (not a re-export)
- `gameCardTypes.ts` — re-exports shared types from ui; keeps extension-specific superset
- `baseDiamond.tsx`, `flipScore.tsx`, `bsoIndicator.tsx`, `weatherUtils.ts`, `gameCardShared.tsx` — thin re-exports
- `gameDetailChartOptions.ts` — removed duplicate color utilities; imports from `@arenaswap/ui/src/components/colorUtils`
- `gameDetailView.tsx`, `seriesDots.tsx` — updated imports to use `@arenaswap/ui/src/components/colorUtils` directly
- `bootstrap.scss` — removed game card CSS (now in ui package); imports `@arenaswap/ui/src/game-card`
- `cypress/component/liveGameCard.cy.tsx` — updated import path; removed tab props; added `bettingPrefs`

**`apps/docs/src/`**
- `components/ScreenshotCard.tsx` (new) — React wrapper around `LiveGameCard` that accepts `tabLabel?: string`; works around Astro JSX-as-prop limitation
- `pages/screenshots/_screenshot.scss` — replaced hand-rolled fonts/card styles with imports from ui package
- `pages/screenshots/1.astro`, `2.astro`, `3.astro` — replaced mock HTML game cards with real `<ScreenshotCard>` components using typed mock data

## Team color pair normalization — 2026-07-09

Previously, each team's display color was resolved independently: pick the primary color, fall back to the alternate if the primary was too dark. This worked for solid borders but failed for matchup gradients and chart lines when two teams happened to share similar primary colors — both sides of the card blended into the same hue and chart lines were hard to distinguish.

### What changed

**`packages/core/src/types.ts`**
- Added `alternateColor?: string` to the `Team` interface so both the primary and alternate colors survive the API parse and are available to rendering code.

**`packages/core/src/apiClient.ts`**
- Replaced `normalizeTeamColor` (returned one color, discarded the other) with `resolveTeamColors`, which returns `{ color, alternateColor }` spread directly onto the team object. When the primary is too dark for the UI the alternate is promoted to `color` and the original primary is kept as `alternateColor` so the pair-resolver can still try it (it will lighten it for charts).

**`apps/extension/entrypoints/popup/components/gameDetailChartOptions.ts`**
- Added `colorDistance` (Euclidean RGB distance), `isUsable` (luminance 3–95%), and `pickPair`.
- `pickPair` tries all four primary/alternate combinations for the two teams and picks whichever pair exceeds the clash threshold (65) or, failing that, maximizes color distance. Falls back to the primary pair if no alternate combination improves things.
- New exported `resolveTeamColorPair(away, home, awayFallback, homeFallback, lighten?)` wraps `pickPair` and optionally runs `resolveReadableSeriesColor` (now private) on the result for dark-background chart use.
- Lowered the luminance brightening threshold from `0.34` to `0.10` — only genuinely near-black colors get mixed toward white; mid-dark colors like navy now pass through unchanged.
- All three chart builders (`buildTeamScoreOption`, `buildScoreMarginOption`, `buildWinProbabilityOption`) updated to call `resolveTeamColorPair`.

**`apps/extension/entrypoints/popup/components/gameDetailView.tsx`**, **`gameCardShared.tsx`**, **`seriesDots.tsx`**
- All team color reads replaced with `resolveTeamColorPair` calls, so card gradients, border accents, chart legend dots, and series dots all use the same clash-aware pair.

**`packages/powerscore/tests/polling-coupling.test.ts`**
- Extracted `bballScoreAtT` helper; removed leftover `console.log` / `console.table` debug calls.

## Fix poll-frequency / history-window coupling — 2026-07-07

Previously, history was capped at a fixed snapshot count (`maxHistorySnapshots`). At fast poll rates (6s on exciting games), the window covered only ~3 minutes of real time — meaning a momentum run or comeback rally that started just outside that window became completely invisible to the scorer, even if its decay should still be contributing points. This created a negative feedback loop: high excitement → faster polls → narrower history → signals drop out → score deflates.

### What changed

Replaced count-based history trimming with **time-based windows** (`historyWindowMs`) set per sport at `4 × max(decayHalfLifeMs)`:

| Sport | Before (count) | After (time window) |
|---|---|---|
| Basketball | 32 snapshots | 5 min |
| Hockey | 30 snapshots | 16 min |
| Baseball / Softball | 36 snapshots | 12 min |
| Football | 32 snapshots | 12 min |
| Soccer | 40 snapshots | 20 min |

The `historyWindowMs` replaces `maxHistorySnapshots` on `SportTypeConfig`. The background service worker, both powerscore scripts, and all history trim sites now use `while (snapshots[0].timestamp < cutoff) snapshots.shift()` instead of a count cap.

### Result

Hockey goals scored 7 minutes ago produce the same momentum score (7 pts) at 6s polling as at 25s polling. Before the fix: 0 pts at 6s, 7 pts at 25s — an 11-point total gap.

## Redesigned debug panel — 2026-07-06

Replaced the minimal green-on-black key-value debug panel with a fully redesigned, sectioned debug panel that exposes deep runtime internals previously inaccessible from the UI.

### New `GET_DEBUG_STATE` background message

The background service worker now responds to `GET_DEBUG_STATE` with a `DebugState` payload covering:
- **Per-league poll modes** (`eager` / `dormant`) from the `pollModeTracker`
- **Clock stall map** — per-game stall counts and last-seen clock values
- **Tab registry** — which tabs are assigned to which games
- **Pending switch** — queued tab switch with reason
- **Last switch timestamp**
- **Demo mode flag**
- **Game counts** (live / upcoming / total)
- **Standby stream state**
- **Current PowerScore results**
- **Active sensitivity, cooldown, and switch delay preferences**
- **Game labels** (away·home abbreviation pairs for display)

### Debug panel UI (popupFooter)

- **RUNTIME** — version, build mode, browser, MV, extension ID
- **POLLING** — live/demo mode badge, per-league eager/dormant grid, last switch time, pending switch, sensitivity threshold, cooldown, delay
- **GAMES** — live/upcoming/total counts, tab registrations, standby stream status
- **CLOCK STALLS** — per-game stall counts with last clock value (hidden when none active)
- **POWERSCORE** — top 5 live games ranked by score with block-character bar and stall indicator
- **STORAGE** — key counts and key names for sync/local/session storage
- Auto-refreshes every 5 seconds while open; shows last-refreshed timestamp

### Styling

Replaced flat monospace panel with Lekton-font sectioned layout using brand gradient accent colors per section, status badges, and block-character score bars. Panel scrolls internally at `max-height: 17rem`.

**Files changed:** `packages/core/src/types.ts`, `apps/extension/entrypoints/background.ts`, `apps/extension/entrypoints/popup/components/popupFooter.jsx`, `apps/extension/assets/bootstrap.scss`

---

## PowerScore-driven adaptive polling — 2026-07-06

Replaces the flat 15-second eager poll interval with a continuous PowerScore-based schedule. The more exciting the live game, the sooner the league polls again — concentrating API budget on moments that matter without increasing total request volume.

### Polling mode hierarchy

| State | Condition | Interval |
|---|---|---|
| Eager | Live game, PowerScore 100 | ~6s |
| Eager | Live game, PowerScore 50 | ~15.5s |
| Eager | Live game, PowerScore 0 | ~25s |
| Intermission | All live games in halftime/break | ~40s |
| Dormant | 2 consecutive empty polls | 120–180s (unchanged) |
| Error | Fetch failure | ~15s (unchanged) |

Jitter now scales proportionally — fast (critical) polls stay tight (±500ms), slow polls spread more (±2s).

**`packages/core/src/pollIntervalComputer.ts`** *(new)*
- `computeEagerIntervalMs(score)` — linear interpolation from PowerScore (0–100) to interval (25s→6s)
- `computeLeagueIntervalMs(liveGames, currentScores)` — picks the highest-scoring active game in the league to set the pace; returns `pollIntermissionMs` when all live games have `intermission === true`

**`packages/core/src/constants.ts`**
- Added `pollMinEagerMs = 6_000`, `pollMaxEagerMs = 25_000`, `pollIntermissionMs = 40_000`
- `pollIntervalMs = 15_000` retained for initial stagger, demo mode, and error fallback

**`packages/core/src/index.ts`**
- Exports `computeEagerIntervalMs`, `computeLeagueIntervalMs`, and the three new interval constants

**`apps/extension/entrypoints/background.ts`**
- `tickLeague` replaces the hardcoded `pollIntervalMs + jitter` with a call to `computeLeagueIntervalMs` using the previous poll's `currentScores` (available in closure scope at reschedule time)
- Dormant and error-fallback branches are unchanged

**`packages/core/tests/pollIntervalComputer.test.ts`** *(new)*
- 13 unit tests: boundary clamping, midpoint accuracy, intermission detection, multi-game max-score selection, empty-scores fallback, scores-exceeding-100 clamping

**Marketing & docs**
- `apps/extension/marketing/desc_long.md`, `short_summary_chrome.txt`, `short_summary_edge_ff.txt` — replaced "every 15 seconds" with adaptive-polling copy; frames "as often as every 6 seconds during tense moments" as a feature
- `apps/docs/src/content/blog/introducing-v2.mdx` — updated polling section and table to reflect the three-tier hierarchy
- `apps/docs/src/components/LivePowerScores.tsx` — removed hardcoded "every 15 seconds" from the no-games copy

## Add @arenaswap/ui shared design-system package — 2026-07-06

Created `packages/ui` as the single source of truth for the ArenaSwap brand tokens, eliminating duplication of colors, Bootstrap overrides, and font declarations across the docs site and browser extension.

**`packages/ui` (new)**
- `src/_bootstrap.scss` — shared Bootstrap 5 variable overrides (colors, dark theme, font stack, form controls); import before `@import 'bootstrap/scss/bootstrap'` in each app
- `src/_fonts.scss` — parameterizable `@font-face` declarations for DM Sans and Lekton; configure `$font-base-url` before importing to set the right font path per app
- `src/tailwind.css` — Tailwind v4 `@theme` tokens mapping all brand colors and typography to Tailwind utilities

**`apps/docs`**
- `global.scss`: replaced duplicated Bootstrap overrides + font-face block with imports from `@arenaswap/ui`; docs-specific accordion/navbar/link overrides remain
- `tailwind.css`: now imports from `@arenaswap/ui/src/tailwind.css` instead of re-declaring the `@theme` block
- `components/LivePowerScores.tsx`: fixed anti-pattern import from `../../../../packages/powerscore/src/...` — now imports from the `powerscore` package API
- `package.json`: added `@arenaswap/ui: "*"` and `powerscore: "*"` as explicit workspace dependencies (Turborepo requires declared deps to build the graph correctly)

**`apps/extension`**
- `assets/bootstrap.scss`: replaced duplicated Bootstrap variable block with import from `@arenaswap/ui`; extension-specific sizing/form-control overrides remain
- `assets/global.scss`: replaced duplicated `@font-face` declarations with import from `@arenaswap/ui/src/fonts`
- `package.json`: added `@arenaswap/ui: "*"` workspace dependency

**Root**
- `package.json`: fixed `"lint": "turbo lint"` anti-pattern → `"turbo run lint"` (shorthand is for interactive terminal use only, not scripts)

## Move betting and weather settings under Options — 2026-07-05

Consolidated the Betting and Weather section headings into the Options section in setup view, removing two separate headings and placing the toggles alongside the other option toggles.

## Add postseason boost to PowerScore — 2026-07-05

Adds a flat, user-tunable PowerScore bonus for any game ESPN classifies as postseason (`season.type === 3`), covering playoffs, tournaments, and knockout rounds across all leagues. Defaults to +5 points.

**`packages/core/src/espnSchemas.ts`**
- Added `EspnSeasonSchema` (`year`, `type`, `slug`)
- Added `season?: EspnSeason` field to `EspnEventSchema`

**`packages/core/src/types.ts`**
- Added `isPostseason?: boolean` to `Game`
- Added `postseasonBoostPoints: number` to `UserPreferences`
- Added `postseasonBoost?: number` to `PowerScoreSnapshot`

**`packages/powerScore/src/types.ts`**
- Added `postseasonBoost?: number` to `PowerScoreResult`

**`packages/powerScore/src/scorer.ts`**
- Normalizes `postseasonBoost` through `normalizePowerScoreResult`

**`packages/core/src/apiClient.ts`**
- Parses `isPostseason: event.season?.type === 3` in `parseEvent`

**`packages/core/src/constants.ts`**
- Added `defaultPostseasonBoostPoints = 5`; wired into `createDefaultUserPreferences` and `normalizeUserPreferences`

**`apps/extension/entrypoints/background.ts`**
- Computes `postseasonBoost` from `prefs.postseasonBoostPoints` when `game.isPostseason` is true
- Applies it additively alongside `favoriteBonus`, `gameBoost`, and `scoringOpportunityBoost`
- Persists `postseasonBoost` in PowerScore history snapshots

**`apps/extension/entrypoints/popup/components/postseasonBoostInput.tsx`** *(new)*
- Numeric input component for configuring postseason boost points

**`apps/extension/entrypoints/popup/components/setupView.tsx`**
- Renders `PostseasonBoostInput` below `FavoriteTeamBonusInput`

**`apps/extension/entrypoints/popup/app.tsx`**
- Wires `onPostseasonBoostChange` to persist `postseasonBoostPoints` preference

**`apps/extension/entrypoints/popup/components/powerScoreBreakdown.tsx`**
- Adds "Postseason boost" row to the breakdown display

**`apps/extension/entrypoints/popup/components/gameDetailView.tsx`**
- Reads `postseasonBoost` from active PowerScore result; passes to breakdown; included in `totalBeforeBonuses` calculation

**`apps/extension/locales/en.yml` / `es.yml`**
- Added `postseasonBoost.*` and `powerScore.postseasonBoost` keys

## Add Game Condition (weather) display — 2026-07-05

Shows outdoor game weather on pre-game cards and the detail view, sourced from ESPN's scoreboard endpoint at zero extra API cost.

**`packages/core/src/espnSchemas.ts`**
- Added `EspnWeatherSchema` (`temperature`, `highTemperature`, `conditionId`)
- Added `weather` field to `EspnEventSchema` (event level, not competition level)
- Added `indoor` field to `EspnCompetitionVenueSchema`

**`packages/core/src/types.ts`**
- New `GameCondition` interface: `{ temperatureF, conditionLabel }`
- Added `weather?: GameCondition` to `Game`
- Added `temperatureUnit: 'F' | 'C'` to `UserPreferences`

**`packages/core/src/constants.ts`**
- Default `temperatureUnit: 'F'`; normalize handles `'C'` from stored prefs

**`packages/core/src/apiClient.ts`**
- `parseWeather()` maps `event.weather` to `GameCondition`

**`apps/extension/entrypoints/popup/components/`**
- New `weatherUtils.ts`: Bootstrap icon map for condition labels + `formatTemperature()`
- Pre-game card: weather chip at top-right (Bootstrap icon + temp)
- Detail view: dedicated weather row (icon + condition label + temp)
- Setup view: Weather section with °F / °C toggle button

**`apps/extension/assets/bootstrap.scss`**
- `position: relative` on `.game-card`
- New: `.pre-game-weather`, `.game-detail-weather`, `.game-detail-weather-sep`, `.temperature-unit-toggle`

**`apps/extension/locales/en.yml`, `es.yml`**
- New `setup.weatherSection`, `setup.temperatureUnit`, `setup.temperatureUnitF`, `setup.temperatureUnitC`

---

## SCSS refactor: mixins, loops, and nesting — 2026-07-05

Improved all three SCSS source files by leveraging SCSS features where they reduce repetition without sacrificing readability.

**`apps/docs/src/styles/global.scss`**
- `@mixin woff2-face` replaces 6 identical `@font-face` blocks (42 lines → 16)
- `@for` loop generates `.reveal-delay-1` through `-5` (uniform `0.1s * $i` pattern)
- `@for` loop generates `.hero-word-1` through `-4` (base `0.1s + ($i-1)*0.12s` stagger)
- `$ps-signal-colors` map + `@each` generates `.ps-signal-card-green/orange/blue/yellow/pink`
- `@for` loop generates `.lv-logo-delay-1` through `-5` (`($i-1)*0.8s`)
- Combined `@for` generates both `.lv-track-*` and `.lv-track-out-*` in one pass
- `.accordion-button::after` and `:not(.collapsed)::after` deduplicated into one nested rule

**`apps/extension/assets/global.scss`**
- `@mixin woff2-face` replaces 6 `@font-face` blocks (48 lines → 16)

**`apps/extension/assets/bootstrap.scss`**
- `@for` loop generates `.sensitivity-tick-0` through `-6` using `percentage($i / 6)`
- `.game-detail-back-button:hover` nested into `.game-detail-back-button`
- `.game-detail-shell .game-meta-*` descendants nested inside `.game-detail-shell`

## Hero canvas: data labels + spread fix — 2026-07-05

Overhauled the hero particle animation's drift phase with two major improvements.

**Anti-clustering spread:**
- Replaced toroidal wrap with wall bounce — particles now visibly collide with the screen edges and scatter back, breaking up corner clusters
- Reduced explosion velocity (max ~22 px/frame → ~13 px/frame) so fewer particles slam simultaneously into the same edge
- Added inter-anchor-node repulsion during drift (O(N_ANCHOR²) ≈ 3,160 checks/frame) to actively push the large visible nodes apart
- Removed mouse repulsion from drift phase

**Data label overlay:**
- 16 real matchup labels (NFL, NBA, NCAAB, MLB, EPL, UCL, NHL, MLS) appear and fade during drift, each with a gray "context" line (raw data) and an orange "signal" line (POWERSCORE, CLOSENESS, COMEBACK, etc.) — visually reinforcing the raw data → insight transformation narrative
- Labels connect to the nearest anchor particle with a dashed orange line
- Up to 4 labels on screen at a time; each fades in (480ms), holds (2.2–4s), fades out; new ones spawn every 2s

## Replace logo PNGs with SVGs — 2026-07-05

Replaced raster logo images with vector SVGs across the extension popup and docs site for crisper rendering at any resolution.

- Created `full_logo_white_on_transparent.svg` and `icon_white_on_transparent.svg` from the new vectorized source SVGs (white fill, transparent background)
- Updated 6 extension popup components (`errorBoundary`, `mainView`, `onboardingView`, `onboardingTabControl`, `walkthroughView`, `walkthroughStepToggle`) from `.png` to `.svg`
- Updated 5 docs components/pages (`Nav`, `Footer`, `Hero`, `Leagues`, and screenshot pages 1–3) from `.png` to `.svg`
- Source SVGs (`full_logo_black.svg`, `icon_black_on_white.svg`, `full_logo_white_on_black.svg`, etc.) are preserved unmodified

## Show "Watch:" broadcast networks on live game cards — 2026-07-02

Live game cards now display the "Watch: ESPN • NBC" line beneath the score, matching the behavior already shown in the game detail view. Upcoming (pre-game) cards continue to hide broadcasts as before. Single-line fix: removed the `hideBroadcasts` prop from `GameMeta` in `liveGameCard.tsx`.

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
