# Continuité entre connexion et préinscription — développement

Le lien de connexion depuis la préinscription ouvre le mode « Se connecter » et conserve l’intention fermée `suite=habitudes`. Après une authentification par mot de passe réussie, ou une création de compte qui fournit immédiatement une session, la page revient à `/habitudes/inscription` dans la langue choisie. Changer la langue sur la page de connexion conserve cette intention. Le retour ne confirme ni planning ni inscription : le participant relit le catalogue puis confirme lui-même ses 30 jours.

Ce comportement dépend du module activé. Une valeur arbitraire, une URL externe ou le module désactivé conservent la destination habituelle. Les retours journal et administration déjà autorisés gardent leur priorité. Aucun mécanisme générique de redirection vers une URL fournie par l’utilisateur n’est ajouté.

La route de préinscription prépare désormais le profil avec la RPC existante `ensure_participant` avant de demander le catalogue. La fonction existante a été inspectée : elle utilise uniquement auth.uid(), crée un profil si absent, conserve celui déjà présent et ne démarre pas de parcours. Le prénom proposé vient des métadonnées de la session comme dans l’espace existant. Une erreur de préparation bloque le catalogue et le formulaire. Les réponses tardives après changement de compte restent écartées. Aucune réclamation d’achat, inscription Découverte, période gratuite ou activation de rappel n’est appelée par cette préparation.

Validation : 36 tests ciblés réussis (8 nouveaux tests de retour, 13 tests catalogue/profil, 11 tests de connexion et 4 tests sociaux existants). Transport d’authentification simulé pour ces tests React. TypeScript et compilation Vite avec le module activé réussis. Recette SQL supplémentaire en rôle authenticated sur TEST : nouveau profil, répétition idempotente sans remplacement du prénom existant, lecture du catalogue ensuite possible, aucune inscription ni aucun droit créé. Transaction entièrement annulée ; vérification finale : 0 profil de cette recette, 0 période HD et 0 mapping HD conservés. Aucune migration nécessaire : les RPC existantes sont utilisées sans modification.

## Complément — confirmation e-mail et renvoi

L’inscription avec confirmation différée et le renvoi de l’e-mail utilisent maintenant le même retour fixe : `habitudes/inscription?lang=fr` ou `habitudes/inscription?lang=en`, uniquement lorsque le module est activé et que `suite=habitudes` est demandé. `siteUrl` conserve l’origine et le dossier du site. Aucune URL fournie par la requête n’est utilisée. Le module désactivé ou une intention inconnue conserve le retour existant vers `espace`.

La route de destination attend une session Supabase, puis vérifie le profil et le catalogue autorisé. Elle ne lance pas `hd_start_free` à l’ouverture. La confirmation volontaire du planning et de l’inscription reste nécessaire. Les retours journal et administration du formulaire restent inchangés.

Contrôles de ce complément : 38 tests React réussis (12 retours de connexion, 11 connexion générale, 15 catalogue), TypeScript et construction Vite avec module activé réussis. Les tests simulent le transport d’authentification : aucun e-mail réel n’est envoyé, aucun utilisateur ni droit créé. Ils vérifient les URL de création et de renvoi dans les deux langues, le refus d’une destination externe, et le comportement module désactivé.

### Prérequis avant activation sur un environnement

Ajouter et vérifier dans Supabase Auth > URL Configuration les deux adresses exactes de retour pour l’origine déployée. Pour GitHub Pages :

- `https://dayvpharma-boop.github.io/seneve/habitudes/inscription?lang=fr`
- `https://dayvpharma-boop.github.io/seneve/habitudes/inscription?lang=en`

Conserver les autres retours existants. Vérifier que le modèle d’e-mail respecte le lien de confirmation et son retour configuré. Le serveur Supabase peut remplacer une destination non autorisée par le Site URL : la seule présence du paramètre dans le client ne prouve donc pas le retour réel. Référence consultée le 26 octobre 2026 : https://supabase.com/docs/guides/auth/redirect-urls. Changelog consulté ; aucune rupture pertinente identifiée pour ces options existantes.

Ces adresses et le modèle d’e-mail n’ont pas été modifiés ni vérifiés sur TEST ou PROD dans cette étape. La recette de confirmation réelle entre deux onglets/appareils reste à effectuer sur l’environnement déployé de test, avec un compte de recette autorisé. Le retour après OAuth et la récupération de mot de passe restent à traiter séparément. La recette visuelle authentifiée conserve les limites documentées précédemment.


Ces changements sont préparés sur la branche de développement. PROD et la publication GitHub Pages restent inchangées.
