---
sourceHash: 'd23f4e1a7b17'
title: Pontue um jogo com dados ao vivo
description: Mapeie o seu próprio feed num objeto Game, guarde um histórico de placar entre as consultas, ligue os impulsos e os modos que os seus dados sustentam e some impulsos de favorito e manuais.
section: powerscore
order: 2
navLabel: Pontuar com dados ao vivo
faq:
  - q: O scoreGame confere se o jogo está mesmo ao vivo?
    a: Só os impulsos conferem. Eles não pagam nada a não ser que o status do jogo seja 'in'. Os sinais ainda pontuam um jogo que não começou ou que já acabou, e um jogo em intervalo ou em atraso pontua 0. Filtre os jogos ao vivo você mesmo antes, do jeito que o ArenaSwap faz antes de chamar o pontuador.
  - q: Posso usar o PowerScore com ligas que ele não lista?
    a: Pode. O Game é genérico sobre o id da liga, e um id que a tabela embutida não conhece é pontuado com os padrões do esporte dele. Se os padrões estiverem errados, sobrescreva o número e a duração dos períodos a cada chamada com options.league.
---

O `scoreGame` não busca nada. Ele pontua o objeto `Game` e o contexto que você entregar. Esta página monta os dois a partir de um feed inventado e depois liga mais partes do motor conforme os seus dados permitem.

## Mapeie o seu feed num Game

Só `id`, `league`, `sportType` e os dois placares dos times são obrigatórios. Todo o resto afina a pontuação quando o seu feed tem o dado, e conta como desconhecido quando não tem. Mapeie o que você tem e pule o resto.

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

Defina o `status` com honestidade. `'in'` é o que os impulsos conferem antes de pagar qualquer ponto. Um sinalizador `intermission` ou `delayed` zera a pontuação inteira até o jogo voltar, então um jogo em intervalo comercial ou em atraso por chuva não passa na frente de um que está rolando.

## Dê mais dados, e mais coisas se ligam

Cada campo opcional liga a parte do motor que precisa dele. Deixe um de fora e essa parte pontua 0. Nada lança erro.

| Entregue | Em | E isto se liga |
|---|---|---|
| Fotos do placar, da mais antiga para a mais nova | `context.history` | Dinâmica, Mudanças de liderança, Virada. Precisa de pelo menos 3 fotos. |
| Probabilidade de vitória, de 0 a 1 por consulta | `context.winProbability` | O modificador de ±5 da probabilidade de vitória. Precisa de pelo menos 5 valores. |
| Se o jogo está num intervalo comercial | `context.onBreak` | O desconto por intervalo. |
| `possession`, `yardsToEndZone`, `down`, `distance` e `timeouts` no time | `game`, `game.homeTeam` | O two-minute drill e a situação de futebol americano do Fantasy. |
| `isRedZone`, mais `down`, `distance` e `isGoalToGo` | `game` | O impulso de red zone. |
| `baseRunners`, `outs`, `topOfInning` | `game` | Corredores nas bases e a corrida da vantagem. |
| `hits` em cada time | `game.homeTeam`, `game.awayTeam` | O no-hitter. |
| `series` e `rank` em cada time | `game`, `game.homeTeam` | Em jogo: uma série à beira do fim, dois times ranqueados. |
| `context.stakes` | `context` | Em jogo: uma disputa de fim de temporada. |
| `pregameLine` | `context` | Alerta de zebra. Use a linha de antes do jogo. |
| `redCards` | `game` | O impulso de cartão vermelho, no futebol. |
| `powerPlay`, `emptyNet` | `context` | A oportunidade de pontuar do hóquei. |
| `fantasy` | `context` | O modo Fantasy. |
| `nickname` em cada time | `game.homeTeam`, `game.awayTeam` | Nomes dos times no `reason`, no lugar da abreviação. |
| `seasonType`, `postseasonRound` | `game` | O Em jogo lê o jogo como pós-temporada (uma série) em vez de temporada regular (rankings e disputas). |
| `recentLeadChanges` | `context` | Uma contagem de mudanças de liderança tirada do registro de lances do seu feed, para as viradas entre uma consulta e outra. |

Todos os campos estão na [página de tipos](/arenaswap/docs/powerscore/types/#game), e o que cada impulso paga está em [Impulsos e penalidades](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Guarde um histórico de placar para dinâmica, mudanças de liderança e virada

Esses três sinais leem o `context.history`, uma lista dos placares passados de um jogo, e ficam em 0 até ele ter pelo menos três fotos. Guarde uma a cada consulta, em ordem, da mais antiga para a mais nova, com um carimbo de tempo em milissegundos. Os carimbos só precisam ser relativos entre si. Não precisam ser a hora do relógio.

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

O Boston estava perdendo por 5 e acabou de assumir a liderança com uma parcial de 13 a 2:

```ts
score.total;  // 86
score.reason; // 'BOS came back from 5 down to lead. Up 6 in the 3rd quarter'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 16
```

Apare as fotos mais antigas que o `historyWindowMs` do esporte para a lista não crescer para sempre. Essa janela, e o resto do ajuste específico de cada esporte, está em [Configuração de esporte e liga](/arenaswap/docs/powerscore/configuration/).

## Acompanhe intervalos e probabilidade de vitória, se você tiver

Tudo isso vai no contexto. Se você sabe dizer quando um jogo está num intervalo comercial, passe `onBreak`:

```ts
const score = scoreGame(game, { history, onBreak: isInBreak(game), winProbability });
```

O `isInBreak` é você que escreve, a partir do que o seu feed diz sobre pausas entre entradas, trocas de arremessador e pedidos de tempo. Enquanto `onBreak` for `true`, a pontuação perde 15 pontos fixos.
O `winProbability` é uma lista de valores recentes de probabilidade de vitória de 0 a 1, de qualquer um dos times. Só importa a distância até 50%. Os dois são opcionais, e o PowerScore pontua bem sem eles. O que cada um muda está em [Impulsos e penalidades](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Deixe os impulsos enxergarem o momento

Beisebol, futebol americano, hóquei e futebol carregam, cada um, uma situação que o placar sozinho não mostra. Some os campos que o seu feed tem e o `scoreGame` paga por eles. Aqui está um jogo de beisebol na parte baixa da 9ª, empatado, bases lotadas, um out:

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

Os dois juntos enchem o teto de 20 do balde de momentos. O futebol americano ganha a red zone a partir de `isRedZone`, ponderada por `down`, `distance` e `isGoalToGo`, e o two-minute drill a partir de `possession`, `yardsToEndZone` e `down`. A oportunidade de pontuar do hóquei precisa de `context.powerPlay` e `context.emptyNet`. O futebol precisa de `redCards`.

## Pontue num modo diferente

Escolha um modo com `options.mode`. O Atropelos não precisa de nada extra. O Fantasy precisa do seu elenco no contexto, uma entrada por jogador:

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

O `pointEvents` é como os Pontos de fantasy enxergam um jogador que marcou pontos de fantasy um minuto atrás. Para transformar uma linha de box score nesses pontos, use [`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints). Um jogo sem nenhum dos seus jogadores é pontuado como Clássico, e o `score.modeId` diz isso.

## Some impulsos de favorito, de pós-temporada e manuais

Pontue o jogo primeiro e deixe as opções somarem o que o PowerScore não sabe, como o time favorito de quem assiste. As mesmas opções valem em todos os modos.

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 106
```

Os impulsos de favorito e de pós-temporada são somados ao total e limitados a 100. O `gameBoost` é somado depois disso e é a única coisa que pode passar de 100, então um jogo fixado por quem assiste pode superar uma pontuação perfeita. Um jogo parado pula todos eles: um jogo parado não passa na frente de um que está rolando.

O próprio [código de pontuação](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts) do ArenaSwap monta as opções do mesmo jeito antes de entregar as pontuações ao trocador de abas.

## O jeito 2.x

O `computePowerScore(game, history, winProbabilityHistory)` ainda funciona e devolve o resultado 2.x simples, sem impulsos de momento. É a chamada certa se você só quer o número que sempre recebeu. [A referência da API](/arenaswap/docs/powerscore/api-reference/#the-2x-api) lista tudo que continua lá.
