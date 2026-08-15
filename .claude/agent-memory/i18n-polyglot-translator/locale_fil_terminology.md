---
name: locale-fil-terminology
description: Approved Taglish terminology decisions for the fil (Filipino) locale, created 2026-08-15
metadata:
  type: project
---

Created `apps/extension/locales/fil.json` (locale code `fil`, not `tl` — per Google/Meta/Chrome OS convention) on 2026-08-15. Driven by NBA fandom in the Philippines (see task rationale: 55% of Filipinos are NBA fans).

**Why:** Filipino basketball broadcast is heavily Taglish (code-switched). Over-translating common English sports/UI terms reads as MORE foreign to actual Filipino fans, not less. A lighter-touch translation (chrome translated, core sports/gaming vocabulary kept as English loanwords) was explicitly requested and is the right calibration — confirm this approach for future fil.json updates rather than defaulting to maximalist translation.

**How to apply:** When adding new strings to fil.json, follow these established conventions:

Kept in English (loanwords, do not translate):
- Sport names as category labels: Basketball, Football, Hockey, Baseball, Softball, Soccer
- Broadcast jargon: tip-off, kickoff, puck drop, first pitch, gametime, halftime, quarter, overtime, buzzer, red zone, arena (as concept, though translated in some empty-arena jokes), refs
- Gaming/tech loanwords: switch (the UI toggle control itself), cooldown, sensitivity, delay, threshold, signal, boost, penalty, bonus, tab, league-adjacent words like "moneyline"/"odds"/"spread", Demo Mode, Display, Scoring (as a settings group name), Error, Info
- PowerScore signal names "Momentum" and "Comeback" specifically — these ARE spoken on Filipino broadcasts as loanwords, unlike "Closeness" or "Late-game" which are ArenaSwap-coined analytics terms without broadcast currency (those got translated: Momentum stays, but Closeness → "Kalapitan", Late-game → "Huling Yugto")
- Volatility (Boost/Penalty) — kept fully English; it's an opaque financial/statistical term even in English, no natural Filipino equivalent adds clarity
- The entire `ludicrousSpeed` section (Spaceballs movie quotes) — treated as a literal pop-culture quote block, left 100% untranslated like a proper noun, including sensitivity level names l1–l7 (Barely Active → Ludicrous Speed) since stepSettings.sensitivity1-7 and sensitivity.level.l1-l7 build up to and must stay consistent with that Easter egg's punchline
- unitDays/Hours/Minutes/Seconds kept as English single letters (d/h/m/s) — matches how Filipino telco/tech apps (Globe, Smart) show countdown units even in localized UI

Translated to natural Filipino:
- "game" → "laro" (native, extremely common, not over-translation)
- "team" kept English (more natural in casual PH sports speech than "koponan"/"pangkat" which read as textbook-formal)
- "favorite/favorited" → "paborito"/"paborito na" (native, very common)
- "league" → "liga" (legitimate assimilated Filipino word, appears in PH sports journalism, not over-translation)
- "Settings" → "Mga Setting" (both header and button, following the convention of es/de/fr/pt_BR which each use one consistent term in both places)
- Standard Taglish verb formation used throughout: "i-" prefix + English verb root for actions (i-enable, i-star, i-toggle, i-refresh, i-click, i-drag), "na-" prefix for completed/passive states (na-save, na-load, na-detect)

Proprietary terms preserved everywhere (never translated): ArenaSwap, PowerScore, Standby Stream.

Reference: `apps/extension/locales/en.json` is canonical source (531 leaf keys as of 2026-08-15). Other locales (es, de, fr, ja, pt_BR, pt_PT, zh_CN) fully translate generic toast words (success/error/info/close) — fil follows same pattern except keeps "Error" and "Info" as English (matches es/de/fr/pt_BR which also keep these two nearly verbatim as cognates/loanwords).
