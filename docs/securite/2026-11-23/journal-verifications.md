# Journal privé — vérifications du 23 novembre 2026

Trois scénarios supplémentaires ont été ajoutés au correctif F02 : déconnexion en français et en anglais avec effacement du brouillon local mais conservation d'une note synchronisée fictive, relecture de la note après reconnexion et absence de suppression serveur ; renouvellement du jeton avec conservation de la saisie affichée et de son brouillon.

Résultat : 59 tests réussis dans quatre fichiers (journal-aide, confidentialite-session, compte-prive, journal-hors-connexion). Tests d'interface avec navigateur simulé et serveur fictif ; aucune note d'un participant réel n'a été lue.

## Recette dans un navigateur réel, sur un frontend actualisé

1. Connecter A, saisir un texte fictif et vérifier sa conservation pendant la même session, y compris après renouvellement du jeton.
2. Enregistrer une note distincte et vérifier sa synchronisation, puis saisir un autre brouillon sans l'enregistrer.
3. Se déconnecter : vérifier que les clés locales de brouillons (y compris les anciennes clés sans propriétaire) ont disparu.
4. Connecter B : aucun brouillon de A ne doit apparaître.
5. Reconnecter A : la note synchronisée reste disponible ; le brouillon effacé ne réapparaît pas.
6. Refaire la déconnexion depuis un second onglet et vérifier la fermeture de l'écran privé du premier ; refaire le parcours en anglais.

Limite : ces essais avec deux sessions Auth réelles restent à faire. L'ancienne recette-hd publiée ne contient pas F02. Aucun changement n'a été publié en production ; aucune modification des droits, des consentements ou des rappels n'était nécessaire à cette étape.
