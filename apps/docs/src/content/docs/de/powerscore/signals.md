---
sourceHash: '1aa0123b3860'
title: PowerScore-Signale in jedem Modus
description: Die Signale hinter dem PowerScore in Klassisch, Kantersiege und Fantasy, mit Obergrenze, Messgröße und Blindstellen jedes Signals. Dazu, wie du Signale abschaltest.
section: powerscore
order: 3
navLabel: Signale nach Modus
---

Ein Signal misst eine Sache an einem Spiel und ignoriert alles andere, auch die übrigen Signale seines Modus. Ein Modus ist eine Liste von Signalen plus die Boosts, die zu ihm passen. PowerScore 3 liefert drei davon, und jeder stellt eine andere Frage.

| Modus | Die Frage | Signale (Obergrenze) |
|---|---|---|
| `'classic'` (der Standard) | Ist es eng, spät und wechselhaft? | Ausgeglichenheit 42, Spielschluss 38, Schwung 38, Führungswechsel 18, Comeback-Faktor 20 |
| `'blowouts'` | Läuft jemand davon? | Abstand 50, Führung gehalten 30, Timing 25, Nachlegen 15 |
| `'fantasy'` | Passiert gleich etwas mit meinen Spielern? | Situation 50, Produktion 35, Exposure 15 |

Wähl einen mit `options.mode`. Als IDs, wie sie in `score.signals` stehen, sind das `closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`, dazu `blowoutMargin`, `sustained`, `timing`, `pileOn` und `situation`, `production`, `exposure`.

Kantersiege und Fantasy ersetzen Klassisch nicht. Beide bauen darauf auf, sodass ein Spiel, das im neuen Modus nichts zu sagen hat, trotzdem einen sinnvollen Wert behält. [Wie sich die Modi mit Klassisch mischen](#how-the-modes-blend-with-classic) behandelt die Rechnung.

## Warum die Obergrenzen mehr ergeben als die Summe

Die Obergrenzen von Klassisch summieren sich auf 156, und die Summe wird bei 100 gekappt. Eine Skala, die nur 60 ihrer 100 Punkte je auszahlt, würde die anderen 40 an Spiele verschwenden, die nie die Spitze erreichen können. Die Obergrenzen über die Kappung hinaus zu summieren hält jeden Punkt im Spiel. Ein enges Spiel mit Führungswechseln und einem Lauf stapelt mehrere Signale gleichzeitig nahe an ihrem Maximum und erreicht die 80er oder 90er lange vor dem Schlusssignal. Ein echter Klassiker, spät ausgeglichen und mit einem Lauf im Rücken, sättigt bei 100. Ein langweiliges Spiel bewertet trotzdem niedrig, weil keines seiner Signale überhaupt anschlägt.

Dasselbe gilt für Kantersiege (120) und Fantasy (100). Die Summen sind `scoreMaxSignalsSubtotal` für Klassisch und `signalCeiling` bei jedem `PowerScore`-Ergebnis für den Modus, der es bewertet hat.

## Ein Signal abschalten

Übergib seine ID in `options.disabledSignals`. Die Signale, die noch an sind, werden auf den vollen Bereich des Modus umskaliert, ein Modus mit einem abgeschalteten Signal reicht also trotzdem von 0 bis 100, statt früher aufzuhören. Schaltest du alle ab, ist keines mehr an: Es gibt nichts, worauf umskaliert werden könnte.

```ts
scoreGame(game, context, { disabledSignals: ['momentum', 'comeback'] });
```

Jeder Eintrag in `score.signals` trägt `disabled: true`, wenn du das getan hast, damit eine Aufschlüsselung ihn ausgrauen kann. Mischt sich ein Modus mit Klassisch, ist `options.classicDisabledSignals` die eigene Abschaltliste von Klassisch.

## Klassisch

Das 2.x-Modell, mit den Momentboosts aus [Boosts und Strafen](/arenaswap/docs/powerscore/boosts-and-penalties/) obendrauf.

### Ausgeglichenheit

Obergrenze: `scoreMaxCloseness`, 42.

Vergleicht den Spielstandabstand mit sportartspezifischen Schwellen, um eine Stufe zu wählen, und skaliert diese Stufe danach, wie weit das Spiel fortgeschritten ist. Die Kurve erreicht den größten Teil ihres Werts bis zur Spielmitte, statt auf das Schlusssignal zu warten: `floor + (tierCeiling − floor) × progress^0.55`. Ein kleiner flacher Sockel von 12 zahlt immer aus, gekappt auf die Obergrenze der Stufe. Ein Spiel mit Gleichstand in der ersten Minute ist dadurch schon etwas wert.

Die Obergrenzen der Stufen:

| Stand | Basketball | Football | Hockey und Fußball | Baseball und Softball | Obergrenze |
|---|---|---|---|---|---|
| Gleichstand | | | | | 42 |
| Knapp | ≤ 5 Punkte | ≤ 3 Punkte | ≤ 1 Tor | ≤ 1 Run | 34 |
| Eng | ≤ 10 Punkte | ≤ 9 Punkte | ≤ 2 Tore | ≤ 3 Runs | 20 |
| Rand | ≤ 18 Punkte | ≤ 14 Punkte | ≤ 3 Tore | ≤ 5 Runs | 8 |
| Außer Reichweite | > 18 Punkte | > 14 Punkte | > 3 Tore | > 5 Runs | 0 |

0:0 wird getrennt von einem gewöhnlichen Gleichstand bewertet, weil es früh meist bedeutet, dass noch nichts passiert ist, und nicht, dass das Spiel umkämpft ist. Hockey gibt für 0:0 ab dem dritten Drittel die volle Gleichstand-Gutschrift, Fußball ab der zweiten Halbzeit. Davor und in jeder anderen Sportart bekommt 0:0 eine reduzierte Obergrenze von 22.

**Zehn Mann.** Im Fußball kassiert ein Team, das einen Mann weniger hat und eine Ein-Tor-Führung verteidigt, weit häufiger Gegentore als eine volle Mannschaft. Das Spiel ist also enger, als der Spielstand sagt, und Ausgeglichenheit addiert 4 Punkte (weiterhin auf 42 gekappt), solange das die Lage ist. Es ist die einzige Stelle, an der eine Rote Karte ein Signal berührt. Der Boost für die Rote Karte ist getrennt und steht in [Boosts und Strafen](/arenaswap/docs/powerscore/boosts-and-penalties/#red-card).

Was Ausgeglichenheit ignoriert: welches Team vorn liegt und wie hoch der absolute Spielstand ist. Ein 2-Punkte-Spiel bei 12:10 wird genauso gelesen wie eines bei 112:110, denn Ausgeglichenheit schaut immer nur auf die Zahl auf der Tafel in diesem Moment.

### Spielschluss

Obergrenze: `scoreMaxLateGame`, 38.

Steigt in einem engen Spiel nahezu linear über den gesamten letzten Abschnitt, statt nur in den Schlusssekunden hochzuschnellen. Die Spannung baut sich stetig auf, statt auf einmal zu kommen. Die Obergrenze, auf die er zusteuert, hängt davon ab, wie eng das Spiel schon ist, denn ein 30-Punkte-Spiel in der letzten Minute hat keine Spannung mehr, die sich aufbauen könnte:

| Abstand | Obergrenze beim Schlusssignal |
|---|---|
| Gleichstand, knapp oder eng | 36 |
| Rand | 22 |
| Außer Reichweite | 15 |

Spiele mit Gleichstand steigen in der letzten Minute über 36 hinaus, auf einen Pre-Boost für die Verlängerung zu, der bei 38 endet. Er trennt ein Spiel, das auf Extra-Zeit zusteuert, von einem, das nur eng ist. Verlängerung und Extra Innings zahlen glatt die vollen 38, bis eine Führung, die in ihnen aufgebaut wurde, den engen Abstand der Sportart übersteigt. Dann zahlen sie dieselbe Obergrenze wie ein reguläres Spiel mit diesem Abstand, sodass ein Fünf-Run-Top des 10. dort gedeckelt ist, wo ein Fünf-Run-9. es ist.

Baseball und Softball haben keine Uhr, derselbe an Ausgeglichenheit gekoppelte Anstieg läuft also über die Innings. Er beginnt im 6. Inning beim Baseball oder im 5. beim Softball und erreicht seine Obergrenze zum Ende der regulären Spielzeit.

Fußball sagt nie „Overtime“. Die Verlängerung heißt *Gleichstand in der Verlängerung*, ein Elfmeterschießen *Elfmeterschießen*, und ein ausgeglichenes Spiel spät *Gleichstand in der 85. Minute*. Ein Unentschieden ist ein gewöhnliches Ligaergebnis, keine Zwischenstation auf dem Weg in die Overtime. Der Pre-Boost gilt weiterhin, denn ein spätes Patt ist wirklich spannend.

Was der Spielschluss ignoriert: das jüngste Punktetempo, das ist die Aufgabe des Schwungs, und alles aus den ersten drei Vierteln eines Spiels, das inzwischen einseitig geworden ist.

### Schwung, Führungswechsel und Comeback-Faktor

Alle drei lesen aus `context.history`, der Liste der bisherigen Spielstände eines Spiels, und jedes braucht mindestens drei Schnappschüsse, bevor es anspringt. Jedes schnellt bei einem auslösenden Ereignis hoch und klingt dann mit einer sportartgerechten Halbwertszeit ab. Das Abklingen hält auch in einer torarmen Sportart eine bewegte Linie zwischen den Toren, statt einer flachen. Die Halbwertszeiten, zusammen mit allem anderen, das pro Sportart variiert, stehen unter [Sportart- und Liga-Konfiguration](/arenaswap/docs/powerscore/configuration/).

**Schwung** (Obergrenze 38) misst den Umschwung der Spielstanddifferenz zwischen dem ältesten und dem neuesten Schnappschuss im Fenster. Erzielt ein Team 10 und das andere antwortet mit 2, ist das ein Umschwung von 8, kein 10:0-Lauf. Der Grund-String nennt beide Zahlen, denn eine Differenz ist kein Shutout. Was als großer Umschwung zählt, skaliert mit der Sportart: 8 Punkte im Basketball, 2 Tore im Hockey, 3 Runs im Baseball. Es ignoriert, welches Team tatsächlich vorn liegt. Ein Team kann mit 20 zurückliegen und trotzdem einen Schwung-Ausschlag verzeichnen, wenn es seinen Gegner über das Fenster übertrifft.

**Führungswechsel** (Obergrenze 18) zählt, wie oft die Führung im Fenster den Besitzer gewechselt hat: 18 Punkte für zwei oder mehr, 12 für einen. Ein Gleichstand zählt für sich nicht als Führung. Zurückliegen, ausgleichen, dann in Führung gehen ist ein Wechsel. In Führung gehen, ausgleichen, sie zurückholen ist keiner. Die Größe eines Umschwungs wird ignoriert. Zwei Wechsel oder zwanzig bewerten gleich, denn darüber hinaus hat das Spiel schon gezeigt, dass es unberechenbar ist. Zählt dein Feed Führungswechsel aus seinem Spielprotokoll, übergib `context.recentLeadChanges` (`{ count, lastAt? }`). Ist seine Zahl höher, als die Schnappschüsse zeigen, gewinnt sie, was Wechsel erfasst, die zwischen zwei Abfragen passiert sind.

**Comeback-Faktor** (Obergrenze 20) misst den Umschwung für das Team, das beim ältesten Schnappschuss im Fenster zurücklag: den Rückstand, den es aufgeholt hat, plus jede Führung, die es seither übernommen hat. Ein Team, das mit 5 zurücklag und jetzt mit 6 führt, hat 11 Umschwung. Es zahlt nichts, wenn das Fenster bei Gleichstand begann. Sobald das Comeback-Team um mehr als den zweiten Ausgeglichenheitsabstand der Sportart führt (10 im Basketball), ist das Spiel zur Klatsche geworden, und nur der aufgeholte Rückstand zählt, abzüglich dieser Führung. Der Umschwung wird wie bei der Ausgeglichenheit nach dem Spielfortschritt skaliert. Eine Führung im ersten Viertel zu verkürzen zählt weniger, als dieselbe Führung mit zwei Minuten auf der Uhr zu verkürzen. Es bewertet den Trend, während er passiert, ohne abzuwarten, ob das zurückliegende Team ihn vollendet.

### Zwei Modifikatoren, die keine Signale sind

Klassisch wendet außerdem den Modifikator für die Siegwahrscheinlichkeit (±5) und den Abzug für die Werbepause an. Beide gehören zur Pipeline von Klassisch, und beide stehen in [Boosts und Strafen](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance).

## Kantersiege

Ausgeglichenheit auf links gedreht. Kantersiege zahlt nichts, bis ein Spiel zwei Scores auseinanderliegt (der zweite Ausgeglichenheitsabstand der Sportart), und steigt dann bis zur vollen Gutschrift bei einer Klatsche.

| Signal | Obergrenze | Was es misst |
|---|---|---|
| Abstand | 50 | Der Abstand, mit dem Spielfortschritt hochskaliert, damit eine Klatsche spät sicherer ist als früh. Volle Gutschrift bei 30 Punkten im Basketball, 28 im Football, 5 Toren im Hockey und Fußball, 10 Runs im Baseball und Softball. |
| Führung gehalten | 30 | Wie viel des Verlaufsfensters der aktuelle Führende mehr als zwei Scores vorn lag. Eine Führung, die aufgebaut und gehalten wurde, punktet hier. Ein Lauf, der sich vielleicht umkehrt, nicht. Braucht 3 Schnappschüsse und zahlt erst voll, wenn der Verlauf das ganze Fenster abdeckt. |
| Timing | 25 | Eine frühe Klatsche hat mehr Niederlage übrig, die man ansehen kann, als eine, die fast vorbei ist. Fällt gegen 0, wenn die reguläre Spielzeit endet. Zahlt erst, wenn der Abstand über dem dritten Ausgeglichenheitsabstand der Sportart liegt, und nur, wenn `period` bekannt ist. |
| Nachlegen | 15 | Der Führende baut weiter aus. Es liest Schwung nur in Richtung des Führenden, ein Team, das sich an einer großen Führung festhält, bekommt hier also nichts. Braucht 3 Schnappschüsse. |

Was Kantersiege ignoriert: wie ein enges Spiel läuft. Ein Spiel innerhalb von zwei Scores bekommt hier fast nichts. Dort kommt die Mischung ins Spiel.

Kantersiege zahlt außerdem keinen Postseason-Boost. Ein Playoff-Kantersieg hat sein Ergebnis entschieden, die Runde fügt ihm also nichts hinzu. Der Modus setzt `paysPostseason: false`.

## Fantasy

Bewertet, was deine Spieler tun. Er liest `context.fantasy`, einen Eintrag pro Spieler im Kader, und hat deshalb nichts zu sagen, bis du ihm einen Kader gibst.

| Signal | Obergrenze | Was es misst |
|---|---|---|
| Situation | 50 | Wo deine Spieler im Spiel stehen. Football: wer den Ball hat, Red Zone, Goal Line, dein Kicker in Reichweite, deine Defense auf dem Feld. Baseball: am Schlag, in Wartestellung oder beim Pitchen mit Läufern auf Base. Basketball, Hockey und Fußball: wie eng und spät das Spiel ist. Der Spieler mit dem meisten Geschehen zählt voll, alle anderen zu einem Viertel. |
| Produktion | 35 | Fantasy-Punkte, die deine Spieler zuletzt erzielt haben, abklingend wie ein Führungswechsel. Ein voller Ausbruch (ein Touchdown, ein Homerun, ein Tor) füllt es. Negative Spielzüge zählen nicht: Niemand wechselt, um sich eine Interception anzusehen, die er schon verpasst hat. |
| Exposure | 15 | Wie viele deiner Spieler im Spiel sind: je 5, bis zu 15. |

Football ist die einzige Sportart mit einem Live-Gefühl dafür, wer den Ball hat. Basketball, Hockey und Fußball haben keine Live-Daten vom Spielfeld, ein Spieler aus deinem Kader in einem Spiel dort ist also so viel wert, wie das Spiel eng und spät ist. Ein Spieler, der mit `active: false` markiert ist (auf der Bank, verletzt, des Feldes verwiesen), zählt gar nicht.

## Wie sich die Modi mit Klassisch mischen

Keiner der beiden neuen Modi steht für sich. Jeder wird mit Klassisch kombiniert, damit ein ruhiges Spiel nie von der Karte fällt.

| Modus | Mischung | Formel | Warum |
|---|---|---|---|
| Kantersiege | Untergrenze | `total = max(blowouts, 0.3 × classic)` | Ein enges Spiel behält 30 % seines Klassisch-Werts, sodass ein Abend ohne Klatsche trotzdem etwas zum Wechseln hat. Jede echte Klatsche übertrifft die beste davon. |
| Fantasy | Boost | `total = min(100, classic + 0.6 × fantasy)` | Die Spiele deiner Spieler können nur über ihren Klassisch-Wert steigen, und ein Spiel ohne sie ist schlicht Klassisch. Eine frühere 0.6/0.4-Mischung stufte ein spätes Ein-Punkt-Spiel mit deinem Spieler unter das identische Spiel ohne einen ein. |

Das Gewicht von Fantasy änderst du mit `options.classicBlend`:

```ts
scoreGame(game, context, {
	mode: 'fantasy',
	classicBlend: { kind: 'boost', weight: 0.8 },
});
```

Ein Spiel ohne aktiven Spieler darin hat für Fantasy nichts zu sagen. Es wird als Klassisch bewertet, und `score.modeId` sagt `'classic'`, sodass du es erkennen kannst. `score.classicTotal` trägt die eigene Summe von Klassisch, sobald sich ein Modus damit mischt, und `score.blend` trägt die Rechnung: `{ kind, weight, ownTotal, classicTotal, floorApplied? }`. Eine Aufschlüsselung kann damit „Klassisch 70 × 30 % = 21“ zeigen, wenn die Untergrenze gewonnen hat, oder „+30“ bei einem Fantasy-Wert von 50 mit Gewicht 0.6.

## Woher diese Zahlen kommen

Die Obergrenzen von Klassisch sind exportierte Konstanten: `scoreMaxCloseness`, `scoreMaxLateGame`, `scoreMaxMomentum`, `scoreMaxLeadChanges`, `scoreMaxComeback` und `scoreMaxTotal`. Die Obergrenzen von Kantersiege und Fantasy stehen in ihren Signaldefinitionen, `blowoutsSignals` und `fantasySignals`, du kannst sie also zur Laufzeit lesen. Beantwortet keiner der drei Modi deine Frage, [bau deinen eigenen mit `defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode). Die vollständigen Signaturen stehen in der [API-Referenz](/arenaswap/docs/powerscore/api-reference/).
