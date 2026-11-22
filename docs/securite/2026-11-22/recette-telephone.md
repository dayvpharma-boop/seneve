# SÉNEVÉ — Préparation du test sur téléphone, 22 novembre 2026

## État vérifié

La page publique existante `https://dayvpharma-boop.github.io/seneve/recette-hd/rappels` affiche « SÉNEVÉ — VERSION DE TEST », « Rappels d'habitudes (essai) » et le lien « Me connecter au compte de test ». Elle a été ouverte dans le navigateur. Dans cette session sans compte de test identifié, les réglages ont affiché une erreur de chargement ; aucune activation n'a été tentée.

La page reste fondée sur l'ancien commit figé du workflow GitHub Pages. Elle permet l'inscription d'un appareil pour vérifier le contrôle serveur F01, mais **elle ne contient pas le correctif F02 des brouillons**. Aucun test du journal ne doit être déclaré effectué à partir de cette page.

Dans seneve-test : zéro appareil enregistré ; envoi HD désactivé ; aucun participant pilote défini ; ouverture à tous désactivée. Ces conditions ne permettent pas encore de vérifier une réception sur téléphone. Aucune ouverture générale des envois ne sera utilisée pour contourner ce manque.

## Préparation technique

Les sources exactes et paramètres JWT des trois expéditeurs d'essai ont été conservés dans `avant-recette/`. Les paquets de `supabase/recette-securite/` ajoutent seulement le validateur de destination et de structure des clés, ainsi que le timeout manquant pour rappels/annonces. Le dispatcher HD reste celui de l'essai : ses horaires, son TTL et ses contrôles d'autorisation ne sont pas remplacés par ceux de la production.

Les trois paquets ont passé la compilation syntaxique et la résolution des imports. Le dispatcher HD d'essai modifié a été exécuté avec RPC et transport fictifs : l'adresse interdite n'atteint pas le transport, un appareil valide est accepté et un doublon n'entraîne pas de nouvel envoi. Aucun réseau dans ce scénario.

Les trois paquets sont désormais déployés **uniquement dans seneve-test** : `envoyer-rappels` v3, `envoyer-annonces` v3 et `envoyer-rappels-hd` v6. La relecture des fonctions déployées confirme que les neuf fichiers sont identiques aux paquets préparés. Les paramètres JWT restent respectivement `false`, `false`, `true`. L'envoi HD est toujours désactivé ; aucun pilote n'a été ajouté et aucun appareil n'est enregistré.

Pour revenir à la version d'essai précédente, redéployer les fichiers exacts de `avant-recette/<fonction>/` avec les paramètres de `avant-recette/versions.json`. La production n'a pas été modifiée par ces déploiements.

## Première manipulation du participant

1. Ouvrir la page d'essai sur le téléphone et vérifier le bandeau « SÉNEVÉ — VERSION DE TEST ».
2. Cliquer « Me connecter au compte de test » et utiliser un compte réservé aux essais. Ne jamais communiquer son mot de passe ou son code dans la conversation.
3. Signaler que la connexion est faite. L'identité du pilote et son éligibilité devront alors être vérifiées avant d'activer l'envoi limité à ce compte.

Sur iPhone, l'autorisation des notifications se fera ensuite depuis l'icône de **la version de test** ajoutée à l'écran d'accueil. La page rappelle cette manipulation. Sur Android, l'inscription de l'appareil se fera depuis le navigateur compatible, avec l'accord de la personne.

## Réception à vérifier après configuration du pilote

| Vérification | Attendu |
| --- | --- |
| Enregistrement de chaque téléphone | Confirmation à l'écran, puis présence de l'abonnement compatible côté serveur |
| Rappel à une heure choisie et autorisée | Acceptation fournisseur observée, puis réception confirmée par la personne sur chaque appareil |
| Application fermée, connexion disponible | Réception observée ou échec clairement consigné ; aucune simulation assimilée à une réception |
| Clic de notification d'essai | Rester dans la version de test |
| Fin de l'essai | Désactiver le pilote et conserver uniquement les preuves techniques utiles |

Le contrôle de la confidentialité des brouillons nécessite ensuite une version d'essai actualisée contenant le correctif F02 et les pages Journal/Aide : deux comptes, déconnexion, reconnexion et vérification qu'une note synchronisée reste disponible. Cette ancienne page de recette ne suffit pas.
