---
sourceHash: '1aa0123b3860'
title: Les signaux de PowerScore dans chaque mode
description: Les signaux derrière PowerScore en mode Classique, Raclées et Fantasy, avec le plafond de chacun, ce qu'il mesure et ce qu'il ignore. Et comment désactiver des signaux.
section: powerscore
order: 3
navLabel: Signaux par mode
---

Un signal mesure une seule chose dans un match et ignore tout le reste, y compris les autres signaux de son mode. Un mode est une liste de signaux plus les bonus qui lui conviennent. PowerScore 3 en livre trois, et chacun pose une question différente.

| Mode | La question | Signaux (plafond) |
|---|---|---|
| `'classic'` (par défaut) | Est-ce serré, tardif et en train de basculer ? | Serré 42, Fin de match 38, Élan 38, Changements de tête 18, Remontée 20 |
| `'blowouts'` | Quelqu'un est-il en train de tout écraser ? | Écart 50, Avance tenue 30, Raclée précoce 25, Une couche de plus 15 |
| `'fantasy'` | Va-t-il arriver quelque chose à mes joueurs ? | Dans l'action 50, Points fantasy 35, Tes joueurs 15 |

Choisis-en un avec `options.mode`. Dans les identifiants tels qu'ils apparaissent dans `score.signals`, ça donne `closeness`, `lateGame`, `momentum`, `leadChanges`, `comeback` ; `blowoutMargin`, `sustained`, `timing`, `pileOn` ; et `situation`, `production`, `exposure`.

Raclées et Fantasy ne remplacent pas Classique. Chacun s'appuie dessus, donc un match qui n'a rien à dire dans le nouveau mode garde quand même un score cohérent. [Comment les modes se mélangent](#how-the-modes-blend-with-classic) détaille le calcul.

## Pourquoi les plafonds totalisent plus que le total

Les plafonds de Classique font 156 au total, et le total est plafonné à 100. Une échelle qui ne distribuerait jamais que 60 de ses 100 points gaspillerait les 40 autres sur des matchs qui ne peuvent jamais atteindre le sommet. Faire dépasser la somme des plafonds par rapport au plafond garde chaque point en jeu. Un match serré où la tête change de main et où une équipe est sur une série cumule plusieurs signaux près de leur propre maximum en même temps, et atteint les 80 ou 90 bien avant la sirène finale. Un vrai classique, à égalité tard dans le match avec une série derrière lui, sature à 100. Un match terne score quand même bas, parce qu'aucun de ses signaux ne se déclenche au départ.

Même chose pour Raclées (120) et Fantasy (100). Les sommes sont `scoreMaxSignalsSubtotal` pour Classique et `signalCeiling` sur tout résultat `PowerScore` pour le mode qui l'a noté.

## Désactiver un signal

Passe son identifiant dans `options.disabledSignals`. Les signaux encore actifs sont remis à l'échelle sur toute la plage du mode, donc un mode avec un signal désactivé couvre toujours de 0 à 100 au lieu de plafonner trop tôt. Désactive-les tous et il n'y en a plus aucun : il n'y a plus rien sur quoi remettre à l'échelle.

```ts
scoreGame(game, context, { disabledSignals: ['momentum', 'comeback'] });
```

Chaque entrée de `score.signals` porte `disabled: true` quand tu as fait ça, pour qu'une décomposition puisse la griser. Quand un mode se mélange avec Classique, `options.classicDisabledSignals` est la propre liste de désactivation de Classique.

## Classique

Le modèle 2.x, avec les bonus de moment de [Bonus et pénalités](/arenaswap/docs/powerscore/boosts-and-penalties/) ajoutés par-dessus.

### Serré

Plafond : `scoreMaxCloseness`, 42.

Compare l'écart au score à des seuils propres à chaque sport pour choisir un palier, puis met ce palier à l'échelle selon l'avancement du match. La courbe atteint l'essentiel de sa valeur à la mi-match au lieu d'attendre la sirène finale : `floor + (tierCeiling − floor) × progress^0.55`. Un petit plancher fixe de 12 est toujours versé, limité au plafond du palier. Un match à égalité dans la première minute signifie déjà quelque chose grâce à lui.

Les plafonds par palier :

| État | Basketball | Football américain | Hockey et soccer | Baseball et softball | Plafond |
|---|---|---|---|---|---|
| Égalité | | | | | 42 |
| Serré | ≤ 5 points | ≤ 3 points | ≤ 1 but | ≤ 1 point | 34 |
| Proche | ≤ 10 points | ≤ 9 points | ≤ 2 buts | ≤ 3 points | 20 |
| En marge | ≤ 18 points | ≤ 14 points | ≤ 3 buts | ≤ 5 points | 8 |
| Hors de portée | > 18 points | > 14 points | > 3 buts | > 5 points | 0 |

Le 0-0 est noté à part d'une égalité ordinaire, parce qu'au début il veut généralement dire que rien ne s'est encore passé plutôt que le match est disputé. Le hockey accorde le plein crédit d'égalité au 0-0 à partir de la troisième période, et le soccer à partir de la seconde mi-temps. Avant ça, et dans tous les autres sports, le 0-0 gagne un plafond réduit de 22.

**À dix.** Au soccer, une équipe réduite à dix qui protège une avance d'un but encaisse bien plus souvent qu'une équipe complète. Le match est donc plus serré que le score ne le dit, et Serré ajoute 4 points (toujours plafonnés à 42) tant que c'est la situation. C'est le seul endroit où un carton rouge touche un signal. Le bonus de carton rouge est séparé, et il est dans [Bonus et pénalités](/arenaswap/docs/powerscore/boosts-and-penalties/#red-card).

Ce que Serré ignore : quelle équipe mène, et le niveau absolu du score. Un match à 2 points d'écart à 12-10 vaut la même chose qu'à 112-110, parce que Serré ne regarde que le nombre au tableau en ce moment.

### Fin de match

Plafond : `scoreMaxLateGame`, 38.

Monte de façon quasi linéaire sur toute la dernière période d'un match serré, au lieu de monter d'un coup dans les dernières secondes. La tension monte régulièrement au lieu d'arriver d'un seul coup. Le plafond vers lequel il monte dépend de la proximité du match, parce qu'un match à 30 points d'écart à la dernière minute n'a plus de tension à construire :

| Écart | Plafond à la sirène |
|---|---|
| Égalité, serré ou proche | 36 |
| En marge | 22 |
| Hors de portée | 15 |

Les matchs à égalité dépassent 36 dans la dernière minute, vers un pré-bonus de prolongation qui plafonne à 38. Il distingue un match qui file vers des prolongations d'un match simplement serré. Les prolongations et les manches supplémentaires versent directement les 38 complets, jusqu'à ce qu'une avance construite à l'intérieur dépasse l'écart serré du sport. Ils versent alors le même plafond qu'un match en temps réglementaire avec cet écart, donc un haut de 10e avec cinq points d'avance est plafonné là où l'est une 9e avec cinq points d'avance.

Le baseball et le softball n'ont pas de chrono, donc la même rampe conditionnée par le Serré se déroule sur les manches. Elle démarre à la 6e manche au baseball, ou à la 5e au softball, et atteint son plafond à la fin du temps réglementaire.

Le soccer ne dit jamais « prolongation ». Le temps supplémentaire affiche *Égalité en prolongation*, une séance affiche *Tirs au but*, et un match à égalité tard affiche *Égalité à la 85e minute*. Un nul est un résultat de championnat ordinaire, pas une étape vers la prolongation. Le pré-bonus s'applique quand même, parce qu'une impasse tardive est vraiment tendue.

Ce que Fin de match ignore : le rythme de marque récent, c'est le travail d'Élan, et tout ce qui concerne les trois premiers quarts-temps d'un match devenu depuis à sens unique.

### Élan, Changements de tête et Remontée

Ces trois-là lisent `context.history`, la liste des scores passés d'un match, et chacun a besoin d'au moins trois instantanés avant de s'activer. Chacun monte sur un événement déclencheur, puis s'estompe selon une demi-vie adaptée au sport. L'estompage garde une ligne qui bouge entre les buts même dans un sport à faible score, au lieu d'une ligne plate. Les demi-vies, comme tout ce qui varie d'un sport à l'autre, sont dans [Configuration des sports et des ligues](/arenaswap/docs/powerscore/configuration/).

**Élan** (plafond 38) mesure le basculement de l'écart au score entre l'instantané le plus ancien et le plus récent de la fenêtre. Si une équipe marque 10 et que l'autre répond par 2, c'est un basculement de 8, pas une série de 10-0. La phrase de raison nomme les deux nombres, parce qu'un écart n'est pas un blanchissage. Ce qui compte comme un gros basculement dépend du sport : 8 points au basketball, 2 buts au hockey, 3 points au baseball. Il ignore quelle équipe mène vraiment. Une équipe peut perdre de 20 et déclencher quand même un pic d'élan en battant son adversaire sur la fenêtre.

**Changements de tête** (plafond 18) compte combien de fois la tête a changé de main sur la fenêtre : 18 points pour deux ou plus, 12 pour un. Une égalité ne compte pas comme une avance en soi. Être mené, égaliser, puis passer devant fait un changement. Passer devant, égaliser, puis repasser devant n'en fait aucun. Il ignore l'ampleur de chaque basculement. Deux inversions ou vingt valent la même chose, parce qu'à ce stade le match a déjà établi qu'il est imprévisible. Si ton flux compte les changements de tête depuis son journal de jeu, passe `context.recentLeadChanges` (`{ count, lastAt? }`). Quand son compte est plus élevé que celui des instantanés, il l'emporte, ce qui attrape les inversions survenues entre deux interrogations.

**Remontée** (plafond 20) mesure le basculement pour l'équipe qui était menée à l'instantané le plus ancien de la fenêtre : le déficit qu'elle a effacé, plus l'avance qu'elle a prise depuis. Une équipe menée de 5 qui mène maintenant de 6 a basculé de 11. Rien n'est versé si la fenêtre s'est ouverte à égalité. Une fois que l'équipe qui remonte mène de plus que le deuxième écart serré du sport (10 au basketball), le match est devenu une déroute, et seul le déficit effacé compte, moins cette avance. Le basculement est mis à l'échelle selon l'avancement du match, comme Serré. Réduire un écart au premier quart-temps compte moins que réduire le même écart avec deux minutes au chrono. Il note la tendance pendant qu'elle se produit, sans attendre de voir si l'équipe menée la mène à bien.

### Deux modificateurs qui ne sont pas des signaux

Classique applique aussi le modificateur de probabilité de victoire (±5) et la déduction de pause publicitaire. Les deux appartiennent à la chaîne de Classique, et les deux sont détaillés dans [Bonus et pénalités](/arenaswap/docs/powerscore/boosts-and-penalties/#win-probability-balance).

## Raclées

Serré retourné à l'envers. Raclées ne verse rien tant qu'un match n'a pas deux possessions d'écart (le deuxième écart serré du sport), puis monte jusqu'au plein crédit à la déroute.

| Signal | Plafond | Ce qu'il mesure |
|---|---|---|
| Écart | 50 | L'écart, mis à l'échelle à mesure que le match avance, pour qu'une déroute tardive soit plus sûre qu'une déroute précoce. Plein crédit à 30 points au basketball, 28 au football américain, 5 buts au hockey et au soccer, 10 points au baseball et au softball. |
| Avance tenue | 30 | Quelle part de la fenêtre d'historique le leader actuel a passée avec plus de deux possessions d'avance. Une avance construite et gardée marque ici. Une série qui risque de s'inverser, non. Demande 3 instantanés, et ne verse en plein que lorsque l'historique couvre toute la fenêtre. |
| Raclée précoce | 25 | Une déroute précoce a plus de raclée à regarder qu'une déroute presque terminée. Tombe vers 0 à la fin du temps réglementaire. Ne verse que lorsque l'écart dépasse le troisième écart serré du sport, et seulement quand `period` est connu. |
| Une couche de plus | 15 | Le leader continue de creuser l'écart. Il lit l'élan dans la direction du leader seulement, donc une équipe qui s'accroche à une grosse avance ne marque rien ici. Demande 3 instantanés. |

Ce que Raclées ignore : la tournure d'un match serré. Un match à moins de deux possessions d'écart ne marque presque rien ici. C'est là qu'intervient le mélange.

Raclées ne verse pas non plus de bonus de phases finales. Une raclée en playoffs a déjà réglé son résultat, donc le tour n'y ajoute rien. Le mode définit `paysPostseason: false`.

## Fantasy

Note ce que font tes joueurs. Il lit `context.fantasy`, une entrée par joueur de l'effectif, donc il n'a rien à dire tant que tu ne lui donnes pas un effectif.

| Signal | Plafond | Ce qu'il mesure |
|---|---|---|
| Dans l'action | 50 | Où sont tes joueurs dans le match. Football américain : qui a le ballon, zone rouge, ligne de but, ton botteur à portée, ta défense sur le terrain. Baseball : au bâton, en attente ou au monticule avec des coureurs sur les bases. Basketball, hockey et soccer : à quel point le match est serré et tardif. Le joueur avec le plus d'action compte en plein et tous les autres au quart. |
| Points fantasy | 35 | Les points fantasy que tes joueurs ont marqués récemment, qui s'estompent comme un changement de tête. Une grosse poussée (un touchdown, un coup de circuit, un but) le remplit. Les actions négatives ne comptent pas : personne ne change d'onglet pour regarder une interception qu'il a déjà ratée. |
| Tes joueurs | 15 | Combien de tes joueurs sont dans le match : 5 chacun, jusqu'à 15. |

Le football américain est le seul sport avec une vraie perception en direct de qui a le ballon. Le basketball, le hockey et le soccer n'ont pas de données en direct sur le terrain, donc un joueur de l'effectif dans un match de ces sports vaut autant que le match est serré et tardif. Un joueur marqué `active: false` (sur le banc, blessé, expulsé) ne compte pour rien.

## Comment les modes se mélangent avec Classique

Aucun des deux nouveaux modes ne tient seul. Chacun est combiné avec Classique, pour qu'un match calme ne tombe jamais de la carte.

| Mode | Mélange | Formule | Pourquoi |
|---|---|---|---|
| Raclées | Plancher | `total = max(blowouts, 0.3 × classic)` | Un match serré garde 30 % de son score Classique, donc une soirée sans raclée a quand même quelque chose vers quoi changer. Toute vraie raclée passe devant la meilleure d'entre elles. |
| Fantasy | Bonus | `total = min(100, classic + 0.6 × fantasy)` | Les matchs de tes joueurs ne peuvent que dépasser leur score Classique, et un match sans eux est du Classique pur. Un ancien mélange 0,6/0,4 classait un match serré d'un point, tard, avec ton joueur, sous le même match sans lui. |

Change le poids de Fantasy avec `options.classicBlend` :

```ts
scoreGame(game, context, {
	mode: 'fantasy',
	classicBlend: { kind: 'boost', weight: 0.8 },
});
```

Un match sans joueur actif n'a rien à dire pour Fantasy. Il est noté en Classique, et `score.modeId` indique `'classic'` pour que tu puisses le voir. `score.classicTotal` porte le total propre de Classique chaque fois qu'un mode se mélange avec lui, et `score.blend` porte le calcul : `{ kind, weight, ownTotal, classicTotal, floorApplied? }`. Une décomposition peut s'en servir pour afficher « Classique 70 × 30 % = 21 » quand le plancher l'a emporté, ou « +30 » pour un score Fantasy de 50 à un poids de 0,6.

## D'où viennent ces nombres

Les plafonds de Classique sont des constantes exportées : `scoreMaxCloseness`, `scoreMaxLateGame`, `scoreMaxMomentum`, `scoreMaxLeadChanges`, `scoreMaxComeback` et `scoreMaxTotal`. Les plafonds de Raclées et de Fantasy vivent dans les définitions de leurs signaux, `blowoutsSignals` et `fantasySignals`, pour que tu puisses les lire à l'exécution. Si aucun des trois modes ne pose ta question, [construis le tien avec `defineMode`](/arenaswap/docs/powerscore/api-reference/#definemode). Les signatures complètes sont dans la [Référence de l'API](/arenaswap/docs/powerscore/api-reference/).
