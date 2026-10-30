# Première intégration du design bleu lavande

Décision : conserver les photos de l'application et adapter l'interface aux références Dribbble et à la dernière maquette montrée le 29 octobre 2026.

Base sauvegardée : commit `1b2624c36cb5b22ee82539196eba99e4f07baaac`. Travail isolé sur `design/bleu-lavande-photos`.

## Périmètre réalisé

- Aujourd'hui : photo de la pousse conservée, présentée en bandeau au-dessus du texte ; cartes arrondies et couleurs bleu lavande.
- Parcours : photo du chemin conservée en bandeau ; liens réels vers les achats/accès et les offres, en français et en anglais.
- Habitudes & Défis : palette locale claire et sombre, carte du prochain rendez-vous lavande, largeur de lecture limitée sur ordinateur. Les photos, horaires et contenus existants ne sont pas remplacés.
- Navigation existante conservée : Aujourd'hui, Parcours, Bibliothèque, Bible, Journal.
- Les palettes alternatives choisies par le participant gardent leurs couleurs ; la nouvelle palette concerne la palette par défaut sur les trois espaces ciblés.

Il s'agit d'une première intégration aux composants existants, pas d'une reproduction pixel par pixel de l'image générée. Aucun programme ou statut d'accès fictif de la maquette n'a été ajouté. Aucun changement SQL, paiement, inscription, compteur, progression ou envoi de notification.

## Vérification et limites

TypeScript et suite existante : 142 fichiers, 1 045 tests réussis. Construction du site avec les options HD de production. Contrôle visuel HD dans la galerie locale avec données fictives ; pas de connexion à un compte réel durant cette recette. Les textes et liens FR/EN utilisent le même composant et la même feuille de styles.

Recette complémentaire : les vraies routes Aujourd’hui et Parcours ont été rendues avec une session fictive isolée dans une fenêtre interne de 360 px. HD a été relu dans cette largeur. Le débordement horizontal de l’en-tête a été corrigé. Le thème anglais sombre avec texte à 125 % a été inspecté sur Aujourd’hui. Les fixtures ne sont jamais importées par le site publié.

Limites : aucune connexion réelle, aucune vérification physique Android/iPhone, aucune recette complète FR/EN de tous les états. Cette note ne prouve pas la réception de ces scénarios.

## Retour arrière

Revenir sur ce seul commit de présentation avec `git revert` après intégration, puis laisser les contrôles et le déploiement habituels s'exécuter. Aucun retour arrière de base de données n'est nécessaire. Les photos et les identifiants techniques restent identiques.

## Extension à toute l'application (29/10/2026, soir)

Demande de Dr Justin : « change tout avec le même style » (reprendre le modèle, les icônes et le style).

- Palette par défaut : la palette « ivoire » (identifiant technique conservé) prend les couleurs du modèle, claires et sombres, avec les mêmes valeurs que les trois espaces déjà adaptés. Elle s'appelle désormais « Lavande » dans Préférences. Les palettes Sable, Sauge, Argile et Bleu ardoise restent au choix.
- Couleurs anciennes écrites en dur (crèmes, gris chauds, petits jaunes des maquettes Stitch) reliées à la palette dans `scripts/preferences-css.ts`, sauf les ambiances de lecture de la Bible.
- `src/styles-modele-lavande.css`, chargé en dernier : barre du bas à plat avec l'onglet actif en couleur principale, bouton principal arrondi en couleur principale, (logo d'origine rétabli le 30/10/2026 à la demande de Dr Justin), avatar rond clair, grands titres en Poppins gras avec un trait de couleur principale.
- Barre du téléphone et écran de démarrage : #F5F7FE.
- Photos : celles du modèle (pousse, chemin, livre ouvert) sont déjà celles de l'application ; aucune nouvelle photo ajoutée dans cette étape.
- Vérification : aperçu de l'application entière avec un compte fictif (`scripts/recette/vite-apercu-app.config.ts`), en clair et en sombre, sur Aujourd'hui, Parcours, Journal, Bible, Bibliothèque, Coach, Aide, Notifications, Profil, Réglages, Connexion et Offres ; 1 045 tests réussis ; construction réussie. Pas de vérification sur un vrai téléphone.
