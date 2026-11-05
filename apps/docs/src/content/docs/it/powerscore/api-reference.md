---
sourceHash: '91a61d4e6782'
title: Riferimento API di PowerScore
navLabel: Riferimento API
description: Ogni funzione e costante esportata da powerscore, con firma, parametri, valore restituito e comportamento quando un input manca o non è valido. Include l'API 2.x deprecata.
section: powerscore
order: 6
---

Tutto quello che trovi qui si esporta dalla radice del pacchetto: `import { ... } from 'powerscore'`. Prima le funzioni 3.0, poi gli helper, i pezzi di cui sono fatte le modalità integrate, le costanti e infine l'API 2.x, deprecata ma identica a prima. I tipi sono in [i tipi TypeScript di PowerScore](/arenaswap/docs/powerscore/types/).

## Punteggio

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

Il punto d'ingresso principale. Valuta una partita in una modalità e restituisce un [`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore): il totale, ogni segnale e boost come lista, e le ragioni.

| Parametro | Predefinito | Note |
|---|---|---|
| `game` | obbligatorio | Lo stato attuale della partita. Servono solo `id`, `league`, `sportType` e i due punteggi. |
| `context` | `{}` | Storico, probabilità di vittoria, la linea pre-partita, la rosa fantasy e tutto il resto che la partita non porta con sé. Vedi [`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext). |
| `options` | `{}` | Quale modalità, quali segnali disattivare e i boost preferita, postseason e manuale. Vedi [`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions). |

Non lancia mai un errore per un campo facoltativo mancante: la parte del motore che ne ha bisogno vale 0. Una `league` non riconosciuta viene valutata con i valori predefiniti del suo sport. Un valore non finito in qualsiasi input è trattato come assente, invece di propagarsi come `NaN`.

Una partita ferma (`intermission` o `delayed`) vale 0 su tutta la linea, boost compresi, e `reason` è vuoto. `game.status` è letto solo dai boost, che non pagano niente a meno che non sia `'in'`.

Il totale si costruisce in un ordine fisso:

1. I segnali segnano. Quelli disattivati vengono riscalati fuori.
2. Si sottrae la detrazione per la pausa.
3. Si aggiunge il modificatore della probabilità di vittoria (solo Classica). Il risultato è limitato tra 0 e 100.
4. Si aggiungono i boost propri della modalità, entro i limiti dei loro gruppi, e il totale è limitato a 100.
5. Se la modalità si combina con Classica (floor, mix o boost), succede qui.
6. Si aggiungono i boost preferita e postseason, e il totale è di nuovo limitato a 100. Una modalità con `paysPostseason: false` salta il boost postseason.
7. `gameBoost` si aggiunge per ultimo. È l'unica cosa a cui è permesso superare 100.

```ts
const score = scoreGame(game, { history }, { mode: 'blowouts' });
score.total;  // 0–100
score.reason; // 'BOS on a 12–0 run. Up 28 in the 3rd quarter'
```

### signalPoints e boostPoints

```ts
function signalPoints(score: Pick<PowerScore, 'signals'>, id: string): number
function boostPoints(score: Pick<PowerScore, 'boosts'>, id: string): number
```

Cercano una singola voce di un risultato per id. Entrambe restituiscono `0` per un id che non c'è.

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

Costruisce il [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput) che riceve il `compute` di un segnale o di un boost: la partita, il contesto, la configurazione risolta di sport e lega, `progress`, `now` e `margin`. È ciò che `scoreGame` chiama internamente, esportato così un segnale scritto da te si può testare da solo.

## Modalità

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

Controlla una modalità una volta sola, in anticipo, e la restituisce invariata. Lancia un errore se due segnali condividono un id, se il massimo di un segnale non è positivo o se la modalità non ha segnali.

```ts
import { defineMode, scoreGame, type PowerScoreMode } from 'powerscore';

const overtimeOnly: PowerScoreMode = defineMode({
	id: 'overtimeOnly',
	signals: [
		{
			id: 'extraTime',
			ceiling: 100,
			compute: ({ game, league }) => (
				(game.period ?? 0) > league.regularPeriods
					? { points: 100, reason: { key: 'overtime' } }
					: { points: 0 }
			),
		},
	],
	boosts: [],
	reasonPriority: ['extraTime'],
	usesBreakPenalty: false,
	usesWinProbability: false,
});

scoreGame(game, context, { mode: overtimeOnly });
```

Il `compute` di un segnale riceve la partita, il contesto, la configurazione risolta di sport e lega, il `progress` della partita (0 all'inizio, 1 alla fine dei tempi regolamentari e durante i supplementari) e il `margin`. Restituisce `points`, limitati al massimo, e una `reason` facoltativa. Una modalità può anche portare `boosts`, `bucketCaps`, un `classicBlend`, `paysPostseason` (predefinito `true`; `false` trattiene il boost postseason) e un `appliesTo(game, context)` che manda a Classica le partite su cui non ha niente da dire.

`reasonPriority` elenca i segnali le cui ragioni possono essere lette. Parla il più forte, e l'ordine risolve i pareggi. Una chiave di ragione che le modalità integrate conoscono viene resa in inglese in `score.reason`. Una chiave tua viene resa com'è, quindi traduci da `score.reasons`, non dalla stringa.

### classicMode, blowoutsMode, fantasyMode, builtInModes e getMode

`classicMode`, `blowoutsMode` e `fantasyMode` sono i tre oggetti `PowerScoreMode` integrati. `builtInModes` sono gli stessi tre indicizzati per id, e `getMode(idOrMode)` risolve un id, un oggetto modalità o niente (che dà Classica). Espandine una per costruirci sopra. Per avere Classica senza i boost 3.0:

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### Segnali e boost

Anche i pezzi di cui sono fatte le modalità integrate sono esportati, così una modalità personalizzata può riusarli:

| Export | Cos'è |
|---|---|
| `classicSignals`, `blowoutsSignals`, `fantasySignals` | La lista dei segnali di ogni modalità. |
| `closenessSignal`, `lateGameSignal`, `momentumSignal`, `leadChangesSignal`, `comebackSignal` | I cinque di Classica, uno per uno. |
| `scoringOpportunityBoost`, `goAheadRunBoost`, `twoMinuteDrillBoost`, `noHitterBoost`, `redCardBoost`, `upsetWatchBoost`, `upsetRoutBoost`, `stakesBoost` | Il `BoostDefinition` di ogni boost. Cosa paga ognuno è in [Boost e penalità](/arenaswap/docs/powerscore/boosts-and-penalties/). |
| `underdogProbability(line, sportType, league)` | La probabilità dell'underdog prima della partita, da una `PregameLine`. `undefined` quando la linea non può dirlo. |
| `postseasonBoostShare(round)` | La quota del boost postseason che vale un turno: 1, 0.75, 0.5, 0.25 o 0 senza turno. |
| `applyProgressFloor`, `findLeadChanges` | I due helper dietro equilibrio e sorpassi. |
| `baseMask(baseRunners)`, `runnersOn(mask)` | Le basi come numero a 3 bit, con la prima base al bit più basso (`0b101` è corridori in prima e in terza), e quanti corridori sono. |

## Ragioni

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

Rendono in inglese una frase di ragione, o una lista di ragioni unite in frasi. È ciò che riempie `score.reason`. Usale quando costruisci ragioni tue e vuoi che si leggano allo stesso modo. `ordinal(n)` dà l'ordinale inglese che usano ("2nd", "11th", "21st").

## Configurazione e avanzamento

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

`resolveSportConfig` e `resolveLeagueConfig` fanno ciò che `scoreGame` fa all'inizio di ogni chiamata. Un `sportType` sconosciuto ricade sulla taratura del basket. Una lega sconosciuta ricade sulla lega più nota del suo sport: la NBA per il basket, la NHL per l'hockey, la MLB per il baseball, la NFL per il football, la NCAA per il softball e la MLS per il calcio. `getGameProgress` è 0 all'inizio, 1 alla fine dei tempi regolamentari e durante i supplementari. `scoreMargin` è la differenza assoluta di punteggio.

## Punteggio fantasy

Il segnale Punti fantasy di Fantasy vuole punti fantasy. Queste funzioni ci trasformano una riga di boxscore. Tu indichi le statistiche, loro le valutano.

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

Restituisce il totale per una riga di statistiche, arrotondato a due decimali. Le statistiche sconosciute e i valori non finiti vengono ignorati. I `pointsAllowed` di una difesa si valutano per fasce.

```ts
import { computeFantasyPoints } from 'powerscore';

computeFantasyPoints('football', {
	passingYards: 310,
	passingTouchdowns: 3,
	interceptionsThrown: 1,
	rushingYards: 22,
}); // 12.4 + 12 − 2 + 2.2 = 24.6
```

### defaultFantasyScoring, resolveFantasyScoring e fantasySportOf

`defaultFantasyScoring` contiene le regole predefinite per `'football'` (PPR pieno), `'basketball'`, `'baseball'` e `'hockey'`. Ogni regola è `{ points, min, max }`, così una schermata di impostazioni può far rispettare i limiti.

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

`resolveFantasyScoring(sport, overrides?)` restituisce le regole come semplici numeri. Una sovrascrittura viene limitata ai confini della sua regola, e una regola che non esiste viene ignorata.

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

`fantasySportOf(sportType)` fa corrispondere un `sportType` a uno dei quattro sport fantasy. Il softball conta come baseball e il calcio non ne ha, quindi restituisce `undefined`.

## Costanti

| Costante | Valore |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156 (la somma dei cinque massimi di Classica) |
| `scoreMaxTotal` | 100 |
| `breakPenalty` | 15, la detrazione fissa mentre `context.onBreak` è `true` |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

Perché i massimi di Classica superano il limite di 100 punti è spiegato in [i segnali di PowerScore in ogni modalità](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total). I limiti sono spiegati in [Boost e penalità](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets).

`scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` e `thirdAndShortDistance` contengono i valori esatti dietro il boost opportunità di segnare, in tabella in [Boost e penalità](/arenaswap/docs/powerscore/boosts-and-penalties/). I boost più recenti tengono i loro numeri in `goAheadRunTunables`, `twoMinuteDrillTunables`, `noHitterTunables`, `redCardTunables`, `upsetTunables`, `stakesTunables` e `hockeyTunables`.

`scorerTunables` contiene ogni valore di fascia con cui il motore valuta, gli stessi numeri che le costanti qui sopra già danno per nome, così chi consuma il pacchetto può leggere il valore di una fascia invece di scriverlo a mano.

`sportTypeConfigs`, `sportTypeConfigMap`, `leagueConfigs`, `leagueConfigMap` e `allLeagueIds` contengono la taratura di sport e leghe che il motore legge a ogni chiamata. I loro campi e i valori effettivi di ogni sport e lega sono in [Configurazione di sport e leghe](/arenaswap/docs/powerscore/configuration/).

## L'API 2.x

Ancora esportata, ancora funzionante e marcata come deprecata dove indicato. Niente qui è stato rimosso nella 3.0. Passa a `scoreGame` quando vuoi le modalità o i nuovi boost. Fino ad allora, queste restituiscono i numeri di sempre.

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	winProbabilityHistory?: number[],
): PowerScoreResult
```

Deprecata. Valuta i cinque segnali di Classica, applica il modificatore della probabilità di vittoria e restituisce il `PowerScoreResult` piatto (`closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`, `total`, `reason` e compagnia). È `scoreGame` in Classica con i soli segnali, appiattito, quindi non include nessuno dei boost dei momenti.

| Parametro | Predefinito | Note |
|---|---|---|
| `game` | obbligatorio | Lo stato attuale della partita. |
| `history` | `[]` | Snapshot recenti del punteggio. Momentum, sorpassi e rimonta restano a 0 finché non contiene almeno 3 voci. |
| `winProbabilityHistory` | `[]` | Valori recenti di probabilità di vittoria, da 0 a 1. Servono almeno 5 voci finite perché contribuisca in qualche modo. |

Non lancia mai un errore. Restituisce subito un risultato tutto a zero quando `isPlayFrozen(game)` è vero. Non controlla `game.status`: una partita `'pre'` o `'post'` vale come una `'in'`, a parità degli altri campi.

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

Deprecata: il numero è nella lista `boosts` di `scoreGame` come `scoringOpportunity`. Restituisce `0` a meno che `game.status === 'in'` e la partita non sia ferma. Altrimenti restituisce da 0 a 10 per baseball e softball, in base al numero di corridori, o da 0 a 15 per il football, in base al margine in red zone e al down. Restituisce `0` per ogni altro `sportType`, hockey compreso, dato che power play e porta vuota arrivano da `context`, che questa funzione non prende. Non incluso nel `total` di `computePowerScore`.

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

Trasforma uno storico di probabilità di vittoria nel modificatore di ±5. Prima scarta le voci non finite, poi restituisce `undefined` se restano meno di 5 valori finiti. Altrimenti restituisce un intero da `-scoreWinProbVarianceMax` a `scoreWinProbVarianceMax`.

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

Restituisce `true` quando `game.intermission === true` o `game.delayed === true`, e `false` altrimenti, anche quando entrambi i campi mancano.

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

A che punto dei tempi regolamentari è la partita, da 0 a 1, dallo stesso cronometro che legge il segnale Fine gara. Comoda per disegnare una partita su una linea del tempo.

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

Deprecata. Prende un `PowerScoreResult` parziale, magari non fidato (serve solo `gameId`) e ne restituisce uno valido e completamente limitato. `computePowerScore` la chiama internamente su ogni risultato che produce.

Ognuno dei cinque campi dei segnali è limitato al proprio massimo. `total` è limitato a `scoreMaxTotal` a meno che `options.allowTotalOverflow` sia `true`. Con quell'opzione è limitato solo a un minimo di `0`, lasciando che un boost manuale lo spinga oltre 100 di proposito. Un `total` mancante o non finito ricade sulla somma dei cinque segnali meno `breakPenalty`, non sulla somma grezza. `reason` ricade su `scorerTunables.reasons.fallback` ("best game available") quando non è una stringa. `favoriteBonus`, `favoriteTeamCount`, `gameBoost`, `scoringOpportunityBoost` e `postseasonBoost` vengono arrotondati e portati almeno a `0` quando forniti. Quando non lo sono, restano fuori dal risultato, non vengono impostati a `0`. Non lancia mai un errore.

### Cosa cambia se passi alla 3.0

Classica tramite `scoreGame` include i nuovi boost, quindi la stessa partita può valere di più lì che in `computePowerScore`, fino ai limiti dei gruppi. I boost preferita, postseason e manuale che aggiungevi a mano attorno a `normalizePowerScoreResult` ora sono opzioni di `scoreGame`. Tutto il resto resta com'era. Il tipo `Game` ha guadagnato campi facoltativi e un parametro di tipo per la lega, e un `Game` semplice significa quello che significava. Un id di lega che la tabella non conosce veniva valutato con la configurazione della NBA qualunque fosse lo sport. Ora riceve i valori predefiniti del suo sport, quindi una partita di hockey in una lega sconosciuta riceve periodi e cronometro della NHL.
