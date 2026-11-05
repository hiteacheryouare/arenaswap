---
sourceHash: '1cae3a43d11e'
title: PowerScore で最初の試合をスコア化する
navLabel: はじめに
description: powerscore パッケージをインストールし、数行のコードで scoreGame を使ってライブの試合を1つスコア化します。ターミナルに数字と、その理由が表示されます。
section: powerscore
order: 1
faq:
  - q: powerscore に API キーやアカウントは必要ですか？
    a: いいえ。渡された試合の状態をスコア化するだけです。その状態を取得する処理は、スコアの取得元がどこであれ、あなたのコードの仕事です。
  - q: powerscore はブラウザで動きますか？
    a: はい。実行時の依存関係はなく、扱うのはプレーンなオブジェクトと計算だけです。Node で動くのと同じように、ブラウザ拡張機能にもバンドルできます。
  - q: PowerScore 3 のために 2.x のコードを書き直す必要はありますか？
    a: いいえ。computePowerScore と 2.x の型は引き続き動き、これまでと同じ合計を返します。モードや新しいブーストを使いたくなったら scoreGame に移ってください。
---

ここでは `powerscore` をインストールして、ライブの試合を1つスコア化します。最後には、数字とその理由が手に入ります。

## パッケージをインストールする

```bash
npm install powerscore
```

このパッケージは [npm](https://www.npmjs.com/package/powerscore) でも公開されています。今夜の本物の試合がスコア化される様子は、[PowerScore のページ](/arenaswap/powerscore/)で見られます。

## 試合を記述する

`scoreGame` には `Game` オブジェクトが必要です。2チームのスコア、リーグと競技、そして試合がいまどんな状況かを入れます。ライブの試合には `status: 'in'` を設定してください。ブーストは、ポイントを付ける前にそれを確認するからです。

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

ボストンが2点リードで、第4クォーター残り45秒。接戦で、しかも終盤です。PowerScore がまさに探しているものです。

## スコア化する

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

実行すると、ターミナルにこう出力されます。

```text
68
BOS up 2 with 0:45 left
```

`scoreGame` はあと2つ引数を取れます。どちらも省略できます。1つは `context` で、試合自体が持っていない情報（スコアの履歴、勝利確率、試合前のライン、ファンタジーのロスター）を渡します。もう1つは `options` で、スコア化の方法（どのモードか、どのシグナルをオフにするか）を指定します。どちらもなければ、クラシックになります。試合が接戦で、しかも終盤かを問うモードです。

## 内訳を読む

`score` には、見出しの数字以外のものも入っています。すべてのシグナルが、それぞれのポイントと上限つきのリスト項目として入り、ブーストと理由もあります。

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

ここでは、接戦度と終盤のプレッシャーでスコアのすべてが決まっています。振り返るスコア履歴がないので、勢い、リード交代、追い上げには測るものがなく、0のままです。コンテキストで `scoreGame` に `history` を渡すと、動き出します。ブーストは `score.boosts` にあり、この試合ではすべて0です。バスケットボールには、走者もレッドゾーンもゴーリーを下げる場面もなく、加点するものがないからです。

`signalPoints(score, 'momentum')` や `boostPoints(score, 'noHitter')` を使うと、id で1つ取り出せます。

## 別のモードを試す

同じ試合に、別の問いを投げかけられます。モードは `options.mode` で選びます。

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

大差は、誰かが独走しているかを問います。2点差の試合は違うので、クラシックの68の30%、つまり下限のスコアしか付きません。この下限があるから、大差の試合がない夜でも接戦が候補に残ります。ファンタジーは、あなたの選手に何か起こりそうかを問います。3つのモードは[シグナルのページ](/arenaswap/docs/powerscore/signals/)で説明しています。

自分のコードが取得している試合のスコア化は、[ライブデータから試合をスコア化する](/arenaswap/docs/powerscore/scoring-a-game/)をお読みください。各シグナルが何を測り、なぜそうなのかは、[すべてのモードの PowerScore シグナル](/arenaswap/docs/powerscore/signals/)をお読みください。
