# Semaine type avant confirmation — développement

Le formulaire propose désormais « Vérifier ma semaine avant de confirmer ». Le récapitulatif est replié par défaut ; chaque journée est également repliable, conformément au principe du cahier Design de garder le détail secondaire discret. Il affiche les choix en cours, triés par heure, pour les sept jours de la semaine et indique le fuseau du compte. Aucune date de début ou de fin n’est calculée à ce stade : il s’agit d’une semaine type, pas d’un droit d’accès déjà ouvert.

Des rendez-vous exactement à la même heure sont signalés sans déplacement automatique ni interdiction de confirmer. L’interface n’infère pas de chevauchement à partir de durées non configurées. Si les jours ou créneaux d’une habitude ne respectent pas encore la fréquence attendue, le récapitulatif invite à terminer la saisie et n’affiche pas une semaine partielle comme complète.

Le composant lit uniquement le planning en mémoire du formulaire. Modifier une heure met immédiatement le récapitulatif à jour et conserve l’exigence de nouvelle confirmation. Ouvrir ou lire la semaine ne crée aucune inscription, ne valide aucune activité, n’enregistre aucun horaire et ne déclenche aucun rappel ou appel réseau.

Validation : 5 nouveaux tests fonctionnels du récapitulatif (répartition et tri, heure identique, planning incomplet, anglais/fuseau, changement dans le formulaire sans RPC), puis régression inscription et catalogue : 33 tests réussis. Vérification TypeScript et compilation Vite réussies avec le module activé. La recette utilise React/DOM et le transport simulé ; aucune nouvelle validation visuelle mobile ou Safari n’est revendiquée, le blocage du navigateur local restant documenté.

Le composant et sa feuille de style sont sauvegardés sur la branche de développement. Aucun changement en base ou sur le site public n’est effectué. Les conditions d’ouverture réelle et la validation du corpus restent nécessaires.
