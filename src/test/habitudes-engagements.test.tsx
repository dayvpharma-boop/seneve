import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const requete={select:()=>requete,eq:()=>requete,in:()=>requete,neq:()=>requete,order:()=>requete,limit:()=>Promise.resolve({data:[{enrollment_id:'EF'}],error:null})};
vi.mock('@/lib/supabase',()=>({supabase:{from:()=>requete,rpc:async()=>({data:{enrollment_id:'EF',date_locale:'2026-10-27',debut_serie:'2026-10-01',jours:26,masque:true,annulable:false},error:null}),auth:{getSession:async()=>({data:{session:null}})}},siteUrl:(p:string)=>p}));
import {HabitudesEngagements} from '@/routes/habitudes-engagements';
beforeEach(()=>{vi.stubEnv('VITE_HABITUDES_DEFIS','true');vi.stubEnv('VITE_HABITUDES_COMPTEUR','true');});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
const page=()=>render(<MemoryRouter><HabitudesEngagements/></MemoryRouter>);
it('présente les quatre engagements, le compteur masqué et la reprise sans remise à zéro',async()=>{
 page();
 expect(screen.getByRole('heading',{name:'Mes engagements'})).toBeVisible();
 for(const e of ['Vérité','Respect','Honnêteté : ni vol ni fraude','Pureté : abstinence hors mariage'])expect(screen.getByText(e)).toBeVisible();
 expect(await screen.findByLabelText('Compteur masqué')).toBeVisible();
 expect(screen.getByText('Ton parcours continue : pour ces manquements, rien n’est remis à zéro.')).toBeVisible();
});
it('n’existe pas sans l’option du compteur',()=>{
 vi.stubEnv('VITE_HABITUDES_COMPTEUR','');page();
 expect(screen.queryByRole('heading',{name:'Mes engagements'})).toBeNull();
});
