# Changelog

## A tab stops being ArenaSwap's the moment its game is over — 2026-09-12

Watch a full Saturday and you end up with a dozen tabs on games that finished hours ago, every one
of them still registered, still muted, and still counted as somewhere the switcher could send you.
A new Display setting decides what becomes of a registered tab once its game wraps: **leave it
alone**, **free it from ArenaSwap**, or **close it**. Off by default, so nobody's tabs change
behaviour on update.

### Freeing and closing are one code path with one flag

Freeing drops the registration and lets the existing mute sync hand the tab back unmuted; closing
does that and then calls `tabs.remove`. The registration goes in both cases, which is what makes
a failed `tabs.remove` degrade into a free rather than leaving a tab half-managed — registered to
a game that will never be scored again.

A freed tab is immediately eligible for tab suggestions again, because `suggestTabAssignments`
filters on the registry. That is not a feature that had to be built; it is what falls out of
releasing the tab rather than marking it as spent.

### Absence is not the same as final, and ESPN has already proved it

With **Keep finished games** off — the default — a finished game does not merely change status, it
leaves the payload entirely, so the obvious implementation is to treat a registered game going
missing as a game that ended.

That is wrong, and the entry three above this one is the proof: college football's dateless
scoreboard was serving a curated 24 events out of a week of well over a hundred, and it dropped two
games that were **live at that moment**. A rule that read absence as an ending would have closed
both of those tabs mid-game.

So the poll asks for finals whenever the setting is on, whatever the display preference says, and
the finished games are dropped again on the way into `games`. `includeFinal` is a client-side
filter on the live poll rather than a different request — same URL, same bytes — so seeing the
whistle costs nothing. Nothing reaches the tab logic that ESPN has not called `post`.

The split has its own pair of tests: that the fetch asks for finals with Keep finished games off,
and that the finished game still never reaches the popup's list.

### Three things it will not do

**The tab you are looking at.** Being pulled out of a postgame you are watching is worse than the
clutter. The active tab is skipped and comes back round on the next poll, which has a test for each
half — that it is spared, and that it is taken once you move away.

**A window's last tab.** `tabs.remove` on it takes the window with it, and on a single-window
browser that is the browser. Those degrade to being freed, so the setting is honoured everywhere it
can be and nothing ever closes a window nobody asked to close.

**Anything at all in demo mode.** Demo games reach `post` on a script while the tabs registered to
them are real, and `mock-20` ships already final — so the first poll after switching the demo on
would have closed a real tab for a game nobody played. The demo branch reports its finished games
exactly the way a real poll does and the exclusion lives in one place, which is what makes it
testable: written the other way the guard was unreachable, and the test for it passed with the
guard deleted.

### The toast comes on the next open, and accumulates until it does

There is no prompt. The background does the work while the popup is shut and leaves a count in
session storage; the popup reads it on open, raises a toast and clears it, because it is news
rather than state.

Freed and closed are counted **separately** rather than as one number and an action, since the
setting can change between two polls and a session can genuinely have done both. And the count
adds to whatever is already waiting instead of replacing it — a second wave of finals before the
popup opens must not erase the first.

### Strings

Nine keys across all twelve locales: six on the setting, one keyword list, and two plural toasts.

`free` is the one that does not survive a literal translation — it means released from ArenaSwap's
control, not free of charge — so each language took its own release verb rather than the English
word: German `freigeben`, European Portuguese `libertar` against Brazilian `liberar`, Korean
`해제` reused from the favourite-team register/unregister pair, which is the same idea. The four CJK
locales label the setting as a noun phrase (`試合終了時の動作`) rather than the English clause,
matching how those files already write every other setting label.

### Coverage

21 unit tests on the resolver and the notice, 12 on the background, and 15 in a browser — 10
component and 5 end-to-end.

The component ones include a width measurement that a rendered-box check could not make: a native
`select` clips rather than wraps, so an option that does not fit is silently truncated to an
ellipsis. All three options are measured against the select's content box in all twelve locales,
off a ruler carrying the select's own resolved font. Confirmed failing against a deliberately
overlong English string.

Every rule was checked by breaking it: dropping the active-tab exclusion, dropping the sole-tab
guard, dropping the keep short-circuit, putting the fetch back to `keepFinalGames`, letting finals
through into the popup list, forgetting the window layout, and removing the demo guard. Each broke
a different test.

Two things about the harness are worth recording. `background.test.ts` had **mixed line endings**
— part LF, part CRLF — which silently swallowed three of five scripted edits to it while reporting
success, and `git diff` shows nothing either way. And the new tests step forward until a poll
actually lands rather than advancing a fixed interval: the league drops to the dormant beat the
moment its only game is over, so the delay that carried the first poll is nowhere near the second.

## The Guide opens on today rather than on the day before yesterday — 2026-09-12

Opening the guide landed on a past day. The pager said the right thing about whatever day it was
showing, so nothing looked broken — it was just the wrong day, and the games on it had all finished.

`buildUpcomingDatesRangeQuery` takes a `pastDays`, and `fetchLeagueGames` passes **2** whenever
finals are asked for. The guide asks for finals on every fetch, because finished games stay on the
timeline dimmed so the day keeps its shape. So the slate legitimately reaches two local days back,
the day list is built from the slate, and the selection fell back to index 0 — the oldest group.

The entry below is where that was introduced: the day list arrived with the pager, and index 0 was
today right up until finals widened the window behind it.

### Today, and only failing to today

`defaultDayKey` resolves the opening day rather than taking the first group. Today when today has
games; otherwise the next day that has any, so a guide opened on a dead Tuesday shows what is coming
rather than what has been; and only if every day is in the past does it fall back — to the **most
recent** of them, not the oldest.

It is a pure function taking the day list and the instant, which is what makes the four cases above
testable without a browser.

### The past days stay on the pager

Filtering them out would have been the shorter fix and it is wrong. A game that kicked off at 11pm
yesterday and is still running belongs to yesterday by start date, and dropping that day would make a
live game disappear from the guide entirely — the one thing this product must never do.

So the back arrow is enabled when the guide opens, and it goes to yesterday's results. That is
honest: there is a yesterday, and it has something on it.

### Coverage

Five unit tests on `defaultDayKey`: today among past days, today alone, nothing on today, everything
in the past, and an empty slate. Three of them fail against the old behaviour of taking the first
group, which is the mutation they were written against.

The page was also driven headlessly with two days of finals behind today on the fixture — the shape
the range query actually returns — and opens on **Today** with nine bars, with both arrows live.

One process note: this slipped through a root-level `oxlint` invocation that the workspace's own
`npm run lint` catches. The repo's lint task is the one that counts.

## The Guide pages into the week, and follows the Up Next setting to do it — 2026-09-11

The guide showed today and nothing else, which made a timeline of a slate you could already see. It
now spans as many days ahead as Up Next is set to and pages through them a day at a time.

### A day on screen, not a week

A continuous axis across the whole window was the obvious reading of "scroll right to see the
future", and it does not survive contact with the row model. Rows are one per game, and the default
window is **seven days** — so the canvas would be about 21,000px wide and scrolling past today would
leave today's twenty-five rows as empty bands stretching into next week. A guide whose rows are
mostly blank is a Gantt chart of nothing.

So the axis stays a day wide and clamped to that day's games, and the future is reached with the
pager rather than with the scrollbar. Horizontal scrolling still does what it did: move through the
hours of the day you are on. Every row on screen has a game on it, which is the property that makes
the grid worth reading.

### It reuses the pager Up Next already has

`UpcomingDayPager`, `groupByDate` and `resolveSelectedDayIndex` are all already exported, and
`date.today`, `date.tomorrow` and the pager's three aria strings are already in all twelve locale
files. **This change adds no locale keys at all.** It also means the guide and Up Next label the same
day with the same words, which is the point of reusing it rather than writing a second one.

The selected day is held as a **date key rather than an index**, which `resolveSelectedDayIndex`'s
own comment explains and which matters more here than in the popup: the guide refetches on every
`SCORES_UPDATED`, so games kick off and leave the list under you. An index would silently land you on
a different date than the one you navigated to.

The day list is built from the games rather than from a date range, so the pager can never step onto
a day with nothing on it.

### The window follows the preference, with a floor

`upcomingDays` on the guide's fetch is `Math.max(prefs.upcomingGamesDays, guideMinUpcomingDays)`.
Following the setting is what keeps the two surfaces agreeing about how far ahead the product looks.
The floor is 3, and it exists because the guide's whole point is having somewhere to page to — at a
setting of 1 there is no future, and the feature reduces to what it was before.

That is the one place the guide deliberately disagrees with the preference, and it only ever
disagrees upward.

### Today is the only day with a now line

`now` is nullable on the grid now and null on every other day. A line labelled as the present moment
sitting in the middle of next Tuesday is worse than no line at all.

Paging also repositions the scroller: a future day opens at its own first game rather than wherever
today happened to leave it, and paging **back** to today returns to the current moment rather than to
breakfast. Both happen in the click handler rather than in an effect watching the day — which is
where the behaviour belongs, and is what the effect-dependency lint was pointing at.

### The first hour label was half off the screen

The axis opens on a whole hour, so the first ruler mark sits at x=0, and centring it on its own
position cut the left half of `12:00 PM` off the edge. It was there from the first render and only
became obvious on a day whose axis starts at noon.

### Coverage

531 extension unit tests and 567 component tests, up from 529 and 565.

Two on the fetch window — that it asks for nine days when Up Next says nine, and that it still
reaches `guideMinUpcomingDays` when Up Next says one. The second asserts the floor is above 1 as well
as being applied, since a floor of 1 would satisfy the first half while doing nothing.

Two on the grid: that no now line is drawn when the day is not today — paired with the positive case,
because an absence test is worth nothing until the selector is shown to match something — and that
the first hour label opens fully inside the canvas.

Both fetch tests were confirmed failing against the window pinned back to one day, and the floor test
against the floor removed.

The page was driven headlessly through a real page turn: Today with nine bars and the previous arrow
disabled, then Tomorrow with three bars, no now line, its own league groups and the scroller back at
the left edge.

## A live college football game stops being missing because ESPN did not feature it — 2026-09-11

BC/Rutgers and Richmond/NC State were both in progress and neither was in the extension. ESPN was
serving both the whole time.

### The dateless scoreboard is a curated week, not a day

Every other league's dateless scoreboard carries the current Eastern day, which is the assumption
the live poll has always been built on. College football does not work that way: it files by week,
and it trims that week to a featured set. Measured on the afternoon this was found, three identical
requests came back with **24 events** against a week that has well over a hundred, and the trimming
is editorial rather than chronological — it kept three live games and dropped two others that were
on at that moment.

`limit` does not widen it. `limit=1000` came back with fewer events than no `limit` at all, and the
parameter is unreliable enough elsewhere that it is not worth leaning on: on one dated query
`limit=25` returned 50 rows, `limit=50` returned 80, and `limit=1000` returned 25.

Asking for the days by name is what returns the full card. The same slate that gave 24 dateless
gives 86 dated, with all five live games in it rather than three.

### The window is every league's, not college football's

A league-specific branch would fix the reported games and leave the same trap set for whatever ESPN
decides to feature next. Nothing in the product ever wanted a curated set, so the live poll now
names its window in every league. For the leagues whose dateless response was already a full day,
the request returns the same games it always did.

**It reaches back a day.** ESPN files a game under its Eastern start date, so an 11pm kickoff is
still filed under yesterday while it is on screen after Eastern midnight — which the dateless board
drops at the rollover. `days: 0` ends the window at the end of today, the last day a live game can
have started.

### Why the game vanished at kickoff rather than never appearing

Worth recording, because the symptom points at the wrong half of the system. `refreshSlate` keeps
`status === 'pre'` games only, so a scheduled game reaches the popup through the slate fetch, which
is a dated range and has always seen the whole card. The moment it kicks off it is no longer `pre`,
it leaves `upcomingGames`, and the only thing that can carry it is `tickLeague` — which fetches with
`includeUpcoming: false` and therefore hit the bare dateless URL. So the game was visible right up
until it became worth watching.

### Coverage

No new assertions, because there is no new unit: the subject is which URL the poll asks for, and the
bar is that every existing test still describes the request it means to.

Six of them did not, and the way they broke is the part worth keeping. All six told the live poll
and the slate poll apart by `url.includes('dates=')`, which was a true statement about the old code
and is now true of both requests. Three failed outright. **One passed for the wrong reason** — both
branches of its mock matched, so it served the slate payload to both requests and still asserted the
right games. They route on the window each request names now, so neither can be picked up by
accident.

Two of the three failures were the test harness rather than the change. `openingDate` read the
window after `jest.useRealTimers()`, which resolves it against a different day than the pinned clock
the request was built under. And the Tokyo case read it after a second `loadApiClient()` call —
`jest.resetModules()` empties the fetch mock's recorded calls, so the assertion was filtering an
empty list. Both read the window while the clock is still pinned.

457 core unit tests, 5 core e2e, 32 extension end-to-end and 46 docs end-to-end pass, across `lint`,
`test` and `test:e2e`, 11 turbo tasks, zero lint warnings.

The fix was then confirmed against live ESPN rather than against a fixture: the window the shipped
code builds returns 86 events including both games, and the request it replaces returns 24 including
neither.

### What this does not fix

A dated college football Saturday is **capped at about 80 events**, and that Saturday's full card is
125 — the union of `groups=80` and `groups=81` carries 45 games the plain dated query does not. Every
live game in the reported case is inside the 80, and closing the rest means splitting college
football's poll into one request per division, which is a second request on the busiest slate of the
week and belongs in its own change.

## The Guide stops looking like a wireframe of itself — 2026-09-11

A polish pass over the entry below, against the rendered page rather than the source. Most of it is
things the guide had no business being without, and two are decisions from the first pass that were
simply wrong.

### Team colour came back off the bars, and should not have

"Do not tint the bars for favourites, and drop the live green" was read one step too far, and the
team-colour hairlines went with it. They are not a status tint — they are which two teams this is,
and without them a slate is a field of identical grey rectangles.

They are back as two 3px rails at the ends of the bar rather than as a fill, because at 22px tall a
filled bar is a colour swatch you cannot read a matchup off. The pair is resolved through
`resolveTeamColorPair` with lightening **on**, unlike the game card, which passes it off: the card is
a white plate and the guide is `#0d1117`, and half the league's primaries are navies that come
nowhere near 3:1 against it. The climb scales the channels rather than mixing toward white, so a blue
is still a blue at the end of it.

What stays flat is what was actually asked for: no status fill and no favourite fill. Every bar is
the same `#21262d` whether it is live, scheduled or one of yours.

### The crests were silhouettes

Straight on `#0d1117`, which is the exact problem `CrestDisc` already exists for — a Cowboys star or
a Yankees monogram is navy on near-black, so the row showed an empty box beside an abbreviation doing
all the work. The changelog records solving this once already for the tab-match list and explicitly
leaving other surfaces for later. This is later.

Both team crests and the league mark now sit on the tinted white disc, sampled out of the crest
itself. The league mark needed it as much as the teams did: the NHL shield is black.

### The grid stopped halfway down the screen

`.guide-canvas` was only as tall as the games on it, so on a quiet evening the hour lines, the band
and the now line all ended in mid-air with a screen of empty background under them — which reads as a
rendering fault rather than as a quiet night. The scroller is a flex container and the canvas
stretches to it, so the grid is the surface of the tab at any slate size.

### The drawer was covering the header it sits under

It was `position: fixed`, which put it over the top-right of the page — including the band toggle and
the end of the summary line. Opening a game hid the control that changes the thing you opened it to
look at.

It is a flex sibling of the grid now, so the two share the row under the header and nothing can be
occluded. Its basis is `calc(320px + 1px)` rather than `320px`, because `box-sizing` is `border-box`
here and the left rule would otherwise come out of the detail screen's own width — which is a hard
320 by design. That is a test rather than a comment: the first version of it measured 319.

**And it fills the height.** `.popup-container` is `320x560`; the width is what the detail screen is
laid out against and is kept, but 560 is the popup's frame rather than anything about the content,
and in a browser tab it left a band of empty surface under the detail.

**It slides.** 0.22s in on a decelerating curve, 0.18s out on an accelerating one — a different
keyframe rather than the entry reversed, with `forwards` so the panel stays off screen for the frame
between the animation ending and React unmounting it. The panel is kept mounted through the exit and
dropped on `animationend`.

Under `prefers-reduced-motion` the animation is off rather than instant, and the close path checks
the same query directly — with no animation there is no `animationend` to wait for, and a drawer
whose only exit is an event that never fires is a drawer that never closes.

### The band label was being sliced into a fragment

Anchored to the left edge of a band it is four times wider than, so any horizontal scroll past it
left `4 games` floating at the top of the screen with nothing saying what it counted. Making it
sticky does not help — sticky clamps to the containing block, and the label is wider than the band.

So it is not on the grid at all. It is a sentence about the whole day rather than a property of a
position on it, and it reads in the header beside the toggle that controls it, where no scroll
position can cut it. The band on the grid is now purely the visual marker, and `aria-hidden`, since
the header line says the same thing in words.

### The rest of the pass

**Row hairlines.** At ten-plus rows a guide without them is a field of floating rectangles and the
eye cannot carry a time across the grid. With a hover tint on the row and a lift, a shadow and a
border change on the bar.

**A focus ring on the bars,** separate from the hover lift, which a keyboard user cannot read as
position. Offset outward so it never lands on the team rails.

**Escape closes the drawer**, which is what every panel over a page does and was the only way out
that did not need the mouse.

**The league headings take the popup's own treatment** — 0.75rem at 0.03em in `#8b949e`, which is
what `.popup-section-label` is. A guide that sets its league marks differently from the popup reads
as a different product. They also fade out to the right rather than ending on a hard edge, so the
sticky label rides along the grid instead of sitting on top of it.

**The now line is 2px.** At 1px, orange over a gridline of nearly the same lightness disappears, and
the whole point of that line is being findable without looking for it.

**A tick under each hour label,** so the hour lands on a mark rather than on the middle of a word.

**The empty state takes the popup's own orange plate**, and the loading state deliberately does not —
dressing a wait up as an outcome is how a slow network reads as "nothing on today". They were one
line with a ternary in it; they are two states now.

**The tab has a title and the page has a heading.** `Guide · ArenaSwap`, built from
`main.guideButton` rather than a thirteenth locale key that would have said the same word, and not
from `extName`, which is the full store listing name. The heading is `visually-hidden` — the page had
a wordmark and nothing for a screen reader to announce it by.

### Coverage

565 component tests, up from 556. The new ones are the things this pass fixed: that each team colour
lands as a rail at its own end of the bar, that a navy is lifted off the background rather than drawn
raw, that every crest sits on a light disc, that the rows are ruled off, and five on the drawer —
width, height, both animations, and reduced motion.

The rail and disc assertions run against a fixture of **two navies on purpose**. A pair of
already-bright colours would satisfy a contrast assertion without ever exercising the climb that
exists for them.

Each was confirmed failing against a mutation: drawing the rails raw, removing the row hairlines,
putting the drawer back to the 560px popup frame, and removing the open animation.

Two things worth recording about the specs themselves. The first version of the grid spec measured a
grid **with no stylesheet loaded** — the guide's layout is entirely CSS, so every box reported zero
and four assertions failed for reasons that had nothing to do with the code; `component.ts` loads
`guide.scss` now. And the drawer spec had no imports at all, which compiles its JSX to a `require()`
call and fails the file before any test runs; it imports the stylesheet it is about.

The reduced-motion test sets Chrome's media emulation **before** mounting rather than after. Flipping
it afterwards does not reliably re-resolve an animation that was applied at mount, which is how the
first version of it failed.

The page was driven headlessly at 1400px and at 980px: 18 crest discs, 3 league discs, nine bars each
with a distinct pair of rails, one fill colour across all of them, row hairlines present, the body
filling the scroller, and the drawer at a true 320px of content over the full height.

## Today's slate gets a timeline, and the best window comes out of arithmetic — 2026-09-11

The popup answers "what should I watch **right now**" well. It answers "what should I watch later
today" with Up Next, which is a flat list of kickoff times with no shape to it — you cannot see that
six games overlap at four o'clock, that your two teams play back to back, or that seven o'clock is
dead.

The Guide is a full browser tab where every game on today's card is a bar starting at its published
start time and running for that league's typical broadcast length, grouped under league headings,
with a band across the grid marking when the most is actually happening. A calendar button in the
popup header opens it.

### The button goes left of the help mark, and that is not a style choice

`settingsCog.cy.tsx` identified the cog three times as `.popup-settings-button` `.last()`, which
worked only because the cog was the second of two. A third button appended after it would have
silently repointed those three assertions at the calendar — including "stays inert on a header that
is only being shown", which would then have been asserting the inertness of a different control
while continuing to pass.

Putting the calendar first keeps `.last()` meaning the cog. The three selectors are addressed
through `.bi-gear-fill` now anyway, because an ordinal selector that means the right thing by
accident is worth removing while adding the thing that makes it ambiguous.

`onOpenGuide` is **optional** and the button is absent without it. The website renders this same
header twice as a picture of the popup and has no guide to open, so there is nothing there for a
third control to do — which is also why no `apps/docs` locale key was needed. The prop repeats all
three parts of the `interactive={false}` contract: `disabled`, `tabIndex={-1}`, and sitting inside
the `aria-hidden` cluster. The gear's quarter-turn is hung on `.bi-gear-fill` rather than the shared
`.popup-settings-icon`, so a calendar inherits none of it.

### Bar length is a new per-league table, and `sportWrapAllowanceMs` is not it

`packages/core`'s six per-sport durations exist to decide whether a finished game is still worth
keeping for another hour, and their own comment says they are deliberately generous because
over-estimating is the harmless direction there. On a guide it is not: a long bar overstates
concurrency and drags the band with it. Keyed on sport, the NBA and FIBA basketball draw identical
bars across a real 32-minute gap.

So `LeagueConfig` gains a required `runMinutes` beside `periodDurationSecs`, which is the same kind
of league fact. Required rather than optional, because a league with no duration cannot be drawn and
an optional field with a silent sport-average fallback recreates exactly the two-sources-of-truth
problem this avoids. `sportWrapAllowanceMs` is untouched and keeps doing retention.

`bar` is roughly p75. The failure modes are asymmetric: a bar that ends while the game is still on is
the one thing a TV guide must never do, and a slightly long bar only overstates concurrency a little.
`p25` and `p99` bound the occupancy taper.

**Two values would be wrong from memory.** NCAA football lost about 24 minutes to the 2023 clock
rules and is no longer far longer than the NFL; MLB lost about 25 to the 2023 pitch clock.

**Three are soft and say so in the source.** `wbbc` is the softest number in the table — 2026 is the
first World Baseball Classic with a pitch clock, so there is no measured precedent to read it off.
`olybb` has been played in one of the last five Games. `olymih` assumes IIHF-like commercial load,
and Milan 2026 has NHL players and a US broadcast.

**And one was simply wrong.** `olybb` is Olympic Men's *Baseball*. The design mockup had it at 110
minutes sitting in the basketball block — a bar ending in the sixth inning — because the id reads
like an abbreviation for basketball and is not one. The 110 belongs to `olybkm`/`olybkw`. The table
has its own test that every league's `p25 <= bar <= p99` and that no baseball league is under two
hours, which is the assertion that would have caught it.

Four competitions carry a second `knockoutRunMinutes`, selected by the game's existing
`isPostseason` flag: the two World Cups and both Olympic soccer tournaments, where a single match
reaches extra time often enough to move p75. The UEFA competitions deliberately do **not** have one —
only a second leg can reach extra time, which is about 5% of matches, and that belongs in p99 rather
than in the drawn bar.

### A live game's bar is extended rather than predicted

Once `status === 'in'`, the bar ends at `max(estimate, now + 10 minutes)`. One rule covers a double
overtime, a rain delay and a knockout going to penalties without any per-sport extrapolation, and it
is always wrong in the safe direction. With no live colour on a bar, crossing the now line is the
only thing saying a game is still on — so a bar ending behind that line would be the one genuinely
broken state.

### The best window is leverage-weighted concurrency, and that changes the answer

`heat(t)` sums, over every game, the probability it is still running times how much of the good part
of it is happening times a favourite weight. Occupancy is flat to `p25` then smoothsteps to `p99`;
summing survival probabilities rather than thresholding on the drawn bar is what gives a curve
instead of a staircase that drops by nine the moment the one o'clock window nominally ends.

Leverage is a piecewise-linear per-sport curve over the fraction of the bar elapsed, and it is what
makes late afternoon beat 1:05pm — nine games in the fourth quarter beats nine games in the first.
Measured on a fixture NFL Sunday, the weighted peak and the moment the most bars overlap are 35
minutes and about 1.7× apart, which is the whole reason the weighting exists.

**Dead zones sit at a hard zero rather than at a low point on a smooth ramp.** Nearly a quarter of a
hockey broadcast is intermission, and a curve that smooths through that is lying about a fifth of the
game. College men's basketball is the one league that does not resolve to its sport's curve: it plays
halves, so there is no fourth quarter to ramp from.

**The band is never narrower than half an hour.** The first rendered slate produced a ten-minute
band, which is arithmetic precision the inputs cannot support — bar lengths are p75 estimates with
tens of minutes of spread in them, and a ten-minute band reads as "be watching at 3:55" when what is
true is "late afternoon is the good part". A sharp peak is exactly what a sparse evening produces, so
this is the common case rather than an edge one.

**No per-bar leverage smear.** Before a game starts that curve is identical for every game in a
league, so every NBA bar would carry the same wash on its right quarter — decoration rather than
information.

### The guide fetches its own slate

`refreshSlate` discards scheduled games when Up Next is off and finals when Keep finished games is
off, and `tickLeague` evicts anything extra from `games` within one poll. The guide shows the whole
day regardless, so it asks for it: a new `GET_GUIDE_SLATE` message that calls the same fetch with
both gates bypassed.

It deliberately does **not** widen `games`. `afterFetch` scores off `games.filter(status === 'in')`,
and the switch target, the debug counts and the popup's own list read that same array — extra entries
would change which game the extension switches to. That has its own test, driving the real message
and then asserting the debug counts did not move.

### Every bar is the same grey

No live colour, no favourite tint, no per-status fill. A green "live" bar and an orange "favourite"
bar are two unrelated legends the reader has to learn before the grid means anything, and the two
facts are already carried better elsewhere: the now line crosses a live bar, and a favourite takes
the same star the game cards already draw. Finals stay on the timeline at 55% opacity, because a day
with holes where the afternoon was reads as broken rather than as finished.

Both of those are asserted off computed style rather than off class names, and each absence test is
paired with something that proves the selector matches — the favourite test also requires the star to
exist, or it would be comparing two identical bars and proving nothing.

### The matchup pins to the visible edge of the bar

Found by rendering rather than by reading. The guide opens scrolled to now, which puts most of the
afternoon off to the left, so a game that started earlier is the ordinary case. With the label at the
bar's own left edge, those rows showed the tail of a bar with the matchup scrolled out of sight — four
NFL rows reading `PHI`, `EN`, `NYJ` and `HI`.

The content is `position: sticky` inside the bar now, the way a TV guide pins a programme title. The
bar is `overflow: clip` rather than `hidden` for it: `hidden` would make the bar its own scroll
container, and sticky resolves against the nearest one, which has to be the grid's scroller for the
pinning to follow the horizontal scroll. Sticky is bounded by its containing block, so the label
stops at the bar's right edge instead of being dragged past it — which has its own test, because that
is the failure the fix could have introduced.

### The grid is CSS, not echarts

The design carried a popup teaser strip with a heat sparkline, and dropping it took the only thing
that wanted a chart library. `gameDetailChart` registers exactly five echarts modules and this
changelog records that trimming to those saved 590KB; a Gantt would have needed `CustomChart` and
`MarkAreaComponent` on top. Absolutely-positioned bars on a fixed scale are lighter and keep every
bar wide enough to read a matchup off — the shortest bar in the whole table is 108 minutes, which is
227px, and that is why no narrow-bar variant exists.

The scale is fixed and the grid scrolls rather than fitting the day to the viewport. A whole NFL
Sunday squeezed into 1280px puts a two-hour match at 115px, which holds neither crest.

### No new preference

The band toggle is page-local state. It is the only thing on the guide that can be switched off, it
is switched off from the guide, and a preference for it would have meant a `settingsEntries`
registration, a `setupView` row, two more keys across twelve files, and four test fixtures that
assert the whole `UserPreferences` object with `toEqual`. None of that buys anything a checkbox on
the page does not.

### Strings

Eight keys across all twelve locales: the header button and a new `guide` namespace.

`guide.at` is the separator between two teams, and the English `@` is a US convention rather than a
universal one. It was checked against each language's own sports coverage rather than guessed:
German, French, Italian and European Portuguese print a hyphen, Spanish `vs.`, the four CJK locales
and Filipino `vs`, and Brazilian Portuguese a lowercase `x`. `main.guideButton` takes each language's
actual TV-listings word — 番組表, 편성표, 节目表 — rather than a generic "guide", because that is what
the screen is.

The band label is assembled from the parts that are present rather than written inline with
separators between them. The first render produced `· 3:50 PM–4:00 PM ·` from two empty pieces, which
is what an inline separator does the moment a string is missing.

### Coverage

**66 unit tests** across the model and the geometry, and **20 component tests** across the header
button and the grid.

Every one that matters was confirmed failing against a mutation rather than trusted: flattening the
leverage curve to raw concurrency (5 fail), removing the live-bar floor, removing the band's minimum
width, putting `olybb` back to its wrong basketball length, making the guide slate respect the
display preferences again, unpinning the bar content, and recolouring finals instead of dimming them.
Each broke a different test, which is what says they are measuring different things.

The band test pins the **distance** between the weighted peak and the raw-count peak rather than only
the answer, because a test that cannot tell those two apart is not measuring the feature.

Two things the first version of the grid spec got wrong, both worth recording. It measured a grid
with no stylesheet loaded — the guide's layout is entirely CSS, so every box reported zero and four
assertions failed for a reason that had nothing to do with the code; `cypress/support/component.ts`
loads `guide.scss` now. And the two pinning tests mounted a single bar at 1280px, where nothing
overflows and `cy.scrollTo` refuses to scroll; they run at 400px, where the bar is genuinely wider
than its scroller.

The page was also driven headlessly against the real build with a stubbed background: 9 bars, 3
league groups, two crests on every bar, every bar 22px, **one distinct fill colour across all of
them**, no label overflow, fonts loaded and a clean console.

529 extension unit tests, 556 component tests, 462 core, 147 powerscore, 112 ui and 78 end-to-end
pass, across `lint`, `test`, `test:e2e`, all three builds and all three zips. `guide.html` ships in
all three browser zips and the guide source in the sources zip.

## The font warnings go quiet, and DM Sans stops shipping four copies of one file — 2026-09-11

`astro build` printed **13 unresolved-asset warnings**, one per font:

```
/arenaswap/fonts/DMSans-Regular.woff2 referenced in /arenaswap/fonts/DMSans-Regular.woff2
didn't resolve at build time, it will remain unchanged to be resolved at runtime
```

Nine were harmless noise and four were covering for a real broken path. Both come from the same
misunderstanding about where the deployed base path belongs.

### `checkPublicFile` joins the URL onto publicDir verbatim

Vite's CSS url resolver tries `checkPublicFile` first, and that function does no base-stripping at
all — `path.join(publicDir, url)`. The site set `$font-base-url: '/arenaswap/fonts'` to match the
GitHub Pages base, so Vite went looking for `apps/docs/public/arenaswap/fonts/DMSans-Regular.woff2`,
found nothing, warned, and passed the string through untouched. It reached the browser correct
**by coincidence** — the hardcoded prefix happened to equal the base Vite would have added itself.

Written bare as `/fonts`, the file is found in publicDir and Vite prepends `base` on the way out.
The emitted declaration is byte-identical, `url(/arenaswap/fonts/DMSans-Regular.woff2)`, and the
warning is gone. The comment block in `packages/ui/src/_fonts.scss` said the opposite, which is how
the convention would have been reintroduced; it now says why the prefix has to be left off.

### The other four were a `@font-face` nobody could have downloaded

`global.scss` loaded `bootstrap-icons/font/bootstrap-icons.scss` without configuring it, so it kept
its default `$bootstrap-icons-font-dir: './fonts'` — relative to the built stylesheet at
`/arenaswap/_astro/global.HASH.css`, which is `/arenaswap/_astro/fonts/bootstrap-icons.woff2`. That
file has never existed.

Nothing broke, because `_site.scss` declared a **second** `@font-face` for the same family further
down and the later rule wins outright. So the site has been shipping one dead icon-font declaration
and one working one, and the working one was a repair for a default nobody had set. The extension
already set `$bootstrap-icons-font-dir: '/fonts'` in `apps/extension/assets/bootstrap.scss`, which is
what confirmed the intended shape.

The docs entry sets it the same way. The duplicate in `_site.scss` is **left in place** — both
declarations now resolve to the same two files, so removing it is a provable no-op rather than a fix,
and it is worth its own line. `_screenshot.scss` keeps its hand-written copy because it never loads
bootstrap-icons' stylesheet at all and that declaration is the only one those pages get.

### The fonts were never only loading on one machine

Worth recording, because the warning text invites exactly that fear and this machine has DM Sans,
DM Serif Text and Lekton installed locally.

It cannot happen. Nothing in `src` uses `local()` — every declaration is `url()` only — and a family
name defined by an `@font-face` resolves to that rule rather than to an installed font of the same
name. Verified rather than argued: the built `docs/` output was served and driven through headless
Chrome, and all nine font files answered **200** with every `FontFace` reporting `loaded`. Every
`url()` in the extension's compiled CSS was cross-checked against `.output/chrome-mv3/`, and all ten
resolve to a shipped file.

### DM Sans was one variable font copied four times

`DMSans-Regular`, `-Medium`, `-SemiBold` and `-Bold` were **byte-identical**, all four MD5
`7c87a648...`. Each was `DM Sans 9pt` carrying a `wght` axis from 100 to 1000 with a default instance
of 400. Both apps shipped all four, so **110.8 kB of every install was the same file twice over
again**.

They rendered correctly, which is the part worth knowing before assuming this was a visual bug. A
single `font-weight` descriptor on a variable font **pins** the axis to that value, so four
declarations against one file produce four real weights rather than one weight and three synthetic
smears. Measured in Chrome at 100px, against a family name chosen so no installed font could match
it and contaminate the result:

| descriptor | 400 | 500 | 600 | 700 |
| --- | --- | --- | --- | --- |
| four files | 721.703 | 734.734 | 751.047 | 763.266 |
| one file | 721.703 | 734.734 | 751.047 | 763.266 |

The 400→500 step is what settles that the axis is live rather than synthesized — synthetic bolding
never fires below 600 and could not produce it. So three files are deleted, `DMSans-Regular.woff2`
becomes `DMSans.woff2`, and the four `@font-face` rules all point at it. The table above is the
measurement that the swap is free: identical to the thousandth of a pixel on every weight.

**A single `font-weight: 100 1000` range would be the tidier shape and is deliberately not used.**
It would let the axis interpolate continuously instead of resolving to one of four pinned instances,
which is a rendering change rather than a packaging one — and this suite measures pixel geometry to
the tenth of a pixel. Four declarations keep the bytes and leave the glyphs alone.

The cost of that choice, stated plainly: **`font-weight: 800` and `900` are requested and not
declared**, so both still resolve to the 700 face against a font that goes to 1000. All five 900s are
in the Ludicrous Speed overlay and all fourteen 800s are in the throwaway store-screenshot routes.
Nothing in the shipped popup asks for a weight the declarations do not cover, which is why this is a
note rather than a fix.

### Coverage

Nothing was added to the suite. The subject is which path a build tool writes into a URL, and the
bar is that the emitted CSS did not move — which is measured directly rather than asserted.

Every `url()` in the compiled output was captured before and after. The nine DM Sans, Lekton, Geist
and DM Serif declarations are unchanged to the byte. The only difference anywhere is the two
bootstrap-icons entries moving from `./fonts/` to `/arenaswap/fonts/`, which is the broken path being
repaired.

`astro build` goes from 13 unresolved-asset warnings to **0**. The three `wxt build` targets were
already clean of them and still are; their one remaining warning is Rolldown's chunk-size notice,
which is unrelated.

The DM Sans consolidation is measured the same way — the four weights were rendered and their widths
compared against the four-file baseline before the duplicates were deleted, and all four match to the
thousandth of a pixel. All three store zips were opened and confirmed to carry one `fonts/DMSans.woff2`
at 36,932 bytes and no `-Regular`, `-Medium`, `-SemiBold` or `-Bold` beside it.

536 component tests, 32 extension end-to-end tests and 46 docs end-to-end tests pass, across `lint`,
`test`, `test:e2e`, all three builds and all three zips. Those component specs read computed styles
and measure text geometry, which is the coverage that matters most for a font swap.

## "Starts soon" comes out of the scoreboard face — 2026-09-11

A refinement pass over the popup, run against the rendered screens rather than the source. Most of
what it looked for is not there: the extension uses Lekton for the game clock, the period, the
down-and-distance line, the shootout score, team records and the pre-game start time, all of which
are scoreboard data, and the scores themselves are Geist rather than Lekton because DM Sans ships no
tabular figures at all. The debug panel is monospace top to bottom, which is what a developer
readout should be, and the Ludicrous Speed cockpit wears it as a costume.

One string was not data. `.gd-countdown-soon` holds `detail.startsSoon` — the words "Starts soon",
which the countdown falls back to once the clock runs out — and it was set in Lekton beside digits
that are set in Geist. It takes the body face now.

### Two things that looked like redundancy and were the fixture

Both came out of the e2e screenshots and neither is real, which is worth recording so the next person
reading those images does not chase them:

- The signal values rendered as `32.800000000000004` and the subtotal as `82.00000000000001`. That
  is `makeScore`'s `total * 0.4` in `cypress/support/fixtures.ts`; `scorer.ts` rounds every signal,
  boost and penalty it emits, so no real game can produce it.
- Each team's abbreviation appeared twice per card. The fixture carries no crest images, so
  `.crest-fallback` prints the abbreviation inside the empty circle — which is the fallback doing its
  job, above a `.team-abbreviation` that is the only copy a real card shows.

Dumping the element tree settled both in one pass. A screenshot of this popup is worth less than its
DOM, because at 320px a fallback and a duplicate look identical.

### A dead locale key, and a label set that could not agree on capitals

`detail.powerScoreLabel` was in all twelve locale files and rendered nowhere — the only reference to
it was the `structure.d.ts` WXT generates from the files themselves, which is how it survived. No
key in the popup is built dynamically in a way that could reach it: the three template-literal call
sites are `loading.m*` and `noGames.m*`, and every other indirect lookup goes through an explicit
map.

The breakdown card's seven boost and penalty labels were split four to three on capitalization —
`Game boost`, `Scoring opportunity`, `Postseason boost` and `Clock stall penalty` in sentence case
against `Volatility Boost`, `Volatility Penalty` and `Favorite Boost` in title case. The three moved
to sentence case, and **only in English**: German capitalizes the nouns by rule, the five Romance
locales were already sentence case throughout, Filipino is internally consistent in title case, and
the four CJK locales have no case to be inconsistent about. Checking that before editing is the
difference between fixing an inconsistency and inventing one in eleven other files.

### What was deliberately left

The `LIVE` label on a live card stays. It sits beside a pulsing dot inside a section already headed
Live Games, so the word is redundant to a sighted reader — but it is the only part of that state
that does not depend on colour, and the row it shares with the postseason round label is not tight
enough for the space to be worth buying.

`Game boost` still appears twice on the detail screen, once as a breakdown row and once as the card
with the input; `Signals total` still restates `Final PowerScore` when no boost or penalty is
non-zero; and the five boost rows still render at `0` on an ordinary game. Each is a real
redundancy and each is a decision about what the breakdown is for rather than a slip, so none is
smuggled in here.

### Coverage

One component test, which asserts the countdown fallback's resolved first family is DM Sans and that
`lekton` appears nowhere in its stack. It was confirmed failing with the declaration put back —
`expected 'Lekton' to equal 'DM Sans'` — so it measures the rule rather than agreeing with itself.

The first version of it compared the element's whole computed `fontFamily` against `body`'s and
failed for the wrong reason: **three DM Sans stacks coexist in this project**, and the element and
the body resolve to two different ones. `packages/ui/src/_bootstrap.scss` sets Bootstrap's
`$font-family-base` to `'DM Sans', system-ui, -apple-system, sans-serif`, while
`apps/extension/assets/global.scss` declares `'DM Sans', system-ui, sans-serif` at line 37 and
`'DM Sans', sans-serif` at 105 and 365. Nothing renders wrong, because DM Sans is bundled and always
the first family to resolve, so the fallbacks behind it are unreachable. Consolidating them is its
own change.

Three existing assertions in `powerScoreBreakdown.cy.tsx` hardcoded the old capitals and were
updated with the strings. 459 unit tests, 536 component tests and 32 end-to-end tests pass, and
`oxlint` and both `tsc` projects are clean.

## The test browser is Chrome, and Cypress is 16 — 2026-09-11

Every `cypress run` in the repo was launching the bundled Electron, and the run banner had started
saying what that costs:

```
Browser: Electron 146 (headless) (deprecated)
```

Cypress 16 deprecates its bundled Electron and a later major removes it, at which point an implicit
fallback to it fails the run outright. `defaultBrowser: 'chrome'` at the root of both
`cypress.config.ts` files is the whole fix — 535 component tests and 78 end-to-end tests pass on
Chrome 152 with the counts and the wall time unchanged.

### Config rather than a flag on each script

`--browser chrome` would have to go on four scripts — `test:component`, `test:e2e` twice, and
`cypress:open` — and `cypress open` is the one that matters, because a flag there is the one a person
running the interactive runner by hand will not have typed. `defaultBrowser` covers every entry
point, including a bare `npx cypress run`, from one line per app.

Chrome rather than Edge or Firefox, both of which are also installed here: it is the browser the
extension's primary build targets, so the component specs measure text in the engine that will
render it. It does mean the suite is now Chrome-only where it used to be Chrome-or-Electron, and the
Firefox gap the review notes already call out — a `dragstart` that never sets `dataTransfer` is
broken only in Firefox and green under 11 Cypress tests — is unchanged by this. Neither browser was
ever going to catch it.

### What else 16 broke, and how much of it this repo touches

Nine of the ten breaking changes are inert here, which is worth writing down so the next person does
not go looking:

| | this repo |
| --- | --- |
| `Cypress.env()` removed | no call sites |
| `cy.exec()` removed, `execTimeout` with it | no call sites |
| `cy.end()` removed | no call sites |
| `experimentalSourceRewriting` removed | never set |
| `experimentalMemoryManagement` → `manageBrowserMemory` | never set |
| `experimentalFastVisibility` → `visibilityStrategy` | never set; `'modern'` is the new default |
| CoffeeScript support removed | no `.coffee` files |
| cookie and storage queries now retry | no call sites |
| Vite 5, 6 and 7 dropped from component testing | on 8.2.2 already |
| native browser network on Chrome | **this one** |

`keystrokeDelay` dropping from 10ms to 0 is the one that looked like it should matter, since there
are 20 `cy.type()` calls and every one of them drives a React-controlled search box that filters as
it goes. All 20 pass untouched, because the specs assert on the filtered result through retrying
assertions rather than on a keystroke landing within a window.

### The native network is the part that could have bitten

Chrome, Chromium and Edge intercept test traffic on the browser's own network in 16 rather than
routing it through Cypress's proxy, which is what buys HTTP/2 and removes the six-connection
ceiling. Firefox, WebKit and Electron stay on the legacy path, so this is a difference the Electron
run could not have surfaced.

The e2e support file leans on `cy.intercept` for everything a spec would otherwise fetch off the
network: a 1x1 PNG for every crest on `a.espncdn.com`, a blanket stub for `site.api.espn.com`, and a
`/teams` handler that replies per league. Two things are gone under the new path —
`req.httpVersion` is no longer reported, and compression headers are absent from intercepted
responses. Nothing in the suite reads either, and all 32 extension specs stub and match the same way
they did.

`forceHttp1` exists to put every browser back on the legacy path during a migration, and it is
deprecated on arrival. It is not set. Reaching for it would mean shipping a flag that is scheduled
for removal in order to avoid a change that turned out to cost nothing.

### Node 20 and 25 are out

Cypress 16 wants Node 22.x, 24.x or 26.x. The root `engines.node` read `^20.17.0 || >=22.9.0`, which
both permitted a Node 20 that Cypress will now refuse and a Node 25 that went EOL in June. It reads
`^22.9.0 || ^24.0.0 || >=26.0.0`. The deploy workflow was already pinned to 26.

### Coverage

Nothing was added to the suite. There is no unit here to test — the subject is which binary the
runner launches, and the bar is that none of the 613 existing assertions moved.

That bar is measured against a **baseline on 16 with Electron still selected**, not against the
suite as it stood on 15. Running 16-on-Electron first is what separates the two things this change
does at once: a version bump that could have broken something on its own, and a browser swap.

| | Electron 146 | Chrome 152 |
| --- | --- | --- |
| component | 535 passing, 01:07 | 535 passing, 01:03 |
| `apps/extension` e2e | 32 passing, 00:12 | 32 passing, 00:11 |
| `apps/docs` e2e | 46 passing, 00:10 | 46 passing, 00:09 |

The component suite is the one that had the most to lose, because those specs read computed styles
and measure pixel geometry against budgets down to the tenth of a pixel, and Chrome 152 is six
Chromium majors ahead of what Electron 146 bundles. Not one measurement crossed a threshold.

Both `tsc -p cypress` projects and both apps' `tsc --noEmit` pass against 16's types. The three
`wxt build` targets and the Jest projects are deliberately not re-run: Cypress is in neither path,
and the working tree is not clean.

## A league with nothing on stops asking ESPN every three minutes — 2026-09-11

Polling had two states. Eager scales from 6 to 25 seconds off the best live PowerScore in the
league; dormant is a flat 2–3 minutes for a league with no live games. There is a third below that
now — **hebetudinous**, an extended dormant — and it is the one an offseason belongs in.

**Dormant cannot see past today.** An MLB league quiet in January with nothing for nine weeks looks
exactly like one quiet between games, because the only thing dormant asks is the dateless
scoreboard, which carries the current Eastern day and nothing else. So it polls at the same rate
either way, forever: at a 150-second average, **576 requests a day per league** to be told nothing
is happening.

### The state is cheap because of the question that precedes it

On the poll where a league crosses into quiet, it fires **one** ranged request for that league and
reads the next kickoff off it. One request buys the right to skip dozens, which is what makes the
whole thing cost less rather than more — and it is also the only way to answer the question at all,
since the payload dormant was polling has no tomorrow in it.

The answer is cached for six hours, and expires early the moment the kickoff it names has come and
gone: a start in the past says nothing about the next one. An offseason league costs 4 lookaheads
and 48 polls a day against dormant's 576.

**Most leagues never spend the request.** `parseEvent` keeps scheduled games on the same payload as
live ones, so a league with a game tonight already has its own answer, and with Up Next on the slate
contributes the rest of the week for free. The lookahead only fires when nothing in hand answers it,
which is exactly the case a league with an empty card is in.

### Three answers, and the third is not the second

`undefined` is "nobody has asked" and `null` is "asked, and there is nothing in the window". Keeping
them apart is what stops a league that has merely not been polled yet from being sent to the
ceiling. Unasked means dormant, which is the faster of the two quiet states and the right thing to
be doing while a request is still out — and it is also where a **failed** lookahead lands, because
not reaching ESPN is not the same as ESPN saying nobody plays for two months, and the difference is
27 minutes of not looking.

### The horizon is a full day, and that is most of the design

A league is only allowed to sleep when the gap in front of it is **longer than 24 hours**. A game on
today's card keeps it on the dormant beat however many hours off first pitch is.

That was an hour first, and it was wrong in a way worth recording, because an hour sounds defensible
right up until you open the popup. MLB sat in hebetudinous at midday with first pitch at seven — a
league in the middle of its season, playing that day, polling half-hourly. "No game coming any time
soon" is not five hours; a league with a game today is having a day.

It also makes the two halves of the lookahead line up. Whatever the poll finds on its own payload is
today's Eastern card and therefore inside the horizon by definition, so those leagues stay dormant
and the request is never spent. Hebetudinous is decided entirely by leagues whose card is empty, and
engages only in a real gap — an offseason, a break, an All-Star weekend. That is the only place the
576 was ever worth reclaiming.

**The cost, stated plainly:** an in-season league with a game every day never sleeps, so the quiet
overnight hours are still polled at 2–3 minutes. Buying those back means deciding that a league with
a game in 14 hours does not need watching, and that is a different judgement from the one this
change makes.

Above the horizon the interval is the gap minus the horizon, capped at 30 minutes and floored at the
dormant beat so this state can never poll faster than the one above it. A game nine days out sleeps
30 minutes at a time; at 24h25m out it sleeps 25 and hands back to dormant, which covers the run-up
so ESPN moving a start by a few minutes cannot be missed.

**A 30-minute ceiling rather than an hour or four.** It is not there for scheduled games — the
lookahead already has those — it is there for a fixture nobody told us about, and half an hour is
how long that can go unnoticed.

A live game returning outranks all of it. `recordPollResult` zeroes the empty count before anything
else is read, so a game starting drops the league to eager on the poll that finds it, whatever its
schedule says.

### What survives a reset

`startLeaguePolling` resets the tracker on every preference change, and it now clears the empty-poll
counts while leaving the schedules alone. A preference change is not news about when anybody plays
next, and re-asking would cost one request per enabled league — 31 of them — every time somebody
toggles a setting.

### Coverage

**49 tests on the tracker**, 24 of them new, every instant written out as a literal rather than
derived from the constant under test, and `now` passed to both the recorder and the reader — a test
that leans on the default is measuring the machine's clock. Both edges of the horizon are pinned to
the millisecond.

**12 on the interval**, including one that walks three days in 7-minute steps and requires the answer
to stay between the dormant beat and the ceiling at every one of them, and a kickoff already in the
past, which is reachable through a schedule that goes stale between the mode being read and the
interval being computed and must not come out as a negative delay.

**7 on the lookahead fetch**, including the one that says it costs exactly one request — the point of
the state is to spend fewer, so a lookahead as expensive as a poll would be self-defeating — and the
one that says a 503 throws rather than returning `null`, since `null` is what puts a league to sleep.

**9 on the background**, driving the real `tickLeague` rather than `GET_STATE`'s `forceRefresh`,
which routes through `tick()` and reschedules nothing. The interval is read off `GET_DEBUG_STATE`,
and one test ignores that number entirely and advances the clock instead: 29 minutes with no poll,
then a poll. Dormant would have polled ten times before the first assertion.

Two of the nine are the horizon report, one for each way a kickoff reaches the tracker: a game on
the poll's own payload at 1, 5 and 19 hours out, and a lookahead coming back with tomorrow's game.
Both fail against the one-hour horizon, along with three of the tracker's.

All seven were confirmed failing against three separate mutations rather than one — paying the
dormant interval for the third state, dropping the `needsLookahead` guard so the request fires every
tick, and letting an unknown schedule sleep instead of staying dormant. Each broke a different pair
of them, which is what says the assertions are about different things.

## The Ludicrous Speed egg is click to skip, and nothing else — 2026-09-11

The egg shipped with the controls it was reviewed under, and its own source said as much:

```
/* PROPOSAL SCAFFOLDING — the transport keys and the playback rate below come out once the sequence
   is signed off. */
```

The sequence is signed off. Gone: `f`, which flipped the whole script between 1× and 4× **and
persisted the choice to `localStorage`**, so anyone who pressed it once while reviewing has been
watching a 4× egg ever since, on a key they have no reason to remember pressing. Gone with it, `→`
for the next beat and `n` for the next phase.

`Enter` and `Space` stay. The overlay is `role='button'`, so those two are the click rather than
controls of their own. The emergency brake stays too — it is a beat in the script, drawn by the
cockpit painter and placed onto the rect the canvas drew, not a dev affordance.

### The hint strip was the only untranslated string in the popup

```tsx
<span className='ls-transport'>{rate === 4 ? ' · → next · n phase · f 4×' : ' · → next · n phase · f fast'}</span>
```

A literal, not an `i18n.t` call, and there is no `ludicrousSpeed.transport` key in any of the twelve
locale files. Eleven languages got a translated "click to skip" followed by English debug chrome. No
locale changes were needed to remove it, because it was never in a locale file.

### The tests had been walking the script with the keys being removed

`nextPhase()` was `trigger('keydown', { key: 'n' })`. Six of the nine specs were built on it, so
deleting the control deletes the only way the suite could reach beat 34.

They run on a faked clock now, with **only `setTimeout` stubbed** — `requestAnimationFrame` and the
CSS animations stay real, so the canvas still paints and the brake still has its entry ramp. Each
step advances by the beat's own duration read off `buildScript()`, which means every wait in the
file is the script's real timing rather than a jump past it. The spec that walks all 42 beats
checking text placement now asserts the line it expects on each one, computed from the script, so it
is in step with the sequence rather than one beat behind it.

**React commits a beat behind the clock**, and that is the thing to know before writing another of
these: `cy.tick` schedules the commit rather than performing it, so `.then` and `.invoke` read the
previous beat while `.should` retries into the right one. The first version of the no-scrubbing test
captured beat 0's line and compared it against beat 2. Every step in the file settles on a retrying
assertion before anything reads the DOM.

9 specs became 14, and the file went from **33 seconds to 3**.

Four of the five new ones are about the absence: the four keys do nothing, `arenaswap.ludicrous.rate`
is never written, a stale `4` left over from review does not speed anything up, and `.ls-transport`
does not exist while `.ls-skip` reads exactly what the locale file says. All four were confirmed
failing with the controls put back.

The stale-rate test was rewritten after passing for the wrong reason. It asserted the *second* line
was not yet on screen a millisecond before its beat — which a 4× run also satisfies, six beats
further on. It pins the line that should still be up instead.

## The review prompt stops appearing on the loading screen — 2026-09-11

Open the popup with the prompt eligible and "Enjoying ArenaSwap?" rendered underneath the spinner,
before a single game had arrived. Under the red failure banner too, which is worse: a request for a
five-star review directly beneath a notice that nothing loaded.

Every section below `GameListHeader` is gated on `!isLoading`. The three banners between them are
not, and two of them only look like they are:

- `suggestionCount` is derived from `games`, which is `[]` until the fetch lands.
- `onStandbyStream` is `data?.onStandbyStream ?? false`, which is `false` until `data` exists.

`showReviewPrompt` is the exception, and that is the whole bug. Eligibility is read out of
`storage.local` in the popup's own init effect — a read with nothing to do with the SWR fetch, which
lands well before it. So it is the only banner here that can be true while the spinner is up.

The gate goes in `mainView` rather than in `shouldShowReviewPrompt`, which is unit-tested on its own
and should keep answering the question it is named for: whether the user has earned the prompt, not
whether the list has finished loading.

### Coverage

2 component tests, both confirmed failing against the old gate. Each asserts the spinner or the
error banner is **present** as well as the banner being absent — an absence test against a state the
component never reaches passes whether or not the gate exists, which this changelog has recorded
catching once before.

## The stylesheets stop using @import, and two dead overrides fall out — 2026-09-11

All 21 of our own `@import` rules are `@use` and `@forward` now, so the four entry stylesheets
compile with **zero deprecation warnings of their own**, against 5, 1, 11 and 4 before. What is left
in the output is Bootstrap's 330, which the entry below silences on a version gate.

### The theme became a funnel instead of a pile of declarations

`packages/ui/src/_bootstrap.scss` used to be 40 bare variable declarations that each app `@import`ed
*before* Bootstrap, relying on `@import` dumping them into one shared scope for Bootstrap's
`!default`s to find. `@use ... with` configures a module once, by argument, so that trick has no
equivalent.

It forwards Bootstrap instead:

```scss
@forward 'bootstrap/scss/bootstrap' with ($primary: #F75C03 !default, …);
@use 'bootstrap/scss/bootstrap' as bs;
```

An app now loads Bootstrap *by* loading the theme, and configures it in its own `@use ... with`.
Three facts had to be checked before committing to that shape, because the whole migration rests on
them: a downstream `@use ... with` can configure variables the `@forward` never names, which is what
lets the extension set 41 Bootstrap variables the theme says nothing about; `@forward` and `@use` can
name the same module in one file, which the theme needs because `@forward` re-exports members without
making them available locally and the `::selection` rule at the bottom reads two of them; and
Bootstrap 5.3.8 accepts `@use ... with` at all, which is not documented anywhere in its docs.

### Two overrides that had never done anything

`@use ... with` fails on a variable the target module does not declare `!default`. `@import` just
created a local variable and moved on. So the migration would not compile until two lines were dealt
with, and neither was doing what it said:

- **`$font-monospace`** is not a Bootstrap variable. Bootstrap's is `$font-family-monospace`. Nothing
  in this repo read the name we were setting, and Lekton is spelled out literally at each of its ~20
  call sites — so Bootstrap's `code`, `pre` and `kbd` stack has never been Lekton and still is not.
  Pointing the real variable at it is a visible change, so it is not smuggled in here.
- **`$form-switch-checked-bg`** is not a Bootstrap variable either. The switch's orange comes from
  `$form-check-input-checked-bg-color`, which was the next line down and was always doing the work.

Both are gone with a note in their place. Cross-checking the rest of the overrides against
Bootstrap's own 1,005 `!default` declarations turned up no others: every remaining name is either
Bootstrap's, bootstrap-icons', or ours by design.

### The site's stylesheet had to be split, for one rule at 1600px

`@use` has to precede every rule in a file. `apps/docs/src/styles/global.scss` held 1,498 rules and
*then* loaded four landing-page partials underneath them, which is a shape `@use` cannot express —
hoisting those four to the top would emit them before the file's own rules instead of after.

Whether that mattered was worth measuring rather than assuming. Across the boundary the file's own
rules use 4,338 class names and the four partials 113, and exactly 7 appear on both sides. Six are
harmless: every partial rule touching them is a two-class descendant selector, which outranks the
bare `.crest` or `.h2` it competes with on specificity regardless of order.

The seventh decided it. `_bands.scss` widens Bootstrap's own `.container` above 1600px and again
above 1920px, with a **bare `.container` inside a media query** — Bootstrap's own specificity, so it
wins on source order alone. Hoisted, Bootstrap's `max-width: 1320px` would have won and the page
would have quietly stopped widening on a large display.

So the 1,498 rules moved to `_site.scss` and `global.scss` is a ten-line loader that states the
order. Verified positionally in the compiled output rather than by reasoning: Bootstrap's 1320px
lands at line 772 and the 1560px override at 22,455, the same way round as before.

### A duplicate copy of Reboot, and 39 selectors that could never match

Two things came out of the docs stylesheet on the way past, both of them shrinking the output by a
combined 411 lines.

`@import 'bootstrap/scss/reboot'` sat on the line after `@import 'bootstrap/scss/bootstrap'`, and
`bootstrap.scss` imports reboot itself — so the site shipped **two identical copies of Reboot**. It
cannot be expressed as a module anyway, because `_reboot.scss` reads variables it does not declare,
so it is simply gone. 6,212 bytes, and not one selector lost: all 61 of the dropped Reboot selectors
still appear in the output, once each.

The other is a genuine semantic difference between `@import` and `@use`, and worth knowing about
before the next person trips on it. **`@extend` only reaches the stylesheet it is written in and the
ones that stylesheet loads — not the ones that load it.** Bootstrap's `_type.scss` does
`.h2 { @extend h2; }` for all six headings plus `small` and `mark`, and under `@import` that reached
into our files: `.docs-index h2` was being emitted as `.docs-index h2, .docs-index .h2`. Under `@use`
it is not, so 39 of those twins are gone.

Nothing can notice. The site puts a heading class on an element exactly three times — `class="h5"` in
`Machine.astro`, on real `<h3>` elements — and Bootstrap's own `h5, .h5` rule lives inside Bootstrap's
module where the `@extend` still applies, so it survives untouched. `.h1` to `.h4`, `.h6`, `.small`
and `.mark` appear on nothing the site renders.

### Two blocks moved, and a keyframe that was defined twice

The popup's CSS is the same bytes in a different order: `*::selection` moves from the first rule in
the file to just after Bootstrap's, because the theme now loads Bootstrap ahead of its own rule, and
Bootstrap styles `::selection` nowhere. `@keyframes livePulse` moves from before the shared card and
popup rules to after them.

That second one looked like it mattered, because two `@keyframes` of the same name are resolved by
source order and the relocation flips which wins. It turns out `livePulse` is **declared twice** —
once in the popup's entry stylesheet and once in `packages/ui/src/_game-card.scss` — and the two are
character-for-character identical, so whichever wins is the same animation. lightningcss collapses
them to one in the build. The duplicate is not removed here, because doing so would stop the CSS
being a provable relocation; it is worth its own line.

### Coverage

The bar for this change is that the compiled CSS did not move, so that is measured directly on all
four entry stylesheets rather than argued.

| | bytes | verdict |
| --- | --- | --- |
| `apps/extension/assets/bootstrap.scss` | 426,359 → 426,359 | identical line multiset; 2 blocks relocated |
| `apps/extension/assets/global.scss` | 22,256 → 22,038 | relocated; one obsolete `/* Fonts */` comment dropped |
| `apps/docs/src/pages/screenshots/_screenshot.scss` | 291,737 → 291,737 | identical line multiset; `::selection` relocated |
| `apps/docs/src/styles/global.scss` | 453,928 → 447,716 | duplicate Reboot and 39 unreachable selectors |

Sorting both sides and diffing is what makes "relocated" a measurement rather than a claim — it
compares the multiset of output lines, so a moved block passes and a changed declaration cannot. Each
of the four differences above was then read line by line, which is how the `@extend` change was
found at all; a byte count would have shown 411 fewer lines and said nothing about which.

Bootstrap is confirmed emitted exactly once per entry, by counting its `--as-blue` declaration. Two
modules of the same file loaded under different specifiers would have doubled 330KB of CSS silently.

Then the repo's own suite, which is the part that covers the cascade: **528 component tests and 78
end-to-end tests pass**, across `lint`, `test`, `test:e2e`, all three browser builds and all three
zips, 13 turbo tasks, zero Sass warnings in any of them. Those component specs read computed styles
and measure pixel geometry, so a cascade inversion is the kind of thing they fail on — which is what
makes them worth more here than any assertion written specifically for this change.

Nothing was added to the suite. There is no unit to test: the subject is the compiler's output, and
the output is unchanged on purpose.

## Bootstrap's Sass warnings go quiet on a gate that lifts itself — 2026-09-11

Compiling the popup printed **336 deprecation warnings**. The site printed 342 and the screenshot
pages 335. Dart Sass caps its own output at five per deprecation, so what anybody saw was twenty
lines and a note about the rest being omitted — which is how two warnings of our own sat inside the
pile.

331 of each of those totals is Bootstrap 5.3.8's own Sass: legacy `@import`, global built-in
functions, the pre-Color-4 colour functions, and the `if()` that Dart Sass 1.95 deprecated in favour
of CSS's. Bootstrap's own docs say to ignore them until a long-term fix lands. So they are ignored,
deliberately and with an expiry date.

### quietDeps, not silenceDeprecations

Two options could do this and only one is scoped to the problem.

`silenceDeprecations` takes deprecation ids and applies them to the whole compilation. The list this
needed is `color-functions`, `global-builtin` and `if-function` — and
`apps/extension/assets/bootstrap.scss:718` was emitting a `global-builtin` of its own. An id list
would have buried that one too, which is the opposite of what silencing Bootstrap is for.

`quietDeps` is scoped by origin instead: Dart Sass counts anything reached through a load path or an
importer as a dependency, so `node_modules` goes quiet and the entry stylesheets stay audible.
Measured on the popup — 331 silenced, 5 left, every one of the 5 in our own file.

One consequence of the origin rule rather than a choice: `packages/ui` resolves through the workspace
symlink at `node_modules/@arenaswap/ui`, so its own `@import 'crest'` counts as a dependency and goes
quiet with the rest.

### The gate is the installed Bootstrap major

Nothing in Sass reports that a silenced deprecation stopped being emitted, so an unconditional
`quietDeps` is permanent by default — it would keep swallowing Bootstrap's warnings for years after
Bootstrap stopped producing any, including whatever new ones it picks up meanwhile.

`packages/ui/src/sassOptions.ts` reads the installed `bootstrap/package.json` and returns
`{ quietDeps: true }` only below **5.5.0**, which is where Bootstrap's roadmap puts "refactor our
Sass code to use the Sass module system" — under the maintainers' caveat that it moves to v6 if it
turns out too large. The day an install crosses that the module returns `{}` and anything still
warning is heard.

The threshold is the announced fix rather than the next major, and that distinction is the whole
value of the gate. Pinned to `< 6` it would have kept silencing a fixed 5.5, 5.6 and 5.7 — including
any *new* warning Bootstrap picked up on the way — and never said so. Pinned to the announced
version, a 5.5.0 that still warns because the work slipped brings the warnings back until somebody
raises the number: loud and wrong, which for a switch whose job is hiding output is the only safe
direction to be wrong in.

A prerelease compares on its release part alone, so `5.5.0-beta1` counts as 5.5.0 and shows its
warnings — trialling a prerelease is exactly when you want to see them.

It is one module read by three build configs rather than the same expression written three times,
because the failure mode of a copy is two apps disagreeing about when to stop silencing.

**Three configs, not two.** `apps/extension/wxt.config.ts` and `apps/docs/astro.config.mjs` are the
builds, and `apps/extension/cypress.config.ts` carries its own `viteConfig` — its support file
imports both `.scss` entries, so the component runner compiles Bootstrap exactly the way the build
does and printed the same wall of warnings on every `cypress run`.

### The two that were ours

```scss
.sensitivity-tick-#{$i} { left: percentage($i / 6); }
```

One line, two deprecations: `slash-div` for the division and `global-builtin` for `percentage()`.
It is now `calc($i / 6 * 100%)`, which is one expression rather than two and needs no `sass:math`
import — which matters, because `@use` may not follow an `@import` and that file opens with five of
them. Sass folds the calc at compile time, so all seven emitted rules are byte-identical.

### What is left, on purpose

21 `@import` warnings, all in our own four entry stylesheets. `@import` is not removed until Dart
Sass 3.0, and the migration is a restructure rather than a rename: `@use ... with` configures a
module once, so the ~85 Bootstrap variable overrides the three entries declare between them have to
become argument lists, and `packages/ui/src/_bootstrap.scss` has to forward Bootstrap rather than
declare into it.

### Coverage

No tests, because there is nothing here a test can hold: the subject is compiler output, and the
assertion that matters is that the CSS did not move.

That one was made directly. All four entry stylesheets were compiled to CSS before the change and
after it and diffed — 426,359 bytes for the popup, 453,928 for the site, 291,737 for the screenshot
pages and 22,256 for the extension's second sheet, byte-identical across every one.

Then all three pipelines were run for real, because a compiler option in a config file is worth
nothing if the config does not load it. And each was run twice: once as it ships, and once with
`bootstrapSassFixedIn` lowered below the installed 5.3.8 so the gate opens. Without that
second run the whole mechanism could have been a no-op agreeing with itself.

| | ships | gate forced open |
| --- | --- | --- |
| `wxt build` | 6 | 21 |
| `astro build` | 9 | 40 |
| `cypress run --component` | 3 | 21 |

All six runs exit clean and the component spec passes 9 of 9 either way. The figures are Sass's
default five-per-deprecation cap rather than totals; the totals behind them are the 336, 342 and 335
above, read with `--verbose`.

## The postseason boost knows which round it is paying for — 2026-09-09

A Wild Card game and a Super Bowl were worth the same five points. The boost is now a ladder keyed
on how far a game is from the trophy, and the card says which round it is looking at, in ESPN's own
words with the sponsors left on.

### Distance from the trophy, not round number from the start

0 is the game that decides the title, 1 a semifinal, 2 a quarterfinal, 3 anything earlier. Every
league maps onto that without a per-league round table, because it is the same question in all of
them — a Sweet 16 game and an NHL first-rounder are both several wins away, and an NBA Finals Game 1
and a Super Bowl are both win-this-and-it-is-over.

The preference is now the **ceiling** rather than a flat amount, paid out in quarters: 25% at the
bottom rung, then 50, 75 and 100. Its default moves from 5 to 8, because quartering 5 puts the
bottom two rungs on 1 and 3 and squeezes most of the ladder into two points. At 8 the rungs are
2/4/6/8 and each is a whole point clear of the one below. A saved value keeps meaning what it said:
the most a title game can add.

### Three things that were already broken, found by sampling every league

The issue proposed grading six leagues. Pulling live payloads for all 31 turned up games the flat
boost was getting wrong before any tiering existed:

- **The 2026 World Cup's round of 32 was not postseason at all.** The 48-team format added a first
  knockout round of 32 matches under `season.slug: 'round-of-32'`, which is in neither the slug
  allowlist nor any of its patterns. The whole round scored as regular-season football.
- **NCAA baseball and softball had it inverted.** ESPN files those tournaments as a season type per
  stage — 3 Regionals, 4 Super Regionals, 5 the College World Series, 6 the Championship Series —
  and the check was `type === 3`. So the opening weekend counted and the College World Series
  championship final did not.
- **The Pro Bowl was worth as much as a conference championship.** It is `season.type: 3` and it is
  an exhibition.

### Whose trophy?

The harder question was what to do with games ESPN calls postseason that are not on anybody's
championship path, and the rule that resolved all of them is one sentence: **a game earns the ladder
only if the trophy at the end of its bracket is the one the sport's entire field was competing
for.** Every other trophy is a side trophy — its final earns the bottom rung, its earlier rounds
nothing.

That falls out of what the boost is for. The live signals already encode what the scoreboard shows,
so the boost only has to encode stakes, which means paying an exhibition nothing cannot hide a good
game: a close Alamo Bowl still surfaces on closeness and late-game.

- **~26 non-playoff bowls score nothing.** Detection inverts rather than listing them: in college
  football postseason, an affirmative playoff signal in the headline is required to pay anything, so
  absence of one identifies a bowl. That survives the bracket growing, because a 16-team CFP will
  still call its games "College Football Playoff First Round".
- **The NIT, the WBIT and the College Basketball Crown** earn the bottom rung for their final and
  nothing before it.
- **The Women's NIT earns nothing at all.** Since the WBIT launched it is the third tier of the
  women's postseason, and when a sport runs two secondary tournaments the lower one gets nothing.

Conference tournaments are deliberately out. Every NCAA conference tournament — men's and women's
basketball, hockey, and college football's conference championship games — reports
`season.type: 2, slug: 'regular-season'`, so Championship Week is invisible to the switcher today
and stays that way until its own issue. It is the largest thing this change does not do.

### The card names the round, in ESPN's words

`competition.notes[].headline` carries the round for the US leagues and was never read; `type` was
not even declared on the schema, so zod stripped it. The card prints that name beside the LIVE
marker, in the right half of a status row that has always been empty. It costs no height on any
card.

**In ESPN's own casing, which is the whole point.** Uppercasing turns *Cheez-It*, *AT&T*, *IS4S* and
*TaxSlayer* into shouting, and a bowl's sponsor is most of the reason its name is worth printing. So
the row carries an uppercase status and a sentence-case round, which reads as chrome against
content.

**Nothing is ever truncated.** Raw and uppercased, ESPN's headline fits the 228.6px budget in 178 of
390 real cases. Two changes take it to all of them: keep the casing, and strip the one leading
phrase that repeats the league the popup already names twice, in the section header and the league
logo. That turns a 404px string into a 168px one —
`NCAA Women's Basketball Championship - Regional 4 in Sacramento - 2nd Round` becomes
`Regional 4 in Sacramento · 2nd Round`. Two labels are still too wide to share the row; they wrap
to a line of their own, which is a CSS fallback rather than a text one, so a round name ESPN invents
next year wraps instead of losing its tail.

**Which prefixes are redundant is not a matter of taste, and getting it wrong destroyed
information.** Stripping `NIT`, `WBIT`, `Women's NIT` and `College Basketball Crown` collapsed
`WBIT - Semifinal` and `Women's NIT - Semifinal` onto one label — two tournaments this change scores
+2 and 0 respectively, so the card would have shown identical words over different numbers, four
times over. Those four prefixes are not redundant with the league; they are the fact that says which
of four tournaments a March basketball card is showing. The rule is now that a prefix goes only when
it is recoverable from what is already on screen.

Two smaller rules came from single real strings.
`NCAA Baseball Championship - Atlanta Regional Rescheduled from 5/29` is a scheduling note ESPN
sends through the round field, and resolves to no label. `NCAA Women's Ice Hockey Championship`
arrives with no round suffix at all, so the strip consumes the whole string — when reduction leaves
nothing, nothing is shown, rather than falling back to a tournament name the section header already
gives.

The breakdown row names the round too, so a +6 has something accounting for it.

### The fallbacks, which is most of what makes this safe

The feature grades free text from a third party, so every branch degrades rather than failing.

A postseason game whose round cannot be graded takes the **bottom rung**, not the ceiling and not
zero — ESPN renames things, and the failure mode should be a small boost rather than either losing
the feature silently or promoting a first-rounder to a final. A game that scores nothing on purpose
is a different state from one we could not grade, and the two are distinguishable in the data. The
label and the boost degrade independently, which is why a bowl shows its sponsor and scores zero.
Nothing in the grader can throw on a malformed payload.

### Coverage

**126 unit tests** on the grader, and **the 790-row corpus they run against is transcribed from live
ESPN across all 31 leagues** rather than written by hand — which is the only reason the collision
above was found before it shipped. Two of those tests are properties over the whole corpus: that no
label is ever a partial word of the headline it came from, and that no two distinct headlines in one
league ever produce the same label.

**11 component tests** measuring what only a browser can answer: that the label shares the status
row to within a pixel, that a card carrying one is exactly as tall as one that is not, that a
too-wide label lands on a second line whole rather than clipped, and that the label is not
uppercased *when mounted inside an uppercased ancestor* — because without one that rule is inert and
the assertion passes whether it exists or not, which is what the first version of that test did.

**Every one of these was checked by breaking the code and watching it fail.** Nine mutations of the
grader and four of the stylesheet: re-adding the four tournament prefixes, truncating every label,
restoring the mandatory hockey dash, removing the unknown-round fallback, letting bowls and the Pro
Bowl and the Women's NIT score, grading `NBA Finals` as a conference final, flattening the ladder,
shouting the label, and adding an ellipsis. Two assertions survived their first mutation and were
rewritten: the ladder's monotonicity test read `sorted`, which a flat ladder satisfies, and is
strict now; and the no-truncation check was inferred from a width comparison that stays true while
the row still wraps, so it asserts `text-overflow` and `overflow` directly.

Four bugs were found this way rather than in review. `NBA Finals` and `WNBA Finals` graded a rung
low, because the conference-final rule matched the league name as well as `East` and `West`. The
soccer slug table had two ordering faults: `semi-finals` ends in `-finals`, so a bare rule above it
graded a semifinal as the title match, and `playoffs---championship` contains `playoffs`, so a
catch-all above it graded the NWSL final as an opening round. And MLS brackets per conference, so
its conference final is one win from MLS Cup rather than being it.

### Strings

Two keys across twelve locales. The setting's explainer promised a flat boost and now describes the
ladder, and its value reads "up to" a ceiling. The round name itself is untranslated, like the venue
and broadcast names beside it on the same card.

## A dome game stops reporting the weather outside — 2026-09-09

ESPN sends a weather block for every game it has a forecast for and never once checks the roof. Off
one scoreboard pull this afternoon: U.S. Bank Stadium reading Thunderstorms, Ford Field Mostly
cloudy at 80, Allegiant Stadium Sunny at 95, all three flagged `indoor: true` on that same payload.
It is the stadium postcode's AccuWeather forecast, which is a true fact about the car park and
nothing at all about the game.

So the detail screen printed conditions nobody in the building could feel, and come December the
falling-snow decoration would have buried a Vikings home game on the strength of a Minneapolis
forecast.

### It is baseball too

The issue was written off the NFL slate. Live MLB carries the same pairing: loanDepot park at Partly
cloudy and American Family Field at Mostly clear, both `indoor: true`, both mid-game. Three of the
fifteen venues on today's MLB card are roofed.

Soccer was the one thing worth checking before touching anything, because MLS and the European
competitions send no `indoor` key at all. Mercedes-Benz Stadium arrives from the MLS scoreboard with
nothing on it saying it has a roof. They send no weather either, in any competition sampled, so the
gap never bites — but a missing flag is read as open air rather than as a dome, which is the only
safe reading of an absent key, and it has its own test for the day one of them starts carrying a
forecast.

### One gate, at the parse

`comp.venue?.indoor` was declared in `EspnCompetitionVenueSchema` and read nowhere. `parseWeather`
takes it now and returns undefined for a dome, which is the single point both consumers pass
through: the chip in the venue row and `isSnowing` behind the decoration each get it without a line
of their own.

The alternative was to put the flag on `Game` and check it at both readers, which writes the same
rule twice and lets the third reader of `game.weather` forget one of them. Nothing else in the
product wants to know a venue is roofed, so nothing carries it.

A retractable roof reports `indoor: true` whether it is open or shut, and ESPN publishes no roof
position anywhere, so NRG and Lucas Oil lose their weather on the days the roof is genuinely open.
That trade goes the right way. A forecast printed over a closed roof is a lie, and a missing one
under an open roof is a line the panel already drops for every game with no reading.

### Coverage

8 tests on the parse, every payload transcribed off a live scoreboard this afternoon, including the
field swap ESPN does on live baseball — `displayValue` holding the icon number 35 while the words sit
in `conditionId`, which is the shape loanDepot park actually arrives in. `parseWeather` had no tests
at all before this.

The one that matters most is not in core. The suppression lives in the parser and the decoration
that acts on it lives in the extension, so a unit test either side of that seam passes while a snowy
dome still buries the screen. A real dome payload runs through the real fetch into
`resolveDecorations` now, with an open-air control carrying the identical reading — without that
control the dome assertion would hold just as well on a payload that never had snow in it.

The snow value is December's rather than transcribed, and it has to be: ESPN drops the weather block
entirely once a game is final, so a January dome payload cannot be fetched back out to copy. The
venue blocks are verbatim.

`gameInfoPanel.cy.tsx` carried a test called "drops the weather line indoors" that mounted
`weather: undefined`. That is the shape a dome arrives in and says nothing about whether it ever
gets there, so it could never have caught this. It keeps its assertion under a name that describes
it, and a second test runs the Ford Field payload through the real parser into the mounted panel.
Both dome assertions in core, the end-to-end and the panel test were confirmed failing with the
gate removed.

## The standby strip stops being a white slab with dark-theme ink on it — 2026-09-09

Turn on Standby Stream, drop below the threshold, and the line that tells you so was `#8b949e` on
`#e9ecef` — **2.59:1**, against 4.5:1 for small text. Two thirds of the way to invisible, on a strip
whose whole job is to say why nothing is switching.

The strip is `.text-body-secondary` on `.bg-body-secondary`. Only one of that pair had ever been
themed. `$body-secondary-color` is this project's dim `#8b949e`; `$body-secondary-bg` was left at
Bootstrap's `#e9ecef`, so the strip printed dark-theme ink onto Bootstrap's light default and
punched a near-white bar across the popup directly under the header.

### The token had been patched around three times rather than set

Bootstrap 5.3 computes a light pair of surface tokens on `:root` and a dark pair under
`[data-bs-theme=dark]`, and this theme never sets that attribute — the darkness is the hand-picked
`$body-bg` in `packages/ui`, not Bootstrap's colour-mode switch. So the light pair wins everywhere,
and each component that reached for it got its own repair:

| | what it reached for | patched with |
| --- | --- | --- |
| Up Next pager | `$pagination-disabled-bg`, `-hover-bg` | `#0d1117`, `#161b22` |
| language switcher | `$dropdown-link-hover-bg` | `#21262d` |
| box score tab strip | `$nav-tabs-link-hover-border-color` | `#e5e7eb …` |

Three comments in three files, each saying the theme never overrode the token. The standby strip is
the first thing to reach for `.bg-body-secondary` **directly**, where there is no component variable
to patch — so the tokens are set at the root and the next thing to ask for one inherits it.

`$body-tertiary-bg` is `#161b22` and `$body-secondary-bg` is `#21262d`, ordered the way Bootstrap's
own dark values are: tertiary nearest the body, secondary a step further. Neither is a new colour —
both are already in the palette, 19 and 30 times over. The strip lands at **4.95:1** and reads as a
surface a step above the popup rather than as a hole in it.

### One thing had to be pinned so it would not move

`$progress-bg` is `var(--as-secondary-bg)`, and the two progress bars we draw — the game card's
PowerScore bar and the breakdown's five signal bars — both sit on light cards, where `#e9ecef` is
the right track and a dark one would be a black slot. It is pinned to the value it has always had,
so the token move leaves both byte-identical.

Nothing else moved. Everything else the two tokens feed is either already pinned (pagination, the
range track, the tab strip) or unreachable in this product: no `.input-group`, no `.list-group`, no
`.popover`, no file inputs, and `.form-check-input` disables through opacity rather than a
background.

### What is still a light plate, on purpose for now

The two banners above the strip are `.alert`s, and Bootstrap builds an alert out of the
`-bg-subtle` / `-text-emphasis` pair rather than the surface tokens — so the suggestion banner is
`#632501` on `#fddecd` and the Pro Tip is `#055160` on `#cff4fc`. Both clear contrast comfortably;
they are simply light. The docs site already overrode that pair for the four variants it renders,
and the extension never did. That is the same gap one layer over, and it is a decision about how
loud a banner should be rather than a contrast failure, so it is not in this change.

### Coverage

The strip had no component test at all, which is why a 2.59:1 label shipped. It has two, both
confirmed failing against `#e9ecef` first.

One reads the ink and the plate off the strip's own computed style and requires 4.5:1 — measured
rather than hardcoded, so a surface token that moves later cannot leave the ink checked against a
colour it no longer sits on.

The other pins the decision rather than the value: the plate's luminance sits **above** the popup's,
so the strip has an edge, and **below** its own ink, so it still reads as part of a dark theme.
Either bound on its own passes on a colour that is wrong in the other direction.

## The sticky bar counts down to a scheduled game instead of printing two zeros — 2026-09-09

Scroll the hero off a game that has not started and the bar handed you `ATL 0 — 0 PHI`. Both
figures are zero and stay zero until first pitch, so the two abbreviations were doing the bar's
entire job and the scores were furniture. A scheduled game keeps its crests and abbreviations and
drops the scores; the time to the start takes the slot on the right.

Live and final games are byte-identical. The score is the number you scrolled past and the reason
the bar exists.

### The countdown goes in the status slot, not where the scores were

`resolveStatusText` returns `''` for a scheduled game, so the right-hand slot is already empty
before a start and the two never render together. That is what settles it: a delay description is
the one thing a pre-game game does put there, and it wins the slot outright — a postponement has
something to say that a time until a start nobody is holding to does not. One element, three
states.

The alternative was the centre, between the abbreviations where the scores had been. A figure in
that position reads as a score, which is the thing being removed.

The 1px rule between the two teams stays either way. It is what makes the pair read as one matchup
rather than two adjacent teams, and with the scores gone it is the only thing doing that.

### Two units where the hero shows three

The slot is 5.5rem and shared with a live game's period and clock, so `startCountdownDisplay`'s
three-segment clock and its date line do not fit. `formatCompactCountdown` prints the largest unit
that is not zero and the one below it: `2d 05h`, `5h 13m`, `13m 42s`, and `9s` on its own under a
minute, where there is no unit below to pair with.

Dropping a zero leading segment rather than printing it matters more than it sounds. The hero shows
`0h 13m 42s` a quarter of an hour out, because its segment set is chosen once at the day boundary;
the bar has two slots and cannot spend one on a zero.

The trailing figure is padded to two digits and the leading one never is, which is the hero's own
rule. The string is pinned to the right of the bar, so its left edge is the one that moves — and a
countdown that ticks every second should not shuffle sideways each time a digit crosses 9.

The widest any locale reaches is 53px against the slot's 88, and German and Japanese tie for it —
`23Std 59Min` and `23時間 59分`, both of them the hours-and-minutes shape rather than the
days-and-hours one that looks longest written out. No new locale keys: all four unit abbreviations
were already in all twelve files for the hero, and ten of those twelve differ from the English
letters, from `min` in the five Romance locales through `Std`/`Sek` to `時間`/`시간`.

### The countdown owns its own hook

Both heroes drive their countdown from `useStartCountdown` inside `startCountdownDisplay` rather
than taking parts as a prop, so a tick re-renders a few spans instead of the screen. The bar's slot
is its own component for the same reason — a second-by-second tick that re-rendered
`gameDetailView` would take the breakdown and the four ECharts canvases with it.

It is gated on `game.status === 'pre'` rather than on `startTime` being present, because `startTime`
is populated for every status now and a live game carries a kickoff in the past. Every reader of
that field but one sits behind a pre-game check, and the exception is the tab matcher's tiebreak,
which sorts two equally-scored live games by kickoff on purpose.

### Coverage

8 unit tests on the formatter, including the zero-hours case, both padding rules, and the fallback
to Starts soon once the clock runs out rather than counting up past it.

8 component tests on the scheduled bar and one more on the live one, which pins the whole status
string rather than only the two scores — the countdown is kept off a live bar by the pre-game gate
alone. The absent scores were confirmed failing with the gate forced open, and five of the eight
failed with the countdown removed from the slot.

**The first version of these tests could not reach the bar at all.** A scheduled game mounted from
the existing fixture is 422px of content in a 560px popup, so the hero never leaves the viewport,
the IntersectionObserver never fires and the compact state is unreachable — `cy.scrollTo` failed the
scrollable check outright. Adding team leaders got the page to 701px and it still failed, because
the poster hero is 186px and only 141px of that could be scrolled away: the observer wants the hero
fully out, not mostly out. The fixture is what a real scheduled game actually carries now — both
probable pitchers, three leaders a side, a venue, a broadcast, the weather and a line — which runs
to 808px.

The per-locale measurement substitutes each locale's string into the one element rather than
mounting twelve times, which this changelog has twice recorded as a false positive. It is sound here
and only here: the slot is absolutely positioned at a fixed `max-width`, so its box does not depend
on its content or on anything beside it. Confirmed by narrowing the slot to 2.5rem, which fails it —
and the string being measured comes out of the real formatter reading the real locale file, not out
of the test.

## The settings cog turns under the pointer — 2026-09-09

A quarter turn over 0.35s when the button is hovered or takes keyboard focus, and back when it is
left. Nothing else about the header moves.

The gear has eight lobes, so 90deg is two of them and the mark comes to rest on the silhouette it
started from. The alternative was an arbitrary angle, which leaves the cog visibly crooked for as
long as the pointer is on it and reads as a rendering fault rather than as a response.

The rotation sits on the icon's `::before` rather than on the `<i>`. An `<i>` is a non-replaced
inline box and takes no transform at all, and the `::before` is where Bootstrap Icons puts the glyph
and the only element in the pair that is already `inline-block`. Transforms do not lay out either
way, so the button's box is the same width it has always been.

`:not(:disabled)` on the hover half is what keeps it off the website. `apps/docs` imports this same
stylesheet and mounts `PopupHeader` with `interactive={false}`, which disables both buttons — and a
disabled button still matches `:hover`. A control that answers the pointer and then does nothing is
worse than one that sits still.

Under `prefers-reduced-motion: reduce` the flourish is off rather than instant. Dropping only the
transition would leave a gear that snaps a quarter turn under the cursor, which is the motion the
reader opted out of.

### Coverage

7 component tests. The turn is read off the pseudo-element's computed transform and pinned to the
resolved matrix, through a retrying assertion rather than a one-shot `then` — the first frame after
focus is still the identity matrix, which is what the first version of this test measured and
passed on. Both positive assertions were confirmed failing with the rule commented out.

The reduced-motion case drives Chrome's own media emulation over CDP, since a media query cannot be
exercised from the page, and it was confirmed failing with only its `transform: none` removed — so
the emulation is doing something rather than the test agreeing with itself.

The help mark beside the cog has its own test. Both buttons share `.popup-settings-icon`, so a rule
hung on that class would turn a question mark too, and a rotated question mark is a different shape
rather than the same one further round.

The disabled guard is checked as the rule's own selector against both rendered states, because
Cypress cannot force `:hover` and focus is not a route to a disabled button in either direction.

## A navy crest in the tab-match list stops being a silhouette — 2026-09-08

The two crests on a suggestion row sat straight on the popup's `#0d1117` with nothing behind them.
A Cowboys star or a Yankees monogram is navy on near-black, so what the row actually showed was an
empty 15px box beside an abbreviation doing all the work. They take the white tinted disc the
settings team picker has always used, at 18.9:1 against the surface.

### The disc grows around the mark rather than squeezing it

1.27rem holding an unchanged 0.95rem crest, which is the team picker's own 28-over-21 ratio to
within four thousandths. The alternative was to keep the row's current footprint and shrink the
logo inside it, and a crest cut to 11px is a smaller version of the thing that was already hard to
read. The row pays about 5px a crest for it and still fits 320px with room over.

Two crests plus a disc each is a third copy of the same eight lines of tint state, so `CrestDisc`
now owns them and the team picker reads it too. The sampling is unchanged and byte-identical in
what it produces; `teamPickerRow` just stopped carrying its own copy.

The shared placeholder is a grey circle at 18% alpha, which on a white plate reads as a hole rather
than as a crest still loading. It goes transparent inside the disc, the way the team picker's
already did.

### The sticky bar wanted one and cannot have one

Its two 18px crests sit on the same `#0d1117` and have the same problem. The compact matchup is
absolutely centred and the status is pinned right, so the status's left edge moves with its own
text, and the two already touch. Measured on the real screen at 320px, in the gap between the
matchup's right edge and the status's left:

| | en | ja | es | pt | the other eight |
| --- | --- | --- | --- | --- | --- |
| shipping today | -1.3 | -0.9 | 8.3 | 13.1 | 17 to 37 |
| with a 24px disc | -7.3 | -6.9 | 2.3 | 7.1 | 11 to 31 |

A pixel of overlap is invisible. Six more is a clipped character, and rendered it reads
"termission" behind the crest. So the bar keeps its bare crests until the crowding is dealt with on
its own, which is a layout question about a bar that is already full rather than anything to do
with discs.

Worth writing down because no test would have said so. The existing per-locale test measures the
compact matchup's width against a 296px budget, and the matchup fits that budget in every locale
while overlapping the element beside it.

### What was left alone, and why

Every other crest in the extension is already on a light surface. The game card is white, and the
detail screen's cards, box score line score, team pills and pre-game leader rows are `#f8fafc`,
where a disc would be the thing that disappears. The line score's absence of one is a decision the
changelog already records.

The docs site's landing strip is the one other place a team crest sits on `#0d1117`, and its source
comment says the Cowboys and the Yankees were kept off the row for exactly this reason. That row
could carry the disc and get its ten most recognisable crests back. It is not in this change.

### Coverage

5 component tests. The plate's contrast is read off the computed style and measured against the
container it sits on rather than against a hardcoded hex, so a popup background that moves cannot
leave the disc measured against a colour it no longer sits on. Both the contrast and the tint
assertion were confirmed failing with the plate set to `#0d1117`, and the geometry assertions with
the disc blown up to 90px.

## The site's demo game is a comeback now, and the score chart stops starting at zero — 2026-09-08

The four charts on the landing page are built by the extension's own option builders off one
hand-written game. That game was Boston and New York trading baskets inside four points for its
whole history, so the score chart drew two lines on top of each other, and the win probability,
derived as `0.5 + margin * 0.045`, never left a band between 32 and 59 percent. Two charts selling
a product that finds the exciting game, drawn from a game with nothing in it.

### The history

New York is down fifteen at the start of the third, closes the whole thing over two quarters, goes
ahead by one with six minutes left and gets tied again with three to play. The lines start fifteen
points apart, cross once and meet. Replayed through the real scorer that is 8, 9, 19, 58, 84, 96,
100, 100 against the old 27, 29, 41, 44, 80, 81, 66, 86, so the PowerScore chart climbs instead of
wandering, and the yellow lead-change bar shows up in the components chart for the first time.

### Win probability is written out rather than derived

A margin formula tracks the score chart line for line, which is the one thing a second chart should
not do, and it stays near the middle of the axis because the margin is small. The eight values are
literals now: 10, 7, 12, 20, 33, 44, 60, 50. The line barely moves while the lead holds, swings once
the comeback is real, and crosses fifty where the two scores cross. 53 points of travel against the
old 27.

### A basketball score chart that starts at zero throws away most of its height

`buildTeamScoreOption` inherited the default value axis, which anchors at zero. The history is a
rolling window, so its first point is already in the sixties and everything under that is empty
grid. A fifteen-point gap was 15% of the plot height. On a 60 to 100 axis it is 37%.

`scale: true` goes on that axis and not on the PowerScore chart above it, which carries an area
fill, and an area that does not start at zero misstates its own size.

This one reaches the extension, because both apps read the same builder. That is the point. The
popup has drawn the same squashed chart on every basketball game it has ever shown.

### The demo clock ran past the end of regulation and wrapped

`clockAt` stepped four minutes of game clock a poll, and eight polls at four minutes is 28 minutes
across two twelve-minute quarters. Past the sixth poll the modulo wrapped the clock back to 12:00,
so the late-game signal read 25, then 3, then 14, and the PowerScore chart dipped in the middle for
a reason nothing in the scores supports. Three minutes a poll fits all eight inside the two quarters
and lands the last one at 3:00 in the fourth, which is roughly where the card already said the game
was.

The wall clock between polls stays at four minutes. A game clock that runs slower than real time is
what actually happens.

## The wrap screen's charts can actually draw, and eleven other things a review found — 2026-09-08

A review pass over the four entries below, which found twelve things and a tail of smaller ones. Two
were features that could not do what they said at all. The rest run from a contrast failure on the
one screen built to check contrast, through a set of soccer column headings the sport cannot produce,
down to a hex value, a rounding guard and a `1` that should have been a `2` — plus six assertions that
were passing for the wrong reason, which is the part worth reading if you only read one section.

### The charts were gated on a history the background threw away

`coversWholeGame` asks for the first snapshot inside the first tenth of the game and the last one
past nine tenths of it, which together require the retained history to **span at least 0.8 of the
sport's estimated length**. Both history maps were trimmed on every poll to the scorer's rolling
per-sport window, which caps that span at minutes:

| sport | window | span the gate needs | short by |
| --- | --- | --- | --- |
| basketball | 5m | 120m | 115m |
| baseball | 12m | 156m | 144m |
| football | 12m | 168m | 156m |
| softball | 12m | 120m | 108m |
| hockey | 16m | 132m | 116m |
| soccer | 20m | 120m | 100m |

Unsatisfiable in every sport by an order of magnitude, so the PowerScore chart, the score-trend
chart and the components chart were **absent from every wrap screen there has ever been**. Only the
win-probability line drew, and that is deliberately exempt because ESPN builds it from the full
play-by-play.

The window is not the thing that was wrong. `computePowerScore` reads momentum, lead changes and
comeback out of that array, and widening it changes every signal the switcher acts on. So the
snapshots inside the window are kept exactly as they arrive and **everything older is thinned rather
than dropped** — one sample every two minutes, which is about 100 samples across a football game's
first three hours and more than 300px of chart can resolve anyway. The scorer is handed the window
slice, which is byte-identical to what the old trim left behind.

**The tail is only kept when Keep finished games is on**, which is off by default. Both maps are
written to session storage on every poll and a busy Saturday is thirty live games at once, so this
is not a cost to hand to somebody who cannot see what it buys — and with the setting off a finished
game leaves the list entirely, so there is no wrap screen to draw it on. Turning the setting on
mid-game means that game's tail starts from then and its charts correctly decline to draw.

Two things fell out of that. The cap can no longer be met by dropping the oldest snapshots, because
the oldest snapshot is the end the gate measures from — it thins the already-coarse tail further
instead, spending resolution rather than span. And `hydrateHistoryMaps` was re-applying a window on
every worker wake, which MV3 does constantly; it takes the persisted series as-is now, since what
was written out was already thinned.

**A live screen is unchanged.** `chartHistory` hands a finished game the whole series and a live one
the window it has always drawn. Widening a running chart is a separate decision from making the
wrap's charts possible at all, and the live screen's partial line is the honest shape of a game
that is only partly played.

The 16 tests that missed this were not wrong, they were incomplete. `wrapCoverage.test.ts` builds
its histories as fractions of the sport's own length, which is the right shape for a unit test of a
predicate and says nothing about whether that shape is reachable. That is asserted end to end now:
a whole basketball game is walked through the real polling at two-minute intervals and what survives
is handed to `coversWholeGame`. It was confirmed failing against the rolling window first, along
with the two assertions about where the retained series begins and ends.

### A game that went final while you were watching disappeared at midnight

`retainedFinalGames` was written in exactly two places, both inside `refreshSlate` — which runs at
worker startup and when a preference changes, and **never on a timer**. Scheduled polling is
`tickLeague`, which read the retained list and never added to it.

So a game that went final mid-session was never recorded as retained. It stayed on screen only
because the dateless scoreboard kept returning it, and the dateless scoreboard carries the current
Eastern day and nothing else. At Eastern midnight it left the payload and the game vanished at a
couple of hours old against a promised 24 — reappearing only if the service worker happened to tear
down and restart, which re-runs `refreshSlate` and recovers it through the range query. The
behaviour was not merely wrong, it was nondeterministic.

Fresh `post` games are merged into the retained list after every fetch now, on both poll paths,
deduped by id with the fresh copy winning so a score corrected after the whistle is the one that
sticks. `tickLeague` also rebuilds **every** league's finals from the retained list rather than
carrying other leagues' through untouched, so one league's poll re-checks the whole set's retention
instead of each league only ageing out when its own turn comes round.

Every one of the eight tests on this feature drove `GET_STATE` with `forceRefresh`, which routes
through `tick()`. `tickLeague` was never exercised, before or after. It is now, including the day
rollover, and the new cases assert a fetch actually happened rather than passing by virtue of no
poll having run — the poll interval is adaptive, so they step forward until one lands instead of
hardcoding a delay a scoring change would silently invalidate.

### One day back did not cover a 24-hour window

The range query reached back one local day, under a comment saying a game inside the window started
at most about 27 hours ago, "which is yesterday or today in local terms." The second clause is
false: 27 hours before 00:30 is 21:30 **two** local days earlier. Retention runs 24 hours past the
estimated wrap, so the maximum age since kickoff is 26.5 hours for soccer, basketball and softball
and 27.5 for football — which cost a 22:10 first pitch about an hour and a half off its tail and a
22:30 college football kick about two.

It reaches back two days now. The test that pinned the old behaviour asserted the opening date was
the plain one minus one, which is both the expression under test and wrong across the start of a
month; it reads literal dates under a pinned clock instead, and crosses into September from the 1st
of October.

### The dimmed score was not readable, on the one screen built to check that

`.game-score-value.is-loser` was `#9aa4b0` in two files, hardcoded in both. Measured, that is
**2.33:1** on the final card's `#f4f6f8` and **2.53:1** on the white plate the detail hero uses. A
2.1rem semibold score is large text, which wants 3:1 — the exact bar the colour helpers in the same
branch are built around.

`$score-loser-color` is `#7c8794`, which reaches 3.37:1 and 3.65:1, and it is one variable read by
both files rather than the same hex written twice. The test pinned the literal `rgb(154, 164, 176)`
with no contrast assertion anywhere near it; there is one now, reading the plate off the card rather
than hardcoding it, so a card whose background moves cannot leave the ink measured against a colour
it no longer sits on.

### Scaling a channel cannot lift a colour whose channel is already 255

`brighten` multiplies every channel by a common factor, which is what preserves the hue that mixing
toward white drains. It has a ceiling nobody had noticed: `Math.round(0 * 1.18)` is 0 and 255 stays
255, so a pure blue runs the entire 24-step climb and comes back **byte-identical**, at 2.31:1
against a 3:1 floor. `#000080`, `#00008B` and anything else whose secondary channels are 3 or less
land in the same place.

No shipped team colour is affected — the five league navies the scaling was written for all have
secondary channels of 12 or more and finish the climb with room to spare. But the reason it got
through is worth more than the bug: the lightening tests asserted only that the result differed from
the input and that the hue survived within five degrees, while the darkening direction had a
contrast test. `#0000ff` failed even the weak assertion, since it returns unchanged.

A colour that cannot clear the floor by scaling now gives up some of its saturation rather than
staying unreadable, mixing toward white in 12% steps until it clears. A pure blue lands on `#5252ff`
at 240° — the hue it started at — and the five navies are untouched, which has its own test. The
mirror of the card's contrast assertion is in place, over eleven colours including the four that
used to come back failing.

### Soccer's extra time is not an overtime, and a shootout is not a second one

`regularPeriods` is 2 for soccer, so a match that went to extra time rendered its line score columns
as `1 | 2 | OT | 2OT`, and one decided on penalties added a fifth reading `3OT`. Neither is something
the sport can produce.

ESPN's soccer linescores are positionally fixed — `[1H, 2H, ET1, ET2, PENS]`, two entries at full
time, four at AET, five after penalties — so what a column means is its index. Slicing that list also
gets a match live in the first period of extra time right for free. Verified against four finished
2026 World Cup knockouts and an MLS Round One tie.

Hockey's fifth entry is genuinely ambiguous: an awarded shootout goal in the regular season, a
second overtime in the playoffs. Shootouts cannot happen in the playoffs, so ESPN's own `Final/SO`
suffix — already parsed onto the game for the finished card — is what separates them.

The rule is keyed on the **sport** rather than on `periodFormat`, because `halves` over two regular
periods also describes college basketball, whose fifth column really is an overtime.

Two things deliberately not done. **MLS Round One goes from a 90-minute draw straight to penalties**
and ESPN still ships five entries with the two extra-time slots zero-filled; those phantom columns
are drawn rather than detected, because from the line score alone they are identical to a genuinely
scoreless extra time, which is the commoner case and the one that must not be erased. And **`AET` is
nowhere in the product**: it is a result qualifier, and it is the literal value of `status.type.detail`
on a finished extra-time match, not a period name.

Four keys across all twelve locales, and eight of them print their own abbreviation rather than the
English one. The line that emerged is that **period and result labels go native while stat
abbreviations stay English**: `OT` is a genuine international loan in the sports that use it, whereas
soccer is the sport every one of these languages actually covers, so each has a settled form. French
even distinguishes the two shootouts — `TAB` for soccer's *tirs au but*, `TB` for hockey's *tirs de
barrage*. German penalties are `i.E.` (*im Elfmeterschießen*, the shootout) rather than `n.E.` (*nach*,
the result). The hockey `SO` column stays English in eleven of twelve, because it is the row NHL.com
itself prints and German, Japanese, Korean and Chinese hockey coverage carry it unchanged.

### The soccer demo drew each team's numbers under the other team's crest

`mockGames` had Philadelphia Union at id `190` and the Red Bulls at `183`, which is the pair inverted
and one id that belongs to neither club. The logo filenames in that same entry already carried ESPN's
real ones, `10739` and `190`, which is what settled which side was wrong. Soccer sends no
`boxscore.players`, so the line score and the comparison table are the whole box score, and the whole
thing was mirrored: the Red Bulls' crest and wash beside the label PHI carrying Philadelphia's goals.

No test could have caught it, because the spec declared its own copies of the demo games with ids
matching the fixture rather than matching what ships. It reads them out of `MockGameSimulator` now,
overriding only the crest for a data URI that needs no network, so the two cannot drift again. Four
assertions changed value on the way past, all of them from a spec team colour to the shipped one —
Pittsburgh's real `#CFC493` reaches 1.68:1 on the card and clamps to a dark bronze.

### A game whose players have not arrived yet said whose numbers it was showing

A side parses as null when every category comes back with an empty `athletes` array, which is the
opening minutes of a football game. The tab strip only draws when both sides exist, so the block
rendered the home team's tables with the away tab still selected and nothing on screen naming either
team.

It names the side it actually renders now, with the crest and coloured abbreviation the line score
rows already use, and the two share one component rather than two copies of the same markup.
`pickBySide` also learned elimination: a players block carries no `homeAway`, so an id match is its
only direct route, and with two blocks and one of them placed there is exactly one answer for the
other. That matters because the id being compared is ESPN's *competitor* id against its *team* id,
which coincide in every league visible today and would otherwise take both sides down together.

### The tab strip honours the contract it announces

`role='tab'` tells a screen reader "tab, 1 of 2", which promises a panel to move to and arrow keys to
move with, and neither existed. The sections sit in a `role='tabpanel'` both tabs point at, the
selected tab is the strip's only tab stop, and Left, Right, Home and End move selection and focus
together. The ids are built from the game id rather than from `useId`, whose output contains
characters no `#id` selector can hold. This is the repo's first tab strip, so it sets the precedent.

### DNP was read off free text rather than the boolean beside it

ESPN sends `didNotPlay: true` with no `reason` often enough that it is the ordinary case, and both
readers branched on the reason string: the row drew a line of empty stat cells instead of DNP, and
the player sorted among the bench rather than last. That is the exact trap the comment three lines
above the basketball sort already warned about. The flag is on the parsed athlete now and both
readers use it.

### The tab matcher was the one reader of `startTime` that was not behind a pre-game check

Populating `startTime` for every state was correct, and nine of its ten production readers are
gated on the game being pre-game. The tenth is the tab matcher's tiebreak, which used to read
`MAX_SAFE_INTEGER` for every live game and fall through to comparing ids. It now sorts two
equally-scored live games by kickoff, which is a better answer and an untested behaviour change that
both a code comment and the changelog said could not happen. The comment says what is actually true,
and the tiebreak has a test built from two copies of the same fixture with their ids ordered against
their kickoffs on purpose.

Worth stating plainly, because it was the concern the score led with: `suggestTabAssignments`
filters to live and scheduled games, so a finished game can never be suggested for a tab.

### Filipino marks plurality with a word, not with an `-s`

`fil.box.onGoal` had shipped as a byte-identical copy of `fil.box.shotsOnGoal`, which put the
hockey row's longer string into the soccer row that sits in the narrowest column on the screen. The
soccer row reads "On goal" now and the hockey row "Mga shot sa goal".

The rest of the namespace was 65% English against the file's own 12% baseline across its other 478
multi-word strings, and the correction is not that the English nouns were wrong. Philippine
broadcast genuinely says rebound, corner and power play, and there is no Filipino ice hockey
vocabulary at all — the register decision the file already made is right. What was wrong is narrower:
Filipino marks plurality with the free morpheme *mga* and never double-marks, so a plural-count
label is *Mga* plus the **singular** English noun. That shape was already in the file before this
namespace existed. Thirty-five keys took it or a native structure the file already owned, and the
namespace now sits at exactly the file's established rate.

Three multi-word keys are deliberate English holds rather than oversights. `thirdDown` names a
singular down against a conversion ratio, so pluralising it would misdescribe the row. `faceoffPct`
is a rate, where *mga* would assert a count that is not there. And "On goal" is the phrase Philippine
football commentary uses and the shortest correct option for the column it sits in.

### The rest of the pass

**The column heads carry ESPN's own descriptions.** They were parsed and never read. As a `title`
they are the only thing that can tell a reader that SACKS under passing means sacks suffered while
SACKS under defensive means sacks recorded — the same abbreviation on two categories that can be on
screen at once. Untranslated, like every other string we pass through from ESPN.

**A category ESPN sends no display labels for is no longer dropped.** Columns are selected by its
stable `keys` and every heading comes from our own catalog, so `keys.length` was always the condition
that mattered.

**An expanded category collapses again when the team switches.** The reader asked for all of Dallas's
defenders, not for however many Philadelphia has.

**Four parser sites dereferenced array elements with no null check**, unlike the team-stats reader
beside them, so `"athletes": [null]` threw. Containment is asymmetric and that is why it matters: the
network path parses inside a `catch` and degrades to an empty box score, and the demo path parses
synchronously in an effect, where a throw reaches the top-level error boundary and blanks the whole
popup.

**The finished demo game showed a live, mid-inning box score.** mock-20 is Final in ten innings and
it borrowed the fixture that stops in the top of the eighth, so the wrap screen drew Final/10 over an
eight-inning line score with a blank bottom of the 8th. It has its own now: both rows the full ten,
no unplayed half-inning, and every total summing to the row above it.

**`#f4f6f8`'s luminance is 0.9192, not the 0.8977 a comment claimed**, which put the 3:1 ceiling at
0.2731 rather than the 0.2659 in the code. The value was stricter than it needed to be, so nothing
rendered wrong — and it is gone anyway, along with the defaulted `ceiling` parameter, because the
large-score caller was removed in the same branch and the only live call site passes the small-text
ceiling explicitly.

**`$table-group-separator-color` was never set.** No user-visible defect: Bootstrap 5.3 applies the
separator only through the opt-in `.table-group-divider` class, which appears nowhere in our source,
and the automatic rule above every table group the changelog described is 5.1 and 5.2 behaviour. It
is set to the same `#d1d5db` the tables' borders use, as a guard against the first component to opt
in — left at `currentcolor` that would draw the table's own `#111827` as a heavy bar across a light
card.

**The demo box scores are a dynamic import.** Twenty-two kilobytes of fixtures no real game can
reach were being parsed on every popup open, behind a branch only a `mock-` id enters. The popup
chunk goes from 1,141,390 bytes to 1,128,148 and the fixtures move to a chunk demo mode requests for
itself. Every other piece of demo state is still set synchronously, so only the box score arrives
late, and it is dropped if the screen is torn down before the import lands.

**European Portuguese uses one word for two things on the same screen.** *Defesas* is both a defender
and a goalkeeper's save, so the pt_PT box score labelled the defencemen table and the goaltending row
identically. It reads *Defensores* now, which is the one option that stays unambiguous without moving
the clash onto the football defence section. The rest of pt_PT's position vocabulary is left alone:
*Avançados* and *Guarda-redes* are the *hóquei em patins* terms, which is the hockey Portugal actually
covers, and they are deliberately European rather than Brazilian.

### Assertions that could not fail

Six of them, and they clustered on exactly the two features that turned out broken.

**Three compared `scrollWidth` against `clientWidth` on `.game-info-value`** to prove a figure keeps
one line. That element carries `overflow-wrap: anywhere` and no `white-space: nowrap`, so it wraps
rather than overflowing and horizontal overflow is impossible whatever the layout does. All three
held with the value broken onto two lines, confirmed by squeezing the column to 24px and by swapping
the attendance figure for a 54-character number. The two figures read the inline span's client rects
now, one per line it occupies. The venue block is measured intrinsically off an absolutely positioned
clone, the way the label column beside it already was, because it legitimately stacks two lines and a
client-rect count says nothing about a block box.

**One read `borderTopColor` off a `tbody`** to prove the group separator was themed, on an element
Reboot leaves at `border-width: 0`. It asserts the absence now, with a note saying why.

**One looked for ESPN's `On Target %` in the comparison labels**, a string no locale file contains
and which every label renders through the translator — so the derived column could have arrived under
our own label and the assertion would still have passed. It pins the whole label list in order
instead, which also covers the ordering rule and the conditional penalty rows.

**And the nine-inning fit was mounted bare**, measuring the table against 320px rather than the 305
the shell actually gets. It measures 263px now, the figure the source comments always claimed, with
the twelve numeric columns fitting to the pixel and nothing to spare.

The line score's header row had no locale coverage at all, which is where the four new period keys
land and which is the tightest row in the product. Two tests measure it as a whole row at the
shipping width — a soccer match that went to penalties, and a hockey shootout — in all twelve
locales, asserting per-cell clipping rather than table width, because the table is fixed-layout and a
wide heading overflows its cell instead of widening anything. Every locale fits, with about 34px a
column out of 263.

Measuring the row rather than substituting one locale's label into a column the browser sized for
English is deliberate. That mistake is recorded twice below for producing the same false positive
both times.

## The chart stops turning navy into grey, and the finished card says Final/OT — 2026-09-07

A pass over the cards from the entry below, and one fix that reaches every detail screen in the
product rather than only the finished ones.

### Mixing a colour toward white does not lighten it, it drains it

Chart lines need 3:1 against the `#0d1117` background, which puts the boundary at luminance 0.1164
and leaves most of the league's primaries under it. They were lifted by mixing 48% toward white,
which adds the same amount to all three channels — and adding equally to three unequal channels
pulls them together, which is the definition of desaturating. Mets navy came out `#7a92b6`, Yankees
navy `#818d9c`, Packers green `#8b9794`. Three different teams, three greys.

Scaling the channels by a common factor leaves the ratios between them, and so the hue, exactly
where they were. `#002D72` now reaches the bar at `#0057de` — 216° before and 216° after, a blue
that is still a blue. The climb is a loop of 18% steps rather than an inverted transfer function,
because luminance is not linear in the scale factor and twelve iterations of arithmetic are cheaper
to read than the algebra that avoids them.

A pure black is the one colour with no hue to preserve, so it still falls back to a grey. That is
the honest answer for it rather than a special case.

One existing test pinned the old output. Its expectation moved from `#7ab1a3` to `#007c5c`; both
clear 3:1, and only one of them is still green.

### Team colour on the scores, built and then taken back off

The finished card gave up its team-colour rails to read as a record rather than an option, which
left it with no colour at all — so the scores took it instead, each in its own team's hex, darkened
where a primary was too light for the plate and receded toward the card rather than toward grey on
the losing side.

It is not in the product. Rendered at 320px it reads as two unrelated inks sitting next to each
other rather than as one scoreline, and the winner's emphasis has to compete with the hue instead
of being the only thing the eye picks up. The scoreline is back to weight plus a receded grey, which
is what every scoreboard prints and what the entry below shipped.

Recorded because the two helpers it needed are gone with it. `recedeTowardCard` and
`resolveTeamCardTextPair` are deleted rather than left sitting unused, and so is the `style` prop
the scores needed on `FlipScore` — both that file and its test stub are byte-identical to what they
were before. What survives is `resolveReadableCardTextColor`, the light-plate mirror of the chart
climb above, which the box score's team abbreviations now use at the stricter 4.5:1 small-text bar.

### The numbers were a different shape from the live card's

They were plain spans. The live card puts its scores through `FlipScore`, which wraps them in an
`overflow: hidden` inline-block of exactly `1em` — so side by side in the list, two cards two rows
apart set the same figures in measurably different boxes. The finished card uses `FlipScore` too
now. It never animates, because the value never changes; what it does is measure identically.

**The colour work above found a hole in the harness on its way past.** The component config replaces
`./flipScore` with a stub, and that stub forwarded `className` but not `style` — so every assertion
about a team-coloured score was reading the stub's default ink and passing against a card with no
colour on it at all. Six of them. The colour is gone now and so is the prop, but the shape of the
mistake is worth keeping: a stub that drops a prop turns every assertion about that prop into a
tautology, silently and in the passing direction.

### Final, Final/OT, Final/10, Final/SO

ESPN's own `status.type.shortDetail` already carries this: `Final`, `Final/10`, `Final/OT`,
`Final/SO`, `Final/3OT`, all confirmed against four leagues of live scoreboards. The suffix after the
slash is stored as-is and composed with the translated word before it, so the card reads FINAL/3OT
in every locale without the suffix needing translating — it is a token rather than a word.

Deriving it from the period was the alternative and it cannot produce `SO`. A shootout is a period
number in our data and a different thing entirely on a scorebug.

The extra-innings line under the score is gone with it. The status label says `Final/10`, so a
second line saying `Inn 10` was the same fact twice.

### The rest of the pass

**The broadcast line is off the finished card.** A game you cannot watch any more has no channel
worth naming. The venue stays, because where it was played is still true.

**The attendance is off the finished card**, and stays on the wrap where there is room to label it.

**Your teams sort to the top of the Final section**, across the whole section rather than within
each league group — the result you came looking for is your team's, and it should not be a league
header down.

### A finish time, where one honestly exists

There is no completion timestamp anywhere in ESPN's scoreboard. The summary endpoint does carry
`gameInfo.gameDuration` — "3:14", hours and minutes — which makes the actual finish knowable as the
published start plus the published length. That is one request per game, so it is reachable on the
wrap screen and not for twenty cards in a list.

So the wrap gets an **Ended** row and the cards get no time at all. The alternative was printing
start-plus-the-sport's-typical-length on every card, which is the estimate the retention window
already uses — fine for deciding whether to keep a game for another hour, and not fine as a time
printed next to a final score.

`gameDuration` is baseball-only among the leagues sampled, so the row is absent on the other sports
rather than blank. Anything that is not `h:mm` is ignored rather than guessed at.

### Coverage

9 colour tests, five of them the five teams that came back grey, each asserting the hue survives
within five degrees — integer channel rounding shifts it by one or two, and the bar is that the
colour is still the colour rather than that the arithmetic is exact.

6 on ESPN's Final designations, every value transcribed off a live scoreboard, including a live
game whose `shortDetail` reads `OT 2:41` and must not be stored as a final designation.

14 on the duration parse, including the five formats that are not durations. 5 on the finish-time
row. 37 component tests on the finished card and the wrap, up from 33.

The scoreline's is pinned to both computed inks rather than to the class names, because the class
name was what passed while the weight was silently losing to `!important` in the entry below. One
more asserts the scores take no hue at all, so the decision above is a thing the suite knows about
rather than something the next person reads as an oversight.

Two tests were rewritten after failing for reasons that had nothing to do with the code. One
compared a semibold loser's width against a bold live score and found them 1.2px apart, which is
the weight difference doing exactly its job; it measures the winner now. The other nested a second
`cy.mount` inside a `.then`, which detaches the nodes the surrounding chain still holds — a detached
node reports an empty computed style rather than failing loudly, and this repo has been caught by it
before.

## A game that ends stops disappearing, and says how many people were there — 2026-09-07

Turn on **Keep finished games** and a game that goes final leaves the live section for one of its
own instead of vanishing from the extension entirely. It stays reachable for 24 hours. Off — which
is the default — nothing about today moves.

### The attendance figure was never on the endpoint we thought it was

The issue found `gameInfo.attendance` on the summary response and proposed threading it down from
`useSummaryData`. It is also on the **scoreboard**, on the competition, in the payload the
background already fetches for every game on the slate. Same number: ATL @ PHI on 2026-09-06 reads
`42793` from both.

So it comes through `parseEvent` into `Game` and costs nothing — no prop threading, no dependency
on a screen having fetched its summary, and it works in demo mode for free.

The gate is not what the issue described either. On the summary endpoint the key is absent until a
game is final; **on the scoreboard the key is always there and reads `0`** until the moment ESPN
flips the status. Sixteen finished MLB games carried real figures and the two live ones carried
zero, on the same request. So a falsy figure means "not announced yet" rather than an empty
stadium, and `attendance > 0` is the whole condition — a `status === 'post'` check beside it could
only ever agree.

The row sits under the venue rather than beside the score, because how many people came is a fact
about the building. It rode the finished card's venue line for a while too; the entry above takes it
back off, leaving the wrap as the only place it appears. `.game-info-label` had to widen from 2.9rem
to 3.6rem: it was sized when Watch,
Venue and Line were the whole list, and it wraps anything past about ten characters. Attendance is
ten in English and eleven in Portuguese. The label-column test already measured every locale's
labels against that column, so adding one key to its list covered all twelve — and confirmed 3.6rem
is enough for the widest of them.

### ESPN publishes no completion timestamp, so 24 hours has to be measured from the start

A competition carries `date` and `startDate` and nothing else. There is no field anywhere saying
when a game ended.

Recording the moment we first see a game go final was the obvious answer and is worse than it
looks: MV3 tears the worker down constantly, so it would need `storage.local` to survive a restart,
and a browser opened in the morning would stamp every one of yesterday's games as having just
finished. It needs a fallback estimate for exactly the case it is meant to handle.

So the estimate is the whole mechanism. A game wrapped at its start plus how long the sport
actually takes — `sportWrapAllowanceMs`, six broadcast-window lengths rather than playing times,
because an NFL game is sixty minutes of clock and about three and a half hours of television. They
are deliberately generous: over-estimating a wrap keeps a game slightly longer, which is harmless,
while under-estimating drops it out from under somebody reading it. The error is under an hour on a
24-hour window, it needs no storage, it survives every teardown, and it is a pure function of two
arguments.

**`startTime` did not exist on a finished game.** `parseEvent` set it only for `pre`, so the anchor
the whole window rests on was being discarded on every live and final game we have ever parsed. It
is populated for every state now. Every existing reader — the countdown, the day grouping, the
upcoming cutoff, the pre-game card — is already behind a pre-game check, so nothing that used to
see undefined now sees a date it would misread. Three tests pinned the old behaviour and asserted
an implementation detail rather than anything a user could see; they asserted the field is there
now.

### The dateless scoreboard only has today, and the per-league polls use it

Finished games arrive on the same payload as live ones, so the fix is two lines: the
`status !== 'post'` filter at `apiClient.ts:531` and `:564` becomes conditional on an
`includeFinal` option that defaults to `false`, exactly the shape `includeUpcoming` and
`upcomingDays` already have on the same function. Every other consumer of the package is
byte-identical.

Two things that were not two lines.

**The range query had to reach backwards.** ESPN's dateless scoreboard carries the current Eastern
day and nothing else, so a game that finished at 11pm last night is unreachable at 10am today
unless it is asked for by name. `buildUpcomingDatesRangeQuery` takes a `pastDays` now and opens the
window one local day earlier when finals are wanted. It goes through the same local-day-to-Eastern
translation the forward end already used, so a Tokyo viewer reaches back from their own yesterday.

**And the per-league polls would have thrown the results away.** `tickLeague` fetches one league
from the dateless scoreboard and replaces that league's games wholesale — which is why a
`upcomingGames` list already existed to be carried across each tick by hand. Finals need the same
treatment, so `retainedFinalGames` sits beside it and `refreshUpcomingGames` became `refreshSlate`,
serving both prefs rather than being gated on `showUpcomingGames` alone.

The retention window is re-checked on every merge rather than only on refetch, so a game ages out
on its own schedule instead of waiting for the next slate fetch to notice. That has a test: nine
hours pass, the poll still cannot see the game, and nothing but the retention check can remove it.

### The switcher needed no guard at all

`background.ts` already narrows to `status === 'in'` before scoring, before picking a switch
target, and before counting live games. Finals flow past all three untouched, which is why a
finished game is never scored and can never be switched to. The bounce-back in `app.tsx` also
handles itself: it boots you out when the selected game leaves the list, and the game no longer
leaves — so a game finishing while you are watching it settles into its final state under you.

### The card gives up everything you cannot act on

No tab dropdown, no PowerScore bar, no clock, no live dot, no base diamond, no down and distance.
No team-colour rails and no white plate either — it takes a flat `#f4f6f8` so it reads as a record
rather than an option.

What is left is the result, and **the winner carries the weight while the loser is dimmed**, which
is the convention every scoreboard already uses and the only thing on the card that says who won
without a word. A draw dims neither. A shootout dims neither and lets the penalties line decide it.

That took two goes. Bootstrap's `.fw-bold` is `!important`, so a `font-weight` on `.is-loser` in
this project's own stylesheet was dead on arrival — the colour changed and the weight did not. The
weight is a utility on the element now. A test measuring both computed values caught it; one
asserting the class name would not have.

An extra-period label only appears when the game actually went past regulation, since the status
label already reads Final and most cards would otherwise carry a line saying so twice.

### No PowerScore anywhere on the wrap

Not on the card and not on the detail screen. The number is a live judgement about what to watch
next, and a game that is over is not a candidate — printing its last value reads as a verdict on
the game rather than as the switching signal it actually was. The boost input goes with it, since
it can only change a score nothing will ever compute again.

What the wrap does carry is the box score, which #113 landed while this was being drawn: the line
score with its R-H-E, the team comparison, and both sides' player tables. A finished game is the
state it reads best in.

**The charts only draw when they cover the whole game.** History exists for the minutes the service
worker happened to be polling, so a game watched from the fourth quarter carries a stub rather than
nothing — which is exactly the case a length check misses. `coversWholeGame` requires the first
snapshot inside the first tenth of the sport's estimated length and the last one past nine tenths of
it, so the rule scales with the sport rather than needing a threshold per league. The
win-probability line is exempt: ESPN builds it from the full play-by-play, so it either arrives
complete or does not arrive. A live screen is untouched — a partial line is the honest shape of a
game that is only partly played.

### Placement, and the one that was a judgement call

Final sits **below** Up Next and below both live sections. Results are the one section you are never
deciding anything from.

The empty state had to learn about them. A slate of nothing but results is not an empty slate, and
"no games right now" would otherwise have sat above a section full of cards.

### Coverage

12 tests on the retention window, nine of them written out as literal instants rather than
recomputed from the arithmetic under test — the exact 24-hour boundary, one millisecond past it, a
game ESPN called final before its allowance was up, and the window measured under three time zones
to prove it does not move with the viewer.

11 on the fetch, including the gate off by default, off explicitly, the range path applying the same
gate as the dateless one, a game arriving from both calls being returned once, and the `dates=`
parameter read back off the URL to confirm it reaches back exactly one day and no further.

5 on the backwards range, crossing the start of a month and the start of a year. 13 on the chart
rule, including both edges of both fractions and an assertion that the answer does not depend on
when it is asked. 5 on the sort. 8 on the background, covering a final surviving a poll that no
longer returns it, ageing out with no refetch involved, and never being scored.

27 component tests measuring what only a browser can answer: the loser's computed weight and colour
against the winner's, the final card's background against a live one's, the Final section's position
against the two above it, and the status label, the section heading and the setting's label each
measured on one line at 320px in all twelve locales.

Three of those are absences — no PowerScore, no boost input, no tab dropdown — so there is a fourth
asserting the live screen has all of them. An absence test is worth nothing until the selector is
shown to match something. Writing that one caught a real problem: the first version looked for
`.game-detail-breakdown`, which is not a class this project has, and passed for that reason alone.

The same class of thing turned up in the existing suite. A test asserting a finished game's
statistical leaders are stripped was running against a game the fetch filter had already removed, so
`find` returned undefined and the assertion held whether the leaders were stripped or not.
`includeFinal` makes that game reachable, so it is a real test now.

## A live game shows its box score, out of a response we were already fetching — 2026-09-07

Once a game has started, the detail screen carries the line score, both teams' totals side by side,
and one team's full player box score at a time. Nothing in ArenaSwap had ever shown a stat line
before; you could see how exciting a game was and not who was making it that way.

### It costs no requests at all

`shouldFetchSummary` already returns true for every live and finished game, in every sport — the
detail screen fetches `/summary` for the win-probability line, the series dots and the record
fallback. `boxscore` and `header.competitions[].competitors[].linescores` were sitting in that same
response, unread, on every poll.

The `/summary` schema in `packages/core` is not what was hiding them. That schema declares only
`winprobability` and belongs to the background scorer; the popup's own fetch has never used it and
reads `res.json()` raw, the same way `parseTeamRecords` reads `header`. So the strip-mode trap that
ate the venue address, `situation.possession` and the whole pre-game competitor block does not apply
on this path, and no schema had to widen. `boxScoreParse.ts` declares the shapes it reads as plain
interfaces beside the existing ones.

The cadence is unchanged too: the effect depends on `[gameId, league, status]`, so a box score is
fetched once when you open a game, exactly like the win-probability chart it sits above. Reopening
the screen is what refreshes it.

### A condensed box score, not a full one with the right-hand side cut off

The card has about 263px, which is a truncated name column and at most six numbers. That is the
whole reason anything is cut, and it changes which columns are correct rather than just how many.

Basketball's full order is `MIN | FG 3PT FT | REB AST STL BLK TO PF | PTS`. Truncating it at six
gives a basketball table with no points column. The condensed convention — the one every ticker and
game-leaders widget uses — is PTS-REB-AST straight after MIN, so that is the order here, with FG and
3PT last because they are a shooting pair and the widest strings on the row.

Baseball leads with `hits-atBats` rather than AB and H as separate columns, because "1-3" is how a
fan says it out loud and collapsing the two buys the slot that HR gets. Pitching is the newspaper
line unmodified — IP H R ER BB K. R and ER are usually the same number and the pair is habitual
enough that dropping one is noticed.

Hockey keeps ESPN's split between forwards and defensemen instead of merging them into one skaters
table. The position group is what makes +/- and time on ice legible — a defenseman at 24:00 is a
normal night and a forward at 24:00 is a workhorse — and a merged table needs a POS column, which
spends one of six numeric slots saying what a section heading says for nothing.

**Football drops five of its ten categories**: kicking, punting, both return types and fumbles. A
kicker going 3-for-3 is nine points the reader is already looking at on the scoreboard directly
above; what a kicking table adds over that is misses, and misses are rare. A section that is
uninformative in most games teaches the reader to scroll past the whole block, which is worse than
the missing rows. `interceptions` stays, because the parser drops a category with no athletes in it,
so it costs a heading only in the games where somebody actually picked a pass off.

Defense stays as the fourth, and it is the one that earns its place least obviously: it is the only
thing on the screen that answers who is wrecking a 10-7 game from the other side of the ball.

### One team at a time

Both teams stacked runs to 34 rows for a basketball game before the reader reaches the second one,
so the player tables sit behind a two-tab switcher and open on the away team — which is the order
every convention in every sport lists the two in. The line score and the team totals are outside the
tabs, because both are about the pair.

The long football categories are capped at six rows with an expander rather than being cut. A college
`defensive` array runs past 30 players a side, and nobody scrolls 30 rows of tackles to reach the
next heading. The cap is the component's; `buildSections` hands over every row it parsed.

### The line score carries its teams the way the leader rows do

A pre-game leader row says which team a player belongs to with three things at once: a crest, the
abbreviation set in the team's own colour, and a wash of that colour fading out to the right. A line
score row is the same shape, so it takes the same treatment — crest, coloured abbreviation, and the
wash — and the team-stats column heads take the colour too.

On the line score the wash is doing more than decorating. The two rows *are* the two teams, so it
answers which is which before the reader has parsed either abbreviation, and it fades out by 72% so
the R-H-E totals at the end land on the plain card. `rowWash` moved out of `pregameStats` into
`colorUtils` as `teamRowWash`, since a formula with two callers in two files is how the two drift.

There is no tinted disc under these crests. The disc exists because a navy crest disappears on the
dark popup; these sit on the light `.gd-setup` card, where a bare crest reads fine and a white disc
would be the thing that vanishes. And no accessible name on the crest either — the abbreviation is
immediately beside it, so a second copy is noise to a screen reader.

**The crest costs the innings, which is why the nine-inning fit is a test and not a calculation.**
The team column went from 2.2rem to 3.5rem to hold a 13px crest beside a three-letter abbreviation,
and every rem of that comes out of the twelve numeric columns beside it. A full nine innings plus
R-H-E still lands inside the card, measured with the crests in place.

### Half the league's colours are unreadable as small text on a light card

Printing a team's raw colour as a 9px label is the obvious implementation and it is wrong for about
half the teams we track. The cards are `#f8fafc`, luminance 0.9536, and small text wants 4.5:1 —
which caps the ink at luminance 0.173. **Pittsburgh's and Boston's gold sits at 0.54 and reaches
1.71:1**, which is less text than a suggestion of text. The Phillies' red misses by a hair at 4.37:1,
which is the case an eyeball lets through.

So a label is darkened until it clears, and only as far as it has to be: gold lands on a dark bronze,
a red moves a shade, and a navy already at 12.4:1 is left exactly as it was. Darkened rather than
replaced with grey, because the whole point is that the row reads as that team's colour. The wash
keeps the raw colour — at 16% alpha it is a background rather than text, and no contrast rule
applies to it.

The pre-game leader rows had been printing the same raw colour on the same light card since they
shipped, so they take the clamp too. Fixing only the new block would have left a gold team legible
in one half of the detail screen and not the other, which is the opposite of what this change was
for.

This is the one place the work overlapped another branch. The finished-game card needed the same
climb for its scores, at 3:1 rather than 4.5:1 because those are large and bold, and had already
landed `resolveReadableCardTextColor` with the ceiling hardcoded. Rather than ship a second
near-identical function, that one took a defaulted `ceiling` parameter and both callers read the
same climb — the large-score behaviour is byte-identical.

### The line score, and the half-inning that has not happened

It opens with the scoring by inning, quarter, period or half — which unit is not a per-sport list
somebody has to maintain, it is `leagueConfigMap[league].periodFormat`, which already carries exactly
those four values. Extra innings are numbered, because a 12th inning reads "12"; a fifth quarter does
not read "5", it reads OT.

Baseball is the only sport that sends per-inning `hits` and `errors`, which is what turns the row
into the R-H-E every box score opens with. It is also the only one whose two rows are different
lengths: the away side of a live game has one more half-inning than the home side, and printing a 0
there would claim the home team batted and failed to score. It is blank instead.

`table-layout: fixed` keeps the columns even so a two-digit inning cannot steal room from the ones
beside it. That same property divides the width evenly however many columns there are, so a 13th
inning squeezed all sixteen down to 14px and clipped their digits — the table takes a `min-width`
computed from its own column count now, which makes it overflow into a horizontal scroll instead. A
full nine innings plus R-H-E lands inside the card and never scrolls; both cases have a test.

### Soccer's box score is the one it actually has

There is no `boxscore.players` for soccer at all, in any competition sampled, so the tabbed
one-team-at-a-time shape cannot serve it. It gets the team comparison instead — possession, shots, on
goal, corners, saves, offsides, fouls and both card colours, in the order every match panel prints
them, with the two penalty rows appended only when one of them is not zero.

That table renders for football, basketball and hockey too. Baseball is the exception, and by shape
rather than by a sport list: every other sport sends flat `{ name, label, displayValue }` rows meant
to be printed, and baseball sends a nested tree of about 100 season-shaped stats. Its team line is
already the R-H-E above.

### The stat keys that mean something other than what they say

The reason columns are selected by ESPN's stable `keys` and never by its display `labels`:

- **`SOG` is shootout goals**, not shots on goal, while ESPN's own published NHL glossary defines SOG
  as shots on goal. The column that holds shots on goal is `shotsTotal`, labelled `S`, which is
  NHL.com's own label — so nothing in this codebase is labelled SOG mapping to a key ESPN calls
  something else
- **`YTDG` is year-to-date goals**, a season total sitting inside a game box score. Rendered as G it
  would show somebody a 22-goal night
- **`SOS` / `SOSA` are shootout saves and shootout shots against.** `SHFT` is shifts, not
  short-handed anything. `BS` is shots this player blocked, not his that were blocked
- **`sacks` means opposite things in two categories that can be on screen at once** — sacks suffered
  under `passing`, sacks recorded under `defensive` — and it arrives as `sacks-sackYardsLost` in the
  first and `sacks` in the second. Both are decimals, because a sack splits between two players
- **Baseball's innings-pitched key is `fullInnings.partInnings`**, the one composite ESPN joins with a
  dot instead of a hyphen. A generic hyphen-splitter misses it and a path-style getter tries to walk
  it as a nested property. And "5.2" is five innings and two outs, so nothing does arithmetic on it
- **`skaters` replaces `forwards` and `defenses` rather than supplementing them.** It is empty in
  every game sampled; populated, rendering all three would list every player twice

Two rows are dropped rather than rendered. **A goalie with no time on ice** is the backup, who
arrives all zeros and would print a `.000` save percentage — the most wrong-looking number this
screen could carry. And a **did-not-play** row says DNP rather than a line of zeros; ESPN's reason is
an English string ("COACH'S DECISION") and shipping one untranslated cell into eleven other languages
is worse than not naming the reason.

Nothing anywhere leans on truthiness. A legitimate stat is regularly `0`, `0-0` or `.000`, which is
the same trap that ate a rookie's `0-0` in the pre-game leaders block.

### Four more Bootstrap tokens that render light on a dark theme

This is the third time the same gap has cost something — the Up Next pager and the docs site's
dropdown found it first. The box score is the first `.table` and the first `.nav` in the extension,
so all of these were unset:

- `$table-bg` is `var(--as-body-bg)` and `$table-color` is the emphasis colour, so an unstyled table
  is a `#0d1117` slab with light ink, sitting on a light `.gd-setup` card
- **`$table-group-separator-color` is `currentcolor`**, and Bootstrap draws it at 2px above every
  table group but the first. That is the rule under the header and above a totals row, and
  `currentcolor` here is the table's own `#111827` — a heavy black bar across the card
- `$nav-tabs-link-active-bg` is `var(--as-body-bg)`, which punches a dark hole in the card behind the
  selected team's tab
- `$nav-link-color` is the link colour, and `#F75C03` on `#f8fafc` reaches 3.0:1 — under what an
  unselected tab's label needs as body text

All four are set through the Sass variables rather than re-specified on the component, so the next
table or tab strip in the popup inherits the fix. Each is asserted off the computed style rather than
trusted to the stylesheet, since a stylesheet that looks right and resolves to a light default is the
entire class of bug.

The issue asked for the table on "the existing dark theme". The detail screen's cards are
deliberately light surfaces — `#f8fafc` on `#111827` — so a dark table would have been the one dark
block between two light ones. The `$table-*` overrides are tuned to the cards instead.

### Strings

98 keys in a new `box` namespace across all twelve locales. They split into abbreviations and words,
and the two are translated differently: a column head is the tightest string in the product at about
26px, and takes each language's own official box-score abbreviation where one exists and the English
one where it does not — the rule the pre-game leaders block already set. A team-comparison row has
the full width of the card, so those are words.

The namespace is self-contained rather than reusing the seven leader abbreviations it overlaps.
They are different features, and the two blocks never render on the same screen — one is pre-game
only and the other only exists once a game has started — so there is no visible inconsistency to
trade against the coupling.

### Coverage

60 unit tests. 23 on the parse, every payload transcribed off a live response: the padded half-inning,
the R-H-E sums, both sides resolved by id against a `header` that lists the home team first, the
`homeAway` fallback for synthesized college-hockey ids, a stat only one side reports being dropped
rather than shifting the rows under it, and baseball's nested tree reading as no comparison table.
37 on the column layer, including the batting order with a substitute inside its slot, hockey sorted
by points with `20:14` read as minutes rather than as 20.14, basketball's did-not-play group last,
`skaters` displacing the two categories it duplicates, and the totals row realigned to the columns
kept rather than the ones ESPN sent.

36 component tests measuring what only a browser can answer: nine innings plus R-H-E fitting the card
with the crests in place and thirteen scrolling instead of crushing, no cell past 320px in any of the
five sports, a long name truncating while no stat is clipped, and the four computed colours above.

Eight more on the two colour helpers, and the ones that matter are the contrast assertions: every
team abbreviation on every sport's screen is read back off the computed style and required to clear
4.5:1, and the gold case is pinned on its own since it is the one that fails by a mile. Two of those
assert a colour that already passes comes through untouched, because a clamp that moves a good colour
is its own bug.

**Half of those assertions were worthless as first written**, and the finished-game card branch is
what surfaced it: a Cypress stub there had been forwarding `className` and not `style`, so six colour
assertions were reading the stub's default ink and passing against a card carrying no colour at all.
The same hole was in these — "the abbreviation is not the raw gold" and "the abbreviation clears
4.5:1" are both true of the inherited `#111827` the cell falls back to, so both passed with the
feature deleted. They are pinned to exact computed values now, and each is checked against the
inherited ink as well, so a colour that never arrives fails rather than reads as readable. All four
were run with the inline colours stripped out and confirmed failing; before the change, two of them
passed that way.

The locale measurements are taken as **whole header rows** rather than one label at a time, and the
first attempt got that wrong in a way this changelog has already recorded once: substituting a single
locale's label into a column the browser sized for English measures it against a box it will never
render in. It reported both Chinese locales overflowing. They do not — the columns share the row's
width, and Chinese spells these headings out (安打-打数 against H-AB) at the expense of the name
column, which drops from 155px to 106px and still holds a name. Measured properly, every locale fits
every column set in all four table shapes with nothing overflowing the card, which is also what
confirmed the translators' choice to print what CPBL and CBA actually print rather than falling back
to English.

Demo mode carries a box score for all five sports — `mock-2` through `mock-5` and `mock-9` — shaped
as raw ESPN payloads so the demo path runs through the real parser rather than around it. A
fabricated parsed object would let the parser and the screen drift apart with nothing noticing. The
football fixture has eight defenders against a cap of six so the expander is reachable, and the
hockey one carries the all-zero backup goalie precisely so the row that gets dropped is the row most
likely to rot unnoticed.

## The popup opens 590KB lighter and stops asking ESPN for what it already has — 2026-09-07

Four measured wins, none of which changes anything on screen.

### The chart library shipped nine times more of itself than it uses

`gameDetailChart` imported echarts through the barrel, which is the whole library: treemap, gauge,
heatmap, parallel, sunburst, custom series, the calendar, the SVG geo reader. The four option
builders in `@arenaswap/ui` emit line and bar series on a cartesian grid with an axis tooltip, and
have never emitted anything else.

Registering those five modules explicitly takes the popup chunk from 1,711,274 bytes to 1,106,134
— 590KB raw, 190KB gzipped. A popup document is built fresh on every open, so that is parse work
paid every single time somebody clicks the toolbar icon, for code that could not run.

`apps/docs` already imported it this way, and it renders the same four builders off the same
registration, so the sufficient set was not a guess — it was sitting in the other app.

### Seeding the win-probability lines refetched every league to use them

Service-worker startup fetched the slate, then fetched the win-probability lines, then called
`refreshScores` again so the first thing the popup renders already carries volatility. That last
call goes through `tick()`, which refetches all 31 enabled leagues — to recompute scores from games
already sitting in memory.

It calls `afterFetch(null, false)` instead, which is the same re-score with no network at all, and
which the `UPDATE_PREFS` handler had already been using for exactly this purpose thirty lines below.
MV3 tears the worker down constantly, so this ran far more often than "startup" suggests.

### The popup read the same two keys from both stores twice, one after the other

`loadStoredUserPreferences` and `hasStoredUserPreferences` each read `prefs` out of `storage.sync`
and `storage.local`. The popup called both, and awaited a third `storage.local.get` in between them
rather than alongside. Four round-trips where two do, all of them in front of the first paint.

`loadStoredUserPreferencesWithPresence` returns the presence flag next to the prefs, since the
function already held both raw values and was throwing one away, and the remaining two reads now go
out together. The single-value `loadStoredUserPreferences` stays for the background, which does not
need the flag. `hasStoredUserPreferences` is deleted rather than left behind as a second reader of
the same keys — two of those drifting is how the redundancy appeared in the first place.

### Two fonts nobody could have downloaded

`Geist-Regular.woff2` and `Geist-Medium.woff2` sat in `public/fonts/`, 91KB of the package, with no
`@font-face` anywhere declaring either weight. `_fonts.scss` declares Geist at 600 and 700 and
nothing else, because the scoreboard-figures mixin is the only thing that asks for the family. A
weight with no rule cannot be requested, so these were shipped to every user and reachable by none.
`apps/docs/public/fonts/` carries only the two declared weights, which is what confirmed these were
leftovers rather than something the extension needed and the site did not.

### What is still on the table

The icon font is the larger version of the same problem — 132KB of Bootstrap Icons to deliver the
64 glyphs the source uses, with 76KB of unused `.bi-*` rules in the stylesheet beside it. A subset
comes out at 8KB and would take most of the webfont layout shift with it. It is not here because
pruning the CSS needs a hand-maintained allowlist that breaks silently the next time somebody adds
an icon, and subsetting the font needs a tool the JS toolchain does not currently carry.
