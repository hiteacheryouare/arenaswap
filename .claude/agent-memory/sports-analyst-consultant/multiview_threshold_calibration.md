---
name: multiview-threshold-calibration
description: Multiview "Exciting at" default re-sized 2026-11-04 (65 -> 55 recommended), solo grace 120 s, commercial-break box loss, per-threshold open/flap/re-entry numbers
metadata:
  type: project
---

2026-11-04 replay of Oct 3–11 recordings (77,372 polls, 422 games, 115.7 polled h), 6,000 sampled
registered sets (3/4/5 games, 2+ leagues), classic mode, shipped rules (Sensitivity 4 margin 11,
45 s cooldown). Script: `temporary/multiviewThreshold/{dumpScores,analyze}.ts` (+ output.txt).

**Recommended default 55** (the slider steps by 5, so 58 was off the table). It is the first
5-step that holds every sport's must-see state: football two-minute drill down 4–8 reaches 55
92% of the time (60: 65%, 65: 44%); football last 5 min one score 84% (65: 62%); hockey last 5 min
within one 96% (65: 79%). Opens 2.28 per 3 co-live hours vs 1.36 at 65.

**Threshold does not change flapping.** <60 s episodes are 25–30% at every threshold 50–65. Closes
come from: a game going final ~25%, intermission ~12%, a detected commercial break ~30–37%, score
drop ~30%. The break penalty (15) is bigger than the Sensitivity 4 margin (11), so a boxed game
within 4 of the line loses its box at every commercial.

**Solo grace: 120 s**, skip it when the game that left went final (re-entry after a final is
2–7% within 2 min). At 55: <2 min flaps 40% -> 10%, median 166 s -> 316 s. 120 s is where the
<2 min flap rate bottoms out; longer only adds solo time. Re-entry curve has no knee (at 55: 7/13/21/28/35%
within 30 s/1/2/3/5 min, 41% never within 30 min). Keeping boxed games through a commercial
(adHold) at 55 + 120 s: <2 min 6%, median 440 s.

Soccer runs hot at every threshold (14–26% of live time over 55–65, all late-second-half);
football and college hockey run cold. MLB data is postseason only, NBA preseason only, WNBA Finals tiny.

**Why:** Ryan hand-tested 65 and found Multiview rarely opened, and saw open/close before streams loaded.
**How to apply:** reuse these numbers before re-deriving; if the break penalty or margin changes,
rerun analyze.ts. Related: [[powerscore-calibration]], [[commercial-break-signals]], [[powerscore3-spec-decisions]].

**RedZone follow-up (2026-11-05):** nobody publishes how much of RedZone's airtime is multi-box
(searched Grantland 2012, Wikipedia, SI/MMQB 2016, FOS, Awful Announcing, SBJ via Floodlight). The only
published counts are of *ad* double boxes (4 x 15 s in the 2025 opener, 9 on 2025-11-30, 16 ads in Week 13),
which are not game multi-box time. The octobox opens each broadcast. So the RedZone match can't be computed;
if Ryan times one broadcast, use the lookup in `temporary/multiviewThreshold/outputBuilt.txt` (Oct 11 slate,
11 games, the only full Sunday recorded; Oct 4's 1 pm window is missing).
As-built rules (45 s min stay, 120 s solo, commercial hold, overtaken) at 55 on mixed sets: multi-box 9.9% of
co-live time, 1.56 opens/3h, median 513 s, <2 min 6%, solo 11% of open time. Oct 11 NFL slate at 55: 9.0% multi-box.
Mixed sets make about 3x the multi-box openings per game pair-hour of the NFL slate (0.195 vs 0.064 at 55),
because soccer runs hot and football runs cold, so matching per pair doesn't carry across sports. 55 still stands.
