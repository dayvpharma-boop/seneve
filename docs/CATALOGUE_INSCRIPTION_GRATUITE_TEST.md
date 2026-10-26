# Raccordement de la préinscription — TEST uniquement

L’écran est désormais monté dans `/habitudes/inscription` sur la branche de développement. Un lien depuis les offres et tout appel au catalogue restent derrière `VITE_HABITUDES_DEFIS=true`, désactivé par défaut. Cette branche n’est pas publiée ; le site public et la base PROD ne changent pas.

## Catalogue autorisé par le serveur

La migration TEST `habitudes_catalogue_gratuit_authentifie` installe `seneve.hd_free_catalogue(text)` et sa fonction privée. Authentification et profil requis ; aucun identifiant de participant fourni par le client. Fonction privée SECURITY DEFINER avec search_path vide ; façade SECURITY INVOKER ; exécution réservée à authenticated, retirée à public et anon. Aucun élargissement des lectures directes des tables ni modification des schémas exposés.

Le catalogue vérifie le mapping HD actif, la version de programme publiée, la langue, le calendrier configuré d’au moins 30 jours, la politique gratuite de 30 jours et une offre active, gratuite, sans lien d’achat ni produit Chariow. Il exige des modèles non vides et des heures proposées complètes, puis les normalise avec le même validateur que l’inscription. Les seules données proposées sont le nom du programme, ses identifiants, les libellés d’habitudes, les créneaux et le fuseau du compte. Aucun texte de prière, contenu intégral, journal, historique ou renseignement d’un autre participant n’est retourné.

Un premier accès gratuit déjà utilisé, même expiré ou révoqué, entraîne une réponse sans offre et un renvoi aux accès existants. Une inscription ou un planning antérieur à préserver exclut également l’offre correspondante. La RPC d’inscription vérifie de nouveau toutes ses propres conditions : le catalogue ne constitue pas un droit d’accès ni une réservation.

## Écran

La page vérifie la session puis le catalogue. Un compte absent est invité à se connecter ; une liste vide annonce l’indisponibilité ; une erreur ne présente aucun formulaire. Le client contrôle l’identité du compte retourné, le fuseau, la langue, la durée, les identifiants, les créneaux et les jours. Aucune offre de remplacement n’est fabriquée.

Changement de compte et déconnexion retirent le formulaire et écartent les réponses tardives. Un renouvellement de jeton du même compte conserve le chargement en cours. Le formulaire préparé précédemment conserve sa confirmation explicite, la demande identique après une réponse incertaine et l’affichage des dates existantes au retour. Le lien final ouvre désormais `/acces` en tenant compte du dossier de déploiement.

## Vérifications effectuées

- Recette SQL sur TEST, rôles PostgreSQL authenticated et données fictives, entièrement annulée : catalogue complet de 15 habitudes ; langue distincte ; exclusion mapping inactif, version archivée et prix non nul ; inscription atomique à partir du planning réellement retourné ; fermeture du catalogue après gratuité utilisée ; isolation du second compte ; accès anonyme interdit ; aucun paiement créé.
- Vérification après rollback : 0 période, 0 horaire, 0 mapping et 0 programme de recette conservés. Exécution de la façade autorisée à authenticated et interdite à anon.
- 48 tests ciblés réussis : 11 nouveaux tests de catalogue/page et régression inscription, horaires, accès HD et offres existantes. Transport frontend simulé.
- Vérification TypeScript et compilation Vite avec le module activé. Aucun test de navigateur authentifié ou de REST PostgREST de bout en bout réalisé.
- Conseiller sécurité : aucun nouvel avertissement lié à cette migration. Les avertissements antérieurs restent le [placement de pg_net](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) et la [protection contre les mots de passe compromis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), hors périmètre de cette étape. Les tables privées sans politique client conservent leur fermeture.

## Avant ouverture réelle

Le catalogue TEST réel ne contient aucun mapping ni offre HD ouverte : aucun compte réel ne peut commencer ce parcours à ce stade. Il reste la validation du contenu et du périmètre offert, la configuration de publication, puis la recette authentifiée complète avant préparation d’un déploiement PROD. Les rappels, paiements et accès aux mois suivants ne sont pas activés par ce raccordement.

Retour préparé : `supabase/retours/habitudes_catalogue_gratuit.sql`, suppression des seules fonctions de lecture. Ce retour n’a pas été exécuté ; il ne supprime aucune inscription ni aucun historique.
