---
sourceHash: '854afd07d71b'
title: Sportart- und Liga-Konfiguration
description: Jedes Feld von SportTypeConfig und LeagueConfig, die Standardwerte für alle sechs Sportarten und 31 Ligen, und wie sich festlegt, was in einer Sportart als eng gilt.
section: powerscore
order: 5
navLabel: Konfiguration
---

`scoreGame` schlägt bei jedem Aufruf zuerst zwei exportierte Maps nach. `sportTypeConfigMap`, geordnet nach `SportType`, enthält, wie eine Sportart gespielt wird. `leagueConfigMap`, geordnet nach `LeagueId`, enthält, wie lang die Spielabschnitte einer Liga sind. Passen die eingebauten Werte nicht zu deinen Daten, kannst du beide pro Aufruf über `options.sport` und `options.league` überschreiben. [Auf deine eigene Liga abstimmen](#tune-it-for-a-league-powerscore-doesnt-ship) zeigt, wie.

## SportTypeConfig

Ein Eintrag pro `SportType`, exportiert als `sportTypeConfigs` (ein Array) und `sportTypeConfigMap` (nach `id` geordnet). Diese Tabelle enthält die tatsächlichen Werte der sechs Sportarten, und [was die Felder bedeuten](#what-the-sport-fields-mean) steht direkt darunter. Klassisch liest alles davon. Kantersiege liest `closenessMargins`, `momentumBigRun` und `momentumSmallRun`, die Halbwertszeit des Schwungs und `historyWindowMs`.

| Feld | Basketball | Football | Hockey | Fußball | Baseball | Softball |
|---|---|---|---|---|---|---|
| `clockBased` | true | true | true | true | false | false |
| `closenessMargins` (t1, t2, t3) | 5, 10, 18 | 3, 9, 14 | 1, 2, 3 | 1, 2, 3 | 1, 3, 5 | 1, 3, 5 |
| `momentumBigRun` / `momentumSmallRun` | 8 / 4 | 10 / 4 | 2 / 1 | 2 / 1 | 3 / 1 | 3 / 1 |
| `comebackThresholdBig` / `comebackThresholdSmall` | 6 / 3 | 7 / 3 | 2 / 1 | 2 / 1 | 2 / 1 | 2 / 1 |
| `clockCountsUp` | false | false | false | true | false | false |
| `clockIsFullGameElapsed` | false | false | false | true | false | false |
| `zeroZeroAsFullTie` | false | false | true | true | false | false |
| `zeroZeroPenaltyPeriods` | keine | keine | 1, 2 | 1 | keine | keine |
| `otPreBoostWindowSecs` | 60 | 60 | 60 | 60 | 0 | 0 |
| `decayHalfLifeMs.momentum` | 45,000 | 135,000 | 180,000 | 240,000 | 150,000 | 150,000 |
| `decayHalfLifeMs.leadChange` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `decayHalfLifeMs.comeback` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `historyWindowMs` | 300,000 (5 Min.) | 720,000 (12 Min.) | 960,000 (16 Min.) | 1,200,000 (20 Min.) | 720,000 (12 Min.) | 720,000 (12 Min.) |
| `lateGameCurve` | keine | keine | keine | keine | 9 Innings, beginnt bei 6 | 7 Innings, beginnt bei 5 |

`historyWindowMs` ist die Spanne an Spielstandverlauf, die jede Sportart vorhalten muss, damit Schwung, Führungswechsel und Comeback funktionieren. Das Signal Führung gehalten von Kantersiege wird über dasselbe Fenster gemessen. Es ist mindestens viermal so lang wie die längste Halbwertszeit der Sportart. Mit diesem Abstand kann ein Signal vollständig abklingen, bevor es aus dem Fenster fällt, egal wie oft ein Aufrufer abfragt.

### Was die Sportartfelder bedeuten

| Feld | Bedeutung |
|---|---|
| `clockBased` | Die Sportart hat eine Spieluhr. Baseball und Softball haben keine, deshalb läuft der Druck gegen Spielende dort über die Innings. |
| `closenessMargins` | Die drei Abstände, bei denen Ausgeglichenheit stufenweise abnimmt: innerhalb von t1 ist es knapp, innerhalb von t2 eng, innerhalb von t3 am Rand, jenseits von t3 gibt es nichts. Andere Signale und Boosts nutzen sie mit, etwa die Klatschen-Grenze des Comeback-Faktors bei t2 und das Timing-Tor von Kantersiege jenseits von t3. |
| `momentumBigRun`, `momentumSmallRun` | Der Nettolauf innerhalb des Verlaufsfensters, der die volle und die halbe Stufe von Schwung auszahlt. |
| `comebackThresholdBig`, `comebackThresholdSmall` | Der Umschwung, der die große und die mittlere Stufe des Comeback-Faktors auszahlt. |
| `clockCountsUp` | Die Uhr zeigt die gespielte Zeit statt der Restzeit. Nur Fußball. |
| `clockIsFullGameElapsed` | Die Uhr läuft über das ganze Spiel (0' bis 90'+), statt in jedem Abschnitt neu zu starten. Deshalb werden abgeschlossene Abschnitte abgezogen, bevor die Restzeit berechnet wird. Nur Fußball. |
| `zeroZeroAsFullTie` | Ein 0:0 bekommt in Ausgeglichenheit die volle Gleichstand-Gutschrift. Bei `false` bekommt 0:0 die reduzierte Stufe `zeroZero`. |
| `zeroZeroPenaltyPeriods` | Abschnitte, in denen 0:0 trotz `zeroZeroAsFullTie` auf `true` nur die reduzierte Stufe bekommt. Hockey nutzt 1 und 2, Fußball die erste Halbzeit. |
| `otPreBoostWindowSecs` | Die letzten Sekunden des letzten regulären Abschnitts, in denen ein Spiel mit Gleichstand auf den Pre-Boost für die Verlängerung zusteuert. `0` schaltet ihn ab. |
| `decayHalfLifeMs` | Wie schnell Schwung, Führungswechsel und Comeback-Faktor nach dem letzten Treffer abklingen. In torarmen Sportarten länger, damit ein Tor sie bis zum nächsten am Leben hält. |
| `historyWindowMs` | Wie viel Spielstandverlauf die Verlaufssignale lesen. Siehe oben. |
| `lateGameCurve` | Nur Baseball und Softball: wie viele Innings die reguläre Spielzeit hat und in welchem Inning der Anstieg gegen Spielende beginnt. |

## LeagueConfig

Ein Eintrag pro `LeagueId`, exportiert als `leagueConfigs` (ein Array) und `leagueConfigMap` (nach `id` geordnet), dazu `allLeagueIds` für die reine Liste. `periodFormat` ist nur Anzeigetext und beeinflusst die Bewertung nicht. Jeder Eintrag trägt außerdem ein paar Felder, die ArenaSwap für sein eigenes Abrufen nutzt und dafür, wie lange ein Spiel einen Balken im Zeitplan belegt. Der Bewerter liest sie nicht, deshalb stehen sie hier nicht in der Tabelle.

| Liga | Sportart | Abschnitte | Abschnittslänge |
|---|---|---|---|
| NBA (`nba`) | Basketball | 4 | 720s |
| WNBA (`wnba`) | Basketball | 4 | 600s |
| NCAA Basketball (`ncaab`) | Basketball | 2 | 1200s |
| NCAA Women's Basketball (`ncaaw`) | Basketball | 4 | 600s |
| Olympic Men's Basketball (`olybkm`) | Basketball | 4 | 600s |
| Olympic Women's Basketball (`olybkw`) | Basketball | 4 | 600s |
| NFL (`nfl`) | Football | 4 | 900s |
| NCAA Football (`ncaaf`) | Football | 4 | 900s |
| UFL (`ufl`) | Football | 4 | 900s |
| NHL (`nhl`) | Hockey | 3 | 1200s |
| NCAA Men's Hockey (`ncaamh`) | Hockey | 3 | 1200s |
| Olympic Men's Ice Hockey (`olymih`) | Hockey | 3 | 1200s |
| Olympic Women's Ice Hockey (`olywih`) | Hockey | 3 | 1200s |
| MLB (`mlb`) | Baseball | 9 Innings | 0 |
| NCAA Baseball (`cbase`) | Baseball | 9 Innings | 0 |
| Olympic Men's Baseball (`olybb`) | Baseball | 9 Innings | 0 |
| World Baseball Classic (`wbbc`) | Baseball | 9 Innings | 0 |
| NCAA Softball (`csoft`) | Softball | 7 Innings | 0 |
| MLS (`mls`) | Fußball | 2 | 2700s |
| English Premier League (`epl`) | Fußball | 2 | 2700s |
| La Liga (`laliga`) | Fußball | 2 | 2700s |
| Bundesliga (`bundesliga`) | Fußball | 2 | 2700s |
| Serie A (`seriea`) | Fußball | 2 | 2700s |
| Liga MX (`ligamx`) | Fußball | 2 | 2700s |
| UEFA Champions League (`ucl`) | Fußball | 2 | 2700s |
| UEFA Europa League (`uel`) | Fußball | 2 | 2700s |
| NWSL (`nwsl`) | Fußball | 2 | 2700s |
| FIFA World Cup (`fifawc`) | Fußball | 2 | 2700s |
| FIFA Women's World Cup (`fifawwc`) | Fußball | 2 | 2700s |
| Olympic Men's Soccer (`olysocm`) | Fußball | 2 | 2700s |
| Olympic Women's Soccer (`olysocw`) | Fußball | 2 | 2700s |

Insgesamt 31 Ligen, passend zu den 31 Mitgliedern von `LeagueId`.

## Wie sich festlegt, was in einer Sportart als eng gilt

Ein einziges Tupel, `closenessMargins: [t1, t2, t3]`, entscheidet für eine Sportart gleich mehrere Dinge. Es bestimmt, in welcher Stufe ein Abstand landet: knapp bei `t1`, eng bei `t2`, am Rand bei `t3`, außer Reichweite dahinter. Es bestimmt außerdem die Obergrenze, auf die der Druck gegen Spielende zusteuert, das Band, in dem der Red-Zone-Boost im Football auszahlt, ab wo Kantersiege zu zahlen beginnt (zwei Scores Abstand, jenseits von `t2`) und wie viel Gewicht die Brisanz bekommt.

Die `[5, 10, 18]` im Basketball heißen: Ein 2-Punkte-Spiel ist knapp, ein 9-Punkte-Spiel eng. Ein 18-Punkte-Spiel ist das letzte, das noch als Rand zählt. Die `[1, 2, 3]` im Hockey und Fußball behandeln ein 2-Tore-Spiel so, wie der Basketball ein 9-Punkte-Spiel behandelt. Was in einer Sportart als eng gilt, änderst du an einem Tupel, nicht an einer Handvoll einzelner Schwellen.

## Auf eine Liga abstimmen, die PowerScore nicht mitbringt

`Game` ist über die Liga-ID generisch, ein Feed mit eigenen IDs funktioniert also direkt: `Game<string>`. Eine Liga, die die Tabelle nicht kennt, wird mit den Standardwerten ihrer Sportart bewertet. Jede Sportart verweist für Abschnittszahl und Uhr auf ihre bekannteste Liga:

| Sportart | Standard ist |
|---|---|
| Basketball | NBA |
| Hockey | NHL |
| Baseball | MLB |
| Football | NFL |
| Softball | NCAA Softball |
| Fußball | MLS |

`sportType` ist das Einzige, was du richtig setzen musst. Es bestimmt, was ein Signal größtenteils tut, egal welche `league` gesetzt ist. Ein unbekannter `sportType` greift getrennt davon auf die Signalabstimmung des Basketballs zurück. Beide Rückfälle sorgen dafür, dass das Spiel trotzdem bewertet wird, statt einen Fehler zu werfen.

Passen die Standardwerte nicht zu deiner Liga, überschreib sie pro Aufruf:

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

`options.league` nimmt jeden Teil einer `LeagueConfig`, meist Abschnittszahl und -länge. `options.sport` nimmt jeden Teil einer `SportTypeConfig`, etwa die Abstände für Ausgeglichenheit, die Schwellen für Schwung oder die Halbwertszeiten. Überschreibungen gelten nur für diesen Aufruf, und die exportierten Maps bleiben, wie sie waren.

`sportTypeConfigMap` und `leagueConfigMap` sind schlichte exportierte Objekte, die bei jedem Aufruf gelesen werden und nicht aus einer zwischengespeicherten Kopie. Sie zur Laufzeit zu verändern, ändert tatsächlich das Bewertungsverhalten, aber nichts in den Typen oder Exporten des Pakets behandelt das als unterstützten Erweiterungspunkt, und eine künftige Version muss es nicht weiter ermöglichen. Nutz die Optionen.
