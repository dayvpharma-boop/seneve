# Publication de la protection push en production — 23 novembre 2026

Publication autorisée par Dr Justin après réception confirmée du rappel de test de 12 h 30 Africa/Kinshasa.

Projet : seneve-prod. Sauvegarde exacte des fonctions précédentes : avant-production/ (rappels v3, annonces v3, HD v8). Les six fichiers de production étaient identiques au code main avant modification.

Déployé : envoyer-rappels v4, envoyer-annonces v4, envoyer-rappels-hd v9. Paramètres verify_jwt conservés (false, false, true). Relecture des neuf fichiers déployés : correspondance exacte au paquet attendu. Validation des fournisseurs Web Push et des clés avant transport ; délai réseau borné.

Migration seneve_066_securite_push appliquée. Contrainte push_appareils_abonnement_valide validée. Trois appareils présents compatibles. 37 contrôles SQL réussis en production, fixtures annulées, aucun envoi de test. Le contrôle ne confirme pas une nouvelle réception sur le téléphone après ce déploiement.

Aucun changement du planning, des consentements, des droits ou de l’obligation MFA. Les corrections de brouillons Journal/Aide F02 de la PR126 ne sont pas incluses dans cette publication serveur.

Retour arrière : redéployer les fichiers exacts de avant-production avec les paramètres JWT sauvegardés ; utiliser docs/securite/2026-11-22/retour-push.sql pour retirer la contrainte et la fonction si nécessaire. Ne supprimer aucun appareil pour forcer une migration.

Le contrôle de santé ne signale pas d’anomalie. Les autres avis de sécurité (protection contre mots de passe compromis, pg_net dans public et informations RLS) ne sont pas traités par ce lot ; aucune conclusion de sécurité globale.
