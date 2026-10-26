# Calendrier personnel HD — TEST et préparation frontend
25 octobre 2026.

## Résultat
La journée et le suivi HD calculent les jours civils dans le fuseau enregistré du participant :
preferences.rappels.fuseau s'il existe, puis participants.fuseau.
En l'absence des champs dans un contexte frontend, le fuseau historique Africa/Kinshasa reste le défaut.
Une valeur présente mais invalide est refusée, sans choisir silencieusement un autre fuseau.
Les jours calendaires sont calculés à partir de dates civiles, sans diviser une durée écoulée par 24 heures.
Les parcours non HD conservent leur calendrier historique.

Sur seneve-test seulement (rlojnuaajeubzlwofwhn), la migration habitudes_fuseau_jour_ouvert remplace
le contrôle existant tg_progress_jour_ouvert afin d'appliquer la même priorité aux inscriptions enregistrées dans HD.
La signature, le mode invoker et le search_path vide sont conservés.
Aucun droit, paiement, inscription ou horaire personnel réel n'est créé ou changé.

## Vérifications
45 tests frontend réussis :
6 du calendrier, 6 de l'espace HD, 8 du suivi HD, 15 existants de l'espace, 10 existants du bilan.
Cas : minuit local, UTC+14 et UTC-12 au même instant, changement d'heure,
jours ouverts bornés, fin du parcours, priorité du fuseau, valeurs invalides,
même journée ouverte dans espace et suivi.
Compilation TypeScript stricte et construction Vite avec option HD activée réussies.

La recette SQL supabase/tests/habitudes_fuseau_jour_ouvert.sql utilise le vrai record_progress avec rôle authenticated et données fictives, puis rollback :
- jour 1 autorisé via la préférence UTC+14, alors que le profil UTC-12 ne l'a pas encore ouvert ;
- préférence retirée : le fuseau du profil bloque le même jour ;
- profil passé en UTC+14 : jour 1 autorisé ;
- jour 2 futur refusé ; fuseau invalide refusé ; seules les deux écritures permises existent avant rollback.
La recette existante de rappels sans envoi s'exécute sans erreur après modification.
Zéro fixture de participant/programme et zéro liaison HD après rollback.
Aucune nouvelle alerte de sécurité sur la fonction modifiée ; avertissements préexistants inchangés.

## Limites
Frontend toujours désactivé par défaut et non déployé. Production non modifiée.
Les préférences utilisées sont celles déjà enregistrées ; pas de nouvel écran de réglage à cette étape.
Le calcul est refait au chargement/rendu ; aucun minuteur de bascule automatique à minuit n'a été ajouté.
Le précontrôle futur des rappels conserve sa configuration de livraison séparée : il reste à garantir sa cohérence avec ce fuseau avant d'activer un expéditeur.
Recette authentifiée complète dans un navigateur et contrôle Safari restent non attestés.
Aucun message envoyé.

## Retour
Définition initiale exacte conservée dans supabase/retours/habitudes_fuseau_jour_ouvert.sql.
Appliquer ce retour uniquement après réévaluation si HD devait être activé.
Laisser l'option frontend désactivée conserve le chemin actuel des autres parcours.
