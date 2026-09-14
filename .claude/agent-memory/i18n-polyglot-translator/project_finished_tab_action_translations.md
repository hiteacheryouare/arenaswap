---
name: project-finished-tab-action-translations
description: setup.finishedTab* (5 keys + explainer pair) + setup.keywordsFinishedTab + new top-level finishedTabs.toastFreed/toastClosed namespace, added 2026-09-12 across all 11 non-English locales
metadata:
  type: project
---

New preference: what happens to a registered tab once its game finishes — leave alone / free from
ArenaSwap / close the tab. Keys land in `setup` right after `keepFinalGamesExplainer` (6 keys) and
after `keywordsKeepFinal` (1 keyword key), plus a new top-level `finishedTabs` namespace (2 plural
toasts) placed between `setup` and `main`. English source was already in `en.json` before this batch
started — placement, wording and the "free" nuance (release from extension control, not "free of
charge") all came from there.

## Per-locale "tab" and "window" nouns already established (reused, not re-derived)

| locale | tab | window |
|---|---|---|
| de | Tab | Fenster |
| es | pestaña | ventana |
| fil | tab (English loanword) | window (English loanword) |
| fr | onglet | fenêtre |
| it | scheda | finestra |
| ja | タブ | ウィンドウ |
| ko | 탭 | 창 |
| pt_BR | aba | janela |
| pt_PT | separador | janela |
| zh_CN | 标签页 | 窗口 |
| zh_TW | 分頁 | 視窗 |

Pulled from `setup.standbyTab`/`setup.selectTab`/`setup.keywordsStandbyTab` (tab) and
`setup.keywordsStandbyTab`/`tabControl.feature1Body` (window) in each file — do not re-derive these
from scratch for a future key, grep the table above first.

## "Free" verb chosen per locale (the nuance: release from extension control, not "free of charge")
- de: **freigeben** ("Aus ArenaSwap freigeben") — release/relinquish, the standard German verb for
  releasing a resource/lock
- es: **liberar** ("Liberarla de ArenaSwap")
- fil: **i-free** (Taglish verb formation, English root + `i-` prefix, per the established
  action-verb pattern — no natural Filipino verb reads as cleanly for "release from app control")
- fr: **libérer** ("Libérer l'onglet d'ArenaSwap")
- it: **liberare**, imperative-tu with clitic attached — "Liberala da ArenaSwap" (tu-imperative is
  it.json's established register for action labels, e.g. "Mantieni"/"Attiva", confirmed by checking
  `showUpcoming`/`keepFinalGames`/`enableStandby` before choosing this over an infinitive)
- ja: **解放する** ("ArenaSwapから解放する")
- ko: **해제하다** ("ArenaSwap에서 해제하기") — reused from the favorite-teams 등록/해제 (register/release)
  pair already in ko.json per [[project_ko_terminology]], since "release a registration" is exactly
  what this setting does
- pt_BR: **liberar** ("Liberar a aba do ArenaSwap")
- pt_PT: **libertar** (not liberar — European Portuguese's own verb) ("Libertar o separador do
  ArenaSwap")
- zh_CN: **释放** ("从 ArenaSwap 释放")
- zh_TW: **釋放** ("從 ArenaSwap 釋放")

## Register confirmed before writing (no new violations found)
fr/pt_PT tu, zh_CN 您, zh_TW 你, de/es tú-equivalent informal — all per
[[project_settings_drilldown_review]]. it.json's toggle/action labels are genuinely tu-imperative
("Mantieni", "Attiva", "Mostra" — 2nd person singular, not infinitive), confirmed by inspection
before choosing "Liberala"/"Lascia"/"Chiudi" for the three select options; French/Spanish/Portuguese/
German equivalents are infinitive ("Conserver", "Mantener", "Manter", "Behalten" etc.) which is
register-neutral, so the three select options there ("Laisser..."/"Dejar..."/"Deixar..."/
"...lassen") follow the same infinitive convention rather than switching to a conjugated imperative.

ko.json's `finishedTabAction` label is a compact noun phrase ("경기 종료 시 동작") rather than a full
clause, matching the existing terse label style (`standbyBelow` = "대기 기준점",
`temperatureUnit` = "온도 단위"). ja.json's label ("試合終了時の動作") and zh_CN/zh_TW's
("比赛结束时"/"比賽結束時") follow the same terse-label convention rather than a full sentence — checked
against `upcomingDaysLabel`/`standbyTab`/`temperatureUnit` in each file first.

## fil: plural toast required the "$1 na tab" linker rule from [[reference_plural_object_convention]]
`toastFreed.n` = "$1 na tab, sa'yo ulit." (linker `na` before the English noun in the plural form
only; singular `toastFreed."1"` = "1 tab, sa'yo ulit." carries no linker). `toastClosed` reused the
exact existing phrase "natapos nang laro" (finished game) already shipped verbatim in
`keepFinalGamesExplainer`, rather than inventing a new adjective phrase for "finished" — per
[[locale_fil_terminology]], reuse existing native phrasing over inventing parallel vocabulary.

## Select-option width: no violation, precedent already establishes headroom
The three `<select>` options render at ~296px (`form-select-sm`). Longest new option is es
"Dejar la pestaña como está" (27 chars) — well inside the existing precedent of it's
`demoSeasonThanksgiving` = "Settimana del Ringraziamento" (28 chars), which already ships in the
same component family. Checked all 11 locales' longest existing `demoSeason*`/`temperatureUnit*`
option strings before finalizing, per [[reference_locale_file_mechanics]]'s width-testing habit —
no new Cypress width test exists for this specific select, so this was a manual precedent check,
not a rendered measurement.

## Mechanics used
Round-tripped via `json.loads`/`json.dumps` with `OrderedDict` (not the byte-level `bytes.replace`
approach) since this is a clean two-site insertion (`setup` mid-object + new top-level namespace)
with no existing-value edits — same justification as
[[project_favorite_teams_settings_translations]]. Verified: JSON validity, zero bare `\n`, trailing
CRLF preserved (all 11 already had it), key order in `setup` and top level matches `en.json`
key-for-key, and `git diff --stat` shows exactly 17 added lines per file (matching `en.json`'s own
17-line diff) with zero deletions across all 11 files.

Related: [[reference_plural_object_convention]], [[reference_locale_file_mechanics]],
[[project_ko_terminology]], [[locale_fil_terminology]], [[project_settings_drilldown_review]].
