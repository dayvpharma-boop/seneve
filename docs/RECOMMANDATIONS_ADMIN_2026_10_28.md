# Livres et prédications — administration du 28 octobre 2026

Dans Administration > Contenus > Livres et prédications, l’administrateur peut ajouter un livre ou une prédication, modifier sa fiche, enregistrer en brouillon, publier après validation explicite du contenu et du lien, ou retirer de l’affichage. La fiche retirée reste dans l’administration.

Champs : titre, auteur/prédicateur, catégorie (lecture professionnelle, développement personnel, prédication), langue, lien HTTPS, accès gratuit/payant/à vérifier et présentation facultative.

Les participants trouvent les fiches publiées dans Ma journée > Lectures du jour > Livres et prédications conseillés. La langue du catalogue suit celle de l’écran. Les liens s’ouvrent sur le site d’origine ; aucun média n’est recopié et aucun clic ne déclare une activité ni une durée.

## Vérification

- 33 tests ciblés réussis : administration, ajout/brouillon/modification/publication/retrait, reprise d’un enregistrement réseau, lien, catalogue participant et lectures existantes.
- TypeScript réussi ; aperçu construit et formulaire vérifié visuellement avec données fictives.
- Migration installée dans TEST et PROD.
- Recette SQL transactionnelle réussie dans les deux environnements : droits administrateur, refus participant, RLS des brouillons et retraits, langues, validation avant publication, modification, doublon, conflit, URL dangereuse et absence de session. ROLLBACK des données fictives.
- Aucun livre ou prédication réel ajouté : le catalogue attend les choix de l’administrateur.

## Accès et limites

Le serveur vérifie le rôle administrateur ; les clients ne disposent d’aucun droit direct d’écriture sur le catalogue. Les participants connectés ne lisent que les fiches publiées. Les enregistrements utilisent un identifiant de reprise et une révision pour éviter doublons et écrasement concurrent. Les requêtes en attente sont isolées par compte dans l’onglet et nettoyées à la déconnexion.

Les liens autorisés utilisent HTTPS et ne contiennent pas d’identifiants. Le contrôle technique du format ne remplace pas la vérification éditoriale de la destination par l’administrateur. Pas d’achat, téléchargement automatique ou lecture automatique.

Migration : supabase/propositions/habitudes_recommandations.sql.
Recette : supabase/tests/habitudes_recommandations.sql.
Documentation des règles d’accès : https://supabase.com/docs/guides/database/postgres/row-level-security
