# SÉNEVÉ

Site web de SÉNEVÉ : le Test des 7 Racines (sans compte) et l'espace participant (Découverte 7 jours).

- Données : projet Supabase `seneve-prod`, schéma `seneve`, protégé par des règles par ligne. Ce dépôt ne contient aucun mot de passe ni clé secrète ; seule la clé publiable, publique par conception, y figure.
- Mise en ligne : chaque modification de la branche `main` lance les contrôles automatiques puis publie le site sur GitHub Pages. Si un contrôle échoue, rien n'est publié.
- Commandes : `npm install`, `npm test`, `npm run build`.

## Tableau de pilotage administrateur

La page /admin affiche un tableau de bord pour les administrateurs uniquement.
La fonction SQL `seneve.staff_dashboard(p_jours)` se trouve dans `supabase/dashboard_pilotage.sql`.
Version 2 (18/10/2026) : installée sur seneve-prod (migration seneve_039_tableau_de_bord_v2) et sur la base
d'essai seneve-test, empreintes identiques vérifiées. Toute nouvelle version doit être installée sur seneve-prod
avant la publication du site, sinon le tableau de bord affiche « Indicateurs indisponibles ».

Essais en local : `.env.local` (non publié) définit `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY` vers seneve-test.
Sans ce fichier, le site utilise seneve-prod.
Elle retourne des compteurs et des listes limitées à 50 éléments, sans lire les journaux ni les conversations.

- Période : 7 ou 30 jours glissants, comparés à la période précédente de même durée.
- Les comptes de l'équipe (staff_roles) ne sont pas comptés comme participants.
- À traiter : demandes d'aide ouvertes depuis plus de 48 h, achats sans accès, questions au coach sans réponse, incidents, relances.
- Parcours d'entrée : visites du test, tests terminés, Découvertes commencées, achats vérifiés, provenance des visites.
  Le test est anonyme : les taux entre étapes sont une tendance, pas un suivi individuel.
- Pratique : actions réalisées ou en partie, « J'ai besoin d'aide », part des nouveaux ayant réalisé une 1re action, questions au coach.
- Nouveaux et actifs : actif = au moins une action déclarée (événement de progression) sur la période.
- Relances : inscriptions actives dans leur période, sans activité depuis 72 heures. Une lecture seule n'est pas une activité mesurée.
- Incidents : communications en erreur/incertaines/expirées modifiées depuis 7 jours, traitements en erreur/à examiner tous âges.
- Achats : ventes à signature vérifiée, reçues/en attente de compte/à examiner ; accès révoqués exclus.
- Un échec de lecture affiche une erreur et garde les derniers chiffres datés, sans les remplacer par des zéros.

Le déploiement du frontend suit le workflow GitHub existant. L'ajout local ne publie pas automatiquement le site.

## Habitudes & Défis

État courant : [inventaire vérifié du 27 octobre 2026](docs/INVENTAIRE_HD_2026_10_27.md). Le socle est installé en production et les écrans sont activés pour les inscrits ; l'inscription publique reste fermée. Les anciens comptes rendus TEST décrivent leurs étapes historiques. Le module complet n'est pas encore réceptionné.
