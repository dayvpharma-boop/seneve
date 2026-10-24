import {AvatarParticipant} from '@/components/AvatarParticipant';
import {Apparence} from '@/components/Apparence';
import {IconeRegistre} from '@/components/IconeRegistre';
import {IconeFinitions} from '@/components/IconeFinitions';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ComptePrive } from '@/components/ComptePrive';
import { supabase } from '@/lib/supabase';
import { apercuMoment, avecLangue, dateDuJour, dayInfo, eventIdFor, momentVisible, periodeMoment, pickDefault, placerOngletActif, rawDay, webText } from '@/lib/espace';
import {ParcoursAVenir,PauseParcours,ProgressionLongue,BilanTermine} from '@/components/VariantesJournee';
import {IconeJourneeSuite} from '@/components/IconeJourneeSuite';
import { WhatsAppLink } from '@/components/WhatsAppLink';
import { GoalCard } from '@/components/GoalCard';
import { EmailMatinCard } from '@/components/EmailMatinCard';
import { SeanceCard } from '@/components/SeanceCard';
import { SemaineCard } from '@/components/SemaineCard';
import { ObstacleCard } from '@/components/ObstacleCard';
import { FinParcours } from '@/components/FinParcours';
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
import { IconeMaquette } from '@/components/IconeMaquette';
import { IconeJournee } from '@/components/IconeJournee';
import { EspaceErreur } from '@/components/EspaceErreur';
import { BrouillonHorsLigne } from '@/components/BrouillonHorsLigne';
import { RepereParcours } from '@/components/RepereParcours';
import type { Periode } from '@/components/Scene';
import { ImageMoment } from '@/components/ImageMoment';
import { BarreNav } from '@/components/BarreNav';
import { AccueilDecouverte } from '@/components/AccueilDecouverte';
import { IconeLecture } from '@/components/IconeLecture';
import { effacerEspaces, enregistrerEspace, lireEspace, useEnLigne } from '@/lib/hors-ligne';

type Enrollment = { enrollment_id: string; programme_id: string; version: number | string; langue: string; date_debut: string; etat: string };
type Programme = { programme_id: string; nom: string; duree_jours: number | null; heures_messages?: string[] | null };
type Content = { content_id: string; programme_id: string; version: number | string; jour: number; numero_message: number; theme: string; explication: string | null; texte_officiel: string; reference_livre: string | null };
type Activity = { activity_id: string; content_id: string; type_activite: 'action' | 'question'; consigne: string; obligatoire: boolean; critere_realisation?: string | null };
type State = { enrollment_id: string; activity_id: string; etat: string; aide_demandee?: boolean; realisee_le: string | null };
// heures : horaires des moments du jour (message 1, 2, 3), lus dans le programme publié ; absents = tout visible.
type Parcours = Enrollment & { nom: string; duree: number; heures?: string[] | null };
type Data = { prenom: string; parcours: Parcours[]; contents: Content[]; activities: Activity[]; states: State[] };

const LOAD_ERRORS = { fr: 'Impossible de charger ta journée pour le moment.', en: 'Your day cannot be loaded right now.' } as const;
const loadError = (langue?: string | null) => LOAD_ERRORS[langue === 'en' ? 'en' : 'fr'];


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
    ids.length ? supabase.from('activities').select('activity_id, content_id, type_activite, consigne, obligatoire, critere_realisation').in('content_id', ids) : Promise.resolve({ data: [], error: null }),
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
  return <ComptePrive enfants={userId => <EspaceDuCompte userId={userId} />} />;
}

function EspaceDuCompte({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [prenomSession, setPrenomSession] = useState('');
  // Compte créé sur la page anglaise (langue gardée à l'inscription) : accueil en anglais sans ?lang=en.
  const [langueSession, setLangueSession] = useState<'en' | null>(null);
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
  const parcoursDemande=params.get('parcours');
  useEffect(()=>{setChosen(parcoursDemande);setSelected(Number.isInteger(jourDemande)&&jourDemande>0?jourDemande:null);setTousJours(false);},[parcoursDemande,jourDemande]);

  // Copie hors connexion : date de la copie affichée quand le réseau manque.
  const [copieDu, setCopieDu] = useState<string | null>(null);
  const enLigne = useEnLigne();

  const refresh = useCallback(async () => {
    setFailed(false);
    let userId: string | null = null;
    try {
      const { data: s } = await supabase.auth.getSession();
      userId = s.session?.user.id ?? null;
      setPrenomSession(typeof s.session?.user.user_metadata?.prenom === 'string' ? s.session.user.user_metadata.prenom : '');
      setLangueSession(s.session?.user.user_metadata?.langue === 'en' ? 'en' : null);
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
  // Barre du haut des maquettes validées le 19/10/2026 : « SÉNEVÉ · Bonjour Marie » et la pastille de l'initiale.
  // Langue du parcours affiché (celui choisi, sinon celui retenu par défaut) : salutation, barre du haut, titre de l'onglet.
  // Pendant le chargement et sans parcours (accueil de la Découverte) : ?lang=en, ou un compte créé sur la page
  // anglaise (sauf ?lang=fr).
  const anglaisDemande = params.get('lang') === 'en' || (params.get('lang') !== 'fr' && langueSession === 'en');
  const enTete = !data || !data.parcours.length ? anglaisDemande
    : (data?.parcours.find(x => x.enrollment_id === chosen) ?? (data ? pickDefault(data.parcours) : null))?.langue === 'en';
  const salut = data ? `${enTete ? 'Hello' : 'Bonjour'}${data.prenom ? ` ${data.prenom}` : ''}` : undefined;
  const charge = data !== null;
  useEffect(() => {
    document.title = enTete ? 'My space — SÉNEVÉ' : 'Mon espace — SÉNEVÉ';
    // Avant le chargement, la langue de la page précédente est gardée (elle sert de langue de secours).
    if (charge) document.documentElement.lang = enTete ? 'en' : 'fr';
  }, [charge, enTete]);
  const header = (repere?: ReactNode, notice?: ReactNode) => <header className="today-head page-tete">
    <div className="barre-haut barre-espace"><p className="brand logo-marque"><img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" width={32} height={32} /><span>SÉNEVÉ<small>{enTete ? 'Today' : 'Aujourd’hui'}</small></span></p><Apparence langue={data?.parcours[0]?.langue??'fr'} compact/><Link className="today-profil" to={enTete ? '/profil?lang=en' : '/profil'} aria-label={enTete ? 'My profile' : 'Mon profil'}><AvatarParticipant>{data?.parcours.length===1&&data.parcours[0]?.duree===7&&data.parcours[0]?.etat==='active'?data.prenom.charAt(0).toUpperCase():<IconeMaquette nom="person" taille={18} />}</AvatarParticipant></Link></div>
    {notice}{repere}
    {data && <h1>{salut}</h1>}{data?.parcours.length===1&&data.parcours[0]?.duree===7&&data.parcours[0]?.etat==='active'&&<Link className="jn-avatar-grand" to={enTete ? '/profil?lang=en' : '/profil'} aria-label={enTete ? 'My profile' : 'Mon profil'}><AvatarParticipant>{data.prenom.charAt(0).toUpperCase()}</AvatarParticipant></Link>}
  </header>;
  // Pied de page dans la langue du parcours ; les pages publiques reçoivent ?lang=en pour rester en anglais.
  const footer = (l: string) => { const en = l === 'en', s = en ? '?lang=en' : ''; return <div className="today-foot"><Link className="link" to={`/acces${s}`}>{en ? 'My access' : 'Mes accès'}</Link><Link className="link" to={`/confidentialite${s}`}>{en ? 'Privacy' : 'Confidentialité'}</Link><button type="button" className="link" onClick={signOut}>{en ? 'Sign out' : 'Se déconnecter'}</button></div>; };
  // Réglages regroupés en bas : e-mail du matin (si proposé) et liaison WhatsApp.
  // Repliés sur l'écran « Aujourd'hui » (allègement du 19/10/2026) : on les ouvre quand on en a besoin.
  const reglages = (langue: string, avecEmail: boolean, replie = false) => {
    const cartes = <>{avecEmail && <EmailMatinCard langue={langue} />}<WhatsAppLink langue={langue} /><CodePlaceCard langue={langue} onOuvert={refresh} /></>;
    return replie
      ? <section className="reglages" aria-label={textes(langue).reglages}><details className="repli"><summary>{textes(langue).reglages}<IconeRegistre nom="expand_more"/></summary><Link className="jn-reglages-lien" to={langue === 'en' ? '/reglages?lang=en' : '/reglages'}>{langue === 'en' ? 'Open all my settings' : 'Ouvrir tous mes réglages'}</Link>{cartes}</details></section>
      : <section className="reglages" aria-label={textes(langue).reglages}><p className="section-title" aria-hidden="true">{textes(langue).reglages}</p>{cartes}</section>;
  };
  // Langue de secours tant que le parcours n'est pas chargé : ?lang=en, ou la langue de la page précédente.
  const langueCourante = anglaisDemande || document.documentElement.lang === 'en' ? 'en' : 'fr';
  const errorCard = <div className="card espace-erreur"><span className="etat-symbole" aria-hidden="true"><IconeJournee nom="wifi_off" taille={32} /></span><p role="alert">{loadError(langueCourante)}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}><IconeJournee nom="sync" taille={20} />{langueCourante === 'en' ? 'Try again' : 'Réessayer'}</button><Link className="etat-journal" to="/journal"><IconeJournee nom="menu_book" taille={20} />{langueCourante === 'en' ? 'Open my journal' : 'Ouvrir mon journal'}</Link></div>;
  const page = (langue: string, contenu: ReactNode, classe = '', navigation = true) => <main className={`wrap ${navigation ? 'avec-nav ' : ''}espace-page ${classe}`.trim()}>{contenu}{navigation && <BarreNav langue={langue} maquette iconesJournee varianteJournee={classe==='journee-nouvelle'||/journee-(multiple|pause|longue)/.test(classe)} />}</main>;

  if (failed) return page(langueCourante, <EspaceErreur langue={langueCourante} prenom={prenomSession} message={loadError(langueCourante)} reessayer={() => void refresh()} />, 'erreur-page');
  if (!data) return page(langueCourante, <>{header()}<section className="espace-chargement" aria-busy="true" aria-label={langueCourante === 'en' ? 'Preparing your day' : 'Préparation de ta journée'}><div className="chargement-message"><span className="etat-symbole" aria-hidden="true"><svg width={32} height={32} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M12 22V12" /><path d="M12 12C12 7.5 8 5 8 5C8 5 8 9 12 12Z" fill="currentColor" fillOpacity={.25} /><path d="M12 9C12 5.5 16 3.5 16 3.5C16 3.5 16 7.5 12 9Z" fill="currentColor" fillOpacity={.35} /><circle cx={12} cy={21} fill="currentColor" r={1.5} /></svg></span><p role="status">{langueCourante === 'en' ? 'Loading…' : 'Chargement…'}</p><p>{langueCourante === 'en' ? 'Preparing your day' : 'Préparation de ta journée'}</p></div><div className="chargement-maquette" aria-hidden="true"><div className="chargement-jours">{Array.from({ length: 7 }, (_, k) => <span key={k} />)}</div><div className="chargement-carte"><span /><span /><span /></div><div className="chargement-carte"><span /><span /></div></div></section>{footer(langueCourante)}</>);

  if (!data.parcours.length) return page(langueCourante, <AccueilDecouverte langue={langueCourante} prenom={data.prenom} starting={starting} commencer={langue => void start(langue)} reglages={reglages(langueCourante, false)} footer={footer(langueCourante)} />, 'espace-decouverte');

  const enr = data.parcours.find(x => x.enrollment_id === chosen) ?? pickDefault(data.parcours) ?? data.parcours[0]!;
  const total = enr.duree;
  const T = textes(enr.langue);
  const tabs = data.parcours.length > 1 && <div className="prog-tabs" ref={placerOngletActif} role="tablist" aria-label="Mes parcours">
    {data.parcours.map(x => <button type="button" role="tab" aria-label={x.nom} key={x.enrollment_id} className="prog-tab" aria-selected={x.enrollment_id === enr.enrollment_id} onClick={() => { setChosen(x.enrollment_id); setSelected(null); setTousJours(false); }}><span className="jn-tab-meta">{dayInfo(x.date_debut,new Date(),x.duree).notStarted?'À venir':x.etat==='en_pause'?'En pause':dayInfo(x.date_debut,new Date(),x.duree).finished?'Terminé':`Jour ${dayInfo(x.date_debut,new Date(),x.duree).day} en cours`}</span>{x.nom}</button>)}
  </div>;

  const { day, finished, notStarted } = dayInfo(enr.date_debut, new Date(), total);
  if (notStarted) return page(enr.langue,<ParcoursAVenir langue={enr.langue} prenom={data.prenom} nom={enr.nom} date={enr.date_debut} objectif={<GoalCard langue={enr.langue}/>} reglages={reglages(enr.langue,true)} onglets={tabs} footer={footer(enr.langue)}/>, 'journee-nouvelle');
  if (notStarted) return page(enr.langue, <>{header()}{tabs}
    <div className="card"><p className="tag">{enr.nom}</p>
      <p>{T.commence(formatStart(enr.date_debut, T.locale))}</p>
    </div><GoalCard langue={enr.langue} />{reglages(enr.langue, true)}{footer(enr.langue)}</>);

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
  const carteAction = (a: Activity, titre: boolean) => <ActionCard key={`${enr.enrollment_id}:${a.activity_id}`} enrollmentId={enr.enrollment_id} activity={a} lecture={momentParam > 0} readOnly={lectureSeule} langue={enr.langue} titre={titre} onEnregistre={surEnregistre} state={etatDe(a)} />;

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
      <header className="lecture-header"><button type="button" className="back-btn" aria-label={T.retour} onClick={fermer}><IconeLecture nom="arrow_back" taille={20} /></button><Icone nom="graine" taille={26} /><span>{enr.langue === 'en' ? 'Today’s reading' : 'Séance du jour'}</span><Link className="lecture-avatar" to={enr.langue === 'en' ? '/profil?lang=en' : '/profil'} aria-label={enr.langue === 'en' ? 'My profile' : 'Mon profil'}><AvatarParticipant>{data.prenom ? data.prenom.charAt(0).toUpperCase() : 'S'}</AvatarParticipant></Link></header>
      {!m || !m.ouvert
        ? <div className="card"><p role="status">{m?.heure ? T.momentFerme(m.heure) : T.jourFerme(jourVu)}</p></div>
        : <article className="moment-page" aria-labelledby="titre-moment">
            <p className="moment-date"><IconeLecture nom="wb_twilight" taille={16} /><span>{date}{m.heure ? ` · ${T.moment(m.n, m.heure)}` : ''}</span></p>
            <h1 id="titre-moment" ref={titreMoment} tabIndex={-1}>{m.content.theme}</h1>
            <p className="moment-chips"><span className="time-chip">{T.jour(jourVu)}</span>{m.heure && <span className="time-chip"><IconeLecture nom="sunny" taille={14} />{T.periodes[m.periode]}</span>}</p>
            <figure className="lecture-illustration">{m.principal ? <img src={`${import.meta.env.BASE_URL}illustrations/lecture-aube-photo-v1-720.webp`} srcSet={`${import.meta.env.BASE_URL}illustrations/lecture-aube-photo-v1-360.webp 360w, ${import.meta.env.BASE_URL}illustrations/lecture-aube-photo-v1-720.webp 720w`} sizes="(max-width:600px) calc(100vw - 60px), 540px" width={720} height={360} alt="" /> : <ImageMoment periode={m.periode} />}<figcaption><span>{enr.langue === 'en' ? 'Daily teaching' : 'Enseignement du jour'}</span><span>{total === 7 ? T.parcoursDecouverte : enr.nom}</span></figcaption></figure>
            <p className="day-text moment-texte">{webText(m.content.texte_officiel, data.prenom)}</p>
            {m.content.reference_livre && <p className="src"><IconeLecture nom="menu_book" taille={15} />{referenceAffichee(m.content.reference_livre, enr.langue)}</p>}
            {m.principal && action && carteAction(action, true)}
            {m.principal && question && <section className="card question-card"><h2 className="tag"><IconeLecture nom="edit_note" taille={16} />{T.question}</h2><p className="action" id="question-moment">{question.consigne}</p>
              <Link className="prompt-ecrire" to={lienJournal(question)} aria-describedby="question-moment"><IconeLecture nom="edit" taille={18} />{T.ecrireReflexion}</Link><p className="lecture-confidentialite"><IconeLecture nom="lock" taille={14} /><span>{T.journalPrive}</span></p></section>}
            <footer className="lecture-navigation"><button type="button" onClick={fermer}><IconeLecture nom="arrow_back" taille={18} />{enr.langue === 'en' ? 'Previous' : 'Précédent'}</button><span><i aria-hidden="true" />{enr.langue === 'en' ? `Step ${jourVu} / ${total}` : `Étape ${jourVu} / ${total}`}</span><button type="button" onClick={() => { window.scrollTo(0, 0); titreMoment.current?.focus(); }}>{enr.langue === 'en' ? 'Top' : 'Sommet'}<IconeLecture nom="arrow_upward" taille={18} /></button></footer>
          </article>}
    </>, 'moment-vue lecture-nouvelle', false);
  }

  const moments = momentsDuJour(current);
  if (!moments.length) return page(enr.langue, <>{header()}{tabs}{errorCard}{footer(enr.langue)}</>);
  const { action, question } = activitesDu(current);
  const bilanEnr = bilanParcours(enr.date_debut, total, contents, data.activities, data.states.filter(st => st.enrollment_id === enr.enrollment_id).map(st => ({ ...st, aide_demandee: Boolean(st.aide_demandee) })));
  if ((finished || cloture) && selected===null && !params.has('jour') && !horsLigne) return page(enr.langue,<BilanTermine langue={enr.langue} cloture={cloture} prenom={data.prenom} nom={enr.nom} b={bilanEnr} inscription={enr.enrollment_id} dateFin={new Intl.DateTimeFormat(enr.langue==='en'?'en-GB':'fr-FR',{timeZone:'Africa/Kinshasa',day:'numeric',month:'long'}).format(dateDuJour(enr.date_debut,total))} onglets={tabs} suite={<SuiteCard programmeId={enr.programme_id} langue={enr.langue} dejaInscrit={data.parcours.map(x=>x.programme_id)} maquette/>} reglages={reglages(enr.langue,false,true)} footer={footer(enr.langue)}/>, 'journee-nouvelle');
  if ((finished || cloture) && selected === null && !params.has('jour') && !horsLigne) return page(enr.langue, <FinParcours prenom={data.prenom} nom={enr.nom} enrollmentId={enr.enrollment_id} programmeId={enr.programme_id} langue={enr.langue} b={bilanEnr} cloture={cloture} dejaInscrit={data.parcours.map(x=>x.programme_id)} onglets={tabs} reglages={reglages(enr.langue,false,true)} footer={footer(enr.langue)}/>, 'fin-page');
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
        {horsLigne ? <><span className="offline-rond" aria-hidden="true">{!ouvert ? <IconeJournee nom="lock" taille={16} /> : fait ? <IconeJournee nom="check" taille={18} /> : n}</span><span className="offline-jour" aria-hidden="true">{auj ? T.auj : `J${n}`}</span></> : <>
        <span className="tile-wd" aria-hidden="true">{enr.langue==='en'?jourSemaine(n):`J${n}`}</span>
        <b aria-hidden="true">{n}</b>
        {auj ? <em aria-hidden="true">{T.auj}</em> : !ouvert ? <IconeJournee nom="lock" taille={16} /> : fait ? <IconeJourneeSuite nom="check_circle_fill" taille={16} /> : <span className="tile-vide" aria-hidden="true" />}
        </>}
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

  const nomRepere = /découverte|decouverte|discovery/i.test(`${enr.programme_id} ${enr.nom}`) ? T.parcoursDecouverte : enr.nom;
  const joursSemaine = bilanEnr.jours.slice(debutSemaine - 1, Math.min(debutSemaine + 6, total));
  const actionsSemaine = joursSemaine.filter(j => j.etat !== null).length;
  const realiseesSemaine = joursSemaine.filter(j => j.ouvert && j.etat === 'realisee').length;
  const dateCopie = copieDu ? new Intl.DateTimeFormat(T.locale, { timeZone: 'Africa/Kinshasa', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(copieDu)) : null;
  const bandeauHorsLigne = horsLigne && <aside className="offline-bandeau" role="status"><span className="offline-nuage" aria-hidden="true"><IconeJournee nom="cloud_off" taille={18} /></span><div><div className="offline-bandeau-tete"><strong>{enr.langue === 'en' ? 'Offline mode' : 'Mode hors connexion'}</strong><span>{enr.langue === 'en' ? 'Local copy' : 'Copie locale'}</span></div><p>{dateCopie ? <>{enr.langue === 'en' ? 'You are viewing the copy saved on ' : 'Tu consultes la copie enregistrée le '}<strong>{dateCopie}</strong>.</> : (enr.langue === 'en' ? 'You are viewing the days already loaded.' : 'Tu consultes les journées déjà chargées.')}</p><p className="offline-note">{enr.langue === 'en' ? 'You are offline. Your drafts stay on this device.' : 'Tu n’as pas de connexion. Tes brouillons restent sur cet appareil.'}</p></div></aside>;
  const enteteHorsLigne = <header className="offline-entete"><div className="erreur-header"><div><strong>SÉNEVÉ</strong></div><span className="erreur-avatar" aria-hidden="true"><AvatarParticipant>{data.prenom ? data.prenom.charAt(0).toUpperCase() : 'S'}</AvatarParticipant></span></div>{bandeauHorsLigne}<div className="offline-profil"><div><small>{enr.langue === 'en' ? 'Daily companion' : 'Compagnon de chemin'}</small><h1>{salut}</h1></div><p><span>{nomRepere}</span><strong>{T.jourSur(current,total)}</strong></p></div></header>;
  return page(enr.langue, <>{horsLigne ? enteteHorsLigne : header(<><p className="today-date">{new Intl.DateTimeFormat(T.locale, { timeZone: 'Africa/Kinshasa', weekday: 'long', day: 'numeric', month: 'long' }).format(dateDuJour(enr.date_debut, current))}</p><p className="today-parcours">{current === 1 ? <IconeJournee nom="explore" taille={18} /> : <IconeMaquette nom="spa" taille={18} />}{`${nomRepere} · ${T.jourSur(current, total)}`}</p></>, bandeauHorsLigne)}{tabs}
    {!horsLigne && total>14 ? <ProgressionLongue langue={enr.langue} b={bilanEnr} current={current} jour={day} choisir={choisirJour}/> : <section className="today-progress" aria-labelledby="progression-semaine">
      <div className="weekly-head"><h2 id="progression-semaine">{T.progressionHebdomadaire}</h2>{horsLigne ? <p className="offline-copie-prete"><IconeJournee nom="offline_pin" taille={14} />{enr.langue === 'en' ? 'Local copy ready' : 'Copie locale prête'}</p> : <p>{T.actionsSemaine(realiseesSemaine, actionsSemaine)}</p>}</div>
      {tuiles}
      {horsLigne ? <p className="offline-progression-compte">{T.actionsSemaine(realiseesSemaine, actionsSemaine)}</p> : finished ? <p className="today-done">{T.termine(total)}</p> : <div className="count"><span className="count-main">{T.jourSur(day, total)}</span>{maxOpen < total && <span>{T.ouvreDemain(maxOpen + 1)}</span>}</div>}
    </section>}
    {paused && !horsLigne && <PauseParcours langue={enr.langue} inscription={enr.enrollment_id}/>}
    {paused && (horsLigne||enr.langue==='en') && <p className="muted" role="status">{T.pause}</p>}
    {cloture && <p className="muted" role="status">{T.cloture}</p>}
    <section className="today-section" aria-labelledby="titre-journee">
      <div className="sec-head">
        <div className="sec-titre"><h2 id="titre-journee"><IconeJournee nom="menu_book" taille={22} />{estAujourdhui ? T.taJournee : T.jour(current)}</h2><p className="moment-compte">{enr.langue==='en'?T.nombreMoments(moments.length):`${moments.length} ${moments.length===1?'étape':'étapes'}`}</p></div>
        <button type="button" className="link" aria-label={T.tousLesJours} aria-expanded={tousJours} aria-controls="tous-les-jours" onClick={() => setTousJours(v => !v)}>{enr.langue==='en'?T.tousLesJours:<IconeJourneeSuite nom="swap_horiz" taille={18}/>}</button>
      </div>
      {/* Nouvelle liste à chaque jour choisi : elle repart de la carte du matin (et non de la carte vue avant). */}
      <ul key={`rail-${enr.enrollment_id}-${current}`} className={moments.length > 1 ? 'moment-rail' : 'moment-rail is-seul'}>
        {moments.map(m => {
          const id = `moment-${current}-${m.n}`;
          return <li key={m.content.content_id}>
            <article className={m.ouvert ? 'moment-tuile' : 'moment-tuile is-closed'} aria-label={`${T.moment(m.n, m.heure)} — ${m.content.theme}`}>
              <div className="moment-head">
                {(m.heure || moments.length > 1) ? <span className="time-chip"><IconeJournee nom={m.periode === "matin" ? "wb_sunny" : m.periode === "soir" ? "bedtime" : "schedule"} taille={16} />{enr.langue==='en'?T.moment(m.n,m.heure):m.heure?`${T.periodes[m.periode]} · ${T.moment(m.n,m.heure)}`:T.moment(m.n,null)}</span> : <IconeMaquette nom="menu_book" taille={20} />}
                {m.ouvert ? <span className="dispo-chip">{enr.langue === 'en' ? 'Available' : 'Disponible'}</span> : <IconeJournee nom="lock_clock" taille={22} />}
              </div>
              <h3 id={id}>{m.content.theme}</h3>
              <div className="moment-illus">{m.principal ? <IllustrationLecture /> : <ImageMoment periode={m.periode} />}</div>
              {!horsLigne && <p className="jn-moment-extrait">{m.content.explication || apercuMoment(m.content.texte_officiel, m.content.theme, data.prenom)}</p>}
              {m.ouvert
                ? <button type="button" className="btn moment-btn" aria-describedby={id} onClick={() => ouvrirMoment(m.n)}>{m.principal && action ? T.lireEtAgir : T.lire}<IconeJournee nom={horsLigne ? "menu_book" : "arrow_forward"} taille={20} /></button>
                : <p className="moment-ferme">{T.momentFerme(m.heure ?? '')}</p>}
            </article>
          </li>;
        })}
      </ul>
    </section>

    {/* Écran allégé (19/10/2026) : l'essentiel du jour d'abord (moments, action, journal), le reste replié. */}
    {!horsLigne && <AudioCard maquette key={`audio-${enr.enrollment_id}-${current}`} contentIds={moments.filter(m => m.ouvert).map(m => m.content.content_id)} langue={enr.langue} />}
    {!horsLigne && <ParoleCard key={`parole-${enr.enrollment_id}-${current}`} programmeId={enr.programme_id} version={Number(enr.version)} langue={enr.langue} jour={current} />}
    {reprise !== null && <section className="card reprise-card" aria-label={R.titre(data.prenom)}>
      <p className="tag"><IconeJourneeSuite nom="waving_hand"/>{R.titre(data.prenom)}</p>
      <p>{R.texte(reprise)}</p>
      {current !== reprise && <button type="button" className="btn action-btn" onClick={() => setSelected(reprise)}>{R.bouton(reprise)}</button>}
      <p className="muted">{R.aide}</p>
      {!horsLigne && <div className="link-row"><Link className="link" to={`/coach?inscription=${enr.enrollment_id}`}>{R.coach}</Link><Link className="link" to={`/aide?inscription=${enr.enrollment_id}`}>{R.demander}</Link></div>}
    </section>}
    {obstacle && <ObstacleCard key={`obstacle-${enr.enrollment_id}-${obstacle}`} enrollmentId={enr.enrollment_id} cle={obstacle} langue={enr.langue} />}
    {semaine && <SemaineCard key={`semaine-${enr.enrollment_id}-${semaine.numero}`} semaine={semaine} langue={enr.langue} horsLigne={horsLigne} />}


    {!horsLigne && (jourCal >= total || cloture) && <SuiteCard key={`suite-${enr.enrollment_id}`} programmeId={enr.programme_id} langue={enr.langue} dejaInscrit={data.parcours.map(x => x.programme_id)} />}
    {!horsLigne && <div className="jn-compagnons">
      <GoalCard langue={enr.langue} />
      {jardin.total > 0 && <JardinCard realisees={jardin.realisees} total={jardin.total} langue={enr.langue} />}
      <SeanceCard key={`seance-${enr.enrollment_id}`} enrollmentId={enr.enrollment_id} langue={enr.langue} />
      <InviteCard langue={enr.langue} />
    </div>}

    {action && <section className="today-section" aria-labelledby="titre-action">
      <h2 id="titre-action"><IconeJournee nom={current === 1 ? "self_improvement" : "task_alt"} taille={22} />{T.action}</h2>
      {carteAction(action, false)}
      {horsLigne && <p className="offline-action-note"><IconeJournee nom="save" taille={20} />{enr.langue === 'en' ? 'Read your action now. A connection is needed to record its completion.' : 'Tu peux relire ton action. Une connexion est nécessaire pour enregistrer sa réalisation.'}</p>}
    </section>}

    {invitations.length > 0 && <section className="today-section" aria-labelledby="titre-ecrire">
      <h2 id="titre-ecrire"><IconeJournee nom={enr.langue==='en'?(current===1?"history_edu":"stylus_note"):"menu_book"} taille={22} />{T.ecrireJournal}</h2>
      {horsLigne && question ? <BrouillonHorsLigne userId={userId} key={`${userId}:${question.activity_id}`} activite={question.activity_id} lien={lienJournal(question)} question={question.consigne} langue={enr.langue} /> : invitations.map((x, k) => <div key={x.q.activity_id} className={k === 0 ? 'prompt-carte' : 'prompt-carte is-passe'}>
        <p className="tag">{x.libelle}</p>
        <p className="prompt-question" id={`question-${x.jour}`}>{x.q.consigne}</p>
        <Link className="prompt-ecrire" to={lienJournal(x.q)} aria-describedby={`question-${x.jour}`}><span><IconeJournee nom={current === 1 ? "draw" : "edit_note"} taille={18} />{T.ecrireReflexion}</span><IconeMaquette nom="chevron_right" taille={18} /></Link>
      </div>)}
      <p className="journal-partage"><IconeJournee nom="lock" taille={16} /><span>{T.journalPrive}</span></p>
    </section>}

    {!horsLigne && <details className="repli"><summary>{T.plusLoin}<IconeRegistre nom="expand_more"/></summary><RepereParcours contexte="journee" langue={enr.langue}/></details>}
    {!horsLigne && reglages(enr.langue,true,true)}
    {footer(enr.langue)}
  </>, horsLigne ? 'espace-horsligne' : `${enr.langue==='en'?'':'journee-nouvelle'} ${data.parcours.length>1?'journee-multiple':''} ${paused?'journee-pause':''} ${total>14?'journee-longue':''} ${current===1?'espace-premier-jour':''}`);
}

/** Illustration originale SÉNEVÉ, décorative ; deux formats locaux pour les connexions faibles. */
function IllustrationLecture({ photographique = false }: { photographique?: boolean }) {
  const base = `${import.meta.env.BASE_URL}illustrations/${photographique ? 'seneve-pousse-photo-v1-' : 'seneve-livre-photo-v1-'}`;
  return <img className="illustration-lecture" src={`${base}720.webp`} srcSet={`${base}360.webp 360w, ${base}720.webp 720w`} sizes="(max-width:600px) calc(100vw - 88px), 512px" width={720} height={314} alt="" decoding="async" />;
}

type Choix = 'realisee' | 'partielle' | 'preparee' | 'aide_demandee';

function ActionCard({ enrollmentId, activity, state, readOnly = false, langue = 'fr', titre = true, lecture = false, onEnregistre }: { enrollmentId: string; activity: Activity; state: State | undefined; readOnly?: boolean; langue?: string; titre?: boolean; lecture?: boolean; onEnregistre?: (st: State) => void }) {
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
  return <div className={`card action-card${realisee ? ' is-realisee' : ''}`}>{titre && (lecture ? <div className="lecture-action-titre"><p className="tag"><IconeLecture nom="task_alt" taille={16} />{T.action}</p>{activity.obligatoire && <span>{langue === 'en' ? 'Important' : 'Important'}</span>}</div> : <p className="tag">{T.action}</p>)}
    <div className="action-box"><IconeFinitions nom="favorite" taille={22} /><p className="action">{activity.consigne}</p></div>
    {activity.critere_realisation && <div className="action-critere"><p><strong>{langue === 'en' ? 'When is this action complete?' : 'Quand considérer l’action comme réalisée ?'}</strong></p><p>{activity.critere_realisation}</p></div>}
    {realisee && <p className="success action-faite" role="status"><IconeJournee nom="verified" taille={20} />{T.realisee}{doneAt ? `${T.le}${formatDate(doneAt, T.locale)}` : ''}</p>}
    {!realisee && etat === 'preparee' && <p className="success" role="status">{T.prepareeNotee}</p>}
    {!realisee && etat === 'partielle' && <p className="success" role="status">{T.partielleNotee}</p>}
    {!realisee && aide && <div className="aide-notee" role="status"><p>{T.aideNotee}</p>
      <div className="link-row"><Link className="link" to={`/aide?inscription=${enrollmentId}`}>{T.ecrireEquipe}</Link><Link className="link" to={avecLangue("/coach", langue)}>{T.demanderCoach}</Link></div></div>}
    {!realisee && !readOnly && <>
      <button type="button" className="btn btn-or action-btn" disabled={pending !== null} onClick={() => void record('realisee')}>{lecture ? <IconeLecture nom="done" taille={18} /> : <IconeJournee nom="check" taille={18}/>}{pending === 'realisee' ? T.enregistrement : T.bouton}</button>
      <div className="choix-row">
        {/* « Préparée » ne compte jamais comme réalisée ; proposé seulement tant que rien de plus avancé n'est noté. */}
        {etat === 'non_commencee' && <button type="button" className="btn-secondaire" disabled={pending !== null} onClick={() => void record('preparee')}>{lecture && <IconeLecture nom="hourglass_top" taille={18} />}{pending === 'preparee' ? T.enregistrement : T.boutonPrepa}</button>}
        {etat !== 'partielle' &&<button type="button" className="btn-secondaire" disabled={pending !== null} onClick={() => void record('partielle')}>{lecture && <IconeLecture nom="timelapse" taille={18} />}{pending === 'partielle' ? T.enregistrement : T.boutonPartie}</button>}
        {!aide && <button type="button" className="btn-secondaire" disabled={pending !== null} onClick={() => void record('aide_demandee')}>{lecture && <IconeLecture nom="support" taille={18} />}{pending === 'aide_demandee' ? T.enregistrement : T.boutonAide}</button>}
      </div>
      {error && <p className="error" role="alert">{T.erreur}</p>}
    </>}
  </div>;
}
