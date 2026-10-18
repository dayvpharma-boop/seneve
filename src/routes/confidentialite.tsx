import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

// Politique de confidentialité (texte validé par Dr Justin Tshims le 18/10/2026 : Cabinet Bethesda,
// Kinshasa, RDC ; contact@drjustintshims.com ; durées de conservation proposées acceptées ; 18 ans).
// Toute modification du texte doit être validée et faire changer la date ci-dessous.
// La version anglaise (?lang=en) est une traduction du texte français, qui fait foi.
export const DATE_POLITIQUE = '18 octobre 2026';
export const DATE_POLITIQUE_EN = '18 October 2026';
const CONTACT = 'contact@drjustintshims.com';

type Ligne = { quoi: string; donnees: string; pourquoi: string };
const DONNEES: Ligne[] = [
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


const DONNEES_EN: Ligne[] = [
  { quoi: '7 Roots Test (no account)', donnees: 'Your answers, the result, the language and the date. We do not ask for your name or email to take the test.', pourquoi: 'To calculate and show your result; to count anonymously how many people take the test.' },
  { quoi: 'Creating your space', donnees: 'Email address, password (encrypted: we never see it), first name, language, time zone.', pourquoi: 'To let you sign in and find your journey again.' },
  { quoi: 'Following a journey', donnees: 'Journey followed, current day, actions completed or prepared, answers to “What held you back?”, chosen goal.', pourquoi: 'To show you the right content each day and your progress.' },
  { quoi: 'Writing in your journal', donnees: 'The text of your notes.', pourquoi: 'To keep them for you. Your notes are private: they are never used for advertising. The coach only reads them if you choose to share them with it.' },
  { quoi: 'Talking to the AI coach', donnees: 'Your questions, the coach’s answers and the notes you chose to share.', pourquoi: 'To answer you. The coach is an artificial intelligence, not a person.' },
  { quoi: 'Asking for help', donnees: 'Your message and, if you choose, extracts from your journal.', pourquoi: 'So that Dr Justin Tshims’s team can answer you.' },
  { quoi: 'Buying a book or a journey (via Chariow)', donnees: 'Name, email, phone, country, product, amount, order reference. We never receive your card or payment account details.', pourquoi: 'To check the payment, open your access and send you the confirmation.' },
  { quoi: 'Receiving messages (WhatsApp, email, calls)', donnees: 'WhatsApp number or email, your consent, the messages sent and their status (delivered or not).', pourquoi: 'To send you the messages of your journey, only if you have agreed.' },
  { quoi: 'Using a sponsored place code', donnees: 'The code used and the date.', pourquoi: 'To open the access offered to you.' },
];

const PRESTATAIRES_EN: [string, string, string][] = [
  ['Supabase', 'Database and accounts', 'European Union (Ireland)'],
  ['n8n, on a Hostinger server', 'Automations: messages, payments, backups', 'As set by Hostinger'],
  ['Google (Sheets, Drive)', 'Tracking sign-ups and WhatsApp messages; encrypted backups', 'As set by Google'],
  ['Meta (WhatsApp Business)', 'Sending and receiving WhatsApp messages', 'As set by Meta'],
  ['Chariow', 'Payment for purchases', 'As set by Chariow'],
  ['OpenAI', 'AI coach answers', 'United States'],
  ['ElevenLabs', 'Voice of the assistant Lucie (calls and audio)', 'As set by ElevenLabs'],
  ['GitHub Pages', 'Website hosting', 'As set by GitHub'],
  ['Email service of the drjustintshims.com domain', 'Confirmation and follow-up emails', 'As set by the provider'],
];

const DUREES_EN: [string, string][] = [
  ['Account, journey, journal, conversations with the coach', 'As long as your account exists; erased within 30 days of your request for deletion. After 3 years without signing in, the account may be deleted, after a warning email.'],
  ['Test results without an account', 'Kept without name or email, for statistics.'],
  ['Purchases and payments', 'For as long as required by the applicable accounting and tax obligations.'],
  ['Consents and refusals for messages', 'As long as needed to prove your choice, even after a STOP, so that we no longer contact you.'],
  ['Log of messages sent', '12 months.'],
  ['Encrypted backups', 'The last 30 (about 30 days), then erased automatically.'],
];

const mail = <a href={`mailto:${CONTACT}`}>{CONTACT}</a>;

/** Textes de la page, en français (texte de référence) et en anglais (traduction). */
const PAGE = {
  fr: {
    titrePage: 'Confidentialité — SÉNEVÉ', titre: 'Politique de confidentialité', maj: `Dernière mise à jour : ${DATE_POLITIQUE}`, autreLangue: 'English', lienAutre: '/confidentialite?lang=en',
    intro: 'SÉNEVÉ est un compagnon de transformation personnelle fondé sur le livre « Arrête de mendier des miracles » du Dr Justin Tshims. Cette page t’explique simplement quelles données nous utilisons, pourquoi, avec qui elles sont partagées, combien de temps nous les gardons et quels sont tes droits.',
    s1: '1. Qui est responsable de tes données ?', responsable: 'Le Cabinet Bethesda du Dr Justin Tshims, à Kinshasa (République démocratique du Congo).', question: 'Pour toute question sur tes données : ',
    s2: '2. Quelles données, et pourquoi ?', donnees: 'Données :', pourquoi: 'Pourquoi :', lignes: DONNEES,
    telephoneTitre: 'Sur ton téléphone', telephone: ', le site garde aussi quelques informations : une copie de ta journée pour la consulter sans réseau, un brouillon de note et la racine choisie au test. Elles restent sur ton appareil et sont effacées quand tu te déconnectes ou quand tu vides les données de ton navigateur.',
    pubTitre: 'Pas de publicité, pas de revente.', pub: ' SÉNEVÉ n’utilise aucun outil de mesure publicitaire et ne vend jamais tes données.',
    s3: '3. Tes accords pour les messages', canaux: 'Chaque canal a son propre accord : WhatsApp, e-mail et appels.',
    retrait: <>Tu peux retirer ton accord à tout moment : sur WhatsApp, écris <strong>STOP</strong> pour tout arrêter, ou <strong>PAUSE</strong> et <strong>ARRÊTER</strong> pour un seul parcours ; pour l’e-mail du matin, va dans ton espace, rubrique « E-mail du matin » ; dans tous les cas, tu peux écrire à {mail}.</>,
    apresStop: 'Après un STOP, nous ne te réécrivons pas automatiquement.',
    s4: '4. Avec qui tes données sont-elles partagées ?', prestIntro: 'Nous travaillons avec des prestataires techniques. Chacun reçoit seulement ce qui est nécessaire à son service.', lieu: 'Lieu : ', prestataires: PRESTATAIRES,
    horsPays: 'Certains de ces prestataires traitent des données hors de ton pays. Nous ne communiquons tes données à aucune autre personne, sauf si la loi l’exige.',
    s5: '5. Combien de temps les gardons-nous ?', durees: DUREES,
    s6: '6. Comment tes données sont-elles protégées ?', protections: ['Chaque personne ne peut voir que ses propres données : des règles d’accès le vérifient dans la base.', 'Les mots de passe sont chiffrés.', 'Les sauvegardes sont chiffrées et rangées dans un dossier privé.', 'Seule l’équipe du Dr Justin Tshims peut accéder à l’administration.'],
    s7: '7. Tes droits', droits: 'Tu peux à tout moment demander à voir les données que nous avons sur toi, à les corriger, à les supprimer (ton compte, ton journal, ton historique), à retirer un accord de message, ou à recevoir une copie de tes données.',
    exercer: <>Pour cela, écris à {mail} depuis l’adresse de ton compte. Nous répondons dans un délai de 30 jours.</>,
    s8: '8. Âge minimum', age: 'SÉNEVÉ s’adresse aux adultes : il faut avoir au moins 18 ans pour créer un espace.',
    s9: '9. Changements', changements: 'Si cette politique change, la date en haut de la page est mise à jour. En cas de changement important, nous te prévenons dans ton espace ou par e-mail.',
    traduction: null as string | null, test: 'Test des 7 Racines', lienTest: '/', espace: 'Mon espace',
  },
  en: {
    titrePage: 'Privacy — SÉNEVÉ', titre: 'Privacy policy', maj: `Last updated: ${DATE_POLITIQUE_EN}`, autreLangue: 'Français', lienAutre: '/confidentialite',
    intro: 'SÉNEVÉ is a personal transformation companion based on the book “Stop Begging for Miracles” by Dr Justin Tshims. This page explains simply which data we use, why, who it is shared with, how long we keep it and what your rights are.',
    s1: '1. Who is responsible for your data?', responsable: 'Cabinet Bethesda of Dr Justin Tshims, in Kinshasa (Democratic Republic of the Congo).', question: 'For any question about your data: ',
    s2: '2. Which data, and why?', donnees: 'Data:', pourquoi: 'Why:', lignes: DONNEES_EN,
    telephoneTitre: 'On your phone', telephone: ', the site also keeps a little information: a copy of your day so you can read it without a network, a draft note and the root chosen in the test. It stays on your device and is erased when you sign out or clear your browser data.',
    pubTitre: 'No advertising, no resale.', pub: ' SÉNEVÉ uses no advertising tracking tools and never sells your data.',
    s3: '3. Your consent to messages', canaux: 'Each channel has its own consent: WhatsApp, email and calls.',
    retrait: <>You can withdraw your consent at any time: on WhatsApp, write <strong>STOP</strong> to stop everything, or <strong>PAUSE</strong> and <strong>ARRÊTER</strong> for a single journey; for the morning email, go to your space, section “Morning e-mail”; in every case, you can write to {mail}.</>,
    apresStop: 'After a STOP, we do not write to you again automatically.',
    s4: '4. Who is your data shared with?', prestIntro: 'We work with technical providers. Each one receives only what is needed for its service.', lieu: 'Location: ', prestataires: PRESTATAIRES_EN,
    horsPays: 'Some of these providers process data outside your country. We do not share your data with anyone else, unless the law requires it.',
    s5: '5. How long do we keep it?', durees: DUREES_EN,
    s6: '6. How is your data protected?', protections: ['Each person can only see their own data: access rules check this in the database.', 'Passwords are encrypted.', 'Backups are encrypted and stored in a private folder.', 'Only Dr Justin Tshims’s team can access the administration.'],
    s7: '7. Your rights', droits: 'You can ask at any time to see the data we hold about you, to correct it, to delete it (your account, your journal, your history), to withdraw a consent to messages, or to receive a copy of your data.',
    exercer: <>To do so, write to {mail} from your account’s email address. We answer within 30 days.</>,
    s8: '8. Minimum age', age: 'SÉNEVÉ is for adults: you must be at least 18 years old to create a space.',
    s9: '9. Changes', changements: 'If this policy changes, the date at the top of the page is updated. In case of an important change, we let you know in your space or by email.',
    traduction: 'This English version is a translation. If there is any difference, the French version applies.' as string | null, test: '7 Roots Test', lienTest: '/?lang=en', espace: 'My space',
  },
};

export function Confidentialite() {
  const [search] = useSearchParams();
  const langue = search.get('lang') === 'en' ? 'en' : 'fr';
  const P = PAGE[langue];
  useEffect(() => { document.title = P.titrePage; document.documentElement.lang = langue; }, [P, langue]);
  return <main className="wrap confidentialite">
    <header className="today-head"><div><p className="brand">SÉNEVÉ</p><h1>{P.titre}</h1></div><Link className="link language-link" to={P.lienAutre}>{P.autreLangue}</Link></header>
    <p className="muted">{P.maj}</p>
    {P.traduction && <p className="muted">{P.traduction}</p>}
    <p>{P.intro}</p>

    <section aria-labelledby="c1"><h2 id="c1">{P.s1}</h2>
      <p>{P.responsable}</p>
      <p>{P.question}{mail}.</p>
    </section>

    <section aria-labelledby="c2"><h2 id="c2">{P.s2}</h2>
      {P.lignes.map(d => <div key={d.quoi} className="card conf-carte">
        <h3>{d.quoi}</h3>
        <p><strong>{P.donnees}</strong> {d.donnees}</p>
        <p><strong>{P.pourquoi}</strong> {d.pourquoi}</p>
      </div>)}
      <p><strong>{P.telephoneTitre}</strong>{P.telephone}</p>
      <p><strong>{P.pubTitre}</strong>{P.pub}</p>
    </section>

    <section aria-labelledby="c3"><h2 id="c3">{P.s3}</h2>
      <ul className="plain">
        <li>{P.canaux}</li>
        <li>{P.retrait}</li>
        <li>{P.apresStop}</li>
      </ul>
    </section>

    <section aria-labelledby="c4"><h2 id="c4">{P.s4}</h2>
      <p>{P.prestIntro}</p>
      <ul className="plain conf-liste">
        {P.prestataires.map(([nom, role, lieu]) => <li key={nom}><strong>{nom}</strong> — {role}. <span className="muted">{P.lieu}{lieu}.</span></li>)}
      </ul>
      <p>{P.horsPays}</p>
    </section>

    <section aria-labelledby="c5"><h2 id="c5">{P.s5}</h2>
      <ul className="plain conf-liste">
        {P.durees.map(([quoi, duree]) => <li key={quoi}><strong>{quoi}</strong>{langue === 'en' ? ': ' : ' : '}{duree}</li>)}
      </ul>
    </section>

    <section aria-labelledby="c6"><h2 id="c6">{P.s6}</h2>
      <ul className="plain">{P.protections.map(x => <li key={x}>{x}</li>)}</ul>
    </section>

    <section aria-labelledby="c7"><h2 id="c7">{P.s7}</h2>
      <p>{P.droits}</p>
      <p>{P.exercer}</p>
    </section>

    <section aria-labelledby="c8"><h2 id="c8">{P.s8}</h2>
      <p>{P.age}</p>
    </section>

    <section aria-labelledby="c9"><h2 id="c9">{P.s9}</h2>
      <p>{P.changements}</p>
    </section>

    <div className="today-foot"><Link className="link" to={P.lienTest}>{P.test}</Link><Link className="link" to="/espace">{P.espace}</Link></div>
  </main>;
}
