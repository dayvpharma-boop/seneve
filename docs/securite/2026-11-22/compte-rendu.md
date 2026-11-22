# SÉNEVÉ — Corrections F01/F02, 22 novembre 2026

Point de départ vérifié : `98bbb869633a9beaa100d99c76c0d5511677e8a5`, branche principale GitHub inchangée lors de la préparation. Branche de travail : `securite/2026-11-22-notifications-brouillons`.

## Résultat et périmètre

| Point | Réalisation | État vérifié |
| --- | --- | --- |
| F01, adresses push | Validation des fournisseurs et chemins autorisés, structure et encodage canonique des clés ; garde commune avant les trois expéditeurs | Code préparé et testé sans transport réseau |
| F01, enregistrement | Contrainte ajoutée sur `seneve.push_appareils`, fonction interne sans accès client direct | Appliqué et validé dans **seneve-test uniquement**, migration `securite_push_validation_20261122` |
| F01, délai réseau | Ajout du timeout de socket de 10 secondes aux rappels et annonces ; déjà présent dans HD | Code préparé ; il ne s'agit pas d'un délai absolu de toute la tâche |
| F02, brouillons | Nettoyage local à la déconnexion, au changement de compte et à la reprise sans session ; retrait des anciennes clés sans propriétaire | Tests de stockage et de parcours Journal/Aide réussis |
| F02, conservation | Brouillon du compte courant conservé lors d'une reprise de session et d'un renouvellement de jeton | Tests réussis ; aucun appel de suppression des notes en base ajouté |
| Site et fonctions Edge publics | Pas de publication ni de remplacement de fonction | Production inchangée ; correctifs Edge non déployés en essai |

La contrainte agit aussi dans `rappels_activer`, dont les paramètres, le corps et les droits préexistants restent conservés. Aucun workflow, programme, identifiant de compte, consentement ou contenu officiel n'a été renommé.

Les brouillons Journal **et Aide** sont des saisies locales non enregistrées : ils seront effacés à la déconnexion après publication. Une saisie reste disponible si le même compte garde sa session hors connexion. Les notes synchronisées, droits et historiques ne sont pas supprimés.

## Vérifications

- 169 tests ciblés réussis dans 14 fichiers, couvrant notamment Journal/Aide, changement de compte, hors connexion, profil, notifications et transport push simulé.
- 15 tests du service hors connexion réussis avec `node --test scripts/offline-worker.test.mjs`.
- Vérification TypeScript réussie et construction du site réussie, avec 41 pages fixes.
- Résolution des imports relatifs et compilation syntaxique des trois fonctions Edge réussies avec esbuild ; les imports npm sont externes. Cela ne prouve pas un déploiement Deno.
- Contrôles SQL dans seneve-test : quatre structures de fournisseurs acceptées ; vingt variantes d'adresses interdites refusées ; clés invalides et privilèges testés ; appel réel de la RPC avec rôle `authenticated` et écriture directe avec rôle `service_role` vérifiés dans une transaction annulée. Le refus n'ajoute ni appareil ni consentement.
- Après annulation : zéro participant et zéro appareil fictifs restants. Contrainte présente et validée.
- Conseiller de sécurité avant/après : mêmes trois catégories d'alertes, aucune catégorie nouvelle. Les alertes antérieures restent à traiter selon le rapport initial.
- En production, lecture agrégée seulement : trois abonnements existants ont une destination compatible avec la règle proposée. Aucune destination personnelle ni clé d'abonnement n'est copiée dans ce dossier.

La suite complète de tests a été interrompue par la revue automatique de sécurité : une connexion vers un hôte Supabase non vérifié était demandée et la portée des données était inconnue. Elle **n'est pas déclarée réussie**. Ne pas relancer cette suite sans isoler ses appels externes et vérifier les destinations.

## Limites et travaux restants

- Essais réels Android et iPhone non effectués ; aucune notification réelle envoyée pendant cette préparation.
- La validation des clés porte sur la structure d'une clé P-256 non compressée et d'un secret d'authentification de 16 octets. La bibliothèque web-push vérifie le point elliptique pendant le chiffrement, avant son appel réseau.
- Fournisseurs pris en charge : hôtes exacts Google FCM, Apple `web.push.apple.com` et Mozilla ; les autres fournisseurs nécessitent une extension explicite de la règle et ses tests. Apple documente une famille plus large d'hôtes ; la règle présente conserve les hôtes réellement pris en charge par ce projet.
- Aucun quota d'appareils ou limite de fréquence n'est ajouté dans ce lot ; l'amélioration contre la consommation abusive reste à dimensionner. Aucune affirmation d'élimination de tous les abus ou de garantie SSRF absolue.
- MFA administrateur, mots de passe compromis, règles GitHub, dépendances, CSP et quotas publics ne sont pas corrigés par ce lot. La chaîne n8n/Meta et les paiements Chariow restent à vérifier.

## Sauvegarde et retour

Le commit initial ci-dessus conserve les fichiers applicatifs et Edge préexistants ; ils restent récupérables sur GitHub. Les anciennes contraintes, la fonction `rappels_activer` et les données n'ont pas été remplacées. La correction SQL est un ajout limité. `retour-push.sql` retire la nouvelle contrainte puis sa fonction, sans supprimer de données. L'accès USAGE du rôle de service au schéma privé existait déjà dans l'architecture.

Avant un futur remplacement des fonctions Edge, récupérer leurs versions déployées et conserver leurs paramètres JWT et fichiers annexes ; inclure `_shared/push-validation.ts` dans chaque paquet. La fonction HD en essai diffère de la production : ne pas remplacer son ancien code de recette sans vérifier les différences. Pour revenir sur le site après une future publication, annuler le commit de correction et reconstruire ; les brouillons déjà effacés localement ne sont pas récupérables.

## Prochaine étape

Préparer une recette isolée sur seneve-test avec ces fichiers exacts, vérifier les notifications sur les deux téléphones et deux comptes partageant un navigateur, puis publier le lot et recontrôler la production. La recette HD actuellement publiée utilise un ancien commit figé : elle ne montre pas automatiquement cette correction.

Références techniques consultées : [fonctions et privilèges Supabase](https://supabase.com/docs/guides/database/functions), [Web Push Apple](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [API Mozilla Autopush](https://mozilla-services.github.io/autopush-rs/http.html). Les chemins FCM et Apple des abonnements existants ont été vérifiés par agrégation en base. La bibliothèque web-push 3.6.7 utilise `https.request` sans suivi automatique des redirections.
