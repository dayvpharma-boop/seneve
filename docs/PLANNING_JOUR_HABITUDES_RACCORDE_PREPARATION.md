# Planning personnel dans la journée — raccordement de préparation

PlanningJourHabitudes est appelé par la branche HD de l’espace, uniquement en ligne et avec l’identifiant du participant connecté. Cet identifiant est désormais sélectionné depuis sa ligne participants. Les horaires restent dans l’état du composant, séparés des données de l’espace destinées à la copie hors connexion.

Le composant utilise le RPC hd_schedule_settings déjà installé sur TEST ; aucun changement SQL dans cette étape. Le serveur contrôle propriétaire, inscription et droit actif comme lors de l’étape de sauvegarde. L’interface ne déduit pas le propriétaire d’une ligne d’horaire.

Le calcul reçoit la date civile du jour choisi, le fuseau de la configuration et la version du modèle renvoyé. Un changement de date affiche les périodes applicables sans réécrire les anciennes journées. Les heures proposées et personnelles portent des libellés distincts. L’actualisation relit explicitement les réglages, par exemple après un changement sur un autre écran ; il n’y a pas de synchronisation instantanée entre appareils.

Les rendez-vous simultanés sont signalés, sans déplacement imposé ni durée de prière supposée. Un échec de lecture ou une incohérence de fuseau affiche un état indisponible sans inventer de planning. Une réponse tardive d’une autre inscription est ignorée.

## Périmètre

Cette vue expose des repères, pas une nouvelle liste de déclarations. Aucune correspondance entre activities et habit_key n’est inventée : le raccordement précis des activités officielles aux habitudes reste à construire. Aucune validation d’activité, ouverture de contenu, programmation de rappel ou modification de droit n’est réalisée.

Si le droit actuel n’est plus disponible, le RPC de réglages peut refuser la lecture du planning ; l’interface n’en déduit aucune suppression de l’historique des actions. Le cas de modification du fuseau avec anciens horaires n’est pas converti implicitement : une incohérence reste indisponible.

## Vérifications

37 tests distincts : 8 pour la vue du jour, 10 pour l’espace HD, 10 du calcul des horaires, 9 du cache. Scénarios : proposé/personnel, changement daté, rendez-vous simultanés, absence de fausse activité, erreur de lecture, actualisation, réponse tardive, fuseau incohérent, commandes anglaises et raccordement du sélecteur de jour. TypeScript et Vite réussis.

Les tests d’interface simulent le RPC. Aucun parcours navigateur authentifié de bout en bout ni contrôle visuel Safari dans cette étape. Pas de nouvelle donnée d’essai en base. Le code reste sur feat/habitudes-defis-socle, sans déploiement public ni activation du module connecté.
