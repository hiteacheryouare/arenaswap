---
sourceHash: '40ee38646993'
title: Mga TypeScript type ng PowerScore
description: Bawat field ng Game, ScoringContext, ScoreOptions, PowerScore, at ng mga type ng mode at config, alin ang optional, at ano ang nangyayari kapag wala ang optional na field.
section: powerscore
order: 7
navLabel: Mga type
---

Tatlong grupo ang mga type ng PowerScore 3. Ang ibinibigay mo sa `scoreGame`: [`Game`](#game), [`ScoringContext`](#scoringcontext) at [`ScoreOptions`](#scoreoptions). Ang makukuha mo pabalik: [`PowerScore`](#powerscore). At ang bumubuo sa mode: [`PowerScoreMode`](#powerscoremode) at ang mga bahagi nito. Nasa dulo ang mga 2.x na type, ine-export pa rin at gumagana pa rin.

## Game

Ang estado ng laro ngayon. `id`, `league`, `sportType` at ang dalawang score ng team lang ang kailangan. Pinipino ng lahat ng iba pa ang score kapag meron nito. Ang bawat optional na field ay itinuturing na hindi alam, hindi default na value, kapag wala.

Generic sa league id ang `Game`: `Game<League extends string = LeagueId>`. Ang hubad na `Game` ay may parehong ibig sabihin gaya ng dati. Ang feed na may sariling mga league id ay gumagamit ng `Game<string>`.

| Field | Type | Kapag wala |
|---|---|---|
| `id` | `string` | Kailangan. |
| `league` | `League` | Kailangan. Ang id na hindi kilala ng `leagueConfigMap` ay iso-score gamit ang default ng sport nito (tingnan ang [Configuration ng sport at liga](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship)). |
| `sportType` | `SportType` | Kailangan. Ang value na hindi kilala ng `sportTypeConfigMap` ay bumabagsak sa tuning ng basketball. |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | Kailangan. |
| `period?` | `number` | `0` ang basa ng late-game pressure. Nag-i-score pa rin ang closeness, pero `0` din ang basa sa progress ng laro, kaya flat floor lang nito ang binabayaran at hindi ang mas buong value ng tier. |
| `clockSeconds?` | `number` | Itinuturing na hindi alam, hindi `0:00`. Nananatili sa simula ng period ang late-game ramp, at 0 ang bayad ng bawat boost na nakadepende sa clock. |
| `intermission?` | `boolean` | `false`. Pinapatigil ng `true` ang laro: 0 ang score ng lahat hanggang magpatuloy ang laro. |
| `delayed?` | `boolean` | `false`. Pinapatigil din ng `true` ang laro, gaya ng `intermission`. |
| `status?` | `'pre' \| 'in' \| 'post'` | Walang binabayaran ang mga boost sa anumang hindi `'in'`, kasama ang nawawalang value. Hindi ito binabasa ng mga signal. |
| `topOfInning?` | `boolean` | Baseball at softball. Ini-score sa pagitan ng mga closeness value ng top at bottom ng inning. Kailangan ito ng go-ahead run at ng no-hitter. |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | Baseball at softball. Itinuturing na walang runner. |
| `outs?` | `number` | Baseball at softball. Itinuturing na 0. Sa 3, walang binabayaran ang mga boost na nakabase sa runner. |
| `possession?` | `'home' \| 'away'` | Football, o ang puck kung saan ito iniuulat ng feed. Kung wala ito, 0 ang bayad ng two-minute drill at walang football situation ang Fantasy. |
| `yardsToEndZone?` | `number` | Football. Ang yardang kailangan ng team na hawak ang bola. Kailangan ito ng two-minute drill at ng Fantasy. |
| `isRedZone?` | `boolean` | Football lang. Kapag `false` o wala, 0 ang bayad ng red-zone na kaso ng scoring opportunity boost. |
| `down?` | `number` | Football lang. Bumabagsak sa walang timbang (×1) na multiplier sa halip na tuluyang mawala ang boost. Sa two-minute drill at Fantasy, ang `down` na mas mababa sa 1 ay binabasa bilang nasa pagitan ng mga play. |
| `distance?` | `number` | Football lang. Sa 3rd down, ang nawawalang value ay hindi puwedeng maging 3rd-and-short, kaya bumabagsak ito sa ×1. |
| `isGoalToGo?` | `boolean` | Football lang, at may pagbabago lang sa 4th down. |
| `series?` | [`SeriesState`](#seriesstate) | Walang serye, kaya walang nababasa ang stakes. |
| `redCards?` | [`RedCard[]`](#redcard) | Soccer. Walang card. |
| `seasonType?` | `'regular' \| 'postseason'` | Itinuturing ng stakes na postseason ang laro kapag ito ang sinasabi o may `postseasonRound`, at regular season kung hindi. |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | Walang postseason boost. Ang `0` ang nagpapasya ng titulo, ang `1` ay semifinal, ang `2` ay quarterfinal, ang `3` ay anumang mas maaga. |

Ang `SportId` ay deprecated na alias ng `LeagueId`, iniwan para sa 1.x compatibility. Gamitin ang `LeagueId`.

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

| Field | Kapag wala |
|---|---|
| `score` | Kailangan. |
| `abbreviation` | Ito ang pangalan ng team sa mga reason kapag wala rin ang `nickname`, at lumalabas na `?` kapag parehong wala. |
| `nickname` | Ang itinatawag ng mga reason sa team: "Lakers", "Nittany Lions", o maikling pangalan ng soccer club gaya ng "Portland". Bumabagsak sa `abbreviation`. |
| `rank` | Unranked ang team. Iwanan din ito para sa bracket seed: ranggo ito sa poll, kung saan 1 ang pinakamahusay. Kailangan ito ng stakes sa dalawang team. |
| `hits` | Baseball at softball. Walang bilang ng hit, kaya hindi makakapagbayad ang no-hitter. Totoong value ang `0`: ibig sabihin ay walang hit ang team. |
| `errors` | Baseball at softball. Walang score ngayon na bumabasa nito. |
| `timeouts` | Football. Neutral na timbang ang ginagamit ng two-minute drill para sa kontrol ng clock. |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

Walang binabayaran ang serye na mas maikli sa best of 3.

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

Lahat ng hindi dala ng laro mismo. Optional ang bawat field, at tinatanggap ng `scoreGame` ang buong object bilang pangalawang argument.

| Field | Type | Kapag wala |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | Nananatiling 0 ang Momentum, Lead Changes at Comeback Factor hanggang 3 entry ang hawak nito. Pinakamatanda muna. |
| `onBreak?` | `boolean` | Na-detect ng caller ang commercial break. Ang `true` ay kumukuha ng `breakPenalty` (15) sa subtotal ng mga signal. Walang bawas sa break kapag wala. |
| `winProbability?` | `number[]` | Win probability ng home sa buong laro, 0 hanggang 1. Kailangan ng 5 finite na value para may epekto. Walang modifier kung hindi. |
| `pregameLine?` | [`PregameLine`](#pregameline) | 0 ang bayad ng Upset watch at Upset Rout. |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | Walang race stakes. Tingnan ang [`TeamStakes`](#teamstakes). |
| `powerPlay?` | `'home' \| 'away' \| boolean` | Walang power play sa scoring opportunity boost. Isang panig kapag sinasabi ng feed kung kanino, `true` kapag sinasabi lang nitong may isa. |
| `emptyNet?` | `'home' \| 'away' \| boolean` | Walang empty net sa scoring opportunity boost. Itakda lang ito kapag naiulat na ito ng feed sa dalawang magkasunod na poll. |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | Mga pagbabago ng lead na binilang mula sa sariling play log ng feed, na nakakakita ng mga palitan sa pagitan ng poll, kasama ang oras ng pinakabago. Ginagamit kapag mas marami ang bilang nito kaysa sa ipinapakita ng `history`. Kailangan pa rin ng Lead Changes ang 3 snapshot. |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | Walang player ang Fantasy, at ini-score ang laro bilang Classic. |

### ScoreSnapshot

Talaan ng score ng laro sa isang sandali, ginagamit para ma-detect ang momentum, pagbabago ng lead at comeback. Kailangan ang lahat ng apat na field.

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

Kailangan lang na magkaugnay ang `timestamp` sa ibang snapshot sa parehong array. Sinusukat ang paghina laban sa timestamp ng pinakabagong snapshot, hindi sa wall-clock time. Pareho ang resulta ng pag-replay ng parehong history, kahit kailan pa ito i-replay.

### PregameLine

Ang line gaya ng kalagayan nito bago ang laro. Gumagalaw ang live na line kasabay ng score at buburahin nito ang upset.

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

Ang `spread` ang puntos na ibinigay sa paborito, bilang positibong number, at basketball at football lang ang bumabasa nito. Kapag parehong moneyline ang meron, inaalis ang margin ng bookmaker bago gamitin. Ang `drawMoneyline` ay ang three-way line ng soccer. Ang run line o puck line lang ay nagsasabi kung sino ang paborito pero hindi kung gaano, kaya hindi ito sapat.

### TeamStakes

Mga flag ng karera sa huling bahagi ng season para sa isang team, regular season lang.

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

Ang `canClinch` ay nangangahulugang ang panalo sa larong ito ay makakakuha ng puwesto, division o titulo anuman ang mangyari sa iba. Ang `canBeEliminated` ay nangangahulugang ang pagkatalo ay magtatanggal sa team sa laban. Ang `inRace` ay nasa laban pa, hindi ligtas at hindi pa out. Ang `nearLine` ay nasa loob ng ilang puntos mula sa linya sa table.

### FantasyPlayerState

Isang player sa roster na nasa laro.

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

Ang `FantasyPosition` ay `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'`: mga posisyon sa football, pitcher at hitter para sa baseball, at generic na player sa iba. Lumalabas ang `name` sa mga reason, gaya ng "Mahomes in the red zone". Ang `active: false` ay nangangahulugang sinasabi ng feed na wala na ang player sa laro, at wala itong halaga. Ang `role` ay baseball lang: kung nasaan ang player sa inning. Ang `pointEvents` ay mga fantasy point habang pumapasok, kaya humihina ang kamakailang production gaya ng anumang ibang pangyayari.

## ScoreOptions

Kung paano mag-score. Optional ang bawat field, at tinatanggap ng `scoreGame` ang object bilang pangatlong argument.

| Field | Type | Ano ang ginagawa nito |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | Aling mode ang nag-i-score ng laro. Classic kapag wala. |
| `disabledSignals?` | `readonly string[]` | Mga signal id ng mode na io-off. Ire-rescale ang iba sa buong range ng mode. |
| `classicDisabledSignals?` | `readonly string[]` | Mga signal id na io-off sa Classic kapag hinahalo ito o ginagamit bilang floor. |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | Nag-o-override sa sariling halo ng mode, gaya ng Fantasy slider ng manonood. |
| `favoriteTeamCount?` | `number` | Ilang paboritong team ang nasa laro. |
| `favoriteBoostPoints?` | `number` | Puntos kada paboritong team. |
| `postseasonBoostPoints?` | `number` | Puntos para sa larong nagpapasya ng titulo. May bahagi ang mas naunang mga round. |
| `gameBoost?` | `number` | Manual na boost. Ang tanging pinapayagang magtulak ng total lampas 100. |
| `sport?` | `Partial<SportTypeConfig>` | Para sa mga sport na hindi tugma sa mga built-in na table, o para i-tune ang mga ito. |
| `league?` | `Partial<LeagueConfig>` | Para sa mga ligang hindi kilala ng built-in na table. Itakda ang `regularPeriods` at `periodDurationSecs`. |

## PowerScore

Ang ibinabalik ng `scoreGame`.

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

| Field | Kahulugan |
|---|---|
| `modeId` | Ang mode na aktuwal na nag-score ng laro. Ang mode na hindi nalalapat, gaya ng Fantasy na walang player sa roster na nasa laro, ay bumabagsak sa `'classic'`. |
| `total` | 0 hanggang 100, at lampas 100 lang sa pamamagitan ng `gameBoost`. |
| `signals` | Bawat signal na dinedefine ng mode, kasama ang ceiling nito, kahit 0. Tingnan ang [`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment). |
| `signalsSubtotal` | Ang kabuuan ng mga naka-enable na signal bago ang anumang rescaling para sa mga naka-disable. |
| `scaledSubtotal` | Ang parehong kabuuan pagkatapos ng rescaling, naka-cap sa `signalCeiling`. |
| `signalCeiling` | Ang kabuuan ng mga ceiling ng mode: 156 para sa Classic. |
| `frozen` | `true` sa halftime, sa intermission o sa delay. 0 ang score ng lahat at walang laman ang `reason`. |
| `onBreak`, `breakPenalty` | Kung nalapat ang bawas sa commercial break, at ilang puntos ang kinuha nito (laging ≥ 0). Parehong `false` at `0` sa frozen na score. |
| `winProbabilityVariance?` | −5 hanggang +5. Wala, hindi `0`, kapag kulang ang data ng win-probability. |
| `baseTotal` | Mga signal bawas ang bawas sa break dagdag ang modifier, 0 hanggang 100, bago ang anumang boost. |
| `classicTotal?` | Ang sariling total ng Classic, kapag hinahalo ang mode rito. |
| `blend?` | Kung paano narating ng hinaluang mode ang total nito. Tingnan ang [`BlendResult`](#blendresult). |
| `boosts` | Bawat boost na binabayaran ng mode, sa 0 kapag hindi nagbabayad. Dagdag ang `favoriteBoost`, `postseasonBoost` at `gameBoost` kapag hiniling mo na. |
| `reasons` | Hanggang tatlong pangungusap ng plain na katotohanan, bilang mga fragment na handa nang isalin: ano ang nangyayari ngayon, ano ang kakapangyari lang, ang score at ang oras, at ano ang nakataya. Tingnan ang [reason table ng README](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/powerscore/README.md#reasons) para sa bawat key. |
| `reason` | Ang pareho sa English, bilang mga pangungusap. Display text ito, hindi API: puwedeng magbago ang pananalita sa pagitan ng mga bersyon. Huwag itong i-match. |

### ScoredSignal, ScoredBoost at ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number>; details?: ReasonFragment[] }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

Dala ng `meta` sa boost ang maaaring gustong sabihin ng UI, gaya ng `{ inning: 8 }` sa no-hitter o `{ secondsLeft: 95, trailBy: 3 }` sa two-minute drill. Ganito ang itsura ng reason fragment: `{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } }`. Ang mga reason key na kilala ng mga built-in na mode ay nire-render bilang English sa `reason`. Ang sarili mong key ay nire-render bilang sarili nito, kaya magsalin mula sa `reasons`, hindi mula sa string.

Sinasabi ng `details` sa boost kung ano ang nangyayari sa larong ito na binabayaran ng boost, o hindi, bilang mga reason fragment na isasalin ng UI: `{ key: 'seriesClinch', params: { team: 'CHW' } }` sa stakes, o hinugot na goalie at power play nang sabay sa 6-on-4 sa hockey. Wala ito kapag walang masasabi, gaya bago magsimula ang laro o habang nakatigil ang laro. Walang English renderer para sa mga key na ito; inililista ng table sa ibaba ang bawat key na ipinapadala ng mga built-in na boost, kasama ang pangungusap na ipinapakita ng ArenaSwap para dito.

| Boost | Key | Params | Sa English |
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

Ang mode ay listahan ng mga signal at ng mga boost na bagay sa kanila. Bumuo ng isa gamit ang [`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode), na isang beses at maagang nagche-check nito.

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

| Field | Kahulugan |
|---|---|
| `signals`, `boosts` | Sa pagkakasunod-sunod ng display. |
| `bucketCaps` | Ang pinakamarami na puwedeng idagdag nang magkakasama ng isang bucket ng mga boost. Unang binabayaran ang mga nauuna sa listahan. |
| `reasonPriority` | Mga signal id na puwedeng basahin ang reason, pinakamahalagang basahin ang una. Ang pinakamalakas ang nagbibigay ng pangungusap na "what just happened"; ang pagkakasunod-sunod ang bumabasag ng tabla. |
| `usesBreakPenalty`, `usesWinProbability` | Kung nalalapat ang bawas sa commercial break at ang ±5 na modifier. |
| `classicBlend` | Kung paano pinagsasama ang mode sa Classic. |
| `paysPostseason?` | Pinipigilan ng `false` ang postseason boost sa mode na ito. `true` ang default. Itinatakda ito ng Blowouts sa `false`, dahil tapos na ang resulta ng playoff blowout. |
| `appliesTo` | Nagbabalik ng `false` para sa larong walang masabi ang mode, at ini-score ang laro bilang Classic. |

### SignalDefinition at BoostDefinition

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

Ikinakapit ang `points` ng signal sa `ceiling` nito. Walang sariling ceiling ang boost, pero puwedeng may cap ang bucket nito.

### SignalInput

Ang tinatanggap ng `compute`.

| Field | Kahulugan |
|---|---|
| `game`, `context` | Ang ipinasa sa `scoreGame`. |
| `sport`, `league` | Ang resolved na [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig) at `LeagueConfig`, pagkatapos ng anumang override sa `options`. |
| `progress` | 0 sa simula ng laro, 1 sa dulo ng regulation at sa buong overtime. |
| `now` | Ang timestamp ng pinakabagong snapshot sa `history`, o 0 kapag wala. |
| `margin` | Ang absolute na margin ng score. |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

Floor na may factor na 0.3 ang gamit ng Blowouts. Boost na may weight na 0.6 ang gamit ng Fantasy, kaya tataas lang ang mga laro ng mga player mo sa ibabaw ng Classic score nila. Hindi ginagamit ng mga built-in na mode ang `mix`, pero nandiyan ito para sa sarili mong mga mode.

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

Nagdadala ng isa ang `score.blend` kapag hinalo ang mode sa Classic, para maipakita ng breakdown ang kuwenta.

## SportTypeConfig at LeagueConfig

Hawak ng `SportTypeConfig` ang lahat tungkol sa kung paano nilalaro ang isang sport. Sakop nito ang mga closeness threshold, momentum at comeback threshold, decay half-life, kung may clock ang sport, at (baseball at softball lang) ang `lateGameCurve`. Hawak ng `LeagueConfig` kung gaano katagal ang mga period ng isang partikular na liga: `id`, `label`, `sportType`, `regularPeriods`, `periodDurationSecs` at `periodFormat`. May dala rin itong mga field na ginagamit ng ArenaSwap sa sarili nitong pagkuha ng data at mga schedule bar, na hindi binabasa ng scorer.

Ilang field ang optional, at ilang entry lang ang nagtatakda nito: `lateGameCurve` (baseball at softball), `clockIsFullGameElapsed` (soccer), `zeroZeroPenaltyPeriods` (hockey at soccer), at `knockoutRunMinutes` (ang dalawang World Cup at ang dalawang Olympic soccer tournament). Sa pamamagitan ng `options.sport` at `options.league`, puwede kang magpasa ng anumang subset bilang `Partial` para mag-override ng isa kada tawag. Nasa [Configuration ng sport at liga](/arenaswap/docs/powerscore/configuration/) ang kahulugan ng bawat field at ang aktuwal na value ng bawat sport at liga.

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

Baseball at softball lang ang nagtatakda ng `SportTypeConfig.lateGameCurve`. Ang mga sport na may clock ay kinukuha ang late-game ramp nila nang direkta mula sa `period` at `clockSeconds`, at iniiwang `undefined` ang field. Wala nang iba pang ika-configure rito ang sport na batay sa clock, kaya iisa lang ang hugis ng type sa ngayon.

## ScorerTunables

Ang nag-iisang exported na object na may hawak ng bawat tier value na ginagamit ng engine sa pag-score. Ganap na may laman itong constant, hindi partial na config.

| Branch | Hawak |
|---|---|
| `scores.closeness` | Ang mga ceiling ng closeness tier (`tied`, `tight`, `zeroZero`, `close`, `fringe`, `none`). Tingnan ang [closeness signal ng Classic](/arenaswap/docs/powerscore/signals/#closeness). |
| `scores.closenessFlatFloor` | Ang flat floor na binabayaran ng bawat closeness tier bago ang progress scaling. |
| `scores.lateGame` | Ang mga ceiling ng late-game, ang overtime pre-boost, at ang previous-period touch. Tingnan ang [Late-Game Pressure](/arenaswap/docs/powerscore/signals/#late-game-pressure). |
| `scores.momentum` | Ang dalawang tier value ng momentum. Tingnan ang [Momentum](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor). |
| `scores.leadChanges` | Ang dalawang tier value ng lead-change. |
| `scores.comeback` | Ang dalawang tier value ng comeback at ang flat floor nito. |
| `scores.winProbabilityVariance` | `maxAvgDist` at `minDataPoints`, nakatable sa [Mga boost at penalty](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance). |
| `reasons` | `fallback` lang ("best game available"), ang reason na binabagsakan ng deprecated na flat na resulta. Nasa `renderReasonEnglish` ang English na pananalita. |

## FantasyRule at FantasySport

Ang mga type sa likod ng [`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints).

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

Ang `min` at `max` ang mga hangganang puwedeng ipatupad ng settings screen, at iki-clamp ng `resolveFantasyScoring` ang override sa mga ito.

## SportType at LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

Saradong union ang `SportType`. Ang `LeagueId` ay ang 31 liga na may built-in na tuning, pero hindi nito nililimitahan ang `Game`: puwedeng anumang string ang `league` ng laro gamit ang `Game<string>`, at ang id na hindi kilala ng table ay iso-score gamit ang default ng sport nito. Nasa [Configuration ng sport at liga](/arenaswap/docs/powerscore/configuration/) ang buong listahan ng 31 league id. Available din ito sa runtime bilang `allLeagueIds`.

## PowerScoreResult (2.x)

Deprecated, ine-export pa rin, gumagana pa rin. Ang flat na output ng `computePowerScore`, at ang hugis na tinatanggap ng `normalizePowerScoreResult` bilang partial na bersyon. Hindi ito ibinabalik ng `scoreGame`.

| Field | Type | Kapag wala |
|---|---|---|
| `gameId` | `string` | Kailangan saanman lumabas ang type na ito. |
| `total` | `number` | Itinatakda ng `computePowerScore`. 0 hanggang `scoreMaxTotal` (100), maliban kung nabuo sa pamamagitan ng `normalizePowerScoreResult` na may `allowTotalOverflow`. |
| `closeness` | `number` | 0 hanggang `scoreMaxCloseness` (42). |
| `lateGame` | `number` | 0 hanggang `scoreMaxLateGame` (38). |
| `momentum` | `number` | 0 hanggang `scoreMaxMomentum` (38). |
| `leadChanges` | `number` | 0 hanggang `scoreMaxLeadChanges` (18). |
| `comeback` | `number` | 0 hanggang `scoreMaxComeback` (20). |
| `winProbabilityVariance?` | `number` | −`scoreWinProbVarianceMax` hanggang `scoreWinProbVarianceMax` (±5). Wala, hindi `0`, kapag walang ibinigay na history ng win-probability o kulang ang magagamit. |
| `reason` | `string` | Bumabagsak sa `scorerTunables.reasons.fallback` ("best game available") kapag wala o hindi string. |
| `onBreak?` | `boolean` | Ang wala ay binabasa bilang `false`. Ipinapasa ito ng `normalizePowerScoreResult` kapag boolean. |
| `breakPenalty?` | `number` | Mga puntos na inalis, laging ≥ 0. Wala, hindi `0`, kapag walang ibinigay. Hindi ito itinatakda ng `computePowerScore`. |
| `signalsSubtotal?` | `number` | Ang kabuuan ng limang signal bago ang break penalty, 0 hanggang `scoreMaxSignalsSubtotal` (156). |
| `favoriteBonus?`, `favoriteTeamCount?`, `gameBoost?`, `scoringOpportunityBoost?`, `postseasonBoost?` | `number` | Hindi kinukuwenta ng `computePowerScore`. Wala maliban kung ibinigay ng caller. |

Isinasama na ng `scoreGame` ang favorite, postseason at game boost para sa iyo, kaya hindi mo na kailangang bumuo ng `PowerScoreResult` nang mano-mano gamit ito. Nakalista sa [API reference](/arenaswap/docs/powerscore/api-reference/#the-2x-api) ang lahat ng ine-export pa rin ng 2.x.
