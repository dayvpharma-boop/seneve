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
 await screen.findByText('Copie hors connexion — la lecture et les déclarations sont indisponibles ici.');expect(screen.queryByRole('button',{name:'J’ai réalisé cette activité'})).toBeNull();expect(appels).toHaveLength(0);
});

it('ouvrir une lecture conserve le texte entier et ne déclare aucune activité',async()=>{
 (tables.contents![0] as Record<string,unknown>).texte_officiel='Texte fictif de recette.\n\nIndication de mouvement conservée.\nFin du texte fictif.';
 render(<MemoryRouter><Espace/></MemoryRouter>);await screen.findByRole('heading',{name:'Mes activités du jour'});
 const lectures=document.querySelectorAll('.hd-lecture');expect(lectures).toHaveLength(3);
 fireEvent.click(lectures[0]!.querySelector('summary')!);
 expect(lectures[0]!.querySelector('article')!.textContent).toBe('Texte fictif de recette.\n\nIndication de mouvement conservée.\nFin du texte fictif.');expect(appels).toHaveLength(0);
});
it('le choix de jour ne propose que les journées ouvertes et change les textes',async()=>{
 (tables.enrollments![0] as Record<string,unknown>).date_debut='2026-10-24';
 render(<MemoryRouter><Espace/></MemoryRouter>);const select=await screen.findByRole('combobox',{name:'Jour du parcours'});
 expect(select.querySelectorAll('option')).toHaveLength(2);fireEvent.change(select,{target:{value:'1'}});
 await screen.findByRole('heading',{name:'Mes activités — jour 1'});expect(document.querySelectorAll('.hd-lecture')).toHaveLength(3);expect(appels).toHaveLength(0);
});

it('ouvre la journée selon la préférence du participant plutôt que Kinshasa',async()=>{
 tables.participants=[{prenom:'RECETTE',fuseau:'Etc/GMT+12',preferences:{rappels:{fuseau:'Pacific/Kiritimati'}}}];
 (tables.enrollments![0] as Record<string,unknown>).date_debut='2026-10-26';
 render(<MemoryRouter><Espace/></MemoryRouter>);expect(await screen.findAllByRole('button',{name:'J’ai réalisé cette activité'})).toHaveLength(3);
 expect(screen.getByRole('combobox',{name:'Jour du parcours'})).toHaveValue('1');
});
