---
sourceHash: 'd23f4e1a7b17'
title: Pontuar um jogo com dados em direto
description: Mapeia o teu próprio feed num objeto Game, guarda um histórico de resultados entre consultas, liga os impulsos e os modos que os teus dados suportam e acrescenta impulsos de favorito e manuais.
section: powerscore
order: 2
navLabel: Pontuar com dados em direto
faq:
  - q: O scoreGame verifica se um jogo está mesmo em direto?
    a: Só os impulsos o fazem. Não pagam nada a menos que o estado do jogo seja 'in'. Os sinais continuam a pontuar um jogo que ainda não começou ou que já acabou, e um jogo num intervalo ou atraso pontua 0. Filtra tu primeiro os jogos em direto, tal como o ArenaSwap faz antes de chamar o pontuador.
  - q: Posso usar o PowerScore com ligas que ele não lista?
    a: Sim. O Game é genérico quanto ao id da liga, e um id que a tabela incluída não conhece é pontuado com os valores predefinidos do seu desporto. Substitui o número e a duração dos períodos em cada chamada com options.league se os valores predefinidos estiverem errados.
---

O `scoreGame` não vai buscar nada. Pontua o objeto `Game` e o contexto que lhe entregares. Esta página constrói ambos a partir de um feed inventado e depois liga mais partes do motor conforme os teus dados permitirem.

## Mapear o teu feed num Game

Só `id`, `league`, `sportType` e as duas pontuações das equipas são obrigatórios. Tudo o resto afina a pontuação quando o teu feed o tem, e conta como desconhecido quando não tem. Mapeia o que tiveres e salta o resto.

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

Define o `status` com honestidade. `'in'` é o que os impulsos verificam antes de pagarem fosse o que fosse. Uma flag `intermission` ou `delayed` põe a pontuação toda a 0 até o jogo recomeçar, para um jogo numa pausa publicitária ou num atraso por chuva não poder pontuar mais do que um que está a decorrer.

## Dá-lhe mais, e liga-se mais

Cada campo opcional liga a parte do motor que precisa dele. Deixa um de fora e essa parte pontua 0. Nada lança erros.

| Dá-lhe | Em | E ligam-se estes |
|---|---|---|
| Instantâneos do resultado, do mais antigo para o mais recente | `context.history` | Dinâmica, Mudanças de liderança, Fator de remontada. Precisa de pelo menos 3 instantâneos. |
| Probabilidade de vitória, de 0 a 1 por consulta | `context.winProbability` | O modificador de probabilidade de vitória de ±5. Precisa de pelo menos 5 valores. |
| Se o jogo está numa pausa publicitária | `context.onBreak` | A dedução por pausa. |
| `possession`, `yardsToEndZone`, `down`, `distance` e `timeouts` na equipa | `game`, `game.homeTeam` | O ataque de dois minutos e a situação de futebol americano do Fantasy. |
| `isRedZone`, mais `down`, `distance` e `isGoalToGo` | `game` | O impulso de red zone. |
| `baseRunners`, `outs`, `topOfInning` | `game` | Corredores nas bases e a corrida da vantagem. |
| `hits` em cada equipa | `game.homeTeam`, `game.awayTeam` | O no-hitter. |
| `series` e `rank` em cada equipa | `game`, `game.homeTeam` | Em jogo: uma série no fio da navalha, duas equipas no ranking. |
| `context.stakes` | `context` | Em jogo: uma corrida no fim da época. |
| `pregameLine` | `context` | Atenção à surpresa. Usa a linha de antes do jogo. |
| `redCards` | `game` | O impulso de cartão vermelho, no futebol. |
| `powerPlay`, `emptyNet` | `context` | A oportunidade de marcar do hóquei. |
| `fantasy` | `context` | O modo Fantasy. |
| `nickname` em cada equipa | `game.homeTeam`, `game.awayTeam` | Os nomes das equipas em `reason`, em vez da abreviatura. |
| `seasonType`, `postseasonRound` | `game` | O Em jogo lê o jogo como pós-temporada (uma série) em vez de época regular (rankings e corridas). |
| `recentLeadChanges` | `context` | Uma contagem de mudanças de liderança do registo de jogadas do teu feed, para viragens entre consultas. |

Os campos estão todos na [página dos tipos](/arenaswap/docs/powerscore/types/#game), e o que cada impulso paga está em [Impulsos e penalizações](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Guardar um histórico de resultados para a dinâmica, as mudanças de liderança e a remontada

Estes três sinais leem de `context.history`, uma lista dos resultados passados de um jogo, e ficam a 0 até ter pelo menos três instantâneos. Guarda um em cada consulta, por ordem, do mais antigo para o mais recente, com uma marca temporal em milissegundos. As marcas temporais só têm de ser relativas entre si. Não têm de ser a hora do relógio.

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

O Boston perdia por 5 e acabou de passar à frente com uma série de 13-2:

```ts
score.total;  // 86
score.reason; // 'BOS came back from 5 down to lead. Up 6 in the 3rd quarter'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 16
```

Corta os instantâneos mais antigos do que o `historyWindowMs` do desporto, para a lista não crescer para sempre. Essa janela, e o resto do ajuste específico de cada desporto, está em [Configuração de desportos e ligas](/arenaswap/docs/powerscore/configuration/).

## Acompanhar pausas e probabilidade de vitória, se as tiveres

Vão todas no contexto. Se souberes quando um jogo está numa pausa publicitária, passa `onBreak`:

```ts
const score = scoreGame(game, { history, onBreak: isInBreak(game), winProbability });
```

O `isInBreak` fica por tua conta, a partir do que o teu feed disser sobre pausas entre entradas, mudanças de lançador e tempos mortos. Enquanto `onBreak` for `true`, a pontuação perde fixos 15 pontos.
O `winProbability` é uma lista de valores recentes de probabilidade de vitória de 0 a 1, para qualquer uma das equipas. Só importa a distância a 50%. Ambos são opcionais, e o PowerScore pontua bem sem eles. O que cada um muda está em [Impulsos e penalizações](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Deixar os impulsos ver o momento

O basebol, o futebol americano, o hóquei e o futebol têm cada um uma situação que o resultado sozinho não mostra. Acrescenta os campos que o teu feed tiver e o `scoreGame` paga por eles. Aqui está um jogo de basebol na parte baixa da 9.ª, empatado, bases cheias, um out:

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

Estes dois juntos enchem o limite de 20 do grupo dos momentos. O futebol americano recebe a red zone de `isRedZone`, ponderada por `down`, `distance` e `isGoalToGo`, e o ataque de dois minutos de `possession`, `yardsToEndZone` e `down`. A oportunidade de marcar do hóquei precisa de `context.powerPlay` e `context.emptyNet`. O futebol precisa de `redCards`.

## Pontuar noutro modo

Escolhe um modo com `options.mode`. As Goleadas não precisam de mais nada. O Fantasy precisa do teu plantel no contexto, uma entrada por jogador:

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

O `pointEvents` é como os Pontos de fantasy veem um jogador a marcar pontos de fantasy há um minuto. Para transformar uma linha de boxscore nesses pontos, usa [`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints). Um jogo sem nenhum dos teus jogadores é pontuado como Clássico, e `score.modeId` indica-o.

## Acrescentar impulsos de favorito, de pós-temporada e manuais

Pontua primeiro o jogo e deixa as opções acrescentarem o que o PowerScore não sabe, como a equipa favorita de quem vê. As mesmas opções funcionam em todos os modos.

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 106
```

Os impulsos de favorito e de pós-temporada são somados ao total e limitados a 100. O `gameBoost` é somado depois disso, e é a única coisa autorizada a passar dos 100, por isso um jogo fixado por quem vê pode bater uma pontuação perfeita. Um jogo parado ignora-os todos: um jogo parado não pode pontuar mais do que um que está a decorrer.

O próprio [código de pontuação](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts) do ArenaSwap constrói as suas opções da mesma maneira antes de entregar as pontuações ao comutador de separadores.

## A maneira 2.x

O `computePowerScore(game, history, winProbabilityHistory)` continua a funcionar e devolve o resultado 2.x simples, sem impulsos de momento. É a chamada certa se só quiseres o número que sempre tiveste. [A referência da API](/arenaswap/docs/powerscore/api-reference/#the-2x-api) lista tudo o que ainda lá está.
