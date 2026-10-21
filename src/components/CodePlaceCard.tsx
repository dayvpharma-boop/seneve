import {IconeJourneeSuite} from './IconeJourneeSuite';
import {IconeJournee} from './IconeJournee';
import {IconeRegistre} from './IconeRegistre';
import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { messageCode, textesPlace, type ResultatCode } from '@/lib/places';

/** « Place offerte » : le participant saisit le code reçu d'une organisation (Sénevé Continuité). */
export function CodePlaceCard({ langue, onOuvert }: { langue: string; onOuvert: () => Promise<void> | void }) {
  const T = textesPlace(langue);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const { data, error } = await supabase.rpc('utiliser_code_place', { p_code: code.trim() });
      if (error || !data) { setMsg({ ok: false, texte: T.erreur }); return; }
      const m = messageCode(data as ResultatCode, langue);
      setMsg(m);
      if ((data as ResultatCode).resultat === 'ok') { setCode(''); await onOuvert(); }
    } catch {
      setMsg({ ok: false, texte: T.erreur });
    } finally {
      setBusy(false);
    }
  }

  return <section className="card" aria-label={T.titre}>
    <p className="tag">{T.titre}</p>
    <p>{T.intro}</p>
    <form onSubmit={envoyer}>
      <label className="field"><span><IconeJourneeSuite nom="vpn_key" taille={16}/> {T.champ}</span>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="SNV-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={20} />
      </label>
      <button type="submit" className="btn action-btn" disabled={busy || !code.trim()}>{busy ? T.attente : T.bouton}<IconeJournee nom="arrow_forward" taille={18}/></button>
    </form>
    {msg && <p className={msg.ok ? 'success' : 'error'} role={msg.ok ? 'status' : 'alert'}>{msg.ok?<IconeJournee nom="verified" taille={18}/>:<IconeRegistre nom="info" taille={18}/>} {msg.texte}</p>}
  </section>;
}
