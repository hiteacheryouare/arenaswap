---
name: recordings-and-espn-extras
description: How to read the PowerScore slate recordings, and payload facts about our sources' live extras checked on 2026-10-03
metadata:
  type: reference
---

**Recordings:** `scripts/powerscore/recordings/<day>/*.jsonl.gz`. Each line has `t`: meta, scoreboard (`events`, or `unchanged`), summary (`raw.pickcenter/boxscore/...`), situation, or standings. A file that is still being written ends in a torn gzip line. Read it with `zlib.gunzipSync(buf, { finishFlush: Z_SYNC_FLUSH })` and skip lines that don't parse. A scoreboard line holds only some of the events, so find a game by id across lines.

**Payload facts:**
- Soccer `details[].clock.value` stops at the period end in stoppage time (5400 for 90'+6'), but `displayClock` keeps counting.
- MLB "Mid N" and "End N" both arrive as STATUS_IN_PROGRESS. "End N" briefly keeps the stale outs and runners.
- The MLB scoreboard sends `series` only in the postseason.
- `clincher` is a letter in displayValue: x, y, z, e, `*`, cx.
- Only MLB standings have magicNumber* and playoffPercent. NFL has playoffSeed but no gamesPlayed. NBA, NHL and WNBA have neither.
- MLS standings are two conference tables, not sorted by rank.
- `pickcenter[0]` can change between polls. Hockey, MLB and soccer all send `spread: ±1.5`.
- You can fetch live standings with `curl site.api.espn.com/apis/v2/sports/<path>/standings?level=3`.

Related: [[powerscore3-open-questions]]
