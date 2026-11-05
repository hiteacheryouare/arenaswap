---
sourceHash: '854afd07d71b'
title: Configurazione di sport e leghe
description: Ogni campo di SportTypeConfig e LeagueConfig, i loro valori predefiniti per tutti e sei gli sport e le 31 leghe, e come si stabilisce cosa significa "tirata" per uno sport.
section: powerscore
order: 5
navLabel: Configurazione
---

`scoreGame` consulta due mappe esportate all'inizio di ogni chiamata. `sportTypeConfigMap`, indicizzata per `SportType`, contiene come si gioca uno sport. `leagueConfigMap`, indicizzata per `LeagueId`, contiene quanto durano i periodi di una lega. Se i valori incorporati non si adattano ai tuoi dati, puoi sovrascriverne una per chiamata tramite `options.sport` e `options.league`. [Adattala a una tua lega](#tune-it-for-a-league-powerscore-doesnt-ship) mostra come.

## SportTypeConfig

Una voce per ogni `SportType`, esportata come `sportTypeConfigs` (un array) e `sportTypeConfigMap` (indicizzata per `id`). Questa tabella contiene i valori effettivi dei sei sport, e [cosa significano i campi](#what-the-sport-fields-mean) la segue. Classica li legge tutti. Senso unico legge `closenessMargins`, `momentumBigRun` e `momentumSmallRun`, il tempo di dimezzamento del momentum e `historyWindowMs`.

| Campo | basketball | football | hockey | soccer | baseball | softball |
|---|---|---|---|---|---|---|
| `clockBased` | true | true | true | true | false | false |
| `closenessMargins` (t1, t2, t3) | 5, 10, 18 | 3, 9, 14 | 1, 2, 3 | 1, 2, 3 | 1, 3, 5 | 1, 3, 5 |
| `momentumBigRun` / `momentumSmallRun` | 8 / 4 | 10 / 4 | 2 / 1 | 2 / 1 | 3 / 1 | 3 / 1 |
| `comebackThresholdBig` / `comebackThresholdSmall` | 6 / 3 | 7 / 3 | 2 / 1 | 2 / 1 | 2 / 1 | 2 / 1 |
| `clockCountsUp` | false | false | false | true | false | false |
| `clockIsFullGameElapsed` | false | false | false | true | false | false |
| `zeroZeroAsFullTie` | false | false | true | true | false | false |
| `zeroZeroPenaltyPeriods` | nessuno | nessuno | 1, 2 | 1 | nessuno | nessuno |
| `otPreBoostWindowSecs` | 60 | 60 | 60 | 60 | 0 | 0 |
| `decayHalfLifeMs.momentum` | 45,000 | 135,000 | 180,000 | 240,000 | 150,000 | 150,000 |
| `decayHalfLifeMs.leadChange` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `decayHalfLifeMs.comeback` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `historyWindowMs` | 300,000 (5 min) | 720,000 (12 min) | 960,000 (16 min) | 1,200,000 (20 min) | 720,000 (12 min) | 720,000 (12 min) |
| `lateGameCurve` | nessuna | nessuna | nessuna | nessuna | 9 inning, parte dal 6 | 7 inning, parte dal 5 |

`historyWindowMs` è l'arco di storico dei punteggi che ogni sport deve conservare perché funzionino momentum, sorpassi e rimonta. Il segnale Vantaggio tenuto di Senso unico si misura sulla stessa finestra. È almeno quattro volte il tempo di dimezzamento più lungo dello sport. Quel margine lascia a un segnale il tempo di spegnersi del tutto prima di uscire dalla finestra, comunque spesso interroghi.

### Cosa significano i campi dello sport

| Campo | Significato |
|---|---|
| `clockBased` | Lo sport ha un cronometro di gioco. Baseball e softball no, quindi la pressione di fine gara scorre sugli inning. |
| `closenessMargins` | I tre margini a cui scende l'Equilibrio: entro t1 è serratissima, entro t2 è tirata, entro t3 è al limite, oltre t3 non dà punti. Altri segnali e boost li riusano, come il limite di rimonta da imbarcata di Rimonta a t2 e la soglia di Dominio precoce di Senso unico oltre t3. |
| `momentumBigRun`, `momentumSmallRun` | La serie netta nella finestra di storico che dà il livello pieno e il mezzo livello di Momentum. |
| `comebackThresholdBig`, `comebackThresholdSmall` | L'oscillazione che dà il livello alto e quello moderato di Rimonta. |
| `clockCountsUp` | Il cronometro mostra il tempo giocato, non quello rimasto. Solo il calcio. |
| `clockIsFullGameElapsed` | Il cronometro corre per tutta la partita (da 0' a 90'+) invece di ripartire a ogni periodo, quindi i periodi completati si sottraggono prima di calcolare il tempo rimasto. Solo il calcio. |
| `zeroZeroAsFullTie` | Una partita 0–0 ottiene il pieno credito di parità in Equilibrio. Con `false`, lo 0–0 ottiene il livello ridotto `zeroZero`. |
| `zeroZeroPenaltyPeriods` | I periodi in cui lo 0–0 ottiene comunque il livello ridotto anche se `zeroZeroAsFullTie` è `true`. L'hockey usa 1 e 2, il calcio il primo tempo. |
| `otPreBoostWindowSecs` | Gli ultimi secondi dell'ultimo periodo regolamentare in cui una partita in parità sale verso il pre-boost dei supplementari. `0` lo disattiva. |
| `decayHalfLifeMs` | Quanto in fretta Momentum, Sorpassi e Rimonta svaniscono dopo l'ultimo punto. Più lungo negli sport a punteggio basso, perché un gol li tiene vivi fino al successivo. |
| `historyWindowMs` | Quanto storico dei punteggi leggono i segnali basati sullo storico. Vedi sopra. |
| `lateGameCurve` | Solo baseball e softball: quanti inning ha il tempo regolamentare e da quale inning parte la salita di fine gara. |

## LeagueConfig

Una voce per ogni `LeagueId`, esportata come `leagueConfigs` (un array) e `leagueConfigMap` (indicizzata per `id`), più `allLeagueIds` per la semplice lista. `periodFormat` è solo testo da mostrare e non influisce sul punteggio. Ogni voce porta anche alcuni campi che ArenaSwap usa per recuperare i dati e per decidere quanto una partita occupa una barra del calendario. Il calcolo non li legge, quindi non sono in tabella.

| Lega | Sport | Periodi | Durata del periodo |
|---|---|---|---|
| NBA (`nba`) | basketball | 4 | 720s |
| WNBA (`wnba`) | basketball | 4 | 600s |
| NCAA Basketball (`ncaab`) | basketball | 2 | 1200s |
| NCAA Women's Basketball (`ncaaw`) | basketball | 4 | 600s |
| Olympic Men's Basketball (`olybkm`) | basketball | 4 | 600s |
| Olympic Women's Basketball (`olybkw`) | basketball | 4 | 600s |
| NFL (`nfl`) | football | 4 | 900s |
| NCAA Football (`ncaaf`) | football | 4 | 900s |
| UFL (`ufl`) | football | 4 | 900s |
| NHL (`nhl`) | hockey | 3 | 1200s |
| NCAA Men's Hockey (`ncaamh`) | hockey | 3 | 1200s |
| Olympic Men's Ice Hockey (`olymih`) | hockey | 3 | 1200s |
| Olympic Women's Ice Hockey (`olywih`) | hockey | 3 | 1200s |
| MLB (`mlb`) | baseball | 9 inning | 0 |
| NCAA Baseball (`cbase`) | baseball | 9 inning | 0 |
| Olympic Men's Baseball (`olybb`) | baseball | 9 inning | 0 |
| World Baseball Classic (`wbbc`) | baseball | 9 inning | 0 |
| NCAA Softball (`csoft`) | softball | 7 inning | 0 |
| MLS (`mls`) | soccer | 2 | 2700s |
| English Premier League (`epl`) | soccer | 2 | 2700s |
| La Liga (`laliga`) | soccer | 2 | 2700s |
| Bundesliga (`bundesliga`) | soccer | 2 | 2700s |
| Serie A (`seriea`) | soccer | 2 | 2700s |
| Liga MX (`ligamx`) | soccer | 2 | 2700s |
| UEFA Champions League (`ucl`) | soccer | 2 | 2700s |
| UEFA Europa League (`uel`) | soccer | 2 | 2700s |
| NWSL (`nwsl`) | soccer | 2 | 2700s |
| FIFA World Cup (`fifawc`) | soccer | 2 | 2700s |
| FIFA Women's World Cup (`fifawwc`) | soccer | 2 | 2700s |
| Olympic Men's Soccer (`olysocm`) | soccer | 2 | 2700s |
| Olympic Women's Soccer (`olysocw`) | soccer | 2 | 2700s |

In tutto 31 leghe, quanti sono i membri di `LeagueId`.

## Come si stabilisce cosa significa "tirata" per uno sport

Una sola tupla, `closenessMargins: [t1, t2, t3]`, decide diverse cose per uno sport. Sceglie in quale fascia di equilibrio cade un margine: serratissima a `t1`, tirata a `t2`, al limite a `t3`, fuori portata oltre. Sceglie anche il tetto verso cui sale la pressione di fine gara, la fascia in cui paga il boost della red zone nel football, il punto da cui Senso unico inizia a pagare (due possessi di distanza, oltre `t2`) e quanta importanza ha la posta in gioco.

I `[5, 10, 18]` del basket significano che una partita da 2 punti è serratissima e una da 9 è tirata. Una da 18 punti è l'ultima che conta ancora come al limite. I `[1, 2, 3]` di hockey e calcio trattano una partita da 2 gol come il basket tratta una da 9 punti. Cambiare cosa significa "tirata" per uno sport vuol dire cambiare una tupla, non una manciata di soglie separate.

## Adattala a una lega che PowerScore non include

`Game` è generico sull'id della lega, quindi un feed con id propri funziona così com'è: `Game<string>`. Una lega che la tabella non conosce viene calcolata con i valori predefiniti del suo sport. Ogni sport corrisponde alla sua lega più nota per numero di periodi e cronometro:

| Sport | Valore predefinito |
|---|---|
| Basketball | NBA |
| Hockey | NHL |
| Baseball | MLB |
| Football | NFL |
| Softball | NCAA Softball |
| Soccer | MLS |

`sportType` è l'unica cosa che devi azzeccare. Governa gran parte di ciò che fa un segnale, qualunque sia la `league`. Un `sportType` non riconosciuto ricade separatamente sulla taratura dei segnali del basket. Entrambi i ripieghi fanno sì che la partita venga comunque calcolata invece di sollevare un errore.

Se i valori predefiniti non vanno bene per la tua lega, sovrascrivili per chiamata:

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

`options.league` accetta qualsiasi parte di una `LeagueConfig`, di solito numero e durata dei periodi. `options.sport` accetta qualsiasi parte di una `SportTypeConfig`, come i margini di equilibrio, le soglie del momentum o i tempi di dimezzamento. Le sovrascritture valgono solo per quella chiamata, e le mappe esportate restano come erano.

`sportTypeConfigMap` e `leagueConfigMap` sono semplici oggetti esportati, letti a ogni chiamata e non da una copia in cache. Modificarli a runtime cambia davvero il comportamento del punteggio, ma niente nei tipi o negli export del pacchetto lo considera un punto di estensione supportato, e una versione futura non è tenuta a mantenerlo funzionante. Usa le opzioni.
