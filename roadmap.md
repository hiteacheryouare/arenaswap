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
- Overtime prediction — pre-boost tie games in final seconds
File: packages/powerscore/src/scorer.ts — computeLateGame()

Currently, a tied game with 10 seconds left scores the same as a tied game at halftime (both use closeness + late-game, neither pre-boosts OT)
Add a narrow "OT imminent" window: if clockSeconds ≤ 60 AND scoreDiff === 0 in the final regulation period, apply a bonus (e.g. +8) that bridges the gap before period > regularPeriods kicks in
Scope it tightly so it only fires once (within last 60s of regulation, tied)
Add tests for this boundary

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
