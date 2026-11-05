---
sourceHash: '1cae3a43d11e'
title: 用 PowerScore 為你的第一場比賽評分
navLabel: 快速入門
description: 安裝 powerscore 套件，用 scoreGame 幾行程式碼就能替一場進行中的比賽評分，最後在終端機看到一個數字和它的原因。
section: powerscore
order: 1
faq:
  - q: powerscore 需要 API 金鑰或帳號嗎？
    a: 不需要。它只為你交給它的比賽狀態評分。要從哪裡取得這份狀態，是你自己程式碼的工作。
  - q: powerscore 能在瀏覽器裡執行嗎？
    a: 可以。它沒有任何執行階段相依套件，只處理一般物件和數學運算。無論是在 Node 裡跑，還是打包進瀏覽器擴充功能，都一樣。
  - q: 升級到 PowerScore 3，我得重寫 2.x 的程式碼嗎？
    a: 不用。computePowerScore 和 2.x 的型別仍然可用，回傳的總分也跟以前一樣。想用模式或新的加成時，再改用 scoreGame 就好。
---

這篇會安裝 `powerscore`，替一場進行中的比賽評分，最後得到一個數字和它背後的原因。

## 安裝套件

```bash
npm install powerscore
```

這個套件也放在 [npm](https://www.npmjs.com/package/powerscore) 上。想看它替今晚的真實比賽評分，請到 [PowerScore 頁面](/arenaswap/powerscore/)。

## 描述比賽

`scoreGame` 需要一個 `Game` 物件：兩隊的分數、聯賽和運動項目，以及比賽目前的進行狀況。進行中的比賽要設 `status: 'in'`，因為各項加成會先檢查這個，才會給分。

```ts
import { scoreGame } from 'powerscore';
import type { Game } from 'powerscore';

const game: Game = {
	id: 'demo-1',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	homeTeam: { score: 101, abbreviation: 'BOS' },
	awayTeam: { score: 99, abbreviation: 'LAL' },
	period: 4,
	clockSeconds: 45,
};
```

波士頓在第四節剩 45 秒時領先 2 分。比分接近，時間又晚，正是 PowerScore 在找的場面。

## 替它評分

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

執行後，終端機會印出：

```text
68
BOS up 2 with 0:45 left
```

`scoreGame` 還接受兩個參數，都可以省略：`context` 放比賽本身沒帶的資訊（比分歷史、勝率、賽前盤口、夢幻陣容），`options` 決定怎麼評分（用哪個模式、關掉哪些信號）。兩個都不給，就是經典模式，它問的是比賽夠不夠接近、夠不夠晚。

## 看明細

`score` 帶的不只是那個總分。每個信號都以清單項目的形式附在上面，有各自的得分和上限，加成和原因也在裡頭。

```ts
console.log(score.signals);
// [
//   { id: 'closeness',   points: 34, ceiling: 42, disabled: false },
//   { id: 'lateGame',    points: 34, ceiling: 38, disabled: false },
//   { id: 'momentum',    points: 0,  ceiling: 38, disabled: false },
//   { id: 'leadChanges', points: 0,  ceiling: 18, disabled: false },
//   { id: 'comeback',    points: 0,  ceiling: 20, disabled: false },
// ]
```

這場的分數全部來自接近度和關鍵時刻的壓力。沒有比分歷史可以回頭看，氣勢、領先交替和逆轉就沒東西可衡量，所以都是 0。在 context 裡交給 `scoreGame` 一份 `history`，它們就會醒過來。加成放在 `score.boosts`，這場全都是 0，因為籃球比賽沒有跑者、紅區，也沒有撤下的守門員可以加分。

用 `signalPoints(score, 'momentum')` 和 `boostPoints(score, 'noHitter')`，可以依 id 查單一項目。

## 換個模式試試

同一場比賽可以回答不同的問題。模式用 `options.mode` 選擇：

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

一面倒問的是有沒有人把比賽拉開。2 分差的比賽沒有，所以只拿經典 68 分的 30%，不會再多。這個下限讓接近的比賽在沒有大屠殺的夜晚仍然有資格上榜。夢幻問的是你的球員身上是不是快要發生什麼事。[信號頁面](/arenaswap/docs/powerscore/signals/)三種模式都有說明。

要評分你自己的程式碼正在輪詢的比賽，請看[用即時資料為比賽評分](/arenaswap/docs/powerscore/scoring-a-game/)。想知道每個信號衡量什麼、為什麼這樣衡量，請看[每種模式下的 PowerScore 信號](/arenaswap/docs/powerscore/signals/)。
