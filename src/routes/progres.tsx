import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { BarreNav } from '@/components/BarreNav';
import { pickDefault, placerOngletActif } from '@/lib/espace';
import { nomParcours } from '@/lib/espace-textes';
import { bilan, progresTextes, semaines, semaineTextes, type Bilan } from '@/lib/progres';

type Parcours = { enrollment_id: string; programme_id: string; version: number | string; langue: string; date_debut: string; etat: string; duree: number; nom: string };
type Loaded = { langue: string; parcours: Parcours[]; bilans: Record<string, Bilan>; notes: number };

async function load(): Promise<Loaded | null> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const ep = await supabase.rpc('ensure_participant', { p_prenom: (s.session.user.user_metadata?.['prenom'] as string | undefined) ?? '' });
  if (ep.error) throw ep.error;
  const [p, e, j] = await Promise.all([
    supabase.from('participants').select('langue').maybeSingle(),
    supabase.from('enrollments').select('enrollment_id, programme_id, version, langue, date_debut, etat').neq('etat', 'annulee'),
    supabase.from('journal_entries').select('entry_id'),
  ]);
  for (const r of [p, e, j]) if (r.error) throw r.error;
  const enr = (e.data ?? []) as Omit<Parcours, 'duree' | 'nom'>[];
  const langue = (p.data?.langue as string | undefined) ?? 'fr';
  const notes = (j.data ?? []).length;
  if (!enr.length) return { langue, parcours: [], bilans: {}, notes };
  const progIds = [...new Set(enr.map(x => x.programme_id))];
  const [pr, c, st] = await Promise.all([
    supabase.from('programmes').select('programme_id, nom, duree_jours').in('programme_id', progIds),
    supabase.from('contents').select('content_id, programme_id, version, jour, numero_message, theme').in('programme_id', progIds),
    supabase.from('activity_state').select('enrollment_id, activity_id, etat, aide_demandee, realisee_le').in('enrollment_id', enr.map(x => x.enrollment_id)),
  ]);
  for (const r of [pr, c, st]) if (r.error) throw r.error;
  const progs = (pr.data ?? []) as { programme_id: string; nom: string; duree_jours: number | null }[];
  const contents = (c.data ?? []) as { content_id: string; programme_id: string; version: number | string; jour: number; numero_message: number; theme: string }[];
  const ids = contents.map(x => x.content_id);
  const a = ids.length ? await supabase.from('activities').select('activity_id, content_id, type_activite').in('content_id', ids) : { data: [], error: null };
  if (a.error) throw a.error;
  const activites = (a.data ?? []) as { activity_id: string; content_id: string; type_activite: string }[];
  const etats = (st.data ?? []) as { enrollment_id: string; activity_id: string; etat: string; aide_demandee: boolean; realisee_le: string | null }[];
  const parcours: Parcours[] = enr.map(x => {
    const prog = progs.find(q => q.programme_id === x.programme_id);
    const duree = prog?.duree_jours ?? 7;
    return { ...x, duree, nom: nomParcours(prog?.nom ?? x.programme_id, x.langue, duree) };
  });
  const bilans: Record<string, Bilan> = {};
  for (const x of parcours) {
    const cts = contents.filter(ct => ct.programme_id === x.programme_id && String(ct.version) === String(x.version));
    bilans[x.enrollment_id] = bilan(x.date_debut, x.duree, cts, activites, etats.filter(s2 => s2.enrollment_id === x.enrollment_id));
  }
  return { langue, parcours, bilans, notes };
}

function dateCourte(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Kinshasa', day: 'numeric', month: 'long' }).format(new Date(iso));
}

export function Progres() {
  const navigate = useNavigate();
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
  const T = progresTextes(enr?.langue ?? data?.langue);
  useEffect(() => { document.title = `${T.titre} — SÉNEVÉ`; document.documentElement.lang = enr?.langue === 'en' ? 'en' : 'fr'; }, [T, enr?.langue]);

  const back = <Link className="link" to="/espace">← {T.retour}</Link>;
  if (failed) return <main className="wrap avec-nav"><p className="brand">SÉNEVÉ</p>{back}<div className="card"><p role="alert">{T.erreur}</p><button type="button" className="btn action-btn" onClick={() => void refresh()}>{T.reessayer}</button></div><BarreNav langue={enr?.langue ?? data?.langue} /></main>;
  if (!data) return <main className="wrap avec-nav"><p className="brand">SÉNEVÉ</p><p className="muted">{T.chargement}</p><BarreNav langue={enr?.langue ?? data?.langue} /></main>;
  if (!enr) return <main className="wrap avec-nav"><p className="brand">SÉNEVÉ</p>{back}<h1>{T.titre}</h1><p className="muted">{T.aucun}</p><BarreNav langue={enr?.langue ?? data?.langue} /></main>;

  const b = data.bilans[enr.enrollment_id]!;
  const tabs = data.parcours.length > 1 && <div className="prog-tabs" ref={placerOngletActif} role="tablist" aria-label={T.titre}>
    {data.parcours.map(x => <button type="button" role="tab" key={x.enrollment_id} className="prog-tab" aria-selected={x.enrollment_id === enr.enrollment_id} onClick={() => setChosen(x.enrollment_id)}>{x.nom}</button>)}
  </div>;
  const lienJour = (j: number) => `/espace?parcours=${enr.enrollment_id}&jour=${j}`;

  return <main className="wrap avec-nav">
    <p className="brand">SÉNEVÉ</p>
    {back}
    <h1>{T.titre}</h1>
    <p className="muted">{T.intro}</p>
    {tabs}
    {!tabs && <p className="tag">{enr.nom}</p>}
    <section className="card">
      {b.pasCommence ? <p>{T.pasCommence}</p> : <>
        <p className="day-count">{b.termine ? T.termine : T.joursOuverts(b.joursOuverts, b.duree)}</p>
        <ul className="bilan-list">
          <li><strong>{T.realisees(b.realisees, b.actionsOuvertes)}</strong></li>
          {b.partielles > 0 && <li>{T.partielles(b.partielles)}</li>}
          {b.preparees > 0 && <li>{T.preparees(b.preparees)}</li>}
          {b.aides > 0 && <li>{T.aides(b.aides)}</li>}
          <li>{T.notes(data.notes)}</li>
        </ul>
        {b.prochain !== null
          ? <><p>{T.prochain(b.prochain)}</p><Link className="btn btn-link" to={lienJour(b.prochain)}>{T.reprendre}</Link></>
          : b.actionsOuvertes > 0 && <p className="success">{T.toutFait}</p>}
      </>}
    </section>
    {!b.pasCommence && semaines(b).length > 0 && <section className="card">
      <p className="tag">{semaineTextes(enr.langue).titreListe}</p>
      <ul className="bilan-list">
        {semaines(b).map(w => { const S = semaineTextes(enr.langue); return <li key={w.numero}>
          <strong>{S.titre(w.numero)}</strong>{w.complete ? '' : ` (${S.enCours})`} — {w.applicables === 0 ? S.nonEvalue : S.realisees(w.realisees, w.applicables)}{w.partielles > 0 ? ` · ${S.partielles(w.partielles)}` : ''}{w.aides > 0 ? ` · ${S.aides(w.aides)}` : ''}
        </li>; })}
      </ul>
    </section>}
    <ol className="bilan-jours">
      {b.jours.map(j => <li key={j.jour} className={`bilan-jour${j.ouvert ? '' : ' bilan-ferme'}`}>
        <span className="bilan-num">{T.jour(j.jour)}</span>
        <span className="bilan-theme">{j.ouvert ? (j.theme ?? '') : ''}</span>
        <span className={`bilan-etat etat-${j.etat ?? 'aucune'}`}>
          {!j.ouvert ? T.ferme
            : j.etat === null ? T.sansAction
            : <Link className="link" to={lienJour(j.jour)}>{T.etats[j.etat]}{j.etat === 'realisee' && j.realiseeLe ? `${T.le}${dateCourte(j.realiseeLe, T.locale)}` : ''}{j.aide ? ` · ${T.aide}` : ''}</Link>}
        </span>
      </li>)}
    </ol>
  <BarreNav langue={enr?.langue ?? data?.langue} /></main>;
}
