# Recette de record_progress sur tables SÉNEVÉ existantes

25 octobre 2026, seneve-test uniquement. Script supabase/tests/habitudes_api_existante.sql exécuté avec succès dans une transaction annulée.

Préparation : contraintes et colonnes des tables inspectées ; absence de déclencheurs applicatifs auth.users, participants, programmes, programme_versions, contents, activities, jobs et help_requests confirmée avant l'essai.

Fixtures générées : deux identités auth fictives sans email ni mot de passe, deux participants, programme de recette 2 jours (pas durée du vrai module), version archivée fictive, contenus et activités matin/midi/soir + action future, deux inscriptions. Tous les UUID sont générés en transaction. Aucun texte spirituel, achat, droit payant, canal vérifié ou notification réelle.

API appelée sous le rôle authenticated avec identifiant de session fictif A :
- Une prière réalisée produit un seul état réalisé.
- Rejouer le même client_event_id et les mêmes paramètres retourne repetition=true sans second événement.
- Réutiliser le client_event_id pour une autre activité est refusé.
- Aide demandée conserve etat=non_commencee ; préparation ultérieure conserve l'indicateur aide.
- Les trois prières peuvent être confirmées séparément.
- Une écriture sur l'inscription B est refusée.
- Une écriture pour le jour suivant non ouvert est refusée.
- Une inscription en pause refuse une nouvelle écriture.

Côté serveur : cinq événements uniques attendus ont produit cinq jobs reevaluer_rappels ; une seule demande d'aide. Les jobs ne sont pas réclamés ni traités. Créer un job ne démontre pas une annulation effective ou un envoi.

ROLLBACK exécuté. Contrôle séparé : aucun programme HD_RECETTE_%, aucun participant RECETTE_FICTIVE_A/B, compte auth fictif contrôlé absent, table temporaire absente.

Portée : utilisation réelle de record_progress dans la base de test avec fixtures annulées ; pas un appel HTTP depuis le navigateur et pas un test de paiement. Les vérifications de droits mensuels, fuseau personnel et rappels du nouveau module restent à installer et vérifier avant activation. Aucun changement production ou migration permanente. Les scénarios complets HD-01 à HD-24 ne sont pas tous validés.
