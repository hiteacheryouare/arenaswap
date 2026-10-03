# Changelog

> **Two or three sentences per entry. No sub-headings, no tables, no coverage sections.**
> Say what changed and the one thing about it worth knowing later — the code, the tests and the
> git history hold everything else. An entry that wants more than that wants an issue or a source
> comment instead. Do not match the length of whatever you see below; match this rule.

## Settings marks the leagues that are out of season — 2026-10-02

Each tile in Settings → Leagues now says "Back Nov 1 (30 days)" under a league that hasn't started yet, or "Offseason" when its season is over and no next date is known. It reads the calendar in the scoreboard reply the league pickers already fetch weekly, not the season type, which calls college basketball "Regular Season" a month before tip-off, and it waits two weeks past the last listed day because playoff dates are added to the calendar late. When the label is too long for the tile, the count moves to its own line in one piece; that is the only place the line can break.

## Pre-game screens get a Matchup tab and a ticket link — 2026-10-02

Before a game starts, a Matchup tab shows each team's last five results, how they compare on a few season stats, and who is out or questionable, with basketball and hockey adding rest days, all from the summary request the screen already made, and it disappears once the game starts. Game Info also gets a "Want to go in person?" link to the seller page for that game, and our sources' referral tag is stripped off so the link carries no affiliate code.

## Best time to watch follows the crowd — 2026-10-02

The guide's Best time to watch band now goes mostly by how many games are on at once, since that's when ArenaSwap is most useful, instead of by how late in their games they are. Late game counts for a quarter of each game's weight, enough to pick the end of a stretch where the same games run all afternoon but never enough to beat a moment with more games on.

## The debug panel matches the rest of the popup — 2026-10-02

The heart's hidden debug panel no longer sits in its own fixed-height scroll box, where a three-column league grid wider than the popup gave it a sideways scrollbar. It now flows with the popup's scroll and is laid out like the settings pages, with Bootstrap-icon section headings, label and value rows, plain coloured mode words in place of badges, PowerScore progress bars, and theme colours so it follows light mode.

## Settings regrouped into six pages — 2026-10-02

Display was holding a dozen unrelated switches, so notifications, finished-tab handling and demo mode moved into Switching, league grouping and order moved into Display, and the favorite team bonus rejoined the postseason boost under Scoring. Switching and Display are split by section headings, and Demo mode no longer has its own row on the index.

## The header glow follows the top card — 2026-10-02

The glow behind the header now takes its colours from whichever live card sits at the top of the list, not the game with the best PowerScore. With a favorite team playing, those were two different games, so the header wore one matchup's colours above another's card.

## CI runs on every pull request — 2026-10-02

A new CI workflow runs lint and typecheck, unit and component tests, e2e, and a build and zip for each browser as parallel jobs on every PR and every push to mega, with Turbo's local cache carried between runs through GitHub's cache and nothing remote. The docs deploy now waits for a green CI run on mega and builds that exact commit, so it fires after every passing push instead of only when docs paths change.

## Loose ends from the polish review — 2026-10-02

Two chart lines that lifting pulled onto the same blue now switch a side, the league logo follows its side's ink so it survives a gold card, the breakdown rows stay on one line on Chrome builds without subgrid, and the site's skip link clears AA. Two specs that raced a timer and an island's hydration now wait for them, since CI would otherwise go red at random.

## The copy reads like one product, in every language — 2026-10-02

Headings are Title Case in English, every plus is a boost, the tour says click, pro tips quote the real setting labels, Ludicrous Speed stays a name in all 12 locales, and the flat error, empty and notification lines picked up some wit, our sources' binoculars included. The site bundles and `defaultStrings.ts` follow the extension's English, and a new `gameListHeader.cy.tsx` holds the load-failed banner to two lines beside Retry in every locale, which is why German, French and both Portuguese say it more briefly.

## Settings, onboarding and the tour stop fighting you — 2026-10-02

The boost fields can be cleared and stop at 100, "Settings saved" only appears when something changed, sliders read in your units with digits that hold still, team search ignores accents and the whole row stars a team, the tour can be skipped and ends once, and search results land on the setting they name. Focus follows every step and page change, pickers announce their value, the help buttons are 24px targets, and Ludicrous Speed's strobes hold still under reduced motion. The digits-only `Geist Figures` face in `_fonts.scss` is how a label like "+10 per team" gets steady numbers without re-fonting its words.

## The detail screen holds its place and speaks your language — 2026-10-02

Tip-off and the final whistle no longer throw you back to Overview, the overview no longer remounts and replays its charts when the tab strip arrives, the sticky bar takes over the score the moment it slides under, and the Back button keeps its fill and focus ring. Stats line up flush right in Geist, the breakdown's numbers clear 4.5:1 with real minus signs and a name column that fits every language, the count and the bases are read aloud, and the charts honour reduced motion and translate their tooltips. The PowerScore reason is rebuilt from locale strings by `utils/powerScoreReason.ts`, which drops a line it can't fully translate rather than mixing languages, and a test over the scorer's tunables catches any upstream rewording.

## The main list sweats the small stuff too — 2026-10-02

The notices above the list share one surface that reads in both themes, Retry and Refresh show they're working, the no-games joke stays quiet when the load failed, and Up Next cards drop the day the pager already names. Cards stop twitching and blinking (tabular PowerScore figures, a still live dot, a glow that eases between team colours, one delay label instead of two), the star gets a 24px target, final cards lose the stale betting line, and the period label, the timeouts plural and every date now speak the popup's language. The shared Translator in `packages/ui` takes a plural count the way the extension's `i18n.t` does, and overtime reads OT, 2OT, 3OT to match the box score.

## The website sweats the small stuff — 2026-10-02

A polish pass over the docs site: buttons keep their colour when pressed and show a focus ring, the top nav marks where you are, wide tables scroll on phones, anchors land below the fixed header, docs links keep you in your language, the frame around the English docs and release notes is translated in all 12 locales with dates formatted per locale, and headlines balance their line breaks. The site's own copy no longer names its data source outside the legal pages, and the fine print, small dates, skip link, Escape-to-close menu and a 180px touch icon bring it up to AA. In-article links are rewritten by a Sätteri hast plugin in `src/lib/relativeDocLinks.ts`, since Astro 7's default Markdown processor ignores `rehypePlugins`.

## The contribution docs describe this repo again — 2026-10-02

CONTRIBUTING.md had drifted into describing Firebase, an apps/web workspace and a ban on the Jest and Cypress suites the repo actually runs; it now matches the real workspaces, tooling, everything command, 12-locale rule and robotic label, with its governance voice unchanged. The issue templates are now issue forms, joined by a translation form and a pull request template, and Code of Conduct reports go to a channel that exists.

## Cards glide when the order changes — 2026-10-02

When a PowerScore push reorders the list, or a game moves between Active Tabs and Live Games, every card that moved slides from its old spot to its new one over 400ms instead of jumping, in the popup and the landing page hero alike. Only an actual reorder starts a glide: a game arriving or leaving still pushes the cards below it without animation, and reduced motion turns the glide off.

## Every forecast gets its own icon, moons included — 2026-10-02

Weather icons now come from the AccuWeather icon number our sources send next to the condition, so all 40 codes are covered, the night codes draw a moon instead of a sun, and the label map is only a fallback. Labels like "Mostly cloudy w/ t-storms" were being split on their slash and falling through to a plain cloud, and the snow decoration had the same bug, so "Mostly cloudy w/ snow" never snowed.

## The league mark reads on team colour — 2026-10-02

The league label on a live or scheduled card now takes the text colour of the side it sits on instead of the grey it had on the white plate, and its logo is the version drawn for a dark ground. Final cards keep the grey label and the light-ground logo.

## Live and upcoming cards wear both teams' colours — 2026-10-01

Live and scheduled cards, the detail header and the opening graphic are now painted in the two teams' colours, with each side's text in white or near-black depending on what reads on that colour, the crest our sources draw for a dark background, and only the tab picker on a dark panel at the bottom; Final cards keep their plain plate. Colour pairing copies Apple Sports, as worked out from 44 of its matchups: when the two colours look alike (CIEDE2000 under 11) the away team switches to its alternate, or to a colour read off its crest when that alternate is white, the old step that swapped near-black primaries for the alternate is gone, and the series dots and the Guide's edges now draw the published colours rather than lightened ones; chart lines alone are still lifted or darkened to read against the chart. The table of Apple matchups lives in `colorUtils.test.ts`, minus Red Sox @ Yankees and Lakers @ Kings, the two it gets wrong.

## Every league shares one list — 2026-09-30

Each main-screen section is now a single list across all leagues: live games by PowerScore, Up Next by start time, Final by most recently finished, favorites pinned to the top of all three, and each card names its league with a small logo and short label. The old league sections live on behind a new **Group games by league** switch, which is off for fresh installs and on for anyone whose saved prefs predate it, and grouped Up Next now sorts by start time inside each league while grouped Final keeps each league in one run, so headers no longer repeat.

## Lekton only sets clocks that tick — 2026-09-30

Periods, innings, down and distance, shootout tallies, start times, records, the Guide's ruler, the debug panel and the Ludicrous Speed signs are now DM Sans, and Lekton is left on the live clock, the countdown and the hero and sticky-bar status while a clock is running. `GameStatus.tabular` became `ticking` and is true only for a running clock, so an inning now reads in DM Sans too. The `.font-lekton` utility is gone in favour of rules on those few selectors, while the font files, the licence credit and the docs site's code font stay.

## The top of the list glows in the best game's colours — 2026-09-30

A soft gradient of the two team colours of the live game with the highest PowerScore, the one ArenaSwap would switch to, fades down from behind the header and scrolls away with the list. It's the one piece of the Spotlight redesign kept on v2, sits behind the header and the cards, and doesn't appear when nothing is live.

## Every picker in the popup is a Bootstrap dropdown — 2026-09-25

The five native `<select>`s (the tab picker on each card, When a game finishes, the standby tab, the demo season and the walkthrough's demo picker) and the Theme switcher now share `selectDropdown.tsx`: Bootstrap's `Dropdown` opening off a `.form-select`, so they look the same closed but can carry icons, a tick and disabled rows. A card holding an open menu lifts itself above its neighbours, because a hovered card's lift transform makes it a stacking context and the next card was painting over the menu. A native select gave type-to-jump for free, which the dropdown does not; tests drive them through `cy.choose(label)`.

## The guide's baseball end-time test stops depending on the date — 2026-09-25

Its fixture game started on 2026-09-21 and end times are kept for three days, so from 2026-09-24 the real clock aged it out of the slate and the test failed with nothing broken. The two tests that use it now pin the fake clock to that evening through `loadBackground`'s `initialSystemTime`.

## Light mode, with a Light / Dark / System setting — 2026-09-25

Display has a Theme setting, defaulting to Dark, and Light is a flat white palette whose tokens live in `packages/ui/src/_theme.scss` and switch on `data-bs-theme` on `<html>`; dark stays what `:root` compiles to, so the website is untouched. `public/themeBoot.js` reads a `localStorage` copy of the setting before first paint so a light popup never opens dark for a frame, and it repeats `utils/theme.ts`'s rule, which a test holds the two to. Charts, snow and league logos are drawn from JavaScript and are told the theme instead of reading CSS; onboarding and the tour stay dark.

## The Firefox sources zip stops shipping test output — 2026-09-22

`wxt zip:firefox` was sweeping the gitignored `coverage/` reports and failed-run `cypress/screenshots/` into the archive AMO reviewers download, 368 files and ~10MB of a 13.4MB upload. Both are now in `excludeSources`, the same trap `dist/` fell into before: anything left lying in `apps/extension/` ships unless it is listed there.

## Dependencies, Actions and npm brought to latest — 2026-09-22

`@astrojs/react` 7 swaps Babel for Oxc and drops the `babel` option, which the docs config never set, so it went in untouched alongside patch bumps to `astro`, `@astrojs/mdx` and `sass`. The workflows move to `checkout` v7, `setup-node` v7, `github-script` v9 and `fetch-metadata` v3, and `packageManager` now pins npm 12.1.0; `engines` still accepts npm 11, which runs fine and just ignores `allowScripts`.

## Release notes for 2.2 — 2026-09-22

`apps/docs/src/content/releases/2.2.0.md` covers everything in PR #120, the Guide polish still sitting uncommitted on `dev` included, and the entries below are its source. A change that was introduced and then reverted inside the PR, the monochrome crest treatment, is described by where it ended up: a crest is always the team's own crest in its own colors. The notes carry no byte counts, request counts or tooling names, and call ESPN "our sources" throughout.

## Cypress typechecks the confetti hook against its real declaration — 2026-09-22

The Guide now imports `useFavoriteScoreConfetti`, which pulled the hook into the Cypress tsconfig for the first time, and that project never included the hand-written `canvasConfetti.d.ts`, so `tsc -p cypress` failed. The declaration is now in its `include` list beside `scss.d.ts`.

## The Guide reads like a scoreboard — 2026-09-22

Guide bars now carry the score and clock for a live game, the final score with the loser dimmed, or the kickoff and network before the start. Labels stay pinned beside the league column after their bar has scrolled away, and the drawer shows the game's real PowerScore and charts: it takes them from `GET_STATE` and `SCORES_UPDATED`, which it previously ignored. "Best time to watch" on today's page now looks only ahead of the current time.

## The team picker loads with the popup's own spinner — 2026-09-22

The team picker in Favorite Teams and onboarding now shows the same orange `popup-loading-spinner`, with its caption underneath, that the game list uses, instead of a small grey Bootstrap default.

## The Guide draws games as long as they actually ran — 2026-09-22

A final now ends on the Guide where it really ended, not at its league's estimate: the background stamps the poll that first sees a game it watched live go final, and for baseball finals it never saw end it asks the summary for `gameDuration`, the only league that sends one. A live bar is projected from `computeGameProgress`, newly exported by powerscore, as a typical game's worth of what regulation has left, so a slow game grows past its slot instead of trailing ten minutes ahead of the now line.

## Clashing NHL teams keep their own colours — 2026-09-22

ESPN's NHL scoreboard has stopped sending `alternateColor`, and when two primaries clashed (Sabres and Blue Jackets navy, Hurricanes and Panthers red) `resolveTeamColorPair` used the default orange as the home team's "alternate" and chose it. A missing alternate now falls back to the team's own primary, so a clash with nothing to swap in draws both teams' real colours rather than handing one side the default.

## The README catches up — 2026-09-21

The README was still promising a 6-second switch cadence that the code gave up when `pollMinEagerMs` went to 12 seconds, asking for Node 20.17+ against an `engines` field that starts at 22.9, and drawing a package tree with `packages/ui` missing from it. Guide, tab suggestions, Up Next, the game detail tabs and the 12 locales are in the feature list now, and the website, CONTRIBUTING, SECURITY and the Code of Conduct are linked from it for the first time. That same stale 6-second figure is still sitting in `en.json` and `desc_long.md` where correcting it means 11 translations, so it was deliberately left for a pass that can do them.

## The README shows five screens — 2026-09-21

The screenshot row grew from three shots to five: game detail now appears twice, once as an NFL drive and once as an MLB at-bat, and the box score is in the README for the first time. The `demo-1/2/3` filenames became descriptive names because the numbers never matched display order — the old README rendered them 1, 3, 2 — and the superseded `demo-3.png` is kept in `marketing/img` for store listings rather than deleted. Thumbnails went 190px to 150px since five at 190 overflow the ~896px readme column on a repo home page, and 150 is the widest that still holds one line down to an 800px column.

## The fixes get audited — 2026-09-21

Every fix from the coverage round was mutation-tested — each one reverted to confirm the test standing guard over it genuinely goes red — and the momentum floor, the cooldown that now survives a worker restart, the ink crossover at luminance 0.1993 and the win-probability symbols all held up. Four defects came out of the pass and are left as failing tests rather than fixed: a switch time recorded by a fast clock now outlives the worker and refuses every switch until the skew passes, `parseClockToSeconds` reads `1.0` as one second and `0.9` as fifty-four so a countdown appears to run backwards, the docs site prints a soccer clock as `95:00` where the popup prints `95'` because `formatGameClock` was the one helper the extraction left behind, and the reduced-motion opt-out loses on specificity to the celebration rule so a reader who asked for less motion still gets the strobe.

## Four test comments that outlived the bugs they described — 2026-09-21

An audit of the new suites against the rules their authors were given found the `liveClock` header still explaining that `(min ?? 0)` fails to catch NaN, and three "FAILING ON PURPOSE" notices sitting on tests that pass — comments that tell the next reader the opposite of what the code does are worse than no comment. The `symbolSize` assertions also moved off `toBeGreaterThan(0)`, which a 1px dot satisfies while being exactly as invisible as the missing symbol they exist to catch; mutating the source from 7 to 1 now fails three tests where it failed none.

## Seven silent bugs, found by pointing coverage at the whole repo — 2026-09-21

Every workspace reports coverage now — Jest in four of them, Cypress behind an environment variable in the two that build, so a shipped bundle is never instrumented — and one auditor per workspace went after the gap between tested and verified rather than after the percentage. Seven real defects came out of it, each proved with a failing test before anything was changed: an overturned goal scoring as maximum momentum for the other team, `NaN` reaching the game clock and then storage as a third type, the switch cooldown resetting on every MV3 teardown so the setting quietly stopped holding, and a win-probability line one poll old drawing nothing at all. The clock parser and the period formatter now live in dependency-free modules both apps import, which is what the duplicated copies cost.

## The website gets a net under it — 2026-09-21

Four new Cypress specs cover what a visitor to the docs site actually does: every internal link, sitemap entry, `<html lang>` and locale page is checked against the finished build in one pass, the React demos are proved to hydrate and to speak the page’s language, and the install button is driven under seven user agents to confirm Firefox and Edge visitors reach their own stores. Client-side coverage is available behind `ARENASWAP_SITE_COVERAGE=1`, which instruments the islands and redirects nothing — a normal build still ships clean JavaScript to the tracked `docs/` output. `liveBoardSoccer.cy.ts` caught `LivePowerScores.tsx` keeping private copies of `formatPeriod` and the ESPN clock parser, neither carrying the soccer handling the shared originals have; both copies are gone now.

## The detail tabs cut rather than fade — 2026-09-21

Overview, Box score and Standings swap with no crossfade: the panes drop Bootstrap's `fade` class, which is also the flag its tab plugin reads to decide whether to wait on a transition before revealing one, so the swap is synchronous rather than merely fast. They are one game seen three ways rather than three places to travel between, and a beat of half-legible scoreline between the tap and the table was the wrong thing to spend it on. The tab buttons keep their own hover and active feedback.

## Both apps move on one clock — 2026-09-21

The extension and the website had drifted to 17 durations and 16 easing curves between them, including two near-identical signature ease-outs doing the same job in different places, so `packages/ui/src/_motion.scss` now holds seven durations, three loop cadences and four curves and everything ambient reads from it — including Bootstrap's own components, whose timings are compiled into its declarations and so had to be reached through `$btn-transition` and its neighbours in the theme rather than from a rule. `cubic-bezier(0.22, 1, 0.36, 1)` won the signature, so the site's 19 uses of `cubic-bezier(0.16, 1, 0.3, 1)` came to it. The hand-tuned set pieces are deliberately exempt — the card reveal, Ludicrous Speed, the wordmark collapse and the onboarding rise keep their own beats — and `prefers-reduced-motion` now goes through one mixin with a stated rule about what belongs inside it: movement and looping, not a colour settling on hover.

## The loading spinner learns 39 more jokes — 2026-09-20

The pool goes from 73 lines to 112, filling in the sports the list barely acknowledged — hockey, soccer, tennis, cricket — plus fan superstition, a few where the extension is self-aware about ranking games by chaos, and a run of oblique winks at famous sports fiascos in the vein of the Deflategate line already there. Those last ones never name what they are pointing at, which is the whole joke, so the translations were told to keep the reference buried rather than clarify it for the local market. `LOADING_MESSAGE_COUNT` in `popupHelpers.ts` is still hand-maintained and is the only thing tying the random index to the twelve locale files, so it has to move with the key count.

## Three things the scoreboard poll was already carrying — 2026-09-20

A ranked team wears its poll position in front of its tricode on the cards and in front of its full
name on the detail hero, a gridiron team carries its timeouts as dots in both places, and the play
that just happened gets a titled section at the top of the live detail screen with a left rule in
the colour of whoever made it — all of it read off `situation` and `curatedRank`, which the
scoreboard response has always included and `espnSchemas` has always stripped. The play
deliberately does not sit on the list card: directly above the venue and the networks it read as one
more line of venue chrome. Baseball also gets the live pitcher-batter pair under the count, which is
what replaces `probableStarter` once the first pitch is thrown, and the two swap ends at the half so
each man stands under his own club rather than holding a fixed pitcher-left layout.

## The game detail screen files itself under tabs, and one of them is the table — 2026-09-20

The screen is Overview / Box score / Standings now rather than one long scroll, on Bootstrap’s own `Tab` plugin — it owns the active classes, the roving tabindex and the arrow keys, and React leaves them alone because the `className` it renders never changes between renders. The table is the whole league off `/apis/v2/.../standings?level=3`, divisions grouped under their conference, which is 4-15KB gzipped and so is fetched alongside the summary rather than on click; men’s and women’s college basketball and college football keep the matchup’s own conference out of the `/summary` block instead, because their full tables are 6.2MB, 6.2MB and 2.6MB for 365, 363 and 138 teams. The two teams playing carry the line score’s team-colour row wash, and a tab is drawn only once there is something behind it.

## The opening animation has a switch — 2026-09-19

Display settings carry an on/off for the popup's open reveal, and off resolves the mode to `none` before a card is drawn. It lives in `UserPreferences` like every other setting, but `resolveOpenRevealMode` runs inside a `useState` initialiser and `browser.storage` cannot answer that early, so the popup mirrors the value into `localStorage` once the prefs land and the animation reads the mirror on the next open — the same arrangement the day stamp already uses, and the reason the switch takes effect one open later. Turning it off leaves the day unstamped, so turning it back on returns the long version rather than the quick one.

## The site header folds its mark the same way — 2026-09-19

The website's navigation runs the extension's own collapse rather than an impression of it: `driveWordmarkCollapse` came out of the popup hook as a plain module an Astro script can call, and the nav draws the real `Wordmark` instead of a picture of one. The bar keeps its 64px, because the drawer hangs off that height and the hero measures against it, so the only thing that moves is the mark — down to 25px rather than 28, which is what holds the `a` and the `s` at the size they were once the box stops being four-fifths air. The background arrives on the same signal now instead of a listener of its own, which costs every page 4.3KB of inline SVG and an 8.4KB script it did not carry before.

## The popup header pins, and the wordmark folds into the favicon — 2026-09-19

Scrolling the game list sticks the header to the top and, past 40px, plays a 450ms collapse into the icon: the `a` slides left along its row with the arrow's tail pinned off its shoulder, the orange period sweeps left through `wap` and then closes to nothing behind the `s`, and the two surviving letters are on screen for every frame rather than being covered and brought back. The last frame is the shipped icon — the two files share their letterforms, so those travel under a transform, while the icon's wider arrowhead and lighter chevron are reached by lerping matched point rings that `npm run ui:wordmark-shapes` bakes out of both SVGs. Note that `icon_white_on_transparent.svg` carries a period the real icon does not: every PNG under `apps/extension/public/icon` has zero orange pixels, and their white ink measures 1.212 wide for its height against 1.218 without the dot and 1.414 with it. The collapsed mark keeps a margin inside its own box rather than sitting flush like the wordmark does — long thin type gets away with that and a compact heavy glyph does not. The bar's surface is a separate signal from its collapse, snapping opaque at the first pixel of scroll rather than fading in on the collapse curve 40px and 450ms later, and every pose puts `scrollTop` back, because the browser hands the ~19px the bar gives up straight to the scroll position and that is enough to flutter the header and to lose the offset a game detail returns you to.

## Halftime and Final are words, so they stop being set like figures — 2026-09-19

Lekton exists in this product to hold a ticking clock's columns still, and the states that replace the clock with a word — Halftime, Intermission, Final, an ESPN delay description — have nothing to hold, so they now take the body face on the live card, the detail hero and the sticky bar. `resolveStatusText` became `resolveStatus` and returns `{ text, tabular }`, which keeps the decision in the one place the branch order already lives rather than duplicating it at three call sites. The period, the clock, the inning and the countdown are unchanged.

## The opening graphic draws its type in an ink the band can hold — 2026-09-19

Penn State reach the popup as `#FFFFFF` over their navy, because `apiClient` promotes a primary too dark for the rest of the product, so every card they appeared on named them in white on a white band and drew their tricode the same way. `teamDisplayInk` picks the ink per side against WCAG's 3:1 large-text bar, which display type at this size earns: white where white reads, the club's own other colour where it does not, and the near-black only for a club with nothing else to offer. The wipe bars are still white and still vanish crossing a light band, which is a moving element rather than words and was left alone.

## Every outdated dependency to its latest, `@astrojs/mdx` across a major — 2026-09-18

The only major in the set is `@astrojs/mdx` 7 → 8, which hands MDX processing off to the Markdown processor and is inert here because `astro.config.mjs` calls a bare `mdx()` with no plugins, no `markdown` block and no `extendMarkdownConfig`. A stray root-level `astro` came out with it, since nothing outside `apps/docs` ever imported it, and `npm audit fix` took four transitive advisories to zero. npm 12 declines install scripts it has not been allowlisted for, which is how Cypress lost its binary; `allowScripts` now permits that one postinstall and records the other five as reviewed and refused.

## The clashing pair is ranked on readable sides rather than filtered for ink — 2026-09-18

`pickPair` drops its ink special case and ranks the substitutions by how many of their two sides are readable, falling through to distance only on a tie — which is what the `isInk` channel threshold and its two filter passes were approximating. Filtering on readable-on-both-sides leaves nothing to choose between but the discards, and the farthest apart of those is always black against white at 441.7, so Houston's published white and Texas Tech's published black drew two red teams as ink. The ranking keeps Tech's red on the card and still separates the Nationals from the Cardinals through a navy.

## The naming takes the card, on a split laid flat, filled rather than outlined — 2026-09-18

The full-name beat moved onto two flat full-width bands, away over home, because a leaning seam leaves each club half a card and at half a card the longest word sized everything — the naming was drawn at a third of its tricodes and read as a caption. Set solid white in the club's own case, broken at ESPN's `Team.nickname` and left on one line wherever that draws it bigger, at 38–40px against the 17.6px the pass before could reach. Every size is measured off DOM advances rather than counted from characters, since an advance is a property of the letters and not their number — 0.5168em each for "Pittsburgh" against 0.6629 for "Commanders".

## The naming is a scene of its own, set where the tricodes are — 2026-09-18

The names take the tricode's own treatment — two stacked copies, since a stroke follows every contour the font draws — and are centred on the crest slots at 25% and 75% rather than hung in a corner, which is what the two passes before this had missed. One window carries crests and naming, and the poster begins at the frame the naming clears; a spec computes that percentage from the two constants rather than trusting the keyframes to agree.

## The card the graphic was over is the same card afterwards — 2026-09-18

`gameCardReveal` dropped its wrapper element when the graphic finished, and React reconciles children by position, so the card subtree was rebuilt rather than moved — destroying whatever the user was interacting with, which is exactly the interaction that ends the reveal. One render path now with `playing` gating each layer in place, so the card keeps its index and the empty wrapper stays for good.

## A crest bound for a monochrome mark stops flashing the colours it is giving up — 2026-09-18

The verdict is read off the colour artwork's pixels, so the artwork must load — but it was also being painted while judged, giving abbreviation, colour, abbreviation, mark. `Crest` holds behind its placeholder until the artwork it asks for is the artwork that loaded, using `visibility` rather than `display` so a lazy guide crest still has a box to be scrolled into. The hold releases on the measurement having been *attempted* rather than answered, since `crestReadsOn` refuses to record a verdict off a tainted canvas and those crests would otherwise never appear.

## Zod ships as `zod/mini`, and the string-format validators nobody called go with it — 2026-09-18

Both schema files were written in the chained API, which is why the complete Zod 4 build survived into each MV3 bundle carrying `nanoid`, `cuid2`, `jwt`, `ipv6` and six more validators an extension cannot use. Ported to the functional form, zod's own share goes 79,455 → 17,407 bytes in `background.js` and 79,766 → 19,102 in the popup's preloaded vendor chunk. `external` in the rolldown config had to move from `'zod'` to `'zod/mini'` at the same time, since it matches by exact string.

## The popup stops preloading a megabyte of charting it will probably never draw — 2026-09-18

echarts was reachable from the popup entry, so `popup.html` modulepreloaded 1,005,346 bytes for four charts most opens never reach. The split is inside `gameDetailChart` rather than at its call sites: only the init/resize/dispose half moved behind `import()`, and the Suspense fallback is the card's own empty canvas box, so the 176px is reserved by the rule that will size the chart. Vendor chunk 1,005,346 → 487,940, and the guide page — which has never drawn a chart — gains the whole half megabyte.

## The oversized crests take their colour across the whole card, not into a disc — 2026-09-18

Third pass on where this beat's colour goes, and the answer is across the card at full size with no disc and no third surface. The field is the same element `teamCrest` already paints, so it is correct by construction — bare where the artwork reads on its team's colour, `teamCrest`'s inline tinted plate where it does not. The two fields also take the poster's own `clip-path` polygons, so the seam is one shape written once.

## A crest is the team's crest, in the team's colours, everywhere — 2026-09-17

Reverts the crest contrast treatment entirely: a crest swapped for a white silhouette is no longer that team's crest, and which teams it caught was not something a reader could predict or a designer could see coming. Gone with it are the mono-mark fetch and its cache, the `/summary` mark parse, `TeamMonoMarks`, the persisted verdict store and every plate rule. Kept: `pickPair` still refuses to answer a clash with black against white.

## The first open of the day opens on the two crests, too big for the card — 2026-09-17

A beat before the poster — the two crests at 1.34 of the card's height, overhanging and cut at the card's edge, shrinking towards the hold the poster takes them to. It was accepted after two refusals because it is made of nothing new: the thing that takes it away is the next beat arriving, so there is no transition to design. `--reveal-delay` split into the cascade and `--reveal-spine` (when a card's poster starts) now that the timeline has two phases, and the rate came back 1.5 → 1.3.

## The open animation is cut like a broadcast package rather than timed like one — 2026-09-17

Slowing the graphic was the easy half and did not land. Audited against the motion-design vocabulary — offset, overshoot, secondary action, parallax, masked reveal, easing — it scored one of six, so the lettering now drives in from its outer edge and overshoots, the crest drifts 5px against the lettering's 16, the colour fields are shaded inward along the lean, and the pass became three bars opening out as they cross. The team records added in the previous pass came back out at the maintainer's call.

## The popup stops scrolling sideways while the open animation plays — 2026-09-17

A clip path clips painting and says nothing about scrollable overflow, so the parked wipe bars went on counting toward scroll width from off the card — 334px against a 305px frame. Both layers take `overflow: clip` back alongside the clip path with `overflow-clip-margin: 1px`, and measuring it found `.popup-root` had been 14px draggable for every view change in the popup's history, from the shell's own `translateX(14px)`.

## The seam crosses the centre by a tenth of the card at most, not by however tall it is — 2026-09-17

The lean is half the horizontal run of the angle across the card's height and was bounded by nothing, so the shipped 210px card's seam crossed the centre by 39.7px of 296 while the 148px component fixture measured symmetric — which is why the first two readings of this were wrong. Bounded at a tenth of the card's width, and `--reveal-skew` is derived from the bounded lean, so the stylesheet no longer names 20.5° in six places and the bar stays parallel to the edge it reveals by construction.

## A parked wipe bar is off the card, once the skew is counted — 2026-09-17

Skewing about the centre throws a strip's ends sideways by half its height times the angle, so a bar overshooting 30% above and below the card had a 112px bounding box and left 13.7px of white in a corner for a second and a half. The strip is the stage's height now, so its ends land exactly `--reveal-lean` to either side and `revealSweepRun` is the card's width plus a bar width plus two leans.

## The graphic covers the card by a pixel, because a cover of its exact shape cannot — 2026-09-17

Both boundaries antialias, so a cover of the card's exact shape leaks 22% of its border at the corners — and a cover that merely *contains* the shape does not fix it, because raising its coverage to no less than the card's is not raising it to 1. Only a full pixel of bleed does, via `clip-path` at the card's radius plus one, on the vertical axis alone since `left: 25%`/`75%` are the crest slots. The lean is measured across the bled height, or the seam and the bar revealing it quietly stop being one line.

## A window is a list of days, because ESPN stopped answering for a span — 2026-09-16

`dates=20260914-20260915` now answers 400 in **all 31 leagues** at any width including a single day, while `dates=20260915` answers 200 — so the three entries below diagnosed a real symptom as a per-league quirk when it is universal. A window is enumerated as its Eastern days at one request each, behind a per-league-per-day cache whose TTL is read off what came back: 30 minutes for a settled past day, 10 for a schedule, never for today. Two things fell out: `limit` is real and had never been sent (an MLB month gives 100 events without it and 369 with), and the lookahead had been 400ing on every call, so no league had been sleeping at all.

## The popup's slate asks for what the popup wants, because the response has a budget — 2026-09-15

Reverts having `refreshSlate` fetch the guide's superset so the two could share one request. ESPN caps a scoreboard response server-side and truncates the tail, so reaching two days back for the guide's finals spent the whole event budget on a college football weekend's *past* games and left the popup one day of future. Two callers wanting overlapping data is not a reason to widen one request for both when the response has a cap.

## A final survives the league that failed to mention it — 2026-09-15

Two corrections after the entry below lost MLB's finals. The undated-board latch now expires after ten minutes rather than lasting the worker's life, since "Failed to get events endpoint" reads like ESPN's service failing rather than a rejected parameter. The deeper one predates the fallback: `refreshSlate` rebuilt `upcomingGames` and `retainedFinalGames` from `result.games` wholesale, so a league that failed only its slate leg had every final thrown away — only the leagues that answered have their entries replaced now.

## MLB will not take a dated window on the live board, so which leagues will is ESPN's to say — 2026-09-15

MLB's scoreboard answered 400 to the two-day window the college football fix started sending in every league, so the first refusal per league is remembered and later polls fall back to the undated board. Only 400 and 404 count as a refusal — a 403 is ESPN shedding load and would otherwise drop college football onto its curated week for the worker's life. Superseded by the 2026-09-16 entry above: the refusal is not per-league.

## A refused scoreboard stops reading as an empty one, and four ways of asking ESPN less — 2026-09-15

`fetchGamesWithLeagueLogos` collects with `allSettled`, so a 403 league contributed nothing and threw nothing — every caller read it as "this league has nothing on", which drew the empty slate on a full Saturday and, worse, walked a league towards dormant while its games were being played. It returns `shedLeagues` now. Four cost reductions ride along: the eager poll floor is read off each league's own `cache-control: max-age`, a 16-token bucket refilling at 10/s shapes the bursts `settledInPool` cannot see, the guide reads the slate the poll already holds, and the team marks moved from a module-scope `let` to `storage.local` on a weekly TTL.

## The site's live demo stops asking about 31 leagues to draw eight cards — 2026-09-15

`LivePowerScores` fanned all 31 leagues every 15 seconds for as long as the tab stayed open — 124 requests a minute, with `client:visible` governing only when it hydrates. The 15s cadence now asks only the leagues with something live, the full 31 are swept every two minutes six at a time, and a hidden or scrolled-past tab asks for nothing. Worth knowing: a half-spoofed Chrome `User-Agent` is refused deterministically by ESPN and looks exactly like fingerprinting — a complete header set behaves like bare curl.

## The popup stops spending the whole of ESPN's burst allowance on the league pickers — 2026-09-15

`app.tsx` fanned all 31 leagues on every popup open to fill the onboarding and settings pickers, which is more than ESPN's burst allowance from one IP, and `allSettled` made the resulting 403s silent — the slate simply came back short. None of it needed the network: `resolveLeagueLogoUrl` answers for all 31 offline, so the pickers are seeded from that and the fetch became a weekly `storage.local` upgrade.

## Every layer of the open animation is drawn against the card's own box, and the outline is an outline — 2026-09-15

Review pass on the reveal. `-webkit-text-stroke` strokes every contour the font draws including the ones a filled glyph hides, so DM Sans' overlapping stems came out cross-hatched — it takes two stacked copies, not an alpha fix. The tricodes now scale by the longer of the two (UCONN against UMASS overlapped by 52px), the crest plate grows around the crest box rather than shrinking the mark inside it, and the stagger plan is fixed on the first non-empty list because both live sections re-sort inside the animation window.

## The popup opens on the matchup, and the bar that crosses it is what turns the tricode into the crest — 2026-09-15

From a Figma storyboard: every card arrives as the matchup poster it is underneath — two team colours wiping in to meet on a leaning seam, outlined tricodes, a white bar crossing each side, then the colour retreating to uncover the 5px rails `buildGameCardStyle` had been drawing in those same colours all along, so the ending is paint that is already identical. The trade under the bar is a clip complement rather than a dissolve, so every pixel shows exactly one layer and the edge *is* the bar. Capped at eight cards, since a thirty-game Saturday is otherwise three hundred animated elements.

## A crest is judged where it is drawn, every time it is drawn — 2026-09-14

`TeamCrest` held its contrast verdict as mount-time state, but the guide's drawer reconciles one game's detail into the next and every hero remixes its backdrop — so the last team's answer drew the next team's crest permanently, since a component showing a mono mark never reloads the artwork that would correct it. The verdict is read out of the module caches on every render now, and a `getContext` failure past Chrome's canvas ceiling is no longer written down as "this crest reads fine" for the life of the profile.

## A crest stops losing its ends to the circle drawn around it — 2026-09-13

The sticky bar drew an 18px crest inside an 18px round clip, shaving 25px of ink off the Giants' 'ny' — a wordmark reaches the corners of its own box. The clip belongs to the plate, so it is gone wherever `is-bare` says nothing is painted underneath, and where a plate is drawn the crest insets to three quarters of it: measured over 264 crests, the furthest ink reaches 65% of the way to its own corner.

## The crest on the 50 is judged against the grass it is painted on — 2026-09-13

Midfield takes the same three-rung treatment as the end zones, against `turfColor` — which moved out of the stylesheet into `footballField.ts`, since the paint and the verdict reading different hexes is how the two would drift. It sits in a `foreignObject` rather than joining the end zone marks in the overlay, because the ball and both live lines cross the 50 and belong over the paint.

## Both end zones are lettered with the crest and nickname of the team that defends them — 2026-09-13

Replaces the rotated abbreviation, using ESPN's own `team.name` carried as `Team.nickname` rather than sliced off `displayName`, which would turn the Nittany Lions into the Lions. `writing-mode` rather than a rotation, so the lettering truncates against the end zone's real 60px depth; the fifteen-letter college names fit at no legible size and truncate rather than dragging the type smaller for everybody else.

## A team shown in its own second colour keeps its crest, and the detail heroes draw it bigger — 2026-09-13

`strongInkReachShare` asked for 60% of what the surface could reach, which threw USC's cardinal on their own gold (2.6:1) away for a black mark — a club picks its two colours to be told apart, not to clear a text bar. It is 35%, and **only on team-colour heroes**: a guide bar reaches 15.2:1 and the popup 18.9:1, so no verdict there moves. Hero crests go 44→64px pre-game and 36→52px live, decided by the gap left to the score.

## The Marlins keep their own colours, because a share is an area and an outline is not — 2026-09-13

Miami's crest is a black M with a thin blue-and-pink stroke, and a tenth of the ink is more area than any outline has; measured over 124 crests on four surfaces each, the genuinely empty ones sit at 0.0–0.4%, so the strong share is 4%. No contrast floor could have separated these — Baltimore's orange on a bar is 3.77:1 and the Rangers' brightest navy on their own navy is 3.73:1. Persisted verdicts carry the thresholds they were reached under, joined into a string from the constants themselves rather than a number somebody must remember to raise.

## The docs fonts load in dev again, out of src/ rather than public/ — 2026-09-13

Astro sets Vite's `base` for the build and not for the dev server, so no path into `public/` can be correct in both modes — the built URL carried the base and dev 404'd every font. The nine files moved to `apps/docs/src/fonts/` (`$font-base-url: '/src/fonts'`), where Vite resolves them as source assets, applies `base` itself and content-hashes them. The extension is untouched: it has no base to disagree about.

## A team keeps its own colours, and gives them up only where they stop being readable — 2026-09-13

`pickPair` discarded its usability filter when no substitution passed and fell back to maximising raw RGB distance, which is always black against white; it now keeps both published primaries and only substitutes when both sides are ink. The hero became one scrimmed poster surface in all three states, and a crest draws in colour unless under 10% of its ink clears 4.5:1 against the backdrop actually painted — then ESPN's black or white monochrome mark, then a tinted disc. The verdict is cached in `localStorage` because a popup is a new document every open.

## The Guide reads as a grid rather than as bars floating in a void — 2026-09-13

Legibility pass over the rendered page: three weights of rule plus a banded odd row, the league name as a sticky 168px left column, a lighter fill and red dot on live bars, the best-window band's dashed edges moved up to the ruler where they cut nothing, and the first hour's tick lined up with its own gridline. No x coordinate accounts for the gutter — only the canvas width and the opening scroll position add it, and anything drawn in canvas coordinates scrolls away from the sticky column it is meant to continue, which is why the tail below the last group is a sticky cell rather than a rule on the body. The band explainer keeps its full sentence and lives inside the switch's own control, so the switch label opens it and nothing prints 'Best time to watch' twice.

## The Guide opens on today rather than on the day before yesterday — 2026-09-12

`fetchLeagueGames` reaches two days back whenever finals are asked for, so the day list started in the past and index 0 was no longer today. `defaultDayKey` resolves today, else the next day with games, else the most recent past day; past days stay on the pager, because a late kickoff still running belongs to yesterday.

## The Guide pages into the week, and follows the Up Next setting to do it — 2026-09-11

The guide spans `max(upcomingGamesDays, 3)` days and pages a day at a time, reusing Up Next's pager, `groupByDate` and existing locale keys. A continuous axis was rejected: seven days is a ~21,000px canvas of mostly empty rows. Only today draws a now line.

## A live college football game stops being missing because ESPN did not feature it — 2026-09-11

ESPN's dateless scoreboard is an editorially curated week for college football, not a day — 24 events against 86 dated, dropping live games. The live poll now names its date window in every league, reaching back one day so a late kickoff filed under yesterday survives Eastern midnight. A dated college football Saturday is still capped near 80 events.

## The Guide stops looking like a wireframe of itself — 2026-09-11

Polish pass: team colours returned as 3px rails at the bar ends (lightening on, unlike the white game card), crests and league marks took the tinted `CrestDisc`, the canvas stretches to the scroller, the detail drawer became a sliding flex sibling at 321px so it cannot occlude the header, and the band label moved into the header where no scroll position can slice it.

## Today's slate gets a timeline, and the best window comes out of arithmetic — 2026-09-11

New browser tab: today's card as a timeline, bars sized from a per-league `runMinutes` table (p75 broadcast length — `sportWrapAllowanceMs` is deliberately generous retention and wrong for this), with a band over the leverage-weighted concurrency peak rather than the raw one. It fetches its own slate through `GET_GUIDE_SLATE` so display preferences cannot trim it, never widening `games`, and is drawn in CSS rather than echarts.

## The font warnings go quiet, and DM Sans stops shipping four copies of one file — 2026-09-11

`$font-base-url` carried the deploy base by hand, which made Vite's `checkPublicFile` miss and warn 13 times; written bare, Vite prepends `base` itself. `$bootstrap-icons-font-dir` was never set for docs, so one dead `@font-face` shipped behind a hand-written duplicate. DM Sans' four weight files were byte-identical copies of one variable font — consolidated to `DMSans.woff2`, measured identical to the thousandth of a pixel at every weight.

## "Starts soon" comes out of the scoreboard face — 2026-09-11

`.gd-countdown-soon` is words rather than scoreboard data, so it takes DM Sans instead of Lekton. Also removed the dead `detail.powerScoreLabel` key and made the English breakdown labels consistently sentence case.

## The test browser is Chrome, and Cypress is 16 — 2026-09-11

`defaultBrowser: 'chrome'` in both `cypress.config.ts` files, since Cypress 16 deprecates its bundled Electron and a later major removes it. Node engines narrowed to 22/24/26; nine of 16's ten breaking changes are inert here, and the native Chrome network path cost nothing.

## A league with nothing on stops asking ESPN every three minutes — 2026-09-11

A third poll state below dormant for a league whose next game is more than 24 hours out: one ranged lookahead request buys sleeping up to 30 minutes at a time, against dormant's 576 requests a day. `undefined` (nobody asked) and `null` (asked, nothing in window) stay distinct so an unasked or failed league stays dormant rather than sleeping.

## The Ludicrous Speed egg is click to skip, and nothing else — 2026-09-11

Removed the review-only transport keys — including `f`, which persisted a 4× rate to `localStorage` — and the untranslated hint strip they came with. The specs walk the real script on a faked clock instead of the deleted keys, going from 33 seconds to 3.

## The review prompt stops appearing on the loading screen — 2026-09-11

`showReviewPrompt` is read from `storage.local` rather than the SWR fetch, so it was the one banner that could render under the spinner and under the failure notice. Gated on `!isLoading` in `mainView`, not in the eligibility helper.

## The stylesheets stop using @import, and two dead overrides fall out — 2026-09-11

All 21 of our own `@import` rules became `@use`/`@forward`; the theme forwards Bootstrap and each app configures it by argument. Fell out on the way: two overrides naming variables Bootstrap does not have, a duplicate copy of Reboot, and 39 `@extend` heading twins that `@use` cannot reach. The compiled CSS was verified as a pure relocation on all four entry stylesheets.

## Bootstrap's Sass warnings go quiet on a gate that lifts itself — 2026-09-11

`quietDeps` — scoped by origin, unlike `silenceDeprecations`, which would have buried our own two warnings as well — silences Bootstrap 5.3.8's 331, gated on the installed Bootstrap being below 5.5.0 so the switch lifts itself when the announced fix lands. Our own two were fixed with `calc($i / 6 * 100%)`.

## The postseason boost knows which round it is paying for — 2026-09-09

The flat +5 became a ladder keyed on distance from the trophy, paying 25/50/75/100% of the preference (default raised to 8), with the round name printed on the card in ESPN's own casing. Sampling all 31 leagues also fixed three live bugs: the 2026 World Cup round of 32 scoring as regular season, NCAA baseball and softball inverted, and the Pro Bowl paying like a conference final. An ungradeable round takes the bottom rung, never the ceiling.

## A dome game stops reporting the weather outside — 2026-09-09

ESPN sends the stadium postcode's forecast for roofed venues too, so domes reported thunderstorms and December would have buried them in falling snow. `parseWeather` takes `venue.indoor` and returns undefined, covering the chip and the decoration at one point. Retractable roofs report `indoor: true` whether open or shut and lose their weather either way.

## The standby strip stops being a white slab with dark-theme ink on it — 2026-09-09

`.bg-body-secondary` was never themed, so the strip drew `#8b949e` on Bootstrap's light `#e9ecef` at 2.59:1. `$body-secondary-bg` and `$body-tertiary-bg` are set at the root now (4.95:1), with `$progress-bg` pinned so the two progress tracks on light cards stay byte-identical.

## The sticky bar counts down to a scheduled game instead of printing two zeros — 2026-09-09

A scheduled game's sticky bar showed `ATL 0 — 0 PHI`; it now drops the scores and puts a two-unit countdown in the status slot, which is empty before a start anyway. New `formatCompactCountdown` prints the largest non-zero unit and the one below it, and needed no new locale keys.

## The settings cog turns under the pointer — 2026-09-09

A 90° turn over 0.35s on hover and focus, hung on the icon's `::before` because an inline `<i>` takes no transform. `:not(:disabled)` keeps it off the docs site's inert copy of the header, and it is off entirely under `prefers-reduced-motion`.

## A navy crest in the tab-match list stops being a silhouette — 2026-09-08

Suggestion rows took the team picker's white tinted disc (18.9:1 on the popup), and the shared tint state moved into a `CrestDisc` component. The sticky bar cannot have one: measured, a 24px disc overlaps the status text in English and Japanese.

## The site's demo game is a comeback now, and the score chart stops starting at zero — 2026-09-08

The landing page's demo game stayed within four points for its whole history, so two of the four charts drew flat lines; it is a 15-point comeback now, with win probability written out as literals rather than derived from the margin. `buildTeamScoreOption` takes `scale: true`, which also fixes every basketball score chart the popup has ever drawn.

## The wrap screen's charts can actually draw, and eleven other things a review found — 2026-09-08

`coversWholeGame` needed a history span the rolling per-sport window could never produce, so three of the wrap screen's four charts had never drawn for anyone — snapshots older than the window are thinned to one per two minutes instead of dropped. Also: finals were only ever recorded on `refreshSlate` and vanished at Eastern midnight, the range query reached back one day against a 27-hour window, the dimmed loser's score was 2.33:1, `brighten` cannot lift a channel already at 255, soccer extra time drew as `OT`/`2OT`, and six assertions were passing for the wrong reason.

## The chart stops turning navy into grey, and the finished card says Final/OT — 2026-09-07

Lifting a chart colour by mixing toward white desaturates it, so five teams' navies came out as three greys; scaling the channels by a common factor preserves the hue. The finished card takes ESPN's own `Final/OT`, `Final/10` and `Final/SO` suffix as a token, and the wrap gets an Ended row derived from `gameInfo.gameDuration`. Team-coloured scores were built, rendered, and taken back out.

## A game that ends stops disappearing, and says how many people were there — 2026-09-07

With Keep finished games on, a final stays 24 hours past an estimated wrap — start plus `sportWrapAllowanceMs`, since ESPN publishes no completion timestamp anywhere — on a flat card with no PowerScore, clock or tab dropdown. `startTime` is now populated for every status rather than only `pre`, and attendance comes off the scoreboard payload the background already fetches, where it reads `0` until the game is final.

## A live game shows its box score, out of a response we were already fetching — 2026-09-07

The detail screen shows a line score, team comparison and one team's player tables at a time, parsed out of the `/summary` response the win-probability chart already requests — no new network calls. Columns are condensed to six and selected by ESPN's stable `keys`, never its display labels (`SOG` is shootout goals, `sacks` means opposite things in two categories), and team abbreviations are darkened until they clear 4.5:1 on the light card. 98 new locale keys across twelve files.

## The popup opens 590KB lighter and stops asking ESPN for what it already has — 2026-09-07

Registering the five echarts modules the option builders actually emit, instead of importing the barrel, takes the popup chunk from 1,711,274 to 1,106,134 bytes. Also: worker startup re-scores in memory rather than refetching all 31 leagues, the popup reads preferences in two round-trips instead of four, and two undeclared Geist weights (91KB) left the package.
