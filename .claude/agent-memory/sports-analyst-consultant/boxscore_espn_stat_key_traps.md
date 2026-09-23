---
name: boxscore-espn-stat-key-traps
description: ESPN /summary boxscore.players stat keys and labels that mean something other than they look like, plus value-format hazards — the mislabel list for the box score feature
metadata:
  type: reference
---

Traps found while specifying the game detail box score (2026-09-07). A mislabeled column is worse
than a missing one, so this is the list to check any new column against.

**Why:** ESPN reuses abbreviations across sports with different meanings, and is inconsistent with
its own published glossary in at least one case.

**How to apply:** check every new box score column against this list before shipping the label.

## Abbreviations that mean something else
- Hockey `SOG` in the payload = **shootout goals**, not shots on goal. Shots on goal is `S`.
  ESPN's own NHL glossary (espn.com/nhl/s/statistics/glossary.html) defines SOG as shots on goal,
  so ESPN contradicts itself between glossary and payload. **Label the UI column `S`** (NHL.com's
  own label) so the code never has a column named SOG mapping to a different key than the one
  ESPN calls SOG.
- Hockey `SOS` = shootout saves, `SOSA` = shootout shots against. Not strength of schedule.
- Hockey `YTDG` = year-to-date goals, a **season** total sitting in a game box score. Rendering it
  as G shows a 22-goal night.
- Hockey `SHFT` = shifts, not short-handed anything. `SHTOI`/`SHSV` are the short-handed ones.
- Hockey `PN` = penalties (count), `PIM` = penalty minutes. Fans quote PIM.
- Hockey `BS` = shots this player blocked, not his shots that were blocked. `HT` = hits delivered.
- Hockey `S` vs `SM`: shots on goal vs shots missed. `S` is not attempts.
- Hockey `FW/FL/FO%` are centre-only; a winger reads 0-0 / 0.0 and the column looks broken. Keep
  faceoffs out of a shared skater table.
- Football `sacks` under `passing` = sacks **suffered** (and arrives as `sacks-sackYardsLost`,
  e.g. "3-21"). `sacks` under `defensive` = sacks **recorded**. Same word, opposite meaning,
  and they can both be on screen at once.
- Baseball `#P` on a batter = pitches seen, not pitches thrown.

## Value formats — every stat value is a string
- Baseball IP key is `fullInnings.partInnings` — the separator is a **dot**, unlike every other
  composite key which uses `-`. A generic `split('-')` composite handler misses it, and a
  path-style getter (`get(obj, key)`) will try to walk it as a nested property.
- The IP value "5.2" means 5 innings and 2 outs, **not** 5.67. Never do arithmetic on it.
- `TOI`, `MIN` arrive as `MM:SS` or as a bare number. Not parseable as one type.
- Rate stats use the leading-dot convention: `.276`, `1.000`, `.944`. Do not reformat.
- ERA renders as `-` or an absurd number for a pitcher who allowed runs without recording an out.
- Football `SACKS` and `TFL` are decimals (0.5, 1.5) because sacks split between players. Never
  render as an integer.
- `plusMinus` sometimes carries an explicit `+`. Normalize on display.
- `--` / empty means did-not-record, not zero.
- A legitimate `0`, `0-0` or `.000` is falsy-adjacent — the same truthiness bug that already ate a
  rookie's `0-0` in the pre-game leaders block.

## Structural hazards
- `boxscore.players` is empty before the game and for a while after it starts. Render nothing
  rather than an empty table.
- `athlete` can arrive as a `$ref` string instead of an object on some feeds — the same shape
  failure that `leaders` has for cricket.
- Zod strip mode silently deletes undeclared fields. Every field wanted here must be declared, the
  same failure that ate the venue address and the pre-game competitor fields.
- Soccer possession sums to ~100 across the pair; shots do not. One bar renderer cannot serve both
  without normalizing to the pair total.
- Team `Saves` in soccer ≈ opponent's shots on goal minus goals conceded, and will not reconcile
  exactly. That is correct, not a bug.
- Soccer stat coverage varies hugely by competition — a stat can be present for one team and absent
  for the other in lower-tier leagues.

## Localization
Column headers are the strings with the least room in the product. The 15 stat abbreviations
already translated for the pre-game leaders block cover most of this — reuse those keys rather than
minting new ones. German/French hockey already use T/V/PKT and B/A/PTS from NHL.com's own localized
glossaries.

See [[boxscore_columns_by_sport]] for the decided column sets.
