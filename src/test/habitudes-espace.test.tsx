import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tables: Record<string, unknown[]> = {};
const appels: { etat: string; id: string }[] = [];
let reponse: (etat: string) => { data: unknown; error: unknown } = () => ({ data: null, error: null });
function builder(table: string) {
  const rows = () => tables[table] ?? [];
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: '10000000-0000-4000-8000-000000000001', user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: (name: string, args: Record<string, string>) => {
      if (name !== 'record_progress') return Promise.resolve({ data: null, error: null });
      appels.push({ etat: args['p_etat']!, id: args['p_client_event_id']! });
      return Promise.resolve(reponse(args['p_etat']!));
    },
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Espace } from '@/routes/espace';

const eid='10000000-0000-4000-8000-000000000002';
const aid=(n:number)=>`20000000-0000-4000-8000-00000000000${n}`;
beforeEach(()=>{
 vi.stubEnv('VITE_HABITUDES_DEFIS','true');vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));sessionStorage.clear();appels.length=0;
 for(const k of Object.keys(tables))delete tables[k];
 tables.participants=[{prenom:'RECETTE'}];tables.programmes=[{programme_id:'HD_FICTIF',nom:'Habitudes & Défis',duree_jours:180}];
 tables.enrollments=[{enrollment_id:eid,programme_id:'HD_FICTIF',version:1,langue:'fr',date_debut:'2026-10-25',etat:'active'}];
 tables.contents=[1,2,3].map(n=>({content_id:`c${n}`,programme_id:'HD_FICTIF',version:1,langue:'fr',jour:1,numero_message:n,theme:'Fixture',texte_officiel:'Fixture'}));
 tables.activities=['Prière du matin','Prière de midi','Prière du soir'].map((consigne,k)=>({activity_id:aid(k+1),content_id:`c${k+1}`,type_activite:'action',consigne,obligatoire:true}));
 tables.hd_programme_links=[{programme_id:'HD_FICTIF',version:1,langue:'fr'}];tables.activity_state=[];
 reponse=(etat)=>({data:{event_id:'30000000-0000-4000-8000-000000000001',etat,aide_demandee:false,repetition:false},error:null});
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllEnvs();});
it('la route rend trois déclarations et actualise seulement la prière déclarée',async()=>{
 render(<MemoryRouter><Espace/></MemoryRouter>);const boutons=await screen.findAllByRole('button',{name:'J’ai réalisé cette activité'});expect(boutons).toHaveLength(3);fireEvent.click(boutons[0]!);
 await screen.findByText('Réalisée · Synchronisée');expect(screen.getAllByText('Pas encore enregistrée')).toHaveLength(2);expect(appels).toHaveLength(1);
});
it('le parcours en pause bloque les trois déclarations',async()=>{
 (tables.enrollments![0] as Record<string,unknown>).etat='en_pause';render(<MemoryRouter><Espace/></MemoryRouter>);
 await screen.findByRole('heading',{name:'Mes activités du jour'});expect(screen.queryByRole('button',{name:'J’ai réalisé cette activité'})).toBeNull();expect(appels).toHaveLength(0);
});
it('une copie hors connexion ne propose pas de déclaration',async()=>{
 vi.spyOn(window.navigator,'onLine','get').mockReturnValue(false);render(<MemoryRouter><Espace/></MemoryRouter>);
 await screen.findByText('Copie hors connexion — les déclarations sont indisponibles ici.');expect(screen.queryByRole('button',{name:'J’ai réalisé cette activité'})).toBeNull();expect(appels).toHaveLength(0);
});
