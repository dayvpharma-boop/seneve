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
