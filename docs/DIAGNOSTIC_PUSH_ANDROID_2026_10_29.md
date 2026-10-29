# Diagnostic des envois par fournisseur — 29 octobre 2026

Le compte rendu global HD indiquait accepte dès qu'un appareil acceptait le rappel. Il ne permettait pas de distinguer un refus Google d'une réussite Apple.

L'expéditeur émet désormais une trace structurée hd_push_appareil pour chaque transport effectivement tenté : request_id interne, fournisseur (google/apple/mozilla), résultat accepte_fournisseur ou echec, statut HTTP entier 100–599 si disponible. Un timeout reste sans statut. Aucun endpoint, clé, contenu de rappel, réponse fournisseur brute ou participant n'est copié.

Une panne de trace ne modifie ni le résultat ni la clôture et ne provoque aucun nouvel essai. Les règles d'envoi, de consentement, la fréquence et le TTL restent inchangés. Une acceptation fournisseur ne prouve jamais l'affichage sur le téléphone.

Validation : 11 tests Vitest (expéditeur et diagnostic), dont Apple accepté / Google refusé, déduplication, trace indisponible et assainissement d'erreurs. Déploiement TEST préalable. Le diagnostic réel Android nécessite un prochain envoi planifié ; aucun envoi supplémentaire n'est lancé pour cette livraison.
