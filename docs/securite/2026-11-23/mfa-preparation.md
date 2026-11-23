# Préparation du second facteur administrateur

Statut : écran préparé, sans déploiement ni obligation serveur. F03 reste ouvert.

Base : main `98bbb869633a9beaa100d99c76c0d5511677e8a5`. Branche dédiée : `securite/2026-11-23-mfa-administrateur`.

## Comportement

Route `/admin/securite`, réservée dans l’interface au rôle retourné par `staff_me`. Les opérations MFA concernent le compte connecté via Supabase Auth. Une action explicite et une déclaration de préparation d’un secours précèdent la création du facteur TOTP. Cette déclaration ne prouve pas que la récupération fonctionne.

Le QR et la clé restent en mémoire du composant. Changement de session, annulation ou validation retirent leur affichage. Une réponse d’activation tardive après changement de session est ignorée. L’annulation relit les facteurs et ne supprime jamais volontairement un facteur déjà vérifié. Aucun facteur réel, QR personnel ou code réel n’a été créé pendant ces tests.

La liste `all` de Supabase permet de retrouver les activations inachevées ; la liste `totp` ne contient que les facteurs vérifiés. La vérification retourne directement les jetons de session, sans propriété `session`. Le SDK installé a été consulté pour ces contrats.

## Validation et limites

Huit tests avec réponses fictives couvrent le refus non administrateur, l’action explicite, le code refusé, la vérification réussie, l’annulation, la concurrence avec un facteur devenu vérifié, le changement de session et la réponse tardive. Ils ne remplacent pas une recette avec Supabase et une application d’authentification réelle.

Avant toute obligation : recette sur le compte de test, validation personnelle du facteur de l’administrateur, vérification d’un moyen de récupération, puis revue des contrôles AAL2 côté serveur. La fermeture des autres sessions lors de la vérification doit être prise en compte. Aucun contrôle serveur, droit, abonnement ou compte de production n’a été modifié ici.

Retour arrière : retirer la route et son import dans `src/main.tsx`, puis les fichiers du composant et de ses tests. Cette préparation ne comporte aucune migration de base.

Références officielles :
- https://supabase.com/docs/guides/auth/auth-mfa
- https://supabase.com/docs/reference/javascript/auth-mfa-enroll
- Types installés : `@supabase/auth-js`, `AuthMFAVerifyResponseData`, `AuthMFAListFactorsResponse`.
