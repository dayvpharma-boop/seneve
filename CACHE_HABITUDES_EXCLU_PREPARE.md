# Exclusion du cache HD identifié — préparation frontend
25 octobre 2026. Sources sur feat/habitudes-defis-socle ; non déployées.

Le cache général de l'espace écarte les inscriptions identifiées HD dans le chargement :
parcours concernés, contenus, activités et états associés.
Les copies des autres inscriptions sont conservées en respectant leur programme/version/langue.
Un espace uniquement HD n'est pas enregistré comme une copie vide.
Une ancienne copie portant le marquage HD est nettoyée à la lecture ; sa date d'origine est conservée.
Si le stockage refuse la suppression ou la réécriture, cette copie n'est pas restituée à l'interface.
La fonction ne modifie pas les données affichées en ligne, les droits serveur ou les brouillons du journal.

16 tests réussis : 8 du filtrage de cache, 6 de l'espace HD, 2 existants des brouillons.
Compilation TypeScript stricte réussie.
Aucune donnée réelle de navigateur utilisateur manipulée par ces essais ; localStorage est celui de jsdom.

Limites : ce filtre repose sur l'identification HD contenue dans les données chargées.
Il ne permet pas de classifier une copie ancienne sans ce marquage.
Avant activation, le cycle de désactivation du module avec des inscriptions HD existantes devra garantir cette identification
même si les écrans HD sont désactivés. Ce scénario n'est pas déclaré couvert.
Il ne constitue pas une politique complète de cache autorisé ou de synchronisation hors connexion.
Le stockage sensible du compteur reste à décider avant développement, conformément à la source.
Si le navigateur refuse tout effacement, le code peut refuser la lecture mais ne garantit pas l'effacement physique des anciens octets.
