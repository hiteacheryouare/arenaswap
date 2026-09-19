# Changelog

> **Two or three sentences per entry. No sub-headings, no tables, no coverage sections.**
> Say what changed and the one thing about it worth knowing later — the code, the tests and the
> git history hold everything else. An entry that wants more than that wants an issue or a source
> comment instead. Do not match the length of whatever you see below; match this rule.

## The popup header pins, and the wordmark folds into the favicon — 2026-09-19

Scrolling the game list past 40px sticks the header to the top and plays a 450ms collapse into the icon: the `a` slides left along its row with the arrow's tail pinned off its shoulder, the dot sweeps left through `wap` to close up behind the `s`, and the two surviving letters are on screen for every frame of it rather than being covered and brought back. The last frame is `icon_white_on_transparent.svg` itself — the two files share their letterforms, so those travel under a transform, while the icon's wider arrowhead and lighter chevron are reached by lerping matched point rings that `npm run ui:wordmark-shapes` bakes out of both SVGs. The bar condenses solid and ~19px shorter, and suppresses scroll anchoring while it does, because handing those 19px back to `scrollTop` is enough to drop the list under the threshold and flutter the header open and shut.

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
