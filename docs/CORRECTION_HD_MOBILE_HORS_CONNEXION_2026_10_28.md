# Correction du démarrage mobile hors connexion — 28 octobre 2026

Le programme HD est volontairement exclu du cache de l’espace : fermer puis actualiser sans réseau faisait disparaître son entrée ou aboutissait à une erreur de chargement. Les ressources embarquées ne suffisent pas à charger les activités protégées depuis Supabase.

La version Android 0.2-test ajoute :
- une entrée Habitudes & Défis visible hors connexion dans la version mobile ;
- un écran Aujourd’hui hors connexion, sans montage des activités protégées ni validation fictive d’un accès ;
- la lecture du nombre de notifications locales réellement en attente et de leurs permissions, avec vérification et arrêt possibles sans réseau ;
- un rechargement des accès au retour d’Internet ;
- la conservation des rappels si INITIAL_SESSION est vide et que le téléphone est hors ligne. La déconnexion explicite et le changement de compte continuent d’annuler les rappels.

Aucun texte privé HD, journal, compteur ou état d’activité n’est ajouté au cache. Aucun droit de lecture ou déclaration hors connexion n’est créé. Un nombre de notifications en attente ne prouve pas leur réception : le test physique reste nécessaire.

Tests ciblés : 29 réussis et TypeScript sans erreur avant compilation native. Le binaire corrigé est compilé par le workflow Android. La compilation iPhone est désormais lancée manuellement uniquement, sa préparation étant différée par l’utilisateur.

Installation : les APK précédents étaient signés avec des clés de débogage éphémères. Une mise à jour avec un autre certificat sera refusée par Android. Ne pas désinstaller l’ancienne application sans avoir conservé les brouillons et repères locaux nécessaires. Les alertes locales devront être programmées à nouveau dans la nouvelle installation ; aucune suppression de données serveur n’est effectuée par cette correction. La signature de distribution stable reste à préparer avant diffusion publique.

