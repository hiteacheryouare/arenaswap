---
name: source-edits-ask-first
description: Ask Ryan before touching any production file, even a small testability seam like an export
metadata:
  type: feedback
---

Ask Ryan before every production-code edit, including small test seams (exporting a helper, adding an injection point). Test files, fixtures and test helpers need no permission.

**Why:** Ryan chose "Ask me each time" over "seams only, flag them" on 2026-11-04.

**How to apply:** When a test needs a seam, stop and ask with AskUserQuestion. Say which file, the exact change, and why the test can't be written without it. If he says no, test through the public surface instead.

Related: [[feedback-coverage-setup]]
