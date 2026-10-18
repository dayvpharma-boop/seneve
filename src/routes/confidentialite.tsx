import { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Politique de confidentialité (texte validé par Dr Justin Tshims le 18/10/2026 : Cabinet Bethesda,
// Kinshasa, RDC ; contact@drjustintshims.com ; durées de conservation proposées acceptées ; 18 ans).
// Toute modification du texte doit être validée et faire changer la date ci-dessous.
export const DATE_POLITIQUE = '18 octobre 2026';
const CONTACT = 'contact@drjustintshims.com';

const DONNEES: { quoi: string; donnees: string; pourquoi: string }[] = [
  { quoi: 'Test des 7 Racines (sans compte)', donnees: 'Tes réponses, le résultat, la langue et la date. Nous ne te demandons ni nom ni e-mail pour faire le test.', pourquoi: 'Calculer et afficher ton résultat ; compter de façon anonyme combien de personnes font le test.' },
  { quoi: 'Créer ton espace', donnees: 'Adresse e-mail, mot de passe (chiffré : nous ne le voyons jamais), prénom, langue, fuseau horaire.', pourquoi: 'Te permettre de te connecter et de retrouver ton parcours.' },
  { quoi: 'Suivre un parcours', donnees: 'Parcours suivi, jour en cours, actions réalisées ou préparées, réponses à « Qu’est-ce qui t’a freiné ? », objectif choisi.', pourquoi: 'Te montrer le bon contenu chaque jour et ta progression.' },
  { quoi: 'Écrire dans ton journal', donnees: 'Le texte de tes notes.', pourquoi: 'Les garder pour toi. Tes notes sont privées : elles ne sont jamais utilisées pour la publicité. Le coach ne les lit que si tu choisis de les partager avec lui.' },
  { quoi: 'Parler au coach IA', donnees: 'Tes questions, les réponses du coach et les notes que tu as choisi de partager.', pourquoi: 'Te répondre. Le coach est une intelligence artificielle, pas une personne.' },
  { quoi: 'Demander de l’aide', donnees: 'Ton message et, si tu le choisis, des extraits de ton journal.', pourquoi: 'Que l’équipe du Dr Justin Tshims puisse te répondre.' },
  { quoi: 'Acheter un livre ou un parcours (via Chariow)', donnees: 'Nom, e-mail, téléphone, pays, produit, montant, référence de commande. Nous ne recevons jamais les données de ta carte ou de ton compte de paiement.', pourquoi: 'Vérifier le paiement, ouvrir ton accès et t’envoyer la confirmation.' },
  { quoi: 'Recevoir des messages (WhatsApp, e-mail, appels)', donnees: 'Numéro WhatsApp ou e-mail, ton accord, les messages envoyés et leur état (livré ou non).', pourquoi: 'T’envoyer les messages de ton parcours, uniquement si tu l’as accepté.' },
  { quoi: 'Utiliser un code de place financée', donnees: 'Le code utilisé et la date.', pourquoi: 'T’ouvrir l’accès offert.' },
];

const PRESTATAIRES: [string, string, string][] = [
  ['Supabase', 'Base de données et comptes', 'Union européenne (Irlande)'],
  ['n8n, sur un serveur Hostinger', 'Automatisations : messages, paiements, sauvegardes', 'Selon Hostinger'],
  ['Google (Sheets, Drive)', 'Suivi des inscriptions et des messages WhatsApp ; sauvegardes chiffrées', 'Selon Google'],
  ['Meta (WhatsApp Business)', 'Envoi et réception des messages WhatsApp', 'Selon Meta'],
  ['Chariow', 'Paiement des achats', 'Selon Chariow'],
  ['OpenAI', 'Réponses du coach IA', 'États-Unis'],
  ['ElevenLabs', 'Voix de l’assistante Lucie (appels et audios)', 'Selon ElevenLabs'],
  ['GitHub Pages', 'Hébergement du site', 'Selon GitHub'],
  ['Service d’envoi d’e-mails du domaine drjustintshims.com', 'E-mails de confirmation et de suivi', 'Selon le prestataire'],
];

const DUREES: [string, string][] = [
  ['Compte, parcours, journal, échanges avec le coach', 'Tant que ton compte existe ; effacés dans les 30 jours après ta demande de suppression. Après 3 ans sans connexion, le compte peut être supprimé, après un e-mail d’avertissement.'],
  ['Résultats du test faits sans compte', 'Conservés sans nom ni e-mail, pour des statistiques.'],
  ['Achats et paiements', 'Pendant la durée exigée par les obligations comptables et fiscales applicables.'],
  ['Accords et refus de messages', 'Tant que nécessaire pour prouver ton choix, même après un STOP, afin de ne plus te contacter.'],
  ['Journal des messages envoyés', '12 mois.'],
  ['Sauvegardes chiffrées', 'Les 30 dernières (environ 30 jours), puis effacées automatiquement.'],
];

const mail = <a href={`mailto:${CONTACT}`}>{CONTACT}</a>;

export function Confidentialite() {
  useEffect(() => { document.title = 'Confidentialité — SÉNEVÉ'; document.documentElement.lang = 'fr'; }, []);
  return <main className="wrap confidentialite">
    <p className="brand">SÉNEVÉ</p>
    <h1>Politique de confidentialité</h1>
    <p className="muted">Dernière mise à jour : {DATE_POLITIQUE}</p>
    <p>SÉNEVÉ est un compagnon de transformation personnelle fondé sur le livre « Arrête de mendier des miracles » du Dr Justin Tshims. Cette page t’explique simplement quelles données nous utilisons, pourquoi, avec qui elles sont partagées, combien de temps nous les gardons et quels sont tes droits.</p>

    <section aria-labelledby="c1"><h2 id="c1">1. Qui est responsable de tes données ?</h2>
      <p>Le Cabinet Bethesda du Dr Justin Tshims, à Kinshasa (République démocratique du Congo).</p>
      <p>Pour toute question sur tes données : {mail}.</p>
    </section>

    <section aria-labelledby="c2"><h2 id="c2">2. Quelles données, et pourquoi ?</h2>
      {DONNEES.map(d => <div key={d.quoi} className="card conf-carte">
        <h3>{d.quoi}</h3>
        <p><strong>Données :</strong> {d.donnees}</p>
        <p><strong>Pourquoi :</strong> {d.pourquoi}</p>
      </div>)}
      <p><strong>Sur ton téléphone</strong>, le site garde aussi quelques informations : une copie de ta journée pour la consulter sans réseau, un brouillon de note et la racine choisie au test. Elles restent sur ton appareil et sont effacées quand tu te déconnectes ou quand tu vides les données de ton navigateur.</p>
      <p><strong>Pas de publicité, pas de revente.</strong> SÉNEVÉ n’utilise aucun outil de mesure publicitaire et ne vend jamais tes données.</p>
    </section>

    <section aria-labelledby="c3"><h2 id="c3">3. Tes accords pour les messages</h2>
      <ul className="plain">
        <li>Chaque canal a son propre accord : WhatsApp, e-mail et appels.</li>
        <li>Tu peux retirer ton accord à tout moment : sur WhatsApp, écris <strong>STOP</strong> pour tout arrêter, ou <strong>PAUSE</strong> et <strong>ARRÊTER</strong> pour un seul parcours ; pour l’e-mail du matin, va dans ton espace, rubrique « E-mail du matin » ; dans tous les cas, tu peux écrire à {mail}.</li>
        <li>Après un STOP, nous ne te réécrivons pas automatiquement.</li>
      </ul>
    </section>

    <section aria-labelledby="c4"><h2 id="c4">4. Avec qui tes données sont-elles partagées ?</h2>
      <p>Nous travaillons avec des prestataires techniques. Chacun reçoit seulement ce qui est nécessaire à son service.</p>
      <ul className="plain conf-liste">
        {PRESTATAIRES.map(([nom, role, lieu]) => <li key={nom}><strong>{nom}</strong> — {role}. <span className="muted">Lieu : {lieu}.</span></li>)}
      </ul>
      <p>Certains de ces prestataires traitent des données hors de ton pays. Nous ne communiquons tes données à aucune autre personne, sauf si la loi l’exige.</p>
    </section>

    <section aria-labelledby="c5"><h2 id="c5">5. Combien de temps les gardons-nous ?</h2>
      <ul className="plain conf-liste">
        {DUREES.map(([quoi, duree]) => <li key={quoi}><strong>{quoi}</strong> : {duree}</li>)}
      </ul>
    </section>

    <section aria-labelledby="c6"><h2 id="c6">6. Comment tes données sont-elles protégées ?</h2>
      <ul className="plain">
        <li>Chaque personne ne peut voir que ses propres données : des règles d’accès le vérifient dans la base.</li>
        <li>Les mots de passe sont chiffrés.</li>
        <li>Les sauvegardes sont chiffrées et rangées dans un dossier privé.</li>
        <li>Seule l’équipe du Dr Justin Tshims peut accéder à l’administration.</li>
      </ul>
    </section>

    <section aria-labelledby="c7"><h2 id="c7">7. Tes droits</h2>
      <p>Tu peux à tout moment demander à voir les données que nous avons sur toi, à les corriger, à les supprimer (ton compte, ton journal, ton historique), à retirer un accord de message, ou à recevoir une copie de tes données.</p>
      <p>Pour cela, écris à {mail} depuis l’adresse de ton compte. Nous répondons dans un délai de 30 jours.</p>
    </section>

    <section aria-labelledby="c8"><h2 id="c8">8. Âge minimum</h2>
      <p>SÉNEVÉ s’adresse aux adultes : il faut avoir au moins 18 ans pour créer un espace.</p>
    </section>

    <section aria-labelledby="c9"><h2 id="c9">9. Changements</h2>
      <p>Si cette politique change, la date en haut de la page est mise à jour. En cas de changement important, nous te prévenons dans ton espace ou par e-mail.</p>
    </section>

    <div className="today-foot"><Link className="link" to="/">Test des 7 Racines</Link><Link className="link" to="/espace">Mon espace</Link></div>
  </main>;
}
