# Exclusion de HD des rappels génériques — TEST
25 octobre 2026.
Migration installée : habitudes_exclure_rappels_generiques.
Projet concerné uniquement : seneve-test (rlojnuaajeubzlwofwhn).

## Problème et correction
Le générateur push choisissait un contenu par journée et un rappel par participant/moment,
sans appliquer les droits et les trois occurrences distinctes du module HD.
L'email du matin disposait aussi d'un générateur générique indépendant.
Les inscriptions enregistrées dans hd_programme_links sont désormais exclues des deux circuits,
quelle que soit la valeur actif de la liaison. Une liaison inactive ne contourne pas l'exclusion.
Le filtrage push intervient avant DISTINCT pour qu'une inscription HD ne masque pas un autre parcours du même participant.
Le contrôle push avant prise en charge refuse également les anciennes communications HD.
Les emails HD en attente ou en erreur, et les reprises assez anciennes, sont annulés avant prise en charge.
Les états accepté/incertain et les traitements récents sont préservés.
Aucune inscription ni règle des parcours non HD n'a été modifiée.

Fonctions remplacées avec signatures et permissions conservées :
- seneve._push_rappel_eligible(uuid)
- seneve.claim_push_reminders(integer)
- seneve.claim_morning_emails(integer)

## Vérification
La recette supabase/tests/habitudes_exclure_rappels_generiques.sql a réussi avec rollback.
Elle utilise une inscription HD et un parcours témoin du même participant :
- liaison HD inactive puis active refusée au contrôle push ;
- aucun rappel HD créé par les générateurs ;
- aucun rappel HD pris en charge par les deux fonctions ;
- quatre communications HD en attente/erreur annulées ;
- six communications déjà acceptées, incertaines ou récemment en traitement préservées ;
- push du témoin pris en charge une fois ;
- email du témoin pris en charge dans sa fenêtre existante 07h–20h.
Le test a été exécuté dans cette fenêtre le 25 octobre 2026.

La recette préexistante _verification_rappels_sans_envoi() réussit également :
« Scenarios verifies; donnees de test annulees; aucun envoi ».
Contrôle final : zéro fixture de programme, participant ou communication,
zéro liaison HD, rappel HD ou réservation HD conservés.

Le premier essai d'installation a été rejeté pour un séparateur SQL manquant entre définitions exportées ;
la transaction n'a pas été appliquée. Source corrigée, installation et tests ensuite réussis.
Aucune nouvelle alerte de sécurité sur les fonctions modifiées.
Les avertissements préexistants pg_net/public et protection des mots de passe divulgués restent inchangés :
https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Retour
Les trois définitions exactes précédentes sont conservées dans
supabase/retours/habitudes_exclure_rappels_generiques.sql.
Ce retour restaure le circuit précédent ; ne pas l'appliquer après activation HD sans réévaluation.

## Limites
Base de test uniquement, aucune modification de production, aucun expéditeur HD ni envoi.
L'exclusion ne rappelle pas un message déjà accepté par un fournisseur.
Le futur circuit HD doit encore intégrer la vérification finale, le fournisseur, ses accusés et les reprises contrôlées.
Les parcours de six mois, l'interface complète et les contenus ne sont pas déclarés terminés par cette étape.
