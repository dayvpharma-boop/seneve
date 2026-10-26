# Historique et bilans — recette HD

Ajout d’un bouton « Voir mon historique et mes bilans » sous les activités du jour. Le chargement est volontaire : aucun téléchargement de l’historique lorsque le bloc reste fermé.

La lecture est limitée au participant et à l’inscription de recette contrôlés, à la version 1 FR, aux journées déjà ouvertes (30 maximum). Les créneaux applicables à chaque date sont recalculés avec les périodes de validité des horaires personnels. Les jours futurs sont exclus, les jours manquants ou les correspondances ambiguës provoquent un échec visible plutôt qu’un bilan supposé.

L’assemblage des journées est partagé avec l’écran de déclaration : mêmes activités effectivement publiées, mêmes créneaux de cultes, mêmes états serveur. Les bilans hebdomadaires existants regroupent les jours 1–7, 8–14, etc. Ils distinguent réalisé, partiel et préparé ; seuls les états confirmés comptent. Les journées se déplient en lecture seule. Une déclaration confirmée actualise le bilan ouvert. Un changement de participant ou de date retire immédiatement l’ancien affichage, et les réponses tardives sont ignorées.

Cette étape réutilise les règles par ligne et les API existantes. Elle n’ajoute aucune écriture, table, migration ou permission. Aucun journal non disponible dans la recette n’est proposé. L’historique de cette interface reste soumis à l’accès actif, comme hd_schedule_settings ; la consultation après expiration sera une étape distincte. Aucun historique n’est supprimé.

Tests : chargement volontaire, états partiels distincts, actualisation après confirmation, échec et reprise, retrait au changement de participant, exclusion du futur et conservation des horaires historiques. Vérification TypeScript réussie. La vérification authentifiée sur téléphone reste à effectuer après publication.

Retour arrière : rétablir uniquement les fichiers d’interface et de lecture de cette étape ; garder le catalogue et la garde des cultes précédemment déployés. Aucune donnée à annuler.
