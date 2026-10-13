# The Coverage Cowboy — Memory Index

- [Cooldown restart bug](project_cooldown_restart_bug.md) — FIXED by 2026-10-12; a red test there is now a real regression
- [Extension coverage wiring](reference_extension_coverage_wiring.md) — shared Cypress cwd needs an env-driven nyc target; vite-plugin-istanbul is ESM-only
- [Coverage: report, never gate](feedback_coverage_setup.md) — no coverageThreshold; prove source bugs with a failing test, never fix them yourself
- [packages/core silent failures](project_core_verification_risks.md) — ESPN schema drift is indistinguishable from an off-season
- [apps/docs build hazard](project_docs_coverage_harness.md) — docs/ is tracked build output; the --outDir, ARENASWAP_SITE_DIR and ARENASWAP_SITE_COVERAGE escape hatches
- [apps/docs: the right metric](project_docs_site_metrics.md) — line coverage is a weak signal on a static site; what to measure instead
- [LivePowerScores soccer bug](project_livepowerscores_duplicated_helpers.md) — period+parse fixed; soccer clock format still divergent (95:00 vs 95') with a red spec standing on it
- [gameClock decimal discontinuity](project_gameclock_decimal_discontinuity.md) — "1.0" reads 1s, "0.9" reads 54s; its red test was gone/green by 2026-10-12, re-verify
- [core package.json inlined into the site](project_core_package_json_inlined.md) — why grepping the docs bundle for "zod" gives a false positive
- [PowerScore 3 open questions](project_powerscore3_open_questions.md) — had 6 red tests; all suites green at the 2026-10-12 baseline, so re-verify which landed
- [Recordings + ESPN extras facts](reference_recordings_and_espn_extras.md) — reading torn .jsonl.gz recordings; stoppage clock cap, standings fields per league
- [QA sweep 2026-10-12 bugs](project_qa_sweep_20261012_bugs.md) — standby/cooldown pair + hockey SOG pinned as current behaviour in *.qa.test.ts
