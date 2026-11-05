---
sourceHash: '91a61d4e6782'
title: API reference ng PowerScore
navLabel: API reference
description: Bawat function at constant na ine-export ng powerscore, kasama ang signature, mga parameter, ibinabalik na value, at kung ano ang nangyayari kapag nawawala o hindi valid ang isang input. Kasama ang deprecated na 2.x API.
section: powerscore
order: 6
---

Lahat ng nandito ay ine-export mula sa root ng package: `import { ... } from 'powerscore'`. Una ang mga function ng 3.0, kasunod ang mga helper, ang mga piyesang bumubuo sa mga built-in na mode, ang mga constant, at panghuli ang 2.x API, na deprecated pero gumagana pa rin gaya ng dati. Nasa [mga TypeScript type ng PowerScore](/arenaswap/docs/powerscore/types/) ang mga type.

## Scoring

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

Ang pangunahing entry point. Ini-score ang laro sa isang mode at nagbabalik ng [`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore): ang total, bawat signal at boost bilang listahan, at ang mga dahilan.

| Parameter | Default | Tala |
|---|---|---|
| `game` | kailangan | Ang kasalukuyang game state. `id`, `league`, `sportType` at ang dalawang score lang ang kailangan. |
| `context` | `{}` | History, win probability, ang pregame line, ang fantasy roster, at lahat ng iba pang hindi dala ng laro. Tingnan ang [`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext). |
| `options` | `{}` | Aling mode, aling signal ang io-off, at ang mga favorite, postseason at manual na boost. Tingnan ang [`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions). |

Hindi nagta-throw kapag may nawawalang optional na field: 0 ang score ng bahagi ng engine na nangangailangan nito. Ang `league` na hindi kilala ay iso-score gamit ang default ng sport nito. Ang non-finite na value saanman sa mga input ay itinuturing na wala, sa halip na ipasa bilang `NaN`.

Ang frozen na laro (`intermission` o `delayed`) ay 0 ang score sa lahat, kasama ang bawat boost, at walang laman ang `reason`. Ang `game.status` ay binabasa lang ng mga boost, na walang binabayaran maliban kung `'in'` ito.

Binubuo ang total sa nakatakdang pagkakasunod-sunod:

1. Nag-i-score ang mga signal. Ang mga naka-disable ay nire-rescale palabas.
2. Kinukuha ang bawas sa break.
3. Idinadagdag ang win probability modifier (Classic lang). Iki-clamp ang resulta sa 0 hanggang 100.
4. Idinadagdag ang sariling mga boost ng mode, sa loob ng mga cap ng bucket, at naka-cap sa 100 ang total.
5. Kung hinahalo ang mode sa Classic (floor, mix o boost), dito iyon nangyayari.
6. Idinadagdag ang favorite at postseason boost, at naka-cap ulit sa 100 ang total. Nilalaktawan ng mode na may `paysPostseason: false` ang postseason boost.
7. Huling idinadagdag ang `gameBoost`. Ito lang ang pinapayagang lumampas sa 100.

```ts
const score = scoreGame(game, { history }, { mode: 'blowouts' });
score.total;  // 0–100
score.reason; // 'BOS on a 12–0 run. Up 28 in the 3rd quarter'
```

### signalPoints at boostPoints

```ts
function signalPoints(score: Pick<PowerScore, 'signals'>, id: string): number
function boostPoints(score: Pick<PowerScore, 'boosts'>, id: string): number
```

Humanap ng isang entry sa resulta ayon sa id. Parehong nagbabalik ng `0` para sa id na wala.

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

Binubuo ang [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput) na tinatanggap ng `compute` ng signal o boost: ang laro, ang context, ang resolved na sport at league config, `progress`, `now` at `margin`. Ito ang tinatawag ng `scoreGame` sa loob, at ine-export para masubukan nang mag-isa ang signal na isinulat mo.

## Mga mode

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

Isang beses at maaga nitong chine-check ang mode, at ibinabalik itong walang pagbabago. Nagta-throw ito kung may dalawang signal na iisa ang id, kung hindi positibo ang ceiling ng signal, o kung walang signal ang mode.

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

Tinatanggap ng `compute` ng signal ang laro, ang context, ang resolved na sport at league config, ang `progress` ng laro (0 sa simula, 1 sa dulo ng regulation at sa buong overtime), at ang `margin`. Nagbabalik ito ng `points`, naka-clamp sa ceiling, at opsyonal na `reason`. Puwede ring magdala ang mode ng `boosts`, `bucketCaps`, `classicBlend`, `paysPostseason` (default `true`; pinipigilan ito ng `false` sa postseason boost), at `appliesTo(game, context)` na nagpapadala sa Classic ng mga larong wala itong masabi.

Inililista ng `reasonPriority` ang mga signal na puwedeng basahin ang reason. Ang pinakamalakas sa kanila ang magsasalita, at ang pagkakasunod-sunod ang bumabasag ng tabla. Ang reason key na kilala ng mga built-in na mode ay nire-render bilang English sa `score.reason`. Ang sarili mong key ay nire-render bilang sarili nito, kaya magsalin mula sa `score.reasons`, hindi mula sa string.

### classicMode, blowoutsMode, fantasyMode, builtInModes at getMode

Ang `classicMode`, `blowoutsMode` at `fantasyMode` ang tatlong built-in na `PowerScoreMode` object. Ang `builtInModes` ay ang parehong tatlo na naka-key sa id, at ang `getMode(idOrMode)` ay nagre-resolve ng id, mode object, o wala (na nagbibigay ng Classic). I-spread ang isa para bumuo sa ibabaw nito. Para makuha ang Classic na wala ang mga boost ng 3.0:

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### Mga signal at boost

Ine-export din ang mga piyesang bumubuo sa mga built-in na mode, para magamit ulit ng custom na mode:

| Export | Ano ito |
|---|---|
| `classicSignals`, `blowoutsSignals`, `fantasySignals` | Ang listahan ng signal ng bawat mode. |
| `closenessSignal`, `lateGameSignal`, `momentumSignal`, `leadChangesSignal`, `comebackSignal` | Ang limang signal ng Classic, isa-isa. |
| `scoringOpportunityBoost`, `goAheadRunBoost`, `twoMinuteDrillBoost`, `noHitterBoost`, `redCardBoost`, `upsetWatchBoost`, `upsetRoutBoost`, `stakesBoost` | Ang `BoostDefinition` ng bawat boost. Nasa [Mga boost at penalty](/arenaswap/docs/powerscore/boosts-and-penalties/) kung magkano ang binabayaran ng bawat isa. |
| `underdogProbability(line, sportType, league)` | Ang tsansa ng underdog bago ang laro, mula sa isang `PregameLine`. `undefined` kapag hindi masabi ng line. |
| `postseasonBoostShare(round)` | Ang bahagi ng postseason boost na kinikita ng isang round: 1, 0.75, 0.5, 0.25, o 0 kapag walang round. |
| `applyProgressFloor`, `findLeadChanges` | Ang dalawang helper sa likod ng closeness at lead changes. |
| `baseMask(baseRunners)`, `runnersOn(mask)` | Ang mga base bilang 3-bit na number, pinakamababa ang first base (`0b101` ay mga runner sa first at third), at kung ilang runner iyon. |

## Mga reason

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

Nagre-render ng isang pangungusap ng reason, o ng listahan nila na pinagdugtong bilang mga pangungusap, sa English. Ito ang pumupuno sa `score.reason`. Gamitin sila kapag bumubuo ka ng sarili mong mga reason at gusto mong pareho ang basa. Ang `ordinal(n)` ay nagbibigay ng English na ordinal na ginagamit nila ("2nd", "11th", "21st").

## Config at progress

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

Ginagawa ng `resolveSportConfig` at `resolveLeagueConfig` ang ginagawa ng `scoreGame` sa simula ng bawat tawag. Ang `sportType` na hindi kilala ay bumabagsak sa tuning ng basketball. Ang liga na hindi kilala ay bumabagsak sa pinakakilalang liga ng sport nito: ang NBA para sa basketball, ang NHL para sa hockey, MLB para sa baseball, ang NFL para sa football, NCAA softball, at MLS para sa soccer. Ang `getGameProgress` ay 0 sa simula, 1 sa dulo ng regulation at sa buong overtime. Ang `scoreMargin` ay ang absolute na pagkakaiba ng score.

## Fantasy scoring

Fantasy points ang gusto ng Production signal ng Fantasy. Ginagawa ng mga ito ang isang linya ng box score na mga fantasy point. Ikaw ang magpapangalan ng mga stat, sila ang mag-i-score.

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

Ibinabalik ang total para sa isang stat line, naka-round sa dalawang decimal. Hindi pinapansin ang mga stat na hindi kilala at ang mga non-finite na value. Ang `pointsAllowed` ng defense ay ini-score ayon sa tier.

```ts
import { computeFantasyPoints } from 'powerscore';

computeFantasyPoints('football', {
	passingYards: 310,
	passingTouchdowns: 3,
	interceptionsThrown: 1,
	rushingYards: 22,
}); // 12.4 + 12 − 2 + 2.2 = 24.6
```

### defaultFantasyScoring, resolveFantasyScoring at fantasySportOf

Hawak ng `defaultFantasyScoring` ang mga default na rule para sa `'football'` (full PPR), `'basketball'`, `'baseball'` at `'hockey'`. Ang bawat rule ay `{ points, min, max }`, kaya makakapagpatupad ang settings screen ng mga hangganan.

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

Ibinabalik ng `resolveFantasyScoring(sport, overrides?)` ang mga rule bilang plain na number. Ang override ay iki-clamp sa mga hangganan ng rule nito, at ang rule na wala ay hindi pinapansin.

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

Minamapa ng `fantasySportOf(sportType)` ang `sportType` sa isa sa apat na fantasy sport. Itinuturing na baseball ang softball, at walang fantasy ang soccer, kaya nagbabalik ito ng `undefined`.

## Mga constant

| Constant | Value |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156 (ang kabuuan ng limang ceiling ng Classic) |
| `scoreMaxTotal` | 100 |
| `breakPenalty` | 15, ang flat na bawas habang `true` ang `context.onBreak` |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

Nasa [Mga PowerScore signal sa bawat mode](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total) kung bakit lumalampas sa 100-puntos na cap ang mga ceiling ng Classic. Ipinapaliwanag ang mga cap sa [Mga boost at penalty](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets).

Hawak ng `scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` at `thirdAndShortDistance` ang eksaktong mga value sa likod ng scoring opportunity boost, na nakatable sa [Mga boost at penalty](/arenaswap/docs/powerscore/boosts-and-penalties/). Ang mas bagong mga boost ay nag-iingat ng mga numero nila sa `goAheadRunTunables`, `twoMinuteDrillTunables`, `noHitterTunables`, `redCardTunables`, `upsetTunables`, `stakesTunables` at `hockeyTunables`.

Hawak ng `scorerTunables` ang bawat tier value na ginagamit ng engine sa pag-score, ang parehong mga numero na ibinibigay na ng mga constant sa itaas ayon sa pangalan, para mabasa ng consumer ang value ng tier sa halip na i-hardcode ito.

Hawak ng `sportTypeConfigs`, `sportTypeConfigMap`, `leagueConfigs`, `leagueConfigMap` at `allLeagueIds` ang tuning ng sport at liga na binabasa ng engine sa bawat tawag. Nasa [Configuration ng sport at liga](/arenaswap/docs/powerscore/configuration/) ang mga field nila at ang aktuwal na value ng bawat sport at liga.

## Ang 2.x API

Ine-export pa rin, gumagana pa rin, at may marka ng deprecated kung saan nakasaad. Walang inalis dito sa 3.0. Lumipat sa `scoreGame` kapag gusto mo na ng mga mode o ng mga bagong boost. Hanggang doon, ibinabalik nila ang mga numerong lagi nilang ibinabalik.

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	winProbabilityHistory?: number[],
): PowerScoreResult
```

Deprecated. Ini-score ang limang signal ng Classic, inilalapat ang win probability modifier, at ibinabalik ang flat na `PowerScoreResult` (`closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`, `total`, `reason` at iba pa). Ito ang `scoreGame` sa Classic na signal lang, pinatag, kaya walang kasamang moment boost.

| Parameter | Default | Tala |
|---|---|---|
| `game` | kailangan | Ang kasalukuyang game state. |
| `history` | `[]` | Mga kamakailang snapshot ng score. Nananatiling 0 ang momentum, lead changes at comeback hanggang may hawak itong hindi bababa sa 3 entry. |
| `winProbabilityHistory` | `[]` | Mga kamakailang win-probability value, 0 hanggang 1. Kailangan ng hindi bababa sa 5 finite na entry para may maambag. |

Hindi nagta-throw. Agad na nagbabalik ng resultang puro 0 kapag true ang `isPlayFrozen(game)`. Hindi nito chine-check ang `game.status`: pareho ang score ng `'pre'` o `'post'` na laro sa `'in'`, kung pareho ang iba pang field.

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

Deprecated: nasa listahan ng `boosts` ng `scoreGame` ang number bilang `scoringOpportunity`. Nagbabalik ng `0` maliban kung `game.status === 'in'` at hindi frozen ang laro. Kung hindi, nagbabalik ng 0 hanggang 10 para sa baseball at softball, ayon sa bilang ng runner, o 0 hanggang 15 para sa football, ayon sa margin sa red zone at down. Nagbabalik ng `0` para sa lahat ng ibang `sportType`, kasama ang hockey, dahil galing sa `context` ang power play at empty net nito, na hindi tinatanggap ng function na ito. Hindi kasama sa `total` ng `computePowerScore`.

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

Minamapa ang history ng win probability sa ±5 na modifier. Inaalis muna ang mga non-finite na entry, tapos nagbabalik ng `undefined` kung wala pang 5 finite na value ang natira. Kung hindi, nagbabalik ng integer mula `-scoreWinProbVarianceMax` hanggang `scoreWinProbVarianceMax`.

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

Nagbabalik ng `true` kapag `game.intermission === true` o `game.delayed === true`, at `false` kung hindi, kasama kapag parehong wala ang dalawang field.

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

Gaano na kalayo ang laro sa regulation, 0 hanggang 1, mula sa parehong clock na binabasa ng late-game signal. Madaling gamitin sa pagguhit ng laro sa timeline.

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

Deprecated. Tumatanggap ng partial, posibleng hindi mapagkakatiwalaang `PowerScoreResult` (`gameId` lang ang kailangan) at nagbabalik ng buo, naka-clamp at valid na isa. Tinatawag ito ng `computePowerScore` sa loob sa bawat resultang nabubuo nito.

Bawat isa sa limang field ng signal ay iki-clamp sa sariling ceiling nito. Ang `total` ay iki-clamp sa `scoreMaxTotal` maliban kung `true` ang `options.allowTotalOverflow`. Kapag may ganoong option, minimum na `0` lang ang clamp nito, para maitulak ito ng manual na boost lampas sa 100 nang sinasadya. Ang `total` na nawawala o non-finite ay bumabagsak sa kabuuan ng limang signal bawas ang `breakPenalty`, hindi ang raw na kabuuan. Ang `reason` ay bumabagsak sa `scorerTunables.reasons.fallback` ("best game available") kapag hindi ito string. Ang `favoriteBonus`, `favoriteTeamCount`, `gameBoost`, `scoringOpportunityBoost` at `postseasonBoost` ay ni-round at pinapababa sa `0` kapag ibinigay. Kapag hindi, hindi isinasama ang mga ito sa resulta, hindi ginagawang default na `0`. Hindi nagta-throw.

### Ano ang nagbabago kapag lumipat ka

Kasama ng Classic sa pamamagitan ng `scoreGame` ang mga bagong boost, kaya puwedeng mas mataas ang score ng parehong laro doon kaysa sa `computePowerScore`, hanggang sa mga cap ng bucket. Mga option na ng `scoreGame` ang mga favorite, postseason at manual na boost na dati mong idinadagdag nang mano-mano sa paligid ng `normalizePowerScoreResult`. Dala ang lahat ng iba pa. Nagkaroon ang `Game` type ng mga optional na field at league type parameter, at ang hubad na `Game` ay may parehong ibig sabihin gaya ng dati. Ang league id na hindi kilala ng table ay dating iso-score gamit ang configuration ng NBA anuman ang sport. Ngayon ay nakukuha nito ang sariling default ng sport nito, kaya ang laro sa hockey sa hindi kilalang liga ay nakukuha ang mga period at clock ng NHL.
