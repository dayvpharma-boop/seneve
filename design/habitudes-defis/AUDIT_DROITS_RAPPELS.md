# Audit ciblé des droits et rappels — 25 octobre 2026

Lecture seulement. Aucune modification de production ou de test.

## Périmètre et preuves

Supabase production et test : politiques de lecture de contents, activities, enrollments, progress_events et activity_state ; déclencheurs progress_events/activity_state/enrollments/communications. Production : définitions complètes _push_rappel_eligible et claim_push_reminders. Les lectures n'ont ni réclamé de notifications ni exécuté record_progress.

## Résultats observés

1. Les inscriptions sont isolées par participant. Les états et événements sont lus via les inscriptions du propriétaire.
2. La lecture contents autorise une version publiée ou archivée associée à une inscription visible, ou un rôle éditorial. La politique inspectée ne filtre ni date de droit mensuel ni expiration. La politique activities dépend de cette lecture contents.
3. Le seul déclencheur applicatif trouvé sur les quatre tables inspectées est progress_jour_ouvert. La définition lue précédemment contrôle l'ouverture du jour avec Africa/Kinshasa, sans contrôle explicite du droit mensuel.
4. record_progress inspecté sur test contrôle session, propriétaire, inscription active, programme/version, déduplication et progression monotone, puis crée un job de réévaluation. Le contrôle explicite du droit mensuel n'y est pas présent. Cela n'établit pas le comportement complet des autres parcours ; ne pas généraliser à toutes les API.
5. Les rappels push relisent consentement, appareil, inscription active, calendrier, créneau et fuseau personnel. Les réservations anciennes ou inéligibles peuvent être annulées avant envoi par claim_push_reminders.
6. Leur clé logique est rappel|participant|date|moment ; le SELECT DISTINCT ON participant,moment choisit une inscription. Cette clé ne permet pas de distinguer chaque habitude et chaque inscription du nouveau module.
7. L'annulation liée à la progression cible le midi et détecte n'importe quelle action du jour préparée OU réalisée. Elle ne représente pas l'annulation précise du rappel de la seule occurrence réalisée requise par Habitudes & Défis.
8. Le choix du contenu du rappel retient le premier contenu du jour. Pas une sélection de l'activité quotidienne individuelle.

## Décision technique de préparation

Ne pas activer Habitudes & Défis avec ces règles globales sans adaptation. Préserver les parcours existants ; concevoir les contrôles du nouveau module par inscription/version/date/occurrence, au lieu de changer aveuglément les règles du livre ou de Continuité.

Contrôle serveur obligatoire commun aux lectures, écritures et rappels : participant authentifié, inscription, programme/version/langue, période de droit active, activité appartenant à l'occurrence et journée autorisée. Un mois payant n'est accessible qu'avec preuve de droit valide. La règle commerciale du mois reste ouverte et les périodes doivent être explicites.

Rappel du module : clé unique incluant inscription + version + date locale + occurrence + canal + créneau ; consentement et liaison vérifiés ; activité préparée/partielle = pas de réalisation présumée ; réalisée et synchronisée = annuler seulement les rappels encore en attente de la même occurrence. Recontrôler avant envoi, après panne et avant nouvelle tentative. Ne pas envoyer de rafales. Ne pas toucher aux messages déjà acceptés par le fournisseur.

## Scénarios à exécuter avant raccordement réel

- Expiration d'un mois : lecture directe API et écriture record_progress réservées au nouveau module refusées selon politique validée, historique préservé.
- Matin réalisé : seul son rappel est supprimé ; midi et soir restent indépendants.
- Action préparée/partielle : aucun achèvement supposé.
- Deux habitudes au même créneau : pas de collision de clés ; règles anti-rafale appliquées.
- Deux inscriptions : pas de sélection silencieuse de l'une au détriment de l'autre.
- Consentement retiré, liaison WhatsApp absente, droit révoqué ou pause : pas d'envoi.
- Même événement transmis deux fois : une progression et une annulation logique.
- Changement de fuseau : date pédagogique cohérente et aucun doublon.

## Limites

Pas de scénarios de bout en bout exécutés dans cet audit. Pas d'audit n8n actif, pas de restauration isolée du fichier de sauvegarde. Les 19 tests locaux existants restent des tests de calcul et d'adaptateur à transport simulé ; ils ne valident pas les contrôles listés ici.

L'adaptateur préparé reste non relié aux écrans. Aucune offre activée, aucun prix ou mois de 30 jours validé, aucun envoi externe.
