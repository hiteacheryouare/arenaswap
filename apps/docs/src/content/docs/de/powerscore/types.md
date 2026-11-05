---
sourceHash: '40ee38646993'
title: TypeScript-Typen von PowerScore
description: Jedes Feld von Game, ScoringContext, ScoreOptions, PowerScore und den Modus- und Konfigurationstypen, welche davon optional sind und was passiert, wenn ein optionales fehlt.
section: powerscore
order: 7
navLabel: Typen
---

Die Typen von PowerScore 3 fallen in drei Gruppen. Was du `scoreGame` übergibst: [`Game`](#game), [`ScoringContext`](#scoringcontext) und [`ScoreOptions`](#scoreoptions). Was du zurückbekommst: [`PowerScore`](#powerscore). Und woraus ein Modus besteht: [`PowerScoreMode`](#powerscoremode) und seine Teile. Die 2.x-Typen stehen am Ende, weiterhin exportiert und funktionsfähig.

## Game

Der Zustand des Spiels genau jetzt. Pflicht sind nur `id`, `league`, `sportType` und die beiden Teamstände. Alles andere schärft die Bewertung, wenn es vorhanden ist. Jedes optionale Feld gilt als unbekannt, nicht als Standardwert, wenn es fehlt.

`Game` ist über die Liga-ID generisch: `Game<League extends string = LeagueId>`. Ein nacktes `Game` bedeutet, was es immer bedeutet hat. Ein Feed mit eigenen Liga-IDs nutzt `Game<string>`.

| Feld | Typ | Fehlt es, heißt das |
|---|---|---|
| `id` | `string` | Pflicht. |
| `league` | `League` | Pflicht. Eine ID, die `leagueConfigMap` nicht kennt, wird mit den Standardwerten ihrer Sportart bewertet (siehe [Sportart- und Liga-Konfiguration](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship)). |
| `sportType` | `SportType` | Pflicht. Ein Wert, den `sportTypeConfigMap` nicht kennt, greift auf die Abstimmung des Basketballs zurück. |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | Pflicht. |
| `period?` | `number` | Der Druck gegen Spielende liest `0`. Ausgeglichenheit bewertet weiter, aber auch der Spielfortschritt liest `0`, sie zahlt also nur ihren flachen Sockel statt des volleren Stufenwerts. |
| `clockSeconds?` | `number` | Gilt als unbekannt, nicht als `0:00`. Der Anstieg gegen Spielende bleibt am Anfang des Abschnitts stehen, und jeder uhrabhängige Boost zahlt 0. |
| `intermission?` | `boolean` | `false`. `true` friert das Spiel ein: Alles bewertet mit 0, bis wieder gespielt wird. |
| `delayed?` | `boolean` | `false`. `true` friert das Spiel ein, genau wie `intermission`. |
| `status?` | `'pre' \| 'in' \| 'post'` | Boosts zahlen für alles außer `'in'` nichts, auch bei einem fehlenden Wert. Die Signale lesen es nicht. |
| `topOfInning?` | `boolean` | Baseball und Softball. Bewertet zwischen den Ausgeglichenheitswerten für Top und Bottom des Innings. Der Go-ahead-Run und der No-Hitter brauchen es. |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | Baseball und Softball. Gilt als keine Läufer auf Base. |
| `outs?` | `number` | Baseball und Softball. Gilt als 0. Bei 3 zahlen läuferbasierte Boosts nichts. |
| `possession?` | `'home' \| 'away'` | Football, oder der Puck, wo ein Feed ihn meldet. Ohne es zahlt der Two-Minute-Drill 0, und Fantasy hat keine Football-Situation. |
| `yardsToEndZone?` | `number` | Football. Die Yards, die das Team mit dem Ball braucht. Vom Two-Minute-Drill und von Fantasy gebraucht. |
| `isRedZone?` | `boolean` | Nur Football. `false` oder fehlend heißt, dass der Red-Zone-Fall des Punktchance-Boosts 0 zahlt. |
| `down?` | `number` | Nur Football. Fällt auf den ungewichteten Multiplikator (×1) durch, statt den Boost ganz zu verlieren. Im Two-Minute-Drill und in Fantasy gilt ein `down` unter 1 als zwischen den Spielzügen. |
| `distance?` | `number` | Nur Football. Beim 3rd down kann ein fehlender Wert nicht als 3rd-and-short gelten und fällt deshalb auf ×1 durch. |
| `isGoalToGo?` | `boolean` | Nur Football, und es ändert nur beim 4th down etwas. |
| `series?` | [`SeriesState`](#seriesstate) | Keine Serie, Brisanz liest also keine. |
| `redCards?` | [`RedCard[]`](#redcard) | Fußball. Keine Karten. |
| `seasonType?` | `'regular' \| 'postseason'` | Brisanz behandelt das Spiel als Postseason, wenn das hier so sagt oder `postseasonRound` gesetzt ist, sonst als reguläre Saison. |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | Kein Postseason-Boost. `0` entscheidet den Titel, `1` ist ein Halbfinale, `2` ein Viertelfinale, `3` alles Frühere. |

`SportId` ist ein veralteter Alias für `LeagueId`, für die Kompatibilität mit 1.x behalten. Nutz `LeagueId`.

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

| Feld | Fehlt es, heißt das |
|---|---|
| `score` | Pflicht. |
| `abbreviation` | Benennt das Team in Begründungen, wenn auch `nickname` fehlt, und erscheint als `?`, wenn beide fehlen. |
| `nickname` | Wie Begründungen das Team nennen: „Lakers“, „Nittany Lions“ oder der Kurzname eines Fußballvereins wie „Portland“. Fällt auf `abbreviation` zurück. |
| `rank` | Das Team ist nicht platziert. Lass es auch bei einem Turnier-Setzplatz weg: Es ist eine Ranglistenplatzierung, bei der 1 am besten ist. Brisanz braucht es bei beiden Teams. |
| `hits` | Baseball und Softball. Keine Hit-Zahl, der No-Hitter kann also nicht zahlen. `0` ist ein echter Wert: Er bedeutet ein Team ohne Hit. |
| `errors` | Baseball und Softball. Wird derzeit von keiner Bewertung gelesen. |
| `timeouts` | Football. Der Two-Minute-Drill nutzt für die Uhrkontrolle ein neutrales Gewicht. |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

Eine Serie, die kürzer ist als eine Best-of-3, zahlt nichts.

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

Alles, was das Spiel selbst nicht mitbringt. Jedes Feld ist optional, und `scoreGame` nimmt das ganze Objekt als zweites Argument.

| Feld | Typ | Fehlt es, heißt das |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | Schwung, Führungswechsel und Comeback-Faktor bleiben bei 0, bis sie 3 Einträge enthält. Älteste zuerst. |
| `onBreak?` | `boolean` | Der Aufrufer hat eine Werbepause erkannt. `true` zieht `breakPenalty` (15) vom Signal-Zwischenstand ab. Ohne das kein Pausenabzug. |
| `winProbability?` | `number[]` | Siegwahrscheinlichkeit des Heimteams über das Spiel, 0 bis 1. Braucht 5 endliche Werte, um zu zählen. Sonst kein Modifikator. |
| `pregameLine?` | [`PregameLine`](#pregameline) | Sensations-Alarm und Upset-Klatsche zahlen 0. |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | Keine Brisanz durch ein Rennen. Siehe [`TeamStakes`](#teamstakes). |
| `powerPlay?` | `'home' \| 'away' \| boolean` | Kein Powerplay im Punktchance-Boost. Eine Seite, wenn der Feed sagt, wessen, `true`, wenn er nur sagt, dass eines läuft. |
| `emptyNet?` | `'home' \| 'away' \| boolean` | Kein leeres Tor im Punktchance-Boost. Setz es erst, wenn der Feed es bei zwei Abfragen hintereinander gemeldet hat. |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | Führungswechsel, aus dem Spielprotokoll eines Feeds gezählt, das Wechsel zwischen zwei Abfragen sieht, mit dem Zeitpunkt des letzten. Wird genutzt, wenn es mehr zählt, als `history` zeigt. Führungswechsel braucht trotzdem die 3 Schnappschüsse. |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | Fantasy hat keine Spieler, und das Spiel wird als Klassisch bewertet. |

### ScoreSnapshot

Eine Momentaufnahme des Spielstands eines Spiels, genutzt, um Schwung, Führungswechsel und Comebacks zu erkennen. Alle vier Felder sind Pflicht.

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

`timestamp` muss nur relativ zu den anderen Schnappschüssen im selben Array stimmen. Das Abklingen wird am Zeitstempel des neuesten Schnappschusses gemessen, nicht an der Echtzeit. Dieselbe Historie noch einmal abzuspielen liefert dasselbe Ergebnis, egal wann.

### PregameLine

Die Quote, wie sie vor dem Spiel stand. Eine Live-Quote bewegt sich mit dem Spielstand und würde eine Sensation auslöschen.

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

`spread` ist die Punktzahl, die dem Favoriten aufgelegt wurde, als positive Zahl, und nur Basketball und Football lesen sie. Bei beiden Moneylines wird die Marge des Buchmachers vor der Nutzung herausgerechnet. `drawMoneyline` ist die Dreiwegequote im Fußball. Eine Run Line oder Puck Line allein sagt, wer favorisiert ist, aber nicht, wie deutlich, und reicht deshalb nicht.

### TeamStakes

Rennen-Flags am Saisonende für ein Team, nur reguläre Saison.

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

`canClinch` heißt, dass ein Sieg in diesem Spiel einen Platz, eine Division oder einen Titel sichert, was auch sonst passiert. `canBeEliminated` heißt, dass eine Niederlage das Team aus dem Rennen wirft. `inRace` heißt, noch im Rennen, weder sicher noch draußen. `nearLine` bedeutet wenige Punkte neben einer Tabellenlinie.

### FantasyPlayerState

Ein Spieler im Kader in einem Spiel.

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

`FantasyPosition` ist `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'`: Football-Positionen, ein Pitcher und ein Hitter für Baseball und ein generischer Spieler sonst. `name` erscheint in Begründungen, etwa „Mahomes in the red zone“. `active: false` heißt, dass der Feed sagt, der Spieler ist aus dem Spiel, und er zählt gar nicht. `role` gibt es nur im Baseball: wo der Spieler im Inning steht. `pointEvents` sind Fantasy-Punkte, wie sie hereinkamen, sodass die jüngste Produktion wie jedes andere Ereignis abklingt.

## ScoreOptions

Wie bewertet wird. Jedes Feld ist optional, und `scoreGame` nimmt das Objekt als drittes Argument.

| Feld | Typ | Was es tut |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | Welcher Modus das Spiel bewertet. Klassisch, wenn es fehlt. |
| `disabledSignals?` | `readonly string[]` | Signal-IDs des Modus, die abgeschaltet werden. Der Rest wird auf den vollen Bereich des Modus umskaliert. |
| `classicDisabledSignals?` | `readonly string[]` | Signal-IDs, die in Klassisch abgeschaltet werden, wenn es eingemischt oder als Untergrenze genutzt wird. |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | Überschreibt die eigene Mischung des Modus, etwa den Fantasy-Regler eines Zuschauers. |
| `favoriteTeamCount?` | `number` | Wie viele Lieblingsteams im Spiel sind. |
| `favoriteBoostPoints?` | `number` | Punkte pro Lieblingsteam. |
| `postseasonBoostPoints?` | `number` | Punkte für ein titelentscheidendes Spiel. Frühere Runden bekommen einen Anteil. |
| `gameBoost?` | `number` | Ein manueller Boost. Das Einzige, was die Summe über 100 schieben darf. |
| `sport?` | `Partial<SportTypeConfig>` | Für Sportarten, zu denen die eingebauten Tabellen nicht passen, oder um sie abzustimmen. |
| `league?` | `Partial<LeagueConfig>` | Für Ligen, die die eingebaute Tabelle nicht kennt. Setz `regularPeriods` und `periodDurationSecs`. |

## PowerScore

Was `scoreGame` zurückgibt.

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

| Feld | Bedeutung |
|---|---|
| `modeId` | Der Modus, der das Spiel tatsächlich bewertet hat. Ein Modus, der nicht zutrifft, etwa Fantasy ohne Spieler aus dem Kader im Spiel, fällt auf `'classic'` zurück. |
| `total` | 0 bis 100, und über 100 nur durch `gameBoost`. |
| `signals` | Jedes Signal, das der Modus definiert, mit seiner Obergrenze, auch bei 0. Siehe [`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment). |
| `signalsSubtotal` | Die Summe der aktiven Signale vor jedem Umskalieren für abgeschaltete Signale. |
| `scaledSubtotal` | Dasselbe nach dem Umskalieren, auf `signalCeiling` begrenzt. |
| `signalCeiling` | Die Summe der Obergrenzen des Modus: 156 für Klassisch. |
| `frozen` | `true` zur Halbzeit, in einer Pause oder bei einer Verzögerung. Alles bewertet mit 0, und `reason` ist leer. |
| `onBreak`, `breakPenalty` | Ob ein Abzug für die Werbepause galt und wie viele Punkte er genommen hat (immer ≥ 0). Beide sind bei einem eingefrorenen Stand `false` und `0`. |
| `winProbabilityVariance?` | −5 bis +5. Fehlt, statt `0` zu sein, wenn es nicht genug Siegwahrscheinlichkeitsdaten gibt. |
| `baseTotal` | Signale minus Pausenabzug plus Modifikator, 0 bis 100, vor jedem Boost. |
| `classicTotal?` | Die eigene Summe von Klassisch, wenn sich der Modus damit mischt. |
| `blend?` | Wie ein gemischter Modus zu seiner Summe kam. Siehe [`BlendResult`](#blendresult). |
| `boosts` | Jeder Boost, den der Modus zahlt, bei 0, wenn er nicht zahlt. Dazu `favoriteBoost`, `postseasonBoost` und `gameBoost`, sobald du sie angefordert hast. |
| `reasons` | Bis zu drei Sätze schlichter Fakten, als Fragmente, bereit zur Übersetzung: was gerade passiert, was gerade passiert ist, der Spielstand und die Zeit, und was auf dem Spiel steht. Alle Schlüssel stehen in der [Begründungstabelle der README](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/powerscore/README.md#reasons). |
| `reason` | Dasselbe auf Englisch, als Sätze. Anzeigetext, keine API: Der Wortlaut kann sich zwischen Versionen ändern. Prüf nicht gegen diesen Text. |

### ScoredSignal, ScoredBoost und ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number>; details?: ReasonFragment[] }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

`meta` bei einem Boost trägt, was eine UI vielleicht sagen will, etwa `{ inning: 8 }` bei einem No-Hitter oder `{ secondsLeft: 95, trailBy: 3 }` bei einem Two-Minute-Drill. Ein Begründungsfragment sieht so aus: `{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } }`. Begründungsschlüssel, die die eingebauten Modi kennen, werden in `reason` auf Englisch ausgegeben. Ein eigener Schlüssel wird als er selbst ausgegeben, übersetze also aus `reasons`, nicht aus dem String.

`details` bei einem Boost sagt, was in diesem Spiel passiert, wofür der Boost zahlt oder nicht zahlt, als Begründungsfragmente, die eine UI übersetzt: `{ key: 'seriesClinch', params: { team: 'CHW' } }` bei Brisanz oder ein herausgenommener Torwart und ein Powerplay zusammen bei einem 6-gegen-4 im Hockey. Es fehlt, wenn es nichts zu sagen gibt, etwa vor Spielbeginn oder bei unterbrochenem Spiel. Für diese Schlüssel gibt es keinen englischen Renderer. Die Tabelle unten listet jeden auf, den die eingebauten Boosts senden, mit dem Satz, den ArenaSwap dafür anzeigt.

| Boost | Key | Params | Auf Englisch |
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

Ein Modus ist eine Liste von Signalen plus die Boosts, die zu ihm passen. Bau einen mit [`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode), das ihn einmal vorab prüft.

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

| Feld | Bedeutung |
|---|---|
| `signals`, `boosts` | In Anzeigereihenfolge. |
| `bucketCaps` | Das Meiste, was ein Topf von Boosts zusammen addieren darf. Frühere Boosts in der Liste werden zuerst ausgezahlt. |
| `reasonPriority` | Signal-IDs, deren Begründungen gelesen werden dürfen, die lesenswerteste zuerst. Das stärkste gibt den Satz „was gerade passiert ist“, die Reihenfolge entscheidet bei Gleichstand. |
| `usesBreakPenalty`, `usesWinProbability` | Ob der Abzug für die Werbepause und der ±5-Modifikator gelten. |
| `classicBlend` | Wie sich der Modus mit Klassisch kombiniert. |
| `paysPostseason?` | `false` hält den Postseason-Boost in diesem Modus zurück. Standard ist `true`. Kantersiege setzt es auf `false`, denn ein Playoff-Kantersieg hat sein Ergebnis schon entschieden. |
| `appliesTo` | Liefert `false` für ein Spiel, zu dem der Modus nichts zu sagen hat, und das Spiel wird als Klassisch bewertet. |

### SignalDefinition und BoostDefinition

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

Die `points` eines Signals werden auf seine `ceiling` begrenzt. Ein Boost hat keine eigene Obergrenze, aber sein Topf kann eine haben.

### SignalInput

Was `compute` bekommt.

| Feld | Bedeutung |
|---|---|
| `game`, `context` | Was an `scoreGame` übergeben wurde. |
| `sport`, `league` | Die aufgelösten [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig) und `LeagueConfig`, nach allen Überschreibungen in `options`. |
| `progress` | 0 zu Beginn des Spiels, 1 am Ende der regulären Spielzeit und durch die Verlängerung hindurch. |
| `now` | Der Zeitstempel des neuesten Schnappschusses in `history`, oder 0, wenn es keinen gibt. |
| `margin` | Der absolute Spielstandabstand. |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

Kantersiege nutzt eine Untergrenze mit dem Faktor 0.3. Fantasy nutzt einen Boost mit dem Gewicht 0.6, sodass die Spiele deiner Spieler nur über ihren Klassisch-Wert steigen können. Die eingebauten Modi nutzen `mix` nicht, aber es steht für eigene Modi bereit.

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

`score.blend` trägt eines, wenn sich ein Modus mit Klassisch gemischt hat, sodass eine Aufschlüsselung die Rechnung zeigen kann.

## SportTypeConfig und LeagueConfig

`SportTypeConfig` enthält alles darüber, wie eine Sportart gespielt wird. Dazu gehören die Schwellen für Ausgeglichenheit, Schwung und Comeback, die Halbwertszeiten des Abklingens, ob die Sportart eine Uhr hat, und (nur Baseball und Softball) eine `lateGameCurve`. `LeagueConfig` enthält, wie lang die Abschnitte einer bestimmten Liga sind: `id`, `label`, `sportType`, `regularPeriods`, `periodDurationSecs` und `periodFormat`. Sie trägt außerdem Felder, die ArenaSwap für sein eigenes Abrufen und seine Zeitplanbalken nutzt und die der Bewerter nicht liest.

Ein paar Felder sind optional, und nur manche Einträge setzen sie: `lateGameCurve` (Baseball und Softball), `clockIsFullGameElapsed` (Fußball), `zeroZeroPenaltyPeriods` (Hockey und Fußball) und `knockoutRunMinutes` (die beiden Weltmeisterschaften und beide olympischen Fußballturniere). Über `options.sport` und `options.league` kannst du jede Teilmenge als `Partial` übergeben, um eines pro Aufruf zu überschreiben. Die Bedeutung Feld für Feld und die tatsächlichen Werte jeder Sportart und Liga stehen unter [Sportart- und Liga-Konfiguration](/arenaswap/docs/powerscore/configuration/).

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

Nur Baseball und Softball setzen `SportTypeConfig.lateGameCurve`. Sportarten mit Uhr leiten ihren Anstieg gegen Spielende direkt aus `period` und `clockSeconds` ab und lassen das Feld `undefined`. Für eine uhrbasierte Sportart gibt es hier nichts weiter zu konfigurieren, deshalb hat der Typ derzeit nur eine Form.

## ScorerTunables

Das einzelne exportierte Objekt, das jeden Stufenwert enthält, mit dem die Engine bewertet. Es ist eine vollständig gefüllte Konstante, keine partielle Konfiguration.

| Zweig | Enthält |
|---|---|
| `scores.closeness` | Die Stufenobergrenzen der Ausgeglichenheit (`tied`, `tight`, `zeroZero`, `close`, `fringe`, `none`). Siehe [das Signal Ausgeglichenheit in Klassisch](/arenaswap/docs/powerscore/signals/#closeness). |
| `scores.closenessFlatFloor` | Den flachen Sockel, den jede Stufe der Ausgeglichenheit vor der Skalierung nach Fortschritt zahlt. |
| `scores.lateGame` | Die Obergrenzen des Spielschlusses, den Pre-Boost für die Verlängerung und die Berührung des vorherigen Abschnitts. Siehe [Spielschluss](/arenaswap/docs/powerscore/signals/#late-game-pressure). |
| `scores.momentum` | Die beiden Stufenwerte des Schwungs. Siehe [Schwung](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor). |
| `scores.leadChanges` | Die beiden Stufenwerte der Führungswechsel. |
| `scores.comeback` | Die beiden Stufenwerte des Comebacks und seinen flachen Sockel. |
| `scores.winProbabilityVariance` | `maxAvgDist` und `minDataPoints`, tabellarisch in [Boosts und Strafen](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance). |
| `reasons` | Nur `fallback` („best game available“), die Begründung, auf die das veraltete flache Ergebnis zurückfällt. Der englische Wortlaut steht in `renderReasonEnglish`. |

## FantasyRule und FantasySport

Die Typen hinter [`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints).

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

`min` und `max` sind die Grenzen, die ein Einstellungsbildschirm durchsetzen kann, und `resolveFantasyScoring` begrenzt eine Überschreibung darauf.

## SportType und LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

`SportType` ist eine geschlossene Union. `LeagueId` sind die 31 Ligen mit eingebauter Abstimmung, aber es schränkt ein `Game` nicht ein: Die `league` eines Spiels kann mit `Game<string>` jeder String sein, und eine ID, die die Tabelle nicht kennt, wird mit den Standardwerten ihrer Sportart bewertet. Die vollständige Liste der 31 Liga-IDs steht unter [Sportart- und Liga-Konfiguration](/arenaswap/docs/powerscore/configuration/). Zur Laufzeit gibt es sie auch als `allLeagueIds`.

## PowerScoreResult (2.x)

Veraltet, weiterhin exportiert, weiterhin funktionsfähig. Die flache Ausgabe von `computePowerScore` und die Form, von der `normalizePowerScoreResult` eine partielle Version akzeptiert. `scoreGame` gibt sie nicht zurück.

| Feld | Typ | Fehlt es, heißt das |
|---|---|---|
| `gameId` | `string` | Überall Pflicht, wo dieser Typ vorkommt. |
| `total` | `number` | Von `computePowerScore` gesetzt. 0 bis `scoreMaxTotal` (100), außer es entstand über `normalizePowerScoreResult` mit `allowTotalOverflow`. |
| `closeness` | `number` | 0 bis `scoreMaxCloseness` (42). |
| `lateGame` | `number` | 0 bis `scoreMaxLateGame` (38). |
| `momentum` | `number` | 0 bis `scoreMaxMomentum` (38). |
| `leadChanges` | `number` | 0 bis `scoreMaxLeadChanges` (18). |
| `comeback` | `number` | 0 bis `scoreMaxComeback` (20). |
| `winProbabilityVariance?` | `number` | −`scoreWinProbVarianceMax` bis `scoreWinProbVarianceMax` (±5). Fehlt, statt `0` zu sein, wenn kein Siegwahrscheinlichkeitsverlauf übergeben wurde oder zu wenig davon nutzbar war. |
| `reason` | `string` | Fällt auf `scorerTunables.reasons.fallback` („best game available“) zurück, wenn es fehlt oder kein String ist. |
| `onBreak?` | `boolean` | Fehlend gilt als `false`. `normalizePowerScoreResult` reicht es durch, wenn es ein Boolean ist. |
| `breakPenalty?` | `number` | Abgezogene Punkte, immer ≥ 0. Fehlt, statt `0` zu sein, wenn keine übergeben wurden. `computePowerScore` setzt es nicht. |
| `signalsSubtotal?` | `number` | Die Summe der fünf Signale vor dem Pausenabzug, 0 bis `scoreMaxSignalsSubtotal` (156). |
| `favoriteBonus?`, `favoriteTeamCount?`, `gameBoost?`, `scoringOpportunityBoost?`, `postseasonBoost?` | `number` | Werden von `computePowerScore` nicht berechnet. Fehlen, außer ein Aufrufer liefert sie. |

`scoreGame` faltet die Boosts für Favoriten, Postseason und Spiel für dich ein, du musst damit also nie von Hand ein `PowerScoreResult` bauen. Alles, was 2.x noch exportiert, steht in [der API-Referenz](/arenaswap/docs/powerscore/api-reference/#the-2x-api).
