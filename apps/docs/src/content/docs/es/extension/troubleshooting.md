---
sourceHash: '099498900e89'
title: Solución de problemas de ArenaSwap
description: Soluciones rápidas para una lista de partidos vacía, cambios que nunca ocurren, pestañas que faltan en el menú y notificaciones que no llegan.
section: extension
order: 9
navLabel: Solución de problemas
faq:
  - q: ¿Por qué ArenaSwap no muestra ningún partido?
    a: Si ves Elige ligas para empezar, todavía no hay ligas activadas. Haz clic en Elegir ligas en Ajustes y activa algunas. Si tienes ligas activadas y la lista sigue vacía, ahorita no hay nada en vivo en ellas. Haz clic en Actualizar, o prueba el modo demostración.
  - q: ¿Por qué ArenaSwap no cambia de pestaña?
    a: Revisa que Activar cambio automático esté activado en la barra superior y que al menos un partido en vivo tenga una pestaña asignada. ArenaSwap solo cambia entre las pestañas que le has dado.
---

La mayoría de los problemas se reducen a un ajuste apagado o a una pestaña que nunca se asignó. Empieza por el que suene como el tuyo.

## La lista de partidos está vacía

Si ves **Elige ligas para empezar**, todavía no hay ligas activadas. Haz clic en **Elegir ligas en Ajustes** y activa al menos una.

Si ves un mensaje como "Es un día tranquilo en el deporte", tus ligas no tienen nada en vivo ahorita. Haz clic en **Actualizar** para revisar otra vez. O activa el [modo demostración](/arenaswap/docs/extension/demo-mode/) para tener con qué jugar.

Si un aviso dice **Nuestras fuentes enmudecieron. No se cargaron los partidos.**, haz clic en **Reintentar**. Si sigue pasando, revisa tu conexión a internet.

## ArenaSwap no cambia de pestaña

Revisa esto en orden:

1. **Activar cambio automático** en la barra superior está activado.
2. Al menos un partido en vivo tiene una pestaña asignada. Usa el menú **Asigna una pestaña** de su tarjeta.
3. Tienes un segundo partido asignado. Con uno solo, ArenaSwap puede llevarte a él desde una pestaña que no es un partido, pero no tiene entre qué cambiar.

¿Sigue sin pasar nada? Puede que **Sensibilidad de cambio** esté baja, o que **Tiempo de espera entre cambios** o **Retardo de cambio** sean largos. [Cómo controlar cuándo ArenaSwap cambia](/arenaswap/docs/extension/switching-and-sensitivity/) muestra qué ajustar.

## ArenaSwap me sacó de lo que estaba haciendo

Si la pestaña en la que estás no está asignada a un partido, ArenaSwap te considera libre y te mueve al mejor partido asignado en cuanto uno se calienta. Para navegar en paz, desactiva primero **Activar cambio automático**.

## No deja de rebotar entre dos partidos

Dos de tus partidos van parejos y ArenaSwap sigue cada vaivén. Sube el **Tiempo de espera entre cambios** en Ajustes para que el líder tenga que aguantar más antes del siguiente cambio. [Cómo controlar cuándo ArenaSwap cambia](/arenaswap/docs/extension/switching-and-sensitivity/) tiene el rango.

## Falta una pestaña en el menú, o aparece en gris

El menú **Asigna una pestaña** enumera las pestañas abiertas en la ventana desde la que abriste ArenaSwap. Abre primero la transmisión en su propia pestaña. Para una pestaña en otra ventana, abre ArenaSwap desde esa ventana. Una pestaña que abres mientras la ventana emergente está visible aparece la próxima vez que la abras.

Una pestaña marcada **(en uso)** está asignada a otro partido. Desasígnala primero ahí.

## Una pestaña se cerró o se liberó después de un partido

Lo hizo tu ajuste **Cuando un partido finaliza**. Lo encuentras en Ajustes, en **Cambios**. Ponlo en **Dejar la pestaña como está** para detenerlo. [Qué pasa cuando termina un partido](/arenaswap/docs/extension/watching-multiple-games/#choose-what-happens-when-a-game-ends) tiene las opciones.

## Recibí una notificación "A continuación", pero no hubo cambio

**Cambio en pausas del juego** está esperando una pausa en el juego, como un silbatazo o el final de un turno al bate. La notificación dice qué espera. ArenaSwap cambia cuando el juego se detiene, o tras una espera corta. Para cambiar de inmediato, desactiva **Cambio en pausas del juego** en Ajustes. [Que no te corten a media jugada](/arenaswap/docs/extension/switching-and-sensitivity/#dont-get-cut-off-mid-play) tiene más.

## Multiview no se abrió

La [página de Multiview](/arenaswap/docs/extension/multiview/) tiene la lista de verificación.

## Standby Stream no hace nada

Standby Stream necesita dos cosas:

1. Una pestaña elegida en el menú **Pestaña de espera** en Ajustes, dentro de **Standby Stream**. Si todavía dice **Selecciona una pestaña**, elige una.
2. Al menos un partido en vivo con una pestaña asignada.

También espera mientras **Activar cambio automático** está desactivado, y mientras Multiview está abierto. [Cómo configurar Standby Stream](/arenaswap/docs/extension/standby-stream/) tiene los pasos completos.

## No llegan notificaciones de cambio

Activa **Notificaciones de cambio** en Ajustes, en **Cambios**. Si ya está activado, revisa los ajustes de notificaciones de tu computadora y asegúrate de que tu navegador tenga permiso para mostrarlas.

## Relacionado

- [Cómo ver varios partidos a la vez](/arenaswap/docs/extension/watching-multiple-games/) explica cómo asignar pestañas.
- [Cómo controlar cuándo ArenaSwap cambia de pestaña](/arenaswap/docs/extension/switching-and-sensitivity/) explica la sensibilidad, el tiempo de espera y el retardo.
- [Referencia de ajustes de ArenaSwap](/arenaswap/docs/extension/settings/) enumera el valor predeterminado y el rango de cada ajuste.
- Las [preguntas frecuentes](/arenaswap/faq/) cubren ligas, servicios de streaming y datos.
