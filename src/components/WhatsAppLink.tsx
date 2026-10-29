import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { linkMessage, linkUrl, maskPhone } from '@/lib/liaison';

type Link = { identite_canal: string; verifiee_le: string };

const TEXTES = {
  fr: {
    titreMaquette: 'Relier WhatsApp', intro: 'Relie ton numéro pour retrouver ton parcours sur WhatsApp. La liaison seule ne t’inscrit à aucun message.',
    relie: (n: string) => `Ton WhatsApp ${n} est relié à ton compte.`, retirer: 'Retirer la liaison',
    confirmerTexte: 'Retirer la liaison WhatsApp ? Ton numéro ne sera plus relié à ton compte.', confirmer: 'Confirmer le retrait', annuler: 'Annuler',
    renouveler: 'Nouveau numéro ou renouveler ?', obtenir: 'Obtenir mon code', codeUnique: 'Code de liaison unique', copie: 'Copié', copier: 'Copier le code',
    copieImpossible: 'Copie impossible. Sélectionne le code pour le copier.',
    valable: (h: string) => `Valable jusqu’à ${h}. Envoie ce code au numéro officiel SÉNEVÉ.`, ouvrir: 'Ouvrir WhatsApp', envoye: 'J’ai envoyé le message',
    envoie: 'Envoie ce message depuis le WhatsApp que tu veux relier :', uneFois: (h: string) => `Ce code est valable jusqu’à ${h} et ne sert qu’une fois.`,
    pourquoi: 'Relie ton WhatsApp pour retrouver ta progression sur les deux canaux. Relier ton numéro ne t’inscrit à aucun message.',
    instant: 'Un instant…', relier: 'Relier mon WhatsApp',
    erreurVerif: 'Impossible de vérifier ta liaison WhatsApp pour le moment.', tropDemandes: 'Trop de demandes. Réessaie dans une heure.',
    erreurCode: 'Impossible de créer un code pour le moment. Réessaie.', erreurRetrait: 'La liaison n’a pas pu être retirée. Réessaie.',
  },
  en: {
    titreMaquette: 'Link WhatsApp', intro: 'Link your number to find your journey on WhatsApp. Linking alone does not sign you up for any message.',
    relie: (n: string) => `Your WhatsApp ${n} is linked to your account.`, retirer: 'Remove the link',
    confirmerTexte: 'Remove the WhatsApp link? Your number will no longer be linked to your account.', confirmer: 'Confirm removal', annuler: 'Cancel',
    renouveler: 'New number or renew?', obtenir: 'Get my code', codeUnique: 'One-time link code', copie: 'Copied', copier: 'Copy the code',
    copieImpossible: 'Copying is not possible. Select the code to copy it.',
    valable: (h: string) => `Valid until ${h}. Send this code to the official SÉNEVÉ number.`, ouvrir: 'Open WhatsApp', envoye: 'I have sent the message',
    envoie: 'Send this message from the WhatsApp you want to link:', uneFois: (h: string) => `This code is valid until ${h} and can only be used once.`,
    pourquoi: 'Link your WhatsApp to find your progress on both channels. Linking your number does not sign you up for any message.',
    instant: 'One moment…', relier: 'Link my WhatsApp',
    erreurVerif: 'Your WhatsApp link cannot be checked right now.', tropDemandes: 'Too many requests. Try again in an hour.',
    erreurCode: 'A code cannot be created right now. Try again.', erreurRetrait: 'The link could not be removed. Try again.',
  },
} as const;

/** Carte « Relier mon WhatsApp » : liaison vérifiée par un code à usage unique (15 minutes).
 *  Le message envoyé (« LIER 123456 ») reste le même dans les deux langues : c'est lui que le serveur reconnaît. */
export function WhatsAppLink({maquette=false,langue,onResume}:{maquette?:boolean;langue?:string|null;onResume?:(resume:string|null)=>void}) {
  const en = langue === 'en';
  const T = TEXTES[en ? 'en' : 'fr'];
  const time = (iso: string) => new Intl.DateTimeFormat(en ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Kinshasa', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const [confirmer,setConfirmer]=useState(false);
  const [copie,setCopie]=useState(false);
  const [link, setLink] = useState<Link | null | undefined>(undefined);
  const [code, setCode] = useState<{ code: string; expire_le: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('channel_links').select('identite_canal, verifiee_le')
      .eq('canal', 'whatsapp').eq('etat', 'verifiee').maybeSingle();
    if (error) { setError(T.erreurVerif); setLink(null); return; }
    setLink((data as Link | null) ?? null);
  }, [T]);
  useEffect(() => { void load(); }, [load]);
  // Résumé pour la ligne « WhatsApp » du profil.
  useEffect(() => { onResume?.(link === undefined ? null : link ? (en ? 'Linked' : 'Relié') : (en ? 'Not linked' : 'Non relié')); }, [link, en, onResume]);

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
    <p className="tag">{maquette?T.titreMaquette:'WhatsApp'}</p>{maquette&&<p>{T.intro}</p>}
    {link ? <>
      <p className="success" role="status">{T.relie(maskPhone(link.identite_canal))}</p>
      <button type="button" className="link" disabled={busy} onClick={()=>maquette?setConfirmer(true):void revoke()}>{T.retirer}</button>{maquette&&confirmer&&<div className="rn-confirmation"><p>{T.confirmerTexte}</p><button type="button" className="btn" disabled={busy} onClick={()=>void revoke().then(()=>setConfirmer(false))}>{T.confirmer}</button><button type="button" className="link" onClick={()=>setConfirmer(false)}>{T.annuler}</button></div>}{maquette&&<div className="rn-renouveler"><p>{T.renouveler}</p><button type="button" className="btn-secondaire" disabled={busy} onClick={()=>void ask()}>{T.obtenir}</button>{code&&<><p>{T.codeUnique}</p><p className="link-code">{linkMessage(code.code)}</p><button onClick={()=>void navigator.clipboard.writeText(linkMessage(code.code)).then(()=>setCopie(true)).catch(()=>setError(T.copieImpossible))}>{copie?T.copie:T.copier}</button><p>{T.valable(time(code.expire_le))}</p><a className="btn" href={linkUrl(code.code)} target="_blank" rel="noopener noreferrer">{T.ouvrir}</a><button type="button" className="link" onClick={()=>void check()}>{T.envoye}</button></>}</div>}
    </> : code ? <>
      <p>{T.envoie}</p>
      <p className="link-code">{linkMessage(code.code)}</p>
      <p className="muted">{T.uneFois(time(code.expire_le))}</p>
      <a className="btn btn-link" href={linkUrl(code.code)} target="_blank" rel="noopener noreferrer">{T.ouvrir}</a>
      <button type="button" className="link" onClick={check}>{T.envoye}</button>
    </> : <>
      {/* Variante Réglages : l'introduction dit déjà la même chose, on ne la répète pas. */}
      {!maquette && <p>{T.pourquoi}</p>}
      <button type="button" className="btn" disabled={busy} onClick={ask}>{busy ? T.instant : T.relier}</button>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
