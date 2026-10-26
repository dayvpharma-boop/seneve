# Déclarations quotidiennes — recette HD, 26 octobre 2026

La capture utilisateur IMG_8509 confirme l’affichage authentifié du planning personnel. Cette étape ajoute la déclaration des 13 habitudes quotidiennes à la recette isolée.

## Périmètre

Uniquement le programme technique HD_RECETTE_INSCRIPTION_FR_20261026 dans seneve-test. 30 supports techniques et 390 activités avec UUID stables et note_source explicite. Les intitulés reprennent les 13 modèles quotidiens existants. Aucun texte du livre ou de l’Amidah n’est reproduit. Ce catalogue ne constitue pas la publication du corpus pédagogique complet. Les cultes et leurs créneaux variables restent hors déclaration pour cette étape.

Chaque activité publiée est reliée à son horaire personnel. Une correspondance manquante ou ambiguë ferme l’écran. La date courante est vérifiée avec hd_schedule_settings ; l’inscription, le participant, la langue et la version doivent correspondre. L’interface utilise record_progress et DeclarationHabitude existants : préparée, partielle, réalisée. Le bilan ne compte que les réponses confirmées et les états relus du serveur. Le rejeu conserve le même identifiant après perte réseau. Aucun bouton d’aide dans cet essai ; coach gratuit toujours exclu et aucun paiement ajouté.

## Vérifications

- 28 tests locaux de déclaration, affichage, lecture et contrôle d’identité ; TypeScript sans erreur.
- Recette SQL sur utilisateur fictif, intégralement annulée : déclaration partielle puis réalisée, relecture, rejeu idempotent, refus du futur et d’un autre compte, coach non proposé.
- Après ajout des supports techniques : 30 jours, 390 activités, zéro déclaration créée pour les vrais participants et quota coach gratuit zéro.
- Aucune migration de schéma, aucun droit ni horaire existant modifié. Aucun envoi de message. Supabase production inchangé.

Le script de vérification inclut les insertions et doit être exécuté avant ouverture des supports, sinon son contrôle d’existence refuse toute substitution. Pour revenir en arrière après utilisation, republier la précédente version d’interface en conservant activités et historique ; ne pas supprimer les données de progression.

La vérification authentifiée du nouvel écran sur le téléphone du participant reste à faire après publication.
