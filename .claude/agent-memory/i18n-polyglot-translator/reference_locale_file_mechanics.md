---
name: reference-locale-file-mechanics
description: Hard mechanical constraints and width-test limits for apps/extension/locales/*.json — tabs, CRLF, EOF quirk, and the two Cypress width tests that gate translations
metadata:
  type: reference
---

The 8 locale files live at `apps/extension/locales/{en,de,es,fr,ja,pt_BR,pt_PT,zh_CN}.json` (499 keys each, identical key order).

## Mechanics that must be preserved
- **Tab** indentation, **CRLF** line endings, existing key order, valid JSON.
- Quirk: `en.json` and `fr.json` have **no trailing newline at EOF**; the other six **do**. Pre-existing — do not "fix" it, it creates diff noise.
- `json.dump` will destroy all of this. Edit by targeted regex replacement of the `"key": "value"` span instead.

## Width tests that gate translations
Two Cypress component specs read the locale JSON directly and measure rendered text:

- `cypress/component/gameInfoPanel.cy.tsx` → "fits every locale label in the label column". `infoWatch/infoVenue/infoWeather/infoLine` render in a fixed **46.40px** column (`.game-info-label`, `width: 2.9rem`, `font-size: 0.58rem`) and must not wrap.
- `cypress/component/pregameDetail.cy.tsx` → "keeps every locale heading on one line in the card". Every `getReady*` string is a `.gd-setup-heading` (`font-size: 0.62rem`, bold) at **278px** usable width.

**Measured budgets** (verified 2026-08-10): the heading line fits roughly **54 Latin characters** — generous, no realistic phrasing hits it. The 46.40px label column is the real constraint. Known results: all 2-char CJK = 18.45 ✓; `Handicap`/`Hándicap` 42.63 ✓; `スプレッド` 45.62 ✓ (barely); `Pronóstico` 48.38 ✗; `Übertragung` 57.34 ✗; `Transmissão` 56.43 ✗; `Onde assistir` 59.24 ✗.

Consequence worth remembering: the *idiomatic* label for the broadcast row does not fit in German (`Übertragung`) or Brazilian Portuguese (`Onde assistir`), so those locales use shorter compromises (`Sender`, `Assistir`).

**How to apply:** Before proposing a label for the `info*` row, check it against the measured budget above. To measure new candidates, mount `GameDetailView` in a scratch Cypress spec, clone the `.game-info-label` node into an auto-width absolutely-positioned probe, and compare `getBoundingClientRect().width` — and always include a deliberately over-long control string to prove the probe can actually detect an overflow.
