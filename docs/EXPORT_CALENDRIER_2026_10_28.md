# Export des rappels vers le calendrier — 28 octobre 2026

Dans Habitudes → Aujourd’hui, « Ajouter mes rappels au calendrier » exporte les rendez-vous sélectionnés des sept dates civiles commençant aujourd’hui, aux horaires réels de « Mes repères horaires ». Les horaires passés sont écartés. Les changements personnels datés et les jours des cultes sont fournis par le moteur de planning existant.

Le fichier ICS est produit localement. Il contient des événements UTC privés, chacun avec une alerte à l’heure prévue. Aucune activité n’est déclarée, aucune donnée n’est écrite dans Supabase et aucun calendrier n’est modifié automatiquement. Les identifiants d’inscription sont hachés pour les UID et ne sont pas exposés. Les données du compteur privé et du journal sont exclues. Les heures civiles ambiguës/inexistantes lors d’un changement d’heure bloquent l’export au lieu de décaler silencieusement un rendez-vous.

L’utilisateur doit importer le fichier puis vérifier les alertes et les autorisations du calendrier. Les alertes hors Internet relèvent ensuite de l’application calendrier et du téléphone. Leur déclenchement hors ligne reste à tester sur les appareils réels : la génération du fichier ne confirme ni son importation ni la réception d’une alerte.

iPhone : ouvrir dans Calendrier si proposé, sinon ouvrir depuis Mail ou importer avec Calendrier sur Mac puis synchroniser. Android : importer avec un calendrier compatible ; pour Google Agenda, importer sur ordinateur dans Paramètres → Importer et exporter puis synchroniser le téléphone.
- Apple : https://support.apple.com/guide/iphone/set-up-mail-contacts-and-calendar-accounts-ipha0d932e96/ios
- Google : https://support.google.com/calendar/answer/37118?hl=fr
- Format : https://www.rfc-editor.org/rfc/rfc5545.html

Copie ponctuelle, sans synchronisation : les modifications/arrêts des rappels dans SÉNEVÉ n’effacent pas les copies. Un calendrier dédié et le retrait de l’ancien export sont conseillés avant la réimportation d’une période identique. Les UID sont stables, mais tous les importeurs ne garantissent pas la déduplication.

Validation locale : TypeScript sans erreur ; 25 tests ciblés réussis (format ICS, fuseaux et changements d’heure, respect du planning personnel, sélection, chargement différé, reprise réseau, changement de compte, et absence de régression des lectures/cultes). Aperçu navigateur : fichier réellement téléchargé, confirmation limitée à sa génération ; aucun import dans un calendrier réel.
