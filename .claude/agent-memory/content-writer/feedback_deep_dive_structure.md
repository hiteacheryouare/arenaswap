---
name: feedback_deep_dive_structure
description: Engineering-deep-dive blog sections must be organized by cross-cutting theme, never by walking the changelog in order
metadata:
  type: feedback
---

For the engineering half of a release blog post, read the whole changelog range first, close it, and decide what the *story* is before writing a single section. Do not let sections map one-to-one onto changelog entries in roughly changelog order, and do not let individual sentences track the changelog's own sentences — that reads as a paraphrase, not a piece of writing.

**Why:** Ryan rejected the first draft of the [[project_v2_launch_post]] specifically because "it reads like you just paraphrased the changelog." The tell was structural: one section per changelog entry, in changelog order, with sentences that lifted the changelog's own distinctive constructions (e.g. "a PowerScore of 10 for a court with nobody on it").

**How to apply:** A theme is a claim about the work that the changelog itself never states, e.g. "most of these bugs were the product disagreeing with itself" or "the scoring rules were written for American sports and had to survive contact with the rest of the world." Pull evidence for one theme from changelog entries that are weeks apart. Give proportion real weight: some changelog entries deserve three paragraphs, some deserve one sentence, some deserve to be cut entirely and named as cut in the report. Never reuse the changelog's own rhetorical constructions (its confessional register, its specific jokes) — facts and numbers transfer across into new prose, phrasing does not.
