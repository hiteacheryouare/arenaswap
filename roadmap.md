# ArenaSwap roadmap (working draft)

This is a **living draft** based on [issue #13](https://github.com/hiteacheryouare/arenaswap/issues/13). The goal is to keep shipping while setting up a clear path from 1.x polish to a meaningful 2.x leap.

## Guiding principles

- Keep 1.x focused on usability and trust (quality, clarity, consistency).
- Make 2.0 a true product step-change (smarter switching + stronger user control).
- Ship in small, visible milestones so contributors can jump in easily.

## Proposed roadmap

## 1.2 (in progress)

- Baseball UI improvements.
- Notification wording improvements.
- Publish `@arenaswap/powerscore` to npm and finish package hardening/docs.

## 1.3 (quality + onboarding)

- First-run experience for league selection and favorites.
- Better empty/loading/error states across popup and settings.
- Safer defaults for tab switching (clear opt-in language and controls).

## 1.4 (control + confidence)

- User controls for switching sensitivity (chill/normal/chaos style presets).
- Performance/reliability pass for background polling and state sync.

## 1.5 (sports depth)

- Better handling of stale or missing scoreboard data.
- League-by-league tuning docs for contributors.

## 2.0 (major release)

- PowerScore v2 with richer excitement signals and clearer weighting model.
- “Why this game?” explainer in UI (human-readable reason chain).
- UX refresh across popup/settings with tighter information hierarchy.
- Personalized bias blending (favorites, close-game preference, upset preference).
- Stronger sport-specific signals and late-game weighting.
- Expand/revisit signal quality for edge game states.

## 2.1+ (ecosystem)

- Public docs site for scoring concepts and extension behavior.
- Contributor playbooks for adding/tuning sports signals.

## Open questions to workshop

1. Where should the line be between **automatic switching** and **manual control** by default?
2. Should 2.0 include personalization by default, or ship in phases after PowerScore v2 stabilizes?
3. What defines “done” for 2.0: algorithm quality, UX quality, or both at a specific bar?
