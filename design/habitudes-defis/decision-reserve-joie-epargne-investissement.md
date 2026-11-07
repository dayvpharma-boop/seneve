# Décision produit — habitudes financières facultatives

**Date : 6 novembre 2026**  
**Statut : règles confirmées par Dr Justin ; intégration non publiée.**

## Habitudes

| Clé technique proposée | Libellé français | Règle facultative |
| --- | --- | --- |
| `reserve_joie` | Réserve de joie | Cible de 5 à 10 % de la base retenue. |
| `epargne_investir` | Épargne pour investir | Cible choisie librement, plafonnée à 30 % de la base retenue. |
| `offrande` | Offrande libre | Habitude cochée par défaut ; don librement choisi, aucun taux ni montant imposé. Le participant règle le jour et l’heure du rappel. |
| `remboursement_dette` | Remboursement de dette | Habitude décochée par défaut. Elle apparaît et se rappelle uniquement si la personne l’active ; elle règle alors le jour et l’heure. Aucun montant, créancier ou détail de dette n’est conservé. |

Les deux épargnes sont distinctes de la dîme et de l’offrande. Les repères de 5–10 % et de 30 % s’appliquent uniquement aux épargnes et ne deviennent pas des versements obligatoires. L’offrande reste libre même si l’habitude est cochée par défaut. Le rappel d’offrande n’active pas à lui seul les notifications : le consentement aux notifications reste une décision séparée. Les remboursements de dettes personnelles ne réduisent pas la base de calcul des épargnes. SÉNEVÉ ne prélève, n’envoie ni ne conserve de montant.

## Base et rythme

Le calcul reprend la base de la dîme déjà définie pour le module : bénéfice commercial après coût des marchandises vendues et charges professionnelles réelles ; salaire après dépenses professionnelles nécessaires non remboursées ; argent emprunté exclu ; dépenses personnelles et remboursements de dettes non déduits. Les dons affectés, dons en nature, impôts, cotisations et autres cas déjà signalés comme non tranchés ne doivent pas recevoir de règle implicite.

Pour les deux épargnes, la base et la période de calcul reprennent celles de la dîme : hebdomadaire pour le commerce et mensuelle pour le salaire. Leur cadence de rappel est distincte et décidée : quotidienne pour le commerçant et hebdomadaire pour le salarié. Le participant règle l’heure de chaque rappel et choisit son jour hebdomadaire. L’application ne déduit pas l’activité professionnelle du réglage de dîme ; elle conserve seulement les horaires nécessaires. Pour l’offrande et le remboursement de dette, le participant choisit et règle lui-même le jour et l’heure ; aucune fréquence fixe n’est imposée.

Le calculateur des deux épargnes dans la maquette travaille localement dans l’écran : ventes encaissées moins coût des marchandises vendues et charges professionnelles admissibles pour le commerce ; salaire reçu moins charges professionnelles admissibles pour le salarié. Il affiche la base et les estimations selon les pourcentages saisis, sans sauvegarder les montants. La maquette efface les montants à sa fermeture. La façon de répartir le repère sur plusieurs rappels reste à valider. La validation d’une activité signifie uniquement que le participant déclare avoir réalisé le geste prévu ; elle ne confirme jamais un paiement effectué par SÉNEVÉ.

## Dépendances à traiter avant intégration

Le code actuel relie les rappels à des activités publiées et contient des contrôles spécifiques aux 13 habitudes quotidiennes, aux cultes et à la dîme. L’ajout de ces quatre habitudes exige une nouvelle version éditoriale et des changements cohérents aux modèles, activités FR/EN, sélection des horaires, vue du jour, historique, règles d’accès et de déclaration, notifications, et calcul des rappels. Les quatre activités seront facultatives et ne contribueront pas à un score de foi.

Ne pas modifier directement une version déjà utilisée par des inscriptions. Avant l’exécution d’une migration : sauvegarde, inventaire de ses dépendances, vérification de la migration et de son retour arrière, puis revue des scénarios de droits, d’horaires quotidiens/hebdomadaires, de doublons, de versions et de confidentialité. Aucune migration ni publication n’est effectuée par ce document.

## État technique vérifié le 6 novembre 2026

- La production utilise les programmes `HABITUDES_DEFIS_30J_FR_V1` et `HABITUDES_DEFIS_30J_EN_V1`. Il existe une inscription liée à ces programmes ; le contenu de la V1 et ses horaires doivent rester figés.
- L’état `publiee` de `programme_versions` et l’état d’accès du module sont deux choses différentes : en production les versions des programmes sont `publiee`, tandis que les lignes FR/EN de `hd_modules` version 1 sont `brouillon` et les liens `hd_programme_links` correspondants sont inactifs. Ne pas conclure que de nouvelles inscriptions sont ouvertes à partir du seul état de `programme_versions`.
- La logique actuelle attend 13 habitudes quotidiennes, trois créneaux de culte et une dîme. L’écran du jour, l’historique, l’inscription, le calcul des horaires et les notifications ont des validations explicites sur ces éléments. Ajouter des habitudes aux modèles V1 les ferait échouer ou présenterait de façon incohérente.
- Le formulaire d’inscription initialise actuellement les habitudes affichées comme rappelées. Il n’a pas encore de modèles, de fréquences ou d’horaires propres à la Réserve de joie, à l’Épargne pour investir, à l’Offrande libre ou au Remboursement de dette. Son état initial ne peut donc pas satisfaire la règle « offrande cochée, dette décochée » pour ces nouvelles activités sans ajout explicite à la nouvelle version.
- Les rappels réels sont calculés à partir d’activités et de créneaux publiés. La maquette financière et le simulateur public ne créent pas d’activité, n’enregistrent pas de préférence, ne programment pas de notification et ne demandent pas le consentement aux notifications.
- Le dépôt local ne contenait que `seneve_063_abonnements`. L’historique Supabase de test contient aussi `seneve_063b_abonnements_origine` et `seneve_063c_controle_periodes_abonnement`. Leurs corps SQL ont été récupérés en lecture seule depuis `supabase_migrations.schema_migrations` et archivés dans `supabase/recovered-migrations/`. Aucun `rollback` n’était enregistré pour ces deux entrées. Les tables et contraintes examinées (`abonnements`, `entitlements`, `hd_access_periods`, `hd_cycles_planifies`) sont identiques dans le périmètre vérifié. Parmi les quatre fonctions contrôlées, `_ouvrir_mois_habitudes`, `abonnements_ouvrir_mois_suivants` et `hd_validate_access_period` ont la même définition ; `_ouvrir_acces` diffère substantiellement entre test et production (189 contre 194 lignes, logique d’audit/continuité/inscription différente). L’origine exacte de l’écart d’historique reste à établir ; l’équivalence complète des projets n’est pas démontrée.
- Dans le projet de test, l’inventaire en lecture seule a trouvé 2 modèles de module, 32 modèles d’habitudes, 15 horaires, 0 rappel planifié, 1 inscription HD, 362 contenus et 6 164 activités au total dans les tables interrogées. Ces volumes ne constituent pas une sauvegarde.
- Aucun changement n’a été écrit dans Supabase. La page `finances-rappels.html` reste une maquette bilingue sans sauvegarde ni envoi de rappel. Le simulateur d’épargne est aussi intégré à la page publique `/habitudes` en français et en anglais ; il calcule dans l’état React et ne conserve aucun montant.

## Suivi de l’écart de migrations

Les sources d’origine `063b`/`063c` n’ont pas été retrouvées dans les fichiers GitHub accessibles ; leurs corps appliqués ont toutefois été récupérés du registre de migration Supabase et archivés dans `supabase/recovered-migrations/`. La branche `migration-version` est une branche ancienne liée à la migration 021 du livre ; elle ne contient pas ces migrations.

Nouvelle comparaison en lecture seule du 6 novembre 2026 : `list_migrations` retourne 135 entrées en production et 105 en test. Les historiques divergent sur de nombreux enregistrements (noms propres à chaque environnement et versions avec horodatages différents), pas seulement sur `063b`/`063c`. Production contient `seneve_056_incidents_sans_reevaluer_rappels` absent de l’historique de test ; le test contient les entrées `seneve_063b_abonnements_origine` (2026-11-04 20:41:40 UTC) et `seneve_063c_controle_periodes_abonnement` (2026-11-04 20:48:54 UTC), absentes de celui de production. Leurs corps SQL et l’absence de rollback sont archivés dans `supabase/recovered-migrations/`. Dans les fonctions ciblées par ces scripts, les chaînes `abonnement_annuel` ne sont présentes dans aucun des deux projets ; la validation de période contient déjà `parent_entitlement_id` dans les deux. Cette ressemblance partielle ne résout pas la différence constatée dans `_ouvrir_acces`. Ne pas recopier ou supprimer manuellement des lignes du registre de migrations. Avant une nouvelle migration HD, établir la provenance du test, vérifier les dépendances et sauvegarder/restaurer dans un environnement isolé.

Métadonnées des projets relevées le même jour : `seneve-prod` et `seneve-test` sont deux projets actifs autonomes, sans branche de développement Supabase, dans `eu-west-1` et sur PostgreSQL 17.11 ; le projet test a été créé le 18 octobre, après la production créée le 11 octobre. Cela ne suffit pas à prouver comment le test a été initialisé. Les scripts 063b/063c, appliqués à l’état actuel des fonctions des deux projets, ne trouvent plus les motifs qu’ils remplacent et ne modifient pas la validation déjà compatible avec `parent_entitlement_id` ; ils ne doivent pas être rejoués pour tenter de réconcilier les projets.

## Étape d’intégration requise

Créer et relire une nouvelle version indépendante, FR et EN, puis la rendre disponible uniquement aux nouvelles inscriptions après validation. La version devra prendre en charge les quatre clés d’habitude, les horaires quotidiens ou hebdomadaires, les opt-ins de l’offrande et de la dette, l’affichage/historique sans score, les contrôles d’accès serveur et l’arrêt des rappels lorsqu’une habitude est désactivée. Ne pas attribuer rétroactivement cette version aux inscriptions V1. Le simulateur `/habitudes` est réalisé ; la configuration persistante et l’envoi des rappels restent à intégrer dans cette version. Avant toute application en test : récupérer les migrations manquantes, faire un export de sauvegarde, préparer un retour arrière et exécuter les vérifications ciblées exigées par le cahier des charges.

Ordre de travail proposé pour cette intégration : (1) retrouver et archiver les migrations `063b`/`063c`, (2) préparer une copie/version éditoriale V2 FR/EN sans activer ses liens, (3) ajouter les activités et les choix d’horaires avec dette désactivée par défaut, (4) mettre à jour les règles serveur et le planificateur de rappels de manière additive, (5) vérifier en environnement de test l’inscription, le refus de notifications, les horaires quotidiens/hebdomadaires, l’arrêt des rappels, les doublons, les droits et l’isolation des inscriptions V1, (6) demander la relecture/validation éditoriale avant toute publication. Le présent dépôt n’a pas encore cette implémentation persistante.

## Décision de suivi des montants — 7 novembre 2026

À la demande de Dr Justin, le suivi d’épargne et le suivi de dettes sont des pages séparées dans Habitudes & Défis.

- **Épargne :** le participant crée son objectif chiffré (par exemple 1 000 USD), choisit la devise et consigne le montant réellement épargné à chaque action. Le total des versements, le montant restant, le pourcentage atteint et une illustration de jardin progressent avec les versements.
- **Dettes :** le participant saisit chaque solde initial. L’application met en avant le plus petit solde restant pour proposer un ordre, mais le participant reste libre de choisir. Chaque remboursement réellement déclaré est retranché du solde ; un montant supérieur au solde restant est refusé.
- **Repère en pourcentage :** proposé facultativement sur la dette, calculé uniquement à partir d’une base mensuelle et d’un pourcentage entrés par le participant. C’est un repère ; seul un paiement inscrit diminue la dette. Le pourcentage ne déclenche aucun prélèvement.
- **Confidentialité :** les montants et dates appartiennent au compte et à l’inscription HD V2. Les dettes reçoivent un numéro neutre ; aucun créancier, motif ou détail n’est demandé. Les sommes restent groupées par devise, sans conversion.
- **Statut :** la maquette et le code préparatoire sont réalisés dans la branche de travail ; la migration est proposée mais non exécutée. La maquette HTML utilise seulement des données d’exemple locales au navigateur. La version connectée n’est pas encore active.
