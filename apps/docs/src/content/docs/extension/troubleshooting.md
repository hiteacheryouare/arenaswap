---
title: Troubleshoot ArenaSwap
description: Fixes for the most common ArenaSwap problems, from an empty game list to switches that never happen, traced back to what the extension is actually doing.
section: extension
order: 9
navLabel: Troubleshooting
faq:
  - q: Why doesn't ArenaSwap show any games?
    a: Either no leagues are enabled, and ArenaSwap shows a Choose Leagues to Get Started prompt. Or your enabled leagues genuinely have nothing live right now, and you see a quieter empty-state message instead.
  - q: Why won't ArenaSwap switch tabs?
    a: Check that Enable auto-switching is on in the top bar and that you've assigned a tab to at least one live game. With nothing assigned, there's nothing for ArenaSwap to switch to.
---

Most of what looks like a bug in ArenaSwap is a setting that isn't where you'd expect it. Sometimes it's a step in the setup that got skipped. Here's what to check, worst offenders first.

## Why is the game list empty?

If you see **Choose Leagues to Get Started**, no league is enabled yet. ArenaSwap needs at least one before it can find anything to track. Click **Pick leagues in Settings**. Turn at least one on.

If instead you see a quieter message like "It's a slow sports day," your enabled leagues genuinely have nothing live at the moment. Click **Refresh** to check again. If you want games to work with regardless, open [Demo mode](/arenaswap/docs/extension/demo-mode/).

If a banner says **Our sources went quiet. Couldn't load games.**, ArenaSwap couldn't reach the scoreboard. Click **Retry**. If it keeps failing, check your connection.

## Why won't ArenaSwap switch tabs at all?

Check these in order:

1. **Enable auto-switching**, the toggle in the top bar, has to be on. When it's off, ArenaSwap keeps scoring games but never touches a tab.
2. At least one live game needs a tab assigned to it. Use the **Assign a tab** dropdown on a game card. ArenaSwap will never switch to a tab it hasn't been told to manage.
3. With only one game assigned, ArenaSwap only moves you to it from a tab that isn't a game. To see it switch between games, assign a second stream.

If all three check out and switching still isn't happening, a low **Switch sensitivity**, a long **Switch cooldown**, or a long **Switch delay** could be why. See [how to control when ArenaSwap switches tabs](/arenaswap/docs/extension/switching-and-sensitivity/) for what to change.

## Why did ArenaSwap grab my tab when I wasn't even watching a game?

This is expected, not a bug. Sensitivity only applies when you're actively watching one of your assigned games. If the tab you're on isn't registered to any game, ArenaSwap treats you as not watching anything. The best-scoring assigned game then wins your tab, as soon as its PowerScore rises above zero. No gap is required in that case. If you don't want to be pulled away while doing something else in the browser, turn off **Enable auto-switching** first.

## Why does ArenaSwap keep bouncing between two games?

Two of your assigned games are close enough in PowerScore that the lead keeps trading between them. Your cooldown is short enough to let ArenaSwap follow every swing. Raise **Switch cooldown** in Settings so the leader has to hold on longer before another swap can happen. See [how to control when ArenaSwap switches tabs](/arenaswap/docs/extension/switching-and-sensitivity/) for the full range.

## Why is a tab missing from the assign dropdown, or shown grayed out?

The **Assign a tab** dropdown lists the open tabs in the window you opened ArenaSwap from, and skips the browser's own pages. A stream has to be open in its own tab before it shows up here. To assign a tab in another window, open ArenaSwap from that window. A tab you open while ArenaSwap is showing appears the next time you open it. A tab already assigned to a different game appears grayed out with **(in use)** next to it. To reassign that tab, unassign it from the other game first.

## Why did a tab get freed or closed after a game ended?

Your **When a game finishes** setting did it. It's in Settings under Switching, and it's set to **Free it from ArenaSwap** or **Close the tab**. Set it back to **Leave the tab alone** to stop. A message when you next open ArenaSwap says how many tabs were handed back. See [what happens when a game ends](/arenaswap/docs/extension/watching-multiple-games/#choose-what-happens-when-a-game-ends).

## Why did I get an "Up next" notification, but ArenaSwap hasn't switched yet?

**Content-aware switching** is waiting for a break in play. The notification says what it's waiting for, like "Switching after this play." or "Switching at the next whistle." The switch goes ahead on its own once play stops or the wait runs out. Turn off **Content-aware switching** in Settings to switch right away. [How the wait works](/arenaswap/docs/extension/switching-and-sensitivity/#dont-get-cut-off-mid-play) has the details.

## Why didn't Multiview open?

The [Multiview page](/arenaswap/docs/extension/multiview/) answers that one.

## Why isn't Standby Stream doing anything?

Standby Stream needs two things set up before it can act, and it silently does nothing without either:

1. A tab picked in the **Standby tab** dropdown under Settings → Standby Stream. If it still reads **Select a tab**, nothing has been chosen.
2. At least one live game with a tab assigned to it. Standby Stream only compares against games you've registered, so with no registered games there's nothing for it to fall back from.

It also stands down while **Enable auto-switching** is off, waits out your **Switch cooldown** like any other switch, and steps aside while Multiview is showing.

See [how to set up Standby Stream](/arenaswap/docs/extension/standby-stream/) for the full setup.

## Why didn't I get a switch notification?

Check that **Switch notifications** is turned on in Settings, under Switching. If it's already on and you're still not seeing anything, check your operating system's notification settings for your browser. ArenaSwap asks the browser to show a notification either way. If the OS is blocking notifications from the browser itself, ArenaSwap's never arrive either.

## Related

- [How to watch multiple games at once](/arenaswap/docs/extension/watching-multiple-games/) covers assigning tabs from the start.
- [How to control when ArenaSwap switches tabs](/arenaswap/docs/extension/switching-and-sensitivity/) covers sensitivity, cooldown, and switch delay in full.
- [ArenaSwap settings reference](/arenaswap/docs/extension/settings/) lists every setting's default and range.
- The [FAQ](/arenaswap/faq/) covers broader questions about leagues, streaming services, and data.
