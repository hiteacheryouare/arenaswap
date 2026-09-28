---
name: project-v3-settings-index-and-misc-translations
description: Approved translations for the v3 redesign's Settings-index short values, startsIn/startsInOn (filled the gap flagged in project_board_namespace_translations), sourcesFootnote spy joke, gameBoost stepper labels, onboarding pick counts, and stepToggle state labels — added 2026-09-28, across all 11 non-English locales
metadata:
  type: project
---

Added 20 new keys (27 entries counting plural forms) + re-translated 5 changed keys across
all 11 non-English locales for the v3 redesign's grouped-card Settings screen and related
onboarding/detail-view copy. `en.json` was not touched (already had the target strings).

## Filled the `detail.startsIn`/`startsInOn` gap
[[project_board_namespace_translations]] flagged this gap on the same day this task started
(2026-09-28) — those two keys existed in `en.json` but were missing from every locale. Now filled.
`{time}` is substituted with a NUL sentinel by `startCountdownDisplay.tsx` and split out for a
styled countdown widget; `{networks}` is a literal substituted string. Both are named
placeholders, so word order is free per language — no code-imposed ordering constraint.
Reused each locale's `board.watchOn` preposition for the network clause (auf/en/sur/su/em/sa,
で/에서/在...）for consistency: de "Beginnt in {time} auf {networks}", es "Comienza en {time} en
{networks}" (deliberately reuses "en" twice — grammatically fine, flagged as a minor style note),
fr "dans...sur", it "tra...su", pt_BR/pt_PT "em...em", fil "sa...sa" (repetition of "sa" reads
completely natural in Filipino, unlike the Romance-language repeats). ja restructured to
"{time}後に{networks}で開始" (avoiding a double-で clash with the あと-based board.inMinutes
style). ko "{time} 후 {networks}에서 시작". zh_CN/zh_TW dropped the "on network" construction
entirely in favor of a more natural two-clause native pattern: "{time}后开始，{networks}直播"
("starts in {time}; broadcasts live on {networks}"), using 直播 as a verb rather than forcing an
"on X" preposition.

## `detail.sourcesFootnote` — the covert-spy wink, via each language's own journalism vocabulary
AGENTS.md asks for a subtle "our sources are covert spies with good seats" joke, never naming a
real data provider. Didn't need to invent spy imagery — every language's own word for
"(anonymous) source/informant" already carries that connotation, so just reused it straight:
de "unsere Quellen", es/fr/it/pt "nuestras fuentes"/"nos sources"/"le nostre fonti"/"nossas
fontes" (journalistic-informant sense, not just "origin"), ja "情報源", ko "소식통" (literally
"news pipeline" — an informant/insider term, arguably the best natural fit in the set). **zh_CN/
zh_TW went further and used 线人/線人** ("insider informant," genuinely the word for a police/
spy contact in Chinese crime dramas) — the most overt version of the wink in the whole set,
purely because it happens to be the natural translation of "source" in this register, not a
forced insertion. fil kept "source" as an English loanword (established casual-Filipino-internet
usage, e.g. "sino ang source mo?"), which reads as more mundane and doesn't carry the wink —
flagged as the one locale where the joke lands softer.

## `setup.stateOn`/`setup.stateOff` (bare "On"/"Off" settings-row value) — new precedent, sourced from `cooldown.off`/`switchDelay.off`/`signalOff`
No prior bare "On" word existed anywhere in any locale (`grep '"on":'` came up empty across all
12 files) before this task. Found the existing "Off" precedent instead (three keys already agree
per locale: `cooldown.off`, `switchDelay.off`, `powerScore.signalOff`) and invented the matching
"On" counterpart in the same register, rather than translating fresh: de An/Aus, es Activado/
Desactivado, fr Activé/Désactivé, pt_BR Ativado/Desativado (no c), pt_PT Activado/Desactivado
(with c, pre-AO90 spelling — confirmed pt_PT's own established convention via "em directo"/"ao
vivo" search), zh_CN 开启/关闭, zh_TW 開啟/關閉, ja オン/オフ, ko 켜짐/꺼짐. **fil and it both
already keep "Off" as literal untranslated English at this exact bare-value UI slot** (checked:
`fil.cooldown.off` = "Off", `it.cooldown.off` = "Off") — so their `stateOn`/`stateOff` follow
suit: fil "On"/"Off", it "On"/"Off" (a real, pre-existing quirk in `it.json` specifically for this
one UI slot, not a translation gap — Italian otherwise fully translates "off" elsewhere, e.g.
`signalOff` is the only other "Off"-kept instance found).

Do **not** confuse this with `stepToggle.stateOn`/`stateOff`, a *different* key in a different
namespace holding full descriptive sentences ("ArenaSwap is active" / "Auto-switching paused"),
translated properly per locale using each locale's own `groupSwitching`-family verb root (de
Wechsel/wechseln, es Cambio/cambiar, fr Changement/changer, it Cambio/cambiare, pt_BR Troca/
trocar, pt_PT Mudança/mudar, fil Paglipat/lumipat) — cross-checked against each locale's existing
`groupSwitching` group-header noun as a consistency proof, all matched cleanly. ja/ko used the
established "-中" (in-progress) suffix pattern already seen in `board.watching`/`switchingTo`
(ja "ArenaSwap稼働中" / "自動切り替え一時停止中", ko "ArenaSwap 작동 중" / "자동 전환 일시 정지").

## `setup.leaguesCount` = {"0","1","n"} → "None"/"1 on"/"$1 on" — the trickiest plural object in this batch
This is NOT a plain noun count (unlike `signalsCount`/`teamsCount`) — English shrinks "N leagues
are switched on" down to a bare "$1 on" fragment, assuming the row's own label ("Leagues") already
supplies the noun. Translated the "on" adjective/participle per locale (needed to newly invent an
"on"-word here too, reusing the same choices as `setup.stateOn` for consistency): de "$1 an", es/
fr/it/pt_BR/pt_PT used a feminine agreement adjective matching each locale's word for "league"
(Liga/ligue/lega — all feminine): "activa(s)"/"active(s)"/"attiva(e)"/"ativa(s)"/"activa(s)". ja
"$1件有効" (件 counter + 有効 "valid/enabled", the standard Japanese Settings-UI word for a
toggled-on feature, not a bare オン loanword — reads much more natural than "オン" here). ko
"$1개 켜짐". zh_CN/zh_TW "$1 个/個开启/開啟". fil "$1 On" (capitalized, matching the bare-English
precedent above, NOT "naka-on" — "naka-on" is the right word for descriptive prose like
`stepToggle.bodyOn`, but this terse settings-value slot follows the `cooldown.off`="Off" precedent
instead; a judgment call, flag if it reads oddly in context). The "0" form ("None") was
gender-matched separately per locale where relevant (`teamsCount.0` vs `leaguesCount.0` can
legitimately differ — e.g. pt_BR "time" is masculine → "Nenhum" but "liga" is feminine → "Nenhuma";
es "equipo" masc → "Ninguno" but "liga" fem → "Ninguna"). de/fil/ja/ko/zh used one gender-neutral
"none" word for both (Keine/Wala/なし/없음/无·無) since those languages don't inflect for this.

## `gameBoost.decrease`/`increase` (+/- 1 stepper aria-labels) — first of their kind, no prior aria pattern to reuse
No existing "Decrease X"/"Increase X" aria-label pair existed anywhere before this (`en.json`
grep confirmed). Matched each locale's own verb-order convention for other aria-labels in the
same file (`leagueMoveUp`/`removeFavorite`/`addFavorite`): German puts the verb last
("Einen Punkt entfernen"), Spanish/French/Italian/Portuguese verb-first ("Quitar/Retirer/
Rimuovi/Remover un punto"). ja and ko departed from the file's usual 削除/追加 (delete/add, used
for list-item favorite actions) in favor of 増やす/減らす and 증가/감소 (increase/decrease) since
this is a numeric +/-1 stepper, not a list add/remove — a deliberate semantic distinction, not a
copy of the favorite-team aria pattern. fil used "Bawasan ng 1 point"/"Dagdagan ng 1 point"
(object-focus "reduce/increase [it] by 1 point" verb forms), judged more natural for a stepper
than a literal "mag-alis ng isang point".

## Mechanics used this pass
Wrote a single Python script that parses every locale file with `object_pairs_hook=
collections.OrderedDict`, does targeted `insert_after(anchor_key, [...])` rebuilds per touched
namespace (setup/detail/gameBoost/leaguePicker/teamPicker/stepToggle), direct key assignment for
the 5 changed values, then re-serializes with `json.dumps(..., indent='\t').replace('\n','\r\n')`.

**Bug caught and fixed in this same pass:** the round-trip trailer logic
(`trailer = '\r\n' if raw.endswith('\r\n') else ''`) computed `False` for all 11 files at
write-time, stripping their trailing CRLF even though [[reference_locale_file_mechanics]]'s
established convention is that all non-`en.json` locales keep one. Root cause: this branch
(`v3-redesign`) already had a large uncommitted WIP diff across ~40 files *before* this task
started (confirmed via the session's initial `git status`) — that prior WIP had apparently
already stripped the trailing newline from these same 11 files as a side effect of unrelated
editing, so `raw.endswith('\r\n')` was legitimately `False` at read-time. **Fix applied:**
appended a bare `\r\n` to all 11 files after the fact via a follow-up script, then re-verified
`git diff` showed exactly one remaining "No newline at end of file" marker — on `en.json`, which
is correct and pre-existing (never touched). **Lesson: don't trust the trailing-newline state
implied by memory/precedent — re-check `raw.endswith(b'\r\n')` is actually `True` on files with
`git status` already showing them dirty before your own edit, since a concurrent WIP pass may
have already altered EOF state; verify after writing, not just before.**

The task's own key-parity/placeholder verification script (flatten every leaf key, diff key sets
against `en.json`, regex-extract `\{[a-zA-Z]+\}|\$1` tokens per matching leaf and diff those sets
too) is a reusable pattern worth keeping for any future batch — it caught zero issues here but
would have caught a missed placeholder or key-order slip immediately.

Related: [[project_board_namespace_translations]], [[reference_plural_object_convention]],
[[reference_locale_file_mechanics]], [[project_theme_setting_translations]],
[[locale_fil_terminology]], [[project_zh_tw_terminology]], [[project_ko_terminology]].
