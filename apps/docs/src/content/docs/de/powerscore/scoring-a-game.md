---
sourceHash: 'd23f4e1a7b17'
title: Ein Spiel aus Live-Daten bewerten
description: Bilde deinen eigenen Feed auf ein Game-Objekt ab, führe über die Abfragen hinweg einen Spielstandverlauf, schalte die Boosts und Modi ein, die deine Daten hergeben, und füge Favoriten- und manuelle Boosts hinzu.
section: powerscore
order: 2
navLabel: Aus Live-Daten bewerten
faq:
  - q: Prüft scoreGame, ob ein Spiel wirklich live ist?
    a: Nur die Boosts tun das. Sie zahlen nichts aus, solange der Status des Spiels nicht 'in' ist. Die Signale bewerten auch ein Spiel, das noch nicht begonnen hat oder schon zu Ende ist, und ein Spiel in einer Pause oder Verzögerung bekommt 0. Filtere vorher selbst auf Live-Spiele, so wie ArenaSwap es tut, bevor es den Bewerter überhaupt aufruft.
  - q: Kann ich PowerScore mit Ligen nutzen, die es nicht aufführt?
    a: Ja. Game ist über die Liga-ID generisch, und eine ID, die die eingebaute Tabelle nicht kennt, wird mit den Standardwerten ihrer Sportart bewertet. Überschreib Anzahl und Länge der Spielabschnitte pro Aufruf mit options.league, falls die Standardwerte nicht stimmen.
---

`scoreGame` holt nichts ab. Es bewertet, welches `Game`-Objekt und welchen Kontext du ihm übergibst. Diese Seite baut beides aus einem erfundenen Feed und schaltet dann mehr von der Engine ein, soweit deine Daten es hergeben.

## Deinen Feed auf ein Game abbilden

Nur `id`, `league`, `sportType` und die beiden Team-Spielstände sind Pflicht. Alles andere macht die Bewertung genauer, wenn dein Feed es hat, und zählt als unbekannt, wenn nicht. Bilde ab, was du hast, und lass den Rest weg.

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

Setz `status` ehrlich. `'in'` ist das, was die Boosts prüfen, bevor sie etwas auszahlen. Ein Flag `intermission` oder `delayed` setzt den gesamten Wert auf 0, bis wieder gespielt wird, damit ein Spiel in einer Werbepause oder Regenverzögerung kein laufendes überholen kann.

## Gib mehr, und mehr schaltet sich ein

Jedes optionale Feld schaltet den Teil der Engine ein, der es braucht. Lässt du eines weg, bekommt dieser Teil 0. Nichts wirft einen Fehler.

| Gib ihm | In | Und das schaltet sich ein |
|---|---|---|
| Spielstand-Schnappschüsse, älteste zuerst | `context.history` | Schwung, Führungswechsel, Comeback. Braucht mindestens 3 Schnappschüsse. |
| Siegwahrscheinlichkeit, 0 bis 1 je Abfrage | `context.winProbability` | Den Modifikator ±5 für die Siegwahrscheinlichkeit. Braucht mindestens 5 Werte. |
| Ob das Spiel in einer Werbepause ist | `context.onBreak` | Den Abzug für die Pause. |
| `possession`, `yardsToEndZone`, `down`, `distance` und `timeouts` am Team | `game`, `game.homeTeam` | Den Two-Minute-Drill und Fantasys Football-Situation. |
| `isRedZone`, dazu `down`, `distance` und `isGoalToGo` | `game` | Den Red-Zone-Boost. |
| `baseRunners`, `outs`, `topOfInning` | `game` | Läufer auf Base und den Go-ahead-Run. |
| `hits` bei jedem Team | `game.homeTeam`, `game.awayTeam` | Den No-Hitter. |
| `series` und `rank` bei jedem Team | `game`, `game.homeTeam` | Brisanz: eine Serie am Abgrund, zwei platzierte Teams. |
| `context.stakes` | `context` | Brisanz: ein Rennen am Saisonende. |
| `pregameLine` | `context` | Sensations-Alarm. Nimm die Quote von vor dem Spiel. |
| `redCards` | `game` | Den Boost für die Rote Karte, Fußball. |
| `powerPlay`, `emptyNet` | `context` | Hockeys Punktchance. |
| `fantasy` | `context` | Den Fantasy-Modus. |
| `nickname` bei jedem Team | `game.homeTeam`, `game.awayTeam` | Teamnamen in `reason` anstelle des Kürzels. |
| `seasonType`, `postseasonRound` | `game` | Brisanz liest das Spiel als Postseason (eine Serie) statt als reguläre Saison (Platzierungen und Rennen). |
| `recentLeadChanges` | `context` | Eine Zahl der Führungswechsel aus dem Spielprotokoll deines Feeds, für Wechsel zwischen zwei Abfragen. |

Alle Felder stehen auf [der Seite zu den Typen](/arenaswap/docs/powerscore/types/#game), und was jeder Boost auszahlt, steht unter [Boosts und Strafen](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Einen Spielstandverlauf für Schwung, Führungswechsel und Comeback führen

Diese drei Signale lesen aus `context.history`, einer Liste der bisherigen Spielstände eines Spiels, und bleiben auf 0, bis sie mindestens drei Schnappschüsse hat. Leg bei jeder Abfrage einen ab, der Reihe nach, älteste zuerst, mit einem Zeitstempel in Millisekunden. Die Zeitstempel müssen nur relativ zueinander stimmen. Echte Uhrzeit müssen sie nicht sein.

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

Boston lag mit 5 zurück und ist mit einem 13:2-Lauf in Führung gegangen:

```ts
score.total;  // 86
score.reason; // 'BOS came back from 5 down to lead. Up 6 in the 3rd quarter'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 16
```

Kürz Schnappschüsse, die älter sind als das `historyWindowMs` der Sportart, damit das Array nicht ewig wächst. Dieses Fenster und der Rest der sportartspezifischen Feinabstimmung stehen unter [Sportart- und Liga-Konfiguration](/arenaswap/docs/powerscore/configuration/).

## Pausen und Siegwahrscheinlichkeit verfolgen, falls du sie hast

Beides kommt in den Kontext. Kannst du erkennen, wann ein Spiel in einer Werbepause ist, übergib `onBreak`:

```ts
const score = scoreGame(game, { history, onBreak: isInBreak(game), winProbability });
```

`isInBreak` schreibst du selbst, aus allem, was dein Feed über Inning-Pausen, Pitcherwechsel und Timeouts sagt. Solange `onBreak` `true` ist, verliert der Wert pauschal 15 Punkte.
`winProbability` ist eine Liste aktueller Siegwahrscheinlichkeiten von 0 bis 1, für ein beliebiges Team. Nur der Abstand zu 50 % zählt. Beides ist optional, und PowerScore bewertet auch ohne. Was jedes davon ändert, steht unter [Boosts und Strafen](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Die Boosts den Moment sehen lassen

Baseball, Football, Hockey und Fußball haben jeweils eine Situation, die der Spielstand allein nicht zeigt. Füg die Felder hinzu, die dein Feed hat, und `scoreGame` zahlt dafür aus. Hier ein Baseballspiel im Bottom des 9. Innings, Gleichstand, Bases voll, ein Aus:

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

Diese beiden zusammen füllen die Obergrenze von 20 im Topf für Momente. Football bekommt die Red Zone aus `isRedZone`, gewichtet nach `down`, `distance` und `isGoalToGo`, und den Two-Minute-Drill aus `possession`, `yardsToEndZone` und `down`. Hockeys Punktchance braucht `context.powerPlay` und `context.emptyNet`. Fußball braucht `redCards`.

## In einem anderen Modus bewerten

Wähl einen Modus mit `options.mode`. Kantersiege braucht nichts extra. Fantasy braucht deinen Kader im Kontext, einen Eintrag pro Spieler:

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

Über `pointEvents` sieht Fantasy-Punkte, wie ein Spieler vor einer Minute welche erzielt hat. Um eine Zeile aus dem Boxscore in diese Punkte umzurechnen, nutz [`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints). Ein Spiel ohne einen deiner Spieler wird als Klassisch bewertet, und `score.modeId` sagt es.

## Favoriten-, Postseason- und manuelle Boosts hinzufügen

Bewerte das Spiel zuerst und lass die Optionen das ergänzen, was PowerScore nicht kennt, etwa das Lieblingsteam eines Zuschauers. Dieselben Optionen funktionieren in jedem Modus.

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 106
```

Favoriten- und Postseason-Boost werden zur Summe addiert und bei 100 gekappt. `gameBoost` kommt danach dazu und darf als Einziges über 100 hinaus, sodass ein Spiel, das ein Zuschauer anpinnt, einen perfekten Wert schlagen kann. Ein eingefrorenes Spiel überspringt alle: Ein gestopptes Spiel kann kein laufendes überholen.

Auch ArenaSwaps eigener [Bewertungscode](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts) baut seine Optionen so, bevor er die Werte an den Tab-Wechsler gibt.

## Die 2.x-Variante

`computePowerScore(game, history, winProbabilityHistory)` funktioniert weiterhin und liefert das flache 2.x-Ergebnis, ohne Boosts für Momente. Es ist die richtige Wahl, wenn du nur die Zahl willst, die du immer bekommen hast. [Die API-Referenz](/arenaswap/docs/powerscore/api-reference/#the-2x-api) listet alles auf, was noch da ist.
