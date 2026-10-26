# Expéditeur de notifications HD — TEST, 27 octobre 2026

L’expéditeur séparé `envoyer-rappels-hd` est déployé uniquement sur seneve-test, version 1. Aucun cron créé, aucun appel fournisseur effectué. L’interrupteur est fermé et aucun participant pilote n’est défini. L’expéditeur générique et Supabase production ne sont pas modifiés.

## Chaîne raccordée

1. Configuration privée : actif et participant pilote obligatoires, tous deux contrôlés avant réservation.
2. Réservation interne existante, unique par rappel, limitée aux rappels push dus du seul pilote et éligibles au précontrôle.
3. Autorisation consommable une seule fois après nouveau précontrôle et verrou par activité.
4. Contrôle final du consentement, des droits, du silence et de l’activité avant chaque appel fournisseur.
5. Notification neutre, sans nom d’habitude ou information spirituelle sur l’écran verrouillé, ouvrant la journée personnelle.
6. Clôture séparant acceptation fournisseur et échec. Une acceptation ne prouve pas la réception sur le téléphone. Une tentative incertaine reste réservée et n’est pas rejouée automatiquement.

Les endpoints sont limités à HTTPS et aux hôtes de notifications Apple, Firefox et Google prévus ; les identifiants dans l’URL et les hôtes arbitraires sont refusés. Les endpoints et erreurs fournisseurs ne sont pas journalisés. Les clés VAPID existantes restent dans la base et la mémoire serveur. La fonction garde verify_jwt=true et exige aussi la clé d’appel interne.

## Vérification

- Six tests du moteur avec transport fictif : interrupteur fermé, refus final, autorisation consommée, déduplication d’appareil, texte neutre, absence de rejeu et endpoints refusés.
- SQL TEST intégralement annulé : interrupteur, pilote, deux réservations distinctes, rejeu refusé, autorisation à usage unique, retrait avant envoi, annulation après réalisation, clôture non réinscriptible, client refusé et rôle d’expédition reconnu.
- Contrôle TypeScript réussi.
- Après rollback : actif=false, pilote non défini, zéro tentative conservée, zéro compte fictif conservé.
- Conseillers : les deux avertissements historiques demeurent (pg_net dans public et protection des mots de passe divulgués) ; aucune nouvelle catégorie d’avertissement. Les tables privées sont fermées par RLS et révocation des droits directs.

## Limites et suite

Pas encore de réception réelle validée sur téléphone, ni d’activation en production. La planification doit encore alimenter la file HD depuis les horaires personnels. L’activation du pilote et un essai réel volontaire sont distincts de ce déploiement fermé. Un retrait arrivé après remise au fournisseur ne peut pas rappeler une notification déjà acceptée ; la durée de vie du message est limitée à 60 secondes.

Source SQL consolidée : `supabase/propositions/habitudes_push_dispatch_test.sql`. L’état installé correspond aux migrations TEST `habitudes_push_dispatch_test_desactive`, puis `habitudes_push_dispatch_pilote_unique`. Ne pas appliquer en production sans la réception de l’ensemble de la chaîne. Retour arrière réversible : laisser actif=false ; ne pas supprimer les réservations ou l’historique.
