---
sourceHash: '40ee38646993'
title: PowerScore TypeScript 型別
description: Game、ScoringContext、ScoreOptions、PowerScore，以及模式和設定型別的每個欄位，哪些是選填，以及選填欄位缺漏時會發生什麼事。
section: powerscore
order: 7
navLabel: 型別
---

PowerScore 3 的型別分成三組。你交給 `scoreGame` 的：[`Game`](#game)、[`ScoringContext`](#scoringcontext) 和 [`ScoreOptions`](#scoreoptions)。你拿回來的：[`PowerScore`](#powerscore)。以及組成一個模式的東西：[`PowerScoreMode`](#powerscoremode) 和它的各個部分。2.x 的型別放在最後，仍然有匯出，也仍然可運作。

## Game

比賽此刻的狀態。只有 `id`、`league`、`sportType` 和兩隊的分數是必填。其他欄位只要有提供，就能讓評分更精準。選填欄位缺漏時，視為未知，而不是預設值。

`Game` 對聯賽 id 是泛型：`Game<League extends string = LeagueId>`。單純的 `Game` 意思和以前一樣。自帶聯賽 id 的資料來源用 `Game<string>`。

| 欄位 | 型別 | 缺漏代表 |
|---|---|---|
| `id` | `string` | 必填。 |
| `league` | `League` | 必填。`leagueConfigMap` 不認得的 id，會用它那項運動的預設值評分（見[運動與聯賽設定](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship)）。 |
| `sportType` | `SportType` | 必填。`sportTypeConfigMap` 不認得的值，會退回籃球的調校。 |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | 必填。 |
| `period?` | `number` | 關鍵時刻的壓力視為 `0`。接近度仍然會評分，但比賽進度也視為 `0`，所以只給固定的下限，而不是較完整的級別分數。 |
| `clockSeconds?` | `number` | 視為未知，不是 `0:00`。關鍵時刻的攀升停在該節開始處，每一項受時鐘限制的加成都給 0 分。 |
| `intermission?` | `boolean` | `false`。`true` 會凍結比賽：在比賽恢復之前，一切都是 0 分。 |
| `delayed?` | `boolean` | `false`。`true` 會凍結比賽，和 `intermission` 一樣。 |
| `status?` | `'pre' \| 'in' \| 'post'` | 不是 `'in'` 的任何值，包括缺漏，加成都不給分。信號不讀它。 |
| `topOfInning?` | `boolean` | 棒球和壘球。在該局上半和下半的接近度數值之間評分。超前跑者上壘和無安打比賽需要它。 |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | 棒球和壘球。視為壘上沒有跑者。 |
| `outs?` | `number` | 棒球和壘球。視為 0。到 3 時，依跑者計算的加成不給分。 |
| `possession?` | `'home' \| 'away'` | 美式足球，或資料來源有回報冰球時的球權。沒有它，兩分鐘進攻給 0 分，夢幻也沒有美式足球的戰局。 |
| `yardsToEndZone?` | `number` | 美式足球。持球隊還需要推進的碼數。兩分鐘進攻和夢幻需要它。 |
| `isRedZone?` | `boolean` | 僅限美式足球。`false` 或缺漏，代表得分機會加成的紅區情況給 0 分。 |
| `down?` | `number` | 僅限美式足球。會落到不加權的（×1）倍數，而不是整個加成消失。在兩分鐘進攻和夢幻中，小於 1 的 `down` 代表兩次進攻之間。 |
| `distance?` | `number` | 僅限美式足球。在第三檔，缺漏的值無法符合第三檔短碼，所以落到 ×1。 |
| `isGoalToGo?` | `boolean` | 僅限美式足球，而且只在第四檔會改變結果。 |
| `series?` | [`SeriesState`](#seriesstate) | 沒有系列賽，所以利害關係什麼也讀不到。 |
| `redCards?` | [`RedCard[]`](#redcard) | 足球。沒有出牌。 |
| `seasonType?` | `'regular' \| 'postseason'` | 這個欄位指明，或設了 `postseasonRound` 時，利害關係把比賽當成季後賽，否則當成例行賽。 |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | 沒有季後賽加成。`0` 決定冠軍，`1` 是準決賽，`2` 是八強賽，`3` 是更早的輪次。 |

`SportId` 是 `LeagueId` 已棄用的別名，為了相容 1.x 而保留。請用 `LeagueId`。

### TeamState

```ts
interface TeamState {
	score: number;
	abbreviation?: string;
	nickname?: string;
	rank?: number;
	hits?: number;
	errors?: number;
	timeouts?: number;
}
```

| 欄位 | 缺漏代表 |
|---|---|
| `score` | 必填。 |
| `abbreviation` | 在 `nickname` 也缺漏時，用來在原因中稱呼球隊，兩者都缺漏時顯示為 `?`。 |
| `nickname` | 原因裡怎麼稱呼這支球隊：「Lakers」、「Nittany Lions」，或像「Portland」這樣的足球俱樂部簡稱。退回 `abbreviation`。 |
| `rank` | 球隊沒有排名。淘汰賽種子序也請留空：這是民調排名，1 最好。利害關係需要兩隊都有。 |
| `hits` | 棒球和壘球。沒有安打數，所以無安打比賽無法給分。`0` 是真實的值：代表沒有安打的球隊。 |
| `errors` | 棒球和壘球。目前沒有任何評分會讀它。 |
| `timeouts` | 美式足球。兩分鐘進攻對時鐘控制用中性的權重。 |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

短於三戰兩勝的系列賽不給分。

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

比賽本身沒帶的一切。每個欄位都是選填，`scoreGame` 把整個物件當成第二個參數。

| 欄位 | 型別 | 缺漏代表 |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | 在累積到 3 筆之前，氣勢、領先交替和逆轉都是 0。由舊到新。 |
| `onBreak?` | `boolean` | 呼叫端偵測到了廣告時段。`true` 會從信號小計中扣掉 `breakPenalty`（15）。缺漏時沒有廣告時段扣分。 |
| `winProbability?` | `number[]` | 整場比賽中主隊的勝率，0 到 1。需要 5 個有限的值才有意義。否則沒有修正。 |
| `pregameLine?` | [`PregameLine`](#pregameline) | 爆冷關注和爆冷給 0 分。 |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | 沒有爭奪戰的利害關係。見 [`TeamStakes`](#teamstakes)。 |
| `powerPlay?` | `'home' \| 'away' \| boolean` | 得分機會加成中沒有多打少。資料來源有說是哪一方時，填那一方，只說有一方在多打少時，填 `true`。 |
| `emptyNet?` | `'home' \| 'away' \| boolean` | 得分機會加成中沒有空網。請等資料來源連續兩次輪詢都回報之後，才設定它。 |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | 從資料來源自己的比賽記錄算出的領先交替次數，能看見兩次輪詢之間的易位，附上最近一次的時間。當它算出的比 `history` 顯示的多時才使用。領先交替仍然需要 3 筆快照。 |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | 夢幻沒有任何球員，比賽以經典評分。 |

### ScoreSnapshot

一場比賽比分的某個時間點紀錄，用來偵測氣勢、領先交替和逆轉。四個欄位都是必填。

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

`timestamp` 只需要和同一個陣列裡的其他快照相對即可。衰減是對照最新快照的時間戳來衡量，不是對照實際時間。不管什麼時候重播，同一份歷史都會產生同樣的結果。

### PregameLine

開賽前的盤口。即時盤口會隨比分移動，會抹掉一場爆冷。

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

`spread` 是熱門讓出的分數，以正數表示，只有籃球和美式足球會讀它。兩個獨贏盤都有時，會先去掉莊家的抽水再使用。`drawMoneyline` 是足球的三項盤口。單獨的讓分盤（棒球的 run line 或冰球的 puck line）只說得出誰是熱門，說不出差多少，所以不夠用。

### TeamStakes

單一球隊的賽季尾聲爭奪旗標，僅限例行賽。

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

`canClinch` 代表不管其他結果如何，贏下這場就能鎖定一個名額、一個分區冠軍或冠軍。`canBeEliminated` 代表輸球就會被踢出爭奪。`inRace` 代表仍在爭取，既不安全也沒出局。`nearLine` 是離積分榜上的某條分界線只差幾分。

### FantasyPlayerState

比賽中一位陣容裡的球員。

```ts
interface FantasyPlayerState {
	id: string;
	name?: string;
	side: 'home' | 'away';
	position: FantasyPosition;
	active?: boolean;
	role?: 'atBat' | 'onDeck' | 'inHole' | 'pitching';
	pointEvents?: { at: number; points: number }[];
}
```

`FantasyPosition` 是 `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'`：美式足球的位置、棒球的投手和打者，以及其他運動通用的球員。`name` 會出現在原因裡，例如「Mahomes in the red zone」。`active: false` 代表資料來源說這位球員已經離開比賽，他不算分。`role` 僅限棒球：球員在該局中的位置。`pointEvents` 是夢幻分數進來時的原樣紀錄，所以近期的表現會像其他事件一樣衰減。

## ScoreOptions

怎麼評分。每個欄位都是選填，`scoreGame` 把這個物件當成第三個參數。

| 欄位 | 型別 | 作用 |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | 用哪個模式為比賽評分。缺漏時是經典。 |
| `disabledSignals?` | `readonly string[]` | 要關掉的該模式信號 id。其餘的會重新縮放到該模式的完整範圍。 |
| `classicDisabledSignals?` | `readonly string[]` | 經典被混合進來或當成下限時，要在經典裡關掉的信號 id。 |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | 覆寫該模式自己的混合方式，例如觀眾的夢幻滑桿。 |
| `favoriteTeamCount?` | `number` | 比賽中有幾支收藏球隊。 |
| `favoriteBoostPoints?` | `number` | 每支收藏球隊的分數。 |
| `postseasonBoostPoints?` | `number` | 決定冠軍的比賽的分數。較早的輪次拿其中一部分。 |
| `gameBoost?` | `number` | 手動加成。唯一能把總分推過 100 的東西。 |
| `sport?` | `Partial<SportTypeConfig>` | 用在內建表格對不上的運動，或用來調整它們。 |
| `league?` | `Partial<LeagueConfig>` | 用在內建表格不認得的聯賽。設定 `regularPeriods` 和 `periodDurationSecs`。 |

## PowerScore

`scoreGame` 回傳的東西。

```ts
interface PowerScore {
	gameId: string;
	modeId: string;
	total: number;
	signals: ScoredSignal[];
	signalsSubtotal: number;
	scaledSubtotal: number;
	signalCeiling: number;
	frozen: boolean;
	onBreak: boolean;
	breakPenalty: number;
	winProbabilityVariance?: number;
	baseTotal: number;
	classicTotal?: number;
	blend?: BlendResult;
	boosts: ScoredBoost[];
	reasons: ReasonFragment[];
	reason: string;
}
```

| 欄位 | 意思 |
|---|---|
| `modeId` | 實際為比賽評分的模式。不適用的模式，例如比賽裡沒有任何陣容球員的夢幻，會退回 `'classic'`。 |
| `total` | 0 到 100，只有透過 `gameBoost` 才會超過 100。 |
| `signals` | 該模式定義的每個信號，附上它的上限，即使是 0 分。見 [`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment)。 |
| `signalsSubtotal` | 已啟用信號的加總，在為停用的信號重新縮放之前。 |
| `scaledSubtotal` | 重新縮放之後的同一個數字，上限是 `signalCeiling`。 |
| `signalCeiling` | 該模式各上限的加總：經典是 156。 |
| `frozen` | 中場休息、局間休息或延賽時為 `true`。一切得 0 分，`reason` 為空。 |
| `onBreak`、`breakPenalty` | 有沒有套用廣告時段扣分，以及扣了多少分（一律 ≥ 0）。在凍結的分數上，兩者分別是 `false` 和 `0`。 |
| `winProbabilityVariance?` | −5 到 +5。勝率資料不足時是缺漏，不是 `0`。 |
| `baseTotal` | 信號減去廣告時段扣分、再加上修正，0 到 100，在任何加成之前。 |
| `classicTotal?` | 經典自己的總分，當該模式與它混合時才有。 |
| `blend?` | 混合後的模式如何得到它的總分。見 [`BlendResult`](#blendresult)。 |
| `boosts` | 該模式給的每一項加成，沒給分時是 0。你要求之後，還會加上 `favoriteBoost`、`postseasonBoost` 和 `gameBoost`。 |
| `reasons` | 最多三句平實的事實，以可直接翻譯的片段呈現：現在正在發生什麼、剛剛發生了什麼、比分和時間，以及什麼事攸關勝負。每個 key 見 [README 的原因表](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/powerscore/README.md#reasons)。 |
| `reason` | 同樣的內容，以英文句子呈現。是顯示用的文字，不是 API：不同版本之間，措辭可能改變。不要拿它來比對。 |

### ScoredSignal、ScoredBoost 和 ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number>; details?: ReasonFragment[] }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

加成上的 `meta` 帶著介面可能想說的東西，例如無安打比賽上的 `{ inning: 8 }`，或兩分鐘進攻上的 `{ secondsLeft: 95, trailBy: 3 }`。原因片段長得像 `{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } }`。內建模式認得的原因 key，會在 `reason` 裡以英文呈現。你自己的 key 照原樣呈現，所以要從 `reasons` 翻譯，不要從字串翻譯。

加成上的 `details` 說的是，這場比賽中有什麼事是這項加成給分（或不給分）的依據，以原因片段的形式交給介面翻譯：利害關係上的 `{ key: 'seriesClinch', params: { team: 'CHW' } }`，或冰球 6 打 4 時同時出現的撤下守門員和多打少。沒有話可說時，它是缺漏的，例如比賽開始之前，或比賽暫停時。這些 key 沒有英文的轉換函式；下表列出內建加成送出的每一個 key，以及 ArenaSwap 為它顯示的句子。

| 加成 | Key | 參數 | 英文 |
| --- | --- | --- | --- |
| `scoringOpportunity` | `basesEmpty` | — | Bases empty, so there's nobody to bring home. |
| `scoringOpportunity` | `runnerFirst` | — | A runner on first. |
| `scoringOpportunity` | `runnerSecond` | — | A runner on second, in scoring position. |
| `scoringOpportunity` | `runnerThird` | — | A runner on third, one base from home. |
| `scoringOpportunity` | `runnersFirstSecond` | — | Runners on first and second. |
| `scoringOpportunity` | `runnersFirstThird` | — | Runners on the corners. |
| `scoringOpportunity` | `runnersSecondThird` | — | Runners on second and third, both in scoring position. |
| `scoringOpportunity` | `basesLoaded` | — | Bases loaded. Nowhere to put anybody. |
| `scoringOpportunity` | `inningOver` | — | Three outs, so the bases are clear. |
| `scoringOpportunity` | `outsideRedZone` | — | Nobody's in the red zone. |
| `scoringOpportunity` | `redZone` | `team` | {team} is in the red zone. |
| `scoringOpportunity` | `redZoneThirdAndShort` | `team` | {team} is in the red zone, facing third and short. |
| `scoringOpportunity` | `redZoneFourthDown` | `team` | {team} is in the red zone on fourth down. This snap matters. |
| `scoringOpportunity` | `redZoneNotClose` | `team` | {team} is in the red zone, but the score's too lopsided for it to count. |
| `scoringOpportunity` | `emptyNet` | `team`, `margin`, `clock` | {team} pulled the goalie, down {margin} with {clock} left. |
| `scoringOpportunity` | `powerPlayTied` | — | A power play in a tie game. |
| `scoringOpportunity` | `powerPlayClose` | `margin` | A power play, and only {margin} in it. |
| `scoringOpportunity` | `powerPlayTeamTied` | `team` | {team} is on the power play in a tie game. |
| `scoringOpportunity` | `powerPlayTeamTrailing` | `team`, `margin` | {team} is on the power play, down {margin}. |
| `scoringOpportunity` | `powerPlayTeamLeading` | `team`, `margin` | {team} is on the power play, up {margin}. |
| `scoringOpportunity` | `noScoringPosition` | — | No runners or red zones in this sport, so this one sits out. |
| `goAheadRun` | `goAheadRun` | `team` | {team} has the go-ahead run on base. |
| `goAheadRun` | `tyingRun` | `team` | {team} has the tying run on base. |
| `goAheadRun` | `winningRun` | `team` | {team} has the winning run on base. One swing could end it. |
| `goAheadRun` | `lastChance` | — | It could be their last chance. |
| `twoMinuteDrill` | `driveTied` | `team`, `yards`, `clock` | Tie game. {team} has the ball {yards} yards out with {clock} left. |
| `twoMinuteDrill` | `driveTrailing` | `team`, `trailBy`, `yards`, `clock` | {team} is down {trailBy}, driving from {yards} yards out with {clock} left. |
| `redCard` | `redCard` | `team`, `players`, `minute` | {team} has been down to {players} since {minute}′. |
| `noHitter` | `noHitter` | `team`, `innings` | {team} still doesn't have a hit through {innings} innings. |
| `noHitter` | `doubleNoHitter` | `innings` | Neither team has a hit through {innings} innings. |
| `upsetWatch` | `underdogLeading` | `team`, `chance`, `margin` | Our sources gave {team} a {chance}% chance before the game. They lead by {margin}. |
| `upsetWatch` | `underdogLevel` | `team`, `chance` | Our sources gave {team} a {chance}% chance before the game. It's all square. |
| `upsetWatch` | `underdogClose` | `team`, `chance`, `margin` | Our sources gave {team} a {chance}% chance before the game. They trail by just {margin}. |
| `stakes` | `seriesClinch` | `team` | A win and {team} takes the series. |
| `stakes` | `seriesDecider` | `game` | Game {game}. Winner takes the series. |
| `stakes` | `rankedMeeting` | `rank`, `team`, `otherRank`, `other` | No. {rank} {team} vs. No. {otherRank} {other}. |
| `stakes` | `raceTitle` | `team` | {team} is in the title race. |
| `stakes` | `raceRelegation` | `team` | {team} is in a relegation fight. |
| `stakes` | `raceTopQualification` | `team` | {team} is chasing a top European spot. |
| `stakes` | `raceLine` | `team` | {team} is right on the edge of a playoff or qualifying spot. |
| `stakes` | `raceClinch` | `team` | {team} can clinch with a win. |
| `stakes` | `raceElimination` | `team` | A loss knocks {team} out of the race. |
| `stakes` | `raceHunt` | `team` | {team} is still in the playoff hunt. |
| `postseasonBoost` | `postseasonRound` | `round` | 0 is the final, 1 a semifinal, 2 a quarterfinal, 3 an earlier round |
| `postseasonBoost` | `regularSeason` | — | Regular season, so nothing extra here. |
| `postseasonBoost` | `postseasonBoostOff` | — | Your postseason boost is set to 0 in Settings. |

## PowerScoreMode

模式就是一組信號，加上適合它的加成。用 [`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode) 來建，它會事先檢查一次。

```ts
interface PowerScoreMode {
	id: string;
	signals: readonly SignalDefinition[];
	boosts: readonly BoostDefinition[];
	bucketCaps?: Readonly<Record<string, number>>;
	reasonPriority: readonly string[];
	usesBreakPenalty: boolean;
	usesWinProbability: boolean;
	classicBlend?: ClassicBlend;
	paysPostseason?: boolean;
	appliesTo?: (game: Game<string>, context: ScoringContext) => boolean;
}
```

| 欄位 | 意思 |
|---|---|
| `signals`、`boosts` | 依顯示順序排列。 |
| `bucketCaps` | 一組加成加起來最多能加多少。清單中靠前的加成先給分。 |
| `reasonPriority` | 可以讀取原因的信號 id，最值得讀的排最前面。最強的那個給出「剛剛發生了什麼」那一句，順序用來決定平手時誰先。 |
| `usesBreakPenalty`、`usesWinProbability` | 廣告時段扣分和 ±5 的修正是否適用。 |
| `classicBlend` | 該模式如何與經典結合。 |
| `paysPostseason?` | `false` 會讓這個模式不給季後賽加成。預設為 `true`。一面倒設成 `false`，因為季後賽的大比分已經定了勝負。 |
| `appliesTo` | 對模式沒話可說的比賽回傳 `false`，該場比賽就以經典評分。 |

### SignalDefinition 和 BoostDefinition

```ts
interface SignalDefinition {
	id: string;
	ceiling: number;
	compute: (input: SignalInput) => SignalOutput;
}

interface BoostDefinition {
	id: string;
	bucket?: string; // boosts in one bucket share the mode's cap for it
	compute: (input: SignalInput) => BoostOutput;
}

interface SignalOutput { points: number; reason?: ReasonFragment }
interface BoostOutput extends SignalOutput { meta?: Record<string, number>; details?: ReasonFragment[] }
```

信號的 `points` 會限制在它的 `ceiling` 以內。加成本身沒有上限，但它所屬的組別可能有上限。

### SignalInput

`compute` 收到的東西。

| 欄位 | 意思 |
|---|---|
| `game`、`context` | 傳給 `scoreGame` 的內容。 |
| `sport`、`league` | 套用 `options` 裡的覆寫之後，已解析的 [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig) 和 `LeagueConfig`。 |
| `progress` | 比賽開始是 0，例行賽結束和延長賽中是 1。 |
| `now` | `history` 裡最新快照的時間戳，沒有快照時是 0。 |
| `margin` | 比分差的絕對值。 |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

一面倒用的是係數 0.3 的下限。夢幻用的是權重 0.6 的加成，所以有你球員的比賽，只會比它的經典分數高。內建模式不用 `mix`，但它留給你自己的模式用。

### BlendResult

```ts
interface BlendResult {
	kind: ClassicBlend['kind'];
	weight: number;         // the floor factor or the weight
	ownTotal: number;       // the mode's own total, with its boosts, before blending
	classicTotal: number;   // Classic's, likewise
	floorApplied?: boolean; // for a floor, whether Classic's share won
}
```

當一個模式與經典混合時，`score.blend` 會帶著一個，明細畫面就能顯示運算過程。

## SportTypeConfig 和 LeagueConfig

`SportTypeConfig` 存著一項運動怎麼打的一切。包括接近度門檻、氣勢和逆轉門檻、衰減半衰期、這項運動有沒有時鐘，以及（僅限棒球和壘球）的 `lateGameCurve`。`LeagueConfig` 存著某個特定聯賽的每節多長：`id`、`label`、`sportType`、`regularPeriods`、`periodDurationSecs` 和 `periodFormat`。它還帶著 ArenaSwap 自己抓資料和排程長條用的欄位，評分器不會讀它們。

有幾個欄位是選填，只有部分項目會設定：`lateGameCurve`（棒球和壘球）、`clockIsFullGameElapsed`（足球）、`zeroZeroPenaltyPeriods`（冰球和足球），以及 `knockoutRunMinutes`（兩屆世界盃和兩項奧運足球賽事）。透過 `options.sport` 和 `options.league`，你可以把任何子集合當成 `Partial` 傳入，在單次呼叫中覆寫。每個欄位的意思，以及各運動和聯賽的實際數值，都在[運動與聯賽設定](/arenaswap/docs/powerscore/configuration/)。

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

只有棒球和壘球會設定 `SportTypeConfig.lateGameCurve`。有時鐘的運動，直接從 `period` 和 `clockSeconds` 推導它們的關鍵時刻攀升，這個欄位就留成 `undefined`。以時鐘計算的運動在這裡沒有別的好設定，所以這個型別目前只有一種形狀。

## ScorerTunables

單一匯出的物件，存著引擎評分用的每一個級距值。它是填滿的常數，不是局部設定。

| 分支 | 存放 |
|---|---|
| `scores.closeness` | 接近度各級別的上限（`tied`、`tight`、`zeroZero`、`close`、`fringe`、`none`）。見[經典的接近度信號](/arenaswap/docs/powerscore/signals/#closeness)。 |
| `scores.closenessFlatFloor` | 每個接近度級別在依進度縮放之前，都會給的固定下限。 |
| `scores.lateGame` | 關鍵時刻的上限、延長賽預先加成，以及上一節的觸及。見[關鍵時刻](/arenaswap/docs/powerscore/signals/#late-game-pressure)。 |
| `scores.momentum` | 氣勢的兩個級別值。見[氣勢](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor)。 |
| `scores.leadChanges` | 領先交替的兩個級別值。 |
| `scores.comeback` | 逆轉的兩個級別值，以及它的固定下限。 |
| `scores.winProbabilityVariance` | `maxAvgDist` 和 `minDataPoints`，列在[加成與扣分](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance)。 |
| `reasons` | 只有 `fallback`（"best game available"），也就是已棄用的平面結果退回使用的原因。英文的措辭放在 `renderReasonEnglish`。 |

## FantasyRule 和 FantasySport

[`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints) 背後的型別。

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

`min` 和 `max` 是設定畫面可以強制套用的範圍，`resolveFantasyScoring` 會把覆寫值限制在其中。

## SportType 和 LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

`SportType` 是封閉的聯集。`LeagueId` 是有內建調校的 31 個聯賽，但它不限制 `Game`：用 `Game<string>` 時，比賽的 `league` 可以是任何字串，表裡不認得的 id，會用它那項運動的預設值評分。31 個聯賽 id 的完整清單在[運動與聯賽設定](/arenaswap/docs/powerscore/configuration/)。執行階段也能用 `allLeagueIds` 取得。

## PowerScoreResult（2.x）

已棄用，仍有匯出，仍可運作。`computePowerScore` 的平面輸出，也是 `normalizePowerScoreResult` 接受其局部版本的形狀。`scoreGame` 不回傳它。

| 欄位 | 型別 | 缺漏代表 |
|---|---|---|
| `gameId` | `string` | 在這個型別出現的每個地方都是必填。 |
| `total` | `number` | 由 `computePowerScore` 設定。0 到 `scoreMaxTotal`（100），除非是透過帶 `allowTotalOverflow` 的 `normalizePowerScoreResult` 產生。 |
| `closeness` | `number` | 0 到 `scoreMaxCloseness`（42）。 |
| `lateGame` | `number` | 0 到 `scoreMaxLateGame`（38）。 |
| `momentum` | `number` | 0 到 `scoreMaxMomentum`（38）。 |
| `leadChanges` | `number` | 0 到 `scoreMaxLeadChanges`（18）。 |
| `comeback` | `number` | 0 到 `scoreMaxComeback`（20）。 |
| `winProbabilityVariance?` | `number` | −`scoreWinProbVarianceMax` 到 `scoreWinProbVarianceMax`（±5）。沒有提供勝率歷史，或可用的資料太少時是缺漏，不是 `0`。 |
| `reason` | `string` | 缺漏或不是字串時，退回 `scorerTunables.reasons.fallback`（"best game available"）。 |
| `onBreak?` | `boolean` | 缺漏視為 `false`。`normalizePowerScoreResult` 在它是布林值時會原樣帶過。 |
| `breakPenalty?` | `number` | 扣掉的分數，一律 ≥ 0。沒提供時是缺漏，不是 `0`。`computePowerScore` 不設定它。 |
| `signalsSubtotal?` | `number` | 五個信號在扣廣告時段扣分之前的加總，0 到 `scoreMaxSignalsSubtotal`（156）。 |
| `favoriteBonus?`、`favoriteTeamCount?`、`gameBoost?`、`scoringOpportunityBoost?`、`postseasonBoost?` | `number` | `computePowerScore` 不計算。除非呼叫端提供，否則是缺漏。 |

`scoreGame` 會替你併入收藏、季後賽和比賽加成，所以用它的時候，你永遠不需要手工建出 `PowerScoreResult`。2.x 仍然匯出的一切，都列在 [API 參考](/arenaswap/docs/powerscore/api-reference/#the-2x-api)。
