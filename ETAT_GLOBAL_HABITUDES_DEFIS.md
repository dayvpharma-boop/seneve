> **Rapport historique.** Ce document décrit l'étape réalisée à sa date. Pour l'installation et les accès actuellement constatés, consulter [l'inventaire du 27 octobre 2026](docs/INVENTAIRE_HD_2026_10_27.md). Ses mentions « uniquement TEST » ou « aucun déploiement PROD » ne décrivent plus l'état courant.

# État global Habitudes & Défis — revue de préparation
Date : 25 octobre 2026.
Sources : cahier HD du 25 octobre 2026, sections 7–16 ; architecture HD ; sources et comptes rendus de la branche feat/habitudes-defis-socle.
Cette revue n'est ni une réception complète ni une autorisation de publication.

## État observé
- Sources frontend enregistrées sur la branche de travail, option VITE_HABITUDES_DEFIS désactivée par défaut.
- Contrôles serveur HD installés uniquement dans seneve-test.
- Lecture du jour, déclarations distinctes, suivi, fuseaux personnels, calculateur pédagogique et bilans hebdomadaires préparés.
- 61 tests frontend du module réussis ensemble dans cette revue (8 fichiers).
- Les recettes SQL déjà exécutées sont décrites dans les comptes rendus correspondants ; elles utilisent des fixtures puis rollback.
- Lecture finale de TEST : zéro liaison HD, période HD, rappel HD, réservation HD et calendrier HD.
- Aucun envoi ou activation en production.

## Matrice des scénarios du cahier
« Partiel » signifie qu'une couche est testée, sans preuve de bout en bout en situation connectée.

| ID | État de preuve | Reste avant réception |
|---|---|---|
| HD-01 | Partiel : contraintes du mois gratuit testées | Inscription réelle HD, création du droit gratuit une fois par le parcours prévu |
| HD-02 | Partiel : expiration et révocation refusent lecture/écriture, historique préservé dans les recettes SQL | Parcours connecté à la fin du mois gratuit |
| HD-03 | Partiel : période payante protégée par les conditions de droit | Produit, prix, période et événement fournisseur vérifié raccordés |
| HD-04 | Non reçu | Échec, doublon et remboursement réels du circuit de paiement |
| HD-05 | Partiel : fuseaux et incohérence de livraison contrôlés | Réglages participant, recalcul des créneaux et changement d'horaire sans doublon |
| HD-06 | Vérifié au niveau frontend : lecture sans déclaration | Essai navigateur authentifié |
| HD-07 | Composants et API testés séparément : trois prières distinctes, réessais idempotents | Chaîne interface–API complète dans un navigateur |
| HD-08 | Lecture intégrale préparée ; document de relecture Amidah séparé disponible | Version éditoriale autorisée, publication et contrôle mobile du texte réel |
| HD-09 | Aucune phonétique ou audio inventé | Indisponibilité explicite et circuit de validation des médias dans le parcours final |
| HD-10 | Non reçu | Compteur HD privé non raccordé dans les sources travaillées |
| HD-11 | Non reçu | Compteur et règle de non-remise à zéro testés |
| HD-12 | Non reçu | Remise à zéro volontaire du seul compteur, conservation des autres données |
| HD-13 | Non reçu | Procédure de correction autorisée, tracée et testée |
| HD-14 | Non reçu | Parcours respectant les actes subis, sans traitement comme faute volontaire |
| HD-15 | Non reçu | RLS et tests d'isolement du compteur privé A/B |
| HD-16 | Partiel : consentement et liaison vérifiée contrôlés en TEST ; aucun envoi | Fournisseur, règles actuelles et expéditeur final vérifiés |
| HD-17 | Annulation du rappel de l'activité réalisée vérifiée dans l'API en TEST | Revalidation finale et articulation avec un expéditeur |
| HD-18 | Partiel : même requête conservée lors d'un réessai dans l'onglet ; copies hors ligne bloquent les déclarations | File hors connexion durable, conflits entre appareils et reprise complète |
| HD-19 | Calcul vérifié : don 100 => 10, aucun paiement ou stockage ajouté | Validation visuelle et éditoriale du simulateur final |
| HD-20 | Partiel : seuls coûts professionnels proposés, dépenses privées explicitement exclues | Recette du formulaire final et cas particuliers validés |
| HD-21 | Régressions des écrans existants testées ; identifiant 14 jours non renommé | Essai connecté de parcours parallèles |
| HD-22 | Filtrage par version testé ; pas de lecture directe de Sheets dans ces composants | Cycle réel de publication HD depuis Sheets et versions approuvées |
| HD-23 | Composants de lecture sans dépendance au coach IA | Essai connecté avec IA indisponible |
| HD-24 | Filtrage des contenus par langue testé ; interface EN distincte des textes officiels | Textes EN approuvés et vérification du parcours en cas de traduction absente |

## Éléments éditoriaux non reçus
Les trente défis de l'annexe du livre ne constituent pas à eux seuls les fiches approuvées des six mois.
La préparation de l'Amidah pour relecture n'établit pas une autorisation de reproduction.
Aucune traduction officielle anglaise ni aucun audio approuvé n'est inventé.
Les questions de bilan sont des propositions d'interface à relire.
Aucun texte de repentance ou engagement supplémentaire n'est déclaré officiel par cette revue.

## Décisions encore ouvertes dans la source
Le cahier section 16 mentionne expressément :
1. Phase gratuite : décision explicite récente de Dr Justin, 30 jours. Les durées et bornes des périodes payantes restent à définir.
2. Prix, produit et renouvellement des mois 2–6 ; aucun prix en brouillon ne vaut validation.
3. Contenus, langues, médias et sources autorisées.
4. Compteur privé : visibilité par défaut, conservation minimale, effacement et correction.
5. Adaptations du culte et mécanisme de personnalisation.
6. Cas particuliers de dîme.

La section 7.3 précise : « La politique de conservation et d’effacement est à décider avant développement. »
Le compteur sensible ne doit donc pas être présenté comme développé ou validé.
Le bilan mensuel ne doit pas définir arbitrairement la durée d'un mois.

## Ordre de travail restant
- Appliquer les 30 jours gratuits au futur parcours d'inscription ; préciser les périodes payantes puis raccorder le bilan mensuel et le catalogue.
- Définir la politique du compteur privé avant son développement et ses tests de confidentialité.
- Terminer les préférences/horaires et la synchronisation, puis les circuits de publication et d'envoi.
- Approuver les contenus, langues et droits.
- Faire la recette connectée et mobile, puis la restauration vérifiée depuis sauvegarde.
- Préparer une version concrète et approuvée avant toute activation.

Le travail préparé peut être relu et poursuivi ; le module complet ne peut pas encore être annoncé disponible.

## Mise à jour après la revue
Dr Justin a précisé « 30 jours gratuit ». La phase gratuite de 30 jours est enregistrée dans le référentiel brouillon TEST ; aucun droit n'a été créé.
Le filtre des copies connues HD est préparé et testé, avec ses limites de classification décrites dans CACHE_HABITUDES_EXCLU_PREPARE.md.
