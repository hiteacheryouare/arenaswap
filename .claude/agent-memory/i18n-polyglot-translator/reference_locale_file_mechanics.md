---
name: reference-locale-file-mechanics
description: Hard mechanical constraints and width-test limits for apps/extension/locales/*.json — tabs, CRLF, EOF quirk, and the two Cypress width tests that gate translations
metadata:
  type: reference
---

The locale files live at `apps/extension/locales/{en,de,es,fil,fr,it,ja,ko,pt_BR,pt_PT,zh_CN,zh_TW}.json` — 12 locales, 590 keys each as of 2026-08-15, identical key order (key count grows over time, don't treat 590 as gospel, diff against `en.json` to check).

**Locale codes are constrained by an allowlist**, not free-form: see `SUPPORTED_LOCALES` in `node_modules/@wxt-dev/i18n/dist/build-*.mjs`. `fr_FR`/`fr_CA` are NOT valid and were tried and reverted — see [[project-fr-fr-ca-split]] before proposing any regional variant. WXT only warns and still builds, so an invalid code fails silently at runtime.

Adding a locale requires registering it in three Cypress specs that hardcode a locale map — `gameInfoPanel.cy.tsx`, `gameDetailView.cy.tsx`, `pregameDetail.cy.tsx` — or it gets no width coverage. Import Italian as `itLocale`, never `it`: a bare `it` import shadows Mocha's global `it()` and every test in the file dies with "it is not a function".

## Mechanics that must be preserved
- **Tab** indentation, **CRLF** line endings, existing key order, valid JSON.
- Quirk: `en.json` has **no trailing newline at EOF**; all 11 others **do**, including `fr.json` (which lacked one until 2026-08-15). Pre-existing on `en.json` — do not "fix" it, it creates diff noise.
- `json.dump` will destroy all of this. Edit by targeted regex replacement of the `"key": "value"` span instead.
- The Edit tool's exact-string matching has repeatedly failed against these files even when the visible text looked identical — the mismatch is invisible tab-count/CRLF handling, not the content. **Reliable method:** read the raw bytes in Python, do a plain `bytes.replace(old.encode('utf-8'), new.encode('utf-8'))` on the whole file, assert the expected occurrence count before writing, then re-verify after with the same byte-level check (CRLF count, bare-LF count, trailing-newline state, `json.loads` validity). This is now the default approach for editing these 8 files, not a fallback.

## Width tests that gate translations
Two Cypress component specs read the locale JSON directly and measure rendered text:

- `cypress/component/gameInfoPanel.cy.tsx` → "fits every locale label in the label column". `infoWatch/infoVenue/infoWeather/infoLine` render in a fixed **46.40px** column (`.game-info-label`, `width: 2.9rem`, `font-size: 0.58rem`) and must not wrap.
- `cypress/component/pregameDetail.cy.tsx` → "keeps every locale heading on one line in the card". Every `getReady*` string is a `.gd-setup-heading` (`font-size: 0.62rem`, bold) at **278px** usable width.

**Measured budgets** (verified 2026-08-10): the heading line fits roughly **54 Latin characters** — generous, no realistic phrasing hits it. The 46.40px label column is the real constraint. Known results: all 2-char CJK = 18.45 ✓; `Handicap`/`Hándicap` 42.63 ✓; `スプレッド` 45.62 ✓ (barely); `Pronóstico` 48.38 ✗; `Übertragung` 57.34 ✗; `Transmissão` 56.43 ✗; `Onde assistir` 59.24 ✗.

Consequence worth remembering: the *idiomatic* label for the broadcast row does not fit in German (`Übertragung`) or Brazilian Portuguese (`Onde assistir`), so those locales use shorter compromises (`Sender`, `Assistir`).

**How to apply:** Before proposing a label for the `info*` row, check it against the measured budget above. To measure new candidates, mount `GameDetailView` in a scratch Cypress spec, clone the `.game-info-label` node into an auto-width absolutely-positioned probe, and compare `getBoundingClientRect().width` — and always include a deliberately over-long control string to prove the probe can actually detect an overflow.
