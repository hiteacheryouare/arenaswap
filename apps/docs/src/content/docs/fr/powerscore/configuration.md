---
sourceHash: '854afd07d71b'
title: Configuration des sports et des ligues
description: Chaque champ de SportTypeConfig et LeagueConfig, leurs valeurs par défaut pour les six sports et les 31 ligues, et comment se définit l'idée de « serré » d'un sport.
section: powerscore
order: 5
navLabel: Configuration
---

`scoreGame` consulte deux tables exportées au début de chaque appel. `sportTypeConfigMap`, indexée par `SportType`, décrit comment un sport se joue. `leagueConfigMap`, indexée par `LeagueId`, décrit la durée des périodes d'une ligue. Si les valeurs intégrées ne conviennent pas à tes données, tu peux remplacer l'une ou l'autre à chaque appel avec `options.sport` et `options.league`. [Adapter pour ta propre ligue](#tune-it-for-a-league-powerscore-doesnt-ship) montre comment.

## SportTypeConfig

Une entrée par `SportType`, exportée sous `sportTypeConfigs` (un tableau) et `sportTypeConfigMap` (indexée par `id`). Ce tableau contient les valeurs réelles des six sports, et [ce que signifient les champs](#what-the-sport-fields-mean) vient juste après. Classique lit tout. Raclées lit `closenessMargins`, `momentumBigRun` et `momentumSmallRun`, la demi-vie de l'élan, et `historyWindowMs`.

| Champ | basketball | football | hockey | soccer | baseball | softball |
|---|---|---|---|---|---|---|
| `clockBased` | true | true | true | true | false | false |
| `closenessMargins` (t1, t2, t3) | 5, 10, 18 | 3, 9, 14 | 1, 2, 3 | 1, 2, 3 | 1, 3, 5 | 1, 3, 5 |
| `momentumBigRun` / `momentumSmallRun` | 8 / 4 | 10 / 4 | 2 / 1 | 2 / 1 | 3 / 1 | 3 / 1 |
| `comebackThresholdBig` / `comebackThresholdSmall` | 6 / 3 | 7 / 3 | 2 / 1 | 2 / 1 | 2 / 1 | 2 / 1 |
| `clockCountsUp` | false | false | false | true | false | false |
| `clockIsFullGameElapsed` | false | false | false | true | false | false |
| `zeroZeroAsFullTie` | false | false | true | true | false | false |
| `zeroZeroPenaltyPeriods` | aucune | aucune | 1, 2 | 1 | aucune | aucune |
| `otPreBoostWindowSecs` | 60 | 60 | 60 | 60 | 0 | 0 |
| `decayHalfLifeMs.momentum` | 45,000 | 135,000 | 180,000 | 240,000 | 150,000 | 150,000 |
| `decayHalfLifeMs.leadChange` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `decayHalfLifeMs.comeback` | 60,000 | 180,000 | 240,000 | 300,000 | 180,000 | 180,000 |
| `historyWindowMs` | 300,000 (5 min) | 720,000 (12 min) | 960,000 (16 min) | 1,200,000 (20 min) | 720,000 (12 min) | 720,000 (12 min) |
| `lateGameCurve` | aucune | aucune | aucune | aucune | 9 manches, démarre à 6 | 7 manches, démarre à 5 |

`historyWindowMs` est la durée d'historique du score que chaque sport doit conserver pour que l'élan, les changements de tête et la remontée fonctionnent. Le signal Avance tenue de Raclées se mesure sur la même fenêtre. Elle vaut au moins quatre fois la plus longue demi-vie du sport. Cette marge laisse un signal s'éteindre complètement avant de sortir de la fenêtre, quelle que soit la fréquence d'interrogation de l'appelant.

### Ce que signifient les champs d'un sport

| Champ | Signification |
|---|---|
| `clockBased` | Le sport a un chronomètre de match. Pas le baseball ni le softball, donc la pression de fin de match se répartit sur les manches. |
| `closenessMargins` | Les trois écarts où Serré descend d'un cran : sous t1, c'est très serré, sous t2, serré, sous t3, en lisière, au-delà de t3, ça ne rapporte rien. D'autres signaux et bonus les réutilisent, comme le seuil de déroute de Remontée à t2 et le filtre Raclée précoce de Raclées au-delà de t3. |
| `momentumBigRun`, `momentumSmallRun` | La série nette dans la fenêtre d'historique qui rapporte le palier complet et le demi-palier de l'Élan. |
| `comebackThresholdBig`, `comebackThresholdSmall` | Le renversement qui rapporte le grand palier et le palier moyen de Remontée. |
| `clockCountsUp` | Le chrono affiche le temps joué, pas le temps restant. Seulement le soccer. |
| `clockIsFullGameElapsed` | Le chrono court sur tout le match (de 0' à 90'+) au lieu de repartir à chaque période, donc les périodes terminées sont soustraites avant de calculer le temps restant. Seulement le soccer. |
| `zeroZeroAsFullTie` | Un match 0–0 gagne le plein crédit d'égalité dans Serré. À `false`, le 0–0 gagne le palier réduit `zeroZero`. |
| `zeroZeroPenaltyPeriods` | Les périodes où le 0–0 gagne encore le palier réduit même si `zeroZeroAsFullTie` vaut `true`. Le hockey utilise 1 et 2, le soccer la première mi-temps. |
| `otPreBoostWindowSecs` | Les dernières secondes de la dernière période réglementaire où un match nul monte vers le pré-bonus de prolongation. `0` le désactive. |
| `decayHalfLifeMs` | La vitesse à laquelle l'Élan, les Changements de tête et le Remontée s'estompent après le dernier point. Plus longue dans les sports à faible score, pour qu'un seul but les garde en vie jusqu'au suivant. |
| `historyWindowMs` | La quantité d'historique du score que lisent les signaux d'historique. Voir plus haut. |
| `lateGameCurve` | Baseball et softball seulement : combien de manches compte le temps réglementaire et à quelle manche démarre la montée de fin de match. |

## LeagueConfig

Une entrée par `LeagueId`, exportée sous `leagueConfigs` (un tableau) et `leagueConfigMap` (indexée par `id`), plus `allLeagueIds` pour la liste brute. `periodFormat` est du texte d'affichage uniquement, et n'affecte pas le score. Chaque entrée porte aussi quelques champs qu'ArenaSwap utilise pour sa propre récupération de données et pour la durée qu'un match occupe sur une barre du calendrier. Le calcul ne les lit pas, donc ils ne figurent pas ici.

| Ligue | Sport | Périodes | Durée d'une période |
|---|---|---|---|
| NBA (`nba`) | basketball | 4 | 720s |
| WNBA (`wnba`) | basketball | 4 | 600s |
| Basketball universitaire NCAA (`ncaab`) | basketball | 2 | 1200s |
| Basketball universitaire féminin NCAA (`ncaaw`) | basketball | 4 | 600s |
| Basketball masculin olympique (`olybkm`) | basketball | 4 | 600s |
| Basketball féminin olympique (`olybkw`) | basketball | 4 | 600s |
| NFL (`nfl`) | football | 4 | 900s |
| Football américain universitaire NCAA (`ncaaf`) | football | 4 | 900s |
| UFL (`ufl`) | football | 4 | 900s |
| NHL (`nhl`) | hockey | 3 | 1200s |
| Hockey universitaire masculin NCAA (`ncaamh`) | hockey | 3 | 1200s |
| Hockey sur glace masculin olympique (`olymih`) | hockey | 3 | 1200s |
| Hockey sur glace féminin olympique (`olywih`) | hockey | 3 | 1200s |
| MLB (`mlb`) | baseball | 9 manches | 0 |
| Baseball universitaire NCAA (`cbase`) | baseball | 9 manches | 0 |
| Baseball masculin olympique (`olybb`) | baseball | 9 manches | 0 |
| World Baseball Classic (`wbbc`) | baseball | 9 manches | 0 |
| Softball universitaire NCAA (`csoft`) | softball | 7 manches | 0 |
| MLS (`mls`) | soccer | 2 | 2700s |
| Premier League anglaise (`epl`) | soccer | 2 | 2700s |
| La Liga (`laliga`) | soccer | 2 | 2700s |
| Bundesliga (`bundesliga`) | soccer | 2 | 2700s |
| Serie A (`seriea`) | soccer | 2 | 2700s |
| Liga MX (`ligamx`) | soccer | 2 | 2700s |
| Ligue des champions de l'UEFA (`ucl`) | soccer | 2 | 2700s |
| Ligue Europa de l'UEFA (`uel`) | soccer | 2 | 2700s |
| NWSL (`nwsl`) | soccer | 2 | 2700s |
| Coupe du monde de la FIFA (`fifawc`) | soccer | 2 | 2700s |
| Coupe du monde féminine de la FIFA (`fifawwc`) | soccer | 2 | 2700s |
| Football masculin olympique (`olysocm`) | soccer | 2 | 2700s |
| Football féminin olympique (`olysocw`) | soccer | 2 | 2700s |

31 ligues au total, soit les 31 membres de `LeagueId`.

## Comment se définit l'idée de « serré » d'un sport

Un seul tuple, `closenessMargins: [t1, t2, t3]`, décide de plusieurs choses pour un sport. Il choisit dans quel palier de proximité tombe un écart : très serré à `t1`, serré à `t2`, en lisière à `t3`, hors de portée au-delà. Il choisit aussi le plafond vers lequel monte la pression de fin de match, la bande où le bonus de zone rouge du football américain paie, le point où Raclées commence à payer (deux possessions d'écart, au-delà de `t2`), et le poids que prend l'enjeu.

Le `[5, 10, 18]` du basketball veut dire qu'un match à 2 points est très serré et qu'un match à 9 points est serré. Un match à 18 points est le dernier à compter encore comme en lisière. Le `[1, 2, 3]` du hockey et du soccer traite un match à 2 buts comme le basketball traite un match à 9 points. Changer le sens de « serré » pour un sport, c'est changer un seul tuple, pas une poignée de seuils séparés.

## Adapter pour une ligue que PowerScore ne fournit pas

`Game` est générique sur l'identifiant de ligue, donc un flux avec ses propres identifiants fonctionne tel quel : `Game<string>`. Une ligue que la table ne connaît pas est notée avec les valeurs par défaut de son sport. Chaque sport renvoie à sa ligue la plus connue pour le nombre de périodes et le chrono :

| Sport | Par défaut |
|---|---|
| Basketball | NBA |
| Hockey | NHL |
| Baseball | MLB |
| Football américain | NFL |
| Softball | Softball universitaire NCAA |
| Soccer | MLS |

`sportType` est la seule chose que tu dois avoir juste. Il gouverne l'essentiel de ce que fait un signal, quelle que soit la `league`. Un `sportType` non reconnu retombe séparément sur le réglage des signaux du basketball. Dans les deux cas, le match est quand même noté au lieu de lever une erreur.

Si les valeurs par défaut ne conviennent pas à ta ligue, remplace-les à chaque appel :

```ts
scoreGame(game, context, {
	league: { regularPeriods: 3, periodDurationSecs: 15 * 60 },
});
```

`options.league` accepte n'importe quelle partie d'un `LeagueConfig`, en général le nombre et la durée des périodes. `options.sport` accepte n'importe quelle partie d'un `SportTypeConfig`, comme les écarts de proximité, les seuils d'élan ou les demi-vies. Les remplacements ne valent que pour cet appel, et les tables exportées restent intactes.

`sportTypeConfigMap` et `leagueConfigMap` sont de simples objets exportés, lus à chaque appel et non depuis une copie en cache. Les modifier à l'exécution change bien le comportement du calcul, mais rien dans les types ni les exports du paquet ne le traite comme un point d'extension pris en charge, et une version future n'est pas tenue de le maintenir. Utilise les options.
