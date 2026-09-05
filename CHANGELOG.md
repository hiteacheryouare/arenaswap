# Changelog

## The upcoming window is picked in your day and asked for in ESPN's — 2026-09-05

One data path carried three different day boundaries. The window was built in UTC, ESPN resolved it
as US Eastern, and the popup grouped and labelled the answer in local time. The exposed edge was the
*start* of the window, since the end is days out and absorbs the skew, so what went missing were the
games nearest the front of the slate.

### ESPN files by Eastern, and that is checkable rather than assumed

`dates=20260903` on the MLB scoreboard answers with nine games running from 2026-09-03T16:35Z to
2026-09-04T02:10Z. The last of those is a 10:10pm first pitch in Los Angeles, filed under the
previous UTC day. The boundary is Eastern midnight, and the AFL scoreboard files the same way.

### It was never only a problem for viewers east of Eastern

Eastern is UTC-4 in the summer, so 8:00pm there is already tomorrow in UTC. `toQueryDate` read the
UTC date, which means that from eight o'clock every evening the window opened on tomorrow and left
tonight's not-yet-started games to whatever the date-less scoreboard happened to be carrying. That
request only reliably surfaces active and recent events, which is the entire reason the range query
exists. A viewer three hours behind Eastern hit this nightly; twelve hours ahead was never a
requirement.

### One boundary: the days the popup is going to label

The popup groups and labels in the viewer's own calendar day, and that is the right thing for it to
do. So the window is chosen there now as well. It opens at the start of the viewer's today, closes
on the final millisecond of the local day the rolling cutoff lands in, and those two instants are
translated into the Eastern dates ESPN files under.

The range then widens by exactly what the zone asks for and by nothing else. An Eastern viewer on a
seven day setting is asked for eight dates. Tokyo is asked for nine, because a Tokyo day opens
mid-morning Eastern on the day before. Padding a day onto each end would have covered the same
ground while leaving three boundaries in place, one of them hidden.

Ending on the local day's midnight instead of its last millisecond costs an Eastern viewer a whole
extra date, midnight being the first instant of the next day rather than the last of this one. It is
a dull thing to get wrong, so it has a test of its own pinned at exactly 00:00:00.000 Eastern.

Puerto Rico is UTC-4 the year round, which makes its midnight 04:00Z in both seasons: midnight
Eastern in July, and 23:00 the previous evening in January. A fixed -4 or -5 gets one of those
wrong. The translation runs through `Intl.DateTimeFormat` with `timeZone: 'America/New_York'`, so
there is no offset table for anyone to maintain, and both seasons are asserted.

### No test could have caught any of it

`process.env.TZ = 'UTC'` at the top of `jestSetup.ts` never did anything. Jest hands each test file
a copy of `process`, so the assignment lands in the copy and never reaches the setter Node uses to
tell V8 to drop its cached zone. The variable changes and the clock does not. Both suites had been
running in whatever zone the machine happened to be in, and the one test that pinned the old
behaviour recomputed the same UTC expression it was testing, so it passed in every zone and proved
correctness in none.

The pin moved into `jest.config.cjs`, which is read in the real process before any worker forks.
That fixes the zone and cannot vary it per test. Varying it needs a test environment, because an
environment class is loaded in the worker's own context where `process` is the real one, so
`timeZoneEnvironment.ts` hands the sandbox a `setTimeZone` that works.

Both suites moved off the machine's zone and onto UTC on the way past, and nothing in either of them
noticed.

### Coverage

Ten tests on the window, nine of them written out as literal date ranges rather than recomputed from
the arithmetic under test: Eastern, UTC, Tokyo, Auckland, a Los Angeles evening, a one day setting
straddling two Eastern dates, the exact-midnight case, both Puerto Rico seasons, and a range
crossing the end of September. The tenth drives the real scoreboard request under a pinned Tokyo
clock and reads the `dates=` parameter back off the URL.

Nine of them were confirmed failing against the old builder before the fix went in. The two that
pass either way are the cases the old code already got right, an Eastern viewer and Puerto Rico in
July, which is where the two boundaries happen to agree.

## Favorite teams can be picked from settings, not only on the way in — 2026-09-05

The full team picker only ever existed inside onboarding. After that the one way to change a
favorite was the star on a game's detail screen, which needs that team to have a game on the slate
you are looking at — so following someone new in the offseason, or dropping a team you stopped
watching, meant reinstalling the extension.

Settings has a **Favorite teams** group now, third in the list, and the favorite team bonus moved
into it out of Scoring. The picker and the number saying what a favorite is worth were two halves of
one idea kept in different rooms.

### The picker is the list, not the chrome around it

The onboarding version had its chrome baked in: a "step 3 of 3" counter, Back, Skip, Done. None of
that is true in settings, which saves on each star and leaves by the same back arrow as every other
page. So the list itself — the search box, the league-grouped rows, the loading and error states —
is `teamPickerList` now, and each caller wraps it in its own chrome.

It returns a fragment rather than a wrapper. Onboarding's column pins its footer against the
scrolling list, and a `div` around the two would have broken that relationship to no purpose.

The error state is the one place the two genuinely differ, and it is a prop rather than a copy:
onboarding offers "Skip for now" because there is somewhere to skip to, and settings does not,
because there isn't.

### Your favorites sit above the leagues

The pinned section at the top lists every team you have starred. It repeats teams that also appear
in their league group below, which is deliberate — until now nothing anywhere in the extension
answered "who am I actually following", and the answer is worth more than the duplication costs.

It is also the only way to reach a favorite in a league you have since switched off. Those are kept
rather than pruned: a favorite is a fact about you, not about which leagues are on this week, and
re-enabling the league brings it straight back. So the picker fetches the enabled leagues **plus any
league holding a favorite**, and marks the latter "not tracked" under the team's name. The league is
fetched to name the team and for nothing else — it is never offered as a group to star from.

The league list is fixed when the page opens rather than derived on each render. It only changes
when the leagues do, and recomputing it as teams are starred would refetch every roster on every
click.

A stored key with no team behind it — a league whose fetch failed, a team ESPN has dropped — is left
out rather than rendered as its raw id, which would name nothing anybody could act on.

Searching takes the section away rather than filtering it. Filtered, it moved the league groups up
and down on every keystroke, and a starred team answering the search twice — once here and once in
its own league — read as a duplicate rather than as a shortcut. Clearing the search brings it back.

### Every crest sits on a disc it tinted itself

A navy or black crest on the dark popup is a silhouette, and a list of two hundred of them is where
that hurts most. Each one now sits on the same white disc the pre-game poster uses, washed with the
team's own colour — so `crestBacking` moved out of `detailPosterHero` and into `colorUtils`, where
both callers read one formula.

The colour is **sampled from the crest the row already drew**, not fetched. ESPN does send `color`
on its teams endpoint and the schema was dropping it, but taking that route would have meant a wider
parse for a decorative wash. Instead the loaded image is drawn into a 24x24 canvas and its pixels
read back, which costs no field and no request: the browser had already decoded that image to paint
it.

Reading pixels back needs two things. The image has to be requested with `crossOrigin`, or the
canvas is tainted and `getImageData` throws — so `Crest` takes it as an opt-in prop rather than
setting it everywhere, since a host answering without CORS headers would then fail to load at all
rather than merely fail to be sampled. Every team logo we serve is on `a.espncdn.com`, which answers
`Access-Control-Allow-Origin: *`. And the read is wrapped anyway: a tainted canvas leaves the disc
plain white, which is the state it degrades to regardless.

Picking the colour is the part with a judgment in it. **Greys, white and black are rejected by
chroma rather than by lightness**, so a crest on a white plate tints with its mark instead of with
its plate, and a genuinely monochrome crest tints with nothing at all rather than with a muddy grey.
Colours are bucketed five bits to a channel before being counted: finer than that and a gradient
splits its own colour across enough buckets to lose to a flat one covering less of the crest.

The disc under a crest that never loaded is plain white, so the placeholder initials take a dark ink
rather than the shared grey — that white disc would otherwise be the one unreadable state the disc
was added to remove.

`onLoaded` hands back the element rather than firing a bare callback, and the cache is keyed on the
image's own `currentSrc`. Keying it on the prop instead would have meant rebuilding the handler
whenever the logo changed, and a ref callback that changes identity makes React detach and reattach
the image on every render.

### The search box stays put

Every other settings page is short enough to scroll as one block. This one runs to a few hundred rows
once a college league is on, and a search box that scrolls away with them is what makes a list that
long unusable — onboarding already knew this and gave its own picker an inner scroll region.

The settings shell hands this page the column to do the same. Bootstrap has no `min-height: 0`
utility, and a flex child that is not itself a scroll container keeps `min-height: auto` and refuses
to shrink, which puts the scrollbar on the whole page instead of on the list inside it. `.min-h-0`
sits next to the `.min-w-0` that exists for the same reason on the other axis.

The bonus input scrolls with the list rather than sitting above the search. Pinned, it cost 110px of
a 560px popup permanently and left five team rows visible.

### Two things this turned up

**`fetchTeamsForLeagues` throws when every league it asked about comes back empty**, rather than
returning an empty list. A test stub answering with a zero-team envelope is therefore a failed load,
not a bare one — and the failure was hiding the bonus input, which had been rendered inside the same
block the roster is gated on. It has nothing to do with whether ESPN answered. The scroll region is
always mounted now, and the bonus survives a fetch that doesn't.

**`parseFavoriteTeamKey` is exported from core** rather than reimplemented. Working out which leagues
hold a favorite means reading the `leagueId:teamId` format, and a second reader of that format
outside the module that writes it is the way the two drift apart.

### Strings and coverage

Six keys across all twelve locales: the group's label and description, the search-result label, its
keywords, the pinned heading and the not-tracked line. Each locale reuses its own established
vocabulary rather than new coinage — the existing noun for a favorite team, and the verb already used
for a tracked league.

Three of them are measured. The group name and the pinned heading are each asserted on one line at
320px in every locale, and the not-tracked line is measured carrying the longest league label we
ship, "Olympic Women's Ice Hockey", asserting the row never widens past the popup. That one is free
to wrap; what it must not do is push the star off the right edge.

21 unit tests on the pure helpers, including a favorite whose league is off pulling that league
into the fetch, a malformed stored key being ignored, an unresolvable favorite dropping out, the
untracked rows sorting last against a league order that would otherwise put them first, and the
colour picker refusing a crest that is only white and black.

21 component tests: 13 on the page, 4 on the group and 4 on the row. The colour is proved by mounting
a four-pixel PNG of a known green as a data URI and reading the tint back off the computed style,
which is a thing only a real browser can answer. The scrolling one was confirmed failing with the
column removed before the layout went in, which is the only way to know it measures the fix rather
than the default.

Three existing assertions pinned the settings index at six rows and now pin seven, and the scoring
page's bonus test asserts the favorite bonus is no longer there, so the move is caught in both
directions.

## A live football game draws the field it is being played on — 2026-09-05

Under the score on the detail screen, where the baseball base diamond sits, a football game now
draws its own field: grass in mown bands, yard lines and hash marks, painted numbers, both end zones
in their teams' colours, the home crest on the 50, and on top of all of it the line of scrimmage,
the line to gain, the ground the current drive has taken and the ball itself. The reference is the
Apple Sports strip. The field markings come from the NFL and NCAA rulebooks by way of the sports
analyst, and several of them are not what they look like.

### Which way is downfield

ESPN's `situation.yardLine` is an absolute field coordinate rather than the yard marker it prints
beside it, and which end it counts from is the whole feature. Measured against fourteen drives of
UTEP at Oklahoma it is unambiguous: `"OU 24"` arrives as 24, `"UTEP 3"` as 97, `"UTEP 25"` as 75.
**Zero is the home team's own goal line and 100 is the away team's**, whoever is holding the ball,
which means the home offense always drives toward 100 and the away offense toward 0.

That is not a guess about a convention. It balances against ESPN's own arithmetic: Stanford at home
went 25 to 94 under a drive it described as "11 plays, 69 yards", and Fresno State away went 75 to
76 under "1 play, -1 yard". Both only work one way round.

The field draws the away end zone on the left, which puts each team's territory under the crest that
owns it — the matchup card already washes away-colour left and home-colour right — and leaves the
away offense moving left to right. `possessionText` cannot do this job on its own, because it names
the side of the field rather than the team: in Apple's own screenshot the ball is on NC A&T's 29 and
Georgia State has it.

`possession` is the field that says who, and it was being deleted before the parser ever saw it —
the same Zod strip-mode failure that ate the venue address and the pre-game competitor fields. It is
declared now, along with `lastPlay.drive.start`, and neither costs an extra request.

### The ball is not always on the field

Two states arrive looking exactly like a snap and are not, and both were caught against live games
rather than reasoned about.

A **college kickoff** sends `down: 1, distance: 10` and a real yard line. Nothing in the numbers
separates it from a first down; the only tell is that ESPN nulls every text field. The NFL sends
`down: 0` for the same play, so the down cannot carry the gate either, and the mapped
`possessionText` does it instead.

**After any score** both leagues send `down: -1` alongside a yard line that is simply wrong: one home
field goal reported 35 and the touchdown before it 65 for what is the same spot.

The opposite problem is a dead ball. A timeout, the two-minute warning and the end of a period all
clear the down and the yard marker while the ball sits exactly where play will resume from, and a
timeout is one of the moments somebody is most likely to be looking at the popup. So the last good
frame is held rather than dropped, and what tells a timeout from a score is whether the yard line
moved: it held at 62, 84, 6 and 75 through timeouts and jumped 6 to 65, 83 to 35 and 97 to 65 after
scores.

### The drive, and the two ways it lies

The ground the offense has covered on this drive is washed in its own colour, from where the drive
began to where the ball is now, which is what makes the direction of travel legible in a still
screenshot rather than only in motion. It was a bar across the middle of the field first; at 77px
tall a bar has to cross both rows of numbers and both hash rows to say the same thing, and a wash is
a fill rather than another edge.

`lastPlay.drive` still describes the **previous** team's drive for the one poll after a change of
possession, and a punt leaves it pointing tens of yards backwards. Every one of those stale reads is
negative in the new offense's direction, so ground is only drawn where it was actually gained —
which also drops the washes too narrow to see.

That guard does not catch the second one. ESPN publishes `drive.start.yardLine: 0` as a placeholder
on a drive it has only just opened, under a description that reports the real yardage: three live
games carried it at once, one of them "1 play, 5 yards" against a coordinate that would have washed
forty. It inflates the gain rather than inverting it, so a goal line is rejected as a drive start
outright. A real drive begins at a touchback spot or a recovery, never on the paint.

### The field is a field

The viewBox is `0 0 120 32` — 120 yards of length at true scale, and the 53⅓ yards across squashed
into 32 so the whole thing fits in 77px inside a 320px popup. Every x is a real down-field
measurement and every y is a real cross-field one put through the same squash. Strokes carry
`vector-effect: non-scaling-stroke`, which is doing more work than it looks: at this size a 4-inch
painted line is 0.27 of a device pixel, so every line weight on the field is a deliberate
exaggeration and only their *ratios* are honest.

- **Hash marks run lengthwise**, parallel to the sideline, straddling each yard rather than crossing
  it. They were drawn as little crossing ticks first, which is more legible and simply not what a
  field looks like: 24 inches of paint on a 36-inch pitch leaves a gap of a foot, so a hash row
  reads from above as a nearly solid dashed line. They are one `path` of 160 segments rather than
  320 elements, they skip the yard lines because a mark painted on a line is just the line, and they
  stop at the goal lines because both rulebooks scope them to the field of play
- **The two codes disagree about where those rows go**, and it is the only geometric difference
  between them worth drawing. The NFL sets its hashes 70'9" from each sideline, leaving them 18'6"
  apart — exactly the width of the uprights, which is why a snap from either hash gives the same
  angle. College hashes are 60' from each sideline and 40' apart. An unknown league falls back to
  the professional pair rather than losing its hash rows
- **The goal line is double the weight of a yard line**, which is the rulebook's own ratio: 8 inches
  against 4. It is also the only thing keeping a dark team colour off dark grass, which matters
  more now that the end zones are not lightened
- **Mown bands are 10 yards with their edges on the 10-yard lines.** Five is the authentic pitch and
  turns the field into a barcode at 12px a band. They are a fill difference rather than an edge, so
  they are the one marking here that physically cannot alias
- **Numbers are painted on the field in two rows**, mirrored about the centre line and four times
  over-scale, since a 2-yard numeral would render under 3px. A real field points the top of each
  numeral at the centre of the field, which from above means one row upside down; both rows are
  upright here, which is the same simplification Apple makes. Directional arrows would be 2.3 by 0.7
  pixels and are not drawn
- **Each end zone is its team's real colour**, unaltered. An earlier pass lifted both toward white
  to clear 3:1 against a dark slab, which is the wrong problem now that the slab is grass — the
  goal line does the separating instead, and `readableFillOn` is deleted rather than left unused

**The line of scrimmage is blue and the line to gain is yellow**, which is not a decorative choice.
Sportvision put those two colours on ESPN in September 1998 and every broadcast since has kept them,
so a football fan reads blue-to-yellow as the distance to go without being told. The scrimmage line
was the offense's own colour first, which is more informative and collides: the Steelers and the
Packers would each paint a second yellow line beside the real one.

The ball is the 🏈 emoji. It is the platform's own glyph, so it brings its own colours and looks
different on every OS, and it is the one marker on the field that is self-labelling at a size where
nothing else is.

The line to gain moves between polls by transitioning `x`, which is a CSS geometry property. The
ball cannot: `x` on a `<text>` is a coordinate list rather than a geometry property, so the ball and
the scrimmage line ride a translated group instead and move together for free. A browser without
either lands on the same positions with no tween — the same thing `prefers-reduced-motion` asks for.

The caption above the field is in the sans face rather than Lekton. Lekton is for figures scanned
down a column and this is a sentence about one snap — and its ampersand closes up at caption size,
so "3rd & 5" was rendering as "3rd 6 5".

### Not drawn, and not on the cards

It was on live game cards too for a while, as a field with the numbers stripped out. It is off them
now. A card answers "should I switch to this", and where the ball is on the field is not part of
that answer; it is what you want once the game is already open.

The red zone is not marked. There is no painted convention to borrow — it is a statistical region
rather than a marking — and `isRedZone` is not stable enough to bind anything to: it drops to false
during a timeout while the ball is still sitting on the opponent's 16.

Timeouts remaining are not drawn either. They belong to the team rather than to the field, which is
why Apple hangs them off the scoreline instead, and that is a different change.

### Coverage

39 unit tests on the geometry, including the college kickoff, the post-score yard line, both
placeholder drive starts, the dead-ball hold in both directions, an assertion that the hold is
idempotent since the component writes it back into a ref during render, and the hash path checked
for its 160 marks, its 24-inch length, and for staying out of the end zones and off the yard lines.

Eight parser tests, every situation transcribed off the live college-football scoreboard, including
the dead-ball fallback from `possession` to `lastPlay.team` and a possession id belonging to neither
competitor.

Fifteen component tests measuring what only a browser can answer: that 120 yards of viewBox put the
ball on the yard marker ESPN named, that all eighteen painted numbers sit on the lines they label in
two rows mirrored about the centre, that the end zones carry the teams' exact hexes, that the
college hash rows come out more than twice as far apart as the professional ones, that the midfield
crest stays inside its 13-yard cap and clear of the numbers, and that no field is drawn on a list
card.

The demo football game carries a full drive, every line to gain landing on PHI 35 and then DAL 38,
so the yellow line holds still across a set of downs instead of following the ball.

## The lights go back on the scorebug, and the leaf pile is made of leaves — 2026-09-03

### The frame was in the way

Running the string around all four sides put bulbs across every row of text on the screen. The two
side columns were the problem: they cross the full height of the content, where the horizontal runs
only cross the back bar and the foot of the page. It is back to one sagging run of nine bulbs
draped over the matchup card, pinned under the sticky back bar, which is where it started and where
FOX puts it.

The whole content inset goes with it. `--gd-inset` survives, because the back bar and the drift both
bleed by it and one variable is better than three literals, but nothing moves it off 0.75rem any
more. Two tests now assert the lights cost the column nothing: one measures every text leaf with the
lights off and on and fails on any change at all, the other pins the matchup card to exactly the
width it has without them.

### The lights flash a favourite's colours when it scores

A followed team scoring turns the string that team's colours and takes the twinkle from a 3.4s
shimmer to a 0.5s flash, for five seconds. It is the confetti's job done by the only decoration this
screen has.

The detection is its own module rather than a condition inside the effect: the extension's Jest runs
in a node environment with no DOM, so anything buried in a component cannot be tested. It takes both
of a team's colours where ESPN sends two, so the string alternates rather than reading as one flat
wash, and it accepts them with or without the leading hash because ESPN sends both. A score going
down does not fire it, which is what a correction looks like. The first pass after mounting seeds
the comparison and fires nothing, so opening a screen mid-game is not a goal.

### The leaf pile is leaves now

The previous one drew a brown mound and scattered leaves on top of it, and the mound read as exactly
what it was: a wash of colour behind the leaves.

There is no mound. The pile is about 850 individual leaves at full depth and nothing else, so the
gaps between them are the popup's own background rather than mud. They are placed against a squared
distribution, which packs them solid along the floor and thins them to individual leaves at the top
edge — a uniform spread reads as leaves scattered on the ground rather than piled on it — and
against a cosine profile across the width, so the heap is deepest down the middle. They are drawn
highest first so the near ones cover the far ones, and each leaf now carries two ribs off its midrib,
which is what stops a fallen leaf reading as a petal. The only thing drawn over them is a shadow
gradient in the deepest half.

The snow pile is unchanged. Both depths come from the same `accumulationDepth`, which never learns
which kind is falling: it grows through a period and resets to zero at the break, with a ceiling of
`period / regularPeriods` so each period ends deeper than the last. Walked end to end, an NFL game
reads 0.25 at the end of the 1st, 0.5 at the end of the 2nd, 0.75 at the 3rd and 1.0 at the 4th, and
0.000 at the top of every one of them.

### Two things removed

The Rømer credit line is gone. The sweep on the button is the whole reveal now, and a test asserts
the popup never names Rømer at all. One key out of twelve locales.

The standby test card is gone entirely — component, spec, styles and four keys across twelve
locales. The threshold value at 0 and at 100 is plain text again.

## The decorations, rebuilt: a light frame, real piles, and snow for every sport — 2026-09-03

Four things were wrong with the first pass.

### Snow reached one sport in demo, and only one

The rule was already right: snow is gated on the weather reading and nothing else, so any sport can
get it. What was wrong is that the NFL fixture was the only demo game carrying snow, which made a
sport-agnostic rule look like a football rule. Two of the four outdoor demo games snow now, across
football and soccer, and the other two are clear. Neither the gate nor the containment is visible
from a single fixture. A test asserts snow on four sports and none on a clear game of each.

### The pile followed you down the screen

The drift was drawn on the same viewport-fixed canvas as the falling snow, so it sat at the foot of
the *window* and slid down the page as you scrolled. Snow settles on the ground, and the ground is
the foot of the page.

It is its own element now, last in the flow, bleeding the shell's padding to reach both edges. The
falling stays on the fixed canvas, because weather does belong to the window. Splitting them also
took the landing-line arithmetic out of the animation loop: flakes now reset at the bottom of the
screen rather than against a mound in a coordinate system they no longer share.

### Both piles looked like mush

A gradient with a wavy top edge is fog, not snow, and a brown one is mud rather than leaves.

The snow drift is a crown of overlapping lumps, filled solid, white along the top and cooling into
blue at the foot, with contour strokes clipped inside it so the lumps read as volume. Snow is lit
from above and its shadows are blue; a white-to-transparent gradient has neither of those and that
is exactly why it read as fog.

The leaf pile is leaves. Up to about 180 of them depending on depth, drawn back to front so the near
ones overlap the far ones, each with a midrib — without it a leaf at this size is an almond, and a
heap of almonds is the mush we started with. The only thing under them is a shadow dark enough that
the gaps do not show the page through. Both piles are laid out from a seeded pseudo-random so the
arrangement does not reshuffle itself on every poll.

### The lights framed the scorebug, not the popup

They run all the way round now, top, bottom and both sides, with every bulb hanging inward off the
wire so the cap stays against the popup edge. Horizontal runs sag between their bulbs; the vertical
runs are drawn straight, since a wire hanging down its own length does not bow sideways.

The content moves in to make room. `--gd-inset` is one variable on the detail shell that drives both
the shell's own padding and the negative margin the sticky back bar uses to bleed back out to the
edge, so the two cannot drift apart. It goes from 0.75rem to 1.1rem when the lights are up, which
takes 11px off the content column.

Positioning the frame took three attempts, and the two failures are worth recording.

`position: fixed; inset: 0` is sized against the window, so its right edge lands under the scrollbar
and slices that entire column of bulbs in half.

A zero-height sticky wrapper fixes the width, since sticky elements are laid out in the content box
and the content box excludes the scrollbar. But sticky cannot lift an element above its own flow
position, so at scroll zero the frame sat `--gd-inset` low and its bottom run fell off the screen
until you scrolled. It only looked correct because the first screenshot of it was taken scrolled
down.

The frame is measured now: `clientWidth` and `clientHeight` of the scroll container are exactly the
box it wants, excluding the scrollbar and including the padding the bulbs sit in. It reads them in a
layout effect, before the paint that would otherwise show one frame of a mis-sized string.

A third thing turned up while measuring. An SVG with a viewBox carries an intrinsic aspect ratio, so
a frame given three offsets and no explicit height derives the fourth from the other side: at 305px
wide it came out 534px tall against a 560px popup, and the bottom run was simply in the wrong place.
Both dimensions are set explicitly.

### Checking the narrower column

A narrower column is where a label that fitted on one line quietly becomes two, so a test measures
every text leaf on the screen with the frame off and again with it on and fails on anything that
grew. Nothing does at 1.1rem. A second test pins the bite at more than 4px and at most 16.

Writing it turned up two things about the harness, both of which had quietly made earlier tests
lie.

A `cy.mount` nested inside a `.then` replaces the root while the surrounding chain still holds the
old, detached nodes, so every measurement comes back from a screen that is no longer on screen.
Both mounts are enqueued at the top level instead.

And a second `cy.clock` in the same test does not re-arm, so a test that mounts twice renders the
first date both times and the December mount had no lights in it at all. The date is a prop on the
detail view already, for demo mode, so the spec passes it directly and mocks no clock anywhere.

24 component tests on the decorations now, up from 17.

## Demo mode can borrow a date, so the decorations are reachable in September — 2026-09-03

The holiday decorations were only visible when the world cooperated: a game ESPN reports snow at,
or the actual week of Thanksgiving, or the actual month of December. That makes two of the three
unreachable for ten months of the year, including while they are being built.

Demo mode now carries a "Pretend it is" select — the real date, Thanksgiving week, or December —
which only moves the date the decorations are resolved against. Nothing else in the popup shifts.

Borrowing a date rather than forcing a decoration matters. A switch reading "force snow" can put the
screen in a state the real rules would never produce, and then it is testing itself rather than the
feature. Picking December and opening a snowy game gives snow and lights together because that is
what December and snow actually mean, which is also the most common real combination and the one
worth looking at.

Thanksgiving is computed for whatever year it currently is rather than pinned to a date, so this
cannot rot. The December stand-in is the 14th, comfortably inside the month at either end.

The demo games had no weather at all, so there was nothing to snow on. The NFL game at the Linc is
snowing at 26°F now. The college football game at the same stadium and the MLS game at Subaru Park
are deliberately clear — the weather belongs to a game rather than to the popup, and two outdoor
games in different conditions is the only way to see that from the inside.

The control is only rendered while demo mode is on, and it is stored next to `demoMode` in
`storage.local` rather than in user preferences, since the background never needs to know about it.
An unrecognised stored value falls back to the real date.

Six keys across all twelve locales. 14 new tests: 6 on the date resolver, including one asserting
the borrowed December date puts a snowy football game at lights plus snow plus full depth and the
borrowed Thanksgiving date turns that same game over to leaves, and 4 component tests covering the
control's absence while demo mode is off and a September session seeing both decorations at once.

## The standby threshold at either end asks for something impossible — 2026-09-03

Drag the Standby Stream threshold to 100 or to 0 and the value beside the label becomes a control.
Click it and the popup loses the signal and comes back as a broadcast test card: seven SMPTE colour
bars, the inverted strip under them, and PLEASE STAND BY set in Lekton over a black band.

Both ends are absurd, in opposite directions, and the copy is the same sentence twice. At 100 you
have asked to sit out any game that scores below 100, and none of them do, so standby is where you
live now. At 0 you have asked to sit out any game that scores below 0, and none of them do either,
so the standby tab you picked will never once be shown to you.

This is the Ludicrous Speed shape, which is the bar #108 sets: a control pushed to its limit, and a
real thing behind it rather than a joke string. A test card is what the Standby Stream is for, so it
is the one overlay in the popup that is also an explanation.

The trigger has to be findable without being advertised, so the value is styled exactly as the plain
text it replaces apart from a dotted underline and a help cursor. Same weight, same size, same
colour. Bootstrap gives a `<button>` the keyboard affordance for free, so it is in the tab order
without a hand-placed `tabIndex`.

The overlay opens with a 0.32s scale from a bright horizontal line, which is an old set finding its
picture, and a slow bright band rolls up the frame every 6.5s the way an untuned analogue signal
does. Click anywhere or press Escape to go back. Both animations sit behind
`prefers-reduced-motion`, which leaves the card itself perfectly readable.

Four keys across all twelve locales. The heading is the string with no room to grow into, since it
is the only one on the card at a fixed size in a monospace face, so a test measures each locale's
heading on one line at 320px. The body copy is free to wrap.

Nine component tests: the value stays plain text anywhere in the middle of the slider, goes live at
both ends, carries the right sentence for the end it came from, draws fourteen bars across two
strips, covers the popup at exactly 320x560, and closes on both a click and Escape.

## It snows on the detail screen when it snows at the game — 2026-09-03

The game detail screen decorates itself. Snow falls on a game ESPN reports snow at, leaves fall on
football through the week of Thanksgiving, and coloured lights hang off the back bar all December
for every sport regardless of weather. It is contained to the one game you have open, so a snowy
Buffalo game and a clear Miami one do not both get weather.

The reference is the FOX scorebug, which drapes a string of bulbs over the bar itself rather than
over the field. Ours hangs immediately under the sticky back bar, which puts it across the top of
the matchup card, and it stays pinned there while the rest of the screen scrolls under it. Nine
bulbs on a sagging wire, in ArenaSwap's own five PowerScore colours rather than a generic red and
green, twinkling on a 3.4s cycle that never takes one fully dark.

### The pile deepens through a period and resets at the break

Snow and leaves accumulate along the floor of the popup, and how deep depends on how far through
the current period, quarter, half or inning the game is. Every period ends deeper than the one
before it, so a 4th quarter buries the bottom of the screen and a 1st barely dusts it, and each
break wipes it back to nothing. Four builds of escalating drama instead of the same one four times.

None of that needed new data. `leagueConfigs` already carries `regularPeriods` and
`periodDurationSecs` per league, so an NHL game builds in thirds and an NCAAB game in halves without
either being a special case, and overtime holds at the regulation maximum instead of piling past it.
The ceiling is `period / regularPeriods` and the depth is that times the progress through it.

Soccer needed the one adjustment. Its clock is total elapsed rather than per-half, so a second half
runs 45:00 to 90:00 and the offset has to come back off before the fraction means anything. Stoppage
time clamps rather than running past a full half.

The inning sports have no clock to read at all, and `periodDurationSecs` is 0 for exactly those
leagues — so "does this sport have a clock" is a property of the data rather than a list of league
ids somebody has to maintain. Progress comes off the outs instead: six to an inning, three to a
half, which makes each out a sixth and the half change the midpoint. Base runners were considered
and dropped, because a pile that shrinks when a runner is thrown out at second is a strange thing to
ship. The side effect is that the snow visibly stalls during a long rally, since an inning where
nobody is retired sits at zero for as long as it lasts.

### What falls, and when

Leaves take the Thanksgiving week off snow. Snow gets the whole rest of the winter, and Thanksgiving
is four days a year, so the rarer one wins the overlap — which is a real collision most years, not a
hypothetical, given where the late-November NFL slate is played. Leaves are football only, so a
snowy hockey game that week still gets snow.

The Thanksgiving window is the full Monday-to-Sunday week around the fourth Thursday of November, so
Tuesday and Wednesday college football are in. Lights run the whole of December and come down on the
1st of January.

Snow matches on the word rather than an exact set, because ESPN varies the wording a lot: "Snow",
"Light Snow", "Snow Showers/Wind" and "Flurries" all count, and so does sleet. Freezing rain does
not, since it does not settle as snow.

Nothing settles before the first pitch and everything has by the final, so a pre-game screen gets
falling weather with a clean floor and a finished game gets the full pile.

### Settings

A "Holiday decorations" parent in the display group with snow, lights and leaves under it, all on by
default, the sub-switches hidden while the parent is off. It is in the settings search under
christmas, snow, lights, leaves and thanksgiving. Six keys across all twelve locales.

The lights sit behind `prefers-reduced-motion`, and so does the falling: reduced motion draws the
accumulated pile and skips the animation entirely, rather than dropping the decoration altogether.

### Coverage

25 unit tests on the resolver, which takes `now` as an argument rather than calling `new Date()`
inside — that is what makes December and Thanksgiving week plain unit tests instead of clock
mocking. 13 component tests on the rendering, including the canvas covering the popup at exactly
320x560 with `pointer-events: none`, the light string still pinned 40px down after scrolling to the
bottom, and every locale's four labels measured on one line beside their switches.

Two things turned up while writing those.

Cypress reports the light string as not visible even when it is drawn, pinned and 305px wide.
Asserting its rect is both more precise and true; `be.visible` on an SVG with a negative bottom
margin is not.

And the string measures 305px rather than 320 because the detail screen's scrollbar takes 15 of
them. It bleeds the container's padding the same way the back bar does, so it starts flush at the
left edge and stops short at the right, which is where the scrollbar already is.

## A third temperature unit nobody asked for — 2026-09-03

The temperature setting has a Rømer scale now, and no way to reach it from the settings list. Seven
clicks on the °F/°C toggle inside three seconds and the button lands on °Rø, where it stays as a
permanent third stop in the cycle.

Ole Rømer built the scale in 1701 with brine freezing at 0 and body heat somewhere near 22.5, and
Fahrenheit built his own by multiplying Rømer's numbers by four. So a warm August game reads about
23°Rø. There is no reason to want this.

Seven, in a rolling three-second window, is the ten-click heart in the footer scaled down. The
toggle was the only control in that row, so pushing it to its limit means pushing it repeatedly, and
someone flipping between Fahrenheit and Celsius to compare two numbers trips it without meaning to.
Every one of those seven clicks still cycles the unit, so the button flickers °F °C °F °C and then
lands on °Rø, which is more satisfying than a button that ignores you six times.

Two problems had to be solved before a stored preference would survive a restart.

`normalizeUserPreferences` read `candidate.temperatureUnit === 'C' ? 'C' : 'F'`, which is a
whitelist by omission: anything it does not recognise silently becomes Fahrenheit. That is the right
default for untrusted storage, and it would have eaten a Rømer preference on every popup open. It
now runs through `normalizeTemperatureUnit`, which knows three values.

The unlock is its own boolean rather than being implied by the unit, because the cycle has to stay
two-wide until it is found. That opens a state where the two disagree, so a stored `Ro` counts as
proof the unlock happened. Nobody can be stranded on a unit their button will not advance past.

Rømer degrees are nearly twice the size of Fahrenheit ones, so `formatTemperature` keeps one decimal
and drops a trailing zero. Whole numbers would round freezing from 7.5 to 8 and throw away the half
degrees the whole scale is built on. Water still boils at exactly 60, which is a test.

The reveal is a 1.2s sweep on the button, warm through cold to frost and back to an ordinary outline
button, with a one-line credit to Rømer under the row that fades itself out after six seconds. It is
the thermometer's own journey, and it is the only place in the popup that says what you found.
Both animations sit behind `prefers-reduced-motion`.

`settingsCatalog` gets nothing. Searching the settings for "romer" returns the empty state, which is
the point.

Two keys across all twelve locales. `°Rø` is a symbol and stays identical everywhere; the credit
line is translated, and the decimal separator follows each locale rather than the formula.

Nineteen tests. Five on the cycle, three on normalization, four on the conversion, and seven
component tests including one asserting six clicks do nothing and one asserting the settings search
never names Rømer before it is found.

## Coming back from a game keeps your place in the list — 2026-09-02

Open a game card, come back, and the popup dumped you at the top. On a busy slate that meant
scrolling down again to reach the game you had just been looking at, and it took the Up Next day
page with it, so a Thursday you had paged to was a Wednesday again on the way back.

Both came off the same line. `app.tsx` renders the view shell as `<div key={view}>`, and a changed
key tells React the old view is a different thing entirely, so it unmounts. The day page was
`useState` inside the view and went with it. The scroll offset is not React state at all: `scrollTop`
lives on the `.popup-container` element, which React has no model of and therefore cannot preserve.
Nothing warned about either one.

The key stays. It is what replays the slide-in on `.popup-view-shell`, and the animation is worth
keeping. What moved is the state. `selectedDayKey` is now held in `app.tsx`, and the offset is parked
in a ref the app owns, so both outlive any single mount of the view.

Because the offset belongs to the app rather than to the game screen, it is not the game screen
specifically that restores it. Settings and the tab suggestion sheet return you to your place too,
which falls out of where the ref lives rather than being three separate cases to keep in step.

`useRestoredScroll` restores in a layout effect rather than an effect. Both run after React commits
the DOM, but only a layout effect runs before the browser paints. With a plain effect the user sees
one frame at the top of the list and then a jump, which is worse than the bug it replaces.

The offset is captured twice, and both halves earn their place. A scroll listener covers the ordinary
case. A read during cleanup covers the frame the view is left in, because scroll events are
dispatched asynchronously and a scroll immediately before a click never reaches the listener. That
one is real rather than theoretical: it is what made the settings round trip fail while the game
screen passed. The cleanup read is guarded on `isConnected`, since a detached node reports 0 and
would overwrite a good offset with a bad one.

Restoring an offset the list has outgrown needs no guard. Assigning past the maximum clamps silently,
so you land at the bottom instead of throwing, and reading the value straight back records the
clamped number. A day whose games have kicked off while you were away cannot leave a saved offset
pointing into empty space.

Five tests on the hook, one on the day page and three end to end. The day page test was confirmed
failing with the state moved back inside the view before the fix went in.

Two things about the popup turned up while writing those tests, both worth recording because they
will bite the next layout test.

Bootstrap Icons is a webfont, and every game card measures two pixels shorter once it lands. Chrome's
scroll anchoring then nudges the offset to compensate, which reads as the restore being four pixels
out. `document.fonts.ready` is not enough on its own, since it resolves before a face nothing has
painted yet is ever requested. The spec forces every declared face in before it measures anything.

And `cy.get` resolves once while `should` retries against that same element. Querying the scroller
before the list is back pins the assertion to the detached container, which reports `scrollTop` 0 for
the whole four second retry window and looks exactly like the bug. Both round trip tests wait on the
list first.

The pro tip still re-rolls on every mount, so returning from a game can still insert or remove a
two line alert. At a five percent chance per mount that is rare enough to leave alone for now.

## Up Next pages by day instead of cutting the slate at ten — 2026-09-01

"Show 10 more" could hide half of one day. On a full MLB day you saw eight of fifteen games, with
the rest of that same date behind the button and a date divider above them claiming to head the lot.

The cut ran before the grouping. `mainView` sliced the flat, already-sorted list at a hardcoded 10
and `groupByDate` only ran afterwards, on whatever survived, so the cut point was wherever game ten
happened to fall. Nothing about that has to do with a date boundary.

Up Next now shows exactly one day. Grouping runs first and the section renders a single group, so a
day cannot be split — not by a smarter limit, but because there is no longer a number to get wrong.

The control is Bootstrap's `.pagination`, which was already compiled into the popup's CSS and unused.
It replaces the date divider rather than sitting under the list: the divider and a pager naming the
same date would have said it twice on any light day, and a pager at the foot of a fifteen-game list
leaves you at the bottom of a fresh day after every press. The arrows take the slack and the day
keeps its natural width, so both controls get a real hit area without stretching the active page
into a full-width bar of `$primary`.

Adopting it turned up a gap in the theme. Bootstrap 5.3's pagination is entirely CSS-variable
driven, so it picked up `--as-body-bg` and `--as-border-color` for free — but its disabled and hover
fills come from `--as-secondary-bg` and `--as-tertiary-bg`, which this theme never overrode and
which are therefore still Bootstrap's light defaults, `#e9ecef` and `#f8f9fa`. Nothing in the popup
had asked for them before. Rendered, the arrow at the end of the range was a white slab on a
`#0d1117` popup, and a focused arrow flashed white. They are set to popup colours here rather than
on `$body-secondary-bg`, so nothing else in the extension has to move.

`$pagination-active-color` goes to `#0d1117` for the same class of reason: Bootstrap picks the
active page's label with `$component-active-color`, a flat white that reaches only 3.22:1 on
`$primary`. Buttons escape this because they run the colour through `color-contrast()`; pagination
does not. And `$pagination-font-size` drops to 0.72rem, since this pagination heads a section rather
than closing a page of results, and `$font-size-base` is 15px.

None of the three light-default bugs were visible to a test that only asked what was in the DOM.
They were caught by rendering the popup at 320x560 and looking at it, and each now has an assertion
on the computed colour.

The pager renders on a one-day slate too, with both arrows disabled, because it is the only thing
naming the day now and that day would otherwise be unheaded.

The page is held as a date key rather than an index. The day list is rebuilt on every poll — games
kick off and leave the `pre` list, the range setting moves, midnight rolls the labels forward — and
an index survives all of that still pointing at whatever now sits in that slot. Store `2` and a day
dropping off the front moves you to Thursday without saying so. Store Wednesday and you are on
Wednesday for as long as there is one.

When there is no longer one, the pager snaps to the first day rather than hunting for the nearest
surviving date. Landing somewhere real beats landing somewhere clever, and the case it costs you is
narrow: the day you were reading has to empty out entirely while you sit on it, which in practice
means its last game kicked off and the day you wanted is now live.

`main.showMoreUpcoming` is gone from all twelve locales, replaced by three keys the pager needs.
All three are accessible names: the nav's label and the two arrows, which are chevrons with no text
of their own. The visible text is the date, which comes from `toLocaleDateString` and not from our
locale files at all — so its length is not something a string audit can bound, and the width test
measures a German date rather than reading one out of the JSON.

Nine tests on the pager, five on the section and four on the resolver. The first section test
mounts a twelve-game day and asserts all twelve render, which is #103 stated directly and fails
against the old slice.

One existing test changed shape rather than being deleted. `sorts upcoming games by day before
league priority` read two cards out of one flat list, and there is no longer a flat list spanning
days. The invariant still matters — day-first sorting is what lets `groupByDate` build its groups in
a single pass — so it is now asserted as page order instead of row order, which also pins the days
into chronological order on the way past.

## The empty state stopped shuffling its own message — 2026-08-30

With nothing live and upcoming games turned off, the popup shows one of seven written "no games"
lines. It was visibly flipping through several of them before settling, most often right after a
refresh.

The roll was sitting in the render body. Render is meant to be a pure function of props and state,
so React is free to run it as often as it likes, and `mutate` re-renders the popup more than once as
it settles. Every one of those passes drew a new message. It only looked intermittent because seven
options means a one-in-seven chance of drawing the same line twice and hiding the seam.

Moving the roll into `useState` was most of it, but not all of it. `EmptyGameState` renders
unconditionally and returns `null` internally, so it never unmounts, and a `useState` at the top of
it would have frozen one message for the whole time the popup stayed open. A slate that emptied,
filled and emptied again would have shown the same line both times. The `noGames` branch is its own
file now, `noGamesMessage.tsx`, rendered only while the empty state is up. React mounts it when the
state appears and unmounts it when games arrive, so the message lasts exactly as long as the thing
it captions.

The initializer is passed to `useState` rather than called into it. `useState(getRandomNoGamesMessage())`
also fixes the flicker, since React ignores the argument after the first render, but it leaves two
`i18n.t` lookups running on every pass for a result that gets thrown away.

The issue asked for a fresh message once a refresh completes. That one was dropped on purpose. SWR
reports `isLoading` only when it has no cached data, so a manual refresh over an existing slate never
flips it, and honouring the request would have meant threading a refresh counter from `App.tsx` down
through `mainView` for the sake of re-rolling a joke. Holding the message steady through a refresh is
closer to what the bug was complaining about anyway.

Three component tests. One asserts the message survives twelve re-renders, which a re-rolling render
body clears about once in thirteen billion runs, and it was confirmed failing against the old code
before the fix went in. One takes the empty state away and brings it back twenty times and asserts
more than one message appears, which is the mount boundary doing its job rather than a `useState`
that simply never re-runs. The third checks the text is one of the seven lines we actually wrote.

## The series dots went missing when the postseason did — 2026-08-30

A pre-game screen drew no series dots at all. The scoreboard had started carrying both teams'
records, which left the summary endpoint with nothing to answer for a game that has not started
except the dots themselves, so the request was gated off — and the gate asked for a postseason game.
Every regular-season series went dark. Baseball plays a three-game set roughly every three days
from March to September, so this was most of the year.

The gate now asks only whether the sport draws dots at all. Football and soccer pre-game screens
still skip the request, which was the saving worth having; baseball, basketball, hockey and
softball make it again.

Restoring the request was most of it. The other half was that `seasonseries` is an array and the
entry wanted is not reliably its first element — a `preseason` entry can sit in front of the one
that matters — so the lookup is by name now rather than by index.

Only `current` counts. ESPN mints that entry once a series is actually underway and keeps it there
through the pre-game hours before each remaining game, which is exactly the window the dots are
for: MIA at WSH, four hours from first pitch, reads `current`, "WSH leads series 2-1", four games.
A series that has not started has no `current` entry at all, only a `season` one holding the whole
head-to-head — and PHI at ARI, opening a series tomorrow, carries "ARI leads series 2-1" from their
last meeting in June. Captioning an unplayed series with the result of a previous one is worse than
saying nothing, so a series opener draws nothing.

The summary beside the dots was set in Lekton, which is the face this project reserves for figures
that change in place: the game clock, the scores, the records. "WSH leads series 2-1" is a caption,
not a column, and it reads as a sentence in sans at its own casing. It needed `line-height: 1` to
sit on the dots' optical centre, the row being centred against circular icons.

Separately, `test:e2e` had been failing on the full verification run and passing on its own. Cypress
serves `.output/chrome-mv3` for the length of a run, and `wxt zip` deletes and rebuilds that same
directory as part of its own build. Turbo had no edge between the two tasks, so it scheduled them
together and the server lost its files mid-run. Worse, the abort left the directory half-written,
which broke the next run before it started and made the whole thing look like a missing build. The
e2e build takes its own `outDir` now, and the two tasks stop sharing a directory.

## The venue named the building but not the city — 2026-08-28

The venue line read "Xfinity Mobile Arena". Which is in Philadelphia, though the popup never said
so, and neither did "Rocket Arena" or "Daikin Park" — buildings that have all been renamed inside
the last three years and carry no city in their names at all.

ESPN had been sending the address the whole time. `EspnCompetitionVenueSchema` declared three keys,
and Zod's strip mode deleted `address` before the parser could look at it — the same failure as the
pre-game competitor fields, two entries up. The schema keeps `city`, `state` and `country` now, and
the popup finally names the city.

The state is passed through exactly as ESPN sends it, which means the NFL and NHL read "Inglewood,
CA" while MLB reads "Chicago, Illinois". Normalising that would mean owning a state-and-province
lookup table forever to win nothing but tidiness. `country` only stands in where there is no state,
so an English fixture reads "London, England" and a domestic game never reads "Inglewood, CA, USA".

It shows on the detail screen and nowhere else. The building takes bold and the city sits under it
at normal weight, so weight does the separating and no punctuation, colour change or second size is
needed to tell them apart.

The cards were tried both ways first — stacked, then run onto one line — and neither earned the
room. A card exists to answer "should I switch to this", and the city is not part of that answer;
it is what you want once you have already opened the game. So the cards name the building and stop,
at the weight of the meta around them. The same run took the odds attribution off its own line and
moved it to the end of the line it describes, which leaves the live card at 208px, twelve pixels
shorter than before any of this.

The attribution's first attempt was a bare `title` attribute, which turned out to be a tooltip in
name only: a second of hover delay, no cursor change, nothing drawn, and 8.6px of text to find it
on. It is a real Bootstrap tooltip now, on the same themed styling the settings explainers use,
with a dotted rule and a help cursor to say there is something there. The trigger is a `button`
rather than a span, which puts it in the tab order without a hand-placed `tabIndex` and means the
card's own click handler already ignores it — `isInteractiveCardTarget` has skipped anything inside
a button since long before this. The provider's name rides in the tooltip text too, because that
string ends in a colon it used to introduce a visible name with.

Bootstrap arrives on a lazily imported chunk so the marketing site, which renders these cards but
never an odds line, does not pay for it. Two things fell out of that. Tearing the tooltip down while
it was still shown threw from inside Popper once React had removed the element, which surfaced as a
test failing roughly half the time in a completely unrelated assertion; `animation: false` plus an
explicit `hide()` before `dispose()` fixed it. And any test that fires the hover before the chunk
lands passes only because a previous test warmed the module, so both now wait on
`data-bs-original-title` first.

Ten parser tests, every address taken verbatim from a live ESPN response, plus a card spec whose
fixture carries a location throughout precisely so that the cards can be caught rendering it.

## A shared city stops standing in for two teams — 2026-08-27

Manual testing turned up a suggestion that should never have been made: an Xfinity tab streaming
**Dodgers at Braves** was offered, pre-checked, as **Rams @ Chargers**.

The cause was the rule that lets two faint reads count as one firm one — the thing that stops a tab
titled "Boston Globe" surfacing every Boston game. It assumed the two reads were independent. They
are not when both teams share a city: the single `Los-Angeles` in that URL was scored once for the
Rams and again for the Chargers, then collected the both-teams bonus on top. Eighteen plus eighteen
plus twenty-five is sixty-one, which clears the pre-check gate. One coincidence, billed twice.

A weak match whose text the other team has already claimed is now dropped, so a shared city cannot
be evidence for both sides of the same game. `Ohio State vs Michigan` is unaffected — those are two
different mentions — and the all-Los-Angeles game still matches the moment either nickname appears.
The same fix covers Chicago, New York, and every other shared market for free.

Six tests, five of them built from the URLs that exposed it. Worth recording that the correct game
scored 103 on that same tab throughout: the matcher had always read the URL, and had the Dodgers
game been eligible it would have won on merit.

## The pre-game screen was throwing away the answer — 2026-08-27

A pre-game game gave you two crests, "vs", a start time and an odds line. For a baseball game the
single most useful thing you could know in advance — who is pitching — was not on the screen, and
neither was any team context at all.

It was never a missing request. `EspnCompetitorSchema` declared five keys, and Zod's default strip
mode silently deleted every other field on a competitor before the parser ever saw it. The probable
starters, the team records and the statistical leaders were all in the payload we already fetch, and
were discarded on every poll. Declaring them costs no additional ESPN calls; the detail screen now
makes one fewer.

### What the survey turned up
The first pass sampled a single day, 2026-08-27, which put the NHL and the NBA in their offseason
and made it look like they send none of this. Re-sampled at in-season dates, three things changed
the shape of the work:

- **Probables are not baseball-only.** Hockey sends `probableStartingGoalie` on every in-season
  competitor sampled, with an empty record string and an `expected` / `confirmed` status baseball
  never sends. Matching the shared `probableStarting` prefix covers both sports with one rule and
  leaves room for a third
- **The overall record is not consistently keyed.** It is `type: 'total'` in most leagues, `'ytd'`
  in the NHL and `'standingsoverall'` in the AFL, so a lone `find` on `'total'` returns nothing at
  all for hockey. Resolution is a preference chain ending in a positional fallback, since index 0
  held the overall record in every league sampled
- **Leaders change meaning with the event state.** The same MLB category reads `27` before a game,
  `0-0` during it, and `"1-4, HR, 4 RBI, 2 R, BB"` after — that game's box line, repeated
  identically across every category. Gating leaders on the pre-game state is correctness, not
  economy

Community documentation was no help: `probables` is undocumented in every public reference, and the
one gist that describes `records[].type` lists a value that does not exist.

### On the screen
- **Probable starters mirror the poster**, away left and home right, each under the crest it belongs
  to, with the player's headshot ringed in the team's colour. A game with only one side named leaves
  the other half empty rather than re-centring the name it has — 14 of 98 upcoming games were
  one-sided, and a lone centred name reads as belonging to neither team
- **A pitcher's numbers say what they are.** ESPN pre-formats them as `(3-1, 4.23)`, which is two
  numbers and no indication of what either one is. They are split back out of the separate `wins`,
  `losses` and `ERA` stats — present on all 182 upcoming probables sampled — and rendered as two
  labelled pairs, value over label, the way a box score heads a column. Hockey shows a goalie's name
  and whether the start is confirmed, and no numbers at all, because a goalie's record field is
  always empty and its statistics array is empty with it
- Neither those numbers nor the leader values are set in Lekton any more. The monospace face is for
  figures you scan down a column — a clock, a score — and these are read in place
- **Team leaders get the full width of the card, not half of it.** They were mirrored too at first,
  and it did not survive football: a value there runs to 21 characters — `14/23, 141 YDS, 1 INT` —
  against four for baseball's `.276`, and no half-width column fits both. Every leader now gets one
  full-width row grouped under its category, and the team is carried by a wash of its own colour
  across the row rather than by which side of the card it sits on
- Within a row, the name takes the slack and the value keeps its own width. A clipped name is still
  readable; a clipped stat is not
- Headshots crop with `object-fit: cover`, not the crest's `contain`. A headshot is a 350x254 photo
  of a person, and fitting one whole inside a circle leaves empty bands above and below the head
- **Headshots throughout**, 38px on a starter and 20px on a leader, from the same
  `a.espncdn.com` host the team logos already come from. They are near-universal — 776 of 776 MLB
  leaders, every goalie sampled — except in soccer, which sends one for roughly a leader in ten, so
  the placeholder is a designed state rather than a failure: a circle in the team's colour carrying
  the player's initials, holding the row's height and left edge exactly
- **The disc a player stands on is the team's colour**, and the initials sit on the same disc rather
  than bringing their own background. ESPN headshots are cut-outs with transparent backgrounds, so
  the disc is what the player is actually standing on and it has to outlive the placeholder. The ink
  on it follows the colour's luminance — white on a navy, near-black on a Bruins gold, since 0.1833
  is where white stops clearing 4.5:1. `readableInkOn` sits in `colorUtils` next to the luminance
  maths it needs, rather than repeating that arithmetic inside a component
- Getting there took a wrong turn worth recording. The placeholder is laid out *and hidden* by
  `_crest.scss`, and restating any of it in a call site is a silent override: a nested
  `.crest-fallback` rule matches `[data-crest-state='loaded'] > .crest-fallback` on specificity and
  beats it on source order, so the placeholder stayed in the layout and its white initials showed
  through every loaded headshot. Team logos never exposed it because they are opaque
- **Team leaders, one row per category**, capped at three. The proprietary composites are dropped by
  a rule about how ESPN names things rather than a list of the names themselves, which is what keeps
  `MLBRating` and basketball's `rating` out without anyone maintaining an inventory
- **A per-game average is labelled as one.** The first version of this collapsed ESPN's
  `pointsPerGame` into `points` on the theory that they were duplicates, which would have printed
  the WNBA's 19.4 under the season-points label. Live data says the WNBA sends only the per-game
  variants and the NBA only the totals — no league sends both — so the two stay distinct and the
  per-game rows carry PPG, RPG and APG. Soccer's `goals` and `goalsLeaders` really are duplicates
  and really are collapsed
- **Labels are keyed by sport, not by category name.** `points` and `assists` mean one thing in
  basketball and another in hockey, and `goals` is shared by hockey and soccer, so a flat map would
  print a hockey points leader as a basketball one. A category we have no label for falls back to
  ESPN's own abbreviation instead of rendering a raw key
- Values render verbatim. The football ones carry their own English units and there is no version of
  `"12 CAR, 68 YDS, 1 TD"` we could assemble ourselves
- The block does not render at all for a sport that sends neither, so college football and college
  hockey screens are unchanged

### One fewer request
Team records used to cost a per-game `/summary` fetch on every detail screen. They now come off the
scoreboard, with `/summary` kept as the fallback for the leagues and dates that send none. That
makes the request skippable before a game starts: the series dots are the only thing left on a
pre-game screen the scoreboard cannot supply, so a soccer or regular-season baseball game fires no
`/summary` call at all. Hockey and basketball fall through to the fetch on their own, which is what
keeps them working before their season is underway.

### Strings and coverage
- Twenty-two new `detail` keys across all twelve locales: the two starter headings, the two starter
  statuses, the leaders heading, the two pitcher stat labels, and fifteen stat abbreviations. A
  Cypress spec renders every locale's string in place and measures it, since these are the strings
  with the least room to grow into. Most keep the English abbreviation, which is not laziness —
  German BBL and Japanese B.League print PTS, REB and AST in their own official box scores, and
  Italian FIBS's own abbreviation for a home run is literally HR. Where a language does have its
  own, it is used: German and French hockey take T / V / PKT and B / A / PTS from NHL.com's own
  localized glossaries, and both Chinese locales use the native terms CPBL and CBA print
- **31 new unit tests on the parse**, each built from a payload transcribed off the live API. The
  NHL's `ytd` record, college football's four record types, a goalie whose record string is empty,
  both duplicate category pairs, a rookie at `0-0` that a truthiness check would have eaten, and the
  state gate. One more covers a `leaders` field arriving as a `$ref` string instead of an array,
  which is what cricket sends and no league we ship does yet
- **11 on the two helpers pulled out of components.** `shouldFetchSummary` is an exported predicate
  rather than a condition inside a `useEffect`, and `playerInitials` lives in a `.ts` file rather
  than the `.tsx` that renders it. Same reason for both: the extension's Jest runs in a node
  environment with no DOM, and there is no React Testing Library anywhere in the repo, so a decision
  buried in a component is a decision nothing can test
- **24 component tests on the block.** Both degradation cases, the sport-keyed label lookup, the
  placeholder holding a row's height and left edge, every locale's labels measured where they
  actually render, and an assertion that no football value is ever clipped. The headshot tests mount
  a 1x1 transparent PNG as a data URI, so they are deterministic and need no network. Transparent on
  purpose: an opaque image would paint over a placeholder that failed to hide and pass with the bug
  still in place. That test was run against the unfixed stylesheet and confirmed failing before the
  fix went in
- Three assertions changed shape while being written, each wrong in its own way. One claimed a
  starter shared a centre line with its crest, which two grids with different padding cannot hold.
  One measured a leader label against a fixed-width column the full-width redesign had removed. One
  took a locale's budget from the row's own shrink-to-fit width before swapping longer text in, so
  it measured Japanese against a box sized for English and failed a layout that was fine
- Demo mode gets an MLB pre-game game and an NHL one, so the block is visible without waiting on a
  real slate. The Canadiens goalie in it has no headshot on purpose, because the initials disc is
  the state most likely to rot without anyone noticing

## ArenaSwap reads your tabs and guesses — 2026-08-27

Pairing a tab with a game was the one part of the workflow that scaled badly. The only control was
the `— Assign a tab —` dropdown on each game card, one game at a time, and every dropdown listed
every open tab with no hint which one was right. Nothing in the extension had ever looked at what a
tab was actually showing.

It does now. ArenaSwap scores the open tabs against the games it knows about and offers the pairings
in a review sheet. It is a suggestion and never an assignment — nothing reaches the registry until
the Assign button is pressed, and the dropdown still has the final say.

### What counts as a match
- **Whole tokens, never substrings.** The tab's title and decoded URL become one padded token
  string, so `BOS` cannot match inside `jobs`, `Boston`, or `bosnia`. The entire class of
  abbreviation false positives is a property of the data structure rather than a special case
- **A signal either identifies a team or corroborates one.** A full name or a nickname identifies;
  a bare city, a lone abbreviation, and the league name only corroborate. A pair has to be
  identified by something before it can appear at all
- **Two faint reads count as one firm one.** `new york` in a team name and `ohio state` in another
  are the same shape — nothing in the string says one is a city and the other a school. So the
  decision is made across both teams at once: `Ohio State vs Michigan` matches because both sides
  register, and `The New York Times` does not because only one does
- **ESPN's own gamecast is matched exactly.** `Game.id` is the ESPN event id, and ESPN's URLs carry
  it. It only counts behind a recognisable key — a bare number is ignored, since soccer event ids
  are six digits and would otherwise match half the product pages on the web
- **No maintained lists.** A streaming-domain allowlist and a replay-keyword filter were both
  considered and dropped. The one list that ships is ~30 club-form words (`fc`, `united`, `real`,
  `state`), which tracks language rather than the outside world and does not grow when a league adds
  a team

### The sheet
- A dismissible banner in the main view opens `suggestView`, a fourth popup view. One row per tab,
  paired with its best game, so the list is bounded by how many tabs are open rather than by the
  size of the slate
- **No score, badge or confidence meter is ever drawn.** A weak row simply arrives unchecked
- Checking a row releases whichever row was holding that game, so the list never shows a state it
  will not honour
- Dismissal is per pair and lasts the session. Every row that was shown is recorded, not just the
  accepted ones — otherwise the rejected rows would raise the banner again on the next open
- Scheduled games are eligible alongside live ones. When a tab fits both, live wins, as a tiebreak
  rather than a bonus: a weak live match should not beat a strong scheduled one

### One thing this tidied on the way past
`tabAssignSelect` had the registry's one-tab-one-game rule inlined in its change handler. It is now
`assignTabToGame` in `utils/tabSuggestions.ts`, shared by the dropdown and the apply step, with a
test asserting the extraction reproduces the old behavior. Two writers drifting on that invariant
was the likeliest way this feature could have corrupted the registry.

### Strings and coverage
- A `suggest` namespace across all twelve locales — eleven keys each, including the two-form plural
  counts on the banner copy, the apply button and the confirmation toast. "Slate" was translated for
  meaning rather than calqued, so it reads as the day's fixtures in each language
- Every row carries a full `rowLabel` for screen readers. The visible row is crests, abbreviations
  and a truncated tab title, none of which announces well on its own
- **38 unit tests on the matcher**, weighted toward the matches that must *not* happen: `Boston
  Globe`, `The New York Times`, `Best Jobs in Boston`, `OSU Extension Service` on `extension.osu.edu`,
  a bare event id in a query string, and a six-digit soccer id in a product URL
- **8 component tests on the sheet**, including one asserting no score ever reaches the DOM and one
  measuring every locale's apply label against the real button width, since a wrapped primary button
  reads as a layout bug rather than a long word

## Documentation, split in two and given real URLs — 2026-08-23

The docs site had a schema, a side nav and two section pages, and no content in them. It now has
fifteen articles: eight for people watching sports, seven for people scoring games with the
`powerscore` package. The two halves are written for different readers and never pretend otherwise.

### Routing
- **One article, one URL.** `/docs/[section].astro` stacked every entry onto a single page, so two
  URLs would have answered every question a reader had. The tree is now `/docs/` (a hub),
  `/docs/<section>/` (an index), and `/docs/<section>/<slug>/` (the article), added as
  `pages/docs/index.astro`, `pages/docs/[section]/index.astro` and `pages/docs/[section]/[slug].astro`
- **`lib/docs.ts` holds the section metadata, the slug helper and the collection query**, so the hub,
  the indexes, the articles and the side nav all describe a section the same way
- **`DocsNav` is generated from the collection** rather than a hand-kept list of three links. Both
  trees are always shown, so a reader on a PowerScore page can see the extension pages exist
- Previous and next links stay inside a section. Walking from the last extension article into the
  first PowerScore one would hand a reader documentation for a package they never asked about
- **"Docs" in the header, the footer and the 404 page now points at `/docs/`**, not at
  `/docs/extension/`

### Frontmatter
- **`navLabel`**, for when a title is longer than the 13rem side nav
- **`faq`**, an optional list of question and answer pairs. It renders as a disclosure block below
  the article and emits `FAQPage` structured data
- Every article page carries its own `<title>`, meta description, canonical URL, `og:type=article`,
  and `TechArticle` plus `BreadcrumbList` JSON-LD. All 18 new URLs are in the sitemap
- `placeholder.md` is deleted. It existed to keep the collection non-empty and there is content now

### Two things the writing pass caught
- **A stuck switch was described as sensitivity set too high. It is the opposite.**
  `sensitivityThresholds` maps level 7 to a 1-point gap and level 1 to 37, so level 7 switches most
  aggressively. A switch that never fires means sensitivity is low
- **A worked example in `scoring-a-game.md` could not be reproduced.** It printed a score for a
  `Game` the page never showed, built from the abstract return of `toGame(event)`. The example now
  defines the game it scores, and both it and the `getting-started.md` tutorial were re-run against
  the real scorer field by field
