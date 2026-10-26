# Publication des horaires d’essai dans l’aperçu

Mise à jour de /habitudes demandée par le porteur. L’éditeur public adapte les heures jour par jour, notamment les trois cultes. Il réutilise le calcul de planning validé, trie les rendez-vous et signale les heures identiques. Un bouton rétablit toutes les propositions.

Le texte indique clairement que ces essais restent seulement dans la mémoire de la page et ne sont pas enregistrés dans le compte. Pas de stockage local, RPC de sauvegarde, nouvelle inscription, droit, rappel ou paiement. Le simulateur de dîme est conservé. La sauvegarde authentifiée et le planning connecté préparés sur TEST restent sur la branche du module ; ils ne sont pas activés en production par cette publication.

Validation locale : 33 tests de page publique, planning, simulateur et offres/accès réussis ; npm run build réussi. Les nouveaux scénarios couvrent modification temporaire, maintien séparé par jour, trois heures de culte distinctes, collision, réinitialisation et effacement au démontage. Aucun contrôle visuel Safari ; les tests d’interface sont réalisés sous jsdom.
