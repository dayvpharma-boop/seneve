import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { lienWhatsApp } from '@/lib/admin';
import { formatDateHeure } from '@/lib/journal';

type Dashboard = {
  actualise_le: string; periode_jours: number; equipe_exclue: number;
  participants: number; nouveaux: number; nouveaux_avant: number; actifs: number; actifs_avant: number;
  parcours_en_cours: number; parcours_termines: number; aide_attente: number; aide_attente_48h: number;
  entree: {
    visites_test: number; visites_test_avant: number; tests_termines: number; tests_termines_avant: number;
    decouvertes: number; decouvertes_avant: number; achats: number; achats_avant: number;
    sources: { source: string; visites: number }[];
  };
  pratique: {
    actions_realisees: number; actions_realisees_avant: number; actions_partielles: number; aides_bouton: number;
    nouveaux_total: number; nouveaux_premiere_action: number;
  };
  coach: { questions: number; echecs: number; en_attente: number };
  relances_total: number; achats_attente: number;
  relances: { enrollment_id: string; prenom: string | null; langue: string; email: string | null; whatsapp: string | null;
    programme_id: string; programme: string | null; derniere_activite: string; jour: number; duree: number; jours_sans_activite: number }[];
  incidents: { source: string; categorie: string; etat: string; nombre: number }[];
  achats: { payment_event_id: string; id_evenement: string; offre_id: string | null; statut_traitement: string; recu_le: string }[];
};

const PERIODES = [7, 30] as const;

/** Évolution par rapport à la période précédente de même durée. */
function tendance(actuel: number, avant: number): string {
  if (actuel === avant) return 'stable';
  const ecart = actuel - avant;
  return `${ecart > 0 ? '+' : ''}${ecart} vs période précédente`;
}

/** Part d'une étape par rapport à la précédente ; rien si la base est nulle. */
function taux(n: number, base: number): string | null {
  return base > 0 ? `${Math.round((100 * n) / base)} %` : null;
}

export function PilotageAdmin() {
  const [jours, setJours] = useState<number>(7);
  const [data, setData] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const request = useRef(0);
  const refresh = useCallback(async (periode: number) => {
    const id = ++request.current;
    setBusy(true); setFailed(false);
    try {
      const result = await supabase.rpc('staff_dashboard', { p_jours: periode });
      if (result.error || !result.data) throw new Error('indisponible');
      if (id === request.current) setData(result.data as Dashboard);
    } catch { if (id === request.current) setFailed(true); }
    finally { if (id === request.current) setBusy(false); }
  }, []);
  useEffect(() => { void refresh(jours); return () => { request.current++; }; }, [refresh, jours]);

  const d = data;
  const p = d?.periode_jours ?? jours;
  const aTraiter = d ? [
    d.aide_attente_48h > 0 && `${d.aide_attente_48h} demande${d.aide_attente_48h > 1 ? 's' : ''} d’aide ouverte${d.aide_attente_48h > 1 ? 's' : ''} depuis plus de 48 h`,
    d.achats_attente > 0 && `${d.achats_attente} achat${d.achats_attente > 1 ? 's' : ''} sans accès ouvert`,
    d.coach.en_attente > 0 && `${d.coach.en_attente} question${d.coach.en_attente > 1 ? 's' : ''} au coach sans réponse depuis plus de 10 min`,
    d.incidents.length > 0 && `${d.incidents.reduce((s, i) => s + Number(i.nombre), 0)} incident(s) technique(s) enregistré(s)`,
    d.relances_total > 0 && `${d.relances_total} parcours sans activité depuis 3 jours`,
  ].filter((x): x is string => Boolean(x)) : [];

  const vue = d ? [
    ['Participants', d.participants, null],
    [`Nouveaux · ${p} jours`, d.nouveaux, tendance(d.nouveaux, d.nouveaux_avant)],
    [`Actifs · ${p} jours`, d.actifs, tendance(d.actifs, d.actifs_avant)],
    ['Parcours en cours', d.parcours_en_cours, null],
    ['Parcours terminés', d.parcours_termines, null],
    ['Demandes d’aide ouvertes', d.aide_attente, null],
  ] as const : [];

  const entree = d ? [
    ['Visites du test', d.entree.visites_test, d.entree.visites_test_avant, null],
    ['Tests terminés', d.entree.tests_termines, d.entree.tests_termines_avant, taux(d.entree.tests_termines, d.entree.visites_test)],
    ['Découvertes 7 jours commencées', d.entree.decouvertes, d.entree.decouvertes_avant, taux(d.entree.decouvertes, d.entree.tests_termines)],
    ['Achats vérifiés', d.entree.achats, d.entree.achats_avant, null],
  ] as const : [];

  return <section className="card pilotage" aria-labelledby="pilotage-titre" aria-busy={busy}>
    <div className="pilotage-head"><h2 id="pilotage-titre">Tableau de bord</h2>
      <button type="button" className="btn action-btn" disabled={busy} onClick={() => void refresh(jours)}>{busy ? 'Actualisation…' : 'Actualiser les indicateurs'}</button></div>
    <div className="prog-tabs" role="tablist" aria-label="Période">
      {PERIODES.map(n => <button key={n} type="button" role="tab" className="prog-tab" aria-selected={jours === n} disabled={busy} onClick={() => setJours(n)}>{n} derniers jours</button>)}
    </div>
    {failed && <p className="error" role="alert">Indicateurs indisponibles. Réessaie ; les autres outils d’administration restent accessibles.</p>}
    {!d && busy && <p role="status">Chargement des indicateurs…</p>}
    {d && <>
      <p className="muted">Données au {formatDateHeure(d.actualise_le, 'fr-FR')}{failed ? ' — dernière lecture réussie, actualisation en échec.' : ''}
        {d.equipe_exclue > 0 ? ` Les ${d.equipe_exclue} compte(s) de l’équipe ne sont pas comptés.` : ''}</p>

      <div className="pilotage-a-traiter" role="region" aria-label="À traiter">
        <h3>À traiter</h3>
        {aTraiter.length ? <ul>{aTraiter.map(t => <li key={t}>{t}</li>)}</ul> : <p>Rien d’urgent pour le moment.</p>}
      </div>

      <h3>Vue d’ensemble</h3>
      <dl className="pilotage-stats">{vue.map(([label, value, evo]) => <div key={label}><dt>{label}</dt><dd>{value}</dd>{evo && <p className="pilotage-evo">{evo}</p>}</div>)}</dl>
      <p className="muted">Actif = au moins une action déclarée (réalisée, en partie ou aide demandée) sur la période. Les parcours sont comptés par inscription, les actifs par personne. « Terminé » décrit le statut du parcours, pas la réalisation de toutes ses actions.</p>

      <h3>Parcours d’entrée · {p} jours</h3>
      <dl className="pilotage-stats">{entree.map(([label, value, avant, part]) => <div key={label}><dt>{label}</dt><dd>{value}</dd>
        <p className="pilotage-evo">{tendance(value, avant)}{part ? ` · ${part} de l’étape précédente` : ''}</p></div>)}</dl>
      {d.entree.sources.length > 0 && <p className="muted">Provenance des visites : {d.entree.sources.map(s => `${s.source} (${s.visites})`).join(', ')}.</p>}
      <p className="muted">Un test peut être passé sans compte : les étapes ne suivent pas forcément les mêmes personnes. Ces taux indiquent une tendance, pas un suivi individuel.</p>

      <h3>Pratique · {p} jours</h3>
      <dl className="pilotage-stats">
        <div><dt>Actions réalisées</dt><dd>{d.pratique.actions_realisees}</dd><p className="pilotage-evo">{tendance(d.pratique.actions_realisees, d.pratique.actions_realisees_avant)}</p></div>
        <div><dt>Actions en partie</dt><dd>{d.pratique.actions_partielles}</dd></div>
        <div><dt>« J’ai besoin d’aide » sur une action</dt><dd>{d.pratique.aides_bouton}</dd></div>
        <div><dt>Nouveaux ayant réalisé une 1re action</dt><dd>{d.pratique.nouveaux_premiere_action} / {d.pratique.nouveaux_total}</dd>
          {taux(d.pratique.nouveaux_premiere_action, d.pratique.nouveaux_total) && <p className="pilotage-evo">{taux(d.pratique.nouveaux_premiere_action, d.pratique.nouveaux_total)}</p>}</div>
        <div><dt>Questions au coach</dt><dd>{d.coach.questions}</dd>{d.coach.echecs > 0 && <p className="pilotage-evo">dont {d.coach.echecs} sans réponse (échec)</p>}</div>
      </dl>
      <p className="muted">Seules les déclarations explicites comptent : ouvrir ou lire une journée n’est pas une action réalisée.</p>

      <h3>Personnes à recontacter</h3>
      <p className="muted">Parcours en cours sans activité enregistrée depuis 3 jours ; à confirmer avec la personne. Les lectures seules ne sont pas mesurées. Jusqu’à 50 parcours, les plus anciens d’abord.</p>
      {d.relances.length ? <ul className="pilotage-list">{d.relances.map(r => <li key={r.enrollment_id}>
        <strong>{r.prenom || 'Sans prénom'}</strong> · {r.langue === 'en' ? 'anglais' : 'français'}
        <p>{r.programme || r.programme_id} · jour {r.jour} sur {r.duree}</p>
        <p className="muted">Sans activité depuis {r.jours_sans_activite} jour{r.jours_sans_activite > 1 ? 's' : ''} (dernière activité ou début : {formatDateHeure(r.derniere_activite, 'fr-FR')})</p>
        <div className="row-actions">{r.email && <a href={'mailto:' + r.email}>Contacter par e-mail</a>}
          {r.whatsapp && <a href={lienWhatsApp(r.whatsapp)} target="_blank" rel="noopener noreferrer">Contacter sur WhatsApp</a>}
          {!r.email && !r.whatsapp && <span>Aucun contact disponible</span>}</div>
      </li>)}</ul> : <p>Aucun parcours à relancer selon ce critère.</p>}

      <h3>Incidents enregistrés</h3>
      <p className="muted">Communications en erreur, incertaines ou expirées sur la période ; traitements en erreur ou à examiner, tous âges. Seuls les incidents remontés dans SÉNEVÉ sont visibles.</p>
      {d.incidents.length ? <ul>{d.incidents.map(i => <li key={i.source + i.categorie + i.etat}>{i.categorie} · {i.etat} : <strong>{i.nombre}</strong></li>)}</ul> : <p>Aucun incident enregistré selon ces critères.</p>}

      <h3>Achats sans accès ouvert</h3>
      <p className="muted">Ventes à signature vérifiée, reçues, en attente de compte ou à examiner. Les accès révoqués sont exclus. Jusqu’à 50 ventes, les plus anciennes d’abord.</p>
      {d.achats.length ? <ul className="pilotage-list">{d.achats.map(a => <li key={a.payment_event_id}>
        <strong>{a.id_evenement}</strong> · {a.offre_id || 'Offre à identifier'}<p>{a.statut_traitement} · {formatDateHeure(a.recu_le, 'fr-FR')}</p>
      </li>)}</ul> : <p>Aucun achat en attente selon ces critères.</p>}
    </>}
  </section>;
}
