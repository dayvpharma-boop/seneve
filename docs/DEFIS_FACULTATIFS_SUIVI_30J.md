# Suivi des défis facultatifs — 27 octobre 2026

Accord du porteur : réponse « D’accord » à la présentation des quatre défis facultatifs des jours 1–7, 8–14, 15–21, 22–28 et du bilan des jours 29–30, avec états préparé, partiel et réalisé. Les textes étaient déjà affichés dans l’écran Stitch ; cette étape conserve ces textes et ajoute leur déclaration volontaire.

## Comportement

Bouton « Suivre mes défis facultatifs » sous le défi de la semaine. Chargement seulement après ouverture volontaire. Cinq états propres à l’inscription, relus du serveur. Les semaines futures sont affichées verrouillées. Un défi déjà ouvert peut être repris pendant le premier mois ; il n’exige aucun quota de jours réussis, nom, montant, preuve ou récit personnel.

Les défis sont des engagements facultatifs, distincts des actions quotidiennes. Ils ne changent ni le compteur des habitudes, ni les critères d’une journée complète, ni les horaires. Ils utilisent record_progress et le mécanisme idempotent existant. Aucun état n’est créé lors d’une simple lecture. Les boutons d’aide sont absents de ce suivi.

Périmètre : premier mois français uniquement. Aucun suivi de défi n’est réutilisé automatiquement dans les mois 2 à 6. Les textes déjà repris dans ces mois ne sont pas modifiés. Aucune traduction nouvelle, collecte de texte libre, permission, table, droit commercial ou appel IA.

## Validation

- 17 tests locaux : 7 nouveaux tests de lecture/interface et 10 tests existants de déclaration ; TypeScript réussi.
- Compte fictif dans TEST, transaction intégralement annulée : états préparé, partiel, réalisé ; rejeu idempotent ; refus d’un défi futur et d’un autre compte ; aucune activité quotidienne déclarée par l’essai.
- Ajout de cinq engagements non obligatoires aux programmes présents : réel FR et essai technique dans TEST ; réel FR uniquement dans PROD. Aucun identifiant ni état existant remplacé.

Le script de recette complète inclut l’insertion du catalogue et doit être joué avant insertion persistante ; il refuse une substitution à des défis déjà présents. Pour revenir en arrière, retirer uniquement l’interface de suivi et conserver les activités et déclarations. Ne pas supprimer l’historique.

La vérification du nouvel écran authentifié sur téléphone reste à compléter après publication.
