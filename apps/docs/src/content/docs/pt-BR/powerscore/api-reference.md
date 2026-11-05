---
sourceHash: '91a61d4e6782'
title: Referência da API do PowerScore
navLabel: Referência da API
description: Toda função e constante que o powerscore exporta, com assinatura, parâmetros, valor de retorno e comportamento quando uma entrada falta ou é inválida. Inclui a API 2.x obsoleta.
section: powerscore
order: 6
---

Tudo aqui é exportado pela raiz do pacote: `import { ... } from 'powerscore'`. As funções da 3.0 vêm primeiro, depois os auxiliares, as peças de que os modos embutidos são feitos, as constantes e, por último, a API 2.x, que está obsoleta mas funciona exatamente como antes. Os tipos estão em [Tipos TypeScript do PowerScore](/arenaswap/docs/powerscore/types/).

## Pontuação

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

O ponto de entrada principal. Pontua um jogo num modo e devolve um [`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore): o total, cada sinal e cada impulso como uma lista, e os motivos.

| Parâmetro | Padrão | Observações |
|---|---|---|
| `game` | obrigatório | O estado atual do jogo. Só `id`, `league`, `sportType` e os dois placares são obrigatórios. |
| `context` | `{}` | Histórico, probabilidade de vitória, a linha pré-jogo, o elenco de fantasy e o resto do que o jogo não traz. Veja [`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext). |
| `options` | `{}` | Qual modo, quais sinais desligar, e os impulsos de favorito, de pós-temporada e manuais. Veja [`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions). |

Nunca lança erro por um campo opcional ausente: a parte do motor que precisa dele pontua 0. Uma `league` não reconhecida é pontuada com os padrões do esporte dela. Um valor não finito em qualquer lugar das entradas é tratado como ausente, em vez de se propagar como `NaN`.

Um jogo parado (`intermission` ou `delayed`) pontua 0 em tudo, inclusive em todos os impulsos, e o `reason` fica vazio. O `game.status` só é lido pelos impulsos, que não pagam nada a não ser que seja `'in'`.

O total é montado numa ordem fixa:

1. Os sinais pontuam. Os desligados são reescalados para fora.
2. O desconto por intervalo sai.
3. O modificador de probabilidade de vitória é somado (só no Clássico). O resultado é limitado de 0 a 100.
4. Os impulsos do próprio modo são somados, dentro dos tetos dos baldes, e o total é limitado a 100.
5. Se o modo se mistura com o Clássico (piso, mistura ou impulso), isso acontece aqui.
6. Os impulsos de favorito e de pós-temporada são somados, e o total é limitado a 100 de novo. Um modo com `paysPostseason: false` pula o impulso de pós-temporada.
7. O `gameBoost` é somado por último. É a única coisa que pode passar de 100.

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

Consultam uma entrada de um resultado pelo id. Os dois devolvem `0` para um id que não está lá.

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

Monta o [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput) que o `compute` de um sinal ou impulso recebe: o jogo, o contexto, a configuração de esporte e de liga resolvida, o `progress`, o `now` e a `margin`. É o que o `scoreGame` chama por dentro, exportado para um sinal que você escreve poder ser testado sozinho.

## Modos

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

Confere um modo uma vez, logo de início, e o devolve sem mudar. Lança erro se dois sinais dividem um id, se o teto de um sinal não é positivo ou se o modo não tem sinais.

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

O `compute` de um sinal recebe o jogo, o contexto, a configuração de esporte e de liga resolvida, o `progress` do jogo (0 no começo, 1 no fim do tempo normal e durante a prorrogação) e a `margin`. Ele devolve `points`, limitados ao teto, e um `reason` opcional. Um modo também pode trazer `boosts`, `bucketCaps`, um `classicBlend`, `paysPostseason` (padrão `true`; `false` retém o impulso de pós-temporada) e um `appliesTo(game, context)` que manda para o Clássico os jogos sobre os quais ele não tem nada a dizer.

O `reasonPriority` lista os sinais cujos motivos podem ser lidos. O mais forte fala, e a ordem desempata. Uma chave de motivo que os modos embutidos conhecem é renderizada em inglês no `score.reason`. Uma chave sua é renderizada como ela mesma, então traduza a partir de `score.reasons`, não da string.

### classicMode, blowoutsMode, fantasyMode, builtInModes e getMode

`classicMode`, `blowoutsMode` e `fantasyMode` são os três objetos `PowerScoreMode` embutidos. O `builtInModes` são os mesmos três indexados por id, e o `getMode(idOrMode)` resolve um id, um objeto de modo ou nada (o que dá o Clássico). Espalhe um para construir em cima dele. Para ter o Clássico sem os impulsos da 3.0:

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### Sinais e impulsos

As peças de que os modos embutidos são feitos também são exportadas, para um modo personalizado poder reaproveitá-las:

| Export | O que é |
|---|---|
| `classicSignals`, `blowoutsSignals`, `fantasySignals` | A lista de sinais de cada modo. |
| `closenessSignal`, `lateGameSignal`, `momentumSignal`, `leadChangesSignal`, `comebackSignal` | Os cinco do Clássico, um a um. |
| `scoringOpportunityBoost`, `goAheadRunBoost`, `twoMinuteDrillBoost`, `noHitterBoost`, `redCardBoost`, `upsetWatchBoost`, `upsetRoutBoost`, `stakesBoost` | O `BoostDefinition` de cada impulso. O que cada um paga está em [Impulsos e penalidades](/arenaswap/docs/powerscore/boosts-and-penalties/). |
| `underdogProbability(line, sportType, league)` | A chance do azarão antes do jogo, a partir de um `PregameLine`. `undefined` quando a linha não consegue dizer. |
| `postseasonBoostShare(round)` | A parte do impulso de pós-temporada que uma fase rende: 1, 0.75, 0.5, 0.25, ou 0 sem fase. |
| `applyProgressFloor`, `findLeadChanges` | Os dois auxiliares por trás do equilíbrio e das mudanças de liderança. |
| `baseMask(baseRunners)`, `runnersOn(mask)` | As bases como um número de 3 bits, com a primeira base no menos significativo (`0b101` são corredores na primeira e na terceira), e quantos corredores isso dá. |

## Motivos

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

Renderizam uma frase de motivo, ou uma lista delas unidas em frases, em inglês. É o que preenche o `score.reason`. Use-as quando montar motivos seus e quiser que soem do mesmo jeito. O `ordinal(n)` dá o ordinal em inglês que elas usam ("2nd", "11th", "21st").

## Configuração e andamento

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

O `resolveSportConfig` e o `resolveLeagueConfig` fazem o que o `scoreGame` faz no começo de toda chamada. Um `sportType` desconhecido cai na calibragem do basquete. Uma liga desconhecida cai na liga mais conhecida do esporte dela: a NBA para o basquete, a NHL para o hóquei, a MLB para o beisebol, a NFL para o futebol americano, o softbol da NCAA e a MLS para o futebol. O `getGameProgress` é 0 no começo, 1 no fim do tempo normal e durante a prorrogação. O `scoreMargin` é a diferença absoluta de placar.

## Pontuação de fantasy

O sinal Pontos de fantasy do Fantasy quer pontos de fantasy. Estas funções transformam uma linha de box score neles. Você diz as estatísticas, elas pontuam.

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

Devolve o total de uma linha de estatísticas, arredondado a duas casas. Estatísticas desconhecidas e valores não finitos são ignorados. O `pointsAllowed` de uma defesa é pontuado por faixa.

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

O `defaultFantasyScoring` guarda as regras padrão de `'football'` (PPR completo), `'basketball'`, `'baseball'` e `'hockey'`. Cada regra é `{ points, min, max }`, para uma tela de configurações poder impor os limites.

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

O `resolveFantasyScoring(sport, overrides?)` devolve as regras como números simples. Uma sobrescrita é limitada aos limites da regra, e uma regra que não existe é ignorada.

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

O `fantasySportOf(sportType)` mapeia um `sportType` para um dos quatro esportes de fantasy. O softbol conta como beisebol, e o futebol não tem nenhum, então devolve `undefined`.

## Constantes

| Constante | Valor |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156 (a soma dos cinco tetos do Clássico) |
| `scoreMaxTotal` | 100 |
| `breakPenalty` | 15, o desconto fixo enquanto `context.onBreak` é `true` |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

Por que os tetos do Clássico passam do limite de 100 pontos está em [Sinais do PowerScore em cada modo](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total). Os tetos são explicados em [Impulsos e penalidades](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets).

`scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` e `thirdAndShortDistance` guardam os valores exatos por trás do impulso de oportunidade de pontuar, tabelados em [Impulsos e penalidades](/arenaswap/docs/powerscore/boosts-and-penalties/). Os impulsos mais novos guardam os números em `goAheadRunTunables`, `twoMinuteDrillTunables`, `noHitterTunables`, `redCardTunables`, `upsetTunables`, `stakesTunables` e `hockeyTunables`.

O `scorerTunables` guarda todo valor de faixa com que o motor pontua, os mesmos números que as constantes acima já dão pelo nome, para um consumidor poder ler o valor de uma faixa em vez de fixá-lo no código.

`sportTypeConfigs`, `sportTypeConfigMap`, `leagueConfigs`, `leagueConfigMap` e `allLeagueIds` guardam o ajuste de esporte e de liga que o motor lê a cada chamada. Os campos deles e os valores reais de cada esporte e liga estão em [Configuração de esporte e liga](/arenaswap/docs/powerscore/configuration/).

## A API 2.x

Ainda exportada, ainda funcionando, e marcada como obsoleta onde indicado. Nada aqui foi removido na 3.0. Passe para o `scoreGame` quando quiser os modos ou os novos impulsos. Até lá, estas funções devolvem os números de sempre.

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	winProbabilityHistory?: number[],
): PowerScoreResult
```

Obsoleta. Pontua os cinco sinais do Clássico, aplica o modificador de probabilidade de vitória e devolve o `PowerScoreResult` simples (`closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`, `total`, `reason` e companhia). É o `scoreGame` no Clássico só com os sinais, achatado, então não inclui nenhum dos impulsos de momento.

| Parâmetro | Padrão | Observações |
|---|---|---|
| `game` | obrigatório | O estado atual do jogo. |
| `history` | `[]` | Fotos recentes do placar. Dinâmica, mudanças de liderança e virada ficam em 0 até isto ter pelo menos 3 entradas. |
| `winProbabilityHistory` | `[]` | Valores recentes de probabilidade de vitória, de 0 a 1. Precisa de pelo menos 5 entradas finitas para contribuir com alguma coisa. |

Nunca lança erro. Devolve de imediato um resultado todo zerado quando `isPlayFrozen(game)` é verdadeiro. Não confere `game.status`: um jogo `'pre'` ou `'post'` pontua igual a um `'in'`, com os mesmos outros campos.

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

Obsoleta: o número está na lista `boosts` do `scoreGame` como `scoringOpportunity`. Devolve `0` a não ser que `game.status === 'in'` e o jogo não esteja parado. Caso contrário, devolve de 0 a 10 para beisebol e softbol, pela quantidade de corredores, ou de 0 a 15 para o futebol americano, pela diferença na red zone e pelo down. Devolve `0` para qualquer outro `sportType`, o hóquei inclusive, já que o power play e o goleiro retirado vêm do `context`, que esta função não recebe. Não entra no `total` do `computePowerScore`.

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

Mapeia um histórico de probabilidade de vitória para o modificador de ±5. Filtra as entradas não finitas primeiro e depois devolve `undefined` se restarem menos de 5 valores finitos. Caso contrário, devolve um inteiro de `-scoreWinProbVarianceMax` a `scoreWinProbVarianceMax`.

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

Devolve `true` quando `game.intermission === true` ou `game.delayed === true`, e `false` nos outros casos, inclusive quando os dois campos estão ausentes.

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

O quanto do tempo normal o jogo já andou, de 0 a 1, a partir do mesmo relógio que o sinal Fase final lê. Útil para desenhar um jogo numa linha do tempo.

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

Obsoleta. Recebe um `PowerScoreResult` parcial, possivelmente não confiável (só o `gameId` é obrigatório) e devolve um válido, totalmente limitado. O `computePowerScore` a chama por dentro a cada resultado que produz.

Cada um dos cinco campos de sinal é limitado ao seu próprio teto. O `total` é limitado a `scoreMaxTotal`, a não ser que `options.allowTotalOverflow` seja `true`. Com essa opção, ele só é limitado a um mínimo de `0`, deixando um impulso manual empurrá-lo além de 100 de propósito. Um `total` ausente ou não finito cai na soma dos cinco sinais menos `breakPenalty`, não na soma crua. O `reason` cai em `scorerTunables.reasons.fallback` ("best game available") quando não é uma string. `favoriteBonus`, `favoriteTeamCount`, `gameBoost`, `scoringOpportunityBoost` e `postseasonBoost` são arredondados e limitados a no mínimo `0` quando informados. Quando não são, ficam de fora do resultado, sem assumir `0` como padrão. Nunca lança erro.

### O que muda se você migrar

O Clássico pelo `scoreGame` inclui os novos impulsos, então o mesmo jogo pode pontuar mais lá do que no `computePowerScore`, até os tetos dos baldes. Os impulsos de favorito, de pós-temporada e manuais que você somava à mão em volta do `normalizePowerScoreResult` agora são opções do `scoreGame`. Todo o resto continua igual. O tipo `Game` ganhou campos opcionais e um parâmetro de tipo para a liga, e um `Game` puro significa o que sempre significou. Um id de liga que a tabela não conhece era pontuado com a configuração da NBA, fosse qual fosse o esporte. Agora ele recebe os padrões do próprio esporte, então um jogo de hóquei numa liga desconhecida recebe os períodos e o relógio da NHL.
