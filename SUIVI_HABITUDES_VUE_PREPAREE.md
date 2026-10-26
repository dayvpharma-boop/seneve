# Vue de suivi des habitudes — préparation frontend
25 octobre 2026.
Branche feat/habitudes-defis-socle, aucun déploiement ni activation.

## Résultat
La route /progres dispose d'une vue de lecture dédiée aux inscriptions enregistrées dans hd_programme_links.
L'option de construction VITE_HABITUDES_DEFIS doit être exactement true pour consulter ce registre.
Elle reste désactivée par défaut ; aucune configuration de déploiement n'a été changée.
Sans option, les parcours existants conservent leur interface et ne consultent pas la nouvelle table.

Chaque action publiée est présentée avec sa consigne et son état indépendant.
Les trois prières ne sont jamais identifiées par leur position ou par une consigne inventée.
L'ordre vient des messages publiés. Les actions facultatives sont signalées.
Les données sont isolées par inscription, programme, version, langue et jour ouvert.
Une demande d'aide ne transforme pas une action en réalisation.
Une réponse serveur absente ne devient pas une réalisation.
La vue ne lit aucun état local et ne déclare aucune action : elle présente seulement activity_state chargé du serveur.

Un registre inaccessible déclenche l'erreur de chargement.
Des contenus indisponibles ne sont pas présentés comme zéro activité réalisée sur zéro.
Les consignes ne sont pas traduites automatiquement lorsque la langue de l'interface change.

## Fichiers
src/lib/habitudes-lecture.ts : adaptation vers les règles bilanHabitudes existantes.
src/components/BilanHabitudes.tsx et .css : vue dédiée, liste accessible, styles responsive et variables des thèmes existants.
src/routes/progres.tsx : raccordement sous option désactivée.
src/test/habitudes-progres.test.tsx : scénarios frontend.
src/lib/habitudes-api.ts : précision du type de l'état confirmé pour la compilation stricte ; comportement inchangé.

## Vérifications exécutées
- 7 nouveaux tests frontend réussis : trois prières distinctes, aide, contenus inaccessibles,
  erreur registre, option désactivée, interface anglaise, isolation version/langue/inscription/jour.
- 10 tests existants de la route et du bilan réussis.
- 29 tests Node existants des règles, de l'adaptateur et des contrôles réussis.
- Compilation TypeScript stricte réussie avec --noEmit --allowImportingTsExtensions.
- Construction Vite réussie avec option désactivée puis activée.
Vérifications sur une copie locale de l'application et les sources modifiées.
Le contrôle visuel navigateur n'a pas pu être exécuté : binaire Chromium absent.
L'essai local n'a appelé aucun compte réel, ni envoyé de message.

## Limites et suite
Cette étape ne crée ni contenu, droit, inscription, préférence ou déclaration.
L'écran de déclaration /espace et son traitement de plusieurs actions restent à raccorder.
Les états locaux en attente doivent être intégrés séparément avant de promettre une reprise hors connexion complète.
Le calendrier conserve ici l'ouverture des jours existante ; personnalisation complète du fuseau encore à vérifier.
Le contenu Amidah n'a pas été copié ni publié par cette étape.
Contrôle visuel mobile, recette authentifiée en TEST puis décision d'activation restent à faire.
Une construction réussie ne constitue pas un déploiement.

## Retour
Désactiver l'option restaure immédiatement le chemin de lecture antérieur.
Les changements restent isolés dans la branche de travail ; aucun changement de base nécessaire pour revenir sur cette vue.
