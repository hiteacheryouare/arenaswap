---
name: standings-college-hockey
description: College hockey Standings tab decision (2026-11-07) - rank by computed (W + T/2)/GP, no derived points, label as overall record; verified feed stat keys for men's vs women's
metadata:
  type: project
---

Recommendation given 2026-11-07 for the Standings tab's NCAA hockey tables (men's and women's).

- Feed facts (curled `/apis/v2/sports/hockey/{mens,womens}-college-hockey/standings?level=3` that day): `points` is 0.0 for every team, all season (not an early-season lag). `winPercent` ignores ties (Wisconsin 6-0-1 = 1.000, women's Yale 3-2-1 = .600). `OTWins`/`OTLosses` (capital OT, so the `otLosses` spec key never matches) are 0. `pointsFor`/`pointsAgainst` are 0, so there's no GF/GA. Records are overall only, with no conference split.
- Men's sends ties as `tiegames`. Women's sends `ties`. Women's comes as ONE national 45-team table with no conference children.
- NFL `winPercent` counts a tie as half (Giants 4-2-1 = .643), so football is fine as is.
- Decision: rank by our own (W + 0.5*T)/GP, which is the convention college hockey ranking sites and NCAA RPI/NPI use. Show W L T PCT. Do NOT show derived 2-1-0 points: conferences award 3-2-1-0 on conference games only (Hockey East's own site shows conference PTS next to overall W-L-T), so a points column would read as the conference race and be wrong.
- Tiebreak at equal PCT: more wins, then fewer losses, then a stable feed order. Never fewer GP.
- Gate it on the league (college hockey), not a zero-detection heuristic. A generic "sort stat flat while games have been played" guard is optional as a safety net.
- Label the table as the overall record. Example: Hockey East leader by conference points was Vermont (14), but by overall PCT it's Merrimack (.778).
- 2025-26 onward: the men's D-I selection tool is the NPI, which replaced the PairWise.

**Why:** the feed has no conference record for hockey, so overall PCT is the only honest ranking.
**How to apply:** use this if college hockey standings, women's T column, or a points-vs-PCT question comes up again. Related: [[boxscore-espn-stat-key-traps]].
