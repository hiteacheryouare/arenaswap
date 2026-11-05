---
sourceHash: 'd23f4e1a7b17'
title: Calculer le score d'un match à partir de données en direct
description: Fais correspondre ton propre flux à un objet Game, garde un historique du score entre les interrogations, active les bonus et les modes que tes données permettent, et ajoute des bonus de favori et manuels.
section: powerscore
order: 2
navLabel: Score à partir de données en direct
faq:
  - q: scoreGame vérifie-t-il qu'un match est vraiment en direct ?
    a: Seuls les bonus le font. Ils ne rapportent rien tant que le statut du match n'est pas 'in'. Les signaux notent quand même un match qui n'a pas commencé ou qui est terminé, et un match en pause ou en interruption vaut 0. Filtre d'abord les matchs en direct toi-même, comme le fait ArenaSwap avant d'appeler le calcul.
  - q: Puis-je utiliser PowerScore avec des ligues qu'il ne liste pas ?
    a: Oui. Game est générique sur l'identifiant de ligue, et un identifiant que la table intégrée ne connaît pas est noté avec les valeurs par défaut de son sport. Remplace le nombre et la durée des périodes à chaque appel avec options.league si les valeurs par défaut ne conviennent pas.
---

`scoreGame` ne récupère rien. Il note l'objet `Game` et le contexte que tu lui donnes. Cette page construit les deux à partir d'un flux inventé, puis active davantage du moteur selon ce que permettent tes données.

## Faire correspondre ton flux à un Game

Seuls `id`, `league`, `sportType` et les deux scores d'équipe sont obligatoires. Tout le reste affine le score quand ton flux l'a, et compte comme inconnu sinon. Fais correspondre ce que tu as, et laisse le reste.

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

Renseigne `status` honnêtement. `'in'` est ce que les bonus vérifient avant de rapporter quoi que ce soit. Un indicateur `intermission` ou `delayed` met tout le score à 0 jusqu'à la reprise du jeu, donc un match en pause pub ou en interruption pour la pluie ne peut pas dépasser un match en cours.

## Donne-lui plus, et plus de choses s'activent

Chaque champ facultatif active la partie du moteur qui en a besoin. Omets-en un et cette partie vaut 0. Rien ne lève d'erreur.

| Donne-lui | Dans | Et ceci s'active |
|---|---|---|
| Des instantanés du score, du plus ancien au plus récent | `context.history` | Élan, Changements de tête, Remontée. Il faut au moins 3 instantanés. |
| La probabilité de victoire, de 0 à 1 par interrogation | `context.winProbability` | Le modificateur de probabilité de victoire de ±5. Il faut au moins 5 valeurs. |
| Si le match est en pause pub | `context.onBreak` | La déduction de pause. |
| `possession`, `yardsToEndZone`, `down`, `distance` et `timeouts` sur l'équipe | `game`, `game.homeTeam` | Le two-minute drill et la situation de football américain de Fantasy. |
| `isRedZone`, plus `down`, `distance` et `isGoalToGo` | `game` | Le bonus de zone rouge. |
| `baseRunners`, `outs`, `topOfInning` | `game` | Les coureurs sur les bases et le point de l'avance. |
| `hits` pour chaque équipe | `game.homeTeam`, `game.awayTeam` | Le no-hitter. |
| `series`, et `rank` pour chaque équipe | `game`, `game.homeTeam` | Enjeu : une série au bord du gouffre, deux équipes classées. |
| `context.stakes` | `context` | Enjeu : une course de fin de saison. |
| `pregameLine` | `context` | Alerte surprise. Utilise la ligne d'avant le match. |
| `redCards` | `game` | Le bonus de carton rouge, soccer. |
| `powerPlay`, `emptyNet` | `context` | L'occasion de marquer au hockey. |
| `fantasy` | `context` | Le mode Fantasy. |
| `nickname` pour chaque équipe | `game.homeTeam`, `game.awayTeam` | Les noms d'équipe dans `reason`, à la place de l'abréviation. |
| `seasonType`, `postseasonRound` | `game` | Enjeu lit le match comme de la postseason (une série) plutôt que de la saison régulière (classements et courses). |
| `recentLeadChanges` | `context` | Un nombre de changements de tête tiré du journal des actions de ton flux, pour les renversements entre deux interrogations. |

Tous les champs sont sur [la page des types](/arenaswap/docs/powerscore/types/#game), et ce que rapporte chaque bonus est dans [Bonus et pénalités](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Garder un historique du score pour l'élan, les changements de tête et la remontée

Ces trois signaux lisent `context.history`, une liste des scores passés d'un match, et restent à 0 tant qu'elle n'a pas au moins trois instantanés. Garde-en un à chaque interrogation, dans l'ordre, du plus ancien au plus récent, avec un horodatage en millisecondes. Les horodatages doivent seulement être relatifs entre eux. Ils n'ont pas besoin d'être l'heure réelle.

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

Boston était mené de 5 et vient de prendre la tête sur une série de 13-2 :

```ts
score.total;  // 86
score.reason; // 'BOS came back from 5 down to lead. Up 6 in the 3rd quarter'
// closeness 18, lateGame 2, momentum 38, leadChanges 12, comeback 16
```

Supprime les instantanés plus vieux que le `historyWindowMs` du sport pour que le tableau ne grossisse pas indéfiniment. Cette fenêtre, et le reste des réglages propres à chaque sport, sont dans [Configuration des sports et des ligues](/arenaswap/docs/powerscore/configuration/).

## Suivre les pauses et la probabilité de victoire, si tu les as

Tout ça va dans le contexte. Si tu peux dire quand un match est en pause pub, passe `onBreak` :

```ts
const score = scoreGame(game, { history, onBreak: isInBreak(game), winProbability });
```

`isInBreak` est à écrire par toi, à partir de ce que dit ton flux sur les pauses entre manches, les changements de lanceur et les temps morts. Tant que `onBreak` vaut `true`, le score perd 15 points fixes.
`winProbability` est une liste de valeurs récentes de probabilité de victoire de 0 à 1, pour l'une ou l'autre équipe. Seule compte la distance à 50 %. Les deux sont facultatifs, et PowerScore calcule très bien sans. Ce que chacun change est dans [Bonus et pénalités](/arenaswap/docs/powerscore/boosts-and-penalties/).

## Laisser les bonus voir le moment

Le baseball, le football américain, le hockey et le soccer portent chacun une situation que le score seul ne montre pas. Ajoute les champs que ton flux a, et `scoreGame` les paie. Voici un match de baseball en bas de la 9e, à égalité, buts remplis, un retrait :

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

Ces deux-là réunis remplissent le plafond de 20 de la catégorie des moments. Le football américain tire la zone rouge de `isRedZone`, pondérée par `down`, `distance` et `isGoalToGo`, et le two-minute drill de `possession`, `yardsToEndZone` et `down`. L'occasion de marquer au hockey a besoin de `context.powerPlay` et `context.emptyNet`. Le soccer a besoin de `redCards`.

## Calculer dans un autre mode

Choisis un mode avec `options.mode`. Raclées n'a besoin de rien de plus. Fantasy a besoin de ton effectif dans le contexte, une entrée par joueur :

```ts
const score = scoreGame(game, {
	history,
	fantasy: [
		{ id: 'p-1', name: 'Mahomes', side: 'home', position: 'QB' },
		{ id: 'p-2', name: 'Butker', side: 'home', position: 'K', pointEvents: [{ at: now - 40_000, points: 3 }] },
	],
}, { mode: 'fantasy' });
```

`pointEvents` est la façon dont Points fantasy voit un joueur marquer des points fantasy il y a une minute. Pour transformer une ligne de boxscore en ces points, utilise [`computeFantasyPoints`](/arenaswap/docs/powerscore/api-reference/#computefantasypoints). Un match sans aucun de tes joueurs est noté en Classique, et `score.modeId` l'indique.

## Ajouter des bonus de favori, de postseason et manuels

Calcule d'abord le score du match, et laisse les options ajouter ce que PowerScore ne sait pas, comme l'équipe favorite d'un spectateur. Les mêmes options fonctionnent dans tous les modes.

```ts
const score = scoreGame(game, { history }, {
	favoriteTeamCount: 1,
	favoriteBoostPoints: 10,
	gameBoost: 10,
});

score.total; // 106
```

Les bonus de favori et de postseason sont ajoutés au total et plafonnés à 100. `gameBoost` est ajouté après, et c'est la seule chose autorisée à dépasser 100, donc un match épinglé par un spectateur peut battre un score parfait. Un match figé les ignore tous : un match arrêté ne peut pas dépasser un match en cours.

Le [code de calcul](https://github.com/hiteacheryouare/arenaswap/blob/mega/packages/core/src/scoring.ts) d'ArenaSwap construit ses options de la même façon avant de passer les scores au changeur d'onglet.

## La méthode 2.x

`computePowerScore(game, history, winProbabilityHistory)` fonctionne toujours et renvoie le résultat 2.x à plat, sans bonus de moment. C'est le bon choix si tu veux seulement le nombre que tu as toujours eu. [La référence de l'API](/arenaswap/docs/powerscore/api-reference/#the-2x-api) liste tout ce qui est encore là.
