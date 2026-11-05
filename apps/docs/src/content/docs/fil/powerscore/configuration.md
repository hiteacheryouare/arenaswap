---
sourceHash: '854afd07d71b'
title: Configuration ng sport at liga
description: Bawat field ng SportTypeConfig at LeagueConfig, ang mga default nila sa anim na sport at 31 liga, at kung paano itinatakda ang kahulugan ng "dikit" sa isang sport.
section: powerscore
order: 5
navLabel: Configuration
---

Tumitingin ang `scoreGame` sa dalawang exported na map sa simula ng bawat tawag. Ang `sportTypeConfigMap`, na naka-key sa `SportType`, ang may hawak kung paano nilalaro ang isang sport. Ang `leagueConfigMap`, na naka-key sa `LeagueId`, ang may hawak kung gaano katagal ang mga period ng isang liga. Kung hindi bagay sa data mo ang mga built-in na value, puwede mong i-override ang alinman sa dalawa kada tawag gamit ang `options.sport` at `options.league`. Ipinapakita ng [Tune it for your own league](#tune-it-for-a-league-powerscore-doesnt-ship) kung paano.

## SportTypeConfig

Isang entry kada `SportType`, na ine-export bilang `sportTypeConfigs` (array) at `sportTypeConfigMap` (naka-key sa `id`). Hawak ng table na ito ang aktuwal na value ng anim na sport, at kasunod nito ang [ibig sabihin ng mga field](#what-the-sport-fields-mean). Binabasa ng Classic ang lahat ng ito. Binabasa ng Blowouts ang `closenessMargins`, `momentumBigRun` at `momentumSmallRun`, ang half-life ng momentum, at `historyWindowMs`.

| Field | basketball | football | hockey | soccer | baseball | softball |
|---|---|---|---|---|---|---|
| `clockBased` | true | true | true | true | false | false |
| `closenessMargins` (t1, t2, t3) | 5, 10, 18 | 3, 9, 14 | 1, 2, 3 | 1, 2, 3 | 1, 3, 5 | 1, 3, 5 |
| `momentumBigRun` / `momentumSmallRun` | 8 / 4 | 10 / 4 | 2 / 1 | 2 / 1 | 3 / 1 | 3 / 1 |
| `comebackThresholdBig` / `comebackThresholdSmall` | 6 / 3 | 7 / 3 | 2 / 1 | 2 / 1 | 2 / 1 | 2 / 1 |
| `clockCountsUp` | false | false | false | true | false | false |
| `clockIsFullGameElapsed` | false | false | false | true | false | false |
| `zeroZeroAsFullTie` | false | false | true | true | false | false |
| `zeroZeroPenaltyPeriods` | none | none | 1, 2 | 1 | none | none |
| `otPreBoostWindowSecs` | 60 | 60 | 60 | 60 | 0 | 0 |
| `decayHalfLifeMs.momentum` | 45,000 | 135,000 | 180,000 | 240,000 | 150,000 | 150,000 |
| `decayHalfLifeMs.leadChange` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `decayHalfLifeMs.comeback` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `historyWindowMs` | 300,000 (5 min) | 720,000 (12 min) | 960,000 (16 min) | 1,200,000 (20 min) | 720,000 (12 min) | 720,000 (12 min) |
| `lateGameCurve` | none | none | none | none | 9 innings, starts at 6 | 7 innings, starts at 5 |

Ang `historyWindowMs` ang haba ng history ng score na kailangang itabi ng bawat sport para gumana ang momentum, pagbabago ng lead at comeback. Sa parehong window sinusukat ang Sustained signal ng Blowouts. Hindi bababa sa apat na beses ito ng pinakamahabang half-life ng sport. Dahil sa agwat na iyon, ganap nang humihina ang isang signal bago ito lumabas sa window, gaano man kadalas mag-poll ang caller.

### Ibig sabihin ng mga field ng sport

| Field | Kahulugan |
|---|---|
| `clockBased` | May game clock ang sport. Wala nito ang baseball at softball, kaya sa mga inning tumatakbo ang pressure sa huling yugto. |
| `closenessMargins` | Ang tatlong margin kung saan bumababa ang Closeness: sa loob ng t1, mahigpit; sa loob ng t2, dikit; sa loob ng t3, gilid; lampas t3, walang puntos. Ginagamit din ng ibang signal at boost ang mga ito, gaya ng rout cutoff ng Comeback Factor sa t2 at ng Timing gate ng Blowouts lampas t3. |
| `momentumBigRun`, `momentumSmallRun` | Ang net run sa loob ng history window na nagbibigay ng buo at kalahating tier ng Momentum. |
| `comebackThresholdBig`, `comebackThresholdSmall` | Ang swing na nagbibigay ng malaki at katamtamang tier ng Comeback Factor. |
| `clockCountsUp` | Oras na nalaro ang ipinapakita ng clock, hindi oras na natitira. Soccer lang. |
| `clockIsFullGameElapsed` | Tumatakbo ang clock sa buong laro (0' hanggang 90'+) at hindi nagre-restart kada period, kaya binabawas muna ang mga natapos na period bago kuwentahin ang natitirang oras. Soccer lang. |
| `zeroZeroAsFullTie` | Buong tied credit ng Closeness ang nakukuha ng 0–0 na laro. Kapag `false`, ang mas mababang `zeroZero` tier ang nakukuha ng 0–0. |
| `zeroZeroPenaltyPeriods` | Mga period kung saan mas mababang tier pa rin ang nakukuha ng 0–0 kahit `true` ang `zeroZeroAsFullTie`. Ang gamit ng hockey ay 1 at 2, ang soccer ay ang unang half. |
| `otPreBoostWindowSecs` | Ang huling mga segundo ng huling regulation period kung saan umaakyat ang tied na laro papunta sa overtime pre-boost. Pinapatay ito ng `0`. |
| `decayHalfLifeMs` | Gaano kabilis humina ang Momentum, Lead Changes at Comeback Factor pagkatapos ng huling score. Mas mahaba sa mga sport na kaunti ang score, para buhay pa sila ng isang goal hanggang sa susunod. |
| `historyWindowMs` | Gaano karaming history ng score ang binabasa ng mga signal na nakabase sa history. Tingnan sa itaas. |
| `lateGameCurve` | Baseball at softball lang: ilang inning ang regulation at saang inning nagsisimula ang pag-akyat ng huling yugto. |

## LeagueConfig

Isang entry kada `LeagueId`, na ine-export bilang `leagueConfigs` (array) at `leagueConfigMap` (naka-key sa `id`), kasama ang `allLeagueIds` para sa hubad na listahan. Display text lang ang `periodFormat` at hindi nito naaapektuhan ang scoring. May dala ring ilang field ang bawat entry na ginagamit ng ArenaSwap sa sarili nitong pagkuha ng data at sa haba ng espasyong sinasakop ng laro sa schedule bar. Hindi ito binabasa ng scorer, kaya wala sila sa table.

| Liga | Sport | Mga period | Haba ng period |
|---|---|---|---|
| NBA (`nba`) | basketball | 4 | 720s |
| WNBA (`wnba`) | basketball | 4 | 600s |
| NCAA Basketball (`ncaab`) | basketball | 2 | 1200s |
| NCAA Women's Basketball (`ncaaw`) | basketball | 4 | 600s |
| Olympic Men's Basketball (`olybkm`) | basketball | 4 | 600s |
| Olympic Women's Basketball (`olybkw`) | basketball | 4 | 600s |
| NFL (`nfl`) | football | 4 | 900s |
| NCAA Football (`ncaaf`) | football | 4 | 900s |
| UFL (`ufl`) | football | 4 | 900s |
| NHL (`nhl`) | hockey | 3 | 1200s |
| NCAA Men's Hockey (`ncaamh`) | hockey | 3 | 1200s |
| Olympic Men's Ice Hockey (`olymih`) | hockey | 3 | 1200s |
| Olympic Women's Ice Hockey (`olywih`) | hockey | 3 | 1200s |
| MLB (`mlb`) | baseball | 9 innings | 0 |
| NCAA Baseball (`cbase`) | baseball | 9 innings | 0 |
| Olympic Men's Baseball (`olybb`) | baseball | 9 innings | 0 |
| World Baseball Classic (`wbbc`) | baseball | 9 innings | 0 |
| NCAA Softball (`csoft`) | softball | 7 innings | 0 |
| MLS (`mls`) | soccer | 2 | 2700s |
| English Premier League (`epl`) | soccer | 2 | 2700s |
| La Liga (`laliga`) | soccer | 2 | 2700s |
| Bundesliga (`bundesliga`) | soccer | 2 | 2700s |
| Serie A (`seriea`) | soccer | 2 | 2700s |
| Liga MX (`ligamx`) | soccer | 2 | 2700s |
| UEFA Champions League (`ucl`) | soccer | 2 | 2700s |
| UEFA Europa League (`uel`) | soccer | 2 | 2700s |
| NWSL (`nwsl`) | soccer | 2 | 2700s |
| FIFA World Cup (`fifawc`) | soccer | 2 | 2700s |
| FIFA Women's World Cup (`fifawwc`) | soccer | 2 | 2700s |
| Olympic Men's Soccer (`olysocm`) | soccer | 2 | 2700s |
| Olympic Women's Soccer (`olysocw`) | soccer | 2 | 2700s |

31 liga lahat, kapareho ng 31 miyembro ng `LeagueId`.

## Paano itinatakda ang kahulugan ng "dikit" sa isang sport

Isang tuple, `closenessMargins: [t1, t2, t3]`, ang nagpapasya ng ilang bagay para sa sport. Ito ang pumipili kung saang closeness tier mapupunta ang isang margin: mahigpit sa `t1`, dikit sa `t2`, gilid sa `t3`, at wala nang abot lampas doon. Ito rin ang pumipili ng ceiling na inaakyat ng pressure sa huling yugto, ang band kung saan nagbabayad ang football red zone boost, kung saan nagsisimulang magbayad ang Blowouts (dalawang score ang pagitan, lampas `t2`), at gaano kabigat ang stakes.

Ang `[5, 10, 18]` ng basketball ay nangangahulugang mahigpit ang laro ng 2 puntos at dikit ang laro ng 9 na puntos. Ang laro ng 18 puntos ang huling nabibilang pang gilid. Sa `[1, 2, 3]` ng hockey at soccer, ang larong 2 goal ang pagitan ay tinatrato gaya ng larong 9 na puntos sa basketball. Isang tuple ang babaguhin para baguhin ang kahulugan ng "dikit" sa isang sport, hindi isang bungkos ng magkakahiwalay na threshold.

## I-tune ito para sa ligang hindi kasama sa PowerScore

Generic sa league id ang `Game`, kaya gumagana nang ganoon na lang ang feed na may sariling mga id: `Game<string>`. Ang ligang hindi kilala ng table ay iso-score gamit ang default ng sport nito. Bawat sport ay may pinakakilalang liga para sa bilang ng period at clock:

| Sport | Default sa |
|---|---|
| Basketball | NBA |
| Hockey | NHL |
| Baseball | MLB |
| Football | NFL |
| Softball | NCAA Softball |
| Soccer | MLS |

Ang `sportType` lang ang kailangan mong tamaan nang eksakto. Ito ang namamahala sa karamihan ng ginagawa ng isang signal, anuman ang `league`. May hiwalay na fallback ang `sportType` na hindi kilala: ang signal tuning ng basketball. Dahil sa dalawang fallback, nai-score pa rin ang laro at hindi nag-throw.

Kung mali ang mga default para sa liga mo, i-override ang mga ito kada tawag:

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

Tumatanggap ang `options.league` ng alinmang bahagi ng `LeagueConfig`, kadalasan ang bilang at haba ng period. Tumatanggap ang `options.sport` ng alinmang bahagi ng `SportTypeConfig`, gaya ng closeness margin, momentum threshold o half-life. Sa tawag na iyon lang may bisa ang mga override, at nananatiling gaya ng dati ang mga exported na map.

Plain na exported object ang `sportTypeConfigMap` at `leagueConfigMap`, at binabasa sa bawat tawag at hindi mula sa naka-cache na kopya. Nagbabago nga ang scoring kapag binago mo sila habang tumatakbo ang code, pero walang nagsasabi sa mga type o export ng package na suportadong extension point iyon, at hindi obligadong panatilihin ito ng susunod na bersyon. Gamitin ang mga option.
