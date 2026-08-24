---
name: feedback_technical_writing_revision_pass
description: Ryan wants a dedicated /technical-writing + unslop revision pass on docs, run as a second pass after drafting, not assumed to be baked in during the first draft
metadata:
  type: feedback
---

Ryan asked, via a coordinator message, for the `technical-writing` skill to be run explicitly over eight already-written, already-shipped-quality docs files and for the eight-item review checklist to be walked file by file. This was not a request to fix bugs; the files were already accurate and in voice. It was a request for a second, separate pass applying the skill's specific mechanical checks (Diátaxis purity, STE sentence-length limits, condition-before-instruction, Global English pronoun clarity, colon/semicolon discipline) that a normal drafting pass tends to satisfy loosely but not rigorously.

**Why:** left to normal drafting judgment, sentences that carry three or four related facts read as reasonably good prose and don't get flagged. Only a deliberate word-count-per-sentence and pronoun-by-pronoun sweep catches the 30+ word run-ons and the `it`/`this`/`which` pointing at the wrong antecedent (see [[project_extension_help_docs]] for the specific catches, including a real accuracy bug the splitting exposed).

**How to apply:** when a task specifically invokes a writing-standard skill by name for a revision pass, don't treat it as already covered by "I wrote it well the first time." Actually count words per sentence (script it, don't eyeball it) and check every pronoun's antecedent explicitly. Note that `technical-writing` has `disable-model-invocation: true` in its frontmatter — the `Skill` tool call will be refused even when a coordinator or user explicitly asks for it; the correct move is to `cat` the `SKILL.md` file and apply its content directly, not to skip the request.

**Also:** any task in this docs collection that touches `faq:` frontmatter blocks should end with `cd apps/docs && npx astro sync` as literal proof the collection still parses, not just a local YAML sanity check. An unquoted plain scalar containing `: ` breaks it silently until that command actually runs.
