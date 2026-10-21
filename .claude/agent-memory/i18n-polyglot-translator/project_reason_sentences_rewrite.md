---
name: project-reason-sentences-rewrite
description: 2026-10-20 rewrite of powerScore.reason* "reason for switching" strings (66 keys + fantasy.statJoiner) for 11 locales; team-name grammar rules, joinWhen order per locale, French ordinal workaround
metadata:
  type: project
---

Merged into locales/ in 994bd59e; the drafts in temporary/ were scratch. Plain facts, no jokes (Ryan's ask).

**Team-name rule:** {team} is a bare proper noun, singular or plural, so no conjugated verb on it. Used nominal/colon/participle forms everywhere ("Lakers arriba por 7", "Ausgleich durch {team}", "Une victoire suffit à {team}"). French also avoids "de {team}" (elision before vowels, "d'Atlanta").
**Unit-free scoring:** English "scored N straight" and "up N" have no unit (goals/points/runs). Translated scoredStraight as "{count}–0" run in every locale; Leads in hockey and soccer use their own keys, reasonScoreLeadGoals / reasonScoreUpGoals (state params carry unit: goal), so zh_CN/zh_TW say "球" there and "分" elsewhere; other locales copy the points string.
**joinWhen order:** de/es/fr/it/pt "{sentence} {when}"; fil "{sentence}, {when}"; ja/zh "{when}、/，{sentence}"; ko "{when} {sentence}".
**French ordinals:** never "{ordinal}e". Cardinal after noun: "quart-temps 3", "période 2" (also for halves), "manche 9", "minute 88". Only overtimeNumbered uses "à la {ordinal}e prolongation" because the engine guarantees >=2.
**Minutes:** es/fr/pt use "minuto {ordinal}" (cardinal, no marker); de "{ordinal}. Minute"; it "{ordinal}° minuto"; ja "{ordinal}分"; baseball ja "{ordinal}回表/裏" (no 第).
**zh spacing:** reason* keys keep no space around placeholders (matches the existing reason* namespace), except fantasyPlayersInGame which mirrors "您的 1 名球员".
**Vocab picked:** parcial (es/it/pt, basketball run), series/clinch phrased as "a une victoire de", hockey shootout = Shootout (es/it/pt), Penaltyschießen (de), Tirs de barrage (fr).
