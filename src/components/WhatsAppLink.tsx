import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { linkMessage, linkUrl, maskPhone } from '@/lib/liaison';

type Link = { identite_canal: string; verifiee_le: string };

function time(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Kinshasa', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** Carte « Relier mon WhatsApp » : liaison vérifiée par un code à usage unique (15 minutes). */
export function WhatsAppLink() {
  const [link, setLink] = useState<Link | null | undefined>(undefined);
  const [code, setCode] = useState<{ code: string; expire_le: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('channel_links').select('identite_canal, verifiee_le')
      .eq('canal', 'whatsapp').eq('etat', 'verifiee').maybeSingle();
    if (error) { setError('Impossible de vérifier ta liaison WhatsApp pour le moment.'); setLink(null); return; }
    setLink((data as Link | null) ?? null);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function ask() {
    setBusy(true); setError('');
    const { data, error } = await supabase.rpc('create_link_token');
    setBusy(false);
    if (error) { setError(error.message.includes('Trop de demandes') ? 'Trop de demandes. Réessaie dans une heure.' : 'Impossible de créer un code pour le moment. Réessaie.'); return; }
    setCode(data as { code: string; expire_le: string });
  }

  async function check() {
    setCode(null);
    await load();
  }

  async function revoke() {
    setBusy(true); setError('');
    const { error } = await supabase.rpc('revoke_whatsapp_link');
    setBusy(false);
    if (error) { setError('La liaison n’a pas pu être retirée. Réessaie.'); return; }
    await load();
  }

  if (link === undefined) return null;

  return <div className="card">
    <p className="tag">WhatsApp</p>
    {link ? <>
      <p className="success" role="status">Ton WhatsApp {maskPhone(link.identite_canal)} est relié à ton compte.</p>
      <button type="button" className="link" disabled={busy} onClick={revoke}>Retirer la liaison</button>
    </> : code ? <>
      <p>Envoie ce message depuis le WhatsApp que tu veux relier :</p>
      <p className="link-code">{linkMessage(code.code)}</p>
      <p className="muted">Ce code est valable jusqu’à {time(code.expire_le)} et ne sert qu’une fois.</p>
      <a className="btn btn-link" href={linkUrl(code.code)} target="_blank" rel="noopener noreferrer">Ouvrir WhatsApp</a>
      <button type="button" className="link" onClick={check}>J’ai envoyé le message</button>
    </> : <>
      <p>Relie ton WhatsApp pour retrouver ta progression sur les deux canaux. Relier ton numéro ne t’inscrit à aucun message.</p>
      <button type="button" className="btn" disabled={busy} onClick={ask}>{busy ? 'Un instant…' : 'Relier mon WhatsApp'}</button>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
