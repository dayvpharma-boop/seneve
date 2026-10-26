# Coach payant : rôles client et file de traitement — TEST

La recette `supabase/tests/habitudes_coach_file_et_roles.sql` a réussi dans TEST le 26 octobre 2026. Elle complète la recette minimale et couvre le scénario de file qui n’avait pas fourni de résultat exploitable dans la précédente recette étendue.

## Scénarios effectivement exécutés

1. Profil fictif authentifié, parcours HD actif sans droit payant : liste des accès coach vide et `coach_ask` refusé en rôle PostgreSQL authenticated.
2. Période HD 2 avec droit d’achat et paiement fictif confirmé/vérifié : inscription proposée et message accepté en rôle authenticated. Aucun webhook ou fournisseur n’est appelé.
3. Paiement révoqué avant traitement : le prédicat refuse l’accès ; la tâche n’est pas retournée par `claim_coach_jobs` et reste en attente.
4. Paiement restauré mais droit expiré : la tâche reste également absente du lot et en attente.
5. Droit payant rétabli dans la recette : la tâche du compte fictif est réservée. La réservation est le dernier point testé ; le service IA n’est pas exécuté et aucune réponse générée n’est simulée comme livrée.

Les appels client de demande et d’admissibilité utilisent le rôle authenticated avec le contexte d’identité fictif. Les contrôles privés, changements de fixtures et réservation sont effectués depuis la connexion de recette privilégiée, conformément à leur rôle interne. Aucun test HTTP/Supabase Auth ni navigateur nouveau n’est déduit de cette recette SQL.

## Isolation et résultats

Tout se déroule dans une transaction terminée par rollback. Les données fictives ne sont jamais publiées à un worker externe. Les éventuelles réservations faites par la fonction globale de file sont elles aussi annulées ; aucun service extérieur n’est réveillé. Une date technique antérieure est utilisée uniquement sur la tâche fictive pour garantir sa sélection lors du dernier contrôle ; ce n’est pas un changement du calendrier du programme.

Après rollback : 0 programme, 0 profil et 0 message de cette recette, 0 période HD conservée. Aucun paiement réel, abonnement, prix ou quota de production n’est créé. Le quota de 17 est une valeur de fixture, pas une proposition commerciale.

Aucune migration ou modification frontend supplémentaire n’est nécessaire à cette étape. La règle conservée reste : **30 jours gratuits sans coach ; mois d’abonnement payants avec coach lorsque le paiement et le droit sont actifs**. Une tâche déjà remise à un fournisseur avant une révocation ne peut pas être rappelée par ce contrôle de file ; ce cas n’est pas annoncé couvert.

PROD et le site public sont inchangés. Les recettes HTTP/visuelles du parcours payant et la configuration commerciale réelle restent à faire avant ouverture.
