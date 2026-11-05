---
sourceHash: '099498900e89'
title: Dépanner ArenaSwap
description: Des solutions rapides pour une liste de matchs vide, des changements qui n'arrivent jamais, des onglets absents du menu et des notifications manquantes.
section: extension
order: 9
navLabel: Dépannage
faq:
  - q: Pourquoi ArenaSwap n'affiche-t-il aucun match ?
    a: Si tu vois Choisis des ligues pour commencer, aucune ligue n'est encore activée. Clique sur Choisir des ligues dans Paramètres et active-en quelques-unes. Si des ligues sont activées et que la liste reste vide, rien n'est en direct dedans pour le moment. Clique sur Actualiser, ou essaie le mode démo.
  - q: Pourquoi ArenaSwap ne change-t-il pas d'onglet ?
    a: Vérifie que Activer le changement automatique est activé dans la barre du haut et qu'au moins un match en direct a un onglet associé. ArenaSwap ne change qu'entre les onglets que tu lui as donnés.
---

La plupart des problèmes viennent d'un paramètre désactivé ou d'un onglet jamais associé. Commence par celui qui ressemble au tien.

## La liste des matchs est vide

Si tu vois **Choisis des ligues pour commencer**, aucune ligue n'est encore activée. Clique sur **Choisir des ligues dans Paramètres** et active-en au moins une.

Si tu vois un message comme « C'est le calme plat côté sport », tes ligues n'ont rien en direct pour le moment. Clique sur **Actualiser** pour vérifier à nouveau. Ou active le [mode démo](/arenaswap/docs/extension/demo-mode/) pour avoir de quoi jouer.

Si une bannière indique **Nos sources se sont tues. Aucun match chargé.**, clique sur **Réessayer**. Si ça continue, vérifie ta connexion internet.

## ArenaSwap ne change pas d'onglet

Vérifie ces points dans l'ordre :

1. **Activer le changement automatique** dans la barre du haut est activé.
2. Au moins un match en direct a un onglet associé. Utilise le menu **Associer un onglet** sur sa carte.
3. Tu as un deuxième match associé. Avec un seul, ArenaSwap peut t'y emmener depuis un onglet qui n'est pas un match, mais il n'a rien entre quoi changer.

Toujours rien ? **Sensibilité de changement** est peut-être réglée bas, ou **Délai entre les changements** ou **Délai de changement** sont peut-être longs. [Contrôler quand ArenaSwap change d'onglet](/arenaswap/docs/extension/switching-and-sensitivity/) montre quoi modifier.

## ArenaSwap m'a arraché à ce que je faisais

Si l'onglet où tu es n'est associé à aucun match, ArenaSwap te considère comme libre et te déplace vers le meilleur match associé dès qu'un match s'enflamme. Pour naviguer en paix, désactive d'abord **Activer le changement automatique**.

## Il rebondit sans arrêt entre deux matchs

Deux de tes matchs sont au coude à coude, et ArenaSwap suit chaque renversement. Augmente **Délai entre les changements** dans les Paramètres pour que le leader doive tenir plus longtemps avant le changement suivant. [Contrôler quand ArenaSwap change d'onglet](/arenaswap/docs/extension/switching-and-sensitivity/) donne la plage.

## Un onglet manque dans le menu, ou est grisé

Le menu **Associer un onglet** liste les onglets ouverts dans la fenêtre depuis laquelle tu as ouvert ArenaSwap. Ouvre d'abord le flux dans son propre onglet. Pour un onglet d'une autre fenêtre, ouvre ArenaSwap depuis cette fenêtre. Un onglet ouvert pendant que la fenêtre d'ArenaSwap est affichée apparaît à sa prochaine ouverture.

Un onglet marqué **(utilisé)** est associé à un autre match. Dissocie-le d'abord là-bas.

## Un onglet a été fermé ou libéré après la fin d'un match

C'est ton paramètre **Quand un match se termine**. Tu le trouveras dans les Paramètres sous **Changement**. Règle-le sur **Laisser l'onglet tel quel** pour l'arrêter. [Ce qui se passe à la fin d'un match](/arenaswap/docs/extension/watching-multiple-games/#choose-what-happens-when-a-game-ends) détaille les options.

## J'ai reçu une notification « À suivre », mais pas de changement

**Changement aux pauses** attend une pause dans le jeu, comme un coup de sifflet ou la fin d'un passage au bâton. La notification dit ce qu'il attend. ArenaSwap change quand le jeu s'arrête, ou après une courte attente. Pour changer tout de suite, désactive **Changement aux pauses** dans les Paramètres. [Ne pas être coupé en pleine action](/arenaswap/docs/extension/switching-and-sensitivity/#dont-get-cut-off-mid-play) en dit plus.

## Multiview ne s'est pas ouvert

La [page Multiview](/arenaswap/docs/extension/multiview/) a la liste de vérifications.

## Standby Stream ne fait rien

Standby Stream a besoin de deux choses :

1. Un onglet choisi dans le menu **Onglet de standby** sous Paramètres, puis **Standby Stream**. S'il indique encore **Sélectionner un onglet**, choisis-en un.
2. Au moins un match en direct avec un onglet associé.

Il attend aussi tant que **Activer le changement automatique** est désactivé, et tant que Multiview est ouvert. [Configurer Standby Stream](/arenaswap/docs/extension/standby-stream/) donne toutes les étapes.

## Pas de notifications de changement

Active **Notifications de changement** dans les Paramètres, sous **Changement**. Si c'est déjà fait, vérifie les paramètres de notification de ton ordinateur et assure-toi que ton navigateur a le droit d'en afficher.

## À lire aussi

- [Regarder plusieurs matchs en même temps](/arenaswap/docs/extension/watching-multiple-games/) couvre l'association des onglets.
- [Contrôler quand ArenaSwap change d'onglet](/arenaswap/docs/extension/switching-and-sensitivity/) couvre la sensibilité, le délai entre les changements et le délai de changement.
- [Référence des paramètres d'ArenaSwap](/arenaswap/docs/extension/settings/) liste la valeur par défaut et la plage de chaque paramètre.
- La [FAQ](/arenaswap/faq/) couvre les ligues, les services de streaming et les données.
