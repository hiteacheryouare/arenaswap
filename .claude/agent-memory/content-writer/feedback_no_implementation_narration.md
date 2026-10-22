---
name: feedback-no-implementation-narration
description: Ryan's 2026-10-21 narration purge rulings for copy: what was cut, what was deliberately kept, and the polling-speed decision
metadata:
  type: feedback
---

AGENTS.md now has a "Copy Mistakes to Avoid" section: no copy about how ArenaSwap works inside, why a design was chosen, or reassurance/filler ("Handy for...", "Nothing changes until you say so"). Test: if the line were deleted, would the user lose anything they need to choose or act?

**Why:** Ryan audited all surfaces (temporary/narrationAudit.md) and applied only the "Clear" items on guides and site strings; borderline items were left on purpose.

**How to apply:** Don't re-flag the borderline items as bugs. Polling speed: marketing and site hero KEEP "as often as every 12 seconds" (real floor is pollMinEagerMs = 12_000, the old 6s was wrong); the README drops the claim. Don't name ESPN in prose, say "our sources" with a binoculars wink. Localized marketing files under apps/extension/marketing/<locale>/ still say 6 seconds and need the translator handoff.
