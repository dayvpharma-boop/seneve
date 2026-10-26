# Rappels par activité — installation TEST

25 octobre 2026. Migration habitudes_rappels_par_activite_sans_envoi sur seneve-test. Sources enregistrées sur branche avant exécution ; essai transactionnel préalable et recette sur composants installés avec rollback des fixtures.

Nouvelle table hd_activity_reminders, clé unique inscription/activité/canal/créneau. Le déclencheur d'insertion vérifie programme HD actif, inscription active, activité appartenant au programme/version/langue, journée locale dans le fuseau du participant et période du droit. Les écritures client ne sont pas autorisées ; lecture du propriétaire, traitement service_role uniquement.

Un trigger AFTER INSERT/UPDATE activity_state annule seulement les rappels planifiés de la même inscription et activité lorsqu'elle devient réalisée. Les deux côtés utilisent le même verrou transactionnel par inscription/activité pour sérialiser une planification et une réalisation concurrentes. La concurrence à deux connexions reste à tester.

Recette dans les tables réelles avec record_progress et fixtures annulées : matin réalisé annule le matin seul ; midi préparé conserve son rappel ; trois réalisations annulent trois rappels ; insertion tardive après réalisation devient annulée ; acceptation fournisseur déjà enregistrée préservée ; doublon rejeté ; créneau hors droit/journée refusé. Les contrôles précédents de droits, autre compte, futur, pause, répétition et aide sont également conservés dans cette recette.

Après rollback : file HD vide, aucun lien/période/inscription réel activé ; empreinte des programmes inchangée.

IMPORTANT : aucun expéditeur, ordonnanceur, worker n8n ou appel fournisseur ajouté. Les checks de consentement, liaison vérifiée, retrait de consentement, silence, révocation après planification, expiration au moment d'envoi, anti-rafale et réservation/délivrance restent à appliquer dans le futur dispatcher. La présence d'une ligne planifiée ne prouve pas une autorisation actuelle d'envoi. Les anciens rappels génériques ne doivent pas être utilisés pour HD avant adaptation/exclusion.

Retour additif avant utilisation : retirer les deux nouveaux triggers, les fonctions associées, puis la table, après vérification de l'absence de données et dépendances. Les droits SELECT de service_role ajoutés sur les registres/périodes HD doivent être réévalués si retrait complet. Aucune modification de production.
