# Changelog

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
