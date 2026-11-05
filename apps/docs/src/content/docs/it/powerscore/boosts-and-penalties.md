---
sourceHash: '9c4dba756b81'
title: Boost e penalità di PowerScore
navLabel: Boost e penalità
description: Ogni boost e penalità che PowerScore 3 applica sopra i segnali di una modalità, con la condizione che attiva ciascuno, il suo massimo e i limiti che condividono.
section: powerscore
order: 4
---

I segnali misurano come sta andando una partita. Boost e penalità gestiscono le cose più piccole, legate al momento, che i segnali non vedono: un corridore in terza base al 9°, un portiere tolto, un'underdog pre-partita ancora viva. Stanno sopra i segnali e non ne sostituiscono nessuno.

Un boost non paga niente mentre la partita non è in diretta (`status: 'in'`) o mentre il gioco è fermo per l'intervallo, una pausa o un'interruzione. Ognuno viene ricalcolato dallo stato attuale della partita a ogni chiamata, quindi non c'è niente da azzerare quando il momento passa.

Ogni boost che una modalità paga compare in `score.boosts` come `{ id, points, meta?, details? }`, dove `details` contiene i frammenti di motivo che lo descrivono, a `0` quando non sta pagando. Cercane uno con `boostPoints(score, 'noHitter')`.

## Quale modalità tiene quali boost

| Modalità | Boost |
|---|---|
| Classica | Ogni boost di questa pagina, più il modificatore di probabilità di vittoria e la detrazione per la pausa pubblicitaria |
| Senso unico | No-hitter e Sorpresa a senso unico, più la detrazione per la pausa pubblicitaria. Nessun boost postseason, dato che una batosta di playoff ha già deciso il suo risultato. |
| Fantasy | Nessuno, e nessuna detrazione per le pause |

I boost preferita, postseason e manuale [in fondo alla pagina](#favorite-postseason-and-manual-boosts) valgono in ogni modalità, tranne che Senso unico salta il boost postseason.

## I boost dei momenti di Classica

| Boost | Id | Paga per | Max |
|---|---|---|---|
| [Opportunità di segnare](#scoring-opportunity) | `scoringOpportunity` | Corridori in base, un drive di football dentro la red zone, o un power play o porta vuota nell'hockey | 20 |
| [Punto del vantaggio in base](#go-ahead-run) | `goAheadRun` | Il punto del sorpasso o del pareggio in base nel baseball e nel softball | 10 |
| [Two-minute drill](#two-minute-drill) | `twoMinuteDrill` | Una squadra di football con la palla, in parità o sotto di un possesso, negli ultimi minuti | 12 |
| [Cartellino rosso](#red-card) | `redCard` | Un'espulsione in una partita di calcio in parità o a un gol di distanza | 15 |
| [No-hitter](#no-hitter) | `noHitter` | Una partita di baseball o softball con una squadra ancora senza valide | 70 |
| [Allarme sorpresa](#upset-watch) | `upsetWatch` | L'underdog pre-partita in vantaggio o a un possesso di distanza | 12 |
| [In palio](#stakes) | `stakes` | Una serie al limite, due squadre in classifica, una corsa a fine stagione | 10 |

Quei massimi sono per boost. La sezione seguente spiega perché non si sommano tutti.

## Limiti sui gruppi

I boost condividono dei limiti, così molte piccole cose insieme non possono spingere una partita oltre quanto guadagnerebbe un'oscillazione di un possesso nell'ultimo minuto.

| Gruppo | Limite | Cosa contiene | Perché |
|---|---|---|---|
| Momenti | 20 | Opportunità di segnare, punto del vantaggio in base, two-minute drill, cartellino rosso | Una partita in parità alla sirena vale circa 80 prima dei boost, quindi un momento pieno la porta a 100. Un ultimo minuto a un possesso arriva sugli 80 alti, e non ogni partita tirata si pianta a 100. |
| No-hitter | 70 | No-hitter | Una caccia dura inning, non un momento, e deve portare una partita da 6-0 sopra quelle in parità. |
| Contesto | 16 | Allarme sorpresa, in palio | Possono capitare insieme (un'underdog in classifica), ma insieme restano sotto un'oscillazione di un possesso a fine gara, così il contesto non supera mai l'azione dal vivo. |

All'interno di un gruppo, i boost più in alto nella tabella sopra vengono pagati per primi, e il limite taglia ciò che avanza. Sorpresa a senso unico, la versione di Senso unico dell'allarme sorpresa, non ha un gruppo.

## Opportunità di segnare

Una minaccia di segnare che il punteggio da solo non mostra ancora.

**Baseball e softball**, per numero di corridori:

| Corridori in base | Boost |
|---|---|
| Nessuno | 0 |
| Uno | 3 |
| Due | 6 |
| Tre (basi piene) | 10 |

Non paga niente con 3 out. I corridori possono restare sul tabellone per un'interrogazione dopo l'ultimo out, e con loro non può succedere niente.

**Football**, condizionato a quanto la partita è già tirata. Vale solo quando `isRedZone` è true.

| Margine | Valore base |
|---|---|
| Dentro la fascia tirata (football: 9 punti) | 10 |
| Dentro la fascia al limite (14 punti) | 5 |
| Oltre | 0 |

Il valore base viene poi pesato per il down:

| Situazione | Moltiplicatore |
|---|---|
| 4° down e goal-to-go | ×1.5 |
| 4° down (non goal-to-go) | ×1.35 |
| 3° down, 3 yard o meno da fare | ×1.15 |
| Qualsiasi altro caso, compreso un `down` mancante | ×1 |

Un valore base di `0` resta `0` qualunque sia il down. Un boost incondizionato sopra una batosta annullerebbe ciò che equilibrio e fine gara avevano già giustamente valutato basso. Il goal-to-go alza il moltiplicatore solo al 4° down, perché a un down precedente descrive le probabilità di segnare più che ciò che decide il possesso.

**Hockey** paga per un [power play o una porta vuota](#power-play-and-empty-net).

Le costanti esportate dietro queste tabelle sono `scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` e `thirdAndShortDistance`.

### Power play e porta vuota

L'opportunità di segnare dell'hockey. Entrambi leggono `context`, perché vengono dal feed della situazione e non dal tabellone. Un 6 contro 4 è entrambi insieme, quindi si sommano e il limite dei momenti tiene la somma a 20.

**Porta vuota** paga negli ultimi 4 minuti del 3° periodo quando la partita è a uno o due gol di distanza: **12** a un gol, **7** a due. Quando il feed dice di chi è la porta vuota, paga solo per quella della squadra che sta sotto. Una porta vuota di chi è in vantaggio significa una penalità ritardata, e il portiere torna in pochi secondi. Imposta `context.emptyNet` solo dopo che il feed l'ha segnalato su due interrogazioni di fila, per lo stesso motivo.

**Power play** paga nelle partite in parità e a uno o due gol di distanza. A fine gara (3° periodo o dopo) paga di più:

| Partita | A fine gara | Prima |
|---|---|---|
| Parità | 10 | 4 |
| Un gol, la squadra che sta sotto ha la superiorità | 10 | 4 |
| Un gol, la squadra in vantaggio ce l'ha | 5 | 2 |
| Due gol, la squadra che sta sotto ce l'ha | 5 | 2 |
| Due gol, la squadra in vantaggio ce l'ha | 0 | 0 |

Quando il feed dice solo che c'è un power play, non di chi, il boost presume che la squadra che sta sotto abbia le stesse probabilità di averlo e paga un po' meno: 7 o 3 a un gol, 3 o 2 a due.

## Punto del vantaggio in base

Baseball e softball. Servono `baseRunners`, `topOfInning`, `outs` e `period`. Paga sopra il conteggio dei corridori qui sopra, e solo quando la squadra in battuta ha in base il punto che conta:

| In base | Paga |
|---|---|
| Il punto del sorpasso: in parità con qualcuno in base, sotto di uno con due in base, sotto di due con le basi piene | 8 |
| Il punto del pareggio: sotto di uno con uno in base, sotto di due con due in base, sotto di tre con le basi piene | 5 |

Vale solo la riga più alta. Il valore base viene poi pesato per l'inning:

- Prima del 6° inning (il 5° nel softball), la metà. Una minaccia nel 3° è reale, ma la partita ha molti inning per rispondere.
- Da lì all'ultimo inning regolamentare, dal 50% al 100%.
- Inning extra, 100%.
- ×1.25 quando è l'ultima occasione: la squadra di casa in battuta nell'ultimo inning o dopo, dove il punto del sorpasso è quello della vittoria, o una squadra ospite sotto nell'alto di quell'inning, che potrebbe non battere più.

Il massimo è 10: un 8 a peso pieno, per l'aumento dell'ultima occasione. Con 3 out non paga niente.

## Two-minute drill

Football. Servono `possession`, `yardsToEndZone` e un `down` in corso. Paga nel 4° quarto e nei supplementari, solo alla squadra con la palla, e solo quando può ancora pareggiare o vincere con un possesso:

- **In parità:** gli ultimi 2 minuti.
- **Sotto di un possesso** (8 punti, o 9 nella UFL, dove una conversione può valere 3): gli ultimi 4 minuti.

Una squadra che fa scorrere il cronometro in vantaggio non paga niente. Neppure un supplementare NCAA o UFL, che non ha cronometro di gioco.

I 12 punti sono scalati da quattro cose: quanto poco tempo resta (pieno a 40 secondi), la posizione in campo (pieno dalla yard 35 avversaria, o 30 nel college, fino al 40% alla propria yard 20), i timeout rimasti (85% senza, 100% con tre, 92,5% quando il feed non lo dice) e il margine (pieno in parità o sotto di 1 o 2, fino al 70% a 8 di svantaggio). Tra un'azione e l'altra, dopo un punteggio, un feed manda un down che non significa niente, e il boost paga 0 fino al prossimo snap.

## Cartellino rosso

Calcio. Serve `redCards`, una lista di `{ side, minute }`. Un cartellino rosso in una partita in parità o a un gol di distanza è il genere di cosa per cui un tifoso salta su, e paga di più subito dopo che succede:

| Quando è arrivato il cartellino | Paga |
|---|---|
| In parità, o la squadra espulsa è avanti di uno | 10 |
| La squadra espulsa è sotto di uno | 7 |
| La squadra espulsa è avanti di due | 5 |
| Qualsiasi margine più ampio | 0 |

Paga per intero per 2 minuti di gioco, poi scende fino a 0 entro il 10°. Un secondo cartellino per la stessa squadra paga 1,5 volte tanto, che è il massimo di 15. Viene ricontrollato sul punteggio a ogni interrogazione, quindi un gol che apre la partita chiude il boost in anticipo.

**In dieci.** Un cartellino rosso aumenta anche l'[Equilibrio](/arenaswap/docs/powerscore/signals/#closeness) di 4 punti quando la squadra in inferiorità numerica è quella che difende un solo gol di vantaggio. Subisce molto più spesso di una squadra a ranghi completi, quindi la partita è più tirata di quanto dica il punteggio. Resta attivo finché dura quella situazione, non solo per dieci minuti.

## No-hitter

Baseball e softball. Servono `hits` per ogni squadra, più `period` e `topOfInning`. Una squadra senza valide paga per una **caccia al no-hitter**, che inizia tardi e cresce a ogni inning senza valide:

- **Parte** dopo il 5° inning completo di una partita da 9 inning, e dopo il 3° nel softball.
- **Sale** a ogni inning completo senza valide: 10, 22, 38, poi 52 e resta lì. Mentre lo staff di lanciatori che insegue il traguardo è in campo, aggiunge punti anche out dopo out, quindi continua a crescere dentro un inning.
- **Si abbassa** del 30% mentre quello staff è in panchina, dato che al traguardo non sta succedendo niente. Le cacce nel softball sono scalate al 60%.

Quando entrambe le squadre sono senza valide, la caccia più grande paga per intero e l'altra a metà. Il no-hitter ha un limite proprio di 70, fuori dai momenti, perché una caccia dura inning e deve portare una partita da 6-0 sopra quelle in parità.

## Allarme sorpresa

Qualsiasi sport. Serve `context.pregameLine`, e deve essere la quota di prima della partita. Una quota live si muove col punteggio e cancellerebbe proprio la sorpresa che vuoi vedere.

Paga quando l'underdog pre-partita è in vantaggio, in parità o a un possesso di distanza, una volta che la partita ha superato la metà. Tre cose fissano il numero, fino a un massimo di 12:

- **Quote.** Una partita da testa o croce non paga niente. Più le quote sono lunghe, più paga, ed è pieno per un outsider. Le moneyline funzionano in qualsiasi sport, e uno spread funziona per basket e football. Un pareggio nel calcio conta come mezza sorpresa.
- **Tempo.** Niente prima di metà, la metà da metà in poi, e pieno quando la partita è a fine gara (tre quarti nel basket e nel football, due terzi nella maggior parte degli altri sport).
- **Stato.** Pieno quando l'underdog è avanti, 80% quando è in parità (70% nel calcio) e metà quando sta sotto di un possesso o meno.

### Sorpresa a senso unico

La versione di Senso unico. L'underdog non sta lì a farsi vedere: sta spazzando via la favorita. Paga quando l'underdog pre-partita è avanti di più del margine fuori portata dello sport (18 punti nel basket, 14 nel football, 3 gol in hockey e calcio, 5 punti nel baseball), con le stesse quote e la stessa scala del tempo dell'allarme sorpresa e lo stesso massimo di 12.

## In palio

Cosa decide il risultato. Il massimo è 10, e il numero è scalato da quanto è tirata la partita: pieno dentro la fascia tirata dello sport, dimezzato per una partita al limite o una disfatta ancora nel primo tempo, e niente per una disfatta già a fine gara. Una gara 7 già decisa non ha più niente da decidere.

In palio è tenuto separato per stagione, così non conta mai due volte il boost postseason. Nella postseason legge la serie. Altrimenti legge le classifiche e la tabella.

| In palio | Serve | Paga |
|---|---|---|
| Una serie al limite | `game.series`, solo postseason | 10 quando entrambe le squadre sono a una vittoria dalla serie in un al meglio delle 7 (9 al meglio delle 5, 8 al meglio delle 3). Da 4 a 7 quando una squadra rischia l'eliminazione: 7 per una serie 3-2 al meglio delle 7, 4 per un tentativo di cappotto. |
| Due squadre in classifica | `rank` su ogni squadra, solo stagione regolare | 6 quando la squadra con la posizione più bassa è nella top 5. 5 quando è nella top 10. 4 quando una squadra è nella top 10. 3 per qualsiasi altra coppia nella top 25. |
| Una corsa a fine stagione | `context.stakes`, solo stagione regolare | 5 quando vincere assicura qualcosa o perdere elimina una squadra. 6 a pochi punti dal titolo o dalla linea della retrocessione. 4 per i primi posti europei. 3 per qualsiasi altra linea in tabella o quando è ancora in corsa. |

Per una corsa, la squadra con più in gioco paga per intero e l'altra a metà, con limite 6. Classifica e corsa si sommano, e il totale è limitato a 10.

## Equilibrio della probabilità di vittoria

Solo Classica. `computeWinProbVarianceScore(winProbHistory)` restituisce un modificatore da `-scoreWinProbVarianceMax` a `+scoreWinProbVarianceMax` (±5). Passa `context.winProbability` a `scoreGame` e il modificatore viene incorporato nel totale da solo.

Servono almeno `minDataPoints` (5) valori finiti. Qualsiasi altra cosa restituisce `undefined`, e il campo `winProbabilityVariance` del risultato viene lasciato del tutto fuori invece di essere impostato a `0`. Le voci non finite (`NaN`, `Infinity`) vengono scartate prima di controllare quel conteggio.

Il modificatore è la distanza assoluta media dei valori forniti da 0.5, mappata sull'intervallo ±5:

| Distanza media dal 50% | Modificatore |
|---|---|
| 0 (testa o croce) | +5 |
| `maxAvgDist` ÷ 2 (0.175) | 0 |
| ≥ `maxAvgDist` (0.35) | −5 |

Nonostante il nome, il modificatore misura la distanza media dal 50%, non la varianza. Una linea di probabilità di vittoria che oscilla tra il 10% e il 90% ottiene la stessa penalità di una tenuta stabile al 90%. Entrambe hanno la stessa distanza media dal punto medio.

Il modificatore si aggiunge dopo la detrazione per la pausa, non prima, e il risultato viene limitato da 0 a 100 prima che si aggiunga qualsiasi boost.

## Penalità pausa pubblicitaria

Una detrazione fissa viene tolta dal subtotale dei segnali mentre una partita è in pausa pubblicitaria, così ArenaSwap non passa a una partita che sta mostrando pubblicità. Chi chiama passa `context.onBreak`, e il motore toglie 15 punti fissi dal subtotale dei segnali finché è `true`. È `breakPenalty`. Se alcuni segnali sono disattivati, la detrazione scala insieme al resto del subtotale: 30 con metà del massimo dei segnali spento.

Viene tolta dopo i segnali e prima del modificatore di probabilità di vittoria, ed è una detrazione, non un moltiplicatore. Classica e Senso unico la pagano. Fantasy no. `onBreak` e `breakPenalty` del risultato dicono se si è applicata e quanto ha tolto. Sono `false` e `0` su un punteggio fermo all'intervallo o a una pausa.

`signalsSubtotal` sul risultato contiene la somma prima della detrazione, così un dettaglio può mostrare quanto è costata la pausa. `scoreGame` non rileva le pause da solo. Lo fa chi chiama. ArenaSwap legge le pause tra gli inning, i cambi di lanciatore e i timeout TV dal suo feed del tabellone e passa la risposta.

## Boost preferita, postseason e manuale

Questi tre vengono da te, non dalla partita, e valgono in ogni modalità. L'unica eccezione è Senso unico, che non paga mai il boost postseason. Passali in `options`:

| Opzione | Cosa fa |
|---|---|
| `favoriteTeamCount` e `favoriteBoostPoints` | Punti per ogni squadra preferita nella partita, quindi una sfida tra due preferite paga due volte. |
| `postseasonBoostPoints` e `game.postseasonRound` | Punti per un turno che decide il titolo (`0`), con una quota per i precedenti: `1` semifinale 75%, `2` quarti di finale 50%, `3` qualsiasi turno precedente 25%. |
| `gameBoost` | Un boost manuale fisso, come quello che uno spettatore imposta su una partita. |

Compaiono in `score.boosts` come `favoriteBoost`, `postseasonBoost` e `gameBoost`, una volta che li hai richiesti. I boost preferita e postseason si aggiungono dopo i boost propri della modalità e la sua combinazione, e il totale viene di nuovo limitato a 100. `gameBoost` si aggiunge per ultimo, ed è l'unica cosa a cui è permesso superare 100. È voluto: una partita fissata da uno spettatore deve poter battere un punteggio perfetto.

Nessuno paga niente se non gli dai dei punti. Il pacchetto non ha un valore predefinito per nessuno. Come ArenaSwap trasforma le impostazioni salvate di uno spettatore in questi numeri è spiegato [nella sua documentazione](/arenaswap/docs/extension/settings/#scoring), non in questo pacchetto.

## Se usi ancora l'API 2.x

`computePowerScore` mantiene il suo comportamento 2.x: segnali e probabilità di vittoria, senza nessuno dei boost dei momenti. `computeScoringOpportunityBoost(game)` restituisce ancora da solo il numero dell'opportunità di segnare, e `normalizePowerScoreResult` limita e passa ancora `favoriteBonus`, `gameBoost` e `postseasonBoost` per un risultato che costruisci a mano. Tutti sono deprecati ma funzionanti. Vedi [il riferimento API](/arenaswap/docs/powerscore/api-reference/#the-2x-api) per l'elenco completo.
