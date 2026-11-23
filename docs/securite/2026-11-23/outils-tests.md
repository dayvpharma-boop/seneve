# SÉNEVÉ — F06, outils de test, 23 novembre 2026

Point de départ : main, commit 98bbb869633a9beaa100d99c76c0d5511677e8a5. Correction séparée de la PR 126 ; aucune publication ou migration de données.

Changement : version Vitest fixée à 4.1.12 et verrouillage npm actualisé. @vitest/mocker est résolu à 4.1.12. Tinypool n'est plus présent dans l'arbre npm. La résolution porte sur l'outillage de développement ; les dépendances de production déclarées sont conservées.

Vérifications locales : npm audit retourne zéro alerte connue (info/faible/modérée/élevée/critique : toutes zéro). 109 tests ciblés réussissent dans huit fichiers, sur la copie de travail contenant aussi les correctifs F01/F02. TypeScript réussit. La suite complète sur le code exact de cette branche sera contrôlée par GitHub Actions ; ne pas confondre ces périmètres. Une absence d'alerte connue ne constitue pas une garantie d'absence de toute vulnérabilité.

Compatibilité : le registre npm indique pour Vitest 4.1.12 Node ^20.0.0, ^22.0.0 ou >=24.0.0, et Vite ^6.0.0, ^7.0.0 ou ^8.0.0. Le projet utilise Vite 7 et ses workflows utilisent Node 22 ; le contrôle local s'est exécuté sous Node 24.22.3. Les contraintes du runtime Vite 7 restent à respecter. Aucun changement demandé au téléphone des participants.

Retour : restaurer package.json et package-lock.json depuis le commit initial, puis exécuter npm ci. Les configurations antérieures sont récupérables dans GitHub ; des copies de travail ont également été conservées avant l'installation. La mise à jour majeure doit passer les contrôles de branche avant intégration.

## Autres constats revérifiés

- F03 : un administrateur applicatif, aucun avec facteur MFA Supabase vérifié. L'interface d'administration ne contient pas encore de parcours MFA. Prévoir inscription TOTP, vérification de la récupération et contrôle aal2 côté serveur avant d'imposer la règle. Ne pas verrouiller le seul administrateur avant ces étapes. Aucun facteur ou secret TOTP n'a été créé pendant ce contrôle.
- F04 : le conseiller confirme la protection contre les mots de passe compromis désactivée. L'organisation est sur Free ; la documentation officielle indique une disponibilité sur Pro ou supérieur. Aucun changement de forfait n'a été effectué.
- F05 : main reste sans protection lors de la relecture API. Les outils GitHub disponibles n'exposent pas de modification des règles de branche ; ce réglage reste à réaliser par une voie disposant des droits nécessaires.

Références consultées : registre npm (métadonnées des versions et dépendances), [MFA Supabase](https://supabase.com/docs/guides/auth/auth-mfa), [sécurité des mots de passe Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Les contrôles de compte portent uniquement sur des métadonnées agrégées, sans journal ni donnée intime.

Adaptation du test historique : le serveur interne de Vitest sert désormais à la racine ; le lien attendu utilise sa BASE_URL effective tout en vérifiant exactement le chemin journal, le contexte bilan mensuel et l’inscription. Le préfixe /seneve/ de la vraie construction est vérifié séparément dans les fichiers construits. Aucun changement du composant applicatif.
