import {AvatarParticipant} from '@/components/AvatarParticipant';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { IconeCoach } from '@/components/IconeCoach';

import { eventIdFor, pickDefault, placerOngletActif } from '@/lib/espace';
import { nomParcours } from '@/lib/espace-textes';
import { COACH_MAX, coachTextes, enAttente, reveillerCoach, type CoachMessage } from '@/lib/coach';



type Enrollment = { enrollment_id: string; programme_id: string; langue: string; date_debut: string; etat: string; duree: number; nom: string };
type Loaded = { prenom: string; langue: string; enrollments: Enrollment[]; defaut: Enrollment | null; messages: CoachMessage[]; restants: number; quota: number };

async function load(): Promise<Loaded | null> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const ep = await supabase.rpc('ensure_participant', { p_prenom: (s.session.user.user_metadata?.['prenom'] as string | undefined) ?? '' });
  if (ep.error) throw ep.error;
  const [p, e, m, q] = await Promise.all([
    supabase.from('participants').select('langue,prenom').maybeSingle(),
    supabase.from('enrollments').select('enrollment_id, programme_id, langue, date_debut, etat').eq('etat', 'active'),
    supabase.from('coach_messages').select('message_id, role, texte, etat, cree_le, question_id').order('cree_le'),
    supabase.rpc('coach_quota'),
  ]);
  for (const r of [p, e, m, q]) if (r.error) throw r.error;
  const enr = (e.data ?? []) as Omit<Enrollment, 'duree' | 'nom'>[];
  let enrollments: Enrollment[] = [];
  if (enr.length) {
    const pr = await supabase.from('programmes').select('programme_id, nom, duree_jours').in('programme_id', [...new Set(enr.map(x => x.programme_id))]);
    if (pr.error) throw pr.error;
    const progs = new Map(((pr.data ?? []) as { programme_id: string; nom: string; duree_jours: number | null }[]).map(x => [x.programme_id, x]));
    enrollments = enr.map(x => {
      const prog = progs.get(x.programme_id);
      const duree = prog?.duree_jours ?? 7;
      return { ...x, duree, nom: nomParcours(prog?.nom ?? x.programme_id, x.langue, duree) };
    });
  }
  const defaut = pickDefault(enrollments);
  const quota = (q.data ?? { quota: 5, restants: 0 }) as { quota: number; restants: number };
  return {
    prenom: p.data?.prenom ?? s.session.user.user_metadata?.['prenom'] ?? '',
    langue: defaut?.langue ?? ((p.data?.langue as string | undefined) ?? 'fr'),
    enrollments, defaut,
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
  // Le parcours vient du lien de l'espace (?inscription=…) ; à défaut, le parcours en cours.
  const [params] = useSearchParams();
  const [chosen, setChosen] = useState<string | null>(params.get('inscription'));
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

  const enrollment = data ? (data.enrollments.find(x => x.enrollment_id === chosen) ?? data.defaut) : null;
  const T = coachTextes(enrollment?.langue ?? data?.langue);
  useEffect(() => { document.title = `${T.titre} — SÉNEVÉ`; document.documentElement.lang = (enrollment?.langue ?? data?.langue) === 'en' ? 'en' : 'fr'; }, [T, enrollment?.langue, data?.langue]);

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
    if (busy || !data || !enrollment) return;
    const t = texte.trim();
    if (!t || t.length > COACH_MAX) return;
    pendingId.current = eventIdFor(pendingId.current);
    setBusy(true); setError('');
    try {
      const { error } = await supabase.rpc('coach_ask', { p_client_message_id: pendingId.current, p_enrollment_id: enrollment.enrollment_id, p_texte: t });
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

  const en=(enrollment?.langue ?? data?.langue)==='en';
  const aideVers=enrollment ? `/aide?inscription=${enrollment.enrollment_id}` : '/aide';
  const tete=<header className="coach-entete"><div><Link to="/espace" aria-label={T.retour}><IconeCoach nom="arrow_back_ios_new" taille={20}/></Link><span>{en?'Coach conversation':'Conversation Coach'}</span></div><span className="coach-initiale" aria-hidden="true"><AvatarParticipant>{data?.prenom.trim().charAt(0).toUpperCase()}</AvatarParticipant></span></header>;
  if (failed && !data) return <main className="wrap coach-page">{tete}<div className="card"><p role="alert">{T.erreurChargement}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>{T.reessayer}</button></div></main>;
  if (!data) return <main className="wrap coach-page">{tete}<p className="muted">{T.chargement}</p></main>;

  const epuise = data.restants <= 0;
  const trop = texte.trim().length > COACH_MAX;
  return <main className="wrap coach-page">
    {tete}
    <div className="coach-editorial"><div className="coach-reperes"><span>{en?'Daily support':'Accompagnement quotidien'}</span><span className="coach-quota">{T.restants(data.restants,data.quota)}</span></div><h1>{T.titre}</h1><div className="coach-cadre"><p>{T.intro}</p><p>{T.avertissement}</p></div></div>
    {!enrollment ? <div className="card"><p>{T.sansParcours}</p></div> : <>
      <p className="sr-only">{T.surParcours}</p>
      {data.enrollments.length > 1
        ? <div className="prog-tabs" ref={placerOngletActif} role="tablist" aria-label={T.surParcours}>
            {data.enrollments.map(x => <button type="button" role="tab" key={x.enrollment_id} className="prog-tab" aria-selected={x.enrollment_id === enrollment.enrollment_id} onClick={() => setChosen(x.enrollment_id)}>{x.nom}</button>)}
          </div>
        : <p className="today-parcours">{enrollment.nom}</p>}
      <section className="coach-thread" aria-label={en?"Conversation history":"Historique de discussion"} aria-live="polite">
        {data.messages.length === 0 && <p className="muted">{T.aucun}</p>}
        {data.messages.map(m => <article key={m.message_id} className={`coach-msg ${m.role === 'coach' ? 'coach-msg-coach' : 'coach-msg-moi'}`}>
          {m.role==='coach' && <p className="coach-auteur"><IconeCoach nom="eco" taille={15}/>{T.coach}</p>}
          <div className="coach-bulle"><MessageCoach texte={m.texte}/></div>
          <p className="coach-heure">{new Intl.DateTimeFormat(T.locale,{timeZone:'Africa/Kinshasa',hour:'2-digit',minute:'2-digit'}).format(new Date(m.cree_le))}{m.role==='participant'&&m.etat!=='echec'&&<IconeCoach nom="done_all" taille={13}/>}</p>
          {m.role === 'participant' && m.etat === 'echec' && <p className="error">{T.echec}</p>}
        </article>)}
        {attente && <div className="coach-attente" role="status"><p className="coach-auteur"><IconeCoach nom="eco" taille={15}/>{T.coach}</p><div><span className="coach-points" aria-hidden="true"><i/><i/><i/></span><span>{T.attente}</span></div></div>}
        {(failed || data.messages.filter(m=>m.role==='participant').at(-1)?.etat==='echec') && <aside className="coach-indisponible"><IconeCoach nom="hourglass_empty" taille={20}/><div><h2>{en?'The coach cannot answer right now.':'Le coach ne peut pas répondre pour le moment.'}</h2><p>{T.aide}</p><Link to={aideVers}>{T.aideLien}<IconeCoach nom="arrow_forward" taille={18}/></Link>{failed&&<button type="button" onClick={()=>void refresh()}>{T.reessayer}</button>}</div></aside>}
        <div ref={bottom} />
      </section>
      <footer className="coach-saisie"><form className="coach-form" onSubmit={send}>
        <label className="field"><span className="sr-only">{T.placeholder}</span>
          <textarea rows={1} maxLength={COACH_MAX+100} value={texte} placeholder={T.placeholder} disabled={epuise} onChange={e => { setTexte(e.target.value); pendingId.current = null; e.target.style.height='auto';e.target.style.height=`${Math.min(e.target.scrollHeight,112)}px`; }} />
        </label>
        {trop && <p className="error" role="alert">{T.trop(COACH_MAX)}</p>}
        <button type="submit" aria-label={busy ? T.envoi : T.envoyer} className="btn action-btn moment-btn" disabled={busy || epuise || attente || !texte.trim() || trop}><IconeCoach nom="arrow_upward" taille={20}/></button>
        
        {error && <p className="error" role="alert">{error}</p>}
      </form><p className="coach-confidentialite"><IconeCoach nom="lock" taille={13}/>{T.conservation}</p>
      {epuise && <p className="coach-limite" role="status">{T.quota}</p>}
      </footer>
    </>}
    <p className="coach-aide">{T.aide} <Link className="link" to={aideVers}>{T.aideLien}</Link></p>
    {data.messages.length > 0 && (confirm
      ? <div className="row-actions"><p>{T.confirmer}</p><button type="button" className="link danger" disabled={busy} onClick={() => void clear()}>{T.oui}</button><button type="button" className="link" onClick={() => setConfirm(false)}>{T.non}</button></div>
      : <button type="button" className="link" onClick={() => setConfirm(true)}>{T.effacer}</button>)}
  </main>;
}


function MessageCoach({texte}:{texte:string}) {
 return <>{texte.split(/\n\s*\n/u).map((bloc,i)=>{
  const citation=bloc.trim().match(/^«\s*([\s\S]+?)\s*»(?:\n[—–-]\s*(.+))?$/u);
  return citation?<blockquote key={i}><p>{citation[1]}</p>{citation[2]&&<cite>— {citation[2]}</cite>}</blockquote>:<p className="day-text" key={i}>{bloc}</p>;
 })}</>;
}
