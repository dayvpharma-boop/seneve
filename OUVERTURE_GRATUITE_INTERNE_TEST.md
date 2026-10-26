# Ouverture interne des 30 jours gratuits — TEST
25 octobre 2026. Branche feat/habitudes-defis-socle.
Fonction seneve.hd_open_free_period(uuid,text), installée uniquement sur seneve-test (rlojnuaajeubzlwofwhn).

## Périmètre
Service interne réservé à service_role, SECURITY INVOKER, search_path vide.
Il ouvre le droit gratuit d'une inscription HD déjà existante. Il ne crée pas cette inscription et ne constitue pas encore un bouton public d'inscription.
Le démarrage de la Découverte a été inspecté ; son mécanisme et ses identifiants restent inchangés.
Les tables existantes enrollments, offers et entitlements sont réutilisées, avec hd_access_periods.

Conditions : inscription active, programme/version/langue enregistrés dans le registre HD actif,
version publiée ou archivée, configuration de gratuité à 30 jours, fuseau valide,
début de l'inscription correspondant au jour local de l'ouverture.
L'offre doit être explicitement configurée : type habitudes_defis_gratuit, prix 0,
durée 30 jours, programme et langue concordants, active, sans produit Chariow ni lien d'achat.
Aucune offre ni liaison réelle n'a été créée ou activée par cette étape.

Durée opérationnelle préparée : 30 × 24 heures à partir de l'instant serveur d'ouverture,
avec fin exclusive. Le calendrier pédagogique reste une dimension distincte.
Le droit et sa période sont créés dans la même transaction, sans événement de paiement ajouté par la fonction.
Un verrou par participant et l'index gratuit unique empêchent une deuxième allocation.
Un réessai de la même inscription retrouve le même droit et la même fin, sans prolongation.
Une autre inscription de la même personne ne reçoit pas une seconde gratuité.
Un droit révoqué n'est jamais réactivé par un réessai.
Le retour d'une période existante ne vaut pas une nouvelle autorisation d'accès : les contrôles courants de droit restent nécessaires.

## Vérification exécutée
Recette supabase/tests/habitudes_ouvrir_gratuite.sql sur les objets installés, avec rôle service_role et rollback :
- offre non explicitement gratuite refusée ;
- création valide de 30 jours exactement ;
- même appel rejoué : un seul droit, une seule période, même fin ;
- autre inscription d'un participant ayant déjà utilisé la gratuité : refus ;
- droit révoqué : aucune réactivation ;
- début futur refusé ;
- appel authentifié direct refusé ;
- nombre d'événements de paiement inchangé.
La fixture de seconde inscription respecte l'index existant interdisant deux inscriptions actives du même programme.
Une permission SELECT serveur sur le référentiel brouillon a été explicitement ajoutée, sans SECURITY DEFINER.
Aucun accès anon ou authenticated à la nouvelle fonction ; accès service_role vérifié.
Zéro fixture et zéro période/liaison HD après rollback.
Aucune nouvelle alerte de sécurité sur la fonction ; avertissements préexistants inchangés.

## Limites
Les appels simultanés du nouveau service n'ont pas encore été exercés avec deux sessions concurrentes ; verrou et contrainte sont présents, mais cette recette complémentaire reste nécessaire avant activation.
Le futur serveur d'inscription devra dériver le participant de la session et vérifier la propriété de l'inscription avant d'appeler ce service interne.
Le client ne reçoit jamais de clé service_role.
Le produit, le prix et le renouvellement des mois payants restent ouverts.
Aucun déploiement de frontend, paiement, expéditeur ou activation réelle.

## Retour
Après contrôle des dépendances : supprimer seneve.hd_open_free_period(uuid,text).
Réévaluer les GRANT INSERT sur hd_access_periods et SELECT sur hd_modules avant toute révocation, car d'autres services peuvent ensuite les utiliser.
Aucun droit réel à supprimer dans cette recette : les données fictives ont été annulées.
