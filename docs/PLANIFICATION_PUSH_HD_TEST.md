# Planification des rappels personnels HD — TEST

Raccordement à `envoyer-rappels-hd`, version 2 déployée dans seneve-test uniquement. L’expéditeur prépare le planning avant de réclamer les notifications. Actif reste false ; aucun pilote n’est défini ; aucun cron n’est créé. Aucune notification réelle ni écriture en production.

## Règles

- Le seul participant pilote et son inscription active sont concernés ; priorité au programme réel si plusieurs inscriptions sont présentes.
- Préparation bornée à aujourd’hui et demain dans le fuseau personnel. Les créneaux passés ne sont pas recréés. Les rappels trop anciens sont annulés.
- Les horaires personnels remplacent les propositions, avec leurs dates de validité et jours de semaine. Les cultes d’un même jour gardent leurs rangs et activités distincts. Les défis facultatifs ne génèrent aucun rappel.
- Consentement push, appareil, configuration et droit au créneau requis. Le calendrier utilise hd_date_du_jour pour les périodes du parcours, notamment les mois payants.
- Un changement de créneau annule l’ancien rappel et crée le nouveau, sans réactiver automatiquement une ligne annulée. Une activité ayant déjà une réservation n’est pas reprogrammée automatiquement.
- Le créneau est recalculé à l’autorisation et au dernier contrôle : un ancien horaire ne suffit pas à envoyer. Une activité réalisée et un retrait de consentement bloquent toujours l’envoi.
- Calcul du planning attendu effectué une fois par préparation de journée ; les verrous d’activités précèdent les modifications de lignes.

## Vérification

Deux recettes SQL ciblées ont réussi après optimisation et ont été entièrement annulées : préparation de demain, rejeu sans doublon, changement d’heure, refus du rattrapage passé, refus d’un ancien créneau, autorisation courante, retrait du consentement, annulation après réalisation, clôture non réinscriptible et deux cultes le même jour. La recette globale avait réussi avant optimisation ; son rejeu a rencontré une erreur de transport Invalid or expired requestState, sans session ou donnée fictive conservée. Les deux recettes courtes remplacent cette exécution globale pour la vérification finale.

Sept tests du moteur réussis, dont aucun appel au fournisseur si la planification n’est pas prête. TypeScript réussi. Interrupteur fermé, zéro pilote, zéro tentative et zéro compte fictif confirmés après essais. Conseillers de sécurité : mêmes 23 informations RLS fermées et mêmes deux avertissements historiques, pas de nouvel avertissement.

La première mise à jour de l’Edge Function a rencontré une référence obsolète de chemin d’import ; le déploiement version 2 a réussi avec import_map_path=deno.json explicite. verify_jwt=true conservé et clé d’appel interne toujours exigée.

## Limites

Il reste la réception réelle sur un téléphone volontairement inscrit aux notifications, puis la décision d’activation et de planification périodique. Aucun test sur téléphone n’est déclaré réussi. L’acceptation d’un fournisseur ne garantit pas l’affichage effectif ; une notification déjà remise ne peut pas être rappelée.

Migrations TEST : habitudes_push_planification_pilote_test puis habitudes_push_planification_calcul_unique. La source consolidée est supabase/propositions/habitudes_push_planification_test.sql et s’applique après le socle expéditeur. La recette habitudes_push_dispatch_pilote.sql a été mise à jour pour imposer la correspondance exacte au créneau personnel.

Retour arrière : conserver l’interrupteur fermé et la version précédente de l’expéditeur si nécessaire ; ne pas effacer les réservations ou les états de progression.
