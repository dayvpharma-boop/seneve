import { Link } from 'react-router-dom';
import { IconeJournee } from '@/components/IconeJournee';

const TEXTES = {
 fr: { bonjour: 'Bonjour', interrompue: 'Connexion interrompue', kicker: 'Patience & Continuité', titre: 'La connexion a été interrompue', suite: 'Tu peux réessayer ou ouvrir ton journal.', reessayer: 'Réessayer', journal: 'Ouvrir mon journal', journalTitre: 'Journal personnel', journalTexte: 'Retrouve tes notes dans ton espace.', journalNote: 'Connexion nécessaire pour les charger', lecture: 'Lecture du jour', lectureTexte: 'Aucune copie disponible ici.', lectureNote: 'Réessaie lorsque le réseau revient', conserve: 'Ton espace conservé', conserveTexte: 'Cette erreur ne supprime pas tes notes enregistrées.', fin: 'Prends un instant. Tu pourras reprendre ta journée lorsque la connexion sera rétablie.', signature: 'Compagnon de recueillement' },
 en: { bonjour: 'Hello', interrompue: 'Connection interrupted', kicker: 'Patience & Continuity', titre: 'The connection was interrupted', suite: 'You can try again or open your journal.', reessayer: 'Try again', journal: 'Open my journal', journalTitre: 'Personal journal', journalTexte: 'Find your notes in your space.', journalNote: 'A connection is needed to load them', lecture: 'Today’s reading', lectureTexte: 'No copy is available here.', lectureNote: 'Try again when the network is back', conserve: 'Your space is kept', conserveTexte: 'This error does not delete your saved notes.', fin: 'Take a moment. You can resume your day once the connection is back.', signature: 'A companion for reflection' },
} as const;

/** Présentation de la maquette d’erreur ; aucune donnée locale fictive. */
export function EspaceErreur({ prenom, message, reessayer, langue }: { prenom: string; message: string; reessayer: () => void; langue?: string | null }) {
 const en = langue === 'en';
 const T = TEXTES[en ? 'en' : 'fr'];
 const heure = new Intl.DateTimeFormat(en ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Kinshasa', hour: '2-digit', minute: '2-digit' }).format(new Date());
 return <>
  <header className="erreur-header"><div><strong>SÉNEVÉ</strong><span aria-hidden="true">·</span><em>{prenom ? `${T.bonjour} ${prenom}` : T.bonjour}</em></div><Link className="erreur-avatar" to={langue === 'en' ? '/profil?lang=en' : '/profil'} aria-label={langue === 'en' ? 'My profile' : 'Mon profil'}>{prenom ? prenom.charAt(0).toUpperCase() : 'S'}</Link></header>
  <div className="erreur-contexte"><span><i aria-hidden="true" />{T.interrompue}</span><time>Kinshasa · {heure}</time></div>
  <section className="erreur-maquette" aria-labelledby="erreur-titre">
   <div className="erreur-reseau" aria-hidden="true"><IconeJournee nom="wifi_off" taille={36} /><span><i /></span></div>
   <p className="erreur-kicker">{T.kicker}</p>
   <h1 id="erreur-titre">{T.titre}</h1>
   <p className="erreur-texte" role="alert">{message} {T.suite}</p>
   <div className="erreur-commandes"><button type="button" onClick={reessayer}><IconeJournee nom="sync" taille={20} />{T.reessayer}</button><Link to="/journal"><IconeJournee nom="menu_book" taille={20} />{T.journal}</Link></div>
   <div className="erreur-feedback" aria-hidden="true" />
  </section>
  <div className="erreur-cartes">
   <section><h2><IconeJournee nom="verified" taille={18} />{T.journalTitre}</h2><p>{T.journalTexte}</p><small>{T.journalNote}</small></section>
   <section><h2><IconeJournee nom="auto_stories" taille={18} />{T.lecture}</h2><p>{T.lectureTexte}</p><small>{T.lectureNote}</small></section>
  </div>
  <aside className="erreur-memoire"><span aria-hidden="true"><IconeJournee nom="energy_savings_leaf" taille={22} /></span><div><h2>{T.conserve}</h2><p>{T.conserveTexte}</p></div></aside>
  <div className="erreur-fin"><span aria-hidden="true" /><p>{T.fin}</p><small>{T.signature}</small></div>
 </>;
}
