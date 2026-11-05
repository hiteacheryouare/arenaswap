---
sourceHash: '91a61d4e6782'
title: Referencia de la API de PowerScore
navLabel: Referencia de la API
description: Cada función y constante que exporta powerscore, con su firma, parámetros, valor devuelto y comportamiento cuando falta una entrada o es inválida. Incluye la API obsoleta de la 2.x.
section: powerscore
order: 6
---

Todo lo de aquí se exporta desde la raíz del paquete: `import { ... } from 'powerscore'`. Primero van las funciones de la 3.0, luego los auxiliares, las piezas de las que están hechos los modos integrados, las constantes y, al final, la API de la 2.x, que está obsoleta pero funciona exactamente como antes. Los tipos están en [los tipos de TypeScript de PowerScore](/arenaswap/docs/powerscore/types/).

## Puntuación

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

El punto de entrada principal. Califica un partido en un modo y devuelve un [`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore): el total, cada señal e impulso como lista, y los motivos.

| Parámetro | Predeterminado | Notas |
|---|---|---|
| `game` | obligatorio | El estado actual del partido. Solo `id`, `league`, `sportType` y los dos marcadores son obligatorios. |
| `context` | `{}` | Historial, probabilidad de victoria, la línea de antes del partido, la plantilla de fantasy y el resto de lo que el partido no trae. Consulta [`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext). |
| `options` | `{}` | Qué modo, qué señales apagar y los impulsos de favorito, de postemporada y manual. Consulta [`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions). |

Nunca lanza un error por un campo opcional ausente: la parte del motor que lo necesita puntúa 0. Una `league` no reconocida se califica con los valores predeterminados de su deporte. Un valor no finito en cualquier parte de las entradas se trata como ausente, en lugar de propagarse como `NaN`.

Un partido congelado (`intermission` o `delayed`) puntúa 0 en todo, incluido cada impulso, y `reason` queda vacío. `game.status` solo lo leen los impulsos, que no pagan nada a menos que sea `'in'`.

El total se arma en un orden fijo:

1. Se califican las señales. Las desactivadas se reescalan fuera.
2. Se resta la deducción por corte.
3. Se suma el modificador de probabilidad de victoria (solo Clásico). El resultado se limita de 0 a 100.
4. Se suman los impulsos propios del modo, dentro de los topes de sus grupos, y el total se limita a 100.
5. Si el modo se mezcla con Clásico (piso, mezcla o impulso), ocurre aquí.
6. Se suman los impulsos de favorito y de postemporada, y el total se vuelve a limitar a 100. Un modo con `paysPostseason: false` se salta el impulso de postemporada.
7. `gameBoost` se suma al final. Es lo único que puede pasar de 100.

```ts
const score = scoreGame(game, { history }, { mode: 'blowouts' });
score.total;  // 0–100
score.reason; // 'BOS on a 12–0 run. Up 28 in the 3rd quarter'
```

### signalPoints y boostPoints

```ts
function signalPoints(score: Pick<PowerScore, 'signals'>, id: string): number
function boostPoints(score: Pick<PowerScore, 'boosts'>, id: string): number
```

Buscan una entrada de un resultado por id. Las dos devuelven `0` para un id que no está.

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

Arma el [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput) que recibe el `compute` de una señal o un impulso: el partido, el contexto, la configuración de deporte y de liga ya resuelta, `progress`, `now` y `margin`. Es lo que `scoreGame` llama internamente, exportado para que una señal que escribas se pueda probar por separado.

## Modos

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

Revisa un modo una sola vez, al inicio, y lo devuelve sin cambios. Lanza un error si dos señales comparten un id, si el tope de una señal no es positivo o si el modo no tiene señales.

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

El `compute` de una señal recibe el partido, el contexto, la configuración de deporte y de liga ya resuelta, el `progress` del partido (0 al inicio, 1 al final del tiempo reglamentario y durante el tiempo extra) y el `margin`. Devuelve `points`, limitados al tope, y un `reason` opcional. Un modo también puede traer `boosts`, `bucketCaps`, un `classicBlend`, `paysPostseason` (`true` por omisión; `false` retiene el impulso de postemporada) y un `appliesTo(game, context)` que manda a Clásico los partidos sobre los que no tiene nada que decir.

`reasonPriority` lista las señales cuyos motivos pueden leerse. La más fuerte habla, y el orden desempata. Una clave de motivo que conocen los modos integrados se muestra en inglés en `score.reason`. Una clave tuya se muestra tal cual, así que traduce a partir de `score.reasons`, no de la cadena.

### classicMode, blowoutsMode, fantasyMode, builtInModes y getMode

`classicMode`, `blowoutsMode` y `fantasyMode` son los tres objetos `PowerScoreMode` integrados. `builtInModes` son los mismos tres indexados por id, y `getMode(idOrMode)` resuelve un id, un objeto de modo o nada (lo que da Clásico). Expande uno para construir sobre él. Para obtener Clásico sin los impulsos de la 3.0:

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### Señales e impulsos

Las piezas de las que están hechos los modos integrados también se exportan, para que un modo personalizado pueda reutilizarlas:

| Exportación | Qué es |
|---|---|
| `classicSignals`, `blowoutsSignals`, `fantasySignals` | La lista de señales de cada modo. |
| `closenessSignal`, `lateGameSignal`, `momentumSignal`, `leadChangesSignal`, `comebackSignal` | Las cinco de Clásico, una por una. |
| `scoringOpportunityBoost`, `goAheadRunBoost`, `twoMinuteDrillBoost`, `noHitterBoost`, `redCardBoost`, `upsetWatchBoost`, `upsetRoutBoost`, `stakesBoost` | El `BoostDefinition` de cada impulso. Lo que paga cada uno está en [Impulsos y penalizaciones](/arenaswap/docs/powerscore/boosts-and-penalties/). |
| `underdogProbability(line, sportType, league)` | La probabilidad del sotanero antes del partido, a partir de un `PregameLine`. `undefined` cuando la línea no lo puede decir. |
| `postseasonBoostShare(round)` | La parte del impulso de postemporada que gana una ronda: 1, 0.75, 0.5, 0.25 o 0 sin ronda. |
| `applyProgressFloor`, `findLeadChanges` | Los dos auxiliares detrás de la igualdad y los cambios de ventaja. |
| `baseMask(baseRunners)`, `runnersOn(mask)` | Las bases como un número de 3 bits, con la primera base como el bit menos significativo (`0b101` son corredores en primera y tercera), y cuántos corredores son. |

## Motivos

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

Muestran una oración de motivo, o una lista de ellas unidas en oraciones, en inglés. Es lo que llena `score.reason`. Úsalas cuando armes motivos propios y quieras que se lean igual. `ordinal(n)` da el ordinal en inglés que usan ("2nd", "11th", "21st").

## Configuración y avance

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

`resolveSportConfig` y `resolveLeagueConfig` hacen lo que hace `scoreGame` al inicio de cada llamada. Un `sportType` desconocido recurre al ajuste del basquetbol. Una liga desconocida recurre a la liga más conocida de su deporte: la NBA para basquetbol, la NHL para hockey, la MLB para béisbol, la NFL para fútbol americano, el softbol de la NCAA y la MLS para futbol. `getGameProgress` es 0 al inicio, 1 al final del tiempo reglamentario y durante el tiempo extra. `scoreMargin` es la diferencia absoluta del marcador.

## Puntuación de fantasy

La señal de Puntos fantasy de Fantasy quiere puntos de fantasy. Estas funciones convierten una línea de boxscore en ellos. Tú nombras las estadísticas, ellas las puntúan.

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

Devuelve el total de una línea de estadísticas, redondeado a dos decimales. Las estadísticas desconocidas y los valores no finitos se ignoran. Los `pointsAllowed` de una defensiva se puntúan por nivel.

```ts
import { computeFantasyPoints } from 'powerscore';

computeFantasyPoints('football', {
	passingYards: 310,
	passingTouchdowns: 3,
	interceptionsThrown: 1,
	rushingYards: 22,
}); // 12.4 + 12 − 2 + 2.2 = 24.6
```

### defaultFantasyScoring, resolveFantasyScoring y fantasySportOf

`defaultFantasyScoring` guarda las reglas predeterminadas para `'football'` (PPR completo), `'basketball'`, `'baseball'` y `'hockey'`. Cada regla es `{ points, min, max }`, para que una pantalla de ajustes pueda imponer los límites.

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

`resolveFantasyScoring(sport, overrides?)` devuelve las reglas como números simples. Una sustitución se limita a los límites de su regla, y una regla que no existe se ignora.

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

`fantasySportOf(sportType)` asigna un `sportType` a uno de los cuatro deportes de fantasy. El softbol cuenta como béisbol, y el futbol no tiene ninguno, así que devuelve `undefined`.

## Constantes

| Constante | Valor |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156 (la suma de los cinco topes de Clásico) |
| `scoreMaxTotal` | 100 |
| `breakPenalty` | 15, la deducción fija mientras `context.onBreak` es `true` |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

Por qué los topes de Clásico rebasan el límite de 100 puntos se explica en [Señales de PowerScore en cada modo](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total). Los topes se explican en [Impulsos y penalizaciones](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets).

`scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` y `thirdAndShortDistance` guardan los valores exactos detrás del impulso de oportunidad de anotar, tabulados en [Impulsos y penalizaciones](/arenaswap/docs/powerscore/boosts-and-penalties/). Los impulsos más nuevos guardan sus números en `goAheadRunTunables`, `twoMinuteDrillTunables`, `noHitterTunables`, `redCardTunables`, `upsetTunables`, `stakesTunables` y `hockeyTunables`.

`scorerTunables` guarda cada valor de nivel con el que puntúa el motor, los mismos números que las constantes de arriba ya dan por nombre, para que un consumidor pueda leer el valor de un nivel en lugar de escribirlo a mano.

`sportTypeConfigs`, `sportTypeConfigMap`, `leagueConfigs`, `leagueConfigMap` y `allLeagueIds` guardan el ajuste de deportes y ligas que el motor lee en cada llamada. Sus campos y los valores reales de todos los deportes y ligas están en [Configuración de deportes y ligas](/arenaswap/docs/powerscore/configuration/).

## La API de la 2.x

Todavía se exporta, todavía funciona y está marcada como obsoleta donde se indica. Nada de esto se eliminó en la 3.0. Pásate a `scoreGame` cuando quieras modos o los impulsos nuevos. Mientras tanto, esto devuelve los números de siempre.

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	winProbabilityHistory?: number[],
): PowerScoreResult
```

Obsoleta. Califica las cinco señales de Clásico, aplica el modificador de probabilidad de victoria y devuelve el `PowerScoreResult` plano (`closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`, `total`, `reason` y compañía). Es `scoreGame` en Clásico solo con las señales, aplanado, así que no incluye ninguno de los impulsos de momento.

| Parámetro | Predeterminado | Notas |
|---|---|---|
| `game` | obligatorio | El estado actual del partido. |
| `history` | `[]` | Capturas recientes del marcador. Racha, cambios de ventaja y remontada se quedan en 0 hasta que tenga al menos 3 entradas. |
| `winProbabilityHistory` | `[]` | Valores recientes de probabilidad de victoria, de 0 a 1. Necesita al menos 5 entradas finitas para aportar algo. |

Nunca lanza un error. Devuelve de inmediato un resultado de puros ceros cuando `isPlayFrozen(game)` es true. No revisa `game.status`: un partido `'pre'` o `'post'` puntúa igual que uno `'in'`, con los mismos demás campos.

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

Obsoleta: el número está en la lista `boosts` de `scoreGame` como `scoringOpportunity`. Devuelve `0` a menos que `game.status === 'in'` y el partido no esté congelado. En otro caso devuelve de 0 a 10 para béisbol y softbol, según los corredores, o de 0 a 15 para fútbol americano, según el margen en la zona roja y el down. Devuelve `0` para cualquier otro `sportType`, hockey incluido, porque su power play y su portería vacía vienen de `context`, que esta función no recibe. No se incluye en el `total` de `computePowerScore`.

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

Convierte un historial de probabilidad de victoria en el modificador de ±5. Primero filtra las entradas no finitas, y luego devuelve `undefined` si quedan menos de 5 valores finitos. En otro caso devuelve un entero de `-scoreWinProbVarianceMax` a `scoreWinProbVarianceMax`.

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

Devuelve `true` cuando `game.intermission === true` o `game.delayed === true`, y `false` en cualquier otro caso, incluido cuando faltan los dos campos.

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

Qué tan avanzado va el tiempo reglamentario del partido, de 0 a 1, a partir del mismo reloj que lee la señal de la recta final. Útil para dibujar un partido en una línea de tiempo.

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

Obsoleta. Toma un `PowerScoreResult` parcial, posiblemente no confiable (solo `gameId` es obligatorio) y devuelve uno válido y totalmente limitado. `computePowerScore` la llama internamente en cada resultado que produce.

Cada uno de los cinco campos de señal se limita a su propio tope. `total` se limita a `scoreMaxTotal` a menos que `options.allowTotalOverflow` sea `true`. Con esa opción, solo se limita a un mínimo de `0`, lo que deja que un impulso manual lo empuje más allá de 100 a propósito. Un `total` ausente o no finito recurre a la suma de las cinco señales menos `breakPenalty`, no a la suma cruda. `reason` recurre a `scorerTunables.reasons.fallback` ("best game available") cuando no es una cadena. `favoriteBonus`, `favoriteTeamCount`, `gameBoost`, `scoringOpportunityBoost` y `postseasonBoost` se redondean y se limitan a un mínimo de `0` cuando se dan. Cuando no se dan, se omiten por completo del resultado, no se ponen en `0`. Nunca lanza un error.

### Qué cambia si te pasas

Clásico a través de `scoreGame` incluye los impulsos nuevos, así que el mismo partido puede puntuar más ahí que en `computePowerScore`, hasta los topes de los grupos. Los impulsos de favorito, de postemporada y manual que antes sumabas a mano alrededor de `normalizePowerScoreResult` ahora son opciones de `scoreGame`. Todo lo demás se mantiene. El tipo `Game` ganó campos opcionales y un parámetro de tipo para la liga, y un `Game` a secas significa lo que antes. Un id de liga que la tabla no conoce se calificaba antes con la configuración de la NBA sin importar el deporte. Ahora recibe los valores predeterminados de su propio deporte, así que un partido de hockey en una liga desconocida recibe los periodos y el reloj de la NHL.
