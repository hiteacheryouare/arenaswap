---
name: feedback-coverage-setup
description: Ryan wants coverage reported, never gated — no coverageThreshold — and wants source bugs proven with a failing test rather than fixed by the test author
metadata:
  type: feedback
---

When wiring coverage into an ArenaSwap workspace: emit `['json-summary', 'lcov', 'text']` and add **no** `coverageThreshold`.

**Why:** Ryan aggregates `coverage/coverage-summary.json` from all five workspaces into one visual report himself. He explicitly does not want a build-failing percentage gate — the number is context, not a merge condition. A threshold would also make an honest "this code is a thin pass-through, leave it uncovered" judgment impossible.

**How to apply:** `coverage-summary.json` must exist after the run, so `json-summary` is mandatory, not optional. Exclude type-only and barrel modules from `collectCoverageFrom` — they report a percentage that says nothing. Where a workspace uses multiple Jest `projects`, one `jest --coverage` run merges them; two `--selectProjects` runs overwrite each other. Verify the merge by comparing per-line execution counts (merged should be the *sum* of the projects, not either one alone).

---

When a test I write fails because the source is wrong: **leave it red and report it**. Do not fix the source.

**Why:** Ryan fixes source bugs himself; the verifier's job is to prove them. Softening the test to get green would be faking the result, and a verifier that patches the code it was sent to check stops being a check.

**How to apply:** This repo has no expected-failure convention (no `test.failing` / `.skip` anywhere in `packages/*/tests`), so a proven bug stays genuinely red and gets called out in bold at the top of the report — including the warning that it will break his "everything command". Name the exact file, the wrong expression, and what it should be.

Related: [[feedback-core-territory-rules]]
