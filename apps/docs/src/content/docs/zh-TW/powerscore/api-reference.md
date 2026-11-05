---
sourceHash: '91a61d4e6782'
title: PowerScore API 參考
navLabel: API 參考
description: powerscore 匯出的每個函式和常數，附上函式簽名、參數、回傳值，以及輸入缺漏或無效時的行為。也包含已棄用的 2.x API。
section: powerscore
order: 6
---

這裡的所有東西都從套件的根目錄匯出：`import { ... } from 'powerscore'`。先是 3.0 的函式，接著是輔助函式、組成內建模式的零件、常數，最後是已棄用但運作方式和以前完全一樣的 2.x API。型別在 [PowerScore 的 TypeScript 型別](/arenaswap/docs/powerscore/types/)。

## 評分

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

主要的進入點。用一個模式為比賽評分，回傳 [`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore)：總分、以清單呈現的每個信號和加成，以及原因。

| 參數 | 預設值 | 備註 |
|---|---|---|
| `game` | 必填 | 目前的比賽狀態。只有 `id`、`league`、`sportType` 和兩隊的分數是必填。 |
| `context` | `{}` | 歷史、勝率、賽前盤口、夢幻陣容，以及其他比賽本身沒帶的資訊。見 [`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext)。 |
| `options` | `{}` | 用哪個模式、關掉哪些信號，以及收藏、季後賽和手動加成。見 [`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions)。 |

遇到缺少的選填欄位絕不會丟出錯誤：需要它的那部分引擎得 0 分。無法辨認的 `league` 會用它那項運動的預設值評分。輸入裡任何地方出現非有限值，都當作不存在，而不是以 `NaN` 傳遞下去。

凍結中的比賽（`intermission` 或 `delayed`）全部得 0 分，包括每一項加成，`reason` 為空。只有加成會讀 `game.status`，不是 `'in'` 的話，加成一分都不給。

總分依固定的順序累積：

1. 信號評分。停用的會被縮放掉。
2. 扣掉廣告時段扣分。
3. 加上勝率修正（僅限經典）。結果限制在 0 到 100。
4. 加上該模式自己的加成，受各組上限限制，總分上限 100。
5. 如果該模式與經典混合（下限、混合或加成），在這一步進行。
6. 加上收藏加成和季後賽加成，總分再次限制在 100。`paysPostseason: false` 的模式會跳過季後賽加成。
7. 最後加上 `gameBoost`。它是唯一能超過 100 的東西。

```ts
const score = scoreGame(game, { history }, { mode: 'blowouts' });
score.total;  // 0–100
score.reason; // 'BOS on a 12–0 run. Up 28 in the 3rd quarter'
```

### signalPoints 和 boostPoints

```ts
function signalPoints(score: Pick<PowerScore, 'signals'>, id: string): number
function boostPoints(score: Pick<PowerScore, 'boosts'>, id: string): number
```

依 id 查出結果上的一個項目。id 不存在時，兩者都回傳 `0`。

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

建出信號或加成的 `compute` 收到的 [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput)：比賽、context、已解析的運動與聯賽設定、`progress`、`now` 和 `margin`。這是 `scoreGame` 內部呼叫的東西，匯出來是為了讓你寫的信號可以單獨測試。

## 模式

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

事先檢查一次模式，再原樣回傳。如果兩個信號共用同一個 id、信號的上限不是正數，或模式沒有任何信號，就會丟出錯誤。

```ts
import { defineMode, scoreGame, type PowerScoreMode } from 'powerscore';

const overtimeOnly: PowerScoreMode = defineMode({
	id: 'overtimeOnly',
	signals: [
		{
			id: 'extraTime',
			ceiling: 100,
			compute: ({ game, league }) => (
				(game.period ?? 0) > league.regularPeriods
					? { points: 100, reason: { key: 'overtime' } }
					: { points: 0 }
			),
		},
	],
	boosts: [],
	reasonPriority: ['extraTime'],
	usesBreakPenalty: false,
	usesWinProbability: false,
});

scoreGame(game, context, { mode: overtimeOnly });
```

信號的 `compute` 會收到比賽、context、已解析的運動與聯賽設定、比賽的 `progress`（開賽是 0，例行賽結束和延長賽中是 1），以及 `margin`。它回傳 `points`（限制在上限內）和選填的 `reason`。模式還可以帶 `boosts`、`bucketCaps`、`classicBlend`、`paysPostseason`（預設 `true`；`false` 會不給季後賽加成），以及 `appliesTo(game, context)`，用來把它沒話可說的比賽送回經典。

`reasonPriority` 列出可以讀取原因的信號。其中最強的那個發言，順序用來決定平手時誰先。內建模式認得的原因 key，會在 `score.reason` 裡以英文呈現。你自己的 key 就照原樣呈現，所以要從 `score.reasons` 翻譯，不要從字串翻譯。

### classicMode、blowoutsMode、fantasyMode、builtInModes 和 getMode

`classicMode`、`blowoutsMode` 和 `fantasyMode` 是三個內建的 `PowerScoreMode` 物件。`builtInModes` 是同樣這三個，以 id 為鍵，`getMode(idOrMode)` 則能解析 id、模式物件，或什麼都不給（得到經典）。展開其中一個就能在它的基礎上做東西。想拿到沒有 3.0 加成的經典：

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### 信號與加成

組成內建模式的零件也都有匯出，所以自訂模式可以重複使用它們：

| 匯出 | 是什麼 |
|---|---|
| `classicSignals`、`blowoutsSignals`、`fantasySignals` | 各模式的信號清單。 |
| `closenessSignal`、`lateGameSignal`、`momentumSignal`、`leadChangesSignal`、`comebackSignal` | 經典的五個信號，一個一個列出。 |
| `scoringOpportunityBoost`、`goAheadRunBoost`、`twoMinuteDrillBoost`、`noHitterBoost`、`redCardBoost`、`upsetWatchBoost`、`upsetRoutBoost`、`stakesBoost` | 每項加成的 `BoostDefinition`。各項給多少分，見[加成與扣分](/arenaswap/docs/powerscore/boosts-and-penalties/)。 |
| `underdogProbability(line, sportType, league)` | 開賽前弱勢方的勝算，由 `PregameLine` 算出。盤口說不出來時為 `undefined`。 |
| `postseasonBoostShare(round)` | 一個輪次能拿到季後賽加成的比例：1、0.75、0.5、0.25，沒有輪次則為 0。 |
| `applyProgressFloor`、`findLeadChanges` | 接近度和領先交替背後的兩個輔助函式。 |
| `baseMask(baseRunners)`、`runnersOn(mask)` | 把壘包表示成 3 位元的數字，一壘在最低位（`0b101` 是一壘和三壘有跑者），以及那代表有幾名跑者。 |

## 原因

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

把一則原因句，或一串原因串成的句子，轉成英文。`score.reason` 就是用它們填的。當你自己組原因、又想讓它們讀起來一樣時，可以用。`ordinal(n)` 給出它們用的英文序數（"2nd"、"11th"、"21st"）。

## 設定與進度

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

`resolveSportConfig` 和 `resolveLeagueConfig` 做的，就是 `scoreGame` 每次呼叫一開始做的事。無法辨認的 `sportType` 會退回籃球的調校。無法辨認的聯賽會退回它那項運動最具代表性的聯賽：籃球是 NBA，冰球是 NHL，棒球是 MLB，美式足球是 NFL，壘球是 NCAA 壘球，足球是 MLS。`getGameProgress` 開賽是 0，例行賽結束和延長賽中是 1。`scoreMargin` 是比分差的絕對值。

## 夢幻計分

夢幻的夢幻得分信號需要夢幻分數。這些函式把一行球員數據換算成夢幻分數。你指定要算哪些數據，它們負責計分。

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

回傳一行數據的總分，四捨五入到小數點後兩位。不認得的數據和非有限值會被忽略。防守組的 `pointsAllowed` 依級距計分。

```ts
import { computeFantasyPoints } from 'powerscore';

computeFantasyPoints('football', {
	passingYards: 310,
	passingTouchdowns: 3,
	interceptionsThrown: 1,
	rushingYards: 22,
}); // 12.4 + 12 − 2 + 2.2 = 24.6
```

### defaultFantasyScoring、resolveFantasyScoring 和 fantasySportOf

`defaultFantasyScoring` 存著 `'football'`（完整 PPR）、`'basketball'`、`'baseball'` 和 `'hockey'` 的預設規則。每條規則是 `{ points, min, max }`，所以設定畫面可以強制套用範圍。

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

`resolveFantasyScoring(sport, overrides?)` 以一般數字回傳規則。覆寫值會被限制在該規則的範圍內，不存在的規則會被忽略。

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

`fantasySportOf(sportType)` 把 `sportType` 對應到四種夢幻運動之一。壘球算棒球，足球沒有對應，所以回傳 `undefined`。

## 常數

| 常數 | 值 |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156（經典五個上限的加總） |
| `scoreMaxTotal` | 100 |
| `breakPenalty` | 15，`context.onBreak` 為 `true` 時固定扣的分數 |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

經典的上限為什麼超過 100 分的頂端，在[每種模式下的 PowerScore 信號](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total)。各組上限的說明在[加成與扣分](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets)。

`scoringOpportunityBaseRunnerBoosts`、`scoringOpportunityRedZoneBoost`、`scoringOpportunityRedZoneFringeBoost`、`redZoneDownMultipliers` 和 `thirdAndShortDistance`，存著得分機會加成背後的確切數值，列在[加成與扣分](/arenaswap/docs/powerscore/boosts-and-penalties/)。較新的加成把數字放在 `goAheadRunTunables`、`twoMinuteDrillTunables`、`noHitterTunables`、`redCardTunables`、`upsetTunables`、`stakesTunables` 和 `hockeyTunables`。

`scorerTunables` 存著引擎評分用的每一個級距值，和上面的常數已經以名稱給出的數字相同，所以使用者可以讀取級距的值，而不必寫死。

`sportTypeConfigs`、`sportTypeConfigMap`、`leagueConfigs`、`leagueConfigMap` 和 `allLeagueIds`，存著引擎每次呼叫都會讀的運動與聯賽調校。它們的欄位，以及各運動和聯賽的實際數值，都在[運動與聯賽設定](/arenaswap/docs/powerscore/configuration/)。

## 2.x API

仍然有匯出，仍然可運作，註明之處則已棄用。3.0 沒有移除任何東西。想用模式或新的加成時，再改用 `scoreGame`。在那之前，它們回傳的數字和以前一樣。

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	winProbabilityHistory?: number[],
): PowerScoreResult
```

已棄用。為經典的五個信號評分，套用勝率修正，回傳平面的 `PowerScoreResult`（`closeness`、`lateGame`、`momentum`、`leadChanges`、`comeback`、`total`、`reason` 等等）。它就是只有信號、再攤平的經典 `scoreGame`，所以不含任何關鍵場面加成。

| 參數 | 預設值 | 備註 |
|---|---|---|
| `game` | 必填 | 目前的比賽狀態。 |
| `history` | `[]` | 近期的比分快照。在這裡累積到至少 3 筆之前，氣勢、領先交替和逆轉都是 0。 |
| `winProbabilityHistory` | `[]` | 近期的勝率值，0 到 1。至少要有 5 個有限的值才會有貢獻。 |

絕不會丟出錯誤。`isPlayFrozen(game)` 為 true 時，立刻回傳全部為零的結果。不檢查 `game.status`：其他欄位相同的話，`'pre'` 或 `'post'` 的比賽和 `'in'` 的比賽得分一樣。

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

已棄用：這個數字在 `scoreGame` 的 `boosts` 清單裡，id 是 `scoringOpportunity`。除非 `game.status === 'in'` 而且比賽沒有凍結，否則回傳 `0`。否則，棒球和壘球依跑者人數回傳 0 到 10，美式足球依紅區的分差和進攻檔數回傳 0 到 15。其他任何 `sportType` 都回傳 `0`，包括冰球，因為冰球的多打少和空網來自 `context`，而這個函式不收 context。不包含在 `computePowerScore` 的 `total` 裡。

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

把勝率歷史對應成 ±5 的修正。先濾掉非有限的項目，如果剩下的有限值少於 5 個，就回傳 `undefined`。否則回傳從 `-scoreWinProbVarianceMax` 到 `scoreWinProbVarianceMax` 的整數。

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

`game.intermission === true` 或 `game.delayed === true` 時回傳 `true`，其他情況回傳 `false`，包括兩個欄位都不存在時。

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

比賽打了例行賽的多少，0 到 1，根據關鍵時刻信號讀的同一個時鐘。想把比賽畫在時間軸上時很好用。

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

已棄用。接收一個局部的、可能不可信的 `PowerScoreResult`（只有 `gameId` 是必填），回傳一個完全限制過範圍的有效結果。`computePowerScore` 對它產生的每個結果，都會在內部呼叫這個函式。

五個信號欄位各自限制在自己的上限內。`total` 限制在 `scoreMaxTotal` 以內，除非 `options.allowTotalOverflow` 為 `true`。有了這個選項，它只限制最小值為 `0`，讓手動加成可以刻意把它推過 100。缺少或非有限的 `total`，會退回五個信號的加總減去 `breakPenalty`，不是原始加總。`reason` 不是字串時，退回 `scorerTunables.reasons.fallback`（"best game available"）。有提供 `favoriteBonus`、`favoriteTeamCount`、`gameBoost`、`scoringOpportunityBoost` 和 `postseasonBoost` 時，會四捨五入並以 `0` 為下限。沒提供時，它們會整個從結果中省略，不會預設為 `0`。絕不會丟出錯誤。

### 改用新版會有什麼變化

經典透過 `scoreGame` 會包含新的加成，所以同一場比賽在那裡的得分可能比 `computePowerScore` 高，最多高到各組的上限。你以前在 `normalizePowerScoreResult` 周圍手動加上的收藏、季後賽和手動加成，現在是 `scoreGame` 的選項。其他一切都照舊。`Game` 型別多了選填欄位和一個聯賽型別參數，單純的 `Game` 意思和以前一樣。以前，表裡沒有的聯賽 id，不管是哪項運動，都用 NBA 的設定評分。現在它拿到自己那項運動的預設值，所以未知聯賽裡的冰球比賽，會拿到 NHL 的節數和時鐘。
