# RELEASENOTES.md

> How ArenaSwap release notes are written. Read this before touching
> `apps/docs/src/content/releases/`. It wins over the examples in `VOICE.md`.
> Every release note already in that folder is approved, and they are your
> models (see Our Models, below).

Release notes sit around 2 on the `VOICE.md` spectrum. They are the one place
the whole product gets to be funny, and they are written for fans, not for
whoever reviews the diff.

---

# The Two Mistakes Agents Keep Making

**1. Too literal.** A list of true facts with no personality is a failure, even
when every fact is right. "The Brewers won the World Series. LeBron's Sixers
are 8-1." is a box score. "Milwaukee waited 57 years for a World Series parade
and is now, understandably, very tired." is a release note. Every line carries
a joke, and the fact rides inside it.

**2. Technical details.** None. Not one. A fan reading release notes never sees:

- Settings internals: cooldowns, delays, thresholds, boosts, penalties, signals
- Numbers that only matter to the code: caps, counts, burst limits, "first three
  home games of the regular season", seconds and milliseconds
- How anything works: what the worker does, which tab or window, what gets
  read, parsed, cached, retried or polled
- Why something broke or how it was fixed
- Backports, branches, version plumbing, or a future version that isn't out

If a fix can't be said in plain fan words ("Standby Stream stopped yanking you
off games you picked yourself"), it doesn't get its own line. It goes in the
catch-all at the bottom of the fix list.

Some of our older release notes have technical details in them anyway. Ignore
those parts. They are not permission to write more.

---

# The Shape

1. **Frontmatter.** `version`, `title` ("ArenaSwap 2.3: Home for the Holidays"),
   `summary` (one playful sentence) and `date`. Copy the shape of the latest file
   in `apps/docs/src/content/releases/`.
2. **The opener.** Two or three short paragraphs about what's going on in sports
   *this week*, every line a joke. Then one line that turns the scene toward the
   release ("So we climbed into the attic, brought the decorations down early,
   and found a few boxes up there we don't remember buying.", "Here's the
   scouting report.", "Here's tonight's listing.").
   Pick one theme from the title and let it run through the headings and the
   fix list (2.2 "Now Showing" has "Here's tonight's listing" and "In other
   programming:").
3. **The headline features.** A short heading each, in sentence case, with a
   little personality ("Stockings, hung with care"). Two to four sentences: what
   you'll see, and a joke. Call back to the opener where it fits ("Ask Milwaukee
   how good it looks in October.").
4. **Where to find it.** One sentence naming the setting, finished with a joke
   ("in case your household runs a strict no-tinsel policy"). Numbered steps only
   when a headline feature really needs them.
5. **The fix list.** A themed heading ("Stocking stuffers", "No huddle",
   "In other programming:", "And now, the lightning round ⚡"), one bullet per fix,
   one joke per bullet, no trailing periods. End with a catch-all
   ("Plus a few more bugs we swept up with the leaves").
6. **The sign-off.** "Rate us five stars if …" and one emoji. Make it about the
   season or the week, never about the product.

## The opener has to be real

- **Look it up.** Web search the current week before writing a word of it: who
  just won what, the big storyline in each major league, what's coming up on the
  calendar. Never write topical lines from memory.
- **Check every claim** against the sources you found, and give Ryan the links.
- **Mark anything that goes stale** ("tipped off this week", a team's record) so
  the notes can be touched up if the release slips.
- **Seasonal scenes are welcome** alongside the news: Thanksgiving three
  Thursdays out, the fight for the couch seat closest to the TV.

## Rules that still apply from VOICE.md

- No em dashes, even though Transit uses them.
- One Philly nod per piece, at most. A Philly player or team in the news counts.
- Never name the data provider. "Our sources" (or their scouts with binoculars).
- Jokes about a team's history are fine. Jokes at fans, players' personal lives,
  injuries or the reader are not. Never encourage betting.
- No puns on ArenaSwap, PowerScore, Multiview or Standby Stream.
- US spelling (color, favorite, center).

---

# Our Models

Every English release note in `apps/docs/src/content/releases/` is approved.
(The locale folders hold translations of the same notes.) Read all of them
before you write a word. Take their openers, headings, jokes, callbacks and
sign-offs as the standard.

When you read them, ignore these parts:

- **Technical details.** Examples: 2.0's polling seconds, sleep cycles, "546
  keys", synced and local storage, Tailwind and test counts; 2.1.1's
  explanation of why Up Next broke; 2.2's "flat +5" and "default boost went up
  to 8". The rule in The Two Mistakes still holds.
- **Em dashes.** 2.1 is full of them. We don't use them anymore.

What each one shows best:

- **2.0, "Introducing ArenaSwap 2".** An opener set in a real week ("somewhere
  a soccer match is heading to penalties for absolutely no reason"). Headings
  with jokes in them ("It checks fast when something interesting is happening.
  Then it takes a nap."). One-line kickers after a section ("Your backup plan
  now has a backup plan."). Owning a goof plainly ("We'd rather admit that than
  quietly let you discover it yourself.").
- **2.1, "Electric Boogal-one".** A football theme carried from "Here's the
  scouting report" to "No huddle". A teasing close to the fix list ("We're not
  telling you where. Good luck.").
- **2.1.1, "We got ghosted".** A hotfix can be four short paragraphs: the
  week, what broke in fan words, and the sign-off. "WE ARE SO BACK" energy is
  allowed in an opener.
- **2.2, "Now Showing".** One image (the TV Guide, and a dad circling the
  Sunday doubleheader in red pen) that the whole note runs on, down to the
  sign-off about a VCR clock blinking 12:00.
- **2.3, "Home for the Holidays".** The newest one, and the strictest about
  technical details. It lives on `mega` until the next merge reaches `dev`, so
  here it is in full. It went through four rewrites to get here.

```markdown
---
version: "2.3.0"
title: "ArenaSwap 2.3: Home for the Holidays"
summary: "Stockings, bunting and fireworks for your game screen, plus a few fixes we found between the couch cushions."
date: 2026-11-05
---

Milwaukee waited 57 years for a World Series parade and is now, understandably, very tired. LeBron has the Sixers at 8-1 and would like everyone to please stop saying the word "Finals." Kentucky is a top-ten team. In football. We checked twice.

And Thanksgiving is three Thursdays out, which means someone in your family is already scouting the couch seat closest to the TV.

We weren't going to wait for December either. So we climbed into the attic, brought the decorations down early, and found a few boxes up there we don't remember buying.

## Stockings, hung with care

Christmas Eve football, Christmas Day NBA and NFL, and Boxing Day soccer get garland across the scoreboard and a stocking for each team. Score and your stocking fills up. Lose and Santa leaves you coal. Tie, and even Santa can't pick a winner, so nobody gets coal.

## Bunting, pressed and ready

Baseball's gone until spring, but the bunting's already ironed. It goes up for every team's home opener and stays up all postseason. Ask Milwaukee how good it looks in October.

## Fireworks for the Fourth

Every run on the Fourth of July, and every MLS goal, lights up the sky over the scoreboard in the colors of whoever scored. Blue Jays fans get their own show on Canada Day.

## The leaves got raked

Thanksgiving football's falling leaves got a glow-up. They look like real leaves now, and they tumble all the way down into a big pile at the bottom of your screen. Jump in at your own risk.

Every decoration has its own switch under **Settings > Display > Holiday decorations**, in case your household runs a strict no-tinsel policy. And if you can't wait until December, turn on **Demo mode** and tell it to pretend it's Christmas, Boxing Day or the Fourth of July.

## Stocking stuffers

- Women's college basketball tipped off this week, and it's finally on your list where it belongs
- Every college team is in the favorite team picker now, even the ones whose mascots we had to look up
- Switch notifications stopped piling up like Christmas cards on the kitchen counter
- Watching full screen? You stay full screen when ArenaSwap switches. Game in another window? It comes to the front
- Leagues you turn off actually leave, instead of lingering like the last guests at the party
- Standby Stream stopped yanking you off games you picked yourself
- It ain't over till it's over, and a game with a tick left on the clock isn't over either. ArenaSwap agrees now
- Reading the box score at the buzzer? It stays open instead of bouncing you back to Overview
- Postponed games stopped counting down to kickoffs that aren't happening
- Plus a few more bugs we swept up with the leaves

Rate us five stars if Christmas dinner at your house gets eaten off a TV tray 🎄
```

What got cut on the way, and should never come back:

- "Changing a game boost no longer nudges every live game toward the clock stall penalty"
- "Standby Stream waits out your switch cooldown, and parking on standby no longer starts a cooldown"
- "Three pleated fans … for every team's home opener series (its first three home games of the regular season)"
- "A three-run homer is three bursts. Up to four go off at once"
- "Leaving the popup open no longer brings back tabs ArenaSwap had already let go"

---

# Transit, the Reference

Transit's App Store notes are the reference for how this should feel. Read them
for the moves, not the words. Never reuse their lines, their transit world, or
their em dashes.

The moves:

- **Open on the season or the news**, packed with specifics ("First it was the
  tulips. Then the lilacs, the peonies, and now the jacarandas.").
- **Turn it toward the release** in one line ("Just in time for kickoff, we're
  sounding the Transit vuvuzelas").
- **Feature, then how to use it**, still joking inside the steps.
- **A quick fix list** with a joke per line, and a catch-all ("Bug fixes, obv").
- **"Rate us five stars if …"** to close, every single time.

## 6.3.6

> See your city's blocks from dock to dock: GO Bikeshare is here. At long, long last.
>
> You can start a GO trip by tapping a bikeshare pin on the homescreen, or by planning a trip in the trip planner like you so often do.
>
> Follow your turn-by-turn directions however you want:
> - Right in the app
> - Melodically (thanks to audio directions)
> - On the lockscreen with Live Activities
>
> … and if your destination dock runs out of slots? We'll reroute you on the fly to a different dock. Oh, the magic of GO.
>
> We've also added support for the app in Swedish and the iPhone Duo (for folks who prefer their phone foldable like a taco).
>
> Rate us five stars and tell us what's the best iSalsa: roja or verde

## 6.3.1

> It hasn't just been a summer. It's been an Odyssey. We've returned from the Trojan bug wars looking a little bit worse for wear. But the lotus flowers were delicious (from what we remember) and boy, do we have stories:
>
> - Boston Green Line riders rejoice: we defeated the six-headed sea monster of branched train lines: instead of making you swipe through six different train "directions" (when it was really the same train, just stopping at different platforms) we now show just two train directions, with the branches and platforms nested underneath
> - We added better handling for connecting lines, so you know which bus and train lines you can easily transfer to when searching a station or tapping on a trip plan
> - We made sure that scheduled disruptions appear in all the various places that they should have been appearing in all along! (Like putting strikes on cancelled departures when you tap open a line or trip plan. Oopsie.)
> - A couple little typographical tweaksie-doodles on the Home Screen widget that helps you plan a trip to a saved location
>
> Hope that satisfies your fixins for bug fixes! Now it's time to meet all of the lovely suitors who moved into our house to keep our family company while we were at sea…
>
> PS: rate us five stars if the best way to enjoy a bug fix update is in 70mm IMAX.

## 6.1.11

> First it was the tulips. Then the lilacs, the peonies, and now the jacarandas. The pools are open, the parks are packed, summer's in the air — and so are the hooligan hoots of patio-raiding patriots downtown.
>
> (Apparently there's a certain foot-oriented sports tournament going on?!)
>
> Just in time for kickoff, we're sounding the Transit vuvuzelas with two big partnerships:
>
> Toronto and Vancouver! TTC and TransLink connoisseurs have been upgraded to Royale for FREE — along with a smattering of other in-app upgrades — thanks to partnerships with two of Canada's most iconic transit agencies.
>
> On the non-partnership-side-of-things we're trucking along doing our thang.
>
> - If your phone kills a background Transit session to free up memory for other apps, we'll restore you to exactly where you were before — instead of just sending you back to the homescreen.
> - Bugs: we've eradicated our fair share. Save those mosquito nets for the cottage!
>
> Rate us five stars for putting the bicycle in bicycle kick™

## 6.1.7

> The Montreal Canadiens (and their soul sisters, the Victoire) have clinched. The playoff beards have sprouted their first bristles. The playoff buns have spawned their lucky scrunchies. The devs are swapping out their green Transit t-shirts for bleu-blanc-rouge ones, while hipchecking bugs to the moon and back and all the while cookin' up more reasons for you to olé olé as we head into the postseason:
>
> - We've got a fresh new lineup of voices for your GO navigation assistant
> - Take a peeksy at the GO settings to update yer voice directions selections
>
> What else?
>
> - We found the bug that temporarily zombified our Live Activities. The situation is now under control
> - Lots of other under-the-hood tinkerings which details we will mercifully spare you from
>
> Make sure to rate us five stars for making the app go as fast as a Caufield snap shot from the high slot.
>
> ET LE BUUUUUUUT!!!!!

---

# Before You Hand It Over

1. Did you read every release note in the folder, and the 2.3 model above?
2. Did you web search this week in sports, and does every topical line match a source?
3. Does every line have a joke in it, with the fact inside the joke?
4. Is there a single technical detail left? Read each bullet as a fan who has never opened Settings.
5. Does it open on the week, turn toward the release, and close on "Rate us five stars if …"?
6. No em dashes, one Philly nod at most, US spelling, no provider name?
7. Did you flag the lines that go stale if the release slips?
