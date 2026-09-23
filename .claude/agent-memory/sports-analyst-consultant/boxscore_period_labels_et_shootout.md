---
name: boxscore-period-labels-et-shootout
description: Line score period heading decisions for soccer extra time and penalties, and hockey shootout vs multi-OT, with the verified ESPN linescores shape for both
metadata:
  type: project
---

Decided 2026-09-07 for the box score line score headings. Supersedes the OT/2OT fallback for soccer
and for the hockey shootout column.

**Why:** soccer extra time is a closed two-halves-of-15 structure that can never produce a third
period, so `OT`/`2OT` communicates an escalating series the sport does not have. And in hockey a
5-entry linescore is genuinely ambiguous between a regular-season shootout and a playoff 2OT, so an
index-based label is wrong roughly half the time it fires.

**How to apply:** label soccer positionally, label hockey's last column from the `Final/XX` status
suffix already stored for the finished card. Never infer a shootout from the array length.

## Shipped headings
- Soccer: `1 | 2 | ET1 | ET2 | PEN`. `ET` is the dominant English token for the phase (FIFA, UEFA,
  broadcast lower-thirds, betting markets); ET1/ET2 is what Opta-fed match panels print when the two
  halves are separated. No broadcaster or competition split worth branching on — FIFA, UEFA, FA Cup,
  Copa, MLS Cup all use the same vocabulary.
- **`AET` is not a period label.** It is a result qualifier ("2-1 AET") and must never head a column.
  ESPN uses it exactly that way, as `status.type.detail`.
- Hockey: `1 | 2 | 3 | OT | SO` regular season, `1 | 2 | 3 | OT | 2OT | 3OT` playoffs. `SO` is
  NHL.com's and ESPN's own box score heading.
- Basketball/football keep numbered-then-`OT`/`2OT`/`3OT` unchanged.

## Verified ESPN shape (2026-09-07, live payloads)
`header.competitions[0].competitors[].linescores`, `/summary` only.
- **Soccer linescores are `null` on the scoreboard endpoint.** Only `/summary` carries them.
- Soccer array is **positionally fixed**: `[1H, 2H, ET1, ET2, PENS]`. 2 entries at FT, 4 at AET,
  5 at penalties. Index 4 is always the shootout.
- **MLS Round One goes straight to penalties with no extra time by rule, and ESPN still emits 5
  entries with indices 2 and 3 zero-filled.** Phantom ET columns are unavoidable from linescores
  alone — a scoreless real ET (SUI-COL 0-0 into pens, WC 2026) is byte-identical to MLS's no-ET
  case. Accepted rather than adding a per-competition rules table.
- **Soccer penalties do NOT sum into `score`**: EGY read `score: 1` with linescores `1,0,0,0,4`.
  Any total column for soccer must come from `score`, never a row sum.
- `competitor.shootoutScore` (a float) duplicates soccer index 4. Absent for hockey.
- Hockey's shootout entry is the **awarded goal (0 or 1)**, not the shootout tally, and it *does*
  sum into `score`. Opposite of soccer on both counts.
- Hockey playoff 2OT is also 5 entries (indices 3, 4 = OT1, OT2). Disambiguate on
  `status.type.shortDetail` suffix: `Final/SO` vs `Final/2OT`. Shootouts never occur in NHL playoffs.
- Linescore objects in the summary header carry **only `displayValue`** — no `period`, no `value`.
  Position is the only information available.
- `status.period` is unreliable on the summary header: present for World Cup (4 for AET, 5 for pens)
  and **`None` for MLS and for NHL**. It is populated on the scoreboard. Do not key labels on it.
- Soccer status types: `28 STATUS_FULL_TIME` / `FT`, `45 STATUS_FINAL_AET` / `AET`,
  `47 STATUS_FINAL_PEN` / `FT-Pens`.

## Localization hazards for the new keys
`ET1`, `ET2`, `PEN`, `SO`. Several languages have a genuine native abbreviation rather than the
English one, so these must not be blanket-copied:
- French penalties are **`TAB`** (tirs au but), universal in French coverage.
- Italian is **`DCR`** / `RIG` (dopo calci di rigore).
- Japanese is **`PK`** (PK戦) — not PEN.
- German uses `n.V.` for after-extra-time and `n.E.` for after-penalties; a column wants `V` / `E`.
- Spanish/Portuguese keep `PEN`; extra time is `TE` / `PRO`.

See [[boxscore_columns_by_sport]] and [[boxscore_espn_stat_key_traps]].
