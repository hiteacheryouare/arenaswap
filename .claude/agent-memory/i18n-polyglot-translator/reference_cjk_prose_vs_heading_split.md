---
name: reference-cjk-prose-vs-heading-split
description: ja/ko/zh_CN/zh_TW already split "Standby Stream" handling by context — literal Latin heading vs. localized term in flowing prose
metadata:
  type: reference
---

Before this memory existed, the working assumption (documented in the project-level
memory `reference_locale_file_format` / `project_locale_codes`) was that "Standby Stream"
stays untranslated in every locale except `es` ("Transmisión en espera"). Reading the
actual `apps/extension/locales/{ja,ko,zh_CN,zh_TW}.json` files during a 2026-08-19
notification-string translation task surfaced a more precise, already-established
pattern in those four CJK locales specifically:

- **Heading/label context** (`setup.groupStandby`, `standbyGuide.title`): stays literal
  Latin `"Standby Stream"` in all four.
- **Flowing-prose context** (body copy that refers to "your standby stream" as a common
  noun, e.g. `standbyGuide.quietBody`/`designateBody`, `proTip.main.t5`): already
  localized/transliterated per locale:
  - `ja`: katakana transliteration `スタンバイストリーム`
  - `ko`: translated `대기 스트림` (in body text) even though `groupStandby` and
    `proTip.main.t5` keep literal `Standby Stream`
  - `zh_CN`: translated `待机流` (quietBody) / `待机直播流` (designateBody, less
    consistent internally — prefer `待机流` for new copy, it's the more common form)
  - `zh_TW`: translated `待機直播`

De, es (already directed to translate fully), fil, fr, it, pt_BR, and pt_PT do **not**
show this split — they keep `Standby Stream`/`standby stream` literal in body prose too
(just lowercase-embedded in de/fil/fr/it, capitalized mid-sentence in pt_BR/pt_PT).

**How to apply:** when translating new prose strings (not headings/menu labels) that
reference the standby-stream concept in ja/ko/zh_CN/zh_TW, use the locale's own
already-established localized/transliterated term instead of the literal English
"Standby Stream" — even though the general project rule says keep it untranslated.
Keep the literal Latin form for anything that functions as a heading or standalone
label. This was a judgment call made without stopping to ask Ryan first (per Auto Mode
bias toward proceeding) — flag it to him next time this comes up in case he wants the
literal form everywhere instead.

Related: [[reference-cjk-punctuation-and-spacing]].
