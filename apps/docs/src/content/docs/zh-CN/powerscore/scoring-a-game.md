---
sourceHash: 'd23f4e1a7b17'
title: 用实时数据给比赛打分
description: 把您自己的数据源映射成 Game 对象，跨轮询保留比分历史，打开您的数据支持的加成和模式，再加上收藏球队加成和手动加成。
section: powerscore
order: 2
navLabel: 用实时数据打分
faq:
  - q: scoreGame 会检查比赛是不是真的在直播吗？
    a: 只有加成会检查。除非比赛状态是 'in'，否则加成一分不给。信号照样会给还没开始或已经结束的比赛打分，而处于休息或中断的比赛得 0 分。请像 ArenaSwap 在调用评分器之前那样，自己先筛出直播比赛。
  - q: PowerScore 能用在它没列出的联赛上吗？
    a: 可以。Game 对联赛 id 是泛型的，内置表不认识的 id，会按它所属运动的默认值评分。如果默认值不对，用 options.league 在每次调用时覆盖阶段数和时长。
---

`scoreGame` 不会去抓取任何东西。您交给它什么 `Game` 对象和上下文，它就给什么打分。本页用一个虚构的数据源构建这两样东西，然后随着您的数据允许，逐步打开引擎的更多部分。

## 把您的数据源映射成 Game

只有 `id`、`league`、`sportType` 和两队的比分是必填的。其余的字段，数据源里有就能让分数更精确，没有就算未知。有什么就映射什么，其余跳过。

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

如实设置 `status`。加成在给分之前检查的就是 `'in'`。`intermission` 或 `delayed` 标记会让整个分数变成 0，直到比赛恢复，所以处于广告时段或雨天中断的比赛，不可能比正在进行的比赛得分更高。

## 给得越多，打开得越多

每个可选字段，都会打开引擎里需要它的那一部分。漏掉一个，那一部分就得 0 分。不会抛出错误。

| 提供 | 放在 | 随之打开 |
|---|---|---|
| 比分快照，最早的在前 | `context.history` | 势头、领先权易手、逆转。至少需要 3 份快照。 |
| 胜率，每次轮询一个 0 到 1 的值 | `context.winProbability` | ±5 的胜率修正。至少需要 5 个值。 |
| 比赛是否处于广告时段 | `context.onBreak` | 广告时段扣分。 |
| 球队上的 `possession`、`yardsToEndZone`、`down`、`distance` 和 `timeouts` | `game`, `game.homeTeam` | 两分钟进攻和梦幻模式的橄榄球局面。 |
| `isRedZone`，加上 `down`、`distance` 和 `isGoalToGo` | `game` | 红区加成。 |
| `baseRunners`、`outs`、`topOfInning` | `game` | 垒上跑垒员和反超分。 |
| 每支球队的 `hits` | `game.homeTeam`, `game.awayTeam` | 无安打比赛。 |
| `series`，以及每支球队的 `rank` | `game`, `game.homeTeam` | 赛事重要程度：悬崖边上的系列赛、两支有排名的球队。 |
| `context.stakes` | `context` | 赛事重要程度：赛季末的争夺。 |
| `pregameLine` | `context` | 冷门预警。请用赛前的盘口。 |
| `redCards` | `game` | 红牌加成，足球。 |
| `powerPlay`、`emptyNet` | `context` | 冰球的得分机会。 |
| `fantasy` | `context` | 梦幻模式。 |
| 每支球队的 `nickname` | `game.homeTeam`, `game.awayTeam` | `reason` 里的队名，取代缩写。 |
| `seasonType`、`postseasonRound` | `game` | 赛事重要程度会把这场比赛当成季后赛（看系列赛），而不是常规赛（看排名和争夺）。 |
| `recentLeadChanges` | `context` | 来自您数据源比赛实录的领先权易手次数，用来捕捉两次轮询之间的翻转。 |

所有字段都在[类型页](/arenaswap/docs/powerscore/types/#game)里，每种加成给多少分，见[加成与扣分](/arenaswap/docs/powerscore/boosts-and-penalties/)。

## 保留比分历史，用于势头、领先权易手和逆转

这三个信号读取 `context.history`，也就是一场比赛过去的比分列表，在它至少有三份快照之前，一直是 0。每次轮询保留一份，按顺序，最早的在前，带一个以毫秒计的时间戳。时间戳只需要彼此相对，不必是挂钟时间。

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

波士顿一度落后 5 分，靠一波 13-2 的攻势刚刚反超：

```ts
score.total;  // 86
score.reason; // 'BOS came back from 5 down to lead. Up 6 in the 3rd quarter'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 16
```

把早于该运动 `historyWindowMs` 的快照裁掉，这样数组不会无限增长。这个窗口，以及其余各项随运动而变的调校，都在[运动与联赛配置](/arenaswap/docs/powerscore/configuration/)里。

## 如果有的话，跟踪广告时段和胜率

它们都放在上下文里。如果您能判断一场比赛是否处于广告时段，就传入 `onBreak`：

```ts
const score = scoreGame(game, { history, onBreak: isInBreak(game), winProbability });
```

`isInBreak` 要由您自己写，依据您的数据源提供的局间休息、换投手和暂停信息。`onBreak` 为 `true` 时，分数会固定扣 15 分。
`winProbability` 是一串最近的胜率值，范围 0 到 1，对任一队都行。只有离 50% 的距离才重要。两者都是可选的，没有它们 PowerScore 也能正常打分。它们各自改变什么，见[加成与扣分](/arenaswap/docs/powerscore/boosts-and-penalties/)。

## 让加成看到那个时刻

棒球、橄榄球、冰球和足球，各自带着一些光看比分看不出来的局面。加上您的数据源里有的字段，`scoreGame` 就会为它们给分。这是一场棒球比赛，第 9 局下半，战平，满垒，一人出局：

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

这两项加起来，正好填满“时刻”分组的上限 20。橄榄球通过 `isRedZone` 得到红区加成，按 `down`、`distance` 和 `isGoalToGo` 加权，并通过 `possession`、`yardsToEndZone` 和 `down` 得到两分钟进攻。冰球的得分机会需要 `context.powerPlay` 和 `context.emptyNet`。足球需要 `redCards`。

## 用另一种模式打分

用 `options.mode` 选一种模式。一边倒不需要额外的东西。梦幻需要您的阵容放在上下文里，每名球员一项：

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

`pointEvents` 是让“梦幻得分”信号看到一名球员一分钟前拿到梦幻得分的方式。要把一行数据统计换算成这些得分，用 [`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints)。一场里一名您的球员都没有的比赛，按经典打分，`score.modeId` 会这样写明。

## 加上收藏球队、季后赛和手动加成

先给比赛打分，再让选项加上 PowerScore 不知道的东西，比如观众的收藏球队。同样的选项在每种模式里都能用。

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 106
```

收藏球队加成和季后赛加成加到总分上，封顶 100。`gameBoost` 在那之后再加，而且它是唯一允许超过 100 的东西，所以观众钉住的比赛，可以胜过满分。停滞的比赛一概跳过这些：停下来的比赛，不可能比正在进行的比赛得分更高。

ArenaSwap 自己的[评分代码](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts)，在把分数交给标签页切换器之前，也是用同样的方式构建选项。

## 2.x 的方式

`computePowerScore(game, history, winProbabilityHistory)` 仍然可用，返回扁平的 2.x 结果，不含时刻加成。如果您只想要一直以来拿到的那个数字，用它就对了。[API 参考](/arenaswap/docs/powerscore/api-reference/#the-2x-api)列出了仍然保留的所有东西。
