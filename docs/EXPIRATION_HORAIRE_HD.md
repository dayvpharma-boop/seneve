# Fin de période Habitudes & Défis à l'heure exacte

Correction du 27 octobre 2026. Le calendrier commun à Espace et Progrès comparait seulement les dates civiles. Une période de 720 heures finissant à 21h42 pouvait rester affichée en cours jusqu'au prochain minuit, bien que son accès serveur ait expiré.

Le statut finished tient désormais compte de fin_exclue de la dernière période, à la milliseconde près. Les dates de Continuité et Habitudes restent alignées ; aucune durée ou période n'est modifiée. Les jours consultables de l'historique sont conservés. Une période suivante déjà achetée maintient la borne de fin du parcours.

Les tests vérifient l'instant juste avant la fin, la fin exacte, une transition vers le mois suivant et six périodes consécutives de 720 heures. Ces six périodes couvrent 180 fois 24 heures mais peuvent toucher 181 dates civiles lorsque le démarrage se fait en cours de journée : les 181 journées techniques ne constituent donc pas à elles seules une erreur de durée.

Validation : tests ciblés du calendrier, des périodes, de la reprise, des accès, d'Espace et de Progrès réussis ; construction Vite réussie. Exécution Windows avec copie temporaire de vite.config.ts et configLoader runner ; cette copie ne fait pas partie du correctif. tsc --noEmit signale cinq diagnostics dans habitudes-lecture.ts, progres.tsx et decouverte-automatique.test.tsx, hors des fichiers modifiés ; le contrôle TypeScript global ne passe pas. Aucun essai navigateur authentifié n'est revendiqué.

Portée : correction du statut calculé au moment du rendu/chargement. Ce changement n'ajoute pas de rafraîchissement automatique aux écrans déjà ouverts. Aucune migration, écriture en base, modification des achats ou ouverture d'inscription.
