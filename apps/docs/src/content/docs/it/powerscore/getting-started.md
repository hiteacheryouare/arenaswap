---
sourceHash: '1cae3a43d11e'
title: Calcola il tuo primo punteggio con PowerScore
navLabel: Per iniziare
description: Installa il pacchetto powerscore e calcola il punteggio di una partita in diretta con scoreGame in poche righe di codice, ottenendo un numero e un motivo che vedi nel terminale.
section: powerscore
order: 1
faq:
  - q: powerscore ha bisogno di una chiave API o di un account?
    a: No. Calcola solo lo stato di gioco che gli passi. Recuperare quello stato, da qualunque fonte arrivino i tuoi punteggi, è compito del tuo codice.
  - q: powerscore funziona nel browser?
    a: Sì. Non ha dipendenze a runtime e tocca solo oggetti semplici e calcoli. Si include in un'estensione del browser come gira in Node.
  - q: Devo riscrivere il mio codice 2.x per PowerScore 3?
    a: No. computePowerScore e i tipi 2.x funzionano ancora e restituiscono gli stessi totali di prima. Passa a scoreGame quando vuoi le modalità o i nuovi boost.
---

Qui installi `powerscore` e calcoli il punteggio di una partita in diretta, ottenendo un numero e le ragioni che stanno dietro.

## Installa il pacchetto

```bash
npm install powerscore
```

Il pacchetto è anche su [npm](https://www.npmjs.com/package/powerscore). Per vederlo calcolare le partite vere di stasera, visita la [pagina di PowerScore](/arenaswap/powerscore/).

## Descrivi la partita

`scoreGame` ha bisogno di un oggetto `Game`: i due punteggi, quale lega e quale sport è, e a che punto è la partita adesso. Imposta `status: 'in'` per una partita in diretta, perché è ciò che i boost controllano prima di assegnare qualsiasi punto.

```ts
import { scoreGame } from 'powerscore';
import type { Game } from 'powerscore';

const game: Game = {
	id: 'demo-1',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	homeTeam: { score: 101, abbreviation: 'BOS' },
	awayTeam: { score: 99, abbreviation: 'LAL' },
	period: 4,
	clockSeconds: 45,
};
```

Boston è avanti di due punti con 45 secondi da giocare nel quarto quarto. È una partita tirata e a fine gara: esattamente ciò che cerca PowerScore.

## Calcola il punteggio

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

Eseguilo e il terminale stampa:

```text
68
BOS up 2 with 0:45 left
```

`scoreGame` accetta altri due argomenti, entrambi facoltativi: un `context` per tutto ciò che la partita non porta con sé (storico dei punteggi, probabilità di vittoria, la quota prima della partita, una rosa fantasy) e `options` per come calcolare (quale modalità, quali segnali disattivare). Senza nessuno dei due ottieni Classica, la modalità che si chiede se una partita è tirata e a fine gara.

## Leggi il dettaglio

`score` porta più del numero in evidenza. Ogni segnale è presente come voce di una lista con i suoi punti e il suo massimo, insieme ai boost e ai motivi.

```ts
console.log(score.signals);
// [
//   { id: 'closeness',   points: 34, ceiling: 42, disabled: false },
//   { id: 'lateGame',    points: 34, ceiling: 38, disabled: false },
//   { id: 'momentum',    points: 0,  ceiling: 38, disabled: false },
//   { id: 'leadChanges', points: 0,  ceiling: 18, disabled: false },
//   { id: 'comeback',    points: 0,  ceiling: 20, disabled: false },
// ]
```

Qui l'intero punteggio è fatto di equilibrio e pressione di fine gara. Senza uno storico dei punteggi da guardare, momentum, sorpassi e rimonta non hanno ancora niente da misurare, quindi restano a 0. Passa a `scoreGame` una `history` nel context e si svegliano. I boost sono in `score.boosts`, tutti a 0 per questa partita, perché una partita di basket non ha corridori, red zone o portiere sostituito da pagare.

Usa `signalPoints(score, 'momentum')` e `boostPoints(score, 'noHitter')` per cercarne uno per id.

## Prova un'altra modalità

La stessa partita può rispondere a un'altra domanda. Le modalità si scelgono con `options.mode`:

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

Senso unico si chiede se qualcuno sta scappando via. Una partita da 2 punti no, quindi vale il 30% del suo 68 Classica e niente di più. Quel minimo tiene idonea una partita tirata in una serata senza batoste. Fantasy si chiede se sta per succedere qualcosa ai tuoi giocatori. [La pagina dei segnali](/arenaswap/docs/powerscore/signals/) le copre tutte e tre.

Per calcolare una partita che il tuo codice interroga di continuo, leggi [Calcola una partita da dati in diretta](/arenaswap/docs/powerscore/scoring-a-game/). Per cosa misura ogni segnale e perché, leggi [I segnali di PowerScore in ogni modalità](/arenaswap/docs/powerscore/signals/).
