---
title: Troubleshoot ArenaSwap
description: Quick fixes for an empty game list, switches that never happen, tabs missing from the dropdown, and missing notifications.
section: extension
order: 9
navLabel: Troubleshooting
faq:
  - q: Why doesn't ArenaSwap show any games?
    a: If you see Choose Leagues to Get Started, no leagues are turned on yet. Click Pick leagues in Settings and turn some on. If you have leagues on and still see an empty list, nothing is live in them right now. Click Refresh, or try Demo mode.
  - q: Why won't ArenaSwap switch tabs?
    a: Check that Enable auto-switching is on in the top bar and that at least one live game has a tab assigned to it. ArenaSwap only switches between tabs you've given it.
---

Most problems come down to a setting that's off or a tab that was never assigned. Start with the one that sounds like yours.

## The game list is empty

If you see **Choose Leagues to Get Started**, no leagues are on yet. Click **Pick leagues in Settings** and turn on at least one.

If you see a message like "It's a slow sports day," your leagues have nothing live right now. Click **Refresh** to check again. Or turn on [Demo mode](/arenaswap/docs/extension/demo-mode/) for something to play with.

If a banner says **Our sources went quiet. Couldn't load games.**, click **Retry**. If it keeps happening, check your internet connection.

## ArenaSwap isn't switching tabs

Check these in order:

1. **Enable auto-switching** in the top bar is on.
2. At least one live game has a tab assigned. Use the **Assign a tab** dropdown on its card.
3. You have a second game assigned. With only one, ArenaSwap can take you to it from a tab that isn't a game, but it has nothing to switch between.

Still nothing? **Switch sensitivity** may be set low, or **Switch cooldown** or **Switch delay** may be long. [Controlling when ArenaSwap switches](/arenaswap/docs/extension/switching-and-sensitivity/) shows what to change.

## ArenaSwap pulled me away from what I was doing

If the tab you're on isn't assigned to a game, ArenaSwap treats you as free and moves you to the best assigned game as soon as one heats up. To browse in peace, turn off **Enable auto-switching** first.

## It keeps bouncing between two games

Two of your games are neck and neck, and ArenaSwap follows every swing. Raise **Switch cooldown** in Settings so the leader has to hold on longer before the next switch. [Controlling when ArenaSwap switches](/arenaswap/docs/extension/switching-and-sensitivity/) has the range.

## A tab is missing from the dropdown, or grayed out

The **Assign a tab** dropdown lists the tabs open in the window you opened ArenaSwap from. Open the stream in its own tab first. For a tab in another window, open ArenaSwap from that window. A tab you open while the popup is showing appears the next time you open it.

A tab marked **(in use)** is assigned to a different game. Unassign it there first.

## A tab got closed or freed after a game ended

Your **When a game finishes** setting did it. You'll find it in Settings under **Switching**. Set it to **Leave the tab alone** to stop. [What happens when a game ends](/arenaswap/docs/extension/watching-multiple-games/#choose-what-happens-when-a-game-ends) has the options.

## I got an "Up next" notification, but no switch

**Content-aware switching** is waiting for a break in play, like a whistle or the end of an at-bat. The notification says what it's waiting for. ArenaSwap switches when play stops, or after a short wait. To switch right away, turn off **Content-aware switching** in Settings. [Don't get cut off mid-play](/arenaswap/docs/extension/switching-and-sensitivity/#dont-get-cut-off-mid-play) has more.

## Multiview didn't open

The [Multiview page](/arenaswap/docs/extension/multiview/) has the checklist.

## Standby Stream isn't doing anything

Standby Stream needs two things:

1. A tab picked in the **Standby tab** dropdown under Settings, then **Standby Stream**. If it still says **Select a tab**, pick one.
2. At least one live game with a tab assigned.

It also waits while **Enable auto-switching** is off, and while Multiview is open. [How to set up Standby Stream](/arenaswap/docs/extension/standby-stream/) has the full steps.

## No switch notifications

Turn on **Switch notifications** in Settings, under **Switching**. If it's already on, check your computer's notification settings and make sure your browser is allowed to show them.

## Related

- [How to watch multiple games at once](/arenaswap/docs/extension/watching-multiple-games/) covers assigning tabs.
- [How to control when ArenaSwap switches tabs](/arenaswap/docs/extension/switching-and-sensitivity/) covers sensitivity, cooldown and delay.
- [ArenaSwap settings reference](/arenaswap/docs/extension/settings/) lists every setting's default and range.
- The [FAQ](/arenaswap/faq/) covers leagues, streaming services and data.
