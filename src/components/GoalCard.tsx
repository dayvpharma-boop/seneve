import {IconeJourneeSuite} from './IconeJourneeSuite';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { OBJECTIF_MAX, OBJECTIF_MIN, nomsRacines, objectifTextes, objectifValide, racineTest } from '@/lib/objectif';

type Goal = { goal_id: string; texte: string; racine: number | null; confirme_le: string | null };

function dateCourte(iso: string, langue: string) {
  return new Intl.DateTimeFormat(langue === 'en' ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Kinshasa', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

/** Carte « Mon objectif » : le participant formule et confirme lui-même son objectif ; il peut le modifier. */
export function GoalCard({ langue, onSaved }: { langue: string; onSaved?:()=>void }) {
  const T = objectifTextes(langue);
  const racines = nomsRacines(langue);
  const [goal, setGoal] = useState<Goal | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [texte, setTexte] = useState('');
  const [racine, setRacine] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const suggestion = racineTest();

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('goals').select('goal_id, texte, racine, confirme_le').eq('etat', 'confirme').maybeSingle();
    if (error) { setGoal(null); return; }
    setGoal((data as Goal | null) ?? null);
  }, []);
  useEffect(() => { void load(); }, [load]);

  function ouvrir() {
    setTexte(goal?.texte ?? '');
    setRacine(goal?.racine ?? null);
    setError(''); setEditing(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const t = objectifValide(texte);
    if (!t || busy) return;
    setBusy(true); setError('');
    try {
      const { error } = await supabase.rpc('goal_set', { p_texte: t, p_racine: racine });
      if (error) { setError(T.erreur); return; }
      onSaved?.();
      setEditing(false);
      await load();
    } catch { setError(T.erreur); }
    finally { setBusy(false); }
  }

  if (goal === undefined) return null;
  // Sans objectif : une invitation courte et un bouton ; le formulaire ne s'ouvre qu'à la demande (15/10/2026).
  if (!goal && !editing) return <div className="card">
    <p className="tag"><IconeJourneeSuite nom="flag"/>{T.titre}</p>
    <p>{T.invitation}</p>
    <button type="button" className="btn-secondaire wide" onClick={ouvrir}>{T.choisir}</button>
  </div>;
  const formulaire = editing || !goal;
  const longueurOk = texte.trim().length === 0 || objectifValide(texte) !== null;

  return <div className="card objectif-card">
    <p className="tag"><IconeJourneeSuite nom="flag"/>{T.titre}</p>
    {!formulaire && goal ? <>
      <p className="action">{goal.texte}</p>
      {goal.racine && <p className="muted"><IconeJourneeSuite nom="psychology" taille={18}/> {racines[goal.racine - 1]}</p>}
      {goal.confirme_le && <p className="muted">{T.depuis} {dateCourte(goal.confirme_le, langue)}</p>}
      <button type="button" className="link" onClick={ouvrir}>{T.modifier}</button>
    </> : <form onSubmit={save}>
      {!goal && <p>{T.invitation}</p>}
      <p className="muted">{T.conseil}</p>
      <p className="muted">{T.exemple}</p>
      <label className="field"><span>{T.champ}</span>
        <textarea rows={2} value={texte} onChange={e => setTexte(e.target.value)} />
      </label>
      {!longueurOk && <p className="error" role="alert">{T.trop(OBJECTIF_MIN, OBJECTIF_MAX)}</p>}
      <label className="field"><span>{T.racine}</span>
        <select value={racine ?? ''} onChange={e => setRacine(e.target.value ? Number(e.target.value) : null)}>
          <option value="">{T.aucune}</option>
          {racines.map((n, k) => <option key={n} value={k + 1}>{n}</option>)}
        </select>
      </label>
      {suggestion !== null && racine !== suggestion + 1 && <p className="muted">{T.suggestionTest(racines[suggestion] ?? '')} <button type="button" className="link" onClick={() => setRacine(suggestion + 1)}>{T.utiliser}</button></p>}
      <div className="row-actions">
        <button type="submit" className="btn action-btn" disabled={busy || !objectifValide(texte)}>{busy ? T.enregistrement : T.confirmer}</button>
        <button type="button" className="link" onClick={() => setEditing(false)}>{T.annuler}</button>
      </div>
      <p className="muted">{T.note}</p>
      {error && <p className="error" role="alert">{error}</p>}
    </form>}
  </div>;
}
