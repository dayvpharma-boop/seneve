import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { eventIdFor, pickDefault } from '@/lib/espace';
import { COACH_MAX, coachTextes, enAttente, reveillerCoach, type CoachMessage } from '@/lib/coach';

type Enrollment = { enrollment_id: string; programme_id: string; langue: string; date_debut: string; etat: string; duree: number };
type Loaded = { langue: string; enrollment: Enrollment | null; messages: CoachMessage[]; restants: number; quota: number };

async function load(): Promise<Loaded | null> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const ep = await supabase.rpc('ensure_participant', { p_prenom: (s.session.user.user_metadata?.['prenom'] as string | undefined) ?? '' });
  if (ep.error) throw ep.error;
  const [p, e, m, q] = await Promise.all([
    supabase.from('participants').select('langue').maybeSingle(),
    supabase.from('enrollments').select('enrollment_id, programme_id, langue, date_debut, etat').eq('etat', 'active'),
    supabase.from('coach_messages').select('message_id, role, texte, etat, cree_le, question_id').order('cree_le'),
    supabase.rpc('coach_quota'),
  ]);
  for (const r of [p, e, m, q]) if (r.error) throw r.error;
  const enr = (e.data ?? []) as Omit<Enrollment, 'duree'>[];
  let enrollment: Enrollment | null = null;
  if (enr.length) {
    const pr = await supabase.from('programmes').select('programme_id, duree_jours').in('programme_id', [...new Set(enr.map(x => x.programme_id))]);
    if (pr.error) throw pr.error;
    const durees = new Map(((pr.data ?? []) as { programme_id: string; duree_jours: number | null }[]).map(x => [x.programme_id, x.duree_jours ?? 7]));
    enrollment = pickDefault(enr.map(x => ({ ...x, duree: durees.get(x.programme_id) ?? 7 })));
  }
  const quota = (q.data ?? { quota: 5, restants: 0 }) as { quota: number; restants: number };
  return {
    langue: enrollment?.langue ?? ((p.data?.langue as string | undefined) ?? 'fr'),
    enrollment,
    messages: (m.data ?? []) as CoachMessage[],
    restants: quota.restants, quota: quota.quota,
  };
}

export function Coach() {
  const navigate = useNavigate();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [texte, setTexte] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const pendingId = useRef<string | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const loaded = await load();
      if (!loaded) { navigate('/connexion', { replace: true }); return; }
      setData(loaded); setFailed(false);
    } catch { setFailed(true); }
  }, [navigate]);
  useEffect(() => { void refresh(); }, [refresh]);

  const T = coachTextes(data?.langue);
  useEffect(() => { document.title = `${T.titre} — SÉNEVÉ`; document.documentElement.lang = data?.langue === 'en' ? 'en' : 'fr'; }, [T, data?.langue]);

  // Tant qu'une réponse est attendue, on relit la conversation toutes les 4 secondes.
  const attente = data ? enAttente(data.messages) : false;
  useEffect(() => {
    if (!attente) return;
    const t = window.setInterval(() => { void refresh(); }, 4000);
    return () => window.clearInterval(t);
  }, [attente, refresh]);
  useEffect(() => { bottom.current?.scrollIntoView?.({ block: 'end' }); }, [data?.messages.length, attente]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (busy || !data?.enrollment) return;
    const t = texte.trim();
    if (!t || t.length > COACH_MAX) return;
    pendingId.current = eventIdFor(pendingId.current);
    setBusy(true); setError('');
    try {
      const { error } = await supabase.rpc('coach_ask', { p_client_message_id: pendingId.current, p_enrollment_id: data.enrollment.enrollment_id, p_texte: t });
      if (error) { setError(error.message.includes('QUOTA_ATTEINT') ? T.quota : T.erreurEnvoi); return; }
      pendingId.current = null;
      setTexte('');
      reveillerCoach();
      await refresh();
    } catch { setError(T.erreurEnvoi); }
    finally { setBusy(false); }
  }

  async function clear() {
    setBusy(true); setError('');
    const { error } = await supabase.rpc('coach_clear');
    setBusy(false); setConfirm(false);
    if (error) { setError(T.erreurEnvoi); return; }
    await refresh();
  }

  const back = <Link className="link" to="/espace">← {T.retour}</Link>;
  if (failed && !data) return <main className="wrap"><p className="brand">SÉNEVÉ</p>{back}<div className="card"><p role="alert">{T.erreurChargement}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>{T.reessayer}</button></div></main>;
  if (!data) return <main className="wrap"><p className="brand">SÉNEVÉ</p><p className="muted">{T.chargement}</p></main>;

  const epuise = data.restants <= 0;
  const trop = texte.trim().length > COACH_MAX;
  return <main className="wrap">
    <p className="brand">SÉNEVÉ</p>
    {back}
    <h1>{T.titre}</h1>
    <p>{T.intro}</p>
    <p className="notice" role="note">{T.avertissement} {T.conservation}</p>
    {!data.enrollment ? <div className="card"><p>{T.sansParcours}</p></div> : <>
      <section className="coach-thread" aria-live="polite">
        {data.messages.length === 0 && <p className="muted">{T.aucun}</p>}
        {data.messages.map(m => <div key={m.message_id} className={`coach-msg ${m.role === 'coach' ? 'coach-msg-coach' : 'coach-msg-moi'}`}>
          <p className="tag">{m.role === 'coach' ? T.coach : T.vous}</p>
          <p className="day-text">{m.texte}</p>
          {m.role === 'participant' && m.etat === 'echec' && <p className="error">{T.echec}</p>}
        </div>)}
        {attente && <p className="muted" role="status">{T.attente}</p>}
        <div ref={bottom} />
      </section>
      <form className="card" onSubmit={send}>
        <label className="field"><span className="sr-only">{T.placeholder}</span>
          <textarea rows={3} value={texte} placeholder={T.placeholder} disabled={epuise} onChange={e => { setTexte(e.target.value); pendingId.current = null; }} />
        </label>
        {trop && <p className="error" role="alert">{T.trop(COACH_MAX)}</p>}
        <button type="submit" className="btn action-btn" disabled={busy || epuise || attente || !texte.trim() || trop}>{busy ? T.envoi : T.envoyer}</button>
        <p className="muted">{epuise ? T.quota : T.restants(data.restants, data.quota)}</p>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </>}
    <p className="muted">{T.aide} <Link className="link" to={data.enrollment ? `/aide?inscription=${data.enrollment.enrollment_id}` : '/aide'}>{T.aideLien}</Link></p>
    {data.messages.length > 0 && (confirm
      ? <div className="row-actions"><p>{T.confirmer}</p><button type="button" className="link danger" disabled={busy} onClick={() => void clear()}>{T.oui}</button><button type="button" className="link" onClick={() => setConfirm(false)}>{T.non}</button></div>
      : <button type="button" className="link" onClick={() => setConfirm(true)}>{T.effacer}</button>)}
  </main>;
}
