---
title: How to set up Standby Stream
description: Give ArenaSwap a fallback tab so it parks you somewhere good instead of leaving you on a blowout when every game you track goes quiet.
section: extension
order: 5
navLabel: Standby Stream
faq:
  - q: What is Standby Stream in ArenaSwap?
    a: A fallback tab. When every game you've assigned a tab to drops below a score threshold you set, ArenaSwap switches you to a tab you picked in advance. You don't get left on the least-bad option instead.
  - q: Why isn't Standby Stream doing anything even though it's turned on?
    a: It needs two things before it can act. Pick a standby tab in Settings. Assign a tab to at least one live game. Without both, there's nothing for it to compare or fall back to.
---

Some nights every game you're tracking turns into a blowout, a rain delay, or an intermission at the same time. Standby Stream gives ArenaSwap somewhere better to put you than whichever of those is technically least boring.

## Turn it on

Turn on Standby Stream from Settings:

1. Open **Standby Stream**.
2. Turn on **Enable Standby Stream**.

The first time you do, ArenaSwap walks you through a two-step guide explaining how it behaves and what to set up. When you're ready, click **Got it** on the second screen, or skip ahead and work through the setup below directly.

## Set your threshold

**Standby below** is a 0 to 100 slider, default 20. It sets the PowerScore every one of your assigned games has to drop under before ArenaSwap parks you on standby. A lower number is more patient and waits for things to get quieter before giving up on your games. A higher number gives up sooner.

## Pick a standby tab

Open whatever you want as your fallback, a highlight show, a studio broadcast, anything, in its own tab. Then, still in Standby Stream settings, pick that tab from the **Standby tab** dropdown.

Standby Stream can't do anything without a tab picked here. If the dropdown is still on **— Select a tab —**, nothing will happen when your games go quiet.

## What happens next

Once every assigned live game's PowerScore drops below your threshold, ArenaSwap switches you to the standby tab automatically. The moment any assigned game climbs back above the threshold, ArenaSwap switches you right back. Navigate away from the standby tab yourself, and ArenaSwap takes the hint and leaves you wherever you went. The standby tab mutes and unmutes exactly like any other tab ArenaSwap manages.

Standby Stream only ever compares against games you've assigned a tab to. If you haven't registered any tabs yet, there's nothing for it to fall back from.

## Related

- [How to watch multiple games at once](/arenaswap/docs/extension/watching-multiple-games/) covers assigning tabs to games, which Standby Stream depends on.
- [ArenaSwap settings reference](/arenaswap/docs/extension/settings/) lists the default and range for every Standby Stream setting.
