# ArenaSwap — code-reviewer memory

- [CI and enforcement](project_ci_and_enforcement.md) — ci.yml runs lint/typecheck/test/e2e/zip on workspaces only; scripts/ is never checked; no react-hooks lint
- [Platform floor](project_platform_floor.md) — RESOLVED in PR #18 (Chrome 110 / FF 115 declared). Still check new ES built-ins + the storage.session 1MB quota below Chrome 112
- [Repo failure map](project_review_failure_map.md) — Firefox-only DnD, the walkthrough overlay that blocks its own nav, the empty-merge gate, defaultStrings, team-colour card seams (hero grid inherit, direct team.color readers, walkthrough card copies)
- [Popup failure map](review_popup_failure_map.md) — 320x560 geometry, JS/SCSS duration coupling, scroll container, tab strip active-state trap, viewer-tz day math
- [Extension runtime footguns](project_extension_runtime_footguns.md) — MV3 worker teardown, unbounded session history, the muted-tab ledger
- [i18n review contract](review_i18n_contract.md) — how to verify keys against locales/en.json and where the key check is blind
- [Known false positives](project_review_false_positives.md) — i18n substitution, lowercase JSX helpers, packages/ui "duplication", the stale gc2TeamLogo finding
- [PowerScore reason strings](project_powerscore_reason_strings.md) — English-only by design inside the npm package; not an i18n miss
- [PowerScore failure map](review_powerscore_failure_map.md) — v3 seams: core adapter, mode blends (Fantasy/Blowouts math), in-memory liveExtras, reason-key locale parity
- [Review targets and commands](reference_review_targets.md) — verification commands, reading refs without touching the shared checkout
- [Docs site + design system map](review_docs_site_map.md) — token shadowing, "compute don't hardcode" for PowerScore numbers, hand-maintained font dirs, where dead code collects
- [History window footgun](review_history_window_footgun.md) — score/PowerScore history is a 5–20 min rolling window; any "whole game" history assumption is dead on arrival
- [Background slate lifecycle](review_background_slate_lifecycle.md) — refreshSlate runs on every worker start and now costs a request per Eastern day per league; 2 empty polls walk a league quiet
- [Popup open reveal](review_popup_open_reveal.md) — measured DM Sans tricode widths, the harness/production nesting mismatch, the 3400ms JS↔SCSS duplication
- [PowerScore replay harness](review_powerscore_replay_harness.md) — hit@1 tie-break luck, dist+src engine mix, non-self-contained hourly files, recorder dies with the session
- [Cypress test strength](review_cypress_test_strength.md) — StrictMode wrappers do not double-run effects here; growing alias counts; CI skips Cypress when jest fails; mutation recipe
- [Film stage map](review_film_stage_map.md) — ad-film renders: one page per cut+format, card close vs next-shot seam, zoom scales Desk transforms
