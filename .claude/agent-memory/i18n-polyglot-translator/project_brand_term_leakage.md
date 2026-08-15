---
name: project-brand-term-leakage
description: Standby Stream brand name is translated in es/fr/zh_CN/ja locale files — open, unfixed issue rooted in en.json's own inconsistent casing
metadata:
  type: project
---

**"Standby Stream" is inconsistently treated as a brand name across the locale files.** Found 2026-08-10 during review; **reported to the maintainer but NOT fixed** (out of scope of that task, and it needs an editorial decision first).

Leakage found (keys whose en value mentions the feature):
- **es**: translated to *"Transmisión en espera"* in `setup.standbySection`, `setup.enableStandby`, `standbyGuide.title`, `main.onStandbyStream`, `standbyGuide.quietBody`, `standbyGuide.designateBody`.
- **fr → fixed 2026-08-15**: *"Le Flux Veille"* in `proTip.main.t5` was fixed to the untranslated "Standby Stream" in both `fr_FR.json` and `fr_CA.json` during the [[project-fr-fr-ca-split]] work (fr.json no longer exists as a single file). The lowercase "standby stream" instances elsewhere in fr were left alone, same reasoning as below.
- **zh_CN**: *"待机流"* / *"待机直播流"*.
- **ja**: *"スタンバイストリーム"* (katakana) in some keys, Latin "Standby Stream" in others.
- **de**: *"Standby-Stream"* (hyphenated compound).

**Why:** The root cause is that **`en.json` itself is inconsistent** — it writes lowercase "standby stream" in `standbyGuide.quietBody`, `standbyGuide.designateBody` and `main.onStandbyStream`, but capitalized "Standby Stream" elsewhere. Translators reasonably read the lowercase instances as a generic noun phrase ("the stream you designated") rather than the feature name, and translated them.

There is a defensible distinction hiding here: the *feature* is "Standby Stream" (proper noun, never translated), while *"your standby stream"* may genuinely be a common noun referring to the specific stream the user picked. **That editorial call has to be made in en.json first**, then propagated — otherwise fixing the other 7 files just re-litigates it.

**How to apply:** Do not mass-replace these without deciding the en.json casing question first. If the maintainer says the feature name is always proper, then all six es keys, the fr `proTip.main.t5`, the zh_CN and ja instances need reverting to the Latin brand string. See [[reference-locale-file-mechanics]] for how to edit these files safely.
