import { useEffect } from 'react';
import { Icone } from '@/components/Icone';
import { IconeConfidentialite } from '@/components/IconeConfidentialite';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

// Politique de confidentialité (texte validé par Dr Justin Tshims le 18/10/2026 : Cabinet Bethesda,
// Kinshasa, RDC ; contact@drjustintshims.com ; durées de conservation proposées acceptées ; 18 ans).
// Toute modification du texte doit être validée et faire changer la date ci-dessous.
// Traduction anglaise du 22/10/2026 (?lang=en) : fidèle au texte français, qui fait foi.
export const DATE_POLITIQUE = '18 octobre 2026';
const DATE_POLITIQUE_EN = '18 October 2026';
const CONTACT = 'contact@drjustintshims.com';

type Donnee = { quoi: string; donnees: string; pourquoi: string };
const DONNEES: Record<'fr' | 'en', Donnee[]> = {
  fr: [
    { quoi: 'Test des 7 Racines (sans compte)', donnees: 'Tes réponses, le résultat, la langue et la date. Nous ne te demandons ni nom ni e-mail pour faire le test.', pourquoi: 'Calculer et afficher ton résultat ; compter de façon anonyme combien de personnes font le test.' },
    { quoi: 'Créer ton espace', donnees: 'Adresse e-mail, mot de passe (chiffré : nous ne le voyons jamais), prénom, langue, fuseau horaire.', pourquoi: 'Te permettre de te connecter et de retrouver ton parcours.' },
    { quoi: 'Suivre un parcours', donnees: 'Parcours suivi, jour en cours, actions réalisées ou préparées, réponses à « Qu’est-ce qui t’a freiné ? », objectif choisi.', pourquoi: 'Te montrer le bon contenu chaque jour et ta progression.' },
    { quoi: 'Écrire dans ton journal', donnees: 'Le texte de tes notes.', pourquoi: 'Les garder pour toi. Tes notes sont privées : elles ne sont jamais utilisées pour la publicité. Le coach ne les lit que si tu choisis de les partager avec lui.' },
    { quoi: 'Parler au coach IA', donnees: 'Tes questions, les réponses du coach et les notes que tu as choisi de partager.', pourquoi: 'Te répondre. Le coach est une intelligence artificielle, pas une personne.' },
    { quoi: 'Demander de l’aide', donnees: 'Ton message et, si tu le choisis, des extraits de ton journal.', pourquoi: 'Que l’équipe du Dr Justin Tshims puisse te répondre.' },
    { quoi: 'Acheter un livre ou un parcours (via Chariow)', donnees: 'Nom, e-mail, téléphone, pays, produit, montant, référence de commande. Nous ne recevons jamais les données de ta carte ou de ton compte de paiement.', pourquoi: 'Vérifier le paiement, ouvrir ton accès et t’envoyer la confirmation.' },
    { quoi: 'Recevoir des messages (WhatsApp, e-mail, appels)', donnees: 'Numéro WhatsApp ou e-mail, ton accord, les messages envoyés et leur état (livré ou non).', pourquoi: 'T’envoyer les messages de ton parcours, uniquement si tu l’as accepté.' },
    { quoi: 'Utiliser un code de place financée', donnees: 'Le code utilisé et la date.', pourquoi: 'T’ouvrir l’accès offert.' },
  ],
  en: [
    { quoi: '7 Roots Test (without an account)', donnees: 'Your answers, the result, the language and the date. We do not ask for your name or email to take the test.', pourquoi: 'Calculate and show your result; count anonymously how many people take the test.' },
    { quoi: 'Creating your space', donnees: 'Email address, password (encrypted: we never see it), first name, language, time zone.', pourquoi: 'Let you sign in and find your journey.' },
    { quoi: 'Following a journey', donnees: 'Journey followed, current day, actions completed or prepared, answers to “What held you back?”, chosen goal.', pourquoi: 'Show you the right content each day and your progress.' },
    { quoi: 'Writing in your journal', donnees: 'The text of your notes.', pourquoi: 'Keep them for you. Your notes are private: they are never used for advertising. The coach only reads them if you choose to share them with it.' },
    { quoi: 'Talking to the AI coach', donnees: 'Your questions, the coach’s answers and the notes you chose to share.', pourquoi: 'Answer you. The coach is an artificial intelligence, not a person.' },
    { quoi: 'Asking for help', donnees: 'Your message and, if you choose, excerpts from your journal.', pourquoi: 'So that Dr Justin Tshims’s team can answer you.' },
    { quoi: 'Buying a book or a journey (through Chariow)', donnees: 'Name, email, phone, country, product, amount, order reference. We never receive your card or payment account details.', pourquoi: 'Check the payment, open your access and send you the confirmation.' },
    { quoi: 'Receiving messages (WhatsApp, email, calls)', donnees: 'WhatsApp number or email, your consent, the messages sent and their status (delivered or not).', pourquoi: 'Send you your journey’s messages, only if you have agreed.' },
    { quoi: 'Using a funded place code', donnees: 'The code used and the date.', pourquoi: 'Open the access offered to you.' },
  ],
};

const PRESTATAIRES: Record<'fr' | 'en', [string, string, string][]> = {
  fr: [
    ['Supabase', 'Base de données et comptes', 'Union européenne (Irlande)'],
    ['n8n, sur un serveur Hostinger', 'Automatisations : messages, paiements, sauvegardes', 'Selon Hostinger'],
    ['Google (Sheets, Drive)', 'Suivi des inscriptions et des messages WhatsApp ; sauvegardes chiffrées', 'Selon Google'],
    ['Meta (WhatsApp Business)', 'Envoi et réception des messages WhatsApp', 'Selon Meta'],
    ['Chariow', 'Paiement des achats', 'Selon Chariow'],
    ['OpenAI', 'Réponses du coach IA', 'États-Unis'],
    ['ElevenLabs', 'Voix de l’assistante Lucie (appels et audios)', 'Selon ElevenLabs'],
    ['GitHub Pages', 'Hébergement du site', 'Selon GitHub'],
    ['Service d’envoi d’e-mails du domaine drjustintshims.com', 'E-mails de confirmation et de suivi', 'Selon le prestataire'],
  ],
  en: [
    ['Supabase', 'Database and accounts', 'European Union (Ireland)'],
    ['n8n, on a Hostinger server', 'Automations: messages, payments, backups', 'As set by Hostinger'],
    ['Google (Sheets, Drive)', 'Tracking of sign-ups and WhatsApp messages; encrypted backups', 'As set by Google'],
    ['Meta (WhatsApp Business)', 'Sending and receiving WhatsApp messages', 'As set by Meta'],
    ['Chariow', 'Payment for purchases', 'As set by Chariow'],
    ['OpenAI', 'AI coach answers', 'United States'],
    ['ElevenLabs', 'Voice of the assistant Lucie (calls and audio)', 'As set by ElevenLabs'],
    ['GitHub Pages', 'Website hosting', 'As set by GitHub'],
    ['Email service of the drjustintshims.com domain', 'Confirmation and follow-up emails', 'As set by the provider'],
  ],
};

const DUREES: Record<'fr' | 'en', [string, string][]> = {
  fr: [
    ['Compte, parcours, journal, échanges avec le coach', 'Tant que ton compte existe ; effacés dans les 30 jours après ta demande de suppression. Après 3 ans sans connexion, le compte peut être supprimé, après un e-mail d’avertissement.'],
    ['Résultats du test faits sans compte', 'Conservés sans nom ni e-mail, pour des statistiques.'],
    ['Achats et paiements', 'Pendant la durée exigée par les obligations comptables et fiscales applicables.'],
    ['Accords et refus de messages', 'Tant que nécessaire pour prouver ton choix, même après un STOP, afin de ne plus te contacter.'],
    ['Journal des messages envoyés', '12 mois.'],
    ['Sauvegardes chiffrées', 'Les 30 dernières (environ 30 jours), puis effacées automatiquement.'],
  ],
  en: [
    ['Account, journey, journal, conversations with the coach', 'As long as your account exists; deleted within 30 days of your deletion request. After 3 years without signing in, the account may be deleted, after a warning email.'],
    ['Test results without an account', 'Kept without name or email, for statistics.'],
    ['Purchases and payments', 'For the period required by the applicable accounting and tax obligations.'],
    ['Message consents and refusals', 'As long as needed to prove your choice, even after a STOP, so that we no longer contact you.'],
    ['Log of messages sent', '12 months.'],
    ['Encrypted backups', 'The last 30 (about 30 days), then deleted automatically.'],
  ],
};

const TEXTES = {
  fr: {
    titreOnglet: 'Confidentialité', revenir: 'Revenir', repere: 'Édition & Éthique', titre: 'Politique de confidentialité', maj: (d: string) => `Dernière mise à jour : ${d}`,
    alt: 'Un carnet relié dans la lumière naturelle', legende: 'Pas de publicité, pas de revente.', resume: 'En un coup d’œil',
    gardons: 'Ce que nous gardons', jamais: 'Ce que nous ne faisons jamais', jamaisTexte: 'SÉNEVÉ n’utilise aucun outil de mesure publicitaire et ne vend jamais tes données.',
    journal: 'Qui peut lire ton journal', journalTexte: 'Ton journal est privé. Tu choisis les notes autorisées au coach IA et les extraits transmis à l’équipe.',
    effacement: 'Comment demander l’effacement', ecris: (m: React.ReactNode) => <>Pour cela, écris à {m} depuis l’adresse de ton compte.</>,
    demanderSuppression: 'Demander la suppression de mes données', sujetSuppression: 'Demande%20de%20suppression%20de%20mes%20donn%C3%A9es',
    presentation: 'SÉNEVÉ est un compagnon de transformation personnelle fondé sur le livre « Arrête de mendier des miracles » du Dr Justin Tshims. Cette page t’explique simplement quelles données nous utilisons, pourquoi, avec qui elles sont partagées, combien de temps nous les gardons et quels sont tes droits.',
    traduction: null as string | null,
    s1: '1. Qui est responsable de tes données ?', responsable: 'Le Cabinet Bethesda du Dr Justin Tshims, à Kinshasa (République démocratique du Congo).', question: (m: React.ReactNode) => <>Pour toute question sur tes données : {m}.</>,
    s2: '2. Quelles données, et pourquoi ?', donnees: 'Données :', pourquoi: 'Pourquoi :',
    telephone: <><strong>Sur ton téléphone</strong>, le site garde aussi quelques informations : une copie de ta journée pour la consulter sans réseau, un brouillon de note et la racine choisie au test. Elles restent sur ton appareil et sont effacées quand tu te déconnectes ou quand tu vides les données de ton navigateur.</>,
    pub: <><strong>Pas de publicité, pas de revente.</strong> SÉNEVÉ n’utilise aucun outil de mesure publicitaire et ne vend jamais tes données.</>,
    s3: '3. Tes accords pour les messages', canal: 'Chaque canal a son propre accord : WhatsApp, e-mail et appels.',
    retirer: (m: React.ReactNode) => <>Tu peux retirer ton accord à tout moment : sur WhatsApp, écris <strong>STOP</strong> pour tout arrêter, ou <strong>PAUSE</strong> et <strong>ARRÊTER</strong> pour un seul parcours ; pour l’e-mail du matin, va dans ton espace, rubrique « E-mail du matin » ; dans tous les cas, tu peux écrire à {m}.</>,
    apresStop: 'Après un STOP, nous ne te réécrivons pas automatiquement.',
    s4: '4. Avec qui tes données sont-elles partagées ?', prestataires: 'Nous travaillons avec des prestataires techniques. Chacun reçoit seulement ce qui est nécessaire à son service.', lieu: 'Lieu :',
    horsPays: 'Certains de ces prestataires traitent des données hors de ton pays. Nous ne communiquons tes données à aucune autre personne, sauf si la loi l’exige.',
    s5: '5. Combien de temps les gardons-nous ?', s6: '6. Comment tes données sont-elles protégées ?',
    protections: ['Chaque personne ne peut voir que ses propres données : des règles d’accès le vérifient dans la base.', 'Les mots de passe sont chiffrés.', 'Les sauvegardes sont chiffrées et rangées dans un dossier privé.', 'Seule l’équipe du Dr Justin Tshims peut accéder à l’administration.'],
    s7: '7. Tes droits', droits: 'Tu peux à tout moment demander à voir les données que nous avons sur toi, à les corriger, à les supprimer (ton compte, ton journal, ton historique), à retirer un accord de message, ou à recevoir une copie de tes données.',
    delai: (m: React.ReactNode) => <>Pour cela, écris à {m} depuis l’adresse de ton compte. Nous répondons dans un délai de 30 jours.</>,
    s8: '8. Âge minimum', age: 'SÉNEVÉ s’adresse aux adultes : il faut avoir au moins 18 ans pour créer un espace.',
    s9: '9. Changements', changements: 'Si cette politique change, la date en haut de la page est mise à jour. En cas de changement important, nous te prévenons dans ton espace ou par e-mail.',
    contact: 'Contact', formulaire: 'Ouvrir le formulaire d’aide', copie: 'Demander une copie de mes données', sujetCopie: 'Demande%20de%20copie%20de%20mes%20donn%C3%A9es',
    compris: 'J’ai compris', application: 'Revenir à l’application', test: 'Test des 7 Racines', espace: 'Mon espace',
  },
  en: {
    titreOnglet: 'Privacy', revenir: 'Back', repere: 'Editorial & Ethics', titre: 'Privacy policy', maj: (d: string) => `Last updated: ${d}`,
    alt: 'A bound notebook in natural light', legende: 'No advertising, no reselling.', resume: 'At a glance',
    gardons: 'What we keep', jamais: 'What we never do', jamaisTexte: 'SÉNEVÉ uses no advertising tracking tool and never sells your data.',
    journal: 'Who can read your journal', journalTexte: 'Your journal is private. You choose the notes the AI coach may read and the excerpts sent to the team.',
    effacement: 'How to request deletion', ecris: (m: React.ReactNode) => <>To do so, write to {m} from your account’s email address.</>,
    demanderSuppression: 'Request deletion of my data', sujetSuppression: 'Request%20to%20delete%20my%20data',
    presentation: 'SÉNEVÉ is a companion for personal transformation based on the book “Stop Begging for Miracles” by Dr Justin Tshims. This page explains simply which data we use, why, who it is shared with, how long we keep it and what your rights are.',
    traduction: 'This is a translation of the French policy, provided for convenience. The French version is the reference.' as string | null,
    s1: '1. Who is responsible for your data?', responsable: 'Dr Justin Tshims’s Cabinet Bethesda, in Kinshasa (Democratic Republic of the Congo).', question: (m: React.ReactNode) => <>For any question about your data: {m}.</>,
    s2: '2. Which data, and why?', donnees: 'Data:', pourquoi: 'Why:',
    telephone: <><strong>On your phone</strong>, the site also keeps a little information: a copy of your day to read without a network, a note draft and the root chosen in the test. It stays on your device and is deleted when you sign out or clear your browser data.</>,
    pub: <><strong>No advertising, no reselling.</strong> SÉNEVÉ uses no advertising tracking tool and never sells your data.</>,
    s3: '3. Your consent to messages', canal: 'Each channel has its own consent: WhatsApp, email and calls.',
    retirer: (m: React.ReactNode) => <>You can withdraw your consent at any time: on WhatsApp, write <strong>STOP</strong> to stop everything, or <strong>PAUSE</strong> and <strong>ARRÊTER</strong> for a single journey; for the morning email, go to your space, “Morning email” section; in every case, you can write to {m}.</>,
    apresStop: 'After a STOP, we do not write to you again automatically.',
    s4: '4. Who is your data shared with?', prestataires: 'We work with technical providers. Each receives only what is needed for its service.', lieu: 'Location:',
    horsPays: 'Some of these providers process data outside your country. We do not share your data with anyone else, unless the law requires it.',
    s5: '5. How long do we keep it?', s6: '6. How is your data protected?',
    protections: ['Each person can only see their own data: access rules check this in the database.', 'Passwords are encrypted.', 'Backups are encrypted and stored in a private folder.', 'Only Dr Justin Tshims’s team can access the administration.'],
    s7: '7. Your rights', droits: 'You can ask at any time to see the data we hold about you, to correct it, to delete it (your account, your journal, your history), to withdraw a message consent, or to receive a copy of your data.',
    delai: (m: React.ReactNode) => <>To do so, write to {m} from your account’s email address. We answer within 30 days.</>,
    s8: '8. Minimum age', age: 'SÉNEVÉ is for adults: you must be at least 18 to create a space.',
    s9: '9. Changes', changements: 'If this policy changes, the date at the top of the page is updated. In case of an important change, we let you know in your space or by email.',
    contact: 'Contact', formulaire: 'Open the help form', copie: 'Request a copy of my data', sujetCopie: 'Request%20for%20a%20copy%20of%20my%20data',
    compris: 'I understand', application: 'Back to the app', test: '7 Roots Test', espace: 'My space',
  },
};

const mail = <a href={`mailto:${CONTACT}`}>{CONTACT}</a>;

export function Confidentialite() {
  const navigate=useNavigate();
  const [params]=useSearchParams();
  const langue=params.get('lang')==='en'?'en':'fr';
  const T=TEXTES[langue];
  const suffixe=langue==='en'?'?lang=en':'';
  const revenir=()=>{if(typeof window.history.state?.idx==='number'&&window.history.state.idx>0)navigate(-1);else navigate(`/${suffixe}`);};
  useEffect(() => { document.title = `${T.titreOnglet} — SÉNEVÉ`; document.documentElement.lang = langue; }, [T, langue]);
  const donnees = DONNEES[langue];
  return <main className="wrap confidentialite">
    <header className="conf-entete"><button type="button" onClick={revenir}><IconeConfidentialite nom="arrow_back" taille={20}/><span>{T.revenir}</span></button><p className="brand"><Icone nom="graine" taille={22}/>SÉNEVÉ</p><Link className="conf-profil" to={`/profil${suffixe}`} aria-label={langue==='en'?'My profile':'Mon profil'}><IconeConfidentialite nom="person" taille={18}/></Link></header>
    <header className="conf-intro"><p className="conf-repere"><IconeConfidentialite nom="verified_user" taille={16}/>{T.repere}</p><h1>{T.titre}</h1>
    <p className="muted">{T.maj(langue==='en'?DATE_POLITIQUE_EN:DATE_POLITIQUE)}</p>
    {T.traduction && <p className="muted">{T.traduction} <Link to="/confidentialite?lang=fr">Version française</Link></p>}
    </header>
    <figure className="conf-photo"><img src={`${import.meta.env.BASE_URL}illustrations/confidentialite-maquette.jpg`} alt={T.alt} width={512} height={234}/><figcaption>{T.legende}</figcaption></figure>
    <section className="conf-resume" aria-labelledby="conf-resume-titre"><h2 id="conf-resume-titre"><IconeConfidentialite nom="auto_stories" taille={22}/>{T.resume}</h2><ol>
      <li><span className="conf-numero">1</span><div><h3>{T.gardons}</h3><p>{donnees[1]?.donnees}</p><p>{donnees[2]?.donnees}</p></div></li>
      <li><span className="conf-numero">2</span><div><h3>{T.jamais}</h3><p>{T.jamaisTexte}</p></div></li>
      <li><span className="conf-numero conf-numero-or"><IconeConfidentialite nom="lock" taille={18}/></span><div><h3>{T.journal}</h3><p>{T.journalTexte}</p></div></li>
      <li><span className="conf-numero">4</span><div><h3>{T.effacement}</h3><p>{T.ecris(mail)}</p><a href={`mailto:${CONTACT}?subject=${T.sujetSuppression}`}>{T.demanderSuppression}</a></div></li>
    </ol></section>
    <p className="conf-presentation">{T.presentation}</p>

    <section aria-labelledby="c1"><h2 id="c1"><IconeConfidentialite nom="badge" taille={20}/>{T.s1}</h2>
      <p>{T.responsable}</p>
      <p>{T.question(mail)}</p>
    </section>

    <section aria-labelledby="c2"><h2 id="c2"><IconeConfidentialite nom="auto_stories" taille={20}/>{T.s2}</h2>
      {donnees.map(d => <div key={d.quoi} className="card conf-carte">
        <h3>{d.quoi}</h3>
        <p><strong>{T.donnees}</strong> {d.donnees}</p>
        <p><strong>{T.pourquoi}</strong> {d.pourquoi}</p>
      </div>)}
      <p>{T.telephone}</p>
      <p>{T.pub}</p>
    </section>

    <section aria-labelledby="c3"><h2 id="c3"><IconeConfidentialite nom="notifications_active" taille={20}/>{T.s3}</h2>
      <ul className="plain">
        <li>{T.canal}</li>
        <li>{T.retirer(mail)}</li>
        <li>{T.apresStop}</li>
      </ul>
    </section>

    <section aria-labelledby="c4"><h2 id="c4"><IconeConfidentialite nom="support_agent" taille={20}/>{T.s4}</h2>
      <p>{T.prestataires}</p>
      <ul className="plain conf-liste">
        {PRESTATAIRES[langue].map(([nom, role, lieu]) => <li key={nom}><strong>{nom}</strong> — {role}. <span className="muted">{T.lieu} {lieu}.</span></li>)}
      </ul>
      <p>{T.horsPays}</p>
    </section>

    <section aria-labelledby="c5"><h2 id="c5"><IconeConfidentialite nom="hourglass_empty" taille={20}/>{T.s5}</h2>
      <ul className="plain conf-liste">
        {DUREES[langue].map(([quoi, duree]) => <li key={quoi}><strong>{quoi}</strong> : {duree}</li>)}
      </ul>
    </section>

    <section aria-labelledby="c6"><h2 id="c6"><IconeConfidentialite nom="verified_user" taille={20}/>{T.s6}</h2>
      <ul className="plain">
        {T.protections.map(p => <li key={p}>{p}</li>)}
      </ul>
    </section>

    <section aria-labelledby="c7"><h2 id="c7"><IconeConfidentialite nom="lock" taille={20}/>{T.s7}</h2>
      <p>{T.droits}</p>
      <p>{T.delai(mail)}</p>
    </section>

    <section aria-labelledby="c8"><h2 id="c8"><IconeConfidentialite nom="badge" taille={20}/>{T.s8}</h2>
      <p>{T.age}</p>
    </section>

    <section aria-labelledby="c9"><h2 id="c9"><IconeConfidentialite nom="auto_stories" taille={20}/>{T.s9}</h2>
      <p>{T.changements}</p>
    </section>

    <section className="conf-contact" aria-labelledby="conf-contact-titre"><h2 id="conf-contact-titre"><IconeConfidentialite nom="mail" taille={22}/>{T.contact}</h2><p>{mail}</p><Link to={`/aide${suffixe}`}>{T.formulaire}</Link><a href={`mailto:${CONTACT}?subject=${T.sujetCopie}`}>{T.copie}</a></section>
    <div className="conf-retour"><button className="conf-principal" type="button" onClick={revenir}><IconeConfidentialite nom="check" taille={20}/>{T.compris}</button><button type="button" onClick={revenir}>{T.application}</button></div>
    <div className="today-foot"><Link className="link" to={`/${suffixe}`}>{T.test}</Link><Link className="link" to={`/espace${suffixe}`}>{T.espace}</Link></div>
  </main>;
}
