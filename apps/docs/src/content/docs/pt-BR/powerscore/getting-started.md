---
sourceHash: '1cae3a43d11e'
title: Pontue seu primeiro jogo com o PowerScore
navLabel: Primeiros passos
description: Instale o pacote powerscore e pontue um jogo ao vivo com scoreGame em poucas linhas de código, terminando com um número e um motivo que você vê no terminal.
section: powerscore
order: 1
faq:
  - q: O powerscore precisa de chave de API ou de conta?
    a: Não. Ele só pontua o estado de jogo que você entrega. Buscar esse estado, de onde quer que venham os seus placares, é trabalho do seu próprio código.
  - q: O powerscore roda no navegador?
    a: Roda. Ele não tem dependências de runtime e só mexe em objetos simples e contas. Entra num bundle de extensão de navegador do mesmo jeito que roda no Node.
  - q: Preciso reescrever meu código 2.x para o PowerScore 3?
    a: Não. computePowerScore e os tipos 2.x continuam funcionando e devolvem os mesmos totais de antes. Passe para scoreGame quando quiser os modos ou os novos impulsos.
---

Aqui você instala o `powerscore` e pontua um jogo ao vivo, terminando com um número e os motivos por trás dele.

## Instale o pacote

```bash
npm install powerscore
```

O pacote também está no [npm](https://www.npmjs.com/package/powerscore). Para vê-lo pontuando os jogos reais de hoje à noite, acesse a [página do PowerScore](/arenaswap/powerscore/).

## Descreva o jogo

O `scoreGame` precisa de um objeto `Game`: os dois placares, a liga e o esporte, e em que pé o jogo está agora. Use `status: 'in'` para um jogo ao vivo, porque é isso que os impulsos conferem antes de pagar qualquer ponto.

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

O Boston está dois pontos na frente com 45 segundos para o fim do quarto período. O jogo está apertado e já é tarde: exatamente o que o PowerScore procura.

## Pontue

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

Rode isso e o terminal imprime:

```text
68
BOS up 2 with 0:45 left
```

O `scoreGame` aceita mais dois argumentos, e os dois são opcionais: um `context` para tudo que o jogo não traz (histórico de placar, probabilidade de vitória, a linha pré-jogo, um elenco de fantasy) e `options` para o jeito de pontuar (qual modo, quais sinais desligar). Sem nenhum dos dois, você recebe o Clássico, o modo que pergunta se o jogo está apertado e perto do fim.

## Leia a análise

O `score` traz mais que o número principal. Cada sinal vem nele como uma entrada da lista, com seus próprios pontos e teto, junto com os impulsos e os motivos.

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

Equilíbrio e pressão da fase final formam a pontuação inteira aqui. Sem histórico de placar para olhar para trás, dinâmica, mudanças de liderança e virada ainda não têm o que medir, então ficam em 0. Passe um `history` no contexto para o `scoreGame` e eles acordam. Os impulsos estão em `score.boosts`, todos em 0 para este jogo, porque um jogo de basquete não tem corredores, red zone nem goleiro retirado para pagar.

Use `signalPoints(score, 'momentum')` e `boostPoints(score, 'noHitter')` para consultar um por id.

## Experimente outro modo

O mesmo jogo pode responder outra pergunta. Os modos são escolhidos com `options.mode`:

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

O Atropelos pergunta se alguém está abrindo uma vantagem enorme. Um jogo de 2 pontos não está, então ele pontua 30% dos 68 do Clássico e nada além. Esse piso é o que mantém um jogo apertado elegível numa noite sem atropelo. O Fantasy pergunta se algo está prestes a acontecer com os seus jogadores. [A página de sinais](/arenaswap/docs/powerscore/signals/) cobre os três.

Para pontuar um jogo que o seu código está consultando, leia [Pontue um jogo com dados ao vivo](/arenaswap/docs/powerscore/scoring-a-game/). Para saber o que cada sinal mede e por quê, leia [Sinais do PowerScore em cada modo](/arenaswap/docs/powerscore/signals/).
