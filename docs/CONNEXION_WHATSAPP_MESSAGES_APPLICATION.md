# Connexion WhatsApp et messages dans SÉNEVÉ — préparation du 20 novembre 2026

## Décision du propriétaire
- Ajouter l'inscription et la connexion par numéro WhatsApp confirmé par code temporaire, sans e-mail obligatoire.
- Suspendre les envois WhatsApp quotidiens de la Découverte 7 jours.
- Conserver les e-mails.
- Donner accès aux messages dans l'application, avec rendez-vous matin, midi et soir et notifications consenties.

## État vérifié
- La branche de production est préservée. Aucun fournisseur payant n'est configuré par cette préparation.
- Le code WhatsApp de cette branche est masqué tant que VITE_WHATSAPP_AUTH_ENABLED n'est pas égal à true.
- Supabase Auth prend nativement en charge channel: whatsapp avec Twilio ou Twilio Verify. Le branchement du WhatsApp Cloud API Meta existant exige un chemin d'authentification dédié et vérifié ; ne pas lui envoyer directement un code produit dans le navigateur.
- Authentification : signInWithOtp demande le code, verifyOtp avec type sms vérifie le code reçu par WhatsApp. Aucune ouverture avant une session valide.
- shouldCreateUser vaut false dans le mode connexion. Aucun rapprochement de comptes sur le numéro saisi seul.
- ensure_participant exige auth.uid() et ne dépend pas de la présence d'un e-mail.
- Les deux programmes Découverte ont 7 contenus par version et un seul numéro de message par jour. Ne pas fabriquer 21 contenus.
- Les rappels génériques push sont déjà programmés toutes les 15 minutes, avec consentement, fuseau personnel et exclusion Habitudes & Défis.
- Limite constatée : le rappel existant utilise le premier contenu du jour et une clé par participant/jour/moment, ce qui nécessite une revue pour les multi-programmes.
- Les notifications actuelles listent annonces, réponses et rappels reçus ; elles ne constituent pas encore une boîte de réception autonome des contenus de programme.

## Suspension urgente n8n — PAS ENCORE EFFECTUÉE
Le contrôle de l'interface n8n est désynchronisé. L'état Published est seulement inventorié ; aucune désactivation vérifiée.
Ne pas annoncer la suspension. Ne pas révoquer les consentements des participants pour réaliser un arrêt technique.
Avant modification : télécharger une copie du workflow et noter sa version publiée et son état.
Examiner :
1. RELANCES — PARCOURS DÉCOUVERTE PROSPECT
2. RELANCES — AUDIO DE LUCIE (DÉCOUVERTE)
3. SUIVI QUOTIDIEN
4. SÉNEVÉ — Récapitulatif WhatsApp du soir
Les noms ne prouvent pas le chemin d'envoi : examiner déclencheurs, dépendances et nœuds.
Suspendre les branches d'envoi du programme PROSPECT_LIVRE_7J_FR_V1 / EN_V1, sans couper les e-mails ni la réception WhatsApp.
Bloquer également les reprises et réservations antérieures avant l'appel fournisseur ; inspecter les exécutions déjà lancées.
Ne jamais désactiver WHATSAPP BASE globalement : la connexion et les commandes peuvent en dépendre.
Vérifier ensuite l'absence de nouveaux appels fournisseur pour la Découverte et conserver l'historique des envois déjà acceptés.

## Activation WhatsApp — prérequis avant production
1. Vérifier le fournisseur actuel, la capacité d'envoi d'un modèle d'authentification et sa tarification ; aucun achat de service par défaut.
2. Configurer l'authentification téléphone, les limites de débit serveur, une expiration courte, la protection contre les abus et la longueur à 6 chiffres. Le délai client n'est pas une protection serveur.
3. Tester les numéros de recette et codes fixes uniquement dans seneve-test ; aucun numéro de test en production.
4. Vérifier compte sans e-mail, code expiré/faux/réutilisé, double appui, renvoi et panne fournisseur.
5. Ajouter le lien depuis un compte e-mail déjà authentifié avec preuve de possession, sans fusion automatique ; vérifier conservation des droits, achats et progression.
6. Contrôler ensure_participant, entrée Découverte et e-mails pour un compte sans adresse. Les tâches e-mail ne doivent pas tenter d'envoyer à une adresse absente.
7. Activer le drapeau uniquement après ces vérifications, puis refaire une recette réelle d'inscription et de connexion.
Le code envoyé reste un coût ponctuel d'authentification. Aucun envoi de message de programme n'est implicitement consenti.

## Diffusion dans l'application — à réaliser
- Source unique : contenus déjà publiés de la version figée de chaque inscription.
- Boîte de réception privée par participant et inscription, indépendante de l'autorisation push et de la présence d'un appareil.
- Trois rendez-vous selon horaires et fuseau choisis. Pour la Découverte actuelle : contenu du jour le matin ; rendez-vous d'action et de bilan à midi et le soir, sans inventer de nouveaux enseignements officiels.
- Clé d'idempotence par inscription/version/jour/moment ; aucune rafale de rattrapage après panne.
- Vérifier droit, état actif, calendrier local, publication et activité terminée avant préparation puis juste avant envoi.
- Push discret ouvrant le bon programme et moment ; aucun contenu intime sur écran verrouillé.
- Contenu consultable dans l'application même sans push ou si sa livraison échoue. Lecture différente de réalisation.
- Pas de remplacement du numéro de connexion par une adresse e-mail inventée.
- Conserver l'historique et arrêter après J7 sans modifier les inscriptions et versions.
- E-mails conservés selon les règles existantes.
- Préparer la migration et le retour arrière ; tester sur seneve-test avant production.
- n8n peut orchestrer l'appel sécurisé, mais un planificateur Supabase existe déjà : éviter deux moteurs concurrents et les doublons.

## Retour arrière du code préparé
Désactiver VITE_WHATSAPP_AUTH_ENABLED puis revenir au commit précédent de la page de connexion.
Aucune donnée participant ni fonction SQL n'est modifiée par ce commit.
Le rétablissement des messages WhatsApp reste une décision explicite du propriétaire ; ne pas le faire par simple retour du frontend.

## Mise à jour du 21 novembre 2026
Décisions de Dr Justin : code de connexion envoyé par **le numéro Meta actuel** ; messages du programme déposés dans l'application par **le planificateur Supabase** (pas n8n).

### Messages dans l'application — INSTALLÉ (seneve-test puis seneve-prod)
- Migration supabase/seneve_064_messages_application.sql ; ancienne version de mes_notifications sauvegardée dans supabase/sauvegardes/mes_notifications_avant_064.sql.
- Table seneve.messages_app (aucun accès direct), fonction seneve.deposer_messages_app(), tâche « seneve-messages-application » toutes les 5 minutes.
- Programmes à 3 messages : 1er, 2e et 3e contenus du jour à 08:00, 13:00, 19:00 (programmes.heures_messages) ou aux heures choisies par le participant. Découverte et Continuité : un message le matin (08:00 par défaut). Fuseau du participant, Africa/Kinshasa par défaut.
- Un message par inscription, jour et moment ; aucun rattrapage des jours passés ; Habitudes & Défis exclu ; indépendant de l'accord push.
- Cloche : section « Messages du programme » (FR/EN), badge Nouveau, lien « Ouvrir ma journée ».
- Vérifié : dépôt unique (2e passage = 0), parcours terminé ignoré, lecture par le participant seulement, empreintes identiques test/prod (mes_notifications ad733b6c…, deposer_messages_app b54873b1…).

### Code WhatsApp — PRÉPARÉ, NON ACTIVÉ
- Fonction Edge envoyer-code-whatsapp (crochet « Send SMS » de Supabase Auth) déployée sur seneve-test ; elle répond « Crochet non configuré » tant que les secrets manquent.
- Le site demande le code avec le canal « sms » de Supabase ; c'est le crochet qui l'envoie par WhatsApp (aucun SMS).
- Reste à faire (Dr Justin) : modèle « Authentification » approuvé par Meta, jeton permanent, puis secrets, crochet et fournisseur Téléphone dans Supabase ; activer VITE_WHATSAPP_AUTH_ENABLED après recette.

### Suspension n8n — TOUJOURS NON EFFECTUÉE
Connexion n8n à refaire par Dr Justin.

### Suspension n8n — EFFECTUÉE le 21/11/2026 vers 12 h 25 (Kinshasa)
- Flux « SUIVI QUOTIDIEN » (bcOVo0pVweMmj7Kt) désactivé à la demande de Dr Justin : plus aucun message de programme sur WhatsApp, pour personne. Copie avant arrêt : SENEVE 2.0/sauvegardes-n8n/SUIVI-QUOTIDIEN-avant-arret-21-11-2026.json.
- WHATSAPP BASE reste actif (réception, commandes, liaison, code de connexion).

### Connexion par code WhatsApp SANS modèle Meta — décision du 21/11/2026 après-midi
Meta refuse le modèle « Authentification » tant que l'entreprise n'est pas vérifiée. Même principe que « Relier mon WhatsApp » : c'est la personne qui écrit d'abord.
1. L'app demande le code à Supabase Auth (canal « sms »). Le crochet envoyer-code-whatsapp le DÉPOSE dans seneve.codes_connexion_whatsapp (10 min), sans rien envoyer.
2. La personne touche « Ouvrir WhatsApp » et envoie « CODE » au +243 844 211 119.
3. WHATSAPP BASE appelle seneve.remettre_code_connexion avec l'expéditeur donné par Meta et répond avec le code (conversation ouverte par la personne : gratuit, aucun modèle).
4. La personne saisit le code ; Supabase Auth le vérifie et ouvre la session.
Quelqu'un qui saisit le numéro d'un autre ne reçoit rien : le code ne part que vers le WhatsApp de ce numéro. Au plus 5 remises par numéro et par heure.
Plus tard (entreprise vérifiée) : META_WA_MODE=modele fait partir le code avec le modèle Meta, sans changer l'app.
- Migration supabase/seneve_065_code_connexion_whatsapp.sql : installée sur seneve-test, essais SQL réussis (aucune demande, remise, autre numéro, nouveau code, code expiré ; aucun accès anon/authenticated).
- Fonction envoyer-code-whatsapp v2 déployée sur seneve-test.
- Réglages Supabase à faire dans le tableau de bord : fournisseur Téléphone activé (expiration 600 s, 6 chiffres), crochet « Send SMS » en HTTPS vers la fonction, secret SEND_SMS_HOOK_SECRET.
- Essai complet réussi sur seneve-test (21/11) : code déposé par le crochet, refus pour un autre numéro, mauvais code refusé, bon code = session, code réutilisé refusé, numéro inconnu en « Se connecter » = refus ; dans l'app : compte créé sans e-mail, arrivée dans l'espace. Données d'essai effacées.
- seneve-prod (21/11) : migration seneve_065 installée (aucun accès anon/authenticated), fonction envoyer-code-whatsapp v1 déployée (même empreinte que le test).
- WHATSAPP BASE : branche « Demande de code (CODE) » ajoutée après LIER (CODE ou LOGIN → remettre_code_connexion → réponse FR/EN), CODE exclu de l'audio de Lucie ; version 205c3f2d publiée. Copie avant changement : sauvegardes-n8n/WHATSAPP-BASE-21-11-2026.json (version b93b94ac).
- Reste : réglages Supabase de seneve-prod (crochet, secret, téléphone), vrai essai avec le téléphone de Dr Justin, puis VITE_WHATSAPP_AUTH_ENABLED=true à la publication.
