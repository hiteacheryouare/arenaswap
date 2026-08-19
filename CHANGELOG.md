# Changelog

## The website was a hand-drawn picture of the extension, and the two had drifted — 2026-08-18

The old landing page contained a popup. Not the popup — a replica, 108 lines of CSS under a comment
calling itself "pixel-accurate", built by reading the real one and copying what it looked like. It
had a `div` for the enable switch, a hand-set section label instead of the orange rule, and no
league logo at all. Every time the popup changed, two files needed to change, and one of them never
did.

The site now imports the popup. The chrome, the game cards and the four detail charts are the
shipped components and the shipped stylesheet, so the homepage cannot describe a product that does
not exist. Verified the move is a no-op for the extension by compiling `bootstrap.scss` before and
after and diffing the rule sets: identical, 4,958 rules each, and all 199 component tests pass.

### Shared with the extension
- **The popup chrome moved into `@arenaswap/ui`** — `_popup.scss` holds `.popup-container`,
  `.popup-section-title`, `.popup-section-label`, `.popup-league-logo`, `.arenaswap-logo`, the
  settings buttons and the chart card, and both apps import it
- **`popupChrome.tsx` holds the header, the section title and the league row**, and `mainView`
  renders those rather than its own copies
- **`gameDetailChartOptions.ts` moved to `@arenaswap/ui`** so the website's charts are built by the
  extension's own option builders; the popup path re-exports it and nothing in the popup changed
- **Every shared label lives in `defaultStrings.ts`** — a plain module, so Astro can read a label at
  build time without pulling React in to do it, and the extension keeps overriding all of them
  through `TranslationContext`

### The hero
- **A browser window with five streams open and the popup running inside it.** Real game footage
  plays in the tab you are on; the tab strip, the address bar and the toolbar button are drawn
  around it
- **The switching is not choreographed.** Every tick scores all five games with `computePowerScore`
  and applies the shipped sensitivity threshold and cooldown, so the tab moves for the reason it
  moves on your machine. `npm run docs:validate-hero` prints the resulting table
- **The footage is real and freely licensed** — NCAA basketball, Army–Navy, NCAA hockey, Mexican
  League baseball and a UEFA Nations League match, 1.7MB of H.264 across five clips, lazy so a
  visitor pulls only the tabs they see. `/credits/` names every one; `scripts/docs/fetchHeroClips.sh`
  rebuilds them
- Off-screen or in a background tab it stops scoring entirely, and reduced motion gets a still frame
  with both switches already made

### The page
- **Bands replace the feature grid**, one idea each: babysitting tabs, the popup, the charts, the
  leagues, the settings, and the install
- **All 31 leagues are listed from `leagueConfigs`**, grouped by sport with each league's own mark,
  in place of a marquee that slid the logos past faster than anyone could read and had drifted three
  leagues out of date. The count is computed, so it cannot be wrong again
- **The settings band reads the shipped defaults** — sensitivity 4 of 7, a 45s cooldown, +10 and +5 —
  imported rather than typed out
- Every league mark now sits on a light plate. Roughly a third of the 31 are dark navy artwork and
  both UEFA crests were invisible on `#0b0f14`

### Routes
- **`/releases/` is a hand-written notes collection**, one file per version, with a permalink per
  version and an RSS feed. Not generated from this file: a changelog is an engineering record and
  reads like one
- **`/docs/extension/` and `/docs/powerscore/` are reserved** with the schema settled and the URLs
  linked, so 2.1 writes Markdown instead of designing a docs site
- **The FAQ moved to `/faq/`** and became eight native `<details>` elements: no JavaScript, and
  Cmd-F finds an answer that is collapsed. It carries FAQPage structured data
- **`/credits/` is new**, because two of the five clips are CC BY and one is CC BY-SA
- `/blog/` is now the long-form writing, `/powerscore/` and `/404` moved onto the shared shell, and
  the engine explainer moved to `/powerscore/`, where an explanation of the engine belongs

### Still hand-drawn
- **`apps/docs/src/pages/screenshots/` keeps its own copy of the popup CSS.** Those nine pages are
  store assets at fixed pixel sizes, and they are not linked from anywhere, so they were left alone
  rather than rebuilt on components whose height they do not control

### Removed
- The replica popup, the hero particle canvas, the league marquee, the feature grid, the step cards
  and the settings preview: 9 components and 15 sections of stylesheet, about 800 lines
- The chart subtitles, which were eyebrow labels restating the axis the chart already draws

### Fixed
- **The hero window grew sideways at some widths.** `aspect-ratio` with a `min-height` floor resolves
  in both directions, so at a 1024px viewport the stage came out 1200px wide inside a 936px window
  and drew a quarter of the video off the right edge. It is a plain height now
- The popup was a child of the element that clips the video, which cut its bottom off at every width
  below 1400px and badly below 992px, where it returns to the flow
- Dates were formatted in the build machine's zone, so a date-only entry rendered a day early
- **`/powerscore/` shipped unstyled cards.** `.feature-card` went out with the deleted feature grid,
  on the assumption the grid was its only consumer. It is also on the five signal cards, the engine
  explainer and the live PowerScore examples, none of which had a rule left
- **The reduced-motion still frame showed a board the algorithm would not produce.** It jumped
  straight to its resting tick, so the scorer saw a two-entry score history instead of nineteen and
  four of the five cards under-reported by 18 to 31 points. Scoring is a pure function of the tick
  now, so the same tick scores the same whether it was played through or jumped to
- **The switch rule ran during the still frame**, overriding the tab it was meant to hold and
  captioning a switch nobody saw. Turning the preference on mid-session also never stopped the
  animation, because nothing cleared the flag the tick loop reads
- **Social preview images were lost site-wide** when the blog post page moved onto the shared shell,
  which declared `summary_large_image` and then supplied no image
- **The hero's MLB game played a bottom of the ninth with the home team ahead**, which is a game
  that would already be over. `npm run docs:validate-hero` now asserts rather than prints: two
  switches, clocks that only run one way, scores that only go up and only by an amount the sport can
  produce in one poll, and no impossible innings. It exits non-zero, and it catches all of the above
- The popup demo was 24px wider than the frame clipping it below 360px; the site's two popup headers
  shared one element id and left four keyboard-reachable controls that did nothing; `packages/ui`
  imported `echarts` without declaring it

## The landing page redesign existed only as screenshots in a chat log — 2026-08-18

Several rounds of designs for a new `arenaswap.app`, and the reasoning behind them, lived nowhere anybody else could read it. Why the game card is white rather than dark, why the hero animation is scripted instead of live, why the league marquee has to go: all of it was argued once and then lost.

`design/landing-redesign/` is that proposal as a page you can open. It is a document, not an implementation — nothing is wired into `apps/docs` and Turborepo does not build it.

### Proposal
- **A rebuilt landing page** in the existing palette and type: full-width bands, one benefit each, no feature grid and no marquee
- **The blog retires into a release notes feed** generated from this file, with versions promoted to `#` headings so a parser knows what shipped together, and `### Tests` excluded from the public feed
- **`/docs/` gets reserved now** so 2.1 writes content rather than doing a second redesign

### Fidelity
- **The game card, popup, charts and settings rows on the page are the shipped components**, reimplemented in plain CSS with their real values so the file runs standalone. `powerScoreColor()` is ported, so the PowerScore bar warms and cools exactly as it does in the popup
- **The hero animation runs on twenty hardcoded frames** and never calls ESPN, so it works offline and in the off-season. The card on screen is whichever PowerScore is highest, which is the rule the switcher uses
- The six settings groups use the shipped `setup.group*` strings rather than new copy, and the four chart titles use the shipped `detail.chart*` ones
- The orange ring and `ON YOUR SCREEN` flag on the hero's active card are the only marks that are not product UI, and the page says so

The scorer has always zeroed a frozen game: halftime, an intermission, a rain delay, and all five signals go to 0, because nothing is happening and a stopped game must never out-score a live one. The boosts never got the memo. They're added after the scorer runs, so a game sitting at halftime with a favorite team in it still collected its +10, and a postseason game at halftime collected that too — a PowerScore of 10 for a court with nobody on it, which is enough to beat a genuinely quiet live game and take the tab.

The freeze is now one rule instead of two. `isPlayFrozen` is a single exported predicate covering intermission and delay, the scorer and the scoring-opportunity boost both read it, and the extension suppresses every boost while it's true — favorite, postseason, scoring opportunity, and the manual game boost as well. A frozen game is a hard 0, no exceptions.

### Scoring
- **Halftime, intermissions and delays score 0 no matter what boosts apply** — the favorite bonus, the postseason boost and a manual game boost are all held back until play resumes, then pay out again exactly as before
- **The scoring-opportunity boost now respects intermissions**, not just delays; it already refused to pay for runners frozen on base during a rain delay, and an intermission freezes the situation the same way
- The manual game boost is suppressed in the score but not forgotten — the stored value stays put, so the boost input still shows what you set and it takes effect again on the second-half tip

### Detail view
- The breakdown's game-boost row reads the applied boost rather than the stored one, so it shows `0` during a freeze instead of claiming a `+15` that the total below it doesn't include

## One signal, two blues, depending on which screen you were looking at — 2026-08-15

Lifting `$secondary` to `#3E9BD1` took momentum's blue with it, and it shouldn't have. Momentum isn't an accent — it's one of the five PowerScore signals, and that palette is a data palette: closeness green, late-game orange, momentum blue, lead-changes yellow, comeback pink. The breakdown card kept `#2274A5` because it's the popup's one light surface, so the component chart directly beneath it ended up drawing the same five signals in a different blue. Same number, same signal, two colours, four inches apart.

The mistake was treating a hex as a token. `$secondary` and momentum happened to share a value; they were never the same job.

### Colour
- **The signal palette is back on `#2274A5` for momentum, everywhere it's drawn** — the component contribution chart and its legend, the settings signal dot, the walkthrough's signal diagram and its breakdown preview, and on the docs site the PowerScore explainer, the machine scene, the signals page and all four gradients
- **`$secondary` stays `#3E9BD1`** and keeps doing the job it was lifted for: links, filled and outline buttons, focus rings, `.popup-settings-link`
- **The brand rainbow is untouched** — `brandColors` and the Ludicrous Speed overlay cycle primary/secondary/danger/success/warning, which is the theme palette rather than the signal palette, so they follow the token
- `_bootstrap.scss` now says out loud that `#2274A5` is not retired and that a signal blue must not be "fixed" to match the accent token, since that is exactly the mistake this entry is about

## Twenty controls in one flat column, and none of them looked more important than any other — 2026-08-15

The Switching tab was a single vertical run of twenty controls — three sliders, two number fields, eleven switches, a select and two buttons — every one at the same visual weight, separated only by three section rules. Standby Stream, the last thing on it, sat about two and a half screens below the first thing on it. Fifteen labels each carried an orange `text-primary` icon, competing with the orange range thumbs and the orange active tab; when the accent marks everything it marks nothing. Ten explainer paragraphs sat permanently on screen at 0.55rem, useful once and noise every time after.

Settings is now an index. Six categories, each naming what it's for, each opening a focused page.

### The settings index
- **Six rows replace the two tabs** — Switching, Scoring, Leagues, Display, Standby Stream, Demo mode — each with its own icon and a description of what lives inside it, wrapped in full rather than truncated, since a description cut off mid-sentence is worse than no description
- **Every page fits in one window.** Measured at 320×560: the index and all five non-league pages come out at exactly 560px of content, no scrolling. Leagues is 1,926px, which is 31 league switches and a reorder list, and is the only page that scrolls
- **The back arrow is now two-level** — from a category it returns to the index, from the index it closes settings
- **The icons are orange and the labels are not.** Six accents on six rows, instead of fifteen scattered down a column
- The empty-leagues warning moved onto the Leagues row, where it points at the page that fixes it

### Search
- **A search field sits above the index**, matching setting names, category descriptions, and a per-setting keyword list — so "celsius" finds Temperature unit, "playoff" finds Postseason boost, "spam" finds Cooldown and Switch delay
- **The keywords live in the locale files**, one `keywords*` string per setting, so every language gets synonyms a speaker of that language would actually type rather than translated English ones
- Matching strips case and diacritics on both sides, so `prevision` reaches *Previsión*
- **Category text is matched per category, never folded into each setting's haystack.** Mixing the two made "bonus" return all five PowerScore signals, because the word appears in the Scoring description. There's a spec pinning that
- Tapping a result opens the category it lives in, and clears the query behind it

### Explainers
- **Every explainer string is kept, and none of them sit on screen any more.** They moved onto the existing tooltip control — the same `bi-question-circle` the PowerScore breakdown already uses — beside the label they explain
- `signalTooltipIcon` is now `settingTooltipIcon`, since it no longer only explains signals, and `.setting-tooltip-btn` gained a dark-surface tone with the old light-card tone scoped under `.powerscore-breakdown`
- `setup.tabSwitching`, `tabLeagues`, `optionsSection`, `bettingSection` and `weatherSection` are gone from all eight locales, along with `.setup-tabs`

## The secondary blue was below the contrast floor on every surface we draw it on — 2026-08-15

`#2274A5` on `#0d1117` is 3.70:1. Primary orange on the same background is 5.85:1. That gap was the whole problem: the blue sat under the 4.5:1 AA floor while the orange cleared it comfortably, so blue text read as disabled and blue beside orange read as a mistake. White on `#2274A5` — every `btn-secondary` back button in the walkthrough — was 4.11:1, also under.

The blue had two jobs, though. As the Momentum signal it also draws on the `#f8fafc` PowerScore breakdown card, where `#2274A5` is a perfectly good 4.89:1. So the token split rather than moved.

### Colour
- **`$secondary` is now `#3E9BD1`** — 6.14:1 on the body background — across the extension, the docs site and the shared Tailwind tokens
- **`$secondary-on-light` keeps `#2274A5`** for the one light surface in the popup, the breakdown card, where lifting the blue would have washed it out to 2.95:1
- **Filled secondary buttons take dark labels instead of white.** Bootstrap's `color-contrast()` flips them automatically at the new lightness; `$color-contrast-dark` is set to `#0d1117` so the dark side stays on-theme rather than pure black
- Momentum's dot, chart series, legend swatch and walkthrough diagram all move to the new blue; the light breakdown card does not
- Team-colour fallbacks in `resolveTeamColorPair` keep `#2274A5` — they tint a poster background, not an accent, and the lighter blue would have taken white type down with it

### Tests
- `setupView.cy.tsx` rebuilt around the index: navigation in and out of every category, the search behaviours above, the leagues warning on its row, and the tooltip control replacing the inline explainers
- The Cypress `#i18n` stub re-exports `GeneratedI18nStructure`, so the settings catalogue's message-key type checks in the component project too

## The pre-game screen stopped reporting a game that hadn't happened — 2026-08-09

Open a game before it starts and the screen led with a PowerScore breakdown reading `0/42`, `0/38`, `0/38`, `0/18`, `0/20` and a final score of `0 / 100`. Eleven rows of arithmetic about a game with no possessions in it. Underneath, four charts with no data. The screen was built for a live game and shown for a scheduled one.

So the pre-game screen is now its own screen. It answers the two questions you actually have before a start time — *what is this matchup, and when* — and then offers the two things you can usefully decide in advance.

**The live screen is untouched.** Breakdown, boost card, Game info, charts, in that order, exactly as before.

### Pre-game
- **A matchup poster** replaces the light matchup card, on the same card geometry as everything else on the screen — same left edge, same width, same 0.5rem corner — so it sits in the column rather than cutting across it. The two teams' resolved colours run left to right, meeting in the middle where the two teams do
- **The countdown is the largest thing on the screen** at 2.3rem, white on the poster — the one number that changes while you wait
- **Crests sit on a white disc tinted with their own team colour.** A navy crest on a navy half of the poster is invisible, and every league has at least one; the disc uses the same `28`-alpha wash the matchup card already uses for its team-colour gradients, so it reads as the same material rather than a new one
- **White type is guaranteed readable by a dark scrim over the colours**, not by hoping the colours are dark. A pale team colour — and there are several — would otherwise take the team name with it
- **Favourite stars moved onto the poster**, beside the record of the team they apply to, sharing the toggle with the game list so the two can't drift
- **A "Get ready for…" card** carrying the tab picker and the game boost
- **The boost is now available before the game starts**, which is where it always belonged: deciding a game matters to you is a thing you do in advance, not once it's already running
- A postponement still surfaces on the poster. It's the one thing with something to say before the start time, so it isn't dropped with the rest of the status row

### Internationalisation
- **The card names what the countdown is counting down to, in the sport's own words** — tip-off, kickoff, puck drop, first pitch. Softball shares baseball's first pitch and soccer shares football's kickoff; anything else falls back to `Get ready for gametime` rather than borrowing another sport's word
- Six new strings across all eight locales, including the sport terms each language actually uses: German's `Bully` for a puck drop, French's `mise au jeu`, Japanese's `プレイボール` for first pitch
- The map is `as const satisfies Record<SportType, string>`, so adding a sport to `SportType` fails the typecheck until it has a phrase
- Every locale's heading was measured against the card at 320px to confirm none wrap to a second line

### Tests
- New `pregameDetail.cy.tsx` — the breakdown's absence pre-game *and* its presence once live, the poster's alignment against the card below it, the horizontal gradient, the tinted crest discs, star state and toggling, the setup card's contents, all six sport phrases plus the fallback, and the delay line
- **`tabAssignSelect` is no longer stubbed to `null` in component tests.** It touches no browser API, so the real control mounts — the stub had the card and pre-game specs measuring a layout with no tab picker in it, which is not a layout the extension ever renders
- `gameBoostInput` gained a `bare` mode so the pre-game card hosts the real boost row instead of a second copy of it

## Four dashed boxes explaining that the charts weren't there yet — 2026-08-09

Open a game that hasn't started and the bottom of the detail screen was four dashed placeholders in a row, each one a sentence about a chart you couldn't see: PowerScore trend, score trend, win probability, component trend. Nothing to read, nothing to do, and 77px of screen telling you to come back later. A chart that isn't there is self-explanatory — the absence is the message.

### Game detail
- **The four chart empty states are gone.** Each chart now renders when it has data and renders nothing when it doesn't, so a pre-game screen ends at the last real thing on it
- The `detail.chart*Empty` strings are removed from all eight locales, and `.game-detail-empty-state` from the stylesheet

### Tests
- **The Cypress chart stub now keeps the real card's structure and height** instead of collapsing to a bare title. The sticky-bar scroll specs were passing on page length the placeholders happened to provide — with the placeholders gone and a 176px canvas stubbed to a text node, the hero never scrolled out of view and the compact matchup never faded in. The stub was measuring a page the extension never renders
- The sticky-bar specs supply a `powerScoreHistory` so the charts they scroll past actually exist

## Venue, broadcast and odds were five centred lines nobody could scan — 2026-08-09

With the chart placeholders gone, what the bottom of the detail screen actually ends on is the game's own information — and it was five centred lines floating on the dark background with no container: venue, `Watch:`, the odds, `Odds provided by:`, then the weather. 77px, four of the five lines in the *same* colour at 9.28–9.6px, and the largest text on the block (12px) spent on the weather, the least actionable thing there. The one line that answers "which tab do I open" was the smallest.

Centred stacking also wasted the width it had: the longest line measured 198px inside a 296px column, so the block ran tall in a third of the room.

### Game detail
- **One titled `Game info` section**, taking the chart cards' treatment — hairline top rule, transparent background — rather than a third white card. Everything below the PowerScore maths now reads as one dark column of sections
- **Rows are icon + label + value, left-aligned on a shared 46.4px label column**, using the same marker column width as the breakdown's factor icons so the two sections share a left edge
- **Watch leads and is the only bright value on the block.** It's the row that causes an action; venue and odds sit a step back at `#b6c2cf`
- **Weather rides inside the venue row** instead of claiming a line. Conditions are a property of the venue — a dome game has none. A neutral site that arrives with weather but no venue name still gets its own row, with the condition glyph as its marker
- **`Odds provided by:` no longer spends a full row.** The provider sits dim at the end of the line it describes, with the wording moved to the element's `title`
- **Before tip-off the panel moves above the PowerScore breakdown.** The breakdown is eleven rows of zeros until the game starts, while this panel is fully populated — the screen now leads with whichever of the two has something to say
- Five lines became three rows; the block went 77px → 94.2px, all of it spent on the heading and row separation that made it a section instead of leftovers

### Internationalisation
- Five new `detail.info*` strings across all eight locales
- **Every locale's labels were measured against the fixed label column**, not eyeballed: the widest is French `Regarder` at 38.5px against 46.4px. German went with `Ort` over `Austragungsort` for exactly this reason. Locked in by a spec that measures all four labels in all eight locales, so a future translation that would wrap the column fails the build instead of breaking the grid

### Tests
- New `gameInfoPanel.cy.tsx` — row composition, the weather-in-venue-row rule and its no-venue fallback, indoor games, attribution placement, betting-off, the render-nothing case, and the pre-game/live ordering flip
- `gameDetailView.cy.tsx` drops its `.game-meta` ordering test, which the new spec covers for both arrangements rather than only the live one

### Packages
- `oddsSummary` and `OddsProvider` are exported from `packages/ui`'s `gameCardShared`. `GameMeta` itself is untouched — the list cards keep the compact centred layout, which is right for a 3-line card and wrong for a full screen

## "2nd & 11" never said where the ball was — 2026-08-06

The football card printed `shortDownDistanceText` and stopped there. A 2nd & 11 backed up on your own 9 and a 2nd & 11 on the opponent's 34 are not the same football situation, and the card showed them identically. ESPN has been shipping the yard line on the same scoreboard payload we already poll, in two forms: `possessionText` (`"ARI 34"`) and a pre-joined `downDistanceText` (`"2nd & 11 at ARI 34"`).

Verified against a live payload rather than inferred — `possessionText` is present at halftime and between drives, while `possession` (the team id holding the ball) is not, so anything built on that field has to survive its absence.

### Game cards
- **The down & distance line now carries the field position** — `2nd & 11 at ARI 34`
- **Joined through the locale files, not taken pre-joined from ESPN.** `downDistanceText` is English-only; reading the two halves and joining them keeps the line translatable, and Japanese needs the yard line *first* (`ARI 34で2nd & 11`) rather than an "at" spliced into the middle
- Degrades to the bare down & distance when ESPN omits the field position, which it does between drives
- **The line is ~2.5× wider than what it replaced** (8 characters to as many as 20), so it was measured rather than assumed. The score row above it is the widest thing in the centre column at **128.75px** — set by the 2.4ch-per-digit floor on `.game-score-value` — and the longest line football can produce, `3rd & Goal at WSH 50`, measures **99px** in 0.62rem Lekton. It sits inside the score row with ~30px to spare, so the card does not widen and no team column is squeezed. Locked in by a layout spec that mounts the card at the real 320px popup width with the real stylesheets

### Demo mode
- The football mock's field position **advances across midfield with the drive** instead of pairing a fixed yard line with a cycling down, so a goal-line down lands on a goal-line marker

### Fixed
- **`packages/ui`'s no-provider fallback string map was missing the new key**, which would have rendered a raw `gameCard.downDistanceAt` anywhere the components mount without a `TranslationContext` — the docs site included. Caught by the component tests, which mount unwrapped

## The walkthrough gave every boost an icon; the breakdown gave them none — 2026-08-03

The walkthrough teaches the six boosts and penalties one at a time, each with its own icon and color — an hourglass for the clock stall, a trophy for the postseason. The breakdown on the game detail screen kept the colors and dropped the icons, so the factors you had just been taught to recognize by shape arrived as six lines of plain text under five signal rows that each had a colored dot.

### Game detail
- **Every boost/penalty row now leads with its walkthrough icon**, in the walkthrough's color: hourglass (clock stall), pulse (volatility), star (favorite), lightning (game boost), bullseye (scoring opportunity), trophy (postseason)
- Color and icon live in one table, so the two screens can't drift apart — the color was already duplicated between them, and the icon existed only in the walkthrough
- The icons occupy the **same 17px marker column as the signal rows' dots**, and are centred on their labels to the pixel. Their labels start 4.4px right of the signal names, which is a 9.9px glyph against a 6px dot: closing that gap would mean either glyphs too small to read or glyphs touching the text, so the marker edges are what line up
- `aria-hidden`, since every row's label already names its factor in words

## A red-zone drive while up 31 was worth as much as one in a tie game — 2026-08-03

`computeScoringOpportunityBoost` paid a flat +10 for any red-zone possession, with no reference to the score and no reference to the down. Backups grinding out a drive at the end of a 45-3 game collected the same bonus as 4th-and-goal from the 1 in a one-score game. The existing tests only ever exercised `isRedZone` true, false and undefined — never in combination with a score, which is why it survived this long.

The gating isn't a third penalty on a blowout. Closeness and lateGame have already scored one correctly low; an unconditional +10 on top was undoing their work.

### PowerScore
- **The red-zone boost scales with the margin**, using football's existing `closenessMargins` (`[3, 9, 14]`) rather than a second definition of "blowout" invented for this one signal. Full value inside two scores, half in the fringe band, nothing past it
- **And with the down.** A 4th-down snap decides possession; a 1st-down snap doesn't. `situation.down`/`distance` were already being parsed and thrown away — now `4th & Goal` is worth ×1.5, 4th down ×1.35, 3rd-and-short ×1.15, everything else ×1.0
- **Down and goal-to-go are one combined lookup, not two multipliers that stack.** They describe the same situation, so multiplying them double-counts. Goal-to-go mostly raises the *odds* of a score — red-zone TD rate is ~61% overall against 70–95% on goal-to-go — where what makes a snap worth switching to is 4th down's binary stakes. A 1st-and-goal from the 3 is no more tense than 1st-and-10 from the 19
- **The ceiling moves 10 → 15** for the highest-leverage snap in football. Left uncapped at the signal level, consistent with the overcomplete-ceilings design the rest of the file already uses — clamping back to 10 would have made 4th-and-goal indistinguishable from an ordinary red-zone snap, which was the point of building it
- A missing down costs the boost its bonus, not the whole thing: between plays ESPN's situation block can arrive without one, and that falls through to ×1.0 rather than to zero

## The World Cup final was never a postseason game — 2026-08-03

Edge-case audit of how the scorer and the cards handle the strange corners of sport. Two of them turned out to be wrong in a way you could watch happen.

`isPostseason` read `event.season?.type === 3`. That is ESPN's convention for the US pro and college leagues, and it is not the convention anywhere else. The 2022 World Cup final reports `type: 10948`. The 2024 Champions League final reports `type: 12082`. Liga MX, MLS, the NWSL and the World Baseball Classic each use their own per-tournament id, and none of them is ever 3 — so a Tuesday-night bowl game collected the postseason boost and the World Cup final did not, every tournament, every season, for as long as the check has existed.

The Olympics are worse. A 2024 Paris Gold Medal Game reports `type: 2, slug: 'regular-season'` — identical to a group game. The only place the round survives is `competition.notes[0].headline`, a free-text field reading `"2024 Olympic Men's Basketball - Gold Medal Game"`.

Separately, soccer has no overtime, and `formatPeriod` had been calling it that anyway. Extra time read `OT1`/`OT2`, and because ESPN encodes a penalty shootout as period 5, a shootout read **`OT3`** — a period of play that does not exist in the sport.

### PowerScore
- **Postseason detection now handles all three of ESPN's encodings.** `season.type === 3` still covers the US leagues; an explicit slug allowlist covers international soccer and the WBC; the Olympic leagues fall back to the headline field. Every slug in the allowlist was verified against a real payload rather than inferred, which is how the awkward ones surfaced — the Women's World Cup says `3rd-place` where the men's says `3rd-place-match`, the WBC says `semi-finals` and `finals` where every soccer competition says `semifinals` and `final`, and UCL/UEL added `knockout-round-playoffs` in the 2024-25 format change
- **Liga MX, MLS and the NWSL generate a slug per tournament** — `apertura-2023---finals`, `playoffs--quarterfinals` — so those match on pattern rather than exact string. Checked against their regular-season slugs (`torneo-apertura`) and against the four domestic leagues, whose season-long slugs (`2023-24-english-premier-league`) contain nothing that could trip it
- **The Olympic headline check is scoped to the five Olympic leagues**, not applied globally. It is editorial copy, and matching it everywhere would have swept in regular-season bracket events like college basketball's November invitationals

### Game cards
- **Soccer extra time reads `ET1` and `ET2`.** Keyed on sport rather than period format, so NCAA basketball's two halves keep their `OT1`/`OT2` numbering
- **A penalty shootout reads `PENS`**, and anything past the second extra-time half resolves there too — nothing but penalties follows extra time, so there is no fourth label to guess at
- **The shootout tally renders under the score.** ESPN freezes `score` at the 120-minute scoreline and puts the decider in `shootoutScore` on the same scoreboard payload we already poll, so the card would otherwise have sat on `1 – 1` while the tie was being settled. Shown as a secondary line rather than replacing the score, which everywhere else in the product means goals scored in the match
- **The period label steps aside for the tally**, because `PENS` above `PENS 3–5` said it twice. Only visible by rendering the card — every assertion on the two strings individually passed. The tally line adds **1.6px** to the card at 320px wide, with 72px of horizontal headroom left even at a sudden-death `PENS 13–14`
- Whether ESPN populates `shootoutScore` kick-by-kick or only once the shootout ends is **unconfirmed** — no shootout was live anywhere across 14 competitions during the audit. The line renders only when both tallies are present, so either way it degrades to showing nothing rather than to showing something wrong

## Closing one tab could switch off auto-switching entirely — 2026-08-03

Audit of the tab switching path. Nothing in the extension ever noticed a tab closing: `tabRegistry`, `standbyStreamTabId` and the muted-tab set were only ever pruned by hand, from the popup, and all three are mirrored into session storage so a dead tab id came back after every service-worker restart. Browsers never reuse a tab id, so those entries could only ever be wrong — and one of them was enough to stop the whole feature. A closed tab still won the switch selection whenever its game held the top PowerScore, `executeSwitch` found no such tab and returned, and nothing fell through to the runner-up. No notification, no log, no recovery until you reopened the popup and re-assigned tabs. Close the tab showing the best game and ArenaSwap went quiet for the rest of the night.

### Switching
- **A closed tab is forgotten the moment it closes.** New `tabs.onRemoved` handler drops the registration, clears `standbyStreamTabId` if that was the tab, and takes it out of the muted set — then persists all three and pushes the state to an open popup
- **The registry is reconciled against reality on every worker start.** MV3 tears the service worker down whenever it goes idle, so tabs close with no listener alive to hear it; the rehydrated registry is checked against `tabs.query({})` before the first switch evaluation. An empty query result is treated as "cannot see the tab strip" rather than "every tab closed" — nothing legitimately reports zero tabs while the worker is running, and trusting it would wipe a perfectly good registry
- **Selection skips tabs that no longer exist, so the runner-up gets the switch.** The belt to the reconcile pass's braces: a tab that vanished between two polls with no event is filtered out at decision time instead of stalling the switch on a tab that isn't there
- **A closed standby tab no longer black-holes the feature.** `computeStandbyStreamDecision` kept answering `switchToStandby` for a tab that was gone, and that branch returns before any game is considered — so with every game under the threshold, switching was dead twice over
- **A delayed switch re-targets when it fires instead of replaying the decision that queued it.** `switchDelaySeconds` could hold a switch for a minute and then take you to a game that had gone to a blowout — or ended — because the only thing re-checked was that the registration still existed. Both paths now resolve through one `resolveSwitchTarget`, so the switch that lands is the one the games justify at the moment it lands. If everything fell below the standby threshold during the delay, the queued switch is dropped and the next poll parks on the standby stream
- **Standby is evaluated ahead of the pending-switch guard.** A queued switch used to freeze the standby state machine outright — `onStandbyStream` could not be updated in either direction while a switch was waiting. Standby taking over now clears the queue, which is stale by definition: the queued game is one of the ones that went quiet
- **A tab you picked yourself starts the cooldown.** `tabs.onActivated` only re-synced mute state, so a deliberate manual switch to a quieter game could be overridden by the very next poll — 6 seconds later on a league in eager mode. A manual pick now gets the same protection as an automatic one, 45s by default
- **Registering two tabs to the same game no longer switches you between them.** The tab already in focus wins its own game, rather than whichever registration happened to be first in the array
- **A tab closing mid-mute-sync no longer aborts the poll.** The mute updates went out as one `Promise.all`, so a tab disappearing inside the query→update race window rejected the batch and took the switch evaluation that runs right after it down with it. Each tab settles on its own now, and the record of what we muted is written from what actually landed
- Demo mode's tick is routed through `refreshScores`, so a slow tick can no longer overlap the next interval
- **24 background tests, up from 12.** Every fix above is covered by a test verified to fail without it — the switch decision path had no direct coverage at all before this

## Tailwind was never actually running in the extension — 2026-08-03

The build had been printing four lightningcss warnings — `Unknown at rule: @theme` twice, then `@tailwind` and `@custom-variant`. They were not a minifier quirk to be silenced. lightningcss was reporting, accurately, that it had been handed Tailwind's uncompiled source and asked to minify it.

`apps/extension/assets/global.scss` opened with `@import 'tailwindcss'` — in a **Sass** file, in an app with no `@tailwindcss/vite` plugin. Sass resolved it and inlined ~18KB of raw Tailwind v4 source as literal CSS, and nothing downstream ever compiled it. The shipped popup stylesheet contained two `@theme` blocks, a `@tailwind utilities`, and `--theme(…)` calls that browsers discard as invalid — and not one Tailwind utility. No `--tw-*` custom properties, no `@property` registrations, and no `.shrink-0` or `.min-w-0` rule despite 21 call sites across the popup. Every Tailwind class in the extension had been a no-op for as long as the import had been there. `apps/docs` was never affected; it wires `@tailwindcss/vite` into `astro.config.mjs` and imports Tailwind from a `.css` entry, which is why only the extension warned.

### Extension styling
- **Tailwind is out of the extension.** The import is gone, `tailwindcss` is dropped from `apps/extension/package.json`, and the popup stylesheet loses **21,463 bytes — 6.0%**, from 359,010 down to 337,547. Chrome, Firefox and Edge all build clean, with byte-identical CSS and zero lightningcss warnings
- **Three Preflight rules were carried over by hand, because Preflight was the one part that *was* running.** It is plain CSS, so it survived being inlined even though the at-rules did not. Rather than guess which of its 52 rules mattered against unlayered Bootstrap, every one of the 144 component specs was re-run dumping 54 computed properties per element, and the two runs were diffed across **11,536 elements** — `tab-size: 4`, `img, video { max-width: 100%; height: auto }`, and `color: inherit` on form controls were the only rules with an effect. Bootstrap Reboot already covers the rest
- Dropping the image rule would have been the expensive one: `max-width` went to `none` on **278 image elements** — league logos, team logos, the wordmark — all of which had been relying on Preflight to stay inside their container, since Reboot only sets `vertical-align` there
- `color: inherit` matters for **564 form controls**, which fell back to the UA's black without it. `.form-check-input` and `.form-range` never get an explicit colour from Bootstrap, and the walkthrough's `.powerscore-progress-dot` paints its active state from `currentColor` — the progress dots would have gone black on a dark panel
- Preflight's `border: 0 solid` was deliberately **not** carried over. It changes `border-style` on 9,026 elements and none of them render a border, because the widths are all zero; the only three project rules that set `border-width` either pair it with `border-style` themselves or inherit one from Bootstrap's `.spinner-border`
- **`shrink-0` → `flex-shrink-0`** at 18 sites in 8 files. Bootstrap's utility is unlayered and `!important`, so unlike the Tailwind class it replaces it wins against Bootstrap's own component rules rather than losing to them — this is the one intended rendering change, and it is what the original markup had been asking for. 43 elements now compute `flex-shrink: 0` where they previously computed `1`
- **`.min-w-0` is now a real rule** in `global.scss`. Bootstrap 5.3 ships `min-vw-100` but no `min-width: 0` utility, and the three places that use it need flex children to shrink below their content width for `text-truncate` to engage
- Everything else in the before/after diff was animation sampling jitter — mid-transition `nav-link` colours, the `live-dot` pulse, spinner `transform` — confirmed by re-running the finished code against itself and getting the same categories back at the same magnitudes

## The release pipeline stops fighting itself — 2026-08-03

`zip:edge` had been failing with `ENOENT: ... .output/edge-mv3/entrypoints/popup/index.html` — a file that doesn't exist in a finished build, because WXT writes the popup there and then renames it to `popup.html`.

### Build
- **`zip:*` tasks now depend on their sibling `build:*` task.** `wxt zip -b edge` runs its own full build into `.output/edge-mv3`, and `build:edge` targets that same directory. Turbo saw no dependency between them and ran both at once, so one process globbed the file list while the other was mid-rename — the zip picked up the pre-rename `entrypoints/popup/index.html` and it was gone by the time it read it. Serializing them removes the shared-directory race
- **`zip:*` tasks are no longer cached.** They declared no `outputs`, so Turbo cached them as log-only and reported `FULL TURBO` on a second run without producing a zip — a release step that quietly ships nothing is worse than a slow one
- **`zip:firefox` builds MV3.** It was `wxt zip -b firefox` with no `--mv3`, so it emitted an MV2 extension into `.output/firefox-mv2` while `build:firefox` and `dev:firefox` both used MV3 — the artifact you'd actually upload to AMO was the one browser's build nothing else in the repo exercised, under a manifest declaring `strict_min_version: 109.0` and `data_collection_permissions`. All three zips now verify as `manifest_version: 3`

## Team records on the detail card — 2026-08-03

"Oklahoma City Thunder at Boston Celtics" tells you who is playing. It doesn't tell you whether that means anything. The detail screen now says how each side got here, on the line under its name.

### Extension popup
- **Each team's overall record sits directly below its name** in the detail hero — `59-53`, `38-24-6`, `9-3-5`, whatever format the league keeps. Read from `header.competitions[0].competitors[].record` on the ESPN summary response the screen was already fetching, so no new request for live games
- Pre-game detail screens now fetch that summary too. There is no win-probability line to draw yet, but the records are the thing you actually want before a game starts, and it stays one request per screen opened
- Records get a **grid row of their own** rather than being nested under the name. Tucked inside the label, a record would ride down with a name that wrapped to two lines and sit lower than the opponent's — the whole reason the matchup is a grid is to keep the two sides level
- Matching is **by team id, not array position**: ESPN orders `competitors` by its own `order` field, which is not away-then-home in every sport. `homeAway` is the fallback for the leagues whose team ids we synthesize locally, where an id match is never going to land
- Only the `total` entry is shown. ESPN sends home/road/vsconf splits in the same array, and an offseason `record: []` or a blank summary now reads as "no record" — the row is omitted rather than left blank
- Only the `total` entry is shown, read from `summary` rather than `displayValue`. Swept all 31 supported leagues at in-season dates: the two fields are identical everywhere except the NHL, where `displayValue` appends the standings points — `28-28-10, 66 PTS` — which is a second statistic wearing the record's clothes at twice the width of the column it has to fit. An offseason `record: []` or a blank summary reads as "no record" and the row is omitted rather than left blank
- Demo mode's simulated games carry canned records in each league's own format, so the toggle doesn't leave a hole where every real game has a number
- The hero measures 144px tall with records against its 190px budget, and the PowerScore breakdown still starts at 151px against 200px — both asserted in the component tests rather than assumed

## One PowerScore, and a league that can't vanish quietly — 2026-08-02

Review pass over the 2.0 branch. Two things were wrong in ways you could have watched happen: the number on the detail screen wasn't the number the switcher used, and a single malformed row in an ESPN response could take a whole league off the board without saying so.

### PowerScore
- **The detail screen and the card now always agree.** Volatility was being computed a second time inside the popup and added on top of the engine's total, so a card reading 84 opened a screen reading 89 — and the auto-switcher had acted on 84. The win-probability line is now fetched by the background scorer, folded into the total once, and rendered verbatim everywhere. The detail view reads `winProbabilityVariance` off the result instead of deriving its own
- As a consequence volatility finally **influences which game you get switched to**, rather than being a number the popup showed you after the fact
- The 100-point ceiling now actually holds for automatic scoring. The popup's second addition could push an unboosted game to 105 and label it as manually boosted
- `baseTotal` is no longer clamped to 100. It records the raw pre-cap signals sum (which the overcomplete ceilings let reach 156), so the breakdown's "before → after" clock-stall line agrees with the total it's explaining instead of reading `100 → 75` next to a final score of 100
- Turning signals off no longer silently discards the clock-stall penalty or the volatility adjustment: the penalty rescales with the signals it was deducted from, and volatility carries over at full value
- `computeWinProbVarianceScore` documents what it actually measures — mean absolute distance from 50%, not variance — including the known limitation that a line swinging 10%↔90% scores like a steady blowout

### Core
- **A malformed event no longer costs you the league.** `EspnScoreboardSchema` validated `events` as one array, so a single bad row — a TBD bracket slot, a score ESPN encoded as a number instead of a string — rejected the entire response. `fetchScoreboard` returned zero games, which is indistinguishable from "no games today", so the league was then demoted to dormant 2–3 minute polling with nothing anywhere to explain it. Parsing is per-event now: bad rows are dropped and counted, the rest come through
- Scores and ids accept either encoding ESPN uses and normalize to strings, rather than one sport's convention rejecting the row
- New `fetchWinProbability`, and `pollWinProbabilityMs` (60s) to pace it — one request per live game, deliberately far slower than the scoreboard poll

### Extension background
- **Failures are visible again.** Six `catch {}` blocks were swallowing fetch, storage and state-load errors outright, which left nothing to look at when the extension stopped switching. All of them route through a new shared logger, as does `prefsStorage`, which had been the only place still reporting anything
- With no game tab in focus, the switcher required the best game to be worth watching before grabbing the tab. Every frozen game scores 0, so a league sitting at halftime could pull you off whatever you were actually doing
- **Muted tabs are released after a service-worker restart.** The set of tabs ArenaSwap had muted lived only in memory, and MV3 tears the worker down whenever it idles — so the unmute-on-release behaviour stopped working within a minute of going quiet. It's mirrored into session storage alongside the tab registry now
- Snapshot history keeps a hard 400-per-game count cap behind the time window, so a faster-than-expected poll can't grow the arrays without bound
- Dropped a dead per-sport window lookup in history hydration: it ran before the first fetch, so the game it searched for never existed and the global window was always used

### Extension popup
- The game detail screen fetched ESPN's summary endpoint **on every score change** — a request per made basket. It fetches once per game now, with an `AbortController`, a response-status check, and state that resets when you open a different game instead of briefly showing the previous game's line

### Build & tooling
- Cypress specs are **typechecked** for the first time (`tsc --noEmit -p cypress` in the extension's `typecheck`). Wiring it up surfaced 76 errors: a missing `#i18n` path mapping, no stylesheet module declaration, `HTMLElement[]` where Cypress yields `JQuery`, a `UserPreferences` fixture missing `disabledSignals`, and a dead `@ts-expect-error`. All fixed
- The docs app has a `typecheck` task covering its React components, which caught three real nullability bugs in `LivePowerScores` (`period` and `clockSeconds` are optional on `Game`). Full `.astro` checking still waits on `@astrojs/check`, which peers on TypeScript ≤6 while this repo is on 7 — noted in `tsconfig.typecheck.json` rather than forced
- Removed `baseUrl` from the docs `tsconfig.json`; TypeScript 7 removed the option
- **Turbo cache correctness**: `zip`, `zip:firefox` and `zip:edge` all declared `.output/*.zip` as their output, and the three `build*` tasks all declared `.output/**`, so six tasks claimed each other's artifacts and a cache restore could hand back the wrong browser's build. Each target now owns its own directory and zip filename, in a new `apps/extension/turbo.json`. The zip tasks also no longer depend on the sibling `build` — `wxt zip` builds its own target, so zipping Firefox was building Chrome for nothing
- `packages/ui` has **tests** (25, covering the team-colour resolver, weather formatting, and the shared card formatters) — the shared library both apps render from previously had none. Deleted its unused `components/index.ts` barrel; every consumer deep-imports, which is also the only thing that works for the package's SCSS
- Deduplicated `docs/settings.json` in `.gitignore`; corrected stale comments referencing the removed `otEdgeMax`, a "−10 to +10" volatility range that is ±5, and eval-based sourcemaps the Vite config never touched

## The game detail screen stops repeating itself — 2026-08-02

Tapping a game used to get you the same card again, bigger. The logos, the score, the clock, the venue, the broadcast, the odds, the weather and the PowerScore bar were all already on the card you just clicked, and the abbreviations were on screen three times. The top of the screen now says the things the card doesn't, and stays quiet about the things it does.

### Extension
- **Full team names** finally appear somewhere in the app. They've been parsed from ESPN since day one and rendered nowhere. Each name sits under the crest it belongs to, on a two-row grid so a name that wraps to two lines can't knock the two logos out of level with each other
- The header carries **nothing but the Back button** while you're at the top — the card is right there. Scroll past it and a compact matchup fades in and pins to the top: both crests, both scores, centred on the card's axis, with the period pinned separately to the right so a longer status string can't drag the score off centre
- The matchup card itself is about **a third shorter**. The base diamond moved between the scores instead of sitting on its own row, the series summary and its dots share one line rather than two, and the padding between everything came in
- Upcoming games get a **live flip clock** under the scheduled date and time — `5h 13m 40s`, rolling on the second. Seconds only tick inside the final day; further out it steps once a minute, and the whole clock lives in its own leaf component so a tick re-renders three spans instead of the detail view and its four charts
- Venue, broadcasts, odds and weather moved below the math. They were pushing the PowerScore breakdown off the bottom of a 560px popup; it now starts around 164px and fits on screen in every sport
- The balls/strikes/outs count is centred under the matchup instead of hanging off the left edge
- Intermissions say **"Halftime"** rather than showing a clock that has stopped meaning anything
- **Volatility** applies whenever ESPN actually gives us a win-probability line to measure, and shows as its own row in the breakdown. Games without that data get no row and no adjustment, rather than a fabricated zero. The PowerScore reason line moved down to sit with the breakdown it explains
- **Fixed**: playoff series dots were drawn in near-white on the light matchup card, so any team the API gives us no colour for was invisible
- Retired ~220 lines of a compact-card stylesheet that shipped in every build and was never referenced by a single component, plus the synthetic win-probability code in the background that had been computing a value nobody read on every game on every poll
- Translated for all eight supported locales, with the countdown and the pinned bar measured in each one

## European Portuguese ships as `pt_PT` — 2026-08-01

Every dev and build run has been printing `WARN Unsupported locales: [pt]` since the Portuguese locales landed. Chrome's extension i18n only recognizes `pt_BR` and `pt_PT` — bare `pt` isn't on the list, so the file was being emitted into `_locales/pt/` where no browser would ever look for it.

### Extension
- `locales/pt.json` renamed to `locales/pt_PT.json`, so European Portuguese now builds to `_locales/pt_PT/` and actually reaches users running Portugal locales
- Build and dev output is clean of the unsupported-locale warning
- No translation content changed — the file was already European Portuguese ("ecrã", "separador", pre-reform orthography)

## A real countdown to tip-off — 2026-08-01

"Starts soon" on the game detail card meant anything from four minutes to four days. Now it tells you exactly how long you've got, and keeps telling you.

### Extension
- Upcoming games on the detail card now read **"Starts in 2 days 5 hours 13 minutes"**, counting down live while the popup is open
- Segments drop off as they empty out: inside a day it's hours and minutes, inside an hour it's just minutes, and the last minute before tip-off falls back to "Starts soon" rather than parking on "0 minutes"
- The countdown gets its own full-width row under the matchup instead of the narrow column between the team pills — the longest string fits on one line in all eight languages, verified by a measuring test rather than by eye
- Ticks on the minute boundary, not once a second, so a card sitting open costs one render a minute
- Translated for all eight supported locales

## Hero animation: raw data in, PowerScore out — 2026-08-01

The hero background was a loop of gray dust that never really told you anything. Now it tells the whole ArenaSwap story in about seven seconds, once, and then leaves a permanent glow around the extension card.

### Docs site
- **RAW** — the page opens as a field of colourless gray dots: every live game out there, unread and unranked
- **INTAKE** — the entire field spirals into the extension popup on a slow, eased curve. Nothing is discarded and nothing respawns; what gets pulled in is what comes back out
- **CHARGE** — the swarm holds inside the card for a beat and fills with the five PowerScore signal colours, while a third of it spins back out into a bright accretion ring hugging the card so you can see the thing working
- **BURST** — the scored data sprays across the entire viewport with a shockwave and per-particle motion streaks, spread wider than tall so it actually reaches the edges of a landscape screen
- **SETTLE** — everything is dragged slowly home and ends up orbiting the card permanently, most of it hugging the card's edge with a light dusting left across the page
- Rendering moved to pre-baked sprites and batched paths: no radial gradient or `rgba()` string is built at frame time, connection lines are stroked in three alpha buckets instead of one draw per line, and the ambient wash is a cached quarter-resolution blit
- The canvas is now DPI-correct (capped at 2x), so dots are crisp on retina instead of upscaled blur, and particle count is density-matched to the viewport rather than a fixed 700
- The loop parks itself when the hero scrolls out of view or the tab is hidden, and resizes rescale the scene in place rather than restarting the story
- `prefers-reduced-motion` renders a single static frame of the resting state — the finished picture, no motion

## Docs 404 page — 2026-07-31

Any mistyped or dead URL on the docs site used to hand you GitHub Pages' default "There isn't a GitHub Pages site here" screen, which is neither ours nor useful.

### Docs site
- New `404.astro`, built to `docs/404.html` so GitHub Pages serves it for every unknown path under `/arenaswap/`. Full site nav and footer, so you're never stranded
- The missing page is presented as a real `LiveGameCard` from `@arenaswap/ui` — the same component the extension ships — for a game between **404** and **YOU**, clock at 0:00, venue "The Void", broadcast on "Nowhere", PowerScore 0 / 100. Exactly the game ArenaSwap would never switch you to
- Shows the path you actually requested, plus a Back to Home CTA and quick links to Features, How It Works, Leagues, Package Docs, and the FAQ
- `noindex` on the page so search engines don't file the error screen as content

## Reorderable league display order — 2026-07-31

League sections on the main screen were locked to a built-in order, so a hockey-first fan still had every NBA section pinned above their NHL games with no way to change it.

### Extension popup
- Settings → Leagues now opens with a **Display Order** list of your enabled leagues. Drag a row by its grip handle, or nudge it with the ↑/↓ buttons, and the main screen's league sections follow that order
- A "Reset to default order" link appears once you've deviated from the built-in order, and the whole section stays hidden until you have at least two leagues enabled
- Your custom order is the primary sort key for both live and upcoming games, ahead of favorite-team pinning and PowerScore — day bucketing still wins for upcoming games, so tonight's games never get pushed below tomorrow's
- Turning a league off and back on drops it beside its nearest default neighbour instead of dumping it at the bottom of your list, so re-enabling NBA doesn't cost you the arrangement you built
- Extracted the shared `LeagueLogo` (with its initials fallback) out of `setupView` so the order list and the toggle grid render league art the same way

### Core
- `enabledLeagues` is now order-significant. `normalizeUserPreferences` preserves the stored order verbatim rather than re-sorting it, and dedupes repeated league ids
- No new preference field and no migration — existing saved settings keep working and simply start out in the default order

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
