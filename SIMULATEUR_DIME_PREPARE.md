# Simulateur de dîme facultatif — préparation frontend
25 octobre 2026. Branche feat/habitudes-defis-socle, aucun déploiement ni activation.

## Source et règles
Source : cahier Habitudes & Défis du 25 octobre 2026, section 8 (pages imprimées 6–7), et architecture, section de séparation du calculateur et des paiements.
Les règles sont présentées comme pédagogie SÉNEVÉ, pas comme obligation légale ou conseil fiscal individuel.
Commerce : ventes moins marchandises et charges professionnelles réelles ; 10 % du bénéfice strictement positif.
Salaire : salaire reçu moins seules dépenses professionnelles nécessaires non remboursées ; 10 % de la base positive.
Don d'argent, cas général : 10 % du don.
Prêt : aucun calcul sur le principal.
Offrande : montant libre, aucun pourcentage imposé.
Cas particuliers : pas de calcul automatique ; les cas non tranchés du cahier sont signalés.
Les dépenses personnelles et dettes privées n'ont pas de champ de déduction.
Ces compléments ne sont pas présentés comme une citation exacte du livre.

## Comportement
Le simulateur est replié et facultatif dans le chemin HD de l'espace, désactivé par défaut.
Il demande le type de revenu, une période et les seuls montants pertinents.
Tous les montants d'un calcul doivent utiliser la même unité monétaire et période ; aucune conversion n'est effectuée.
La formule et le résultat sont affichés.
Les calculs utilisent des entiers BigInt à précision décimale fixe : entrées jusqu'à six décimales,
résultat exact de 10 % jusqu'à sept décimales, sans arrondi commercial inventé.
Les montants négatifs, absents, non numériques et les notations scientifiques sont refusés.
La dîme n'est jamais négative.

Les montants restent dans l'état du composant React. Aucun localStorage, sessionStorage, RPC,
historique, déclaration de progression ou paiement n'est ajouté par ce composant.
Changer de situation ou cliquer Effacer efface les montants et le résultat ; un démontage ne les restitue pas.
La fermeture du volet ne vaut pas effacement ; le bouton explicite reste disponible.
Il n'y a aucun lien de collecte ou couplage avec un droit commercial.

## Vérification
40 tests réussis : 13 du calcul, 6 de l'interface du simulateur, 6 de l'espace HD et 15 existants de l'espace.
Exemples du cahier vérifiés : 1000−650−150 => base 200, dîme 20 ; 500−70 => base 430, dîme 43 ; don 100 => 10.
Vérifiés aussi : perte, zéro, décimales exactes, champs hors type ignorés, entrées invalides,
aucune règle de calcul sur prêt/offrande/cas non tranchés, période requise, effacement,
absence d'appels réseau et de stockage dans les scénarios du composant.
Compilation TypeScript stricte et construction Vite avec option HD activée réussies.
Aucun montant personnel utilisé, aucune modification de base, aucun transfert.

## Limites
Le contrôle visuel navigateur/Safari reste à faire.
Les cas particuliers et l'arrondi éventuel restent des décisions éditoriales ; aucun taux d'offrande ni traitement fiscal n'est inventé.
La règle de périodicité des habitudes (commerce hebdomadaire, salaire mensuel dans le cahier) reste distincte de la période choisie pour une simulation.
Le module reste désactivé ; le calculateur n'est pas annoncé comme disponible en production.

## Retour
Laisser l'option HD désactivée conserve le parcours actuel. Aucun changement de base requis.
