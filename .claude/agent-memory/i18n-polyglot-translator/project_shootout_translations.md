---
name: project-shootout-translations
description: Approved gameCard.shootout translations (penalty-shootout scorebug badge) across all 8 locale files, added 2026-08-03
metadata:
  type: project
---

Approved translations for `gameCard.shootout` — added 2026-08-03, placed immediately after `gameCard.delayFallback` in all 8 locale files (`de`, `en`, `es`, `fr`, `ja`, `pt_BR`, `pt_PT`, `zh_CN`).

English source: `PENS {away}–{home}` — a compact secondary readout shown beneath the frozen 120-minute score on a live soccer game card while a penalty shootout is in progress. `{away}` and `{home}` are integers, away-first, matching the main score's left-to-right order. Format pattern is `LABEL {away}–{home}` — label, one space, en-dash (U+2013) between placeholders with no surrounding spaces.

| Locale | shootout value | Native term behind the abbreviation | Confidence |
|--------|-----------------|--------------------------------------|------------|
| en     | `PENS {away}–{home}` | source string | n/a |
| de     | `I.E. {away}–{home}` | im Elfmeterschießen — confirmed as the standard German press/Wikipedia abbreviation "i. E." (vs "n. E." = nach Elfmeterschießen, used only for the final post-shootout result). Uppercased to `I.E.` to match this file's ALL-CAPS badge convention (mirrors `live`/`delay`, not the title-case `delayFallback`). | Medium — abbreviation itself is well-attested, but no direct evidence of ALL-CAPS rendering in a real broadcast graphic; native register normally keeps lowercase "i" |
| fr     | `TAB {away}–{home}` | tirs au but — confirmed via real French football press usage (maxifoot.fr "(4-5 tab)", FFF.fr "(5 tab 4)"); Wikipedia's own style uses spaced-dot "t. a. b." but that's encyclopedic citation style, not broadcast/press convention | High |
| ja     | `PK {away}–{home}` | PK (from ペナルティーキック) — confirmed via real Japanese press headlines using "PK5-4" pattern directly (no 戦 suffix in the compact score notation); 戦 is reserved for prose/headline phrasing like "PK戦の末" | High |
| zh_CN  | `点球 {away}–{home}` | 点球 (diǎnqiú) — confirmed via Sina Sports headline pattern "点球4-2" (drops 大战/PK entirely in the compact score notation) | High |
| es     | `PEN {away}–{home}` | pen. (penales/penaltis) — confirmed via Spanish Wikipedia infobox notation "(4:2 pen.)"; works for both Spain (penaltis) and Latin America (penales) since both truncate to the same root | High |
| pt_BR  | `PEN {away}–{home}` | pen. (pênaltis) — same root/abbreviation pattern as es; Brazilian press uses "pen." | High |
| pt_PT  | `GP {away}–{home}` | g.p. (grandes penalidades) — confirmed via SAPO Desporto headline "(3-0 após g.p.)"; Portugal's official/formal broadcast register prefers "grandes penalidades" over the colloquial "penáltis" that Brazil and casual PT outlets use, so pt_PT intentionally diverges from pt_BR's `PEN` | Medium — abbreviation confirmed in print headline, not verified directly in a live TV scorebug graphic |

**Why:** This established a second precedent (after [[project-delay-translations]]) for scorebug-style abbreviations: prefer the real press/broadcast shorthand over a literal translation of the English abbreviation, and verify per-locale via real match reports/headlines rather than assuming parity with English or with each other. pt_PT vs pt_BR is the clearest case of deliberate regional divergence — same sport, same event, different institutional vocabulary (grande penalidade is the official IFAB-PT term; pênalti/penálti is colloquial and used in Brazil and by casual PT outlets, but Portugal's formal broadcasters like RTP default to "grandes penalidades").

**How to apply:** When adding further scorebug/badge strings (e.g. other shootout-adjacent labels, "SO" for other sports' shootouts, etc.), reuse these root abbreviations rather than re-deriving. Flag `de` and `pt_PT` for human sign-off if their casing/register is ever questioned — both were confirmed via press/encyclopedia text, not a literal live-broadcast graphic screenshot.
