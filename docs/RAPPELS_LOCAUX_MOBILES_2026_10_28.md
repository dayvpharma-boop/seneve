# Rappels locaux mobiles — prototype Android et iPhone

## Périmètre

Le site et la PWA conservent l’export ICS vers le calendrier. La construction mobile Capacitor embarque les ressources web à la racine et propose « Mes rappels sans Internet » aux inscriptions HD actives. Le site ne présente jamais le téléphone comme capable de programmer des notifications locales.

Après un geste explicite, l’application demande la permission de notifications puis, sur Android, vérifie « Alarmes et rappels ». Le bouton vers ce réglage ne s’ouvre que sur demande. Aucun contournement des autorisations : si elles sont refusées, l’écran ne confirme aucune programmation.

Le moteur de planning existant fournit les horaires personnels et leurs dates effectives. Les alertes couvrent au maximum sept dates civiles, strictement avant la fin du droit courant confirmé, sans récurrence infinie. Les rendez-vous simultanés sont regroupés. Au plus 60 alertes sont déposées pour respecter une marge de capacité sur iPhone ; une sélection tronquée est annoncée et la capacité réelle des autres notifications est vérifiée avant toute annulation de l’ancien planning.

Les notifications déposées sont relues avec getPending avant confirmation. Une programmation partielle est nettoyée ; un arrêt non confirmé est annoncé. Les opérations sont sérialisées, et une déconnexion/changement de compte invalide une activation encore en attente d’autorisation puis annule les identifiants HD réservés. Les autres notifications locales ne sont pas effacées. Un avertissement persistant signale un échec d’arrêt lors d’une déconnexion.

Aucune activité n’est déclarée par une alerte, aucun compteur privé/journal n’est lu, aucune écriture Supabase n’est ajoutée. Les seuls nouveaux éléments persistés sont propriétaire/inscription/dernier instant pour rattacher et arrêter le planning de cet appareil. Les sauvegardes Android sont désactivées pour cette application de test.

## Coexistence et limites annoncées

La personne confirme qu’elle ne cumule pas ces rendez-vous avec des rappels web/calendrier. Les copies déjà importées ne peuvent pas être supprimées automatiquement. L’export calendrier reste disponible sur le site ; le binaire mobile utilise les notifications locales. Les rappels web sont désactivés dans la configuration mobile.

Revenir dans l’application pour renouveler les prochains jours et reprogrammer après un changement d’horaire. Il n’y a pas de renouvellement automatique en arrière-plan. Une modification distante de l’accès ou du planning ne peut pas effacer des alertes d’un appareil sans connexion ; elles restent limitées à la fin connue du droit. L’heure est enregistrée sous forme d’instant : après un voyage/changement de fuseau, actualiser puis reprogrammer.

Le téléphone peut retarder/masquer des alertes selon les modes économie d’énergie, concentration/silence ou ses autorisations. Android limite notamment les déclenchements en veille rapprochés. Les autorisations retirées, redémarrages et arrêts forcés doivent être testés sur appareils réels. Aucun test navigateur ne prouve la réception hors connexion.

## Construire

Dépendances épinglées : Capacitor core/cli/android/ios 8.5.3, Local Notifications 8.3.1. Node 22+.
Identifiant provisoire de test : org.seneve.mobile. Icônes/splash et signature de distribution à finaliser avant publication en boutique.

- npm ci
- npm run mobile:sync
- npm run mobile:android : Android Studio, SDK 36, JDK 21 ; Android 8+ (API 26).
- npm run mobile:ios : macOS et Xcode 26+ ; iOS 15+.

La construction web demeure npm run build. La construction mobile distincte ne charge pas de site distant avec server.url et n’enregistre aucun service worker : les ressources sont embarquées. La connexion par mot de passe existante demeure nécessaire pour préparer le planning ; aucune authentification native de démonstration n’est incluse dans le binaire. Les liens de récupération/confirmation par email doivent encore être validés comme parcours mobile avant diffusion.

Le workflow mobile.yml produit un APK Android de test signé avec une clé de débogage et une application iPhone pour simulateur sans signature de distribution. L’application du simulateur ne s’installe pas sur un iPhone réel. La distribution iPhone/TestFlight nécessite ensuite un compte développeur Apple et une signature ; aucune publication boutique n’est effectuée par ce workflow. Une autre clé de débogage Android peut imposer une désinstallation avant de réinstaller un APK ultérieur.

## Recette sur téléphone

1. Installer le binaire de test, se connecter, ouvrir Aujourd’hui → Mes rappels sans Internet.
2. Choisir un prochain rendez-vous, vérifier le fuseau et l’accès, autoriser les notifications.
3. Android : autoriser Alarmes et rappels via le bouton si demandé, revenir puis Programmer.
4. Vérifier le nombre confirmé et le dernier rendez-vous. Fermer l’application et couper Wi-Fi/données mobiles. Vérifier titre, heure, son et ouverture par l’alerte.
5. Arrêter les rappels et vérifier leur absence. Refaire après refus/retrait des autorisations, redémarrage, modification d’horaire, déconnexion et changement de compte.
6. Vérifier les deux langues, les heures simultanées, la fin d’accès et le cas où 60 alertes sont atteintes.

Sources officielles : https://capacitorjs.com/docs/apis/local-notifications ; https://capacitorjs.com/docs/getting-started/environment-setup ; https://supabase.com/docs/reference/javascript/auth-onauthstatechange

## Validation

TypeScript sans erreur et tests locaux ciblés de planning, autorisation, arrêt, annulation concurrente, changement de compte, interface et non-régression calendrier/accès. Ressources mobiles construites et synchronisées vers Android/iOS. Les compilations natives et leurs résultats CI sont consignés séparément dans le rapport de livraison. La recette physique sur téléphones reste requise avant toute annonce de fonctionnement vérifié hors Internet.

