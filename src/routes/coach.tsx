import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { BarreNav } from '@/components/BarreNav';
import { Icone } from '@/components/Icone';
import { eventIdFor, pickDefault, placerOngletActif } from '@/lib/espace';
import { nomParcours } from '@/lib/espace-textes';
import { COACH_MAX, coachTextes, enAttente, reveillerCoach, type CoachMessage } from '@/lib/coach';

type Enrollment = { enrollment_id: string; programme_id: string; langue: string; date_debut: string; etat: string; duree: number; nom: string };
type Loaded = { langue: string; enrollments: Enrollment[]; defaut: Enrollment | null; messages: CoachMessage[]; restants: number; quota: number };

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

  // Mise en page de la maquette validée « Coach » (image app/corrigé/13-ecran) : barre du haut, étiquette et
  // compteur, présentation encadrée, bulles alignées avec l'heure, points d'attente, saisie fixée en bas.
  const heure = (iso: string) => new Intl.DateTimeFormat(T.locale, { timeZone: 'Africa/Kinshasa', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const barre = <header className="cm-barre">
    <Link className="cm-retour" to="/espace" aria-label={T.retour}><Icone nom="fleche_gauche" taille={22} /></Link>
    <p className="cm-barre-titre">{T.barre}</p>
    <span className="cm-pastille" aria-hidden="true"><Icone nom="personne" taille={18} /></span>
  </header>;
  const tete = <header className="cm-tete">
    <div className="cm-ligne"><p className="cm-etiquette">{T.etiquette}</p>
      {data && enrollment && <p className="cm-compteur"><span className="cm-point" aria-hidden="true" />{data.restants <= 0 ? T.restants(0, data.quota) : T.restants(data.restants, data.quota)}</p>}</div>
    <h1>{T.titre}</h1>
    <div className="cm-intro"><p>{T.intro}</p><p className="cm-avertissement">{T.avertissement}</p></div>
  </header>;
  const nav = <BarreNav langue={enrollment?.langue ?? data?.langue} />;
  if (failed && !data) return <main className="wrap avec-nav cm-page">{barre}{tete}<div className="cm-alerte"><Icone nom="sablier" taille={20} /><div><p role="alert">{T.erreurChargement}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>{T.reessayer}</button></div></div>{nav}</main>;
  if (!data) return <main className="wrap avec-nav cm-page">{barre}{tete}<p className="muted">{T.chargement}</p>{nav}</main>;

  const epuise = data.restants <= 0;
  const trop = texte.trim().length > COACH_MAX;
  const lienAide = enrollment ? `/aide?inscription=${enrollment.enrollment_id}` : '/aide';
  return <main className="wrap avec-nav cm-page">
    {barre}
    {tete}
    {!enrollment ? <div className="cm-alerte"><Icone nom="sablier" taille={20} /><div><p>{T.sansParcours}</p><Link className="cm-lien" to="/espace">{T.retour}<Icone nom="fleche" taille={18} /></Link></div></div> : <>
      {data.enrollments.length > 1
        ? <div className="prog-tabs" ref={placerOngletActif} role="tablist" aria-label={T.surParcours}>
            {data.enrollments.map(x => <button type="button" role="tab" key={x.enrollment_id} className="prog-tab" aria-selected={x.enrollment_id === enrollment.enrollment_id} onClick={() => setChosen(x.enrollment_id)}>{x.nom}</button>)}
          </div>
        : <p className="cm-repere"><span className="sr-only">{T.surParcours} </span>{enrollment.nom}</p>}
      <section className="cm-fil" aria-live="polite" aria-label={T.barre}>
        {data.messages.length === 0 && <p className="cm-vide">{T.aucun}</p>}
        {data.messages.map(m => m.role === 'coach'
          ? <article key={m.message_id} className="cm-msg cm-msg-coach">
              <p className="cm-auteur"><Icone nom="graine" taille={15} />{T.coach}</p>
              <div className="cm-bulle"><p className="day-text">{m.texte}</p></div>
              <p className="cm-heure">{heure(m.cree_le)}</p>
            </article>
          : <article key={m.message_id} className="cm-msg cm-msg-moi">
              <p className="sr-only">{T.vous}</p>
              <div className="cm-bulle"><p className="day-text">{m.texte}</p></div>
              <p className="cm-heure">{heure(m.cree_le)}</p>
              {m.etat === 'echec' && <div className="cm-alerte"><Icone nom="sablier" taille={20} /><div><p className="error">{T.echec}</p><Link className="cm-lien" to={lienAide}>{T.aideLien}<Icone nom="fleche" taille={18} /></Link></div></div>}
            </article>)}
        {attente && <div className="cm-msg cm-msg-coach" role="status">
          <p className="cm-auteur"><Icone nom="graine" taille={15} />{T.coach}</p>
          <div className="cm-bulle cm-attente"><span className="cm-points" aria-hidden="true"><i /><i /><i /></span>{T.attente}</div>
        </div>}
        <div ref={bottom} />
      </section>
      {epuise && <div className="cm-alerte"><Icone nom="sablier" taille={20} /><div><p>{T.quota}</p><Link className="cm-lien" to={lienAide}>{T.aideLien}<Icone nom="fleche" taille={18} /></Link></div></div>}
      <form className="cm-saisie" onSubmit={send}>
        <div className="cm-champ">
          <label className="sr-only" htmlFor="cm-question">{T.placeholder}</label>
          <textarea id="cm-question" rows={1} value={texte} placeholder={T.placeholder} disabled={epuise} onChange={e => { setTexte(e.target.value); pendingId.current = null; }} />
          <button type="submit" className="cm-envoyer" aria-label={busy ? T.envoi : T.envoyer} disabled={busy || epuise || attente || !texte.trim() || trop}><Icone nom="fleche_haut" taille={20} /></button>
        </div>
        {trop && <p className="error" role="alert">{T.trop(COACH_MAX)}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <p className="cm-note"><Icone nom="cadenas" taille={13} />{T.conservation}</p>
      </form>
    </>}
    <p className="cm-aide">{T.aide} <Link className="link" to={lienAide}>{T.aideLien}</Link></p>
    {data.messages.length > 0 && (confirm
      ? <div className="row-actions"><p>{T.confirmer}</p><button type="button" className="link danger" disabled={busy} onClick={() => void clear()}>{T.oui}</button><button type="button" className="link" onClick={() => setConfirm(false)}>{T.non}</button></div>
      : <button type="button" className="link cm-effacer" onClick={() => setConfirm(true)}>{T.effacer}</button>)}
    {nav}</main>;
}
