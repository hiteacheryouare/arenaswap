---
sourceHash: '40ee38646993'
title: I tipi TypeScript di PowerScore
description: Ogni campo di Game, ScoringContext, ScoreOptions, PowerScore e dei tipi di modalità e configurazione, quali sono facoltativi e cosa succede quando uno facoltativo manca.
section: powerscore
order: 7
navLabel: Tipi
---

I tipi di PowerScore 3 stanno in tre gruppi. Quello che passi a `scoreGame`: [`Game`](#game), [`ScoringContext`](#scoringcontext) e [`ScoreOptions`](#scoreoptions). Quello che ricevi: [`PowerScore`](#powerscore). E di cosa è fatta una modalità: [`PowerScoreMode`](#powerscoremode) e le sue parti. I tipi 2.x sono in fondo, ancora esportati e funzionanti.

## Game

Lo stato della partita adesso. Servono solo `id`, `league`, `sportType` e i due punteggi delle squadre. Tutto il resto affina il punteggio quando c'è. Ogni campo facoltativo assente è trattato come sconosciuto, non come un valore predefinito.

`Game` è generico sull'id della lega: `Game<League extends string = LeagueId>`. Un `Game` semplice significa quello che ha sempre significato. Un feed con id di lega propri usa `Game<string>`.

| Campo | Tipo | Se manca |
|---|---|---|
| `id` | `string` | Obbligatorio. |
| `league` | `League` | Obbligatorio. Un id che `leagueConfigMap` non riconosce viene valutato con i valori predefiniti del suo sport (vedi [Configurazione di sport e leghe](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship)). |
| `sportType` | `SportType` | Obbligatorio. Un valore che `sportTypeConfigMap` non riconosce ricade sulla taratura del basket. |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | Obbligatorio. |
| `period?` | `number` | La pressione di fine gara vale `0`. L'equilibrio segna comunque, ma anche l'avanzamento della partita vale `0`, quindi paga solo il suo minimo fisso invece del valore pieno della fascia. |
| `clockSeconds?` | `number` | Trattato come sconosciuto, non come `0:00`. La rampa di fine gara resta all'inizio del periodo e ogni boost legato al cronometro paga 0. |
| `intermission?` | `boolean` | `false`. `true` ferma la partita: tutto vale 0 finché il gioco non riprende. |
| `delayed?` | `boolean` | `false`. `true` ferma la partita, come `intermission`. |
| `status?` | `'pre' \| 'in' \| 'post'` | I boost non pagano niente per qualunque valore diverso da `'in'`, compreso uno mancante. I segnali non lo leggono. |
| `topOfInning?` | `boolean` | Baseball e softball. Vale tra i valori di equilibrio del primo e del secondo tempo dell'inning. Il punto del vantaggio in base e il no-hitter ne hanno bisogno. |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | Baseball e softball. Trattato come nessun corridore in base. |
| `outs?` | `number` | Baseball e softball. Trattato come 0. A 3, i boost basati sui corridori non pagano niente. |
| `possession?` | `'home' \| 'away'` | Football, o il disco dove un feed lo riporta. Senza, il two-minute drill paga 0 e Fantasy non ha una situazione di football. |
| `yardsToEndZone?` | `number` | Football. Le yard che servono alla squadra in possesso. Servono al two-minute drill e a Fantasy. |
| `isRedZone?` | `boolean` | Solo football. `false` o mancante significa che il caso red zone del boost opportunità di segnare paga 0. |
| `down?` | `number` | Solo football. Ricade sul moltiplicatore non pesato (×1) invece di perdere del tutto il boost. Nel two-minute drill e in Fantasy, un `down` sotto 1 si legge come tra un'azione e l'altra. |
| `distance?` | `number` | Solo football. Al 3° down, un valore mancante non può qualificarsi come 3° e corto, quindi ricade su ×1. |
| `isGoalToGo?` | `boolean` | Solo football, e cambia qualcosa solo al 4° down. |
| `series?` | [`SeriesState`](#seriesstate) | Nessuna serie, quindi In palio non legge niente. |
| `redCards?` | [`RedCard[]`](#redcard) | Calcio. Nessun cartellino. |
| `seasonType?` | `'regular' \| 'postseason'` | In palio tratta la partita come postseason quando lo dice questo o è impostato `postseasonRound`, e come regular season altrimenti. |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | Nessun boost postseason. `0` decide il titolo, `1` è una semifinale, `2` un quarto di finale, `3` qualsiasi turno precedente. |

`SportId` è un alias deprecato di `LeagueId`, tenuto per compatibilità con la 1.x. Usa `LeagueId`.

### TeamState

```ts
interface TeamState {
	score: number;
	abbreviation?: string;
	nickname?: string;
	rank?: number;
	hits?: number;
	errors?: number;
	timeouts?: number;
}
```

| Campo | Se manca |
|---|---|
| `score` | Obbligatorio. |
| `abbreviation` | Nomina la squadra nelle ragioni quando manca anche `nickname`, e compare come `?` quando mancano entrambi. |
| `nickname` | Come le ragioni chiamano la squadra: "Lakers", "Nittany Lions", o il nome breve di un club di calcio come "Portland". Ricade su `abbreviation`. |
| `rank` | La squadra non è classificata. Omettilo anche per una testa di serie di tabellone: è una posizione in un sondaggio, dove 1 è la migliore. In palio ne ha bisogno su entrambe le squadre. |
| `hits` | Baseball e softball. Nessun conteggio di valide, quindi il no-hitter non può pagare. `0` è un valore vero: significa una squadra senza valide. |
| `errors` | Baseball e softball. Oggi non è letto da nessun punteggio. |
| `timeouts` | Football. Il two-minute drill usa un peso neutro per il controllo del cronometro. |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

Una serie più corta di un al meglio delle 3 non paga niente.

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

Tutto quello che la partita stessa non porta con sé. Ogni campo è facoltativo, e `scoreGame` prende l'intero oggetto come secondo argomento.

| Campo | Tipo | Se manca |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | Momentum, Sorpassi e Rimonta restano a 0 finché non contiene 3 voci. Dalla più vecchia. |
| `onBreak?` | `boolean` | Chi chiama ha rilevato una pausa pubblicitaria. `true` toglie `breakPenalty` (15) dal subtotale dei segnali. Nessuna detrazione per la pausa quando manca. |
| `winProbability?` | `number[]` | Probabilità di vittoria della squadra di casa durante la partita, da 0 a 1. Servono 5 valori finiti perché conti. Nessun modificatore altrimenti. |
| `pregameLine?` | [`PregameLine`](#pregameline) | Allarme sorpresa e Sorpresa a senso unico pagano 0. |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | Nessuna posta in gioco nella corsa. Vedi [`TeamStakes`](#teamstakes). |
| `powerPlay?` | `'home' \| 'away' \| boolean` | Nessun power play nel boost opportunità di segnare. Un lato quando il feed dice di chi è, `true` quando dice solo che ce n'è uno. |
| `emptyNet?` | `'home' \| 'away' \| boolean` | Nessuna porta vuota nel boost opportunità di segnare. Impostalo solo dopo che il feed l'ha riportata in due interrogazioni di fila. |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | Sorpassi contati dal registro delle azioni di un feed, che vede i cambi tra un'interrogazione e l'altra, con l'ora dell'ultimo. Usato quando ne conta più di quelli che mostra `history`. Sorpassi ha comunque bisogno dei 3 snapshot. |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | Fantasy non ha giocatori, e la partita è valutata come Classica. |

### ScoreSnapshot

Una fotografia del punteggio di una partita in un momento preciso, usata per rilevare momentum, sorpassi e rimonte. Tutti e quattro i campi sono obbligatori.

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

`timestamp` deve solo essere relativo agli altri snapshot dello stesso array. Il decadimento si misura rispetto al timestamp dello snapshot più recente, non all'ora reale. Rigiocare lo stesso storico dà lo stesso risultato, in qualunque momento lo si rigiochi.

### PregameLine

La linea com'era prima della partita. Una linea dal vivo si muove con il punteggio e cancellerebbe una sorpresa.

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

`spread` sono i punti dati alla favorita, come numero positivo, e lo leggono solo basket e football. Con entrambe le moneyline, il margine del bookmaker viene tolto prima dell'uso. `drawMoneyline` è la linea a tre esiti del calcio. Una run line o una puck line da sola dice chi è favorito ma non di quanto, quindi non basta.

### TeamStakes

Indicatori della corsa di fine stagione per una squadra, solo regular season.

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

`canClinch` significa che vincere questa partita assicura un posto, una division o un titolo qualunque cosa accada. `canBeEliminated` significa che perdere butta la squadra fuori dalla corsa. `inRace` significa ancora in gioco, né al sicuro né fuori. `nearLine` è a pochi punti da una linea della classifica.

### FantasyPlayerState

Un giocatore della tua rosa in una partita.

```ts
interface FantasyPlayerState {
	id: string;
	name?: string;
	side: 'home' | 'away';
	position: FantasyPosition;
	active?: boolean;
	role?: 'atBat' | 'onDeck' | 'inHole' | 'pitching';
	pointEvents?: { at: number; points: number }[];
}
```

`FantasyPosition` è `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'`: i ruoli del football, un lanciatore e un battitore per il baseball, e un giocatore generico altrove. `name` compare nelle ragioni, come "Mahomes in red zone". `active: false` significa che il feed dice che il giocatore è fuori dalla partita, e non conta per niente. `role` è solo baseball: dove si trova il giocatore nell'inning. `pointEvents` sono i punti fantasy come sono arrivati, così la produzione recente sfuma come ogni altro evento.

## ScoreOptions

Come valutare. Ogni campo è facoltativo, e `scoreGame` prende l'oggetto come terzo argomento.

| Campo | Tipo | Cosa fa |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | Quale modalità valuta la partita. Classica quando manca. |
| `disabledSignals?` | `readonly string[]` | Id dei segnali della modalità da disattivare. Gli altri vengono riscalati sull'intero intervallo della modalità. |
| `classicDisabledSignals?` | `readonly string[]` | Id dei segnali da disattivare in Classica quando è combinata o usata come minimo. |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | Sovrascrive la combinazione propria della modalità, come il cursore Fantasy di chi guarda. |
| `favoriteTeamCount?` | `number` | Quante squadre preferite ci sono nella partita. |
| `favoriteBoostPoints?` | `number` | Punti per ogni squadra preferita. |
| `postseasonBoostPoints?` | `number` | Punti per una partita che decide il titolo. I turni precedenti ne ricevono una quota. |
| `gameBoost?` | `number` | Un boost manuale. L'unica cosa a cui è permesso spingere il totale oltre 100. |
| `sport?` | `Partial<SportTypeConfig>` | Per gli sport che le tabelle integrate non coprono, o per tararle. |
| `league?` | `Partial<LeagueConfig>` | Per le leghe che la tabella integrata non conosce. Imposta `regularPeriods` e `periodDurationSecs`. |

## PowerScore

Quello che restituisce `scoreGame`.

```ts
interface PowerScore {
	gameId: string;
	modeId: string;
	total: number;
	signals: ScoredSignal[];
	signalsSubtotal: number;
	scaledSubtotal: number;
	signalCeiling: number;
	frozen: boolean;
	onBreak: boolean;
	breakPenalty: number;
	winProbabilityVariance?: number;
	baseTotal: number;
	classicTotal?: number;
	blend?: BlendResult;
	boosts: ScoredBoost[];
	reasons: ReasonFragment[];
	reason: string;
}
```

| Campo | Significato |
|---|---|
| `modeId` | La modalità che ha davvero valutato la partita. Una modalità che non si applica, come Fantasy senza giocatori della tua rosa in partita, ricade su `'classic'`. |
| `total` | Da 0 a 100, e oltre 100 solo tramite `gameBoost`. |
| `signals` | Ogni segnale che la modalità definisce, con il suo massimo, anche a 0. Vedi [`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment). |
| `signalsSubtotal` | La somma dei segnali attivi prima di qualsiasi riscalatura per i segnali disattivati. |
| `scaledSubtotal` | La stessa dopo la riscalatura, limitata a `signalCeiling`. |
| `signalCeiling` | La somma dei massimi della modalità: 156 per Classica. |
| `frozen` | `true` all'intervallo, in una pausa o in un'interruzione. Tutto vale 0 e `reason` è vuoto. |
| `onBreak`, `breakPenalty` | Se è stata applicata la detrazione per la pausa pubblicitaria, e quanti punti ha tolto (sempre ≥ 0). Sono `false` e `0` su un punteggio fermo. |
| `winProbabilityVariance?` | Da −5 a +5. Assente, non `0`, senza abbastanza dati di probabilità di vittoria. |
| `baseTotal` | I segnali meno la detrazione per la pausa più il modificatore, da 0 a 100, prima di qualsiasi boost. |
| `classicTotal?` | Il totale di Classica stessa, quando la modalità si combina con lei. |
| `blend?` | Come una modalità combinata è arrivata al suo totale. Vedi [`BlendResult`](#blendresult). |
| `boosts` | Ogni boost che la modalità paga, a 0 quando non paga. Più `favoriteBoost`, `postseasonBoost` e `gameBoost` una volta che li hai richiesti. |
| `reasons` | Fino a tre frasi di fatti semplici, come frammenti pronti da tradurre: cosa sta succedendo adesso, cosa è appena successo, il punteggio e il tempo, e cosa è in palio. Vedi la [tabella delle ragioni nel README](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/powerscore/README.md#reasons) per ogni chiave. |
| `reason` | La stessa cosa in inglese, come frasi. Testo da mostrare, non un'API: può cambiare formulazione tra le versioni. Non confrontarlo. |

### ScoredSignal, ScoredBoost e ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number>; details?: ReasonFragment[] }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

`meta` su un boost porta ciò che una UI potrebbe voler dire, come `{ inning: 8 }` su un no-hitter o `{ secondsLeft: 95, trailBy: 3 }` su un two-minute drill. Un frammento di ragione è fatto così: `{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } }`. Le chiavi di ragione che le modalità integrate conoscono vengono rese in inglese in `reason`. Una chiave tua viene resa com'è, quindi traduci da `reasons`, non dalla stringa.

`details` su un boost dice cosa succede in questa partita che il boost paga, o non paga, come frammenti di ragione che una UI può tradurre: `{ key: 'seriesClinch', params: { team: 'CHW' } }` su In palio, oppure un portiere tolto e un power play insieme in un 6 contro 4 di hockey. È assente quando non c'è niente da dire, come prima dell'inizio di una partita o mentre il gioco è fermo. Per queste chiavi non esiste un renderer inglese; la tabella qui sotto elenca tutte quelle inviate dai boost integrati, con la frase che ArenaSwap mostra per ciascuna.

| Boost | Chiave | Parametri | In inglese |
| --- | --- | --- | --- |
| `scoringOpportunity` | `basesEmpty` | — | Bases empty, so there's nobody to bring home. |
| `scoringOpportunity` | `runnerFirst` | — | A runner on first. |
| `scoringOpportunity` | `runnerSecond` | — | A runner on second, in scoring position. |
| `scoringOpportunity` | `runnerThird` | — | A runner on third, one base from home. |
| `scoringOpportunity` | `runnersFirstSecond` | — | Runners on first and second. |
| `scoringOpportunity` | `runnersFirstThird` | — | Runners on the corners. |
| `scoringOpportunity` | `runnersSecondThird` | — | Runners on second and third, both in scoring position. |
| `scoringOpportunity` | `basesLoaded` | — | Bases loaded. Nowhere to put anybody. |
| `scoringOpportunity` | `inningOver` | — | Three outs, so the bases are clear. |
| `scoringOpportunity` | `outsideRedZone` | — | Nobody's in the red zone. |
| `scoringOpportunity` | `redZone` | `team` | {team} is in the red zone. |
| `scoringOpportunity` | `redZoneThirdAndShort` | `team` | {team} is in the red zone, facing third and short. |
| `scoringOpportunity` | `redZoneFourthDown` | `team` | {team} is in the red zone on fourth down. This snap matters. |
| `scoringOpportunity` | `redZoneNotClose` | `team` | {team} is in the red zone, but the score's too lopsided for it to count. |
| `scoringOpportunity` | `emptyNet` | `team`, `margin`, `clock` | {team} pulled the goalie, down {margin} with {clock} left. |
| `scoringOpportunity` | `powerPlayTied` | — | A power play in a tie game. |
| `scoringOpportunity` | `powerPlayClose` | `margin` | A power play, and only {margin} in it. |
| `scoringOpportunity` | `powerPlayTeamTied` | `team` | {team} is on the power play in a tie game. |
| `scoringOpportunity` | `powerPlayTeamTrailing` | `team`, `margin` | {team} is on the power play, down {margin}. |
| `scoringOpportunity` | `powerPlayTeamLeading` | `team`, `margin` | {team} is on the power play, up {margin}. |
| `scoringOpportunity` | `noScoringPosition` | — | No runners or red zones in this sport, so this one sits out. |
| `goAheadRun` | `goAheadRun` | `team` | {team} has the go-ahead run on base. |
| `goAheadRun` | `tyingRun` | `team` | {team} has the tying run on base. |
| `goAheadRun` | `winningRun` | `team` | {team} has the winning run on base. One swing could end it. |
| `goAheadRun` | `lastChance` | — | It could be their last chance. |
| `twoMinuteDrill` | `driveTied` | `team`, `yards`, `clock` | Tie game. {team} has the ball {yards} yards out with {clock} left. |
| `twoMinuteDrill` | `driveTrailing` | `team`, `trailBy`, `yards`, `clock` | {team} is down {trailBy}, driving from {yards} yards out with {clock} left. |
| `redCard` | `redCard` | `team`, `players`, `minute` | {team} has been down to {players} since {minute}′. |
| `noHitter` | `noHitter` | `team`, `innings` | {team} still doesn't have a hit through {innings} innings. |
| `noHitter` | `doubleNoHitter` | `innings` | Neither team has a hit through {innings} innings. |
| `upsetWatch` | `underdogLeading` | `team`, `chance`, `margin` | Our sources gave {team} a {chance}% chance before the game. They lead by {margin}. |
| `upsetWatch` | `underdogLevel` | `team`, `chance` | Our sources gave {team} a {chance}% chance before the game. It's all square. |
| `upsetWatch` | `underdogClose` | `team`, `chance`, `margin` | Our sources gave {team} a {chance}% chance before the game. They trail by just {margin}. |
| `stakes` | `seriesClinch` | `team` | A win and {team} takes the series. |
| `stakes` | `seriesDecider` | `game` | Game {game}. Winner takes the series. |
| `stakes` | `rankedMeeting` | `rank`, `team`, `otherRank`, `other` | No. {rank} {team} vs. No. {otherRank} {other}. |
| `stakes` | `raceTitle` | `team` | {team} is in the title race. |
| `stakes` | `raceRelegation` | `team` | {team} is in a relegation fight. |
| `stakes` | `raceTopQualification` | `team` | {team} is chasing a top European spot. |
| `stakes` | `raceLine` | `team` | {team} is right on the edge of a playoff or qualifying spot. |
| `stakes` | `raceClinch` | `team` | {team} can clinch with a win. |
| `stakes` | `raceElimination` | `team` | A loss knocks {team} out of the race. |
| `stakes` | `raceHunt` | `team` | {team} is still in the playoff hunt. |
| `postseasonBoost` | `postseasonRound` | `round` | 0 is the final, 1 a semifinal, 2 a quarterfinal, 3 an earlier round |
| `postseasonBoost` | `regularSeason` | — | Regular season, so nothing extra here. |
| `postseasonBoost` | `postseasonBoostOff` | — | Your postseason boost is set to 0 in Settings. |

## PowerScoreMode

Una modalità è una lista di segnali più i boost che le si addicono. Costruiscine una con [`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode), che la controlla una volta sola, in anticipo.

```ts
interface PowerScoreMode {
	id: string;
	signals: readonly SignalDefinition[];
	boosts: readonly BoostDefinition[];
	bucketCaps?: Readonly<Record<string, number>>;
	reasonPriority: readonly string[];
	usesBreakPenalty: boolean;
	usesWinProbability: boolean;
	classicBlend?: ClassicBlend;
	paysPostseason?: boolean;
	appliesTo?: (game: Game<string>, context: ScoringContext) => boolean;
}
```

| Campo | Significato |
|---|---|
| `signals`, `boosts` | In ordine di visualizzazione. |
| `bucketCaps` | Il massimo che un gruppo di boost può aggiungere in totale. I boost più in alto nella lista vengono pagati per primi. |
| `reasonPriority` | Id dei segnali le cui ragioni possono essere lette, i più degni di lettura per primi. Il più forte dà la frase "cosa è appena successo"; l'ordine risolve i pareggi. |
| `usesBreakPenalty`, `usesWinProbability` | Se si applicano la detrazione per la pausa pubblicitaria e il modificatore di ±5. |
| `classicBlend` | Come la modalità si combina con Classica. |
| `paysPostseason?` | `false` trattiene il boost postseason in questa modalità. Predefinito `true`. Senso unico lo imposta a `false`, dato che una batosta di playoff ha già deciso il suo risultato. |
| `appliesTo` | Restituisce `false` per una partita su cui la modalità non ha niente da dire, e la partita viene valutata come Classica. |

### SignalDefinition e BoostDefinition

```ts
interface SignalDefinition {
	id: string;
	ceiling: number;
	compute: (input: SignalInput) => SignalOutput;
}

interface BoostDefinition {
	id: string;
	bucket?: string; // boosts in one bucket share the mode's cap for it
	compute: (input: SignalInput) => BoostOutput;
}

interface SignalOutput { points: number; reason?: ReasonFragment }
interface BoostOutput extends SignalOutput { meta?: Record<string, number>; details?: ReasonFragment[] }
```

I `points` di un segnale sono limitati al suo `ceiling`. Un boost non ha un massimo suo, ma il suo gruppo può avere un limite.

### SignalInput

Quello che riceve `compute`.

| Campo | Significato |
|---|---|
| `game`, `context` | Quello che è stato passato a `scoreGame`. |
| `sport`, `league` | Il [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig) e il `LeagueConfig` risolti, dopo le eventuali sovrascritture in `options`. |
| `progress` | 0 all'inizio della partita, 1 alla fine dei tempi regolamentari e durante i supplementari. |
| `now` | Il timestamp dello snapshot più recente in `history`, o 0 se non ce ne sono. |
| `margin` | Il margine assoluto di punteggio. |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

Senso unico usa un floor con fattore 0.3. Fantasy usa un boost con peso 0.6, quindi le partite dei tuoi giocatori possono solo salire sopra il loro punteggio Classica. Le modalità integrate non usano `mix`, ma c'è per le modalità tue.

### BlendResult

```ts
interface BlendResult {
	kind: ClassicBlend['kind'];
	weight: number;         // the floor factor or the weight
	ownTotal: number;       // the mode's own total, with its boosts, before blending
	classicTotal: number;   // Classic's, likewise
	floorApplied?: boolean; // for a floor, whether Classic's share won
}
```

`score.blend` ne porta uno quando una modalità si è combinata con Classica, così una scomposizione può mostrare l'aritmetica.

## SportTypeConfig e LeagueConfig

`SportTypeConfig` contiene tutto su come si gioca uno sport. Comprende le soglie di equilibrio, le soglie di momentum e rimonta, i tempi di dimezzamento del decadimento, se lo sport ha un cronometro e (solo baseball e softball) una `lateGameCurve`. `LeagueConfig` contiene quanto durano i periodi di una lega specifica: `id`, `label`, `sportType`, `regularPeriods`, `periodDurationSecs` e `periodFormat`. Porta anche campi che ArenaSwap usa per il proprio recupero dei dati e per le barre del calendario, che il punteggio non legge.

Alcuni campi sono facoltativi, e solo certe voci li impostano: `lateGameCurve` (baseball e softball), `clockIsFullGameElapsed` (calcio), `zeroZeroPenaltyPeriods` (hockey e calcio) e `knockoutRunMinutes` (i due Mondiali e i due tornei olimpici di calcio). Con `options.sport` e `options.league` puoi passare un sottoinsieme qualsiasi come `Partial` per sovrascriverne uno per chiamata. Il significato campo per campo e i valori effettivi di ogni sport e lega sono in [Configurazione di sport e leghe](/arenaswap/docs/powerscore/configuration/).

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

Solo baseball e softball impostano `SportTypeConfig.lateGameCurve`. Gli sport a cronometro ricavano la rampa di fine gara direttamente da `period` e `clockSeconds`, e lasciano il campo `undefined`. Non c'è altro da configurare qui per uno sport a cronometro, quindi per ora il tipo ha una sola forma.

## ScorerTunables

L'unico oggetto esportato che contiene ogni valore di fascia con cui il motore valuta. È una costante completa, non una configurazione parziale.

| Ramo | Contiene |
|---|---|
| `scores.closeness` | I massimi delle fasce di equilibrio (`tied`, `tight`, `zeroZero`, `close`, `fringe`, `none`). Vedi [il segnale equilibrio di Classica](/arenaswap/docs/powerscore/signals/#closeness). |
| `scores.closenessFlatFloor` | Il minimo fisso che ogni fascia di equilibrio paga prima della scalatura per avanzamento. |
| `scores.lateGame` | I massimi di fine gara, il pre-boost dei supplementari e il tocco del periodo precedente. Vedi [Fine gara](/arenaswap/docs/powerscore/signals/#late-game-pressure). |
| `scores.momentum` | I due valori di fascia del momentum. Vedi [Momentum](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor). |
| `scores.leadChanges` | I due valori di fascia dei sorpassi. |
| `scores.comeback` | I due valori di fascia della rimonta e il suo minimo fisso. |
| `scores.winProbabilityVariance` | `maxAvgDist` e `minDataPoints`, in tabella in [Boost e penalità](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance). |
| `reasons` | Solo `fallback` ("best game available"), la ragione su cui ricade il risultato piatto deprecato. La formulazione inglese sta in `renderReasonEnglish`. |

## FantasyRule e FantasySport

I tipi dietro [`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints).

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

`min` e `max` sono i limiti che una schermata di impostazioni può far rispettare, e `resolveFantasyScoring` limita una sovrascrittura a quei valori.

## SportType e LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

`SportType` è un'unione chiusa. `LeagueId` sono le 31 leghe con taratura integrata, ma non limita un `Game`: la `league` di una partita può essere qualsiasi stringa con `Game<string>`, e un id che la tabella non conosce viene valutato con i valori predefiniti del suo sport. L'elenco completo dei 31 id di lega è in [Configurazione di sport e leghe](/arenaswap/docs/powerscore/configuration/). È disponibile anche a runtime come `allLeagueIds`.

## PowerScoreResult (2.x)

Deprecato, ancora esportato, ancora funzionante. L'output piatto di `computePowerScore`, e la forma di cui `normalizePowerScoreResult` accetta una versione parziale. `scoreGame` non lo restituisce.

| Campo | Tipo | Se manca |
|---|---|---|
| `gameId` | `string` | Obbligatorio ovunque compaia questo tipo. |
| `total` | `number` | Impostato da `computePowerScore`. Da 0 a `scoreMaxTotal` (100), a meno che sia prodotto tramite `normalizePowerScoreResult` con `allowTotalOverflow`. |
| `closeness` | `number` | Da 0 a `scoreMaxCloseness` (42). |
| `lateGame` | `number` | Da 0 a `scoreMaxLateGame` (38). |
| `momentum` | `number` | Da 0 a `scoreMaxMomentum` (38). |
| `leadChanges` | `number` | Da 0 a `scoreMaxLeadChanges` (18). |
| `comeback` | `number` | Da 0 a `scoreMaxComeback` (20). |
| `winProbabilityVariance?` | `number` | Da −`scoreWinProbVarianceMax` a `scoreWinProbVarianceMax` (±5). Assente, non `0`, quando non è stato fornito nessuno storico di probabilità di vittoria o ne era utilizzabile troppo poco. |
| `reason` | `string` | Ricade su `scorerTunables.reasons.fallback` ("best game available") quando manca o non è una stringa. |
| `onBreak?` | `boolean` | Assente si legge come `false`. `normalizePowerScoreResult` lo passa com'è quando è un booleano. |
| `breakPenalty?` | `number` | Punti tolti, sempre ≥ 0. Assente, non `0`, quando non ne è stato fornito nessuno. `computePowerScore` non lo imposta. |
| `signalsSubtotal?` | `number` | La somma dei cinque segnali prima della penalità per la pausa, da 0 a `scoreMaxSignalsSubtotal` (156). |
| `favoriteBonus?`, `favoriteTeamCount?`, `gameBoost?`, `scoringOpportunityBoost?`, `postseasonBoost?` | `number` | Non calcolati da `computePowerScore`. Assenti a meno che li fornisca chi chiama. |

`scoreGame` inserisce per te i boost preferita, postseason e partita, quindi con lui non devi mai costruire a mano un `PowerScoreResult`. Tutto quello che la 2.x esporta ancora è elencato in [il riferimento API](/arenaswap/docs/powerscore/api-reference/#the-2x-api).
