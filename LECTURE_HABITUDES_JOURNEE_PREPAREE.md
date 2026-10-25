# Lecture et journées HD — préparation frontend
25 octobre 2026. Branche feat/habitudes-defis-socle, option HD toujours désactivée par défaut.

## Résultat
La journée HD présente les textes publiés de sa version et de sa langue dans des volets de lecture natifs details/summary.
Le texte_officiel est affiché intégralement comme texte échappé par React, sans interprétation HTML, découpage ou suppression des indications de mouvement.
Aucun texte Amidah tiers n'a été copié dans le dépôt ni publié par cette étape.
Le titre utilise le thème publié ou un repère de lecture neutre. Aucun geste ou commentaire religieux n'est généré.
La typographie, l'interligne et la largeur de lecture sont préparés pour faciliter la lecture ; les commandes de déclaration restent en dehors du texte.
Ouvrir, lire ou fermer un volet ne déclenche aucun RPC de progression.

Le sélecteur ne propose que les journées déjà ouvertes. Choisir un jour actualise ses textes et activités, sans les déclarer.
Le titre distingue le jour courant d'un jour antérieur consulté.
Les copies hors connexion ne donnent pas accès à cette nouvelle lecture HD ni aux déclarations : les règles de cache et de droits hors connexion restent à valider.

## Vérification
34 tests frontend réussis : 4 nouveaux tests de lecture, 5 tests de raccordement de la journée HD,
10 tests de déclaration et 15 tests existants de l'espace.
Cas couverts : texte entier et fin conservés, balises échappées, texte vide non proposé,
interface anglaise sans traduction du texte officiel, lecture sans déclaration, choix limité aux jours ouverts,
déclarations distinctes, pause et copie hors connexion.
Compilation TypeScript stricte et construction Vite avec option activée réussies.
Les données et RPC des essais sont fictifs ; aucun compte réel ni message envoyé.
Contrôle visuel navigateur/Safari toujours non attesté.

## Limites et suite
Sources raccordées dans la branche, aucun déploiement ou activation.
Cette étape n'approuve pas les droits éditoriaux des textes ; le corpus publié doit être autorisé et vérifié avant activation.
La personnalisation complète des horaires et fuseaux, le cache autorisé et la recette connectée complète restent à terminer.
L'aperçu HTML autonome livré précédemment reste un exemple du suivi ; ce raccordement concerne le code de l'espace.

## Retour
Laisser l'option VITE_HABITUDES_DEFIS désactivée conserve le circuit des parcours existants.
Aucun changement de base requis.
