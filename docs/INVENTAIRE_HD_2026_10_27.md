# Inventaire vérifié Habitudes & Défis — 27 octobre 2026

Ce document est le point d'entrée courant. Les comptes rendus des 25 et 26 octobre restent des preuves historiques de leurs étapes, pas une description de l'état actuel.

## Périmètre et preuves

Inspection en lecture seule de seneve-prod et seneve-test, code main au commit `9eafb8505bade40dc4ff81d00a9a81e6f9f78350`, et workflow [40463252488](https://github.com/dayvpharma-boop/seneve/actions/runs/40463252488) terminé avec succès. Aucune migration, ouverture d'inscription ou modification d'accès effectuée pendant cet inventaire. Aucun journal intime ni détail de paiement consulté.

Les contrôles automatiques et le déploiement réussis ne prouvent pas une réception métier complète. n8n, Google Sheets, le prestataire de paiement et un navigateur authentifié n'ont pas été inspectés directement pendant cet inventaire.

## État constaté en production

| Élément | Constat du 27 octobre |
|---|---|
| Tables HD | 11 tables du schéma seneve, protection par ligne activée |
| Module | HABITUDES_DEFIS, FR, version 1, six mois, 30 jours gratuits, statut brouillon ; regle_mois non renseignée |
| Programme lié | HABITUDES_DEFIS_30J_FR_V1 ; lien actif ; version pédagogique publiée |
| Durée déclarée du programme | 30 jours ; intitulé « les 30 premiers jours » |
| Contenus | 181 lignes, jours 1 à 181, seulement 30 textes officiels distincts ; réutilisation cyclique du corpus |
| Activités | 2 896 actions et 5 engagements, soit 2 901 activités |
| Modèles d'habitudes | 15 : 13 habitudes quotidiennes et deux modèles de culte couvrant trois rendez-vous hebdomadaires |
| Horaires personnels | 15 lignes présentes ; pas de données nominatives dans ce rapport |
| Périodes d'accès | Deux lignes : mois 1 gratuit et mois 2 associé à un droit d'achat comportant une référence de paiement |
| Offre gratuite | Prix zéro, durée 30 jours, inactive |
| Offre mensuelle liée | CONTINUITE_MENSUEL_FR, active, 5 USD pour 30 jours ; mapping actif pour les mois 2 à 6 |
| Rappels HD | Zéro rappel, réservation et préférence de livraison lors du contrôle |
| Compteur sensible | Aucune table dédiée trouvée par recherche fidel/streak/compteur dans seneve et seneve_private |

Les volumes sont un instantané, pas une preuve d'utilisation ni une réception des fonctions.

## Code et publication

Le workflow de publication active VITE_HABITUDES_DEFIS et fixe VITE_HABITUDES_INSCRIPTION à fermee. Les écrans sont donc activés pour les inscrits sans ouvrir l'inscription publique.

Le code contient la journée personnelle, les déclarations, horaires, historique, bilans, suivi facultatif des défis et simulateur local de dîme. L'aperçu propose 30 lectures françaises et anglaises. Le programme connecté lié dans la production inspectée reste français.

La recette isolée publiée par le workflow utilise le commit be1dc0ee593c9de38fbb3dd97bfe05702f6b5d84 et seneve-test ; ne pas la confondre avec la version courante de main ou la production.

## Corrections et investigations à mener

| Priorité | Sujet | Action et preuve attendue |
|---|---|---|
| Vérifié | Alignement des mois payants | Continuité et le mois HD financé commencent et finissent ensemble. L'égalité exigée par AccesRecetteHabitudes est conforme à la décision, et ne doit pas être assouplie. La migration d'alignement et le démarrage coordonné des contenus sont présents dans TEST et PROD ; zéro date décalée sur la période payante existante en PROD. |
| 1 | Durée et contenu | Confronter durée_jours=30, 181 journées techniques et six périodes de 720 h. Vérifier les frontières locales et la reprise ; ne pas remplacer arbitrairement 181 par 180 ni modifier les droits. |
| Documenté | Corpus répété | La source habitudes_mois_2_6_reprise.sql consigne la décision du 26 octobre à 23h01 de reprendre les 30 lectures pour les mois 2 à 6. Cette répétition est intentionnelle selon le dépôt ; ne pas la présenter comme six mois de lectures inédites ni supprimer les journées publiées. |
| 1 | Référentiel documentaire | L'état global et les anciennes fiches de préparation ne doivent plus faire croire à une installation exclusivement TEST. |
| 2 | Présentation commerciale | Harmoniser l'aperçu, qui indique encore des conditions à définir, avec le raccordement Continuité configuré. Vérifier les décisions avant toute annonce de prix ou ouverture. |
| 2 | Statuts | Clarifier le sens du module brouillon avec une version pédagogique publiée ; ne pas transformer ce constat en changement de statut automatique. |
| 2 | Sécurité | Protection contre les mots de passe compromis désactivée ; pg_net dans public. Préparer les corrections selon capacités du compte et dépendances, puis vérifier. |

L'absence de policies sur certaines tables avec RLS activée n'est pas, à elle seule, une fuite : des tables internes peuvent volontairement être accessibles seulement par des fonctions ou services autorisés.

## Fonctions restant à recevoir

- Amidah intégrale autorisée, variantes validées, phonétique et audio approuvés.
- Politique du compteur privé, puis implémentation séparée et scénarios HD-10 à HD-15.
- Programme connecté anglais et validation éditoriale distincte des traductions publiques.
- Livraison réelle des rappels, consentements, liaison de canal et annulation avant envoi.
- Paiement HD de bout en bout : confirmation, doublon, refus, remboursement, révocation et reprise.
- Recette mobile authentifiée, coexistence des inscriptions, limites des périodes et conservation de l'historique.
- Reprise hors connexion durable, conflits entre appareils, cycle de publication Sheets/n8n et restauration de sauvegarde.

## Ordre des lots

1. Consolider ce référentiel et marquer les rapports historiques.
2. Préserver l'alignement Continuité/HD et vérifier les frontières de périodes ; ne pas créer une exception d'affichage pour des dates décalées.
3. Harmoniser durée, appellations et présentation du corpus après vérification des décisions.
4. Recevoir les circuits de paiement, publication et rappels dans TEST.
5. Terminer les contenus autorisés et les fonctions privées, puis recette complète avant ouverture.

Une étape achevée est attestée par son diff, ses vérifications et ses limites. Ce rapport ne déclare pas le programme complet réceptionné.

## Rectification après vérification de la décision d'alignement

Le porteur a rappelé le 27 octobre : « on avais prevu que le deux commencer le meme jours apres achat ». Le fichier supabase/propositions/habitudes_continuite_dates_alignees.sql consigne déjà le choix B du 26 octobre à 19h58 : un paiement finance un mois complet, avec droits et contenus Continuité alignés sur le mois HD. Pour un achat anticipé, la source prévoit un démarrage commun programmé ; cette précision existante n'est pas modifiée par ce rapport.

Vérification SQL en lecture seule dans les deux environnements : alignement des droits et démarrage coordonné présents dans les fonctions installées. PROD contient une période payante et zéro différence de début ou de fin avec son droit ; TEST ne contient aucune période payante. Ces constats ne remplacent pas la recette d'un nouvel achat.

Le soupçon initial de défaut d'affichage fondé sur l'acceptation de dates distinctes est retiré. Quatre cas de non-régression sont ajoutés à habitudes-acces-recette.test.tsx : décalage du début, décalage de la fin, droit payé révoqué et droit payé expiré. L'écran doit refuser les deux premiers et ne monter aucune journée pour les deux derniers. Les tests ne créent aucun achat et ne touchent aucune base réelle.

