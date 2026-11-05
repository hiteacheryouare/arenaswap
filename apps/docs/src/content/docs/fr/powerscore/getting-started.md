---
sourceHash: '1cae3a43d11e'
title: Calculer le score de ton premier match avec PowerScore
navLabel: Démarrer
description: Installe le paquet powerscore et calcule le score d'un match en direct avec scoreGame en quelques lignes de code, jusqu'à obtenir un nombre et une raison que tu vois dans ton terminal.
section: powerscore
order: 1
faq:
  - q: powerscore a-t-il besoin d'une clé d'API ou d'un compte ?
    a: Non. Il ne calcule que l'état du match que tu lui donnes. Récupérer cet état, d'où que viennent tes scores, c'est le travail de ton propre code.
  - q: powerscore fonctionne-t-il dans le navigateur ?
    a: Oui. Il n'a aucune dépendance à l'exécution et ne touche qu'à des objets simples et à des maths. Il s'intègre dans une extension de navigateur comme il tourne dans Node.
  - q: Dois-je réécrire mon code 2.x pour PowerScore 3 ?
    a: Non. computePowerScore et les types 2.x fonctionnent toujours et renvoient les mêmes totaux qu'avant. Passe à scoreGame quand tu veux les modes ou les nouveaux bonus.
---

Cette page installe `powerscore` et calcule le score d'un match en direct, jusqu'à obtenir un nombre et les raisons qui le justifient.

## Installer le paquet

```bash
npm install powerscore
```

Le paquet est aussi sur [npm](https://www.npmjs.com/package/powerscore). Pour le voir noter les vrais matchs de ce soir, va sur la [page PowerScore](/arenaswap/powerscore/).

## Décrire le match

`scoreGame` a besoin d'un objet `Game` : les deux scores, la ligue et le sport, et où en est le match maintenant. Mets `status: 'in'` pour un match en direct, puisque c'est ce que les bonus vérifient avant de rapporter quoi que ce soit.

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

Boston mène de deux points à 45 secondes de la fin du quatrième quart-temps. C'est serré, et c'est tard : exactement ce que cherche PowerScore.

## Calculer le score

```ts
const score = scoreGame(game);
console.log(score.total);
console.log(score.reason);
```

Lance ça, et le terminal affiche :

```text
68
BOS up 2 with 0:45 left
```

`scoreGame` prend deux autres arguments, tous deux facultatifs : un `context` pour tout ce que le match ne contient pas (historique du score, probabilité de victoire, la ligne d'avant-match, un effectif fantasy) et `options` pour la façon de calculer (quel mode, quels signaux désactiver). Sans aucun des deux, tu obtiens Classique, le mode qui demande si un match est serré et tardif.

## Lire la décomposition

`score` contient plus que le nombre principal. Chaque signal y figure comme une entrée de liste avec ses propres points et son plafond, avec les bonus et les raisons.

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

Ici, l'écart serré et la pression de fin de match font tout le score. Sans historique du score à regarder, l'élan, les changements de tête et la remontée n'ont encore rien à mesurer, donc ils restent à 0. Donne un `history` à `scoreGame` dans le contexte et ils se réveillent. Les bonus sont dans `score.boosts`, tous à 0 pour ce match, parce qu'un match de basketball n'a ni coureurs, ni zone rouge, ni gardien retiré à récompenser.

Utilise `signalPoints(score, 'momentum')` et `boostPoints(score, 'noHitter')` pour en retrouver un par son identifiant.

## Essayer un autre mode

Le même match peut répondre à une autre question. Les modes se choisissent avec `options.mode` :

```ts
scoreGame(game, {}, { mode: 'blowouts' }).total; // 20
```

Raclées demande si quelqu'un file vers la victoire. Un match à 2 points d'écart non, donc il obtient 30 % de son 68 en Classique, pas plus. Ce plancher garde un match serré éligible un soir sans carton. Fantasy demande si quelque chose est sur le point d'arriver à tes joueurs. [La page des signaux](/arenaswap/docs/powerscore/signals/) couvre les trois.

Pour noter un match que ton propre code interroge en continu, lis [Calculer le score d'un match à partir de données en direct](/arenaswap/docs/powerscore/scoring-a-game/). Pour ce que mesure chaque signal et pourquoi, lis [Les signaux PowerScore dans chaque mode](/arenaswap/docs/powerscore/signals/).
