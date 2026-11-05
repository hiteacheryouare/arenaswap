---
sourceHash: '9c4dba756b81'
title: Impulsos y penalizaciones de PowerScore
navLabel: Impulsos y penalizaciones
description: Cada impulso y penalización que PowerScore 3 aplica sobre las señales de un modo, con la condición que activa cada uno, su máximo y los topes que comparten.
section: powerscore
order: 4
---

Las señales miden cómo va un partido. Los impulsos y las penalizaciones manejan las cosas más pequeñas, con forma de momento, que las señales no ven: un corredor en tercera en la 9.ª, un portero sacado, un sotanero de antes del partido que sigue vivo. Se suman encima de las señales y nunca sustituyen a ninguna.

Un impulso no paga nada mientras el partido no está en vivo (`status: 'in'`) o mientras el juego está congelado en un descanso, un intermedio o una demora. Cada uno se recalcula a partir del estado actual del partido en cada llamada, así que no hay nada que limpiar cuando pasa el momento.

Cada impulso que paga un modo aparece en `score.boosts` como `{ id, points, meta?, details? }`, donde `details` guarda los fragmentos de motivo que lo describen, en `0` cuando no está pagando. Búscalo con `boostPoints(score, 'noHitter')`.

## Qué modo conserva qué impulsos

| Modo | Impulsos |
|---|---|
| Clásico | Todos los impulsos de esta página, más el modificador de probabilidad de victoria y la deducción por corte comercial |
| Palizas | No-hitter y Sorpresa, más la deducción por corte comercial. Sin impulso de postemporada, porque una paliza de playoffs ya tiene decidido su resultado. |
| Fantasy | Ninguno, y sin deducción por corte |

Los impulsos de favorito, de postemporada y manual que están al [final de la página](#favorite-postseason-and-manual-boosts) aplican en todos los modos, salvo que Palizas se salta el de postemporada.

## Los impulsos de momento de Clásico

| Impulso | Id | Paga por | Máx. |
|---|---|---|---|
| [Oportunidad de anotar](#scoring-opportunity) | `scoringOpportunity` | Corredores en base, un avance de fútbol americano dentro de la zona roja, o un power play o portería vacía en hockey | 20 |
| [Carrera de ventaja en base](#go-ahead-run) | `goAheadRun` | La carrera de la ventaja o del empate en base en béisbol y softbol | 10 |
| [Ofensiva de dos minutos](#two-minute-drill) | `twoMinuteDrill` | Un equipo de fútbol americano con el balón, empatado o abajo por una anotación, en los minutos finales | 12 |
| [Tarjeta roja](#red-card) | `redCard` | Una expulsión en un partido de futbol empatado o a un gol de diferencia | 15 |
| [No-hitter](#no-hitter) | `noHitter` | Un partido de béisbol o softbol con un equipo todavía sin hits | 70 |
| [Alerta de sorpresa](#upset-watch) | `upsetWatch` | El sotanero de antes del partido adelante o a una anotación | 12 |
| [En juego](#stakes) | `stakes` | Una serie al borde, dos equipos rankeados, una carrera de fin de temporada | 10 |

Esos máximos son por impulso. La siguiente sección explica por qué no se apilan todos.

## Topes por grupo

Los impulsos comparten topes, para que muchas cosas pequeñas a la vez no empujen a un partido más allá de lo que ganaría un vuelco de una anotación en el último minuto.

| Grupo | Tope | Qué incluye | Por qué |
|---|---|---|---|
| Momentos | 20 | Oportunidad de anotar, carrera de ventaja, ofensiva de dos minutos, tarjeta roja | Un partido empatado en el silbatazo final puntúa cerca de 80 antes de los impulsos, así que un momento completo lo lleva a 100. Un último minuto a una anotación de diferencia queda en los 80 altos, y no todo partido cerrado se clava en 100. |
| No-hitter | 70 | No-hitter | Una racha dura entradas, no un momento, y tiene que subir un partido 6-0 por encima de los empatados. |
| Contexto | 16 | Alerta de sorpresa, en juego | Pueden darse juntos (un sotanero rankeado), pero juntos se quedan por debajo de un vuelco de una anotación al final, así que el contexto nunca supera a la acción en vivo. |

Dentro de un grupo, los impulsos que van antes en la tabla de arriba se pagan primero, y el tope recorta lo que sobre. Sorpresa, la versión de Palizas de la alerta de sorpresa, no tiene grupo.

## Oportunidad de anotar

Una amenaza de anotación que el marcador todavía no muestra.

**Béisbol y softbol**, según los corredores:

| Corredores en base | Impulso |
|---|---|
| Ninguno | 0 |
| Uno | 3 |
| Dos | 6 |
| Tres (bases llenas) | 10 |

No paga nada con 3 outs. Los corredores pueden quedarse en un marcador una consulta después del último out, y no puede pasar nada con ellos.

**Fútbol americano**, condicionado a qué tan cerrado ya esté el partido. Solo aplica cuando `isRedZone` es true.

| Margen | Valor base |
|---|---|
| Dentro de la banda de cerrado (fútbol americano: 9 puntos) | 10 |
| Dentro de la banda del límite (14 puntos) | 5 |
| Más allá | 0 |

El valor base se pondera luego por el down:

| Situación | Multiplicador |
|---|---|
| 4.º down y goal-to-go | ×1.5 |
| 4.º down (sin goal-to-go) | ×1.35 |
| 3.er down, 3 yardas o menos por avanzar | ×1.15 |
| Cualquier otro, incluido un `down` ausente | ×1 |

Un valor base de `0` sigue en `0` sin importar el down. Un impulso incondicional encima de una paliza desharía lo que la igualdad y la presión de la recta final ya calificaron correctamente como bajo. El goal-to-go solo sube el multiplicador en 4.º down, porque en un down anterior describe las probabilidades de anotar y no lo que decide la posesión.

**Hockey** paga por un [power play o una portería vacía](#power-play-and-empty-net).

Las constantes exportadas detrás de estas tablas son `scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` y `thirdAndShortDistance`.

### Power play y portería vacía

La oportunidad de anotar del hockey. Los dos leen `context`, porque vienen del feed de situación y no del marcador. Un 6 contra 4 es los dos a la vez, así que se suman y el tope de momentos mantiene la suma en 20.

**Portería vacía** paga en los últimos 4 minutos del 3.er periodo cuando el partido está a uno o dos goles de diferencia: **12** con un gol, **7** con dos. Cuando el feed dice de quién es la portería vacía, solo paga por la del equipo que va abajo. La portería vacía de quien va ganando significa una penalización diferida, y el portero regresa en segundos. Por la misma razón, define `context.emptyNet` solo cuando el feed lo haya reportado en dos consultas seguidas.

**Power play** paga en partidos empatados y a uno o dos goles. Al final (3.er periodo o después) paga más:

| Partido | Al final | Antes |
|---|---|---|
| Empatado | 10 | 4 |
| Un gol, el equipo que va abajo tiene la ventaja numérica | 10 | 4 |
| Un gol, el equipo que va ganando la tiene | 5 | 2 |
| Dos goles, el equipo que va abajo la tiene | 5 | 2 |
| Dos goles, el equipo que va ganando la tiene | 0 | 0 |

Cuando el feed solo dice que hay un power play, no de quién, el impulso supone que el equipo que va abajo tiene la misma probabilidad de tenerlo que de no tenerlo y paga un poco menos: 7 o 3 con un gol, 3 o 2 con dos.

## Carrera de ventaja en base

Béisbol y softbol. Necesita `baseRunners`, `topOfInning`, `outs` y `period`. Paga encima del conteo de corredores de arriba, y solo cuando el equipo al bate tiene en base la carrera que importa:

| En base | Paga |
|---|---|
| La carrera de la ventaja: empate con alguien en base, abajo por uno con dos en base, abajo por dos con las bases llenas | 8 |
| La carrera del empate: abajo por uno con uno en base, abajo por dos con dos en base, abajo por tres con las bases llenas | 5 |

Solo aplica la fila más alta. El valor base se pondera luego por la entrada:

- Antes de la 6.ª entrada (la 5.ª en softbol), la mitad. Una amenaza en la 3.ª es real, pero al partido le sobran entradas para responderla.
- De ahí a la última entrada reglamentaria, de 50% subiendo a 100%.
- Entradas extra, 100%.
- ×1.25 cuando es la última oportunidad: el equipo local al bate en la última entrada o después, donde la carrera de la ventaja es la del triunfo, o un equipo visitante que va abajo en la parte alta de ella, que puede no volver a batear.

El máximo es 10: un 8 con peso completo, por el aumento de última oportunidad. Con 3 outs no paga nada.

## Ofensiva de dos minutos

Fútbol americano. Necesita `possession`, `yardsToEndZone` y un `down` en vivo. Paga en el 4.º cuarto y en el tiempo extra, solo al equipo con el balón, y solo cuando todavía puede empatar o ganar con una anotación:

- **Empatado:** los últimos 2 minutos.
- **Abajo por una anotación** (8 puntos, o 9 en la UFL, donde un intento puede valer 3): los últimos 4 minutos.

Un equipo que deja correr el reloj con ventaja no paga nada. Tampoco un tiempo extra de la NCAA o la UFL, que no tiene reloj de partido.

Los 12 puntos se escalan por cuatro cosas: qué tan poco tiempo queda (completo a 40 segundos), la posición en el campo (completo desde la yarda 35 del rival, o 30 en el colegial, bajando a 40% en tu propia yarda 20), los tiempos fuera que quedan (85% con ninguno, 100% con tres, 92.5% cuando el feed no lo dice) y el margen (completo cuando está empatado o abajo por 1 o 2, bajando a 70% con 8 abajo). Entre jugadas, después de una anotación, un feed manda un down que no significa nada, y el impulso paga 0 hasta el siguiente snap.

## Tarjeta roja

Futbol. Necesita `redCards`, una lista de `{ side, minute }`. Una tarjeta roja en un partido empatado o a un gol de diferencia es de las cosas por las que un aficionado cambia de pantalla, y paga más justo después de que ocurre:

| Cuando salió la tarjeta | Paga |
|---|---|
| Empatado, o el equipo amonestado va ganando por uno | 10 |
| El equipo amonestado va perdiendo por uno | 7 |
| El equipo amonestado va ganando por dos | 5 |
| Cualquier margen mayor | 0 |

Paga completo durante 2 minutos de juego, y luego se desvanece a 0 hacia el minuto 10. Una segunda tarjeta para el mismo equipo paga 1.5 veces más, que es el máximo de 15. Se vuelve a revisar contra el marcador en cada consulta, así que un gol que abre el partido termina el impulso antes.

**Con diez hombres.** Una tarjeta roja también sube la [Igualdad](/arenaswap/docs/powerscore/signals/#closeness) en 4 puntos cuando el equipo con un hombre menos es el que protege una ventaja de un gol. Recibe gol con mucha más frecuencia que uno completo, así que el partido está más cerrado de lo que dice el marcador. Esto se mantiene mientras esa sea la situación, no solo diez minutos.

## No-hitter

Béisbol y softbol. Necesita `hits` en cada equipo, además de `period` y `topOfInning`. Un equipo sin hits paga por una **racha de no-hitter**, que empieza tarde y crece con cada entrada sin hits:

- **Empieza** después de la 5.ª entrada completa de un partido de 9 entradas, y después de la 3.ª en softbol.
- **Sube** con cada entrada completa sin hits: 10, 22, 38, y luego 52 y se queda ahí. Mientras el cuerpo de lanzadores que persigue la racha está en el campo, también suma puntos out por out, así que sigue creciendo dentro de una entrada.
- **Se reduce** 30% mientras ese cuerpo de lanzadores está en el dugout, porque no le está pasando nada a la racha. Las rachas de softbol se escalan a 60%.

Cuando los dos equipos están sin hits, la racha mayor paga completa y la otra a la mitad. El no-hitter tiene su propio tope de 70, fuera de los momentos, porque una racha dura entradas y tiene que subir un partido 6-0 por encima de los empatados.

## Alerta de sorpresa

Cualquier deporte. Necesita `context.pregameLine`, y tiene que ser la línea de antes del partido. Una línea en vivo se mueve con el marcador y borraría justo la sorpresa que quieres ver.

Paga cuando el sotanero de antes del partido va ganando, está parejo o está a una anotación, una vez pasada la mitad del partido. Tres cosas fijan el número, hasta un máximo de 12:

- **Momios.** Un partido de volado no paga nada. Mientras más largos los momios, más paga, y es completo para un candidato improbable. Las líneas de dinero funcionan en cualquier deporte, y un spread funciona para basquetbol y fútbol americano. Un empate en futbol cuenta como media sorpresa.
- **Tiempo.** Nada antes de la mitad, la mitad a partir de la mitad y completo cuando el partido está avanzado (tres cuartos en basquetbol y fútbol americano, dos tercios en la mayoría de los demás deportes).
- **Estado.** Completo cuando el sotanero va ganando, 80% cuando está parejo (70% en futbol) y la mitad cuando va perdiendo por una anotación o menos.

### Sorpresa

La versión de Palizas. El sotanero no se queda de adorno: está sacando al favorito de la cancha. Paga cuando el sotanero de antes del partido gana por más que el margen fuera de alcance del deporte (18 puntos en basquetbol, 14 en fútbol americano, 3 goles en hockey y futbol, 5 carreras en béisbol), con los mismos momios y la misma escala de tiempo que la alerta de sorpresa y el mismo máximo de 12.

## En juego

Lo que decide el resultado. El máximo es 10, y el número se escala por qué tan cerrado está el partido: completo dentro de la banda de cerrado del deporte, a la mitad para un partido con margen en el límite o una paliza todavía en su primera mitad, y nada para una paliza que ya está avanzada. Un Juego 7 decidido ya no tiene nada que decidir.

Lo que está en juego se separa por temporada para que nunca cuente doble con el impulso de postemporada. En la postemporada lee la serie. En otro caso lee los rankings y la tabla.

| En juego | Necesita | Paga |
|---|---|---|
| Una serie al borde | `game.series`, solo postemporada | 10 cuando los dos equipos están a una victoria de la serie en un al mejor de 7 (9 en un al mejor de 5, 8 en un al mejor de 3). De 4 a 7 cuando un equipo enfrenta la eliminación: 7 en una serie 3-2 al mejor de 7, 4 para un intento de barrida. |
| Dos equipos rankeados | `rank` en cada equipo, solo temporada regular | 6 cuando el de menor ranking está entre los 5 primeros. 5 cuando está entre los 10 primeros. 4 cuando un equipo está entre los 10 primeros. 3 para cualquier otro par entre los 25 primeros. |
| Una carrera de fin de temporada | `context.stakes`, solo temporada regular | 5 cuando ganar asegura algo o perder elimina a un equipo. 6 a pocos puntos del título o de la línea del descenso. 4 para los primeros lugares de Europa. 3 para cualquier otra línea de la tabla o cuando sigue en la pelea. |

En una carrera, el equipo con más en juego paga completo y el otro a la mitad, con un tope de 6. Rankeado y carrera se suman, y el total se limita a 10.

## Balance de probabilidad de victoria

Solo Clásico. `computeWinProbVarianceScore(winProbHistory)` devuelve un modificador de `-scoreWinProbVarianceMax` a `+scoreWinProbVarianceMax` (±5). Pasa `context.winProbability` a `scoreGame` y el modificador se suma al total por su cuenta.

Necesita al menos `minDataPoints` (5) valores finitos. Con cualquier otra cosa devuelve `undefined`, y el campo `winProbabilityVariance` del resultado se omite por completo en lugar de definirse como `0`. Las entradas no finitas (`NaN`, `Infinity`) se descartan antes de revisar ese conteo.

El modificador es la distancia absoluta media de los valores dados a 0.5, trasladada al rango de ±5:

| Distancia promedio desde 50% | Modificador |
|---|---|
| 0 (un volado) | +5 |
| `maxAvgDist` ÷ 2 (0.175) | 0 |
| ≥ `maxAvgDist` (0.35) | −5 |

A pesar del nombre, el modificador mide la distancia promedio desde 50%, no la varianza. Una línea de probabilidad de victoria que oscila entre 10% y 90% recibe la misma penalización que una sostenida en 90%. Las dos promedian la misma distancia desde el punto medio.

El modificador se suma después de la deducción por corte, no antes, y el resultado se limita de 0 a 100 antes de sumar cualquier impulso.

## Deducción por corte comercial

Se resta una deducción fija del subtotal de señales mientras un partido está en corte comercial, para que ArenaSwap no cambie a un partido que está pasando anuncios. Quien llama pasa `context.onBreak`, y el motor resta 15 puntos fijos del subtotal de señales mientras sea `true`. Eso es `breakPenalty`. Si algunas señales están desactivadas, la deducción se escala junto con el resto del subtotal: 30 con la mitad del tope de señales apagado.

Se resta después de las señales y antes del modificador de probabilidad de victoria, y es una deducción, no un multiplicador. Clásico y Palizas la pagan. Fantasy no. `onBreak` y `breakPenalty` del resultado dicen si se aplicó y cuánto se restó. Con una puntuación congelada de descanso o intermedio, los dos son `false` y `0`.

`signalsSubtotal` en el resultado guarda la suma previa a la deducción, para que un desglose pueda mostrar lo que costó el corte. `scoreGame` no detecta cortes por sí mismo. Lo hace quien llama. ArenaSwap lee los cortes entre entradas, los cambios de pitcher y los tiempos fuera de TV de su feed de marcadores y pasa la respuesta.

## Impulsos de favorito, de postemporada y manual

Estos tres vienen de ti, no del partido, y funcionan en todos los modos. La única excepción es Palizas, que nunca paga el impulso de postemporada. Pásalos en `options`:

| Opción | Qué hace |
|---|---|
| `favoriteTeamCount` y `favoriteBoostPoints` | Puntos por cada equipo favorito en el partido, así que un duelo de dos favoritos paga dos veces. |
| `postseasonBoostPoints` y `game.postseasonRound` | Puntos por una ronda que define el título (`0`), con una parte para las anteriores: `1` semifinal 75%, `2` cuartos de final 50%, `3` cualquier ronda anterior 25%. |
| `gameBoost` | Un impulso manual fijo, como el que un espectador define en un partido. |

Aparecen en `score.boosts` como `favoriteBoost`, `postseasonBoost` y `gameBoost`, una vez que los pides. Los impulsos de favorito y de postemporada se suman después de los impulsos propios del modo y de su mezcla, y el total se vuelve a limitar a 100. `gameBoost` se suma al final, y es lo único que puede pasar de 100. Es a propósito: un partido que un espectador fija debe poder superar una puntuación perfecta.

Ninguno paga nada a menos que les des puntos. El paquete no trae un valor predeterminado para ninguno. Cómo convierte ArenaSwap los ajustes guardados de un espectador en estos números está en [sus propios documentos](/arenaswap/docs/extension/settings/#scoring), no en este paquete.

## Si sigues en la API de la 2.x

`computePowerScore` conserva su comportamiento de la 2.x: señales y probabilidad de victoria, sin ninguno de los impulsos de momento. `computeScoringOpportunityBoost(game)` todavía devuelve por sí solo el número de la oportunidad de anotar, y `normalizePowerScoreResult` todavía limita y pasa `favoriteBonus`, `gameBoost` y `postseasonBoost` para un resultado que armes a mano. Todo esto es obsoleto pero funciona. Consulta [la referencia de la API](/arenaswap/docs/powerscore/api-reference/#the-2x-api) para ver la lista completa.
