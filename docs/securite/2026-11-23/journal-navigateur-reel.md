# Journal privé : essai dans Chrome — 23 novembre 2026

Résultat vérifié : [GitHub Actions 45155730473](https://github.com/dayvpharma-boop/seneve/actions/runs/45155730473), commit a3c61a92385a0c406d32aba1579b906d5169f6cc, job 137628039655 terminé avec succès. Navigateur réel : Google Chrome 157.0.8103.78, exécuté par Playwright. Artefact preuves-journal-chromium, ID 14808516814, contenant les relevés HTML FR/EN et resultats.json. Les journaux ont été relus après exécution.

Deux parcours réussis, français et anglais, avec deux onglets partageant le stockage du même navigateur. Vérifications effectuées : maintien de la saisie après renouvellement de session et rechargement ; déconnexion dans le second onglet fermant l'écran privé du premier ; suppression des clés de brouillons locales et anciennes ; compte B sans brouillon ni note de A ; retour à A sans ancien brouillon mais avec sa note fictive préservée. Zéro requête externe observée par le contexte de test, toutes les requêtes hors du serveur local étant refusées.

Périmètre exact : vrais composants ComptePrive et fonctions draft, effacerBrouillons, effacerEspaces, creerNettoyageSession de la branche. Le formulaire de recette, les événements Auth et la note persistante sont fictifs. La note est conservée dans un stockage de recette distinct et non dans Supabase. Cette preuve valide le comportement navigateur du nettoyage ; elle ne constitue pas un test RLS ou une connexion à deux comptes Supabase réels.

Les nouveaux fichiers sont confinés à scripts/recette/journal-browser et à un workflow de contrôle sans publication. Aucun changement de l'interface de production ni de sa configuration. La construction locale de la recette a également réussi.

Limites : réception du rappel de test, parcours avec deux sessions Supabase réelles et publication finale de F02 restent à vérifier séparément. L'ancien essai avec téléchargement Chromium n'a pas été compté comme réussi ; le parcours français du premier essai Chrome était passé mais sa capture graphique avait expiré. L'exécution réussie conserve des relevés HTML et JSON à la place.
