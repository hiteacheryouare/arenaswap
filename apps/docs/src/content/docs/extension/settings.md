---
title: ArenaSwap settings reference
description: Every setting in the ArenaSwap popup, grouped the way the popup itself groups them, with its default value and its full range.
section: extension
order: 6
navLabel: Settings
---

Settings live behind the gear icon in the popup's top bar, grouped into six categories: Switching, Scoring, Leagues, Display, Standby Stream, and Demo mode. A search box above the categories matches a setting by name or by common alternate terms, in the popup's current language.

## Switching

| Setting | Default | Range | What it does |
| --- | --- | --- | --- |
| Switch sensitivity | Balanced (level 4, gap ≥ 11) | Level 1–7: Barely Active (37), Passive (27), Conservative (18), Balanced (11), Eager (6), Trigger Happy (3), Ludicrous Speed (1) | The PowerScore gap a game needs over the one currently active before ArenaSwap switches to it. |
| Switch cooldown | 45s | 15s, 30s, 45s, 60s, 90s, 2m, 3m | The minimum time between automatic switches. |
| Switch delay | Off | Off, 15s, 30s, 45s, 60s, 90s, 2m, 3m | The wait before ArenaSwap executes a switch it has decided on. |

## Scoring

| Setting | Default | Range | What it does |
| --- | --- | --- | --- |
| Closeness | On | On/off | Whether the Closeness signal contributes to PowerScore. |
| Late-game | On | On/off | Whether the Late-game signal contributes to PowerScore. |
| Momentum | On | On/off | Whether the Momentum signal contributes to PowerScore. |
| Lead changes | On | On/off | Whether the Lead changes signal contributes to PowerScore. |
| Comeback | On | On/off | Whether the Comeback signal contributes to PowerScore. |
| Favorite team bonus | 10 | 0 or higher | Points added once for each favorited team in a game. Doubled when both teams are favorited. |
| Postseason boost | 5 | 0 or higher | Points added to every game classified as postseason: playoffs, tournaments, and knockout rounds. |

At least one signal has to stay on. If a signal is off, ArenaSwap re-normalizes the rest so the total still spans the full 0–100 range. See the [PowerScore page](/arenaswap/powerscore/) for how each signal is calculated.

## Leagues

| Setting | Default | Range | What it does |
| --- | --- | --- | --- |
| Enabled leagues | NBA, NFL, NHL, and MLB, chosen during setup | Any of the 31 supported leagues across basketball, football, hockey, baseball, softball, and soccer | Which leagues ArenaSwap tracks and considers for automatic switching. |
| Display order | ESPN's default league order | Drag a league or use its up and down arrows to reorder | The order league sections appear in on the main screen. Only shown once two or more leagues are enabled. A Reset button appears once the order no longer matches the default. |

## Display

| Setting | Default | Range | What it does |
| --- | --- | --- | --- |
| Show upcoming games | On | On/off | Shows an Up Next section for games in enabled leagues that haven't started yet. |
| Days ahead | 7 days | 1–14 days | How far ahead Up Next looks. Only shown while Show upcoming games is on. |
| Pro tips | On | On/off | Shows short contextual tips on the main screen. |
| Switch notifications | On | On/off | Shows a browser notification with the score, venue, and reason whenever ArenaSwap switches a tab, including switches to and from Standby Stream. |
| Show betting & odds | Off | On/off | Shows betting lines and the sportsbook's logo on game cards and the detail screen. |
| Temperature unit | °F | °F or °C | The unit used for weather on the game detail screen. |

## Standby Stream

| Setting | Default | Range | What it does |
| --- | --- | --- | --- |
| Enable Standby Stream | Off | On/off | Turns on the standby fallback tab. The first time it's turned on, a two-step guide explains the setup below. |
| Standby below | 20 | 0–100 | The PowerScore every assigned live game must drop under before ArenaSwap switches to the standby tab. |
| Standby tab | No tab selected | Any open browser tab | The tab ArenaSwap switches to once every assigned game is below the threshold. |

## Demo mode

| Setting | Default | Range | What it does |
| --- | --- | --- | --- |
| Demo mode | Off | On/off | Replaces live scoreboards with 15 scripted games across 12 leagues, regardless of which leagues are enabled. |

## Related

- [How to control when ArenaSwap switches tabs](/arenaswap/docs/extension/switching-and-sensitivity/) covers what to do with the Switching settings.
- [How to set favorite teams in ArenaSwap](/arenaswap/docs/extension/favorite-teams/) covers where the favorite team bonus comes from.
- [How to set up Standby Stream](/arenaswap/docs/extension/standby-stream/) covers the fallback tab and its threshold.
- [Try ArenaSwap with Demo mode](/arenaswap/docs/extension/demo-mode/) covers the scripted games and how they behave.
