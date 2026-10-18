import { useState } from 'react';
import { invitationTextes, lienInvitation, lienWhatsAppInvitation } from '@/lib/invitation';

/** Inviter un proche à faire le test : partage du téléphone si disponible, sinon WhatsApp ; lien copiable. */
export function InviteCard({ langue }: { langue?: string }) {
  const T = invitationTextes(langue);
  const [copie, setCopie] = useState(false);
  const lien = lienInvitation(window.location.origin, import.meta.env.BASE_URL, langue ?? 'fr');
  const message = T.message(lien);

  async function envoyer() {
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: T.titre, text: message }); return; } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return; // menu fermé par la personne
      }
    }
    window.open(lienWhatsAppInvitation(message), '_blank', 'noopener,noreferrer');
  }

  async function copier() {
    try { await navigator.clipboard.writeText(lien); setCopie(true); window.setTimeout(() => setCopie(false), 2500); } catch { /* sans effet */ }
  }

  return <section className="card invite-card" aria-label={T.tag}>
    <p className="tag">{T.tag}</p>
    <p className="more">{T.texte}</p>
    <div className="invite-actions">
      <button type="button" className="btn" onClick={() => void envoyer()}>{T.envoyer}</button>
      <button type="button" className="btn-secondaire" onClick={() => void copier()} aria-live="polite">{copie ? T.copie : T.copier}</button>
    </div>
    <p className="muted invite-note">{T.note}</p>
  </section>;
}
