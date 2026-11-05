---
sourceHash: '1cae3a43d11e'
title: Pontua o teu primeiro jogo com o PowerScore
navLabel: Primeiros passos
description: Instala o pacote powerscore e pontua um jogo em direto com scoreGame em poucas linhas de código, acabando com um número e um motivo que podes ver no terminal.
section: powerscore
order: 1
faq:
  - q: O powerscore precisa de uma chave de API ou de uma conta?
    a: Não. Só pontua o estado do jogo que lhe entregas. Obter esse estado, venha o marcador de onde vier, é trabalho do teu próprio código.
  - q: O powerscore corre no navegador?
    a: Sim. Não tem dependências em tempo de execução e só mexe em objetos simples e matemática. Integra-se numa extensão de navegador da mesma forma que corre no Node.
  - q: Tenho de reescrever o meu código 2.x para o PowerScore 3?
    a: Não. O computePowerScore e os tipos 2.x continuam a funcionar e devolvem os mesmos totais de sempre. Passa para o scoreGame quando quiseres modos ou os novos impulsos.
---

Isto instala o `powerscore` e pontua um jogo em direto, acabando com um número e as razões por trás dele.

## Instalar o pacote

```bash
npm install powerscore
```

O pacote também está no [npm](https://www.npmjs.com/package/powerscore). Para o ver a pontuar os jogos a sério desta noite, visita a [página do PowerScore](/arenaswap/powerscore/).

## Descrever o jogo

O `scoreGame` precisa de um objeto `Game`: os dois marcadores, a liga e o desporto, e em que ponto está o jogo neste momento. Define `status: 'in'` para um jogo em direto, porque é isso que os impulsos verificam antes de pagarem fosse o que fosse.

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

O Boston vence por dois pontos com 45 segundos para o fim do quarto período. É equilibrado e é tarde: exatamente o que o PowerScore procura.

## Pontuá-lo

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

Corre isto e o terminal imprime:

```text
68
BOS up 2 with 0:45 left
```

O `scoreGame` aceita mais dois argumentos, ambos opcionais: um `context` para tudo o que o jogo não traz consigo (histórico do marcador, probabilidade de vitória, a linha pré-jogo, um plantel de fantasy) e `options` para o modo de pontuar (que modo, que sinais desligar). Sem nenhum dos dois, ficas com o Clássico, o modo que pergunta se um jogo está equilibrado e perto do fim.

## Ler a análise

O `score` traz mais do que o número principal. Cada sinal está nele como uma entrada de lista, com os seus pontos e o seu teto, juntamente com os impulsos e as razões.

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

Aqui, o equilíbrio e a pressão da fase final formam a pontuação toda. Sem histórico do marcador para consultar, a dinâmica, as mudanças de liderança e a remontada não têm nada para medir, por isso ficam a 0. Entrega ao `scoreGame` um `history` no contexto e eles acordam. Os impulsos estão em `score.boosts`, todos a 0 neste jogo, porque um jogo de basquetebol não tem corredores, red zone nem guarda-redes retirado para pagar.

Usa `signalPoints(score, 'momentum')` e `boostPoints(score, 'noHitter')` para consultar um deles pelo id.

## Experimentar outro modo

O mesmo jogo pode responder a uma pergunta diferente. Os modos escolhem-se com `options.mode`:

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

As Goleadas perguntam se alguém está a fugir no marcador. Um jogo de 2 pontos não está, por isso pontua 30% do seu 68 Clássico e nada mais. Esse piso é o que mantém um jogo equilibrado elegível numa noite sem goleadas. O Fantasy pergunta se vai acontecer algo aos teus jogadores. [A página dos sinais](/arenaswap/docs/powerscore/signals/) explica os três.

Para pontuar um jogo que o teu próprio código vai consultando, lê [Pontuar um jogo com dados em direto](/arenaswap/docs/powerscore/scoring-a-game/). Para saberes o que cada sinal mede e porquê, lê [Sinais do PowerScore em todos os modos](/arenaswap/docs/powerscore/signals/).
