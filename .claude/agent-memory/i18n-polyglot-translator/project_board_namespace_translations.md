---
name: project-board-namespace-translations
description: Approved board.* namespace (v3 redesign Games screen — stage/tile/row tab pairing, PowerScore trend, start countdown), added 2026-09-28, across all 11 non-English locales
metadata:
  type: project
---

Added a new top-level `board` object (13 keys, inserted at the very end of each file,
after `ludicrousSpeed`) for the v3 popup redesign's Games screen (stage / tiles / rows).
Covers: away-at-home separator, PowerScore steady/trend aria text, browser-tab labeling
and pairing, watching/switching-to state, watch-on-network line, and two plural-shaped
"starts in" countdowns (minutes/hours).

## Key reuse decisions (why these aren't fresh translations)

- **`at`** ("BOS at NYR" pregame separator) — reused each locale's already-researched
  `guide.at` value verbatim rather than translating "at" fresh, since it's the exact
  same away/home-separator concept documented in [[project-guide-view-translations]]:
  de/fr/pt_PT/it `-`, es `vs.`, fil/ja/ko/zh_CN/zh_TW `vs`, pt_BR `x`.
- **`tab`/`tabUnknown`/`assignTab`/`noTab`** — reused each locale's existing tab noun
  from `tab.fallback` ("Tab #$1"): Tab(de/fil)/Pestaña(es)/Onglet(fr)/Scheda(it)/
  タブ(ja)/탭(ko)/Aba(pt_BR)/Separador(pt_PT)/标签页(zh_CN)/分頁(zh_TW). `assignTab`
  reused `tabAssign.placeholder`/`stepTabAssign.assignPlaceholder` verbatim minus the
  em-dash decoration (en's own `board.assignTab` = "Assign a tab" is exactly the
  dash-stripped form of the existing "— Assign a tab —" placeholder — same relationship
  held in every locale). `tab {number}` mirrors `tab.fallback`'s noun+number spacing
  exactly (ja/ko/zh_CN/zh_TW all keep the pre-existing half-width space before the
  number, matching their own `"タブ #$1"`-style precedent).
- **`switchingTo`** — built from each locale's own switch-related vocabulary rather than
  a fresh verb: de `Wechselt` (groupSwitching), fr `Bascule` (from `basculer`, matching
  `notification.switchedTitle` = "Basculé", not `groupSwitching`'s "Changement" — the
  notification's verb is the better semantic match for an in-progress single-tab
  switch), it `Passaggio` (transition, more progressive-feeling than reusing "Cambio"),
  ja `{tab}に切り替え中` (切り替え + 中 in-progress suffix, same pattern as 視聴中),
  ko `{tab} 전환 중` (전환 + bare juxtaposition, see Korean note below), zh_CN/zh_TW
  `切换到`/`切換到` (groupSwitching's own root).
- **`watchOn`** — reused each locale's `gameCard.watchLabel` verb exactly (Ver en /
  Assistir em / Guarda su / Regarder sur / Schauen auf), just extended with "{networks}"
  and no trailing colon. ja/ko/zh reordered to location-then-verb per natural word
  order: ja `{networks}で視聴`, ko `{networks}에서 시청` (에서 is invariant regardless
  of the placeholder's final sound, so no particle-euphony risk), zh `在 {networks} 观看`/`觀看`.

## `watching` badge-literal precedent applied to a full label

Per [[reference-locale-status-badge-treatment]], de/fil/ko already keep "WATCHING"
completely untranslated as a badge elsewhere in these same files. Extended that same
judgment call to this new `"Watching, {tab}"` label (not just the bare all-caps badge)
for those three locales — i.e. `de.board.watching` = `"Watching, {tab}"` literally,
same for fil/ko. All other locales translated normally using their own established
badge verb + a comma: es `Viendo,`/fr `En visionnage,`/it `Guardando,`/pt_BR
`Assistindo,`/pt_PT `A ver,`/ja `視聴中、`(ja reading-point comma)/zh_CN `观看中，`/zh_TW
`觀看中，` (zh full-width comma, per [[reference-cjk-punctuation-and-spacing]]).
**Flag this to Ryan if it ever looks wrong** — extending a short-badge exception to a
longer sentence-style string is a judgment call, not something re-verified against a
live build.

## `steady` / `trendUp` / `trendDown` (PowerScore trend aria text)

No prior precedent existed for "the PowerScore hasn't moved" in any locale. Chose
concise, standalone-adjective/phrase forms meant to read fine as `${number} ${phrase}`
screen-reader fragments (matching English's own ungrammatical-fragment style, "4 up in
the last minute"):
- de `Stabil`/es `Estable`/fr `Stable`/it `Stabile`/pt_BR&pt_PT `Estável` — direct
  cognates, all short.
- **fil `Stable`** — kept the English loanword rather than a native word. Filipino
  slang already overloads a literal translation of "steady" with a romantic-
  relationship meaning ("going steady"), so a native equivalent would misread; "stable"
  is itself a common assimilated adjective in Filipino tech/health contexts ("stable
  ang presyon"). Flag if this needs re-checking against a real fil-speaking user.
- **ja `横ばい`** (yokobai, "flat/level") — the actual Japanese finance/stats term for
  an unchanged trend line, a strong native fit.
- **ko `유지`** ("maintained") — chose over the more technical finance term 보합
  (which reads as stock-market jargon) for general-audience clarity.
- **zh_CN/zh_TW `持平`** — the standard Chinese term for "unchanged/level" in a
  score/stat context (e.g. "比分持平").

## `inMinutes`/`inHours` (new plural-shaped countdown, distinct from `detail.unit*`)

These are a **natural-language** countdown ("Starts in 5 min"/"in 2 hr"), not the
compact single-letter clock-timer units in `detail.unitMinutes`/`unitHours` (m/h, Min/
Std, 分/時間, etc. — used for elapsed-time displays like "12m 34s"). Followed
[[reference-plural-object-convention]] mechanically, but picked wording for the natural
"in X units" register rather than reusing the bare clock-timer letters everywhere:
- de/es/fr/it/pt_BR/pt_PT reused their own **existing** `unitMinutes`/`unitHours`
  abbreviations verbatim (already spelled-out-enough for this context): Min/Std (de,
  no periods — matches the file's own unit strings exactly), min/h (es/fr/it/pt_BR/
  pt_PT).
- **fil** deliberately diverged from the file's own single-letter unit convention
  (`m`/`h`) for this specific natural-sentence context: `min` (common Taglish texting
  abbreviation, more legible than bare "m") for minutes, but native spelled-out `oras`
  (not "h") for hours, matching the precedent set by `setup.upcomingDaysValue` using
  spelled-out native `araw` rather than the abbreviated `d`. Applied the `na` linker
  before `oras` per [[reference-plural-object-convention]]'s established mechanical
  rule, but NOT before `min` (treated as an invariant borrowed unit symbol like "kg",
  which colloquial Filipino doesn't linker-attach to numbers). This is a judgment call,
  flag if questioned.
- **ja** reused its own bare `分`/`時間` unit words (both are genuinely natural in
  spoken/casual Japanese, unlike Chinese) with the countdown pattern `あと` (lit.
  "after/remaining") + number, no space, matching ja's no-space-before-placeholder
  convention.
- **ko** used the bare `분`/`시간` counters (attach directly, no space, matches the
  file's own `"24시간"` precedent) plus the independent word `후` ("later") WITH a
  leading space, per the counter-vs-independent-word spacing split in
  [[reference-cjk-punctuation-and-spacing]].
- **zh_CN/zh_TW** deliberately used the natural two-character words `分钟`/`小时`
  (`分鐘`/`小時`) rather than the file's own bare single-character `unitHours` = `时`/`時`
  (that terser unit is for compact clock-timer display; a real precedent for the fuller
  natural word already exists in-file: `"24 小时内"`/`"24 小時內"` — WITH a space before
  the unit, which this new key matches) followed by a tight-attached `后`/`後` ("after").

## Mechanics

Used a byte-level suffix-replace (find the exact trailing `\t}\r\n}\r\n` — closing
`ludicrousSpeed` + root — reinsert it with `,` before the new `board` block) rather
than a full parse/round-trip, since insertion here is a pure end-of-file append.
Verified per file: `json.loads` succeeds, `board` key list and `inMinutes`/`inHours`
sub-key lists exactly match `en.json`, zero bare LF bytes, and the file still ends
`}\r\n}\r\n`. `en.json` was read-only in this task (another agent was concurrently
adding new keys to it — confirmed via `git diff --stat` that only `en.json` shows
unrelated changes I didn't make).

**Gap discovered, not fixed (out of scope for this task):** `detail.startsIn` and
`detail.startsInOn` exist in `en.json` but are missing from all 11 non-English locale
files (checked via key lookup — `None` in every locale). Only `detail.startsSoon`
exists everywhere. Worth a dedicated follow-up pass.

Related: [[project-guide-view-translations]], [[reference-locale-status-badge-treatment]],
[[reference-plural-object-convention]], [[reference-cjk-punctuation-and-spacing]],
[[locale-fil-terminology]], [[project-ko-terminology]], [[reference-locale-file-mechanics]].
