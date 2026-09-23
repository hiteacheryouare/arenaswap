---
name: ludicrous-speed-proposal
description: PR #123 blends the Ludicrous Speed easter egg into one cut sequence; Ryan liked all three variants and chose to blend, still awaiting sign-off before merge
metadata:
  type: project
---

PR [#123](https://github.com/hiteacheryouare/arenaswap/pull/123) on branch `ludicrous-speed-movie-accurate` (base `dev`). It is **not a merge candidate yet**.

**History:** first pass offered three switchable variants (bridge / exterior / fullscreen warp). Ryan tested all three on 2026-09-10, liked all of them, and asked for them to be **blended into one sequence that cuts between the three cameras** — cockpit for the opening, rear for the takeoff, fullscreen for the speed steps and the whole plaid, cockpit again for the panic, rear for the slowdown. The variant cycler is gone; the camera is now a property of each script beat.

**Why:** Ryan judges this by running it in the real popup, not a preview page, so anything that needs testing must be reachable from the popup itself. He catches few-pixel drift — verify UI by rendering and measuring, never by eye.

**How to apply:** Remaining work before merge is a CHANGELOG entry, deleting the transport keys (`→` / `n` / `f`) and the `.proposal/` folder, and settling the one English-only string `WE BRAKE FOR NOBODY` across the 12 locales or deciding it stays untranslated like the ESPN round names.

Two findings worth keeping because they cost real time:
- The reported "text is not aligned" bug was **a CSS animation writing `transform`**, not a placement problem. Every text layer centres with `transform: translateX(-50%)`, and `lsTextIn`/`lsSignIn`/`lsSpeedPulse`/`lsShake` animated the same property, discarding the centring for the length of the run. Fixed by moving them to the independent `translate`/`scale`/`rotate` properties. Suspect this whenever animated, centred text drifts.
- Piping a long validation command into `tail` **masks its exit code** — a lint failure read as success. Redirect to a file and echo `$?` instead.

The film research is expensive to re-acquire and lives in the PR body and source comments: the effect is **slit-scan** (Cinefex #31, Aug 1987, p.15), the plaid is **not** Royal Stewart, there is **no ship-stretch shot** in the film, and the entry transition fades nothing. Read those before re-researching.

Related: [[no-worktrees]] — this stayed on a branch in the shared checkout, per Ryan's standing rule.
