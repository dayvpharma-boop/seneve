import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { BarreNav } from '@/components/BarreNav';
import { Icone } from '@/components/Icone';
import { eventIdFor } from '@/lib/espace';
import { nomParcours } from '@/lib/espace-textes';
import { MOTIF_MAX, draft, formatDateHeure, journalTextes, peutAnnuler, texteValide } from '@/lib/journal';

type Request = { request_id: string; motif: string; etat: string; reponse: string | null; extraits_partages: string | null; cree_le: string };
type Note = { entry_id: string; texte: string; cree_le: string };
type Parcours = { enrollment_id: string; nom: string };
type Loaded = { langue: string; requests: Request[]; notes: Note[]; parcours: Parcours[] };

async function load(): Promise<Loaded | null> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const ep = await supabase.rpc('ensure_participant', { p_prenom: (s.session.user.user_metadata?.['prenom'] as string | undefined) ?? '' });
  if (ep.error) throw ep.error;
  const [p, h, j, e] = await Promise.all([
    supabase.from('participants').select('langue').maybeSingle(),
    supabase.from('help_requests').select('request_id, motif, etat, reponse, extraits_partages, cree_le').order('cree_le', { ascending: false }),
    supabase.from('journal_entries').select('entry_id, texte, cree_le').order('cree_le', { ascending: false }),
    supabase.from('enrollments').select('enrollment_id, programme_id, langue').neq('etat', 'annulee'),
  ]);
  for (const r of [p, h, j, e]) if (r.error) throw r.error;
  const enr = (e.data ?? []) as { enrollment_id: string; programme_id: string; langue: string }[];
  let parcours: Parcours[] = [];
  if (enr.length) {
    const pr = await supabase.from('programmes').select('programme_id, nom, duree_jours').in('programme_id', [...new Set(enr.map(x => x.programme_id))]);
    if (pr.error) throw pr.error;
    const progs = (pr.data ?? []) as { programme_id: string; nom: string; duree_jours: number | null }[];
    parcours = enr.map(x => {
      const prog = progs.find(q => q.programme_id === x.programme_id);
      return { enrollment_id: x.enrollment_id, nom: nomParcours(prog?.nom ?? x.programme_id, x.langue, prog?.duree_jours ?? 7) };
    });
  }
  return {
    langue: (p.data?.langue as string | undefined) ?? 'fr',
    requests: (h.data ?? []) as Request[],
    notes: (j.data ?? []) as Note[],
    parcours,
  };
}

function apercu(texte: string): string {
  const t = texte.replace(/\s+/g, ' ').trim();
  return t.length > 90 ? `${t.slice(0, 90)}…` : t;
}

export function Aide() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [motif, setMotif] = useState(() => draft.read('aide'));
  const [parcours, setParcours] = useState(params.get('inscription') ?? '');
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const pendingId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    setFailed(false);
    try {
      const loaded = await load();
      if (!loaded) { navigate('/connexion', { replace: true }); return; }
      setData(loaded);
    } catch { setFailed(true); }
  }, [navigate]);
  useEffect(() => { void refresh(); }, [refresh]);

  const T = journalTextes(data?.langue);
  useEffect(() => { document.title = `${T.titreAide} — SÉNEVÉ`; document.documentElement.lang = data?.langue === 'en' ? 'en' : 'fr'; }, [T, data?.langue]);

  // Toute modification du formulaire en fait une nouvelle demande (nouvel identifiant à l'envoi).
  function edited() { pendingId.current = null; setSent(false); }
  function changeMotif(v: string) { setMotif(v); draft.write('aide', v); edited(); }
  function toggle(id: string) { setNotes(n => n.includes(id) ? n.filter(x => x !== id) : [...n, id]); edited(); }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (busy || !data) return;
    const m = texteValide(motif, MOTIF_MAX);
    if (!m) { setError(motif.trim() ? T.trop(MOTIF_MAX) : ''); return; }
    pendingId.current = eventIdFor(pendingId.current);
    setBusy(true); setError('');
    try {
      const enrollment = data.parcours.some(x => x.enrollment_id === parcours) ? parcours : null;
      const { error } = await supabase.rpc('request_help', { p_client_request_id: pendingId.current, p_motif: m, p_enrollment_id: enrollment, p_entry_ids: notes });
      if (error) { setError(error.message.includes('Trop de demandes') ? T.tropDemandes : T.erreurEnvoi); return; }
      pendingId.current = null;
      setMotif(''); draft.write('aide', ''); setNotes([]); setSent(true);
      await refresh();
    } catch { setError(T.erreurEnvoi); }
    finally { setBusy(false); }
  }

  const back = <Link className="link" to="/espace">← {T.retour}</Link>;
  if (failed) return <main className="wrap avec-nav"><p className="brand">SÉNEVÉ</p>{back}<div className="card"><p role="alert">{T.erreurChargement}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>{T.reessayer}</button></div><BarreNav langue={data?.langue} /></main>;
  if (!data) return <main className="wrap avec-nav"><p className="brand">SÉNEVÉ</p><p className="muted">{T.chargement}</p><BarreNav langue={data?.langue} /></main>;

  const trop = motif.trim().length > MOTIF_MAX;
  return <main className="wrap avec-nav">
    <p className="brand">SÉNEVÉ</p>
    {back}
    <h1>{T.titreAide}</h1>
    <p>{T.introAide}</p>
    <p className="notice" role="note">{T.urgence}</p>
    {/* Le coach est rangé ici depuis la barre du bas (écran validé le 15/10/2026). */}
    <Link className="btn-secondaire coach-lien" to={`/coach${parcours ? `?inscription=${parcours}` : ''}`}><Icone nom="coach" taille={20} />{T.parlerCoach}</Link>
    <form className="card" onSubmit={send}>
      <label className="field"><span>{T.motif}</span>
        <textarea rows={5} value={motif} placeholder={T.placeholderMotif} onChange={e => changeMotif(e.target.value)} />
      </label>
      {trop && <p className="error" role="alert">{T.trop(MOTIF_MAX)}</p>}
      {data.parcours.length > 0 && <label className="field"><span>{T.parcours}</span>
        <select value={parcours} onChange={e => { setParcours(e.target.value); edited(); }}>
          <option value="">{T.aucunParcours}</option>
          {data.parcours.map(x => <option key={x.enrollment_id} value={x.enrollment_id}>{x.nom}</option>)}
        </select>
      </label>}
      {data.notes.length > 0 && <fieldset className="field">
        <legend>{T.partager}</legend>
        <p className="muted">{T.partagerAide}</p>
        {data.notes.slice(0, 20).map(n => <label key={n.entry_id} className="share-check">
          <input type="checkbox" checked={notes.includes(n.entry_id)} onChange={() => toggle(n.entry_id)} />
          <span>{apercu(n.texte)}<br /><span className="muted">{formatDateHeure(n.cree_le, T.locale)}</span></span>
        </label>)}
      </fieldset>}
      <button type="submit" className="btn action-btn" disabled={busy || !motif.trim() || trop}>{busy ? T.envoi : T.envoyer}</button>
      {sent && <p className="success" role="status">{T.envoyee}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </form>
    <h2>{T.mesDemandes}</h2>
    {data.requests.length === 0 ? <p className="muted">{T.aucuneDemande}</p>
      : data.requests.map(r => <RequestCard key={r.request_id} request={r} langue={data.langue} onChanged={refresh} />)}
  <BarreNav langue={data?.langue} /></main>;
}

function RequestCard({ request, langue, onChanged }: { request: Request; langue: string; onChanged: () => Promise<void> }) {
  const T = journalTextes(langue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function cancel() {
    setBusy(true); setError('');
    try {
      const { error } = await supabase.rpc('cancel_help_request', { p_request_id: request.request_id });
      if (error) throw error;
      await onChanged();
    } catch { setError(T.erreurAction); }
    finally { setBusy(false); }
  }

  return <article className="card">
    <p className="tag">{T.etats[request.etat] ?? request.etat}</p>
    <p className="muted">{formatDateHeure(request.cree_le, T.locale)}</p>
    <p className="day-text">{request.motif}</p>
    {request.extraits_partages && <details><summary className="muted">{T.notesJointes}</summary><p className="day-text">{request.extraits_partages}</p></details>}
    {request.reponse && <p className="day-text"><strong>{T.reponse}</strong> {request.reponse}</p>}
    {peutAnnuler(request.etat) && <button type="button" className="link" disabled={busy} onClick={() => void cancel()}>{T.annulerDemande}</button>}
    {error && <p className="error" role="alert">{error}</p>}
  </article>;
}
