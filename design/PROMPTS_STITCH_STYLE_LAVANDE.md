# Prompts Stitch — toutes les pages SÉNEVÉ dans le style de la maquette lavande

Version : 30 octobre 2026 — statut : **proposé**.
Référence : maquette « SÉNEVÉ — Vos photos, le nouveau style » (Aujourd'hui, Mes parcours, Habitudes & Défis) envoyée par Dr Justin le 29 et le 30/10/2026.
Inventaire : 28 pages (relevé du 30/10/2026). Les textes viennent des pages réelles du site ; les noms, dates et chiffres sont des exemples.

## Mode d'emploi

1. Ouvrir Stitch (stitch.withgoogle.com), mode **App**, et créer **un seul projet** pour toutes les pages (le style reste identique d'une page à l'autre).
2. Pour chaque page : coller le **bloc commun**, puis le **bloc de la page**, dans le même message.
3. Joindre l'image de la maquette lavande au premier message du projet (« use this image as the exact style reference »).
4. Exporter en HTML avec le nom indiqué (ex. `lv-07-aujourdhui.html`) et me l'envoyer. Une page à la fois.
5. Vérifier avant l'envoi : textes exactement ceux du prompt, aucune statistique, note, série de jours, badge ou promesse ajoutés par Stitch, aucune photo de personne reconnaissable.

---

## Bloc commun (à coller avant chaque page)

```
Mobile app screen (390 px wide) for SÉNEVÉ, a calm daily companion for personal transformation based on a Christian book by Dr Justin Tshims. Reproduce EXACTLY the visual style of the attached reference mockup ("SÉNEVÉ — Vos photos, le nouveau style"):

- Page background very light lavender-white #F5F7FE (soft diagonal gradient to #F2EDFD), lots of white space.
- Header without a bar: centered wordmark "SÉNEVÉ" in thin, widely spaced uppercase letters (#151B36) with a tiny green sprout drawn above the middle letters; on the right a thin outline bell icon and a thin outline circular profile icon (#151B36).
- Page title: large bold sans-serif (Poppins Bold, 30 px, #151B36), left aligned; optional subtitle (Poppins Regular 20 px); a short indigo bar (32 × 3 px, #4B45A8, rounded) under the title block.
- Primary color indigo #4B45A8 (filled pill buttons with white text and a small chevron ">", active day circle, active tab, progress fill). Secondary pills: light lavender #E5E3FA with indigo text.
- Cards: radius 20 px, no heavy shadow. Tints used like the reference: sky blue #E3EFFF, lavender #EEE8FC, mint #E6F3F2, and white #FFFFFF with hairline #DDE3F2. A small white circle with a chevron ">" sits on the right of tappable cards.
- Photo cards: realistic warm golden-light photography (nature, seed, path, open book, soft interiors), rounded corners, no people; text over photo in bold white with soft dark gradient.
- Week strip (when asked): white rounded card with 7 columns "Lun Mar Mer Jeu Ven Sam Dim", date numbers below, today in a filled indigo circle with white number, tiny indigo dots under days.
- Progress bars: rounded, track #DDE3F2, fill #4B45A8.
- Text: titles #151B36 Poppins SemiBold; secondary text #4D5874 Poppins Regular 13–14 px. Thin outline icons (Material Symbols Rounded, weight 300) in indigo or #151B36.
- Bottom navigation bar, white, 5 items with thin outline icons and labels: "Aujourd’hui" (house), "Parcours" (folded map), "Bibliothèque" (books), "Bible" (book with a cross), "Journal" (pen). The active item has a FILLED indigo icon and indigo label.
- Touch targets at least 44 px, readable contrast.
RULES: use only the French texts given for the screen, exactly; do not add statistics, scores, streaks, badges, levels, prices, promises or extra features; no recognizable person in photos; no other app names or logos.
```

---

## Public et compte

### 01 — Test des 7 Racines (accueil public) — `lv-01-test.html`
```
Screen: public home page of the 7 Roots Test (no account needed). Header: wordmark "SÉNEVÉ" with sprout, and on the right a small pill "English" instead of bell and profile. No bottom navigation.
Small indigo label "LE TEST DES 7 RACINES". Title: "Ce qui grandit commence à l’intérieur." (large bold, last words "à l’intérieur." in indigo). Text: "21 questions courtes, tirées du livre « Arrête de mendier des miracles »."
Photo card: young green sprout in rich soil, golden morning light.
Sky blue card "À la fin, tu découvres :" with three lines with small indigo icons: "tes sept racines avec leur score ;", "la racine par laquelle commencer ;", "une première action simple."
Three small white tiles in a row with icons: "Sans compte", "21 questions", "Retour possible".
Lavender card "Commencer avec sincérité" — "Réponds selon ta pratique actuelle, sans chercher la réponse idéale. Tu peux revenir à la question précédente."
Full-width indigo pill button "Commencer >". Small link at the bottom: "Confidentialité".
```

### 02 — Confidentialité — `lv-02-confidentialite.html`
```
Screen: privacy policy. Header with back arrow on the left of the wordmark, bell and profile icons on the right. Title "Politique de confidentialité" with indigo bar.
Mint card "En un coup d’œil" with four small blocks, each with a thin icon and a bold mini-title: "Ce que nous gardons — Parcours suivi, jour en cours, actions réalisées ou préparées, réponses à « Qu’est-ce qui t’a freiné ? », objectif choisi.", "Ce que nous ne faisons jamais — SÉNEVÉ n’utilise aucun outil de mesure publicitaire et ne vend jamais tes données.", "Qui peut lire ton journal — Ton journal est privé. Tu choisis les notes autorisées au coach IA et les extraits transmis à l’équipe.", "Comment demander l’effacement — Pour cela, écris à contact@drjustintshims.com depuis l’adresse de ton compte."
Then a white card list of chapters, each row with a number in a lavender circle and a chevron: "1. Qui est responsable de tes données ?", "2. Quelles données, et pourquoi ?", "3. Tes accords pour les messages", "4. Avec qui tes données sont-elles partagées ?", "5. Combien de temps les gardons-nous ?", "6. Comment tes données sont-elles protégées ?", "7. Tes droits".
Indigo pill button "Demander la suppression de mes données >". No bottom navigation.
```

### 03 — Page introuvable — `lv-03-introuvable.html`
```
Screen: page not found. Header: wordmark only. Photo card: a garden path turning gently, soft light, with bold white text "Un pas de côté peut ramener à l’essentiel."
Title "Page introuvable" with indigo bar. Text: "Cette page n’existe pas ou a été déplacée."
Three white rows with icons and chevrons: "Revenir au Test des 7 Racines", "Revenir à l’accueil", "Besoin d’aide ? Écrire à l’équipe". No bottom navigation.
```

### 04 — Connexion et inscription — `lv-04-connexion.html`
```
Screen: sign in / create account. Header: back arrow, wordmark, pill "English" on the right. No bottom navigation.
Small indigo label "UN PAS CHAQUE JOUR". Title "Ton espace" with indigo bar. Text: "Tes lectures, tes actions et ton journal pour mettre en pratique les principes du Royaume au quotidien."
Segmented control (white card, two halves): "Créer un compte" (selected, indigo fill, white text) | "Se connecter".
White outlined pill button with Google "G" logo: "Continuer avec Google". Divider text "ou avec ton e-mail".
Three rounded input fields with thin icons: "Ton prénom" (placeholder "ex. Marie"), "E-mail" (placeholder "marie@exemple.com"), "Mot de passe" with a small "Afficher" text button; helper "Au moins 8 caractères."
Lavender note card with a book icon: "Tu as acheté le livre ou un parcours ? Utilise la même adresse e-mail que pour l’achat : c’est elle qui ouvre ton accès."
Full-width indigo pill "Créer un compte >". Small text: "Connexion sécurisée · Données privées et préservées". Footer link: "Comment nous protégeons tes données".
```

### 05 — Mot de passe oublié — `lv-05-mot-de-passe-oublie.html`
```
Screen: forgot password. Header: back arrow, wordmark, pill "English". No bottom navigation.
Small indigo label "RÉCUPÉRATION D’ACCÈS". Title "Mot de passe oublié" with indigo bar. Text: "Saisis l’adresse e-mail associée à ton compte pour réinitialiser ton mot de passe en toute tranquillité."
Rounded input "E-mail" with mail icon. Helper: "La demande du lien ne modifie pas ton mot de passe actuel."
Full-width indigo pill "Recevoir le lien >". Sky blue note: "Utilise la même adresse e-mail que pour l’achat : c’est elle qui ouvre ton accès."
Link "Retour à la connexion". Mint card at the bottom: "Confidentialité — Découvre comment SÉNEVÉ protège tes données personnelles et ton journal." with chevron.
```

### 06 — Nouveau mot de passe — `lv-06-nouveau-mot-de-passe.html`
```
Screen: set a new password. Header: wordmark, pill "English". No bottom navigation.
Title "Nouveau mot de passe" with indigo bar. Text: "Définis un nouveau mot de passe pour retrouver ton espace et ton journal."
Two rounded inputs with lock icon and "Afficher": "Nouveau mot de passe" (helper "Au moins 8 caractères"), "Confirmer le nouveau mot de passe".
Lavender note: "Choisis un mot de passe unique, que tu n’utilises pas ailleurs."
Full-width indigo pill "Enregistrer >". Small text with lock icon: "Ton mot de passe protège l’accès à ton espace et à ton journal."
```

---

## Espace du participant

### 07 — Aujourd'hui — `lv-07-aujourdhui.html`
```
Screen: Today (identical to the left phone of the reference). Header: wordmark, bell, profile.
Title "Aujourd’hui", subtitle "Bonjour Justin", indigo bar; on the right a small pill toggle "FR / EN".
Week strip: "Lun 12, Mar 13 (today, indigo circle), Mer 14, Jeu 15, Ven 16, Sam 17, Dim 18".
Sky blue card with photo on top (green sprout in soil, golden light): "Découverte · 7 jours", "Jour 2 sur 7", progress bar 2/7, text "Avancer pas à pas dans une foi vivante et concrète.", full-width indigo pill "Continuer >".
Row of three small tiles: "Matin — Se recentrer" (sun icon, sky blue), "Midi — Faire une pause" (sun icon, sky blue), "Soir — Se confier" (moon icon, lavender), each with ">".
White card with chart icon: "Mon activité — Consulter mes lectures, prières et habitudes du jour." with secondary pill "Ouvrir >".
White card with checklist icon: "Habitudes & Défis — Ouvrir ma journée et voir mes rendez-vous." with indigo pill "Ouvrir ma journée >".
Below (to show the rest of the page): white card "Ton action du jour" — "Prends un moment pour réfléchir." with indigo pill "J’ai réalisé cette action" and secondary pills "Je l’ai préparée", "Je l’ai faite en partie", "J’ai besoin d’aide".
Bottom navigation with "Aujourd’hui" active.
```

### 08 — Parcours — `lv-08-parcours.html`
```
Screen: My journeys (identical to the middle phone of the reference). Header: wordmark, bell, profile. Title "Mes parcours" with indigo bar.
Photo card: stone path through a golden-hour garden, bold white text "Chaque pas compte." and a white circle chevron.
Mint card with a line-drawn sprout: "Découverte · 7 jours", "Les bases d’une foi vivante au quotidien.", mint pill "En cours", chevron.
Sky blue card with photo of an open book on a wooden stand: "Accompagnement du livre · 14 jours", "Un parcours pour approfondir et mettre en pratique.", secondary pill "Voir mes accès >", chevron.
Lavender card with a checklist icon in a circle: "Habitudes & Défis", "Des rendez-vous simples pour grandir chaque jour.", secondary pill "Ouvrir >", chevron.
Two half-width cards: "Mes achats et accès — Consulter mes contenus disponibles." (shopping bag icon) and "Parcours & offres — Découvrir tous les parcours disponibles." (signpost icon).
White row with chart icon: "Voir ma progression >".
Below: white card "Les étapes du parcours" listing "Jour 1 — Enseignement d’exemple — Réalisée", "Jour 2 — Enseignement d’exemple — Pas encore enregistrée", and a small note "Ce bilan reprend uniquement ce que tu as enregistré. Il ne mesure ni ta foi ni ta valeur."
Bottom navigation with "Parcours" active.
```

### 09 — Journal — `lv-09-journal.html`
```
Screen: My journal. Header: wordmark, bell, profile. Title "Mon journal", subtitle "Un pas chaque jour", indigo bar.
Lavender note with lock icon: "Ton journal est privé. Tu choisis les notes autorisées au coach IA et les extraits transmis à l’équipe."
Photo card (open notebook and a sprig of leaves, soft light) with white text "Un espace pour déposer." and "Tes réflexions, tes questions et les petits pas de ta journée."
White card "Nouvelle réflexion" with date chip "Aujourd’hui": a large rounded text area (placeholder "Ce que tu as compris, vécu ou décidé aujourd’hui…"), small counter "0 mots déposés", a switch row "Le coach IA peut lire cette note pour mieux m’accompagner" with helper "Désactivé par défaut. Tu peux changer d’avis à tout moment, note par note.", full-width indigo pill "Enregistrer la note".
Section "Mes réflexions précédentes": two white cards with date ("12 octobre", "10 octobre"), first line of a note, and a small lock icon.
Bottom navigation with "Journal" active.
```

### 10 — Coach — `lv-10-coach.html`
```
Screen: AI coach conversation. Header: back arrow, wordmark, bell, profile. Title "Coach SÉNEVÉ" with indigo bar. Text: "Pose une question sur ta journée : comprendre un passage, appliquer l’action, reprendre après une pause."
Small mint chip: "Parcours : Découverte — 7 jours".
Chat area: a user bubble on the right (indigo, white text) "Comment appliquer l’action du jour au travail ?", a coach bubble on the left (white card) with a short answer and a small label "Explication" above it, and a second small label "Suggestion pratique" for the last paragraph.
Lavender note: "Le coach est une intelligence artificielle : il peut se tromper. Il s’appuie sur les contenus publiés de ton parcours."
Bottom input bar: rounded field "Ta question…" with an indigo circular send button. Small text with lock icon: "Tes échanges sont conservés jusqu’à ce que tu les effaces." Link: "Besoin de parler à une personne ? Demander de l’aide".
Bottom navigation (no item active).
```

### 11 — Aide et contact — `lv-11-aide.html`
```
Screen: Help & contact. Header: wordmark, bell, profile. Small indigo label "ÉCOUTE & SOUTIEN". Title "Aide & Contact" with indigo bar.
Photo card (a small plant in a clay pot held in two hands, no face) with white text "Avancer avec de l’aide." and "Explique ta difficulté et retrouve tes échanges avec l’équipe."
Lavender card with shield icon "Note importante": "Si tu es en danger ou en détresse en ce moment, ne reste pas seul : contacte les services d’urgence de ton pays ou une personne de confiance près de toi. Cette aide n’est pas un service d’urgence."
White card "Nouvelle demande": label "Sujet de ton message" with four chips "Mon parcours" (selected, indigo), "Mon compte", "Mon achat", "Autre"; rounded text area "Ta demande"; select "Parcours concerné : Aucun en particulier"; full-width indigo pill "Envoyer ma demande".
Link with chat icon "Parler au coach >". Section "Mes demandes": text "Aucune demande pour le moment."
Bottom navigation (no item active).
```

### 12 — Notifications — `lv-12-notifications.html`
```
Screen: Notifications (opened from the bell). Header: back arrow and title "Notifications" (bold), no bell. Indigo bar under the title.
Section label "Messages de l’équipe": white card with megaphone icon in a lavender circle, indigo chip "Nouveau", title "Culte spécial", time "29 octobre à 18:51", text "Rejoins-nous dimanche.", a rounded photo, and an indigo pill "Regarder la vidéo sur YouTube >".
Second card: support icon, "L’équipe t’a répondu", "Merci pour ta question, voici la réponse.", link "Ouvrir mes demandes d’aide".
Section label "Rappels reçus": sky blue card with alarm icon, chip "Nouveau", "Rappel du matin", "Ta graine du jour t’attend. Un enseignement, une action : quelques minutes suffisent.", link "Ouvrir ma journée". Mint card "Prière de midi" — "C’était l’heure : Prière de midi." link "Ouvrir mes habitudes".
Small note: "60 derniers jours."
Bottom navigation (no item active).
```

### 13 — Profil — `lv-13-profil.html`
```
Screen: My profile. Header: back arrow, wordmark, bell. Title "Mon profil" with indigo bar.
Sky blue identity card: round avatar 88 px with initial "J" on indigo, small round camera button; name "Justin"; e-mail "justin@exemple.com"; text button with pencil "Modifier mon prénom"; two pill chips "1 parcours en cours" (book icon) and "Racine : Fidélité dans les petites choses" (leaf icon).
Section "Mon chemin": white card "Découverte — 7 jours", "Jour 2 sur 7", progress bar, link "Ouvrir mon parcours >"; mint card "Mon objectif" with « Mettre de côté la dîme chaque semaine » and "Modifier".
Section "Réglages": white grouped list, each row with a rounded lavender icon tile, title, small summary below, chevron: "Préférences — Français · Clair · Lavande", "Rappels et annonces — Matin 7 h 30 · Soir 19 h 30", "E-mail du matin — Désactivé", "WhatsApp — Non relié", "J’ai un code de place".
Section "Mon compte": rows "Ma bibliothèque", "Mes accès", "Changer mon mot de passe", "Changer mon adresse e-mail", "Aide et contact".
Section "Mes données": lavender note "Ton journal est privé. Tu choisis les extraits que tu partages avec l’équipe." and rows "Comment nous protégeons tes données", "Télécharger mon profil et mon journal", "Demander une copie de toutes mes données".
Outlined indigo pill "Se déconnecter"; small red link "Demander la suppression de mon compte".
Bottom navigation (no item active).
```

### 14 — Mes réglages — `lv-14-reglages.html`
```
Screen: My settings. Header: back arrow, wordmark, bell, profile. Small indigo label "PRÉFÉRENCES & ACCÈS". Title "Mes réglages" with indigo bar. Text: "Personnalise tes rappels et gère l’accès à tes parcours."
Photo card (hourglass and small clock on a wooden table, warm light) with white text "Un rendez-vous qui me ressemble."
White card "Rappels sur ce téléphone": three lines with switches and time pills: "Matin — 07 h 30 (on)", "Midi (off)", "Soir — 19 h 30 (on)"; status with check icon "Rappels activés sur ce téléphone."; switch line "Recevoir aussi les annonces de l’équipe SÉNEVÉ".
White card "E-mail du matin" with chip "Désactivé": "Chaque matin, à partir de 7 h, un e-mail te dit que ta journée est ouverte." and a switch "Oui, je veux recevoir un e-mail chaque matin".
Mint card "Relier WhatsApp": "Relie ton numéro pour retrouver ton parcours sur WhatsApp. La liaison seule ne t’inscrit à aucun message." with indigo pill "Relier mon WhatsApp >".
Lavender card "Place offerte": "Une organisation t’a offert une place ? Saisis ici le code reçu." rounded input "Code de place" and pill "Utiliser ce code".
White card "Apparence" with segmented control "Clair | Sombre | Selon l’appareil".
Bottom navigation (no item active).
```

### 15 — Offres et accès — `lv-15-offres.html`
```
Screen: Offers & access. Header: back arrow, wordmark, bell, profile. Title "Offres & Accès" with indigo bar.
Photo card (stack of books near a window, soft light) with white text "Choisir sa prochaine étape." and "Découvre les programmes et consulte leurs conditions."
Section title "Les parcours SÉNEVÉ" — "Des chemins d’enracinement intérieur, au rythme de ton quotidien."
Mint card with sprout drawing: chip "Gratuit", "Découverte · 7 jours", "Un premier parcours fondé sur « Arrête de mendier des miracles » du Dr Justin Tshims.", four lines with small icons "Un court enseignement", "Une action concrète chaque jour", "Une question pour écrire dans ton journal", "Le Test des 7 Racines, sans compte", indigo pill "Ouvrir le parcours Découverte >".
Lavender card: "Habitudes & Défis", "Un nouveau rythme quotidien, en préparation.", secondary pill "Voir l’aperçu >".
White note: "Aucune offre payante disponible pour le moment."
Sky blue card with gift icon: "J’ai reçu un code offert", "Une organisation ou un proche t’a offert une place ?", indigo pill "Activer mon code d’accès >". Link "Voir mes accès".
Bottom navigation with "Parcours" active.
```

---

## Bibliothèque et Bible

### 16 — Bibliothèque — `lv-16-bibliotheque.html`
```
Screen: My library. Header: wordmark, bell, profile. Title "Ma bibliothèque", subtitle "Lire, écouter et avancer un peu plus loin.", indigo bar.
Photo card (open book on a wooden table, golden window light) with white text "Des ressources pour avancer."
Filter pills in a row: "Tous les titres (1)" (selected, indigo), "Livres audio", "Livres numériques".
White card with a book cover on the left (dark cover, white title "Arrête de mendier des miracles", author "Dr Justin Tshims"): title "Arrête de mendier des miracles", "Dr Justin Tshims", two rows with chips "Livre audio — En préparation" and "Livre numérique · PDF — En préparation", link "Découvrir le livre >".
Mint card "Parcours & offres" — "Des chemins d’enracinement intérieur, au rythme de ton quotidien." pill "Voir les parcours et offres >".
Sky blue card "Mes achats et accès" — "Retrouve les accès liés à ton compte." pill "Consulter mes accès >".
Lavender card "Stop Begging for Miracles" — "L’édition anglaise du même livre." link "Voir les offres en anglais >".
Bottom navigation with "Bibliothèque" active.
```

### 17 — Bible (accueil) — `lv-17-bible.html`
```
Screen: Bible home. Header: wordmark, bell, profile. Title "Bible" with indigo bar; on the right a small pill selector "Louis Segond 1910 ▾".
Rounded search field with magnifier: "Rechercher un mot ou une référence".
Photo card (old open Bible on a table, warm light) with white text "Prendre le temps de lire." and a white circle chevron; small chip "Pour commencer"; text "Matthieu 13 · La parabole du grain de sénevé · versets 31-32"; indigo pill "Ouvrir Matthieu 13 >".
Two half cards: sky blue "Ancien Testament — 39 livres" and lavender "Nouveau Testament — 27 livres".
Section "Versets de tes racines" — "Passages cités dans le Test des 7 Racines ou en tête des chapitres du livre." Horizontal scroll of small mint cards: "Priorité au Royaume", "Dîme et offrande", "Travail et intégrité", "Liberté face à l’argent", "Compassion et Tsedaka", "Fidélité dans les petites choses", "Discernement", each with link "Lire dans le chapitre".
Section "Outils personnels": two white rows "Mes surlignages et notes — 0 passage annoté", "Mes marque-pages — 0 marque-page".
Mint card "Lire hors connexion" — "Enregistre l’Ancien et le Nouveau Testament sur ce téléphone pour lire sans réseau." pill "Télécharger la Bible", small text "Environ 4,2 Mo sur le téléphone".
Bottom navigation with "Bible" active.
```

### 18 — Bible, liste des livres — `lv-18-bible-livres.html`
```
Screen: books of the Bible. Header: back arrow, wordmark, bell, profile. Title "Livres des Écritures" with indigo bar. Quote in italic serif inside a lavender card: « Le ciel et la terre passeront, mais mes paroles ne passeront point. » — Matthieu 24:35.
Segmented control: "Ancien Testament 39 | Nouveau Testament 27" (second selected, indigo).
White grouped list of books, each row with a number in a lavender circle, book name bold, small secondary line and a chevron: "01 Matthieu — Évangile · 28 chapitres", "02 Marc — Évangile · 16 chapitres", "03 Luc — Évangile · 24 chapitres", "04 Jean — Évangile · 21 chapitres", "05 Actes — Histoire · 28 chapitres", "06 Romains — Épître de Paul · 16 chapitres", "07 1 Corinthiens — Épître de Paul · 16 chapitres".
A thin vertical alphabet index on the right edge: A C E G H J L M P.
Bottom navigation with "Bible" active.
```

### 19 — Bible, recherche — `lv-19-bible-recherche.html`
```
Screen: Bible search. Header: back arrow, wordmark, bell, profile. Title "Rechercher" with indigo bar.
Large rounded search field with magnifier, typed text "grain de sénevé", and a small indigo pill "Chercher".
Result count text "3 passages". White result cards, each with reference in indigo bold and verse text with the searched words highlighted in light lavender: "Matthieu 13:31", "Marc 4:31", "Luc 13:19".
Sky blue card "Tu cherches une référence précise ?" — "Tape le nom d’un livre suivi du chapitre et du verset." link "Ouvrir le passage >".
Bottom navigation with "Bible" active.
```

### 20 — Bible, mes annotations — `lv-20-bible-annotations.html`
```
Screen: my Bible annotations. Header: back arrow, wordmark, bell, profile. Title "Mes annotations" with indigo bar.
Segmented control with counts: "Surlignages 2 | Notes 1 | Marque-pages 1" (first selected).
Two white cards, each with a colored left border (soft yellow, soft mint), reference in indigo "Matthieu 13:31-32", the verse in serif italic, date "12 octobre", and small icons edit / delete. Second card "Matthieu 6:33".
Lavender note with lock icon: "Tes surlignages, notes et marque-pages sont enregistrés sur ce téléphone uniquement. Ils ne sont pas envoyés à SÉNEVÉ."
Bottom navigation with "Bible" active.
```

### 21 — Bible, lecture d'un chapitre — `lv-21-bible-lecture.html`
```
Screen: reading a Bible chapter. Header: back arrow, centered "Matthieu 13", on the right icons "Aa" (text size) and bookmark.
Small chip "Louis Segond 1910". Chapter title "Matthieu 13" large bold with indigo bar.
Chapter text in a comfortable serif (Literata 18 px, line height 1.7) on white card, verse numbers small and indigo: verses 31 and 32 visible: "31 Il leur proposa une autre parabole, et il dit: Le royaume des cieux est semblable à un grain de sénevé qu’un homme a pris et semé dans son champ." "32 C’est la plus petite de toutes les semences; mais, quand il a poussé, il est plus grand que les légumes et devient un arbre, de sorte que les oiseaux du ciel viennent habiter dans ses branches." Verse 31 highlighted in soft lavender.
A floating white pill toolbar above the bottom bar after selecting a verse: "Surligner", "Note", "Marque-page", "Copier", "Partager".
Bottom: two round buttons "‹ Chapitre 12" and "Chapitre 14 ›". Bottom navigation with "Bible" active.
```

---

## Habitudes & Défis

### 22 — Habitudes & Défis (présentation publique) — `lv-22-hd-presentation.html`
```
Screen: public presentation of "Habitudes & Défis". Header: wordmark, pill "English". No bottom navigation.
Title "Habitudes & Défis", subtitle "De petits actes. Un rythme qui prend racine.", indigo bar. Text: "Un parcours prévu sur six mois pour faire une place à la prière, à la lecture, à la gratitude et aux actions concrètes dans ta journée."
Lavender note: "L’inscription et le suivi personnel sont encore en préparation."
Row of four pills (anchors): "Le rythme proposé", "Les 30 lectures", "La prière", "Dîme & offrande".
Photo card (sunrise over a calm field) with white text "30 jours pour prendre racine".
White card "Jour 1 / 30": "Commencer avec ce qui est possible" — "Choisir un premier pas réaliste." Question in italic: "Quel rendez-vous veux-tu préparer en premier ?"
White card "Un rythme à adapter à ta vie" with day pills "Lun Mar Mer Jeu Ven Sam Dim" and a vertical timeline (indigo circles, thin line): "05:45 Réveil", "06:00 Prière du matin", "06:20 Bible du matin", "12:30 Lecture professionnelle", "13:10 Prière de midi", "18:00 Écoute d’une prédication", "21:10 Prière du soir".
Indigo pill "Essayer mes horaires dans cet aperçu >".
```

### 23 — Habitudes & Défis, inscription — `lv-23-hd-inscription.html`
```
Screen: sign-up for "Habitudes & Défis". Header: back arrow, wordmark, bell, profile. Title "Habitudes & Défis", subtitle "Six mois pour pratiquer chaque jour les principes du Royaume.", indigo bar.
Text: "Un parcours pour mettre tes habitudes en pratique, pas à pas, avec des horaires adaptés à ton quotidien."
Section "Ce que tu vas pratiquer": grid of 8 small tinted tiles (2 columns) with thin icons: "Trois prières par jour", "Bible matin et soir", "Lectures et prédication", "Gratitude matin et soir", "Exercice doux", "Lever et coucher choisis", "Trois cultes par semaine", "Engagements et dîme".
Mint card "Accès" with chip "Exemple : mois 1 gratuit": "Pour installer ton rythme, sans paiement." and "Chaque achat Continuité ouvre le mois suivant. Tu décides chaque mois d’acheter ou non."
Lavender note: "L’inscription à ce parcours est en préparation." Link with lock icon "Comprendre la confidentialité de mes données".
Bottom navigation with "Parcours" active.
```

### 24 — Habitudes & Défis, aujourd'hui — `lv-24-hd-aujourdhui.html`
```
Screen: Habits & Challenges today (identical to the right phone of the reference). Header: wordmark, bell, profile.
Title "Habitudes & Défis" with indigo bar. Subtitle "Aujourd’hui" with, on the right, a mint chip with gift icon "Exemple : mois 1 gratuit".
Week strip: "Lun 12, Mar 13 (today), Mer 14, Jeu 15, Ven 16, Sam 17, Dim 18".
Lavender card with calendar icon: "Prochain rendez-vous", "13:10 · Prière de midi" (bold), indigo pill "Faire maintenant >".
White card with a vertical timeline (indigo outline circles, thin line): "12:30 Lecture professionnelle — Prendre un temps de lecture et de réflexion.", "13:10 Prière de midi — Un moment pour se tourner vers Dieu.", "18:00 Écoute d’une prédication — Nourrir sa foi par l’enseignement."
Two white half cards: "Mes horaires >" (clock icon), "Mes rappels >" (bell icon).
Three small tinted pills: "Lectures >" (book), "Cultes >" (people icon), "Engagements >" (heart).
Below: white card "Prière Amidah — Matin · Midi · Soir" with link "Lire l’Amidah en français >".
Bottom navigation with "Aujourd’hui" active.
```

### 25 — Habitudes & Défis, engagements — `lv-25-hd-engagements.html`
```
Screen: my commitments. Header: back arrow, wordmark, bell, profile. Small indigo label "HABITUDES & DÉFIS · VIE INTÉRIEURE". Title "Mes engagements" with indigo bar.
Text: "Des repères posés devant Dieu pour garder le cœur libre et la conscience paisible."
Three white cards, each with a heart or hand icon in a lavender circle, a title and one line (example engagements written by the participant): "Engagement 1 — Exemple d’engagement choisi par la personne.", "Engagement 2 — Exemple d’engagement choisi par la personne.", "Engagement 3 — Exemple d’engagement choisi par la personne."
Mint card "Si je manque à un engagement" — "Ton parcours continue : pour ces manquements, rien n’est remis à zéro." with secondary pill "Parler à quelqu’un >".
Bottom navigation with "Aujourd’hui" active.
```

### 26 — Habitudes & Défis, aide et confidentialité — `lv-26-hd-aide.html`
```
Screen: help and privacy for Habits & Challenges. Header: back arrow, wordmark, bell, profile. Small indigo label "HABITUDES & DÉFIS · ASSISTANCE ET RÉGLAGES". Title "Aide et confidentialité" with indigo bar.
Lavender card "Besoin d’aide ?" with two rows and chevrons: "Demander de l’aide à l’équipe", "Parler au coach".
White grouped list "Réglages": "Mes rappels", "Mes horaires".
Mint card "Confidentialité": row "Lire la charte de confidentialité >".
White grouped list "Mes données": "Demander l’export de mes données", "Demander la suppression de mon compte" (red text).
Bottom navigation with "Aujourd’hui" active.
```

### 27 — Amidah, lecture française intégrale — `lv-27-amidah.html`
```
Screen: full French reading of the Amidah prayer. Header: back arrow, centered "Amidah", icon "Aa". No bottom navigation.
Title "L’Amidah" with indigo bar, subtitle "Lecture française intégrale".
Three moment pills: "Matin" (selected, indigo), "Midi", "Soir".
Long reading on a white card in serif (Literata 18 px), with small indigo section headers numbered "1", "2", "3"… and generous spacing. Use neutral placeholder lines "Texte de la bénédiction 1…", "Texte de la bénédiction 2…" (the real text will be inserted later).
Floating indigo pill at the bottom: "Revenir à ma journée".
```

---

## Administration

### 28 — Administration (tableau de bord, téléphone) — `lv-28-admin.html`
```
Screen: team dashboard on phone. Header: wordmark, on the right a pill "Justin · Administrateur". Title "Tableau de bord", subtitle "Aperçu de l’accompagnement", indigo bar. Segmented control "7 j | 30 j".
Horizontal scroll of menu pills: "Tableau de bord" (selected), "Freins & Discernement", "Demandes d’aide", "Participants", "Achats et accès", "Places financées", "Contenus", "Communications", "Annonces", "Incidents".
2×2 grid of tinted figure cards with labels only, numbers shown as "—": "Participants actifs (7 j)", "Demandes d’aide", "Achats en attente", "Places financées".
White card "Demandes d’aide prioritaires" with two example rows: "Mon parcours — Ouverte", "Mon compte — En cours", chevrons, and link "Toutes les demandes >".
Lavender card with lock icon: "Les journaux restent privés. Seules les notes que le participant a choisi de joindre à sa demande sont visibles par l’équipe autorisée."
No participant bottom navigation.
```

---

## Après Stitch
Chaque export est rangé dans le dépôt (branche de maquettes), comparé au prompt, puis intégré dans le vrai site page par page, sans changer les données, les droits ni les fonctions. Toute fonction montrée par une maquette mais absente du site (par exemple une recherche plein texte ou des chiffres d'administration) est signalée et décidée avant d'être construite.
