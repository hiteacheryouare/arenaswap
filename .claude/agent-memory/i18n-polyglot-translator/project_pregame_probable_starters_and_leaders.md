---
name: project-pregame-probable-starters-and-leaders
description: Approved detail.probablePitchers/probableGoalies/starterConfirmed/starterExpected/teamLeaders/leader* (17 keys) translations across all 11 non-English locales, added 2026-08-27
metadata:
  type: project
---

Added 17 new `detail` keys (probable-starter headings, per-player confirmed/expected status, and 12 team-leader stat-column labels) to all locales, inserted immediately after `pregameTabExplainer`. Renders via `apps/extension/entrypoints/popup/components/pregameStats.tsx` and `pregameLabels.ts`. Extends [[project_pregame_gameinfo_translations]].

## Key finding: this app mirrors ESPN's own localized sites, not domestic leagues

The "team leaders" widget is ESPN's pregame concept (probable pitchers/goalies, per-team stat leaders). Verified via web search that **ESPN Deportes and ESPN Brasil display NBA/MLB/NHL stat labels as literal English abbreviations** (PTS/REB/AST, AVG/HR/RBI, G/A/PTS) even in fully Spanish/Portuguese pages — this is the right reference frame for this app, not domestic leagues (Liga ACB, LNB, Serie A) which sometimes differ. **How to apply:** when adding future ESPN-sourced stat/label strings, check espndeportes.com / espn.com.br / nba-jp.com / bleague.jp box scores first, before assuming a domestic federation's own vocabulary applies.

## Verified per-sport stat-label rulings (all confirmed via web search of real broadcasters/federations, not guessed)

- **Basketball (PTS/REB/AST)**: kept literal English in de (BBL box scores literally show PTS/REB/AST), es (ESPN Deportes), fr (LNB's own official stat sheets use Pts/Reb/Ast), it, pt_BR, pt_PT, fil, ja (B.League official box score uses English PTS/REB/AST, confirmed at bleague.jp/glossary), ko. **zh_CN/zh_TW are the outlier**: Sina Sports/CBA use full native terms (得分/篮板/助攻, 得分/籃板/助攻), not English letters — matches the project's already-established zh preference for translating over retaining loanwords (see [[project_zh_tw_terminology]]).
- **Baseball (AVG/HR/RBI)**: kept literal English almost everywhere, INCLUDING languages with real native vocabulary — Italian FIBS's own official abbreviation for home run is literally "HR" despite the native word "fuoricampo" existing (confirmed via fibs.it search); Brazilian beisebol sources confirm "essas abreviações (HR, RBI, AVG) são padrão no beisebol brasileiro." Applied to de/es/fr/it/pt_BR/pt_PT/fil/ja/ko. **zh_CN/zh_TW again native**: 打击率/全垒打/打点 (simplified), 打擊率/全壘打/打點 (traditional) — confirmed as CPBL's own official leaderboard terms (cpbl.com.tw).
- **Hockey (leaderGoals/leaderHockeyAssists/leaderHockeyPoints)**: **de is the one real divergence** — NHL.com/de's own official glossary uses **T** (Tore), **V** (Vorlagen), **Pkt→PKT** (Punkte), not G/A/PTS. Verified directly from nhl.com/de. fr also has an official NHL.com/fr divergence (**B**/Aides→**A**/Pts) confirmed from NHL's own French stats glossary — used **B** for `leaderGoals` (works for soccer too, since French "buts" covers both sports under the shared key). All other locales (es, it, pt_BR, pt_PT, fil, ja, ko) confirmed or inferred G/A/PTS literal (ESPN Deportes NHL page explicitly shows G/A/PTS even in Spanish). zh_CN/zh_TW native again: 进球/助攻/得分 (简体), 進球/助攻/得分 (繁體) — reuses the same characters as soccer's goals and basketball's assists/points respectively, which is fine because en.json itself reuses "PTS" for both leaderPoints and leaderHockeyPoints on purpose (two keys, same string, by design).
- **Football (leaderPassing/leaderRushing/leaderReceiving)**: **PASS/RUSH/REC kept 100% literal in all 11 locales, no exceptions, including zh_CN/zh_TW.** NFL has no domestic league with an established compact native abbreviation in any of these markets (unlike baseball/basketball where zh has CPBL/CBA to draw on) — a Zhihu NFL glossary explains these stats via English terms rather than replacing them, confirming there's nothing to translate to.

## House style decision: stat-abbreviation labels are ALL CAPS across every locale

Real French sources (LNB, NHL.com/fr) actually print these in title case (`Pts`, `Reb`, `Ast`, `B`, `A`). Deliberately overrode to ALL CAPS (`PTS`, `REB`, `AST`) for internal consistency with the existing `gameCard.live`/`WATCHING`-style badge convention (see [[reference_locale_status_badge_treatment]]) — this app already renders short compact status/stat text in full caps everywhere regardless of a locale's own real-world case convention. Apply this override to any future short capitalized stat/badge label.

## Heading and status-word translations (not width-gated — only the 12 `leader*` keys are checked by the Cypress width test; `probablePitchers`/`probableGoalies`/`teamLeaders` share the `.gd-setup-heading` CSS class but are NOT in the test's hardcoded key list)

| Locale | probablePitchers | probableGoalies | teamLeaders | Confirmed / Expected |
|---|---|---|---|---|
| de | Voraussichtliche Pitcher | Voraussichtliche Torhüter | Team-Topspieler | Bestätigt / Erwartet |
| es | Abridores probables (real MLB-en-español term, verified via ESPN Deportes/Yahoo Deportes) | Porteros probables (verified — ESPN Deportes itself says "porteros" for NHL goalies) | Líderes del equipo | Confirmado / Previsto |
| fr | Lanceurs probables (lanceur = real FFBS term) | Gardiens probables (gardien de but = real French federation term) | Leaders d'équipe (bebasket.fr itself headlines "leaders en points" — "leader" is an assimilated French sports loanword) | Confirmé / Pressenti |
| it | Lanciatori probabili (lanciatore = real FIBS term) | Portieri probabili (FISG itself says "portiere titolare") | Leader di squadra | Confermato / Previsto |
| pt_BR | Arremessadores prováveis (matches established arremessar/arremessador split, see [[project_pregame_gameinfo_translations]]) | Goleiros prováveis | Líderes do time | Confirmado / Esperado |
| pt_PT | Lançadores prováveis (matches established lançar/lançador split) | Guarda-redes prováveis | Líderes da equipa | Confirmado / Esperado |
| fil | Mga Posibleng Pitcher | Mga Posibleng Goalie | Mga Lider ng Koponan | Nakumpirma / Inaasahan |
| ja | 先発投手 (deliberately NOT 予告先発 — that NPB-specific term means "officially announced," which would misrepresent the "Expected/unconfirmed" state; the per-player 確定/予想 badge carries that distinction instead, general heading stays neutral, mirrors real Japanese MLB-preview usage) | 先発ゴーリー (ゴーリー confirmed as the real Japanese ice-hockey-specific loanword, distinct from soccer's ゴールキーパー) | 主要選手 ("key/main players" — avoided a literal リーダー calque since that reads as leadership/captaincy in Japanese, not "stat leader") | 確定 / 予想 |
| ko | 선발 투수 | 선발 골리 | 주요 선수 (parallels ja's choice) | 확정 / 예상 |
| zh_CN | 先发投手 | 先发守门员 | 主力球员 | 确认 / 预计 |
| zh_TW | 先發投手 | 先發守門員 | 主力球員 | 確認 / 預計 |

Register/gender notes: all Romance-language Confirmed/Expected values use the default masculine form (pitcher/goalie nouns are masculine in es/fr/it/pt) since these are standalone status labels, not attributive adjectives modifying a stated noun.

## Mechanics used (validates [[reference_locale_file_mechanics]] recipe end-to-end)

Wrote a Python script doing byte-level `bytes.find`/`.replace()` per locale (not `json.dump`), asserted the exact tail bytes after `pregameTabExplainer`'s value (`\r\n\t},\r\n`, since it was the last key in `detail` in all 12 files before this change) before replacing, then re-verified per file: `json.loads` succeeds, CRLF count rose by exactly 17, bare-LF count is 0, trailing-newline state unchanged, and `detail` key order after `pregameTabExplainer` matches the 17-key list exactly. Also cross-checked all 12 locales' full `detail` key list/order against `en.json` programmatically (not just the new keys) — all matched. Ran the actual `cypress/component/pregameDetail.cy.tsx` spec (`npx cypress run --component --spec cypress/component/pregameDetail.cy.tsx` from repo root, since Cypress only exists in the root `node_modules`, not `apps/extension/node_modules`) — all 25 tests passed including "fits every locale leader label in the centre column."
