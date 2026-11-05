---
sourceHash: '40ee38646993'
title: Tipos TypeScript do PowerScore
description: Todos os campos de Game, ScoringContext, ScoreOptions, PowerScore e dos tipos de modo e de configuração, quais são opcionais e o que acontece quando um opcional falta.
section: powerscore
order: 7
navLabel: Tipos
---

Os tipos do PowerScore 3 dividem-se em três grupos. O que entregas ao `scoreGame`: [`Game`](#game), [`ScoringContext`](#scoringcontext) e [`ScoreOptions`](#scoreoptions). O que recebes de volta: [`PowerScore`](#powerscore). E de que é feito um modo: [`PowerScoreMode`](#powerscoremode) e as suas partes. Os tipos 2.x estão no fim, ainda exportados e a funcionar.

## Game

O estado do jogo neste momento. Só `id`, `league`, `sportType` e as duas pontuações das equipas são obrigatórios. Tudo o resto afina a pontuação quando está presente. Cada campo opcional é tratado como desconhecido, e não como um valor predefinido, quando está ausente.

O `Game` é genérico quanto ao id da liga: `Game<League extends string = LeagueId>`. Um `Game` simples quer dizer o que sempre quis. Um feed com ids de liga próprios usa `Game<string>`.

| Campo | Tipo | Se faltar |
|---|---|---|
| `id` | `string` | Obrigatório. |
| `league` | `League` | Obrigatório. Um id que o `leagueConfigMap` não reconhece é pontuado com os valores predefinidos do seu desporto (vê [Configuração de desportos e ligas](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship)). |
| `sportType` | `SportType` | Obrigatório. Um valor que o `sportTypeConfigMap` não reconhece recorre ao ajuste do basquetebol. |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | Obrigatório. |
| `period?` | `number` | A pressão da fase final lê-se como `0`. O equilíbrio continua a pontuar, mas o avanço do jogo também se lê como `0`, por isso só paga o piso fixo em vez do valor completo do escalão. |
| `clockSeconds?` | `number` | Tratado como desconhecido, não como `0:00`. A rampa da fase final fica parada no início do período, e todos os impulsos condicionados pelo relógio pagam 0. |
| `intermission?` | `boolean` | `false`. `true` pára o jogo: tudo pontua 0 até o jogo recomeçar. |
| `delayed?` | `boolean` | `false`. `true` pára o jogo, tal como `intermission`. |
| `status?` | `'pre' \| 'in' \| 'post'` | Os impulsos não pagam nada por nada que não seja `'in'`, incluindo um valor em falta. Os sinais não o leem. |
| `topOfInning?` | `boolean` | Basebol e softbol. Pontua entre os valores de equilíbrio da parte alta e da parte baixa da entrada. A corrida da vantagem e o no-hitter precisam dele. |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | Basebol e softbol. Tratado como sem corredores nas bases. |
| `outs?` | `number` | Basebol e softbol. Tratado como 0. Aos 3, os impulsos baseados em corredores não pagam nada. |
| `possession?` | `'home' \| 'away'` | Futebol americano, ou o disco onde um feed o reporta. Sem ele, o ataque de dois minutos paga 0 e o Fantasy não tem situação de futebol americano. |
| `yardsToEndZone?` | `number` | Futebol americano. As jardas de que a equipa com a bola precisa. Necessário ao ataque de dois minutos e ao Fantasy. |
| `isRedZone?` | `boolean` | Só futebol americano. `false` ou em falta quer dizer que o caso da red zone do impulso de oportunidade de marcar paga 0. |
| `down?` | `number` | Só futebol americano. Cai para o multiplicador sem peso (×1) em vez de perder o impulso por completo. No ataque de dois minutos e no Fantasy, um `down` abaixo de 1 lê-se como entre jogadas. |
| `distance?` | `number` | Só futebol americano. No 3.º down, um valor em falta não pode qualificar como 3.º e curto, por isso cai para ×1. |
| `isGoalToGo?` | `boolean` | Só futebol americano, e só muda alguma coisa no 4.º down. |
| `series?` | [`SeriesState`](#seriesstate) | Sem série, por isso o Em jogo não lê nenhuma. |
| `redCards?` | [`RedCard[]`](#redcard) | Futebol. Sem cartões. |
| `seasonType?` | `'regular' \| 'postseason'` | O Em jogo trata o jogo como pós-temporada quando isto o diz ou `postseasonRound` está definido, e como época regular nos outros casos. |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | Sem impulso de pós-temporada. `0` decide o título, `1` é uma meia-final, `2` uns quartos de final e `3` qualquer coisa anterior. |

`SportId` é um alias descontinuado de `LeagueId`, mantido por compatibilidade com a 1.x. Usa `LeagueId`.

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

| Campo | Se faltar |
|---|---|
| `score` | Obrigatório. |
| `abbreviation` | Nomeia a equipa nas razões quando `nickname` também falta, e aparece como `?` quando faltam os dois. |
| `nickname` | Como as razões chamam à equipa: "Lakers", "Nittany Lions" ou o nome curto de um clube de futebol como "Portland". Recorre a `abbreviation`. |
| `rank` | A equipa não está classificada. Deixa-o de fora também para um cabeça de série de um quadro: é um ranking de votação, em que 1 é o melhor. O Em jogo precisa dele nas duas equipas. |
| `hits` | Basebol e softbol. Sem contagem de batidas, por isso o no-hitter não pode pagar. `0` é um valor real: quer dizer uma equipa sem batidas. |
| `errors` | Basebol e softbol. Não é lido por nenhuma pontuação atualmente. |
| `timeouts` | Futebol americano. O ataque de dois minutos usa um peso neutro para o controlo do relógio. |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

Uma série mais curta do que um melhor de 3 não paga nada.

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

Tudo o que o próprio jogo não traz. Todos os campos são opcionais, e o `scoreGame` recebe o objeto inteiro como segundo argumento.

| Campo | Tipo | Se faltar |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | A dinâmica, as mudanças de liderança e o fator de remontada ficam a 0 até ter 3 entradas. Do mais antigo para o mais recente. |
| `onBreak?` | `boolean` | Quem chama detetou uma pausa publicitária. `true` tira `breakPenalty` (15) ao subtotal dos sinais. Sem dedução por pausa quando ausente. |
| `winProbability?` | `number[]` | Probabilidade de vitória da casa ao longo do jogo, de 0 a 1. Precisa de 5 valores finitos para contar. Sem modificador nos outros casos. |
| `pregameLine?` | [`PregameLine`](#pregameline) | A atenção à surpresa e a Surpresa esmagadora (Upset Rout) pagam 0. |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | Sem o que está em jogo numa corrida. Vê [`TeamStakes`](#teamstakes). |
| `powerPlay?` | `'home' \| 'away' \| boolean` | Sem superioridade numérica no impulso de oportunidade de marcar. Um lado quando o feed diz de quem, `true` quando só diz que há uma. |
| `emptyNet?` | `'home' \| 'away' \| boolean` | Sem baliza vazia no impulso de oportunidade de marcar. Define-o só depois de o feed o ter reportado em duas consultas seguidas. |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | Mudanças de liderança contadas a partir do registo de jogadas do próprio feed, que vê as viragens entre consultas, com a hora da mais recente. Usado quando conta mais do que o `history` mostra. As Mudanças de liderança continuam a precisar dos 3 instantâneos. |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | O Fantasy não tem jogadores, e o jogo é pontuado como Clássico. |

### ScoreSnapshot

Um registo num instante do resultado de um jogo, usado para detetar dinâmica, mudanças de liderança e remontadas. Os quatro campos são obrigatórios.

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

O `timestamp` só tem de ser relativo aos outros instantâneos da mesma lista. O esbatimento é medido contra a marca temporal do instantâneo mais recente, não contra a hora do relógio. Repetir o mesmo histórico produz o mesmo resultado, seja quando for que o repitas.

### PregameLine

A linha tal como estava antes do jogo. Uma linha em direto mexe-se com o resultado e apagaria uma surpresa.

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

O `spread` são os pontos de vantagem dados ao favorito, como número positivo, e só o basquetebol e o futebol americano o leem. Com as duas moneylines, a margem da casa de apostas é removida antes do uso. O `drawMoneyline` é a linha de três vias do futebol. Uma run line ou uma puck line sozinha diz quem é o favorito mas não por quanto, por isso não chega.

### TeamStakes

Indicadores de corrida de fim de época de uma equipa, só na época regular.

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

`canClinch` quer dizer que ganhar este jogo garante um lugar, uma divisão ou um título aconteça o que acontecer. `canBeEliminated` quer dizer que perder tira a equipa da luta. `inRace` quer dizer que ainda está na luta, nem segura nem fora. `nearLine` é a poucos pontos de uma linha da tabela.

### FantasyPlayerState

Um jogador do plantel num jogo.

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

`FantasyPosition` é `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'`: posições de futebol americano, um lançador e um batedor para o basebol e um jogador genérico nos restantes. O `name` aparece nas razões, como "Mahomes in the red zone". `active: false` quer dizer que o feed diz que o jogador está fora do jogo, e não conta para nada. O `role` é só do basebol: onde o jogador está na entrada. Os `pointEvents` são pontos de fantasy tal como chegaram, para a produção recente se esbater como qualquer outro evento.

## ScoreOptions

Como pontuar. Todos os campos são opcionais, e o `scoreGame` recebe o objeto como terceiro argumento.

| Campo | Tipo | O que faz |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | Que modo pontua o jogo. Clássico quando ausente. |
| `disabledSignals?` | `readonly string[]` | Ids de sinais do modo a desligar. Os restantes são reescalados para o intervalo completo do modo. |
| `classicDisabledSignals?` | `readonly string[]` | Ids de sinais a desligar no Clássico quando é misturado ou usado como piso. |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | Substitui a mistura do próprio modo, como o slider de Fantasy de quem vê. |
| `favoriteTeamCount?` | `number` | Quantas equipas favoritas estão no jogo. |
| `favoriteBoostPoints?` | `number` | Pontos por equipa favorita. |
| `postseasonBoostPoints?` | `number` | Pontos para um jogo que decide o título. As rondas anteriores recebem uma parte. |
| `gameBoost?` | `number` | Um impulso manual. A única coisa autorizada a empurrar o total para lá dos 100. |
| `sport?` | `Partial<SportTypeConfig>` | Para desportos que as tabelas incluídas não cobrem, ou para as ajustar. |
| `league?` | `Partial<LeagueConfig>` | Para ligas que a tabela incluída não conhece. Define `regularPeriods` e `periodDurationSecs`. |

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
| `modeId` | O modo que realmente pontuou o jogo. Um modo que não se aplica, como o Fantasy sem nenhum jogador do plantel no jogo, recorre a `'classic'`. |
| `total` | 0 a 100, e acima de 100 só através de `gameBoost`. |
| `signals` | Todos os sinais que o modo define, com o seu máximo, mesmo a 0. Vê [`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment). |
| `signalsSubtotal` | A soma dos sinais ativos antes de qualquer reescala por sinais desligados. |
| `scaledSubtotal` | O mesmo depois da reescala, limitado a `signalCeiling`. |
| `signalCeiling` | A soma dos máximos do modo: 156 para o Clássico. |
| `frozen` | `true` ao intervalo, numa pausa entre períodos ou num atraso. Tudo pontua 0 e `reason` fica vazio. |
| `onBreak`, `breakPenalty` | Se se aplicou uma dedução por pausa publicitária e quantos pontos tirou (sempre ≥ 0). Ambos são `false` e `0` num resultado parado. |
| `winProbabilityVariance?` | −5 a +5. Ausente, não `0`, sem dados suficientes de probabilidade de vitória. |
| `baseTotal` | Sinais menos a dedução por pausa mais o modificador, 0 a 100, antes de qualquer impulso. |
| `classicTotal?` | O total do próprio Clássico, quando o modo se mistura com ele. |
| `blend?` | Como um modo misturado chegou ao seu total. Vê [`BlendResult`](#blendresult). |
| `boosts` | Todos os impulsos que o modo paga, a 0 quando não está a pagar. Mais `favoriteBoost`, `postseasonBoost` e `gameBoost` quando os pedires. |
| `reasons` | Até três frases de factos simples, como fragmentos prontos a traduzir: o que está a acontecer agora, o que acabou de acontecer, o resultado e a hora, e o que está em jogo. Vê a [tabela de razões do README](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/powerscore/README.md#reasons) para todas as chaves. |
| `reason` | O mesmo em inglês, como frases. Texto para mostrar, não uma API: a redação pode mudar entre versões. Não faças correspondências com ele. |

### ScoredSignal, ScoredBoost e ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number>; details?: ReasonFragment[] }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

O `meta` num impulso traz o que uma interface pode querer dizer, como `{ inning: 8 }` num no-hitter ou `{ secondsLeft: 95, trailBy: 3 }` num ataque de dois minutos. Um fragmento de razão tem este aspeto: `{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } }`. As chaves de razão que os modos incluídos conhecem aparecem em inglês em `reason`. Uma chave tua aparece tal e qual, por isso traduz a partir de `reasons`, não da string.

Os `details` num impulso dizem o que está a acontecer neste jogo pelo qual o impulso paga, ou não paga, como fragmentos de razão para uma interface traduzir: `{ key: 'seriesClinch', params: { team: 'CHW' } }` no Em jogo, ou um guarda-redes retirado e uma superioridade numérica juntos num 6 contra 4 do hóquei. Está ausente quando não há nada a dizer, como antes de um jogo começar ou enquanto o jogo está parado. Não há um renderizador em inglês para estas chaves; a tabela abaixo lista todas as que os impulsos incluídos enviam, com a frase que o ArenaSwap mostra para cada uma, em inglês.

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

Um modo é uma lista de sinais mais os impulsos que lhe assentam bem. Constrói um com [`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode), que o verifica uma vez, logo à partida.

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
| `signals`, `boosts` | Por ordem de apresentação. |
| `bucketCaps` | O máximo que um grupo de impulsos pode somar em conjunto. Os impulsos anteriores na lista são pagos primeiro. |
| `reasonPriority` | Ids de sinais cujas razões podem ser lidas, os que mais vale ler primeiro. O mais forte dá a frase do "que acabou de acontecer"; a ordem desempata. |
| `usesBreakPenalty`, `usesWinProbability` | Se a dedução por pausa publicitária e o modificador de ±5 se aplicam. |
| `classicBlend` | Como o modo se combina com o Clássico. |
| `paysPostseason?` | `false` retém o impulso de pós-temporada neste modo. Por predefinição é `true`. As Goleadas definem-no como `false`, já que uma goleada nos playoffs já tem o resultado decidido. |
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

Os `points` de um sinal são limitados ao seu `ceiling`. Um impulso não tem máximo próprio, mas o seu grupo pode ter um limite.

### SignalInput

O que o `compute` recebe.

| Campo | Significado |
|---|---|
| `game`, `context` | O que foi passado ao `scoreGame`. |
| `sport`, `league` | O [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig) e o `LeagueConfig` resolvidos, depois de quaisquer substituições em `options`. |
| `progress` | 0 no início do jogo, 1 no fim do tempo regulamentar e durante o prolongamento. |
| `now` | A marca temporal do instantâneo mais recente em `history`, ou 0 se não houver nenhum. |
| `margin` | A diferença absoluta do marcador. |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

As Goleadas usam um piso com fator 0.3. O Fantasy usa um impulso com peso 0.6, para os jogos dos teus jogadores só poderem subir acima da pontuação Clássico. Os modos incluídos não usam `mix`, mas ele está lá para modos teus.

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

O `score.blend` traz um quando um modo se misturou com o Clássico, para uma decomposição poder mostrar a aritmética.

## SportTypeConfig e LeagueConfig

O `SportTypeConfig` guarda tudo sobre como um desporto se joga. Isso inclui os limiares de equilíbrio, os limiares de dinâmica e de remontada, as semividas de esbatimento, se o desporto tem relógio e (só basebol e softbol) uma `lateGameCurve`. O `LeagueConfig` guarda quanto duram os períodos de uma liga específica: `id`, `label`, `sportType`, `regularPeriods`, `periodDurationSecs` e `periodFormat`. Também traz campos que o ArenaSwap usa para as suas próprias consultas e barras de calendário, que o pontuador não lê.

Alguns campos são opcionais, e só algumas entradas os definem: `lateGameCurve` (basebol e softbol), `clockIsFullGameElapsed` (futebol), `zeroZeroPenaltyPeriods` (hóquei e futebol) e `knockoutRunMinutes` (os dois Mundiais e os dois torneios olímpicos de futebol). Com `options.sport` e `options.league`, podes passar qualquer subconjunto como `Partial` para substituir um em cada chamada. O significado campo a campo e os valores reais de cada desporto e liga estão em [Configuração de desportos e ligas](/arenaswap/docs/powerscore/configuration/).

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

Só o basebol e o softbol definem `SportTypeConfig.lateGameCurve`. Os desportos com relógio derivam a rampa da fase final diretamente de `period` e `clockSeconds`, e deixam o campo `undefined`. Não há mais nada para um desporto com relógio configurar aqui, por isso o tipo tem atualmente só uma forma.

## ScorerTunables

O único objeto exportado que guarda todos os valores de escalão com que o motor pontua. É uma constante totalmente preenchida, não uma configuração parcial.

| Ramo | Guarda |
|---|---|
| `scores.closeness` | Os máximos dos escalões de equilíbrio (`tied`, `tight`, `zeroZero`, `close`, `fringe`, `none`). Vê [o sinal de equilíbrio do Clássico](/arenaswap/docs/powerscore/signals/#closeness). |
| `scores.closenessFlatFloor` | O piso fixo que cada escalão de equilíbrio paga antes da escala de progresso. |
| `scores.lateGame` | Os máximos da fase final, o pré-impulso de prolongamento e o toque do período anterior. Vê [Pressão da fase final](/arenaswap/docs/powerscore/signals/#late-game-pressure). |
| `scores.momentum` | Os dois valores de escalão da dinâmica. Vê [Dinâmica](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor). |
| `scores.leadChanges` | Os dois valores de escalão das mudanças de liderança. |
| `scores.comeback` | Os dois valores de escalão da remontada e o seu piso fixo. |
| `scores.winProbabilityVariance` | `maxAvgDist` e `minDataPoints`, tabelados em [Impulsos e penalizações](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance). |
| `reasons` | Só `fallback` ("best game available"), a razão a que o resultado simples descontinuado recorre. A redação em inglês vive em `renderReasonEnglish`. |

## FantasyRule e FantasySport

Os tipos por trás de [`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints).

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

`min` e `max` são os limites que um ecrã de definições pode impor, e o `resolveFantasyScoring` limita uma substituição a eles.

## SportType e LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

O `SportType` é uma união fechada. O `LeagueId` são as 31 ligas com ajuste incluído, mas não limita um `Game`: a `league` de um jogo pode ser qualquer string com `Game<string>`, e um id que a tabela não conhece é pontuado com os valores predefinidos do seu desporto. A lista completa dos 31 ids de liga está em [Configuração de desportos e ligas](/arenaswap/docs/powerscore/configuration/). Também está disponível em tempo de execução como `allLeagueIds`.

## PowerScoreResult (2.x)

Descontinuado, ainda exportado, ainda a funcionar. O resultado simples do `computePowerScore`, e a forma de que o `normalizePowerScoreResult` aceita uma versão parcial. O `scoreGame` não o devolve.

| Campo | Tipo | Se faltar |
|---|---|---|
| `gameId` | `string` | Obrigatório em todo o lado onde este tipo aparece. |
| `total` | `number` | Definido pelo `computePowerScore`. 0 a `scoreMaxTotal` (100), a menos que seja produzido através do `normalizePowerScoreResult` com `allowTotalOverflow`. |
| `closeness` | `number` | 0 a `scoreMaxCloseness` (42). |
| `lateGame` | `number` | 0 a `scoreMaxLateGame` (38). |
| `momentum` | `number` | 0 a `scoreMaxMomentum` (38). |
| `leadChanges` | `number` | 0 a `scoreMaxLeadChanges` (18). |
| `comeback` | `number` | 0 a `scoreMaxComeback` (20). |
| `winProbabilityVariance?` | `number` | −`scoreWinProbVarianceMax` a `scoreWinProbVarianceMax` (±5). Ausente, não `0`, quando não foi fornecido histórico de probabilidade de vitória ou se aproveitou pouco dele. |
| `reason` | `string` | Recorre a `scorerTunables.reasons.fallback` ("best game available") quando ausente ou quando não é uma string. |
| `onBreak?` | `boolean` | Ausente lê-se como `false`. O `normalizePowerScoreResult` passa-o quando é um booleano. |
| `breakPenalty?` | `number` | Pontos removidos, sempre ≥ 0. Ausente, não `0`, quando não foi fornecido nenhum. O `computePowerScore` não o define. |
| `signalsSubtotal?` | `number` | A soma dos cinco sinais antes da penalização por pausa, 0 a `scoreMaxSignalsSubtotal` (156). |
| `favoriteBonus?`, `favoriteTeamCount?`, `gameBoost?`, `scoringOpportunityBoost?`, `postseasonBoost?` | `number` | Não são calculados pelo `computePowerScore`. Ausentes a menos que quem chama os forneça. |

O `scoreGame` soma por ti os impulsos de favorito, de pós-temporada e do jogo, por isso nunca precisas de construir um `PowerScoreResult` à mão com ele. Tudo o que a 2.x ainda exporta está listado na [referência da API](/arenaswap/docs/powerscore/api-reference/#the-2x-api).
