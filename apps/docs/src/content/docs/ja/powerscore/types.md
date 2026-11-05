---
sourceHash: '40ee38646993'
title: PowerScore の TypeScript 型
description: Game、ScoringContext、ScoreOptions、PowerScore、そしてモードと設定の型のすべてのフィールドについて、どれが省略可能か、省略可能なものが欠けているとどうなるかをまとめています。
section: powerscore
order: 7
navLabel: 型
---

PowerScore 3 の型は、3つのグループに分かれます。`scoreGame` に渡すもの：[`Game`](#game)、[`ScoringContext`](#scoringcontext)、[`ScoreOptions`](#scoreoptions)。返ってくるもの：[`PowerScore`](#powerscore)。そして、モードを構成するもの：[`PowerScoreMode`](#powerscoremode) とその部品です。2.x の型は最後にあり、今もエクスポートされていて、動作します。

## Game

いまの試合の状態です。必須なのは `id`、`league`、`sportType`、2チームのスコアだけです。それ以外は、あればスコアを絞り込みます。省略可能なフィールドは、ないとき、初期値ではなく不明として扱われます。

`Game` は、リーグ id についてジェネリックです。`Game<League extends string = LeagueId>`。何も付けない `Game` は、これまでと同じ意味です。独自のリーグ id を持つフィードは `Game<string>` を使います。

| フィールド | 型 | ないとどうなるか |
|---|---|---|
| `id` | `string` | 必須。 |
| `league` | `League` | 必須。`leagueConfigMap` が認識しない id は、その競技の初期値でスコア化されます（[競技とリーグの設定](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship)をご覧ください）。 |
| `sportType` | `SportType` | 必須。`sportTypeConfigMap` が認識しない値は、バスケットボールの調整値になります。 |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | 必須。 |
| `period?` | `number` | 終盤のプレッシャーは `0` になります。接戦度はスコア化されますが、試合の進行度も `0` と読まれるので、段階の値の全額ではなく、一律のフロアだけを払います。 |
| `clockSeconds?` | `number` | `0:00` ではなく、不明として扱われます。終盤の上り坂はピリオドの開始時点にとどまり、時計で足切りされるブーストはすべて0を払います。 |
| `intermission?` | `boolean` | `false`。`true` なら試合が止まります。プレーが再開するまで、すべてが0点になります。 |
| `delayed?` | `boolean` | `false`。`true` なら、`intermission` と同じく試合が止まります。 |
| `status?` | `'pre' \| 'in' \| 'post'` | `'in'` 以外では、値がない場合も含めて、ブーストは何も払いません。シグナルはこれを読みません。 |
| `topOfInning?` | `boolean` | 野球とソフトボール。イニングの表と裏で、接戦度の値の中間のスコアになります。勝ち越し走者とノーヒッターに必要です。 |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | 野球とソフトボール。走者なしとして扱われます。 |
| `outs?` | `number` | 野球とソフトボール。0として扱われます。3なら、走者に基づくブーストは何も払いません。 |
| `possession?` | `'home' \| 'away'` | フットボール、またはフィードが伝える場合はパック。これがないと、2ミニッツ・ドリルは0を払い、ファンタジーにはフットボールの状況がありません。 |
| `yardsToEndZone?` | `number` | フットボール。ボールを持つチームが必要とするヤード数。2ミニッツ・ドリルとファンタジーに必要です。 |
| `isRedZone?` | `boolean` | フットボールのみ。`false` かない場合、得点チャンスブーストのレッドゾーンのケースは0を払います。 |
| `down?` | `number` | フットボールのみ。ブーストを完全に失うのではなく、重みなし（×1）の倍率になります。2ミニッツ・ドリルとファンタジーでは、1未満の `down` はプレーの合間と読まれます。 |
| `distance?` | `number` | フットボールのみ。3rdダウンで、値がないと3rdアンドショートとは認められないので、×1になります。 |
| `isGoalToGo?` | `boolean` | フットボールのみ。そして、4thダウンのときにしか何も変えません。 |
| `series?` | [`SeriesState`](#seriesstate) | シリーズなし。そのため、重要度はシリーズを読みません。 |
| `redCards?` | [`RedCard[]`](#redcard) | サッカー。カードなし。 |
| `seasonType?` | `'regular' \| 'postseason'` | これがそう示すか `postseasonRound` が設定されている場合、重要度はその試合をポストシーズンとして扱い、それ以外はレギュラーシーズンとして扱います。 |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | ポストシーズンブーストなし。`0` は優勝を決める試合、`1` は準決勝、`2` は準々決勝、`3` はそれ以前のすべてです。 |

`SportId` は、1.x との互換のために残された `LeagueId` の非推奨のエイリアスです。`LeagueId` を使ってください。

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

| フィールド | ないとどうなるか |
|---|---|
| `score` | 必須。 |
| `abbreviation` | `nickname` もないときに、理由の中でチームの名前になります。両方ないときは `?` と表示されます。 |
| `nickname` | 理由がチームを呼ぶ名前：「Lakers」「Nittany Lions」、またはサッカークラブの「Portland」のような短い名前。ない場合は `abbreviation` になります。 |
| `rank` | そのチームはランキング外です。トーナメントのシードにも使わないでください。これは投票による順位で、1が最上位です。重要度は、両チームにこれを必要とします。 |
| `hits` | 野球とソフトボール。安打数がないので、ノーヒッターは払えません。`0` は本当の値で、ヒットのないチームを意味します。 |
| `errors` | 野球とソフトボール。いまのところ、どのスコアも読みません。 |
| `timeouts` | フットボール。2ミニッツ・ドリルは、クロック管理に中立の重みを使います。 |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

3戦制より短いシリーズは、何も払いません。

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

試合自体が持っていない、すべてのものです。どのフィールドも省略可能で、`scoreGame` は、このオブジェクト全体を2番目の引数に取ります。

| フィールド | 型 | ないとどうなるか |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | 勢い、リード交代、追い上げは、これが3つのエントリを持つまで0のままです。古いものが先です。 |
| `onBreak?` | `boolean` | 呼び出し側がコマーシャル中だと検知しています。`true` なら、シグナルの小計から `breakPenalty`（15）を引きます。ないときは、休止中の減点はありません。 |
| `winProbability?` | `number[]` | 試合を通したホームの勝利確率で、0〜1。意味を持つには、有限の値が5つ必要です。それ以外は補正なし。 |
| `pregameLine?` | [`PregameLine`](#pregameline) | 番狂わせの予感と番狂わせは、0を払います。 |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | 争いの重要度なし。[`TeamStakes`](#teamstakes) をご覧ください。 |
| `powerPlay?` | `'home' \| 'away' \| boolean` | 得点チャンスブーストにパワープレーなし。どちらのチームかをフィードが伝えるときはそのサイド、パワープレー中であることしか伝えないときは `true`。 |
| `emptyNet?` | `'home' \| 'away' \| boolean` | 得点チャンスブーストにエンプティネットなし。フィードが2回のポーリングで続けて報告してからはじめて設定してください。 |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | フィード自身のプレーログから数えたリード交代で、ポーリングの合間の入れ替わりも拾い、最新の時刻がつきます。`history` が示すより多いときに使われます。リード交代には、それでも3つのスナップショットが必要です。 |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | ファンタジーには選手がおらず、試合はクラシックとしてスコア化されます。 |

### ScoreSnapshot

試合のスコアのある時点での記録で、勢い、リード交代、追い上げの検出に使います。4つのフィールドはすべて必須です。

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

`timestamp` は、同じ配列にある、ほかのスナップショットとの相対でさえあれば構いません。減衰は、壁時計の時刻ではなく、最新のスナップショットのタイムスタンプを基準に測られます。同じ履歴を再生すれば、いつ再生しても同じ結果になります。

### PregameLine

試合前の時点のラインです。ライブのラインはスコアに合わせて動くので、番狂わせを消してしまいます。

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

`spread` は、本命が背負ったポイントで、正の数です。読むのはバスケットボールとフットボールだけです。両方のマネーラインがあるときは、ブックメーカーのマージンを除いてから使います。`drawMoneyline` は、サッカーの3通りのラインです。ランラインやパックラインだけでは、どちらが本命かはわかっても、どれだけの差かはわからないので、十分ではありません。

### TeamStakes

1チームについての、シーズン終盤の争いのフラグで、レギュラーシーズンのみです。

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

`canClinch` は、この試合に勝てば、ほかに何が起きても、出場枠、ディビジョン、タイトルが確定することを意味します。`canBeEliminated` は、負ければそのチームが争いから外れることを意味します。`inRace` は、安全でも敗退でもなく、まだ争いに残っていることを意味します。`nearLine` は、順位表のラインから数ポイント以内にいることです。

### FantasyPlayerState

試合に出ている、ロスターの選手1人です。

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

`FantasyPosition` は `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'` です。フットボールのポジション、野球の投手と打者、それ以外の競技の汎用の選手です。`name` は、「Mahomes in the red zone」のように、理由に出てきます。`active: false` は、その選手が試合から外れているとフィードが伝えていることを意味し、何にも数えられません。`role` は野球のみで、イニングの中で選手がどこにいるかです。`pointEvents` は、入ってきたままのファンタジーポイントなので、直近の成績は、ほかのイベントと同じように薄れていきます。

## ScoreOptions

スコア化の方法です。どのフィールドも省略可能で、`scoreGame` は、このオブジェクトを3番目の引数に取ります。

| フィールド | 型 | 働き |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | どのモードが試合をスコア化するか。ないときはクラシックです。 |
| `disabledSignals?` | `readonly string[]` | オフにする、そのモードのシグナルの id。残りは、そのモードの全範囲に再スケールされます。 |
| `classicDisabledSignals?` | `readonly string[]` | クラシックがブレンドされるときやフロアとして使われるときに、そのクラシックでオフにするシグナルの id。 |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | 視聴者のファンタジーのスライダーのように、そのモード自身のブレンドを上書きします。 |
| `favoriteTeamCount?` | `number` | 試合に出ているお気に入りチームの数。 |
| `favoriteBoostPoints?` | `number` | お気に入りチーム1つあたりのポイント。 |
| `postseasonBoostPoints?` | `number` | 優勝を決める試合のポイント。それ以前のラウンドは、その一部を受け取ります。 |
| `gameBoost?` | `number` | 手動のブースト。合計を100より上に押し上げられるのは、これだけです。 |
| `sport?` | `Partial<SportTypeConfig>` | 組み込みの表に合わない競技のため、または表を調整するためのもの。 |
| `league?` | `Partial<LeagueConfig>` | 組み込みの表が知らないリーグのため。`regularPeriods` と `periodDurationSecs` を設定します。 |

## PowerScore

`scoreGame` が返すものです。

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

| フィールド | 意味 |
|---|---|
| `modeId` | 実際に試合をスコア化したモード。ファンタジーで、試合にロスターの選手がいないときのように、適用されないモードは、`'classic'` に戻ります。 |
| `total` | 0〜100で、100を超えるのは `gameBoost` を通したときだけです。 |
| `signals` | そのモードが定義するすべてのシグナルを、0のときも含めて、上限とともに。[`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment) をご覧ください。 |
| `signalsSubtotal` | オフにしたシグナルのための再スケールをする前の、オンのシグナルの合計。 |
| `scaledSubtotal` | 再スケールのあとの同じ値で、`signalCeiling` が上限です。 |
| `signalCeiling` | そのモードの上限の合計。クラシックは156です。 |
| `frozen` | ハーフタイム、インターバル、中断では `true`。すべてが0点になり、`reason` は空です。 |
| `onBreak`, `breakPenalty` | コマーシャル中の減点が適用されたかどうかと、何ポイント引かれたか（常に0以上）。止まったスコアでは、どちらも `false` と `0` です。 |
| `winProbabilityVariance?` | −5〜+5。勝利確率のデータが足りないときは、`0` ではなく、ありません。 |
| `baseTotal` | シグナルから休止中の減点を引き、補正を足したもので、0〜100。ブーストの前です。 |
| `classicTotal?` | そのモードがクラシックとブレンドされるときの、クラシック自身の合計。 |
| `blend?` | ブレンドされるモードが合計にたどり着いた過程。[`BlendResult`](#blendresult) をご覧ください。 |
| `boosts` | そのモードが払うすべてのブーストで、払っていないときは0。頼んだ場合は、`favoriteBoost`、`postseasonBoost`、`gameBoost` も加わります。 |
| `reasons` | 事実だけを述べた最大3つの文で、翻訳できる状態のフラグメントです。いま何が起きているか、いま何が起きたか、スコアと時間、何が懸かっているか。すべてのキーは、[README の理由の表](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/powerscore/README.md#reasons)をご覧ください。 |
| `reason` | 同じものを、英語の文にしたもの。表示用のテキストで、API ではありません。バージョン間で文言が変わることがあります。これに照合しないでください。 |

### ScoredSignal、ScoredBoost、ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number>; details?: ReasonFragment[] }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

ブーストの `meta` は、UI が伝えたくなる情報を運びます。ノーヒッターなら `{ inning: 8 }`、2ミニッツ・ドリルなら `{ secondsLeft: 95, trailBy: 3 }` のようなものです。理由のフラグメントは、`{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } }` のような形です。組み込みモードが知っている理由のキーは、`reason` では英語で出力されます。自分で付けたキーは、そのままの文字で出力されるので、翻訳するときは文字列ではなく `reasons` から行ってください。

ブーストの `details` は、この試合で、そのブーストが払う理由、または払わない理由になっていることを、UI が翻訳するための理由のフラグメントとして伝えます。たとえば、重要度なら `{ key: 'seriesClinch', params: { team: 'CHW' } }`、ホッケーの6-on-4 なら、ゴーリーを下げたこととパワープレーが一緒に入ります。試合が始まる前やプレーが止まっている間のように、伝えることがないときは、ありません。これらのキーには英語のレンダラーがありません。下の表は、組み込みのブーストが送るすべてのキーと、ArenaSwap が表示する文を挙げています。

| ブースト | キー | パラメータ | 英語での表示 |
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

モードは、シグナルのリストと、それに合うブーストです。[`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode) で作ります。これは最初に1度だけ検証します。

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

| フィールド | 意味 |
|---|---|
| `signals`, `boosts` | 表示順です。 |
| `bucketCaps` | ブーストのバケットが合計で足せる最大値。リストの前のブーストから先に払われます。 |
| `reasonPriority` | 理由を読んでよいシグナルの id で、読む価値の高い順です。いちばん強いものが「いま何が起きたか」の文を作り、同点のときは並び順で決まります。 |
| `usesBreakPenalty`, `usesWinProbability` | コマーシャル中の減点と ±5 の補正が適用されるかどうか。 |
| `classicBlend` | そのモードがクラシックとどう組み合わさるか。 |
| `paysPostseason?` | `false` は、このモードでポストシーズンブーストを払いません。初期値は `true`。大差は、プレーオフの大差は結果がもう決まっているので、これを `false` にしています。 |
| `appliesTo` | そのモードが語るべきことのない試合には `false` を返し、その試合はクラシックとしてスコア化されます。 |

### SignalDefinition と BoostDefinition

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

シグナルの `points` は、`ceiling` に収められます。ブーストには自分の上限はありませんが、バケットにキャップがあることがあります。

### SignalInput

`compute` が受け取るものです。

| フィールド | 意味 |
|---|---|
| `game`, `context` | `scoreGame` に渡されたもの。 |
| `sport`, `league` | `options` による上書きのあとの、解決済みの [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig) と `LeagueConfig`。 |
| `progress` | 試合の開始時は0、レギュレーションの終わりから延長を通して1。 |
| `now` | `history` の最新のスナップショットのタイムスタンプ。なければ0。 |
| `margin` | スコア差の絶対値。 |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

大差は、係数0.3のフロアを使います。ファンタジーは、重み0.6のブーストを使うので、あなたの選手の試合は、クラシックのスコアより上にしか上がりません。組み込みモードは `mix` を使いませんが、自分で作るモードのために用意されています。

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

モードがクラシックとブレンドされたとき、`score.blend` がこれを持つので、内訳で計算過程を見せられます。

## SportTypeConfig と LeagueConfig

`SportTypeConfig` は、競技のプレーのしかたのすべてを持っています。接戦度のしきい値、勢いと追い上げのしきい値、減衰の半減期、その競技に時計があるかどうか、そして（野球とソフトボールのみ）`lateGameCurve` です。`LeagueConfig` は、特定のリーグのピリオドの長さを持っています。`id`、`label`、`sportType`、`regularPeriods`、`periodDurationSecs`、`periodFormat` です。ArenaSwap が自身の取得や日程バーに使うフィールドもありますが、スコアラーは読みません。

一部のフィールドは省略可能で、設定しているエントリは限られます。`lateGameCurve`（野球とソフトボール）、`clockIsFullGameElapsed`（サッカー）、`zeroZeroPenaltyPeriods`（ホッケーとサッカー）、`knockoutRunMinutes`（2つのワールドカップと、2つのオリンピックのサッカー大会）です。`options.sport` と `options.league` を通して、任意の一部を `Partial` として渡し、1回の呼び出しごとに上書きできます。フィールドごとの意味と、各競技、各リーグの実際の値は、[競技とリーグの設定](/arenaswap/docs/powerscore/configuration/)にあります。

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

`SportTypeConfig.lateGameCurve` を設定するのは、野球とソフトボールだけです。時計のある競技は、終盤の上り坂を `period` と `clockSeconds` から直接導き、このフィールドは `undefined` のままです。時計に基づく競技が、ここで設定できることはほかにないので、この型には今のところ1つの形しかありません。

## ScorerTunables

エンジンがスコア化に使うすべての段階の値を持つ、エクスポートされた1つのオブジェクトです。完全に埋まった定数で、一部だけの設定ではありません。

| ブランチ | 持っているもの |
|---|---|
| `scores.closeness` | 接戦度の段階の上限（`tied`、`tight`、`zeroZero`、`close`、`fringe`、`none`）。[クラシックの接戦度シグナル](/arenaswap/docs/powerscore/signals/#closeness)をご覧ください。 |
| `scores.closenessFlatFloor` | 進行度による調整の前に、接戦度のどの段階も払う一律のフロア。 |
| `scores.lateGame` | 終盤の上限、延長の先出し、前のピリオドへのタッチ。[終盤のプレッシャー](/arenaswap/docs/powerscore/signals/#late-game-pressure)をご覧ください。 |
| `scores.momentum` | 勢いの2つの段階の値。[勢い](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor)をご覧ください。 |
| `scores.leadChanges` | リード交代の2つの段階の値。 |
| `scores.comeback` | 追い上げの2つの段階の値と、その一律のフロア。 |
| `scores.winProbabilityVariance` | `maxAvgDist` と `minDataPoints`。[ブーストとペナルティ](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance)に表があります。 |
| `reasons` | `fallback`（「best game available」）だけで、非推奨の平らな結果が戻る先の理由です。英語の文言は `renderReasonEnglish` にあります。 |

## FantasyRule と FantasySport

[`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints) の背後にある型です。

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

`min` と `max` は、設定画面が強制できる上下限で、`resolveFantasyScoring` は、上書きの値をそこに収めます。

## SportType と LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

`SportType` は閉じたユニオンです。`LeagueId` は、組み込みの調整値を持つ31リーグですが、`Game` を制限するものではありません。`Game<string>` なら、試合の `league` は任意の文字列にでき、表にない id は、その競技の初期値でスコア化されます。31リーグの id の全リストは、[競技とリーグの設定](/arenaswap/docs/powerscore/configuration/)にあります。実行時には `allLeagueIds` としても使えます。

## PowerScoreResult (2.x)

非推奨ですが、今もエクスポートされていて、動作します。`computePowerScore` が返す平らな出力で、`normalizePowerScoreResult` が一部だけの版を受け付ける形です。`scoreGame` はこれを返しません。

| フィールド | 型 | ないとどうなるか |
|---|---|---|
| `gameId` | `string` | この型が出てくるすべての場所で必須。 |
| `total` | `number` | `computePowerScore` が設定します。0〜`scoreMaxTotal`（100）で、`allowTotalOverflow` つきの `normalizePowerScoreResult` を通して作った場合は別です。 |
| `closeness` | `number` | 0〜`scoreMaxCloseness`（42）。 |
| `lateGame` | `number` | 0〜`scoreMaxLateGame`（38）。 |
| `momentum` | `number` | 0〜`scoreMaxMomentum`（38）。 |
| `leadChanges` | `number` | 0〜`scoreMaxLeadChanges`（18）。 |
| `comeback` | `number` | 0〜`scoreMaxComeback`（20）。 |
| `winProbabilityVariance?` | `number` | −`scoreWinProbVarianceMax`〜`scoreWinProbVarianceMax`（±5）。勝利確率の履歴が渡されなかったか、使えるものが少なすぎたときは、`0` ではなく、ありません。 |
| `reason` | `string` | ないとき、または文字列でないときは、`scorerTunables.reasons.fallback`（「best game available」）になります。 |
| `onBreak?` | `boolean` | ないときは `false` と読まれます。`normalizePowerScoreResult` は、boolean ならそのまま通します。 |
| `breakPenalty?` | `number` | 引かれたポイントで、常に0以上。渡されなかったときは、`0` ではなく、ありません。`computePowerScore` は設定しません。 |
| `signalsSubtotal?` | `number` | コマーシャル中の減点の前の、5つのシグナルの合計で、0〜`scoreMaxSignalsSubtotal`（156）。 |
| `favoriteBonus?`, `favoriteTeamCount?`, `gameBoost?`, `scoringOpportunityBoost?`, `postseasonBoost?` | `number` | `computePowerScore` は計算しません。呼び出し側が渡さない限り、ありません。 |

`scoreGame` は、お気に入り、ポストシーズン、試合のブーストを自動的に組み込むので、これを使うなら、`PowerScoreResult` を手作業で作る必要はありません。2.x がまだエクスポートしているものはすべて、[API リファレンス](/arenaswap/docs/powerscore/api-reference/#the-2x-api)に載っています。
