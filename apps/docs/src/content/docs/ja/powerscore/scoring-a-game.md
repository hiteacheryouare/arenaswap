---
sourceHash: 'd23f4e1a7b17'
title: ライブデータから試合をスコア化する
description: 自分のフィードを Game オブジェクトにマッピングし、ポーリングをまたいでスコア履歴を保ち、データが対応するブーストとモードをオンにし、お気に入りと手動のブーストを加えます。
section: powerscore
order: 2
navLabel: ライブデータからスコア化
faq:
  - q: scoreGame は試合が本当にライブかどうかを確認しますか？
    a: 確認するのはブーストだけです。ブーストは、試合の status が 'in' でなければポイントを付けません。シグナルは、始まっていない試合や終わった試合もスコア化し、インターバルや中断中の試合は0になります。ArenaSwap がスコアラーを呼ぶ前にするのと同じように、先にライブの試合へ絞り込んでください。
  - q: PowerScore は、リストにないリーグでも使えますか？
    a: はい。Game はリーグ id についてジェネリックで、組み込みの表にない id は、その競技の初期値でスコア化されます。初期値が合わない場合は、呼び出しごとに options.league でピリオド数と長さを上書きしてください。
---

`scoreGame` は何も取得しません。渡された `Game` オブジェクトとコンテキストをスコア化するだけです。このページでは、架空のフィードからその両方を作り、データが許す範囲で、エンジンの機能を順にオンにしていきます。

## フィードを Game にマッピングする

必須なのは `id`、`league`、`sportType`、そして2チームのスコアだけです。それ以外は、フィードにあればスコアが絞り込まれ、なければ不明として扱われます。持っているものをマッピングして、残りは省いてください。

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

`status` は正直に設定してください。`'in'` は、ブーストがポイントを付ける前に確認する値です。`intermission` や `delayed` のフラグがあると、プレーが再開するまで全体のスコアが0になるので、コマーシャル中や雨天中断の試合が、プレー中の試合を上回ることはありません。

## 渡すほど、機能が増える

オプションのフィールドは、それぞれが必要とするエンジンの部分をオンにします。1つ省くと、その部分は0になります。例外は投げられません。

| 渡すもの | 渡す場所 | オンになるもの |
|---|---|---|
| 古い順のスコアスナップショット | `context.history` | 勢い、リード交代、追い上げ。スナップショットが3つ以上必要です。 |
| ポーリングごとの0〜1の勝利確率 | `context.winProbability` | ±5の勝利確率の補正。値が5つ以上必要です。 |
| 試合がコマーシャル中かどうか | `context.onBreak` | コマーシャル中の減点。 |
| チームの `possession`、`yardsToEndZone`、`down`、`distance`、`timeouts` | `game`、`game.homeTeam` | 2ミニッツ・ドリルと、ファンタジーのフットボールの状況。 |
| `isRedZone`、および `down`、`distance`、`isGoalToGo` | `game` | レッドゾーンブースト。 |
| `baseRunners`、`outs`、`topOfInning` | `game` | 塁上の走者と勝ち越し走者。 |
| 各チームの `hits` | `game.homeTeam`、`game.awayTeam` | ノーヒッター。 |
| `series`、および各チームの `rank` | `game`、`game.homeTeam` | 重要度: 崖っぷちのシリーズ、ランカー同士の対戦。 |
| `context.stakes` | `context` | 重要度: シーズン終盤の争い。 |
| `pregameLine` | `context` | 番狂わせの予感。試合前のラインを使います。 |
| `redCards` | `game` | レッドカードブースト（サッカー）。 |
| `powerPlay`、`emptyNet` | `context` | ホッケーの得点チャンス。 |
| `fantasy` | `context` | ファンタジーモード。 |
| 各チームの `nickname` | `game.homeTeam`、`game.awayTeam` | `reason` の中で、略称の代わりに使うチーム名。 |
| `seasonType`、`postseasonRound` | `game` | 重要度が、試合をレギュラーシーズン（順位と争い）ではなくポストシーズン（シリーズ）として読みます。 |
| `recentLeadChanges` | `context` | フィードのプレーログから得たリード交代の回数。ポーリングの間に起きた入れ替わりに使います。 |

フィールドはすべて[型のページ](/arenaswap/docs/powerscore/types/#game)にあり、各ブーストの加点は[ブーストとペナルティ](/arenaswap/docs/powerscore/boosts-and-penalties/)にあります。

## 勢い、リード交代、追い上げのためにスコア履歴を保つ

この3つのシグナルは、試合の過去のスコアのリストである `context.history` から読み取り、スナップショットが3つ以上になるまで0のままです。ポーリングのたびに、古い順に、ミリ秒のタイムスタンプつきで1つ保存してください。タイムスタンプは、互いに相対的であれば足ります。実際の時刻である必要はありません。

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

ボストンは5点ビハインドから、13-2のランでリードを奪ったところです。

```ts
score.total;  // 86
score.reason; // 'BOS came back from 5 down to lead. Up 6 in the 3rd quarter'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 16
```

配列が際限なく増えないように、競技の `historyWindowMs` より古いスナップショットは削除してください。この窓の長さと、競技ごとのそのほかの調整は、[競技とリーグの設定](/arenaswap/docs/powerscore/configuration/)にあります。

## 中断と勝利確率があれば追跡する

どちらもコンテキストに入れます。試合がコマーシャル中かどうか判別できるなら、`onBreak` を渡します。

```ts
const score = scoreGame(game, { history, onBreak: isInBreak(game), winProbability });
```

`isInBreak` は自分で書くもので、イニング間、投手交代、タイムアウトについてフィードが伝える内容を使います。`onBreak` が `true` の間、スコアは一律15ポイント減ります。
`winProbability` は、どちらのチームについてでもよい、0〜1の最近の勝利確率の値のリストです。見るのは50%からの距離だけです。どちらも省略可能で、なくても PowerScore は問題なくスコア化します。それぞれが何を変えるかは、[ブーストとペナルティ](/arenaswap/docs/powerscore/boosts-and-penalties/)にあります。

## ブーストに場面を見せる

野球、フットボール、ホッケー、サッカーにはそれぞれ、スコアだけでは見えない状況があります。フィードにあるフィールドを足せば、`scoreGame` がその分を加点します。次は、野球の9回裏、同点、満塁、ワンアウトの試合です。

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

この2つを合わせると、見せ場の枠の上限の20に達します。フットボールでは、`isRedZone` からレッドゾーンが、`down`、`distance`、`isGoalToGo` で重みづけされて加点され、`possession`、`yardsToEndZone`、`down` から2ミニッツ・ドリルが加点されます。ホッケーの得点チャンスには、`context.powerPlay` と `context.emptyNet` が必要です。サッカーには `redCards` が必要です。

## 別のモードでスコア化する

モードは `options.mode` で選びます。大差には、追加で必要なものはありません。ファンタジーには、コンテキストにロスターが必要で、選手ごとに1つのエントリを入れます。

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

`pointEvents` は、選手が1分前にファンタジーポイントを稼いだことを、ファンタジーポイントのシグナル（Production）が把握する手段です。ボックススコアの行をそのポイントに変換するには、[`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints)を使います。あなたの選手が1人も出ていない試合は、クラシックとしてスコア化され、`score.modeId` にそれが示されます。

## お気に入り、ポストシーズン、手動のブーストを加える

まず試合をスコア化し、視聴者のお気に入りチームのように、PowerScore が知らないものはオプションで加えます。同じオプションがどのモードでも使えます。

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 106
```

お気に入りとポストシーズンのブーストは合計に足され、100で頭打ちになります。`gameBoost` はその後に足され、100を超えることが許される唯一のもので、視聴者が固定した試合は満点にも勝てます。止まっている試合は、これらをすべてスキップします。止まった試合が、プレー中の試合を上回ることはありません。

ArenaSwap 自身の[スコアリングコード](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts)も、タブの切り替えにスコアを渡す前に、同じ方法でオプションを組み立てています。

## 2.x のやり方

`computePowerScore(game, history, winProbabilityHistory)` は引き続き動き、見せ場のブーストなしの、フラットな 2.x の結果を返します。これまでどおりの数字だけがほしいなら、これが正解です。まだ残っているものの一覧は、[API リファレンス](/arenaswap/docs/powerscore/api-reference/#the-2x-api)にあります。
