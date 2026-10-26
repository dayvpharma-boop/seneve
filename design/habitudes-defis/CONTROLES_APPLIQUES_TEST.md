# Contrôles appliqués aux lectures et actions — TEST

25 octobre 2026. Migration habitudes_controles_lectures_actions installée uniquement sur seneve-test après essai transactionnel annulé et enregistrement des sources sur branche.

Ajouts : policy restrictive hd_contents_access_guard sur contents ; fonction invoker hd_content_allowed ; trigger hd_progress_access_check sur progress_events avec fonction invoker hd_progress_access_guard. Aucun remplacement de record_progress ni des anciennes politiques. Le registre HD est lisible en métadonnées pour qu'un lien inactif ne devienne pas un contournement de la protection.

Résultats sur les objets installés avec fixtures annulées :
- Droit valide : contenus du programme fictif accessibles, prières séparées enregistrables.
- Registre HD inactif : lecture refusée, sans retour au comportement non protégé.
- Révocation : lecture directe contents refusée et appel direct record_progress rejeté.
- Expiration : activités non lisibles et appel direct record_progress rejeté.
- Les trois états historiques restent lisibles au propriétaire après révocation.
- Rejeu, conflit d'identifiant, autre compte, futur et pause également contrôlés par la recette.

Après rollback : zéro lien/période réels, zéro programme HD_RECETTE_%, empreinte programmes f25b1fe02221365324076bb9948dda0b inchangée. La fonction de lecture rend true pour un programme non enregistré HD ; aucune activation HD ni modification production.

Les contrôles restent réservés aux programmes/version/langue présents dans hd_programme_links. Le helper concerne une période courante : la politique future d'accès aux anciens contenus payants après expiration reste à décider avant activation. Les rôles éditoriaux n'ont pas d'exception automatique au nouveau contrôle HD ; le circuit d'administration sera à vérifier avant publication de contenus.

Limites : rappels pas encore branchés au contrôle, fuseau du trigger historique encore Africa/Kinshasa, pas de navigateur ni envoi WhatsApp, pas de paiement. La vérification d'un droit n'implémente pas l'activation du mois gratuit ni le renouvellement. Module toujours inactif.

Retour additif avant utilisation : retirer hd_contents_access_guard, hd_progress_access_check, puis fonctions hd_content_allowed(text,integer,text), hd_progress_access_guard() et policy hd_registry_read. Ne pas appliquer après ajout de dépendances sans analyse. Les anciens objets restent inchangés.
