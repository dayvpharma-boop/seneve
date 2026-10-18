import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { linkMessage, linkUrl, maskPhone } from '@/lib/liaison';

type Link = { identite_canal: string; verifiee_le: string };

const TEXTES = {
  fr: {
    locale: 'fr-FR', erreurLecture: 'Impossible de vérifier ta liaison WhatsApp pour le moment.', tropDemandes: 'Trop de demandes. Réessaie dans une heure.',
    erreurCode: 'Impossible de créer un code pour le moment. Réessaie.', erreurRetrait: 'La liaison n’a pas pu être retirée. Réessaie.',
    relie: (n: string) => `Ton WhatsApp ${n} est relié à ton compte.`, retirer: 'Retirer la liaison',
    envoie: 'Envoie ce message depuis le WhatsApp que tu veux relier :', valable: (h: string) => `Ce code est valable jusqu’à ${h} et ne sert qu’une fois.`,
    ouvrir: 'Ouvrir WhatsApp', envoye: 'J’ai envoyé le message',
    intro: 'Relie ton WhatsApp pour retrouver ta progression sur les deux canaux. Relier ton numéro ne t’inscrit à aucun message.',
    unInstant: 'Un instant…', relier: 'Relier mon WhatsApp',
  },
  en: {
    locale: 'en-GB', erreurLecture: 'Your WhatsApp link cannot be checked right now.', tropDemandes: 'Too many requests. Try again in an hour.',
    erreurCode: 'A code cannot be created right now. Please try again.', erreurRetrait: 'The link could not be removed. Please try again.',
    relie: (n: string) => `Your WhatsApp ${n} is linked to your account.`, retirer: 'Remove the link',
    envoie: 'Send this message from the WhatsApp you want to link:', valable: (h: string) => `This code is valid until ${h} and can only be used once.`,
    ouvrir: 'Open WhatsApp', envoye: 'I have sent the message',
    intro: 'Link your WhatsApp to find your progress on both channels. Linking your number does not sign you up for any messages.',
    unInstant: 'Just a moment…', relier: 'Link my WhatsApp',
  },
} as const;

function time(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Kinshasa', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** Carte « Relier mon WhatsApp » : liaison vérifiée par un code à usage unique (15 minutes). */
export function WhatsAppLink({ langue = 'fr' }: { langue?: string | null }) {
  const T = TEXTES[langue === 'en' ? 'en' : 'fr'];
  const [link, setLink] = useState<Link | null | undefined>(undefined);
  const [code, setCode] = useState<{ code: string; expire_le: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('channel_links').select('identite_canal, verifiee_le')
      .eq('canal', 'whatsapp').eq('etat', 'verifiee').maybeSingle();
    if (error) { setError(T.erreurLecture); setLink(null); return; }
    setLink((data as Link | null) ?? null);
  }, [T]);
  useEffect(() => { void load(); }, [load]);

  async function ask() {
    setBusy(true); setError('');
    const { data, error } = await supabase.rpc('create_link_token');
    setBusy(false);
    if (error) { setError(error.message.includes('Trop de demandes') ? T.tropDemandes : T.erreurCode); return; }
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
    if (error) { setError(T.erreurRetrait); return; }
    await load();
  }

  if (link === undefined) return null;

  return <div className="card">
    <p className="tag">WhatsApp</p>
    {link ? <>
      <p className="success" role="status">{T.relie(maskPhone(link.identite_canal))}</p>
      <button type="button" className="link" disabled={busy} onClick={revoke}>{T.retirer}</button>
    </> : code ? <>
      <p>{T.envoie}</p>
      <p className="link-code">{linkMessage(code.code)}</p>
      <p className="muted">{T.valable(time(code.expire_le, T.locale))}</p>
      <a className="btn btn-link" href={linkUrl(code.code)} target="_blank" rel="noopener noreferrer">{T.ouvrir}</a>
      <button type="button" className="link" onClick={check}>{T.envoye}</button>
    </> : <>
      <p>{T.intro}</p>
      <button type="button" className="btn" disabled={busy} onClick={ask}>{busy ? T.unInstant : T.relier}</button>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
