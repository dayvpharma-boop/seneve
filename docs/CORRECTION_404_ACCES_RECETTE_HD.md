# Correction du retour après inscription dans la recette HD

Le 26 octobre 2026, le porteur a transmis une capture d’une page 404 après l’inscription. Le serveur confirme que l’inscription TEST est active, que la période dure exactement 720 heures et que les 15 horaires sont enregistrés. Aucune nouvelle inscription n’est créée par le correctif.

Cause : le composant d’inscription ouvre `BASE_URL + acces` par un lien HTML normal. La version isolée ne montait pas la route `/acces` et ne générait pas `acces.html`. GitHub Pages retournait alors le 404 du site principal. Le lien n’était donc pas exploitable après un chargement complet, même si l’inscription avait réussi.

Correction : route de consultation dédiée `AccesRecetteHabitudes` dans le routeur TEST et page fixe `dist-recette-hd/acces.html`. Les autres routes du site public ne sont pas importées. La page lit les droits via le chargeur existant protégé par RLS, filtre le programme technique, associe strictement inscription/droit/période, refuse une date incohérente et affiche les états actif, expiré, fermé, pause ou à vérifier. Une déconnexion retire les anciennes données. La date suit le fuseau du compte. Aucune fonction de création d’accès, reprise, remise à zéro, paiement ou coach n’est appelée. Le suivi quotidien reste hors périmètre de cette version.

Validation locale : 6 tests de la page d’accès et 15 tests d’inscription réussis ; TypeScript et construction TEST réussis. Vérification de la présence de `acces.html` avec les assets sous la base isolée. Le workflow doit construire depuis le commit exact et vérifier la navigation directe après publication. Cette lecture ne modifie pas la date de début ou de fin existante.


Publication vérifiée : le déploiement `b26bc286ceb9070207d96bc5c38b6c8334c58d5a` a réussi et construit la recette depuis `bedd7e472077807f032f06ccffab10f5890d1f68`. Le navigateur ouvert directement sur `/seneve/recette-hd/acces?lang=fr` affiche « Mes accès de test » et une demande de connexion pour sa session anonyme, au lieu du 404 principal. La consultation sous session réelle du porteur reste à confirmer dans son navigateur. La lecture serveur après publication confirme une seule inscription active avec les dates de début et de fin initiales conservées.
