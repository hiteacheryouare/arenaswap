---
title: How to control when ArenaSwap switches tabs
description: Adjust the auto-switch toggle, sensitivity, cooldown, and switch delay so ArenaSwap switches exactly as often as you want it to.
section: extension
order: 3
navLabel: Switching
faq:
  - q: How do I stop ArenaSwap from switching tabs so much?
    a: Lower the Switch sensitivity setting, raise the Switch cooldown, or unassign the tab you don't want it touching. Turning off Enable auto-switching stops it completely.
  - q: Why does ArenaSwap keep bouncing between two games?
    a: Two assigned games are trading the lead in PowerScore. Raise the Switch cooldown so the leader has to hold on longer before another swap can happen.
---

ArenaSwap switches tabs based on three settings working together:

- How big a PowerScore lead a game needs
- How soon it's allowed to switch again
- How long it waits before switching

Here's what each one does and when to reach for it.

## Turn switching on or off

The toggle in the top bar, labeled **Enable auto-switching**, is the master switch. Turn it off, and ArenaSwap stops moving your tabs entirely. It still scores games in the background, so the list stays current. Turn auto-switching back on, and it resumes with a clean cooldown. Any switch that had been queued before you paused doesn't fire immediately.

## Set how eager it is

**Switch sensitivity**, in Settings under Switching, is a 1 to 7 scale from **Barely Active** to **Ludicrous Speed**. Each level sets the PowerScore gap a game needs over whatever you're watching before ArenaSwap switches to it. Level 1 needs the biggest gap, and level 7 needs almost none. The default, level 4 (**Balanced**), requires an 11-point gap. See the [settings reference](/arenaswap/docs/extension/settings/) for the exact gap at every level.

If ArenaSwap feels slow to catch a game that's clearly heating up, raise it. If it's grabbing your tab for games that aren't meaningfully better than what you're watching, lower it.

## Stop rapid switching

**Switch cooldown**, also under Switching, sets the minimum time between automatic switches, from 15 seconds up to 3 minutes. The default is 45 seconds.

If two of your assigned games are close enough that the lead keeps trading back and forth, a short cooldown lets ArenaSwap follow every swing. Raise the cooldown, and ArenaSwap holds on one game longer before it's willing to switch again, even if the other briefly pulls ahead.

## Give a laggy stream room to catch up

**Switch delay**, the third Switching setting, waits before carrying out a switch, from **Off** up to 3 minutes. Switch delay exists for streams that run behind the live data ArenaSwap reads.

If ArenaSwap keeps switching you to a game a few seconds before your feed shows the exciting play, add a delay. Your stream then has time to catch up first. A queued switch still re-checks the score right before it fires. You won't get sent to a game that cooled off while the switch waited.

## Related

- [ArenaSwap settings reference](/arenaswap/docs/extension/settings/) lists the exact default and range for every setting mentioned here.
- [How to watch multiple games at once](/arenaswap/docs/extension/watching-multiple-games/) covers assigning the tabs these settings act on.
- [Troubleshoot ArenaSwap](/arenaswap/docs/extension/troubleshooting/) covers switching behavior that looks like a bug but isn't.
