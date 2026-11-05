---
sourceHash: '1aa0123b3860'
title: Señales de PowerScore en cada modo
description: Las señales detrás del PowerScore Clásico, de Palizas y de Fantasy, con el tope de cada una, qué mide y qué ignora. Además, cómo apagar señales.
section: powerscore
order: 3
navLabel: Señales por modo
---

Una señal mide una sola cosa de un partido e ignora todo lo demás, incluidas las otras señales de su modo. Un modo es una lista de señales más los impulsos que le van. PowerScore 3 trae tres, y cada uno hace una pregunta distinta.

| Modo | La pregunta | Señales (tope) |
|---|---|---|
| `'classic'` (el predeterminado) | ¿Está cerrado, avanzado y cambiando? | Igualdad 42, Presión de la recta final 38, Racha 38, Cambios de ventaja 18, Factor de Remontada 20 |
| `'blowouts'` | ¿Alguien se está escapando? | Diferencia 50, Ventaja sostenida 30, Paliza temprana 25, Aplastando 15 |
| `'fantasy'` | ¿Algo está por pasarles a mis jugadores? | En la acción 50, Puntos fantasy 35, Tus jugadores 15 |

Elige uno con `options.mode`. En los ids tal como aparecen en `score.signals`, son `closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`; `blowoutMargin`, `sustained`, `timing`, `pileOn`; y `situation`, `production`, `exposure`.

Palizas y Fantasy no sustituyen a Clásico. Cada uno se apoya en él, así que un partido sin nada que decir en el modo nuevo igual tiene una puntuación razonable. [Cómo se mezclan los modos](#how-the-modes-blend-with-classic) explica la aritmética.

## Por qué los topes suman más que el total

Los topes de Clásico suman 156, y el total se limita a 100. Una escala que solo pagara 60 de sus 100 puntos desperdiciaría los otros 40 en partidos que nunca pueden llegar a la cima. Sumar los topes por encima del límite mantiene todos los puntos en juego. Un partido cerrado que intercambia la ventaja y va montado en una racha apila varias señales cerca de sus propios máximos a la vez y llega a los 80 o 90 mucho antes del silbatazo final. Un clásico de verdad, empatado al final y con una racha detrás, se satura en 100. Un partido aburrido sigue puntuando bajo, porque ninguna de sus señales se activa.

Lo mismo pasa con Palizas (120) y Fantasy (100). Las sumas son `scoreMaxSignalsSubtotal` para Clásico y `signalCeiling` en cualquier resultado `PowerScore` para el modo que lo calificó.

## Apaga una señal

Pasa su id en `options.disabledSignals`. Las señales que siguen encendidas se reescalan al rango completo del modo, así que un modo con una señal apagada sigue abarcando de 0 a 100 en lugar de toparse antes. Si las apagas todas, no queda ninguna: no hay nada a qué reescalar.

```ts
scoreGame(game, context, { disabledSignals: ['momentum', 'comeback'] });
```

Cada entrada de `score.signals` trae `disabled: true` cuando lo has hecho, para que un desglose pueda atenuarla. Cuando un modo se mezcla con Clásico, `options.classicDisabledSignals` es la lista de apagado del propio Clásico.

## Clásico

El modelo de la 2.x, con los impulsos de momento de [Impulsos y penalizaciones](/arenaswap/docs/powerscore/boosts-and-penalties/) añadidos encima.

### Igualdad

Tope: `scoreMaxCloseness`, 42.

Compara el margen del marcador contra umbrales propios de cada deporte para elegir un nivel, y luego escala ese nivel según cuánto ha avanzado el partido. La curva alcanza la mayor parte de su valor a mitad del partido en lugar de esperar al silbatazo final: `floor + (tierCeiling − floor) × progress^0.55`. Siempre se paga un pequeño piso fijo de 12, limitado al tope del propio nivel. Por eso un partido empatado en el primer minuto ya cuenta para algo.

Los topes de cada nivel:

| Estado | Basquetbol | Fútbol americano | Hockey y futbol | Beisbol y softbol | Tope |
|---|---|---|---|---|---|
| Empatado | | | | | 42 |
| Muy cerrado | ≤ 5 puntos | ≤ 3 puntos | ≤ 1 gol | ≤ 1 carrera | 34 |
| Cerrado | ≤ 10 puntos | ≤ 9 puntos | ≤ 2 goles | ≤ 3 carreras | 20 |
| Límite | ≤ 18 puntos | ≤ 14 puntos | ≤ 3 goles | ≤ 5 carreras | 8 |
| Fuera de alcance | > 18 puntos | > 14 puntos | > 3 goles | > 5 carreras | 0 |

El 0-0 se califica aparte de un empate normal, porque al inicio normalmente significa que todavía no ha pasado nada, no que el partido esté disputado. El hockey da crédito completo de empate al 0-0 desde el tercer periodo, y el futbol desde el segundo tiempo. Antes de eso, y en todos los demás deportes, el 0-0 recibe un tope reducido de 22.

**Con diez hombres.** En el futbol, un equipo con un hombre menos que protege una ventaja de un gol recibe gol con mucha más frecuencia que uno completo. Así que el partido está más cerrado de lo que dice el marcador, y la Igualdad suma 4 puntos (todavía limitada a 42) mientras esa sea la situación. Es el único lugar donde una tarjeta roja toca una señal. El impulso de tarjeta roja es aparte, y está en [Impulsos y penalizaciones](/arenaswap/docs/powerscore/boosts-and-penalties/#red-card).

Lo que la igualdad ignora: qué equipo va ganando y el nivel absoluto del marcador. Un partido de 2 puntos de diferencia en 12-10 se lee igual que uno en 112-110, porque la igualdad solo mira el número que hay en el marcador ahora mismo.

### Presión de la recta final

Tope: `scoreMaxLateGame`, 38.

Sube casi en línea recta a lo largo de todo el último periodo de un partido cerrado, en lugar de dispararse solo en los segundos finales. La tensión se acumula poco a poco en lugar de llegar de golpe. El tope hacia el que sube depende de qué tan cerrado ya esté el partido, porque un partido de 30 puntos de diferencia en el último minuto ya no tiene tensión por construir:

| Margen | Tope en el silbatazo final |
|---|---|
| Empatado, muy cerrado o cerrado | 36 |
| Límite | 22 |
| Fuera de alcance | 15 |

Los partidos empatados suben más allá de 36 en el último minuto, hacia un pre-impulso de tiempo extra que llega a 38. Distingue a un partido que va a basquetbol extra de uno que apenas está cerrado. El tiempo extra y las entradas extra pagan los 38 completos de entrada, hasta que una ventaja construida dentro de ellos pasa el margen cerrado del deporte. Entonces pagan el mismo tope que un partido de tiempo reglamentario con ese margen, así que una ventaja de cinco carreras en la parte alta de la 10.ª queda limitada donde una de cinco carreras en la 9.ª.

El béisbol y el softbol no tienen reloj, así que la misma subida condicionada por la igualdad corre a lo largo de las entradas. Empieza en la 6.ª entrada en el béisbol, o en la 5.ª en el softbol, y llega a su tope al final del tiempo reglamentario.

El futbol nunca dice "tiempo extra" como tal. El tiempo extra dice *Empatados en tiempo extra*, una tanda dice *Tanda de penales* y un partido parejo hacia el final dice *Empatados en el minuto 85*. Un empate es un resultado normal de liga, no una parada rumbo al tiempo extra. El pre-impulso sigue aplicando, porque un empate tardío es genuinamente tenso.

Lo que la presión de la recta final ignora: el ritmo reciente de anotación, que es trabajo de la racha, y cualquier cosa de los primeros tres cuartos de un partido que desde entonces se volvió disparejo.

### Racha, Cambios de ventaja y factor de Remontada

Estas tres leen de `context.history`, la lista de marcadores pasados de un partido, y cada una necesita al menos tres capturas para activarse. Cada una se dispara con un evento detonante y luego se desvanece con una vida media escalada por deporte. El desvanecimiento mantiene una línea en movimiento entre gol y gol incluso en un deporte de pocas anotaciones, en lugar de una plana. Las vidas medias, junto con todo lo demás que varía por deporte, están en [Configuración de deportes y ligas](/arenaswap/docs/powerscore/configuration/).

**Racha** (tope 38) mide el vuelco en la diferencia del marcador entre la captura más antigua y la más reciente de la ventana. Si un equipo anota 10 y el otro responde con 2, es un vuelco de 8, no una racha de 10-0. La cadena de motivo nombra los dos números, porque una diferencia no es una blanqueada. Lo que cuenta como un vuelco grande depende del deporte: 8 puntos en basquetbol, 2 goles en hockey, 3 carreras en béisbol. Ignora qué equipo va realmente ganando. Un equipo puede ir perdiendo por 20 y aun así registrar un pico de racha si supera en anotación a su rival durante la ventana.

**Cambios de ventaja** (tope 18) cuenta cuántas veces cambió de manos la ventaja a lo largo de la ventana: 18 puntos por dos o más, 12 por uno. Un empate no cuenta como ventaja por sí solo. Ir abajo, empatar y tomar la ventaja es un cambio. Tomar la ventaja, empatar y recuperarla no es ninguno. Ignora el tamaño de cualquier vuelco. Dos cambios o veinte puntúan igual, porque a partir de ahí el partido ya demostró que es impredecible. Si tu feed cuenta los cambios de ventaja desde su registro de jugadas, pasa `context.recentLeadChanges` (`{ count, lastAt? }`). Cuando su conteo es mayor que el que muestran las capturas, gana, lo que atrapa los vuelcos que ocurrieron entre consultas.

**Factor de Remontada** (tope 20) mide el vuelco del equipo que iba perdiendo en la captura más antigua de la ventana: el déficit que borró, más la ventaja que haya tomado desde entonces. Un equipo que iba abajo por 5 y ahora gana por 6 tiene un vuelco de 11. No paga nada si la ventana abrió empatada. Cuando el equipo de la remontada gana por más que el segundo margen de igualdad del deporte (10 en basquetbol), el partido se convirtió en una paliza, y solo cuenta el déficit que borró, menos esa ventaja. El vuelco se escala por el avance del partido igual que la igualdad. Recortar una ventaja en el primer cuarto cuenta menos que recortar la misma ventaja con dos minutos en el reloj. Puntúa la tendencia mientras ocurre, sin esperar a ver si el equipo que iba perdiendo la completa.

### Dos modificadores que no son señales

Clásico también aplica el modificador de probabilidad de victoria (±5) y la deducción por corte comercial. Los dos pertenecen al proceso de Clásico, y los dos se explican en [Impulsos y penalizaciones](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance).

## Palizas

La igualdad al revés. Palizas no paga nada hasta que un partido tiene dos anotaciones de diferencia (el segundo margen de igualdad del deporte), y luego sube hasta el crédito completo en una paliza.

| Señal | Tope | Qué mide |
|---|---|---|
| Diferencia | 50 | El margen, escalado hacia arriba conforme avanza el partido, para que una paliza tardía sea más segura que una temprana. Crédito completo a 30 puntos en basquetbol, 28 en fútbol americano, 5 goles en hockey y futbol, 10 carreras en béisbol y softbol. |
| Ventaja sostenida | 30 | Cuánto de la ventana de historial el líder actual ha pasado con más de dos anotaciones de ventaja. Una ventaja que se construyó y se mantuvo puntúa aquí. Una racha que podría revertirse no. Necesita 3 capturas, y paga completo solo cuando el historial cubre toda la ventana. |
| Paliza temprana | 25 | Una paliza temprana tiene más paliza por ver que una que casi termina. Cae hacia 0 al acabar el tiempo reglamentario. Paga solo cuando el margen pasa el tercer margen de igualdad del deporte, y solo cuando se conoce `period`. |
| Aplastando | 15 | El líder sigue ampliando. Lee la racha solo en la dirección del líder, así que un equipo que se aferra a una ventaja grande no puntúa nada aquí. Necesita 3 capturas. |

Lo que Palizas ignora: cómo va un partido cerrado. Un partido a menos de dos anotaciones de diferencia puntúa casi nada aquí. Para eso está la mezcla.

Palizas tampoco paga impulso de postemporada. Una paliza de playoffs ya tiene decidido su resultado, así que la ronda no le suma nada. El modo define `paysPostseason: false`.

## Fantasy

Puntúa lo que están haciendo tus jugadores. Lee `context.fantasy`, una entrada por jugador de tu plantilla, así que no tiene nada que decir hasta que le pases una plantilla.

| Señal | Tope | Qué mide |
|---|---|---|
| En la acción | 50 | Dónde están tus jugadores en el partido. Fútbol americano: quién tiene el balón, zona roja, línea de gol, tu pateador en rango, tu defensiva en el campo. Béisbol: al bate, en turno de preparación o lanzando con corredores en base. Basquetbol, hockey y futbol: qué tan cerrado y avanzado está el partido. El jugador con más cosas pasando cuenta completo y todos los demás a un cuarto. |
| Puntos fantasy | 35 | Puntos de fantasy que tus jugadores anotaron hace poco, que se desvanecen como un cambio de ventaja. Una explosión completa (un touchdown, un jonrón, un gol) la llena. Las jugadas negativas no cuentan: nadie cambia a ver una intercepción que ya se perdió. |
| Tus jugadores | 15 | Cuántos de tus jugadores están en el partido: 5 cada uno, hasta 15. |

El fútbol americano es el único deporte con una noción en vivo de quién tiene el balón. El basquetbol, el hockey y el futbol no tienen datos en vivo de la cancha, así que un jugador de tu plantilla en un partido de esos vale lo que el partido esté de cerrado y avanzado. Un jugador marcado `active: false` (en la banca, lesionado, expulsado) no cuenta para nada.

## Cómo se mezclan los modos con Clásico

Ninguno de los dos modos nuevos se sostiene solo. Cada uno se combina con Clásico, así que un partido tranquilo nunca desaparece del mapa.

| Modo | Mezcla | Fórmula | Por qué |
|---|---|---|---|
| Palizas | Piso | `total = max(blowouts, 0.3 × classic)` | Un partido cerrado conserva 30% de su puntuación Clásica, así que una noche sin palizas igual tiene algo a qué cambiar. Cualquier paliza de verdad supera a la mejor de ellas. |
| Fantasy | Impulso | `total = min(100, classic + 0.6 × fantasy)` | Los partidos de tus jugadores solo pueden subir por encima de su puntuación Clásica, y un partido sin ellos es Clásico a secas. Una mezcla anterior de 0.6/0.4 clasificaba un partido cerrado por un punto y avanzado con tu jugador por debajo del mismo partido sin él. |

Cambia el peso de Fantasy con `options.classicBlend`:

```ts
scoreGame(game, context, {
	mode: 'fantasy',
	classicBlend: { kind: 'boost', weight: 0.8 },
});
```

Un partido sin ningún jugador activo no tiene nada que Fantasy pueda decir. Se califica como Clásico, y `score.modeId` dice `'classic'` para que lo notes. `score.classicTotal` trae el total propio de Clásico cada vez que un modo se mezcla con él, y `score.blend` trae la aritmética: `{ kind, weight, ownTotal, classicTotal, floorApplied? }`. Un desglose puede usarla para mostrar "Clásico 70 × 30% = 21" cuando ganó el piso, o "+30" para una puntuación Fantasy de 50 con un peso de 0.6.

## De dónde salen estos números

Los topes de Clásico son constantes exportadas: `scoreMaxCloseness`, `scoreMaxLateGame`, `scoreMaxMomentum`, `scoreMaxLeadChanges`, `scoreMaxComeback` y `scoreMaxTotal`. Los topes de Palizas y Fantasy viven en las definiciones de sus señales, `blowoutsSignals` y `fantasySignals`, así que puedes leerlos en tiempo de ejecución. Si ninguno de los tres modos hace tu pregunta, [construye el tuyo con `defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode). Las firmas completas están en la [referencia de la API](/arenaswap/docs/powerscore/api-reference/).
