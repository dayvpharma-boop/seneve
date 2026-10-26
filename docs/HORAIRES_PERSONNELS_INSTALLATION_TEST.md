# Horaires personnels — installation et formulaire de préparation

Migration habitudes_horaires_personnels installée sur seneve-test (rlojnuaajeubzlwofwhn), le 26 octobre 2026. Aucun changement sur seneve-prod. L’ancien blocage Invalid or expired requestState n’a pas empêché le nouvel appel de réussir.

## Sauvegarde

La table hd_habit_schedules reçoit creneau_id, pour distinguer plusieurs horaires de la même habitude avec une même date d’effet. Les fonctions privées seneve_private.hd_schedule_settings et hd_save_schedule contrôlent auth.uid(), propriétaire, inscription, droit actif et fuseau. Des façades SQL invoker exposent uniquement les appels autorisés à authenticated. Aucune permission d’écriture directe n’a été donnée aux clients.

Les horaires restent propres au participant/module/version/langue/habitude. Ils ne sont pas propres à une inscription : une inscription sert à autoriser l’appel pour ce module et cette version. Cela doit être conservé explicitement dans les intégrations futures.

Les changements prennent effet le lendemain local. Une version précédente est close à la veille ; les versions passées sont conservées. Les choix futurs encore à venir peuvent être remplacés. Une révision attendue refuse l’écrasement par une ancienne page. Le rejeu de la dernière demande, identifiant et contenu identiques, renvoie la même confirmation ; un identifiant réutilisé pour un autre choix est refusé. Une ancienne demande supplantée ne peut pas être réappliquée.

Cette première version conserve la fréquence du modèle : quotidien ou deux cultes en semaine et un troisième créneau. Des créneaux distincts permettent des heures différentes selon les jours. L’adaptation pédagogique d’une fréquence et la participation à distance ne sont pas réglées par cet endpoint.

Aucun progrès, droit, paiement ou rappel n’est créé. Les horaires ne sont pas encore reliés à la génération des activités ou aux envois.

## Interface raccordée dans la branche de préparation

HorairesHabitudes et son adaptateur RPC sont appelés dans /reglages?parcours=..., uniquement derrière VITE_HABITUDES_DEFIS=true et après connexion. Un lien depuis la journée HD mène à ces réglages ; il est absent hors connexion. Les commandes FR/EN n’impliquent aucune nouvelle traduction éditoriale des modèles.

L’interface attend une confirmation du serveur correspondant à l’identifiant et à la date d’effet. En cas de réponse réseau perdue, le même identifiant est réutilisé et les champs restent bloqués jusqu’à confirmation ; pas de réussite supposée. Cette demande reste seulement dans la mémoire du composant, pas dans un stockage local. Après rechargement, l’utilisateur doit repartir de la configuration relue du serveur. Les conflits et accès refusés invitent à recharger les réglages.

## Vérifications effectuées

- Recette SQL complète réussie sous rôles authenticated A/B : lecture propre, refus de lecture/modification d’autrui, écriture directe interdite, fréquence/jours/heures contrôlés, dates courantes refusées, sauvegarde datée, rejeu, révision périmée, révocation. Fixtures et écritures annulées par rollback.
- Les compteurs globaux de progress_events, payment_events et hd_activity_reminders restent identiques dans la recette.
- Retour arrière testé dans une transaction annulée : restauration des fonctions/table confirmée après rollback. Le script refuse la suppression dès qu’un horaire ou une révision est conservé.
- Après essais : zéro horaire personnel, zéro révision, zéro programme fictif conservés. EXECUTE anon=false, authenticated=true ; propriété et droit contrôlés dans les fonctions.
- 48 tests frontend distincts réussis : 9 horaires, 10 planning, 9 espace HD, 4 liens de profil, 16 profil. TypeScript et Vite réussis.
- Advisors : aucune nouvelle alerte WARN sur les fonctions. Le signal INFO RLS sans politique pour hd_schedule_heads est intentionnel : aucun accès direct client. Deux WARN préexistants restent : [pg_net public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) et [protection des mots de passe divulgués](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Limites restantes

Aucun essai réel de simultanéité entre connexions, aucun parcours navigateur authentifié complet via REST et aucun contrôle visuel Safari n’ont été effectués. Les tests frontend emploient un transport simulé ; la recette SQL vérifie séparément les fonctions réelles et les rôles. Le stockage peut donc être dit testé sur TEST, pas validé de bout en bout pour la production.

Ce code reste sur feat/habitudes-defis-socle. L’aperçu public déjà publié ne reçoit pas de formulaire connecté et ne crée aucune inscription.
