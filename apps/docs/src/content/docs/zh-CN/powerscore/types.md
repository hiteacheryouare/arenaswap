---
sourceHash: '40ee38646993'
title: PowerScore 的 TypeScript 类型
description: Game、ScoringContext、ScoreOptions、PowerScore 以及模式和配置类型上的每个字段，哪些是可选的，以及可选字段缺失时会发生什么。
section: powerscore
order: 7
navLabel: 类型
---

PowerScore 3 的类型分三组。您交给 `scoreGame` 的：[`Game`](#game)、[`ScoringContext`](#scoringcontext) 和 [`ScoreOptions`](#scoreoptions)。您拿回来的：[`PowerScore`](#powerscore)。以及一个模式由什么组成：[`PowerScoreMode`](#powerscoremode) 及其各部分。2.x 的类型在最后，仍然导出，仍然可用。

## Game

比赛此刻的状态。只有 `id`、`league`、`sportType` 和两队的比分是必填的。其余的字段，有就能让分数更精确。每个可选字段缺失时，都被当成未知，而不是默认值。

`Game` 对联赛 id 是泛型的：`Game<League extends string = LeagueId>`。不带参数的 `Game` 含义和以前一样。自带联赛 id 的数据源，用 `Game<string>`。

| 字段 | 类型 | 缺失意味着 |
|---|---|---|
| `id` | `string` | 必填。 |
| `league` | `League` | 必填。`leagueConfigMap` 不认识的 id，按它所属运动的默认值评分（见[运动与联赛配置](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship)）。 |
| `sportType` | `SportType` | 必填。`sportTypeConfigMap` 不认识的值，回退到篮球的调校。 |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | 必填。 |
| `period?` | `number` | 关键时刻的压力读作 `0`。接近度仍会打分，但比赛进程也读作 `0`，所以它只给固定的底分，而不是更完整的档位值。 |
| `clockSeconds?` | `number` | 当成未知，而不是 `0:00`。关键时刻的攀升停在该阶段的开头，每一项受时钟限制的加成都给 0 分。 |
| `intermission?` | `boolean` | `false`。`true` 会让比赛停滞：在比赛恢复之前，一切都得 0 分。 |
| `delayed?` | `boolean` | `false`。`true` 会让比赛停滞，和 `intermission` 一样。 |
| `status?` | `'pre' \| 'in' \| 'post'` | 除了 `'in'`，加成对其他任何值（包括缺失）都一分不给。信号不读它。 |
| `topOfInning?` | `boolean` | 棒球和垒球。得分介于该局上半和下半的接近度数值之间。反超分和无安打需要它。 |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | 棒球和垒球。当成垒上没有跑垒员。 |
| `outs?` | `number` | 棒球和垒球。当成 0。到了 3，基于跑垒员的加成一分不给。 |
| `possession?` | `'home' \| 'away'` | 橄榄球，或数据源提供时的冰球。没有它，两分钟进攻给 0 分，梦幻模式也没有橄榄球局面。 |
| `yardsToEndZone?` | `number` | 橄榄球。持球一方还需要推进的码数。两分钟进攻和梦幻模式需要它。 |
| `isRedZone?` | `boolean` | 仅限橄榄球。`false` 或缺失，意味着得分机会加成里的红区情形给 0 分。 |
| `down?` | `number` | 仅限橄榄球。落到不加权（×1）的倍数，而不是整个丢掉加成。在两分钟进攻和梦幻模式里，小于 1 的 `down` 读作两次进攻之间。 |
| `distance?` | `number` | 仅限橄榄球。在第三档时，缺失的值没资格算作第三档短码，所以落到 ×1。 |
| `isGoalToGo?` | `boolean` | 仅限橄榄球，而且只在第四档才会改变任何东西。 |
| `series?` | [`SeriesState`](#seriesstate) | 没有系列赛，所以赛事重要程度什么也读不到。 |
| `redCards?` | [`RedCard[]`](#redcard) | 足球。没有红牌。 |
| `seasonType?` | `'regular' \| 'postseason'` | 当它这样说，或设置了 `postseasonRound` 时，赛事重要程度把比赛当成季后赛，其余情况当成常规赛。 |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | 没有季后赛加成。`0` 决定冠军，`1` 是半决赛，`2` 是四分之一决赛，`3` 是更早的任何轮次。 |

`SportId` 是 `LeagueId` 已弃用的别名，为了兼容 1.x 而保留。请用 `LeagueId`。

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

| 字段 | 缺失意味着 |
|---|---|
| `score` | 必填。 |
| `abbreviation` | 当 `nickname` 也缺失时，在原因里用它称呼球队；两者都缺失时显示为 `?`。 |
| `nickname` | 原因里对球队的称呼：“Lakers”“Nittany Lions”，或者足球俱乐部的简称，比如“Portland”。回退到 `abbreviation`。 |
| `rank` | 这支球队没有排名。淘汰赛对阵表的种子序号也不要填：这是民调排名，1 是最好。赛事重要程度要求两支球队都有。 |
| `hits` | 棒球和垒球。没有安打数，所以无安打无法给分。`0` 是一个真实的值：它表示一支没有安打的球队。 |
| `errors` | 棒球和垒球。目前没有任何得分会读取它。 |
| `timeouts` | 橄榄球。两分钟进攻对时钟控制用一个中性的权重。 |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

短于三场两胜制的系列赛，一分不给。

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

比赛本身不带的所有东西。每个字段都是可选的，`scoreGame` 把整个对象作为第二个参数。

| 字段 | 类型 | 缺失意味着 |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | 在它有 3 项之前，势头、领先权易手和逆转保持为 0。最早的在前。 |
| `onBreak?` | `boolean` | 调用方已经检测到广告时段。`true` 会从信号小计里扣掉 `breakPenalty`（15）。缺失时不扣广告时段分。 |
| `winProbability?` | `number[]` | 整场比赛中主队的胜率，0 到 1。需要 5 个有限值才有意义。否则没有修正。 |
| `pregameLine?` | [`PregameLine`](#pregameline) | 冷门预警和冷门溃败给 0 分。 |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | 没有争夺的赛事重要程度。见 [`TeamStakes`](#teamstakes)。 |
| `powerPlay?` | `'home' \| 'away' \| boolean` | 得分机会加成里没有强攻。数据说了是谁就给一方，只说有一方在强攻时给 `true`。 |
| `emptyNet?` | `'home' \| 'away' \| boolean` | 得分机会加成里没有空门。只有在数据连续两次轮询都报告之后才设置它。 |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | 根据数据源自己的比赛实录统计的领先权易手次数（它能看到两次轮询之间的翻转），连同最近一次的时间。当它数得比 `history` 显示的多时才使用。领先权易手仍然需要那 3 份快照。 |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | 梦幻模式没有球员，比赛按经典打分。 |

### ScoreSnapshot

一场比赛比分在某一时刻的记录，用来检测势头、领先权易手和逆转。四个字段都是必填的。

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

`timestamp` 只需要相对于同一数组里的其他快照。衰减是相对于最新一份快照的时间戳来衡量的，不是相对于挂钟时间。重放同样的历史，不管什么时候重放，结果都一样。

### PregameLine

比赛开始前的盘口。实时盘口会随比分移动，会抹掉一场冷门。

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

`spread` 是让给热门的分数，用正数表示，只有篮球和橄榄球会读它。两个独赢盘口都有时，会先去掉庄家的抽水再使用。`drawMoneyline` 是足球的三项盘口。单独的跑垒让分盘或冰球让分盘，只能说明谁是热门，说不出差多少，所以不够用。

### TeamStakes

一支球队的赛季末争夺标记，仅限常规赛。

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

`canClinch` 表示赢下这场，不管其他结果如何，都能锁定一个席位、一个分区冠军或一个冠军头衔。`canBeEliminated` 表示输掉就会让这支球队出局。`inRace` 表示仍在争夺中，既不安全，也没出局。`nearLine` 表示离积分榜上的某条界线只差几分。

### FantasyPlayerState

比赛里一名在阵容中的球员。

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

`FantasyPosition` 是 `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'`：橄榄球的位置，棒球的投手和打者，以及其他运动里的通用球员。`name` 会出现在原因里，比如“Mahomes in the red zone”。`active: false` 表示数据说这名球员已经离开比赛，他不计分。`role` 仅限棒球：球员在这一局里的位置。`pointEvents` 是按到来顺序记录的梦幻得分，所以最近的产出会像其他事件一样衰减。

## ScoreOptions

怎么打分。每个字段都是可选的，`scoreGame` 把这个对象作为第三个参数。

| 字段 | 类型 | 作用 |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | 用哪种模式给比赛打分。缺失时是经典。 |
| `disabledSignals?` | `readonly string[]` | 要关掉的该模式的信号 id。其余的会被重新缩放到该模式的完整范围。 |
| `classicDisabledSignals?` | `readonly string[]` | 经典被混入或用作保底时，要在经典里关掉的信号 id。 |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | 覆盖该模式自己的混合，比如观众的梦幻滑块。 |
| `favoriteTeamCount?` | `number` | 比赛里有多少支收藏球队。 |
| `favoriteBoostPoints?` | `number` | 每支收藏球队给的分。 |
| `postseasonBoostPoints?` | `number` | 决定冠军的比赛给的分。更早的轮次拿到一个份额。 |
| `gameBoost?` | `number` | 一个手动加成。唯一允许把总分推过 100 的东西。 |
| `sport?` | `Partial<SportTypeConfig>` | 用于内置表不匹配的运动，或用来调校它们。 |
| `league?` | `Partial<LeagueConfig>` | 用于内置表不认识的联赛。设置 `regularPeriods` 和 `periodDurationSecs`。 |

## PowerScore

`scoreGame` 返回的东西。

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

| 字段 | 含义 |
|---|---|
| `modeId` | 实际给这场比赛打分的模式。不适用的模式，比如比赛里没有阵容球员的梦幻模式，会回退到 `'classic'`。 |
| `total` | 0 到 100，只有通过 `gameBoost` 才能超过 100。 |
| `signals` | 该模式定义的每个信号，带着它的上限，即使是 0。见 [`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment)。 |
| `signalsSubtotal` | 已启用信号的总和，在为被关掉的信号做任何重新缩放之前。 |
| `scaledSubtotal` | 重新缩放之后的同一个值，封顶在 `signalCeiling`。 |
| `signalCeiling` | 该模式各上限之和：经典是 156。 |
| `frozen` | 在中场休息、休息或中断时为 `true`。一切得 0 分，`reason` 为空。 |
| `onBreak`、`breakPenalty` | 是否应用了广告时段扣分，以及它扣了多少分（始终 ≥ 0）。在停滞的分数上，两者分别是 `false` 和 `0`。 |
| `winProbabilityVariance?` | −5 到 +5。胜率数据不够时是缺失，不是 `0`。 |
| `baseTotal` | 信号减去广告时段扣分再加上修正，0 到 100，在任何加成之前。 |
| `classicTotal?` | 当模式与经典混合时，经典自己的总分。 |
| `blend?` | 混合模式是怎么得出它的总分的。见 [`BlendResult`](#blendresult)。 |
| `boosts` | 该模式给出的每一项加成，没有给分时为 0。加上您要了之后的 `favoriteBoost`、`postseasonBoost` 和 `gameBoost`。 |
| `reasons` | 最多三句平实的事实，作为可以直接翻译的片段：此刻在发生什么，刚刚发生了什么，比分和时间，以及什么悬而未决。每个键见 [README 的原因表](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/powerscore/README.md#reasons)。 |
| `reason` | 同样的内容，用英文，写成句子。是显示文本，不是 API：不同版本之间，措辞可能变化。不要拿它来匹配。 |

### ScoredSignal、ScoredBoost 和 ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number>; details?: ReasonFragment[] }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

加成上的 `meta` 带着界面可能想说的东西，比如无安打上的 `{ inning: 8 }`，或两分钟进攻上的 `{ secondsLeft: 95, trailBy: 3 }`。一个原因片段长这样：`{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } }`。内置模式认识的原因键，在 `reason` 里渲染成英文。您自己的键则原样渲染，所以请从 `reasons` 翻译，不要从那个字符串翻译。

加成上的 `details` 说明这场比赛里正在发生什么、是加成为它给分，还是没有给，形式是供界面翻译的原因片段：赛事重要程度上的 `{ key: 'seriesClinch', params: { team: 'CHW' } }`，或者冰球 6 打 4 时同时出现的撤下门将和强攻。没什么可说时，它是缺失的，比如比赛开始之前，或比赛停止期间。这些键没有英文渲染器；下表列出了内置加成发送的每一个键，以及 ArenaSwap 为它显示的句子。

| 加成 | 键 | 参数 | 英文原文 |
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

一个模式，就是一串信号，加上适合它的加成。用 [`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode) 构建，它会一次性提前检查。

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

| 字段 | 含义 |
|---|---|
| `signals`、`boosts` | 按显示顺序。 |
| `bucketCaps` | 一组加成合起来最多能加多少。列表里靠前的加成先发放。 |
| `reasonPriority` | 原因可以被读取的信号 id，最值得读的排在最前。最强的那个给出“刚刚发生了什么”那句；顺序用来打破平局。 |
| `usesBreakPenalty`、`usesWinProbability` | 广告时段扣分和 ±5 的修正是否适用。 |
| `classicBlend` | 这个模式怎么与经典组合。 |
| `paysPostseason?` | `false` 表示这个模式不给季后赛加成。默认 `true`。一边倒把它设为 `false`，因为季后赛里的一边倒，结果已经定了。 |
| `appliesTo` | 对这个模式没什么可说的比赛返回 `false`，这场比赛就按经典打分。 |

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

信号的 `points` 被限制在它的 `ceiling` 以内。加成自己没有上限，但它所在的分组可能有上限。

### SignalInput

`compute` 接收的东西。

| 字段 | 含义 |
|---|---|
| `game`、`context` | 传给 `scoreGame` 的东西。 |
| `sport`、`league` | 解析后的 [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig) 和 `LeagueConfig`，在应用了 `options` 里的任何覆盖之后。 |
| `progress` | 比赛开始时为 0，常规时间结束时以及整个加时赛期间为 1。 |
| `now` | `history` 里最新一份快照的时间戳，没有快照时为 0。 |
| `margin` | 比分差的绝对值。 |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

一边倒用的是保底，系数为 0.3。梦幻用的是加成，权重为 0.6，所以有您球员的比赛，只会比它的经典得分更高。内置模式不用 `mix`，但它留着，供您自己的模式使用。

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

当一个模式与经典混合时，`score.blend` 会带着一份，这样详细分析就能显示算术过程。

## SportTypeConfig 和 LeagueConfig

`SportTypeConfig` 保存一项运动怎么打的一切。包括接近度阈值、势头和逆转的阈值、衰减半衰期、这项运动有没有时钟，以及（仅限棒球和垒球）一个 `lateGameCurve`。`LeagueConfig` 保存一个具体联赛的每个阶段打多久：`id`、`label`、`sportType`、`regularPeriods`、`periodDurationSecs` 和 `periodFormat`。它还带有几个字段，供 ArenaSwap 自己抓取数据和画日程横杠，评分器不读它们。

有几个字段是可选的，只有部分条目设置了它们：`lateGameCurve`（棒球和垒球）、`clockIsFullGameElapsed`（足球）、`zeroZeroPenaltyPeriods`（冰球和足球），以及 `knockoutRunMinutes`（两届世界杯和两项奥运足球赛事）。通过 `options.sport` 和 `options.league`，您可以把任何子集作为 `Partial` 传入，在每次调用时覆盖一个。逐字段的含义，以及每项运动和每个联赛的实际值，都在[运动与联赛配置](/arenaswap/docs/powerscore/configuration/)里。

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

只有棒球和垒球设置 `SportTypeConfig.lateGameCurve`。有时钟的运动直接从 `period` 和 `clockSeconds` 推出关键时刻的攀升，这个字段保持 `undefined`。对有时钟的运动，这里没有别的需要配置，所以这个类型目前只有一种形状。

## ScorerTunables

那个唯一导出的对象，保存引擎打分用的每一个档位值。它是一个完整填充的常量，不是部分配置。

| 分支 | 保存什么 |
|---|---|
| `scores.closeness` | 接近度各档位的上限（`tied`、`tight`、`zeroZero`、`close`、`fringe`、`none`）。见[经典的接近度信号](/arenaswap/docs/powerscore/signals/#closeness)。 |
| `scores.closenessFlatFloor` | 每个接近度档位在按进程缩放之前给出的固定底分。 |
| `scores.lateGame` | 关键时刻的上限、加时预加成，以及上一阶段的触碰。见[关键时刻](/arenaswap/docs/powerscore/signals/#late-game-pressure)。 |
| `scores.momentum` | 势头的两个档位值。见[势头](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor)。 |
| `scores.leadChanges` | 领先权易手的两个档位值。 |
| `scores.comeback` | 逆转的两个档位值和它的固定底分。 |
| `scores.winProbabilityVariance` | `maxAvgDist` 和 `minDataPoints`，列在[加成与扣分](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance)里。 |
| `reasons` | 只有 `fallback`（"best game available"），即已弃用的扁平结果回退使用的原因。英文措辞在 `renderReasonEnglish` 里。 |

## FantasyRule 和 FantasySport

[`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints) 背后的类型。

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

`min` 和 `max` 是设置界面可以强制执行的上下限，`resolveFantasyScoring` 会把覆盖值限制在它们之内。

## SportType 和 LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

`SportType` 是封闭的联合类型。`LeagueId` 是有内置调校的 31 个联赛，但它不限制 `Game`：用 `Game<string>` 时，比赛的 `league` 可以是任何字符串，表里不认识的 id，按它所属运动的默认值评分。31 个联赛 id 的完整列表在[运动与联赛配置](/arenaswap/docs/powerscore/configuration/)里。它在运行时也以 `allLeagueIds` 提供。

## PowerScoreResult (2.x)

已弃用，仍然导出，仍然可用。`computePowerScore` 的扁平输出，也是 `normalizePowerScoreResult` 接受其部分版本的形状。`scoreGame` 不返回它。

| 字段 | 类型 | 缺失意味着 |
|---|---|---|
| `gameId` | `string` | 这个类型出现的每个地方都必填。 |
| `total` | `number` | 由 `computePowerScore` 设置。0 到 `scoreMaxTotal`（100），除非是通过带 `allowTotalOverflow` 的 `normalizePowerScoreResult` 产出的。 |
| `closeness` | `number` | 0 到 `scoreMaxCloseness`（42）。 |
| `lateGame` | `number` | 0 到 `scoreMaxLateGame`（38）。 |
| `momentum` | `number` | 0 到 `scoreMaxMomentum`（38）。 |
| `leadChanges` | `number` | 0 到 `scoreMaxLeadChanges`（18）。 |
| `comeback` | `number` | 0 到 `scoreMaxComeback`（20）。 |
| `winProbabilityVariance?` | `number` | −`scoreWinProbVarianceMax` 到 `scoreWinProbVarianceMax`（±5）。当没有提供胜率历史，或可用的太少时，是缺失，不是 `0`。 |
| `reason` | `string` | 缺失或不是字符串时，回退到 `scorerTunables.reasons.fallback`（"best game available"）。 |
| `onBreak?` | `boolean` | 缺失读作 `false`。是布尔值时，`normalizePowerScoreResult` 会原样传递。 |
| `breakPenalty?` | `number` | 扣掉的分数，始终 ≥ 0。没有提供时是缺失，不是 `0`。`computePowerScore` 不设置它。 |
| `signalsSubtotal?` | `number` | 五个信号在扣广告时段分之前的总和，0 到 `scoreMaxSignalsSubtotal`（156）。 |
| `favoriteBonus?`、`favoriteTeamCount?`、`gameBoost?`、`scoringOpportunityBoost?`、`postseasonBoost?` | `number` | `computePowerScore` 不计算。除非调用方提供，否则缺失。 |

`scoreGame` 替您并入了收藏球队加成、季后赛加成和比赛加成，所以用它时，您永远不需要手工构建 `PowerScoreResult`。2.x 仍然导出的全部内容，列在 [API 参考](/arenaswap/docs/powerscore/api-reference/#the-2x-api)里。
