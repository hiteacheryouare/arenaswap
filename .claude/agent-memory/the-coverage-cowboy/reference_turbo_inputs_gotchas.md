---
name: reference-turbo-inputs-gotchas
description: Turbo 2.11 facts verified here - explicit input globs ignore .gitignore, script-less tasks still hash, and how to prove cache isolation cheaply
metadata:
  type: reference
---

- Explicit `inputs` globs (`$TURBO_ROOT$/apps/**/*.ts`) do NOT honor .gitignore: they hashed node_modules, dist, .output, .wxt, .astro. Negate them explicitly (see packages/ui/turbo.json). `$TURBO_DEFAULT$` does honor it.
- A package with no `build` script still gets a `<NONEXISTENT>` build task whose hash covers its files, and dependents' `^build` hash includes it. So packages/ui edits reach extension tests.
- Package turbo.json files can define brand-new tasks, not just override root ones.
- Proving isolation without running anything: `turbo run <tasks> --dry=json` before and after appending one byte to a file, then diff task hashes. Cache status is useless in the shared checkout because other sessions keep committing.
- A failing `astro build` empties the tracked `docs/` folder first. Restoring only deleted paths (`git ls-files --deleted -- docs` into `git checkout HEAD --pathspec-from-file`) is create-only and was allowed; `git checkout -- docs/` plus rm was blocked as destructive.

Related: [[project-turbo-test-groups]], [[project_docs_coverage_harness]].
