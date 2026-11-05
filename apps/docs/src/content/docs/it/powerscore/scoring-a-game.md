---
sourceHash: 'd23f4e1a7b17'
title: Calcola una partita da dati in diretta
description: Mappa il tuo feed su un oggetto Game, conserva lo storico dei punteggi tra le interrogazioni, attiva i boost e le modalità che i tuoi dati supportano e aggiungi boost preferita e manuale.
section: powerscore
order: 2
navLabel: Calcolo da dati in diretta
faq:
  - q: scoreGame controlla se una partita è davvero in diretta?
    a: Solo i boost lo fanno. Non pagano niente a meno che lo status della partita sia 'in'. I segnali calcolano comunque una partita non ancora iniziata o già finita, e una partita in pausa o interrotta vale 0. Filtra tu per primo le partite in diretta, come fa ArenaSwap prima ancora di chiamare il calcolo.
  - q: Posso usare PowerScore con leghe che non elenca?
    a: Sì. Game è generico sull'id della lega, e un id che la tabella incorporata non conosce viene calcolato con i valori predefiniti del suo sport. Se i valori predefiniti sono sbagliati, sovrascrivi per chiamata numero e durata dei periodi con options.league.
---

`scoreGame` non scarica niente. Calcola qualunque oggetto `Game` e context gli passi. Questa pagina costruisce entrambi da un feed inventato, poi attiva più parti del motore man mano che i tuoi dati lo permettono.

## Mappa il tuo feed su un Game

Servono solo `id`, `league`, `sportType` e i due punteggi delle squadre. Tutto il resto affina il punteggio quando il tuo feed ce l'ha, e conta come sconosciuto quando non ce l'ha. Mappa ciò che hai e salta il resto.

```ts
import { scoreGame } from 'powerscore';
import type { Game } from 'powerscore';

// Whatever your feed sends. This one is invented.
interface FeedEvent {
	id: string;
	state: 'scheduled' | 'live' | 'final';
	period: number;
	clock: string; // '0:45'
	halftime: boolean;
	home: { name: string; points: number };
	away: { name: string; points: number };
}

const toGame = (event: FeedEvent): Game => ({
	id: event.id,
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { score: event.home.points, abbreviation: event.home.name },
	awayTeam: { score: event.away.points, abbreviation: event.away.name },
	period: event.period,
	clockSeconds: parseClock(event.clock), // '0:45' -> 45
	status: event.state === 'live' ? 'in' : event.state === 'final' ? 'post' : 'pre',
	intermission: event.halftime,
});

const score = scoreGame(toGame(event));
```

Imposta `status` onestamente. `'in'` è ciò che i boost controllano prima di pagare qualsiasi cosa. Un flag `intermission` o `delayed` porta l'intero punteggio a 0 finché il gioco non riprende, così una partita in pausa pubblicitaria o con interruzione per pioggia non può battere una in corso.

## Dagli di più, e si attiva di più

Ogni campo facoltativo attiva la parte del motore che ne ha bisogno. Lasciane fuori uno e quella parte vale 0. Non viene sollevato nessun errore.

| Dagli | In | E si attivano |
|---|---|---|
| Istantanee del punteggio, dalla più vecchia | `context.history` | Momentum, Sorpassi, Rimonta. Servono almeno 3 istantanee. |
| Probabilità di vittoria, da 0 a 1 a ogni interrogazione | `context.winProbability` | Il modificatore ±5 di probabilità di vittoria. Servono almeno 5 valori. |
| Se la partita è in pausa pubblicitaria | `context.onBreak` | La detrazione per la pausa. |
| `possession`, `yardsToEndZone`, `down`, `distance` e `timeouts` sulla squadra | `game`, `game.homeTeam` | Il two-minute drill e la situazione di football di Fantasy. |
| `isRedZone`, più `down`, `distance` e `isGoalToGo` | `game` | Il boost della red zone. |
| `baseRunners`, `outs`, `topOfInning` | `game` | Corridori in base e punto del vantaggio. |
| `hits` su ogni squadra | `game.homeTeam`, `game.awayTeam` | Il no-hitter. |
| `series`, e `rank` su ogni squadra | `game`, `game.homeTeam` | In palio: una serie al limite, due squadre in classifica. |
| `context.stakes` | `context` | In palio: una corsa a fine stagione. |
| `pregameLine` | `context` | Allarme sorpresa. Usa la quota di prima della partita. |
| `redCards` | `game` | Il boost del cartellino rosso, calcio. |
| `powerPlay`, `emptyNet` | `context` | L'opportunità di segnare dell'hockey. |
| `fantasy` | `context` | La modalità Fantasy. |
| `nickname` su ogni squadra | `game.homeTeam`, `game.awayTeam` | I nomi delle squadre in `reason`, al posto dell'abbreviazione. |
| `seasonType`, `postseasonRound` | `game` | In palio legge la partita come postseason (una serie) invece che come stagione regolare (classifiche e corse). |
| `recentLeadChanges` | `context` | Un conteggio dei sorpassi dal registro delle azioni del tuo feed, per i ribaltoni tra un'interrogazione e l'altra. |

I campi sono tutti nella [pagina dei tipi](/arenaswap/docs/powerscore/types/#game), e cosa paga ogni boost è in [Boost e penalità](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Conserva uno storico dei punteggi per momentum, sorpassi e rimonta

Quei tre segnali leggono da `context.history`, una lista dei punteggi passati di una partita, e restano a 0 finché non ha almeno tre istantanee. Tienine una a ogni interrogazione, in ordine, dalla più vecchia, con un timestamp in millisecondi. I timestamp devono solo essere relativi tra loro. Non devono essere l'ora reale.

```ts
import { scoreGame } from 'powerscore';
import type { Game, ScoreSnapshot } from 'powerscore';

const game: Game = {
	id: 'g-401',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { score: 88, abbreviation: 'BOS' },
	awayTeam: { score: 82, abbreviation: 'LAL' },
	period: 3,
	clockSeconds: 300,
	status: 'in',
};

const history: ScoreSnapshot[] = [
	{ gameId: game.id, timestamp: 0, homeScore: 75, awayScore: 80 },
	{ gameId: game.id, timestamp: 15_000, homeScore: 79, awayScore: 80 },
	{ gameId: game.id, timestamp: 30_000, homeScore: 88, awayScore: 82 },
];

const score = scoreGame(game, { history });
```

Boston era sotto di 5 e ha appena preso il comando con una serie di 13-2:

```ts
score.total;  // 86
score.reason; // 'BOS came back from 5 down to lead. Up 6 in the 3rd quarter'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 16
```

Taglia le istantanee più vecchie di `historyWindowMs` dello sport, così l'array non cresce all'infinito. Quella finestra, e il resto della taratura specifica per sport, sta in [Configurazione di sport e leghe](/arenaswap/docs/powerscore/configuration/).

## Tieni traccia di pause e probabilità di vittoria, se le hai

Vanno tutte nel context. Se riesci a capire quando una partita è in pausa pubblicitaria, passa `onBreak`:

```ts
const score = scoreGame(game, { history, onBreak: isInBreak(game), winProbability });
```

`isInBreak` lo scrivi tu, da qualunque cosa il tuo feed dica su pause tra inning, cambi di lanciatore e timeout. Finché `onBreak` è `true`, il punteggio perde 15 punti fissi.
`winProbability` è una lista di valori recenti di probabilità di vittoria da 0 a 1, per l'una o l'altra squadra. Conta solo la distanza dal 50%. Entrambi sono facoltativi, e PowerScore calcola bene anche senza. Cosa cambia ciascuno è in [Boost e penalità](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Fai vedere ai boost il momento

Baseball, football, hockey e calcio portano ciascuno una situazione che il punteggio da solo non mostra. Aggiungi i campi che il tuo feed ha, e `scoreGame` li paga. Ecco una partita di baseball nella parte bassa del 9°, in parità, basi piene, un out:

```ts
const score = scoreGame({
	id: 'g-402',
	league: 'mlb',
	sportType: 'baseball',
	status: 'in',
	homeTeam: { score: 3, hits: 5 },
	awayTeam: { score: 3, hits: 4 },
	period: 9,
	topOfInning: false,
	outs: 1,
	baseRunners: { first: true, second: true, third: true },
});

score.boosts.filter(boost => boost.points > 0);
// [
//   { id: 'scoringOpportunity', points: 10 },
//   { id: 'goAheadRun', points: 10 },
// ]
```

Quei due insieme riempiono il limite di 20 del gruppo dei momenti. Il football ottiene la red zone da `isRedZone`, pesata per `down`, `distance` e `isGoalToGo`, e il two-minute drill da `possession`, `yardsToEndZone` e `down`. L'opportunità di segnare dell'hockey ha bisogno di `context.powerPlay` e `context.emptyNet`. Il calcio ha bisogno di `redCards`.

## Calcolala in un'altra modalità

Scegli una modalità con `options.mode`. Senso unico non ha bisogno di niente in più. Fantasy ha bisogno della tua rosa nel context, una voce per giocatore:

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

`pointEvents` è il modo in cui Punti fantasy vede un giocatore che ha segnato punti fantasy un minuto fa. Per trasformare una riga di boxscore in quei punti, usa [`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints). Una partita senza nessuno dei tuoi giocatori viene calcolata come Classica, e `score.modeId` lo dice.

## Aggiungi boost preferita, postseason e manuale

Calcola prima la partita, e lascia che le opzioni aggiungano ciò che PowerScore non sa, come la squadra preferita di uno spettatore. Le stesse opzioni valgono in ogni modalità.

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 106
```

I boost preferita e postseason si aggiungono al totale e sono limitati a 100. `gameBoost` si aggiunge dopo, ed è l'unica cosa a cui è permesso superare 100, così una partita fissata da uno spettatore può battere un punteggio perfetto. Una partita ferma li salta tutti: una partita ferma non può battere una in corso.

Il [codice di punteggio](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts) di ArenaSwap costruisce le sue opzioni allo stesso modo prima di passare i punteggi al selettore di schede.

## Il modo 2.x

`computePowerScore(game, history, winProbabilityHistory)` funziona ancora e restituisce il risultato piatto 2.x, senza boost dei momenti. È la scelta giusta se vuoi solo il numero che hai sempre avuto. [Il riferimento API](/arenaswap/docs/powerscore/api-reference/#the-2x-api) elenca tutto ciò che c'è ancora.
