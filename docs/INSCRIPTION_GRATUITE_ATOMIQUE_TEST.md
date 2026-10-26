# Inscription gratuite atomique — TEST

Installée sur seneve-test le 26 octobre 2026, en trois migrations : habitudes_validation_partagee_horaires, habitudes_reutiliser_validation_horaires, habitudes_demarrage_gratuit_atomique. L’appel groupé initial avait échoué côté transport avec Invalid or expired requestState ; les trois étapes séparées ont ensuite réussi. Le fichier groupé est conservé pour la lecture, les trois fichiers séparés correspondent aux installations effectuées.

## Comportement

hd_start_free est une façade invoker vers une fonction privée definer avec search_path vide. Le compte doit être connecté, son profil présent et p_confirmation=true. Aucun participant_id n’est accepté en paramètre : le propriétaire est toujours déduit du compte.

Pour un nouveau départ, la fonction exige une correspondance HD active, une version de programme publiée, la règle gratuite de 30 jours et une offre explicitement gratuite conforme (prix 0, durée 30, sans lien d’achat ni produit de paiement). Le calendrier nominal provient de programmes.duree_jours ; aucune durée de mois payant n’est déduite. La date de début est aujourd’hui dans le fuseau canonique du participant. Le démarrage différé n’est pas implémenté.

Un planning initial complet et choisi est exigé. La validation des créneaux est partagée avec la sauvegarde des réglages ; celle-ci conserve son fonctionnement au lendemain. Les horaires initiaux commencent aujourd’hui car aucune journée antérieure de cette nouvelle inscription n’existe. Un planning préexistant dans le même module/version/langue est refusé plutôt qu’écrasé.

La fonction crée ensemble inscription, droit gratuit de 720 heures, période du mois 1, créneaux et révisions. Elle rattache le droit à l’inscription. Toute exception annule l’ensemble de l’appel.

Une période gratuite déjà utilisée pour ce participant ne peut pas être créée une seconde fois. Pour le même programme/version/langue/offre, une nouvelle demande renvoie les identifiants et dates existants, sans appliquer les nouveaux horaires ni modifier une pause ou révocation. L’interface future devra respecter horaires_appliques=false. Un autre contexte renvoie gratuite_deja_utilisee. Aucun redémarrage automatique.

Les consentements, paiements, rappels et déclarations d’activités ne sont pas modifiés. Aucune autorisation WhatsApp ou d’envoi n’est implicite.

## Vérifications réelles

La recette SQL transactionnelle a réussi sur TEST sous les rôles authenticated. Elle vérifie : confirmation absente, programme archivé, offre non configurée, planning incomplet, ouverture valide, durée exacte 720 heures, calendrier nominal configuré, 16 créneaux initiaux dont deux heures de culte différentes, rejeu, seconde gratuité refusée, pause et révocation préservées.

Une contrainte temporaire force une erreur après création du droit pour un deuxième compte fictif : aucune inscription, aucun droit, horaire ou révision de ce compte ne subsiste. C’est un contrôle effectif de l’atomicité, entièrement annulé par rollback. La version publiée et sa validation dans cette recette sont des fixtures explicitement fictives ; aucun contenu n’est approuvé réellement.

Les compteurs de paiement, progression et rappels restent identiques. La recette précédente de sauvegarde des horaires a aussi été rejouée avec succès après extraction de la validation commune.

Après rollback : zéro période HD, zéro horaire, zéro révision, zéro correspondance et zéro programme fictif conservés. EXECUTE anon=false et authenticated=true sur la façade, avec contrôle propriétaire dans la fonction. Les deux WARN advisors existants restent [pg_net public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) et [mots de passe divulgués](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ; aucune nouvelle alerte WARN sur ces fonctions.

## Limites avant ouverture publique

Aucun bouton d’inscription n’est raccordé dans l’aperçu public. Il reste à fournir la lecture sécurisée du catalogue et des modèles avant inscription, l’écran d’inscription, les états d’erreur/reprise et la validation de bout en bout avec authentification réelle. Le verrouillage concurrent est présent mais un véritable test simultané reste à effectuer ; une recette séquentielle ne prouve pas ce point.

Le programme et l’offre réels, leur périmètre gratuit, leurs contenus officiels et leurs conditions doivent être validés et publiés avant activation. Les droits de reproduction de l’Amidah, les décisions de mois payants et le compteur privé ne sont pas résolus par cette fonction. Le script de retour des fonctions est préparé mais n’a pas été exécuté dans cette étape ; il n’efface aucune donnée.

Production inchangée. Aucune inscription réelle créée. Code sur feat/habitudes-defis-socle.
