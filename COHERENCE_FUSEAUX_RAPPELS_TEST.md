# Cohérence des fuseaux des rappels HD — TEST
25 octobre 2026.
Migration habitudes_rappels_fuseau_coherent installée uniquement sur seneve-test (rlojnuaajeubzlwofwhn).

## Résultat
hd_reminder_precheck relit le fuseau du participant selon la même priorité que le calendrier :
preferences.rappels.fuseau, puis participants.fuseau.
Une valeur absente ou invalide bloque le rappel.
La configuration de livraison doit conserver exactement ce fuseau enregistré ; une différence est refusée avec le motif fuseaux_incoherents.
Aucune conversion d'alias ou correction silencieuse des préférences n'est faite.
Le serveur ne modifie aucune préférence réelle et ne reprogramme aucun créneau par cette étape.
Une future modification d'horaire devra mettre les configurations en cohérence et recalculer les créneaux avant l'envoi.

Les conditions existantes restent inchangées : droits, progression, consentement, canal, fenêtre et silence.
La fonction reste réservée à service_role et toutes les réponses gardent autorisation_envoi=false.
La réservation interne appelle déjà ce précontrôle ; elle bénéficie donc également du refus d'une configuration incohérente.
Aucun fournisseur ou expéditeur n'est ajouté.

## Vérification
La recette complète supabase/tests/habitudes_rappels_fuseau_coherent.sql a réussi sur les objets installés, dans une transaction annulée.
Elle vérifie : différence de fuseaux refusée, priorité de la préférence sur le profil,
retour au profil si la préférence manque, fuseau participant invalide refusé,
retour à une configuration cohérente accepté au seul niveau interne, jamais comme autorisation d'envoi.
Elle rejoue aussi les vérifications précédentes du précontrôle, des permissions serveur/client,
de progression, d'isolation et d'annulation des rappels par activité.
Les données fictives sont annulées. Aucune donnée de participant réel modifiée.
Le contrôle de sécurité ne signale pas de nouvelle alerte sur la fonction.
Les avertissements préexistants restent inchangés.

## Limites et retour
Aucun envoi ni activation de module ; production inchangée.
La cohérence au précontrôle n'est pas une garantie contre un changement ultérieur : le futur expéditeur doit revalider avant l'appel fournisseur.
Définition précédente exacte conservée dans supabase/retours/habitudes_rappels_fuseau_coherent.sql.
Ne pas la restaurer après activation sans revoir le calendrier et les rappels ensemble.
