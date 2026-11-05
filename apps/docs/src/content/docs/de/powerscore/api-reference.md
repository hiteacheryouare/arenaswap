---
sourceHash: '91a61d4e6782'
title: PowerScore-API-Referenz
navLabel: API-Referenz
description: Jede Funktion und Konstante, die powerscore exportiert, mit Signatur, Parametern, Rückgabewert und dem Verhalten bei fehlender oder ungültiger Eingabe. Einschließlich der veralteten 2.x-API.
section: powerscore
order: 6
---

Alles hier wird aus dem Stamm des Pakets exportiert: `import { ... } from 'powerscore'`. Zuerst kommen die 3.0-Funktionen, dann die Helfer, die Bausteine der eingebauten Modi, die Konstanten und zuletzt die 2.x-API, die veraltet ist, aber genau so funktioniert wie früher. Die Typen stehen in [den TypeScript-Typen von PowerScore](/arenaswap/docs/powerscore/types/).

## Bewertung

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

Der Haupteinstiegspunkt. Bewertet ein Spiel in einem Modus und liefert einen [`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore): die Summe, jedes Signal und jeden Boost als Liste und die Begründungen.

| Parameter | Standard | Hinweise |
|---|---|---|
| `game` | Pflicht | Der aktuelle Spielzustand. Pflicht sind nur `id`, `league`, `sportType` und beide Spielstände. |
| `context` | `{}` | Verlauf, Siegwahrscheinlichkeit, die Quote vor dem Spiel, der Fantasy-Kader und alles übrige, was das Spiel nicht mitbringt. Siehe [`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext). |
| `options` | `{}` | Welcher Modus, welche Signale abgeschaltet werden und die Boosts für Favoriten, Postseason und von Hand. Siehe [`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions). |

Wirft bei einem fehlenden optionalen Feld nie einen Fehler: Der Teil der Engine, der es braucht, bewertet mit 0. Eine unbekannte `league` wird mit den Standardwerten ihrer Sportart bewertet. Ein nicht endlicher Wert irgendwo in den Eingaben gilt als nicht vorhanden, statt als `NaN` weitergereicht zu werden.

Ein eingefrorenes Spiel (`intermission` oder `delayed`) bewertet durchgehend mit 0, auch bei jedem Boost, und `reason` ist leer. `game.status` wird nur von den Boosts gelesen, die nichts zahlen, solange es nicht `'in'` ist.

Die Summe entsteht in fester Reihenfolge:

1. Die Signale bewerten. Abgeschaltete werden herausskaliert.
2. Der Pausenabzug geht ab.
3. Der Modifikator für die Siegwahrscheinlichkeit wird addiert (nur Klassisch). Das Ergebnis wird auf 0 bis 100 begrenzt.
4. Die eigenen Boosts des Modus werden innerhalb ihrer Topf-Obergrenzen addiert, und die Summe wird bei 100 gekappt.
5. Mischt sich der Modus mit Klassisch (Untergrenze, Mischung oder Boost), geschieht das hier.
6. Die Boosts für Favoriten und Postseason werden addiert, und die Summe wird erneut bei 100 gekappt. Ein Modus mit `paysPostseason: false` überspringt den Postseason-Boost.
7. `gameBoost` kommt zuletzt. Er ist das Einzige, was über 100 hinaus darf.

```ts
const score = scoreGame(game, { history }, { mode: 'blowouts' });
score.total;  // 0–100
score.reason; // 'BOS on a 12–0 run. Up 28 in the 3rd quarter'
```

### signalPoints und boostPoints

```ts
function signalPoints(score: Pick<PowerScore, 'signals'>, id: string): number
function boostPoints(score: Pick<PowerScore, 'boosts'>, id: string): number
```

Schlagen einen Eintrag eines Ergebnisses über die ID nach. Beide liefern `0` für eine ID, die es nicht gibt.

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

Baut den [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput), den das `compute` eines Signals oder Boosts bekommt: das Spiel, den Kontext, die aufgelöste Sportart- und Liga-Konfiguration, `progress`, `now` und `margin`. Es ist das, was `scoreGame` intern aufruft, exportiert, damit ein Signal, das du schreibst, für sich getestet werden kann.

## Modi

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

Prüft einen Modus einmal vorab und gibt ihn unverändert zurück. Es wirft einen Fehler, wenn zwei Signale dieselbe ID haben, wenn die Obergrenze eines Signals nicht positiv ist oder wenn der Modus keine Signale hat.

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

Das `compute` eines Signals bekommt das Spiel, den Kontext, die aufgelöste Sportart- und Liga-Konfiguration, den `progress` des Spiels (0 zu Beginn, 1 am Ende der regulären Spielzeit und durch die Verlängerung hindurch) und die `margin`. Es liefert `points`, auf die Obergrenze begrenzt, und optional eine `reason`. Ein Modus kann außerdem `boosts`, `bucketCaps`, eine `classicBlend`, `paysPostseason` (Standard `true`, bei `false` entfällt der Postseason-Boost) und ein `appliesTo(game, context)` tragen, das Spiele, zu denen er nichts zu sagen hat, an Klassisch weiterreicht.

`reasonPriority` listet die Signale, deren Begründungen gelesen werden dürfen. Das stärkste von ihnen spricht, und die Reihenfolge entscheidet bei Gleichstand. Ein Begründungsschlüssel, den die eingebauten Modi kennen, wird in `score.reason` auf Englisch ausgegeben. Ein eigener Schlüssel wird als er selbst ausgegeben, übersetze also aus `score.reasons`, nicht aus dem String.

### classicMode, blowoutsMode, fantasyMode, builtInModes und getMode

`classicMode`, `blowoutsMode` und `fantasyMode` sind die drei eingebauten `PowerScoreMode`-Objekte. `builtInModes` sind dieselben drei, nach ID geordnet, und `getMode(idOrMode)` löst eine ID, ein Modus-Objekt oder nichts auf (was Klassisch ergibt). Spread eines davon, um darauf aufzubauen. So bekommst du Klassisch ohne die 3.0-Boosts:

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### Signale und Boosts

Auch die Bausteine der eingebauten Modi werden exportiert, sodass ein eigener Modus sie wiederverwenden kann:

| Export | Was es ist |
|---|---|
| `classicSignals`, `blowoutsSignals`, `fantasySignals` | Die Signalliste jedes Modus. |
| `closenessSignal`, `lateGameSignal`, `momentumSignal`, `leadChangesSignal`, `comebackSignal` | Die fünf von Klassisch, einzeln. |
| `scoringOpportunityBoost`, `goAheadRunBoost`, `twoMinuteDrillBoost`, `noHitterBoost`, `redCardBoost`, `upsetWatchBoost`, `upsetRoutBoost`, `stakesBoost` | Die `BoostDefinition` jedes Boosts. Was jeder auszahlt, steht in [Boosts und Strafen](/arenaswap/docs/powerscore/boosts-and-penalties/). |
| `underdogProbability(line, sportType, league)` | Die Chance des Außenseiters vor dem Spiel, aus einer `PregameLine`. `undefined`, wenn die Quote es nicht hergibt. |
| `postseasonBoostShare(round)` | Der Anteil des Postseason-Boosts, den eine Runde verdient: 1, 0.75, 0.5, 0.25 oder 0 ohne Runde. |
| `applyProgressFloor`, `findLeadChanges` | Die beiden Helfer hinter Ausgeglichenheit und Führungswechseln. |
| `baseMask(baseRunners)`, `runnersOn(mask)` | Die Bases als 3-Bit-Zahl, die erste Base am niedrigsten (`0b101` sind Läufer auf der ersten und dritten), und wie viele Läufer das sind. |

## Begründungen

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

Geben einen Begründungssatz oder eine Liste davon, zu Sätzen verbunden, auf Englisch aus. Das ist es, was `score.reason` füllt. Nutz sie, wenn du eigene Begründungen baust und sie genauso lesen sollen. `ordinal(n)` liefert die englische Ordnungszahl, die sie verwenden („2nd“, „11th“, „21st“).

## Konfiguration und Fortschritt

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

`resolveSportConfig` und `resolveLeagueConfig` machen, was `scoreGame` zu Beginn jedes Aufrufs macht. Ein unbekannter `sportType` greift auf die Abstimmung des Basketballs zurück. Eine unbekannte Liga greift auf die bekannteste Liga ihrer Sportart zurück: die NBA für Basketball, die NHL für Hockey, die MLB für Baseball, die NFL für Football, NCAA Softball und die MLS für Fußball. `getGameProgress` ist 0 zu Beginn und 1 am Ende der regulären Spielzeit und durch die Verlängerung hindurch. `scoreMargin` ist der absolute Spielstandunterschied.

## Fantasy-Wertung

Das Signal Produktion von Fantasy will Fantasy-Punkte. Diese Funktionen machen aus einer Boxscore-Zeile welche. Du benennst die Statistiken, sie bewerten sie.

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

Liefert die Summe für eine Statistikzeile, auf zwei Dezimalstellen gerundet. Unbekannte Statistiken und nicht endliche Werte werden ignoriert. Die `pointsAllowed` einer Defense werden nach Stufen bewertet.

```ts
import { computeFantasyPoints } from 'powerscore';

computeFantasyPoints('football', {
	passingYards: 310,
	passingTouchdowns: 3,
	interceptionsThrown: 1,
	rushingYards: 22,
}); // 12.4 + 12 − 2 + 2.2 = 24.6
```

### defaultFantasyScoring, resolveFantasyScoring und fantasySportOf

`defaultFantasyScoring` enthält die Standardregeln für `'football'` (volles PPR), `'basketball'`, `'baseball'` und `'hockey'`. Jede Regel ist `{ points, min, max }`, sodass ein Einstellungsbildschirm die Grenzen durchsetzen kann.

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

`resolveFantasyScoring(sport, overrides?)` liefert die Regeln als schlichte Zahlen. Eine Überschreibung wird auf die Grenzen ihrer Regel begrenzt, und eine Regel, die es nicht gibt, wird ignoriert.

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

`fantasySportOf(sportType)` bildet einen `sportType` auf eine der vier Fantasy-Sportarten ab. Softball zählt als Baseball, und Fußball hat keine, es liefert also `undefined`.

## Konstanten

| Konstante | Wert |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156 (die Summe der fünf Obergrenzen von Klassisch) |
| `scoreMaxTotal` | 100 |
| `breakPenalty` | 15, der pauschale Abzug, solange `context.onBreak` `true` ist |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

Warum die Obergrenzen von Klassisch über die 100-Punkte-Kappung hinausreichen, steht in [PowerScore-Signale in jedem Modus](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total). Die Obergrenzen werden in [Boosts und Strafen](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets) erklärt.

`scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` und `thirdAndShortDistance` enthalten die exakten Werte hinter dem Punktchance-Boost, tabellarisch in [Boosts und Strafen](/arenaswap/docs/powerscore/boosts-and-penalties/). Die neueren Boosts führen ihre Zahlen in `goAheadRunTunables`, `twoMinuteDrillTunables`, `noHitterTunables`, `redCardTunables`, `upsetTunables`, `stakesTunables` und `hockeyTunables`.

`scorerTunables` enthält jeden Stufenwert, mit dem die Engine bewertet, dieselben Zahlen, die die Konstanten oben schon beim Namen nennen, sodass ein Aufrufer den Wert einer Stufe lesen kann, statt ihn fest einzutragen.

`sportTypeConfigs`, `sportTypeConfigMap`, `leagueConfigs`, `leagueConfigMap` und `allLeagueIds` enthalten die Sportart- und Liga-Abstimmung, die die Engine bei jedem Aufruf liest. Ihre Felder und die tatsächlichen Werte jeder Sportart und Liga stehen unter [Sportart- und Liga-Konfiguration](/arenaswap/docs/powerscore/configuration/).

## Die 2.x-API

Weiterhin exportiert, weiterhin funktionsfähig und, wo angegeben, als veraltet markiert. In 3.0 wurde nichts davon entfernt. Steig auf `scoreGame` um, wenn du Modi oder die neuen Boosts willst. Bis dahin liefern sie die Zahlen, die sie immer geliefert haben.

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	winProbabilityHistory?: number[],
): PowerScoreResult
```

Veraltet. Bewertet die fünf Signale von Klassisch, wendet den Modifikator für die Siegwahrscheinlichkeit an und liefert das flache `PowerScoreResult` (`closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`, `total`, `reason` und Weiteres). Es ist `scoreGame` in Klassisch nur mit den Signalen, abgeflacht, und enthält deshalb keinen der Momentboosts.

| Parameter | Standard | Hinweise |
|---|---|---|
| `game` | Pflicht | Der aktuelle Spielzustand. |
| `history` | `[]` | Aktuelle Spielstand-Schnappschüsse. Schwung, Führungswechsel und Comeback bleiben bei 0, bis sie mindestens 3 Einträge enthält. |
| `winProbabilityHistory` | `[]` | Aktuelle Siegwahrscheinlichkeiten, 0 bis 1. Braucht mindestens 5 endliche Einträge, um etwas beizutragen. |

Wirft nie einen Fehler. Liefert sofort ein Ergebnis aus lauter Nullen, wenn `isPlayFrozen(game)` true ist. Prüft `game.status` nicht: Ein `'pre'`- oder `'post'`-Spiel bewertet genauso wie ein `'in'`-Spiel, bei sonst gleichen Feldern.

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

Veraltet: Die Zahl steht in der `boosts`-Liste von `scoreGame` als `scoringOpportunity`. Liefert `0`, außer `game.status === 'in'` und das Spiel ist nicht eingefroren. Sonst liefert es 0 bis 10 für Baseball und Softball nach Läuferzahl oder 0 bis 15 für Football nach Red-Zone-Abstand und Down. Liefert `0` für jeden anderen `sportType`, Hockey eingeschlossen, denn sein Powerplay und das leere Tor kommen aus `context`, das diese Funktion nicht nimmt. Nicht in der `total` von `computePowerScore` enthalten.

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

Bildet einen Siegwahrscheinlichkeitsverlauf auf den ±5-Modifikator ab. Filtert zuerst nicht endliche Einträge heraus und liefert `undefined`, wenn weniger als 5 endliche Werte übrig bleiben. Sonst liefert es eine ganze Zahl von `-scoreWinProbVarianceMax` bis `scoreWinProbVarianceMax`.

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

Liefert `true`, wenn `game.intermission === true` oder `game.delayed === true`, sonst `false`, auch wenn beide Felder fehlen.

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

Wie weit das Spiel in der regulären Spielzeit ist, 0 bis 1, aus derselben Uhr, die das Signal Spielschluss liest. Praktisch, um ein Spiel auf einer Zeitleiste zu zeichnen.

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

Veraltet. Nimmt ein teilweises, womöglich nicht vertrauenswürdiges `PowerScoreResult` (nur `gameId` ist Pflicht) und liefert ein vollständig begrenztes, gültiges. `computePowerScore` ruft es intern bei jedem Ergebnis auf, das es erzeugt.

Jedes der fünf Signalfelder wird auf seine eigene Obergrenze begrenzt. `total` wird auf `scoreMaxTotal` begrenzt, außer `options.allowTotalOverflow` ist `true`. Mit dieser Option wird nur nach unten auf `0` begrenzt, sodass ein manueller Boost es absichtlich über 100 schieben kann. Ein fehlendes oder nicht endliches `total` fällt auf die Summe der fünf Signale minus `breakPenalty` zurück, nicht auf die rohe Summe. `reason` fällt auf `scorerTunables.reasons.fallback` („best game available“) zurück, wenn es kein String ist. `favoriteBonus`, `favoriteTeamCount`, `gameBoost`, `scoringOpportunityBoost` und `postseasonBoost` werden gerundet und nach unten auf `0` begrenzt, wenn sie angegeben sind. Sind sie es nicht, bleiben sie ganz aus dem Ergebnis weg, statt auf `0` zu stehen. Wirft nie einen Fehler.

### Was sich beim Umstieg ändert

Klassisch über `scoreGame` enthält die neuen Boosts, dasselbe Spiel kann dort also höher bewerten als in `computePowerScore`, um bis zu die Topf-Obergrenzen. Die Boosts für Favoriten, Postseason und von Hand, die du früher von Hand um `normalizePowerScoreResult` herum addiert hast, sind jetzt Optionen von `scoreGame`. Alles andere bleibt. Der Typ `Game` hat optionale Felder und einen Liga-Typparameter dazubekommen, und ein nacktes `Game` bedeutet, was es immer bedeutet hat. Eine Liga-ID, die die Tabelle nicht kennt, wurde früher unabhängig von der Sportart mit der Konfiguration der NBA bewertet. Jetzt bekommt sie die Standardwerte ihrer eigenen Sportart, sodass ein Hockeyspiel in einer unbekannten Liga die Abschnitte und die Uhr der NHL bekommt.
