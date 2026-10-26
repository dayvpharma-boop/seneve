# Jours et créneaux avant l’inscription — développement

Le formulaire d’inscription permet maintenant de modifier les jours, les heures et le nombre de créneaux avant la confirmation des 30 jours gratuits. Les cultes peuvent être placés à des jours et heures différents. Chaque habitude conserve le nombre de rendez-vous hebdomadaires fourni par le catalogue serveur. Aucun calendrier commercial ni aucune fréquence nouvelle n’est inventé.

Les détails d’une habitude contiennent la fréquence à conserver, les créneaux avec leurs jours, et les commandes d’ajout ou de retrait. Une modification décoche la confirmation finale ; le participant confirme donc le planning qu’il vient de choisir. Une demande en attente conserve ses données et verrouille ces commandes, comme précédemment.

Le contrôle de saisie `creneauxRespectentFrequence` est partagé avec les réglages après inscription. Il détecte notamment un jour manquant, un créneau vide, des identifiants répétés et deux rendez-vous identiques. Pour les repères quotidiens, deux passages le même jour ne remplacent pas un autre jour manquant. Pour les cultes, la règle existante du serveur permet deux horaires distincts le même jour mais interdit le même couple jour/heure répété. Le serveur reste l’autorité : son validateur et les RPC ne changent pas.

Validation : 36 tests ciblés réussis après ajout des cas de personnalisation (inscription, catalogue et horaires). Les cas couvrent deux cultes personnalisés, ajout d’un créneau, jour manquant, doublon de culte, doublon d’un repère quotidien, nouvelle confirmation après modification et refus de doublon depuis les réglages. Vérification TypeScript et compilation Vite réussies avec le module activé. Le transport des tests React est simulé ; la recette Auth/PostgREST précédente avait déjà confirmé l’acceptation par le serveur de deux jours et heures de culte personnalisés.

Ces changements restent sur la branche de développement. Aucune migration, inscription réelle ou publication n’est effectuée. Le blocage de la recette visuelle locale reste documenté dans `RECETTE_VISUELLE_INSCRIPTION_A_TERMINER.md` ; aucun rendu mobile ou Safari n’est déclaré validé.
