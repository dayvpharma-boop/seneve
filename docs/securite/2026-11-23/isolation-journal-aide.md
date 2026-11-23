# Isolation Journal et Aide — 23 novembre 2026

Résultat vérifié sur seneve-test : 18 assertions SQL réussies. Deux identités Auth et deux participants fictifs ont été créés uniquement dans une transaction terminée par ROLLBACK. Aucun compte utilisable ni mot de passe créé, aucune donnée réelle consultée, aucun message envoyé, aucune donnée de test conservée.

Couverture : identité active, lecture de sa note et refus de lecture croisée dans les deux sens ; modification et suppression étrangères sans effet ; insertion pour un autre participant refusée ; modification de sa propre note autorisée ; demande d’aide propre lisible ; demande et message étrangers invisibles ; annulation et réponse à la demande étrangère refusées ; partage d’une note étrangère refusé ; intégrité finale de la note B.

Le test s’exécute avec SET LOCAL ROLE authenticated et les claims de chaque identité. Il contrôle les vraies règles RLS et les fonctions de cette base. Il ne simule pas deux connexions réelles dans le navigateur, ne teste pas le transport de JWT, et ne clôture donc pas la recette applicative à deux comptes réels. Il ne constitue pas un audit exhaustif des chemins d’idempotence, des rôles équipe ou des autres tables. Aucune correction ni déploiement nécessaire pour les scénarios qui ont réussi.

Script : supabase/tests/isolation_journal_aide_20261123.sql. La première demande d’exécution a expiré sans résultat ; la seconde a renvoyé explicitement le succès des 18 contrôles et du rollback.
