# Changelog

> One or two lines per entry: what changed, and the one thing about it worth knowing later.
> The code, the tests and the git history hold the rest. Do not write essays here.

## The popup opens on the matchup, and the bar that crosses it is what turns the tricode into the crest — 2026-09-15

From a Figma storyboard. Every card in the list arrives as the matchup poster it is underneath: the two team colours wipe in from the outer edges and meet on a leaning seam, the tricodes stand outlined over them, a white bar crosses each side, and the colour then retreats the way it came until all that is left is the 5px rails `buildGameCardStyle` draws anyway — which is the one thing worth keeping hold of here. The collapse lands on paint that is already identical, and each crest lands on the card's real crest slot, measured in a layout effect rather than derived, so the stage is simply removed at the end and nothing crossfades to cover a seam. The trade under the bar is a clip complement, not a dissolve: the crest layer and the lettering layer are clipped along one leaning edge from opposite sides, so every pixel shows exactly one of them and the edge is the bar rather than a line near it. Poster crests go through `TeamCrest` against the team colour, because these are the only crests in the product not drawn on white. One angle throughout (20.5°, as `--reveal-lean`, measured off each card's own height); one rate throughout (`--reveal-rate`), so the second open of the day is the same graphic at 0.8× rather than a shorter one. Two traps found on the way: two animations naming the same property means the later one wins outright and its backwards fill erases the earlier one before it plays a frame, so each element gets one keyframe set per property it moves; and a "has played" guard in the mode resolver has to be a memo rather than a guard, or StrictMode's doubled initialiser leaves the development build the only build that never animates. Capped at the first eight cards, which is cost rather than taste — a thirty-game Saturday is otherwise three hundred animated elements, none of them on screen. No new locale keys: the only text in it is ESPN's own tricode.

## A crest is judged where it is drawn, every time it is drawn — 2026-09-14

A pass over the colour and crest work that moves no threshold and changes no rendering. `TeamCrest` held its verdict as mount-time state, and both halves of a verdict move underneath a mounted instance — the guide's drawer reconciles one game's detail view into the next, and every hero mixes its backdrop out of the game's own colours — so the last team's answer drew the next team's crest, permanently, because a component showing a mono mark never reloads the artwork that would correct it. It is read out of the module caches on every render now, with a re-measure for a surface that moves without the image. A failure is no longer written down as a verdict: `getContext` returning null past Chrome's canvas ceiling used to persist "this crest reads fine" for the life of the profile. `minAlpha` joined the calibration string it should always have been in, the two ink shares walk the pixels once rather than twice, the tint is sampled only for the crests that draw a plate and on one document-wide canvas rather than two per crest, and the three copies of the sRGB luminance formula became `colorMath.ts`. Around the edges: the mono-mark fetch dedupes in flight, where two guide tabs opened together ran 62 `/teams` requests for 31 leagues; `monoLogoUrl` has one home in core instead of two; a team keeps its marks when its game goes from pre to live; and two crest fixtures that had never typechecked now do, which the everything command does not check.

## A crest stops losing its ends to the circle drawn around it — 2026-09-13

The sticky bar drew an 18px crest inside an 18px round clip, which took 25px of ink off the Giants' 'ny' every time that bar was on screen — a wordmark reaches the corners of its own box, and a circle drawn at the size of the mark shaves its ends. The end zone and midfield stencils did the same at 11 and 24px. The clip belongs to the plate, so it is gone wherever `is-bare` says nothing is painted underneath, and where a plate is drawn the crest is inset to three quarters of it: measured over 264 crests, the furthest ink reaches 65% of the way to its own corner, which is what Charlotte and the Royals need to land on the plate rather than be amputated by it. Only the plated case pays for it — 64→60px on the pre-game hero and 52→48 on the live one, for the minority of teams that fall back to one. The midfield stencil also went 10→13 yards, which is the NFL’s own 1200 sq ft cap and the largest that keeps the tallest crest in either league off the painted numbers; the spec that guards that gap now measures the lines the numerals are anchored to rather than their em boxes, which reach two yards past the last painted pixel.

## The crest on the 50 is judged against the grass it is painted on — 2026-09-13

Same three-rung treatment the end zones and the detail hero take, against `turfColor` — which moved out of the stylesheet into `footballField.ts`, because the paint and the verdict reading a different hex is how the two would drift. It sits in a `foreignObject` rather than joining the end zone marks in the overlay above the SVG: the ball and both live lines cross the 50 and belong over the paint. The 0.72 fade stays and is not part of the check — it is weathering, and a crest that survives the check at full strength survives it at 72%.

## Both end zones are lettered with the crest and nickname of the team that defends them — 2026-09-13

Replaces the rotated abbreviation. The nickname is ESPN's own `team.name`, carried as `Team.nickname` rather than sliced off the end of `displayName`, which would turn the Nittany Lions into the Lions. The marks are HTML over the SVG, not more of it, because the crest is the same `TeamCrest` the detail hero draws and that measures its own pixels against the surface — here the raw end zone colour, unscrimmed. `writing-mode` rather than a rotation, so the lettering truncates against the end zone's real depth: 60px of the 77, against 55 for "COMMANDERS" and 58 for "MOUNTAINEERS". The fifteen-letter college names ("THUNDERING HERD") need 70 and fit at no legible size, so they truncate rather than dragging the type smaller for everybody else — caps at 7.5px because caps have no descenders and one height, and read where the mixed case they replaced would not.

## A team shown in its own second colour keeps its crest, and the detail heroes draw it bigger — 2026-09-13

USC's cardinal on USC's gold is 2.6:1 and the Athletics' green on their gold is 3.7:1 — both plainly legible large letterforms, both thrown away for a black mark, because `strongInkReachShare` asked for 60% of what the surface could reach and a club picks its two colours to be told apart rather than to clear a text bar. It is 35%, which moves 19 team-and-surface pairs and **only on team-colour heroes**: a guide bar reaches 15.2:1 and the popup 18.9:1, so both still hold the full 4.5 and no verdict there moves. `pickMonoMark` now takes the flat floor instead of the capped one — a crest a club published is judged against the backdrop it was drawn for, but a substitute we pick has to earn 4.5:1 when the tinted disc is always available. The one team that comes along and shouldn't is Houston on their own red, where the white mark was better. Crests on the detail heroes go 44→64px (pre-game) and 36→52px (live and final), picked by rendering four candidates side by side at the real 320px shell with the longest names in the product: nothing overflows at any of them, so the thing that decides it is the gap left to the score, which runs 18/15/13/10px.

## The Marlins keep their own colours, because a share is an area and an outline is not — 2026-09-13

Miami drew as a white monochrome mark on the guide: their crest is a black M with a thin blue-and-pink stroke, and a tenth of the ink is more area than any outline has — measured in Chrome over 124 crests on four surfaces each, the crests with genuinely nothing in them sit at 0.0–0.4%, so the strong share is 4%. `deadInkFloor` goes to 1.3 because 1.5 called black-on-a-guide-bar absent at 1.37:1 when it is the letterform you read, while the same ink on the Rockies' own purple is 1.21:1 and is a hole — which is what keeps their CR monochrome on the hero. No contrast floor could have done this: Baltimore's orange on a bar is 3.77:1 and the Rangers' brightest navy on their own navy is 3.73:1. The persisted verdicts carry the thresholds they were reached under — joined into a string from the constants themselves, not a number somebody has to remember to raise, which was tried first and left behind within two commits while stale answers went on being served.

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
