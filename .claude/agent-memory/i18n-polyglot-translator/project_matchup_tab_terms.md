---
name: matchup-tab-terms
description: Chosen (not yet reviewed by Ryan) terms for the pre-game Matchup tab (detail.tab*/form*/stat*/injury*/tickets* keys) per locale, and the locale file round-trip recipe
metadata:
  type: reference
---

Added 2026-10-02 (42 keys after detail.leaderReceiving). Form letters follow each file's existing standings.draws value (zh_TW draws is 平, not ties 和).

- de: S/N/U, "Duell", injuries Fällt aus/Unwahrscheinlich/Fraglich/Tag für Tag, none "Alle topfit"
- es (LatAm): G/P/E, "Duelo", "Boletos", Jonrones, none "Salud de hierro"
- fr: V/D/N, "Duel", Sup. num. %/Inf. num. %, none "Infirmerie vide"
- it: V/P/N, "Sfida", none "Infermeria vuota", CTA "Vuoi esserci dal vivo?"
- pt_BR: V/D/E, "Dúvida" for questionable, "Enfermaria vazia"; pt_PT: same letters, Golos/Remates/Bilhetes/"desde"
- ja: 勝/敗/分, rank "{rank}位", daysRest "休養1日", none "全員ピンピン"; full-width ？
- ko: 승/패/무, "직관하러 갈까요?", rank "{rank}위"
- zh_CN/zh_TW: 胜负平 / 勝負平, rank 第{rank}位 / 第{rank}名, none 全员满血 / 全員滿血; PP/PK 多打少%/少打多%
- fil (Taglish): English stat labels, Doubtful "Malabo", none "Fit lahat!"

Write recipe: json.loads(object_pairs_hook=OrderedDict) then json.dumps(ensure_ascii=False, indent='\t') with \n -> \r\n round-trips locale files losslessly (all 12 end in CRLF except en.json).
