# Recette authentifiée HTTP — 26 octobre 2026

Résultat : réussie sur le seul projet TEST `rlojnuaajeubzlwofwhn`. Deux comptes fictifs temporaires ont été connectés par le vrai endpoint Supabase Auth, puis utilisés avec leurs jetons pour appeler les RPC via PostgREST. Aucun jeton forgé, aucun rôle de service dans les requêtes HTTP, aucun transport RPC simulé dans cette recette.

## Contrôles observés

1. Catalogue sans session refusé : HTTP 401, code PostgreSQL 42501.
2. Deux connexions par mot de passe fictif réussies via `/auth/v1/token?grant_type=password`. Identité retournée vérifiée pour chaque compte.
3. Catalogue authentifié complet : 15 habitudes du programme fictif et identité du compte correspondante.
4. Inscription sans confirmation explicite refusée : HTTP 403.
5. Deux requêtes HTTP d’inscription lancées avec `Promise.all` : deux réponses HTTP 200, une seule création, même inscription et même échéance. Durée exacte de 720 heures. Cela prouve le résultat des deux requêtes concurrentes ; aucun relevé de contention interne PostgreSQL n’a été réalisé.
6. Horaires relus avec la RPC authentifiée : 16 créneaux, dont les cultes personnalisés du mardi à 17 h 45 et du samedi à 18 h 15.
7. Lecture des horaires du premier compte par le second refusée : HTTP 403.
8. Catalogue fermé après utilisation de la gratuité pour le premier compte ; offre toujours disponible pour le second.
9. Nouvelle tentative du premier compte : inscription et fin inchangées, aucune réapplication des horaires.

## Données et nettoyage

Le programme de recette, l’offre et les deux comptes ont été créés temporairement dans TEST pour permettre de vraies sessions HTTP. Le programme portait explicitement un nom de recette fictive ; sa publication était une configuration de test, sans contenu spirituel et sans validation de contenu réel. Les adresses utilisaient le domaine réservé `.invalid`, et les comptes ont été préparés directement en base pour éviter toute inscription par e-mail ou notification. Aucun appel d’envoi n’a été fait.

Les sessions ont été déconnectées, puis les données de recette supprimées par leurs identifiants exacts. Vérification finale en base : 0 compte, 0 session, 0 profil, 0 inscription et 0 programme de cette recette ; 0 période HD, 0 horaire HD, 0 mapping HD et 0 rappel HD dans TEST ; 0 paiement associé aux comptes fictifs. Les fichiers locaux contenant les mots de passe, la clé publique et les SQL paramétrés ont été supprimés. Aucun secret de recette n’est conservé dans le dépôt.

Les journaux techniques de Supabase Auth/API peuvent conserver leurs traces habituelles. Aucune purge de ces journaux n’a été demandée ou effectuée.

## Reproduction

Les scripts `scripts/recette/habitudes-auth-prepare.py` et `habitudes-auth-http.mjs` sont réservés au projet TEST et refusent une autre URL. Fournir dans un fichier privé temporaire uniquement `url` et `apiKey` (clé publiable TEST). Le script Python génère de nouveaux identifiants, un mot de passe aléatoire et deux fichiers SQL privés : préparation et nettoyage. Python avec `crypt`/Blowfish est nécessaire pour ce préparateur ; `crypt` n’est plus inclus dans Python 3.13.

Exécuter le SQL de préparation via la connexion TEST autorisée, puis `node scripts/recette/habitudes-auth-http.mjs /chemin/config-privee.json`. Toujours exécuter le SQL de nettoyage ensuite, y compris après échec, puis vérifier les comptes et lignes concernés avant suppression des fichiers privés. Ne jamais versionner les fichiers générés. Le script HTTP n’affiche ni jeton ni mot de passe.

## Limites et suite

Cette recette couvre Auth et les RPC réelles de catalogue, inscription et lecture des horaires. L’interface React a été vérifiée séparément par les tests déjà consignés ; aucun parcours de navigateur authentifié complet, test Safari ou test de déconnexion visuelle n’est revendiqué ici. Le programme fictif sans contenu ne démontre pas la disponibilité du parcours de six mois, du coach, des rappels ni des paiements.

PROD et le site public sont inchangés. Avant ouverture : valider le contenu et le périmètre de l’offre, terminer la recette visuelle authentifiée et préparer le déploiement avec la configuration réelle.
