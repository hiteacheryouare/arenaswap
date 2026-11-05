---
sourceHash: '854afd07d71b'
title: Configuración de deportes y ligas
description: Cada campo de SportTypeConfig y LeagueConfig, sus valores predeterminados en los seis deportes y las 31 ligas, y cómo se define lo que es "cerrado" para un deporte.
section: powerscore
order: 5
navLabel: Configuración
---

`scoreGame` consulta dos mapas exportados al inicio de cada llamada. `sportTypeConfigMap`, indexado por `SportType`, guarda cómo se juega un deporte. `leagueConfigMap`, indexado por `LeagueId`, guarda cuánto dura cada periodo de una liga. Si los valores integrados no se ajustan a tus datos, puedes sustituir cualquiera de los dos en cada llamada con `options.sport` y `options.league`. [Ajústalo a tu propia liga](#tune-it-for-a-league-powerscore-doesnt-ship) muestra cómo.

## SportTypeConfig

Una entrada por `SportType`, exportada como `sportTypeConfigs` (un arreglo) y `sportTypeConfigMap` (indexado por `id`). Esta tabla tiene los valores reales de los seis deportes, y [qué significan los campos](#what-the-sport-fields-mean) va después. Clásico lee todo. Palizas lee `closenessMargins`, `momentumBigRun` y `momentumSmallRun`, la vida media del momentum y `historyWindowMs`.

| Campo | basketball | football | hockey | soccer | baseball | softball |
|---|---|---|---|---|---|---|
| `clockBased` | true | true | true | true | false | false |
| `closenessMargins` (t1, t2, t3) | 5, 10, 18 | 3, 9, 14 | 1, 2, 3 | 1, 2, 3 | 1, 3, 5 | 1, 3, 5 |
| `momentumBigRun` / `momentumSmallRun` | 8 / 4 | 10 / 4 | 2 / 1 | 2 / 1 | 3 / 1 | 3 / 1 |
| `comebackThresholdBig` / `comebackThresholdSmall` | 6 / 3 | 7 / 3 | 2 / 1 | 2 / 1 | 2 / 1 | 2 / 1 |
| `clockCountsUp` | false | false | false | true | false | false |
| `clockIsFullGameElapsed` | false | false | false | true | false | false |
| `zeroZeroAsFullTie` | false | false | true | true | false | false |
| `zeroZeroPenaltyPeriods` | ninguno | ninguno | 1, 2 | 1 | ninguno | ninguno |
| `otPreBoostWindowSecs` | 60 | 60 | 60 | 60 | 0 | 0 |
| `decayHalfLifeMs.momentum` | 45,000 | 135,000 | 180,000 | 240,000 | 150,000 | 150,000 |
| `decayHalfLifeMs.leadChange` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `decayHalfLifeMs.comeback` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `historyWindowMs` | 300,000 (5 min) | 720,000 (12 min) | 960,000 (16 min) | 1,200,000 (20 min) | 720,000 (12 min) | 720,000 (12 min) |
| `lateGameCurve` | ninguna | ninguna | ninguna | ninguna | 9 entradas, empieza en la 6 | 7 entradas, empieza en la 5 |

`historyWindowMs` es el tramo de historial del marcador que cada deporte necesita conservar para que funcionen la racha, los cambios de ventaja y la remontada. La señal Sostenida de Palizas se mide sobre la misma ventana. Equivale como mínimo a cuatro veces la vida media más larga del deporte. Ese margen deja que una señal se desvanezca por completo antes de salir de la ventana, sin importar cada cuánto consulte quien la llama.

### Qué significan los campos de deporte

| Campo | Significado |
|---|---|
| `clockBased` | El deporte tiene reloj de juego. El beisbol y el softbol no, así que la presión de la recta final corre por entradas. |
| `closenessMargins` | Los tres márgenes en los que baja la Igualdad: dentro de t1 es muy cerrado, dentro de t2 es cerrado, dentro de t3 es el límite, más allá de t3 no suma nada. Otras señales e impulsos los reutilizan, como el corte de paliza de la Remontada en t2 y la compuerta de Tiempo de Palizas más allá de t3. |
| `momentumBigRun`, `momentumSmallRun` | La racha neta dentro de la ventana de historial que paga el nivel completo y el nivel medio de la Racha. |
| `comebackThresholdBig`, `comebackThresholdSmall` | El vuelco que paga el nivel grande y el moderado de la Remontada. |
| `clockCountsUp` | El reloj muestra el tiempo jugado, no el tiempo restante. Solo el futbol. |
| `clockIsFullGameElapsed` | El reloj corre durante todo el partido (de 0' a 90'+) en lugar de reiniciarse cada periodo, así que los periodos completados se restan antes de calcular el tiempo restante. Solo el futbol. |
| `zeroZeroAsFullTie` | Un partido 0–0 recibe el crédito completo de empate en la Igualdad. Con `false`, el 0–0 recibe el nivel reducido `zeroZero`. |
| `zeroZeroPenaltyPeriods` | Periodos donde el 0–0 sigue recibiendo el nivel reducido aunque `zeroZeroAsFullTie` sea `true`. El hockey usa 1 y 2, el futbol el primer tiempo. |
| `otPreBoostWindowSecs` | Los últimos segundos del último periodo reglamentario en los que un partido empatado sube hacia el pre-impulso de tiempo extra. `0` lo apaga. |
| `decayHalfLifeMs` | Qué tan rápido se desvanecen la Racha, los Cambios de ventaja y la Remontada después de la última anotación. Más largo en deportes de pocas anotaciones, para que un gol los mantenga vivos hasta el siguiente. |
| `historyWindowMs` | Cuánto historial del marcador leen las señales de historial. Ver arriba. |
| `lateGameCurve` | Solo beisbol y softbol: cuántas entradas tiene el tiempo reglamentario y en qué entrada empieza la subida de la recta final. |

## LeagueConfig

Una entrada por `LeagueId`, exportada como `leagueConfigs` (un arreglo) y `leagueConfigMap` (indexado por `id`), además de `allLeagueIds` para la lista simple. `periodFormat` es solo texto para mostrar y no afecta la puntuación. Cada entrada también trae algunos campos que ArenaSwap usa para obtener datos y para saber cuánto ocupa un partido en una barra del calendario. El calificador no los lee, así que no están en la tabla.

| Liga | Deporte | Periodos | Duración del periodo |
|---|---|---|---|
| NBA (`nba`) | basketball | 4 | 720s |
| WNBA (`wnba`) | basketball | 4 | 600s |
| Basquetbol de la NCAA (`ncaab`) | basketball | 2 | 1200s |
| Basquetbol femenil de la NCAA (`ncaaw`) | basketball | 4 | 600s |
| Basquetbol varonil olímpico (`olybkm`) | basketball | 4 | 600s |
| Basquetbol femenil olímpico (`olybkw`) | basketball | 4 | 600s |
| NFL (`nfl`) | football | 4 | 900s |
| Futbol americano de la NCAA (`ncaaf`) | football | 4 | 900s |
| UFL (`ufl`) | football | 4 | 900s |
| NHL (`nhl`) | hockey | 3 | 1200s |
| Hockey varonil de la NCAA (`ncaamh`) | hockey | 3 | 1200s |
| Hockey sobre hielo varonil olímpico (`olymih`) | hockey | 3 | 1200s |
| Hockey sobre hielo femenil olímpico (`olywih`) | hockey | 3 | 1200s |
| MLB (`mlb`) | baseball | 9 entradas | 0 |
| Beisbol de la NCAA (`cbase`) | baseball | 9 entradas | 0 |
| Beisbol varonil olímpico (`olybb`) | baseball | 9 entradas | 0 |
| Clásico Mundial de Beisbol (`wbbc`) | baseball | 9 entradas | 0 |
| Softbol de la NCAA (`csoft`) | softball | 7 entradas | 0 |
| MLS (`mls`) | soccer | 2 | 2700s |
| Premier League de Inglaterra (`epl`) | soccer | 2 | 2700s |
| La Liga (`laliga`) | soccer | 2 | 2700s |
| Bundesliga (`bundesliga`) | soccer | 2 | 2700s |
| Serie A (`seriea`) | soccer | 2 | 2700s |
| Liga MX (`ligamx`) | soccer | 2 | 2700s |
| UEFA Champions League (`ucl`) | soccer | 2 | 2700s |
| UEFA Europa League (`uel`) | soccer | 2 | 2700s |
| NWSL (`nwsl`) | soccer | 2 | 2700s |
| Copa Mundial de la FIFA (`fifawc`) | soccer | 2 | 2700s |
| Copa Mundial Femenil de la FIFA (`fifawwc`) | soccer | 2 | 2700s |
| Futbol varonil olímpico (`olysocm`) | soccer | 2 | 2700s |
| Futbol femenil olímpico (`olysocw`) | soccer | 2 | 2700s |

31 ligas en total, las mismas 31 que tiene `LeagueId`.

## Cómo se define lo que es "cerrado" para un deporte

Una sola tupla, `closenessMargins: [t1, t2, t3]`, decide varias cosas de un deporte. Elige en qué nivel de igualdad cae un margen: muy cerrado en `t1`, cerrado en `t2`, límite en `t3`, fuera de alcance más allá. También elige el tope hacia el que sube la presión de la recta final, la banda en la que paga el impulso de zona roja del futbol americano, dónde empieza a pagar Palizas (dos anotaciones de diferencia, más allá de `t2`) y cuánto pesa lo que está en juego.

El `[5, 10, 18]` del basquetbol significa que un partido de 2 puntos es muy cerrado y uno de 9 puntos es cerrado. Un partido de 18 puntos es el último que todavía cuenta como límite. El `[1, 2, 3]` del hockey y el futbol trata un partido de 2 goles como el basquetbol trata uno de 9 puntos. Cambiar lo que significa "cerrado" para un deporte es cambiar una tupla, no un puñado de umbrales por separado.

## Ajústalo a una liga que PowerScore no incluye

`Game` es genérico sobre el id de liga, así que un feed con sus propios ids funciona tal cual: `Game<string>`. Una liga que la tabla no conoce se califica con los valores predeterminados de su deporte. Cada deporte se asigna a su liga más conocida para el número de periodos y el reloj:

| Deporte | Usa por defecto |
|---|---|
| Basquetbol | NBA |
| Hockey | NHL |
| Beisbol | MLB |
| Futbol americano | NFL |
| Softbol | Softbol de la NCAA |
| Futbol | MLS |

`sportType` es lo único que tienes que acertar. Rige la mayor parte de lo que hace una señal, sea cual sea la `league`. Un `sportType` no reconocido recurre por separado al ajuste de señales del basquetbol. Con ambos recursos, el partido igual se califica en lugar de lanzar un error.

Si los valores predeterminados no sirven para tu liga, sustitúyelos en cada llamada:

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

`options.league` acepta cualquier parte de un `LeagueConfig`, normalmente el número y la duración de los periodos. `options.sport` acepta cualquier parte de un `SportTypeConfig`, como los márgenes de igualdad, los umbrales de racha o las vidas medias. Las sustituciones aplican solo a esa llamada, y los mapas exportados quedan como estaban.

`sportTypeConfigMap` y `leagueConfigMap` son objetos exportados simples, que se leen en cada llamada y no desde una copia en caché. Mutarlos en tiempo de ejecución sí cambia la puntuación, pero nada en los tipos ni en las exportaciones del paquete lo trata como un punto de extensión compatible, y una versión futura no está obligada a mantenerlo. Usa las opciones.
