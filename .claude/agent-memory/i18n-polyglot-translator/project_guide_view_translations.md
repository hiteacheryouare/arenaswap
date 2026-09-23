---
name: project-guide-view-translations
description: Approved main.guideButton + new guide.* namespace (7 keys) across all 12 locales, added 2026-09-11 for the TV-guide-style timeline view; includes researched away/home separator convention per locale
metadata:
  type: project
---

Added `main.guideButton` (inserted right after `main.settingsButton`) and a new top-level `guide` namespace (inserted right after the `main` block, before `detail`) for the new full-tab Guide view — a TV-guide-style timeline of today's games. 8 keys total, all 12 locales, using the byte-level-round-trip-safe `json.load`/`json.dumps(indent='\t', ensure_ascii=False)` + `\n`→`\r\n` technique from [[reference-locale-file-mechanics]] (verified lossless round-trip on all 12 files before touching them — dumped bytes matched original bytes exactly modulo the insertion).

## guideButton (single word, aria-label/tooltip on a calendar icon)
Deliberately played on the literal "TV Guide" concept per language, not a generic "guide" translation:

| Locale | Value | Reasoning |
|---|---|---|
| en | Guide | — |
| de | Guide | German TV remotes/boxes literally have a "Guide" button (Sky Q, Vodafone, Fritzbox); kept as established loanword like `tourButton`'s "Tour" |
| es | Guía | Standard Spanish TV term ("guía de programación"), used directly in apps like Movistar+ |
| fil | Guide | No native Filipino TV-guide term in circulation; kept English like `tourButton`'s "Tour" |
| fr | Guide | French boxes (Freebox, Orange, SFR) label this button "Guide" natively — not a loanword, it's the actual French term |
| it | Guida | Standard Italian term, "Guida TV" |
| ja | 番組表 (bangumihyō) | THE established Japanese term for a TV programme guide, appears on every Japanese remote |
| ko | 편성표 (pyeonseongpyo) | THE established Korean term for a programming schedule/guide |
| pt_BR | Guia | Standard term, "guia de programação" |
| pt_PT | Guia | Same word, Portugal boxes (MEO, NOS) also use "Guia" |
| zh_CN | 节目表 | Standard Chinese TV listing term |
| zh_TW | 節目表 | Same, Taiwan cable boxes also use this |

## guide.at — away @ home separator (FLAGGED — researched via WebSearch/WebFetch, not just inferred)

The English `@` is a US-sports-specific convention (away team @ home team) that most other markets do NOT use. Verified per-locale via live web search/fetch of real sports schedule pages rather than guessing:

| Locale | Value | Evidence |
|---|---|---|
| en | @ | baseline US convention |
| de | - (hyphen) | Confirmed via Flashscore.de fetch: "Deutschland - Kroatien" style |
| es | vs. | Confirmed via multiple LatAm/US-Spanish sources (mediotiempo.com, elcomercio.pe, si.com/es-us) all format as "Lakers vs. Warriors" |
| fil | vs | Philippine sports media (Spin.ph, ESPN.ph, PBA broadcasts) consumes/produces English-style "vs" graphics |
| fr | - (hyphen) | Not directly confirmed (Eurosport.fr/L'Équipe fetches were inconclusive), inferred from the confirmed continental-European hyphen pattern (de/it/pt_PT) — lower confidence, flag if ever questioned |
| it | - (hyphen) | Confirmed via Sky Sport Italia fetch: "GRIZZLIES-WARRIORS" |
| ja | vs | Japanese sports media uses "vs" for neutral matchup listing (@ is understood as encoding home/away specifically, which isn't how JP schedules are usually read) |
| ko | vs | Same reasoning as ja; Korean portals (Naver/Daum) list matchups as "Team vs Team" |
| pt_BR | x | STRONGLY confirmed via goal.com/br URL slugs: "miami-heat-x-denver-nuggets", "denver-nuggets-x-miami-heat" — Brazilian sports headlines near-universally use lowercase "x" ("xis") as the team separator across ALL sports, not just soccer |
| pt_PT | - (hyphen) | Confirmed via Record.pt fetch: "Cleveland - San Antonio" |
| zh_CN | vs | Confirmed via search: Tencent Sports (腾讯体育) NBA schedule uses "vs" between team names |
| zh_TW | vs | Same convention as zh_CN, Taiwan sports media follows same "vs" pattern |

**Pattern that emerged**: continental Europe (de/fr/it/pt_PT) → hyphen; East/Southeast Asia (ja/ko/zh_CN/zh_TW/fil) → "vs"; pt_BR is the one true outlier with its own iconic "x"; es converges on "vs." (with period); only en keeps the literal US "@".

## guide.bandGames / guide.bandFavorites (plural objects)
Followed [[reference-plural-object-convention]] mechanically. `bandGames` reused each locale's already-established "game" noun (Spiel/partido/laro/match/partita/試合/경기/jogo/场比赛/場比賽). `bandFavorites` is an IDIOM ADAPTATION, not a literal translation — English "N of yours" (colloquial possession) was rendered as "N favorite(s)" in every other locale (Favorit/favorito/paborito/favori/preferita/お気に入り/응원팀/收藏), reusing each locale's already-established "favorite team" vocabulary from `powerScore.favoriteTeamsInMatchup` and `teamPicker.yourFavorites` (see [[project-favorite-teams-settings-translations]]) rather than attempting a literal "yours" which doesn't translate as a short appended band label in most languages.

- **it**: `bandFavorites` uses feminine adjective forms (`1 preferita` / `$1 preferite`) agreeing with `partita`/`partite` (feminine), matching the established gender of the sport-noun even though the noun itself doesn't appear in this specific string.
- **ko**: `bandFavorites` = "내 팀 1경기" / "내 팀 $1경기" (lit. "my team, 1/N game(s)") — no possessive particle (의), matching this file's established terse-label style (`매치업에 응원팀 1팀` also omits it).
- **ja**: `bandFavorites` uses generic counter 件 rather than repeating 試合, to avoid the counter appearing twice when concatenated with `bandGames` behind a "·" (e.g. "5試合 ・ 2件がお気に入り").

## guide.empty — idiom adaptation, TV-guide pun preserved where possible
English "Nothing on today" is itself a TV-listings idiom ("nothing on TV"). Adapted per language rather than translated literally, several deliberately reaching for the TV/programme-guide connotation:
- de: "Heute läuft nichts." (nothing's running/showing today — TV-idiom register, "was läuft heute?")
- es: "Hoy no hay nada en cartelera." ("cartelera" = programme listing/bill, direct idiom match)
- fr: "Rien à l'affiche aujourd'hui." ("à l'affiche" = on the bill — direct idiom match, very natural)
- it: "Niente in programma oggi."
- zh_CN/zh_TW: "今天没什么好看的。"/"今天沒什麼好看的。" ("nothing good to watch today" — captures "nothing on" better than a literal "no games")
- fil/ko/pt_BR/pt_PT/ja are more plainly stated ("Walang laro ngayon.", "오늘은 경기가 없네요.", "Nada rolando hoje." [BR slang, "nothing going on"], "Hoje não há jogos.", "今日は試合がお休みです。")

## guide.loading — matched each locale's exact `teamPicker.loading` ("Loading teams…") structure/register
Reused the identical grammatical pattern already shipped for that string (gerund/passive/counter construction), substituting "today's games" for "teams". zh_CN/zh_TW use **double ellipsis** (`……`, two U+2026 chars) per that locale's own established convention (matches `teamPicker.loading` = "加载球队中……" / "載入球隊中……"), all other locales use a single `…`.

## guide.favoriteGame (screen-reader-only aria-label)
Translated with slightly more explicit "favorite team" wording than English's terse "One of your teams", since screen-reader users don't have the star icon's visual context. Reused each locale's established "favorite team" noun phrase. zh_CN uses 您 (formal), zh_TW uses 你 (informal) per [[project-zh-tw-terminology]]/established register split. ja "あなたのお気に入りチーム" confirmed against existing あなたの-usage in ja.json (not invented — this possessive construction already appears in-file).

## Mechanics note
Verified byte-for-byte lossless `json.dumps` round-trip on all 12 files BEFORE editing (this is worth re-verifying on any future locale-file edit rather than assuming — it happened to hold here but isn't guaranteed if a file ever picks up unusual formatting). Post-edit verification: all 12 valid JSON, identical CRLF-only line endings (0 bare LF), en.json still lacks trailing newline while the other 11 have it, and top-level/`main`/`guide` key sets are identical across all 12 locales.

Related: [[reference-locale-file-mechanics]], [[reference-plural-object-convention]], [[project-favorite-teams-settings-translations]], [[project-zh-tw-terminology]].
