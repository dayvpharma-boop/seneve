import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { eventIdFor } from '@/lib/espace';
import { NOTE_MAX, draft, formatDateHeure, journalTextes, texteValide } from '@/lib/journal';

type Entry = { entry_id: string; texte: string; usage_ia_autorise: boolean; cree_le: string; modifie_le: string; activity_id: string | null };
type Loaded = { participantId: string; langue: string; entries: Entry[]; consigne: string | null };

async function load(activite: string | null): Promise<Loaded | null> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const ep = await supabase.rpc('ensure_participant', { p_prenom: (s.session.user.user_metadata?.['prenom'] as string | undefined) ?? '' });
  if (ep.error) throw ep.error;
  const [p, e, a] = await Promise.all([
    supabase.from('participants').select('langue').maybeSingle(),
    supabase.from('journal_entries').select('entry_id, texte, usage_ia_autorise, cree_le, modifie_le, activity_id').order('cree_le', { ascending: false }),
    activite ? supabase.from('activities').select('consigne').eq('activity_id', activite).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (p.error) throw p.error;
  if (e.error) throw e.error;
  return {
    participantId: ep.data as string,
    langue: (p.data?.langue as string | undefined) ?? 'fr',
    entries: (e.data ?? []) as Entry[],
    consigne: a.error ? null : ((a.data as { consigne?: string } | null)?.consigne ?? null),
  };
}

export function Journal() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inscription = params.get('inscription');
  const activite = inscription ? params.get('activite') : null;
  const draftKey = `journal:${activite ?? 'libre'}`;

  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [texte, setTexte] = useState(() => draft.read(draftKey));
  const [ia, setIa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const pendingId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    setFailed(false);
    try {
      const loaded = await load(activite);
      if (!loaded) { navigate('/connexion', { replace: true }); return; }
      setData(loaded);
    } catch { setFailed(true); }
  }, [activite, navigate]);
  useEffect(() => { void refresh(); }, [refresh]);

  const T = journalTextes(data?.langue);
  useEffect(() => { document.title = `${T.titreJournal} — SÉNEVÉ`; document.documentElement.lang = data?.langue === 'en' ? 'en' : 'fr'; }, [T, data?.langue]);

  function change(v: string) { setTexte(v); setSaved(false); draft.write(draftKey, v); }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const t = texteValide(texte, NOTE_MAX);
    if (!t) { setError(texte.trim() ? T.trop(NOTE_MAX) : ''); return; }
    // Même identifiant si l'envoi échoue : une nouvelle tentative ne crée jamais de note en double.
    pendingId.current = eventIdFor(pendingId.current);
    setBusy(true); setError('');
    try {
      if (!data) throw new Error('session');
      const { error } = await supabase.from('journal_entries').insert({
        entry_id: pendingId.current, participant_id: data.participantId, texte: t, usage_ia_autorise: ia,
        enrollment_id: inscription, activity_id: activite,
      });
      if (error && error.code !== '23505') throw error;
      pendingId.current = null;
      change(''); setIa(false); setSaved(true);
      await refresh();
    } catch { setError(T.erreurNote); }
    finally { setBusy(false); }
  }

  const back = <Link className="link" to="/espace">← {T.retour}</Link>;
  if (failed) return <main className="wrap"><p className="brand">SÉNEVÉ</p>{back}<div className="card"><p role="alert">{T.erreurChargement}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>{T.reessayer}</button></div></main>;
  if (!data) return <main className="wrap"><p className="brand">SÉNEVÉ</p><p className="muted">{T.chargement}</p></main>;

  const trop = texte.trim().length > NOTE_MAX;
  return <main className="wrap">
    <p className="brand">SÉNEVÉ</p>
    {back}
    <h1>{T.titreJournal}</h1>
    <p className="muted">{T.introJournal}</p>
    <form className="card" onSubmit={save}>
      <p className="tag">{T.nouvelle}</p>
      {data.consigne && <p className="action"><span className="muted">{T.reponseA}</span> {data.consigne}</p>}
      <label className="field"><span className="sr-only">{T.nouvelle}</span>
        <textarea rows={6} value={texte} maxLength={NOTE_MAX + 500} placeholder={T.placeholderNote} onChange={e => change(e.target.value)} />
      </label>
      {trop && <p className="error" role="alert">{T.trop(NOTE_MAX)}</p>}
      <label className="share-check"><input type="checkbox" checked={ia} onChange={e => setIa(e.target.checked)} /><span>{T.iaCase}<br /><span className="muted">{T.iaAide}</span></span></label>
      <button type="submit" className="btn action-btn" disabled={busy || !texte.trim() || trop}>{busy ? T.enregistrement : T.enregistrer}</button>
      {texte.trim() && !busy && <p className="muted">{T.brouillon}</p>}
      {saved && <p className="success" role="status">{T.enregistree}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </form>
    <h2>{T.mesNotes}</h2>
    {data.entries.length === 0 ? <p className="muted">{T.aucune}</p>
      : data.entries.map(x => <EntryCard key={x.entry_id} entry={x} langue={data.langue} onChanged={refresh} />)}
  </main>;
}

function EntryCard({ entry, langue, onChanged }: { entry: Entry; langue: string; onChanged: () => Promise<void> }) {
  const T = journalTextes(langue);
  const [editing, setEditing] = useState(false);
  const [texte, setTexte] = useState(entry.texte);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(op: () => PromiseLike<{ error: unknown }>) {
    setBusy(true); setError('');
    try {
      const { error } = await op();
      if (error) throw error;
      setEditing(false); setConfirm(false);
      await onChanged();
    } catch { setError(T.erreurAction); }
    finally { setBusy(false); }
  }
  const t = texteValide(texte, NOTE_MAX);
  const edited = entry.modifie_le && new Date(entry.modifie_le).getTime() - new Date(entry.cree_le).getTime() > 60000;

  return <article className="card">
    <p className="muted">{formatDateHeure(entry.cree_le, T.locale)}{edited ? ` · ${T.modifiee}` : ''}</p>
    {editing
      ? <label className="field"><span className="sr-only">{T.modifier}</span><textarea rows={5} value={texte} onChange={e => setTexte(e.target.value)} /></label>
      : <p className="day-text">{entry.texte}</p>}
    <p className="muted">{entry.usage_ia_autorise ? T.iaOui : T.iaNon}</p>
    {editing ? <div className="row-actions">
      <button type="button" className="btn action-btn" disabled={busy || !t} onClick={() => void run(() => supabase.from('journal_entries').update({ texte: t }).eq('entry_id', entry.entry_id))}>{busy ? T.enregistrement : T.enregistrer}</button>
      <button type="button" className="link" onClick={() => { setEditing(false); setTexte(entry.texte); }}>{T.annulerModif}</button>
    </div> : confirm ? <div className="row-actions">
      <p>{T.confirmerSuppr}</p>
      <button type="button" className="link danger" disabled={busy} onClick={() => void run(() => supabase.from('journal_entries').delete().eq('entry_id', entry.entry_id))}>{T.oui}</button>
      <button type="button" className="link" onClick={() => setConfirm(false)}>{T.non}</button>
    </div> : <div className="row-actions">
      <button type="button" className="link" disabled={busy} onClick={() => void run(() => supabase.from('journal_entries').update({ usage_ia_autorise: !entry.usage_ia_autorise }).eq('entry_id', entry.entry_id))}>{entry.usage_ia_autorise ? T.retirerIa : T.autoriserIa}</button>
      <button type="button" className="link" onClick={() => setEditing(true)}>{T.modifier}</button>
      <button type="button" className="link" onClick={() => setConfirm(true)}>{T.supprimer}</button>
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
  </article>;
}
