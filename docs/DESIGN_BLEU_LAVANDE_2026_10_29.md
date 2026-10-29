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

À recevoir avant publication : rendu des trois écrans avec un compte connecté, téléphone Android/iPhone, mode sombre et texte agrandi, comparaison visuelle FR/EN. Cette note ne prouve ni une publication, ni la réception de ces scénarios.

## Retour arrière

Revenir sur ce seul commit de présentation avec `git revert` après intégration, puis laisser les contrôles et le déploiement habituels s'exécuter. Aucun retour arrière de base de données n'est nécessaire. Les photos et les identifiants techniques restent identiques.
