# Déclarations indépendantes des habitudes — préparation frontend
25 octobre 2026 — branche feat/habitudes-defis-socle.

## Résultat
L'espace possède un chemin HD dédié sous l'option VITE_HABITUDES_DEFIS=true, toujours désactivée par défaut.
Seules les inscriptions identifiées par le registre HD utilisent ce chemin.
Toutes les actions du jour publié, de la bonne version et langue, deviennent des cartes distinctes.
Les boutons utilisent le RPC record_progress existant à travers enregistrerHabitude.
Une confirmation valide est nécessaire avant l'affichage synchronisé.
Préparée, partielle, réalisée et aide demandée gardent leurs significations distinctes.
Le parcours en pause, clôturé ou affiché hors connexion ne permet aucune déclaration HD.

## Reprises et confidentialité
Chaque carte bloque le double clic pendant son appel.
Avant l'appel, une requête minimale (UUID et type d'action) est enregistrée dans sessionStorage.
La clé sépare le compte, l'inscription et l'activité datée ; aucun texte personnel n'y est enregistré.
Un réessai utilise le même UUID et la même action, y compris après remontage ou rechargement de l'onglet.
Une autre action attend la confirmation de la précédente.
Si le stockage échoue avant préparation, aucun RPC n'est appelé.
Un nettoyage local échoué après confirmation ne nie pas la confirmation serveur ; le même réessai reste disponible.
Les requêtes sont effacées par le nettoyage existant à la déconnexion.
Cette protection est par carte/onglet ; elle ne promet pas une file hors connexion durable entre appareils ou après fermeture du navigateur.
Aucune reprise automatique n'est activée.

## Vérifications exécutées
44 tests frontend réussis :
- 10 sur la déclaration (attente serveur, double clic, matin/midi, réponse vide, réessai après remontage,
  préparation et réalisation partielle, aide, lecture seule, stockage indisponible, isolation et nettoyage,
  confirmation reçue malgré un nettoyage local échoué) ;
- 3 sur le raccordement à l'espace (trois cartes, pause, copie hors connexion) ;
- 7 tests du suivi HD existant ;
- 24 tests existants des choix d'action et de l'espace.
Compilation TypeScript stricte réussie avec --noEmit --allowImportingTsExtensions.
Construction Vite avec option HD activée réussie.
La copie de compilation a été actualisée avec la version courante d'espace-textes.ts du dépôt,
car sa copie locale antérieure ne contenait pas les nouveaux libellés déjà utilisés par la route.
Une fonction commune habitudesActivees centralise l'option pour les deux vues.

Les RPC des tests sont simulés. Aucun état de participant réel ni nouvelle donnée de base n'a été écrit.
Le contrat serveur record_progress et ses contrôles avaient été testés séparément dans les recettes SQL précédentes.
Une recette authentifiée complète de cette interface sur TEST reste à faire.

## Limites et suite
Code préparé et vérifié localement, sans déploiement, activation ou envoi.
Cette branche de saisie ne constitue pas encore l'écran HD complet : lecture Amidah, navigation des jours,
horaires personnels et synchronisation durable hors connexion restent à intégrer/vérifier.
Le contrôle visuel mobile/Safari reste non attesté (navigateur de vérification indisponible).
Le module reste désactivé par défaut.

## Retour
Laisser VITE_HABITUDES_DEFIS désactivé conserve le circuit des parcours existants.
Aucun changement de schéma n'est requis par cette étape.
