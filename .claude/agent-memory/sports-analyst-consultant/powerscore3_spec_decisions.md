---
name: powerscore3-spec-decisions
description: PowerScore 3 analyst spec (2026-10-03) key numbers: boost buckets and caps, go-ahead/two-minute/no-hitter/red card/upset/stakes/hockey values, Blowouts classicFloor 0.3, Fantasy blend 0.6
metadata:
  type: project
---

Full spec written to `temporary/powerscore3/analystSpec.md` (gitignored, may be deleted). The
decisions that matter if that file is gone:

- **Buckets:** moment boosts (runners, go-ahead, red zone, two-minute, empty net, power play, red
  card) summed and capped at **20**; no-hitter its own bucket, max **70**; upset + stakes capped at
  **16**; postseason and favorite unchanged and outside caps; total still min(100) + manual boost.
- **Stakes never overlap postseason:** series state only in the postseason and only for
  best-of-3+; rank and standings races only in the regular season. Single-elim games get stakes 0
  because the postseason ladder already pays them.
- **Go-ahead run (#161):** 8 go-ahead on base / 5 tying on base, x0.5 before regulationStartInning,
  ramp 0.75 to 1.0 to the final inning, x1.25 last-chance half. Max 10; bases-loaded down 2 bottom 9
  = 20 with runners.
- **Two-minute drill (#166):** `12 * T * F * C * M`; leader in possession pays 0; NCAAF OT pays 0
  (no clock); UFL one-score margin is 9.
- **No-hitter (#159):** ladder 10/22/38/52 from "through 5" (through 3 softball), +5 per out in the
  final stage, x0.7 while the no-hit team bats, x0.6 softball. Applies when the no-hit team is losing.
- **Red card (#162):** 10/10/7/5/0 by margin and carded side, flat 2 game minutes then linear to 0 at
  10. Siege rule decided: +4 closeness only while the shorthanded team leads by exactly one.
- **Upset (#157):** max 12; moneyline de-vig first, spread via normal sigma (NFL 13.5, NCAAF 16,
  NBA 12, NCAAB 11), 1.5 puck/run line alone pays nothing.
- **Hockey (#163):** empty net 12/7 (3rd, <= 4:00, two consecutive polls); side-free PP in the 3rd
  within one adjusted from 8 to 7; tied 3rd/OT PP 10.
- **Blowouts (#86):** margin 50 / sustained 30 / timing 25 / pile-on 15, capped 100;
  **classicFloor 0.3**. Keeps no-hitter and an ungated upset; drops stakes, postseason, moments.
- **Fantasy (#85):** situation 50 / production 35 / exposure 15; default blend **w = 0.6**; FG range
  NFL yte <= 37, NCAAF yte <= 30.

**Review 1 (2026-10-04, `temporary/powerscore3/calibrationReview1.md`), recommended, not yet applied:**
drill clock control `0.85 + 0.05*TO` (was 0.7+0.1); go-ahead inning factor `earlyFactor + (1-earlyFactor)*ramp`
(6th..9th = 0.5..1.0, was 0.75..1.0); baseball/softball upset range `[0.38, 0.25]` (was 0.42/0.28).
Together: hit@1 0.647 → 0.662, 0 regressions, in-sample. Held back: own-20 field factor 0.7, 0:00
decided-game gate, `inningEnded` → bottom-of-N with 3 outs (core/src/scoring.ts). ESPN `TO a-b` in the
replay timeline is away-home.

**Why:** Ryan is building PowerScore 3 against recorded slates (`scripts/powerscore/recordSlate.ts`)
and wants every number pinned so the replay can test it.

**How to apply:** treat these as the starting calibration; when replay results come back, update
this file rather than re-deriving. Related: [[powerscore-calibration]], [[live-moment-signals-audit]],
[[football-field-position-model]], [[postseason-boost-side-trophies]].
