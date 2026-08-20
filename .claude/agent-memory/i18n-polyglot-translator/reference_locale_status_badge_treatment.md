---
name: reference-locale-status-badge-treatment
description: Per-locale rule for whether a short uppercase status badge (LIVE, WATCHING, etc.) stays literal English or gets localized
metadata:
  type: reference
---

`gameCard.live` ("LIVE") shows a three-way split across the 11 non-English locales,
discovered 2026-08-19 while translating `stepAutoSwitch.watchingBadge` ("WATCHING"):

- **Stays literal English**: `de`, `fil`, `ko` (all render `"LIVE"` verbatim)
- **Translated, single word**: `it` → `"DIRETTA"`, `zh_CN`/`zh_TW` → `"直播"`/`"直播"`,
  `ja` → `"ライブ"` (katakana transliteration, not a native word)
- **Translated, two-word "EN X" pattern**: `es` → `"EN VIVO"`, `fr` → `"EN DIRECT"`,
  `pt_BR` → `"AO VIVO"`, `pt_PT` → `"EM DIRECTO"`

**How to apply:** for any new short uppercase status badge, check `gameCard.live` in
that locale first and match its treatment exactly rather than deciding fresh each
time — literal-English locales stay literal-English for badges, translated locales
get a natively-worded badge in the same word-count/structure style. For `WATCHING`
specifically this produced: `de`/`fil`/`ko` → `"WATCHING"` (literal); `es` →
`"VIENDO"`; `fr` → `"EN VISIONNAGE"`; `it` → `"GUARDANDO"`; `pt_BR` → `"ASSISTINDO"`;
`pt_PT` → `"A VER"` (pt_PT's characteristic "a + infinitive" progressive, matching its
own `watchingCaption`); `ja` → `"視聴中"`; `zh_CN`/`zh_TW` → `"观看中"`/`"觀看中"`.
Always cross-check the badge translation against that key's sibling caption/body text
(e.g. `stepAutoSwitch.watchingCaption`) so the verb choice matches rather than
introducing a second synonym for the same concept.

Related: [[reference-cjk-prose-vs-heading-split]].
