---
sourceHash: '1aa0123b3860'
title: I segnali di PowerScore in ogni modalità
description: I segnali dietro il PowerScore Classica, Senso unico e Fantasy, con il massimo di ciascuno, cosa misura e cosa ignora. Più come disattivare i segnali.
section: powerscore
order: 3
navLabel: Segnali per modalità
---

Un segnale misura una sola cosa di una partita e ignora tutto il resto, compresi gli altri segnali della sua modalità. Una modalità è una lista di segnali più i boost che le si addicono. PowerScore 3 ne include tre, e ognuna pone una domanda diversa.

| Modalità | La domanda | Segnali (massimo) |
|---|---|---|
| `'classic'` (quella predefinita) | È tirata, a fine gara e piena di ribaltoni? | Equilibrio 42, Fine gara 38, Momentum 38, Sorpassi 18, Rimonta 20 |
| `'blowouts'` | Qualcuno sta scappando via? | Margine 50, Vantaggio tenuto 30, Dominio precoce 25, Infierisce 15 |
| `'fantasy'` | Sta per succedere qualcosa ai miei giocatori? | In azione 50, Punti fantasy 35, I tuoi giocatori 15 |

Sceglila con `options.mode`. Negli id come compaiono in `score.signals`, sono `closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`; `blowoutMargin`, `sustained`, `timing`, `pileOn`; e `situation`, `production`, `exposure`.

Senso unico e Fantasy non sostituiscono Classica. Ognuna ci si appoggia, così una partita che non ha niente da dire nella nuova modalità ha comunque un punteggio sensato. [Come si combinano le modalità](#how-the-modes-blend-with-classic) spiega l'aritmetica.

## Perché i massimi sommano più del totale

I massimi di Classica sommano 156, e il totale è limitato a 100. Una scala che pagasse sempre solo 60 dei suoi 100 punti sprecherebbe gli altri 40 su partite che non possono mai arrivare in cima. Sommare i massimi oltre il limite tiene in gioco ogni punto. Una partita tirata, con sorpassi e una serie in corso, impila diversi segnali vicino ai propri massimi insieme e arriva sugli 80 o 90 ben prima della sirena finale. Un vero classico, in parità a fine gara e con una serie alle spalle, satura a 100. Una partita noiosa ottiene comunque poco, perché nessuno dei suoi segnali scatta.

Lo stesso vale per Senso unico (120) e Fantasy (100). Le somme sono `scoreMaxSignalsSubtotal` per Classica e `signalCeiling` su qualsiasi risultato `PowerScore` per la modalità che l'ha calcolato.

## Disattiva un segnale

Passa il suo id in `options.disabledSignals`. I segnali ancora attivi vengono riscalati sull'intero intervallo della modalità, quindi una modalità con un segnale spento copre comunque da 0 a 100 invece di fermarsi prima. Disattivali tutti e non lo è nessuno: non c'è niente su cui riscalare.

```ts
scoreGame(game, context, { disabledSignals: ['momentum', 'comeback'] });
```

Ogni voce di `score.signals` porta `disabled: true` quando l'hai fatto, così un dettaglio può mostrarla in grigio. Quando una modalità si combina con Classica, `options.classicDisabledSignals` è la lista di disattivazioni di Classica stessa.

## Classica

Il modello 2.x, con i boost dei momenti di [Boost e penalità](/arenaswap/docs/powerscore/boosts-and-penalties/) aggiunti sopra.

### Equilibrio

Massimo: `scoreMaxCloseness`, 42.

Confronta il margine di punteggio con soglie specifiche per sport per scegliere una fascia, poi scala quella fascia in base a quanto è avanzata la partita. La curva raggiunge gran parte del suo valore a metà partita invece di aspettare la sirena finale: `floor + (tierCeiling − floor) × progress^0.55`. Un piccolo minimo fisso di 12 viene sempre pagato, limitato al massimo della fascia stessa. Per questo una partita in parità nel primo minuto conta già qualcosa.

I massimi per fascia:

| Stato | Basketball | Football | Hockey e calcio | Baseball e softball | Massimo |
|---|---|---|---|---|---|
| Parità | | | | | 42 |
| Serrata | ≤ 5 punti | ≤ 3 punti | ≤ 1 gol | ≤ 1 punto | 34 |
| Tirata | ≤ 10 punti | ≤ 9 punti | ≤ 2 gol | ≤ 3 punti | 20 |
| Al limite | ≤ 18 punti | ≤ 14 punti | ≤ 3 gol | ≤ 5 punti | 8 |
| Fuori portata | > 18 punti | > 14 punti | > 3 gol | > 5 punti | 0 |

Lo 0-0 si calcola a parte rispetto a una parità normale, perché all'inizio di solito significa che non è ancora successo niente più che una partita combattuta. L'hockey dà il pieno credito di parità allo 0-0 dal terzo periodo in poi, il calcio dal secondo tempo. Prima di allora, e in ogni altro sport, lo 0-0 ottiene un massimo ridotto di 22.

**In dieci.** Nel calcio, una squadra in inferiorità numerica che difende un solo gol di vantaggio subisce molto più spesso di una squadra a ranghi completi. Quindi la partita è più tirata di quanto dica il punteggio, e Equilibrio aggiunge 4 punti (sempre limitato a 42) finché la situazione dura. È l'unico punto in cui un cartellino rosso tocca un segnale. Il boost del cartellino rosso è separato, ed è in [Boost e penalità](/arenaswap/docs/powerscore/boosts-and-penalties/#red-card).

Cosa ignora Equilibrio: quale squadra è avanti e il livello assoluto del punteggio. Una partita da 2 punti sul 12-10 vale come una sul 112-110, perché Equilibrio guarda sempre e solo il numero sul tabellone adesso.

### Fine gara

Massimo: `scoreMaxLateGame`, 38.

Sale in modo quasi lineare per l'intero ultimo periodo di una partita tirata, invece di impennarsi solo negli ultimi secondi. La tensione cresce con costanza invece di arrivare tutta insieme. Il massimo verso cui sale dipende da quanto la partita è già tirata, perché una partita da 30 punti nell'ultimo minuto non ha più tensione da costruire:

| Margine | Massimo alla sirena |
|---|---|
| In parità, serrata o tirata | 36 |
| Al limite | 22 |
| Fuori portata | 15 |

Le partite in parità salgono oltre 36 nell'ultimo minuto, verso un pre-boost dei supplementari che arriva al massimo a 38. Separa una partita diretta ai tempi supplementari da una che è solo tirata. Supplementari e inning extra pagano 38 pieni di diritto, finché un vantaggio costruito al loro interno supera il margine di partita tirata dello sport. Poi pagano lo stesso massimo di una partita regolamentare con quel margine, quindi un vantaggio di cinque punti nell'alto del 10° è limitato dove lo è uno nel 9°.

Baseball e softball non hanno cronometro, quindi la stessa salita condizionata dall'equilibrio corre sugli inning. Parte dal 6° inning nel baseball, o dal 5° nel softball, e raggiunge il massimo alla fine del tempo regolamentare.

Il calcio non dice mai "overtime". I supplementari mostrano *Tied in extra time*, i rigori mostrano *Penalty shootout*, e una partita in equilibrio a fine gara mostra *Tied in the 85th minute*. Un pareggio è un normale risultato di campionato, non una tappa verso i supplementari. Il pre-boost vale comunque, perché uno stallo a fine gara è davvero teso.

Cosa ignora Fine gara: il ritmo recente dei punti, che è compito del momentum, e qualsiasi cosa dei primi tre quarti di una partita diventata a senso unico.

### Momentum, Sorpassi e Rimonta

Questi tre leggono tutti da `context.history`, la lista dei punteggi passati di una partita, e ciascuno ha bisogno di almeno tre istantanee prima di attivarsi. Ognuno si impenna a un evento scatenante, poi svanisce con un tempo di dimezzamento scalato sullo sport. Lo svanire tiene una linea in movimento tra un gol e l'altro anche in uno sport a punteggio basso, invece di una piatta. I tempi di dimezzamento, insieme a tutto il resto che varia per sport, stanno in [Configurazione di sport e leghe](/arenaswap/docs/powerscore/configuration/).

**Momentum** (massimo 38) misura l'oscillazione della differenza punti tra l'istantanea più vecchia e quella più recente della finestra. Se una squadra segna 10 e l'altra risponde con 2, è un'oscillazione di 8, non una serie di 10-0. La stringa del motivo nomina entrambi i numeri, perché una differenza non è un 10-0 a zero. Cosa conta come grande oscillazione dipende dallo sport: 8 punti nel basket, 2 gol nell'hockey, 3 punti nel baseball. Ignora quale squadra è davvero avanti. Una squadra può perdere di 20 e registrare comunque un picco di momentum segnando più dell'avversaria nella finestra.

**Sorpassi** (massimo 18) conta quante volte il vantaggio è cambiato di mano nella finestra: 18 punti per due o più, 12 per uno. Una parità non conta come vantaggio da sola. Andare sotto, pareggiare e poi passare avanti è un cambio. Passare avanti, pareggiare e poi riprendersi il vantaggio è zero. Ignora la dimensione di ogni oscillazione. Due ribaltoni o venti valgono uguale, perché oltre quel punto la partita ha già stabilito di essere imprevedibile. Se il tuo feed conta i sorpassi dal registro delle azioni, passa `context.recentLeadChanges` (`{ count, lastAt? }`). Quando il suo conteggio è più alto di quello delle istantanee, vince, e coglie i ribaltoni avvenuti tra un'interrogazione e l'altra.

**Rimonta** (massimo 20) misura l'oscillazione della squadra che perdeva all'istantanea più vecchia della finestra: lo svantaggio cancellato, più l'eventuale vantaggio preso da allora. Una squadra sotto di 5 che ora è avanti di 6 ha oscillato di 11. Non paga niente se la finestra è iniziata in parità. Quando la squadra in rimonta è avanti di più del secondo margine di equilibrio dello sport (10 nel basket), la partita è diventata una disfatta, e conta solo lo svantaggio cancellato, meno quel vantaggio. L'oscillazione si scala sull'avanzamento della partita come l'equilibrio. Ridurre un divario nel primo quarto conta meno che ridurre lo stesso divario con due minuti sul cronometro. Misura la tendenza mentre accade, senza aspettare di vedere se la squadra che sta sotto la completa.

### Due modificatori che non sono segnali

Classica applica anche il modificatore di probabilità di vittoria (±5) e la detrazione per la pausa pubblicitaria. Entrambi appartengono alla pipeline di Classica, ed entrambi sono spiegati in [Boost e penalità](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance).

## Senso unico

L'equilibrio rovesciato. Senso unico non paga niente finché una partita non è a due possessi di distanza (il secondo margine di equilibrio dello sport), poi sale fino al pieno credito per una disfatta.

| Segnale | Massimo | Cosa misura |
|---|---|---|
| Margine | 50 | Il margine, scalato in su man mano che la partita avanza, così una disfatta a fine gara è più sicura di una a inizio. Pieno credito a 30 punti nel basket, 28 nel football, 5 gol in hockey e calcio, 10 punti in baseball e softball. |
| Vantaggio tenuto | 30 | Quanta parte della finestra di storico chi è in testa è stato avanti di più di due possessi. Un vantaggio costruito e mantenuto vale qui. Una serie che potrebbe rientrare no. Servono 3 istantanee, e paga per intero solo quando lo storico copre tutta la finestra. |
| Dominio precoce | 25 | Una disfatta precoce ha più batosta da guardare di una quasi finita. Scende verso 0 man mano che il tempo regolamentare finisce. Paga solo quando il margine supera il terzo margine di equilibrio dello sport, e solo quando `period` è noto. |
| Infierisce | 15 | Chi è in testa continua ad allungare. Legge il momentum solo nella direzione di chi è avanti, quindi una squadra che si aggrappa a un grosso vantaggio qui non ottiene niente. Servono 3 istantanee. |

Cosa ignora Senso unico: come sta andando una partita tirata. Una partita entro due possessi qui vale quasi niente. È lì che entra la combinazione.

Senso unico non paga nemmeno il boost postseason. Una batosta di playoff ha già deciso il suo risultato, quindi il turno non le aggiunge niente. La modalità imposta `paysPostseason: false`.

## Fantasy

Valuta cosa stanno facendo i tuoi giocatori. Legge `context.fantasy`, una voce per ogni giocatore in rosa, quindi non ha niente da dire finché non gli passi una rosa.

| Segnale | Massimo | Cosa misura |
|---|---|---|
| In azione | 50 | Dove sono i tuoi giocatori nella partita. Football: chi ha la palla, red zone, linea di meta, il tuo kicker a tiro, la tua difesa in campo. Baseball: in battuta, in attesa o in lancio con corridori in base. Basket, hockey e calcio: quanto la partita è tirata e a fine gara. Il giocatore con più cose in corso conta per intero e tutti gli altri per un quarto. |
| Punti fantasy | 35 | I punti fantasy che i tuoi giocatori hanno fatto di recente, che svaniscono come un sorpasso. Una raffica piena (un touchdown, un fuoricampo, un gol) lo riempie. Le azioni negative non contano: nessuno passa a guardare un intercetto che si è già perso. |
| I tuoi giocatori | 15 | Quanti dei tuoi giocatori sono in partita: 5 ciascuno, fino a 15. |

Il football è l'unico sport con una sensazione in tempo reale di chi ha la palla. Basket, hockey e calcio non hanno dati in campo in diretta, quindi un giocatore in rosa in una partita lì vale quanto la partita è tirata e a fine gara. Un giocatore segnato `active: false` (in panchina, infortunato, espulso) non conta niente.

## Come si combinano le modalità con Classica

Nessuna delle due nuove modalità sta in piedi da sola. Ognuna è combinata con Classica, così una partita tranquilla non esce mai dalla mappa.

| Modalità | Combinazione | Formula | Perché |
|---|---|---|---|
| Senso unico | Minimo | `total = max(blowouts, 0.3 × classic)` | Una partita tirata tiene il 30% del suo punteggio Classica, così una serata senza batoste ha comunque qualcosa su cui cambiare. Qualsiasi vera batosta supera la migliore di loro. |
| Fantasy | Boost | `total = min(100, classic + 0.6 × fantasy)` | Le partite dei tuoi giocatori possono solo salire sopra il loro punteggio Classica, e una partita senza di loro è semplice Classica. Una vecchia miscela 0,6/0,4 piazzava una partita a un punto a fine gara con un tuo giocatore sotto la stessa identica partita senza. |

Cambia il peso di Fantasy con `options.classicBlend`:

```ts
scoreGame(game, context, {
	mode: 'fantasy',
	classicBlend: { kind: 'boost', weight: 0.8 },
});
```

Una partita senza giocatori attivi non ha niente da dire per Fantasy. Viene calcolata come Classica, e `score.modeId` dice `'classic'` così te ne accorgi. `score.classicTotal` porta il totale di Classica ogni volta che una modalità si combina con essa, e `score.blend` porta l'aritmetica: `{ kind, weight, ownTotal, classicTotal, floorApplied? }`. Un dettaglio può usarlo per mostrare "Classic 70 × 30% = 21" quando ha vinto il minimo, o "+30" per un punteggio Fantasy di 50 con peso 0,6.

## Da dove vengono questi numeri

I massimi di Classica sono costanti esportate: `scoreMaxCloseness`, `scoreMaxLateGame`, `scoreMaxMomentum`, `scoreMaxLeadChanges`, `scoreMaxComeback` e `scoreMaxTotal`. I massimi di Senso unico e Fantasy stanno nelle definizioni dei loro segnali, `blowoutsSignals` e `fantasySignals`, così puoi leggerli a runtime. Se nessuna delle tre modalità pone la tua domanda, [costruisci la tua con `defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode). Le firme complete sono nel [riferimento API](/arenaswap/docs/powerscore/api-reference/).
