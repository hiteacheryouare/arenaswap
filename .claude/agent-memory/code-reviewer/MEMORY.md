# ArenaSwap — code-reviewer memory

- [CI and enforcement](project_ci_and_enforcement.md) — nothing gates PRs; oxlint has no react-hooks plugin, so hook bugs are always worth reporting
- [Platform floor](project_platform_floor.md) — RESOLVED in PR #18 (Chrome 110 / FF 115 declared). Still check new ES built-ins + the storage.session 1MB quota below Chrome 112
- [Repo failure map](project_review_failure_map.md) — Firefox-only DnD, the walkthrough overlay that blocks its own nav, the empty-merge gate, defaultStrings
- [Popup failure map](review_popup_failure_map.md) — fixed 320x560 geometry, JS/SCSS animation-duration coupling, which element scrolls
- [Extension runtime footguns](project_extension_runtime_footguns.md) — MV3 worker teardown, unbounded session history, the muted-tab ledger
- [i18n review contract](review_i18n_contract.md) — how to verify keys against locales/en.json and where the key check is blind
- [Known false positives](project_review_false_positives.md) — i18n substitution, lowercase JSX helpers, packages/ui "duplication", the stale gc2TeamLogo finding
- [PowerScore reason strings](project_powerscore_reason_strings.md) — English-only by design inside the npm package; not an i18n miss
- [PowerScore failure map](review_powerscore_failure_map.md) — unknown-clock→0:00, NaN eating the stall penalty, soccer "overtime", README drift, untypechecked tests
- [Review targets and commands](reference_review_targets.md) — verification commands, reading refs without touching the shared checkout
- [Docs site + design system map](review_docs_site_map.md) — token shadowing, "compute don't hardcode" for PowerScore numbers, hand-maintained font dirs, where dead code collects
