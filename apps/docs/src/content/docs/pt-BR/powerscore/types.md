---
sourceHash: '40ee38646993'
title: Tipos TypeScript do PowerScore
description: Todo campo de Game, ScoringContext, ScoreOptions, PowerScore e dos tipos de modo e de configuração, quais são opcionais e o que acontece quando um opcional falta.
section: powerscore
order: 7
navLabel: Tipos
---

Os tipos do PowerScore 3 se dividem em três grupos. O que você entrega ao `scoreGame`: [`Game`](#game), [`ScoringContext`](#scoringcontext) e [`ScoreOptions`](#scoreoptions). O que você recebe de volta: [`PowerScore`](#powerscore). E do que um modo é feito: [`PowerScoreMode`](#powerscoremode) e suas partes. Os tipos 2.x estão no fim, ainda exportados e funcionando.

## Game

O estado do jogo agora. Só `id`, `league`, `sportType` e os dois placares dos times são obrigatórios. Todo o resto afina a pontuação quando está presente. Cada campo opcional é tratado como desconhecido, não como um valor padrão, quando está ausente.

O `Game` é genérico sobre o id da liga: `Game<League extends string = LeagueId>`. Um `Game` puro significa o que sempre significou. Um feed com ids de liga próprios usa `Game<string>`.

| Campo | Tipo | Ausente significa |
|---|---|---|
| `id` | `string` | Obrigatório. |
| `league` | `League` | Obrigatório. Um id que o `leagueConfigMap` não reconhece é pontuado com os padrões do esporte dele (veja [Configuração de esporte e liga](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship)). |
| `sportType` | `SportType` | Obrigatório. Um valor que o `sportTypeConfigMap` não reconhece cai na calibragem do basquete. |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | Obrigatório. |
| `period?` | `number` | A pressão da fase final lê `0`. O equilíbrio ainda pontua, mas o andamento do jogo também lê `0`, então ele paga só o piso fixo em vez do valor cheio da faixa. |
| `clockSeconds?` | `number` | Tratado como desconhecido, não como `0:00`. A rampa da fase final fica no começo do período, e todo impulso travado pelo relógio paga 0. |
| `intermission?` | `boolean` | `false`. `true` congela o jogo: tudo pontua 0 até a partida voltar. |
| `delayed?` | `boolean` | `false`. `true` congela o jogo, igual ao `intermission`. |
| `status?` | `'pre' \| 'in' \| 'post'` | Os impulsos não pagam nada para qualquer coisa que não seja `'in'`, inclusive um valor ausente. Os sinais não o leem. |
| `topOfInning?` | `boolean` | Beisebol e softbol. Pontua entre os valores de equilíbrio da parte alta e da parte baixa da entrada. A corrida da vantagem e o no-hitter precisam dele. |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | Beisebol e softbol. Tratado como nenhum corredor em base. |
| `outs?` | `number` | Beisebol e softbol. Tratado como 0. Com 3, os impulsos baseados em corredores não pagam nada. |
| `possession?` | `'home' \| 'away'` | Futebol americano, ou o disco onde um feed informa. Sem ele, o two-minute drill paga 0 e o Fantasy não tem situação de futebol americano. |
| `yardsToEndZone?` | `number` | Futebol americano. As jardas de que o time com a bola precisa. Necessário para o two-minute drill e para o Fantasy. |
| `isRedZone?` | `boolean` | Só futebol americano. `false` ou ausente faz o caso da red zone do impulso de oportunidade de pontuar pagar 0. |
| `down?` | `number` | Só futebol americano. Cai no multiplicador sem peso (×1) em vez de perder o impulso inteiro. No two-minute drill e no Fantasy, um `down` abaixo de 1 é lido como entre jogadas. |
| `distance?` | `number` | Só futebol americano. No 3º down, um valor ausente não pode se qualificar como 3ª e curta, então cai em ×1. |
| `isGoalToGo?` | `boolean` | Só futebol americano, e só muda alguma coisa no 4º down. |
| `series?` | [`SeriesState`](#seriesstate) | Sem série, então o Em jogo não lê nenhuma. |
| `redCards?` | [`RedCard[]`](#redcard) | Futebol. Nenhum cartão. |
| `seasonType?` | `'regular' \| 'postseason'` | O Em jogo trata o jogo como pós-temporada quando isto diz isso ou `postseasonRound` está definido, e como temporada regular nos outros casos. |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | Sem impulso de pós-temporada. `0` decide o título, `1` é uma semifinal, `2` as quartas de final, `3` qualquer fase anterior. |

`SportId` é um apelido obsoleto de `LeagueId`, mantido por compatibilidade com a 1.x. Use `LeagueId`.

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

| Campo | Ausente significa |
|---|---|
| `score` | Obrigatório. |
| `abbreviation` | Nomeia o time nos motivos quando o `nickname` também falta, e aparece como `?` quando os dois faltam. |
| `nickname` | Como os motivos chamam o time: "Lakers", "Nittany Lions", ou o nome curto de um clube de futebol, como "Portland". Cai na `abbreviation`. |
| `rank` | O time não tem ranking. Deixe de fora também para um cabeça de chave de chaveamento: é um ranking de votação, em que 1 é o melhor. O Em jogo precisa dele nos dois times. |
| `hits` | Beisebol e softbol. Sem contagem de hits, então o no-hitter não pode pagar. `0` é um valor real: significa um time sem hit. |
| `errors` | Beisebol e softbol. Nenhuma pontuação o lê hoje. |
| `timeouts` | Futebol americano. O two-minute drill usa um peso neutro para o controle do relógio. |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

Uma série menor que uma melhor de 3 não paga nada.

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

Tudo que o jogo em si não traz. Todo campo é opcional, e o `scoreGame` recebe o objeto inteiro como segundo argumento.

| Campo | Tipo | Ausente significa |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | Dinâmica, Mudanças de liderança e Virada ficam em 0 até ele ter 3 entradas. Da mais antiga para a mais nova. |
| `onBreak?` | `boolean` | Quem chama detectou um intervalo comercial. `true` tira `breakPenalty` (15) do subtotal dos sinais. Sem desconto por intervalo quando ausente. |
| `winProbability?` | `number[]` | Probabilidade de vitória do time da casa ao longo do jogo, de 0 a 1. Precisa de 5 valores finitos para importar. Sem modificador nos outros casos. |
| `pregameLine?` | [`PregameLine`](#pregameline) | O Alerta de zebra e a Zebra pagam 0. |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | Sem Em jogo de disputa. Veja [`TeamStakes`](#teamstakes). |
| `powerPlay?` | `'home' \| 'away' \| boolean` | Sem power play no impulso de oportunidade de pontuar. Um lado quando o feed diz de quem, `true` quando só diz que há um em andamento. |
| `emptyNet?` | `'home' \| 'away' \| boolean` | Sem goleiro retirado no impulso de oportunidade de pontuar. Defina só depois que o feed informar isso em duas consultas seguidas. |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | Mudanças de liderança contadas a partir do registro de lances do próprio feed, que enxerga as viradas entre uma consulta e outra, com a hora da mais recente. Usado quando conta mais que o `history` mostra. As Mudanças de liderança ainda precisam das 3 fotos. |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | O Fantasy não tem jogadores, e o jogo é pontuado como Clássico. |

### ScoreSnapshot

Um registro do placar de um jogo num instante, usado para detectar dinâmica, mudanças de liderança e viradas. Os quatro campos são obrigatórios.

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

O `timestamp` só precisa ser relativo às outras fotos da mesma lista. O decaimento é medido contra o carimbo da foto mais nova, não contra a hora do relógio. Reproduzir o mesmo histórico dá o mesmo resultado, não importa quando seja reproduzido.

### PregameLine

A linha como estava antes do jogo. Uma linha ao vivo se mexe com o placar e apagaria uma zebra.

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

O `spread` é quantos pontos o favorito deu, como número positivo, e só basquete e futebol americano o leem. Com as duas moneylines, a margem da casa de apostas é removida antes do uso. O `drawMoneyline` é a linha de três resultados do futebol. Uma run line ou uma puck line sozinha diz quem é o favorito, mas não por quanto, então não basta.

### TeamStakes

Sinalizadores de disputa de fim de temporada de um time, só temporada regular.

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

O `canClinch` significa que vencer este jogo garante uma vaga, uma divisão ou um título aconteça o que acontecer. O `canBeEliminated` significa que perder tira o time da disputa. O `inRace` significa que ainda está na caça, nem garantido nem fora. O `nearLine` é a poucos pontos de uma linha da tabela.

### FantasyPlayerState

Um jogador do elenco num jogo.

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

O `FantasyPosition` é `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'`: posições do futebol americano, um arremessador e um rebatedor para o beisebol, e um jogador genérico nos outros esportes. O `name` aparece nos motivos, como "Mahomes na red zone". `active: false` significa que o feed diz que o jogador saiu do jogo, e ele não conta nada. O `role` é só de beisebol: onde o jogador está na entrada. Os `pointEvents` são os pontos de fantasy do jeito que chegaram, então a produção recente esmaece como qualquer outro evento.

## ScoreOptions

Como pontuar. Todo campo é opcional, e o `scoreGame` recebe o objeto como terceiro argumento.

| Campo | Tipo | O que faz |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | Qual modo pontua o jogo. Clássico quando ausente. |
| `disabledSignals?` | `readonly string[]` | Ids de sinais do modo a desligar. Os outros são reescalados para a faixa inteira do modo. |
| `classicDisabledSignals?` | `readonly string[]` | Ids de sinais a desligar no Clássico quando ele é misturado ou usado como piso. |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | Sobrescreve a mistura do próprio modo, como o controle deslizante de Fantasy de quem assiste. |
| `favoriteTeamCount?` | `number` | Quantos times favoritos estão no jogo. |
| `favoriteBoostPoints?` | `number` | Pontos por time favorito. |
| `postseasonBoostPoints?` | `number` | Pontos para um jogo que decide o título. As fases anteriores recebem uma parte. |
| `gameBoost?` | `number` | Um impulso manual. A única coisa que pode empurrar o total além de 100. |
| `sport?` | `Partial<SportTypeConfig>` | Para esportes que as tabelas embutidas não cobrem, ou para ajustá-las. |
| `league?` | `Partial<LeagueConfig>` | Para ligas que a tabela embutida não conhece. Defina `regularPeriods` e `periodDurationSecs`. |

## PowerScore

O que o `scoreGame` devolve.

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

| Campo | Significado |
|---|---|
| `modeId` | O modo que de fato pontuou o jogo. Um modo que não se aplica, como o Fantasy sem nenhum jogador do elenco no jogo, cai em `'classic'`. |
| `total` | De 0 a 100, e acima de 100 só pelo `gameBoost`. |
| `signals` | Todo sinal que o modo define, com o teto, mesmo em 0. Veja [`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment). |
| `signalsSubtotal` | A soma dos sinais ligados antes de qualquer reescala por sinais desligados. |
| `scaledSubtotal` | A mesma soma depois da reescala, limitada a `signalCeiling`. |
| `signalCeiling` | A soma dos tetos do modo: 156 para o Clássico. |
| `frozen` | `true` no intervalo, numa pausa ou num atraso. Tudo pontua 0 e o `reason` fica vazio. |
| `onBreak`, `breakPenalty` | Se um desconto por intervalo comercial foi aplicado, e quantos pontos ele tirou (sempre ≥ 0). Os dois são `false` e `0` numa pontuação congelada. |
| `winProbabilityVariance?` | De −5 a +5. Ausente, não `0`, sem dados suficientes de probabilidade de vitória. |
| `baseTotal` | Os sinais menos o desconto por intervalo mais o modificador, de 0 a 100, antes de qualquer impulso. |
| `classicTotal?` | O total do próprio Clássico, quando o modo se mistura com ele. |
| `blend?` | Como um modo misturado chegou ao total. Veja [`BlendResult`](#blendresult). |
| `boosts` | Todo impulso que o modo paga, em 0 quando não está pagando. Mais `favoriteBoost`, `postseasonBoost` e `gameBoost` depois que você os pede. |
| `reasons` | Até três frases de fatos simples, como trechos prontos para traduzir: o que está acontecendo agora, o que acabou de acontecer, o placar e a hora, e o que está em jogo. Veja a [tabela de motivos do README](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/powerscore/README.md#reasons) para todas as chaves. |
| `reason` | O mesmo em inglês, como frases. Texto de exibição, não uma API: o texto pode mudar entre versões. Não compare com ele. |

### ScoredSignal, ScoredBoost e ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number>; details?: ReasonFragment[] }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

O `meta` de um impulso traz o que uma interface pode querer dizer, como `{ inning: 8 }` num no-hitter ou `{ secondsLeft: 95, trailBy: 3 }` num two-minute drill. Um trecho de motivo se parece com `{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } }`. As chaves de motivo que os modos embutidos conhecem são renderizadas em inglês no `reason`. Uma chave sua é renderizada como ela mesma, então traduza a partir de `reasons`, não da string.

O `details` de um impulso diz o que está acontecendo neste jogo pelo que o impulso paga, ou deixa de pagar, como trechos de motivo para uma interface traduzir: `{ key: 'seriesClinch', params: { team: 'CHW' } }` no Em jogo, ou um goleiro retirado e um power play juntos num 6 contra 4 do hóquei. Fica ausente quando não há nada a dizer, como antes de um jogo começar ou com a partida parada. Não existe renderizador em inglês para essas chaves; a tabela abaixo lista todas as que os impulsos embutidos enviam, com a frase que o ArenaSwap mostra para cada uma.

| Impulso | Chave | Parâmetros | Em inglês |
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

Um modo é uma lista de sinais mais os impulsos que combinam com ele. Monte um com [`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode), que o confere uma vez, logo de início.

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

| Campo | Significado |
|---|---|
| `signals`, `boosts` | Na ordem de exibição. |
| `bucketCaps` | O máximo que um balde de impulsos pode somar junto. Os impulsos que vêm antes na lista são pagos primeiro. |
| `reasonPriority` | Ids de sinais cujos motivos podem ser lidos, o que mais vale ler primeiro. O mais forte dá a frase de "o que acabou de acontecer"; a ordem desempata. |
| `usesBreakPenalty`, `usesWinProbability` | Se o desconto por intervalo comercial e o modificador de ±5 se aplicam. |
| `classicBlend` | Como o modo se combina com o Clássico. |
| `paysPostseason?` | `false` retém o impulso de pós-temporada neste modo. O padrão é `true`. O Atropelos define como `false`, porque um massacre de playoff já tem o resultado decidido. |
| `appliesTo` | Devolve `false` para um jogo sobre o qual o modo não tem nada a dizer, e o jogo é pontuado como Clássico. |

### SignalDefinition e BoostDefinition

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

Os `points` de um sinal são limitados ao seu `ceiling`. Um impulso não tem teto próprio, mas o balde dele pode ter.

### SignalInput

O que o `compute` recebe.

| Campo | Significado |
|---|---|
| `game`, `context` | O que foi passado ao `scoreGame`. |
| `sport`, `league` | O [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig) e o `LeagueConfig` resolvidos, depois de qualquer sobrescrita em `options`. |
| `progress` | 0 no começo do jogo, 1 no fim do tempo normal e durante a prorrogação. |
| `now` | O carimbo de tempo da foto mais nova do `history`, ou 0 sem nenhuma. |
| `margin` | A diferença absoluta de placar. |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

O Atropelos usa um piso com fator 0,3. O Fantasy usa um impulso com peso 0,6, então o jogo dos seus jogadores só pode subir acima da pontuação Clássica. Os modos embutidos não usam `mix`, mas ele existe para modos seus.

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

O `score.blend` traz um quando um modo se misturou com o Clássico, para uma análise poder mostrar a conta.

## SportTypeConfig e LeagueConfig

O `SportTypeConfig` guarda tudo sobre como um esporte é jogado. Isso cobre os limites de equilíbrio, os limites de dinâmica e de virada, as meias-vidas de decaimento, se o esporte tem relógio e (só beisebol e softbol) um `lateGameCurve`. O `LeagueConfig` guarda quanto duram os períodos de uma liga específica: `id`, `label`, `sportType`, `regularPeriods`, `periodDurationSecs` e `periodFormat`. Ele também traz campos que o ArenaSwap usa para buscar dados e para as barras da programação, que o pontuador não lê.

Alguns campos são opcionais, e só algumas entradas os definem: `lateGameCurve` (beisebol e softbol), `clockIsFullGameElapsed` (futebol), `zeroZeroPenaltyPeriods` (hóquei e futebol) e `knockoutRunMinutes` (as duas Copas do Mundo e os dois torneios olímpicos de futebol). Com `options.sport` e `options.league`, você pode passar qualquer subconjunto como um `Partial` para sobrescrever um a cada chamada. O significado campo a campo e os valores reais de cada esporte e liga estão em [Configuração de esporte e liga](/arenaswap/docs/powerscore/configuration/).

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

Só beisebol e softbol definem `SportTypeConfig.lateGameCurve`. Os esportes de relógio derivam a rampa da fase final direto de `period` e `clockSeconds`, e deixam o campo `undefined`. Não há mais nada para um esporte baseado em relógio configurar aqui, então o tipo hoje tem uma forma só.

## ScorerTunables

O objeto exportado único que guarda todo valor de faixa com que o motor pontua. É uma constante totalmente preenchida, não uma configuração parcial.

| Ramo | Guarda |
|---|---|
| `scores.closeness` | Os tetos das faixas de equilíbrio (`tied`, `tight`, `zeroZero`, `close`, `fringe`, `none`). Veja [o sinal Equilíbrio do Clássico](/arenaswap/docs/powerscore/signals/#closeness). |
| `scores.closenessFlatFloor` | O piso fixo que toda faixa de equilíbrio paga antes da escala por andamento. |
| `scores.lateGame` | Os tetos da fase final, o pré-impulso de prorrogação e o toque do período anterior. Veja [Fase final](/arenaswap/docs/powerscore/signals/#late-game-pressure). |
| `scores.momentum` | Os dois valores de faixa da dinâmica. Veja [Dinâmica](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor). |
| `scores.leadChanges` | Os dois valores de faixa das mudanças de liderança. |
| `scores.comeback` | Os dois valores de faixa da virada e o piso fixo dela. |
| `scores.winProbabilityVariance` | `maxAvgDist` e `minDataPoints`, tabelados em [Impulsos e penalidades](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance). |
| `reasons` | Só `fallback` ("best game available"), o motivo em que o resultado simples obsoleto cai. O texto em inglês mora no `renderReasonEnglish`. |

## FantasyRule e FantasySport

Os tipos por trás do [`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints).

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

`min` e `max` são os limites que uma tela de configurações pode impor, e o `resolveFantasyScoring` limita uma sobrescrita a eles.

## SportType e LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

O `SportType` é uma união fechada. O `LeagueId` são as 31 ligas com ajuste embutido, mas não limita um `Game`: a `league` de um jogo pode ser qualquer string com `Game<string>`, e um id que a tabela não conhece é pontuado com os padrões do esporte dele. A lista completa dos 31 ids de liga está em [Configuração de esporte e liga](/arenaswap/docs/powerscore/configuration/). Ela também está disponível em tempo de execução como `allLeagueIds`.

## PowerScoreResult (2.x)

Obsoleto, ainda exportado, ainda funcionando. A saída simples do `computePowerScore`, e a forma de que o `normalizePowerScoreResult` aceita uma versão parcial. O `scoreGame` não o devolve.

| Campo | Tipo | Ausente significa |
|---|---|---|
| `gameId` | `string` | Obrigatório em todo lugar onde este tipo aparece. |
| `total` | `number` | Definido pelo `computePowerScore`. De 0 a `scoreMaxTotal` (100), a não ser que produzido pelo `normalizePowerScoreResult` com `allowTotalOverflow`. |
| `closeness` | `number` | De 0 a `scoreMaxCloseness` (42). |
| `lateGame` | `number` | De 0 a `scoreMaxLateGame` (38). |
| `momentum` | `number` | De 0 a `scoreMaxMomentum` (38). |
| `leadChanges` | `number` | De 0 a `scoreMaxLeadChanges` (18). |
| `comeback` | `number` | De 0 a `scoreMaxComeback` (20). |
| `winProbabilityVariance?` | `number` | De −`scoreWinProbVarianceMax` a `scoreWinProbVarianceMax` (±5). Ausente, não `0`, quando nenhum histórico de probabilidade de vitória foi informado ou pouco dele era aproveitável. |
| `reason` | `string` | Cai em `scorerTunables.reasons.fallback` ("best game available") quando ausente ou quando não é uma string. |
| `onBreak?` | `boolean` | Ausente é lido como `false`. O `normalizePowerScoreResult` o repassa quando é um booleano. |
| `breakPenalty?` | `number` | Pontos removidos, sempre ≥ 0. Ausente, não `0`, quando nenhum foi informado. O `computePowerScore` não o define. |
| `signalsSubtotal?` | `number` | A soma dos cinco sinais antes da penalidade por intervalo, de 0 a `scoreMaxSignalsSubtotal` (156). |
| `favoriteBonus?`, `favoriteTeamCount?`, `gameBoost?`, `scoringOpportunityBoost?`, `postseasonBoost?` | `number` | Não calculados pelo `computePowerScore`. Ausentes a não ser que quem chama os informe. |

O `scoreGame` embute os impulsos de favorito, de pós-temporada e do jogo para você, então com ele você nunca precisa montar um `PowerScoreResult` à mão. Tudo que a 2.x ainda exporta está listado na [referência da API](/arenaswap/docs/powerscore/api-reference/#the-2x-api).
