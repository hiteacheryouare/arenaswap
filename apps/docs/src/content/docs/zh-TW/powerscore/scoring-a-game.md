---
sourceHash: 'd23f4e1a7b17'
title: 用即時資料為比賽評分
description: 把你自己的資料來源對應到 Game 物件，在多次輪詢之間保留比分歷史，開啟你的資料支援的加成和模式，再加上收藏與手動加成。
section: powerscore
order: 2
navLabel: 用即時資料評分
faq:
  - q: scoreGame 會檢查比賽是不是真的正在進行嗎？
    a: 只有加成會檢查。比賽的狀態不是 'in'，加成就一分都不給。信號仍然會替還沒開打或已經結束的比賽評分，而處於中場休息或延賽的比賽則是 0 分。請你自己先篩出進行中的比賽，ArenaSwap 在呼叫評分器之前也是這麼做的。
  - q: PowerScore 能用在它沒列出的聯賽嗎？
    a: 可以。Game 對聯賽 id 是泛型，內建表裡沒有的 id，會用它那項運動的預設值評分。如果預設值不對，可以在每次呼叫時用 options.league 覆寫節數和每節長度。
---

`scoreGame` 不會去抓任何東西。你交給它什麼 `Game` 物件和 context，它就為什麼評分。這篇先用一個虛構的資料來源建出這兩樣，再隨著你的資料所能提供的，逐步開啟引擎的更多部分。

## 把你的資料來源對應到 Game

只有 `id`、`league`、`sportType` 和兩隊的分數是必填。其他欄位，資料來源有就能讓評分更精準，沒有就當作未知。有什麼就對應什麼，其餘略過。

```ts
import { scoreGame } from 'powerscore';
import type { Game } from 'powerscore';

// Whatever your feed sends. This one is invented.
interface FeedEvent {
	id: string;
	state: 'scheduled' | 'live' | 'final';
	period: number;
	clock: string; // '0:45'
	halftime: boolean;
	home: { name: string; points: number };
	away: { name: string; points: number };
}

const toGame = (event: FeedEvent): Game => ({
	id: event.id,
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { score: event.home.points, abbreviation: event.home.name },
	awayTeam: { score: event.away.points, abbreviation: event.away.name },
	period: event.period,
	clockSeconds: parseClock(event.clock), // '0:45' -> 45
	status: event.state === 'live' ? 'in' : event.state === 'final' ? 'post' : 'pre',
	intermission: event.halftime,
});

const score = scoreGame(toGame(event));
```

`status` 要如實設定。各項加成在給分之前，會先檢查它是不是 `'in'`。只要 `intermission` 或 `delayed` 旗標為真，整場比賽的分數就是 0，直到比賽恢復，所以處於廣告時段或雨天延賽 的比賽，不可能贏過正在進行的比賽。

## 給得越多，開啟得越多

每個選填欄位，都會開啟引擎中需要它的那一部分。少給一個，那部分就是 0 分。不會丟出錯誤。

| 提供 | 放在 | 會開啟 |
|---|---|---|
| 比分快照，由舊到新 | `context.history` | 氣勢、領先交替、逆轉。至少需要 3 筆快照。 |
| 勝率，每次輪詢一個 0 到 1 的值 | `context.winProbability` | ±5 的勝率調整。至少需要 5 個值。 |
| 比賽是否正處於廣告時段 | `context.onBreak` | 廣告時段扣分。 |
| 球隊上的 `possession`、`yardsToEndZone`、`down`、`distance` 和 `timeouts` | `game`、`game.homeTeam` | 兩分鐘進攻，以及夢幻模式的美式足球戰局。 |
| `isRedZone`，加上 `down`、`distance` 和 `isGoalToGo` | `game` | 紅區加成。 |
| `baseRunners`、`outs`、`topOfInning` | `game` | 壘上跑者和超前跑者。 |
| 每隊的 `hits` | `game.homeTeam`、`game.awayTeam` | 無安打比賽。 |
| `series`，以及每隊的 `rank` | `game`、`game.homeTeam` | 利害關係：決定生死的系列賽、兩支排名球隊對決。 |
| `context.stakes` | `context` | 利害關係：賽季尾聲的爭奪。 |
| `pregameLine` | `context` | 爆冷關注。請用開賽前的盤口。 |
| `redCards` | `game` | 紅牌加成，足球專用。 |
| `powerPlay`、`emptyNet` | `context` | 冰球的得分機會。 |
| `fantasy` | `context` | 夢幻模式。 |
| 每隊的 `nickname` | `game.homeTeam`、`game.awayTeam` | `reason` 裡的隊名，取代縮寫。 |
| `seasonType`、`postseasonRound` | `game` | 利害關係會把比賽當成季後賽（系列賽）而非例行賽（排名與爭奪）來判讀。 |
| `recentLeadChanges` | `context` | 從你資料來源的比賽記錄算出的領先交替次數，用來涵蓋兩次輪詢之間的反覆易位。 |

所有欄位都列在[型別頁面](/arenaswap/docs/powerscore/types/#game)，每項加成給多少分，則見[加成與扣分](/arenaswap/docs/powerscore/boosts-and-penalties/)。

## 為氣勢、領先交替和逆轉保留比分歷史

這三個信號都讀 `context.history`，也就是一場比賽過去的比分清單，在累積到至少三筆快照之前，它們一直是 0。每次輪詢都留一筆，依序排列，由舊到新，附上以毫秒為單位的時間戳。時間戳只需要彼此之間的相對關係，不一定要是實際時間。

```ts
import { scoreGame } from 'powerscore';
import type { Game, ScoreSnapshot } from 'powerscore';

const game: Game = {
	id: 'g-401',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { score: 88, abbreviation: 'BOS' },
	awayTeam: { score: 82, abbreviation: 'LAL' },
	period: 3,
	clockSeconds: 300,
	status: 'in',
};

const history: ScoreSnapshot[] = [
	{ gameId: game.id, timestamp: 0, homeScore: 75, awayScore: 80 },
	{ gameId: game.id, timestamp: 15_000, homeScore: 79, awayScore: 80 },
	{ gameId: game.id, timestamp: 30_000, homeScore: 88, awayScore: 82 },
];

const score = scoreGame(game, { history });
```

波士頓原本落後 5 分，靠一波 13 比 2 的攻勢剛剛奪回領先：

```ts
score.total;  // 86
score.reason; // 'BOS came back from 5 down to lead. Up 6 in the 3rd quarter'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 16
```

比該運動的 `historyWindowMs` 更舊的快照要修掉，陣列才不會無限長大。這個窗口和其他各運動專屬的調校，都在[運動與聯賽設定](/arenaswap/docs/powerscore/configuration/)。

## 追蹤廣告時段與勝率（如果你有的話）

它們都放在 context 裡。如果你能判斷比賽是不是正在廣告時段，就傳入 `onBreak`：

```ts
const score = scoreGame(game, { history, onBreak: isInBreak(game), winProbability });
```

`isInBreak` 要你自己寫，依據你的資料來源對局間休息、換投手和暫停的說法來判斷。`onBreak` 為 `true` 時，分數會固定扣 15 分。
`winProbability` 是一份近期的勝率清單，值介於 0 到 1，任一隊的都可以。只有和 50% 的距離才重要。兩者都是選填，沒有它們 PowerScore 也能正常評分。各自會改變什麼，請見[加成與扣分](/arenaswap/docs/powerscore/boosts-and-penalties/)。

## 讓加成看見那一刻

棒球、美式足球、冰球和足球，各自有光看比分看不出來的場面。把你的資料來源有的欄位加進去，`scoreGame` 就會替它們給分。這是一場棒球比賽，九局下半，平手，滿壘，一人出局：

```ts
const score = scoreGame({
	id: 'g-402',
	league: 'mlb',
	sportType: 'baseball',
	status: 'in',
	homeTeam: { score: 3, hits: 5 },
	awayTeam: { score: 3, hits: 4 },
	period: 9,
	topOfInning: false,
	outs: 1,
	baseRunners: { first: true, second: true, third: true },
});

score.boosts.filter(boost => boost.points > 0);
// [
//   { id: 'scoringOpportunity', points: 10 },
//   { id: 'goAheadRun', points: 10 },
// ]
```

這兩項加起來，剛好填滿關鍵場面那一組 20 分的上限。美式足球的紅區看 `isRedZone`，並依 `down`、`distance` 和 `isGoalToGo` 加權，兩分鐘進攻則看 `possession`、`yardsToEndZone` 和 `down`。冰球的得分機會需要 `context.powerPlay` 和 `context.emptyNet`。足球需要 `redCards`。

## 用不同的模式評分

用 `options.mode` 選模式。一面倒不需要額外的東西。夢幻要在 context 裡放你的陣容，每位球員一筆：

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

`pointEvents` 讓夢幻得分信號知道，某位球員一分鐘前拿了夢幻分數。要把一行球員數據換算成這些分數，請用 [`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints)。比賽裡沒有你的任何球員，就會用經典模式評分，`score.modeId` 也會這樣告訴你。

## 加上收藏、季後賽和手動加成

先替比賽評分，再用選項加上 PowerScore 不知道的東西，例如觀眾收藏的球隊。每種模式都適用同樣的選項。

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 106
```

收藏加成和季後賽加成會加進總分，並以 100 為上限。`gameBoost` 在那之後才加，而且是唯一能超過 100 的東西，所以觀眾釘選的比賽可以勝過滿分。凍結中的比賽一概不適用：暫停的比賽不可能贏過正在進行的比賽。

ArenaSwap 自己的[評分程式碼](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts)，在把分數交給分頁切換器之前，也是用同樣的方式組出選項。

## 2.x 的做法

`computePowerScore(game, history, winProbabilityHistory)` 仍然可用，回傳的是不含關鍵場面加成的 2.x 平面結果。如果你要的只是一直以來拿到的那個數字，它就是對的選擇。[API 參考](/arenaswap/docs/powerscore/api-reference/#the-2x-api)列出了仍然保留的所有東西。
