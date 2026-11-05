---
sourceHash: '91a61d4e6782'
title: Référence de l'API de PowerScore
navLabel: Référence de l'API
description: Chaque fonction et chaque constante exportées par powerscore, avec sa signature, ses paramètres, sa valeur de retour et son comportement quand une entrée manque ou est invalide. Inclut l'API 2.x dépréciée.
section: powerscore
order: 6
---

Tout ce qui est ici est exporté depuis la racine du paquet : `import { ... } from 'powerscore'`. Les fonctions 3.0 viennent d'abord, puis les utilitaires, les pièces dont sont faits les modes intégrés, les constantes, et enfin l'API 2.x, dépréciée mais qui fonctionne exactement comme avant. Les types sont dans [les types TypeScript de PowerScore](/arenaswap/docs/powerscore/types/).

## Calcul du score

### scoreGame

```ts
function scoreGame(
	game: Game<string>,
	context?: ScoringContext,
	options?: ScoreOptions,
): PowerScore
```

Le point d'entrée principal. Note un match dans un mode et renvoie un [`PowerScore`](/arenaswap/docs/powerscore/types/#powerscore) : le total, chaque signal et chaque bonus sous forme de liste, et les raisons.

| Paramètre | Par défaut | Notes |
|---|---|---|
| `game` | obligatoire | L'état actuel du match. Seuls `id`, `league`, `sportType` et les deux scores sont obligatoires. |
| `context` | `{}` | L'historique, la probabilité de victoire, la ligne d'avant-match, l'effectif fantasy et tout le reste que le match ne porte pas. Voir [`ScoringContext`](/arenaswap/docs/powerscore/types/#scoringcontext). |
| `options` | `{}` | Quel mode, quels signaux désactiver, et les bonus de favori, de phases finales et manuel. Voir [`ScoreOptions`](/arenaswap/docs/powerscore/types/#scoreoptions). |

Ne lève jamais d'erreur sur un champ facultatif manquant : la partie du moteur qui en a besoin marque 0. Une `league` non reconnue est notée avec les valeurs par défaut de son sport. Une valeur non finie n'importe où dans les entrées est traitée comme absente, au lieu d'être propagée en `NaN`.

Un match figé (`intermission` ou `delayed`) marque 0 partout, bonus compris, et `reason` est vide. `game.status` n'est lu que par les bonus, qui ne versent rien à moins qu'il vaille `'in'`.

Le total se construit dans un ordre fixe :

1. Les signaux marquent. Les signaux désactivés sont retirés de l'échelle.
2. La déduction de pause est retirée.
3. Le modificateur de probabilité de victoire est ajouté (Classique seulement). Le résultat est ramené entre 0 et 100.
4. Les bonus propres au mode sont ajoutés, dans leurs plafonds de groupe, et le total est plafonné à 100.
5. Si le mode se mélange avec Classique (plancher, mélange ou bonus), c'est ici que ça se passe.
6. Les bonus de favori et de phases finales sont ajoutés, et le total est de nouveau plafonné à 100. Un mode avec `paysPostseason: false` saute le bonus de phases finales.
7. `gameBoost` est ajouté en dernier. C'est la seule chose autorisée à dépasser 100.

```ts
const score = scoreGame(game, { history }, { mode: 'blowouts' });
score.total;  // 0–100
score.reason; // 'BOS on a 12–0 run. Up 28 in the 3rd quarter'
```

### signalPoints et boostPoints

```ts
function signalPoints(score: Pick<PowerScore, 'signals'>, id: string): number
function boostPoints(score: Pick<PowerScore, 'boosts'>, id: string): number
```

Retrouvent une entrée d'un résultat par son identifiant. Les deux renvoient `0` pour un identifiant absent.

### createSignalInput

```ts
function createSignalInput(
	game: Game<string>,
	context: ScoringContext,
	options?: ScoreOptions,
): SignalInput
```

Construit le [`SignalInput`](/arenaswap/docs/powerscore/types/#signalinput) que reçoit le `compute` d'un signal ou d'un bonus : le match, le contexte, la configuration du sport et de la ligue résolue, `progress`, `now` et `margin`. C'est ce que `scoreGame` appelle en interne, exporté pour qu'un signal que tu écris puisse être testé seul.

## Modes

### defineMode

```ts
function defineMode(mode: PowerScoreMode): PowerScoreMode
```

Vérifie un mode une fois, d'emblée, et le renvoie inchangé. Lève une erreur si deux signaux partagent un identifiant, si le plafond d'un signal n'est pas positif, ou si le mode n'a aucun signal.

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

Le `compute` d'un signal reçoit le match, le contexte, la configuration du sport et de la ligue résolue, le `progress` du match (0 au début, 1 à la fin du temps réglementaire et pendant les prolongations) et la `margin`. Il renvoie `points`, limités au plafond, et une `reason` facultative. Un mode peut aussi porter des `boosts`, des `bucketCaps`, un `classicBlend`, `paysPostseason` (`true` par défaut ; `false` retient le bonus de phases finales) et un `appliesTo(game, context)` qui envoie à Classique les matchs sur lesquels il n'a rien à dire.

`reasonPriority` liste les signaux dont les raisons peuvent être lues. Le plus fort d'entre eux parle, et l'ordre départage les égalités. Une clé de raison que connaissent les modes intégrés s'affiche en anglais dans `score.reason`. Une clé à toi s'affiche telle quelle, donc traduis à partir de `score.reasons`, pas de la chaîne.

### classicMode, blowoutsMode, fantasyMode, builtInModes et getMode

`classicMode`, `blowoutsMode` et `fantasyMode` sont les trois objets `PowerScoreMode` intégrés. `builtInModes` est ce même trio indexé par identifiant, et `getMode(idOrMode)` résout un identifiant, un objet mode ou rien (ce qui donne Classique). Étale-en un pour construire dessus. Pour obtenir Classique sans les bonus 3.0 :

```ts
scoreGame(game, context, { mode: { ...classicMode, boosts: [] } });
```

### Signaux et bonus

Les pièces dont sont faits les modes intégrés sont exportées aussi, pour qu'un mode personnalisé puisse les réutiliser :

| Export | Ce que c'est |
|---|---|
| `classicSignals`, `blowoutsSignals`, `fantasySignals` | La liste de signaux de chaque mode. |
| `closenessSignal`, `lateGameSignal`, `momentumSignal`, `leadChangesSignal`, `comebackSignal` | Les cinq de Classique, un par un. |
| `scoringOpportunityBoost`, `goAheadRunBoost`, `twoMinuteDrillBoost`, `noHitterBoost`, `redCardBoost`, `upsetWatchBoost`, `upsetRoutBoost`, `stakesBoost` | Le `BoostDefinition` de chaque bonus. Ce que verse chacun est dans [Bonus et pénalités](/arenaswap/docs/powerscore/boosts-and-penalties/). |
| `underdogProbability(line, sportType, league)` | Les chances de l'outsider avant le match, à partir d'un `PregameLine`. `undefined` quand la ligne ne peut pas le dire. |
| `postseasonBoostShare(round)` | La part du bonus de phases finales qu'un tour rapporte : 1, 0.75, 0.5, 0.25, ou 0 sans tour. |
| `applyProgressFloor`, `findLeadChanges` | Les deux utilitaires derrière Serré et les changements de tête. |
| `baseMask(baseRunners)`, `runnersOn(mask)` | Les bases sous forme d'un nombre de 3 bits, première base en bit de poids faible (`0b101` veut dire coureurs sur la première et la troisième), et combien de coureurs ça fait. |

## Raisons

```ts
function renderReasonEnglish(fragment: ReasonFragment): string
function renderReasonsEnglish(fragments: readonly ReasonFragment[]): string
```

Rendent une phrase de raison, ou une liste de raisons jointes en phrases, en anglais. C'est ce qui remplit `score.reason`. Utilise-les quand tu construis tes propres raisons et que tu veux qu'elles se lisent de la même façon. `ordinal(n)` donne l'ordinal anglais qu'elles emploient (« 2nd », « 11th », « 21st »).

## Configuration et progression

```ts
function resolveSportConfig(sportType: SportType, override?: Partial<SportTypeConfig>): SportTypeConfig
function resolveLeagueConfig(game: Pick<Game<string>, 'league' | 'sportType'>, override?: Partial<LeagueConfig>): LeagueConfig
function getGameProgress(game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number
function scoreMargin(game: Game<string>): number
```

`resolveSportConfig` et `resolveLeagueConfig` font ce que `scoreGame` fait au début de chaque appel. Un `sportType` inconnu se rabat sur le réglage du basketball. Une ligue inconnue se rabat sur la ligue la plus connue de son sport : la NBA pour le basketball, la NHL pour le hockey, la MLB pour le baseball, la NFL pour le football américain, le softball NCAA et la MLS pour le soccer. `getGameProgress` vaut 0 au début, 1 à la fin du temps réglementaire et pendant les prolongations. `scoreMargin` est l'écart absolu au score.

## Score fantasy

Le signal Points fantasy de Fantasy veut des points fantasy. Ces fonctions transforment une ligne de boxscore en points. Tu nommes les statistiques, elles les notent.

### computeFantasyPoints

```ts
function computeFantasyPoints(
	sport: FantasySport,
	stats: Partial<Record<string, number>>,
	overrides?: Partial<Record<string, number>>,
): number
```

Renvoie le total d'une ligne de statistiques, arrondi à deux décimales. Les statistiques inconnues et les valeurs non finies sont ignorées. Les `pointsAllowed` d'une défense sont notés par paliers.

```ts
import { computeFantasyPoints } from 'powerscore';

computeFantasyPoints('football', {
	passingYards: 310,
	passingTouchdowns: 3,
	interceptionsThrown: 1,
	rushingYards: 22,
}); // 12.4 + 12 − 2 + 2.2 = 24.6
```

### defaultFantasyScoring, resolveFantasyScoring et fantasySportOf

`defaultFantasyScoring` contient les règles par défaut pour `'football'` (PPR complet), `'basketball'`, `'baseball'` et `'hockey'`. Chaque règle est `{ points, min, max }`, pour qu'un écran de paramètres puisse faire respecter les bornes.

```ts
defaultFantasyScoring.football.receptions; // { points: 1, min: 0, max: 2 }
```

`resolveFantasyScoring(sport, overrides?)` renvoie les règles sous forme de simples nombres. Un remplacement est limité aux bornes de sa règle, et une règle qui n'existe pas est ignorée.

```ts
resolveFantasyScoring('football', { receptions: 0.5 }).receptions; // 0.5, half PPR
resolveFantasyScoring('football', { receptions: 5 }).receptions;   // 2, held to its bound
```

`fantasySportOf(sportType)` associe un `sportType` à l'un des quatre sports fantasy. Le softball compte comme du baseball, et le soccer n'en a aucun, donc il renvoie `undefined`.

## Constantes

| Constante | Valeur |
|---|---|
| `scoreMaxCloseness` | 42 |
| `scoreMaxLateGame` | 38 |
| `scoreMaxMomentum` | 38 |
| `scoreMaxLeadChanges` | 18 |
| `scoreMaxComeback` | 20 |
| `scoreMaxSignalsSubtotal` | 156 (la somme des cinq plafonds de Classique) |
| `scoreMaxTotal` | 100 |
| `breakPenalty` | 15, la déduction fixe tant que `context.onBreak` vaut `true` |
| `scoreWinProbVarianceMax` | 5 |
| `boostBucketCaps` | `{ moment: 20, noHitter: 70, context: 16 }` |

Pourquoi les plafonds de Classique dépassent le plafond de 100 points est expliqué dans [Les signaux de PowerScore dans chaque mode](/arenaswap/docs/powerscore/signals/#why-the-ceilings-add-up-to-more-than-the-total). Les plafonds sont expliqués dans [Bonus et pénalités](/arenaswap/docs/powerscore/boosts-and-penalties/#caps-on-the-buckets).

`scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` et `thirdAndShortDistance` contiennent les valeurs exactes derrière le bonus d'occasion de marquer, tabulées dans [Bonus et pénalités](/arenaswap/docs/powerscore/boosts-and-penalties/). Les bonus plus récents gardent leurs nombres dans `goAheadRunTunables`, `twoMinuteDrillTunables`, `noHitterTunables`, `redCardTunables`, `upsetTunables`, `stakesTunables` et `hockeyTunables`.

`scorerTunables` contient chaque valeur de palier avec laquelle le moteur note, les mêmes nombres que les constantes ci-dessus donnent déjà par leur nom, pour qu'un consommateur puisse lire la valeur d'un palier au lieu de la coder en dur.

`sportTypeConfigs`, `sportTypeConfigMap`, `leagueConfigs`, `leagueConfigMap` et `allLeagueIds` contiennent le réglage des sports et des ligues que le moteur lit à chaque appel. Leurs champs et les vraies valeurs de chaque sport et de chaque ligue sont dans [Configuration des sports et des ligues](/arenaswap/docs/powerscore/configuration/).

## L'API 2.x

Toujours exportée, toujours fonctionnelle, et marquée dépréciée là où c'est indiqué. Rien ici n'a été retiré en 3.0. Passe à `scoreGame` quand tu veux les modes ou les nouveaux bonus. D'ici là, ces fonctions renvoient les nombres qu'elles ont toujours renvoyés.

### computePowerScore

```ts
function computePowerScore(
	game: Game,
	history?: ScoreSnapshot[],
	winProbabilityHistory?: number[],
): PowerScoreResult
```

Dépréciée. Note les cinq signaux de Classique, applique le modificateur de probabilité de victoire, et renvoie le `PowerScoreResult` à plat (`closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback`, `total`, `reason` et compagnie). C'est `scoreGame` en Classique avec les signaux seulement, mis à plat, donc sans aucun des bonus de moment.

| Paramètre | Par défaut | Notes |
|---|---|---|
| `game` | obligatoire | L'état actuel du match. |
| `history` | `[]` | Les instantanés de score récents. L'élan, les changements de tête et la remontée restent à 0 tant qu'il ne contient pas au moins 3 entrées. |
| `winProbabilityHistory` | `[]` | Les valeurs récentes de probabilité de victoire, de 0 à 1. Demande au moins 5 entrées finies pour contribuer à quoi que ce soit. |

Ne lève jamais d'erreur. Renvoie aussitôt un résultat entièrement à zéro quand `isPlayFrozen(game)` est vrai. Ne vérifie pas `game.status` : un match `'pre'` ou `'post'` marque comme un match `'in'`, à autres champs égaux.

### computeScoringOpportunityBoost

```ts
function computeScoringOpportunityBoost(game: Game<string>): number
```

Dépréciée : le nombre est dans la liste `boosts` de `scoreGame` sous `scoringOpportunity`. Renvoie `0` à moins que `game.status === 'in'` et que le match ne soit pas figé. Sinon renvoie de 0 à 10 pour le baseball et le softball, selon le nombre de coureurs, ou de 0 à 15 pour le football américain, selon l'écart en zone rouge et le down. Renvoie `0` pour tout autre `sportType`, hockey compris, puisque son avantage numérique et son filet désert viennent de `context`, que cette fonction ne prend pas. Non incluse dans le `total` de `computePowerScore`.

### computeWinProbVarianceScore

```ts
function computeWinProbVarianceScore(winProbHistory: number[]): number | undefined
```

Associe un historique de probabilité de victoire au modificateur ±5. Écarte d'abord les entrées non finies, puis renvoie `undefined` s'il reste moins de 5 valeurs finies. Sinon renvoie un entier de `-scoreWinProbVarianceMax` à `scoreWinProbVarianceMax`.

### isPlayFrozen

```ts
function isPlayFrozen(game: Game<string>): boolean
```

Renvoie `true` quand `game.intermission === true` ou `game.delayed === true`, et `false` sinon, y compris quand les deux champs sont absents.

### computeGameProgress

```ts
function computeGameProgress(game: Game<string>): number
```

Où en est le match dans le temps réglementaire, de 0 à 1, à partir de la même horloge que lit le signal Fin de match. Pratique pour dessiner un match sur une frise chronologique.

### normalizePowerScoreResult

```ts
function normalizePowerScoreResult(
	score: Partial<PowerScoreResult> & Pick<PowerScoreResult, 'gameId'>,
	options?: { allowTotalOverflow?: boolean },
): PowerScoreResult
```

Dépréciée. Prend un `PowerScoreResult` partiel, éventuellement non fiable (seul `gameId` est obligatoire) et renvoie un résultat valide, entièrement borné. `computePowerScore` l'appelle en interne sur chaque résultat qu'il produit.

Chacun des cinq champs de signal est limité à son propre plafond. `total` est limité à `scoreMaxTotal` à moins que `options.allowTotalOverflow` vaille `true`. Avec cette option, il n'est limité qu'à un minimum de `0`, ce qui permet à un bonus manuel de le pousser au-delà de 100 exprès. Un `total` manquant ou non fini se rabat sur la somme des cinq signaux moins `breakPenalty`, pas sur la somme brute. `reason` se rabat sur `scorerTunables.reasons.fallback` (« best game available ») quand ce n'est pas une chaîne. `favoriteBonus`, `favoriteTeamCount`, `gameBoost`, `scoringOpportunityBoost` et `postseasonBoost` sont arrondis et plancher à `0` quand ils sont fournis. Quand ils ne le sont pas, ils sont carrément omis du résultat, pas mis à `0` par défaut. Ne lève jamais d'erreur.

### Ce qui change si tu migres

Classique via `scoreGame` inclut les nouveaux bonus, donc un même match peut y marquer plus que dans `computePowerScore`, jusqu'aux plafonds de groupe. Les bonus de favori, de phases finales et manuel que tu ajoutais à la main autour de `normalizePowerScoreResult` sont maintenant des options de `scoreGame`. Tout le reste est repris tel quel. Le type `Game` a gagné des champs facultatifs et un paramètre de type pour la ligue, et un `Game` seul veut dire ce qu'il voulait dire. Un identifiant de ligue que la table ne connaît pas était noté avec la configuration de la NBA quel que soit le sport. Maintenant il reçoit les valeurs par défaut de son propre sport, donc un match de hockey dans une ligue inconnue reçoit les périodes et le chrono de la NHL.
