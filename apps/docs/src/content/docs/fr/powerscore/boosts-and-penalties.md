---
sourceHash: '9c4dba756b81'
title: Les bonus et pénalités de PowerScore
navLabel: Bonus et pénalités
description: Chaque bonus et chaque pénalité que PowerScore 3 applique par-dessus les signaux d'un mode, avec la condition qui déclenche chacun, son maximum, et les plafonds qu'ils partagent.
section: powerscore
order: 4
---

Les signaux mesurent comment se passe un match. Les bonus et les pénalités gèrent les petites choses liées à un instant que les signaux ne voient pas : un coureur sur la troisième base en 9e manche, un gardien retiré, un outsider d'avant-match toujours en vie. Ils s'ajoutent aux signaux et n'en remplacent jamais aucun.

Un bonus ne verse rien tant que le match n'est pas en direct (`status: 'in'`) ou que le jeu est figé à la mi-temps, pendant une pause ou un arrêt. Chacun est recalculé à partir de l'état actuel du match à chaque appel, donc il n'y a rien à effacer quand le moment passe.

Chaque bonus qu'un mode verse apparaît dans `score.boosts` sous la forme `{ id, points, meta?, details? }`, où `details` contient les fragments de raison qui le décrivent, à `0` quand il ne verse rien. Retrouve-en un avec `boostPoints(score, 'noHitter')`.

## Quel mode garde quels bonus

| Mode | Bonus |
|---|---|
| Classique | Tous les bonus de cette page, plus le modificateur de probabilité de victoire et la déduction de pause publicitaire |
| Raclées | No-hitter et Surprise, plus la déduction de pause publicitaire. Pas de bonus de phases finales, puisqu'une raclée en playoffs a déjà réglé son résultat. |
| Fantasy | Aucun, et pas de déduction de pause |

Les bonus de favori, de phases finales et manuel du [bas de la page](#favorite-postseason-and-manual-boosts) s'appliquent dans tous les modes, sauf que Raclées saute le bonus de phases finales.

## Les bonus de moment de Classique

| Bonus | Id | Verse pour | Max |
|---|---|---|---|
| [Occasion de marquer](#scoring-opportunity) | `scoringOpportunity` | Des coureurs sur les bases, une séquence de football américain en zone rouge, ou un avantage numérique ou un filet désert au hockey | 20 |
| [Point de l'avance](#go-ahead-run) | `goAheadRun` | Le point de l'avance ou de l'égalisation sur les bases au baseball et au softball | 10 |
| [Two-minute drill](#two-minute-drill) | `twoMinuteDrill` | Une équipe de football américain avec le ballon, à égalité ou menée d'un score, dans les dernières minutes | 12 |
| [Carton rouge](#red-card) | `redCard` | Une expulsion dans un match de soccer à égalité ou à un but d'écart | 15 |
| [No-hitter](#no-hitter) | `noHitter` | Un match de baseball ou de softball où une équipe n'a toujours aucun coup sûr | 70 |
| [Alerte surprise](#upset-watch) | `upsetWatch` | L'outsider d'avant-match qui mène ou qui est à un score | 12 |
| [Enjeu](#stakes) | `stakes` | Une série au bord du gouffre, deux équipes classées, une course de fin de saison | 10 |

Ces maximums sont par bonus. La section suivante explique pourquoi ils ne s'empilent pas tous.

## Plafonds par groupe

Les bonus partagent des plafonds, pour que beaucoup de petites choses qui arrivent en même temps ne poussent pas un match au-delà de ce que rapporterait un basculement d'un score dans la dernière minute.

| Groupe | Plafond | Ce qu'il contient | Pourquoi |
|---|---|---|---|
| Moments | 20 | Occasion de marquer, point de l'avance, two-minute drill, carton rouge | Un match à égalité à la sirène marque environ 80 avant les bonus, donc un moment complet le monte à 100. Une dernière minute à un score d'écart arrive dans les hauts 80, et tous les matchs serrés ne se collent pas à 100. |
| No-hitter | 70 | No-hitter | Une tentative dure des manches, pas un instant, et elle doit faire passer un match à 6-0 devant des matchs à égalité. |
| Contexte | 16 | Alerte surprise, enjeu | Ils peuvent se produire ensemble (un outsider classé), mais ensemble ils restent sous un basculement tardif d'un score, donc le contexte ne passe jamais devant l'action en direct. |

Dans un groupe, les bonus plus haut dans le tableau ci-dessus sont versés en premier, et le plafond rogne le reste. Surprise, la version Raclées de l'alerte surprise, n'a pas de groupe.

## Occasion de marquer

Une menace de marquer que le score lui-même ne montre pas encore.

**Baseball et softball**, selon le nombre de coureurs :

| Coureurs sur les bases | Bonus |
|---|---|
| Aucun | 0 |
| Un | 3 |
| Deux | 6 |
| Trois (bases pleines) | 10 |

Il ne verse rien à 3 retraits. Des coureurs peuvent traîner au tableau d'affichage pendant une interrogation après le dernier retrait, et rien ne peut se passer avec eux.

**Football américain**, conditionné par la proximité du match. Ça ne s'applique que quand `isRedZone` vaut true.

| Écart | Valeur de base |
|---|---|
| Dans la bande serrée (football américain : 9 points) | 10 |
| Dans la bande en marge (14 points) | 5 |
| Au-delà | 0 |

La valeur de base est ensuite pondérée selon le down :

| Situation | Multiplicateur |
|---|---|
| 4e down et but à faire | ×1.5 |
| 4e down (pas but à faire) | ×1.35 |
| 3e down, 3 yards ou moins à faire | ×1.15 |
| Tout le reste, y compris un `down` manquant | ×1 |

Une valeur de base de `0` reste `0` quel que soit le down. Un bonus inconditionnel par-dessus une raclée annulerait ce que Serré et Fin de match avaient déjà noté correctement bas. But à faire ne relève le multiplicateur qu'au 4e down, car à un down antérieur il décrit les chances de marquer plutôt que ce qui décide de la possession.

**Le hockey** verse pour un [avantage numérique ou un filet désert](#power-play-and-empty-net).

Les constantes exportées derrière ces tableaux sont `scoringOpportunityBaseRunnerBoosts`, `scoringOpportunityRedZoneBoost`, `scoringOpportunityRedZoneFringeBoost`, `redZoneDownMultipliers` et `thirdAndShortDistance`.

### Avantage numérique et filet désert

L'occasion de marquer du hockey. Les deux lisent `context`, parce qu'ils viennent du flux de situation plutôt que du tableau d'affichage. Un 6 contre 4 est les deux à la fois, donc les deux s'additionnent et le plafond des moments retient la somme à 20.

**Le filet désert** verse dans les 4 dernières minutes de la 3e période quand l'écart est d'un ou deux buts : **12** à un but, **7** à deux. Quand le flux dit à qui est le filet désert, il ne verse que pour celui de l'équipe menée. Le filet désert d'un leader signifie une pénalité différée, et le gardien est de retour en quelques secondes. Ne règle `context.emptyNet` que quand le flux l'a signalé sur deux interrogations de suite, pour la même raison.

**L'avantage numérique** verse dans les matchs à égalité et à un ou deux buts d'écart. Tard (3e période ou plus tard), il verse davantage :

| Match | Tard | Plus tôt |
|---|---|---|
| Égalité | 10 | 4 |
| Un but, l'équipe menée a l'avantage numérique | 10 | 4 |
| Un but, l'équipe qui mène l'a | 5 | 2 |
| Deux buts, l'équipe menée l'a | 5 | 2 |
| Deux buts, l'équipe qui mène l'a | 0 | 0 |

Quand le flux dit seulement qu'un avantage numérique est en cours, sans dire pour qui, le bonus suppose que l'équipe menée a autant de chances de l'avoir que de ne pas l'avoir et verse un peu moins : 7 ou 3 à un but, 3 ou 2 à deux.

## Point de l'avance

Baseball et softball. Demande `baseRunners`, `topOfInning`, `outs` et `period`. Verse en plus du nombre de coureurs ci-dessus, et seulement quand l'équipe au bâton a sur les bases le point qui compte :

| Sur les bases | Verse |
|---|---|
| Le point de l'avance : égalité avec n'importe qui, menée d'un avec deux, menée de deux avec les bases pleines | 8 |
| Le point de l'égalisation : menée d'un avec un, menée de deux avec deux, menée de trois avec les bases pleines | 5 |

Seule la ligne la plus haute s'applique. La valeur de base est ensuite pondérée par la manche :

- Avant la 6e manche (la 5e au softball), la moitié. Une menace en 3e manche est réelle, mais le match a plein de manches pour y répondre.
- De là jusqu'à la dernière manche réglementaire, de 50 % à 100 %.
- Manches supplémentaires, 100 %.
- ×1.25 quand c'est la dernière chance : l'équipe locale au bâton dans la dernière manche ou plus tard, où le point de l'avance est le point gagnant, ou une équipe visiteuse menée en haut de celle-ci, qui ne battra peut-être plus.

Le maximum est 10 : un 8 à pleine pondération, multiplié par la hausse de dernière chance. À 3 retraits, il ne verse rien.

## Two-minute drill

Football américain. Demande `possession`, `yardsToEndZone` et un `down` en direct. Verse au 4e quart-temps et en prolongation, et seulement à l'équipe qui a le ballon, et seulement quand elle peut encore égaliser ou gagner avec un score :

- **Égalité :** les 2 dernières minutes.
- **Menée d'un score** (8 points, ou 9 dans l'UFL, où une tentative peut valoir 3) : les 4 dernières minutes.

Une équipe qui fait tourner le chrono avec une avance ne verse rien. Une prolongation NCAA ou UFL non plus, puisqu'elle n'a pas de chrono de match.

Les 12 points sont mis à l'échelle par quatre choses : le peu de temps qui reste (plein à 40 secondes), la position sur le terrain (plein à partir de la ligne des 35 de l'adversaire, ou des 30 à l'université, jusqu'à 40 % à ta propre ligne des 20), les temps morts restants (85 % sans aucun, 100 % avec trois, 92,5 % quand le flux ne le dit pas), et l'écart (plein à égalité ou menée de 1 ou 2, jusqu'à 70 % à 8 de retard). Entre deux actions, après un score, un flux envoie un down qui ne veut rien dire, et le bonus verse 0 jusqu'à la prochaine mise en jeu.

## Carton rouge

Soccer. Demande `redCards`, une liste de `{ side, minute }`. Un carton rouge dans un match à égalité ou à un but d'écart est le genre de chose qui fait changer d'onglet un fan, et il verse le plus juste après qu'il se produit :

| Quand le carton est arrivé | Verse |
|---|---|
| Égalité, ou l'équipe sanctionnée mène d'un but | 10 |
| L'équipe sanctionnée est menée d'un but | 7 |
| L'équipe sanctionnée mène de deux buts | 5 |
| Un écart plus grand | 0 |

Il verse en plein pendant 2 minutes de jeu, puis s'estompe jusqu'à 0 à la 10e. Un second carton pour la même équipe verse 1,5 fois plus, ce qui donne le maximum de 15. Il est revérifié par rapport au score à chaque interrogation, donc un but qui ouvre le match met fin au bonus plus tôt.

**À dix.** Un carton rouge ajoute aussi 4 points à [Serré](/arenaswap/docs/powerscore/signals/#closeness) quand l'équipe à dix est celle qui protège une avance d'un but. Elle encaisse bien plus souvent qu'une équipe complète, donc le match est plus serré que le score ne le dit. Ça reste actif aussi longtemps que c'est la situation, pas seulement pendant dix minutes.

## No-hitter

Baseball et softball. Demande `hits` pour chaque équipe, plus `period` et `topOfInning`. Une équipe sans coup sûr verse pour une **tentative de no-hitter**, qui démarre tard et grandit à chaque manche sans coup sûr :

- **Démarre** après la 5e manche complète d'un match de 9 manches, et après la 3e au softball.
- **Monte** à chaque manche complète sans coup sûr : 10, 22, 38, puis 52 et plafonné. Tant que le personnel de lanceurs qui tient la tentative est sur le terrain, il ajoute aussi des points retrait par retrait, donc il continue de grandir au cours d'une manche.
- **Pèse** 30 % de moins pendant que ce personnel est à l'abri, puisqu'il ne se passe rien pour la tentative. Les tentatives de softball sont mises à l'échelle à 60 %.

Quand les deux équipes n'ont aucun coup sûr, la plus grosse tentative verse en plein et l'autre à moitié. Le no-hitter a son propre plafond de 70, en dehors des moments, parce qu'une tentative dure des manches et doit faire passer un match à 6-0 devant des matchs à égalité.

## Alerte surprise

N'importe quel sport. Demande `context.pregameLine`, et ce doit être la ligne d'avant le match. Une ligne en direct bouge avec le score et effacerait la surprise même que tu essaies de voir.

Elle verse quand l'outsider d'avant-match mène, est à égalité ou est à un score, une fois le match passé la mi-match. Trois choses fixent le nombre, jusqu'à un maximum de 12 :

- **Cotes.** Un match à pile ou face ne verse rien. Plus la cote est longue, plus il verse, et c'est plein pour un très gros outsider. Les moneylines marchent dans n'importe quel sport, et un écart marche pour le basketball et le football américain. Un nul au soccer compte comme une demi-surprise.
- **Temps.** Rien avant la mi-match, la moitié à partir de la mi-match, et plein dès que le match est tardif (aux trois quarts au basketball et au football américain, aux deux tiers dans la plupart des autres sports).
- **État.** Plein quand l'outsider mène, 80 % quand c'est égal (70 % au soccer), et la moitié quand il est mené d'un score ou moins.

### Surprise

La version de Raclées. L'outsider ne traîne pas : il est en train de chasser le favori du terrain. Il verse quand l'outsider d'avant-match mène de plus que l'écart hors de portée du sport (18 points au basketball, 14 au football américain, 3 buts au hockey et au soccer, 5 points au baseball), avec la même mise à l'échelle des cotes et du temps que l'alerte surprise et le même maximum de 12.

## Enjeu

Ce que le résultat décide. Le maximum est 10, et le nombre est mis à l'échelle selon la proximité du match : plein dans la bande serrée du sport, divisé par deux pour un match à écart en marge ou une déroute encore dans sa première moitié, et rien pour une déroute déjà tardive. Un match 7 décidé n'a plus rien à décider.

L'enjeu est séparé par saison pour ne jamais compter deux fois avec le bonus de phases finales. En phases finales, il lit la série. Sinon, il lit les classements et le tableau.

| Enjeu | Demande | Verse |
|---|---|---|
| Une série au bord du gouffre | `game.series`, phases finales seulement | 10 quand les deux équipes sont à une victoire de la série dans un meilleur des 7 (9 dans un meilleur des 5, 8 dans un meilleur des 3). De 4 à 7 quand une équipe affronte l'élimination : 7 pour une série à 3-2 dans un meilleur des 7, 4 pour une tentative de balayage. |
| Deux équipes classées | `rank` sur chaque équipe, saison régulière seulement | 6 quand l'équipe la moins bien classée est dans le top 5. 5 quand elle est dans le top 10. 4 quand une équipe est dans le top 10. 3 pour toute autre paire du top 25. |
| Une course de fin de saison | `context.stakes`, saison régulière seulement | 5 quand gagner assure quelque chose ou que perdre élimine une équipe. 6 à quelques points du titre ou de la ligne de relégation. 4 pour les premières places européennes. 3 pour toute autre ligne du tableau ou quand elle est toujours dans la course. |

Pour une course, l'équipe qui a le plus à jouer verse en plein et l'autre à moitié, plafonné à 6. Classement et course s'additionnent, et le total est plafonné à 10.

## Équilibre de la probabilité de victoire

Classique seulement. `computeWinProbVarianceScore(winProbHistory)` renvoie un modificateur de `-scoreWinProbVarianceMax` à `+scoreWinProbVarianceMax` (±5). Passe `context.winProbability` à `scoreGame`, et le modificateur est intégré tout seul au total.

Il demande au moins `minDataPoints` (5) valeurs finies. Tout le reste renvoie `undefined`, et le champ `winProbabilityVariance` du résultat est carrément omis plutôt que mis à `0`. Les entrées non finies (`NaN`, `Infinity`) sont écartées avant ce comptage.

Le modificateur est la distance absolue moyenne des valeurs fournies par rapport à 0,5, projetée sur la plage ±5 :

| Distance moyenne par rapport à 50 % | Modificateur |
|---|---|
| 0 (un pile ou face) | +5 |
| `maxAvgDist` ÷ 2 (0.175) | 0 |
| ≥ `maxAvgDist` (0.35) | −5 |

Malgré son nom, le modificateur mesure la distance moyenne à 50 %, pas la variance. Une ligne de probabilité de victoire qui oscille entre 10 % et 90 % reçoit la même pénalité qu'une ligne tenue en continu à 90 %. Les deux s'éloignent en moyenne de la même distance du milieu.

Le modificateur est ajouté après la déduction de pause, pas avant, et le résultat est ramené entre 0 et 100 avant qu'un bonus soit ajouté.

## Déduction de pause publicitaire

Une déduction fixe est retirée du sous-total des signaux pendant qu'un match est en pause publicitaire, pour qu'ArenaSwap ne change pas vers un match qui diffuse des pubs. L'appelant passe `context.onBreak`, et le moteur retire 15 points fixes du sous-total des signaux tant qu'il vaut `true`. C'est `breakPenalty`. Si certains signaux sont désactivés, la déduction grandit avec le reste du sous-total : 30 quand la moitié du plafond des signaux est désactivée.

Elle est retirée après les signaux et avant le modificateur de probabilité de victoire, et c'est une déduction, pas un multiplicateur. Classique et Raclées la versent. Fantasy non. Les champs `onBreak` et `breakPenalty` du résultat indiquent si elle s'est appliquée et combien a été retiré. Les deux valent `false` et `0` sur un score de mi-temps ou de pause figé.

`signalsSubtotal` sur le résultat contient la somme avant déduction, pour qu'une décomposition puisse montrer ce que la pause a coûté. `scoreGame` ne détecte pas lui-même les pauses. C'est l'appelant qui le fait. ArenaSwap lit les pauses entre manches, les changements de lanceur et les temps morts télé dans son flux de tableau d'affichage et passe la réponse.

## Bonus de favori, de phases finales et manuel

Ces trois-là viennent de toi, pas du match, et marchent dans tous les modes. La seule exception est Raclées, qui ne verse jamais le bonus de phases finales. Passe-les dans `options` :

| Option | Ce qu'elle fait |
|---|---|
| `favoriteTeamCount` et `favoriteBoostPoints` | Des points pour chaque équipe favorite dans le match, donc un duel de deux favorites verse deux fois. |
| `postseasonBoostPoints` et `game.postseasonRound` | Des points pour un tour qui décide du titre (`0`), avec une part pour les précédents : `1` demi-finale 75 %, `2` quart de finale 50 %, `3` tout ce qui est avant 25 %. |
| `gameBoost` | Un bonus manuel fixe, comme celui qu'un spectateur règle sur un match. |

Ils apparaissent dans `score.boosts` sous les noms `favoriteBoost`, `postseasonBoost` et `gameBoost`, une fois que tu les as demandés. Les bonus de favori et de phases finales sont ajoutés après les bonus propres du mode et son mélange, et le total est de nouveau plafonné à 100. `gameBoost` est ajouté en dernier, et c'est la seule chose autorisée à dépasser 100. C'est voulu : un match qu'un spectateur épingle doit pouvoir battre un score parfait.

Aucun ne verse quoi que ce soit tant que tu ne lui donnes pas de points. Le paquet n'a de valeur par défaut pour aucun d'eux. La façon dont ArenaSwap transforme les paramètres enregistrés d'un spectateur en ces nombres est dans [sa propre documentation](/arenaswap/docs/extension/settings/#scoring), pas dans ce paquet.

## Si tu es encore sur l'API 2.x

`computePowerScore` garde son comportement 2.x : signaux et probabilité de victoire, sans aucun des bonus de moment. `computeScoringOpportunityBoost(game)` renvoie toujours seul le nombre d'occasion de marquer, et `normalizePowerScoreResult` plafonne et fait toujours passer `favoriteBonus`, `gameBoost` et `postseasonBoost` pour un résultat que tu construis à la main. Tout ça est déprécié mais fonctionne. Voir [la référence de l'API](/arenaswap/docs/powerscore/api-reference/#the-2x-api) pour la liste complète.
