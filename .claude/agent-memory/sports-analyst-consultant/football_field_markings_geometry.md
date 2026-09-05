---
name: football-field-markings-geometry
description: Rulebook-verified NFL and NCAA football field marking dimensions, converted to yards and to a vertically compressed 120x30 SVG viewBox, plus which markings survive at 289x75px
metadata:
  type: project
---

Verified 2026-09-04 against the primary rulebooks, not secondary sites:
**NFL 2025 Official Playing Rules, Rule 1 + the Field Markings diagram notes** and
**NCAA Football Rules and Interpretations, Rule 1-2 / 2-12**. Companion to
[[football_field_position_model]] and [[football_espn_dead_ball_states]].

## The compression factor

The strip grew from `0 0 120 10` to `0 0 120 30`. A real field is 120 x 53 1/3 yards, so a
120x30 viewBox compresses the **cross-field axis by k = 30 / 53.333 = 0.5625** while leaving the
long axis 1 unit = 1 yard. Every cross-field measurement below must be multiplied by 0.5625;
every down-field measurement is already in units.

At 289 x 75 px: **2.408 px per x-unit, 2.5 px per y-unit** (near enough square, so a
`non-scaling-stroke` hairline reads the same both ways).

## Verified dimensions

| Marking | NFL | NCAA |
|---|---|---|
| Field | 360 x 160 ft (120 x 53.333 yd) | same |
| End zone depth | 10 yd | 10 yd |
| Line width | 4 in | 4 in |
| Goal line width | **8 in** (double) | **4 or 8 in**, may be a contrasting colour |
| Hash row from sideline | **70 ft 9 in = 23.583 yd** | **60 ft = 20 yd** |
| Hash row separation | 18 ft 6 in (= goal post width) | 40 ft = 13.333 yd |
| Hash mark size | 4 in wide x **24 in long, running lengthwise** | same 24 in |
| Hash interval | every 1 yd | every 1 yd |
| Sideline 1-yd ticks | 24 in, start 8 in off the 6-ft border | 24 in, 4 in inside the sideline |
| Numbers | bottom **12 yd** off sideline, 2 yd (6 ft) tall | top **9 yd** off sideline, 6 ft tall, 4 ft wide |
| Arrow | triangle, 18 in base, two 36 in sides | identical |
| White border | min 6 ft all around | limit lines 12 ft out (min 6 ft) |
| Pylons | 4 goal-line corners + 2 per end line | 4x4 in, 18 in tall, red or orange |

Both codes: numbers only on **multiples of 10**, arrows on **every number except the 50**, arrow on
the **goal-ward** side pointing at the nearer goal line. The **yard line runs between the two
digits** (~1 ft gap each side, so a two-digit number spans ~10 ft = 3.33 yd).

Number tops point toward the **centre** of the field in both codes, so on an overhead view one row
of numbers is upside down. Do not draw both rows upright.

## Two things that are not in the end zone

**No yard lines and no hash marks.** Both books scope them to the *field of play*, which is
goal line to goal line (NFL Rule 1-2-1; NCAA Rule 2-12-6). End zones carry only the goal line,
end line, sidelines, pylons and decoration.

## Midfield logo — there is an actual NFL rule

NFL field diagram note: *"Center logos, whether painted or inlayed, may not exceed **1200 square
feet** or extend beyond the **40-yard lines**, whichever occurs first."* 1200 sq ft as a circle is
39.1 ft = **13.0 yd diameter**; the 40-to-40 cap is 20 yd. Centred on the 50 and on the field width.

## What survives at 289 x 75 px

Computed, not estimated:

| Marking | Rendered size |
|---|---|
| 5-yard line spacing | 12.0 px |
| End zone | 24.1 px |
| NCAA hash row separation | 18.8 px |
| NFL hash row separation | **8.7 px** |
| Painted number height | **2.8 px** |
| Two-digit number width | **8.0 px** |
| Arrow | **2.3 x 0.7 px** |
| Hash mark | **1.6 x 0.16 px** |
| Yard line width (4 in) | **0.27 px** |

**How to apply:** at this size every real line width is sub-pixel, so widths must come from
`vector-effect: non-scaling-stroke` and relative *weight*, never from true scale. Painted numbers,
arrows and individual hash marks cannot be drawn to scale at all — they are noise. Draw numbers
oversized or not at all; render the hash rows as a **row** rather than as countable marks.

**Why the two hash gauges matter:** NFL hashes are 8.7 px apart at this size and read as one thick
centre line, NCAA hashes are 18.8 px apart and read as two distinct rows. If the strip draws hashes
at all, the NFL/NCAA difference is visible and worth honouring, since `leagueConfigs` already
distinguishes `nfl` from `ncaaf`.

## Secondary sources that are wrong

- opensourcesports.io says NCAA hashes are "40 feet from each sideline" — it has conflated
  hash-to-sideline (60 ft) with hash-to-hash (40 ft).
- Several sites give NFL numbers as "9 feet tall". The rule says **2 yards** (6 ft).

Always go to `operations.nfl.com` / the NCAA `PRMFB_RulesBook.pdf` for this.

## Mowing bands (verified)

Bands are light reflecting off grass bent by the mower's roller, not paint or cut height. Football
fields are cut **sideline to sideline** — bands run **across** the field, parallel to the yard
lines. The reason is broadcast: mowing lengthwise makes the grain "squiggle" the painted yard lines
from a sideline camera.

Standard increments are 1, 5 and 10 yards; **5 yards is the default** and matches both the yard-line
spacing and a 15-ft mower pass. Synthetic turf fakes it with alternating panels, also at 5 yards,
because turf rolls are 15 ft wide (Nebraska's FieldTurf alternates two greens every five yards).

Two authentic irregularities: the real 5-yard pattern runs a single **10-yard band across midfield
(45 to 45)** so both end zones come out matching; and the "Denver 10" pattern puts 10-yard blocks
on the 5s so a number and its arrow land in the same grain.

Tennessee's checkerboard end zone is **paint**, not mowing (1964, restored 1989).

## Broadcast convention

- **Yellow = line to gain, blue = line of scrimmage**, from Sportvision's "1st & Ten", debut
  1998-09-27 on ESPN (Bengals at Ravens). Some broadcasts swap yellow to **red on 4th down**.
  Yellow was chosen over orange against turf, jerseys and snow. 28 years of conditioning — the most
  portable convention available to a 2D strip.
- The ball spot is drawn as a **football silhouette**, not a dot, across Apple Sports, ESPN Gamecast
  and the NFL app. A circle collides with every other round marker in a sports UI. (Observed, not
  documented in a published spec.)
- ESPN's drive chart draws the drive as a **bar proportional to yards gained** — the same thing our
  strip already does.
- **TV scorebugs carry no field strip at all.** The field strip is an app idiom; TV solves ball
  position with AR lines on the live video. Do not look to broadcast scorebugs for this.
- No red-zone convention exists to borrow — it is a statistical region, not a painted one.
