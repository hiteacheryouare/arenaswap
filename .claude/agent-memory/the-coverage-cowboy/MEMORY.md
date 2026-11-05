# The Coverage Cowboy — Memory Index

- [Audit 2026-10-24](project_audit_20261024.md) — what the "fix everything" pass closed, red tests left on purpose, what is still open; start here
- [UI safety net kit](project_ui_safety_net.md) — cypress/support/safetyNet: assertContained + real worst cases + every locale; why each rule is shaped so
- [Turbo test groups](project_turbo_test_groups.md) — 49c2573c7: suites split into cached tasks, spec feature folders, test:specGroups guard; open calls
- [Turbo inputs gotchas](reference_turbo_inputs_gotchas.md) — explicit globs ignore .gitignore; proving isolation via --dry=json hash diffs
- [Cooldown restart bug](project_cooldown_restart_bug.md) — FIXED by 2026-10-12; a red test there is now a real regression
- [Extension coverage wiring](reference_extension_coverage_wiring.md) — shared Cypress cwd needs an env-driven nyc target; vite-plugin-istanbul is ESM-only
- [Ask before source edits](feedback_source_edits_ask_first.md) — every production-file change, even an export seam, needs Ryan's OK first
- [Coverage: report, never gate](feedback_coverage_setup.md) — no coverageThreshold; prove source bugs with a failing test, never fix them yourself
- [packages/core silent failures](project_core_verification_risks.md) — ESPN schema drift is indistinguishable from an off-season
- [apps/docs build hazard](project_docs_coverage_harness.md) — docs/ is tracked build output; the --outDir, ARENASWAP_SITE_DIR and ARENASWAP_SITE_COVERAGE escape hatches
- [apps/docs: the right metric](project_docs_site_metrics.md) — line coverage is a weak signal on a static site; what to measure instead
- [core package.json inlined into the site](project_core_package_json_inlined.md) — why grepping the docs bundle for "zod" gives a false positive
- [PowerScore 3 open questions](project_powerscore3_open_questions.md) — its red tests were all green by 2026-10-12; the unbuilt design questions may still stand
- [Recordings + ESPN extras facts](reference_recordings_and_espn_extras.md) — reading torn .jsonl.gz recordings; stoppage clock cap, standings fields per league
- [Guide sweep](project_guide_sweep.md) — 2026-11-04: 7 reds in bar/axis geometry, all fixed the same night; realistic-bar fixture and click traps
