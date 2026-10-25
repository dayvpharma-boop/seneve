# Habitudes & Défis — inventaire et correspondance, 25 octobre 2026

Statut : inventaire partiel vérifié ; pas de nouvelle migration, publication ou activation.
Décision explicite : aucun Lovable. GitHub, Supabase, n8n ; web prioritaire, FlutterFlow ultérieur.
Références locales : cahier Habitudes & Défis (12 pages), architecture (16 pages), méthode SÉNEVÉ n°13.
Les choix non décidés demeurent ouverts. Le choix 30 jours n'est pas validé.

## Éléments inspectés

- Dépôt dayvpharma-boop/seneve, branche main et branche feat/habitudes-defis-socle.
- Supabase production lclquncbhrmpwxgsthhk : schéma seneve, tables, fonctions et contraintes de progression.
- Supabase test rlojnuaajeubzlwofwhn : 4 tables hd_* en brouillon, 0 horaire individuel, 0 plan mensuel, regle_mois NULL.
- Google Sheets : Écosystème IA — Dr Justin Tshims, ID 1-eJk7Q8hh2zr6F8YXZgfFb-zF6FPsPE0AMHlT20NgQE.
- Métadonnées : 13 onglets. PROGRAMMES_FR absent des métadonnées actuelles.
- Nom exact du catalogue : quatre espaces suivis de CATALOGUE_OFFRES. Ne pas renommer.
- Fuseau classeur : Etc/GMT ; programmes inspectés : Africa/Kinshasa. Ne pas utiliser implicitement le fuseau classeur pour programmer les communications.
- Aucun outil n8n direct disponible dans cette session : configurations actives et dépendances des nœuds non inspectées.

## Correspondance

| Exigence | Existant observé | Action nécessaire |
| --- | --- | --- |
| Identité unique | participants, channel_links, consents | Réutiliser, vérifier liaison WhatsApp et consentement avant envoi |
| Plusieurs inscriptions | enrollments | Chaque inscription garde programme/version/langue |
| Six mois, 1 gratuit | programmes, programme_versions, offers, entitlements | Définir offre/version sans réutiliser aveuglément Continuité |
| Paiements vérifiés | payment_events, record_chariow_sale, claim_my_purchases | Examiner contrôles existants avant raccordement |
| Habitudes et horaires | hd_habit_templates, hd_habit_schedules uniquement en test | Conserver à l'état de prototype ; rattachement inscription/version et validation fuseau encore nécessaires |
| Progression quotidienne | activities, activity_state, progress_events, record_progress | Une occurrence distincte par activité et journée, ou modèle d'occurrences datées dédié à concevoir |
| Bilan | src/lib/progres.ts | Actuellement .find() retient une seule action par jour ; ne peut pas compter toutes les habitudes |
| Publications | contents, resources, publications ; publish_programme(_moments) | Réutiliser versions et contrôle éditorial ; examiner contrat avant nouvelle publication |
| Rappels | communications, claim_push_reminders, rappels_* | Rappels par occurrence, annulation après réalisation synchronisée |
| Amidah complète | Pas de texte/audio approuvé établi par cet inventaire | Valider source, droits, sections, langues et médias |
| Fidélité privée | Aucun modèle validé repéré dans cet inventaire | Politique conservation/effacement à décider avant codage |
| Dîme et offrande | Aucune implémentation établie par cet inventaire | Simulation facultative sans conservation ni transfert par défaut |
| Défis des sept racines | INDEX_PEDAGOGIQUE et contenus généraux | Textes et ordre des défis six mois à rédiger et approuver |
| FR/EN | routes et libellés existants ; programmes FR/EN | Traduction du module et Amidah non présumées validées |
| Hors connexion | lib/hors-ligne.ts, BrouillonHorsLigne | Ne pas prétendre que l'enregistrement hors ligne des habitudes existe |

## Contraintes vérifiées

activity_state : clé primaire (enrollment_id, activity_id), sans date.
progress_events : client_event_id UNIQUE, événements rattachés à une activité et une inscription.
Conséquence : réutiliser le même activity_id tous les jours écraserait le sens de la réalisation quotidienne.
Les tables hd_* actuelles n'ont pas encore ce raccordement.
hd_modules limite statut à brouillon : un cycle éditorial complet n'est pas implémenté.
hd_period_plans ne confère aucun droit et n'est pas reliée aux preuves de paiement : ne pas l'utiliser pour autoriser un accès.

## Google Sheets : colonnes lues

PROGRAMMES A:P : programme_id, nom_programme, type_parcours, offre_id, duree_formation_jours, duree_suivi_jours, delai_apres_achat_jours, messages_par_jour, jours_appels, fuseau_horaire, statut, documents_sources, version, heure_message_1, heure_message_2, heure_message_3.
CATALOGUE_OFFRES A:J : offre_id, produit, offre, prix, devise, statut, description, programme_id, langue, chariow_product_id.
CONTENUS A:T : contenu_id, programme_id, jour_parcours, jour_programme, canal, theme, document_source, page_source, section_source, exercice, rappel, action_concrete, question_suivi, texte_message, script_appel, statut_validation, version, numero_message, langue, audio_drive_id.
INSCRIPTIONS : en-têtes A:Z lus uniquement, aucune donnée de participant copiée.
INDEX_PEDAGOGIQUE A:O : programme_id, offre_provisoire, langue, jour_pedagogique, document_source, page_pdf, type_page, theme, parole, lecture, meditation, action_du_jour, question_journal, statut_reference, statut_message.
PROGRAMMES A2:P25 : 12 lignes retournées, pas de Habitudes & Défis dans cette plage.
Point de cohérence à vérifier : ligne livre FR indique delai_apres_achat_jours=14, alors que les instructions demandent un suivi dès achat confirmé. Ne pas corriger avant analyse des consommateurs.
Les six programmes Continuité présents en Supabase n'apparaissent pas dans cette plage Sheets : cartographie de publication à compléter.

## Sauvegardes : preuves et limites

Production : fonctions sauvegarde_export() et sauvegarde_verifier(text) présentes et définitions inspectées.
Audit : création le 25 octobre 2026 à 03h00 Kinshasa de seneve-sauvegarde-2026-10-25_03h00.json.asc ; vérification à 03h00:29, résultat ok.
La fonction export chiffre les données et la structure avec une clé gardée au coffre, sans mots de passe auth.
La vérification déchiffre et vérifie format/comptages/compatibilité de types, mais n'effectue aucune restauration.
Limites : fichier distant non récupéré dans cette étape ; sauvegarde non restaurée ; stockage médias et exports n8n non contrôlés.
La fonction de vérification tolère une table manquante sans toujours basculer ok à false : le résultat historique ok ne suffit donc pas à certifier une restauration complète.
Dépôt : sauvegarde de l'ancienne fonction claim_push_reminders datée 24 octobre, pas une sauvegarde de base.
Drive : copies historiques du classeur du 15, 14 et 11 octobre retrouvées ; aucune nouvelle copie créée à cette étape.
Aucune donnée privée de sauvegarde exportée vers le dépôt public.

## Réception

HD-01 à HD-24 : non exécutés pour le module. Les tests du socle prouvent seulement contraintes et permissions des 4 tables.
Priorité avant nouvelle migration : accès n8n/configurations, fichier de sauvegarde et restauration isolée, mapping des offres et publication, modèle d'occurrences quotidiennes.

## Suite sans dépendance commerciale

Préparer contrat d'API et maquette mobile en brouillon :
- Mon aujourd'hui : toutes les occurrences, actions séparées, états et aide distincts.
- Mes horaires : fuseau, 13 rendez-vous quotidiens et 3 cultes selon l'assemblée, adaptation des conflits.
- Prière : texte complet seulement lorsqu'approuvé ; disponibilité réelle des langues/audio.
- Lectures et écoute, engagements privés, simulateur de dîme, bilans et droits.
Les périodes commerciales et le compteur intime restent inactifs tant que leurs décisions et contrôles ne sont pas établis.
