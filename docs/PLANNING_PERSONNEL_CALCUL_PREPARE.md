# Calcul des horaires personnels — préparation

Source : cahier des charges Habitudes & Défis du 25 octobre 2026, sections 4 et 5. La configuration FR reprend 13 repères quotidiens et trois cultes hebdomadaires proposés : mercredi et vendredi à 18 h 30, dimanche à 9 h. Ces horaires sont des propositions, sans publication ni programmation de rappel.

Le calcul pur planningHabitudesPourDate remplace les propositions par les créneaux personnels applicables à la date civile demandée. Il conserve les versions datées et isole participant, module, version et langue. Les bornes valide_du/valide_au de ce modèle sont inclusives : un changement daté doit donc fermer la version précédente la veille. Les horaires simultanés sont signalés, sans déplacement automatique ni durée de prière inventée. Aucun état de réalisation, droit ou rappel n’est créé.

Plusieurs créneaux identifiés peuvent appartenir à la même habitude : deux cultes en semaine peuvent ainsi avoir des jours et des heures différents. Un ensemble personnel actif remplace entièrement la proposition de l’habitude, y compris les jours sans rendez-vous personnel. Le calcul n’impose ni score de foi ni validation automatique. Il ne décide pas de l’admissibilité pédagogique d’une adaptation ou d’un culte à distance.

## Validation

10 tests dédiés plus 6 tests de calendrier et 8 de bilans réussis (24 au total). TypeScript réussi. Tests : nombre de rendez-vous proposés, remplacement personnel, conservation des horaires passés, trois créneaux distincts, date civile, isolement, simultanéité, ambiguïté, fuseau et données invalides.

## Raccordement encore à réaliser

Ce calcul n’est pas encore appelé par les écrans de l’application. Le formulaire, la lecture et la sauvegarde sécurisées restent à construire. Inspection de seneve-test : hd_habit_schedules ne contient pas de creneau_id et sa contrainte unique actuelle porte sur participant/module/version/langue/habitude/valide_du. Elle ne permet donc pas deux créneaux de la même habitude commençant le même jour. Il faut adapter et tester le stockage avant tout raccordement ; ne pas écraser un horaire pour contourner cette limite.

Aucune migration, aucun horaire personnel ni aucune programmation de rappel n’a été écrit dans cette étape. Module toujours inactif, production inchangée.
