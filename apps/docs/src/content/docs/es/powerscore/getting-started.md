---
sourceHash: '1cae3a43d11e'
title: Califica tu primer partido con PowerScore
navLabel: Primeros pasos
description: Instala el paquete powerscore y califica un partido en vivo con scoreGame en unas pocas líneas de código, hasta obtener un número y un motivo que puedes ver en tu terminal.
section: powerscore
order: 1
faq:
  - q: ¿powerscore necesita una clave de API o una cuenta?
    a: No. Solo califica el estado del partido que le pasas. Obtener ese estado, de donde sea que vengan tus marcadores, es trabajo de tu propio código.
  - q: ¿powerscore funciona en el navegador?
    a: Sí. No tiene dependencias en tiempo de ejecución y solo toca objetos simples y matemáticas. Se empaqueta en una extensión de navegador igual que corre en Node.
  - q: ¿Tengo que reescribir mi código de la versión 2.x para PowerScore 3?
    a: No. computePowerScore y los tipos de la 2.x siguen funcionando y devuelven los mismos totales de antes. Pasa a scoreGame cuando quieras modos o los nuevos impulsos.
---

Esta guía instala `powerscore` y califica un partido en vivo, hasta obtener un número y los motivos detrás de él.

## Instala el paquete

```bash
npm install powerscore
```

El paquete también está en [npm](https://www.npmjs.com/package/powerscore). Para verlo calificando los partidos reales de esta noche, visita la [página de PowerScore](/arenaswap/powerscore/).

## Describe el partido

`scoreGame` necesita un objeto `Game`: los dos marcadores, qué liga y deporte es, y en qué punto está el partido ahora mismo. Define `status: 'in'` para un partido en vivo, porque eso es lo que revisan los impulsos antes de sumar algo.

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

Boston gana por dos puntos con 45 segundos por jugar en el cuarto periodo. Está cerrado y está avanzado: justo lo que busca PowerScore.

## Califícalo

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

Ejecútalo y la terminal imprime:

```text
68
BOS up 2 with 0:45 left
```

`scoreGame` recibe dos argumentos más, y ambos son opcionales: un `context` para todo lo que el partido no trae (historial del marcador, probabilidad de victoria, la línea previa al partido, una plantilla de fantasy) y `options` para definir cómo calificarlo (qué modo, qué señales apagar). Sin ninguno, obtienes Clásico, el modo que pregunta si un partido está cerrado y avanzado.

## Lee el desglose

`score` trae más que el número principal. Cada señal viene como una entrada de la lista con sus propios puntos y su tope, junto con los impulsos y los motivos.

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

La igualdad y la presión de la recta final forman todo el puntaje aquí. Sin historial del marcador al que mirar atrás, la racha, los cambios de ventaja y la remontada no tienen nada que medir todavía, así que se quedan en 0. Pásale a `scoreGame` un `history` en el contexto y despiertan. Los impulsos están en `score.boosts`, todos en 0 para este partido, porque un partido de basquetbol no tiene corredores, zona roja ni portero retirado por los que sumar.

Usa `signalPoints(score, 'momentum')` y `boostPoints(score, 'noHitter')` para buscar uno por id.

## Prueba otro modo

El mismo partido puede responder otra pregunta. Los modos se eligen con `options.mode`:

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

Palizas pregunta si alguien se está escapando. Un partido de 2 puntos no, así que recibe el 30% de sus 68 de Clásico y nada más. Ese piso es lo que mantiene elegible a un partido cerrado en una noche sin goleadas. Fantasy pregunta si algo está por pasarles a tus jugadores. [La página de señales](/arenaswap/docs/powerscore/signals/) cubre los tres.

Para calificar un partido que tu propio código consulta periódicamente, lee [Califica un partido con datos en vivo](/arenaswap/docs/powerscore/scoring-a-game/). Para saber qué mide cada señal y por qué, lee [Señales del PowerScore en todos los modos](/arenaswap/docs/powerscore/signals/).
