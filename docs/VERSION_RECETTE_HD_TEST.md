# Version isolée pour la recette Auth Habitudes & Défis

Entrée dédiée `recette-hd.html` / `src/recette-habitudes.tsx` : connexion existante, préinscription HD existante et confidentialité. Bandeau TEST permanent dans les deux langues. Les autres destinations affichent un retour vers la préinscription. Aucun routeur d’achat, coach, administration, journal ou service worker n’est monté.

Construction : `VITE_SUPABASE_URL=https://rlojnuaajeubzlwofwhn.supabase.co VITE_SUPABASE_KEY=<clé publiable TEST> node scripts/recette/habitudes-build-test.mjs`.

La commande refuse une URL absente ou différente de TEST et une clé sans format publiable. Elle active HD et fixe la base à `/seneve/recette-hd/`. Sortie distincte `dist-recette-hd`, copies des routes fixes et 404 pour GitHub Pages, service worker copié retiré. Vérification du JavaScript produit : référence TEST présente et référence du projet PROD absente. Aucun appel Auth ni e-mail dans le script. La clé publique n’est pas un droit serveur ; les contrôles Auth/RLS/RPC restent applicables.

La version utilise le miroir local pour la première compilation ; le déploiement doit reconstruire depuis un commit exact du dépôt. La disponibilité de l’offre et le démarrage ne sont pas simulés : TEST ne contient actuellement aucun mapping HD actif ni offre HD ouverte. La recette de confirmation ne doit pas ouvrir une offre réelle.

Les retours vers la version isolée seront :

- `https://dayvpharma-boop.github.io/seneve/recette-hd/habitudes/inscription?lang=fr`
- `https://dayvpharma-boop.github.io/seneve/recette-hd/habitudes/inscription?lang=en`

Ces deux adresses diffèrent des retours à la racine déjà autorisés sur TEST. Elles doivent être autorisées avant une recette e-mail réelle. Aucun consentement à envoyer un e-mail ni destinataire de recette n’est présumé. L’envoi/confirmation réel reste à effectuer avec une adresse explicitement autorisée.

Vérification initiale : refus sans configuration TEST, compilation réussie et TypeScript réussi. Pas de recette visuelle locale : le navigateur distant ne peut pas joindre le serveur local, comme documenté précédemment.
