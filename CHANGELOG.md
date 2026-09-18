# Changelog

> One or two lines per entry: what changed, and the one thing about it worth knowing later.
> The code, the tests and the git history hold the rest. Do not write essays here.

## The opening beat says who is playing, in full — 2026-09-18

"Miami Marlins", "Washington Commanders", "Los Angeles Chargers" — the one thing an in-stadium matchup
graphic says out loud that this one never did. The poster after it carries tricodes, and a tricode is
something you decode rather than read. ESPN's `displayName`, already carried as `Team.name`, printed
whole: nothing is assembled from the nickname, because the club is "Penn State Nittany Lions" and the
nickname alone is "Nittany Lions", so there is no place name to join or slice.

A sibling of each colour field rather than a child of one, because the field is `teamCrest`'s own
wrapper and takes no children. It carries the same geometry and the same seam clip as the field it
names — now three selectors on that one rule rather than two — so a club name wider than the short side
of the lean is cut by the seam instead of crossing it, and two leans of padding on that side mean it is
never actually cut. Measured on the longest pair in the product: "Portland Trail Blazers" against
"Massachusetts Minutemen", thirteen characters in one word, against a half-card about 119px wide at the
bottom. Both wrap to two lines, which is how a scoreboard sets them anyway.

The scrim under the type is legibility rather than taste, and it is the same problem the field had one
layer up: what is behind the name is the team's colour on most cards and `teamCrest`'s near-white plate
on the rest, and nothing here gets to know which. White on a dark wash reads on both — on a navy and on
a bright gold — where an ink picked for either would have been wrong on the other. So the spec pins the
wash, not the colour. The names arrive 18% into the beat rather than with the crests, because a graphic
where everything lands at once reads as one lump.

Written as its own component and its own spec file, with two lines added to `gameCardReveal` — an
import and a call. That file was being edited by another agent at the time, and the footprint is the
point rather than the module boundary. No new locale keys: it is ESPN's own string.

## The oversized crests take their colour across the whole card, not into a disc — 2026-09-18

Three passes on this beat, and each one moved the colour somewhere else: onto the dark plate the rest of
the graphic builds over, then onto a neutral field, then onto a disc behind each crest. The maintainer's
call is the one that was in front of us the whole time — take the colour the disc would have been and
spread it across the card at full size. No disc, no third surface, and each crest clipped where its
colour ends.

The mechanism is the part worth keeping. The element `teamCrest` paints when a crest's colours will not
read on the surface it was handed is the same element this file styles, so making *that* the colour
field means the colour is right without this file working it out. Where the artwork reads on its team's
colour the wrapper comes back bare and the rule here paints the team colour — a light mark on a navy.
Where it does not, `teamCrest` sets its tinted plate inline and an inline style wins, so the field
becomes the lighter surface that crest needs — a navy monogram on navy, which is the case that plate
exists for and which the popup cannot answer with a monochrome mark because its state carries none.
Either way the crest ends up on exactly the colour a disc would have given it. One spec per path, and
the shipped fixture card still exercises both at once.

The seam is now one shape in one place. The opening's two fields are the poster's halves at full width,
so they take the same two `clip-path` polygons: a crest is clipped along the exact line the poster's own
half then grows into, and one seam written twice is two seams waiting to disagree. It also means the
layer carrying them paints nothing itself — the fields cover the card between them — and the mid tone
the entry below introduced is gone with the reason for it.

What could have been lost is the poster's opening move, since the halves now wipe in over colour that
is already there. It survives, and the reason is the shading: the halves are washed dark at their outer
edge and the opening's fields are flat, so what travels inward is a visible edge across the logos
rather than nothing at all. Checked by reading the frames, not by reasoning about them.

## A crest is the team's crest, in the team's colours, everywhere — 2026-09-17

Reverts the crest colour treatment entirely. It measured each crest's pixels against the surface behind it
and swapped in ESPN's monochrome mark, or a tinted plate, wherever the artwork did not clear a contrast
floor — and it was right about legibility and wrong about the product: a crest swapped for a white
silhouette is no longer that team's crest, and which teams it happened to was not something a reader could
predict or a designer could see coming. Gone with it: the mono-mark fetch and its `storage.local` cache, the
`/summary` mark parse, `TeamMonoMarks`, the persisted verdict store, and every `:not(.is-bare)` plate rule.
`TeamCrest` is now a crest in a sizing box. The one thing kept is the fix underneath all of it: `pickPair`
still refuses to answer a clash with black against white, so Baltimore's purple stays `#29126F` against
Indianapolis' `#003B75`. `background` survives as a vestigial prop only because the open-reveal poster still
passes it and that file is being worked on elsewhere.

## The first open of the day opens on the two crests, too big for the card — 2026-09-17

A beat ahead of the poster, which is a thing this graphic has now been given twice after being refused
twice. The refusals were right: a light line drawing itself down the centre, and a flourish after the
card resolved, were each a different graphic wearing this one's clothes. This one is not, and the reason
is that it is made of nothing new. The two crests the poster already resolves into are drawn at 1.34 of
the card's height — so neither of them fits, each overhangs about a sixth of the card top and bottom and
runs off its own outer side — and then they shrink towards the hold the poster holds them at while the
colour grows over them. There is no transition to design, because the thing that takes the opening away
is the next beat arriving.

Three details carry that. It is **its own layer**, because the poster's crest layer is clipped to show
nothing until a bar has crossed it and these have to be up on the first frame. It sits **between the dark
base and the poster** in the stacking, which is what makes the handoff free — a spec pins that ordering,
since an inversion would have the oversized pair riding over the card instead of dying under it. And the
overhang is **cut at the card's edge** by the same clip and the same pixel of bleed the poster's layers
take: a crest that merely happened to be large reads as a mistake, and one cut off by the frame reads as
artwork placed deliberately past it. The specs assert the overhang as overhang — off the top, off the
bottom, off its own outer side — rather than as a size, because a size passes on a card of any height and
this fails the moment the pair start fitting.

The timeline grew a phase, so `--reveal-delay` stopped being able to mean both things. It is the cascade
alone now, and **`--reveal-spine`** is when a card's poster starts: 22 delays in the stylesheet moved onto
it, and the two are the same value in `quick`, which is how that version stays byte-identical for the
third pass running. What the opening beat costs is one figure the stylesheet names by hand and a spec that
will not let it drift — the layer has to stay alive at least until the halves meet at 884ms, because they
part again at the end and anything still underneath would be uncovered a second time.

And the rate came back down, 1.5 → **1.3**. Once there is a beat carrying the extra length, the rest of it
does not have to come out of playing the same thing slower: 5460ms a card against 5100, and less of it is
stretch. Two traps worth keeping. `revealDurationMs` is the poster alone and `revealTotalMs` is both
phases — the card is removed after the second, and reading the first would take the wrapper off a card
still mid-opening. And every absolute millisecond in the component spec is now offset by the opening beat
as well as scaled by the rate, which is why they are all written as poster-relative figures and put onto
the timeline by one helper: the two things that move them have each moved twice.

## The open animation is cut like a broadcast package rather than timed like one — 2026-09-17

Two passes, and the first one only did the easy half. Length is one constant and that part was right:
`--reveal-rate` was already the single time knob, so `full` going 1 → **1.5** takes every beat half again
as long in the same proportion to every other, moves not one line of timing in the stylesheet, and leaves
`quick` byte-identical because only `full`'s rate changed. 5100ms a card, 5820 for the list. But a graphic
played slower is still the same graphic, and the maintainer's read was "you didnt do enough".

What was missing was craft rather than content, and naming it took reading up on the motion-design
vocabulary rather than on stadium graphics: **offset, overshoot, secondary action, parallax, masked
reveal, easing.** Audited against that list this graphic scored one out of six. Masked reveal it already
was — the clip-complement wipe is the whole thing, and it is good. Everything else was absent, and one
source puts it bluntly: elements that overshoot and settle are "the difference between work that feels
amateur and work that feels considered." Nothing here overshot anything. Every layer sat dead still until
its cue, then moved once, at one rate, and stopped.

So: the lettering is **driven on from its own outer edge and lands rather than stopping**, past its resting
place and back, instead of fading up on the spot. The overshoot is scaled by `--reveal-abbr-scale` because
the clearance between the two sides is scaled by it too — measured, UCONN against UMASS rests 28.0px apart
and the settle costs 2.4 of it, and the spec that guards that gap is now pinned to the overshoot frame
rather than to an unscrubbed one where both sides are still parked outward and 44px apart, which is the one
moment it could never fail. The **crest drifts 5px against the lettering's 16** over the same arrival,
which is parallax: a nearer layer and a further one at different rates on the one axis this graphic
allows. Its walk down onto the card's crest **settles** rather than arriving — past the slot a hair and
back, inside the segment, so the 93% stop is still exactly the card's own crest at exactly scale 1. The
landing stays the landing. The **colour fields are shaded** from their outer edge in towards the seam,
along the same lean, which is what puts them in front of the card rather than level with it and makes the
seam the brightest line on the poster; a black wash over `background-color` rather than a second colour,
because nothing in here should be inventing one. And the **pass is a group of three bars that opens out as
it crosses** — each thinner, fainter and slower than the one ahead. Only the leading bar's 1000ms matters,
since its trailing edge is the reveal edge and the clips are cut to that window.

Out again: the team records. They were the previous pass's one addition that was information rather than
motion, they were correct about what an in-stadium matchup graphic carries, and the maintainer did not want
them on the card. The measurement they produced is worth keeping though — an offset taken off the lettering
*box* rather than off the lettering put a thing 35px below the centre on every card regardless of type
size, which is 1.8px inside a full tricode's ink and 13.2px clear of a five-letter one. Anything hung off
that box later has the same problem.

One spec failed for a real reason rather than a stale number, which is the one to keep hold of: the parked
bars are read at the far end of their travel, and that end moves whenever the pass does. It was 2700ms for
two bars of 1000ms; the trailing bar now leaves at 1760 and drags for 1120, so nothing is parked until
2880. No new locale keys.

## The popup stops scrolling sideways while the open animation plays — 2026-09-17

A clip path clips painting and says nothing about scrollable overflow, which is the half of
`overflow: hidden` that the entry below quietly dropped when it swapped one for the other on the
stage and the sweeps. The wipe bars park a bar width and a lean clear of the card's right edge, so
they went on counting towards the page's scroll width from out there: 334px of it against a 305px
frame, draggable 29px sideways for the length of the graphic. Both layers take `overflow: clip` back
alongside the clip path — `clip` rather than `hidden` because nothing in there is meant to be
scrollable even programmatically — with `overflow-clip-margin: 1px`, which is the bleed again, since
`overflow` alone cuts at the box and would take back the pixel the clip path is there to add.

Measuring it found a second one underneath, older than any of this and the same shape: the view
shell arrives on `translateX(14px)`, a transform counts towards scrollable overflow too, and so every
view change in the popup's history has been 14px draggable for its own 0.22s. `.popup-root` clips its
x axis now, and only its x axis — a popup that cannot be scrolled down is a worse bug than one that
can be nudged sideways, so the spec asserts the axis rather than the scroll height, which a two-game
slate would pass by having nothing to scroll. Pinned on the built popup rather than in a component
test, because the thing that scrolls is the popup's own frame.

## The seam crosses the centre by a tenth of the card at most, not by however tall it is — 2026-09-17

The maintainer, on the graphic eating the away side's half: "it's like I took the right block and slid
it across the table into the left, and part of the left fell off." Measured on a component fixture the
join was centred to 0.4px and leaning a symmetric ±27px, which is why the first two readings of this
were wrong. The fixture was the problem: a stub live card is 148px tall and the one the shipped popup
draws is **210px**, the lean is half the horizontal run of the angle across the card's height, and it
was bounded by nothing. So the real card's join crossed the centre by 39.7px of a 296px card — better
than an eighth of the way across — and while each half still held exactly half the card, the bottom
row of the away half was 63% the home team's colour. Read off a screen rather than a spec, that is a
block that has been slid sideways. It also explains the Chrome-but-not-Edge report: nothing differs
between the two engines here, but the amount depends on the card's height, so whichever browser had
the taller cards on screen showed it worse.

Bounded at a tenth of the card's width, which is what a 158px card reaches at the full 20.5° — so the
shorter cards in a list are untouched and the tall ones come down to meet them, and the crossing is a
fact about the card you are looking at rather than about how many rows it happens to carry. The real
card goes 39.7px → 29.6px at an effective 15.6°. `revealLeanWidthCap` is the one number to turn if
that is still too far.

The angle stops being a constant on every card, so the bars can no longer name it themselves: 20.5°
was written into the stylesheet by hand in six places, with a unit test pinning it against
`revealSweepAngleDeg` precisely because the bar has to stay parallel to the edge it reveals along.
`--reveal-skew` is derived from the bounded lean now and the stylesheet names no degrees at all,
which is strictly better than two figures that have to agree: parallelism holds by construction. The
parked bars come along for free, since their clearance was already one bar width and one lean, and a
strip skewed by the lean's own angle reaches exactly one lean to either side. No new locale keys.

## A parked wipe bar is off the card, once the skew is counted — 2026-09-17

The white lines in the corners at the beginning and end of the open animation, which the entry below
was chasing on the wrong layer. The bars park at one end of their travel for two and a half of the
graphic's 3.4 seconds, and they were not parked off the card: a bar overshot 30% above and below it,
on the reasoning that a skewed strip should be long enough that the lean never drags a corner into
view, and that overshoot is exactly what dragged the corners into view. Skewing about the centre
throws a strip's ends sideways by its own half-height times the angle, so 1.6 card-heights of strip
made a 22px bar a 112px bounding box, and 18% of the card's width was not enough to clear it — 13.7px
of white was left over the top-left corner for the first second and a half, and over the bottom-left
for the last. On a taller card, more: the intrusion grows with the card's height, which is why a live
card showed it worst.

Skew changes nothing about vertical extent, so the strip is the height of the stage now and covers
the card just as completely, and its ends land exactly `--reveal-lean` to either side — that being
what the lean already is, half the run of this angle across this box. Which makes the parking exact
rather than eyeballed: one bar width and one lean clear of the edge it comes in from, one lean clear
of the edge it leaves by, so `revealSweepRun` is the card's width plus a bar width plus two leans.
The four reveal edges moved with it, because the edge a bar reveals along is that bar's own trailing
side and they stop being one line the moment either end drifts. Pinned by a spec that measures the
parked bounding box against the card at both ends of the travel: the design figure is zero overlap,
and the tolerance is the 0.0124px of float noise a skewed box measures with. No new locale keys.

## The graphic covers the card by a pixel, because a cover of its exact shape cannot — 2026-09-17

The white lines in the corners of the open animation. Both boundaries are antialiased, so at a pixel
the card's own corner only partly paints, the cover of the identical rounded rectangle over it only
partly covers, and what is left of the card shows through: measured at 22% of the card's `#dee2e6`
border along the first and last row of all four corners, against the team colour in front of it. The
fix that suggests itself does not work, and it is worth writing down why — a cover that merely
*contains* the card's shape (a smaller radius, a half-pixel of dilation) raises its own coverage to
no less than the card's, which is not the same as raising it to 1, and the leak is exactly the
product of the two shortfalls. Only a full pixel of bleed removes it, because then every pixel the
card paints at all is a pixel the cover paints entirely. Hoisting the rounding to one clip on the
wrapper was tried first and is worse: Chrome applies a rounded overflow clip per layer, so the dark
base that used to cover the corners outright inherited the same feathered edge and started leaking
at the very first frame.

Measuring the whole edge rather than the corner then found the same defect twice, and the second one
is the wider line the maintainer was seeing on live cards: a card's height is computed, so its bottom
edge lands mid-pixel — 148.4375px in the popup — and the cover's own bottom edge shares that row with
the card's border for as much as half of it, right across the width. Same cause, same fix. So the
stage and the sweeps bleed a pixel above and below the card and take the other two sides from a
`clip-path` grown to the card's 8px radius plus one, rather than from `overflow` and a radius, which
can only ever clip to the box itself. The box bleeds on one axis only: `left: 25%` and `75%` are the
crest slots, and a box 2px wider would land both crests half a pixel off the slot they resolve into,
while `top: 50%` of a box 2px taller offset by 1px is the line it already was. Nothing needs to paint
out to the sides anyway — what a half's own left edge feathers against there is the card's 5px rail,
in that half's own colour, which is why only the top and bottom ever showed a line.

The one thing the bleed must not do is bend the seam, which leans over the stage and not over the
card: the same horizontal run across a box 2px taller is a shallower angle, and the bar that reveals
along the seam is skewed by `revealSweepAngleDeg` itself, so the two would quietly stop being one
line. The lean is measured across the bled height now, through `revealStageBleedPx`, and both facts
are pinned by specs. Verified by reading pixels at nine frames: no pixel on any edge of the card is
brighter than the paint beside it while the colour is over it, and the resolved card is untouched. No
new locale keys.

## A window is a list of days, because ESPN stopped answering for a span — 2026-09-16

The three entries below diagnosed a real symptom on the wrong axis. It is not that MLB will not take
a dated window and that which leagues will is ESPN's to say: `dates=20260914-20260915` now answers
`{"code":400,"message":"Failed to get events endpoint."}` in **all 31 leagues**, at any width
including a one-day `20260915-20260915`, on `site.api` and on `site.web.api` alike, 20 times out of
20 on one league — while a single `dates=20260915` answers 200 in all 31. So the per-league latch was
holding a fact about every league, and what it degraded to cost almost everything: the undated board
carries one Eastern day in most leagues, so finals went and upcoming went, and college football
looked fine by accident because *its* undated board is an editorially curated week. Nothing
multi-day survives, either — comma, encoded comma and encoded hyphen all 400, and a repeated
`dates=` parameter answers 200 for the first value only, which is worse than failing. `YYYYMM` works
and is a trap: truncation drops the tail, which is the days furthest ahead, exactly as the entry
below found.

So a window is its list of Eastern days and costs a request each. The span is still computed exactly
as the range was and then enumerated, so the days asked for are precisely the days the range covered
— parity by construction rather than by a second reading of the timezone arithmetic, and the
zone-by-zone specs kept every literal they had. The two legs collapsed into one list on the way: the
live window is simply the near end of the wide one, and the day back a late kickoff needs after
Eastern midnight is the same day yesterday's finals come from.

What pays for it is a cache per league and day whose TTL is read off what came back rather than
chosen per call site. A past day whose every game is final cannot change again (30 minutes); a future
day is a schedule (10); today is what the live poll is for and is never served from it; and a past day
still carrying an unfinished game counts as today, which is what keeps a game that kicked off before
midnight arriving at the live cadence. A failed refetch falls back to that day's last good answer,
because the callers rebuild a window only at startup and on a preference change — one 403 on day five
would otherwise cost a league its whole week. Today is the exception on the live window and must be:
`tickLeague` reads a successful tick with nothing live as a quiet league and walks it towards dormant,
so a frozen copy of today would let a league fall asleep mid-game. On a *wide* window today is one
missing day among several, which is also what the two-leg version did — a failed live leg still
returned everything the range leg found.

A review pass caught two ways that TTL could be read at the wrong moment, both now pinned by specs.
A calendar day moves future → today → past underneath a cached entry and the entry's own TTL cannot
see it happen: a day fetched as tomorrow carries ten minutes, so ten minutes later it was today and
still fresh by its own clock, and a game live in the first ten minutes of a new Eastern day read as
scheduled at 0-0 — an ordinary 21:00 tip-off on the west coast. The day's classification is asked at
read time now, not inferred from what was written. And a past day has three states rather than two:
one with a game in progress never caches, one whose games are all final cannot change again, and one
holding a game ESPN still calls scheduled — the postponed game that will never start, or the rain
delay that has not started yet — takes the shorter ten minutes instead of either extreme. Also from
that pass: today's copy of an event arriving on more than one day now wins over the earliest day's,
which the two-leg version got for free by putting the live leg first, and days dedupe in flight so a
worker start and a guide open do not both fetch the same one.

Three things fell out. **`limit` is real and we had never sent it**: an MLB month answered 100 events
without it and 369 with it, so there is a default cap we have been eating, and on a January NCAA
basketball day it was certainly truncating us. 500 rather than higher, because `limit=1000` answered a
dated college football Saturday with 25 events — the curated week, meaning the `dates` filter had
quietly stopped applying — and verified identical against all 31 on a single-date query, so it only
ever lifts a cap. **The lookahead was 400ing on every call**, since it built a range too, so every
league that should have been sleeping was stuck on the dormant beat at ~576 requests a day; it walks
the days now and stops at the first kickoff, which is one request for a league with anything on soon
and the whole window only for the league that is about to sleep half an hour at a time. And **the
guide and the popup now share their overlapping days for free**, which is what the entry below wanted
when it widened one caller's request for both, without the truncation that made that a mistake.

The cost is honest and worth writing down: a ten-day window is ten requests per league, so 31 leagues
is 310, which the token bucket paces to about thirty seconds on a genuinely cold start. The day cache
is what keeps that rare rather than per-open. If it ever stops being affordable, the measured escape
hatch is `cdn.espn.com/core/<league>/schedule?xhr=1&date=`, which returns 3–7 days in one request, in
the same event shape the scoreboard uses, with final scores, on 31 of 31 leagues, and answers
`access-control-allow-origin: *` so it needs no new host permission. `dev` deliberately keeps the
range version, in case this is ESPN's bug rather than ESPN's decision. One trap: the day cache is
module scope, which surfaced as a suite's second reading inheriting the first's games — two readings
of one league on one day. No new locale keys.

## The popup's slate asks for what the popup wants, because the response has a budget — 2026-09-15

Reverts the one part of this pass that was a genuine mistake rather than a refinement. Having `refreshSlate` ask for the guide's superset so the two could share a fetch looked free, and the reasoning was even written down: `includeUpcoming` already makes it two requests per league, so a wider `dates` range changes the payload and not the request count. The payload is the point. ESPN caps a scoreboard response server-side — near 80 events on a dated college football query, a number already recorded in this file — and the truncation takes the tail, which is the days furthest ahead. Reaching two days back to pick up finals for the guide therefore spent the whole event budget on a college football weekend's *past* games, and what reached the popup was one day of future. Up Next is followed exactly again, `includeFinal` follows the setting again, and the guide asks for its own slate as it did before — still held between opens behind the TTL and still kept current by the live polls, so the repeat opens a day pager invites are free even though the first one is not. Three tests now pin the request shape: the day count is not floored, and the back-reach happens only when finals are actually wanted. The lesson worth keeping: two callers wanting overlapping data is not a reason to widen one request for both when the response has a cap, because the caller that gets truncated is the one that did not ask for the extra.

## A final survives the league that failed to mention it — 2026-09-15

Two corrections to the entry below, both from it losing MLB's final scores. The fallback latched a league onto the undated board for the life of the worker on a single 400, and the undated board carries only the current Eastern day — so the live games kept arriving and the finals quietly stopped. That was over-trusting one response: the published reference documents `20241201-20241231` as a supported form and gives its single-date example on MLB, and "Failed to get events endpoint" reads like ESPN's own events service failing rather than like a rejected parameter, so a latch has to be able to be wrong. It now expires after ten minutes — long enough not to pay the same 400 every twelve seconds, short enough that a transient upstream failure costs one window rather than an evening. The deeper one is in `refreshSlate`, and it predates the fallback: it rebuilt `upcomingGames` and `retainedFinalGames` from `result.games` wholesale, so every final and every kickoff belonging to a league that failed *that* fetch was thrown away. A league whose dated range is refused fails only the slate leg, which is exactly how a league can go on showing live games while its finals disappear. Now only the leagues that answered have their entries replaced and the rest are held, still subject to retention — a league that answers without a game it had before still drops it, which is the case that makes the distinction worth drawing. Same trap as everywhere else in this pass: an unanswered league and an empty one had been the same value.

## MLB will not take a dated window on the live board, so which leagues will is ESPN's to say — 2026-09-15

Found from one URL: `site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=20260914-20260915` answering `{"code":400,"message":"Failed to get events endpoint."}`. That is `buildCurrentDatesQuery` — the live poll's own two-day window, which the college football fix on 2026-09-11 started naming in *every* league. v2.1.0 polls the undated board (`.../mlb/scoreboard`, no parameters at all; only its upcoming leg ever set `dates`), which is the whole reason the store build kept working while a dev build did not, and it is not a rate limit — 403 and this 400 are unrelated failures that happened to land in the same afternoon. Tabulating the 31 leagues by hand was the obvious fix and the wrong one: the window is exactly what stops a live college football game going missing, since ESPN's undated board is an editorially curated week in that league rather than a day, and the `groups` parameter already carried on the two NCAA basketball leagues is there to dodge 404s on dated queries, so the support is genuinely uneven and undocumented. So the first refusal per league is remembered and every later poll for it goes straight to the undated board, degrading precisely to what 2.1 shipped. Only 400 and 404 count as a refusal: a 403 is ESPN shedding load and says nothing about whether the window was acceptable, and reading one as a refusal would quietly drop college football back onto the curated week for the rest of the worker's life. The upcoming leg is left alone — it has no undated equivalent, and a league that rejects a range there simply contributes no upcoming games, which may well have been true of MLB all along and gone unnoticed for exactly the reason the entry below is about.

## A refused scoreboard stops reading as an empty one, and four ways of asking ESPN less — 2026-09-15

**The poll floor is ESPN's now, not ours.** The scoreboard answers with `cache-control: max-age=12` and `fetchScoreboard` passes no `cache` option, so it uses the HTTP cache: the 6s floor spent every other request on the hottest game in the product to be handed back bytes it already had. It is not a new constant either — `scoreboardRefreshMs` reads the max-age each league actually sent and floors that league there, so `pollMinEagerMs` is only the assumption held until a response says otherwise and a league ESPN refreshes faster is polled faster with nobody editing anything. The PowerScore ramp is untouched: 0 still polls at `pollMaxEagerMs`, 100 still polls at the floor, the floor just moved. Clamped above the floor so a league reporting a long max-age cannot invert the ramp, and the jitter is floored too, because its negative half landed back inside the window ESPN was still serving the old answer for.

**A token bucket over every ESPN request, for the gap the pool cannot see.** `settledInPool` bounds one fan-out, but `tickLeague` runs a single-league fetch on its own timer through its own pool of one, so 31 leagues whose timers drift into alignment issue 31 simultaneous requests. Capacity 16 — the widest simultaneous fan-out this repo has measured coming back clean — refilling at 10/s, which is well above the extension's own worst case of about 3 requests a second, so nothing waits in steady state and the bucket only ever shapes bursts. Both numbers are sized from us rather than from a published limit, because ESPN does not publish one; that comment is the one place to correct if a real limit is ever measured. Set to 4/s first, which put 12 seconds on a cold 62-request sweep and was a plain latency regression.

**The guide reads the slate the poll already holds.** `GET_GUIDE_SLATE` cost two scoreboard requests per enabled league plus 31 `/teams` on *every* open. `refreshSlate` now asks for the guide's exact superset — free, because `includeUpcoming` already made it two requests per league and widening the date range changes the payload, not the count — applies the popup's display gates to the answer as before, and keeps the ungated superset beside them. The live polls merge their answers into it, so what ages is the roster of games rather than any score on screen, which is what lets the TTL be ten minutes. Deliberately still a separate array from `games`: `afterFetch` scores off `games.filter(status === 'in')` and the switch target reads that same array.

**The team marks live in `storage.local`.** They were a module-scope `let` commented as lasting a worker lifetime; MV3 ends a worker lifetime about thirty seconds after the last event, so in practice that was close to per-guide-open, 31 `/teams?limit=1000` at a time, and `wxt dev` wiped it on every file save on top of that. Weekly TTL, stored per league so enabling a 32nd costs one request instead of re-fetching the 31 already held.

**And the thing all of it was hiding.** `fetchGamesWithLeagueLogos` collects with `allSettled` and keeps the fulfilled ones, so a refused league contributed no games and threw nothing — every caller read a 403 as "this league has nothing on". Three consequences, all fixed by returning `shedLeagues`: the popup drew the no-games slate on a full Saturday and now raises the existing `gameListHeader.loadFailed` banner when an empty list has refusals behind it; a whole-slate refusal replaced `games` with nothing and now keeps what it has; and `tickLeague` recorded a successful tick with nothing live, handed that to `recordPollResult` and walked a league down towards dormant *while its games were being played*, which is the one that made this self-sustaining. A partial shed with games still showing stays quiet — five of eight games beats a banner. Twenty new tests. No new locale keys. One trap worth keeping hold of: a `Response` double without `headers` now fails the whole fetch, which surfaced as six unrelated suites going red in places that had nothing to do with any of this.

## The site's live demo stops asking about 31 leagues to draw eight cards — 2026-09-15

Chased from a machine where every ESPN request was coming back 403 while the store build of the extension was fine. Measured with curl: nothing at all was running locally and the host was still shedding about a third of single requests spaced three seconds apart, and nine of twelve rapid sequential ones — so the limit is far tighter than the window the entry below was written against, and it decays rather than clears. The first suspect out of that measurement was wrong and is worth writing down so nobody spends an afternoon on it again: a request carrying a Chrome `User-Agent` and none of the `sec-*` headers that really accompany one is refused deterministically, 5/5, which looks exactly like the extension being fingerprinted. It isn't. A complete Chrome header set behaves the same as bare curl; the block only catches a half-spoofed UA, which is a shape no browser ever sends and only my own probe did. `LivePowerScores` was the real steady cost — `Promise.allSettled` over all 31 leagues every 15 seconds for as long as the tab stayed open, 124 requests a minute, `client:visible` governing only when it hydrates and nothing after that. Now the 15s cadence asks only the leagues with something live, the full 31 are swept for newcomers every two minutes, the sweep is walked six at a time, and a hidden tab or one scrolled past the section asks for nothing: ~15 requests a minute with no games on, ~31 with four leagues live, 0 unwatched. The poll is a self-scheduling timeout rather than an interval, because a fan-out that outruns its own gap otherwise gets the next one started on top of it and a slow answer turns into more requests. Two things fell out on the way, both the same shape as the note below about `allSettled` being silent by construction: a page shed on all 31 leagues drew the identical "nothing is live" panel as a quiet Tuesday, so the shed count comes back now and the existing error string gets used; and a sweep that comes back entirely shed stamps its clock anyway, so it backs off to the two-minute cadence instead of retrying all 31 fifteen seconds later. Only a sweep may narrow the rotation — narrowing on a narrow poll would let one shed request drop a league that is mid-game. No new locale keys.

## The popup stops spending the whole of ESPN's burst allowance on the league pickers — 2026-09-15

Chased from "no games on a day full of sport, but only in a dev build". ESPN sheds load on `site.api.espn.com` by recent request volume from an IP and answers 403 to whatever it drops — measured with curl from one machine, 16 requests at once all came back 200 and 24 at once lost four, and the same width passed cleanly a minute later, so the window is recent volume rather than instantaneous concurrency. `app.tsx` fanned all 31 leagues out on *every popup open* to fill the onboarding and settings pickers, held the answer in component state, and threw it away when the popup closed. That is more than the allowance in a single call, and because every fan-out here collects with `allSettled` and keeps the fulfilled ones, a shed league contributed nothing and said nothing: the slate simply came back short, or empty. Production never showed it because a real person opens the popup a few times an evening; a dev loop reopens it every few seconds and never leaves the window. None of it needed the network in the first place — `resolveLeagueLogoUrl` answers for all 31 offline, nine of them pinned to an override it returns without ever looking at ESPN's and the other 22 to a hardcoded fallback on the same CDN — so the pickers are seeded from that and the fetch became a weekly upgrade written to `storage.local`. The three 31-wide fan-outs in `apiClient` (games, team mono marks, the team picker's roster) now run six at a time through one pooled helper, which is twelve requests in flight at the worst point since a league asked for upcoming games makes two. The thing worth keeping hold of: `allSettled` over a rate-limited host is silent by construction, so the only evidence a limit was ever hit is a number that is quietly too small.

## Every layer of the open animation is drawn against the card's own box, and the outline is an outline — 2026-09-15

Two review passes on the entry below, the maintainer's by eye and an agent's over the diff. The lettering was the clearest one: `-webkit-text-stroke` strokes every contour the font draws, including the ones a filled glyph hides, and DM Sans builds an N out of overlapping stems — so the diagonal came out drawn straight through both of them and every junction was cross-hatched. Not an alpha problem, which was the first guess and rendered identically; it takes two stacked copies, the back one the glyph solid white and stroked wider than itself, the front one the same glyph in the colour behind it. And it is not one size any more: ESPN's abbreviation is uncapped, so on a 296px card ARMY against NAVY overlapped by 7.4px and UCONN against UMASS by 52, for the second and a half both tricodes share the screen. Scaled by the longer of the two rather than truncated — "ARM" at "NAV" is a worse answer than smaller type. The crest plate is now grown around the crest box (`inset: calc(-100% / 6)`, so three quarters of it is the box) instead of the mark being shrunk to three quarters inside it, which is what had a plated mark landing at three quarters of the card's crest and jumping the rest at the handoff; both treatments now draw at one size, and `revealHoldScale` sizes the poster off the card's own height and half its width so a plate cannot outgrow the card either. The card's crest arrives in one `steps(1, end)` rather than crossfading, because two identical crossfading copies are each half transparent at the midpoint and the pair washes a quarter of the way to the card, so the mark visibly paled and recovered. The dark base left the stage and kept square corners, since two rounded rectangles of the same radius never quite cover and the card's own rail came through all four corners of every card still waiting its turn. The halves collapse to nothing rather than parking on the 5px rails: the card has been painting those rails in the same colours underneath the whole time, so the ending is identical paint, but a square-cornered rectangle on a rounded border is not, and a finished game stopped needing keyframes of its own to say it has no rails. Four more came from reading rather than looking, and all four are the same seam — the graphic was built against a card that never moves. The stagger plan is fixed on the first list that has anything in it, because both live sections re-sort on PowerScore and a push inside the 3.4s window moves a running animation's `animation-delay`, which moves its current time, and across the eight-card cap flips the mode outright. The measurement is a `ResizeObserver` rather than a mount-time read, because a PowerScore landing on a later push grows a bar row the card was not drawing. The reveal now waits for the list to be the thing on screen and ends if it stops being: onboarding's own fetch settles with no leagues, so the whole window used to expire behind the wizard and a new user could never see the full version, and leaving for a game detail inside the window replayed it on the way back. The bars travel on a transform rather than on `left`, which Blink cannot composite and which a full slate ran 32 of at once. One thing worth keeping hold of: the 8px box mismatch this was first diagnosed as does not exist in the popup — it was the Cypress harness mounting the wrapper straight into a flex column, where a flex item's formatting context stops the card's bottom margin collapsing out. The gap moved onto the wrapper anyway, because a layer geometry that does not depend on margin collapsing is the better contract, and the specs mount the nesting `mainView` really builds. The tinted plates stay, on the maintainer's call. No new locale keys.

## The popup opens on the matchup, and the bar that crosses it is what turns the tricode into the crest — 2026-09-15

From a Figma storyboard. Every card in the list arrives as the matchup poster it is underneath: the two team colours wipe in from the outer edges and meet on a leaning seam, the tricodes stand outlined over them, a white bar crosses each side, and the colour then retreats the way it came, off the edge it came in from, uncovering the 5px rails `buildGameCardStyle` has been drawing in those same colours underneath the whole time — which is the one thing worth keeping hold of here. The ending is paint that is already identical, and each crest lands on the card's real crest slot, measured in a layout effect rather than derived, so the stage is simply removed at the end and nothing has to cover a seam. The trade under the bar is a clip complement, not a dissolve: the crest layer and the lettering layer are clipped along one leaning edge from opposite sides, so every pixel shows exactly one of them and the edge is the bar rather than a line near it. Poster crests go through `TeamCrest` against the team colour, because these are the only crests in the product not drawn on white. One angle throughout (20.5°, as `--reveal-lean`, measured off each card's own height); one rate throughout (`--reveal-rate`), so the second open of the day is the same graphic at 0.8× rather than a shorter one. Two traps found on the way: two animations naming the same property means the later one wins outright and its backwards fill erases the earlier one before it plays a frame, so each element gets one keyframe set per property it moves; and a "has played" guard in the mode resolver has to be a memo rather than a guard, or StrictMode's doubled initialiser leaves the development build the only build that never animates. Capped at the first eight cards, which is cost rather than taste — a thirty-game Saturday is otherwise three hundred animated elements, none of them on screen. No new locale keys: the only text in it is ESPN's own tricode.

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
