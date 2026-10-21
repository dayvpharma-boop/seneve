import { Link } from 'react-router-dom';
import { IconeJournee } from '@/components/IconeJournee';

/** Présentation de la maquette d’erreur ; aucune donnée locale fictive. */
export function EspaceErreur({ prenom, message, reessayer }: { prenom: string; message: string; reessayer: () => void }) {
 const heure = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Kinshasa', hour: '2-digit', minute: '2-digit' }).format(new Date());
 return <>
  <header className="erreur-header"><div><strong>SÉNEVÉ</strong><span aria-hidden="true">·</span><em>{prenom ? `Bonjour ${prenom}` : 'Bonjour'}</em></div><span className="erreur-avatar" aria-hidden="true">{prenom ? prenom.charAt(0).toUpperCase() : 'S'}</span></header>
  <div className="erreur-contexte"><span><i aria-hidden="true" />Connexion interrompue</span><time>Kinshasa · {heure}</time></div>
  <section className="erreur-maquette" aria-labelledby="erreur-titre">
   <div className="erreur-reseau" aria-hidden="true"><IconeJournee nom="wifi_off" taille={36} /><span><i /></span></div>
   <p className="erreur-kicker">Patience &amp; Continuité</p>
   <h1 id="erreur-titre">La connexion a été interrompue</h1>
   <p className="erreur-texte" role="alert">{message} Tu peux réessayer ou ouvrir ton journal.</p>
   <div className="erreur-commandes"><button type="button" onClick={reessayer}><IconeJournee nom="sync" taille={20} />Réessayer</button><Link to="/journal"><IconeJournee nom="menu_book" taille={20} />Ouvrir mon journal</Link></div>
   <div className="erreur-feedback" aria-hidden="true" />
  </section>
  <div className="erreur-cartes">
   <section><h2><IconeJournee nom="verified" taille={18} />Journal personnel</h2><p>Retrouve tes notes dans ton espace.</p><small>Connexion nécessaire pour les charger</small></section>
   <section><h2><IconeJournee nom="auto_stories" taille={18} />Lecture du jour</h2><p>Aucune copie disponible ici.</p><small>Réessaie lorsque le réseau revient</small></section>
  </div>
  <aside className="erreur-memoire"><span aria-hidden="true"><IconeJournee nom="energy_savings_leaf" taille={22} /></span><div><h2>Ton espace conservé</h2><p>Cette erreur ne supprime pas tes notes enregistrées.</p></div></aside>
  <div className="erreur-fin"><span aria-hidden="true" /><p>Prends un instant. Tu pourras reprendre ta journée lorsque la connexion sera rétablie.</p><small>Compagnon de recueillement</small></div>
 </>;
}
