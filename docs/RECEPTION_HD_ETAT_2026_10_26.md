# Contrôle d’ensemble Habitudes & Défis — 26 octobre 2026

## Conclusion vérifiable

Le parcours de préinscription est préparé et ses principales opérations serveur ont été testées dans TEST. L’ouverture réelle du module complet reste non prête. Le site public conserve son aperçu ; les développements connectés restent sur `feat/habitudes-defis-socle`, derrière une option désactivée par défaut. Aucune migration PROD ni ouverture d’offre réelle n’est effectuée pendant ce contrôle.

Référence fonctionnelle relue : PDF fourni `SENEVE_2_0_Cahier_des_charges_Habitudes_et_Defis_2026-10-25(1).pdf`, sections 3, 14, 15 et 16 ; décision ultérieure du porteur : 30 jours gratuits. Le cahier Design fourni exige un affichage calme, repliable et honnête sur ce qui manque. Les prix, règles des mois payants et contenus non approuvés ne sont pas déduits de cette recette.

## Vérifications de cette étape

- Suite locale complète sur la copie de travail contenant les évolutions préparées jusqu’au commit `a52670d968049abfee92d7a9c350d234f60495a9` : **718 tests réussis dans 92 fichiers**. Des avertissements préexistants JSDOM/canvas et React act apparaissent ; aucun test n’échoue. Il s’agit de tests automatisés locaux, pas de 718 parcours de navigateur ou scénarios de réception métier. La copie de travail utilise un miroir de sources et des dépendances locales ; ce résultat ne remplace pas la CI sur un checkout exact du dépôt.
- Ensuite, ajout du rappel d’objectif et du lien de confidentialité sur la page de préinscription, en français et anglais, conformément à la section 3. Les 15 tests de catalogue/page réussissent après ces deux nouveaux cas. La suite complète n’a pas été relancée après cette modification de texte/navigation ; aucun total complet de 720 tests exécutés n’est revendiqué.
- Vérification TypeScript et compilation Vite avec le module activé après la modification.
- Lecture d’inventaire TEST : 0 mapping de programme HD, 0 période HD, 0 horaire HD, 0 rappel HD. Les recettes précédentes ont nettoyé leurs fixtures. Il n’existe donc aucune offre HD ouverte à l’inscription par ce catalogue.

## Matrice des scénarios du cahier, HD-01 à HD-24

« Couvert TEST » désigne le périmètre documenté, pas une réception en production. Les recettes SQL et HTTP citées ci-dessous ont été réalisées aux étapes précédentes ; elles ne sont pas toutes réexécutées pendant ce contrôle.

| ID | Scénario | État et preuve disponible | Reste à couvrir |
|---|---|---|---|
| HD-01 | Premier accès gratuit | Couvert TEST : inscription atomique, 720 h, deux requêtes HTTP simultanées donnant une seule création ; `RECETTE_AUTH_HTTP_HABITUDES_TEST.md` | Parcours visuel authentifié et vraie offre approuvée |
| HD-02 | Expiration sans paiement | Partiel : contrôles de droits serveur et composant `habitudes-acces.test.tsx` | Scénario complet avec contenu réel expiré et historique relu |
| HD-03 | Paiement mensuel confirmé | Non réceptionné pour HD | Règles mensuelles, tarif, produit et intégration de paiement validés |
| HD-04 | Paiement refusé, dupliqué, remboursé | Non réceptionné pour HD | Recette du produit réel après définition commerciale |
| HD-05 | Changement d’horaires | Couvert TEST : RPC, révisions, historique, propriétaire et doublons ; `habitudes_horaires_personnels.sql` et tests React | Vérification visuelle et fonctionnement avec le corpus publié |
| HD-06 | Prière ouverte sans déclaration | Couvert au niveau composant : `habitudes-lecture-texte.test.tsx` | Recette sur le contenu approuvé et connecté |
| HD-07 | Trois prières distinctes | Partiel : événements/activités distincts en fixtures SQL, affichage dans `habitudes-progres.test.tsx` | Corpus réel avec trois activités distinctes par jour |
| HD-08 | Amidah intégrale autorisée | Bloqué éditorialement ; texte fourni conservé privé | Droits, variantes et version publiable approuvés |
| HD-09 | Phonétique/audio absent | Partiel : absence de fausse publication dans l’aperçu | États finaux du contenu et médias approuvés |
| HD-10 | Mensonge/pardon sans remise à zéro | Compteur privé non implémenté | Règles privées puis développement et recette dédiés |
| HD-11 | Baiser romantique | Compteur privé non implémenté | Même préalable ; aucune règle intime inférée |
| HD-12 | Déclaration sexuelle volontaire | Compteur privé non implémenté | Politique de données et fonction séparée |
| HD-13 | Correction du compteur | Non implémenté | Procédure d’effacement/correction validée |
| HD-14 | Agression/acte subi | Non implémenté | Présentation et accompagnement appropriés, distincts d’une faute volontaire |
| HD-15 | Confidentialité du compteur | Aucun compteur à exposer ; aucune preuve de réception de ce scénario | Contrôles serveur et tests entre comptes lorsque la fonction existe |
| HD-16 | WhatsApp sans lien/consentement | Partiel : précontrôle fermé et aucun envoi ; `habitudes_precontrole_rappels.sql` | Liaison, consentement et recette du fournisseur réel |
| HD-17 | Rappel annulé après activité | Couvert au niveau SQL TEST : `habitudes_rappels_par_activite.sql` | Recette de livraison ; aucun moteur d’envoi HD activé |
| HD-18 | Réseau absent, transmission double | Partiel : événement en attente et répétition idempotente ; `habitudes-declaration.test.tsx` | File hors connexion complète et scénario navigateur/réseau réel |
| HD-19 | Dîme sur don de 100 | Couvert calcul local : `habitudes-dime.test.ts`, aucun paiement | Relecture éditoriale finale et vérification visuelle |
| HD-20 | Frais privés exclus de la base | Couvert au niveau calcul/formulaire dîme ; `habitudes-dime-ui.test.tsx` | Relecture finale des libellés et cas particuliers ouverts |
| HD-21 | Programme livre 14 jours parallèle | Régression locale générale réussie ; coexistence métier non réceptionnée | Recette connectée avec deux inscriptions réelles de test |
| HD-22 | Édition Sheets sans publication | Non vérifié de bout en bout ici | Chaîne de publication versionnée et recette Sheets/n8n |
| HD-23 | Contenu accessible sans IA | Lecture et contrôles indépendants de l’IA préparés | Corpus réel, accès et indisponibilité IA en recette complète |
| HD-24 | Traduction anglaise absente | Partiel : catalogue de langue distincte, aucun corpus EN inventé | Validation EN séparée et états finaux du contenu |

## Priorités avant ouverture

1. Préparer le corpus et le périmètre exact de l’offre gratuite : fiches, activités, défis, bilans et éventuels accès au coach/médias. La présence d’un programme marqué publié n’atteste pas à elle seule de leur complétude.
2. Valider le texte de prière publiable, les droits et les variantes ; validation anglaise distincte. Les PDFs fournis ne valent pas automatiquement autorisation de redistribution.
3. Effectuer la recette visuelle authentifiée dans un environnement accessible. Le navigateur distant actuel refuse le serveur local et les fichiers locaux ; aucune validation mobile/Safari n’a été obtenue et aucun contournement n’est tenté.
4. Préparer un déploiement contrôlé avec configuration réelle et plan de retour, puis vérifier les accès et l’historique en environnement cible. La publication de l’aperçu ne suffit pas pour cette ouverture.
5. Traiter les fonctions payantes, rappels et compteur privé selon leurs décisions propres ; ne pas les annoncer opérationnels pendant l’ouverture d’un périmètre plus limité.

Les tarifs et modes de renouvellement, la définition des cinq périodes payantes, la participation au culte à distance, les cas particuliers de dîme, les règles privées du compteur et le périmètre IA/médias restent des points à résoudre selon la section 16. Aucun arbitrage implicite n’est enregistré par ce document.
