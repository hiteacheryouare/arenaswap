---
sourceHash: '854afd07d71b'
title: 运动与联赛配置
description: SportTypeConfig 和 LeagueConfig 的每个字段、它们在六项运动和 31 个联赛上的默认值，以及一项运动的“胶着”标准是怎么定的。
section: powerscore
order: 5
navLabel: 配置
---

每次调用，`scoreGame` 一开始都会查两张导出的映射表。`sportTypeConfigMap` 以 `SportType` 为键，记录一项运动怎么打。`leagueConfigMap` 以 `LeagueId` 为键，记录一个联赛的每个阶段打多久。如果内置值不适合您的数据，可以在每次调用时，通过 `options.sport` 和 `options.league` 覆盖其中任何一张。[为您自己的联赛调整](#tune-it-for-a-league-powerscore-doesnt-ship)会告诉您怎么做。

## SportTypeConfig

每个 `SportType` 一个条目，导出为 `sportTypeConfigs`（数组）和 `sportTypeConfigMap`（以 `id` 为键）。下表列出六项运动的实际值，[字段含义](#what-the-sport-fields-mean)接在表后。经典模式会读取全部字段。一边倒模式读取 `closenessMargins`、`momentumBigRun`、`momentumSmallRun`、势头半衰期和 `historyWindowMs`。

| 字段 | 篮球 | 橄榄球 | 冰球 | 足球 | 棒球 | 垒球 |
|---|---|---|---|---|---|---|
| `clockBased` | true | true | true | true | false | false |
| `closenessMargins` (t1, t2, t3) | 5, 10, 18 | 3, 9, 14 | 1, 2, 3 | 1, 2, 3 | 1, 3, 5 | 1, 3, 5 |
| `momentumBigRun` / `momentumSmallRun` | 8 / 4 | 10 / 4 | 2 / 1 | 2 / 1 | 3 / 1 | 3 / 1 |
| `comebackThresholdBig` / `comebackThresholdSmall` | 6 / 3 | 7 / 3 | 2 / 1 | 2 / 1 | 2 / 1 | 2 / 1 |
| `clockCountsUp` | false | false | false | true | false | false |
| `clockIsFullGameElapsed` | false | false | false | true | false | false |
| `zeroZeroAsFullTie` | false | false | true | true | false | false |
| `zeroZeroPenaltyPeriods` | 无 | 无 | 1, 2 | 1 | 无 | 无 |
| `otPreBoostWindowSecs` | 60 | 60 | 60 | 60 | 0 | 0 |
| `decayHalfLifeMs.momentum` | 45,000 | 135,000 | 180,000 | 240,000 | 150,000 | 150,000 |
| `decayHalfLifeMs.leadChange` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `decayHalfLifeMs.comeback` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `historyWindowMs` | 300,000（5 分钟） | 720,000（12 分钟） | 960,000（16 分钟） | 1,200,000（20 分钟） | 720,000（12 分钟） | 720,000（12 分钟） |
| `lateGameCurve` | 无 | 无 | 无 | 无 | 9 局，从第 6 局开始 | 7 局，从第 5 局开始 |

`historyWindowMs` 是每项运动需要保留的比分历史跨度，势头、领先权易手和逆转要靠它才能工作。一边倒的“领先稳固”信号也按同一个窗口衡量。它至少是该运动最长半衰期的四倍。这个余量让信号在滑出窗口之前就已完全衰减，不管调用方多久轮询一次。

### 运动字段的含义

| 字段 | 含义 |
|---|---|
| `clockBased` | 这项运动有比赛时钟。棒球和垒球没有，所以关键时刻的压力改按局数推进。 |
| `closenessMargins` | 接近度逐级下降的三个分差：在 t1 以内是紧咬，在 t2 以内是接近，在 t3 以内是边缘，超过 t3 不给分。其他信号和加成也沿用它们，比如逆转的惨败截止线在 t2，一边倒的“早早拉开”门槛在 t3 之外。 |
| `momentumBigRun`, `momentumSmallRun` | 历史窗口内，能拿到势头满档和半档的净得分攻势。 |
| `comebackThresholdBig`, `comebackThresholdSmall` | 能拿到逆转大档和中档的摆幅。 |
| `clockCountsUp` | 时钟显示的是已打时间，不是剩余时间。只有足球。 |
| `clockIsFullGameElapsed` | 时钟贯穿整场比赛（0' 到 90'+），不会每个阶段重新开始，所以算剩余时间之前，要先减掉已完成的阶段。只有足球。 |
| `zeroZeroAsFullTie` | 0–0 的比赛在接近度里拿到完整的战平分。为 `false` 时，0–0 只拿到较低的 `zeroZero` 档。 |
| `zeroZeroPenaltyPeriods` | 即使 `zeroZeroAsFullTie` 为 `true`，0–0 在这些阶段仍然只拿较低的档。冰球用 1 和 2，足球是上半场。 |
| `otPreBoostWindowSecs` | 常规时间最后一个阶段的最后几秒，战平的比赛在这段时间里朝加时预加成攀升。`0` 表示关闭。 |
| `decayHalfLifeMs` | 势头、领先权易手和逆转在最后一次得分之后衰减得多快。低得分运动里更长，这样一粒进球能让它们撑到下一粒。 |
| `historyWindowMs` | 历史类信号读取多少比分历史。见上文。 |
| `lateGameCurve` | 仅限棒球和垒球：常规比赛有多少局，以及关键时刻的攀升从第几局开始。 |

## LeagueConfig

每个 `LeagueId` 一个条目，导出为 `leagueConfigs`（数组）和 `leagueConfigMap`（以 `id` 为键），另有 `allLeagueIds` 提供纯列表。`periodFormat` 只是显示文本，不影响评分。每个条目还带有几个字段，供 ArenaSwap 自己抓取数据，以及决定一场比赛在日程横杠上占多长。评分器不读它们，所以这里没有列出。

| 联赛 | 运动 | 阶段数 | 每阶段时长 |
|---|---|---|---|
| NBA (`nba`) | 篮球 | 4 | 720 秒 |
| WNBA (`wnba`) | 篮球 | 4 | 600 秒 |
| NCAA Basketball (`ncaab`) | 篮球 | 2 | 1200 秒 |
| NCAA Women's Basketball (`ncaaw`) | 篮球 | 4 | 600 秒 |
| 奥运男子篮球 (`olybkm`) | 篮球 | 4 | 600 秒 |
| 奥运女子篮球 (`olybkw`) | 篮球 | 4 | 600 秒 |
| NFL (`nfl`) | 橄榄球 | 4 | 900 秒 |
| NCAA Football (`ncaaf`) | 橄榄球 | 4 | 900 秒 |
| UFL (`ufl`) | 橄榄球 | 4 | 900 秒 |
| NHL (`nhl`) | 冰球 | 3 | 1200 秒 |
| NCAA Men's Hockey (`ncaamh`) | 冰球 | 3 | 1200 秒 |
| 奥运男子冰球 (`olymih`) | 冰球 | 3 | 1200 秒 |
| 奥运女子冰球 (`olywih`) | 冰球 | 3 | 1200 秒 |
| MLB (`mlb`) | 棒球 | 9 局 | 0 |
| NCAA Baseball (`cbase`) | 棒球 | 9 局 | 0 |
| 奥运棒球 (`olybb`) | 棒球 | 9 局 | 0 |
| 世界棒球经典赛 (`wbbc`) | 棒球 | 9 局 | 0 |
| NCAA Softball (`csoft`) | 垒球 | 7 局 | 0 |
| 美国大联盟 (`mls`) | 足球 | 2 | 2700 秒 |
| 英超 (`epl`) | 足球 | 2 | 2700 秒 |
| 西甲 (`laliga`) | 足球 | 2 | 2700 秒 |
| 德甲 (`bundesliga`) | 足球 | 2 | 2700 秒 |
| 意甲 (`seriea`) | 足球 | 2 | 2700 秒 |
| 墨西哥甲级联赛 (`ligamx`) | 足球 | 2 | 2700 秒 |
| 欧冠 (`ucl`) | 足球 | 2 | 2700 秒 |
| 欧联 (`uel`) | 足球 | 2 | 2700 秒 |
| 美国女足联赛 (`nwsl`) | 足球 | 2 | 2700 秒 |
| FIFA 世界杯 (`fifawc`) | 足球 | 2 | 2700 秒 |
| FIFA 女足世界杯 (`fifawwc`) | 足球 | 2 | 2700 秒 |
| 奥运男子足球 (`olysocm`) | 足球 | 2 | 2700 秒 |
| 奥运女子足球 (`olysocw`) | 足球 | 2 | 2700 秒 |

一共 31 个联赛，和 `LeagueId` 的 31 个成员对得上。

## 一项运动的“胶着”标准是怎么定的

一个元组 `closenessMargins: [t1, t2, t3]`，为一项运动决定了好几件事。它决定一个分差落在哪个接近度档位：`t1` 以内紧咬，`t2` 以内接近，`t3` 以内边缘，再往外就遥不可及。它还决定关键时刻的压力朝哪个上限攀升、橄榄球红区加成按哪一档发放、一边倒从哪里开始给分（相差两次得分，超过 `t2`），以及赛事重要程度占多大权重。

篮球的 `[5, 10, 18]` 意味着 2 分的比赛是紧咬，9 分的比赛是接近。18 分的比赛是最后一档仍算边缘的。冰球和足球的 `[1, 2, 3]`，把两球之差当成篮球里的 9 分之差。要改一项运动的“胶着”标准，改一个元组就行，不用改一堆各自独立的阈值。

## 为 PowerScore 没有内置的联赛调整

`Game` 对联赛 id 是泛型的，所以自带 id 的数据源可以直接用：`Game<string>`。表里没有的联赛，会按它所属运动的默认值评分。每项运动对应它最知名的联赛，用来取阶段数和时钟：

| 运动 | 默认取 |
|---|---|
| 篮球 | NBA |
| 冰球 | NHL |
| 棒球 | MLB |
| 橄榄球 | NFL |
| 垒球 | NCAA Softball |
| 足球 | 美国大联盟 |

`sportType` 是唯一必须填对的东西。不管 `league` 是什么，信号的大部分行为都由它决定。无法识别的 `sportType` 会单独回退到篮球的信号调校。两种回退都意味着，比赛仍然会被评分，而不是抛出错误。

如果默认值不适合您的联赛，可以在每次调用时覆盖：

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

`options.league` 接受 `LeagueConfig` 的任何部分，通常是阶段数和时长。`options.sport` 接受 `SportTypeConfig` 的任何部分，比如接近度分差、势头阈值或半衰期。覆盖只对这一次调用生效，导出的映射表保持原样。

`sportTypeConfigMap` 和 `leagueConfigMap` 是普通的导出对象，每次调用都直接读取，而不是读缓存的副本。在运行时修改它们，确实会改变评分行为，但这个包的类型和导出，都没有把它当成受支持的扩展点，将来的版本也没有义务让它继续生效。请用选项。
