# Sports Analyst Consultant — Memory Index

- [powerscore_calibration.md](powerscore_calibration.md) — PowerScore v2 calibration decisions: margins, ceilings, win-prob scales, stress-test outputs
- [powerscore_winprob_scales.md](powerscore_winprob_scales.md) — Win probability scale factor audit: what each sport's scale produces vs historical reality
- [powerscore_soccer_clock.md](powerscore_soccer_clock.md) — Soccer clock math: clockIsFullGameElapsed=true, how 85th-minute is encoded as clockSeconds=5100
- [powerscore_stall_penalty.md](powerscore_stall_penalty.md) — Stall penalty design: flat deduction, intermission vs stall distinction, sport-specific implications
- [racing_feasibility.md](racing_feasibility.md) — Motorsport (F1/NASCAR/IndyCar) audit: ESPN API data verified thin/unconfirmed-live, cadence mismatch, verdict not worth auto-switch integration yet
- [localization_language_gaps.md](localization_language_gaps.md) — Locale gap ranking (it > ko > ar > zh_TW split > fil) tied to the 31-league lineup, negative cases, per-language terminology hazards
- [project_zh_tw_terminology.md](project_zh_tw_terminology.md) — Verified Taiwan CPBL/NFL/hockey terminology vs mainland zh_CN: B-S-O order correction, 美式足球, first-pitch phrasing
- [football_field_position_model.md](football_field_position_model.md) — ESPN yardLine is a home-anchored 0-100 absolute coordinate; direction, first-down line, goal-to-go math
- [football_espn_dead_ball_states.md](football_espn_dead_ball_states.md) — Every ESPN gridiron state where down/distance/yardLine lie, and the gate a field diagram must apply
- [football_field_markings_geometry.md](football_field_markings_geometry.md) — Rulebook-verified NFL/NCAA field marking dimensions, the 120x30 compression factor, and what survives at 289x75px
