# Socle Habitudes & Défis — 25 octobre 2026

Installé uniquement sur seneve-test (rlojnuaajeubzlwofwhn), migration habitudes_defis_socle_brouillon.
Aucun déploiement production ni modification frontend.

## Périmètre

Quatre nouvelles tables hd_modules, hd_habit_templates, hd_habit_schedules et hd_period_plans.
Un module français en brouillon, 15 modèles (13 rendez-vous quotidiens et 2 modèles de culte couvrant 3 jours par semaine).
Six mois dont un gratuit, règle mensuelle non définie.
Les tables de plans ne créent aucun droit ; aucune inscription et aucun horaire individuel créés.
Aucune traduction anglaise, prière reproduite, donnée intime, notification ou paiement.
RLS activée partout ; aucun accès client aux brouillons ni écriture client.
Lecture des horaires réservée au propriétaire via participants.auth_user_id.

## Vérification

Script supabase/tests/habitudes_defis_socle.sql exécuté avec succès et rollback.
Vérifications : nombre de modèles, trois prières, brouillon, RLS, absence de permissions client excessives, refus des durées et jours invalides.
Avant/après : 2 inscriptions, 0 droits ; empreinte des programmes f25b1fe02221365324076bb9948dda0b identique.
Le contrôle d'isolation entre deux utilisateurs avec horaires réels reste à réaliser avant ouverture de l'API.
Le linter signale trois nouvelles tables sans policy : volontairement fermées en brouillon.
Alertes globales de test : extension pg_net dans public et protection des mots de passe compromis désactivée.
Références :
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Préservation et retour arrière

Migration additive sauvegardée sur cette branche avant exécution ; aucune table antérieure modifiée.
Les compteurs et empreintes ci-dessus ne constituent pas une sauvegarde complète de la base.
Pour retirer ce socle de test : vérifier d'abord absence de schedules et period_plans et de dépendances ajoutées.
Puis supprimer explicitement, sans CASCADE, hd_period_plans, hd_habit_schedules, hd_habit_templates, hd_modules dans cet ordre.
Ne jamais exécuter ce retrait après utilisation sans export et analyse des dépendances.

## Suite

Décider mois calendaire ou 30 jours et règles commerciales avant activation.
Construire API : fuseau IANA valide, vérification propriétaire/droits/version, horaires sans chevauchements, progression datée et idempotente, outbox et rappels.
Relier les périodes aux droits existants après vérification de leurs règles, sans détourner l'offre Continuité.
Définir les défis et bilans puis valider les textes, traductions et droits Amidah.
Construire l'écran et réaliser les tests HD-01 à HD-24. Le socle n'est pas un module opérationnel.
