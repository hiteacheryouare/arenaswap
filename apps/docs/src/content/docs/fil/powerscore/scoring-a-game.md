---
sourceHash: 'd23f4e1a7b17'
title: Mag-score ng laro mula sa live na data
description: I-map ang sarili mong feed sa isang Game object, magtabi ng history ng score sa bawat poll, buksan ang mga boost at mode na kayang suportahan ng data mo, at magdagdag ng favorite at manual na boost.
section: powerscore
order: 2
navLabel: Mag-score mula sa live na data
faq:
  - q: Chine-check ba ng scoreGame kung live talaga ang laro?
    a: Mga boost lang ang nagche-check. Wala silang binabayaran maliban kung 'in' ang status ng laro. Ini-score pa rin ng mga signal ang larong hindi pa nagsisimula o tapos na, at 0 ang score ng larong nasa intermission o delay. I-filter mo muna ang mga live na laro, gaya ng ginagawa ng ArenaSwap bago nito tawagin ang scorer.
  - q: Magagamit ko ba ang PowerScore sa mga liga na wala sa listahan nito?
    a: Oo. Generic sa league id ang Game, at ang id na hindi kilala ng built-in na table ay iso-score gamit ang default ng sport nito. I-override ang bilang at haba ng period kada tawag gamit ang options.league kung mali ang mga default.
---

Walang kinukuha ang `scoreGame`. Ini-score nito ang anumang `Game` object at context na ibigay mo. Binubuo ng pahinang ito ang dalawa mula sa gawa-gawang feed, tapos binubuksan ang mas marami pang bahagi ng engine habang kaya ng data mo.

## I-map ang feed mo sa isang Game

`id`, `league`, `sportType` at ang dalawang score ng team lang ang kailangan. Pinipino ng lahat ng iba pa ang score kapag meron nito ang feed mo, at itinuturing na hindi alam kapag wala. I-map ang meron ka, at laktawan ang iba.

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

Itakda nang tapat ang `status`. Ang `'in'` ang tinitingnan ng mga boost bago sila magbayad ng kahit ano. Ang flag na `intermission` o `delayed` ay ginagawang 0 ang buong score hanggang magpatuloy ang laro, kaya hindi matatalo ng larong nasa commercial break o rain delay ang larong nilalaro.

## Magbigay pa, at mas marami ang bubukas

Binubuksan ng bawat optional na field ang bahagi ng engine na nangangailangan nito. Kapag wala ito, 0 ang score ng bahaging iyon. Walang nagta-throw.

| Ibigay | Saan | At ito ang bubukas |
|---|---|---|
| Mga snapshot ng score, pinakamatanda muna | `context.history` | Momentum, Lead Changes, Comeback Factor. Kailangan ng hindi bababa sa 3 snapshot. |
| Win probability, 0 hanggang 1 kada poll | `context.winProbability` | Ang ±5 win probability modifier. Kailangan ng hindi bababa sa 5 value. |
| Kung nasa commercial break ang laro | `context.onBreak` | Ang bawas sa break. |
| `possession`, `yardsToEndZone`, `down`, `distance` at `timeouts` sa team | `game`, `game.homeTeam` | Ang two-minute drill at ang football situation ng Fantasy. |
| `isRedZone`, kasama ang `down`, `distance` at `isGoalToGo` | `game` | Ang red zone boost. |
| `baseRunners`, `outs`, `topOfInning` | `game` | Mga runner sa base at ang go-ahead run. |
| `hits` sa bawat team | `game.homeTeam`, `game.awayTeam` | Ang no-hitter. |
| `series`, at `rank` sa bawat team | `game`, `game.homeTeam` | Stakes: serye sa bingit, dalawang ranked na team. |
| `context.stakes` | `context` | Stakes: karera sa huling bahagi ng season. |
| `pregameLine` | `context` | Upset watch. Gamitin ang line bago ang laro. |
| `redCards` | `game` | Ang red card boost, soccer. |
| `powerPlay`, `emptyNet` | `context` | Ang scoring opportunity ng hockey. |
| `fantasy` | `context` | Ang Fantasy mode. |
| `nickname` sa bawat team | `game.homeTeam`, `game.awayTeam` | Mga pangalan ng team sa `reason`, kapalit ng abbreviation. |
| `seasonType`, `postseasonRound` | `game` | Binabasa ng stakes ang laro bilang postseason (serye) sa halip na regular season (mga rank at karera). |
| `recentLeadChanges` | `context` | Bilang ng pagbabago ng lead mula sa play log ng feed mo, para sa mga palitan sa pagitan ng poll. |

Nasa [pahina ng mga type](/arenaswap/docs/powerscore/types/#game) ang lahat ng field, at nasa [Mga boost at penalty](/arenaswap/docs/powerscore/boosts-and-penalties/) kung magkano ang binabayaran ng bawat boost.

## Magtabi ng history ng score para sa momentum, pagbabago ng lead at comeback

Binabasa ng tatlong signal na iyon ang `context.history`, ang listahan ng mga nakaraang score ng laro, at nananatiling 0 hanggang may tatlong snapshot na. Magtabi ng isa sa bawat poll, nakaayos, pinakamatanda muna, may timestamp sa millisecond. Kailangan lang na magkaugnay ang mga timestamp. Hindi kailangang wall-clock time ang mga ito.

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

Lamang ng 5 ang Boston at kakakuha lang ng lead dahil sa 13-2 na run:

```ts
score.total;  // 86
score.reason; // 'BOS came back from 5 down to lead. Up 6 in the 3rd quarter'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 16
```

Putulin ang mga snapshot na mas matanda sa `historyWindowMs` ng sport para hindi lumaki nang walang hanggan ang array. Nasa [Configuration ng sport at liga](/arenaswap/docs/powerscore/configuration/) ang window na iyon at ang iba pang tuning na para sa bawat sport.

## Subaybayan ang mga break at win probability, kung meron ka

Sa context lahat ito inilalagay. Kung alam mo kung kailan nasa commercial break ang laro, ipasa ang `onBreak`:

```ts
const score = scoreGame(game, { history, onBreak: isInBreak(game), winProbability });
```

Ikaw ang magsusulat ng `isInBreak`, mula sa anumang sinasabi ng feed mo tungkol sa mga break sa inning, pagpapalit ng pitcher at timeout. Habang `true` ang `onBreak`, bumababa ng 15 puntos ang score.
Ang `winProbability` ay listahan ng mga kamakailang win-probability value mula 0 hanggang 1, para sa alinmang team. Ang layo lang mula sa 50% ang mahalaga. Parehong optional ang dalawa, at nai-score nang maayos ng PowerScore kahit wala sila. Nasa [Mga boost at penalty](/arenaswap/docs/powerscore/boosts-and-penalties/) kung ano ang binabago ng bawat isa.

## Hayaang makita ng mga boost ang sandali

May dala ang baseball, football, hockey at soccer na sitwasyong hindi ipinapakita ng score lang. Idagdag ang mga field na meron ang feed mo, at babayaran ito ng `scoreGame`. Narito ang laro sa baseball sa bottom ng 9th, tabla, puno ang bases, isang out:

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

Pinupuno ng dalawang iyan ang cap na 20 ng moments bucket. Nakukuha ng football ang red zone mula sa `isRedZone`, na tinitimbang ng `down`, `distance` at `isGoalToGo`, at ang two-minute drill mula sa `possession`, `yardsToEndZone` at `down`. Kailangan ng scoring opportunity ng hockey ang `context.powerPlay` at `context.emptyNet`. Kailangan ng soccer ang `redCards`.

## I-score ito sa ibang mode

Pumili ng mode gamit ang `options.mode`. Walang dagdag na kailangan ang Blowouts. Kailangan ng Fantasy ang roster mo sa context, isang entry kada player:

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

Ang `pointEvents` ang paraan para makita ng Production na nakakuha ng fantasy point ang player isang minuto ang nakalipas. Para gawing mga puntos na iyon ang isang linya ng box score, gamitin ang [`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints). Ang larong walang player mo ay isinu-score bilang Classic, at sinasabi iyon ng `score.modeId`.

## Magdagdag ng favorite, postseason at manual na boost

I-score muna ang laro, tapos hayaang magdagdag ang mga option ng mga bagay na hindi alam ng PowerScore, gaya ng paboritong team ng manonood. Pareho ang gumagana ng mga option sa bawat mode.

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 106
```

Idinadagdag sa total ang favorite at postseason boost, na may cap na 100. Idinadagdag pagkatapos nito ang `gameBoost`, at ito lang ang pinapayagang lumampas sa 100, kaya kayang talunin ng larong ni-pin ng manonood ang perpektong score. Nilalaktawan ng frozen na laro ang lahat ng ito: hindi matatalo ng tigil na laro ang larong nilalaro.

Ganito rin binubuo ng sariling [scoring code](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts) ng ArenaSwap ang mga option nito bago ibigay ang mga score sa tab switcher.

## Ang 2.x na paraan

Gumagana pa rin ang `computePowerScore(game, history, winProbabilityHistory)` at ibinabalik ang flat na 2.x na resulta, walang moment boost. Ito ang tamang tawag kung ang number na lagi mong nakukuha ang gusto mo. Nakalista sa [API reference](/arenaswap/docs/powerscore/api-reference/#the-2x-api) ang lahat ng nandiyan pa.
