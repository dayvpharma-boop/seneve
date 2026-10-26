# Vérification du passage gratuit vers Continuité

Essais effectués exclusivement sur seneve-test, dans une transaction annulée par ROLLBACK. Deux participants fictifs, aucun compte réel utilisé, aucun paiement Chariow ni appel de fournisseur IA.

Le lien du programme réel est volontairement inactif dans TEST ; il a été activé seulement à l’intérieur de la transaction, invisible aux autres sessions, puis annulé. Son état final est toujours inactif. Le lien de production a été lu et est actif ; aucune écriture en production.

Cas réussis :
- Paiement pendant le gratuit : le mois 2 commence à la fin du mois gratuit et dure exactement 720 heures ; le coach HD reste exclu pendant le gratuit.
- Paiement après la fin du gratuit : le mois 2 commence immédiatement, avec 720 heures complètes et coach éligible.
- Dates du droit Continuité alignées avec le mois HD ouvert.
- Rejeu du même événement : résultat déjà ouvert, une seule période pour ce paiement.
- Droit révoqué ou expiré : accès HD et éligibilité coach fermés.

L’essai passe par la fonction interne _ouvrir_acces avec des métadonnées de paiement fictives conformes. Il ne valide pas la réception d’un webhook Chariow, sa signature cryptographique, un remboursement par le fournisseur, l’appel effectif au modèle IA ni tout le parcours de paiement sur téléphone.

Vérification après rollback : zéro participant fictif conservé et état du lien TEST restauré. Aucun changement fonctionnel ou déploiement de site n’a été nécessaire.

Référence du code main inspecté : 4674ffd8e8b9385d6f41eab5efc9752fe89df61a.
