# Mon aujourd’hui et Mes horaires

Prototype isolé et réversible sur branche de travail. Ouvrir index.html dans un navigateur. Aucune route de l’application existante modifiée, aucun appel serveur, stockage local, paiement, rappel ou compte.

Données de démonstration : 13 rendez-vous quotidiens et 3 créneaux de culte, jours proposés mercredi/vendredi/dimanche. Les états sont propres à chaque date et habitude. Demander de l’aide ne valide pas l’activité. Changer les heures, rétablir les horaires et passer du français à l’anglais conserve les déclarations dans la page ouverte. L’actualisation ferme cet état temporaire.

Le bouton de réalisation reste une déclaration fictive. Tous les rendez-vous affichés entrent dans le compteur de démonstration ; la liste des activités requises/adaptées sera validée avant production. Les traductions d’interface sont des propositions à relire, sans contenu spirituel EN déclaré approuvé.

Test verify.cjs exécuté avec Node et adaptateur DOM : occurrences du dimanche/lundi, prières distinctes, aide indépendante, isolation par date, horaires et restauration sans perte de progression, FR/EN, absence de réseau/persistance. Validation visuelle navigateur non exécutée : navigateur absent et téléchargement Chromium impossible (archive tronquée). Aucun scénario HD-01 à HD-24 n’est déclaré validé par ce test de prototype.

Contrat d’intégration à préparer : lire les occurrences du jour par inscription/version/langue et fuseau ; écrire un événement avec client_event_id stable, inscription et occurrence datée ; vérifier session/droit/propriétaire côté serveur ; renvoyer état consolidé et confirmation de synchronisation ; recalculer les rappels dans la même transaction ; sauvegarder les horaires avec date d’effet sans altérer les occurrences passées. Vérifier fuseau IANA, conflits, périodes de silence et idempotence.

Encore à construire : sélection des jours réels de l’assemblée, validation des conflits d’horaires, API et persistance, état local/synchronisé, rappels, contenus Amidah autorisés, défis, bilans multi-activités, compteur privé et simulateur. Ne pas brancher les tables hd_* en brouillon sur les clients sans nouvelle analyse de conformité et contrôles.
