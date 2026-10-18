import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { langueMemorisee } from '@/lib/langue';
import { BarreNav } from '@/components/BarreNav';
import { Icone } from '@/components/Icone';
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
  // « Écrire » (barre du bas) ou « Écrire ma réflexion » : le champ de la note est prêt à recevoir le texte.
  const champ = useRef<HTMLTextAreaElement>(null);
  const ecrire = params.has('ecrire') || Boolean(activite);
  // Page « Journal » : les notes d'abord, le formulaire s'ouvre avec « Nouvelle note » (ou tout de suite pour « Écrire »,
  // une question du jour, ou un brouillon en cours).
  const [formOuvert, setFormOuvert] = useState(() => ecrire || Boolean(draft.read(draftKey)));
  const focusDemande = useRef(false);
  // Passage de « Écrire » à « Journal » (barre du bas) : on revient aux notes, sauf s'il y a un texte en cours.
  const ecrireAvant = useRef(ecrire);
  useEffect(() => {
    if (ecrire) setFormOuvert(true);
    else if (ecrireAvant.current && !texte.trim()) setFormOuvert(false);
    ecrireAvant.current = ecrire;
  }, [ecrire]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    setFailed(false);
    try {
      const loaded = await load(activite);
      if (!loaded) { navigate('/connexion', { replace: true }); return; }
      setData(loaded);
    } catch { setFailed(true); }
  }, [activite, navigate]);
  useEffect(() => { void refresh(); }, [refresh]);
  const pret = data !== null;
  useEffect(() => {
    if (!pret || !formOuvert || !champ.current || !(ecrire || focusDemande.current)) return;
    focusDemande.current = false;
    try { champ.current.scrollIntoView({ block: 'center' }); } catch { /* sans défilement */ }
    champ.current.focus({ preventScroll: true });
  }, [pret, ecrire, formOuvert]);

  // Avant la lecture du compte : la dernière langue connue sur cet appareil.
  const L = data?.langue ?? langueMemorisee();
  const T = journalTextes(L);
  useEffect(() => { document.title = `${T.titreJournal} — SÉNEVÉ`; document.documentElement.lang = L === 'en' ? 'en' : 'fr'; }, [T, L]);

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

  // En-tête commun à l'espace (écran « Aujourd'hui » validé le 15/10/2026).
  const tete = <header className="today-head"><div><p className="brand">SÉNEVÉ</p><h1>{T.titreJournal}</h1></div></header>;
  const intro = <p className="journal-intro"><Icone nom="cadenas" taille={18} />{T.introJournal}</p>;
  const back = <Link className="link" to="/espace">← {T.retour}</Link>;
  if (failed) return <main className="wrap avec-nav">{tete}<div className="card"><p role="alert">{T.erreurChargement}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>{T.reessayer}</button></div>{back}<BarreNav langue={L} /></main>;
  if (!data) return <main className="wrap avec-nav">{tete}<p className="muted">{T.chargement}</p><BarreNav langue={L} /></main>;

  const trop = texte.trim().length > NOTE_MAX;
  return <main className="wrap avec-nav">
    {tete}
    {intro}
    {formOuvert
      ? <form className="card journal-form" onSubmit={save} aria-label={T.nouvelle}>
          <p className="tag">{T.nouvelle}</p>
          {data.consigne && <div className="prompt-carte journal-question"><p className="tag">{T.reponseA}</p><p className="prompt-question">{data.consigne}</p></div>}
          <label className="field"><span className="sr-only">{T.nouvelle}</span>
            <textarea ref={champ} rows={6} value={texte} maxLength={NOTE_MAX + 500} placeholder={T.placeholderNote} onChange={e => change(e.target.value)} />
          </label>
          {trop && <p className="error" role="alert">{T.trop(NOTE_MAX)}</p>}
          <label className="share-check"><input type="checkbox" checked={ia} onChange={e => setIa(e.target.checked)} /><span>{T.iaCase}<br /><span className="muted">{T.iaAide}</span></span></label>
          <button type="submit" className="btn action-btn moment-btn" disabled={busy || !texte.trim() || trop}>{busy ? T.enregistrement : T.enregistrer}</button>
          {texte.trim() && !busy && <p className="muted">{T.brouillon}</p>}
          {saved && <p className="success" role="status">{T.enregistree}</p>}
          {error && <p className="error" role="alert">{error}</p>}
        </form>
      : <button type="button" className="btn moment-btn journal-nouvelle" onClick={() => { focusDemande.current = true; setFormOuvert(true); }}><Icone nom="crayon" taille={20} />{T.nouvelle}</button>}
    <section className="today-section" aria-labelledby="titre-notes">
      <h2 id="titre-notes">{T.mesNotes}</h2>
      {data.entries.length === 0
        ? <div className="card journal-vide"><Icone nom="journal" taille={28} /><p>{T.aucune}</p></div>
        : data.entries.map(x => <EntryCard key={x.entry_id} entry={x} langue={data.langue} onChanged={refresh} />)}
    </section>
    <BarreNav langue={data.langue} />
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

  return <article className="card note-carte">
    <p className="note-date">{formatDateHeure(entry.cree_le, T.locale)}{edited ? ` · ${T.modifiee}` : ''}</p>
    {editing
      ? <label className="field"><span className="sr-only">{T.modifier}</span><textarea rows={5} value={texte} onChange={e => setTexte(e.target.value)} /></label>
      : <p className="day-text">{entry.texte}</p>}
    <p className="note-ia"><span className="time-chip">{entry.usage_ia_autorise ? T.iaOui : T.iaNon}</span></p>
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
