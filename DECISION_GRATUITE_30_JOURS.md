# Décision de Dr Justin — 30 jours gratuits
25 octobre 2026.

Message explicite : « 30 jours gratuit ».
La phase gratuite initiale d'Habitudes & Défis dure 30 jours.
Cette décision est enregistrée dans le référentiel brouillon de TEST, pour la version 1, champ duree_gratuite_jours=30.
La règle regle_mois reste distincte et non définie pour les périodes payantes : la réponse ne précise pas leur durée.
Le prix, le renouvellement et les modalités des cinq mois payants restent non validés.

Migration : supabase/propositions/habitudes_gratuite_30_jours.sql.
Elle ne crée aucun droit, inscription, paiement ou activation ; elle fixe la configuration éditoriale/technique de la période gratuite.
La construction du parcours d'inscription et de création du droit devra appliquer les 30 jours à partir du début convenu,
dans le fuseau participant, et vérifier les bornes exactes en recette.
TEST uniquement (rlojnuaajeubzlwofwhn), production inchangée.

Retour de cette migration seule : après contrôle des dépendances, supprimer la colonne duree_gratuite_jours de hd_modules.
La décision écrite reste conservée et ne doit pas être confondue avec une allocation de droit effective.
