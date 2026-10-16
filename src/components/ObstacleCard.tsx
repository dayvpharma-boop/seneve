import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { OBSTACLE_TEXTES } from '@/lib/progres';

const MOTIFS = ['temps', 'compris', 'difficile', 'personnel', 'autre'] as const;

/** Question posée une fois par série de 2 actions non réalisées (cahier des charges, validée par Dr Justin). */
export function ObstacleCard({ enrollmentId, cle, langue }: { enrollmentId: string; cle: string; langue: string }) {
  const T = OBSTACLE_TEXTES[langue === 'en' ? 'en' : 'fr'];
  const [dejaRepondu, setDejaRepondu] = useState<boolean | null>(null);
  const [choix, setChoix] = useState<string>('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [reponse, setReponse] = useState<string | null>(null);

  useEffect(() => {
    void Promise.resolve(supabase.from('obstacles').select('cle').eq('enrollment_id', enrollmentId).eq('cle', cle).maybeSingle())
      .then(r => setDejaRepondu(Boolean(r?.data) || Boolean(r?.error)))
      .catch(() => setDejaRepondu(true));
  }, [enrollmentId, cle]);

  async function envoyer(motif: string) {
    if (envoi) return;
    setEnvoi(true); setErreur(false);
    const { error } = await supabase.rpc('obstacle_repondre', { p_enrollment_id: enrollmentId, p_cle: cle, p_motif: motif });
    setEnvoi(false);
    if (error) { setErreur(true); return; }
    setReponse(motif);
  }

  if (dejaRepondu !== false) return null;
  if (reponse === 'plus_tard') return null;
  if (reponse) return <section className="card" aria-label={T.titre} role="status">
    {(reponse === 'compris' || reponse === 'difficile') ? <><p>{T.coachTexte}</p><Link className="btn btn-link" to={`/coach?inscription=${enrollmentId}`}>{T.coach}</Link></>
      : reponse === 'personnel' ? <><p>{T.aideTexte}</p><Link className="btn btn-link" to={`/aide?inscription=${enrollmentId}`}>{T.aide}</Link></>
      : <p>{T.merci}</p>}
  </section>;

  return <section className="card" aria-label={T.titre}>
    <fieldset className="obstacle-choix" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="tag">{T.titre}</legend>
      {MOTIFS.map(m => <label key={m} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0' }}>
        <input type="radio" name={`obstacle-${cle}`} value={m} checked={choix === m} onChange={() => setChoix(m)} />{T.motifs[m]}
      </label>)}
    </fieldset>
    <div className="link-row">
      <button type="button" className="btn action-btn" disabled={!choix || envoi} onClick={() => void envoyer(choix)}>{envoi ? T.envoi : T.envoyer}</button>
      <button type="button" className="link" disabled={envoi} onClick={() => void envoyer('plus_tard')}>{T.plusTard}</button>
    </div>
    <p className="muted">{T.prive}</p>
    {erreur && <p className="error" role="alert">{T.erreur}</p>}
  </section>;
}
