# ArenaSwap — code-reviewer memory

- [CI and enforcement](project_ci_and_enforcement.md) — nothing gates PRs; oxlint has no react-hooks plugin, so hook bugs are always worth reporting
- [Platform floor gap](project_platform_floor.md) — manifest says Firefox 109 / no Chrome min, but the popup needs FF 115 / Chrome 110. Recurring, still unfixed
- [Repo failure map](project_review_failure_map.md) — Firefox-only DnD, the walkthrough overlay that blocks its own nav, the empty-merge gate, defaultStrings
- [Popup failure map](review_popup_failure_map.md) — fixed 320x560 geometry, JS/SCSS animation-duration coupling, which element scrolls
- [Extension runtime footguns](project_extension_runtime_footguns.md) — MV3 worker teardown, unbounded session history, the muted-tab ledger
- [i18n review contract](review_i18n_contract.md) — how to verify keys against locales/en.json and where the key check is blind
- [Known false positives](project_review_false_positives.md) — i18n substitution, lowercase JSX helpers, packages/ui "duplication", the stale gc2TeamLogo finding
- [PowerScore reason strings](project_powerscore_reason_strings.md) — English-only by design inside the npm package; not an i18n miss
- [Review targets and commands](reference_review_targets.md) — verification commands, reading refs without touching the shared checkout
