# Accès et présentation de la sécurité administrateur

Base de restauration : `ff264f4ff7a65d0aace9e823ac358ae57116650f` (premier écran MFA publié). La publication en production et l’essai personnel sont autorisés par Dr Justin dans la conversation.

Constat du navigateur sur `/seneve/admin/securite` : l’adresse ne redirige pas vers `/recette-hd`, mais le titre restait « Test des 7 Racines — SÉNEVÉ ». Sans session utilisable, l’écran affichait une erreur générique. Les menus d’administration ne proposaient aucun accès à la nouvelle page.

Changements : titre propre à la sécurité, invitation à se connecter lorsque la session est absente, retour autorisé précisément vers `/admin/securite` après connexion, liens réservés aux administrateurs dans les menus mobile et ordinateur. Présentation responsive avec carte de configuration et conseils, couleurs SÉNEVÉ, thème sombre selon le réglage existant, boutons et champs lisibles.

Les tests couvrent l’absence de session, le retour vers cette page après connexion et le refus d’une sous-page arbitraire, en complément des cas MFA existants. Aucune clé réelle générée et aucune obligation AAL2 serveur ajoutée. L’essai personnel et le secours restent à vérifier.

Retour arrière : restaurer les fichiers modifiés depuis le commit de base et retirer les deux nouvelles feuilles de style. Aucune migration de base.
