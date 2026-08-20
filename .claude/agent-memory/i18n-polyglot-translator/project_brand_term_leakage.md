---
name: project-brand-term-leakage
description: RESOLVED 2026-08-19 — maintainer ruled "Standby Stream" is always literal in all 12 locales; every known leak fixed (PR #18 pre-merge pass)
metadata:
  type: project
---

**Closed.** The maintainer ruled (PR #18 pre-merge fixes, 2026-08-19): "Standby Stream" is a
proper noun, treat it exactly like PowerScore — always literal English "Standby Stream" in
every locale, never translated, never lowercased into a common noun, regardless of how
`en.json` itself cases it in a given key. This resolves the open question this memory used to
track (whether the lowercase `en.json` instances were a common-noun exception) — they are not;
they're just en.json's own inconsistency, left as-is in en.json itself (not touched), but every
non-English locale must render literal "Standby Stream" wherever that en.json key refers to the
concept.

**Fixed in this pass**, sweeping all 12 files for translated-OR-lowercased instances of the
phrase (not just the previously-known ones):
- **es**: reverted *"Transmisión en espera"* → "Standby Stream" in all 9 instances
  (`setup.standbySection`, `setup.enableStandby`, `setup.groupStandby`, `main.onStandbyStream`,
  `standbyGuide.title`, `standbyGuide.quietBody`, `standbyGuide.designateBody`,
  `notification.standbyTitle`, `notification.standbyMessage`).
- **ja**: reverted katakana *スタンバイストリーム* → literal "Standby Stream" in `standbyGuide.quietBody`,
  `standbyGuide.designateBody`, `notification.standbyTitle`, `notification.standbyMessage`,
  `proTip.main.t5` (5 instances) — this reverses the deliberate prose-localization pattern
  recorded in [[reference-cjk-prose-vs-heading-split]], which is now superseded for this term.
- **zh_CN**: reverted *待机流*/*待机直播流* → literal "Standby Stream" in the same 5-key set.
- **zh_TW**: reverted *待機直播* → literal "Standby Stream" in `quietBody`/`designateBody`/
  `notification.standbyTitle`/`notification.standbyMessage` (4 instances; `proTip.main.t5` was
  already correct).
- **ko**: reverted *대기 스트림* → literal "Standby Stream" in the same 4-key set (`proTip.main.t5`
  was already correct).
- **fr**: 5 instances were already literal but *lowercase* ("en standby stream") — capitalized
  to match the proper-noun ruling (`main.onStandbyStream`, `standbyGuide.quietBody`,
  `standbyGuide.designateBody`, `notification.standbyTitle`, `notification.standbyMessage`).
- **fil**: same lowercase-casing fix, 5 instances (`main.onStandbyStream`,
  `standbyGuide.quietBody`, `standbyGuide.designateBody`, `notification.standbyTitle`,
  `notification.standbyMessage`).
- **it**: same lowercase-casing fix, 4 instances (`quietBody`/`designateBody`/
  `notification.standbyTitle`/`notification.standbyMessage`; `onStandbyStream` was already
  correctly capitalized).
- **de**: fixed the hyphenation split *Standby-Stream* → "Standby Stream" in
  `standbyGuide.designateBody` (the only de instance that wasn't already correct).
- **pt_BR / pt_PT**: audited, already fully correct — zero changes needed.

**What was NOT touched, on purpose:** `setup.standbyTab`/`standbyBelow`,
`standbyGuide.chooseTitle`/`chooseBody`/`thresholdTitle`/`thresholdBody`/`designateTitle` — these
say "standby tab" / generic "stream" even in `en.json` itself (never say "Standby Stream"), so
translating "standby" as a plain adjective there (e.g. es "pestaña de espera") is not brand
leakage and was left alone. Also did not touch `en.json`'s own inconsistent lowercase casing —
that's the canonical source string and wasn't explicitly in scope; flagged again here in case a
future pass wants full en.json consistency too.

See [[reference-cjk-prose-vs-heading-split]] (now marked superseded for this specific term) and
[[reference-locale-file-mechanics]] for the edit technique used (byte-level exact-string replace
with occurrence-count assertions, not json.dump).
