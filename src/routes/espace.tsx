import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { dayInfo, eventIdFor, webText, TOTAL_DAYS } from '@/lib/espace';

type Enrollment = { enrollment_id: string; programme_id: string; version: number | string; langue: string; date_debut: string; etat: string };
type Content = { content_id: string; programme_id: string; version: number | string; jour: number; numero_message: number; theme: string; explication: string | null; texte_officiel: string; reference_livre: string | null };
type Activity = { activity_id: string; content_id: string; type_activite: 'action' | 'question'; consigne: string; obligatoire: boolean };
type State = { enrollment_id: string; activity_id: string; etat: string; realisee_le: string | null };
type Data = { prenom: string; enrollment: Enrollment | null; contents: Content[]; activities: Activity[]; states: State[] };

const LOAD_ERROR = 'Impossible de charger ta journée pour le moment.';

/** Charge les données du participant connecté. Renvoie null s'il n'y a pas de session. */
async function load(): Promise<Data | null> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const user = s.session.user;
  const meta = (user.user_metadata?.['prenom'] as string | undefined) ?? '';
  const ep = await supabase.rpc('ensure_participant', { p_prenom: meta });
  if (ep.error) throw ep.error;
  const [p, e] = await Promise.all([
    supabase.from('participants').select('prenom').maybeSingle(),
    supabase.from('enrollments').select('enrollment_id, programme_id, version, langue, date_debut, etat').order('date_debut', { ascending: false }),
  ]);
  if (p.error) throw p.error;
  if (e.error) throw e.error;
  const prenom = (p.data?.prenom as string | undefined) ?? meta;
  const enrollment = (e.data?.[0] as Enrollment | undefined) ?? null;
  if (!enrollment) return { prenom, enrollment, contents: [], activities: [], states: [] };
  const c = await supabase.from('contents').select('content_id, programme_id, version, jour, numero_message, theme, explication, texte_officiel, reference_livre')
    .eq('programme_id', enrollment.programme_id).eq('version', enrollment.version).order('jour').order('numero_message');
  if (c.error) throw c.error;
  const contents = (c.data ?? []) as Content[];
  const ids = contents.map(x => x.content_id);
  const [a, st] = await Promise.all([
    ids.length ? supabase.from('activities').select('activity_id, content_id, type_activite, consigne, obligatoire').in('content_id', ids) : Promise.resolve({ data: [], error: null }),
    supabase.from('activity_state').select('enrollment_id, activity_id, etat, realisee_le').eq('enrollment_id', enrollment.enrollment_id),
  ]);
  if (a.error) throw a.error;
  if (st.error) throw st.error;
  return { prenom, enrollment, contents, activities: (a.data ?? []) as Activity[], states: (st.data ?? []) as State[] };
}

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Kinshasa', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

export function Espace() {
  const navigate = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    setFailed(false); setData(null);
    try {
      const loaded = await load();
      if (!loaded) { navigate('/connexion', { replace: true }); return; }
      setData(loaded);
    } catch { setFailed(true); }
  }, [navigate]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { document.title = 'Mon espace — SÉNEVÉ'; document.documentElement.lang = 'fr'; }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/connexion', { replace: true });
  }

  async function start() {
    setStarting(true);
    const { error } = await supabase.rpc('start_discovery', { p_langue: 'fr' });
    setStarting(false);
    if (error) { setFailed(true); return; }
    await refresh();
  }

  const header = <div className="espace-head"><p className="brand">SÉNEVÉ</p>{data && <h1>{data.prenom ? `Bonjour ${data.prenom}` : 'Bonjour'}</h1>}<button type="button" className="link" onClick={signOut}>Se déconnecter</button></div>;
  const errorCard = <div className="card"><p role="alert">{LOAD_ERROR}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>Réessayer</button></div>;

  if (failed) return <main className="wrap">{header}{errorCard}</main>;
  if (!data) return <main className="wrap">{header}<p className="muted">Chargement…</p></main>;

  if (!data.enrollment) return <main className="wrap">{header}
    <div className="card"><p className="tag">Découverte 7 jours</p>
      <p>Un parcours gratuit de 7 jours, à ton rythme, à partir du livre « Arrête de mendier des miracles ».</p>
      <button type="button" className="btn" disabled={starting} onClick={start}>{starting ? 'Un instant…' : 'Commencer la Découverte'}</button>
    </div></main>;

  const { day, finished } = dayInfo(data.enrollment.date_debut);
  const maxOpen = finished ? TOTAL_DAYS : day;
  const current = selected ?? day;
  const content = data.contents.find(c => c.jour === current);
  if (!content) return <main className="wrap">{header}{errorCard}</main>;
  const acts = data.activities.filter(a => a.content_id === content.content_id);
  const action = acts.find(a => a.type_activite === 'action');
  const question = acts.find(a => a.type_activite === 'question');

  return <main className="wrap">{header}
    {finished ? <p>Ta Découverte de 7 jours est terminée. Tu peux relire les 7 journées.</p> : <p className="day-count">Jour {day} sur 7</p>}
    <div className="day-chips">
      {Array.from({ length: TOTAL_DAYS }, (_, k) => k + 1).map(n => <button type="button" key={n} className="day-chip" aria-pressed={n === current} disabled={n > maxOpen} aria-label={n > maxOpen ? `Jour ${n}, pas encore ouvert` : `Jour ${n}`} onClick={() => setSelected(n)}>{n}</button>)}
    </div>
    {maxOpen < TOTAL_DAYS && <p className="muted">Le jour {maxOpen + 1} s'ouvre demain.</p>}
    <article className="card">
      <p className="tag">Jour {current}</p>
      <h2>{content.theme}</h2>
      <p className="day-text">{webText(content.texte_officiel, data.prenom)}</p>
      {content.reference_livre && <p className="src">Dans le livre : {content.reference_livre}</p>}
    </article>
    {action && <ActionCard key={action.activity_id} enrollmentId={data.enrollment.enrollment_id} activity={action} state={data.states.find(s => s.activity_id === action.activity_id)} />}
    {question && <div className="card"><p className="tag">Question pour réfléchir</p><p className="action">{question.consigne}</p></div>}
  </main>;
}

function ActionCard({ enrollmentId, activity, state }: { enrollmentId: string; activity: Activity; state: State | undefined }) {
  const [doneAt, setDoneAt] = useState<string | null>(state?.etat === 'realisee' ? (state.realisee_le ?? '') : null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const eventId = useRef<string | null>(null);

  async function record() {
    if (pending) return;
    // Le même identifiant est réutilisé si l'envoi échoue : une nouvelle tentative ne crée jamais de doublon.
    eventId.current = eventIdFor(eventId.current);
    setPending(true); setError(false);
    try {
      const { data, error } = await supabase.rpc('record_progress', { p_enrollment_id: enrollmentId, p_activity_id: activity.activity_id, p_client_event_id: eventId.current, p_etat: 'realisee', p_canal: 'web' });
      if (error || !data || (data as { etat?: string }).etat !== 'realisee') throw error ?? new Error('bad');
      eventId.current = null;
      setDoneAt(new Date().toISOString());
    } catch { setError(true); }
    finally { setPending(false); }
  }

  return <div className="card"><p className="tag">Ton action du jour</p><p className="action">{activity.consigne}</p>
    {doneAt !== null
      ? <p className="success" role="status">Action réalisée{doneAt ? ` le ${formatDate(doneAt)}` : ''}</p>
      : <>
        <button type="button" className="btn action-btn" disabled={pending} onClick={record}>{pending ? 'Enregistrement…' : "J'ai réalisé cette action"}</button>
        {error && <p className="error" role="alert">Non enregistré. Vérifie ta connexion et réessaie.</p>}
      </>}
  </div>;
}
