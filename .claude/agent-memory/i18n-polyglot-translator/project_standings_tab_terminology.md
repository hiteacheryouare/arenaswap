---
name: project-standings-tab-terminology
description: Approved detail.tabOverview/tabStandings and the standings.* column-header namespace across all 11 non-English locales (2026-09-20)
metadata:
  type: project
---

Added a "Standings" tab to the game detail screen (`detailTabs.tsx`, `.gd-tabs`, three
nav-underline tabs sharing 320px, bold 0.64rem, ~100px each). Benchmarked against the
pre-existing `box.heading` tab label ("Boxscore" = 8 Latin chars, "ボックススコア" = 7 full-width
chars, both known to fit) rather than measuring fresh — good enough for tab chrome, not worth a
Cypress width harness the way [[reference_locale_file_mechanics]]'s two real width tests are.

**Method that mattered most:** for the column-abbreviation keys (wins/losses/ties/draws/
winPercent/gamesBehind/otLosses/points/soccerPoints/gamesPlayed/goalDifference), web-searched
each language's *actual domestic standings table* (Bundesliga, Ligue 1, Serie A, LaLiga,
Brasileirão, Primeira Liga, CPBL, CBA/CSL, NPB, KBO) AND, where it exists, ESPN's own localized
sister site or the NHL's own official localized page — since ESPN is literally this app's data
source, its own Spanish/Portuguese conventions are the single best precedent available.

**Confirmed via ESPN Deportes/ESPN Brasil/NHL.fr directly (not inferred):**
- ESPN Deportes NBA: `G`/`P` for wins/losses (not W/L), `PCT` kept English, `JD` (Juegos de
  Diferencia) for games behind. ESPN Deportes NHL: `DTE` (Derrotas en Tiempo Extra) for OT losses
  — translated, not kept as "OTL".
- ESPN Brasil NBA: `V`/`D`, `PCT` kept English, `JA` (jogos atrás) for games behind.
- NHL.fr (NHL's own official French page): `PJ`/`V`/`D`/`DP` (défaite en prolongation)/`Pts`/
  `DIFF` — confirms hockey standings in French use the generic `V`/`D` (victoires/défaites),
  not Ligue 1's football-specific `G`/`N`/`P` (gagnés/nuls/perdus). Since the `wins`/`losses` key
  is shared across every sport, the generic V/D wins over the football-specific G/N/P.
- Spanish/Italian/Portuguese `G`/`P`, `V`/`P`, `V`/`D` are each confirmed to be the SAME generic
  word for win/loss in ANY sport in that language (no football-specific alternate lexicon like
  French has) — so no bifurcation issue for those three.

**Full approved table** (wins/losses/ties/draws/winPercent/gamesBehind/otLosses/points/
soccerPoints/gamesPlayed/goalDifference/conference/overall):
- **de**: S/N/U/U/PCT/GB/OTL/PKT/Pkt/Sp/TD/Conf./Gesamt — `PKT` (all-caps) for hockey points
  matches the file's own pre-existing `detail.leaderHockeyPoints`="PKT"; `Pkt` (mixed case) for
  soccer points matches the authentic Bundesliga "Pkt." — German is the one locale that already
  had this internal precedent to match, worth checking for any language before inventing fresh.
- **es**: G/P/E/E/PCT/JD/DTE/Pts/Pts/PJ/DG/Conf./General
- **fil**: W/L/T/D/PCT/GB/OTL/PTS/P/GP/GD/CONF/OVERALL — literal copy of en's abbreviations.
  Column abbreviations never get expanded/translated in fil per [[locale_fil_terminology]];
  PBA/UAAP broadcasts show these in English regardless.
- **fr**: V/D/N/N/PCT/GB/DP/Pts/Pts/J/Diff/Conf./Total
- **it**: V/P/N/N/PCT/GB/OTL/Pt/Pt/PG/DR/Conf./Totale — kept `OTL` English (no Italian NHL
  localization found, unlike French); `Pt` (Serie A's own) for both points keys since Italian
  hockey has no attested domestic convention either way.
- **ja**: 勝/敗/分/分/勝率/差/OTL/勝点/勝点/試合/得失点差/カンファレンス/全体 — `分` serves both
  ties and draws (NPB baseball genuinely has tie games, scored 分 same as J.League draws).
- **ko**: 승/패/무/무/승률/게임차/OTL/승점/승점/경기/득실차/컨퍼런스/전체 — KBO's own site
  (scorebase.kr) confirmed 경기수/승/패/무/승률/게임차 verbatim.
- **pt_BR**: V/D/E/E/PCT/JA/OTL/Pts/Pts/PJ/SG/Conf./Geral — `SG` (Saldo de Gols) confirmed
  Brasileirão-specific.
- **pt_PT**: V/D/E/E/PCT/JA/OTL/Pts/Pts/J/DG/Conf./Geral — diverges from pt_BR on `gamesPlayed`
  (`J` not `PJ`) and `goalDifference` (`DG` not `SG`), both confirmed via Primeira Liga's own
  site — a genuine, sourced BR/PT split, not a stylistic guess.
- **zh_CN**: 胜/负/平/平/胜率/胜差/OTL/积分/积分/场次/净胜球/联盟战绩/总战绩
- **zh_TW**: 勝/負/**和**/**平**/勝率/勝差/OTL/積分/積分/出賽/淨勝球/聯盟戰績/總戰績 — the one
  locale that genuinely distinguishes ties from draws: CPBL's own site confirmed 和 for a
  baseball tie, distinct from CSL's 平 for a soccer draw. Every other locale collapses the two
  to the same value per the task's own allowance.

`otLosses` (OTL) has no confirmed domestic convention outside French (DP) and Spanish (DTE) —
kept as the bare English loanword everywhere else (de/it/ja/ko/pt_BR/pt_PT/zh_CN/zh_TW/fil),
consistent with how [[project_box_namespace_terminology]] already keeps NHL-specific box stats
(PIM/TOI/GA/SA/SV/SV%) in English across every locale that isn't zh.

**Tab labels** (`detail.tabOverview`/`tabStandings`): de Übersicht/Tabelle, es Resumen/Tabla,
fil Overview/Standings (English, PBA convention), fr Aperçu/Classement, it Panoramica/Classifica,
ja 概要/順位表, ko 개요/순위, pt_BR Resumo/Tabela, pt_PT Resumo/Classificação, zh_CN 概览/排名,
zh_TW 總覽/排名 — zh_CN/zh_TW deliberately chose the sport-agnostic 排名 ("ranking") over a
soccer-flavored 积分榜/積分榜 ("points table") since the tab serves baseball/basketball/American
football standings too, which don't have a points system.

`groupForTeam` ("{group} — {team}") kept the Latin em dash unchanged in every locale including
CJK — both placeholders are ESPN API values (league/team codes, always Latin script), so the
CJK full-width-punctuation convention in [[reference_cjk_punctuation_and_spacing]] doesn't apply
here (that rule is about Han meeting Latin, not Latin meeting Latin).

Related: [[project_box_namespace_terminology]], [[reference_locale_file_mechanics]],
[[locale_fil_terminology]], [[project_zh_tw_terminology]], [[project_ko_terminology]]
