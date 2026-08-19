---
name: reference-cjk-punctuation-and-spacing
description: Punctuation width and placeholder-spacing conventions observed across ja/ko/zh_CN/zh_TW locale files
metadata:
  type: reference
---

Confirmed by scanning all `!`/`?`/`.`/placeholder occurrences in
`apps/extension/locales/{ja,ko,zh_CN,zh_TW}.json` on 2026-08-19:

- **ja, zh_CN, zh_TW**: always use full-width punctuation — `！` `？` `。` — never the
  half-width ASCII forms, even in short exclamations like `발사!`-equivalents
  (`ゴー！`, `冲！`, `衝！`).
- **ko**: always uses half-width ASCII punctuation — `!` `.` — never full-width forms
  (`발사!`, `문제가 발생했어요.`). Korean does not follow the CJK full-width convention
  here.
- **Placeholder spacing**:
  - `ja`: no space between Japanese text and a `{placeholder}` or `$1`-style token —
    attaches directly (`{team}を`, `さらに{count}件表示`).
  - `zh_CN`/`zh_TW`: space inserted between Han characters and a Latin
    placeholder/token in most cases (`将 {label} 上移`, `第 $1 步，共 $2 步`), though a
    few existing strings omit it when the placeholder is immediately followed by
    full-width punctuation (`{total}（基础上限 {max}）`). Default to adding the space
    unless directly abutting punctuation.
  - `ko`: no space when the placeholder is followed by a grammatical particle/counter
    (`{days}일`, `{count}개`, `{venue}로`); space when followed by an independent word
    (`{label} 위로 이동`, `{team} 응원팀에서 해제`).

**How to apply:** when writing new ja/ko/zh_CN/zh_TW strings that mix Latin
placeholders or English fragments with native text, follow these per-locale
width/spacing rules rather than defaulting to the English source's ASCII punctuation
or spacing.

Related: [[reference-cjk-prose-vs-heading-split]].
