import {TableauAdministration} from './TableauAdministration';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Dashboard = {
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

  return <TableauAdministration data={data} jours={jours} busy={busy} failed={failed} refresh={()=>void refresh(jours)} periode={setJours}/>;
}
