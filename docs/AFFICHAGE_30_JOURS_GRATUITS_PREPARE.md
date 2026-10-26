# Affichage des 30 jours gratuits — préparation

Dans Mes accès, une période HD de mois 1 est reliée à son droit par entitlement_id et à son inscription par enrollment_id. Le lien ne dépend pas du champ entitlement_id de l’inscription, qui peut être vide. Les périodes sont lues sous les RLS du participant ; aucun accès n’est créé par cet écran.

La carte dédiée est réservée au drapeau VITE_HABITUDES_DEFIS=true. Elle indique 30 jours gratuits et l’échéance exacte (date, heure, fuseau du participant, avec priorité de preferences.rappels.fuseau). L’intervalle doit être fini, égal à 720 heures et correspondre exactement aux dates du droit ; sinon l’état reste à vérifier. Une révocation prime sur les dates.

La continuation n’est proposée que pour une inscription active et un droit en cours. L’expiration utilise une fin exclusive ; la carte s’actualise à l’échéance ainsi qu’au retour de focus ou de visibilité. L’affichage ne confère jamais d’autorisation : les contrôles serveur de lecture et de déclaration restent obligatoires.

Après expiration, la carte indique la fin de la gratuité et propose le journal et le contact de l’équipe. Elle n’invente ni tarif, ni durée payante, ni renouvellement. Elle précise que cette gratuité n’ouvre aucun mois payant. Aucun événement de paiement, notification, inscription ou nouveau droit n’est écrit.

Validation : 8 tests dédiés (association droit/période/inscription, fuseau, expiration exacte, page restée ouverte, retour de focus, révocation/pause, incohérence, anglais et drapeau désactivé répartis sur ces scénarios) et 11 tests existants offres/accès réussis ; TypeScript et Vite réussis. Aucun contrôle visuel Safari effectué. Module toujours en préparation, sans déploiement ni activation en production.
