# Coach : gratuit exclu, abonnement payant inclus

Complément de recette : `RECETTE_COACH_FILE_ET_ROLES_TEST.md` décrit désormais un test réussi avec rôle authenticated pour les demandes et vérification du blocage des tâches après révocation/expiration. Le signalement ci-dessous de la recette étendue non aboutie reste historique ; il ne représente plus un manque de preuve pour ce scénario de file dans TEST.

La précision du porteur remplace l’interprétation précédente : seul l’accès des 30 jours gratuits exclut le coach. Les mois suivants d’abonnement payant doivent permettre l’accès au coach. La décision est consignée le 26 octobre 2026 ; aucun tarif, quota nouveau ou durée des mois payants n’en est déduit.

## Correction réalisée dans TEST

La migration initiale `habitudes_exclure_coach_ia` installait les points de contrôle (demande, répétition, insertion privilégiée, quota, réservation de tâches). La migration corrective **`habitudes_coach_periodes_payantes` doit être appliquée après elle** et remplace le prédicat d’exclusion. Ne pas déployer la première seule comme règle finale du programme.

Le coach reste refusé pour une inscription HD sans période payante valide, donc pendant la gratuité, après expiration, révocation ou suspension. Il devient admissible pour une période HD numérotée 2 à 6 si le programme/version/langue est reconnu et actif, l’inscription active, le droit d’achat actif et borné, la période comprise dans ce droit, et le paiement correspondant signé/vérifié avec traitement `acces_ouvert`. Le quota de coach configuré sur le programme doit être positif ; aucune nouvelle valeur n’est attribuée à un programme réel.

Les protections existantes utilisent ce prédicat, y compris la réservation des tâches : l’admissibilité est donc réévaluée au moment de leur prise en charge. Un simple passage de 30 jours ne crée aucun droit payant. L’inscription au mois gratuit ne vaut ni paiement ni abonnement.

La nouvelle RPC `coach_eligible_enrollments()` retourne uniquement les inscriptions actives admissibles du compte authentifié ; public et anon n’ont pas l’exécution. Le frontend préparé utilise cette liste lorsque le module HD est activé, au lieu d’exclure tout HD. L’écran de préinscription et la proposition d’offre précisent la différence gratuit/payant. Les autres programmes gardent leurs règles propres.

## Validation et limites

La recette minimale `habitudes_coach_payant_minimal.sql` a réussi dans TEST : absence de droit payant refusée ; période 2 et paiement fictif confirmé autorisant le coach ; inscription présente dans la liste admissible ; message de recette créé sans réveiller de service IA ; paiement révoqué puis droit expiré refusés. Cette recette appelle les fonctions avec un contexte auth.uid() fictif depuis le rôle de recette privilégié ; elle ne constitue pas un nouveau test HTTP authentifié.

La recette étendue `habitudes_coach_periodes_payantes.sql` n’a pas fourni de résultat exploitable : deux appels ont terminé par `Invalid or expired requestState`. Ils ne sont pas annoncés comme réussis. Un contrôle a confirmé l’absence de fixtures conservées avant la recette minimale. La réservation d’une tâche après révocation dans ce scénario étendu reste à réceptionner, même si son filtre appelle le prédicat corrigé.

Vingt-neuf tests React réussis (14 coach, 15 inscription), 11 tests Python éditoriaux réussis, TypeScript et compilation Vite réussis. Les tests React couvrent HD gratuit sans formulaire, HD payant autorisé avec formulaire, coexistence avec un autre programme ; le transport est simulé. Vérification finale : 0 programme de ces recettes, 0 message de recette et 0 période HD conservés. Aucun appel IA externe n’est effectué.

PROD et le site public restent inchangés. L’abonnement réel n’est pas ouvert par cette correction : son catalogue, paiement, quota et conditions restent à configurer et à réceptionner avant publication.
