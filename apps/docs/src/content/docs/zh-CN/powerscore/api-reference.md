---
sourceHash: '91a61d4e6782'
title: PowerScore API 参考
navLabel: API 参考
description: powerscore 导出的每个函数和常量：签名、参数、返回值，以及输入缺失或无效时的行为。包含已弃用的 2.x API。
section: powerscore
order: 6
---

这里的所有内容都从包的根目录导出：`import { ... } from 'powerscore'`。先是 3.0 的函数，然后是辅助函数、内置模式的组成部件、常量，最后是 2.x API，它已弃用，但行为和以前完全一样。类型在 [PowerScore 的 TypeScript 类型](/arenaswap/docs/powerscore/types/)里。

## 评分

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

主入口。用一种模式给比赛打分，返回一个 [`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore)：总分、以列表形式给出的每个信号和加成，以及原因。

| 参数 | 默认值 | 说明 |
|---|---|---|
| `game` | 必填 | 当前的比赛状态。只有 `id`、`league`、`sportType` 和两队的比分是必填的。 |
| `context` | `{}` | 历史记录、胜率、赛前盘口、梦幻阵容，以及比赛本身不带的其余信息。见 [`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext)。 |
| `options` | `{}` | 用哪种模式、关掉哪些信号，以及收藏球队加成、季后赛加成和手动加成。见 [`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions)。 |

可选字段缺失时从不抛出错误：引擎里需要它的那一部分得 0 分。无法识别的 `league` 按它所属运动的默认值评分。输入里任何位置的非有限值，都会被当成缺失，而不是以 `NaN` 传播下去。

停滞的比赛（`intermission` 或 `delayed`）全部得 0 分，包括每一项加成，`reason` 为空。`game.status` 只有加成会读，除非它是 `'in'`，否则加成一分不给。

总分按固定顺序构建：

1. 信号打分。被关掉的信号会被重新缩放掉。
2. 扣掉广告时段扣分。
3. 加上胜率修正（仅限经典）。结果限制在 0 到 100。
4. 加上该模式自己的加成，在各分组的上限之内，总分封顶 100。
5. 如果该模式与经典混合（保底、混合或加成），在这里进行。
6. 加上收藏球队加成和季后赛加成，总分再次封顶 100。`paysPostseason: false` 的模式跳过季后赛加成。
7. 最后加上 `gameBoost`。它是唯一允许超过 100 的东西。

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

按 id 查找结果里的一个条目。id 不存在时，两者都返回 `0`。

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

构建一个信号或加成的 `compute` 接收的 [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput)：比赛、上下文、解析后的运动和联赛配置、`progress`、`now` 和 `margin`。这是 `scoreGame` 内部调用的东西，导出来是为了让您自己写的信号可以单独测试。

## 模式

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

一次性提前检查一个模式，原样返回。如果两个信号共用一个 id，某个信号的上限不是正数，或者模式里没有信号，它就会抛出错误。

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

信号的 `compute` 会接收比赛、上下文、解析后的运动和联赛配置、比赛的 `progress`（开场为 0，常规时间结束时以及整个加时赛期间为 1）和 `margin`。它返回 `points`（限制在上限以内）和一个可选的 `reason`。模式还可以带 `boosts`、`bucketCaps`、`classicBlend`、`paysPostseason`（默认 `true`；`false` 表示不给季后赛加成），以及一个 `appliesTo(game, context)`，把它没什么可说的比赛交给经典处理。

`reasonPriority` 列出哪些信号的原因可以被读取。其中最强的那个开口，顺序用来打破平局。内置模式认识的原因键，会在 `score.reason` 里渲染成英文。您自己的键则原样渲染，所以请从 `score.reasons` 翻译，不要从那个字符串翻译。

### classicMode、blowoutsMode、fantasyMode、builtInModes 和 getMode

`classicMode`、`blowoutsMode` 和 `fantasyMode` 是三个内置的 `PowerScoreMode` 对象。`builtInModes` 是同样三个，以 id 为键，`getMode(idOrMode)` 能解析一个 id、一个模式对象或什么都不传（得到经典）。展开其中一个，就能在它的基础上构建。要得到不带 3.0 加成的经典：

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### 信号和加成

内置模式的组成部件也导出了，所以自定义模式可以复用它们：

| 导出 | 它是什么 |
|---|---|
| `classicSignals`、`blowoutsSignals`、`fantasySignals` | 每个模式的信号列表。 |
| `closenessSignal`、`lateGameSignal`、`momentumSignal`、`leadChangesSignal`、`comebackSignal` | 经典的五个信号，逐个导出。 |
| `scoringOpportunityBoost`、`goAheadRunBoost`、`twoMinuteDrillBoost`、`noHitterBoost`、`redCardBoost`、`upsetWatchBoost`、`upsetRoutBoost`、`stakesBoost` | 每项加成的 `BoostDefinition`。每项给多少分，见[加成与扣分](/arenaswap/docs/powerscore/boosts-and-penalties/)。 |
| `underdogProbability(line, sportType, league)` | 根据 `PregameLine` 得出的、赛前弱势一方的获胜机会。当盘口给不出答案时为 `undefined`。 |
| `postseasonBoostShare(round)` | 一个轮次能拿到的季后赛加成份额：1、0.75、0.5、0.25，没有轮次则为 0。 |
| `applyProgressFloor`、`findLeadChanges` | 接近度和领先权易手背后的两个辅助函数。 |
| `baseMask(baseRunners)`、`runnersOn(mask)` | 把垒包表示成一个 3 位数字，一垒在最低位（`0b101` 是一垒和三垒有跑垒员），以及那表示有几名跑垒员。 |

## 原因

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

把一条原因句，或一串原因拼成的句子，渲染成英文。`score.reason` 就是用它填的。如果您自己构建原因，又想让它们读起来一样，就用它们。`ordinal(n)` 给出它们使用的英文序数（“2nd”“11th”“21st”）。

## 配置与进度

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

`resolveSportConfig` 和 `resolveLeagueConfig` 做的，就是 `scoreGame` 每次调用开头做的事。未知的 `sportType` 回退到篮球的调校。未知的联赛回退到它所属运动最知名的联赛：篮球是 NBA，冰球是 NHL，棒球是 MLB，橄榄球是 NFL，垒球是 NCAA 垒球，足球是 MLS。`getGameProgress` 在开场为 0，常规时间结束时以及整个加时赛期间为 1。`scoreMargin` 是比分差的绝对值。

## 梦幻得分

梦幻模式的“梦幻得分”信号需要梦幻分数。下面这些函数把一行数据统计换算成梦幻分数。统计项由您指定，由它们来计分。

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

返回一行统计的总分，四舍五入到两位小数。未知的统计项和非有限值会被忽略。防守方的 `pointsAllowed` 按档位计分。

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

`defaultFantasyScoring` 保存 `'football'`（完整 PPR）、`'basketball'`、`'baseball'` 和 `'hockey'` 的默认规则。每条规则是 `{ points, min, max }`，所以设置界面可以强制执行上下限。

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

`resolveFantasyScoring(sport, overrides?)` 以普通数字的形式返回规则。覆盖值会被限制在对应规则的上下限之内，不存在的规则会被忽略。

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

`fantasySportOf(sportType)` 把一个 `sportType` 对应到四种梦幻运动之一。垒球算棒球，足球没有对应的，所以返回 `undefined`。

## 常量

| 常量 | 值 |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156（经典五个上限之和） |
| `scoreMaxTotal` | 100 |
| `breakPenalty` | 15，`context.onBreak` 为 `true` 期间固定扣的分数 |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

经典的上限为什么会超过 100 分的封顶，见[每种模式下的 PowerScore 信号](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total)。各分组的上限在[加成与扣分](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets)里解释。

`scoringOpportunityBaseRunnerBoosts`、`scoringOpportunityRedZoneBoost`、`scoringOpportunityRedZoneFringeBoost`、`redZoneDownMultipliers` 和 `thirdAndShortDistance` 保存得分机会加成背后的确切数值，列在[加成与扣分](/arenaswap/docs/powerscore/boosts-and-penalties/)里。较新的加成把数值放在 `goAheadRunTunables`、`twoMinuteDrillTunables`、`noHitterTunables`、`redCardTunables`、`upsetTunables`、`stakesTunables` 和 `hockeyTunables` 里。

`scorerTunables` 保存引擎打分用的每一个档位值，和上面这些常量已经按名字给出的数字一样，所以使用方可以读取一个档位的值，而不必把它写死。

`sportTypeConfigs`、`sportTypeConfigMap`、`leagueConfigs`、`leagueConfigMap` 和 `allLeagueIds` 保存引擎每次调用都会读的运动和联赛调校。它们的字段，以及每项运动和每个联赛的实际值，都在[运动与联赛配置](/arenaswap/docs/powerscore/configuration/)里。

## 2.x API

仍然导出，仍然可用，标注了的地方已弃用。3.0 没有移除这里的任何东西。想用模式或新的加成时，再迁移到 `scoreGame`。在那之前，它们返回的数字和以前一样。

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	winProbabilityHistory?: number[],
): PowerScoreResult
```

已弃用。给经典的五个信号打分，应用胜率修正，返回扁平的 `PowerScoreResult`（`closeness`、`lateGame`、`momentum`、`leadChanges`、`comeback`、`total`、`reason` 等等）。它就是只含信号、再展平的经典 `scoreGame`，所以不包含任何时刻加成。

| 参数 | 默认值 | 说明 |
|---|---|---|
| `game` | 必填 | 当前的比赛状态。 |
| `history` | `[]` | 最近的比分快照。在这里至少有 3 项之前，势头、领先权易手和逆转保持为 0。 |
| `winProbabilityHistory` | `[]` | 最近的胜率值，0 到 1。至少需要 5 个有限值才会有任何贡献。 |

从不抛出错误。当 `isPlayFrozen(game)` 为真时，立刻返回全零结果。不检查 `game.status`：在其他字段相同的情况下，`'pre'` 或 `'post'` 的比赛和 `'in'` 的比赛得分一样。

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

已弃用：这个数字在 `scoreGame` 的 `boosts` 列表里，id 是 `scoringOpportunity`。除非 `game.status === 'in'` 且比赛没有停滞，否则返回 `0`。否则，棒球和垒球按跑垒员人数返回 0 到 10，橄榄球按红区分差和档数返回 0 到 15。其他所有 `sportType`，包括冰球，都返回 `0`，因为冰球的得分机会来自 `context`（强攻和空门），而这个函数不接收它。不计入 `computePowerScore` 的 `total`。

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

把胜率历史映射成 ±5 的修正。先过滤掉非有限的项，如果剩下的有限值少于 5 个，就返回 `undefined`。否则返回一个从 `-scoreWinProbVarianceMax` 到 `scoreWinProbVarianceMax` 的整数。

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

当 `game.intermission === true` 或 `game.delayed === true` 时返回 `true`，其余情况返回 `false`，包括两个字段都缺失时。

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

比赛打完了常规时间的多少，0 到 1，用的是关键时刻信号读取的同一个时钟。适合把一场比赛画到时间轴上。

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

已弃用。接收一个不完整、可能不可信的 `PowerScoreResult`（只有 `gameId` 是必填的），返回一个完全限幅的有效结果。`computePowerScore` 对它产出的每个结果，都会在内部调用它。

五个信号字段各自限制在自己的上限以内。`total` 限制在 `scoreMaxTotal` 以内，除非 `options.allowTotalOverflow` 为 `true`。有了这个选项，它就只限制最小值为 `0`，让手动加成可以有意把它推过 100。缺失或非有限的 `total`，回退到五个信号之和减去 `breakPenalty`，而不是原始的和。`reason` 不是字符串时，回退到 `scorerTunables.reasons.fallback`（"best game available"）。`favoriteBonus`、`favoriteTeamCount`、`gameBoost`、`scoringOpportunityBoost` 和 `postseasonBoost` 提供时会被取整，并以 `0` 为下限。没有提供时，它们会整个留在结果之外，而不是默认为 `0`。从不抛出错误。

### 迁移后有什么变化

通过 `scoreGame` 跑经典，包含了新的加成，所以同一场比赛在那里的得分，可能比在 `computePowerScore` 里更高，最多高出各分组的上限。您以前围绕 `normalizePowerScoreResult` 手动添加的收藏球队加成、季后赛加成和手动加成，现在是 `scoreGame` 上的选项。其余一切照旧。`Game` 类型多了可选字段和一个联赛类型参数，而不带参数的 `Game` 含义不变。以前，表里没有的联赛 id，不管什么运动，都按 NBA 的配置评分。现在它拿到的是自己所属运动的默认值，所以一个未知联赛里的冰球比赛，会拿到 NHL 的阶段数和时钟。
