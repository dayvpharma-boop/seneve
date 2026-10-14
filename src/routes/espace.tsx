import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { dayInfo, eventIdFor, momentVisible, pickDefault, rawDay, webText } from '@/lib/espace';
import { WhatsAppLink } from '@/components/WhatsAppLink';
import { GoalCard } from '@/components/GoalCard';
import { EmailMatinCard } from '@/components/EmailMatinCard';
import { SeanceCard } from '@/components/SeanceCard';
import { SemaineCard } from '@/components/SemaineCard';
import { bilan as bilanParcours, jourDeReprise, REPRISE_TEXTES, semaineDuJour } from '@/lib/progres';
import { nomParcours, referenceAffichee, textes } from '@/lib/espace-textes';
import { journalTextes } from '@/lib/journal';
import { effacerEspaces, enregistrerEspace, lireEspace, useEnLigne } from '@/lib/hors-ligne';

type Enrollment = { enrollment_id: string; programme_id: string; version: number | string; langue: string; date_debut: string; etat: string };
type Programme = { programme_id: string; nom: string; duree_jours: number | null; heures_messages?: string[] | null };
type Content = { content_id: string; programme_id: string; version: number | string; jour: number; numero_message: number; theme: string; explication: string | null; texte_officiel: string; reference_livre: string | null };
type Activity = { activity_id: string; content_id: string; type_activite: 'action' | 'question'; consigne: string; obligatoire: boolean };
type State = { enrollment_id: string; activity_id: string; etat: string; aide_demandee?: boolean; realisee_le: string | null };
// heures : horaires des moments du jour (message 1, 2, 3), lus dans le programme publié ; absents = tout visible.
type Parcours = Enrollment & { nom: string; duree: number; heures?: string[] | null };
type Data = { prenom: string; parcours: Parcours[]; contents: Content[]; activities: Activity[]; states: State[] };

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
    // Un parcours arrêté n'est pas affiché ; son historique reste conservé en base.
    supabase.from('enrollments').select('enrollment_id, programme_id, version, langue, date_debut, etat').neq('etat', 'annulee'),
  ]);
  if (p.error) throw p.error;
  if (e.error) throw e.error;
  const prenom = (p.data?.prenom as string | undefined) ?? meta;
  const enrollments = (e.data ?? []) as Enrollment[];
  if (!enrollments.length) return { prenom, parcours: [], contents: [], activities: [], states: [] };
  const progIds = [...new Set(enrollments.map(x => x.programme_id))];
  const [pr, c] = await Promise.all([
    supabase.from('programmes').select('programme_id, nom, duree_jours, heures_messages').in('programme_id', progIds),
    supabase.from('contents').select('content_id, programme_id, version, jour, numero_message, theme, explication, texte_officiel, reference_livre')
      .in('programme_id', progIds).order('jour').order('numero_message'),
  ]);
  if (pr.error) throw pr.error;
  if (c.error) throw c.error;
  const programmes = (pr.data ?? []) as Programme[];
  const parcours: Parcours[] = enrollments.map(x => {
    const prog = programmes.find(q => q.programme_id === x.programme_id);
    const duree = prog?.duree_jours ?? 7;
    return { ...x, nom: nomParcours(prog?.nom ?? x.programme_id, x.langue, duree), duree, heures: prog?.heures_messages ?? null };
  });
  // Chaque inscription garde sa version : on ne retient que les contenus de cette version.
  const contents = ((c.data ?? []) as Content[]).filter(ct => enrollments.some(x => x.programme_id === ct.programme_id && String(x.version) === String(ct.version)));
  const ids = contents.map(x => x.content_id);
  const [a, st] = await Promise.all([
    ids.length ? supabase.from('activities').select('activity_id, content_id, type_activite, consigne, obligatoire').in('content_id', ids) : Promise.resolve({ data: [], error: null }),
    supabase.from('activity_state').select('enrollment_id, activity_id, etat, aide_demandee, realisee_le').in('enrollment_id', enrollments.map(x => x.enrollment_id)),
  ]);
  if (a.error) throw a.error;
  if (st.error) throw st.error;
  return { prenom, parcours, contents, activities: (a.data ?? []) as Activity[], states: (st.data ?? []) as State[] };
}

function formatDate(iso: string | null, locale = 'fr-FR') {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Kinshasa', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

/** Date de début (AAAA-MM-JJ) affichée en toutes lettres, sans décalage de fuseau. */
function formatStart(ymd: string, locale = 'fr-FR') {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? new Date(`${ymd}T12:00:00Z`) : new Date(ymd);
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

export function Espace() {
  const navigate = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  // Lien direct depuis « Mes progrès » : ?parcours=<inscription>&jour=<n>
  const [params] = useSearchParams();
  const jourDemande = Number(params.get('jour'));
  const [selected, setSelected] = useState<number | null>(Number.isInteger(jourDemande) && jourDemande > 0 ? jourDemande : null);
  const [chosen, setChosen] = useState<string | null>(params.get('parcours'));
  const [starting, setStarting] = useState(false);
  const [equipe, setEquipe] = useState(false);
  // Après une action enregistrée pendant cette visite, le message de reprise ne réapparaît pas.
  const [repriseFaite, setRepriseFaite] = useState(false);

  // Copie hors connexion : date de la copie affichée quand le réseau manque.
  const [copieDu, setCopieDu] = useState<string | null>(null);
  const enLigne = useEnLigne();

  const refresh = useCallback(async () => {
    setFailed(false);
    let userId: string | null = null;
    try {
      const { data: s } = await supabase.auth.getSession();
      userId = s.session?.user.id ?? null;
      const loaded = await load();
      if (!loaded) { navigate('/connexion', { replace: true }); return; }
      setData(loaded); setCopieDu(null);
      if (userId) enregistrerEspace(userId, loaded);
    } catch {
      const copie = userId ? lireEspace<Data>(userId) : null;
      if (copie) { setData(copie.donnees); setCopieDu(copie.le); }
      else setFailed(true);
    }
  }, [navigate]);
  useEffect(() => { void refresh(); }, [refresh]);
  // Retour du réseau : on recharge les vraies données.
  const etaitHorsLigne = useRef(false);
  useEffect(() => {
    if (!enLigne) { etaitHorsLigne.current = true; return; }
    if (etaitHorsLigne.current) { etaitHorsLigne.current = false; void refresh(); }
  }, [enLigne, refresh]);
  // Lien vers l'administration, affiché seulement aux membres de l'équipe (sans bloquer l'espace).
  useEffect(() => {
    void Promise.resolve(supabase.rpc('staff_me')).then(r => {
      const d = r?.data as { admin?: boolean; roles?: string[] } | null | undefined;
      setEquipe(Boolean(d && (d.admin || d.roles?.length)));
    }).catch(() => undefined);
  }, []);
  useEffect(() => { document.title = 'Mon espace — SÉNEVÉ'; document.documentElement.lang = 'fr'; }, []);

  async function signOut() {
    effacerEspaces();
    await supabase.auth.signOut();
    navigate('/connexion', { replace: true });
  }

  async function start(langue: 'fr' | 'en') {
    setStarting(true);
    const { error } = await supabase.rpc('start_discovery', { p_langue: langue });
    setStarting(false);
    if (error) { setFailed(true); return; }
    await refresh();
  }

  const header = <div className="espace-head"><p className="brand">SÉNEVÉ</p>{data && <h1>{data.prenom ? `Bonjour ${data.prenom}` : 'Bonjour'}</h1>}<span className="link-row">{equipe && <Link className="link" to="/admin">Administration</Link>}<button type="button" className="link" onClick={signOut}>Se déconnecter</button></span></div>;
  const outils = (langue: string, inscription?: string) => {
    const J = journalTextes(langue);
    const q = inscription ? `?inscription=${inscription}` : '';
    return <div className="card"><p className="tag">{J.carteTitre}</p><p>{J.carteTexte}</p>
      <div className="link-row"><Link className="btn btn-link" to="/journal">{J.ouvrirJournal}</Link><Link className="link" to={`/coach${q}`}>{J.parlerCoach}</Link><Link className="link" to="/progres">{J.mesProgres}</Link><Link className="link" to={`/aide${q}`}>{J.demanderAide}</Link></div>
    </div>;
  };
  const errorCard = <div className="card"><p role="alert">{LOAD_ERROR}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>Réessayer</button></div>;

  if (failed) return <main className="wrap">{header}{errorCard}</main>;
  if (!data) return <main className="wrap">{header}<p className="muted">Chargement…</p></main>;

  if (!data.parcours.length) return <main className="wrap">{header}
    <div className="card"><p className="tag">Découverte 7 jours</p>
      <p>Un parcours gratuit de 7 jours, à ton rythme, à partir du livre « Arrête de mendier des miracles ».</p>
      <button type="button" className="btn" disabled={starting} onClick={() => void start('fr')}>{starting ? 'Un instant…' : 'Commencer la Découverte'}</button>
      <p className="muted lang-alt" lang="en">A free 7-day journey based on the book « Stop Begging for Miracles ».</p>
      <button type="button" className="btn-secondaire" lang="en" disabled={starting} onClick={() => void start('en')}>Start in English</button>
    </div>{outils('fr')}<WhatsAppLink /></main>;

  const enr = data.parcours.find(x => x.enrollment_id === chosen) ?? pickDefault(data.parcours) ?? data.parcours[0]!;
  const total = enr.duree;
  const T = textes(enr.langue);
  const tabs = data.parcours.length > 1 && <div className="prog-tabs" role="tablist" aria-label="Mes parcours">
    {data.parcours.map(x => <button type="button" role="tab" key={x.enrollment_id} className="prog-tab" aria-selected={x.enrollment_id === enr.enrollment_id} onClick={() => { setChosen(x.enrollment_id); setSelected(null); }}>{x.nom}</button>)}
  </div>;

  const { day, finished, notStarted } = dayInfo(enr.date_debut, new Date(), total);
  if (notStarted) return <main className="wrap">{header}{tabs}
    <div className="card"><p className="tag">{enr.nom}</p>
      <p>{T.commence(formatStart(enr.date_debut, T.locale))}</p>
    </div><GoalCard langue={enr.langue} /><EmailMatinCard langue={enr.langue} />{outils(enr.langue, enr.enrollment_id)}<WhatsAppLink /></main>;

  const maxOpen = finished ? total : day;
  const current = Math.min(selected ?? day, maxOpen);
  const contents = data.contents.filter(c => c.programme_id === enr.programme_id && String(c.version) === String(enr.version));
  // Message 1 : l'enseignement du jour, avec son action. Messages 2 et 3 : les autres moments de la journée.
  const content = contents.find(c => c.jour === current && Number(c.numero_message) === 1) ?? contents.find(c => c.jour === current);
  if (!content) return <main className="wrap">{header}{tabs}{errorCard}</main>;
  const moments = contents.filter(c => c.jour === current && c.content_id !== content.content_id)
    .sort((a, b) => Number(a.numero_message) - Number(b.numero_message));
  const acts = data.activities.filter(a => a.content_id === content.content_id);
  const action = acts.find(a => a.type_activite === 'action');
  const question = acts.find(a => a.type_activite === 'question');
  const paused = enr.etat === 'en_pause';
  const cloture = enr.etat === 'terminee';
  const horsLigne = copieDu !== null || !enLigne;
  const bilanEnr = bilanParcours(enr.date_debut, total, contents, data.activities, data.states.filter(st => st.enrollment_id === enr.enrollment_id).map(st => ({ ...st, aide_demandee: Boolean(st.aide_demandee) })));
  const jourCal = rawDay(enr.date_debut, new Date());
  const semaine = semaineDuJour(bilanEnr, jourCal);
  const reprise = !paused && !cloture && !repriseFaite ? jourDeReprise(bilanEnr, jourCal) : null;
  const R = REPRISE_TEXTES[enr.langue === 'en' ? 'en' : 'fr'];
  // Une action enregistrée met à jour les données de l'espace (le message de reprise disparaît aussitôt).
  const surEnregistre = (st: State) => { setRepriseFaite(true); setData(prev => prev ? { ...prev, states: [...prev.states.filter(x => !(x.enrollment_id === st.enrollment_id && x.activity_id === st.activity_id)), st] } : prev); };

  return <main className="wrap">{header}{tabs}
    {!tabs && <p className="tag">{enr.nom}</p>}
    {finished ? <p>{T.termine(total)}</p> : <p className="day-count">{T.jourSur(day, total)}</p>}
    {paused && <p className="muted" role="status">{T.pause}</p>}
    {cloture && <p className="muted" role="status">{T.cloture}</p>}
    {horsLigne && <p className="muted hors-ligne" role="status">{T.horsLigne(copieDu ? formatDate(copieDu, T.locale) : formatDate(new Date().toISOString(), T.locale))}</p>}
    {reprise !== null && <section className="card reprise-card" aria-label={R.titre(data.prenom)}>
      <p className="tag">{R.titre(data.prenom)}</p>
      <p>{R.texte(reprise)}</p>
      {current !== reprise && <button type="button" className="btn action-btn" onClick={() => setSelected(reprise)}>{R.bouton(reprise)}</button>}
      <p className="muted">{R.aide}</p>
      {!horsLigne && <div className="link-row"><Link className="link" to={`/coach?inscription=${enr.enrollment_id}`}>{R.coach}</Link><Link className="link" to={`/aide?inscription=${enr.enrollment_id}`}>{R.demander}</Link></div>}
    </section>}
    <div className="day-chips">
      {Array.from({ length: total }, (_, k) => k + 1).map(n => <button type="button" key={n} className="day-chip" aria-pressed={n === current} disabled={n > maxOpen} aria-label={n > maxOpen ? T.jourFerme(n) : T.jour(n)} onClick={() => setSelected(n)}>{n}</button>)}
    </div>
    {maxOpen < total && <p className="muted">{T.ouvreDemain(maxOpen + 1)}</p>}
    {semaine && <SemaineCard key={`semaine-${enr.enrollment_id}-${semaine.numero}`} semaine={semaine} langue={enr.langue} horsLigne={horsLigne} />}
    <article className="card">
      <p className="tag">{T.jour(current)}</p>
      <h2>{content.theme}</h2>
      <p className="day-text">{webText(content.texte_officiel, data.prenom)}</p>
      {content.reference_livre && <p className="src">{referenceAffichee(content.reference_livre, enr.langue)}</p>}
    </article>
    {action && <ActionCard key={`${enr.enrollment_id}:${action.activity_id}`} enrollmentId={enr.enrollment_id} activity={action} readOnly={paused || cloture || horsLigne} langue={enr.langue} onEnregistre={surEnregistre} state={data.states.find(s => s.enrollment_id === enr.enrollment_id && s.activity_id === action.activity_id)} />}
    {question && <div className="card"><p className="tag">{T.question}</p><p className="action">{question.consigne}</p>
      <Link className="link" to={`/journal?inscription=${enr.enrollment_id}&activite=${question.activity_id}`}>{journalTextes(enr.langue).repondreJournal}</Link></div>}
    {moments.map(m => {
      const n = Number(m.numero_message);
      const heure = enr.heures?.[n - 1] ?? null;
      const ouvert = momentVisible(heure, current, day, finished);
      return <article key={m.content_id} className="card moment-card" aria-label={`${T.moment(n, heure)} — ${m.theme}`}>
        <p className="tag">{T.moment(n, heure)}</p>
        <h2>{m.theme}</h2>
        {ouvert
          ? <><p className="day-text">{webText(m.texte_officiel, data.prenom)}</p>
              {m.reference_livre && <p className="src">{referenceAffichee(m.reference_livre, enr.langue)}</p>}</>
          : <p className="muted">{T.momentFerme(heure ?? '')}</p>}
      </article>;
    })}
    {!horsLigne && <>
      <SeanceCard key={`seance-${enr.enrollment_id}`} enrollmentId={enr.enrollment_id} langue={enr.langue} />
      <GoalCard langue={enr.langue} />
      <EmailMatinCard langue={enr.langue} />
    </>}
    {outils(enr.langue, enr.enrollment_id)}
    {!horsLigne && <WhatsAppLink />}
  </main>;
}

type Choix = 'realisee' | 'partielle' | 'aide_demandee';

function ActionCard({ enrollmentId, activity, state, readOnly = false, langue = 'fr', onEnregistre }: { enrollmentId: string; activity: Activity; state: State | undefined; readOnly?: boolean; langue?: string; onEnregistre?: (st: State) => void }) {
  const T = textes(langue);
  const [etat, setEtat] = useState<string>(state?.etat ?? 'non_commencee');
  const [aide, setAide] = useState<boolean>(Boolean(state?.aide_demandee));
  const [doneAt, setDoneAt] = useState<string>(state?.realisee_le ?? '');
  const [pending, setPending] = useState<Choix | null>(null);
  const [error, setError] = useState(false);
  // Un identifiant par choix, réutilisé si l'envoi échoue : une nouvelle tentative ne crée jamais de doublon.
  const eventIds = useRef<Partial<Record<Choix, string | null>>>({});

  async function record(choix: Choix) {
    if (pending) return;
    const id = eventIdFor(eventIds.current[choix] ?? null);
    eventIds.current[choix] = id;
    setPending(choix); setError(false);
    try {
      const { data, error } = await supabase.rpc('record_progress', { p_enrollment_id: enrollmentId, p_activity_id: activity.activity_id, p_client_event_id: id, p_etat: choix, p_canal: 'web' });
      const r = data as { etat?: string; aide_demandee?: boolean } | null;
      const ok = !error && r && (choix === 'aide_demandee' ? r.aide_demandee === true : choix === 'realisee' ? r.etat === 'realisee' : (r.etat === 'partielle' || r.etat === 'realisee'));
      if (!ok || !r) throw error ?? new Error('bad');
      eventIds.current[choix] = null;
      // L'état affiché est celui renvoyé par la base (un état déjà plus avancé n'est jamais rétrogradé).
      setEtat(r.etat ?? etat);
      setAide(Boolean(r.aide_demandee));
      if (r.etat === 'realisee' && !doneAt) setDoneAt(new Date().toISOString());
      onEnregistre?.({ enrollment_id: enrollmentId, activity_id: activity.activity_id, etat: r.etat ?? etat, aide_demandee: Boolean(r.aide_demandee), realisee_le: r.etat === 'realisee' ? (doneAt || new Date().toISOString()) : (state?.realisee_le ?? null) });
    } catch { setError(true); }
    finally { setPending(null); }
  }

  const realisee = etat === 'realisee';
  return <div className="card"><p className="tag">{T.action}</p><p className="action">{activity.consigne}</p>
    {realisee && <p className="success" role="status">{T.realisee}{doneAt ? `${T.le}${formatDate(doneAt, T.locale)}` : ''}</p>}
    {!realisee && etat === 'partielle' && <p className="success" role="status">{T.partielleNotee}</p>}
    {!realisee && aide && <div className="aide-notee" role="status"><p>{T.aideNotee}</p>
      <div className="link-row"><Link className="link" to={`/aide?inscription=${enrollmentId}`}>{T.ecrireEquipe}</Link><Link className="link" to="/coach">{T.demanderCoach}</Link></div></div>}
    {!realisee && !readOnly && <>
      <button type="button" className="btn action-btn" disabled={pending !== null} onClick={() => void record('realisee')}>{pending === 'realisee' ? T.enregistrement : T.bouton}</button>
      <div className="choix-row">
        {etat !== 'partielle' && <button type="button" className="btn-secondaire" disabled={pending !== null} onClick={() => void record('partielle')}>{pending === 'partielle' ? T.enregistrement : T.boutonPartie}</button>}
        {!aide && <button type="button" className="btn-secondaire" disabled={pending !== null} onClick={() => void record('aide_demandee')}>{pending === 'aide_demandee' ? T.enregistrement : T.boutonAide}</button>}
      </div>
      {error && <p className="error" role="alert">{T.erreur}</p>}
    </>}
  </div>;
}
