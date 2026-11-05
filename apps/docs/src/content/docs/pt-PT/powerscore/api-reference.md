---
sourceHash: '91a61d4e6782'
title: Referência da API do PowerScore
navLabel: Referência da API
description: Todas as funções e constantes que o powerscore exporta, com a assinatura, os parâmetros, o valor devolvido e o comportamento quando um valor de entrada falta ou é inválido. Inclui a API 2.x descontinuada.
section: powerscore
order: 6
---

Tudo aqui é exportado da raiz do pacote: `import { ... } from 'powerscore'`. As funções da 3.0 vêm primeiro, depois os auxiliares, as peças de que os modos incluídos são feitos, as constantes e, por fim, a API 2.x, que está descontinuada mas funciona exatamente como antes. Os tipos estão em [Tipos TypeScript do PowerScore](/arenaswap/docs/powerscore/types/).

## Pontuação

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

O ponto de entrada principal. Pontua um jogo num modo e devolve um [`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore): o total, cada sinal e impulso como uma lista, e as razões.

| Parâmetro | Predefinição | Notas |
|---|---|---|
| `game` | obrigatório | O estado atual do jogo. Só `id`, `league`, `sportType` e as duas pontuações são obrigatórios. |
| `context` | `{}` | Histórico, probabilidade de vitória, a linha de pré-jogo, o plantel de fantasy e tudo o resto que o jogo não traz. Vê [`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext). |
| `options` | `{}` | Que modo, que sinais desligar e os impulsos de favorito, de pós-temporada e manual. Vê [`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions). |

Nunca lança erros por um campo opcional em falta: a parte do motor que precisa dele pontua 0. Uma `league` não reconhecida é pontuada com os valores predefinidos do seu desporto. Um valor não finito em qualquer parte dos dados de entrada é tratado como ausente, em vez de se propagar como `NaN`.

Um jogo parado (`intermission` ou `delayed`) pontua 0 em tudo, incluindo todos os impulsos, e `reason` fica vazio. O `game.status` só é lido pelos impulsos, que não pagam nada a menos que seja `'in'`.

O total é construído por uma ordem fixa:

1. Os sinais pontuam. Os desligados são reescalados para fora.
2. A dedução por pausa sai.
3. O modificador de probabilidade de vitória é somado (só no Clássico). O resultado é limitado a 0–100.
4. Os impulsos do próprio modo são somados, dentro dos limites dos seus grupos, e o total é limitado a 100.
5. Se o modo se mistura com o Clássico (piso, mistura ou impulso), é aqui que acontece.
6. Os impulsos de favorito e de pós-temporada são somados, e o total volta a ser limitado a 100. Um modo com `paysPostseason: false` salta o impulso de pós-temporada.
7. O `gameBoost` é somado em último. É a única coisa autorizada a passar dos 100.

```ts
const score = scoreGame(game, { history }, { mode: 'blowouts' });
score.total;  // 0–100
score.reason; // 'BOS on a 12–0 run. Up 28 in the 3rd quarter'
```

### signalPoints e boostPoints

```ts
function signalPoints(score: Pick<PowerScore, 'signals'>, id: string): number
function boostPoints(score: Pick<PowerScore, 'boosts'>, id: string): number
```

Consultam uma entrada de um resultado pelo id. Ambas devolvem `0` para um id que não esteja lá.

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

Constrói o [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput) que o `compute` de um sinal ou impulso recebe: o jogo, o contexto, a configuração resolvida do desporto e da liga, `progress`, `now` e `margin`. É o que o `scoreGame` chama internamente, exportado para um sinal que escrevas poder ser testado sozinho.

## Modos

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

Verifica um modo uma vez, logo à partida, e devolve-o inalterado. Lança um erro se dois sinais partilharem um id, se o máximo de um sinal não for positivo ou se o modo não tiver sinais.

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

O `compute` de um sinal recebe o jogo, o contexto, a configuração resolvida do desporto e da liga, o `progress` do jogo (0 no início, 1 no fim do tempo regulamentar e durante o prolongamento) e a `margin`. Devolve `points`, limitados ao máximo, e uma `reason` opcional. Um modo também pode trazer `boosts`, `bucketCaps`, um `classicBlend`, `paysPostseason` (por predefinição `true`; `false` retém o impulso de pós-temporada) e um `appliesTo(game, context)` que manda para o Clássico os jogos sobre os quais não tem nada a dizer.

O `reasonPriority` lista os sinais cujas razões podem ser lidas. O mais forte fala, e a ordem desempata. Uma chave de razão que os modos incluídos conhecem aparece em inglês em `score.reason`. Uma chave tua aparece tal e qual, por isso traduz a partir de `score.reasons`, não da string.

### classicMode, blowoutsMode, fantasyMode, builtInModes e getMode

`classicMode`, `blowoutsMode` e `fantasyMode` são os três objetos `PowerScoreMode` incluídos. `builtInModes` são os mesmos três por id, e `getMode(idOrMode)` resolve um id, um objeto de modo ou nada (o que dá o Clássico). Espalha um para construíres a partir dele. Para obter o Clássico sem os impulsos da 3.0:

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### Sinais e impulsos

As peças de que os modos incluídos são feitos também são exportadas, para um modo personalizado as poder reutilizar:

| Exportação | O que é |
|---|---|
| `classicSignals`, `blowoutsSignals`, `fantasySignals` | A lista de sinais de cada modo. |
| `closenessSignal`, `lateGameSignal`, `momentumSignal`, `leadChangesSignal`, `comebackSignal` | Os cinco do Clássico, um a um. |
| `scoringOpportunityBoost`, `goAheadRunBoost`, `twoMinuteDrillBoost`, `noHitterBoost`, `redCardBoost`, `upsetWatchBoost`, `upsetRoutBoost`, `stakesBoost` | O `BoostDefinition` de cada impulso. O que cada um paga está em [Impulsos e penalizações](/arenaswap/docs/powerscore/boosts-and-penalties/). |
| `underdogProbability(line, sportType, league)` | A probabilidade do azarão antes do jogo, a partir de uma `PregameLine`. `undefined` quando a linha não consegue dizer. |
| `postseasonBoostShare(round)` | A parte do impulso de pós-temporada que uma ronda ganha: 1, 0.75, 0.5, 0.25 ou 0 sem ronda. |
| `applyProgressFloor`, `findLeadChanges` | Os dois auxiliares por trás do equilíbrio e das mudanças de liderança. |
| `baseMask(baseRunners)`, `runnersOn(mask)` | As bases como um número de 3 bits, com a primeira base no bit mais baixo (`0b101` são corredores na primeira e na terceira), e quantos corredores isso são. |

## Razões

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

Mostram uma frase de razão, ou uma lista delas juntas em frases, em inglês. É o que preenche `score.reason`. Usa-as quando construíres razões tuas e quiseres que se leiam da mesma maneira. O `ordinal(n)` dá o ordinal em inglês que elas usam ("2nd", "11th", "21st").

## Configuração e progresso

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

O `resolveSportConfig` e o `resolveLeagueConfig` fazem o que o `scoreGame` faz no início de cada chamada. Um `sportType` desconhecido recorre ao ajuste do basquetebol. Uma liga desconhecida recorre à liga mais conhecida do seu desporto: a NBA para o basquetebol, a NHL para o hóquei, a MLB para o basebol, a NFL para o futebol americano, o softbol da NCAA e a MLS para o futebol. O `getGameProgress` é 0 no início, 1 no fim do tempo regulamentar e durante o prolongamento. O `scoreMargin` é a diferença absoluta do marcador.

## Pontuação de fantasy

O sinal Pontos de fantasy do Fantasy quer pontos de fantasy. Estas funções transformam uma linha de boxscore neles. Tu indicas as estatísticas, elas pontuam-nas.

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

Devolve o total de uma linha de estatísticas, arredondado a duas casas decimais. As estatísticas desconhecidas e os valores não finitos são ignorados. Os `pointsAllowed` de uma defesa são pontuados por escalões.

```ts
import { computeFantasyPoints } from 'powerscore';

computeFantasyPoints('football', {
	passingYards: 310,
	passingTouchdowns: 3,
	interceptionsThrown: 1,
	rushingYards: 22,
}); // 12.4 + 12 − 2 + 2.2 = 24.6
```

### defaultFantasyScoring, resolveFantasyScoring e fantasySportOf

O `defaultFantasyScoring` guarda as regras predefinidas para `'football'` (PPR completo), `'basketball'`, `'baseball'` e `'hockey'`. Cada regra é `{ points, min, max }`, para um ecrã de definições poder impor os limites.

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

O `resolveFantasyScoring(sport, overrides?)` devolve as regras como números simples. Uma substituição é limitada aos limites da sua regra, e uma regra que não exista é ignorada.

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

O `fantasySportOf(sportType)` mapeia um `sportType` para um dos quatro desportos de fantasy. O softbol conta como basebol, e o futebol não tem nenhum, por isso devolve `undefined`.

## Constantes

| Constante | Valor |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156 (a soma dos cinco máximos do Clássico) |
| `scoreMaxTotal` | 100 |
| `breakPenalty` | 15, a dedução fixa enquanto `context.onBreak` for `true` |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

Porque é que os máximos do Clássico ultrapassam o limite de 100 pontos está em [Os sinais do PowerScore em cada modo](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total). Os limites explicam-se em [Impulsos e penalizações](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets).

`scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` e `thirdAndShortDistance` guardam os valores exatos por trás do impulso de oportunidade de marcar, tabelados em [Impulsos e penalizações](/arenaswap/docs/powerscore/boosts-and-penalties/). Os impulsos mais recentes guardam os seus números em `goAheadRunTunables`, `twoMinuteDrillTunables`, `noHitterTunables`, `redCardTunables`, `upsetTunables`, `stakesTunables` e `hockeyTunables`.

O `scorerTunables` guarda todos os valores de escalão com que o motor pontua, os mesmos números que as constantes acima já dão por nome, para um consumidor poder ler o valor de um escalão em vez de o fixar no código.

`sportTypeConfigs`, `sportTypeConfigMap`, `leagueConfigs`, `leagueConfigMap` e `allLeagueIds` guardam o ajuste de desportos e ligas que o motor lê em cada chamada. Os campos deles e os valores reais de cada desporto e liga estão em [Configuração de desportos e ligas](/arenaswap/docs/powerscore/configuration/).

## A API 2.x

Continua exportada, continua a funcionar e está marcada como descontinuada onde indicado. Nada aqui foi removido na 3.0. Passa para o `scoreGame` quando quiseres modos ou os impulsos novos. Até lá, estas devolvem os números que sempre devolveram.

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	winProbabilityHistory?: number[],
): PowerScoreResult
```

Descontinuada. Pontua os cinco sinais do Clássico, aplica o modificador de probabilidade de vitória e devolve o `PowerScoreResult` simples (`closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`, `total`, `reason` e companhia). É o `scoreGame` no Clássico só com os sinais, achatado, por isso não inclui nenhum dos impulsos de momento.

| Parâmetro | Predefinição | Notas |
|---|---|---|
| `game` | obrigatório | O estado atual do jogo. |
| `history` | `[]` | Instantâneos recentes do resultado. A dinâmica, as mudanças de liderança e a remontada ficam a 0 até isto ter pelo menos 3 entradas. |
| `winProbabilityHistory` | `[]` | Valores recentes de probabilidade de vitória, de 0 a 1. Precisa de pelo menos 5 entradas finitas para contribuir com alguma coisa. |

Nunca lança erros. Devolve de imediato um resultado todo a zero quando `isPlayFrozen(game)` é verdadeiro. Não verifica `game.status`: um jogo `'pre'` ou `'post'` pontua o mesmo que um `'in'`, dados os mesmos restantes campos.

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

Descontinuada: o número está na lista `boosts` do `scoreGame` como `scoringOpportunity`. Devolve `0` a menos que `game.status === 'in'` e o jogo não esteja parado. Caso contrário, devolve de 0 a 10 para o basebol e o softbol, pelo número de corredores, ou de 0 a 15 para o futebol americano, pela diferença e down na red zone. Devolve `0` para qualquer outro `sportType`, hóquei incluído, já que a superioridade numérica e a baliza vazia vêm de `context`, que esta função não recebe. Não está incluída no `total` do `computePowerScore`.

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

Mapeia um histórico de probabilidade de vitória para o modificador de ±5. Filtra primeiro as entradas não finitas e depois devolve `undefined` se restarem menos de 5 valores finitos. Caso contrário, devolve um inteiro de `-scoreWinProbVarianceMax` a `scoreWinProbVarianceMax`.

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

Devolve `true` quando `game.intermission === true` ou `game.delayed === true`, e `false` nos restantes casos, incluindo quando os dois campos estão ausentes.

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

Quanto do tempo regulamentar o jogo já percorreu, de 0 a 1, a partir do mesmo relógio que o sinal da fase final lê. Útil para desenhar um jogo numa linha do tempo.

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

Descontinuada. Recebe um `PowerScoreResult` parcial, possivelmente não fiável (só `gameId` é obrigatório), e devolve um válido e totalmente limitado. O `computePowerScore` chama-a internamente em cada resultado que produz.

Cada um dos cinco campos de sinal é limitado ao seu próprio máximo. O `total` é limitado a `scoreMaxTotal`, a menos que `options.allowTotalOverflow` seja `true`. Com essa opção, só é limitado a um mínimo de `0`, deixando um impulso manual empurrá-lo para lá dos 100 de propósito. Um `total` em falta ou não finito recorre à soma dos cinco sinais menos `breakPenalty`, não à soma bruta. O `reason` recorre a `scorerTunables.reasons.fallback` ("best game available") quando não é uma string. `favoriteBonus`, `favoriteTeamCount`, `gameBoost`, `scoringOpportunityBoost` e `postseasonBoost` são arredondados e limitados por baixo a `0` quando fornecidos. Quando não são, ficam completamente de fora do resultado, sem valor predefinido `0`. Nunca lança erros.

### O que muda se passares

O Clássico através do `scoreGame` inclui os impulsos novos, por isso o mesmo jogo pode pontuar mais aí do que no `computePowerScore`, até aos limites dos grupos. Os impulsos de favorito, de pós-temporada e manual que costumavas somar à mão à volta do `normalizePowerScoreResult` são agora opções do `scoreGame`. O resto mantém-se. O tipo `Game` ganhou campos opcionais e um parâmetro de tipo para a liga, e um `Game` simples quer dizer o que sempre quis. Um id de liga que a tabela não conhece era pontuado com a configuração da NBA, fosse qual fosse o desporto. Agora recebe os valores predefinidos do seu próprio desporto, por isso um jogo de hóquei numa liga desconhecida recebe os períodos e o relógio da NHL.
