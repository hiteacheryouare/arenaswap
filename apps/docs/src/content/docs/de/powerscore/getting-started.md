---
sourceHash: '1cae3a43d11e'
title: Dein erstes Spiel mit PowerScore bewerten
navLabel: Erste Schritte
description: Installiere das Paket powerscore und bewerte mit scoreGame in wenigen Zeilen Code ein Live-Spiel, bis du in deinem Terminal eine Zahl samt Begründung siehst.
section: powerscore
order: 1
faq:
  - q: Braucht powerscore einen API-Schlüssel oder ein Konto?
    a: Nein. Es bewertet nur den Spielstand, den du ihm übergibst. Diesen Stand zu holen, woher deine Ergebnisse auch kommen, ist Sache deines eigenen Codes.
  - q: Läuft powerscore im Browser?
    a: Ja. Es hat keine Laufzeitabhängigkeiten und fasst nur einfache Objekte und Mathematik an. Es lässt sich in eine Browser-Erweiterung bündeln, genauso wie es in Node läuft.
  - q: Muss ich meinen 2.x-Code für PowerScore 3 umschreiben?
    a: Nein. computePowerScore und die 2.x-Typen funktionieren weiter und liefern dieselben Summen wie zuvor. Steig auf scoreGame um, wenn du Modi oder die neuen Boosts willst.
---

Hier installierst du `powerscore` und bewertest ein Live-Spiel, bis du eine Zahl samt den Gründen dahinter hast.

## Das Paket installieren

```bash
npm install powerscore
```

Das Paket gibt es auch auf [npm](https://www.npmjs.com/package/powerscore). Wie es die echten Spiele von heute Abend bewertet, siehst du auf der [PowerScore-Seite](/arenaswap/powerscore/).

## Das Spiel beschreiben

`scoreGame` braucht ein `Game`-Objekt: die beiden Spielstände, Liga und Sportart und wo das Spiel gerade steht. Setz `status: 'in'` für ein Live-Spiel, denn genau das prüfen die Boosts, bevor sie etwas auszahlen.

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

Boston liegt 45 Sekunden vor Ende des vierten Viertels mit zwei Punkten vorn. Das ist knapp, und es ist spät: genau das, worauf PowerScore achtet.

## Bewerten

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

Führ das aus, und das Terminal gibt aus:

```text
68
BOS up 2 with 0:45 left
```

`scoreGame` nimmt zwei weitere Argumente, beide optional: einen `context` für alles, was das Spiel nicht selbst mitbringt (Spielstandverlauf, Siegwahrscheinlichkeit, die Quote vor dem Spiel, einen Fantasy-Kader) und `options` dafür, wie bewertet wird (welcher Modus, welche Signale abgeschaltet sind). Ohne beides bekommst du Klassisch, den Modus, der fragt, ob ein Spiel knapp und spät ist.

## Die Aufschlüsselung lesen

`score` trägt mehr als die Zahl oben. Jedes Signal steht als Listeneintrag mit eigenen Punkten und eigenem Höchstwert darauf, dazu die Boosts und die Begründungen.

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

Ausgeglichenheit und Druck am Spielende machen hier den ganzen Wert aus. Ohne Spielstandverlauf zum Zurückblicken haben Schwung, Führungswechsel und Comeback noch nichts zu messen und stehen auf 0. Gib `scoreGame` im Kontext einen `history` mit, und sie wachen auf. Die Boosts stehen in `score.boosts`, bei diesem Spiel alle auf 0, weil ein Basketballspiel keine Läufer, keine Red Zone und keinen herausgenommenen Torwart hat, für die es etwas auszahlen könnte.

Mit `signalPoints(score, 'momentum')` und `boostPoints(score, 'noHitter')` schlägst du einen Eintrag per ID nach.

## Einen anderen Modus ausprobieren

Dasselbe Spiel kann eine andere Frage beantworten. Modi wählst du mit `options.mode`:

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

Kantersiege fragt, ob jemand davonzieht. Ein Spiel mit 2 Punkten Abstand tut das nicht, es bekommt also 30 % seiner 68 aus Klassisch und nicht mehr. Diese Untergrenze hält ein knappes Spiel in einer Nacht ohne Abreibung im Rennen. Fantasy fragt, ob mit deinen Spielern gleich etwas passiert. [Die Seite zu den Signalen](/arenaswap/docs/powerscore/signals/) behandelt alle drei.

Wie du ein Spiel bewertest, das dein eigener Code abfragt, steht unter [Ein Spiel aus Live-Daten bewerten](/arenaswap/docs/powerscore/scoring-a-game/). Was jedes Signal misst und warum, steht unter [PowerScore-Signale in jedem Modus](/arenaswap/docs/powerscore/signals/).
