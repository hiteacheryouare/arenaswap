---
sourceHash: '9c4dba756b81'
title: PowerScore-Boosts und -Strafen
navLabel: Boosts und Strafen
description: Jeder Boost und jede Strafe, die PowerScore 3 auf die Signale eines Modus legt, mit der Bedingung, die sie auslöst, ihrem Maximum und den Obergrenzen, die sie sich teilen.
section: powerscore
order: 4
---

Signale messen, wie ein Spiel läuft. Boosts und Strafen kümmern sich um die kleineren, momentgeprägten Dinge, die die Signale nicht sehen: ein Läufer auf der dritten Base im 9. Inning, ein herausgenommener Torwart, ein Außenseiter vor dem Spiel, der noch im Rennen ist. Sie liegen obendrauf und ersetzen kein Signal.

Ein Boost zahlt nichts, solange das Spiel nicht live ist (`status: 'in'`) oder solange das Spiel zur Halbzeit, in einer Pause oder bei einer Verzögerung eingefroren ist. Jeder wird bei jedem Aufruf aus dem aktuellen Spielzustand neu berechnet, es gibt also nichts zurückzusetzen, wenn der Moment vorbei ist.

Jeder Boost, den ein Modus auszahlt, erscheint in `score.boosts` als `{ id, points, meta?, details? }`, wobei `details` die Begründungsfragmente enthält, die ihn beschreiben, bei `0`, wenn er nicht zahlt. Schlag einen mit `boostPoints(score, 'noHitter')` nach.

## Welcher Modus welche Boosts behält

| Modus | Boosts |
|---|---|
| Klassisch | Jeder Boost auf dieser Seite, dazu der Modifikator für die Siegwahrscheinlichkeit und der Abzug für die Werbepause |
| Kantersiege | No-Hitter und Upset-Klatsche, dazu der Abzug für die Werbepause. Kein Postseason-Boost, denn ein Playoff-Kantersieg hat sein Ergebnis schon entschieden. |
| Fantasy | Keine, und kein Pausenabzug |

Die Boosts für Favoriten, Postseason und von Hand [unten auf der Seite](#favorite-postseason-and-manual-boosts) gelten in jedem Modus, nur dass Kantersiege den Postseason-Boost überspringt.

## Die Momentboosts von Klassisch

| Boost | ID | Zahlt für | Max. |
|---|---|---|---|
| [Punktchance](#scoring-opportunity) | `scoringOpportunity` | Läufer auf Base, ein Football-Drive in der Red Zone oder ein Powerplay bzw. leeres Tor im Hockey | 20 |
| [Go-ahead-Run](#go-ahead-run) | `goAheadRun` | Der Go-ahead- oder Tying-Run auf Base im Baseball und Softball | 10 |
| [Two-Minute-Drill](#two-minute-drill) | `twoMinuteDrill` | Ein Football-Team mit dem Ball, bei Gleichstand oder mit einem Score Rückstand, in den Schlussminuten | 12 |
| [Rote Karte](#red-card) | `redCard` | Ein Platzverweis in einem Fußballspiel bei Gleichstand oder mit einem Tor Abstand | 15 |
| [No-Hitter](#no-hitter) | `noHitter` | Ein Baseball- oder Softballspiel, in dem ein Team noch ohne Hit ist | 70 |
| [Sensations-Alarm](#upset-watch) | `upsetWatch` | Der Außenseiter vor dem Spiel führt oder liegt höchstens einen Score zurück | 12 |
| [Brisanz](#stakes) | `stakes` | Eine Serie am Abgrund, zwei platzierte Teams, ein Rennen am Saisonende | 10 |

Diese Maxima gelten pro Boost. Der nächste Abschnitt erklärt, warum sie sich nicht alle addieren.

## Obergrenzen für die Töpfe

Boosts teilen sich Obergrenzen, damit viele kleine Dinge, die gleichzeitig passieren, ein Spiel nicht über das hinausschieben, was ein Score-Umschwung in der letzten Minute einbringen würde.

| Topf | Obergrenze | Was drin ist | Warum |
|---|---|---|---|
| Momente | 20 | Punktchance, Go-ahead-Run, Two-Minute-Drill, Rote Karte | Ein Spiel mit Gleichstand beim Schlusssignal liegt vor den Boosts bei etwa 80, ein voller Moment hebt es also auf 100. Eine Schlussminute mit einem Score Abstand landet in den hohen 80ern, und nicht jedes enge Spiel steht bei 100. |
| No-Hitter | 70 | No-Hitter | Eine Serie ohne Hit dauert Innings, nicht einen Moment, und sie muss ein 6:0-Spiel über Spiele mit Gleichstand heben. |
| Kontext | 16 | Sensations-Alarm, Brisanz | Sie können zusammen auftreten (ein platzierter Außenseiter), bleiben zusammen aber unter einem späten Ein-Score-Umschwung, sodass Kontext nie das Live-Geschehen übertrumpft. |

Innerhalb eines Topfes werden Boosts, die in der Tabelle oben weiter vorn stehen, zuerst ausgezahlt, und die Obergrenze kappt, was übrig bleibt. Die Upset-Klatsche, die Version des Sensations-Alarms in Kantersiege, hat keinen Topf.

## Punktchance

Eine Torgefahr, die der Spielstand selbst noch nicht zeigt.

**Baseball und Softball**, nach Anzahl der Läufer:

| Läufer auf Base | Boost |
|---|---|
| Keiner | 0 |
| Einer | 3 |
| Zwei | 6 |
| Drei (Bases voll) | 10 |

Bei 3 Outs zahlt er nichts. Läufer können nach dem letzten Out noch eine Abfrage lang auf einer Anzeigetafel stehen, und mit ihnen kann nichts mehr passieren.

**Football**, abhängig davon, wie eng das Spiel schon ist. Das gilt nur, wenn `isRedZone` true ist.

| Abstand | Basiswert |
|---|---|
| Innerhalb des engen Bandes (Football: 9 Punkte) | 10 |
| Innerhalb des Randbandes (14 Punkte) | 5 |
| Darüber hinaus | 0 |

Der Basiswert wird dann nach Down gewichtet:

| Situation | Multiplikator |
|---|---|
| 4th down und Goal-to-go | ×1.5 |
| 4th down (nicht Goal-to-go) | ×1.35 |
| 3rd down, 3 Yards oder weniger zu gehen | ×1.15 |
| Alles andere, auch ein fehlendes `down` | ×1 |

Ein Basiswert von `0` bleibt `0`, egal welcher Down. Ein bedingungsloser Boost obendrauf bei einem Kantersieg würde zunichtemachen, was Ausgeglichenheit und der Druck gegen Spielende schon richtig niedrig bewertet haben. Goal-to-go erhöht den Multiplikator nur beim 4th down, denn bei einem früheren Down beschreibt es eher die Chance auf einen Score als das, was über den Ballbesitz entscheidet.

**Hockey** zahlt für ein [Powerplay oder ein leeres Tor](#power-play-and-empty-net).

Die exportierten Konstanten hinter diesen Tabellen sind `scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` und `thirdAndShortDistance`.

### Powerplay und leeres Tor

Die Punktchance im Hockey. Beide lesen `context`, weil sie aus dem Situations-Feed kommen und nicht von der Anzeigetafel. Ein 6-gegen-4 ist beides zugleich, die beiden addieren sich also, und die Obergrenze für Momente hält die Summe bei 20.

**Leeres Tor** zahlt in den letzten 4 Minuten des 3. Drittels, wenn das Spiel ein oder zwei Tore auseinander liegt: **12** bei einem Tor, **7** bei zwei. Sagt der Feed, wessen Tor leer ist, zahlt es nur für das des zurückliegenden Teams. Ein leeres Tor des Führenden bedeutet eine verzögerte Strafe, und der Torwart ist in Sekunden zurück. Setz `context.emptyNet` erst, wenn der Feed es bei zwei Abfragen hintereinander gemeldet hat, aus demselben Grund.

**Powerplay** zahlt bei Gleichstand und bei Spielen mit ein oder zwei Toren Abstand. Spät (3. Drittel oder später) zahlt es mehr:

| Spiel | Spät | Früher |
|---|---|---|
| Gleichstand | 10 | 4 |
| Ein Tor, das zurückliegende Team hat die Überzahl | 10 | 4 |
| Ein Tor, das führende Team hat sie | 5 | 2 |
| Zwei Tore, das zurückliegende Team hat sie | 5 | 2 |
| Zwei Tore, das führende Team hat sie | 0 | 0 |

Sagt der Feed nur, dass ein Powerplay läuft, aber nicht für wen, geht der Boost davon aus, dass das zurückliegende Team es genauso wahrscheinlich hat wie nicht, und zahlt etwas weniger: 7 oder 3 bei einem Tor, 3 oder 2 bei zwei.

## Go-ahead-Run

Baseball und Softball. Braucht `baseRunners`, `topOfInning`, `outs` und `period`. Zahlt zusätzlich zur Läuferzahl oben, und nur, wenn das Schlagteam den entscheidenden Run auf Base hat:

| Auf Base | Zahlt |
|---|---|
| Der Go-ahead-Run: Gleichstand mit irgendwem auf Base, einen Run zurück mit zwei auf Base, zwei zurück bei vollen Bases | 8 |
| Der Tying-Run: einen Run zurück mit einem auf Base, zwei zurück mit zwei auf Base, drei zurück bei vollen Bases | 5 |

Es gilt nur die höhere Zeile. Der Basiswert wird dann nach Inning gewichtet:

- Vor dem 6. Inning (dem 5. im Softball) die Hälfte. Eine Bedrohung im 3. ist real, aber das Spiel hat noch reichlich Innings, um zu antworten.
- Von da bis zum letzten regulären Inning 50 % ansteigend auf 100 %.
- Extra Innings 100 %.
- ×1.25, wenn es die letzte Chance ist: das Heimteam am Schlag im letzten Inning oder später, wo der Go-ahead-Run der Siegesrun ist, oder ein zurückliegendes Gastteam in dessen Top, das womöglich nicht mehr schlägt.

Das Maximum ist 10: eine 8 bei vollem Gewicht, mal der Aufschlag für die letzte Chance. Bei 3 Outs zahlt er nichts.

## Two-Minute-Drill

Football. Braucht `possession`, `yardsToEndZone` und ein gültiges `down`. Zahlt im 4. Viertel und in der Overtime, und nur an das Team mit dem Ball, und nur, wenn es mit einem Score noch ausgleichen oder gewinnen kann:

- **Gleichstand:** die letzten 2 Minuten.
- **Einen Score zurück** (8 Punkte, oder 9 in der UFL, wo ein Try 3 wert sein kann): die letzten 4 Minuten.

Ein Team, das mit Führung die Uhr herunterspielt, bekommt nichts. Eine NCAA- oder UFL-Overtime auch nicht, denn sie hat keine Spieluhr.

Die 12 Punkte werden von vier Dingen skaliert: wie wenig Zeit bleibt (voll bei 40 Sekunden), Feldposition (voll ab der 35 des Gegners, oder der 30 im College, bis hinunter zu 40 % an der eigenen 20), verbleibende Timeouts (85 % ohne, 100 % bei drei, 92,5 %, wenn der Feed es nicht sagt) und der Abstand (voll bei Gleichstand oder 1 oder 2 zurück, schrumpfend auf 70 % bei 8 zurück). Zwischen Spielzügen, nach einem Score, schickt ein Feed einen Down, der nichts bedeutet, und der Boost zahlt 0 bis zum nächsten Snap.

## Rote Karte

Fußball. Braucht `redCards`, eine Liste aus `{ side, minute }`. Eine Rote Karte bei Gleichstand oder mit einem Tor Abstand lässt Fans umschalten, und sie zahlt am meisten direkt nach dem Ereignis:

| Wann die Karte kam | Zahlt |
|---|---|
| Gleichstand, oder das Team mit der Karte führt mit einem Tor | 10 |
| Das Team mit der Karte liegt ein Tor zurück | 7 |
| Das Team mit der Karte führt mit zwei Toren | 5 |
| Alles Weitere | 0 |

Sie zahlt 2 Spielminuten lang voll und verblasst bis zur 10. auf 0. Eine zweite Karte für dasselbe Team zahlt 1,5-mal so viel, das ist das Maximum von 15. Sie wird bei jeder Abfrage neu mit dem Spielstand abgeglichen, sodass ein Tor, das das Spiel öffnet, den Boost vorzeitig beendet.

**Zehn Mann.** Eine Rote Karte erhöht außerdem [Ausgeglichenheit](/arenaswap/docs/powerscore/signals/#closeness) um 4 Punkte, wenn das Team in Unterzahl das ist, das eine Ein-Tor-Führung verteidigt. Es kassiert weit häufiger Gegentore als eine volle Mannschaft, das Spiel ist also enger, als der Spielstand sagt. Das bleibt so lange an, wie diese Lage besteht, nicht nur zehn Minuten.

## No-Hitter

Baseball und Softball. Braucht `hits` bei jedem Team, dazu `period` und `topOfInning`. Ein Team ohne Hits zahlt für ein **No-Hit-Versuch**, das spät beginnt und mit jedem hitlosen Inning wächst:

- **Beginnt** nach dem 5. vollständigen Inning eines 9-Inning-Spiels und nach dem 3. im Softball.
- **Steigt** mit jedem vollständigen hitlosen Inning: 10, 22, 38, dann 52 und bleibt dort. Solange das Pitching Staff, das den Versuch jagt, auf dem Feld steht, addiert es außerdem Out für Out Punkte, wächst also auch innerhalb eines Innings weiter.
- **Wird gedämpft** um 30 %, solange dieses Staff in der Dugout sitzt, da dem Versuch nichts passiert. Softball-Versuche werden auf 60 % skaliert.

Sind beide Teams ohne Hit, zahlt der größere Versuch voll und der andere zur Hälfte. Der No-Hitter hat mit 70 eine eigene Obergrenze außerhalb der Momente, weil ein Versuch Innings dauert und ein 6:0-Spiel über Spiele mit Gleichstand heben muss.

## Sensations-Alarm

Jede Sportart. Braucht `context.pregameLine`, und es muss die Quote von vor dem Spiel sein. Eine Live-Quote bewegt sich mit dem Spielstand und würde genau die Sensation auslöschen, die du sehen willst.

Er zahlt, wenn der Außenseiter vor dem Spiel führt, gleichauf liegt oder höchstens einen Score zurückliegt, sobald das Spiel über die Hälfte hinaus ist. Drei Dinge bestimmen die Zahl, bis zu einem Maximum von 12:

- **Quote.** Ein Spiel wie ein Münzwurf zahlt nichts. Je länger die Quote, desto mehr zahlt es, und bei einem krassen Außenseiter ist es voll. Moneylines funktionieren in jeder Sportart, ein Spread funktioniert für Basketball und Football. Ein Unentschieden im Fußball zählt als halbe Sensation.
- **Zeit.** Nichts vor der Hälfte, die Hälfte ab der Hälfte, und voll, sobald das Spiel spät ist (drei Viertel im Basketball und Football, zwei Drittel in den meisten anderen Sportarten).
- **Stand.** Voll, wenn der Außenseiter führt, 80 %, wenn es gleichsteht (70 % im Fußball), und die Hälfte, wenn er höchstens einen Score zurückliegt.

### Upset-Klatsche

Die Version von Kantersiege. Der Außenseiter hängt nicht nur mit dran, er jagt den Favoriten vom Platz. Sie zahlt, wenn der Außenseiter vor dem Spiel um mehr als den Abstand führt, der in der Sportart außer Reichweite ist (18 Punkte im Basketball, 14 im Football, 3 Tore im Hockey und Fußball, 5 Runs im Baseball), mit derselben Quoten- und Zeitskalierung wie der Sensations-Alarm und demselben Maximum von 12.

## Brisanz

Was das Ergebnis entscheidet. Das Maximum ist 10, und die Zahl wird danach skaliert, wie eng das Spiel ist: voll innerhalb des engen Bandes der Sportart, halbiert bei einem Spiel am Rand oder einer Klatsche in ihrer ersten Hälfte, und nichts bei einer Klatsche, die schon spät ist. Ein entschiedenes Spiel 7 hat nichts mehr zu entscheiden.

Brisanz wird nach Saisonabschnitt getrennt gehalten, damit sie den Postseason-Boost nie doppelt zählt. In der Postseason liest sie die Serie. Sonst liest sie Ranglisten und die Tabelle.

| Brisanz | Braucht | Zahlt |
|---|---|---|
| Eine Serie am Abgrund | `game.series`, nur Postseason | 10, wenn beide Teams einen Sieg vom Seriengewinn entfernt sind, in einer Best-of-7 (9 in einer Best-of-5, 8 in einer Best-of-3). 4 bis 7, wenn ein Team vor dem Aus steht: 7 bei einer 3:2-Serie in einer Best-of-7, 4 bei einem Sweep-Versuch. |
| Zwei platzierte Teams | `rank` bei jedem Team, nur reguläre Saison | 6, wenn das niedriger platzierte Team in den Top 5 steht. 5, wenn in den Top 10. 4, wenn ein Team in den Top 10 steht. 3 für jedes andere Paar in den Top 25. |
| Ein Rennen am Saisonende | `context.stakes`, nur reguläre Saison | 5, wenn ein Sieg etwas klarmacht oder eine Niederlage ein Team ausscheiden lässt. 6 wenige Punkte vom Titel oder der Abstiegslinie entfernt. 4 für die vorderen europäischen Plätze. 3 für jede andere Tabellenlinie oder wenn man noch im Rennen ist. |

Bei einem Rennen zahlt das Team mit dem meisten Einsatz voll und das andere zur Hälfte, begrenzt auf 6. Platzierung und Rennen addieren sich, und die Summe wird auf 10 begrenzt.

## Ausgleich der Siegwahrscheinlichkeit

Nur Klassisch. `computeWinProbVarianceScore(winProbHistory)` liefert einen Modifikator von `-scoreWinProbVarianceMax` bis `+scoreWinProbVarianceMax` (±5). Übergib `context.winProbability` an `scoreGame`, und der Modifikator fließt von allein in die Summe ein.

Er braucht mindestens `minDataPoints` (5) endliche Werte. Alles andere liefert `undefined`, und das Feld `winProbabilityVariance` des Ergebnisses wird ganz weggelassen, statt auf `0` gesetzt zu werden. Nicht endliche Einträge (`NaN`, `Infinity`) werden vor der Prüfung dieser Zahl verworfen.

Der Modifikator ist der mittlere absolute Abstand der übergebenen Werte von 0,5, abgebildet auf den Bereich ±5:

| Durchschnittlicher Abstand von 50 % | Modifikator |
|---|---|
| 0 (ein Münzwurf) | +5 |
| `maxAvgDist` ÷ 2 (0.175) | 0 |
| ≥ `maxAvgDist` (0.35) | −5 |

Trotz des Namens misst der Modifikator den durchschnittlichen Abstand von 50 %, nicht die Varianz. Eine Siegwahrscheinlichkeitslinie, die zwischen 10 % und 90 % pendelt, bekommt dieselbe Strafe wie eine, die gleichmäßig bei 90 % bleibt. Beide haben im Schnitt denselben Abstand zur Mitte.

Der Modifikator wird nach dem Pausenabzug addiert, nicht davor, und das Ergebnis wird auf 0 bis 100 begrenzt, bevor ein Boost dazukommt.

## Abzug für die Werbepause

Ein pauschaler Abzug geht vom Signal-Zwischenstand ab, solange ein Spiel in einer Werbepause ist, damit ArenaSwap nicht zu einem Spiel wechselt, das gerade Werbung zeigt. Der Aufrufer übergibt `context.onBreak`, und die Engine zieht pauschal 15 Punkte vom Signal-Zwischenstand ab, solange es `true` ist. Das ist `breakPenalty`. Sind einige Signale deaktiviert, wächst der Abzug mit dem Rest des Zwischenstands: 30, wenn die Hälfte der Signalobergrenze abgeschaltet ist.

Er wird nach den Signalen und vor dem Modifikator für die Siegwahrscheinlichkeit abgezogen, und er ist ein Abzug, kein Multiplikator. Klassisch und Kantersiege zahlen ihn. Fantasy nicht. `onBreak` und `breakPenalty` im Ergebnis sagen, ob er galt und wie viel abgezogen wurde. Beide sind `false` und `0` bei einem eingefrorenen Stand zur Halbzeit oder in der Pause.

`signalsSubtotal` im Ergebnis enthält die Summe vor dem Abzug, sodass eine Aufschlüsselung zeigen kann, was die Pause gekostet hat. `scoreGame` erkennt Pausen nicht selbst. Das macht der Aufrufer. ArenaSwap liest Inning-Pausen, Pitcherwechsel und TV-Auszeiten aus seinem Anzeigetafel-Feed und gibt die Antwort weiter.

## Favoriten-, Postseason- und manuelle Boosts

Diese drei kommen von dir, nicht vom Spiel, und sie funktionieren in jedem Modus. Die einzige Ausnahme ist Kantersiege, das den Postseason-Boost nie zahlt. Übergib sie in `options`:

| Option | Was sie tut |
|---|---|
| `favoriteTeamCount` und `favoriteBoostPoints` | Punkte für jedes Lieblingsteam im Spiel, ein Matchup zweier Favoriten zahlt also doppelt. |
| `postseasonBoostPoints` und `game.postseasonRound` | Punkte für eine titelentscheidende Runde (`0`), mit einem Anteil für frühere: `1` Halbfinale 75 %, `2` Viertelfinale 50 %, `3` alles Frühere 25 %. |
| `gameBoost` | Ein pauschaler manueller Boost, etwa einer, den ein Zuschauer bei einem Spiel setzt. |

Sie erscheinen in `score.boosts` als `favoriteBoost`, `postseasonBoost` und `gameBoost`, sobald du sie angefordert hast. Der Favoriten- und der Postseason-Boost werden nach den eigenen Boosts des Modus und seiner Mischung addiert, und die Summe wird wieder bei 100 gekappt. `gameBoost` kommt zuletzt, und er ist das Einzige, was über 100 hinaus darf. Das ist Absicht: Ein Spiel, das ein Zuschauer anpinnt, soll einen perfekten Wert schlagen können.

Keiner von ihnen zahlt etwas, solange du ihnen keine Punkte gibst. Das Paket hat für keinen einen Standardwert. Wie ArenaSwap die gespeicherten Einstellungen eines Zuschauers in diese Zahlen umsetzt, steht in [seinen eigenen Docs](/arenaswap/docs/extension/settings/#scoring), nicht in diesem Paket.

## Falls du noch auf der 2.x-API bist

`computePowerScore` behält sein 2.x-Verhalten: Signale und Siegwahrscheinlichkeit, ohne Momentboosts. `computeScoringOpportunityBoost(game)` liefert die Zahl der Punktchance weiterhin allein, und `normalizePowerScoreResult` begrenzt und reicht `favoriteBonus`, `gameBoost` und `postseasonBoost` weiterhin durch, für ein Ergebnis, das du von Hand baust. Alle diese sind veraltet, funktionieren aber. Die vollständige Liste steht in [der API-Referenz](/arenaswap/docs/powerscore/api-reference/#the-2x-api).
