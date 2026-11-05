---
sourceHash: '9c4dba756b81'
title: Mga boost at penalty ng PowerScore
navLabel: Mga boost at penalty
description: Bawat boost at penalty na inilalapat ng PowerScore 3 sa ibabaw ng mga signal ng mode, kasama ang kondisyong nagpapagana sa bawat isa, ang maximum nito, at ang mga cap na pinagsasaluhan nila.
section: powerscore
order: 4
---

Sinusukat ng mga signal kung paano ang takbo ng laro. Ang mga boost at penalty ang bahala sa mas maliliit na bagay na hugis-sandali na hindi nakikita ng mga signal: runner sa third sa 9th, hinugot na goalie, pregame underdog na buhay pa. Nakapatong sila sa mga signal at hindi kailanman pumapalit sa alinman.

Walang binabayaran ang boost habang hindi live ang laro (`status: 'in'`) o habang nakatigil ang laro sa halftime, intermission o delay. Kinukuwenta ulit ang bawat isa mula sa kasalukuyang game state sa bawat tawag, kaya walang kailangang i-clear kapag lumipas ang sandali.

Lumalabas sa `score.boosts` ang bawat boost na binabayaran ng mode bilang `{ id, points, meta?, details? }`, kung saan hawak ng `details` ang mga reason fragment na naglalarawan dito, at `0` kapag hindi ito nagbabayad. Hanapin ang isa gamit ang `boostPoints(score, 'noHitter')`.

## Aling mode ang may aling boost

| Mode | Mga boost |
|---|---|
| Classic | Lahat ng boost sa pahinang ito, kasama ang win probability modifier at ang bawas sa commercial break |
| Blowouts | No-hitter at Upset Rout, kasama ang bawas sa commercial break. Walang postseason boost, dahil tapos na ang resulta ng playoff blowout. |
| Fantasy | Wala, at walang bawas sa break |

Ang mga favorite, postseason at manual na boost sa [ibaba ng pahina](#favorite-postseason-and-manual-boosts) ay nalalapat sa bawat mode, maliban na nilalaktawan ng Blowouts ang postseason boost.

## Mga moment boost ng Classic

| Boost | Id | Binabayaran para sa | Max |
|---|---|---|---|
| [Scoring opportunity](#scoring-opportunity) | `scoringOpportunity` | Mga runner sa base, drive sa football na nasa loob ng red zone, o power play o empty net sa hockey | 20 |
| [Go-ahead run](#go-ahead-run) | `goAheadRun` | Ang go-ahead o tying run sa base sa baseball at softball | 10 |
| [Two-minute drill](#two-minute-drill) | `twoMinuteDrill` | Football team na hawak ang bola, tabla o nahuhuli ng isang score, sa huling mga minuto | 12 |
| [Red card](#red-card) | `redCard` | Pagpapalayas sa tabla o isang goal ang pagitan na soccer match | 15 |
| [No-hitter](#no-hitter) | `noHitter` | Laro sa baseball o softball na may team pa ring walang hit | 70 |
| [Upset watch](#upset-watch) | `upsetWatch` | Ang pregame underdog na lamang o isang score lang ang layo | 12 |
| [Stakes](#stakes) | `stakes` | Serye sa bingit, dalawang ranked na team, karera sa huling bahagi ng season | 10 |

Bawat boost ang may ganyang maximum. Ang susunod na seksyon ang dahilan kung bakit hindi sila nagsasama-sama nang lahat.

## Mga cap sa mga bucket

Nagsasalo ng mga cap ang mga boost, kaya hindi maitutulak ng sabay-sabay na maraming maliliit na pangyayari ang laro sa lampas ng makukuha ng isang score na swing sa huling minuto.

| Bucket | Cap | Ano ang nasa loob | Bakit |
|---|---|---|---|
| Moments | 20 | Scoring opportunity, go-ahead run, two-minute drill, red card | Mga 80 ang score ng tabla sa buzzer bago ang mga boost, kaya ang buong moment ay aabot sa 100. Ang isang score sa huling minuto ay bumabagsak sa mataas na 80s, at hindi lahat ng dikitang laro ay sumasagad sa 100. |
| No-hitter | 70 | No-hitter | Inning ang tagal ng bid, hindi sandali, at kailangan nitong iangat ang 6-0 na laro lampas sa mga tabla. |
| Context | 16 | Upset watch, stakes | Puwede silang sabay mangyari (ranked na underdog), pero magkasama pa rin silang nananatili sa ibaba ng late na isang-score na swing, kaya hindi nananaig ang context sa live na aksyon. |

Sa loob ng bucket, unang binabayaran ang mga boost na nauuna sa table sa itaas, at pinuputol ng cap ang matitira. Walang bucket ang Upset Rout, ang bersyon ng upset watch ng Blowouts.

## Scoring opportunity

Banta sa pag-score na hindi pa ipinapakita ng score mismo.

**Baseball at softball**, ayon sa bilang ng runner:

| Mga runner sa base | Boost |
|---|---|
| Wala | 0 |
| Isa | 3 |
| Dalawa | 6 |
| Tatlo (puno ang bases) | 10 |

Walang binabayaran sa 3 out. Puwedeng manatili ang mga runner sa scoreboard nang isang poll pagkatapos ng huling out, at walang puwedeng mangyari sa kanila.

**Football**, nakadepende sa kung gaano na ka-dikit ang laro. Nalalapat lang ito kapag true ang `isRedZone`.

| Margin | Base value |
|---|---|
| Sa loob ng close band (football: 9 puntos) | 10 |
| Sa loob ng fringe band (14 puntos) | 5 |
| Lampas doon | 0 |

Tinitimbang ang base value ayon sa down:

| Sitwasyon | Multiplier |
|---|---|
| 4th down at goal-to-go | ×1.5 |
| 4th down (hindi goal-to-go) | ×1.35 |
| 3rd down, 3 yarda o mas kaunti ang kailangan | ×1.15 |
| Anupaman, kasama ang nawawalang `down` | ×1 |

Nananatiling `0` ang base value na `0` anuman ang down. Babawiin ng walang kondisyong boost sa ibabaw ng blowout ang tamang mababang score na naibigay na ng kalapitan at pressure sa huling yugto. Sa 4th down lang itinataas ng goal-to-go ang multiplier, dahil sa naunang down, tungkol ito sa tsansa ng score at hindi sa nagpapasya ng possession.

**Hockey** ay nagbabayad para sa [power play o empty net](#power-play-and-empty-net).

Ang mga exported na constant sa likod ng mga table na ito ay `scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` at `thirdAndShortDistance`.

### Power play at empty net

Ang scoring opportunity ng hockey. Parehong binabasa ang `context`, dahil galing sila sa situation feed at hindi sa scoreboard. Parehong nangyayari nang sabay ang 6-on-4, kaya nagsasama ang dalawa at ang moments cap ang humahawak sa kabuuan sa 20.

Nagbabayad ang **empty net** sa huling 4 na minuto ng 3rd period kapag isa o dalawang goal ang pagitan ng laro: **12** sa isang goal, **7** sa dalawa. Kapag sinasabi ng feed kung kaninong net ang walang laman, sa net lang ng team na nahuhuli ito nagbabayad. Ang empty net ng lamang ay ibig sabihin ay may delayed penalty, at ilang segundo lang ay balik na ang goalie. Itakda lang ang `context.emptyNet` kapag naiulat na ito ng feed sa dalawang magkasunod na poll, sa parehong dahilan.

Nagbabayad ang **power play** sa tabla at sa laro na isa o dalawang goal ang pagitan. Mas malaki ang bayad kapag late (3rd period o mas huli):

| Laro | Late | Mas maaga |
|---|---|---|
| Tabla | 10 | 4 |
| Isang goal, nasa team na nahuhuli ang man advantage | 10 | 4 |
| Isang goal, nasa team na lamang ito | 5 | 2 |
| Dalawang goal, nasa team na nahuhuli ito | 5 | 2 |
| Dalawang goal, nasa team na lamang ito | 0 | 0 |

Kapag sinasabi lang ng feed na may power play, pero hindi kung kanino, ipinapalagay ng boost na kasing-posible ng hindi na nasa team na nahuhuli ito at nagbabayad nang kaunting mas mababa: 7 o 3 sa isang goal, 3 o 2 sa dalawa.

## Go-ahead run

Baseball at softball. Kailangan ng `baseRunners`, `topOfInning`, `outs` at `period`. Nagbabayad ito sa ibabaw ng bilang ng runner sa itaas, at kapag nasa base lang ng batting team ang run na mahalaga:

| Nasa base | Bayad |
|---|---|
| Ang go-ahead run: tabla na may kahit sino sa base, nahuhuli ng isa na may dalawa sa base, nahuhuli ng dalawa na puno ang bases | 8 |
| Ang tying run: nahuhuli ng isa na may isa sa base, nahuhuli ng dalawa na may dalawa sa base, nahuhuli ng tatlo na puno ang bases | 5 |

Ang mas mataas na row lang ang nalalapat. Tinitimbang ang base value ayon sa inning:

- Bago ang 6th inning (5th sa softball), kalahati. Totoo ang banta sa 3rd, pero maraming inning pa ang laro para sagutin ito.
- Mula roon hanggang sa huling regulation inning, 50% pataas hanggang 100%.
- Extra innings, 100%.
- ×1.25 kapag huling pagkakataon na ito: ang home team na bumabatting sa huling inning o mas huli, kung saan ang go-ahead run ang winning run, o ang road team na nahuhuli sa top nito, na posibleng hindi na bumatting ulit.

10 ang maximum: 8 sa buong timbang, beses ang bump ng huling pagkakataon. Walang binabayaran sa 3 out.

## Two-minute drill

Football. Kailangan ng `possession`, `yardsToEndZone` at live na `down`. Nagbabayad sa 4th quarter at overtime, at sa team lang na hawak ang bola, at kung kaya pa nitong tumabla o manalo gamit ang isang score:

- **Tabla:** ang huling 2 minuto.
- **Nahuhuli ng isang score** (8 puntos, o 9 sa UFL, kung saan puwedeng 3 ang halaga ng try): ang huling 4 na minuto.

Walang binabayaran sa team na umuubos ng clock habang lamang. Wala rin sa NCAA o UFL na overtime, na walang game clock.

Ang 12 puntos ay isinasaayos ng apat na bagay: gaano kakaunti ang oras (buo sa 40 segundo), posisyon sa field (buo mula sa 35 ng kalaban, o 30 sa college, hanggang 40% sa sarili mong 20), natitirang timeout (85% kapag wala, 100% kapag tatlo, 92.5% kapag hindi sinasabi ng feed), at ang margin (buo kapag tabla o nahuhuli ng 1 o 2, lumiliit hanggang 70% sa nahuhuli ng 8). Sa pagitan ng mga play, pagkatapos ng score, nagpapadala ang feed ng down na walang kahulugan, at 0 ang bayad ng boost hanggang sa susunod na snap.

## Red card

Soccer. Kailangan ng `redCards`, listahan ng `{ side, minute }`. Ang red card sa tabla o isang-goal na match ang klase ng bagay na nagpapalipat sa fan, at pinakamalaki ang bayad pagkatapos mismo ng pangyayari:

| Kailan nangyari ang card | Bayad |
|---|---|
| Tabla, o lamang ng isa ang team na nakakuha ng card | 10 |
| Nahuhuli ng isa ang team na nakakuha ng card | 7 |
| Lamang ng dalawa ang team na nakakuha ng card | 5 |
| Anumang mas malawak | 0 |

Buo ang bayad sa loob ng 2 minuto ng laro, tapos humihina hanggang 0 pagdating ng ika-10. Ang pangalawang card para sa parehong team ay nagbabayad ng 1.5 beses na mas malaki, na siyang maximum na 15. Ichine-check ito ulit laban sa score sa bawat poll, kaya ang goal na nagbubukas sa laro ay nagtatapos agad sa boost.

**Kulang ng isang player.** Dinadagdagan din ng red card ang [Closeness](/arenaswap/docs/powerscore/signals/#closeness) ng 4 na puntos kapag ang team na kulang ng isang player ay ang nagpoprotekta ng isang-goal na lamang. Mas madalas silang natatalo kaysa sa buong team, kaya mas dikit ang laro kaysa sa sinasabi ng score. Nananatili ito hangga't ganoon ang sitwasyon, hindi lang sa loob ng sampung minuto.

## No-hitter

Baseball at softball. Kailangan ng `hits` sa bawat team, kasama ang `period` at `topOfInning`. Ang isang team na walang hit ay nagbabayad para sa **no-hit bid**, na nagsisimula nang huli at lumalaki sa bawat inning na walang hit:

- **Nagsisimula** pagkatapos ng ika-5 kumpletong inning ng 9-inning na laro, at pagkatapos ng ika-3 sa softball.
- **Umaakyat** sa bawat kumpletong inning na walang hit: 10, 22, 38, tapos 52 at nananatili. Habang nasa field ang pitching staff na hinahabol ang bid, nagdadagdag din ito ng puntos kada out, kaya patuloy itong lumalaki sa loob ng inning.
- **Bumababa** ng 30% habang nasa dugout ang staff na iyon, dahil walang nangyayari sa bid. Ang mga bid sa softball ay isinasaayos sa 60%.

Kapag parehong walang hit ang dalawang team, buo ang bayad sa mas malaking bid at kalahati sa isa. May sariling cap na 70 ang no-hitter, sa labas ng mga moment, dahil inning ang tagal ng bid at kailangan nitong iangat ang 6-0 na laro lampas sa mga tabla.

## Upset watch

Kahit anong sport. Kailangan ng `context.pregameLine`, at dapat ang line bago ang laro. Gumagalaw ang live na line kasabay ng score at buburahin nito mismo ang upset na sinusubukan mong makita.

Nagbabayad ito kapag lamang, patas, o isang score lang ang layo ng pregame underdog, kapag lampas na sa gitna ang laro. Tatlong bagay ang nagtatakda ng number, hanggang sa maximum na 12:

- **Odds.** Walang binabayaran ang laro na parang barya ang odds. Habang humahaba ang odds, mas malaki ang bayad, at buo ito para sa long shot. Gumagana ang moneyline sa anumang sport, at ang spread sa basketball at football. Ang draw sa soccer ay binibilang na kalahating upset.
- **Oras.** Wala bago ang gitna, kalahati mula sa gitna, at buo kapag late na ang laro (tatlong kapat sa basketball at football, dalawang katlo sa karamihan ng ibang sport).
- **Estado.** Buo kapag lamang ang underdog, 80% kapag patas (70% sa soccer), at kalahati kapag nahuhuli ng isang score o mas kaunti.

### Upset Rout

Ang bersyon ng Blowouts. Hindi lang nakikipagsabayan ang underdog: pinapalayas nito ang paborito sa field. Nagbabayad ito kapag lamang ang pregame underdog nang higit sa out-of-reach margin ng sport (18 puntos sa basketball, 14 sa football, 3 goal sa hockey at soccer, 5 run sa baseball), gamit ang parehong odds at oras na pagsasaayos ng upset watch at ang parehong maximum na 12.

## Stakes

Kung ano ang pinagpapasyahan ng resulta. 10 ang maximum, at isinasaayos ang number ayon sa kung gaano ka-dikit ang laro: buo sa loob ng close band ng sport, kalahati para sa laro na gilid ang margin o rout na nasa unang kalahati pa, at wala para sa rout na late na. Walang natitirang ipapasya sa Game 7 na tapos na ang resulta.

Pinaghihiwalay ang stakes ayon sa season para hindi nito madoble ang bilang sa postseason boost. Sa postseason, binabasa nito ang serye. Kung hindi, binabasa nito ang mga ranking at ang table.

| Stakes | Kailangan | Bayad |
|---|---|---|
| Serye sa bingit | `game.series`, postseason lang | 10 kapag parehong isang panalo na lang ang kulang ng dalawang team sa serye sa best of 7 (9 sa best of 5, 8 sa best of 3). 4 hanggang 7 kapag isang team ang nasa bingit ng elimination: 7 para sa 3-2 na serye sa best of 7, 4 para sa sweep bid. |
| Dalawang ranked na team | `rank` sa bawat team, regular season lang | 6 kapag top 5 ang mas mababang ranggo. 5 kapag top 10. 4 kapag top 10 ang isang team. 3 para sa anumang ibang pares sa top 25. |
| Karera sa huling bahagi ng season | `context.stakes`, regular season lang | 5 kapag may mapapanalunang pinal ang panalo o may mae-eliminate sa talo. 6 sa loob ng ilang puntos mula sa titulo o sa relegation line. 4 para sa mga nangungunang puwesto sa Europe. 3 para sa anumang ibang linya sa table o kapag nasa laban pa. |

Sa karera, buo ang bayad sa team na pinakamarami ang nakataya at kalahati sa isa, naka-cap sa 6. Nagsasama ang ranked at karera, at naka-cap sa 10 ang kabuuan.

## Win probability balance

Classic lang. Ibinabalik ng `computeWinProbVarianceScore(winProbHistory)` ang modifier mula `-scoreWinProbVarianceMax` hanggang `+scoreWinProbVarianceMax` (±5). Ipasa ang `context.winProbability` sa `scoreGame`, at isasama sa total ang modifier nang mag-isa.

Kailangan nito ng hindi bababa sa `minDataPoints` (5) na finite na value. Anupaman ay nagbabalik ng `undefined`, at hindi na isinasama ang field na `winProbabilityVariance` ng resulta sa halip na itakda sa `0`. Tinatanggal ang mga non-finite na entry (`NaN`, `Infinity`) bago i-check ang bilang na iyon.

Ang modifier ay ang mean absolute distance ng mga ibinigay na value mula sa 0.5, na minamapa sa ±5 na range:

| Karaniwang layo mula sa 50% | Modifier |
|---|---|
| 0 (barya) | +5 |
| `maxAvgDist` ÷ 2 (0.175) | 0 |
| ≥ `maxAvgDist` (0.35) | −5 |

Sa kabila ng pangalan, ang karaniwang layo mula sa 50% ang sinusukat ng modifier, hindi ang variance. Ang win-probability line na pabalik-balik sa pagitan ng 10% at 90% ay nakakakuha ng parehong penalty gaya ng nananatili sa 90%. Parehong pareho ang karaniwang layo mula sa gitna.

Idinadagdag ang modifier pagkatapos ng bawas sa break, hindi bago nito, at iki-clamp ang resulta sa 0 hanggang 100 bago idagdag ang anumang boost.

## Bawas sa commercial break

Flat na bawas ang kinukuha sa subtotal ng mga signal habang nasa commercial break ang laro, para hindi lumipat ang ArenaSwap sa larong nagpapakita ng ad. Ipinapasa ng caller ang `context.onBreak`, at kumukuha ang engine ng flat na 15 puntos sa subtotal ng mga signal habang `true` ito. Iyon ang `breakPenalty`. Kung may mga naka-disable na signal, lumalaki ang bawas kasabay ng natitirang subtotal: 30 kapag kalahati ng ceiling ng signal ang naka-off.

Kinukuha ito pagkatapos ng mga signal at bago ang win probability modifier, at bawas ito, hindi multiplier. Binabayaran ito ng Classic at Blowouts. Hindi ng Fantasy. Sinasabi ng `onBreak` at `breakPenalty` ng resulta kung nalapat ito at kung magkano ang nabawas. Parehong `false` at `0` ang mga ito sa frozen na halftime o intermission na score.

Hawak ng `signalsSubtotal` sa resulta ang kabuuan bago ang bawas, para maipakita ng breakdown kung magkano ang naging halaga ng break. Hindi nade-detect ng `scoreGame` mismo ang mga break. Ang caller ang gumagawa. Binabasa ng ArenaSwap ang mga break sa inning, pagpapalit ng pitcher at TV timeout mula sa scoreboard feed nito at ipinapasa ang sagot.

## Mga favorite, postseason at manual na boost

Galing sa iyo ang tatlong ito at hindi sa laro, at gumagana sila sa bawat mode. Ang tanging eksepsyon ay ang Blowouts, na hindi kailanman nagbabayad ng postseason boost. Ipasa ang mga ito sa `options`:

| Option | Ano ang ginagawa nito |
|---|---|
| `favoriteTeamCount` at `favoriteBoostPoints` | Puntos para sa bawat paboritong team sa laro, kaya dalawang beses nagbabayad ang laban ng dalawang paborito. |
| `postseasonBoostPoints` at `game.postseasonRound` | Puntos para sa round na nagpapasya ng titulo (`0`), na may bahagi para sa mas maaga: `1` semifinal 75%, `2` quarterfinal 50%, `3` anumang mas maaga 25%. |
| `gameBoost` | Flat na manual na boost, gaya ng itinakda ng manonood sa isang laro. |

Lumalabas sila sa `score.boosts` bilang `favoriteBoost`, `postseasonBoost` at `gameBoost`, kapag hiniling mo na. Idinadagdag ang favorite at postseason boost pagkatapos ng sariling mga boost ng mode at ng halo nito, at naka-cap ulit sa 100 ang total. Huling idinadagdag ang `gameBoost`, at ito lang ang pinapayagang lumampas sa 100. Sinadya iyon: dapat matalo ng larong ni-pin ng manonood ang perpektong score.

Wala sa kanilang nagbabayad maliban kung bibigyan mo ng puntos. Walang default ang package para sa alinman sa kanila. Nasa [sarili nitong docs](/arenaswap/docs/extension/settings/#scoring), hindi sa package na ito, kung paano ginagawa ng ArenaSwap na mga numerong ito ang mga naka-save na setting ng manonood.

## Kung nasa 2.x API ka pa

Pinapanatili ng `computePowerScore` ang 2.x na gawi nito: mga signal at win probability, walang moment boost. Ibinabalik pa rin ng `computeScoringOpportunityBoost(game)` ang number ng scoring-opportunity nang mag-isa, at kina-clamp at ipinapasa pa rin ng `normalizePowerScoreResult` ang `favoriteBonus`, `gameBoost` at `postseasonBoost` para sa resultang ikaw mismo ang bumuo. Deprecated na pero gumagana ang lahat ng ito. Tingnan ang [API reference](/arenaswap/docs/powerscore/api-reference/#the-2x-api) para sa buong listahan.
