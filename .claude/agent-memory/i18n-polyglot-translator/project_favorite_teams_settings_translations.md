---
name: project-favorite-teams-settings-translations
description: Approved translations for the new setup.groupFavorites/groupFavoritesDesc/followedTeams/keywordsFavoriteTeams + teamPicker.yourFavorites/leagueNotTracked keys (favorites settings drill-down), added 2026-09-05, across all 11 non-English locales
metadata:
  type: project
---

Added 6 keys for the new "Favorite teams" settings group (`settingsCatalog.ts` confirms: `settingsGroups` has a `favorites` entry with `labelKey: 'setup.groupFavorites'`/`descriptionKey: 'setup.groupFavoritesDesc'`, and `settingsEntries` has `{ group: 'favorites', labelKey: 'setup.followedTeams', keywordsKey: 'setup.keywordsFavoriteTeams' }` alongside the pre-existing `favoriteTeamBonus.label` entry — so `followedTeams` is literally the catalog label for the team-picker search result, distinct from the group header `groupFavorites`).

**Key insight used throughout:** each locale already had an established "favorite team(s)" noun phrase from `powerScore.favoriteTeamsInMatchup`/`teamPicker.explainer`/`stepLeaguesFavorites.tabFavorites` — reused verbatim for `groupFavorites` rather than inventing new vocabulary. Also reused each locale's own "tracked" verb from `setup.groupLeaguesDesc`/`leaguesExplainer` (already documented per-locale) for `leagueNotTracked`, since the two concepts (league-tracking vs team-following) are adjacent settings on the same drill-down.

## Approved strings
| Locale | groupFavorites | groupFavoritesDesc | followedTeams | yourFavorites | leagueNotTracked |
|---|---|---|---|---|---|
| de | Lieblingsteams | Welche Teams du favorisierst und was das an Punkten bringt. | Deine favorisierten Teams | Deine Favoriten | {league} · nicht verfolgt |
| es | Equipos favoritos | Los equipos que sigues y cuánto suman tus favoritos. | Equipos que sigues | Tus favoritos | {league} · no seguida |
| fil | Mga Paboritong Team | Kung anong mga team ang paborito mo, at gaano karaming bonus points ang idinaragdag nito. | Mga Team na Na-star Mo | Mga Paborito Mo | {league} · hindi tine-track |
| fr | Équipes favorites | Les équipes que tu suis et ce que rapporte un favori. | Équipes que tu suis | Tes favoris | {league} · non suivie |
| it | Squadre preferite | Le squadre che segui e quanto vale una preferita. | Squadre che segui | I tuoi preferiti | {league} · non monitorata |
| ja | お気に入りチーム | お気に入りチームと、それがもたらす加点。 | お気に入りチーム一覧 | マイお気に入り | {league} · 未追跡 |
| ko | 응원팀 | 응원하는 팀과 응원팀이 받는 보너스 점수예요. | 응원 중인 팀 | 내 응원팀 | {league} · 추적 안 함 |
| pt_BR | Times favoritos | Quais times você segue e quanto rende ter um favorito. | Times que você segue | Seus favoritos | {league} · não monitorada |
| pt_PT | Equipas favoritas | As equipas que segues e quanto rendem os teus favoritos. | Equipas que segues | Os teus favoritos | {league} · não monitorizada |
| zh_CN | 收藏球队 | 您关注的球队，以及收藏能加多少分。 | 您关注的球队 | 您的收藏 | {league} · 未追踪 |
| zh_TW | 收藏球隊 | 你關注的球隊，以及收藏能加多少分。 | 你關注的球隊 | 你的收藏 | {league} · 未追蹤 |

`keywordsFavoriteTeams` per locale (comma-separated search-alias list, not user-visible prose, ASCII-stripped where the file's convention already strips accents — de/es/fr/it/pt_BR/pt_PT):
- de: `stern, markiert, folgen, verein, franchise, team wählen, mein team, favorit`
- es: `estrella, destacado, seguir, club, franquicia, elegir, mi equipo, favorito`
- fil: `paborito, star, na-star, sundan, club, franchise, pili, team ko`
- fr: `etoile, suivre, suivi, club, franchise, choisir, mon equipe, favori`
- it: `stella, seguire, seguito, club, franchise, scegliere, la mia squadra, preferita`
- ja: `スター, フォロー, クラブ, 球団, 選択, マイチーム, お気に入り`
- ko: `별표, 즐겨찾기, 팔로우, 응원, 구단, 마이팀, 응원팀`
- pt_BR: `estrela, seguir, marcado, clube, franquia, escolher, meu time, favorito`
- pt_PT: `estrela, seguir, marcada, clube, franquia, escolher, a minha equipa, favorita`
- zh_CN: `星标, 收藏, 关注, 俱乐部, 选择, 我的球队`
- zh_TW: `星標, 收藏, 關注, 俱樂部, 選擇, 我的球隊`

## Notable judgment calls
- **"·" separator kept literal in every locale**, including CJK. Grepped all 12 files for any prior "·" usage before deciding — there was none (this is the first string to use it), so no established full/half-width convention existed to defer to; treated it the same as en.json's own literal middot rather than swapping in a CJK-specific separator.
- **ja: no フォロー ("follow") loanword existed anywhere in ja.json before this** (checked by grep) — kept using the already-established お気に入り vocabulary for everything except the `keywordsFavoriteTeams` search-alias list, where フォロー was added as one alias among several since a user might actually type it, without introducing it into any user-visible prose string.
- **zh_CN/zh_TW: confirmed 关注/關注 ("follow") already exists in-file** (`keywordsFavoriteBonus`, `standbyGuide.subtitle`, `standbyGuide.quietBody`) as an established synonym for the favoriting concept — reused it directly for `groupFavoritesDesc`/`followedTeams` rather than inventing a new verb, and it happens to mirror the exact phrase pattern already in `quietBody` ("您/你关注的所有比赛").
- **ko: `followedTeams` = "응원 중인 팀"** deliberately echoes `gameCard.favorited` = "응원 중" (already-shipped string) for an internal-consistency callback, rather than a fresh phrasing.
- **fil: `followedTeams` = "Mga Team na Na-star Mo"** applies the file's established `na-` completed/passive-prefix convention (na-save, na-load, na-detect per [[locale-fil-terminology]]) to the app's actual star-icon UI action, rather than a more literal "sinusubaybayan" (tracked/monitored) which would have collided semantically with the leagues-tracking concept.
- **es/it/pt_BR/pt_PT `leagueNotTracked`**: used each locale's existing feminine adjective form of its "tracked" verb (`seguida`/`monitorata`/`monitorada`/`monitorizada`) agreeing with the implicit unstated noun "liga/lega/equipa" even though `{league}` substitutes a proper noun (NBA, Premier League, etc.) — judged as reading naturally (badge convention, not a full sentence) rather than switching to a gender-neutral noun construction; not independently re-verified against real native UI, flag if it's ever questioned.
- **Comma-before-conjunction consistency check**: before finalizing each `groupFavoritesDesc`, checked whether that locale's existing `groupScoringDesc` uses a comma before "and"/"et"/"und"/"y" etc. — de/es/fr/it/pt_BR/pt_PT/ko do NOT comma-separate their two clauses; zh_CN/zh_TW/ja/fil DO. Followed each locale's own established punctuation habit rather than a single global rule.

## Mechanics
Used the round-trip script pattern from [[reference-locale-file-mechanics]] (`json.loads`/`json.dumps` with `OrderedDict`, tab indent, `\n`→`\r\n` replace, trailing-newline preserved per file's existing state) rather than the byte-level `bytes.replace()` technique — this was safe here because insertion is a clean "insert new key after an existing key" operation on parsed structures rather than an in-place edit of an existing value, so there was no risk of the Edit tool's whitespace-matching failures. Verified after: `json.loads` succeeds, CRLF count matches line count with zero bare LF, trailing-newline state unchanged, key-order/key-set equality against `en.json` at `setup`/`teamPicker`/top level, and `git diff` showing zero removed content lines (only the 12 standard `--- a/...` diff headers) across all 12 locale files — confirming the pre-existing dirty state of these files (from unrelated in-flight work, e.g. a `field.*` object) was left completely untouched.

Related: [[reference-locale-file-mechanics]], [[project-settings-drilldown-review]], [[project-zh-tw-terminology]], [[locale-fil-terminology]], [[project-ko-terminology]].
