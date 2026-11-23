# Confidentialité des brouillons — préparation à la publication

Base : 107361fce86d5f69b516fc7de1af6f53ad3d9890, qui contient les expéditeurs push déjà publiés et leurs sauvegardes. Les changements F02 sont extraits de PR126 sans reprendre son ancienne base frontend.

À la déconnexion ou au changement de compte, effacement des brouillons Journal/Aide et des copies locales privées, y compris après un événement reçu d’un autre onglet. Lors d’un renouvellement de la même session, la saisie est conservée. Les notes synchronisées en base ne sont pas supprimées.

Vérification : tests ciblés, types, CI et recette Chrome FR/EN à deux onglets sur la branche. La recette utilise des comptes et notes fictifs sans accès Supabase ; elle ne constitue pas un test RLS à deux comptes réels. Aucune migration de base ni changement de droits.

Retour arrière : restaurer les cinq fichiers applicatifs depuis le commit de base. Les brouillons effacés ne peuvent pas être recréés par ce retour arrière. Les textes FR/EN signalent leur effacement à la déconnexion.
