---
name: project-delay-translations
description: Approved translations for the gameCard.delay and gameCard.delayFallback keys across all non-English locales — status badge shown when a game is suspended (e.g. rain delay)
metadata:
  type: project
---

Approved translations for `gameCard.delay` (ALL-CAPS status label, mirrors casing of `gameCard.live`) and `gameCard.delayFallback` (title-case badge fallback) added 2026-07-21.

| Locale  | delay          | delayFallback   | live (reference) | Notes |
|---------|----------------|-----------------|------------------|-------|
| de      | VERZÖGERUNG    | Verzögerung     | LIVE             | Verzögerung = general delay/postponement; Verspätung rejected (implies scheduled lateness, not mid-game suspension) |
| fr      | EN ATTENTE     | En attente      | EN DIRECT        | "On hold" — standard French broadcast register for a suspended event; DÉLAI rejected as anglicism |
| ja      | 中断            | 中断             | ライブ            | chūdan = interruption/suspension; the broadcast term for a weather/game halt |
| zh_CN   | 中断            | 中断             | 直播              | zhōngduàn = suspension/interruption; matches broadcast register of 直播 |
| pt      | SUSPENSO       | Suspenso        | EM DIRECTO       | European PT official term for a suspended game; ATRASO rejected (implies scheduling) |
| pt_BR   | SUSPENSO       | Suspenso        | AO VIVO          | Same root as pt; ATRASO rejected for same reason |
| es      | SUSPENDIDO     | Suspendido      | EN VIVO          | Standard Spanish broadcast term; fits ALL-CAPS EN VIVO convention |

**Why:** ja and zh_CN share the same character string (中断) — both languages use this as the sports broadcast term for a game interruption. The `delayFallback` value intentionally matches `delay` for these two locales since the casing distinction (ALL-CAPS vs title-case) does not apply to CJK scripts.

**How to apply:** When adding additional delay-reason-specific strings (e.g. "Rain Delay", "Lightning Delay"), build on these root terms rather than re-sourcing new vocabulary.
