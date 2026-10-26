# Précontrôle des rappels — base de test
Date : 25 octobre 2026.

Migration installée uniquement sur seneve-test (rlojnuaajeubzlwofwhn) :
habitudes_precontrole_rappels_sans_envoi.
Sources : supabase/propositions/habitudes_precontrole_rappels.sql.
Recette : supabase/tests/habitudes_precontrole_rappels.sql.

## Résultat
La fonction hd_reminder_precheck est réservée à service_role. Elle vérifie l'inscription, la correspondance activité/jour/version, la configuration explicite, le fuseau, la tolérance de retard configurée, les heures silencieuses, le droit actif, l'état de l'activité, le consentement actuel et le canal.
WhatsApp exige une seule liaison vérifiée, non révoquée et un consentement portant sur cette identité.
Push exige un appareil enregistré et un consentement.
L'email reste refusé faute de vérification d'identité intégrée.

Même un résultat eligible_interne=true conserve autorisation_envoi=false.
Aucun expéditeur, worker, appel fournisseur ou réservation n'est créé.

## Vérification exécutée
Recette SQL complète réussie sur les objets installés, dans une transaction annulée :
- configuration absente refusée ;
- consentement accordé reconnu puis retrait bloquant ;
- heures silencieuses bloquantes ;
- droit révoqué bloquant ;
- liaison WhatsApp absente puis vérifiée puis révoquée ;
- permissions réelles du rôle serveur vérifiées ;
- appel direct du client authentifié refusé ;
- régression de la progression, dédoublonnage, isolation des comptes, expiration des droits et annulation par activité.
Après rollback : zéro préférence, rappel, période, liaison de programme HD et fixture de participant/programme.

Le contrôle de sécurité Supabase ne signale aucun nouvel objet de cette migration.
Alertes préexistantes inchangées : pg_net dans public et protection des mots de passe divulgués désactivée.
Remédiations :
https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Limites avant activation
Prévoir une réservation atomique et la revalidation juste avant l'appel fournisseur ; ce précontrôle seul ne garantit pas l'absence de concurrence.
Intégrer les règles du fournisseur et son résultat, la déduplication, les reprises et la preuve d'envoi.
Exclure HD du générateur générique existant avant toute activation.
Raccorder les préférences à un parcours utilisateur validé.
Ne pas déduire un accord d'envoi de ce document.
Production et module public inchangés.

## Retour arrière de cette migration seulement
Après contrôle des dépendances et sauvegarde d'éventuelles préférences futures :
supprimer la fonction seneve.hd_reminder_precheck(uuid), puis la table seneve.hd_delivery_preferences.
Ne pas supprimer les autres tables HD ni les données du parcours existant.
