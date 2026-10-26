# Offre technique de préinscription HD — TEST uniquement

Le 26 octobre 2026, après préparation du parcours Auth et accord du porteur pour poursuivre, une offre technique française a été ouverte sur seneve-test (`rlojnuaajeubzlwofwhn`). Identifiants réservés : programme `HD_RECETTE_INSCRIPTION_FR_20261026`, offre `HD_RECETTE_INSCRIPTION_FR_20261026_30J`, version 1.

Objet : vérifier l’affichage du formulaire et l’inscription volontaire de 30 jours. Nom visible : « ESSAI TECHNIQUE — Habitudes & Défis ». Prix 0, durée d’accès 30 jours, quota coach 0, aucun produit Chariow ni lien d’achat. Ce catalogue n’est pas l’offre commerciale finale : la durée du programme technique est de 30 jours uniquement, les conditions et contenus des mois payants ne sont pas configurés. Le module éditorial conserve son statut brouillon ; aucun contenu de prière, traduction intégrale, activité pédagogique ou défi non approuvé n’est publié par cette ouverture.

L’offre réutilise les 15 modèles FR et leurs horaires proposés présents dans TEST. L’anglais ne reçoit pas d’offre dans cette étape, car ses modèles serveur n’existent pas encore. Les comptes TEST authentifiés éligibles peuvent voir cette offre technique ; l’ouverture n’est pas limitée à une adresse e-mail. La séparation d’environnement est visible dans le bandeau permanent de la version `/seneve/recette-hd/`.

Vérification préalable entièrement annulée : utilisateur et profil fictifs, catalogue complet, refus sans confirmation, démarrage volontaire accepté, fin exactement 720 heures après début, 15 horaires et 15 têtes de révision, aucun enrollment éligible au coach, nouvelle gratuité non reproposée. Après rollback : aucun profil fictif ni période de cette recette conservé.

Ouverture réelle : création du programme, de sa version technique, de son mapping et de l’offre seulement. Le catalogue a été vérifié sous le rôle authenticated pour le compte de recette autorisé. Résultat à la fin : 1 offre gratuite ouverte, 0 inscription du programme, 0 période HD, 0 profil fictif conservé. La confirmation dans le navigateur du porteur est encore nécessaire pour démarrer ses 30 jours TEST.

Scripts :

- `scripts/recette/habitudes-offre-test.sql` : ouverture à usage unique, refus si l’identifiant existe déjà ; ne pas rejouer pour remplacer un catalogue.
- `scripts/recette/habitudes-offre-test-verification.sql` : vérification autonome avant ouverture, terminée par rollback ; elle suppose que les identifiants ne sont pas déjà présents.
- `scripts/recette/habitudes-fermer-offre-test.sql` : fermeture réversible, sans supprimer les inscriptions ou l’historique.

Aucun changement PROD, aucun paiement ou e-mail déclenché. Les envois de rappels demeurent non opérationnels. La version isolée permet la connexion et la préinscription, pas encore le suivi complet des journées. Une inscription TEST consommera l’essai unique de ce compte dans TEST ; aucune suppression d’historique ou remise à zéro automatique n’est prévue.
