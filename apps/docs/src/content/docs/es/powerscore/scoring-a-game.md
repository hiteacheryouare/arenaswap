---
sourceHash: 'd23f4e1a7b17'
title: Califica un partido con datos en vivo
description: Mapea tu propio feed a un objeto Game, conserva un historial del marcador entre consultas, activa los impulsos y modos que tus datos permitan y agrega impulsos de favorito y manuales.
section: powerscore
order: 2
navLabel: Califica con datos en vivo
faq:
  - q: ¿scoreGame revisa si un partido de verdad está en vivo?
    a: Solo los impulsos lo hacen. No pagan nada a menos que el status del partido sea 'in'. Las señales igual califican un partido que no ha empezado o que ya terminó, y un partido en un intermedio o una demora califica 0. Filtra tú primero los partidos en vivo, igual que ArenaSwap antes de llamar al calificador.
  - q: ¿Puedo usar PowerScore con ligas que no aparecen en la lista?
    a: Sí. Game es genérico sobre el id de liga, y un id que la tabla integrada no conoce se califica con los valores predeterminados de su deporte. Sustituye el número y la duración de los periodos en cada llamada con options.league si los valores predeterminados no sirven.
---

`scoreGame` no obtiene nada por sí solo. Califica el objeto `Game` y el contexto que le pases. Esta página construye ambos a partir de un feed inventado y luego activa más partes del motor conforme lo permitan tus datos.

## Mapea tu feed a un Game

Solo `id`, `league`, `sportType` y los dos marcadores son obligatorios. Todo lo demás afina la puntuación cuando tu feed lo trae, y cuenta como desconocido cuando no. Mapea lo que tengas y omite el resto.

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

Define `status` con honestidad. `'in'` es lo que revisan los impulsos antes de pagar algo. Una marca `intermission` o `delayed` deja toda la puntuación en 0 hasta que se reanude el juego, así que un partido en un corte comercial o una demora por lluvia no puede superar a uno que se está jugando.

## Dale más, y se activa más

Cada campo opcional activa la parte del motor que lo necesita. Omite uno y esa parte califica 0. Nada lanza un error.

| Dale | En | Y se activa |
|---|---|---|
| Capturas del marcador, la más antigua primero | `context.history` | Racha, Cambios de ventaja, Remontada. Necesita al menos 3 capturas. |
| Probabilidad de victoria, de 0 a 1 por consulta | `context.winProbability` | El modificador de probabilidad de victoria de ±5. Necesita al menos 5 valores. |
| Si el partido está en un corte comercial | `context.onBreak` | La deducción por corte. |
| `possession`, `yardsToEndZone`, `down`, `distance` y `timeouts` en el equipo | `game`, `game.homeTeam` | La ofensiva de dos minutos y la situación de futbol americano de Fantasy. |
| `isRedZone`, además de `down`, `distance` e `isGoalToGo` | `game` | El impulso de zona roja. |
| `baseRunners`, `outs`, `topOfInning` | `game` | Corredores en base y la carrera de la ventaja. |
| `hits` en cada equipo | `game.homeTeam`, `game.awayTeam` | El no-hitter. |
| `series`, y `rank` en cada equipo | `game`, `game.homeTeam` | En juego: una serie al borde, dos equipos clasificados. |
| `context.stakes` | `context` | En juego: una carrera de fin de temporada. |
| `pregameLine` | `context` | Alerta de sorpresa. Usa la línea de antes del partido. |
| `redCards` | `game` | El impulso de tarjeta roja, en futbol. |
| `powerPlay`, `emptyNet` | `context` | La oportunidad de anotar del hockey. |
| `fantasy` | `context` | El modo Fantasy. |
| `nickname` en cada equipo | `game.homeTeam`, `game.awayTeam` | Nombres de equipo en `reason`, en lugar de la abreviatura. |
| `seasonType`, `postseasonRound` | `game` | En juego lee el partido como postemporada (una serie) y no como temporada regular (posiciones y carreras). |
| `recentLeadChanges` | `context` | Un conteo de cambios de ventaja del registro de jugadas de tu feed, para vuelcos entre consultas. |

Todos los campos están en [la página de tipos](/arenaswap/docs/powerscore/types/#game), y lo que paga cada impulso está en [Impulsos y penalizaciones](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Conserva un historial del marcador para la racha, los cambios de ventaja y la remontada

Esas tres señales leen de `context.history`, una lista de marcadores pasados de un partido, y se quedan en 0 hasta que tiene al menos tres capturas. Guarda una en cada consulta, en orden, la más antigua primero, con una marca de tiempo en milisegundos. Las marcas solo necesitan ser relativas entre sí. No tienen que ser hora de reloj.

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

Boston iba abajo por 5 y acaba de tomar la ventaja con una racha de 13-2:

```ts
score.total;  // 86
score.reason; // 'BOS came back from 5 down to lead. Up 6 in the 3rd quarter'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 16
```

Recorta las capturas más antiguas que el `historyWindowMs` del deporte para que el arreglo no crezca para siempre. Esa ventana, y el resto del ajuste específico por deporte, está en [Configuración de deportes y ligas](/arenaswap/docs/powerscore/configuration/).

## Registra los cortes y la probabilidad de victoria, si los tienes

Todo va en el contexto. Si puedes saber cuándo un partido está en un corte comercial, pasa `onBreak`:

```ts
const score = scoreGame(game, { history, onBreak: isInBreak(game), winProbability });
```

`isInBreak` lo escribes tú, con lo que diga tu feed sobre pausas entre entradas, cambios de lanzador y tiempos fuera. Mientras `onBreak` es `true`, la puntuación pierde 15 puntos fijos.
`winProbability` es una lista de valores recientes de probabilidad de victoria de 0 a 1, de cualquiera de los equipos. Solo importa la distancia al 50%. Ambos son opcionales, y PowerScore califica bien sin ellos. Lo que cambia cada uno está en [Impulsos y penalizaciones](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Deja que los impulsos vean el momento

El beisbol, el futbol americano, el hockey y el futbol llevan cada uno una situación que el marcador solo no muestra. Agrega los campos que tu feed tenga y `scoreGame` los paga. Aquí hay un partido de beisbol en la parte baja de la 9.ª, empatado, bases llenas, un out:

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

Esos dos juntos llenan el tope de 20 del grupo de momentos. El futbol americano obtiene la zona roja de `isRedZone`, ponderada por `down`, `distance` e `isGoalToGo`, y la ofensiva de dos minutos de `possession`, `yardsToEndZone` y `down`. La oportunidad de anotar del hockey necesita `context.powerPlay` y `context.emptyNet`. El futbol necesita `redCards`.

## Califícalo en otro modo

Elige un modo con `options.mode`. Palizas no necesita nada extra. Fantasy necesita tu plantilla en el contexto, una entrada por jugador:

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

`pointEvents` es cómo Puntos fantasy ve que un jugador sumó puntos de fantasy hace un minuto. Para convertir una línea del boxscore en esos puntos, usa [`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints). Un partido sin ninguno de tus jugadores se califica como Clásico, y `score.modeId` lo indica.

## Agrega impulsos de favorito, de postemporada y manuales

Califica primero el partido y deja que las opciones agreguen lo que PowerScore no sabe, como el equipo favorito de un espectador. Las mismas opciones funcionan en todos los modos.

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 106
```

Los impulsos de favorito y de postemporada se suman al total y se limitan a 100. `gameBoost` se suma después, y es lo único que puede pasar de 100, así que un partido que un espectador fija puede superar una puntuación perfecta. Un partido congelado se salta todos: un partido detenido no puede superar a uno que se está jugando.

El [código de puntuación](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts) del propio ArenaSwap arma sus opciones de la misma manera antes de entregar las puntuaciones al cambiador de pestañas.

## La forma de la 2.x

`computePowerScore(game, history, winProbabilityHistory)` sigue funcionando y devuelve el resultado plano de la 2.x, sin impulsos de momento. Es la llamada correcta si solo quieres el número de siempre. [La referencia de la API](/arenaswap/docs/powerscore/api-reference/#the-2x-api) enumera todo lo que sigue ahí.
