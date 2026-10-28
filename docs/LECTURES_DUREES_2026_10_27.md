# Durées et titres des lectures — 27 octobre 2026

La fiche « Combien de temps ? » conserve une durée totale entière (1 à 1 440 minutes) et un titre/référence facultatif (160 caractères). Aucun temps n'est déduit de la consultation, aucun statut n'est déduit du nombre de minutes. La confirmation explicite choisit « En partie » ou « Fait ».

## Stockage et déclaration

`habitudes_lectures_durees.sql` a été appliqué dans seneve-test et seneve-prod sous le nom `habitudes_lectures_durees`. Les fonctions existantes record_progress, hd_has_current_right et hd_date_du_jour sont identiques dans les deux bases et ne sont pas modifiées.

Le nouvel appel hd_record_reading vérifie le titulaire, le droit courant, les cinq clés de lecture approuvées et la date d'ouverture. Il appelle record_progress puis ajoute la durée et le titre dans une seule transaction. Le même identifiant avec un autre contenu est refusé ; rejouer une ancienne saisie ne remplace pas la durée plus récente. Les titres ne sont inclus dans aucun message ni charge de travail du coach.

Les logs sont lisibles uniquement par leur titulaire (RLS) ; les écritures directes et l'exécution anonyme sont révoquées. La lecture reste possible après expiration des droits. Les suppressions des inscriptions/événements entraînent celles des logs associés par cascade. Les anciennes données et déclarations sans durée restent valides ; aucune durée fictive ne leur est attribuée.

La saisie en attente est figée dans sessionStorage avant l'appel, sous une clé propre au compte, à l'inscription et à l'activité. Elle contient seulement l'identifiant, l'action, la durée et le titre limité. Elle est effacée après confirmation et à la déconnexion. Après erreur ou rechargement, la même saisie est réutilisée.

## Vérifications

- Recette SQL dans TEST avec deux comptes fictifs et rollback intégral : titre normalisé, partielle/réalisée, rejeu, conflit, limites de durée/titre, refus d'une prière et d'un jour futur, isolation entre comptes, absence de session, révocation et historique conservé. Zéro ligne de lecture restante après recette.
- En PROD : RLS active, SELECT authenticated autorisé, INSERT direct et EXECUTE anon refusés ; zéro ligne avant utilisation. Aucun ajout de progrès sur un compte réel pendant les contrôles.
- 34 tests ciblés réussis : formulaire, double clic, panne/reprise avec même événement, compteurs, retrait immédiat des anciens titres au changement de compte, prière, Bible et gratitude. TypeScript sans erreur.
- Aucun avertissement des advisors ne concerne les nouveaux objets. Les avertissements antérieurs pg_net et protection des mots de passe ne sont pas modifiés par ce lot.

Un retour à l'ancienne interface peut conserver les nouveaux logs : ne pas supprimer les données de durée lors d'un retour arrière de l'application.
