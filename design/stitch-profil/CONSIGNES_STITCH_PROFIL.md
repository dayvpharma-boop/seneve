# Consignes Stitch — nouvel écran Profil SÉNEVÉ

Version : 29 octobre 2026 — statut : **écran 1 reçu et conforme ; écran 2 proposé**.
Demande de Dr Justin (29/10/2026) : l'écran du profil « n'est pas moderne ». Gênes retenues : mal rangé, look vieilli, en-tête fade. Méthode choisie : maquette Stitch d'abord, puis intégration fidèle.

## Existant vérifié (src/routes/profil.tsx, 29/10/2026)
Une seule longue colonne de cartes : en-tête (retour, « Mon profil »), identité (photo, prénom, e-mail, modifier le prénom), raccourcis Préférences/Rappels, Mes préférences (langue, apparence, palette, taille du texte), Notifications (rappels sur ce téléphone + annonces, e-mail du matin, WhatsApp), Mes parcours (jour n sur durée, barre), Ma racine au test, Mon objectif, J'ai un code de place, Mon compte (Administration pour l'équipe, Ma bibliothèque, Changer mon mot de passe, Changer mon adresse e-mail, Mes accès, Aide et contact), Mes données (journal privé, Comment nous protégeons tes données, Télécharger mon profil et mon journal, Demander une copie de toutes mes données), Se déconnecter, Demander la suppression de mon compte. Palette par défaut « Ivoire » (vert sauge) ; le participant peut choisir une autre palette et le mode sombre.

## Nouvelle organisation proposée
1. En-tête « carte d'identité » : photo, prénom, e-mail, deux pastilles (parcours en cours, racine).
2. « Mon chemin » : parcours avec progression, objectif.
3. « Réglages » : liste de lignes avec icône et chevron (préférences, rappels et annonces, e-mail du matin, WhatsApp, code de place). Chaque ligne s'ouvre sur place.
4. « Mon compte » et « Mes données » : listes de liens.
5. Se déconnecter, puis la suppression du compte, discrète.
Aucune fonction nouvelle : même contenu, mieux rangé.

## Écran 1 — Profil
Fichier : `pf-01-profil.html` — **reçu le 29/10/2026, conforme** (tous les textes exacts, aucun ajout ; contrôle automatique des textes). Rangé dans le dépôt : design/stitch-profil/pf-01-profil.html.
Ajustement prévu à l'intégration : la pastille « Changer ma photo » qui chevauche l'avatar devient un petit bouton rond avec icône appareil photo (libellé accessible « Changer ma photo »). La ligne « Administration » (équipe seulement) s'ajoute en tête de « Mon compte ».

Prompt utilisé :

```
Design one mobile app screen (390 px wide) for SÉNEVÉ, a calm daily companion for personal transformation based on a Christian book. Screen: the participant's PROFILE page. Tone: calm, warm, modern, uncluttered, premium but simple. No people illustrations.

VISUAL SYSTEM (keep exactly):
- Background #F2F3EB, main surfaces #FCFDF7, soft cards #EDF0E7 and #E5EADD, hairlines #CDD7C5.
- Text #243125, secondary text #52604E, outline #7D8B76.
- Primary color deep sage #38523C (filled buttons, white text), darker #28402D, small gold details #B79755 only.
- Titles, labels, buttons, navigation: Outfit. Body text and the participant's goal: Literata (serif).
- Material Symbols Rounded icons, thin strokes.
- Corners 16–24 px, very light shadows, generous spacing, touch targets at least 44 px, readable contrast.

LAYOUT, top to bottom:
1. Top bar: back arrow on the left, title "Mon profil" centered.
2. Identity hero card (full width, soft gradient from #E5EADD to #FCFDF7, a very subtle mustard-seed / young-sprout line motif in a corner, no photo of a real person): round avatar 88 px showing the initial "G" on #38523C, with a small camera badge "Changer ma photo"; name "Grâce" (Outfit 26 px); e-mail "grace@exemple.com" (secondary); a small text button with a pencil icon "Modifier mon prénom". Under it, two pill chips side by side: "1 parcours en cours" (icon auto_stories) and "Racine : Fidélité dans les petites choses" (icon spa).
3. Section title "Mon chemin":
   - Card "Accompagnement du livre — 14 jours" with "Jour 5 sur 14", a thin rounded progress bar (5/14) in #38523C, and a small link "Ouvrir ma journée".
   - Card "Mon objectif" with the goal in Literata italic: « Mettre de côté la dîme chaque semaine » and a small text button "Modifier".
4. Section title "Réglages": one grouped list card, rows separated by hairlines, each row = rounded icon tile on the left, label, short secondary value, chevron on the right:
   - tune — "Préférences" — "Français · Clair · Ivoire"
   - notifications — "Rappels et annonces" — "Matin 7 h 30"
   - mail — "E-mail du matin" — "Désactivé"
   - chat — "WhatsApp" — "Non relié"
   - confirmation_number — "J’ai un code de place"
5. Section title "Mon compte": grouped list card with chevrons: "Ma bibliothèque" (auto_stories), "Mes accès" (key), "Changer mon mot de passe" (lock), "Changer mon adresse e-mail" (alternate_email), "Aide et contact" (help).
6. Section title "Mes données": small note with a lock icon "Ton journal est privé. Tu choisis les extraits que tu partages avec l’équipe." then a grouped list card: "Comment nous protégeons tes données", "Télécharger mon profil et mon journal", "Demander une copie de toutes mes données".
7. A full-width outlined button "Se déconnecter", and below it a small discreet text link in #ba1a1a "Demander la suppression de mon compte".
8. Bottom navigation bar of the app (5 items): "Aujourd’hui", "Journal", "Coach", "Progrès", "Profil", with "Profil" active.

RULES: use only the French texts above, exactly; do not add any other text, statistics, streaks, badges, points, levels, premium labels, or features. Section titles small, uppercase is not required — prefer sentence case in Outfit 15 px semibold with secondary color. Make it feel modern: clear hierarchy, airy grouped lists, consistent icon tiles (36 px, background #EDF0E7, icon #38523C).
```

Textes anglais (même mise en page) : « My profile » / « Change my photo » / « Edit my first name » / « 1 journey in progress » / « Root: Faithfulness in small things » / « My path » / « Book companion — 14 days » / « Day 5 of 14 » / « Open my day » / « My goal » / « Edit » / « Settings » / « Preferences » — « English · Light · Ivory » / « Reminders and announcements » — « Morning 7:30 am » / « Morning e-mail » — « Off » / « WhatsApp » — « Not linked » / « I have an access code » / « My account » / « My library » / « My access » / « Change my password » / « Change my email address » / « Help and contact » / « My data » / « Your journal is private. You choose the excerpts you share with the team. » / « How we protect your data » / « Download my profile and journal » / « Request a copy of all my data » / « Sign out » / « Request account deletion » / navigation « Today », « Journal », « Coach », « Progress », « Profile ».

> Données fictives (Grâce, e-mail, parcours, jour, objectif, réglages) pour la maquette seulement. L'objectif affiché est un exemple, pas une citation du livre.

## Écran 2 — Ligne « Rappels et annonces » ouverte
Fichier attendu : `pf-02-reglage-ouvert.html` — **proposé**.

```
Same project, same visual system as the SÉNEVÉ profile screen you just made (background #F2F3EB, surfaces #FCFDF7, soft #EDF0E7 / #E5EADD, hairlines #CDD7C5, text #243125, secondary #52604E, primary deep sage #38523C, gold detail #B79755 only, Outfit for labels and buttons, Literata for body text, Material Symbols Rounded, corners 16–24 px).

Design one mobile screen (390 px) showing the "Réglages" section of the profile with ONE row opened in place (accordion), to define how an opened setting looks.

Top bar: back arrow, title "Mon profil". Then section title "Réglages" and the same grouped list card:
- Row "Préférences" — "Français · Clair · Ivoire" — chevron (closed).
- Row "Rappels et annonces" — OPENED: the row gets a very light #EDF0E7 background and its chevron points up. Directly under it, inside the same card, an inner panel with 16 px padding:
  • Small title "Rappels sur ce téléphone".
  • Three lines, each with a modern switch on the right:
    "Matin" — switch ON, with a small time chip "07 h 30" (tappable, with a small expand_more icon) next to it;
    "Midi" — switch OFF, no time chip;
    "Soir" — switch ON, with a time chip "19 h 30".
  • A small status line with a check_circle icon in #38523C: "Rappels activés sur ce téléphone."
  • A hairline separator, then one more line with a switch ON: "Recevoir aussi les annonces de l’équipe SÉNEVÉ", and under it in small secondary text: "Les annonces de l’équipe arrivent aussi sur ce téléphone, jamais entre 21 h et 7 h. Tu peux les couper ici ; elles restent lisibles dans la cloche."
  • Small secondary note: "Les rappels peuvent arriver en retard ou ne pas arriver ; ton parcours reste toujours disponible ici."
  • A discreet text button in #ba1a1a, left aligned: "Arrêter les rappels".
- Row "E-mail du matin" — "Désactivé" — chevron (closed).
- Row "WhatsApp" — "Non relié" — chevron (closed).
- Row "J’ai un code de place" — chevron (closed).

Below the card, show the start of the next section title "Mon compte" with its first row "Ma bibliothèque", cut by the bottom navigation bar ("Aujourd’hui", "Journal", "Coach", "Progrès", "Profil", with "Profil" active).

RULES: use only these French texts, exactly; no extra text, no statistics, no badges. Switches: track 44×26 px, ON = #38523C with white knob, OFF = #CDD7C5. Keep everything airy and touch-friendly (at least 44 px per line).
```

Textes anglais : « Reminders on this phone » / « Morning » / « Midday » / « Evening » / « 07:30 » / « 13:00 » / « 19:30 » / « Reminders are on for this phone. » / « Also get announcements from the SÉNEVÉ team » / « Team announcements also arrive on this phone, never between 9 pm and 7 am. You can turn them off here; they stay readable under the bell. » / « Reminders may arrive late or not at all; your journey is always available here. » / « Stop reminders ».

> Heures d'exemple ; dans l'application, ce sont les heures choisies par la personne. Textes repris de la carte des rappels déjà publiée.

## Suite prévue
- Après l'écran 2 : intégration dans le code (même contenu et mêmes fonctions, nouvelle présentation), tests, publication.
- Écran 3 (facultatif) : version sombre de l'écran 1, si Dr Justin le souhaite. Sinon, le mode sombre est dérivé des couleurs déjà en place.
