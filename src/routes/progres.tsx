import {calendrierHabitudes,dureeHabitudes,fuseauHabitudes} from '@/lib/habitudes-calendrier';
import {lignesPaginees,parPaquets} from '@/lib/lignes-paginees';
import {habitudesActivees} from '@/lib/habitudes-configuration';
import {BilanHabitudes} from '@/components/BilanHabitudes';
import {joursHabitudesLecture, type JourHabitudesLecture, type EtatLecture} from '@/lib/habitudes-lecture';
import { IllustrationPage } from '@/components/IllustrationPage';
import {AvatarParticipant} from '@/components/AvatarParticipant';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { BarreNav } from '@/components/BarreNav';
import { dateDuJour, pickDefault, placerOngletActif } from '@/lib/espace';
import { Icone } from '@/components/Icone';
import { nomParcours } from '@/lib/espace-textes';
import { bilan, progresTextes, semaines, semaineTextes, type Bilan } from '@/lib/progres';
import { JardinCard } from '@/components/JardinCard';
import { IconeProgres } from '@/components/IconeProgres';
import { RepereParcours } from '@/components/RepereParcours';

type Parcours = { enrollment_id: string; programme_id: string; version: number | string; langue: string; date_debut: string; etat: string; date_fin_prevue?: string | null; duree: number; nom: string };
type Loaded = { prenom: string; actions: Record<string, Record<number, string>>; langue: string; parcours: Parcours[]; bilans: Record<string, Bilan>; notes: number; habitudes: Record<string,JourHabitudesLecture[]> };

async function load(): Promise<Loaded | null> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const ep = await supabase.rpc('ensure_participant', { p_prenom: (s.session.user.user_metadata?.['prenom'] as string | undefined) ?? '' });
  if (ep.error) throw ep.error;
  const [p, e, j] = await Promise.all([
    supabase.from('participants').select('langue, prenom, fuseau, preferences').maybeSingle(),
    supabase.from('enrollments').select('enrollment_id, programme_id, version, langue, date_debut, etat, date_fin_prevue').neq('etat', 'annulee'),
    supabase.from('journal_entries').select('entry_id'),
  ]);
  for (const r of [p, e, j]) if (r.error) throw r.error;
  const enr = (e.data ?? []) as Omit<Parcours, 'duree' | 'nom'>[];
  const langue = (p.data?.langue as string | undefined) ?? 'fr';
  const notes = (j.data ?? []).length;
  const prenom = typeof p.data?.prenom === 'string' ? p.data.prenom : (typeof s.session.user.user_metadata?.prenom === 'string' ? s.session.user.user_metadata.prenom : '');
  if (!enr.length) return { prenom, actions: {}, langue, parcours: [], bilans: {}, notes, habitudes: {} };
  const progIds = [...new Set(enr.map(x => x.programme_id))];
  const [pr, c, st, hd] = await Promise.all([
    supabase.from('programmes').select('programme_id, nom, duree_jours').in('programme_id', progIds),
    supabase.from('contents').select('content_id, programme_id, version, langue, jour, numero_message, theme').in('programme_id', progIds),
    // Lecture complète : six mois d'Habitudes & Défis dépassent la limite de 1 000 lignes d'une réponse.
    lignesPaginees<{ enrollment_id: string; activity_id: string; etat: string; aide_demandee: boolean; realisee_le: string | null }>((de, fin) => supabase.from('activity_state').select('enrollment_id, activity_id, etat, aide_demandee, realisee_le').in('enrollment_id', enr.map(x => x.enrollment_id)).order('enrollment_id').order('activity_id').range(de, fin)).then(data => ({ data, error: null }), (error: unknown) => ({ data: null, error })),
    habitudesActivees() ? supabase.from('hd_programme_links').select('programme_id, version, langue').in('programme_id',progIds) : Promise.resolve({data:[],error:null}),
  ]);
  for (const r of [pr, c, st, hd]) if (r.error) throw r.error;
  const progs = (pr.data ?? []) as { programme_id: string; nom: string; duree_jours: number | null }[];
  const contents = (c.data ?? []) as { content_id: string; programme_id: string; version: number | string; langue: string; jour: number; numero_message: number; theme: string }[];
  const ids = contents.map(x => x.content_id);
  const activites = (await parPaquets(ids, paquet => lignesPaginees((de, fin) => supabase.from('activities').select('activity_id, content_id, type_activite, consigne, obligatoire').in('content_id', paquet).order('activity_id').range(de, fin)))) as { activity_id: string; content_id: string; type_activite: string; consigne?: string; obligatoire:boolean }[];
  const etats = (st.data ?? []) as { enrollment_id: string; activity_id: string; etat: string; aide_demandee: boolean; realisee_le: string | null }[];
  const parcours: Parcours[] = enr.map(x => {
    const prog = progs.find(q => q.programme_id === x.programme_id);
    const dureeProgramme = prog?.duree_jours ?? 7;
    const estHd = (hd.data ?? []).some((h: {programme_id: string; version: number | string; langue: string}) => h.programme_id === x.programme_id && String(h.version) === String(x.version) && h.langue === x.langue);
    // Habitudes & Défis : jusqu'à la fin prévue par le serveur (mois payés) ; le nom garde la durée du programme.
    const duree = estHd ? dureeHabitudes(x.date_debut, x.date_fin_prevue, dureeProgramme) : dureeProgramme;
    return { ...x, duree, nom: nomParcours(prog?.nom ?? x.programme_id, x.langue, dureeProgramme) };
  });
  const bilans: Record<string, Bilan> = {};
  const actions: Record<string, Record<number, string>> = {};
  const habitudes:Record<string,JourHabitudesLecture[]>={};
  for (const x of parcours) {
    const cts = contents.filter(ct => ct.programme_id === x.programme_id && String(ct.version) === String(x.version));
    bilans[x.enrollment_id] = bilan(x.date_debut, x.duree, cts, activites, etats.filter(s2 => s2.enrollment_id === x.enrollment_id));
    if((hd.data??[]).some((h:{programme_id:string;version:number|string;langue:string})=>h.programme_id===x.programme_id&&String(h.version)===String(x.version)&&h.langue===x.langue)){
      const calendrier=calendrierHabitudes(x.date_debut,x.duree,fuseauHabitudes(p.data??{}));
      bilans[x.enrollment_id]={...bilans[x.enrollment_id]!,joursOuverts:calendrier.joursOuverts,termine:calendrier.finished,pasCommence:calendrier.notStarted};
      habitudes[x.enrollment_id]=joursHabitudesLecture({...x,version:Number(x.version)},bilans[x.enrollment_id]!.joursOuverts,
        cts.filter(c=>c.langue===x.langue).map(c=>({...c,version:Number(c.version)})),
        activites.map(a=>({...a,consigne:a.consigne??''})),etats as EtatLecture[]);
    }
    actions[x.enrollment_id] = {};
    for (const jour of bilans[x.enrollment_id]!.jours) {
      const ids = new Set(cts.filter(ct => ct.jour === jour.jour).map(ct => ct.content_id));
      const action = activites.find(a => a.type_activite === 'action' && ids.has(a.content_id));
      if (typeof action?.consigne === 'string') actions[x.enrollment_id]![jour.jour] = action.consigne;
    }
  }
  return { prenom, actions, langue, parcours, bilans, notes, habitudes };
}

function dateCourte(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Kinshasa', day: 'numeric', month: 'long' }).format(new Date(iso));
}

export function Progres() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setFailed(false);
    try {
      const loaded = await load();
      if (!loaded) { navigate('/connexion', { replace: true }); return; }
      setData(loaded);
    } catch { setFailed(true); }
  }, [navigate]);
  useEffect(() => { void refresh(); }, [refresh]);

  const enr = data ? (data.parcours.find(x => x.enrollment_id === chosen) ?? pickDefault(data.parcours) ?? data.parcours[0] ?? null) : null;
  // Un choix explicite de langue prime ; sans choix, on suit le parcours, puis le profil.
  const demande = params.get('lang');
  const langue = demande === 'en' || demande === 'fr' ? demande : (enr?.langue ?? data?.langue ?? 'fr');
  const T = progresTextes(langue);
  useEffect(() => { document.title = `${T.titre} — SÉNEVÉ`; document.documentElement.lang = langue === 'en' ? 'en' : 'fr'; }, [T, langue]);

  const back = <Link className="link" to="/espace">← {T.retour}</Link>;
  // En-tête commun à l'espace (écran « Aujourd'hui » validé le 15/10/2026) : marque puis titre.
  const en = langue === 'en';
  const tete = <><header className="parcours-marque"><span><Icone nom="graine" taille={26} /><strong>SÉNEVÉ</strong></span>{data && <Link className="parcours-avatar" to={en ? '/profil?lang=en' : '/profil'} aria-label={en ? 'My profile' : 'Mon profil'}><AvatarParticipant>{data.prenom ? data.prenom.charAt(0).toUpperCase() : 'S'}</AvatarParticipant></Link>}</header><header className="parcours-intro"><p className="parcours-repere"><span />{en ? 'Inner journey' : 'Cheminement intérieur'}</p><h1>{en ? 'My journey' : 'Mon parcours'}</h1></header><IllustrationPage theme="parcours" langue={langue} /></>;
  if (failed) return <main className="wrap avec-nav parcours-page">{tete}<div className="card"><p role="alert">{T.erreur}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>{T.reessayer}</button></div>{back}<BarreNav langue={langue} maquette iconesJournee /></main>;
  if (!data) return <main className="wrap avec-nav parcours-page">{tete}<p className="muted">{T.chargement}</p><BarreNav langue={langue} maquette iconesJournee /></main>;
  if (!enr) return <main className="wrap avec-nav parcours-page">{tete}<p className="muted">{T.aucun}</p>{back}<BarreNav langue={langue} maquette iconesJournee /></main>;

  const b = data.bilans[enr.enrollment_id]!;
  const tabs = <div className="prog-tabs" ref={placerOngletActif} role="tablist" aria-label={T.titre}>
    {data.parcours.map(x => <button type="button" role="tab" key={x.enrollment_id} className="prog-tab" aria-selected={x.enrollment_id === enr.enrollment_id} onClick={() => setChosen(x.enrollment_id)}><span>{x.nom}</span>{x.enrollment_id === enr.enrollment_id && <small>{x.etat === 'en_pause' ? (en ? 'Paused' : 'En pause') : b.termine ? (en ? 'Completed' : 'Terminé') : b.pasCommence ? (en ? 'Upcoming' : 'À venir') : (en ? 'In progress' : 'En cours')}</small>}</button>)}
  </div>;
  if(data.habitudes[enr.enrollment_id]) return <main className="wrap avec-nav parcours-page">
    {tete}<p className="progres-intro">{T.intro}</p>{tabs}
    <BilanHabitudes jours={data.habitudes[enr.enrollment_id]!} langue={langue} inscription={enr.enrollment_id}/>
    {back}<BarreNav langue={langue} maquette iconesJournee/>
  </main>;
  const lienJour = (j: number) => `/espace?parcours=${enr.enrollment_id}&jour=${j}`;
  const aujourdhui = !b.termine && !b.pasCommence ? b.joursOuverts : null;
  const fermes = b.jours.filter(j => !j.ouvert);
  const symboleJour = (j: Bilan['jours'][number], taille = 18) => !j.ouvert ? <IconeProgres nom="lock" taille={taille} /> : j.etat === 'realisee' ? <IconeProgres nom="check" taille={taille} /> : j.etat === 'partielle' ? <IconeProgres nom="contrast" taille={taille} /> : j.etat === 'preparee' ? <IconeProgres nom="hourglass_top" taille={taille} /> : j.aide ? <IconeProgres nom="help" taille={taille} /> : <span>{j.jour}</span>;
  const carte = <div className={b.duree > 14 ? 'day-tiles progres-tuiles is-compact' : 'day-tiles progres-tuiles'} aria-hidden="true">
    {b.jours.map(j => <span key={j.jour} className={['day-tile',j.jour === aujourdhui && 'is-today',j.etat === 'realisee' && 'is-done',!j.ouvert && 'is-locked',j.etat === 'partielle' && 'is-partial',j.etat === 'preparee' && 'is-prepared'].filter(Boolean).join(' ')}><span className="parcours-rond">{symboleJour(j)}</span><span className="parcours-jour">{en ? "D" : "J"}{j.jour}</span></span>)}
  </div>;
  const semainesDuParcours = semaines(b);

  return <main className="wrap avec-nav parcours-page">
    {tete}<p className="progres-intro">{T.intro}</p>{tabs}
    {!b.pasCommence && <JardinCard realisees={b.realisees} total={b.jours.filter(j => j.etat !== null).length} langue={langue} />}
    <section className="card progres-carte" aria-label={enr.nom}>
      {b.pasCommence ? <p>{T.pasCommence}</p> : <>
        <div className="parcours-synthese-titre"><h2>{T.realisees(b.realisees, b.actionsOuvertes)}</h2><span>{en ? 'Week' : 'Semaine'} {Math.max(1, Math.ceil(b.joursOuverts / 7))}</span></div>
        <p className="progres-compte">{b.termine ? T.termine : T.joursOuverts(b.joursOuverts, b.duree)}</p>{carte}
        <ul className="progres-chiffres">
          <li><div><IconeProgres nom="check_circle" taille={16} /><strong>{b.realisees}</strong></div><span>{en ? 'Actions completed' : 'Actions réalisées'}</span></li>
          <li><div><IconeProgres nom="hourglass_bottom" taille={16} /><strong>{b.partielles}</strong></div><span>{en ? 'Partly done' : 'En partie'}</span></li>
          <li><div><IconeProgres nom="help" taille={16} /><strong>{b.aides}</strong></div><span>{en ? 'Help requested' : 'Aide demandée'}</span></li>
          {b.preparees > 0 && <li><div><IconeProgres nom="hourglass_top" taille={16} /><strong>{b.preparees}</strong></div><span>{en ? 'Prepared' : 'Préparées'}</span></li>}
        </ul>
        <p className="parcours-notes"><IconeProgres nom="edit_note" taille={18} />{T.notes(data.notes)}</p>
        {b.prochain !== null ? <div className="progres-suite"><p>{T.prochain(b.prochain)}</p><Link className="btn btn-link moment-btn" to={lienJour(b.prochain)}>{T.reprendre}<IconeProgres nom="arrow_forward" taille={18} /></Link></div> : b.actionsOuvertes > 0 && <p className="success">{T.toutFait}</p>}
      </>}
    </section>
    {!b.pasCommence && semainesDuParcours.length > 0 && <section className="card parcours-semaines"><h2><IconeProgres nom="eco" />{en ? 'Weekly summary' : 'Bilan de la semaine'}</h2><ul className="bilan-list">{semainesDuParcours.map(w => { const S = semaineTextes(langue); return <li key={w.numero}><strong>{S.titre(w.numero)}</strong>{w.complete ? '' : ` (${S.enCours})`} — {w.applicables === 0 ? S.nonEvalue : S.realisees(w.realisees, w.applicables)}{w.partielles > 0 ? ` · ${S.partielles(w.partielles)}` : ''}{w.aides > 0 ? ` · ${S.aides(w.aides)}` : ''}</li>; })}</ul><p>{semaineTextes(langue).note}</p></section>}
    <section className="parcours-etapes"><h2>{en ? 'Journey steps' : 'Les étapes du parcours'}</h2><ol className="bilan-jours">
      {b.jours.filter(j => j.ouvert).map(j => <li key={j.jour} className={`bilan-jour${j.jour === aujourdhui ? ' is-today' : ''}${j.etat === 'realisee' ? ' is-done' : ''}${j.etat === 'partielle' ? ' is-partial' : ''}`}>
        <span className="bilan-pastille" aria-hidden="true"><b>{en ? "D" : "J"}{j.jour}</b>{symboleJour(j,14)}</span>
        <div className="parcours-jour-contenu"><div className="parcours-jour-titre"><span className="bilan-num">{T.jour(j.jour)}</span>{j.jour === aujourdhui ? <small>{en ? 'Today' : 'Aujourd’hui'}</small> : <time dateTime={dateDuJour(enr.date_debut,j.jour).toISOString()}>{new Intl.DateTimeFormat(T.locale,{timeZone:'Africa/Kinshasa',day:'numeric',month:'short'}).format(dateDuJour(enr.date_debut,j.jour))}</time>}</div>
          {j.theme && <h3 className="bilan-theme">{j.theme}</h3>}
          <p className={`bilan-etat etat-${j.etat ?? 'aucune'}`}>{j.etat === null ? T.sansAction : <Link className="link" to={lienJour(j.jour)}>{T.etats[j.etat]}{j.etat === 'realisee' && j.realiseeLe ? `${T.le}${dateCourte(j.realiseeLe,T.locale)}` : ''}{j.aide ? ` · ${T.aide}` : ''}</Link>}</p>
          {data.actions[enr.enrollment_id]?.[j.jour] && <p className="parcours-consigne">{data.actions[enr.enrollment_id]![j.jour]}</p>}
          {j.jour === aujourdhui && <Link className="parcours-revoir" to={lienJour(j.jour)}>{en ? 'Review the day' : 'Revoir la journée'}<IconeProgres nom="arrow_forward" taille={18} /></Link>}
        </div>
      </li>)}
      {fermes.length > 0 && <li className="bilan-jour bilan-ferme"><span className="bilan-pastille" aria-hidden="true"><IconeProgres nom="lock" taille={16} /></span><div className="parcours-jour-contenu"><span className="bilan-num">{fermes.length === 1 ? T.jour(fermes[0]!.jour) : T.jours(fermes[0]!.jour,fermes[fermes.length-1]!.jour)}</span><p className="bilan-etat etat-aucune">{fermes.length === 1 ? T.ferme : T.fermes}</p></div></li>}
    </ol></section>
    <RepereParcours contexte="progres" langue={langue} />
    <footer className="parcours-confidentialite"><IconeProgres nom="verified_user" taille={16} /><Link to={en ? '/confidentialite?lang=en' : '/confidentialite'}>{en ? 'Your progress is recorded in your space.' : 'Tes progrès sont enregistrés dans ton espace.'}</Link></footer>
    <BarreNav langue={langue} maquette iconesJournee />
  </main>;
}

