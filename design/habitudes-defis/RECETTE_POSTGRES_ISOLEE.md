# Recette PostgreSQL isolée — 25 octobre 2026

Environnement : seneve-test, PostgreSQL 17.11. Script supabase/tests/habitudes_isole_postgres.sql exécuté avec succès, puis ROLLBACK. Objets temporaires et identifiants fictifs uniquement ; aucun utilisateur auth réel créé, aucune notification, aucune donnée de production.

Assertions PostgreSQL exécutées :

- Le rôle authenticated, avec identifiant JWT fictif A, ne lit que ses deux occurrences autorisées.
- A ne lit pas l'occurrence de B et ne peut pas y écrire.
- Une période payante dont la fin exclusive est maintenant n'ouvre ni lecture ni écriture.
- Un événement répété avec le même identifiant ne produit qu'une ligne.
- Une activité préparée n'annule pas les rappels.
- Une activité du matin réalisée annule uniquement le rappel du matin ; midi reste planifié.
- Après révocation du droit, lecture d'occurrences et nouvel événement sont refusés.
- L'historique reste présent pour la vérification serveur, sans suppression.

Portée : maquette SQL/RLS avec tables temporaires, pas intégration des tables seneve ou de record_progress. La logique de déduplication démontrée ici ne teste pas un conflit de charge utile, ni la concurrence. L'annulation est testée en base, sans worker ni prestataire. Ce résultat ne valide pas encore HD-01 à HD-24 de bout en bout.

Le ROLLBACK annule les politiques, grants, données et tables de test. Contrôle séparé demandé après exécution : aucun des six noms de tables temporaires ne doit subsister.

Suite : transposer la logique au modèle d'inscriptions et droits réel après préparation des migrations, sauvegarde et restauration isolée. Puis vérifier avec les écrans, n8n et les consentements sans envoi réel en phase de recette.
