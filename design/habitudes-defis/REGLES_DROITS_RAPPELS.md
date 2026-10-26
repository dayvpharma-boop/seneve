# Règles candidates de droits et rappels

src/lib/habitudes-controles.ts est un module de règles destiné au service serveur futur. Il n'est branché à aucune route ni RPC et ne sécurise donc pas encore la production.

Les droits sont des périodes explicites [debut, fin_exclue[ avec fuseau explicite et preuve gratuit_valide ou paiement_verifie. Aucun prix, renouvellement, début automatique ni durée de mois ne sont inventés. Propriétaire, inscription, programme, version et langue doivent correspondre. Absence, révocation, expiration, période invalide ou preuve inconnue : refus.

Un rappel ne peut être envisagé qu'avec droit actif, consentement, liaison de canal vérifiée, créneau actuel et absence de silence. L'état utilisé est l'état réellement consolidé par le serveur pour cette occurrence. Préparée ou partielle ne valent pas réalisée. Une réalisation bloque le rappel de sa seule occurrence. Une acceptation fournisseur exclut un réenvoi de cette communication. Les clés incluent inscription, programme/version/langue, date, occurrence, canal et créneau canonique UTC.

10 tests supplémentaires, 29 tests locaux au total, tous réussis. Aucun envoi, achat, nouvelle inscription ou modification Supabase. Tests de règles pures et transport simulé, pas de test bout en bout.

IMPORTANT : le service doit charger lui-même les droits, consentements et états dans la base. Ne jamais faire confiance aux preuves/booleans reçus du navigateur. La concurrence, les réservations transactionnelles, l'unicité SQL, les heures de silence, la résolution du fuseau et la politique anti-rafale nécessitent encore une intégration serveur et des tests propres. Le module pur ne garantit ni déduplication transactionnelle ni délivrance réelle.

Avant intégration : vérifier les dépendances n8n, restaurer une sauvegarde isolée, préparer les migrations et les tests HD-01/02/03/04/15/16/17/18. Les tables hd_* en test restent en brouillon. Le choix 30 jours/calendaire reste non validé.
