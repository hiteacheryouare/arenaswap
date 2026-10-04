---
name: powerscore3-labelling-calls
description: Judgement calls made while hand-labelling recorded slates for the PowerScore 3 replay (slates 2026-10-03-a, -b, -c, 2026-10-04-d); reuse so later slates are labelled consistently
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

Calls added from slate c (2026-10-03, 10 PM to midnight):
- A tied game at 0:00 of the last regulation period with no `break` flag is the pre-OT gap: it goes in `acceptable`, and the best live game (a level 2 fill if nothing is at 3) is the flip.
- A one-goal hockey game in its final minute counts as a last-chance (empty-net) state for tiebreak 2, even when the feed shows no empty net.
- Margin units are fractional (margin / t1): down 3 beats down 4 in football even when the down-4 team is closer and has less time.
- A dead-ball try in one game loses to a live last-chance state elsewhere when margin units tie.
- A kickoff after a go-ahead score is level 2 until the trailing team has the ball (rule 5 carries the level across the kick).
- An onside-kick setup (trailing team kicking, down 7 to 8) is a 3 only as `acceptable`, below closer games on margin.
- A frozen clock while downs keep advancing: treat the drive as live and the clock as an upper bound.
- An NHL overtime goal is final: level 0 at the next snapshot.
- The leader with the ball inside 2:00 is a 2, not a 3, even if the trailing team has timeouts.
- A stuck down-and-distance after a score in overtime keeps level 3; any overtime stays 3.

Calls added from slate b (2026-10-03, 8 to 10 PM; 114 moments, 87 at 3, 27 at 2), following slate c's calls above:
- A trailing team's 2-point try to tie late (`-1&0 ... RZ`, down 2) is level 3 at first sight; the state is visible, so rule 5's dead-ball carry is not needed. It counts as last-chance for tiebreak 2.
- An onside setup down 2 stays 3 for as long as the kickoff placeholder sits there (slate c's onside call), not just one snapshot.
- A kickoff after a score that only extends a lead (up 1 to up 8) is level 2, the same as after a go-ahead score.
- At level 2, a postseason no-hit bid beats ordinary close games; once the no-hitter is gone, tied games win on margin units.
- Two live overtimes where one clock has sat frozen for 4+ snapshots: flip to the moving one and put the frozen one in `acceptable`.
- A down-4 kickoff wait at about 2:00 (the trailing team about to receive) beats a tied mid-Q4 kickoff at level 2, even though margin units favour the tied game. Its two-minute drive is about to start.
- A stalled last drive (no situation shown, clock frozen) keeps 3 and still wins tiebreak 2 over tied hockey, because a tied game has no empty net.

Calls added from slate d (2026-10-04, midnight to 3 AM ET; 161 moments, 38 at 3, 103 at 2, 20 at 1; the out-of-sample check for review 1):
- Level 1/2 floor. Football: a 2 needs Q4 (one-score short of the level 3 triggers, or down 9 to 16 with the ball or a kickoff coming under 4:00); anything in Q3 is a 1. Hockey: within one anywhere in the 3rd is a 2, and so is down 2 under 3:00; down 2 above 3:00 is a 1.
- Level 2 and level 1 ties use the same ladder as level 3, margin units first. A one-goal third at 15:00 beats a down-2 goalie-pull window and a down-7 Q4 drive (2 units vs 2.33).
- The 4+ frozen snapshots rule (flip to the moving game, frozen one in `acceptable`) applies at level 2 too.
- If every game in a snapshot stops updating (stale feed), the leader keeps its visible level.
- A leader's 4th down in field-goal range in a one-score Q4 game is a decision (3). A leader's punt stays 2.
- A leader pinned at its own 1 under 4:00 is a 2, not red zone. A safety with the free kick pending is a 2 until the trailing team has the ball.
- After a kickoff or 4th down resolves and the possessor goes missing: carry 3 for one snapshot (rule 5), then 2 until a possessor shows. If the clock stays frozen on the trailing team's last drive, it keeps 3 (the slate c stalled-drive call).
- Q4 clock at 0:00 with a down still shown and no final: stays 3 (review or an untimed down). The 0:01 that follows stays 3.
- A clock that jumps backward (Q3 0:00 then 4:12) is garbled: keep the previous level.

Known label error (review 1): slate b 9:37:59 should flip to UIW@SFA (401868309, down 2 at 0:22,
onside pending, frozen), not tied CAR@PHI. It broke the two calls above; recommended relabel, not yet done.

**Why:** the replay scores the engine against these labels; inconsistent calls across slates
would read as engine regressions.

**How to apply:** label new slates with the same calls, or update this note and relabel old slates
if a call changes. Related: [[powerscore3-spec-decisions]].
