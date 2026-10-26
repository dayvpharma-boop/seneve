# Trame éditoriale des 30 jours gratuits — brouillon à relire

Le fichier `editorial/habitudes-defis/30-jours-fr-brouillon.json` prépare le travail éditorial. Il ne constitue pas un programme approuvé et n’est importé ni par le site, ni par Supabase, ni par un processus de publication.

## Ce qui est préparé

- 30 fiches numérotées, une par jour.
- 390 identifiants **éditoriaux**, distinguant les 13 habitudes quotidiennes sur chaque journée, notamment les trois prières. Ces identifiants ne sont pas des UUID d’activités réelles et ne doivent pas être envoyés aux API de progression.
- 15 propositions de consignes et critères : 13 habitudes quotidiennes et 2 groupes pour les trois participations hebdomadaires au culte. Leur source est le cahier fonctionnel fourni, sections 4 et 5. Chaque texte est marqué « proposition éditoriale non citation » et « à relire » ; aucune citation du livre n’est fabriquée.
- Des champs explicites pour le caractère obligatoire ou adapté, la relecture, la date et la preuve de validation. Aucune de ces décisions n’est préremplie comme approuvée.

## Ce qui reste à rédiger et décider

Les objectifs et textes pédagogiques des 30 journées sont vides. La répartition et les contenus des défis restent à définir : aucun défi quotidien obligatoire n’est supposé. Les critères de bilan et le périmètre coach/médias/bilans de l’offre doivent être approuvés. Les statuts obligatoire/adapté des habitudes sont laissés ouverts.

La prière reste une référence au document remis ; le texte intégral n’est pas recopié dans ce fichier. Le contrôle exige des droits confirmés et une référence au texte autorisé avant de déclarer le dossier prêt. La trame est uniquement française ; elle ne représente ni une traduction EN ni le corpus de six mois. Les cultes ne sont pas fixés sur des jours pédagogiques : leurs jours dépendent du début réel et du planning personnel.

## Contrôle local

`python scripts/editorial/verifier_habitudes.py editorial/habitudes-defis/30-jours-fr-brouillon.json`

Résultat observé : structure valide, 30 fiches, 390 identifiants distincts ; **non prêt pour publication**, avec 96 points de contrôle éditoriaux ouverts (plusieurs par fiche, pas 96 documents manquants).

Le même contrôle avec `--publication` retourne un code d’échec tant que des attentes subsistent. Il ne publie rien et n’est pas encore raccordé au pipeline existant : il ne faut pas le présenter comme un verrou de publication serveur. Les champs d’approbation servent à référencer des décisions humaines ; les remplir ne prouve pas à lui seul que la décision est authentique ni que la reproduction est autorisée.

Six tests Python réussis : trame complète mais non approuvée, activité partagée entre deux prières, prière manquante, journée dupliquée, consignes encore non approuvées et refus du mode publication sans modification du dossier. Commande : `python -m unittest discover -s scripts/editorial -p 'test_*.py'`.

## Prochaine utilisation

Relire les 15 consignes, rédiger les objectifs et contenus des journées à partir des sources vérifiées, puis joindre les preuves de relecture. Compléter le périmètre de l’offre et les droits du texte de prière. Ensuite seulement préparer une conversion vers les contenus et activités versionnés du programme réel, avec une recette des 30 jours. Les recommandations de livres/prédications, les médias et les traductions doivent recevoir leurs validations propres.

Cette préparation est sauvegardée sur la branche de développement ; aucune inscription, migration, diffusion publique ou activation de l’offre n’est effectuée.
