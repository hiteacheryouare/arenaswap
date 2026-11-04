---
title: How to use Multiview
description: Multiview puts your exciting games in one browser tab, the best one big and loud. Turn it on, choose when it opens, and see what to expect.
section: extension
order: 10
navLabel: Multiview
faq:
  - q: How do I watch several games on one screen in my browser?
    a: Turn on Multiview in ArenaSwap settings, then assign a tab to each game you're streaming. When two or more of those games are exciting at once, ArenaSwap opens a Multiview tab with each game in its own box.
  - q: Does Multiview work in Firefox?
    a: No. Multiview is available in the Chrome and Edge versions of ArenaSwap only. The Firefox version has everything else.
  - q: Why didn't Multiview open?
    a: It needs Enable auto-switching on, a tab assigned to at least two live games, and at least two of those games at or above your Exciting at score. It also waits out your Switch cooldown and Switch delay.
---

Two games get good at the same time, and ArenaSwap can only pick one tab. Multiview is the answer for those nights: every exciting game on one screen, so you stop choosing.

Multiview is available in Chrome and Edge. Firefox doesn't have it, so you won't see it in Firefox settings.

## Turn on Multiview

1. Open Settings and choose **Multiview**.
2. Turn on **Enable Multiview**.
3. The first time, a short guide explains what Multiview does. Click **Next**, then **Continue**.
4. Your browser asks whether ArenaSwap can "Read and change all your data on all websites." Allow it.

Multiview needs that permission to show your streams from other websites in one tab. If you click **Not Now** or say no to the browser, Multiview stays off and everything else works as before.

## Assign a tab to each game

Multiview shows the streams you already have open. Open each game in its own tab and pick it from the **Assign a tab** dropdown on the game's card, the same as for [watching multiple games](/arenaswap/docs/extension/watching-multiple-games/). Only a tab on a regular web page (http or https) can go in a box. If a game is assigned to two tabs, Multiview uses the first.

Keep **Enable auto-switching** on in the top bar. Multiview is part of auto-switching, and it closes when auto-switching is off.

## Choose when it opens

These settings live under **Multiview**:

- **Exciting at** is the PowerScore a game needs to count as exciting. It runs from 0 to 100 in steps of 5 and defaults to 65. Slide left to open Multiview more often. Slide right to keep it for big moments only.
- **Show** decides who gets a box once Multiview is open. **Exciting games** boxes only the games at or above the threshold. **All my games** boxes every game you've assigned a tab to.
- **Most boxes** caps how many games appear at once, from 2 to 8. The default is 4. If more games qualify, the highest PowerScores win the boxes.

Multiview opens when at least two of your assigned games reach the **Exciting at** score. It follows your **Switch cooldown** and **Switch delay** like any other switch, so a delay of 30 seconds means the games have to stay exciting for 30 seconds first. [How to control when ArenaSwap switches tabs](/arenaswap/docs/extension/switching-and-sensitivity/) covers both.

## What you see

ArenaSwap opens Multiview in a new tab beside the one you were watching and switches to it. If notifications are on, you get a **Switched → Multiview** notification.

- **The biggest box goes to the most exciting game.** It sits top left and is the only one with sound. A speaker icon on its team bar marks it.
- **The rest line up around it.** Each box shows its game's team colors until the stream starts playing, then swaps to the picture.
- **The big box changes hands carefully.** Another game takes it only when its PowerScore beats the current one by your **Switch sensitivity** gap, and not more often than your **Switch cooldown**.
- **A game keeps its box through a dip.** Once boxed, a game stays until its PowerScore drops below the **Exciting at** line by about the same gap, so a game sitting right on the line doesn't flicker in and out.

Your game tabs stay open and muted behind the Multiview tab.

## When Multiview closes

When fewer than two games are still exciting, Multiview closes. If you were on it, ArenaSwap takes you to the assigned game with the highest PowerScore.

If you close the Multiview tab yourself, it can open again once your Switch cooldown has passed.

If none of the streams start playing within 60 seconds, ArenaSwap takes you back to your best game and leaves that set of games alone for 10 minutes. If a single box never plays, open that stream in its own tab and check that it plays there.

## Related

- [How to watch multiple games at once](/arenaswap/docs/extension/watching-multiple-games/) covers assigning a tab to each game.
- [How to control when ArenaSwap switches tabs](/arenaswap/docs/extension/switching-and-sensitivity/) covers sensitivity, cooldown and switch delay, which Multiview follows.
- [ArenaSwap settings reference](/arenaswap/docs/extension/settings/) lists every Multiview setting with its default and range.
