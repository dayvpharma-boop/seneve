# Essai de réception — 23 novembre 2026

Le téléphone du compte pilote est enregistré dans seneve-test, son abonnement est compatible avec F01 et son dernier consentement push est accordé. Les préférences Habitudes sont actives pour le canal push. Aucun identifiant personnel ni clé d'appareil n'est reproduit ici.

L'appel automatique HD était absent dans la base d'essai. Un appel temporaire a été programmé exclusivement pour le pilote existant, sans ouverture générale : tâche seneve-hd-essai-securite, fenêtre du 23 novembre 2026 de 12 h 30 à 12 h 35 Africa/Kinshasa (11 h 30–11 h 35 UTC). Les rappels ont été préparés avec la fonction existante, sans modifier les horaires ou la réalisation des habitudes.

La requête vers l'Edge Function conserve verify_jwt=true et utilise le JWT anon public du même projet, ainsi que la clé d'appel privée lue côté base uniquement. Aucun secret de service n'a été extrait. Les contrôles d'autorisation, droits, consentement et idempotence du dispatcher restent appliqués.

À 12 h 35, la commande est prévue pour désactiver l'envoi HD du pilote et se retirer de cron. Cette fermeture est programmée, pas encore observée. Le contrôle de réception du participant et la vérification effective du retrait restent à faire. La production n'a pas été modifiée.

État à cette étape : programmation vérifiée, aucune preuve d'acceptation fournisseur ou de réception. Un rappel lié à une activité déjà réalisée ou ignorée doit rester annulé.
