# Recette serveur des paiements Habitudes & Défis — 28 octobre 2026

## Résultat

Les contrôles SQL de conformité et les scénarios HD décrits ci-dessous ont réussi sur **seneve-test**. Aucun paiement réel, appel au prestataire, envoi de notification ou droit de production n’a été créé ou modifié.

Ce résultat porte sur les fonctions serveur et leurs données. Il ne constitue pas une réception complète du paiement dans le navigateur, de la vérification HMAC à l’entrée du webhook, du prestataire ou d’un remboursement financier réel.

## Écart TEST corrigé

Le premier passage de `supabase/tests/paiements_controles.sql` a échoué : un montant différent de l’offre était classé `en_attente_compte` au lieu de `a_examiner`.

Lecture des fonctions : les deux gardes de conformité étaient déjà présentes en PROD, mais absentes de TEST. Remise à niveau appliquée uniquement à TEST sous le nom `paiements_controles_conformes_test_20261028` :

- `record_chariow_sale` classe toute anomalie de montant/devise/offre/email avant la recherche du compte ;
- `_ouvrir_acces` refuse une signature non vérifiée ou un contrôle différent de ok avant de créer un nouveau droit ;
- le rejeu d’un accès déjà ouvert ou révoqué garde son comportement ;
- les règles TEST d’alignement Continuité/HD, d’achat anticipé et de reprise sont conservées.

La proposition versionnée ajoute une précondition d’empreintes : elle refuse les définitions actuelles de PROD et toute base différente des états TEST vérifiés. Ce garde documentaire est ajouté au script conservé ; les définitions finales des deux fonctions correspondent à celles appliquées et testées.

Les privilèges restent inchangés : aucune exécution directe des deux fonctions par anon ou authenticated. Les contrôles de sécurité avant/après n’introduisent pas de nouvelle alerte. Les alertes préexistantes sur pg_net dans public et la protection des mots de passe compromis sont hors de ce lot.

## Conformité des paiements

La recette existante retourne : verification=reussie, cas=10, donnees_de_test_conservees=false.

Elle couvre notamment montant/devise incorrects ou absents, offre inconnue, email absent, répétition, signature refusée, rattachement différé et paiement conforme sans compte conservé en attente. La correction ne crée aucun droit sur les cas refusés.

## Scénarios HD

Script : [habitudes_paiements_recette_20261028.sql](../supabase/tests/habitudes_paiements_recette_20261028.sql).

Deux comptes et programmes synthétiques sont créés dans une transaction, puis annulés. Le script utilise une offre Continuité configurée en TEST, sans contacter son prestataire.

| Scénario | Résultat |
|---|---|
| Montant incorrect avec compte confirmé | À examiner ; aucun droit acheté créé |
| Paiement conforme | Un droit Continuité et le mois HD 2 sont ouverts |
| Achat avant la fin du mois gratuit | Début commun programmé à la fin de la période en cours ; le jour pédagogique courant n’avance pas |
| Alignement | Début et fin du droit Continuité égaux à ceux de la période HD |
| Durée du mois financé | 720 heures |
| Contenus Continuité | Leur date de début est la date locale du mois HD |
| Rejeu de la même vente | Déjà reçu ; aucun droit ni mois supplémentaire |
| Achat après coupure | Reprise au jour 31 ; déclaration de ce jour acceptée |
| Révocation simulée | Droit acheté révoqué et période HD financée retirée |
| Révocation après coupure | Aucun droit courant indu ne reste utilisable |
| Historique | La déclaration préexistante est conservée |
| Rejeu de la révocation | Déjà révoqué |

## Nettoyage et séparation des environnements

Après rollback, vérification par préfixes fictifs : **0 compte, 0 programme, 0 offre et 0 paiement de recette conservés**.

Empreintes des fonctions PROD relevées avant et après le lot, identiques :

| Fonction PROD | Empreinte MD5 de la définition |
|---|---|
| record_chariow_sale | bebe7d2a4dbbc5cde7ccba43bb693c19 |
| _ouvrir_acces | 9c8cb62dd30b9af6d28a088369f49736 |

Empreintes finales TEST :
- record_chariow_sale : bebe7d2a4dbbc5cde7ccba43bb693c19 ;
- _ouvrir_acces : 16a77873f536159ecb8b38fbea7d1313.

La différence restante de _ouvrir_acces n’est pas présentée comme une synchronisation complète des environnements : le lot remet en place les gardes nécessaires en préservant le reste de la fonction TEST.

## Suites de réception

- Vérifier séparément la couche HTTP du webhook et la vérification réelle de sa signature, sans vente réelle.
- Recevoir les erreurs/reprises du prestataire et du navigateur selon un protocole de test autorisé.
- Vérifier les achats simultanés, les frontières de période et le remboursement quand des mois ultérieurs existent.
- Ne pas annoncer le paiement complet reçu de bout en bout sur la seule réussite de cette recette SQL.

Références : cahier Habitudes & Défis §3 et scénarios HD-03/HD-04 ; décision d’alignement Continuité/HD et reprise après retard déjà consignées dans les propositions du dépôt.
