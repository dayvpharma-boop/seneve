# Exclusion du coach — protection installée dans TEST

**Portée corrigée par le porteur : exclusion pendant les 30 jours gratuits uniquement, accès dans les mois d’abonnement payants.** Voir `COACH_GRATUIT_EXCLU_PAYANT_INCLUS.md`. Les descriptions de l’exclusion totale ci-dessous sont historiques et ne constituent plus la règle finale.

La décision du porteur exclut le coach IA de tout Habitudes & Défis. L’inspection a montré que `coach_ask` acceptait auparavant tout parcours actif et que le quota maximal pouvait inclure HD. Une migration corrective a donc été installée uniquement dans TEST : `habitudes_exclure_coach_ia`.

## Protection

- Une fonction privée identifie les inscriptions des programmes présents au registre HD, même si le mapping est inactif. L’exclusion couvre tout le programme, y compris ses autres versions/langues. Elle ne dépend pas du drapeau frontend.
- `coach_ask` refuse une demande HD et la répétition d’un ancien message HD, même en fournissant ensuite une inscription d’un autre programme. Les contrôles de propriétaire et d’authentification sont conservés.
- Un trigger refuse l’insertion de messages HD et le rattachement d’un message à HD, y compris par un appel privilégié. Les simples changements d’état d’un ancien message ne sont pas empêchés.
- Le quota exclut HD. Un compte avec seulement un parcours HD actif reçoit un quota nul ; les quotas des autres programmes restent calculés comme avant. Le comportement historique sans inscription reste inchangé.
- `claim_coach_jobs` filtre les tâches HD avant réservation. Une ancienne tâche reste conservée mais ne part pas dans le lot retourné au traitement IA. Aucun appel de fournisseur ou webhook n’est effectué pendant la recette.
- Sur la branche frontend avec HD activé, la page coach filtre les programmes inscrits au registre HD. Si la lecture du registre échoue, aucun formulaire n’est proposé par ce chargement. La page reste compatible avec les autres programmes ; l’ancien mode sans module conserve son chargement existant.

Les fonctions privées ont un search_path vide et ne sont pas exposées comme RPC publiques. Aucun nouveau droit client sur les tables n’est accordé. Les programmes HD doivent être enregistrés au registre avant toute ouverture ; un programme non déclaré ne peut pas être classé automatiquement à partir de son seul nom. Les mappings historiques doivent être conservés, même inactifs.

## Recette

`supabase/tests/habitudes_exclure_coach.sql` exécuté dans TEST, données fictives et rollback complet : quota HD nul ; demande refusée ; mapping inactif toujours refusé ; ancien message HD non réutilisable via un autre programme ; insertion directe HD refusée ; ancienne tâche HD jamais retournée au traitement ; autre programme du même participant conservant un quota de 17 et acceptant une demande de recette. Les messages et tâches fictifs ne sont jamais visibles hors de la transaction et aucun service IA n’est réveillé.

Vérification finale : 0 mapping HD, 0 programme de recette, 0 message de recette et 0 période HD conservés. Treize tests du coach frontend réussis, dont deux nouveaux cas HD seul et coexistence avec un autre programme. TypeScript et compilation Vite avec le module activé réussis. Le transport frontend est simulé ; cette étape n’a pas refait de connexion HTTP réelle ni de recette de navigateur authentifiée.

Le conseiller sécurité ne remonte pas de nouvel avertissement lié à cette migration. Les avertissements antérieurs restent le [placement de pg_net](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) et la [protection contre les mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), hors périmètre de cette correction.

## Publication et retour

PROD et le site public sont inchangés. Le code et la migration TEST sont sauvegardés pour le futur déploiement contrôlé. Le retour `supabase/retours/habitudes_exclure_coach.sql` restaure les trois définitions précédemment lues, retire le trigger et ses fonctions privées, sans supprimer de message ou tâche. Il est préparé, non exécuté/testé dans cette étape.

Cette recette prouve l’exclusion sur les points d’entrée SQL inspectés. Elle ne prouve pas l’absence de toute facturation sur des services externes qui appelleraient directement un fournisseur en dehors de ce chemin. Les tâches déjà remises à un service avant une éventuelle reclassification ne sont pas rappelées par cette migration ; aucun programme HD réel n’est actuellement configuré dans TEST.
