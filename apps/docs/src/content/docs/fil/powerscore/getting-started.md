---
sourceHash: '1cae3a43d11e'
title: I-score ang una mong laro gamit ang PowerScore
navLabel: Pagsisimula
description: I-install ang powerscore package at mag-score ng isang live na laro gamit ang scoreGame sa ilang linya ng code. Number at dahilan ang lalabas sa terminal mo.
section: powerscore
order: 1
faq:
  - q: Kailangan ba ng API key o account ang powerscore?
    a: Hindi. Ini-score lang nito ang game state na ibinibigay mo. Ikaw ang bahala sa pagkuha ng state na iyon, saanman galing ang mga score mo.
  - q: Tumatakbo ba ang powerscore sa browser?
    a: Oo. Wala itong runtime dependency at plain object at math lang ang ginagalaw nito. Naba-bundle ito sa browser extension, gaya ng pagtakbo nito sa Node.
  - q: Kailangan ko bang isulat ulit ang 2.x code ko para sa PowerScore 3?
    a: Hindi. Gumagana pa rin ang computePowerScore at ang mga 2.x type, at pareho pa rin ang total na ibinabalik. Lumipat sa scoreGame kapag gusto mo na ng mga mode o ng mga bagong boost.
---

Ini-install nito ang `powerscore` at ini-score ang isang live na laro. Number at ang mga dahilan sa likod nito ang lalabas.

## I-install ang package

```bash
npm install powerscore
```

Nasa [npm](https://www.npmjs.com/package/powerscore) din ang package. Para makita itong nag-i-score ng mga totoong laro ngayong gabi, bisitahin ang [PowerScore page](/arenaswap/powerscore/).

## Ilarawan ang laro

Kailangan ng `scoreGame` ng `Game` object: ang dalawang score, kung anong liga at sport ito, at kung nasaan na ang laro ngayon. Itakda ang `status: 'in'` para sa live na laro, dahil iyon ang tinitingnan ng mga boost bago sila magbigay ng kahit ano.

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

Lamang ang Boston ng dalawang puntos, 45 segundo na lang sa fourth quarter. Dikit iyon, at huling yugto na: iyon mismo ang hinahanap ng PowerScore.

## I-score ito

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

Kapag pinatakbo mo iyan, ito ang ipi-print ng terminal:

```text
68
BOS up 2 with 0:45 left
```

May dalawa pang argument ang `scoreGame`, at parehong optional: ang `context` para sa lahat ng hindi dala ng laro (history ng score, win probability, ang pregame line, fantasy roster) at ang `options` para sa kung paano ito i-score (aling mode, aling signal ang io-off). Kapag wala ang dalawa, Classic ang makukuha mo, ang mode na nagtatanong kung dikit ba ang laro at huling yugto na.

## Basahin ang breakdown

Mas marami ang laman ng `score` kaysa sa pangunahing number. Nasa loob nito ang bawat signal bilang entry sa listahan, may sarili nitong puntos at ceiling, kasama ang mga boost at ang mga dahilan.

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

Ang kalapitan at ang pressure sa huling yugto ang bumubuo sa buong score dito. Walang history ng score na mababalikan, kaya wala pang masusukat ang momentum, pagbabago ng lead at comeback, at nasa 0 sila. Bigyan ang `scoreGame` ng `history` sa context at magigising sila. Nasa `score.boosts` ang mga boost, lahat 0 para sa larong ito, dahil walang runner, red zone o hinugot na goalie sa basketball na babayaran.

Gamitin ang `signalPoints(score, 'momentum')` at `boostPoints(score, 'noHitter')` para hanapin ang isa ayon sa id.

## Subukan ang ibang mode

Ibang tanong ang masasagot ng parehong laro. Pinipili ang mode gamit ang `options.mode`:

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

Tinatanong ng Blowouts kung may tumatakbo na palayo. Hindi iyon ang laro ng 2 puntos, kaya 30% lang ng Classic 68 nito ang score at wala nang iba. Ang floor na iyon ang nagpapanatiling eligible ng dikitang laro sa gabing walang beatdown. Tinatanong ng Fantasy kung may mangyayari sa mga player mo. Sakop ng [pahina ng mga signal](/arenaswap/docs/powerscore/signals/) ang tatlo.

Para mag-score ng larong pine-poll ng sarili mong code, basahin ang [Mag-score ng laro mula sa live na data](/arenaswap/docs/powerscore/scoring-a-game/). Para sa kung ano ang sinusukat ng bawat signal at bakit, basahin ang [Mga PowerScore signal sa bawat mode](/arenaswap/docs/powerscore/signals/).
