---
sourceHash: '40ee38646993'
title: Les types TypeScript de PowerScore
description: Chaque champ de Game, ScoringContext, ScoreOptions, PowerScore et des types de mode et de configuration, lesquels sont facultatifs, et ce qui se passe quand un champ facultatif manque.
section: powerscore
order: 7
navLabel: Types
---

Les types de PowerScore 3 se répartissent en trois groupes. Ce que tu donnes à `scoreGame` : [`Game`](#game), [`ScoringContext`](#scoringcontext) et [`ScoreOptions`](#scoreoptions). Ce que tu récupères : [`PowerScore`](#powerscore). Et ce dont est fait un mode : [`PowerScoreMode`](#powerscoremode) et ses pièces. Les types 2.x sont à la fin, toujours exportés et fonctionnels.

## Game

L'état du match à l'instant. Seuls `id`, `league`, `sportType` et les deux scores d'équipe sont obligatoires. Tout le reste affine le score quand il est présent. Chaque champ facultatif est traité comme inconnu, pas comme une valeur par défaut, quand il est absent.

`Game` est générique sur l'identifiant de ligue : `Game<League extends string = LeagueId>`. Un `Game` seul veut dire ce qu'il a toujours voulu dire. Un flux avec ses propres identifiants de ligue utilise `Game<string>`.

| Champ | Type | Manquant veut dire |
|---|---|---|
| `id` | `string` | Obligatoire. |
| `league` | `League` | Obligatoire. Un identifiant que `leagueConfigMap` ne reconnaît pas est noté avec les valeurs par défaut de son sport (voir [Configuration des sports et des ligues](/arenaswap/docs/powerscore/configuration/#tune-it-for-a-league-powerscore-doesnt-ship)). |
| `sportType` | `SportType` | Obligatoire. Une valeur que `sportTypeConfigMap` ne reconnaît pas se rabat sur le réglage du basketball. |
| `homeTeam` / `awayTeam` | [`TeamState`](#teamstate) | Obligatoire. |
| `period?` | `number` | Fin de match vaut `0`. Serré marque quand même, mais l'avancement du match vaut `0` lui aussi, donc il ne verse que son plancher fixe plutôt que la valeur complète du palier. |
| `clockSeconds?` | `number` | Traité comme inconnu, pas comme `0:00`. La rampe de fin de match reste au début de la période, et chaque bonus conditionné par le chrono verse 0. |
| `intermission?` | `boolean` | `false`. `true` fige le match : tout marque 0 jusqu'à la reprise du jeu. |
| `delayed?` | `boolean` | `false`. `true` fige le match, comme `intermission`. |
| `status?` | `'pre' \| 'in' \| 'post'` | Les bonus ne versent rien pour autre chose que `'in'`, valeur manquante comprise. Les signaux ne le lisent pas. |
| `topOfInning?` | `boolean` | Baseball et softball. Marque entre les valeurs de Serré du haut et du bas de la manche. Le point de l'avance et le no-hitter en ont besoin. |
| `baseRunners?` | `{ first: boolean; second: boolean; third: boolean }` | Baseball et softball. Traité comme aucun coureur sur les bases. |
| `outs?` | `number` | Baseball et softball. Traité comme 0. À 3, les bonus basés sur les coureurs ne versent rien. |
| `possession?` | `'home' \| 'away'` | Football américain, ou le palet quand un flux le signale. Sans lui, le two-minute drill verse 0 et Fantasy n'a pas de situation de football américain. |
| `yardsToEndZone?` | `number` | Football américain. Les yards dont a besoin l'équipe qui a le ballon. Nécessaire pour le two-minute drill et Fantasy. |
| `isRedZone?` | `boolean` | Football américain seulement. `false` ou manquant veut dire que le cas zone rouge du bonus d'occasion de marquer verse 0. |
| `down?` | `number` | Football américain seulement. Se rabat sur le multiplicateur non pondéré (×1) plutôt que de perdre tout le bonus. Dans le two-minute drill et Fantasy, un `down` inférieur à 1 se lit comme entre deux actions. |
| `distance?` | `number` | Football américain seulement. Au 3e down, une valeur manquante ne peut pas être un 3e et court, donc elle se rabat sur ×1. |
| `isGoalToGo?` | `boolean` | Football américain seulement, et ne change quelque chose qu'au 4e down. |
| `series?` | [`SeriesState`](#seriesstate) | Pas de série, donc Enjeu n'en lit aucune. |
| `redCards?` | [`RedCard[]`](#redcard) | Soccer. Aucun carton. |
| `seasonType?` | `'regular' \| 'postseason'` | Enjeu traite le match comme des phases finales quand ce champ le dit ou que `postseasonRound` est défini, et comme de la saison régulière sinon. |
| `postseasonRound?` | `0 \| 1 \| 2 \| 3` | Pas de bonus de phases finales. `0` décide du titre, `1` est une demi-finale, `2` un quart de finale, `3` tout ce qui est avant. |

`SportId` est un alias déprécié de `LeagueId`, conservé pour la compatibilité 1.x. Utilise `LeagueId`.

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

| Champ | Manquant veut dire |
|---|---|
| `score` | Obligatoire. |
| `abbreviation` | Nomme l'équipe dans les raisons quand `nickname` manque aussi, et s'affiche `?` quand les deux manquent. |
| `nickname` | Comment les raisons appellent l'équipe : « Lakers », « Nittany Lions », ou le nom court d'un club de soccer comme « Portland ». Se rabat sur `abbreviation`. |
| `rank` | L'équipe n'est pas classée. Laisse-le de côté aussi pour une tête de série de tableau : c'est un classement de sondage, où 1 est le meilleur. Enjeu en a besoin sur les deux équipes. |
| `hits` | Baseball et softball. Pas de nombre de coups sûrs, donc le no-hitter ne peut pas verser. `0` est une vraie valeur : elle désigne une équipe sans coup sûr. |
| `errors` | Baseball et softball. Aucun score ne le lit aujourd'hui. |
| `timeouts` | Football américain. Le two-minute drill utilise un poids neutre pour le contrôle du chrono. |

### SeriesState

```ts
interface SeriesState {
	homeWins: number;
	awayWins: number;
	bestOf: number; // 7 for best-of-seven
}
```

Une série plus courte qu'un meilleur des 3 ne verse rien.

### RedCard

```ts
interface RedCard {
	side: 'home' | 'away';
	minute: number; // elapsed game minute the card was shown
}
```

## ScoringContext

Tout ce que le match lui-même ne porte pas. Chaque champ est facultatif, et `scoreGame` prend l'objet entier comme deuxième argument.

| Champ | Type | Manquant veut dire |
|---|---|---|
| `history?` | [`ScoreSnapshot[]`](#scoresnapshot) | L'Élan, les Changements de tête et la Remontée restent à 0 tant qu'il ne contient pas 3 entrées. Les plus anciennes d'abord. |
| `onBreak?` | `boolean` | L'appelant a détecté une pause publicitaire. `true` retire `breakPenalty` (15) du sous-total des signaux. Pas de déduction de pause quand il est absent. |
| `winProbability?` | `number[]` | La probabilité de victoire de l'équipe à domicile au fil du match, de 0 à 1. Demande 5 valeurs finies pour compter. Pas de modificateur sinon. |
| `pregameLine?` | [`PregameLine`](#pregameline) | L'alerte surprise et Surprise versent 0. |
| `stakes?` | `Partial<Record<'home' \| 'away', TeamStakes>>` | Pas d'enjeu de course. Voir [`TeamStakes`](#teamstakes). |
| `powerPlay?` | `'home' \| 'away' \| boolean` | Pas d'avantage numérique dans le bonus d'occasion de marquer. Une équipe quand le flux dit laquelle, `true` quand il dit seulement qu'il y en a un. |
| `emptyNet?` | `'home' \| 'away' \| boolean` | Pas de filet désert dans le bonus d'occasion de marquer. Ne le règle que quand le flux l'a signalé sur deux interrogations de suite. |
| `recentLeadChanges?` | `{ count: number; lastAt?: number }` | Des changements de tête comptés depuis le journal de jeu d'un flux, qui voit les inversions entre deux interrogations, avec l'heure du dernier. Utilisé quand il compte plus que ce que montre `history`. Changements de tête a quand même besoin des 3 instantanés. |
| `fantasy?` | [`FantasyPlayerState[]`](#fantasyplayerstate) | Fantasy n'a aucun joueur, et le match est noté en Classique. |

### ScoreSnapshot

Un relevé à un instant précis du score d'un match, utilisé pour détecter l'élan, les changements de tête et les remontées. Les quatre champs sont obligatoires.

```ts
interface ScoreSnapshot {
	gameId: string;
	timestamp: number;
	homeScore: number;
	awayScore: number;
}
```

`timestamp` doit seulement être relatif aux autres instantanés du même tableau. L'estompage se mesure par rapport à l'horodatage du plus récent instantané, pas à l'heure réelle. Rejouer le même historique donne le même résultat, quel que soit le moment où on le rejoue.

### PregameLine

La ligne telle qu'elle était avant le match. Une ligne en direct bouge avec le score et effacerait une surprise.

```ts
interface PregameLine {
	favorite: 'home' | 'away';
	spread?: number;
	favoriteMoneyline?: number;
	underdogMoneyline?: number;
	drawMoneyline?: number;
}
```

`spread` est le nombre de points rendus par le favori, sous forme de nombre positif, et seuls le basketball et le football américain le lisent. Avec les deux moneylines, la marge du bookmaker est retirée avant usage. `drawMoneyline` est la ligne à trois issues du soccer. Une run line ou une puck line seule dit qui est favori mais pas de combien, donc ça ne suffit pas.

### TeamStakes

Les indicateurs de course de fin de saison pour une équipe, saison régulière seulement.

```ts
interface TeamStakes {
	canClinch?: boolean;
	canBeEliminated?: boolean;
	inRace?: boolean;
	nearLine?: 'title' | 'relegation' | 'topQualification' | 'other';
}
```

`canClinch` veut dire que gagner ce match assure une place, une division ou un titre quoi qu'il arrive d'autre. `canBeEliminated` veut dire que perdre sort l'équipe de la course. `inRace` veut dire toujours dans la course, ni à l'abri ni éliminée. `nearLine` veut dire à quelques points d'une ligne du tableau.

### FantasyPlayerState

Un joueur de l'effectif dans un match.

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

`FantasyPosition` vaut `'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'P' | 'H' | 'player'` : des postes de football américain, un lanceur et un frappeur pour le baseball, et un joueur générique ailleurs. `name` apparaît dans les raisons, comme « Mahomes en zone rouge ». `active: false` veut dire que le flux indique que le joueur est sorti du match, et il ne compte pour rien. `role` ne concerne que le baseball : où se trouve le joueur dans la manche. `pointEvents` sont les points fantasy au fur et à mesure qu'ils sont arrivés, pour que la production récente s'estompe comme n'importe quel autre événement.

## ScoreOptions

Comment noter. Chaque champ est facultatif, et `scoreGame` prend l'objet comme troisième argument.

| Champ | Type | Ce qu'il fait |
|---|---|---|
| `mode?` | `'classic' \| 'blowouts' \| 'fantasy' \| PowerScoreMode` | Quel mode note le match. Classique en son absence. |
| `disabledSignals?` | `readonly string[]` | Les identifiants de signaux du mode à désactiver. Les autres sont remis à l'échelle sur toute la plage du mode. |
| `classicDisabledSignals?` | `readonly string[]` | Les identifiants de signaux à désactiver dans Classique quand il est mélangé ou utilisé comme plancher. |
| `classicBlend?` | [`ClassicBlend`](#classicblend) | Remplace le mélange propre au mode, comme le curseur Fantasy d'un spectateur. |
| `favoriteTeamCount?` | `number` | Combien d'équipes favorites sont dans le match. |
| `favoriteBoostPoints?` | `number` | Des points par équipe favorite. |
| `postseasonBoostPoints?` | `number` | Des points pour un match qui décide du titre. Les tours précédents en reçoivent une part. |
| `gameBoost?` | `number` | Un bonus manuel. La seule chose autorisée à pousser le total au-delà de 100. |
| `sport?` | `Partial<SportTypeConfig>` | Pour les sports que les tables intégrées ne couvrent pas, ou pour les ajuster. |
| `league?` | `Partial<LeagueConfig>` | Pour les ligues que la table intégrée ne connaît pas. Règle `regularPeriods` et `periodDurationSecs`. |

## PowerScore

Ce que renvoie `scoreGame`.

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

| Champ | Signification |
|---|---|
| `modeId` | Le mode qui a réellement noté le match. Un mode qui ne s'applique pas, comme Fantasy sans joueur de l'effectif dans le match, se rabat sur `'classic'`. |
| `total` | De 0 à 100, et au-dessus de 100 uniquement via `gameBoost`. |
| `signals` | Chaque signal que définit le mode, avec son plafond, même à 0. Voir [`ScoredSignal`](#scoredsignal-scoredboost-and-reasonfragment). |
| `signalsSubtotal` | La somme des signaux activés avant toute remise à l'échelle pour les signaux désactivés. |
| `scaledSubtotal` | La même après remise à l'échelle, plafonnée à `signalCeiling`. |
| `signalCeiling` | La somme des plafonds du mode : 156 pour Classique. |
| `frozen` | `true` à la mi-temps, pendant une pause ou un arrêt. Tout marque 0 et `reason` est vide. |
| `onBreak`, `breakPenalty` | Si une déduction de pause publicitaire s'est appliquée, et combien de points elle a pris (toujours ≥ 0). Les deux valent `false` et `0` sur un score figé. |
| `winProbabilityVariance?` | De −5 à +5. Absent, pas `0`, sans assez de données de probabilité de victoire. |
| `baseTotal` | Les signaux moins la déduction de pause plus le modificateur, de 0 à 100, avant tout bonus. |
| `classicTotal?` | Le total propre de Classique, quand le mode se mélange avec lui. |
| `blend?` | Comment un mode mélangé est arrivé à son total. Voir [`BlendResult`](#blendresult). |
| `boosts` | Chaque bonus que verse le mode, à 0 quand il ne verse rien. Plus `favoriteBoost`, `postseasonBoost` et `gameBoost` une fois que tu les as demandés. |
| `reasons` | Jusqu'à trois phrases de faits simples, sous forme de fragments prêts à traduire : ce qui se passe maintenant, ce qui vient de se passer, le score et l'heure, et ce qui est en jeu. Voir le [tableau des raisons du README](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/powerscore/README.md#reasons) pour chaque clé. |
| `reason` | La même chose en anglais, sous forme de phrases. Du texte d'affichage, pas une API : sa formulation peut changer d'une version à l'autre. Ne fais pas de correspondance dessus. |

### ScoredSignal, ScoredBoost et ReasonFragment

```ts
interface ScoredSignal { id: string; points: number; ceiling: number; disabled: boolean }
interface ScoredBoost  { id: string; points: number; meta?: Record<string, number>; details?: ReasonFragment[] }
interface ReasonFragment { key: string; params?: Record<string, string | number> }
```

`meta` sur un bonus porte ce qu'une interface pourrait vouloir dire, comme `{ inning: 8 }` sur un no-hitter ou `{ secondsLeft: 95, trailBy: 3 }` sur un two-minute drill. Un fragment de raison ressemble à `{ key: 'run', params: { team: 'Lakers', scoredFor: 12, scoredAgainst: 2 } }`. Les clés de raison que connaissent les modes intégrés s'affichent en anglais dans `reason`. Une clé à toi s'affiche telle quelle, donc traduis à partir de `reasons`, pas de la chaîne.

`details` sur un bonus dit ce qui se passe dans ce match et que le bonus paie, ou non, sous forme de fragments de raison à traduire par une interface : `{ key: 'seriesClinch', params: { team: 'CHW' } }` sur Enjeu, ou un gardien retiré et un avantage numérique ensemble sur un 6 contre 4 au hockey. Il est absent quand il n'y a rien à dire, comme avant le début d'un match ou pendant un arrêt de jeu. Il n'y a pas de moteur de rendu anglais pour ces clés ; le tableau ci-dessous liste chacune de celles qu'envoient les bonus intégrés, avec la phrase qu'ArenaSwap affiche pour elle.

| Bonus | Clé | Paramètres | En anglais |
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

Un mode est une liste de signaux plus les bonus qui lui conviennent. Construis-en un avec [`defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode), qui le vérifie une fois, d'emblée.

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

| Champ | Signification |
|---|---|
| `signals`, `boosts` | Dans l'ordre d'affichage. |
| `bucketCaps` | Le plus qu'un groupe de bonus peut ajouter en tout. Les bonus plus tôt dans la liste sont versés en premier. |
| `reasonPriority` | Les identifiants de signaux dont les raisons peuvent être lues, les plus dignes d'être lues d'abord. Le plus fort donne la phrase « ce qui vient de se passer » ; l'ordre départage les égalités. |
| `usesBreakPenalty`, `usesWinProbability` | Si la déduction de pause publicitaire et le modificateur ±5 s'appliquent. |
| `classicBlend` | Comment le mode se combine avec Classique. |
| `paysPostseason?` | `false` retient le bonus de phases finales dans ce mode. `true` par défaut. Raclées le met à `false`, puisqu'une raclée en playoffs a déjà réglé son résultat. |
| `appliesTo` | Renvoie `false` pour un match sur lequel le mode n'a rien à dire, et le match est noté en Classique. |

### SignalDefinition et BoostDefinition

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

Les `points` d'un signal sont limités à son `ceiling`. Un bonus n'a pas de plafond propre, mais son groupe peut en avoir un.

### SignalInput

Ce que reçoit `compute`.

| Champ | Signification |
|---|---|
| `game`, `context` | Ce qui a été passé à `scoreGame`. |
| `sport`, `league` | Les [`SportTypeConfig`](#sporttypeconfig-and-leagueconfig) et `LeagueConfig` résolus, après les remplacements éventuels dans `options`. |
| `progress` | 0 au début du match, 1 à la fin du temps réglementaire et pendant les prolongations. |
| `now` | L'horodatage du plus récent instantané de `history`, ou 0 s'il n'y en a aucun. |
| `margin` | L'écart absolu au score. |

### ClassicBlend

```ts
type ClassicBlend =
	| { kind: 'floor'; factor: number } // total = max(own, factor × classic)
	| { kind: 'mix'; weight: number }   // total = weight × own + (1 − weight) × classic
	| { kind: 'boost'; weight: number }; // total = min(100, classic + weight × own)
```

Raclées utilise un plancher avec un facteur de 0,3. Fantasy utilise un bonus avec un poids de 0,6, pour que les matchs de tes joueurs ne puissent que dépasser leur score Classique. Les modes intégrés n'utilisent pas `mix`, mais il est là pour tes propres modes.

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

`score.blend` en porte un quand un mode s'est mélangé avec Classique, pour qu'une décomposition puisse montrer le calcul.

## SportTypeConfig et LeagueConfig

`SportTypeConfig` contient tout ce qui concerne la façon dont un sport se joue. Ça couvre les seuils de Serré, les seuils d'élan et de remontée, les demi-vies d'estompage, si le sport a un chrono et (baseball et softball seulement) un `lateGameCurve`. `LeagueConfig` contient la durée des périodes d'une ligue précise : `id`, `label`, `sportType`, `regularPeriods`, `periodDurationSecs` et `periodFormat`. Il porte aussi des champs qu'ArenaSwap utilise pour sa propre récupération de données et ses barres de programme, que le calcul de score ne lit pas.

Quelques champs sont facultatifs, et seules certaines entrées les définissent : `lateGameCurve` (baseball et softball), `clockIsFullGameElapsed` (soccer), `zeroZeroPenaltyPeriods` (hockey et soccer) et `knockoutRunMinutes` (les deux Coupes du monde et les deux tournois olympiques de soccer). Avec `options.sport` et `options.league`, tu peux passer n'importe quel sous-ensemble en `Partial` pour en remplacer un à chaque appel. Le sens champ par champ et les vraies valeurs de chaque sport et de chaque ligue sont dans [Configuration des sports et des ligues](/arenaswap/docs/powerscore/configuration/).

## LateGameCurveConfig

```ts
interface BaseballLateGameCurveConfig {
	model: 'baseball';
	regulationInnings: number;
	regulationStartInning: number;
}

type LateGameCurveConfig = BaseballLateGameCurveConfig;
```

Seuls le baseball et le softball définissent `SportTypeConfig.lateGameCurve`. Les sports à chrono dérivent leur rampe de fin de match directement de `period` et `clockSeconds`, et laissent le champ `undefined`. Il n'y a rien d'autre à configurer ici pour un sport à chrono, donc le type n'a pour l'instant qu'une seule forme.

## ScorerTunables

L'unique objet exporté qui contient chaque valeur de palier avec laquelle le moteur note. C'est une constante entièrement remplie, pas une configuration partielle.

| Branche | Contient |
|---|---|
| `scores.closeness` | Les plafonds de palier de Serré (`tied`, `tight`, `zeroZero`, `close`, `fringe`, `none`). Voir [le signal Serré de Classique](/arenaswap/docs/powerscore/signals/#closeness). |
| `scores.closenessFlatFloor` | Le plancher fixe que chaque palier de Serré verse avant la mise à l'échelle par l'avancement. |
| `scores.lateGame` | Les plafonds de Fin de match, le pré-bonus de prolongation et l'appoint de la période précédente. Voir [Fin de match](/arenaswap/docs/powerscore/signals/#late-game-pressure). |
| `scores.momentum` | Les deux valeurs de palier d'Élan. Voir [Élan](/arenaswap/docs/powerscore/signals/#momentum-lead-changes-and-comeback-factor). |
| `scores.leadChanges` | Les deux valeurs de palier des changements de tête. |
| `scores.comeback` | Les deux valeurs de palier de la remontée et son plancher fixe. |
| `scores.winProbabilityVariance` | `maxAvgDist` et `minDataPoints`, tabulés dans [Bonus et pénalités](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance). |
| `reasons` | Seulement `fallback` (« best game available »), la raison sur laquelle se rabat le résultat à plat déprécié. La formulation anglaise vit dans `renderReasonEnglish`. |

## FantasyRule et FantasySport

Les types derrière [`defaultFantasyScoring`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints).

```ts
type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

interface FantasyRule {
	points: number; // points per unit of the stat
	min: number;
	max: number;
}
```

`min` et `max` sont les bornes qu'un écran de paramètres peut faire respecter, et `resolveFantasyScoring` y limite un remplacement.

## SportType et LeagueId

```ts
type SportType = 'basketball' | 'football' | 'hockey' | 'baseball' | 'softball' | 'soccer';
type LeagueId = 'nba' | 'wnba' | 'nhl' | /* ...31 total */;
```

`SportType` est une union fermée. `LeagueId` désigne les 31 ligues avec un réglage intégré, mais il ne limite pas un `Game` : la `league` d'un match peut être n'importe quelle chaîne avec `Game<string>`, et un identifiant que la table ne connaît pas est noté avec les valeurs par défaut de son sport. La liste complète des 31 identifiants de ligue est dans [Configuration des sports et des ligues](/arenaswap/docs/powerscore/configuration/). Elle est aussi disponible à l'exécution sous le nom `allLeagueIds`.

## PowerScoreResult (2.x)

Déprécié, toujours exporté, toujours fonctionnel. La sortie à plat de `computePowerScore`, et la forme dont `normalizePowerScoreResult` accepte une version partielle. `scoreGame` ne le renvoie pas.

| Champ | Type | Manquant veut dire |
|---|---|---|
| `gameId` | `string` | Obligatoire partout où ce type apparaît. |
| `total` | `number` | Défini par `computePowerScore`. De 0 à `scoreMaxTotal` (100), sauf s'il est produit via `normalizePowerScoreResult` avec `allowTotalOverflow`. |
| `closeness` | `number` | De 0 à `scoreMaxCloseness` (42). |
| `lateGame` | `number` | De 0 à `scoreMaxLateGame` (38). |
| `momentum` | `number` | De 0 à `scoreMaxMomentum` (38). |
| `leadChanges` | `number` | De 0 à `scoreMaxLeadChanges` (18). |
| `comeback` | `number` | De 0 à `scoreMaxComeback` (20). |
| `winProbabilityVariance?` | `number` | De −`scoreWinProbVarianceMax` à `scoreWinProbVarianceMax` (±5). Absent, pas `0`, quand aucun historique de probabilité de victoire n'a été fourni ou qu'il n'en restait trop peu d'utilisable. |
| `reason` | `string` | Se rabat sur `scorerTunables.reasons.fallback` (« best game available ») quand il est absent ou que ce n'est pas une chaîne. |
| `onBreak?` | `boolean` | Absent se lit comme `false`. `normalizePowerScoreResult` le fait passer quand c'est un booléen. |
| `breakPenalty?` | `number` | Les points retirés, toujours ≥ 0. Absent, pas `0`, quand aucun n'a été fourni. `computePowerScore` ne le définit pas. |
| `signalsSubtotal?` | `number` | La somme des cinq signaux avant la pénalité de pause, de 0 à `scoreMaxSignalsSubtotal` (156). |
| `favoriteBonus?`, `favoriteTeamCount?`, `gameBoost?`, `scoringOpportunityBoost?`, `postseasonBoost?` | `number` | Non calculés par `computePowerScore`. Absents à moins qu'un appelant les fournisse. |

`scoreGame` intègre pour toi les bonus de favori, de phases finales et de match, donc tu n'as jamais besoin de construire un `PowerScoreResult` à la main avec lui. Tout ce que la 2.x exporte encore est listé dans [la référence de l'API](/arenaswap/docs/powerscore/api-reference/#the-2x-api).
