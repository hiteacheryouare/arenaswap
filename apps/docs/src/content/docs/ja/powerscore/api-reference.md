---
sourceHash: '91a61d4e6782'
title: PowerScore API リファレンス
navLabel: API リファレンス
description: powerscore がエクスポートするすべての関数と定数について、シグネチャ、パラメータ、戻り値、入力が欠けているときや不正なときの動作をまとめています。非推奨の 2.x API も載せています。
section: powerscore
order: 6
---

ここにあるものはすべて、パッケージのルートからエクスポートされています。`import { ... } from 'powerscore'` で読み込みます。最初に 3.0 の関数、次にヘルパー、組み込みモードを構成する部品、定数、最後に非推奨ですが以前と完全に同じ動作をする 2.x API の順に並べています。型は [PowerScore の TypeScript 型](/arenaswap/docs/powerscore/types/)にあります。

## スコアリング

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

メインのエントリポイントです。1つのモードで試合をスコア化し、[`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore) を返します。中身は、合計、リストになったすべてのシグナルとブースト、そして理由です。

| パラメータ | 初期値 | 補足 |
|---|---|---|
| `game` | 必須 | 現在の試合の状態。必須なのは `id`、`league`、`sportType`、両チームのスコアだけです。 |
| `context` | `{}` | 履歴、勝利確率、試合前のライン、ファンタジーのロスター、そのほか試合自体が持っていない情報。[`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext) をご覧ください。 |
| `options` | `{}` | どのモードか、どのシグナルをオフにするか、お気に入り、ポストシーズン、手動のブースト。[`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions) をご覧ください。 |

省略可能なフィールドが欠けていても例外は投げません。それを必要とするエンジンの部分が0点になるだけです。認識できない `league` は、その競技の初期値でスコア化されます。入力のどこかにある有限でない値は、`NaN` として伝わるのではなく、存在しないものとして扱われます。

止まっている試合（`intermission` または `delayed`）は、すべてのブーストを含めて全体が0点になり、`reason` は空です。`game.status` を読むのはブーストだけで、`'in'` でなければブーストは何も払いません。

合計は、決まった順序で組み立てられます。

1. シグナルがスコア化されます。オフにされたものは再スケールで除かれます。
2. 休止中の減点が引かれます。
3. 勝利確率の補正が加わります（クラシックのみ）。結果は0〜100に収められます。
4. そのモード自身のブーストが、バケットの上限の範囲で加わり、合計は100で頭打ちになります。
5. そのモードがクラシックと混ざる場合（フロア、ミックス、ブースト）は、ここで行われます。
6. お気に入りとポストシーズンのブーストが加わり、合計はもう一度100で頭打ちになります。`paysPostseason: false` のモードは、ポストシーズンブーストを飛ばします。
7. `gameBoost` は最後に加わります。100を超えることが許されているのは、これだけです。

```ts
const score = scoreGame(game, { history }, { mode: 'blowouts' });
score.total;  // 0–100
score.reason; // 'BOS on a 12–0 run. Up 28 in the 3rd quarter'
```

### signalPoints と boostPoints

```ts
function signalPoints(score: Pick<PowerScore, 'signals'>, id: string): number
function boostPoints(score: Pick<PowerScore, 'boosts'>, id: string): number
```

結果から、id で1つのエントリを調べます。どちらも、存在しない id には `0` を返します。

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

シグナルやブーストの `compute` が受け取る [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput) を作ります。中身は、試合、コンテキスト、解決済みの競技とリーグの設定、`progress`、`now`、`margin` です。`scoreGame` が内部で呼んでいるものを、自分で書いたシグナルを単独でテストできるようにエクスポートしています。

## モード

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

モードを最初に1度だけ検証し、そのまま返します。2つのシグナルが id を共有しているとき、シグナルの上限が正の数でないとき、モードにシグナルがないときは、例外を投げます。

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

シグナルの `compute` は、試合、コンテキスト、解決済みの競技とリーグの設定、試合の `progress`（開始時は0、レギュレーションの終わりから延長を通して1）、そして `margin` を受け取ります。戻り値は、上限に収められる `points` と、省略可能な `reason` です。モードは `boosts`、`bucketCaps`、`classicBlend`、`paysPostseason`（初期値は `true`。`false` にするとポストシーズンブーストを払いません）、そして語るべきことのない試合をクラシックに回す `appliesTo(game, context)` も持てます。

`reasonPriority` には、理由を読んでよいシグナルを並べます。そのうち最も強いものが語り、同点のときは並び順で決まります。組み込みモードが知っている理由のキーは、`score.reason` では英語で出力されます。自分で付けたキーは、そのままの文字で出力されるので、翻訳するときは文字列ではなく `score.reasons` から行ってください。

### classicMode、blowoutsMode、fantasyMode、builtInModes、getMode

`classicMode`、`blowoutsMode`、`fantasyMode` は、3つの組み込みの `PowerScoreMode` オブジェクトです。`builtInModes` はその3つを id をキーにまとめたもので、`getMode(idOrMode)` は id、モードのオブジェクト、または何も渡さない場合（クラシックになります）を解決します。どれかをスプレッドして、その上に作れます。3.0 のブーストなしのクラシックを得るには、次のようにします。

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### シグナルとブースト

組み込みモードを構成する部品もエクスポートされているので、カスタムモードで再利用できます。

| エクスポート | 内容 |
|---|---|
| `classicSignals`, `blowoutsSignals`, `fantasySignals` | 各モードのシグナルのリスト。 |
| `closenessSignal`, `lateGameSignal`, `momentumSignal`, `leadChangesSignal`, `comebackSignal` | クラシックの5つを1つずつ。 |
| `scoringOpportunityBoost`, `goAheadRunBoost`, `twoMinuteDrillBoost`, `noHitterBoost`, `redCardBoost`, `upsetWatchBoost`, `upsetRoutBoost`, `stakesBoost` | 各ブーストの `BoostDefinition`。それぞれが何を払うかは[ブーストとペナルティ](/arenaswap/docs/powerscore/boosts-and-penalties/)にあります。 |
| `underdogProbability(line, sportType, league)` | 試合前のアンダードッグの勝つ確率で、`PregameLine` から求めます。ラインから判断できないときは `undefined` です。 |
| `postseasonBoostShare(round)` | あるラウンドが獲得するポストシーズンブーストの割合で、1、0.75、0.5、0.25、ラウンドがなければ0です。 |
| `applyProgressFloor`, `findLeadChanges` | 接戦度とリード交代の裏にある2つのヘルパー。 |
| `baseMask(baseRunners)`, `runnersOn(mask)` | 塁を3ビットの数にしたもの（1塁が最下位。`0b101` は1塁と3塁に走者）と、その走者の人数。 |

## 理由

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

理由の文を1つ、または複数の理由を文にまとめたリストを、英語で出力します。`score.reason` を埋めているのはこれです。自分で理由を作るときに、同じ読み心地にしたい場合に使います。`ordinal(n)` は、これらが使う英語の序数（「2nd」、「11th」、「21st」）を返します。

## 設定と進行度

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

`resolveSportConfig` と `resolveLeagueConfig` は、`scoreGame` が毎回の呼び出しの冒頭でしていることをします。未知の `sportType` はバスケットボールの調整値になります。未知のリーグは、その競技でいちばんよく知られたリーグになります。バスケットボールは NBA、ホッケーは NHL、野球は MLB、フットボールは NFL、ソフトボールは NCAA ソフトボール、サッカーは MLS です。`getGameProgress` は、開始時は0、レギュレーションの終わりから延長を通して1です。`scoreMargin` は、スコア差の絶対値です。

## ファンタジースコアリング

ファンタジーの Production シグナルは、ファンタジーポイントを必要とします。ここにあるものは、ボックススコアの1行をそのポイントに変えます。どのスタッツを使うかは自分で指定し、スコア化はこちらが行います。

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

1つのスタッツの行の合計を、小数第2位に丸めて返します。未知のスタッツと有限でない値は無視されます。守備の `pointsAllowed` は、段階ごとにスコア化されます。

```ts
import { computeFantasyPoints } from 'powerscore';

computeFantasyPoints('football', {
	passingYards: 310,
	passingTouchdowns: 3,
	interceptionsThrown: 1,
	rushingYards: 22,
}); // 12.4 + 12 − 2 + 2.2 = 24.6
```

### defaultFantasyScoring、resolveFantasyScoring、fantasySportOf

`defaultFantasyScoring` には、`'football'`（フル PPR）、`'basketball'`、`'baseball'`、`'hockey'` の初期ルールが入っています。各ルールは `{ points, min, max }` なので、設定画面が上下限を強制できます。

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

`resolveFantasyScoring(sport, overrides?)` は、ルールをただの数値として返します。上書きの値はそのルールの上下限に収められ、存在しないルールは無視されます。

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

`fantasySportOf(sportType)` は、`sportType` を4つのファンタジー競技のどれかに対応づけます。ソフトボールは野球として扱われ、サッカーには対応するものがないので `undefined` を返します。

## 定数

| 定数 | 値 |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156（クラシックの5つの上限の合計） |
| `scoreMaxTotal` | 100 |
| `breakPenalty` | 15。`context.onBreak` が `true` の間の一律の減点 |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

クラシックの上限が100ポイントのキャップを超える理由は、[すべてのモードの PowerScore シグナル](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total)にあります。キャップについては[ブーストとペナルティ](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets)で説明しています。

`scoringOpportunityBaseRunnerBoosts`、`scoringOpportunityRedZoneBoost`、`scoringOpportunityRedZoneFringeBoost`、`redZoneDownMultipliers`、`thirdAndShortDistance` は、得点チャンスブーストの背後にある正確な値を持っていて、[ブーストとペナルティ](/arenaswap/docs/powerscore/boosts-and-penalties/)に表にしてあります。新しいブーストは、数値を `goAheadRunTunables`、`twoMinuteDrillTunables`、`noHitterTunables`、`redCardTunables`、`upsetTunables`、`stakesTunables`、`hockeyTunables` に持っています。

`scorerTunables` は、エンジンがスコア化に使うすべての段階の値を持っています。上の定数がすでに名前で示しているのと同じ数値なので、利用する側は、値をハードコードする代わりに、段階の値を読めます。

`sportTypeConfigs`、`sportTypeConfigMap`、`leagueConfigs`、`leagueConfigMap`、`allLeagueIds` は、エンジンが毎回の呼び出しで読む、競技とリーグの調整値を持っています。そのフィールドと、各競技、各リーグの実際の値は、[競技とリーグの設定](/arenaswap/docs/powerscore/configuration/)にあります。

## 2.x API

今もエクスポートされていて、今も動き、注記のあるものは非推奨です。3.0 で削除されたものはありません。モードや新しいブーストが必要になったら `scoreGame` に移ってください。それまでは、これらは以前と同じ数値を返します。

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	winProbabilityHistory?: number[],
): PowerScoreResult
```

非推奨です。クラシックの5つのシグナルをスコア化し、勝利確率の補正を適用して、平らな `PowerScoreResult`（`closeness`、`lateGame`、`momentum`、`leadChanges`、`comeback`、`total`、`reason` など）を返します。クラシックの `scoreGame` からシグナルだけを取り出して平らにしたものなので、見せ場のブーストは含まれません。

| パラメータ | 初期値 | 補足 |
|---|---|---|
| `game` | 必須 | 現在の試合の状態。 |
| `history` | `[]` | 最近のスコアのスナップショット。勢い、リード交代、追い上げは、ここに3つ以上のエントリが入るまで0のままです。 |
| `winProbabilityHistory` | `[]` | 0〜1の最近の勝利確率の値。何かを加えるには、有限のエントリが5つ以上必要です。 |

例外は投げません。`isPlayFrozen(game)` が true なら、ただちに全部0の結果を返します。`game.status` は確認しません。ほかのフィールドが同じなら、`'pre'` や `'post'` の試合も `'in'` の試合と同じ点になります。

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

非推奨です。この数値は、`scoreGame` の `boosts` リストに `scoringOpportunity` として入っています。`game.status === 'in'` で、試合が止まっていない場合以外は `0` を返します。それ以外では、野球とソフトボールなら走者の数に応じて0〜10、フットボールならレッドゾーンでの点差とダウンに応じて0〜15を返します。ほかのすべての `sportType` では `0` を返し、ホッケーも含まれます。ホッケーのパワープレーとエンプティネットは、この関数が受け取らない `context` から来るためです。`computePowerScore` の `total` には含まれません。

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

勝利確率の履歴を、±5の補正に変換します。まず有限でないエントリを除き、残った有限の値が5つ未満なら `undefined` を返します。そうでなければ、`-scoreWinProbVarianceMax` から `scoreWinProbVarianceMax` までの整数を返します。

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

`game.intermission === true` または `game.delayed === true` のとき `true` を返し、それ以外は `false` です。両方のフィールドがない場合も false です。

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

試合がレギュレーションのどこまで進んだかを、0〜1で返します。終盤シグナルが読むのと同じ時計から求めます。試合をタイムラインに描くときに便利です。

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

非推奨です。一部だけの、信頼できないかもしれない `PowerScoreResult`（必須なのは `gameId` だけ）を受け取り、すべて範囲内に収めた有効なものを返します。`computePowerScore` は、作り出すすべての結果に対して、内部でこれを呼んでいます。

5つのシグナルのフィールドは、それぞれの上限に収められます。`total` は、`options.allowTotalOverflow` が `true` でない限り、`scoreMaxTotal` に収められます。このオプションがあると、下限の `0` だけで収められるので、手動のブーストで意図的に100を超えさせられます。`total` が欠けているか有限でないときは、5つのシグナルの単純な合計ではなく、その合計から `breakPenalty` を引いた値になります。`reason` は、文字列でないとき `scorerTunables.reasons.fallback`（「best game available」）になります。`favoriteBonus`、`favoriteTeamCount`、`gameBoost`、`scoringOpportunityBoost`、`postseasonBoost` は、渡されたときは丸められて `0` が下限になります。渡されなかったときは、`0` を入れるのではなく、結果から完全に省かれます。例外は投げません。

### 移行すると何が変わるか

`scoreGame` のクラシックには新しいブーストが含まれるので、同じ試合が `computePowerScore` より、最大でバケットの上限の分だけ高くなることがあります。以前は `normalizePowerScoreResult` の前後で手作業で足していたお気に入り、ポストシーズン、手動のブーストは、今は `scoreGame` のオプションです。そのほかはすべて引き継がれます。`Game` 型にはオプションのフィールドとリーグの型パラメータが加わりましたが、何も付けない `Game` の意味は変わりません。表にないリーグの id は、以前は競技にかかわらず NBA の設定でスコア化されていました。今はその競技自身の初期値になるので、未知のリーグのホッケーの試合は、NHL のピリオド数と時計を使います。
