---
sourceHash: '854afd07d71b'
title: 運動與聯賽設定
description: SportTypeConfig 和 LeagueConfig 的每個欄位、六種運動與 31 個聯賽的預設值，以及一項運動的「接近」是怎麼設定的。
section: powerscore
order: 5
navLabel: 設定
---

`scoreGame` 每次呼叫一開始，都會查兩張匯出的對照表。`sportTypeConfigMap` 以 `SportType` 為鍵，記錄一項運動怎麼打。`leagueConfigMap` 以 `LeagueId` 為鍵，記錄一個聯賽的每節多長。如果內建的數值不適合你的資料，可以在每次呼叫時用 `options.sport` 和 `options.league` 覆寫。[為你自己的聯賽調整](#tune-it-for-a-league-powerscore-doesnt-ship)會告訴你怎麼做。

## SportTypeConfig

每個 `SportType` 一筆，以 `sportTypeConfigs`（陣列）和 `sportTypeConfigMap`（以 `id` 為鍵）匯出。下表是六種運動的實際數值，表後的[欄位說明](#what-the-sport-fields-mean)解釋各欄位的意思。經典模式會讀全部。一面倒模式讀 `closenessMargins`、`momentumBigRun`、`momentumSmallRun`、氣勢半衰期，以及 `historyWindowMs`。

| 欄位 | basketball | football | hockey | soccer | baseball | softball |
|---|---|---|---|---|---|---|
| `clockBased` | true | true | true | true | false | false |
| `closenessMargins` (t1, t2, t3) | 5, 10, 18 | 3, 9, 14 | 1, 2, 3 | 1, 2, 3 | 1, 3, 5 | 1, 3, 5 |
| `momentumBigRun` / `momentumSmallRun` | 8 / 4 | 10 / 4 | 2 / 1 | 2 / 1 | 3 / 1 | 3 / 1 |
| `comebackThresholdBig` / `comebackThresholdSmall` | 6 / 3 | 7 / 3 | 2 / 1 | 2 / 1 | 2 / 1 | 2 / 1 |
| `clockCountsUp` | false | false | false | true | false | false |
| `clockIsFullGameElapsed` | false | false | false | true | false | false |
| `zeroZeroAsFullTie` | false | false | true | true | false | false |
| `zeroZeroPenaltyPeriods` | 無 | 無 | 1, 2 | 1 | 無 | 無 |
| `otPreBoostWindowSecs` | 60 | 60 | 60 | 60 | 0 | 0 |
| `decayHalfLifeMs.momentum` | 45,000 | 135,000 | 180,000 | 240,000 | 150,000 | 150,000 |
| `decayHalfLifeMs.leadChange` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `decayHalfLifeMs.comeback` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `historyWindowMs` | 300,000（5 分鐘） | 720,000（12 分鐘） | 960,000（16 分鐘） | 1,200,000（20 分鐘） | 720,000（12 分鐘） | 720,000（12 分鐘） |
| `lateGameCurve` | 無 | 無 | 無 | 無 | 9 局，從第 6 局開始 | 7 局，從第 5 局開始 |

`historyWindowMs` 是每項運動為了讓氣勢、領先交替和逆轉能運作，需要留住的比分歷史長度。一面倒的領先穩固信號也用同一個窗口來衡量。它至少是該運動最長半衰期的四倍。有了這個餘裕，不管呼叫端多久輪詢一次，信號都能在掉出窗口之前完全衰減。

### 運動欄位的意思

| 欄位 | 意思 |
|---|---|
| `clockBased` | 這項運動有比賽時鐘。棒球和壘球沒有，所以關鍵時刻的壓力改以局數計算。 |
| `closenessMargins` | 接近度分段下降的三個分差：在 t1 以內是勢均力敵，在 t2 以內是接近，在 t3 以內是邊緣，超過 t3 就不給分。其他信號和加成也會沿用這三個值，例如逆轉的大比分截止點在 t2，一面倒的早早拉開門檻在 t3 之後。 |
| `momentumBigRun`, `momentumSmallRun` | 歷史窗口內的淨得分連跑，達到哪一個值才拿氣勢的全額和半額。 |
| `comebackThresholdBig`, `comebackThresholdSmall` | 分差擺盪多少，才拿逆轉的大額和中額。 |
| `clockCountsUp` | 時鐘顯示的是已進行的時間，而不是剩餘時間。只有足球。 |
| `clockIsFullGameElapsed` | 時鐘貫穿整場比賽（0' 到 90'+），而不是每節重新開始，所以計算剩餘時間前，要先扣掉已完成的節數。只有足球。 |
| `zeroZeroAsFullTie` | 0–0 的比賽在接近度中拿到完整的平手分數。設為 `false` 時，0–0 只拿較低的 `zeroZero` 級別。 |
| `zeroZeroPenaltyPeriods` | 即使 `zeroZeroAsFullTie` 為 `true`，0–0 在這些節仍然只拿較低的級別。冰球是第 1、2 節，足球是上半場。 |
| `otPreBoostWindowSecs` | 例行賽最後一節的最後幾秒，平手的比賽在這段時間會朝延長賽預先加成攀升。`0` 表示關閉。 |
| `decayHalfLifeMs` | 氣勢、領先交替和逆轉在最後一次得分之後衰減得多快。低得分的運動比較長，所以一球就能讓它們撐到下一球。 |
| `historyWindowMs` | 歷史信號讀取多少比分歷史。見上方說明。 |
| `lateGameCurve` | 只用於棒球和壘球：例行賽有幾局，以及關鍵時刻的攀升從第幾局開始。 |

## LeagueConfig

每個 `LeagueId` 一筆，以 `leagueConfigs`（陣列）和 `leagueConfigMap`（以 `id` 為鍵）匯出，另外還有 `allLeagueIds` 提供單純的清單。`periodFormat` 只是顯示用的文字，不影響評分。每一筆還帶了幾個欄位，是 ArenaSwap 自己抓資料，以及決定一場比賽在賽程長條上佔多長時用的。評分器不會讀它們，所以這裡沒有列出。

| 聯賽 | 運動 | 節數 | 每節長度 |
|---|---|---|---|
| NBA (`nba`) | basketball | 4 | 720s |
| WNBA (`wnba`) | basketball | 4 | 600s |
| NCAA Basketball (`ncaab`) | basketball | 2 | 1200s |
| NCAA Women's Basketball (`ncaaw`) | basketball | 4 | 600s |
| 奧運男子籃球 (`olybkm`) | basketball | 4 | 600s |
| 奧運女子籃球 (`olybkw`) | basketball | 4 | 600s |
| NFL (`nfl`) | football | 4 | 900s |
| NCAA Football (`ncaaf`) | football | 4 | 900s |
| UFL (`ufl`) | football | 4 | 900s |
| NHL (`nhl`) | hockey | 3 | 1200s |
| NCAA Men's Hockey (`ncaamh`) | hockey | 3 | 1200s |
| 奧運男子冰球 (`olymih`) | hockey | 3 | 1200s |
| 奧運女子冰球 (`olywih`) | hockey | 3 | 1200s |
| MLB (`mlb`) | baseball | 9 局 | 0 |
| NCAA Baseball (`cbase`) | baseball | 9 局 | 0 |
| 奧運男子棒球 (`olybb`) | baseball | 9 局 | 0 |
| 世界棒球經典賽 (`wbbc`) | baseball | 9 局 | 0 |
| NCAA Softball (`csoft`) | softball | 7 局 | 0 |
| MLS (`mls`) | soccer | 2 | 2700s |
| 英超 (`epl`) | soccer | 2 | 2700s |
| 西甲 (`laliga`) | soccer | 2 | 2700s |
| 德甲 (`bundesliga`) | soccer | 2 | 2700s |
| 義甲 (`seriea`) | soccer | 2 | 2700s |
| 墨西哥甲級聯賽 (`ligamx`) | soccer | 2 | 2700s |
| 歐冠聯賽 (`ucl`) | soccer | 2 | 2700s |
| 歐霸聯賽 (`uel`) | soccer | 2 | 2700s |
| NWSL (`nwsl`) | soccer | 2 | 2700s |
| FIFA 世界盃 (`fifawc`) | soccer | 2 | 2700s |
| FIFA 女子世界盃 (`fifawwc`) | soccer | 2 | 2700s |
| 奧運男子足球 (`olysocm`) | soccer | 2 | 2700s |
| 奧運女子足球 (`olysocw`) | soccer | 2 | 2700s |

一共 31 個聯賽，和 `LeagueId` 的 31 個成員相符。

## 一項運動的「接近」是怎麼設定的

一個元組 `closenessMargins: [t1, t2, t3]`，就決定了一項運動的好幾件事。它決定一個分差落在哪個接近度級別：`t1` 是勢均力敵，`t2` 是接近，`t3` 是邊緣，超過就搆不著了。它也決定關鍵時刻的壓力朝哪個上限攀升、美式足球紅區加成的給分區間、一面倒從哪裡開始給分（相差兩個得分，超過 `t2`），以及賽事重要性佔多少權重。

籃球的 `[5, 10, 18]` 代表 2 分差的比賽是勢均力敵，9 分差的比賽算接近。18 分差是最後一個仍算邊緣的分差。冰球和足球的 `[1, 2, 3]`，把 2 球差的比賽看得像籃球的 9 分差。要改變一項運動的「接近」，只要改一個元組，不用去動一堆各自獨立的門檻。

## 為 PowerScore 沒內建的聯賽調整

`Game` 對聯賽 id 是泛型，所以自帶 id 的資料來源可以直接用：`Game<string>`。表裡沒有的聯賽，會用它那項運動的預設值評分。每項運動的節數和時鐘，對應到最具代表性的聯賽：

| 運動 | 預設對應 |
|---|---|
| 籃球 | NBA |
| 冰球 | NHL |
| 棒球 | MLB |
| 美式足球 | NFL |
| 壘球 | NCAA Softball |
| 足球 | MLS |

`sportType` 是唯一一定要填對的東西。不管 `league` 是什麼，信號大部分的運作都由它決定。無法辨認的 `sportType` 會另外退回籃球的信號調校。兩種退回機制都讓比賽仍然能評分，而不是丟出錯誤。

如果預設值不適合你的聯賽，可以在每次呼叫時覆寫：

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

`options.league` 接受 `LeagueConfig` 的任何部分，通常是節數和每節長度。`options.sport` 接受 `SportTypeConfig` 的任何部分，例如接近度分差、氣勢門檻或半衰期。覆寫只對那次呼叫有效，匯出的對照表維持原樣。

`sportTypeConfigMap` 和 `leagueConfigMap` 是匯出的一般物件，每次呼叫都會直接讀取，而不是讀快取的副本。在執行階段修改它們，確實會改變評分行為，但套件的型別和匯出內容，都沒有把這當成受支援的擴充點，未來版本也沒有義務讓它繼續有效。請用 options。
