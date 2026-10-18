import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { dateDuJour, dayInfo, eventIdFor, momentVisible, periodeMoment, pickDefault, placerOngletActif, rawDay, webText } from '@/lib/espace';
import { WhatsAppLink } from '@/components/WhatsAppLink';
import { GoalCard } from '@/components/GoalCard';
import { EmailMatinCard } from '@/components/EmailMatinCard';
import { SeanceCard } from '@/components/SeanceCard';
import { SemaineCard } from '@/components/SemaineCard';
import { ObstacleCard } from '@/components/ObstacleCard';
import { SuiteCard } from '@/components/SuiteCard';
import { CodePlaceCard } from '@/components/CodePlaceCard';
import { JardinCard } from '@/components/JardinCard';
import { InviteCard } from '@/components/InviteCard';
import { ParoleCard } from '@/components/ParoleCard';
import { AudioCard } from '@/components/AudioCard';
import { compteJardin } from '@/lib/jardin';
import { bilan as bilanParcours, jourDeReprise, REPRISE_TEXTES, semaineDuJour, serieObstacle } from '@/lib/progres';
import { nomParcours, referenceAffichee, textes } from '@/lib/espace-textes';
import { Icone } from '@/components/Icone';
import { Scene, type Periode } from '@/components/Scene';
import { BarreNav } from '@/components/BarreNav';
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
  // Achat fait avec la même adresse e-mail (confirmée) : l'accès s'ouvre dès l'arrivée dans l'espace, sans attendre
  // la synchronisation n8n (toutes les 15 minutes), qui reste en secours. Une erreur ici ne bloque jamais l'espace.
  await Promise.resolve(supabase.rpc('claim_my_purchases')).catch(() => undefined);
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

/** Un moment du jour : le message 1 (enseignement et action), puis les messages 2 et 3 (midi, soir). */
type Moment = { n: number; content: Content; heure: string | null; ouvert: boolean; periode: Periode; principal: boolean };
const ICONE_PERIODE = { matin: 'lever', midi: 'midi', soir: 'lune' } as const;

function majuscule(t: string) { return t.charAt(0).toUpperCase() + t.slice(1); }

export function Espace() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  // Lien direct depuis « Mes progrès » : ?parcours=<inscription>&jour=<n> ; page d'un moment : &moment=<n>.
  const [params] = useSearchParams();
  const jourDemande = Number(params.get('jour'));
  const momentParam = Number(params.get('moment'));
  const [selected, setSelected] = useState<number | null>(Number.isInteger(jourDemande) && jourDemande > 0 ? jourDemande : null);
  const [chosen, setChosen] = useState<string | null>(params.get('parcours'));
  const [starting, setStarting] = useState(false);
  const [equipe, setEquipe] = useState(false);
  // Après une action enregistrée pendant cette visite, le message de reprise ne réapparaît pas.
  const [repriseFaite, setRepriseFaite] = useState(false);
  // Tuiles : la semaine du jour affiché par défaut, tous les jours avec « Voir tous les jours ».
  const [tousJours, setTousJours] = useState(false);
  const titreMoment = useRef<HTMLHeadingElement>(null);

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
  // Page d'un moment : on part du haut, le titre reçoit le focus (lecteurs d'écran).
  useEffect(() => {
    if (!momentParam || !data) return;
    try { window.scrollTo(0, 0); } catch { /* environnement sans défilement */ }
    titreMoment.current?.focus();
  }, [momentParam, data]);

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

  // Écran « Aujourd'hui » validé le 15/10/2026 : salutation et initiale en haut, barre du bas, « Se déconnecter » en bas de page.
  const initiale = (data?.prenom ?? '').trim().charAt(0).toUpperCase();
  const header = <header className="today-head">
    <div><p className="brand">SÉNEVÉ</p>{data && <h1>{data.prenom ? `Bonjour ${data.prenom}` : 'Bonjour'}</h1>}</div>
    {initiale && <span className="avatar" aria-hidden="true">{initiale}</span>}
  </header>;
  const footer = <div className="today-foot">{equipe && <Link className="link" to="/admin">Administration</Link>}<Link className="link" to="/confidentialite">Confidentialité</Link><button type="button" className="link" onClick={signOut}>Se déconnecter</button></div>;
  // Réglages regroupés en bas : e-mail du matin (si proposé) et liaison WhatsApp.
  const reglages = (langue: string, avecEmail: boolean) => <section className="reglages" aria-label={textes(langue).reglages}>
    <p className="section-title" aria-hidden="true">{textes(langue).reglages}</p>
    {avecEmail && <EmailMatinCard langue={langue} />}
    <WhatsAppLink />
    <CodePlaceCard langue={langue} onOuvert={refresh} />
  </section>;
  const errorCard = <div className="card"><p role="alert">{LOAD_ERROR}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>Réessayer</button></div>;
  const page = (langue: string, contenu: ReactNode, classe = '') => <main className={`wrap avec-nav ${classe}`.trim()}>{contenu}<BarreNav langue={langue} /></main>;

  if (failed) return page('fr', <>{header}{errorCard}{footer}</>);
  if (!data) return page('fr', <>{header}<p className="muted">Chargement…</p>{footer}</>);

  if (!data.parcours.length) return page('fr', <>{header}
    <div className="card"><p className="tag">Découverte 7 jours</p>
      <p>Un parcours gratuit de 7 jours, à ton rythme, à partir du livre « Arrête de mendier des miracles ».</p>
      <button type="button" className="btn" disabled={starting} onClick={() => void start('fr')}>{starting ? 'Un instant…' : 'Commencer la Découverte'}</button>
      <p className="muted lang-alt" lang="en">A free 7-day journey based on the book « Stop Begging for Miracles ».</p>
      <button type="button" className="btn-secondaire" lang="en" disabled={starting} onClick={() => void start('en')}>Start in English</button>
    </div>{reglages('fr', false)}{footer}</>);

  const enr = data.parcours.find(x => x.enrollment_id === chosen) ?? pickDefault(data.parcours) ?? data.parcours[0]!;
  const total = enr.duree;
  const T = textes(enr.langue);
  const tabs = data.parcours.length > 1 && <div className="prog-tabs" ref={placerOngletActif} role="tablist" aria-label="Mes parcours">
    {data.parcours.map(x => <button type="button" role="tab" key={x.enrollment_id} className="prog-tab" aria-selected={x.enrollment_id === enr.enrollment_id} onClick={() => { setChosen(x.enrollment_id); setSelected(null); setTousJours(false); }}>{x.nom}</button>)}
  </div>;

  const { day, finished, notStarted } = dayInfo(enr.date_debut, new Date(), total);
  if (notStarted) return page(enr.langue, <>{header}{tabs}
    <div className="card"><p className="tag">{enr.nom}</p>
      <p>{T.commence(formatStart(enr.date_debut, T.locale))}</p>
    </div><GoalCard langue={enr.langue} />{reglages(enr.langue, true)}{footer}</>);

  const maxOpen = finished ? total : day;
  const current = Math.min(selected ?? day, maxOpen);
  const contents = data.contents.filter(c => c.programme_id === enr.programme_id && String(c.version) === String(enr.version));
  const paused = enr.etat === 'en_pause';
  const cloture = enr.etat === 'terminee';
  const horsLigne = copieDu !== null || !enLigne;
  const lectureSeule = paused || cloture || horsLigne;

  /** Moments d'un jour : le message 1 d'abord (ou le premier contenu), puis les autres par numéro. */
  const momentsDuJour = (jour: number): Moment[] => {
    const duJour = contents.filter(c => c.jour === jour).sort((a, b) => Number(a.numero_message) - Number(b.numero_message));
    const principal = duJour.find(c => Number(c.numero_message) === 1) ?? duJour[0];
    if (!principal) return [];
    return [principal, ...duJour.filter(c => c !== principal)].map(c => {
      const n = Number(c.numero_message) || 1;
      const heure = enr.heures?.[n - 1] ?? null;
      const estPrincipal = c === principal;
      return { n, content: c, heure, principal: estPrincipal, periode: periodeMoment(heure, estPrincipal ? 1 : n), ouvert: estPrincipal || momentVisible(heure, jour, day, finished) };
    });
  };
  const activitesDu = (jour: number) => {
    const principal = momentsDuJour(jour)[0];
    const acts = principal ? data.activities.filter(a => a.content_id === principal.content.content_id) : [];
    return { action: acts.find(a => a.type_activite === 'action'), question: acts.find(a => a.type_activite === 'question') };
  };
  const etatDe = (a: Activity) => data.states.find(s => s.enrollment_id === enr.enrollment_id && s.activity_id === a.activity_id);
  // Une action enregistrée met à jour les données de l'espace (le message de reprise disparaît aussitôt).
  const surEnregistre = (st: State) => { setRepriseFaite(true); setData(prev => prev ? { ...prev, states: [...prev.states.filter(x => !(x.enrollment_id === st.enrollment_id && x.activity_id === st.activity_id)), st] } : prev); };
  const lienJournal = (q: Activity) => `/journal?inscription=${enr.enrollment_id}&activite=${q.activity_id}`;
  const carteAction = (a: Activity, titre: boolean) => <ActionCard key={`${enr.enrollment_id}:${a.activity_id}`} enrollmentId={enr.enrollment_id} activity={a} readOnly={lectureSeule} langue={enr.langue} titre={titre} onEnregistre={surEnregistre} state={etatDe(a)} />;

  // Page d'un moment (« Lire et agir » / « Lire »).
  if (momentParam > 0) {
    const jourVu = Math.min(Number.isInteger(jourDemande) && jourDemande > 0 ? jourDemande : current, maxOpen);
    const m = momentsDuJour(jourVu).find(x => x.n === momentParam);
    const fermer = () => {
      if ((location.state as { depuisAujourdhui?: boolean } | null)?.depuisAujourdhui) navigate(-1);
      else navigate(`/espace?parcours=${enr.enrollment_id}&jour=${jourVu}`, { replace: true });
    };
    const date = majuscule(new Intl.DateTimeFormat(T.locale, { timeZone: 'Africa/Kinshasa', weekday: 'long', day: 'numeric', month: 'long' }).format(dateDuJour(enr.date_debut, jourVu)));
    const { action, question } = activitesDu(jourVu);
    return page(enr.langue, <>
      <button type="button" className="back-btn" aria-label={T.retour} onClick={fermer}><Icone nom="retour" taille={20} /></button>
      {!m || !m.ouvert
        ? <div className="card"><p role="status">{m?.heure ? T.momentFerme(m.heure) : T.jourFerme(jourVu)}</p></div>
        : <article className="moment-page" aria-labelledby="titre-moment">
            <p className="moment-date">{date}{m.heure ? ` · ${T.moment(m.n, m.heure)}` : ''}</p>
            <h1 id="titre-moment" ref={titreMoment} tabIndex={-1}>{m.content.theme}</h1>
            <p className="moment-chips"><span className="time-chip">{T.jour(jourVu)}</span>{m.heure && <span className="time-chip">{T.periodes[m.periode]}</span>}</p>
            <div className="moment-banniere"><Scene periode={m.periode} largeur={390} hauteur={130} /></div>
            <p className="day-text moment-texte">{webText(m.content.texte_officiel, data.prenom)}</p>
            {m.content.reference_livre && <p className="src">{referenceAffichee(m.content.reference_livre, enr.langue)}</p>}
            {m.principal && action && carteAction(action, true)}
            {m.principal && question && <div className="card question-card"><p className="tag">{T.question}</p><p className="action" id="question-moment">{question.consigne}</p>
              <Link className="prompt-ecrire" to={lienJournal(question)} aria-describedby="question-moment">{T.ecrireReflexion}<Icone nom="crayon" taille={20} /></Link></div>}
          </article>}
    </>, 'moment-vue');
  }

  const moments = momentsDuJour(current);
  if (!moments.length) return page(enr.langue, <>{header}{tabs}{errorCard}{footer}</>);
  const { action, question } = activitesDu(current);
  const bilanEnr = bilanParcours(enr.date_debut, total, contents, data.activities, data.states.filter(st => st.enrollment_id === enr.enrollment_id).map(st => ({ ...st, aide_demandee: Boolean(st.aide_demandee) })));
  const jourCal = rawDay(enr.date_debut, new Date());
  const jardin = compteJardin(bilanEnr);
  const semaine = semaineDuJour(bilanEnr, jourCal);
  const reprise = !paused && !cloture && !repriseFaite ? jourDeReprise(bilanEnr, jourCal) : null;
  // Pas les deux messages en même temps : l'accueil de reprise passe d'abord.
  const obstacle = !lectureSeule && reprise === null && !repriseFaite ? serieObstacle(bilanEnr, jourCal) : null;
  const R = REPRISE_TEXTES[enr.langue === 'en' ? 'en' : 'fr'];
  const estAujourdhui = !finished && current === day;

  const choisirJour = (n: number) => { setSelected(n); setTousJours(false); };
  const ouvrirMoment = (n: number) => navigate(`/espace?parcours=${enr.enrollment_id}&jour=${current}&moment=${n}`, { state: { depuisAujourdhui: true } });
  const jourSemaine = (n: number) => new Intl.DateTimeFormat(T.locale, { timeZone: 'Africa/Kinshasa', weekday: 'short' }).format(dateDuJour(enr.date_debut, n));

  // Tuiles des jours : la semaine du jour affiché (7 jours), ou tous les jours sur demande.
  const debutSemaine = Math.floor((current - 1) / 7) * 7 + 1;
  const numeros = tousJours
    ? Array.from({ length: total }, (_, k) => k + 1)
    : Array.from({ length: Math.min(7, total - debutSemaine + 1) }, (_, k) => debutSemaine + k);
  const tuiles = <div id="tous-les-jours" className="day-tiles">
    {numeros.map(n => {
      const ouvert = n <= maxOpen;
      const fait = bilanEnr.jours[n - 1]?.etat === 'realisee';
      const auj = !finished && n === day;
      const nom = !ouvert ? T.jourFerme(n) : auj ? T.jourAujourdhui(n) : fait ? T.jourFait(n) : T.jour(n);
      const classe = ['day-tile', auj && 'is-today', fait && 'is-done', !ouvert && 'is-locked', n === current && !auj && 'is-selected'].filter(Boolean).join(' ');
      return <button type="button" key={n} className={classe} aria-label={nom} aria-pressed={ouvert ? n === current : undefined} disabled={!ouvert} onClick={() => choisirJour(n)}>
        <span className="tile-wd" aria-hidden="true">{jourSemaine(n)}</span>
        <b aria-hidden="true">{n}</b>
        {auj ? <em aria-hidden="true">{T.auj}</em> : !ouvert ? <Icone nom="cadenas" taille={16} /> : fait ? <Icone nom="coche" taille={16} /> : <span className="tile-vide" aria-hidden="true" />}
      </button>;
    })}
  </div>;

  // Questions du journal : celle du jour affiché, et celle de la veille quand on regarde aujourd'hui.
  const invitations: { jour: number; libelle: string; q: Activity }[] = [];
  if (question) invitations.push({ jour: current, libelle: estAujourdhui ? `${T.jour(current)} · ${T.aujourdhui}` : T.jour(current), q: question });
  if (estAujourdhui && current > 1) {
    const veille = activitesDu(current - 1).question;
    if (veille) invitations.push({ jour: current - 1, libelle: `${T.jour(current - 1)} · ${T.hier}`, q: veille });
  }

  return page(enr.langue, <>{header}{tabs}
    {!tabs && <p className="today-parcours">{enr.nom}</p>}
    <div className="today-progress">
      {tuiles}
      {finished ? <p className="today-done">{T.termine(total)}</p> : <div className="count"><span className="count-main">{T.jourSur(day, total)}</span>{maxOpen < total && <span>{T.ouvreDemain(maxOpen + 1)}</span>}</div>}
    </div>
    {jardin.total > 0 && <JardinCard realisees={jardin.realisees} total={jardin.total} langue={enr.langue} />}
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
    {obstacle && <ObstacleCard key={`obstacle-${enr.enrollment_id}-${obstacle}`} enrollmentId={enr.enrollment_id} cle={obstacle} langue={enr.langue} />}
    {semaine && <SemaineCard key={`semaine-${enr.enrollment_id}-${semaine.numero}`} semaine={semaine} langue={enr.langue} horsLigne={horsLigne} />}

    <section className="today-section" aria-labelledby="titre-journee">
      <div className="sec-head">
        <h2 id="titre-journee">{estAujourdhui ? T.taJournee : T.jour(current)}</h2>
        <button type="button" className="link" aria-expanded={tousJours} aria-controls="tous-les-jours" onClick={() => setTousJours(v => !v)}>{T.tousLesJours}</button>
      </div>
      {/* Nouvelle liste à chaque jour choisi : elle repart de la carte du matin (et non de la carte vue avant). */}
      <ul key={`rail-${enr.enrollment_id}-${current}`} className={moments.length > 1 ? 'moment-rail' : 'moment-rail is-seul'}>
        {moments.map(m => {
          const id = `moment-${current}-${m.n}`;
          return <li key={m.content.content_id}>
            <article className={m.ouvert ? 'moment-tuile' : 'moment-tuile is-closed'} aria-label={`${T.moment(m.n, m.heure)} — ${m.content.theme}`}>
              <div className="moment-head">
                {(m.heure || moments.length > 1) ? <span className="time-chip">{T.moment(m.n, m.heure)}{m.heure ? ` · ${T.periodes[m.periode]}` : ''}</span> : <span />}
                <Icone nom={ICONE_PERIODE[m.periode]} taille={22} />
              </div>
              <h3 id={id}>{m.content.theme}</h3>
              <div className="moment-illus"><Scene periode={m.periode} largeur={244} hauteur={110} /></div>
              {m.ouvert
                ? <button type="button" className="btn moment-btn" aria-describedby={id} onClick={() => ouvrirMoment(m.n)}>{m.principal && action ? T.lireEtAgir : T.lire}<Icone nom="fleche" taille={20} /></button>
                : <p className="moment-ferme">{T.momentFerme(m.heure ?? '')}</p>}
            </article>
          </li>;
        })}
      </ul>
    </section>

    {!horsLigne && <AudioCard key={`audio-${enr.enrollment_id}-${current}`} contentIds={moments.filter(m => m.ouvert).map(m => m.content.content_id)} langue={enr.langue} />}
    {!horsLigne && <ParoleCard key={`parole-${enr.enrollment_id}-${current}`} programmeId={enr.programme_id} version={Number(enr.version)} langue={enr.langue} jour={current} />}

    {action && <section className="today-section" aria-labelledby="titre-action">
      <h2 id="titre-action">{T.action}</h2>
      {carteAction(action, false)}
    </section>}

    {invitations.length > 0 && <section className="today-section" aria-labelledby="titre-ecrire">
      <h2 id="titre-ecrire">{T.ecrireJournal}</h2>
      {invitations.map((x, k) => <div key={x.q.activity_id} className={k === 0 ? 'prompt-carte' : 'prompt-carte is-passe'}>
        <p className="tag">{x.libelle}</p>
        <p className="prompt-question" id={`question-${x.jour}`}>{x.q.consigne}</p>
        <Link className="prompt-ecrire" to={lienJournal(x.q)} aria-describedby={`question-${x.jour}`}>{T.ecrireReflexion}<Icone nom="crayon" taille={20} /></Link>
      </div>)}
    </section>}

    {!horsLigne && <>
      <SeanceCard key={`seance-${enr.enrollment_id}`} enrollmentId={enr.enrollment_id} langue={enr.langue} />
      <GoalCard langue={enr.langue} />
      <InviteCard langue={enr.langue} />
      {reglages(enr.langue, true)}
    </>}
    {!horsLigne && (jourCal >= total || cloture) && <SuiteCard key={`suite-${enr.enrollment_id}`} programmeId={enr.programme_id} langue={enr.langue} dejaInscrit={data.parcours.map(x => x.programme_id)} />}
    {footer}
  </>);
}

type Choix = 'realisee' | 'partielle' | 'preparee' | 'aide_demandee';

function ActionCard({ enrollmentId, activity, state, readOnly = false, langue = 'fr', titre = true, onEnregistre }: { enrollmentId: string; activity: Activity; state: State | undefined; readOnly?: boolean; langue?: string; titre?: boolean; onEnregistre?: (st: State) => void }) {
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
      const ok = !error && r && (choix === 'aide_demandee' ? r.aide_demandee === true
        : choix === 'realisee' ? r.etat === 'realisee'
        : choix === 'partielle' ? (r.etat === 'partielle' || r.etat === 'realisee')
        : (r.etat === 'preparee' || r.etat === 'partielle' || r.etat === 'realisee'));
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
  // Consigne dans un encadré doré, bouton doré « J'ai réalisé cette action » (écran validé le 15/10/2026).
  return <div className="card action-card">{titre && <p className="tag">{T.action}</p>}
    <div className="action-box"><Icone nom="livre" taille={22} /><p className="action">{activity.consigne}</p></div>
    {realisee && <p className="success action-faite" role="status"><Icone nom="coche" taille={20} />{T.realisee}{doneAt ? `${T.le}${formatDate(doneAt, T.locale)}` : ''}</p>}
    {!realisee && etat === 'preparee' && <p className="success" role="status">{T.prepareeNotee}</p>}
    {!realisee && etat === 'partielle' && <p className="success" role="status">{T.partielleNotee}</p>}
    {!realisee && aide && <div className="aide-notee" role="status"><p>{T.aideNotee}</p>
      <div className="link-row"><Link className="link" to={`/aide?inscription=${enrollmentId}`}>{T.ecrireEquipe}</Link><Link className="link" to="/coach">{T.demanderCoach}</Link></div></div>}
    {!realisee && !readOnly && <>
      <button type="button" className="btn btn-or action-btn" disabled={pending !== null} onClick={() => void record('realisee')}><Icone nom="coche" taille={20} />{pending === 'realisee' ? T.enregistrement : T.bouton}</button>
      <div className="choix-row">
        {/* « Préparée » ne compte jamais comme réalisée ; proposé seulement tant que rien de plus avancé n'est noté. */}
        {etat === 'non_commencee' && <button type="button" className="btn-secondaire" disabled={pending !== null} onClick={() => void record('preparee')}>{pending === 'preparee' ? T.enregistrement : T.boutonPrepa}</button>}
        {etat !== 'partielle' &&<button type="button" className="btn-secondaire" disabled={pending !== null} onClick={() => void record('partielle')}>{pending === 'partielle' ? T.enregistrement : T.boutonPartie}</button>}
        {!aide && <button type="button" className="btn-secondaire" disabled={pending !== null} onClick={() => void record('aide_demandee')}>{pending === 'aide_demandee' ? T.enregistrement : T.boutonAide}</button>}
      </div>
      {error && <p className="error" role="alert">{T.erreur}</p>}
    </>}
  </div>;
}
