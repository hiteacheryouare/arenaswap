---
sourceHash: '40ee38646993'
title: Tipos de TypeScript de PowerScore
description: Todos los campos de Game, ScoringContext, ScoreOptions, PowerScore y los tipos de modo y configuración, cuáles son opcionales y qué pasa cuando falta uno opcional.
section: powerscore
order: 7
navLabel: Tipos
---

Los tipos de PowerScore 3 se dividen en tres grupos. Lo que le pasas a `scoreGame`: [`Game`](#game), [`ScoringContext`](#scoringcontext) y [`ScoreOptions`](#scoreoptions). Lo que recibes: [`PowerScore`](#powerscore). Y de qué se compone un modo: [`PowerScoreMode`](#powerscoremode) y sus partes. Los tipos de la 2.x están al final, todavía exportados y funcionando.

## Game

El estado del partido en este momento. Solo `id`, `league`, `sportType` y los dos marcadores de equipo son obligatorios. Todo lo demás afina la puntuación cuando está presente. Cada campo opcional que falta se trata como desconocido, no como un valor predeterminado.

`Game` es genérico sobre el id de liga: `Game<League extends string = LeagueId>`. Un `Game` a secas significa lo que siempre significó. Un feed con sus propios ids de liga usa `Game<string>`.

| Campo | Tipo | Si falta |
|---|---|---|
| `id` | `string` | Obligatorio. |
| `league` | `League` | Obligatorio. Un id que `leagueConfigMap` no reconoce se califica con los valores predeterminados de su deporte (consulta [Configuración de deportes y ligas](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship)). |
| `sportType` | `SportType` | Obligatorio. Un valor que `sportTypeConfigMap` no reconoce recurre al ajuste del basquetbol. |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | Obligatorio. |
| `period?` | `number` | La presión de la recta final se lee como `0`. La Igualdad sigue puntuando, pero el avance del partido también se lee como `0`, así que paga solo su piso fijo y no el valor completo del nivel. |
| `clockSeconds?` | `number` | Se trata como desconocido, no como `0:00`. La subida de la recta final se queda al inicio del periodo, y todo impulso condicionado al reloj paga 0. |
| `intermission?` | `boolean` | `false`. Con `true` el partido se congela: todo puntúa 0 hasta que se reanude el juego. |
| `delayed?` | `boolean` | `false`. Con `true` el partido se congela, igual que con `intermission`. |
| `status?` | `'pre' \| 'in' \| 'post'` | Los impulsos no pagan nada con algo distinto de `'in'`, incluido un valor ausente. Las señales no lo leen. |
| `topOfInning?` | `boolean` | Béisbol y softbol. Puntúa entre los valores de Igualdad de la parte alta y la parte baja de la entrada. La carrera de la ventaja y el no-hitter lo necesitan. |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | Béisbol y softbol. Se trata como sin corredores. |
| `outs?` | `number` | Béisbol y softbol. Se trata como 0. Con 3, los impulsos basados en corredores no pagan nada. |
| `possession?` | `'home' \| 'away'` | Fútbol americano, o el disco donde un feed lo reporta. Sin él, el ataque de dos minutos paga 0 y Fantasy no tiene situación de fútbol americano. |
| `yardsToEndZone?` | `number` | Fútbol americano. Las yardas que necesita el equipo con el balón. Lo necesitan el ataque de dos minutos y Fantasy. |
| `isRedZone?` | `boolean` | Solo fútbol americano. Con `false` o ausente, el caso de zona roja del impulso de oportunidad de anotar paga 0. |
| `down?` | `number` | Solo fútbol americano. Cae al multiplicador sin ponderar (×1) en lugar de perder el impulso por completo. En el ataque de dos minutos y en Fantasy, un `down` menor que 1 se lee como entre jugadas. |
| `distance?` | `number` | Solo fútbol americano. En tercer down, un valor ausente no puede calificar como tercera y corta, así que cae a ×1. |
| `isGoalToGo?` | `boolean` | Solo fútbol americano, y solo cambia algo en cuarto down. |
| `series?` | [`SeriesState`](#seriesstate) | Sin serie, así que lo que está en juego se lee como nada. |
| `redCards?` | [`RedCard[]`](#redcard) | Fútbol. Sin tarjetas. |
| `seasonType?` | `'regular' \| 'postseason'` | Lo que está en juego trata el partido como postemporada cuando esto lo dice o `postseasonRound` está definido, y como temporada regular en cualquier otro caso. |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | Sin impulso de postemporada. `0` define el título, `1` es una semifinal, `2` unos cuartos de final y `3` cualquier ronda anterior. |

`SportId` es un alias obsoleto de `LeagueId`, que se conserva por compatibilidad con la 1.x. Usa `LeagueId`.

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

| Campo | Si falta |
|---|---|
| `score` | Obligatorio. |
| `abbreviation` | Nombra al equipo en los motivos cuando también falta `nickname`, y aparece como `?` cuando faltan los dos. |
| `nickname` | Como llaman los motivos al equipo: "Lakers", "Nittany Lions" o el nombre corto de un club de fútbol como "Portland". Recurre a `abbreviation`. |
| `rank` | El equipo no está rankeado. Omítelo también para el sembrado de un cuadro: es un lugar en un ranking de encuesta, donde 1 es el mejor. Lo que está en juego lo necesita en los dos equipos. |
| `hits` | Béisbol y softbol. Sin conteo de hits, así que el no-hitter no puede pagar. `0` es un valor real: significa un equipo sin hits. |
| `errors` | Béisbol y softbol. Hoy ninguna puntuación lo lee. |
| `timeouts` | Fútbol americano. El ataque de dos minutos usa un peso neutro para el control del reloj. |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

Una serie más corta que un al mejor de 3 no paga nada.

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

Todo lo que el partido en sí no trae. Todos los campos son opcionales, y `scoreGame` recibe el objeto completo como segundo argumento.

| Campo | Tipo | Si falta |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | Racha, Cambios de ventaja y el factor de Remontada se quedan en 0 hasta que tenga 3 entradas. La más antigua primero. |
| `onBreak?` | `boolean` | Quien llama detectó un corte comercial. Con `true` se restan `breakPenalty` (15) del subtotal de señales. Sin deducción por corte cuando falta. |
| `winProbability?` | `number[]` | Probabilidad de victoria del local a lo largo del partido, de 0 a 1. Necesita 5 valores finitos para importar. Sin modificador en otro caso. |
| `pregameLine?` | [`PregameLine`](#pregameline) | Alerta de sorpresa y Sorpresa pagan 0. |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | Sin lo que está en juego en la carrera. Consulta [`TeamStakes`](#teamstakes). |
| `powerPlay?` | `'home' \| 'away' \| boolean` | Sin power play en el impulso de oportunidad de anotar. Un lado cuando el feed dice de quién es, `true` cuando solo dice que hay uno. |
| `emptyNet?` | `'home' \| 'away' \| boolean` | Sin portería vacía en el impulso de oportunidad de anotar. Actívalo solo cuando el feed lo haya reportado en dos consultas seguidas. |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | Cambios de ventaja contados desde el registro de jugadas del propio feed, que ve los vuelcos entre consultas, con la hora del último. Se usa cuando cuenta más de lo que muestra `history`. Cambios de ventaja sigue necesitando las 3 capturas. |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | Fantasy no tiene jugadores, y el partido se califica como Clásico. |

### ScoreSnapshot

Un registro puntual del marcador de un partido, que sirve para detectar racha, cambios de ventaja y remontadas. Los cuatro campos son obligatorios.

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

`timestamp` solo tiene que ser relativo a las otras capturas del mismo arreglo. El decaimiento se mide contra la marca de tiempo de la captura más reciente, no contra la hora real. Repetir el mismo historial da el mismo resultado sin importar cuándo se repita.

### PregameLine

La línea tal como estaba antes del partido. Una línea en vivo se mueve con el marcador y borraría una sorpresa.

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

`spread` son los puntos que se le dieron al favorito, como número positivo, y solo lo leen el basquetbol y el fútbol americano. Con las dos líneas de dinero, el margen de la casa de apuestas se elimina antes de usarlas. `drawMoneyline` es la línea de tres resultados del fútbol. Una línea de carreras o una línea de gol por sí sola dice quién es el favorito pero no por cuánto, así que no basta.

### TeamStakes

Banderas de la carrera de fin de temporada de un equipo, solo en temporada regular.

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

`canClinch` significa que ganar este partido asegura un lugar, una división o un título pase lo que pase. `canBeEliminated` significa que perder deja al equipo fuera de la contienda. `inRace` significa que sigue en la pelea, ni a salvo ni eliminado. `nearLine` es estar a pocos puntos de una línea de la tabla.

### FantasyPlayerState

Un jugador de tu plantilla en un partido.

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

`FantasyPosition` es `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'`: posiciones de fútbol americano, un pitcher y un bateador para el béisbol, y un jugador genérico en los demás. `name` aparece en los motivos, como "Mahomes en la zona roja". `active: false` significa que el feed dice que el jugador salió del partido, y no cuenta para nada. `role` es solo de béisbol: dónde está el jugador en la entrada. `pointEvents` son los puntos de fantasy tal como llegaron, así que la producción reciente se desvanece como cualquier otro evento.

## ScoreOptions

Cómo puntuar. Todos los campos son opcionales, y `scoreGame` recibe el objeto como tercer argumento.

| Campo | Tipo | Qué hace |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | Qué modo califica el partido. Clásico cuando falta. |
| `disabledSignals?` | `readonly string[]` | Ids de señal del modo que se apagan. Las demás se reescalan al rango completo del modo. |
| `classicDisabledSignals?` | `readonly string[]` | Ids de señal que se apagan en Clásico cuando se mezcla o se usa como piso. |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | Sustituye la mezcla propia del modo, como el control de Fantasy de un espectador. |
| `favoriteTeamCount?` | `number` | Cuántos equipos favoritos hay en el partido. |
| `favoriteBoostPoints?` | `number` | Puntos por equipo favorito. |
| `postseasonBoostPoints?` | `number` | Puntos de un partido que define el título. Las rondas anteriores reciben una parte. |
| `gameBoost?` | `number` | Un impulso manual. Lo único que puede empujar el total por encima de 100. |
| `sport?` | `Partial<SportTypeConfig>` | Para deportes que las tablas integradas no cubren, o para ajustarlas. |
| `league?` | `Partial<LeagueConfig>` | Para ligas que la tabla integrada no conoce. Define `regularPeriods` y `periodDurationSecs`. |

## PowerScore

Lo que devuelve `scoreGame`.

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
| `modeId` | El modo que de verdad calificó el partido. Un modo que no aplica, como Fantasy sin ningún jugador de tu plantilla en el partido, recurre a `'classic'`. |
| `total` | De 0 a 100, y por encima de 100 solo mediante `gameBoost`. |
| `signals` | Cada señal que define el modo, con su tope, incluso en 0. Consulta [`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment). |
| `signalsSubtotal` | La suma de las señales activadas antes de cualquier reescalado por señales desactivadas. |
| `scaledSubtotal` | Lo mismo después del reescalado, limitado a `signalCeiling`. |
| `signalCeiling` | La suma de los topes del modo: 156 en Clásico. |
| `frozen` | `true` en el descanso, en un intermedio o en una demora. Todo puntúa 0 y `reason` queda vacío. |
| `onBreak`, `breakPenalty` | Si se aplicó una deducción por corte comercial y cuántos puntos quitó (siempre ≥ 0). Con una puntuación congelada son `false` y `0`. |
| `winProbabilityVariance?` | De −5 a +5. Ausente, no `0`, cuando faltan datos de probabilidad de victoria. |
| `baseTotal` | Las señales menos la deducción por corte más el modificador, de 0 a 100, antes de cualquier impulso. |
| `classicTotal?` | El total propio de Clásico, cuando el modo se mezcla con él. |
| `blend?` | Cómo llegó a su total un modo mezclado. Consulta [`BlendResult`](#blendresult). |
| `boosts` | Cada impulso que paga el modo, en 0 cuando no está pagando. Más `favoriteBoost`, `postseasonBoost` y `gameBoost` una vez que los pides. |
| `reasons` | Hasta tres oraciones de datos simples, como fragmentos listos para traducir: qué está pasando ahora mismo, qué acaba de pasar, el marcador y la hora, y qué hay en juego. Consulta la [tabla de motivos del README](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/powerscore/README.md#reasons) para ver todas las claves. |
| `reason` | Lo mismo en inglés, como oraciones. Es texto para mostrar, no una API: puede cambiar de redacción entre versiones. No te bases en él. |

### ScoredSignal, ScoredBoost y ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number>; details?: ReasonFragment[] }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

`meta` en un impulso lleva lo que una interfaz podría querer decir, como `{ inning: 8 }` en un no-hitter o `{ secondsLeft: 95, trailBy: 3 }` en un ataque de dos minutos. Un fragmento de motivo se ve así: `{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } }`. Las claves de motivo que conocen los modos integrados se muestran en inglés en `reason`. Una clave tuya se muestra tal cual, así que traduce a partir de `reasons`, no de la cadena.

`details` en un impulso dice qué está pasando en este partido por lo que el impulso paga, o no, como fragmentos de motivo para que una interfaz los traduzca: `{ key: 'seriesClinch', params: { team: 'CHW' } }` en lo que está en juego, o un portero sacado y un power play juntos en un 6 contra 4 de hockey. Está ausente cuando no hay nada que decir, como antes de que empiece un partido o mientras el juego está detenido. Estas claves no tienen un renderizador en inglés; la tabla de abajo lista cada una de las que mandan los impulsos integrados, con la oración que ArenaSwap muestra para ella.

| Impulso | Clave | Parámetros | En inglés |
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

Un modo es una lista de señales más los impulsos que le van. Constrúyelo con [`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode), que lo revisa una sola vez, al inicio.

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
| `signals`, `boosts` | En el orden en que se muestran. |
| `bucketCaps` | Lo máximo que puede sumar junto un grupo de impulsos. Los impulsos anteriores de la lista se pagan primero. |
| `reasonPriority` | Ids de señal cuyos motivos pueden leerse, los que más vale la pena leer primero. La más fuerte da la oración de "qué acaba de pasar"; el orden desempata. |
| `usesBreakPenalty`, `usesWinProbability` | Si aplican la deducción por corte comercial y el modificador de ±5. |
| `classicBlend` | Cómo se combina el modo con Clásico. |
| `paysPostseason?` | `false` retiene el impulso de postemporada en este modo. El valor predeterminado es `true`. Palizas lo pone en `false`, porque una paliza de playoffs ya tiene decidido su resultado. |
| `appliesTo` | Devuelve `false` para un partido sobre el que el modo no tiene nada que decir, y el partido se califica como Clásico. |

### SignalDefinition y BoostDefinition

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

Los `points` de una señal se limitan a su `ceiling`. Un impulso no tiene tope propio, pero su grupo puede tener uno.

### SignalInput

Lo que recibe `compute`.

| Campo | Significado |
|---|---|
| `game`, `context` | Lo que se le pasó a `scoreGame`. |
| `sport`, `league` | El [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig) y el `LeagueConfig` ya resueltos, después de cualquier sustitución en `options`. |
| `progress` | 0 al inicio del partido, 1 al final del tiempo reglamentario y durante el tiempo extra. |
| `now` | La marca de tiempo de la captura más reciente de `history`, o 0 si no hay ninguna. |
| `margin` | El margen absoluto del marcador. |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

Palizas usa un piso con un factor de 0.3. Fantasy usa un impulso con un peso de 0.6, así que los partidos de tus jugadores solo pueden subir por encima de su puntuación Clásica. Los modos integrados no usan `mix`, pero está ahí para tus propios modos.

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

`score.blend` trae uno cuando un modo se mezcló con Clásico, para que un desglose pueda mostrar la aritmética.

## SportTypeConfig y LeagueConfig

`SportTypeConfig` guarda todo sobre cómo se juega un deporte. Eso incluye los umbrales de igualdad, los umbrales de racha y remontada, las vidas medias de decaimiento, si el deporte tiene reloj y (solo béisbol y softbol) una `lateGameCurve`. `LeagueConfig` guarda cuánto duran los periodos de una liga específica: `id`, `label`, `sportType`, `regularPeriods`, `periodDurationSecs` y `periodFormat`. También trae campos que ArenaSwap usa para sus propias consultas y barras de calendario, que el calificador no lee.

Algunos campos son opcionales, y solo algunas entradas los definen: `lateGameCurve` (béisbol y softbol), `clockIsFullGameElapsed` (fútbol), `zeroZeroPenaltyPeriods` (hockey y fútbol) y `knockoutRunMinutes` (los dos Mundiales y los dos torneos olímpicos de fútbol). Con `options.sport` y `options.league` puedes pasar cualquier subconjunto como `Partial` para sustituir uno en cada llamada. El significado de cada campo y los valores reales de todos los deportes y ligas están en [Configuración de deportes y ligas](/arenaswap/docs/powerscore/configuration/).

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

Solo el béisbol y el softbol definen `SportTypeConfig.lateGameCurve`. Los deportes con reloj derivan su subida de la recta final directo de `period` y `clockSeconds`, y dejan el campo en `undefined`. Un deporte con reloj no tiene nada más que configurar aquí, así que por ahora el tipo tiene una sola forma.

## ScorerTunables

El único objeto exportado que guarda cada valor de nivel con el que el motor puntúa. Es una constante completamente poblada, no una configuración parcial.

| Rama | Contiene |
|---|---|
| `scores.closeness` | Los topes de nivel de la igualdad (`tied`, `tight`, `zeroZero`, `close`, `fringe`, `none`). Consulta [la señal de igualdad de Clásico](/arenaswap/docs/powerscore/signals/#closeness). |
| `scores.closenessFlatFloor` | El piso fijo que paga cada nivel de igualdad antes de escalar por avance. |
| `scores.lateGame` | Los topes de la recta final, el pre-impulso de tiempo extra y el toque del periodo anterior. Consulta [Presión de la recta final](/arenaswap/docs/powerscore/signals/#late-game-pressure). |
| `scores.momentum` | Los dos valores de nivel de la racha. Consulta [Racha](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor). |
| `scores.leadChanges` | Los dos valores de nivel de los cambios de ventaja. |
| `scores.comeback` | Los dos valores de nivel de la remontada y su piso fijo. |
| `scores.winProbabilityVariance` | `maxAvgDist` y `minDataPoints`, tabulados en [Impulsos y penalizaciones](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance). |
| `reasons` | Solo `fallback` ("best game available"), el motivo al que recurre el resultado plano obsoleto. La redacción en inglés vive en `renderReasonEnglish`. |

## FantasyRule y FantasySport

Los tipos detrás de [`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints).

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

`min` y `max` son los límites que una pantalla de ajustes puede imponer, y `resolveFantasyScoring` limita una sustitución a ellos.

## SportType y LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

`SportType` es una unión cerrada. `LeagueId` son las 31 ligas con ajuste integrado, pero no limita a un `Game`: la `league` de un partido puede ser cualquier cadena con `Game<string>`, y un id que la tabla no conoce se califica con los valores predeterminados de su deporte. La lista completa de los 31 ids de liga está en [Configuración de deportes y ligas](/arenaswap/docs/powerscore/configuration/). También está disponible en tiempo de ejecución como `allLeagueIds`.

## PowerScoreResult (2.x)

Obsoleto, todavía exportado y funcionando. La salida plana de `computePowerScore`, y la forma de la que `normalizePowerScoreResult` acepta una versión parcial. `scoreGame` no la devuelve.

| Campo | Tipo | Si falta |
|---|---|---|
| `gameId` | `string` | Obligatorio en todos los lugares donde aparece este tipo. |
| `total` | `number` | Lo define `computePowerScore`. De 0 a `scoreMaxTotal` (100), salvo que se produzca con `normalizePowerScoreResult` y `allowTotalOverflow`. |
| `closeness` | `number` | De 0 a `scoreMaxCloseness` (42). |
| `lateGame` | `number` | De 0 a `scoreMaxLateGame` (38). |
| `momentum` | `number` | De 0 a `scoreMaxMomentum` (38). |
| `leadChanges` | `number` | De 0 a `scoreMaxLeadChanges` (18). |
| `comeback` | `number` | De 0 a `scoreMaxComeback` (20). |
| `winProbabilityVariance?` | `number` | De −`scoreWinProbVarianceMax` a `scoreWinProbVarianceMax` (±5). Ausente, no `0`, cuando no se dio historial de probabilidad de victoria o se pudo usar muy poco. |
| `reason` | `string` | Recurre a `scorerTunables.reasons.fallback` ("best game available") cuando falta o no es una cadena. |
| `onBreak?` | `boolean` | Ausente se lee como `false`. `normalizePowerScoreResult` lo pasa tal cual cuando es booleano. |
| `breakPenalty?` | `number` | Puntos restados, siempre ≥ 0. Ausente, no `0`, cuando no se dio ninguno. `computePowerScore` no lo define. |
| `signalsSubtotal?` | `number` | La suma de las cinco señales antes de la penalización por corte, de 0 a `scoreMaxSignalsSubtotal` (156). |
| `favoriteBonus?`, `favoriteTeamCount?`, `gameBoost?`, `scoringOpportunityBoost?`, `postseasonBoost?` | `number` | `computePowerScore` no los calcula. Ausentes a menos que quien llama los dé. |

`scoreGame` suma por ti los impulsos de favorito, de postemporada y del partido, así que nunca necesitas armar un `PowerScoreResult` a mano con él. Todo lo que la 2.x todavía exporta está en [la referencia de la API](/arenaswap/docs/powerscore/api-reference/#the-2x-api).
