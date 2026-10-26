# Droits mensuels — installation de test

25 octobre 2026. Migration habitudes_droits_mensuels_inactifs installée uniquement sur seneve-test. Source enregistrée sur la branche avant exécution. Changement additif : deux nouvelles tables, deux fonctions et un déclencheur ; aucune fonction, politique ou ligne existante remplacée.

hd_programme_links relie programme/version/langue au module. hd_access_periods relie inscription/participant/mois à un droit entitlements existant et à une période explicite. Aucun lien et aucune période réels créés. Premier mois gratuit unique par participant ; aucun autre mois gratuit. À ce stade les mois 2 à 6 ne reconnaissent que l’origine achat avec payment_event_id ; abonnement, manuel et place financée restent volontairement non activés tant que leurs règles ne sont pas arrêtées.

hd_has_current_right est SECURITY INVOKER, lecture uniquement, execute accordé à authenticated et retiré de PUBLIC/anon. La propriété, inscription active, mapping actif, version publiée/archivée, langue, offre et limites du droit sont contrôlés. Aucun changement de la définition du mois.

Cohérence des périodes : droit et inscription du même participant, même programme/langue, période comprise dans le droit, origine appropriée et absence de chevauchement vérifiée sous verrou transactionnel. Aucune écriture client accordée sur les deux tables.

Essais effectués avant installation dans une transaction annulée, puis sur la fonction installée avec fixtures annulées : droit gratuit reconnu, autre compte refusé, révocation/expiration refusées, création client de période interdite. Recette record_progress indépendante également réexécutée dans ce contexte. Aucun envoi ou paiement.

État avant/après : empreinte programmes f25b1fe02221365324076bb9948dda0b inchangée ; horaires et anciens plans vides. Après installation : nouveaux liens/périodes vides et accès sans session false. Linter : pas de nouvel avertissement relatif aux nouveaux objets ; les avertissements existants pg_net/public et protection mots de passe restent présents.

IMPORTANT : le contrôle est installé mais pas encore imposé à record_progress ni aux politiques de lecture contents. Tant que ces chemins et rappels ne l'appellent pas, il ne protège pas à lui seul une activation réelle. Module toujours inactif, aucune nouvelle inscription. Aucune modification production.

Retour de cette extension avant utilisation : vérifier absence de lignes et dépendances, retirer la fonction hd_has_current_right(uuid), le déclencheur hd_access_period_check, la fonction hd_validate_access_period(), puis les deux tables dans cet ordre, sans CASCADE. Ne pas exécuter ce retrait après usage sans export et nouvelle analyse. La sauvegarde complète/restauration reste requise avant déploiement public ; aucun export complet de la base n'est revendiqué ici.

Remédiations des avertissements existants :
- https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
