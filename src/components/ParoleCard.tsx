import {IconeResultat} from './IconeResultat';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { adresseParole, entreGuillemets, paroleTextes, renderParole, type Parole } from '@/lib/parole';

/** Parole du jour : citation exacte du livre pour ce jour du parcours, partageable en image. Rien si aucune parole publiée. */
export function ParoleCard({ programmeId, version, langue, jour }: { programmeId: string; version: number; langue?: string; jour: number }) {
  const T = paroleTextes(langue);
  const [parole, setParole] = useState<Parole | null>(null);
  const [etat, setEtat] = useState<'repos' | 'creation' | 'indisponible'>('repos');

  useEffect(() => {
    let annule = false;
    setParole(null);
    void Promise.resolve(supabase.from('paroles').select('texte, reference_livre')
      .eq('programme_id', programmeId).eq('version', version).eq('langue', langue === 'en' ? 'en' : 'fr').eq('jour', jour).maybeSingle())
      .then(r => { if (!annule && r?.data) setParole(r.data as Parole); })
      .catch(() => undefined);
    return () => { annule = true; };
  }, [programmeId, version, langue, jour]);

  if (!parole) return null;

  async function partager() {
    if (!parole) return;
    setEtat('creation');
    const blob = await renderParole({
      citation: parole.texte, reference: parole.reference_livre, livre: T.livre, auteur: T.auteur, invitation: T.invitation,
      adresse: adresseParole(window.location.host, import.meta.env.BASE_URL, langue ?? 'fr'), langue,
    });
    if (!blob) { setEtat('indisponible'); return; }
    setEtat('repos');
    const fichier = new File([blob], `${T.fichier}-jour-${jour}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [fichier] })) {
      try { await nav.share({ files: [fichier] }); return; } catch (e) { if ((e as DOMException)?.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fichier.name;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="card parole-card" aria-label={T.tag}>
    <p className="tag"><IconeResultat nom="format_quote"/>{T.tag}</p>
    <blockquote className="parole-citation">{entreGuillemets(parole.texte, langue)}</blockquote>
    <p className="src">{T.auteur}, {T.livre} — {parole.reference_livre}</p>
    <button type="button" className="btn-secondaire wide" disabled={etat === 'creation'} onClick={() => void partager()}>{etat === 'creation' ? T.creation : T.partager}</button>
    {etat === 'indisponible' && <p className="note" role="status">{T.indisponible}</p>}
  </section>;
}
