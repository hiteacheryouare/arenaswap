---
name: boxscore-columns-by-sport
description: Decided box score categories, ordered column sets (max 6) and row-ordering rules per sport for the 320px game detail screen, with the reasoning for each cut
metadata:
  type: project
---

Box score for the game detail screen, decided 2026-09-07. Budget is ~281px inside the card: a
truncated name column plus 5-6 short numeric columns. One team at a time via a tab switcher.
Reader is watching several games at once and is answering "who is carrying this game", not
doing analysis.

**Why:** completeness is the wrong target at this width. A section that is almost always boring
trains the reader to scroll past the whole block, so a category earns its heading or it is cut.

**How to apply:** these are the shipped column sets. Change them only with a reason stated in
fan-usefulness terms, and keep the ordering — fans read box scores in a habitual order and a
reshuffle reads as a bug.

## Row-ordering rule (applies to all sports)
Structural order where ESPN gives one, production order where it does not.
- baseball batting: `batOrder` ascending, substitutes after the starter in their slot (array order
  inside a slot is chronological). Never sort by performance.
- baseball pitching: raw array order — it is already order of appearance.
- basketball: starters (array order) → bench (array order) → `didNotPlay` last, shown as DNP text
  rather than zeros.
- football: raw array order; ESPN already sorts each category by its primary stat.
- hockey: sort descending by G+A, then G, then TOI. Array order carries no information a fan can
  use (line combinations are not exposed, jersey number is noise).

## Baseball / softball (same shape, key off sport not league)
`batting` then `pitching`, always in that order.
- batting: `hits-atBats, runs, RBIs, homeRuns, walks, strikeouts` (H-AB R RBI HR BB K).
  `hits-atBats` collapses two columns into one and matches how a fan says it ("2-for-4").
  AVG/OBP/SLG are season context, cut. `#P` (pitches seen by a batter) cut.
- pitching: `fullInnings.partInnings, hits, runs, earnedRuns, walks, strikeouts` (IP H R ER BB K)
  — the canonical agate line. `pitches-strikes` (PC-ST) is the highest-value 7th if a slot frees;
  ERA is the one to drop first.
- Default the tab to the batting team (away in the top half).

## Basketball (NBA/WNBA)
Single unnamed category. `minutes, points, rebounds, assists, fieldGoalsMade-fieldGoalsAttempted,
threePointFieldGoalsMade-threePointFieldGoalsAttempted` (MIN PTS REB AST FG 3PT).
This is the *condensed* convention (PTS-REB-AST, as in every game-leaders widget), not a truncated
full box — truncating the full box order gives MIN FG 3PT FT REB AST and no PTS, which is plainly
wrong. `plusMinus` cut: noisy over a partial game and unreadable to a casual fan. Composite columns
sit at the right edge because their strings are widest.
Render the `totals` row as a footer — conventional here.

## Football (NFL + college)
Render `passing`, `rushing`, `receiving`, `defensive`. Conditionally render `interceptions` when a
row exists. Cut `fumbles`, `kickReturns`, `puntReturns`, `kicking`, `punting`.
- passing: C/ATT, YDS, AVG, TD, INT, SACKS(taken). QBR and RTG cut as proprietary composites,
  consistent with the leaders block already dropping ESPN's composites.
- rushing: CAR, YDS, AVG, TD, LONG (all five).
- receiving: REC, YDS, AVG, TD, LONG, TGTS (all six).
- defensive: TOT, SOLO, SACKS, TFL, PD, TD. `QB HTS` cut (near-duplicative of sacks, least-known).
  TOT/SOLO stay paired despite correlating — the pair is how tackles are quoted.
- interceptions: INT, YDS, TD.
- Row caps needed at this width: passing 3, rushing 5, receiving 6, defensive 6-8 with an expander.
  A college defensive table is 30+ rows a side.
- Kicking was considered and cut deliberately: a kicker's contribution is already fully legible on
  the scoreboard, and the section is one boring row in nearly every game.
- Default the tab to the team with possession.

## Hockey (NHL)
Keep `forwards` and `defenses` **split**, in order forwards → defenses → goalies. The decisive
argument is that merging needs a POS column, which costs one of five numeric slots — worse than a
section heading. The position group is also the baseline that makes +/- and TOI legible.
`skaters` is usually empty; when populated it *replaces* forwards+defenses rather than adding to
them — guard against rendering a player twice.
- skaters (both groups, same columns): G, A, +/-, S, PIM, TOI. If cut to five, cut **TOI, not PIM**
  — a penalty is an event that changes the game state, TOI is coach analysis.
- goalies: GA, SA, SV, SV%, TOI (matches ESPN's own payload order and Hockey-Reference).
  Render only goalies with TOI > 0, or a backup shows a fake .000 SV%.
- Shootout columns (SOS/SOSA/SOG) are non-zero only in a shootout game — conditional set if ever
  wanted.

## Soccer
No per-player box score exists, so the tabbed one-team-at-a-time shell **cannot be shared with
soccer**. Soccer needs a two-column head-to-head team-stat table.
Ordered rows (the Opta/Sky/BBC match-stats order): Possession, SHOTS, ON GOAL, Corner Kicks, Saves,
Offsides, Fouls, Yellow Cards, Red Cards. Penalty Goals / Penalty Kicks Taken conditionally when
non-zero. `On Target %` cut — derived, and reads 100% off one shot.

See [[boxscore_espn_stat_key_traps]] for the value-format and mislabel hazards.
