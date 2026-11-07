# SÉNEVÉ — intégration proposée des habitudes financières en V2

**Date : 6 novembre 2026**  
**Statut : conception technique, non appliquée et non publiée.**

## Décisions à préserver

- La V1 et les inscriptions qui y sont rattachées restent inchangées.
- Réutiliser les `programme_id` existants et créer une nouvelle version numérique du programme (version 2), avec module V2 français et anglais. Ne pas renommer les identifiants existants qui contiennent `_V1` sans décision explicite.
- Les quatre nouvelles activités n'entrent pas dans un score de foi et ne déclenchent jamais de transfert d'argent.
- Au démarrage V2, la Réserve de joie, l'Épargne pour investir et l'Offrande libre sont proposées comme activités cochées. Le Remboursement de dette est décoché. La personne peut modifier les choix avant de confirmer.
- Le choix d'une activité est distinct du consentement général aux notifications. Les réglages de dette enregistrent seulement actif/inactif et le créneau nécessaire, sans montant, prêteur, échéance bancaire ni description.
- L'épargne commerçant reprend une base hebdomadaire et propose un rappel quotidien. L'épargne salariée reprend une base mensuelle et propose un rappel hebdomadaire, jour choisi par la personne. Pour l'offrande et la dette, la personne définit elle-même les jours et heures.
- L'arrêt d'une activité doit la retirer de la journée et annuler ses rappels futurs. « Couper les notifications » seul ne satisfait pas cette règle.

## État existant vérifié

| Élément | Comportement actuel | Conséquence pour V2 |
| --- | --- | --- |
| Programme | Programme FR/EN avec versions éditoriales et inscriptions versionnées | Créer une version 2 non publiée ; ne pas remplacer les contenus version 1 |
| Module `hd_modules` | Version 1 FR/EN en brouillon ; liens de module inactifs en production | Ne pas confondre `programme_versions.etat='publiee'` et ouverture des liens HD |
| Modèles d'habitudes | `hd_habit_templates` fournit libellé, heure proposée et jours | Ajouter des métadonnées de fréquence/activation par défaut, ou un modèle dédié ; aucune migration n'est proposée ici |
| Horaires | `hd_habit_schedules` porte les créneaux d'un participant/module/version/langue | L'inscription actuelle exige une configuration pour chaque modèle et son normaliseur refuse les créneaux vides |
| Catalogue d'inscription | Refuse tout modèle sans heure proposée et exige un planning de même cardinalité que les modèles | Une activité facultative décochée ne peut pas être représentée par la logique actuelle |
| Préférences de rappel | `habitudes_coupees` exclut les rappels, mais ne retire pas l'activité de la journée | Ne pas utiliser cette liste pour exprimer « dette non choisie » |
| Planificateur push | Résout les rappels à partir des horaires et de `note_source` des activités publiées | Il faut raccorder les quatre nouvelles clés aux activités V2 et à la validation d'accès |
| Assemblage du jour | Contrôle actuellement un ensemble exact d'habitudes quotidiennes, de cultes et de dîme | Étendre par version de programme, sans changer les attentes V1 |

## Modèle fonctionnel à implémenter

Chaque inscription V2 doit avoir un état de participation par activité financière, versionné et distinct de la configuration des rappels :

| Clé | Choix initial | Cadence proposée | Donnée nécessaire |
| --- | --- | --- | --- |
| `reserve_joie` | Activée | Commerce : rappel quotidien ; salaire : jour hebdomadaire choisi | Activité active, type de revenu/cadence, créneau |
| `epargne_investir` | Activée | Même cadence de rappel que l'épargne familiale | Activité active et créneau |
| `offrande` | Activée | Jours et heures choisis par le participant | Activité active et créneaux |
| `remboursement_dette` | Désactivée | Jours et heures choisis seulement après activation | Booléen actif et créneaux ; aucun détail de dette |

Les fréquences et la nature des activités doivent apparaître dans la journée et l'historique indépendamment du fait que le participant ait autorisé les notifications push. En revanche, aucun rappel ne part sans consentement push valable, appareil disponible, droit actif, créneau éligible et activité non réalisée/synchronisée. Les activités optionnelles désactivées ne doivent pas être produites comme occurrences.

Le serveur doit valider que les clés reçues appartiennent aux modèles V2 et que l'activité de dette est explicitement activée avant d'accepter ses horaires. Un tableau de clés « silencées » ne constitue pas une preuve d'activation. Le client ne doit pas pouvoir activer cette activité en envoyant seulement une préférence de notification.

## Fichiers et services à faire évoluer

Ces changements sont une cartographie, pas une déclaration de modification réalisée.

1. **Éditorial** : créer contenu/activité FR et EN pour chaque date requise de la nouvelle version, statut brouillon, source et relecture conservés. La règle financière est un complément validé, pas une citation du livre.
2. **Données du module** : ajouter module V2 et métadonnées distinguant activité obligatoire, activité facultative, choix initial et cadence autorisée. Préserver les rows V1.
3. **Inscription** : permettre de décocher la dette, sélectionner les rythmes compatibles, puis confirmer explicitement. Ne pas permettre d'inscription avec des choix incohérents.
4. **Horaires et journée** : prendre en charge les activités facultatives absentes, les cadences quotidiennes/hebdomadaires/mensuelles, la vue du jour et l'historique, en distinguant « non choisie » de « non réalisée ».
5. **Rappels** : associer de façon versionnée les clés V2 aux activités V2 ; respecter les fuseaux personnels, le consentement, les droits, la non-duplication et l'annulation après réalisation synchronisée ou désactivation.
6. **Droits et publication** : rester en brouillon, liens inactifs ; n'ouvrir la version qu'après revue éditoriale, sécurité, confidentialité et validation des droits d'accès.

## Ordre d'exécution et garde-fous

1. Les corps SQL `063b`/`063c` sont récupérés depuis le registre interne du test et archivés dans `supabase/recovered-migrations/` ; aucun rollback n'y était conservé. L'inventaire montre une dérive d'historique plus large : 135 entrées en production contre 105 en test, avec plusieurs noms/horodatages différents. Trois fonctions ciblées ont le même texte dans les deux projets, mais `_ouvrir_acces` diffère substantiellement. Déterminer la provenance du projet de test avant de l'utiliser comme référence de migration.
2. Créer et vérifier une sauvegarde restaurable du projet de test ; l'export historique repéré n'a pas encore été restauré et n'est pas une preuve de restauration complète.
3. Produire une migration additive en local et un plan de retour arrière. Aucun DDL ne doit être appliqué avant d'avoir inspecté les fonctions complètes qu'elle remplace.
4. Faire l'implémentation client/API en brouillon et préparer des vérifications ciblées : V1 inchangée, dette absente par défaut, dette retirée de la journée quand désactivée, offre cochée par défaut, horaires et jours hebdomadaires, fuseaux, consentement push, arrêt des rappels, doublons, accès expiré, séparation des montants et des données personnelles.
5. Tester en environnement isolé, faire relire les contenus FR/EN et ne publier qu'après validation explicite.

**État au moment de la rédaction :** simulateur d'épargne local visible sur l'aperçu public ; maquette bilingue des rappels disponible ; aucun état d'activation persistant de ces quatre habitudes, aucune migration V2, aucun rappel financier réel et aucune publication V2.

## Mise à jour de l’avancement — 6 novembre 2026

La cartographie et l’état initial ci-dessus sont historiques. Les éléments suivants les actualisent.

### Réalisé dans le dépôt local

- Le simulateur d’épargne est intégré à `/habitudes` en français et en anglais, avec calcul local uniquement et les bases déjà utilisées pour la dîme.
- Le panneau de réglage financier est intégré à l’écran d’horaires pour les modules V2. L’offrande est active par défaut ; la dette est inactive par défaut. Le choix commerçant/salarié détermine localement la cadence quotidienne/hebdomadaire ; les jours et heures choisis sont envoyés aux RPC prévus. Les changements prennent effet le lendemain et l’écran affiche les réglages programmés.
- Le client distingue les sources V1 et V2 et sait relire les préférences financières datées dans l’historique. Les quatre activités financières restent facultatives et hors compteur requis.
- `supabase/propositions/habitudes_finances_v2.sql` contient une migration additive brouillon : copie FR/EN vers V2, activités optionnelles, stockage privé des choix et horaires, RPC, garde serveur, extension du planificateur push.
- Les sources `063b` et `063c` récupérées du registre de test restent archivées ; elles ne sont pas rejouées.
- `npm run build` a réussi.

### Blocages avant l’application d’une migration

- Aucune SQL n’a été appliquée. Les RPC que le client appelle n’existent donc pas encore dans la base ; aucun rappel financier réel n’est actif.
- La revue automatique a rejeté l’exécution Vitest, car la suite contacte l’endpoint Supabase configuré pour la production. Je n’ai pas contourné ce blocage et n’ai pas relancé la suite.
- Production et test sont deux projets autonomes aux historiques divergents (135 migrations en production, 105 en test). L’équivalence du test avec la production n’est pas démontrée.
- Aucune sauvegarde restaurable n’a été créée et vérifiée. L’export déjà repéré n’a pas de restauration complète démontrée et porte un libellé de projet codé en dur.
- La proposition SQL s’arrête si `hd_progress_access_guard` ou `hd_expected_push_slots` ne correspondent pas aux fragments examinés. Les définitions actives doivent être comparées au SQL local avant application.
- Les contenus d’activité FR/EN restent à relire. La V2 éditoriale et ses liens restent en brouillon/inactifs ; aucune inscription V1 n’est réaffectée.

### Étapes restantes

1. Mettre à disposition un environnement Supabase isolé et vérifier que ses tests ne peuvent pas joindre la production.
2. Sauvegarder cet environnement, le restaurer et contrôler la restauration.
3. Relire les fonctions serveur ciblées, exécuter les tests V1/V2 (choix initiaux, dette, jours/heures, droits, consentement, fuseau, activité réalisée, doublons, historique et restauration), puis corriger la proposition si nécessaire.
4. Faire relire les contenus FR/EN et confirmer les accès et règles avant toute publication.
5. Appliquer d’abord en environnement isolé, vérifier les résultats et préparer ensuite la mise en production avec sauvegarde et retour arrière.

Aucune de ces étapes serveur n’est déclarée terminée. La V1 reste intacte et aucun déploiement n’est revendiqué.

## Suivi dédié Épargne et Dettes — préparation du 7 novembre 2026

### Décision de conception

- Deux pages privées distinctes : `/habitudes/epargne` et `/habitudes/dettes`, accessibles seulement depuis le compte SÉNEVÉ et une inscription active à la version HD V2.
- Épargne : créer un ou plusieurs objectifs avec libellé, type (Réserve de joie, Épargne pour investir ou autre), cible, devise et versements réels datés. Le total est la somme des versements de l’objectif ; le reste vaut `max(0, cible − total)`. La progression et le jardin sont visuels. Dépasser la cible reste possible et le montant réellement épargné demeure visible.
- Dettes : enregistrer séparément chaque solde de départ et devise ; le système attribue un libellé neutre « Dette 1 », etc. Chaque paiement daté est retranché du solde. La liste recommande le plus petit solde restant (méthode boule de neige), tout en laissant le choix au participant. Un paiement supérieur au reste est refusé côté interface et côté serveur.
- Le taux choisi est un simple repère facultatif : le participant fournit lui-même une base mensuelle et un pourcentage de 0 à 100 %. Le calcul donne un montant indicatif ; il ne change jamais le solde d’une dette. Seul un paiement réellement saisi diminue le solde.
- Les sommes sont calculées séparément par devise ; aucune conversion ni somme interdevises. Les montants et dates sont privés et attachés à l’inscription HD V2. Aucun créancier, motif, détail de dette, automatisme de transfert ou prélèvement n’est enregistré.
- Le sélecteur propose 148 devises courantes, dont CDF, XAF et XOF. Les codes historiques et devises nécessitant trois décimales ne sont pas encore proposés, car le stockage V2 accepte au plus deux décimales. Les devises sont affichées avec leurs noms localisés quand le navigateur les connaît.

### État de réalisation

- Maquette interactive bilingue : `design/habitudes-defis/suivi-epargne-dettes.html`. Les données d’exemple restent dans le navigateur et ne rejoignent pas le compte.
- Pages React préparées dans `src/components/SuiviEpargneDettes.tsx`, RPC d’accès dans `src/lib/habitudes-finances-suivi.ts`, et chemins prévus `/habitudes/epargne` et `/habitudes/dettes`. Les raccourcis restent cachés si `VITE_HABITUDES_FINANCES_SUIVI` n’est pas `true`.
- Le brouillon SQL ajoute des tables isolées par inscription et des RPC propriétaires de lecture/écriture ; la migration ne doit pas être appliquée à la production ni au test partagé sans sauvegarde restaurée et vérifications isolées.
- Le build et le contrôle TypeScript passent. Un essai DOM de la maquette confirme le cumul d’épargne, la soustraction d’un paiement et la suggestion de la plus petite dette. La partie Supabase n’est pas exécutée et n’est pas déclarée opérationnelle.
