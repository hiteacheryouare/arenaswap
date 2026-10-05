---
title: How to change what ArenaSwap looks for in a game
description: Pick Classic, Blowouts, or Fantasy PowerScore, or mix them by league with Custom, and set up a Fantasy roster so ArenaSwap switches to the game your players are in.
section: extension
order: 6
navLabel: Scoring modes
faq:
  - q: Which scoring mode should I use?
    a: Classic if you want the closest, tensest game, which is what ArenaSwap does out of the box. Blowouts if you'd rather watch somebody get run off the field. Fantasy if you care most about your own players. Custom lets you pick a different one for each league.
  - q: Why doesn't Fantasy do anything when I turn it on?
    a: Fantasy scores the players on your roster. Until you add some, every game is scored as Classic. A game with none of your players in it is scored as Classic too.
  - q: Can I use Fantasy for a sport that isn't football?
    a: Yes. Fantasy rosters cover the NFL, NBA, WNBA, MLB, and NHL. Each sport has its own scoring rules, and you can change them.
---

By default, ArenaSwap asks one question of every live game: is it close, late, and swinging? That's the Classic mode, and it's what makes the extension feel like RedZone. If that isn't the game you want to watch, you can change the question.

There are four choices, found with the other scoring settings in the popup's Settings. The exact controls are covered in the [settings reference](/arenaswap/docs/extension/settings/#scoring). This page covers what each choice does.

## The three modes

| Mode | The question it asks | Signals it scores |
|---|---|---|
| Classic | Is it close, late, and swinging? | Closeness, Late-game pressure, Momentum, Lead changes, Comeback |
| Blowouts | Is somebody running away with it? | Blowout margin, Sustained, Timing, Pile-on |
| Fantasy | Is something about to happen to my players? | Situation, Production, Exposure |

Whichever one you pick, every live game still ends up with a single number from 0 to 100, and ArenaSwap switches to the highest one the same way it always has. [Switching and sensitivity](/arenaswap/docs/extension/switching-and-sensitivity/) still applies unchanged.

### Classic

Closeness, how late it is, the last few minutes of scoring, lead changes, and comebacks. Classic is also the only mode that watches for the moments fans flip to: a runner in scoring position late in a tie game, a two-minute drill, a no-hitter in the 7th, a red card in a one-goal match, a pulled goalie, an underdog still alive, and what a result decides in a playoff series or a late-season race. Those moments add a few points each, and they're capped so a pile of small things can't beat a real one-score finish. The [PowerScore boosts page](/arenaswap/docs/powerscore/boosts-and-penalties/) lists every one and what it pays.

### Blowouts

Closeness turned inside out. A game pays nothing until it's two scores apart, then climbs as the margin grows, as a lead is held, as it gets earlier, and as the leader keeps scoring. It's the mode for watching a team run another off the field, or a huge underdog doing it to a favorite.

Blowouts floors every game at 30% of its Classic score. A close game stays in the running on a night with no beatdown, but never outranks one. Any real beatdown beats the best close game.

Blowouts also skips the postseason boost. A playoff blowout has settled its result, so the round adds nothing.

### Fantasy

Scores what your players are doing, using a roster you build. It looks at where they are in the game (who has the ball, whether your kicker is in range, who's at bat or pitching), the fantasy points they've scored lately, and how many of them are playing in it.

Fantasy is added on top of Classic. By default, 60% of a game's Fantasy score is added to its Classic score. That means a game with one of your players in it can only rise, and a game without one scores as plain Classic. Raise the blend to make your roster count for more, or lower it to make it a tiebreaker.

A game with none of your players in it has nothing for Fantasy to say, so it's scored as Classic.

## Pick a mode for every league

**Custom** gives each league its own mode. Maybe the NFL gets Fantasy, college basketball gets Classic, and the leagues you have no strong feelings about get Blowouts. A league you haven't set scores as Classic.

Games from different leagues are ranked side by side, on the same 0 to 100 scale, so a Fantasy game and a Classic game can still compete for your tab.

## Build a Fantasy roster

A roster is a list of players. Search for one by name, and add them from the results.

- **The search is forgiving.** It ignores accents and word order, matches the start of a surname, and puts up with a single typo in a longer word.
- **Five leagues.** The NFL, NBA, WNBA, MLB, and NHL. A football roster can also hold a team defense, which is scored as a unit.
- **Up to 50 players.** The roster stays on your device with your other settings. Searching sends the name you type to our sources to find matching players.

Once a game with one of your players is live, ArenaSwap reads each rostered player's box-score line and turns it into fantasy points. The first total it sees for a player is taken as a baseline, so a player you picked up mid-game doesn't register as a sudden burst of scoring.

### Change the scoring rules

Fantasy points need a scoring system. ArenaSwap starts with the usual one for each sport (a point per reception, 4 per passing touchdown, and so on in football), and every rule can be edited for football, basketball, baseball, and hockey. Each rule has a minimum and a maximum, so you can't set receptions to a hundred points. A saved value outside its bounds is ignored, and the default is used instead.

Only the rules you change are saved. The rest keep their defaults.

## Switch signals off, mode by mode

Each mode keeps its own list of signals you can turn off, the same way Classic always has. The signals still on are rescaled so the total still spans 0 to 100. Settings only shows the lists for modes you're using, so with Classic selected you'll see Classic's. Under Custom, you'll see one for each mode your enabled leagues use.

## What every mode shares

Some points come from you, not from the game, and they apply in every mode:

- **Favorite team bonus**, for each favorited team in the game. See [favorite teams](/arenaswap/docs/extension/favorite-teams/).
- **Postseason boost**, for playoff and knockout games. Blowouts is the exception, since a settled result isn't worth chasing.
- **Standby Stream**, which compares the same 0 to 100 score against your threshold. See [Standby Stream](/arenaswap/docs/extension/standby-stream/).

## Where the numbers come from

ArenaSwap's scoring is PowerScore, an open-source package you can use outside the extension. The [signals page](/arenaswap/docs/powerscore/signals/) has the signals behind each mode and their ceilings, and the [PowerScore page](/arenaswap/powerscore/) shows it scoring games live.

## Related

- [ArenaSwap settings reference](/arenaswap/docs/extension/settings/) lists the scoring settings and their defaults.
- [How to control when ArenaSwap switches tabs](/arenaswap/docs/extension/switching-and-sensitivity/) covers how big a score lead a game needs before ArenaSwap moves you to it.
- [PowerScore signals in every mode](/arenaswap/docs/powerscore/signals/) explains each signal in detail.
