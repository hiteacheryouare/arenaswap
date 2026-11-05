---
sourceHash: '1cae3a43d11e'
title: 用 PowerScore 给您的第一场比赛打分
navLabel: 快速入门
description: 安装 powerscore 软件包，用几行代码通过 scoreGame 给一场直播比赛打分，最后在终端里看到一个数字和一条理由。
section: powerscore
order: 1
faq:
  - q: powerscore 需要 API 密钥或账户吗？
    a: 不需要。它只给您递过去的比赛状态打分。获取这些状态，不管您的比分从哪里来，都是您自己代码的事。
  - q: powerscore 能在浏览器里运行吗？
    a: 能。它没有运行时依赖，只处理普通对象和数学运算。它可以像在 Node 中运行一样，打包进浏览器扩展。
  - q: 我需要为 PowerScore 3 重写我的 2.x 代码吗？
    a: 不需要。computePowerScore 和 2.x 的类型仍然可用，返回的总分也和以前一样。想用模式或新的加成时，再改用 scoreGame。
---

这一页会安装 `powerscore`，给一场直播比赛打分，最后得到一个数字和它背后的理由。

## 安装软件包

```bash
npm install powerscore
```

这个软件包也发布在 [npm](https://www.npmjs.com/package/powerscore) 上。想看它给今晚的真实比赛打分，请访问 [PowerScore 页面](/arenaswap/powerscore/)。

## 描述这场比赛

`scoreGame` 需要一个 `Game` 对象：两队的比分、所属的联赛和运动项目，以及比赛此刻的进程。对直播比赛请设置 `status: 'in'`，因为各项加成在给分之前会先检查它。

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

第四节还剩 45 秒，波士顿领先两分。比分胶着，时间也晚了，正是 PowerScore 要找的。

## 给它打分

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

运行之后，终端会打印：

```text
68
BOS up 2 with 0:45 left
```

`scoreGame` 还有两个参数，都是可选的：`context` 用来放比赛本身不带的一切（比分历史、胜率、赛前盘口、梦幻阵容），`options` 用来指定怎么打分（用哪种模式、关掉哪些信号）。两个都不给，您得到的是经典模式，它问的是一场比赛是否胶着、是否已到末段。

## 读懂详细分析

`score` 带的不只是总分这个数字。每个信号都以列表项的形式出现在上面，各有自己的得分和上限，另外还有各项加成和理由。

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

这里的总分完全由接近度和末段压力构成。没有比分历史可回看，势头、领先权易手和逆转因子暂时无从衡量，所以都是 0。在 context 里给 `scoreGame` 一份 `history`，它们就醒了。各项加成在 `score.boosts` 上，这场比赛全是 0，因为篮球比赛里没有跑垒员、红区，也没有撤下的门将可以加分。

用 `signalPoints(score, 'momentum')` 和 `boostPoints(score, 'noHitter')` 可以按 id 查某一项。

## 试试另一种模式

同一场比赛可以回答不同的问题。模式通过 `options.mode` 选择：

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

一边倒模式问的是有没有人把比赛拉开了。2 分的比赛显然没有，所以它只拿到经典模式 68 分的 30%，不会更多。正是这条底线，让胶着的比赛在没有大比分碾压的夜晚依然有资格入选。梦幻模式问的是您的球员是否即将有大事发生。三种模式都在[信号页面](/arenaswap/docs/powerscore/signals/)里。

想给您自己的代码正在轮询的比赛打分，请读[用实时数据给比赛打分](/arenaswap/docs/powerscore/scoring-a-game/)。想知道每个信号衡量什么、为什么，请读[每种模式下的 PowerScore 信号](/arenaswap/docs/powerscore/signals/)。
