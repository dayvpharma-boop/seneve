# Correction d’un « Fait » accidentel — 28 octobre 2026

Avant : une réalisation confirmée ne proposait pas de correction.
Après : « Corriger ce Fait », puis confirmation explicite, remet cette activité à « À faire ». « Garder Fait » ferme sans écrire.

La journée et les bilans lisent l’état consolidé corrigé. Pour les lectures, les saisies antérieures restent dans l’historique technique mais sont exclues des durées affichées et additionnées ; une nouvelle saisie sera comptée normalement. Le panneau déjà ouvert retire immédiatement la durée corrigée. Les demandes d’aide et les notes du journal sont conservées.

## Contrôles

- 23 tests d’interface ciblés réussis : déclarations existantes, correction, annulation avant confirmation, erreur réseau/reprise, conflit et panneau des lectures.
- TypeScript : réussi.
- Recette SQL transactionnelle réussie dans TEST et PROD avec comptes synthétiques et ROLLBACK : correction, durée retirée, historique brut conservé, nouvelle lecture, doublon, ancien événement rejoué, conflit de modification, autre compte, jour futur, révocation et session absente.
- Aucune correction réelle créée pendant la recette ; table de corrections vide après annulation.
- Aperçu interactif local utilisant une activité fictive ; aucun appel à Supabase.
- Les avertissements de sécurité existants pg_net/public et protection de mots de passe restent hors de cette modification. La nouvelle table a RLS, politique de refus direct et aucun privilège client ; la fonction vérifie le titulaire. Documentation : https://supabase.com/docs/guides/database/postgres/row-level-security

## Mise en œuvre

La préparation fournit un jeton lié à l’état courant et à la dernière saisie de durée. La confirmation vérifie ce jeton sous verrou. Si l’activité a changé depuis l’ouverture, la correction est refusée et demande une actualisation. Une requête incertaine est conservée dans l’onglet et rejouée avec le même identifiant. Le rejeu retourne l’état courant sans retirer une nouvelle réalisation. La déconnexion nettoie les requêtes locales de correction.

Les archives restent en lecture seule. Cette étape permet la correction des réalisations accessibles dans Ma journée et ses panneaux, sans ajouter d’édition aux archives historiques.

Migration : supabase/propositions/habitudes_correction_realisation.sql.
Recette : supabase/tests/habitudes_correction_realisation.sql (offre et programme de recette TEST ; substituer les identifiants du programme réel pour la recette PROD).
