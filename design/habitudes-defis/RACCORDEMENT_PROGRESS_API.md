# Raccordement progression — préparation

Fonctions actuelles inspectées sur seneve-test : current_participant_id, record_progress, tg_progress_jour_ouvert. Colonnes de communications, contents et activity_state inspectées.

record_progress vérifie le participant, l'inscription active, l'appartenance de l'activité au programme/version ; déduplique client_event_id ; conserve la progression monotone ; distingue aide ; ajoute un job reevaluer_rappels dans la transaction. Ce job n'est pas une preuve que le rappel a effectivement été annulé.

Approche possible : produire les activités officielles distinctes pour chaque jour, puis utiliser activity_id comme identifiant d'occurrence datée. Aucune création automatique de ces contenus n'a été effectuée. Ne pas réutiliser une même activité récurrente pour plusieurs jours avec la clé actuelle activity_state.

src/lib/habitudes-api.ts fournit le mapping jour/programme/version/langue et l'appel exact record_progress. Les identifiants UUID sont validés, l'appelant garde client_event_id après erreur réseau, les erreurs ne produisent aucune confirmation, synchronise n'est retourné qu'après réponse serveur valide. Ce module ne confère aucun accès et n'est pas relié à une route.

19 tests locaux réussis : 12 bilan + 7 raccordement avec transport simulé. Pas de test réseau réel, d'envoi ou de mutation Supabase. Commande Node 24 : node --test scripts/test-habitudes.mjs scripts/test-habitudes-api.mjs.

Points à traiter avant activation : vérifier les droits mensuels et leurs contrôles dans tous les chemins ; le corps de record_progress inspecté n'effectue pas lui-même de contrôle explicite entitlements. Examiner les protections complémentaires avant de conclure à une faille ou d'activer ce module. tg_progress_jour_ouvert utilise Africa/Kinshasa explicitement ; concevoir le fuseau personnel. Vérifier annulation des rappels et traitement n8n, liaison WhatsApp, source des contenus publiée, comportements de correction, conflit inter-appareils et rejeu après expiration. Une restauration isolée reste préalable aux nouvelles migrations importantes.

Aucun changement du schéma, de l'API existante, des inscriptions, de la production ni de l'Amidah à cette étape.
