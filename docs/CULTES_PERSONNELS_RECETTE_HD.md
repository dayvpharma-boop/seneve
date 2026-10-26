# Cultes personnels — recette HD

Le cahier complémentaire fixe trois participations par semaine, avec jours et horaires réels de l’assemblée renseignés par le participant. Cette étape ajoute leur déclaration volontaire au programme technique FR déjà ouvert dans seneve-test.

Chaque journée possède trois identifiants possibles : deux pour les cultes en semaine et un pour le culte du dimanche. L’interface n’affiche que les rendez-vous réellement prévus ce jour dans le planning personnel. Deux créneaux d’un même jour sont classés par heure puis identifiant de créneau, et gardent deux activités distinctes. Les modifications d’horaires existantes prennent effet le lendemain, protégeant la correspondance des déclarations du jour.

Le bilan du jour inclut uniquement les activités affichées, et seulement les états confirmés par le serveur. Aucun culte n’est validé à l’ouverture d’un écran. Les préparations et réalisations partielles restent distinctes des participations réalisées. La participation à distance n’est pas définie par cette étape.

## Contrôle serveur

La garde hd_progress_access_guard conserve le contrôle de droit existant pour tous les parcours HD. Pour les seuls identifiants techniques RECETTE_HD_CULTE_V1 du programme de recette, elle vérifie le nombre de créneaux personnels valides à la date de l’activité, dans le fuseau personnel et la version du module. Un calendrier personnel remplace entièrement le calendrier proposé. Le contrôle existant des jours futurs reste actif. Aucune permission nouvelle, aucune table créée, aucune modification de Supabase production.

Les 90 activités ajoutées sont des supports techniques de déclaration, sans nouveau texte du livre ou de prière. Aucun droit, abonnement, coach ou envoi de message n’est ouvert. Les déclarations réelles existantes sont conservées.

## Vérification

- 40 tests locaux réussis (planning, accès, déclaration, lecture et interface), TypeScript réussi.
- Test SQL entièrement annulé sur compte fictif : deux cultes le même jour, confirmation et relecture indépendante, rejeu idempotent, refus hors planning, futur et droit révoqué.
- Conseillers de sécurité avant/après : mêmes 19 informations de fermeture RLS et mêmes deux avertissements historiques (pg_net public et protection des mots de passe divulgués). Aucune nouvelle alerte due à cette garde.
- Migration TEST : habitudes_cultes_recette_garde_creneaux. Les scripts de vérification doivent être exécutés avant ajout persistant des activités, leur garde refusant toute substitution.

Pour un retrait temporaire de l’interface, masquer le bloc de déclaration en conservant le planning et les données. Ne pas effacer les activités ni les réponses, et ne pas retirer la garde serveur. Une ancienne interface exigeant exactement 13 activités par jour ne doit pas être republiée telle quelle après extension du catalogue.

Vérification authentifiée sur le téléphone du participant à compléter après publication.
