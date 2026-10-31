import {IconeResultat} from './IconeResultat';
import {IconeEditionDemarrage as IconeEdition} from './IconesDemarrage';
import {IconeConfidentialiteDemarrage as IconeConfidentialite} from './IconesDemarrage';
import {IconeJourneeSuite} from './IconeJourneeSuite';
import { useState } from 'react';
import { compterGraine, envoyerInvitation, invitationTextes, lienInvitation } from '@/lib/invitation';

/** Inviter un proche à faire le test : partage du téléphone si disponible, sinon WhatsApp ; lien copiable. */
export function InviteCard({ langue, resultat = false }: { langue?: string; resultat?: boolean }) {
  const T = invitationTextes(langue);
  const [copie, setCopie] = useState(false);
  const [erreurCopie,setErreurCopie] = useState(false);
  const lien = lienInvitation(window.location.origin, import.meta.env.BASE_URL, langue ?? 'fr');
  
  async function envoyer() { await envoyerInvitation(langue); }

  async function copier() {
    setErreurCopie(false);
    try { await navigator.clipboard.writeText(lien); compterGraine(); setCopie(true); window.setTimeout(() => setCopie(false), 2500); } catch { setCopie(false); setErreurCopie(true); }
  }

  return <section className="card invite-card" aria-label={T.tag}>
    <p className="tag">{resultat ? <IconeResultat nom="favorite" taille={22}/> : <IconeJourneeSuite nom="diversity_1"/>}{T.tag}</p>
    <p className="more">{T.texte}</p>
    <div className="invite-actions">
      <button type="button" className="btn" onClick={() => void envoyer()}><IconeEdition nom="send" taille={18}/>{T.envoyer}</button>
      <button type="button" className="btn-secondaire" onClick={() => void copier()} aria-live="polite">{resultat ? <IconeResultat nom={copie?'check':'link'} taille={18}/> : <IconeJourneeSuite nom="content_copy" taille={18}/>}{copie ? T.copie : T.copier}</button>
    </div>
    {erreurCopie&&<p role="alert">{langue==='en'?'The link could not be copied. Please try again.':'Le lien n’a pas pu être copié. Réessaie.'}</p>}
    <p className="muted invite-note"><IconeConfidentialite nom="lock" taille={14}/>{T.note}</p>
  </section>;
}
