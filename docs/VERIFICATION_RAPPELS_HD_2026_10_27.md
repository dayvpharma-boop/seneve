# Vérification ciblée des rappels HD — 27 octobre 2026

Vérification dans seneve-test, sur compte fictif et transaction annulée. Réussites : configuration absente refusée, consentement absent refusé, précontrôle éligible avec accord et appareil fictif, autorisation d’envoi toujours fausse, heure de silence respectée, retrait du consentement pris en compte, réalisation partielle conservant le rappel, réalisation complète annulant seulement le rappel de l’activité concernée.

Après rollback : aucun compte RECETTE_RAPPEL_COURT conservé. Aucun fournisseur appelé, aucune notification envoyée, aucune modification en production, aucune préférence réelle activée.

L’essai global historique habitudes_precontrole_rappels.sql a rencontré une erreur de transport « Invalid or expired requestState » ; il n’est pas déclaré réussi. La vérification courte ci-jointe a réussi. Elle ne couvre pas le retrait de liaison WhatsApp ni les permissions du rôle d’expédition, et ne remplace pas tous les anciens essais.

Le précontrôle actuel utilise les droits Continuité et le calendrier HD mis à jour, mais conserve autorisation_envoi=false. L’expéditeur envoyer-rappels du dépôt traite les communications génériques via claim_push_reminders ; aucun traitement de hd_activity_reminders n’y est présent. La vérification ne constitue donc pas une mise en service des notifications HD. Le raccordement de la réservation, du précontrôle final et de l’expéditeur, puis un essai volontaire sur téléphone, restent à réaliser.
