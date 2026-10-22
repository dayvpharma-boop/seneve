import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { eventIdFor } from '@/lib/espace';
import type { ActionIncident, IncidentEdition } from '@/lib/admin-edition';
import { IncidentsVue } from './CommunicationsIncidentsAdministration';

/** Le registre technique ne demande ni journal personnel, ni adresse de destinataire. */
export function IncidentsAdministration({ mobile, authId, communications }: { mobile: boolean; authId: string; communications: () => void }) {
  const [incidents, setIncidents] = useState<IncidentEdition[] | null>(null);
  const [total, setTotal] = useState(0);
  const [lecture, setLecture] = useState(false);
  const [ecriture, setEcriture] = useState(false);
  const [erreur, setErreur] = useState('');
  const [erreurAction, setErreurAction] = useState('');
  const [message, setMessage] = useState('');
  const requete = useRef(0), monte = useRef(false), verrou = useRef(false);
  const tentatives = useRef(new Map<string, string>());
  const charger = useCallback(async () => {
    const id = ++requete.current;
    setLecture(true); setErreur('');
    try {
      const { data, error } = await supabase.rpc('staff_list_incidents', { p_limite: 200 });
      if (error || !data || !Array.isArray(data.incidents)) throw error ?? new Error('registre');
      if (monte.current && id === requete.current) { setIncidents(data.incidents as IncidentEdition[]); setTotal(Number(data.total)); }
    } catch {
      if (monte.current && id === requete.current) setErreur('Le registre ne peut pas être actualisé. Les dernières données chargées sont conservées.');
    } finally { if (monte.current && id === requete.current) setLecture(false); }
  }, [authId]);
  useEffect(() => { monte.current = true; void charger(); return () => { monte.current = false; requete.current++; }; }, [charger]);

  async function agir(incident: IncidentEdition, action: ActionIncident, texte: string) {
    if (verrou.current || lecture || !incident.source_id || !incident.revision || incident.agregat) return false;
    verrou.current = true; setEcriture(true); setErreurAction(''); setMessage('');
    const cle = JSON.stringify([incident.id, action, texte.trim()]);
    const operation = tentatives.current.get(cle) ?? eventIdFor(null);
    tentatives.current.set(cle, operation);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!authId || session.session?.user.id !== authId) throw { code: '42501' };
      const { data, error } = await supabase.rpc('staff_update_incident', {
        p_source: incident.source, p_source_id: incident.source_id, p_revision: incident.revision,
        p_modifie_le: incident.modifie_le ?? null, p_action: action, p_texte: texte.trim(), p_operation_id: operation,
      });
      if (error || !['enregistree', 'deja_enregistree'].includes(data?.resultat)) throw error ?? new Error('enregistrement');
      if (!monte.current) return false;
      tentatives.current.delete(cle);
      setMessage(action === 'resoudre' ? 'Résolution enregistrée.' : action === 'rouvrir' ? 'Signalement rouvert.' : action === 'prendre_en_charge' ? 'Prise en charge enregistrée.' : 'Note enregistrée.');
      await charger();
      return true;
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (monte.current) setErreurAction(code === '40001' ? 'Le signalement a changé. Actualise le registre avant de réessayer.'
        : code === '42501' ? 'Ta session ne permet plus cette action. Reconnecte-toi avec un compte administrateur.'
        : 'L’enregistrement n’a pas pu être confirmé. Ton texte est conservé ici ; réessaie.');
      return false;
    } finally { verrou.current = false; if (monte.current) setEcriture(false); }
  }
  return <IncidentsVue key={authId} mobile={mobile} incidents={incidents} total={total} busy={lecture || ecriture}
    erreur={erreur} erreurAction={erreurAction} message={message} actualiser={() => { setErreurAction(''); void charger(); }} agir={agir} communications={communications} />;
}
