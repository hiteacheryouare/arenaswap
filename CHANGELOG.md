# Changelog

## PowerScore v2 — 2026-06-04

### Scoring algorithm
- **Full-range scale.** Signal ceilings now deliberately stack past 100 and the headline is capped at 100, so a genuinely exciting game climbs into the 80s/90s and a dull one stays low — previously every game compressed into roughly the bottom two-thirds (~0–72).
- **Scores build with the game.** State signals (closeness, comeback) start near a small floor and ramp up on a concave progress curve, instead of sitting at a flat 20–30 baseline from the opening tip.
- **Near-linear late-game pressure** spread across the whole final period (no final-seconds spike), and it now only counts when the game is close — a blowout in the final minute no longer reads as exciting.
- **Overtime anticipation.** Tied games get a ramping pre-boost through the final minute so likely-OT games stand out.
- **Live-action decay.** Momentum, lead changes, and comeback spike on a score and then fade on sport-scaled half-lives, so even low-scoring sports keep a moving graph instead of flat lines.
- Rebalanced signal ceilings to Closeness 30 / Late-Game 28 / Momentum 28 / Lead Changes 18 / Comeback 14.
- Recalibrated tab-switch sensitivity thresholds for the new score distribution.

### Demo mode
- Realistic per-sport scoring cadence (hockey/soccer score sparingly, basketball constantly, etc.).
- Fixed demo team logos that showed the wrong team; all now use ESPN's official logo URLs.

### Tooling & docs
- Added a simulation + live-ESPN validation harness: `npm run powerscore:simulate` and `npm run powerscore:validate-live`.
- Expanded the test suite (progress scaling, decay, near-linear late-game, overtime boost, edge cases).
- Updated the README, package page, website, and store listing to match the new model.
