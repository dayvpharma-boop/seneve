# Habitudes & Défis — inventaire du 28 octobre 2026

Cet inventaire remplace le rapport du 27 octobre comme point d’entrée courant. Il distingue ce qui est publié, les éléments installés et les scénarios restant à recevoir.

## Sources et limites

- Cahier des charges du 25 octobre : https://drive.google.com/file/d/1ko8iYmu99tHH4pNwQXw36aOJZELREMOZ/view
- Code inspecté : https://github.com/dayvpharma-boop/seneve/tree/cfa801ea6bb702b078e82e99e03fb1d41163990e
- Déploiement de ce code : https://github.com/dayvpharma-boop/seneve/actions/runs/40662441080 (construction et publication réussies).
- Production seneve-prod consultée en lecture seule le 28 octobre : structure, privilèges, contenus pédagogiques et agrégats techniques.
- Aucun journal, titre de lecture personnel, détail de paiement ou état individuel du compteur privé n’a été consulté. Aucun accès, paiement, notification ou contenu n’a été modifié pendant cet inventaire.
- Ce contrôle n’est pas une nouvelle exécution complète des scénarios HD-01 à HD-24. Les tests des modifications précédentes restent des preuves de leur périmètre, sans valoir réception universelle.

## Publié et vérifié dans les étapes précédentes

| Fonction | État constaté |
|---|---|
| Ma journée | Activités datées, déclarations explicites, états partiels et confirmation serveur |
| Amidah française | Texte intégral, instructions conditionnelles conservées, repères de reprise et déclaration distincte matin/midi/soir |
| Bible et gratitude | Accès à la Bible ; accès au journal privé depuis les gratitudes du matin et du soir |
| Lectures et écoute | Cinq activités regroupées ; saisie de minutes et titre facultatif ; accès direct depuis Ma journée |
| Durées conseillées | 30 minutes pour les trois lectures/écoutes concernées ; exercice adapté de 10 à 15 minutes |
| Cultes | Rendez-vous personnalisés sur sept jours ; participations confirmées distinguées des rendez-vous prévus |
| Bilans | Vues semaine et mois ; temps de lecture hebdomadaire ; historique quotidien |
| Journal des bilans | Contexte semaine/mois, brouillon séparé par compte/inscription/période, retour à l’historique |
| Fin d’accès et archives | Messages adaptés ; lien vers le parcours ; journées archivées en lecture seule après la fin du calendrier HD |
| Présentation publique | Textes de préparation corrigés selon la configuration ; changement anglais/français corrigé |
| Inscription publique | Actuellement fermée par configuration ; accès des inscrits conservé |

## Contrôle technique en production

### Contenus

Le programme HABITUDES_DEFIS_30J_FR_V1 contient **181 journées techniques et 180 textes officiels distincts**, tous en français.

| Mois pédagogique | Journées techniques | Textes distincts à l’intérieur du mois |
|---|---:|---:|
| 1 | 30 | 30 |
| 2 | 30 | 30 |
| 3 | 30 | 30 |
| 4 | 30 | 30 |
| 5 | 30 | 30 |
| 6, dernière journée civile incluse | 31 | 31 |

Le rapport ancien « seulement 30 textes répétés sur les six mois » n’est donc plus actuel. Le dépôt contient les corpus français propres aux mois 2 à 6. La présence d’une 181e journée technique ne justifie pas de supprimer un contenu ou de modifier les droits.

**Cohérence à traiter séparément :** les métadonnées du programme portent encore le nom « les 30 premiers jours » et duree_jours=30 ; le module décrit six mois, reste au statut brouillon et regle_mois est vide. Les périodes d’accès et le calcul des journées prennent déjà en charge les mois. Ces champs ne doivent pas être changés isolément sans analyser leurs consommateurs et les décisions existantes.

### Compteur privé

- La table seneve_private.hd_fidelite existe ; RLS activée.
- Aucun accès SELECT direct pour anon ou authenticated.
- Les fonctions lire/déclarer/annuler/masquer sont installées ; exécution interdite à anon, autorisée au rôle authenticated.
- Le workflow active VITE_HABITUDES_COMPTEUR.
- Ces constats corrigent l’ancienne mention « compteur non implémenté ». Ils ne remplacent pas une nouvelle recette entre deux comptes ni la vérification de chaque règle métier.

### Durées de lecture

La table hd_reading_logs et les fonctions hd_record_reading / hd_reading_details sont installées. RLS activée sur la table, SELECT anonyme interdit ; les fonctions sont interdites à anon. Les titres privés n’ont pas été lus pour ce contrôle.

### Rappels

- Le workflow active l’interface des rappels.
- La configuration de diffusion push est active et ouverte aux participants éligibles.
- Des rappels planifiés, annulés et acceptés ainsi que des tentatives push acceptées existent.
- **Accepté par le service d’envoi ne signifie pas reçu ou lu sur le téléphone.** La réception terminal, les permissions et les cas d’échec doivent rester explicitement distingués.
- Aucun rappel n’a été créé ni envoyé pendant cet inventaire. Aucune conclusion de réception WhatsApp n’est déduite du fonctionnement push.

### Mois payants

Le contrôle actuel des périodes payantes existantes ne relève aucun écart entre leur début/fin et ceux du droit associé. La décision d’alignement Continuité/HD est conservée.

Cela ne remplace pas une recette complète d’un nouvel achat, d’un doublon, d’un refus, d’un remboursement et de la reprise après coupure.

## Ce qui reste à compléter ou à recevoir

1. **Cohérence du référentiel six mois.** Inventorier les consommateurs des métadonnées anciennes, préparer la correction et son retour arrière ; ne pas modifier les durées ou les droits arbitrairement.
2. **Réception des paiements dans TEST.** Vérifier achat confirmé, doublon, refus, remboursement/révocation, frontières de périodes et reprise, sans transaction financière réelle pendant les tests.
3. **Réception des rappels.** Vérifier la réception sur appareil, les permissions, les périodes de silence, l’annulation et les échecs. Un canal non lié ou non autorisé ne doit pas recevoir de message.
4. **Contenus et langues manquants.** Le programme connecté inspecté est français. La présence de lectures publiques anglaises ne constitue pas un programme anglais connecté complet. La phonétique, l’Amidah anglaise, les audios et les recommandations ne sont pas présentés comme approuvés par simple présence d’un écran.
5. **Scénarios transversaux.** Correction d’une déclaration accidentelle, conflits entre appareils, absence de réseau durable, coexistence des parcours et publication Sheets/n8n restent à vérifier selon une recette dédiée. Cet audit ne les déclare ni absents ni reçus sans preuve.

## Prochaine étape recommandée

Préparer une matrice de réception des droits et paiements **dans TEST**, en réutilisant les règles existantes. Relever pour chaque scénario la preuve, les limites et le nettoyage des données fictives. Aucun changement de prix, de statut, d’inscription publique ou de droit réel n’est inclus dans cette étape.

Les rapports des 25–27 octobre restent conservés comme historiques, avec leurs constats datés.

## Complément du 28 octobre : recette SQL des paiements

La [recette serveur des paiements HD dans TEST](RECETTE_PAIEMENTS_HD_TEST_2026_10_28.md) a depuis vérifié les contrôles de conformité, les doublons, l’alignement Continuité/HD, l’achat anticipé, la reprise après coupure et la révocation avec conservation de l’historique. Un écart de conformité de TEST a été corrigé ; PROD n’a pas été modifiée. Les données fictives ont été annulées et leur absence contrôlée.

La vérification HTTP de la signature du webhook, le navigateur, le prestataire et les autres scénarios de réception restent distincts ; la réussite SQL ne vaut pas réception financière de bout en bout.
