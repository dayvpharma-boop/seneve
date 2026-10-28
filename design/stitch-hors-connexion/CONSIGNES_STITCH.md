# Consignes Stitch — écrans hors connexion SÉNEVÉ

Version : 28 octobre 2026 — statut : **proposé, à valider**.
Source : inventaire du 28/10/2026 (`claude/inventaire_hors_connexion_2026-10-28.md`) et cahier des charges n° 12.

## Mode d'emploi

1. Ouvrir Stitch (stitch.withgoogle.com), mode **App** (téléphone).
2. Coller d'abord le **bloc commun**, puis le bloc de l'écran, dans le même message.
3. Générer en français. Pour l'anglais, demander ensuite dans le même projet : « Make the English version of this screen, same layout, with these exact texts: … » (textes anglais fournis sous chaque écran).
4. Exporter chaque écran en HTML et le nommer comme indiqué (ex. `hc-01-premiere-visite.html`).

Vérification : chaque écran doit afficher **exactement** les textes fournis. Stitch ajoute parfois des promesses (« tes données sont en sécurité », « synchronisation automatique ») : les retirer, elles ne sont pas réalisées.

---

## Bloc commun (à coller avant chaque écran)

```
Application web mobile SÉNEVÉ, compagnon quotidien de transformation personnelle fondé sur un livre chrétien. Ton calme, sobre, bienveillant, jamais alarmant.
Style : reprendre exactement le système déjà utilisé.
- Fond crème #fef9ea, cartes #f8f4e4 et #ffffff, bordures #ede8d9.
- Texte principal #1d1c13, texte secondaire #48473e, contours #7e7665.
- Couleur principale or brun #584400 (boutons pleins, texte blanc), accent or #755b00, or clair #e6c366 pour de petits détails.
- Erreur seulement si nécessaire : #ba1a1a.
- Titres et textes en Literata (serif) ; libellés, boutons et navigation en Work Sans.
- Icônes Material Symbols arrondies, traits fins.
- Coins arrondis 12 à 16 px, ombres très légères, beaucoup d'espace.
- Largeur téléphone 390 px, zones tactiles d'au moins 44 px, contraste lisible.
Règles : utiliser uniquement les textes fournis, en français, sans en ajouter. Ne pas inventer de fonction. Aucune illustration de personne. Pas de nuage barré dramatique : une petite icône « wifi_off » suffit.
```

---

## Écran 1 — Première visite sans réseau

Fichier : `hc-01-premiere-visite.html`
Cas : la personne ouvre SÉNEVÉ sans réseau et rien n'a encore été gardé sur son téléphone.

```
Écran plein, centré verticalement, sans barre de navigation.
En haut : le mot « SÉNEVÉ » en Literata, petit, couleur #584400, avec un petit grain stylisé.
Icône wifi_off dans un cercle #f8f4e4.
Titre : « Pas de connexion »
Texte : « SÉNEVÉ n’a encore rien gardé sur cet appareil. Connecte-toi une première fois à Internet : ensuite, les pages déjà ouvertes resteront lisibles sans réseau. »
Bouton plein : « Réessayer »
Petit texte en bas, gris : « Vérifie le Wi-Fi ou les données mobiles. »
```

Anglais : « No connection » / « SÉNEVÉ has not saved anything on this device yet. Connect to the Internet once: after that, the pages you have opened will stay readable without a network. » / « Try again » / « Check your Wi-Fi or mobile data. »

---

## Écran 2 — Modèle commun « cette page demande une connexion »

Fichier : `hc-02-connexion-necessaire.html`
Sert à : Coach, Aide, Offres et accès, Paiement, Réglages, Connexion. Seuls le titre et la phrase du milieu changent.

```
Écran avec un en-tête simple (flèche retour à gauche, titre de page « Coach ») et la barre de navigation du bas de l’application (Aujourd’hui, Journal, Coach, Progrès, Profil) avec « Coach » actif.
Au centre, une carte #ffffff :
- icône wifi_off dans un cercle #f8f4e4
- titre : « Tu es hors connexion »
- texte : « Le coach a besoin d’Internet pour te répondre. Ta question n’a pas été envoyée. »
- bouton plein : « Réessayer »
- lien texte en dessous : « Relire ma journée »
Sous la carte, une petite note grise : « Les journées déjà ouvertes restent lisibles sans réseau. »
Ajouter à côté, en petit, trois variantes de la seule phrase du milieu pour montrer le modèle :
- Aide : « Ta demande d’aide sera envoyée quand la connexion sera revenue. Rien n’est parti pour l’instant. »
- Offres : « Les offres et tes accès doivent être vérifiés en ligne. Aucun achat n’est possible sans connexion. »
- Connexion : « La connexion à ton compte demande Internet. »
```

Anglais : « You are offline » / « The coach needs the Internet to answer you. Your question has not been sent. » / « Try again » / « Reread my day » / « Days you have already opened stay readable without a network. » — Aide : « Your help request will be sent once you are back online. Nothing has been sent yet. » — Offres : « Offers and your access must be checked online. No purchase is possible without a connection. » — Connexion : « Signing in to your account needs the Internet. »

> Attention : la phrase « sera envoyée quand la connexion sera revenue » suppose une file d'envoi qui **n'existe pas encore** pour l'aide. Tant qu'elle n'est pas réalisée, utiliser : « Ta demande n’a pas été envoyée. Réessaie quand la connexion sera revenue. »

---

## Écran 3 — Journal hors connexion avec brouillon

Fichier : `hc-03-journal-brouillon.html`
Reprend le comportement **déjà réalisé** dans l'espace : brouillon gardé sur l'appareil, sans envoi automatique.

```
En-tête « Mon journal », barre de navigation du bas avec « Journal » actif.
En haut, bandeau discret #f8f4e4 avec icône wifi_off : « Hors connexion. Tes notes déjà enregistrées s’afficheront au retour du réseau. »
Carte principale #ffffff :
- petite étiquette avec icône edit_note : « Brouillon sur cet appareil »
- question du jour en Literata italique : « Quelle petite action as-tu posée aujourd’hui ? »
- grande zone de texte, placeholder : « Écris ici en toute liberté… »
- bouton secondaire avec icône save : « Conserver le brouillon »
- sous le bouton, petit état avec icône inventory_2 : « Brouillon conservé sur cet appareil. Pas encore enregistré dans ton journal. »
En bas de carte, petit texte gris : « Un brouillon peut être effacé si le navigateur libère de la place. »
```

Anglais : « Offline. Your saved notes will appear when you are back online. » / « Draft on this device » / « What small action did you take today? » / « Write freely here… » / « Keep draft » / « Draft kept on this device. Not saved to your journal yet. » / « A draft may be erased if the browser frees up space. »

> La question du jour est un exemple de maquette ; dans l'application, c'est la consigne publiée qui s'affiche.

---

## Écran 4 — Progrès en lecture seule

Fichier : `hc-04-progres-lecture-seule.html`
**Proposé, non réalisé** : aujourd'hui Progrès n'a aucune copie locale.

```
En-tête « Mes progrès », barre de navigation avec « Progrès » actif.
Bandeau #f8f4e4 avec icône wifi_off : « Copie du 28 octobre à 18:40. Reconnecte-toi pour voir tes progrès à jour. » et lien « Réessayer ».
Dessous, la page de progrès en légère transparence (opacité 90 %) :
- carte « Actions réalisées » avec le chiffre 9 et le texte « sur les journées déjà commencées »
- une rangée de 7 pastilles pour la semaine (réalisée, en partie, non commencée), avec une légende
- carte « Racine travaillée : Fidélité dans les petites choses »
Pas de bouton d’action modifiable sur cet écran.
```

Anglais : « Copy from 28 October at 18:40. Reconnect to see your up-to-date progress. » / « Try again » / « Actions done » / « on the days already started » / « Root in progress: Faithfulness in small things ».

> Chiffres et date fictifs pour la maquette.

---

## Écran 5 — Habitudes aujourd'hui hors connexion

Fichier : `hc-05-habitudes-hors-connexion.html`
Les Habitudes & Défis ne sont **pas** gardées sur l'appareil (choix existant). L'écran le dit honnêtement.

```
En-tête « Habitudes & Défis — Aujourd’hui », barre de navigation de l’application.
Carte centrale #ffffff :
- icône wifi_off dans un cercle #f8f4e4
- titre : « Tes habitudes du jour demandent une connexion »
- texte : « Pour protéger tes données, les habitudes ne sont pas gardées sur cet appareil. Tu pourras noter ce que tu as fait dès que le réseau reviendra. »
- bouton plein : « Réessayer »
Dessous, carte secondaire #f8f4e4 « En attendant » avec deux liens en liste :
- icône menu_book : « Lire la Bible »
- icône wb_sunny : « Relire ma journée »
```

Anglais : « Your habits for today need a connection » / « To protect your data, habits are not kept on this device. You can record what you did as soon as the network is back. » / « Try again » / « Meanwhile » / « Read the Bible » / « Reread my day ».

---

## Écran 6 — Badge d'état de sauvegarde

Fichier : `hc-06-etats-sauvegarde.html`
**Proposé, non réalisé** : composant à afficher sous une action (ex. « J’ai fait mon action »). Exigé par le cahier n° 12 (§7 et §16).

```
Planche de composants sur fond #fef9ea, titre « États de sauvegarde ».
Une carte d’action exemple : « Action du jour : mettre de côté la dîme de la semaine » avec un bouton « J’ai fait mon action ».
En dessous, 5 versions du petit badge (pilule arrondie, Work Sans 13 px, icône à gauche), chacune avec sa phrase d’explication en dessous :
1. icône smartphone, fond #f8f4e4, texte #48473e : « Enregistré sur cet appareil » — « Pas encore envoyé à SÉNEVÉ. »
2. icône schedule, fond #f8f4e4, texte #755b00 : « En attente de connexion » — « Sera envoyé au retour du réseau. »
3. icône sync, fond #f8f4e4, texte #584400 : « Envoi en cours… »
4. icône check_circle, fond #e6c366 à 25 %, texte #584400 : « Enregistré » — « Reçu par SÉNEVÉ. »
5. icône error, fond #ba1a1a à 10 %, texte #ba1a1a : « Non enregistré » — « Ton accès doit être vérifié. Réessaie ou demande de l’aide. » avec deux petits liens « Réessayer » et « Demander de l’aide ».
```

Anglais : « Saved on this device » / « Not sent to SÉNEVÉ yet. » / « Waiting for connection » / « Will be sent when the network is back. » / « Sending… » / « Saved » / « Received by SÉNEVÉ. » / « Not saved » / « Your access needs to be checked. Try again or ask for help. » / « Try again » / « Ask for help ».

> Exemple d'action fictif, à remplacer par une action publiée.

---

## Après Stitch

Les maquettes servent de référence visuelle. L'intégration se fait dans le code existant (React), page par page, avec tests, puis publication par le circuit GitHub habituel. Les écrans 4 et 6 demandent en plus de vraies fonctions (copie locale de Progrès, file d'actions) : à décider avant intégration.
