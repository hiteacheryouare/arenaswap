---
name: powerscore3-labelling-calls
description: Judgement calls made while hand-labelling recorded slates for the PowerScore 3 replay (first slate 2026-10-03-a); reuse so later slates are labelled consistently
metadata:
  type: project
---

First slate labelled 2026-10-03: `scripts/powerscore/fixtures/labels/2026-10-03-a.json` (55 moments,
45 at level 3, 10 at level 2), from the blind file `temporary/powerscore3/blind-<slate>.txt`. Only the
flipTo game's level is recorded, so only the leading candidates each minute need a full read.

Calls made that the section 4 guide doesn't spell out:
- **Tiebreak (2) needs a visible possessor.** A tied game at the two-minute warning with no
  possession shown does not count as a last-possession state; a down-7 drive at 0:13 beats it.
- **A down-13 punt on 4th down** technically meets "4th down, one-score Q4" but never outranks a
  trailing team's live drive under 2:30. Treat the 4th-down trigger as a decision, not a punt.
- **NCAA hockey OT with a garbled score** (5-5 became 10-10 when a 5:00 clock started after the
  break) is still read as OT. Clock 0:00 after OT, no `break`, score unchanged: probably a
  shootout, so it went in `acceptable` rather than `flipTo`.
- **Baseball between half-innings** (`4 ---` with no T/B) is a commercial stall, not frozen: keeps
  its level.
- **Postseason 1-0 with a no-hit bid through 5** is the level-2 fill when the level-3 game sits in a
  break (pre-OT intermission). Level 3 only from the 7th.
- **CFB OT kickoff placeholders** (`-1&-1, 65 to go` in OT) stay level 3: any OT.
- **A winning 2-point try in the second OT possession** reads as final: level 0 at the next
  snapshot, so the flip goes elsewhere.

**Why:** the replay scores the engine against these labels; inconsistent calls across slates
would read as engine regressions.

**How to apply:** label new slates with the same calls, or update this note and relabel old slates
if a call changes. Related: [[powerscore3-spec-decisions]].
