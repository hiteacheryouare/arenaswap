---
sourceHash: '854afd07d71b'
title: 競技とリーグの設定
description: SportTypeConfig と LeagueConfig の全フィールド、6競技・31リーグにわたる初期値、そして競技ごとの「接戦」の基準がどう決まるかを説明します。
section: powerscore
order: 5
navLabel: 設定
---

`scoreGame` は、呼び出しのたびに最初にエクスポートされた2つのマップを参照します。`SportType` をキーにした `sportTypeConfigMap` は、競技がどう進行するかを保持します。`LeagueId` をキーにした `leagueConfigMap` は、リーグのピリオドの長さを保持します。組み込みの値がデータに合わない場合は、呼び出しごとに `options.sport` と `options.league` でどちらも上書きできます。方法は[PowerScore が対応していないリーグ向けに調整する](#tune-it-for-a-league-powerscore-doesnt-ship)にあります。

## SportTypeConfig

`SportType` ごとに1つのエントリがあり、`sportTypeConfigs`（配列）と `sportTypeConfigMap`（`id` をキーにしたもの）としてエクスポートされています。この表に6競技の実際の値がまとまっていて、[競技フィールドの意味](#what-the-sport-fields-mean)がその後に続きます。クラシックはすべてを読みます。大差が読むのは、`closenessMargins`、`momentumBigRun`、`momentumSmallRun`、勢いの半減期、`historyWindowMs` です。

| フィールド | basketball | football | hockey | soccer | baseball | softball |
|---|---|---|---|---|---|---|
| `clockBased` | true | true | true | true | false | false |
| `closenessMargins` (t1, t2, t3) | 5, 10, 18 | 3, 9, 14 | 1, 2, 3 | 1, 2, 3 | 1, 3, 5 | 1, 3, 5 |
| `momentumBigRun` / `momentumSmallRun` | 8 / 4 | 10 / 4 | 2 / 1 | 2 / 1 | 3 / 1 | 3 / 1 |
| `comebackThresholdBig` / `comebackThresholdSmall` | 6 / 3 | 7 / 3 | 2 / 1 | 2 / 1 | 2 / 1 | 2 / 1 |
| `clockCountsUp` | false | false | false | true | false | false |
| `clockIsFullGameElapsed` | false | false | false | true | false | false |
| `zeroZeroAsFullTie` | false | false | true | true | false | false |
| `zeroZeroPenaltyPeriods` | なし | なし | 1, 2 | 1 | なし | なし |
| `otPreBoostWindowSecs` | 60 | 60 | 60 | 60 | 0 | 0 |
| `decayHalfLifeMs.momentum` | 45,000 | 135,000 | 180,000 | 240,000 | 150,000 | 150,000 |
| `decayHalfLifeMs.leadChange` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `decayHalfLifeMs.comeback` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `historyWindowMs` | 300,000（5分） | 720,000（12分） | 960,000（16分） | 1,200,000（20分） | 720,000（12分） | 720,000（12分） |
| `lateGameCurve` | なし | なし | なし | なし | 9イニング、6回から | 7イニング、5回から |

`historyWindowMs` は、勢い、リード交代、追い上げが働くために、各競技が保持しておく必要があるスコア履歴の期間です。大差のリード維持シグナルも、同じ期間で測ります。この期間は、その競技のいちばん長い半減期の4倍以上です。この余裕があるので、呼び出し側がどんな頻度でポーリングしても、シグナルは窓から外れる前に完全に減衰します。

### 競技フィールドの意味

| フィールド | 意味 |
|---|---|
| `clockBased` | その競技にゲームクロックがあります。野球とソフトボールにはないので、終盤のプレッシャーはイニングで進みます。 |
| `closenessMargins` | 接戦度が段階的に下がる3つの点差です。t1 以内は拮抗、t2 以内は接戦、t3 以内はぎりぎり圏内で、t3 を超えるとポイントは付きません。ほかのシグナルやブーストもこれを使い回します。たとえば追い上げの大差カットオフは t2、大差のタイミングのゲートは t3 超です。 |
| `momentumBigRun`, `momentumSmallRun` | 履歴の窓の中で、勢いが満点と半分のティアを獲得する、ネットのランの大きさです。 |
| `comebackThresholdBig`, `comebackThresholdSmall` | 追い上げが大きいティアと中程度のティアを獲得する、点差の縮まり方です。 |
| `clockCountsUp` | クロックが残り時間ではなく、経過時間を表示します。サッカーだけです。 |
| `clockIsFullGameElapsed` | クロックがピリオドごとに戻らず、試合全体（0分から90分以降）を通して進むので、残り時間を計算する前に終わったピリオドを差し引きます。サッカーだけです。 |
| `zeroZeroAsFullTie` | 0–0 の試合が、接戦度で満額の同点クレジットを得ます。`false` のときは、0–0 は減額された `zeroZero` ティアになります。 |
| `zeroZeroPenaltyPeriods` | `zeroZeroAsFullTie` が `true` でも、0–0 が減額ティアのままになるピリオドです。ホッケーは1と2、サッカーは前半です。 |
| `otPreBoostWindowSecs` | 規定の最終ピリオドの最後の秒数で、同点の試合が延長戦プレブーストに向けて上がっていく区間です。`0` でオフになります。 |
| `decayHalfLifeMs` | 最後の得点のあと、勢い、リード交代、追い上げがどれだけ速く薄れるかです。得点の少ない競技ほど長く、1点が次の1点まで効き続けます。 |
| `historyWindowMs` | 履歴系のシグナルが読むスコア履歴の長さです。上の説明をご覧ください。 |
| `lateGameCurve` | 野球とソフトボールのみ。規定のイニング数と、終盤の上昇が始まるイニングです。 |

## LeagueConfig

`LeagueId` ごとに1つのエントリがあり、`leagueConfigs`（配列）と `leagueConfigMap`（`id` をキーにしたもの）としてエクスポートされています。ID だけの一覧は `allLeagueIds` です。`periodFormat` は表示用のテキストで、スコアには影響しません。各エントリには、ArenaSwap が独自の取得処理や、スケジュールバーで試合が占める長さのために使うフィールドも少しあります。スコアラーは読まないので、ここには表にしていません。

| リーグ | 競技 | ピリオド | ピリオドの長さ |
|---|---|---|---|
| NBA (`nba`) | basketball | 4 | 720s |
| WNBA (`wnba`) | basketball | 4 | 600s |
| NCAAバスケットボール (`ncaab`) | basketball | 2 | 1200s |
| NCAA女子バスケットボール (`ncaaw`) | basketball | 4 | 600s |
| オリンピック男子バスケットボール (`olybkm`) | basketball | 4 | 600s |
| オリンピック女子バスケットボール (`olybkw`) | basketball | 4 | 600s |
| NFL (`nfl`) | football | 4 | 900s |
| NCAAフットボール (`ncaaf`) | football | 4 | 900s |
| UFL (`ufl`) | football | 4 | 900s |
| NHL (`nhl`) | hockey | 3 | 1200s |
| NCAA男子アイスホッケー (`ncaamh`) | hockey | 3 | 1200s |
| オリンピック男子アイスホッケー (`olymih`) | hockey | 3 | 1200s |
| オリンピック女子アイスホッケー (`olywih`) | hockey | 3 | 1200s |
| MLB (`mlb`) | baseball | 9イニング | 0 |
| NCAA野球 (`cbase`) | baseball | 9イニング | 0 |
| オリンピック野球 (`olybb`) | baseball | 9イニング | 0 |
| ワールド・ベースボール・クラシック (`wbbc`) | baseball | 9イニング | 0 |
| NCAAソフトボール (`csoft`) | softball | 7イニング | 0 |
| MLS (`mls`) | soccer | 2 | 2700s |
| プレミアリーグ (`epl`) | soccer | 2 | 2700s |
| ラ・リーガ (`laliga`) | soccer | 2 | 2700s |
| ブンデスリーガ (`bundesliga`) | soccer | 2 | 2700s |
| セリエA (`seriea`) | soccer | 2 | 2700s |
| リーガMX (`ligamx`) | soccer | 2 | 2700s |
| UEFAチャンピオンズリーグ (`ucl`) | soccer | 2 | 2700s |
| UEFAヨーロッパリーグ (`uel`) | soccer | 2 | 2700s |
| NWSL (`nwsl`) | soccer | 2 | 2700s |
| FIFAワールドカップ (`fifawc`) | soccer | 2 | 2700s |
| FIFA女子ワールドカップ (`fifawwc`) | soccer | 2 | 2700s |
| オリンピック男子サッカー (`olysocm`) | soccer | 2 | 2700s |
| オリンピック女子サッカー (`olysocw`) | soccer | 2 | 2700s |

合計31リーグで、`LeagueId` の31のメンバーと一致します。

## 競技ごとの「接戦」の基準がどう決まるか

1つのタプル `closenessMargins: [t1, t2, t3]` が、競技についてのいくつかのことを決めます。点差がどの接戦度のティアに入るかを決めます。`t1` なら拮抗、`t2` なら接戦、`t3` ならぎりぎり圏内、それより先は圏外です。終盤のプレッシャーが上がっていく先の上限、フットボールのレッドゾーンブーストが支払われる範囲、大差が加点を始める点差（2スコア差、`t2` 超）、重要度にかける重みも、このタプルが決めます。

バスケットボールの `[5, 10, 18]` なら、2点差の試合は拮抗で、9点差の試合は接戦です。18点差が、ぎりぎり圏内と数えられる最後の点差です。ホッケーとサッカーの `[1, 2, 3]` では、2ゴール差の試合は、バスケットボールの9点差の試合と同じ扱いになります。ある競技の「接戦」の意味を変えるのは、いくつもの別々のしきい値ではなく、1つのタプルを変えることです。

## PowerScore が対応していないリーグ向けに調整する

`Game` はリーグ id についてジェネリックなので、独自の id を持つフィードでも、そのまま `Game<string>` として使えます。表にないリーグは、その競技の初期値でスコア化されます。各競技は、ピリオド数とクロックについて、最もよく知られたリーグに対応づけられます。

| 競技 | 初期値になるリーグ |
|---|---|
| バスケットボール | NBA |
| ホッケー | NHL |
| 野球 | MLB |
| フットボール | NFL |
| ソフトボール | NCAAソフトボール |
| サッカー | MLS |

正しく指定する必要があるのは `sportType` だけです。`league` が何であれ、シグナルの動きのほとんどはこれで決まります。認識できない `sportType` は、別途バスケットボールのシグナル調整にフォールバックします。どちらのフォールバックも、例外を投げずに試合がスコア化されるようにするためのものです。

初期値がリーグに合わない場合は、呼び出しごとに上書きします。

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

`options.league` は `LeagueConfig` の任意の一部（たいていはピリオド数と長さ）を受け取ります。`options.sport` は `SportTypeConfig` の任意の一部（接戦度の点差、勢いのしきい値、半減期など）を受け取ります。上書きはその呼び出しにだけ適用され、エクスポートされたマップは変わりません。

`sportTypeConfigMap` と `leagueConfigMap` は、エクスポートされたただのオブジェクトで、キャッシュされたコピーではなく、呼び出しのたびに読まれます。実行時に書き換えればスコアの動きは実際に変わりますが、パッケージの型やエクスポートのどこにも、それをサポート対象の拡張ポイントとして扱う記述はなく、将来のバージョンで動作を維持する義務もありません。オプションを使ってください。
