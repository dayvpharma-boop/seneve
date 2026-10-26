# Écran d’inscription aux 30 jours gratuits — préparation

État historique de la première étape. Le montage de la route et le catalogue TEST ont été réalisés ensuite : voir `CATALOGUE_INSCRIPTION_GRATUITE_TEST.md` pour l’état actuel. L’ouverture publique reste non effectuée.

Le composant `InscriptionHabitudes` et son adaptateur RPC sont préparés sur la branche de développement. Ils ne sont montés dans aucune route et ne sont pas publiés sur GitHub Pages. Le serveur TEST dispose déjà de `hd_start_free` ; aucune migration supplémentaire, aucun compte ni aucune inscription réelle n’a été créé pendant cette étape.

Le formulaire présente les horaires et leur fuseau, permet de modifier les heures, puis exige une case de confirmation explicite. Le serveur reste responsable de la disponibilité de l’offre, des fréquences, des droits, du participant authentifié et de l’unicité de la période gratuite. Le navigateur ne transmet pas d’identifiant de participant. Le texte annonce 30 jours dès confirmation et aucun paiement automatique.

Pendant une réponse incertaine, les choix sont figés et la même demande est réessayée. Le serveur peut retrouver l’inscription existante : l’écran indique alors que les dates et les horaires ont été conservés, sans prétendre appliquer les nouvelles heures ni réactiver un droit. La réponse est vérifiée (identifiants, durée exacte de 720 heures, indicateurs de création et d’application des horaires) avant toute annonce de confirmation. La fin s’affiche dans le fuseau du compte. Aucun droit actif n’est déduit de cette seule réponse : le lien invite à consulter les accès pour les relire.

Un changement de compte ou de configuration réinitialise le formulaire. Les demandes ne sont pas persistées dans le navigateur. Après un rechargement, une reprise doit relire le contexte autorisé ; le serveur conserve sa protection contre un second accès gratuit.

Validation locale : 9 tests dédiés (confirmation explicite, heures transmises, double soumission, réponse perdue, durée incohérente, gratuité déjà utilisée, refus, changement de compte, droit révoqué et traduction), avec les tests des horaires et des accès : 26 tests réussis. Transport RPC simulé ; aucune recette navigateur authentifiée ou REST de cet écran n’a été faite. Compilation Vite et vérification TypeScript exécutées séparément.

Reste à réaliser : catalogue de préinscription lu côté serveur et limité aux programmes publiés et offres conformes ; montage du formulaire dans une route authentifiée ; recette complète avec horaires, droits, reprise après erreur et changement de session. Aucun identifiant d’offre ou programme réel n’est inventé pour activer le bouton. Le corpus et le périmètre de l’offre doivent être validés avant ouverture publique. L’aperçu public existant reste disponible sans inscription réelle.
