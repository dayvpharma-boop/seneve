import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
// Les blocs de rappels et d'e-mail ont leurs propres tests : ici, seule leur présence compte.
vi.mock('@/components/RappelsHabitudes',()=>({RappelsHabitudes:()=><p>Bloc rappels d’habitudes</p>}));
vi.mock('@/components/EmailMatinCard',()=>({EmailMatinCard:()=><p>Bloc e-mail du matin</p>}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:vi.fn(),from:vi.fn(),auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}));
import {HabitudesAide} from '@/routes/habitudes-aide';
beforeEach(()=>{vi.stubEnv('VITE_HABITUDES_DEFIS','true');vi.stubEnv('VITE_HABITUDES_RAPPELS','true');});
afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.restoreAllMocks();});
const page=(adresse='/habitudes/aide')=>render(<MemoryRouter initialEntries={[adresse]}><HabitudesAide/></MemoryRouter>);
const lien=(nom:string|RegExp)=>screen.getByRole('link',{name:nom}).getAttribute('href');

it('rassemble l’aide, les rappels, la confidentialité et les données, sans WhatsApp',()=>{
 page();
 expect(screen.getByRole('heading',{name:'Aide et confidentialité',level:1})).toBeVisible();
 for(const t of ['Besoin d’aide ?','Mes rappels','Confidentialité','Mes données'])expect(screen.getByRole('heading',{name:t})).toBeVisible();
 expect(screen.getByText('Bloc rappels d’habitudes')).toBeVisible();expect(screen.getByText('Bloc e-mail du matin')).toBeVisible();
 expect(document.body.textContent).not.toMatch(/whatsapp/i);
});
it('mène aux pages existantes : aide, coach, charte, export et suppression par l’équipe',()=>{
 page();
 expect(lien('Demander de l’aide à l’équipe')).toBe('/aide');expect(lien('Parler au coach')).toBe('/coach');
 expect(lien(/Lire la charte de confidentialité/)).toBe('/confidentialite');
 expect(lien('Demander l’export de mes données')).toBe('/aide?motif=export-donnees');
 expect(lien(/Demander la suppression de mon compte/)).toBe('/aide?motif=suppression-compte');
});
it('décrit la confidentialité telle qu’elle est, sans promesse de stockage sur le téléphone',()=>{
 page();
 expect(screen.getByText(/Ton journal est enregistré sur ton compte\. Dans SÉNEVÉ, toi seul peux le lire\./)).toBeVisible();
 expect(screen.getByText(/effacé 30 jours après la fin de ton parcours/)).toBeVisible();
 expect(screen.getByText(/Aucun montant n’est enregistré ni envoyé/)).toBeVisible();
 expect(document.body.textContent).not.toMatch(/exclusivement sur ton téléphone|gardées sur ton appareil|chiffrement local/i);
});
it('garde la langue anglaise dans les liens',()=>{
 page('/habitudes/aide?lang=en');
 expect(screen.getByRole('heading',{name:'Help and privacy',level:1})).toBeVisible();
 expect(lien('Ask the team for help')).toBe('/aide?lang=en');expect(lien(/Request deletion of my account/)).toBe('/aide?motif=suppression-compte&lang=en');
});
it('signale la perte de connexion sans masquer les informations',()=>{
 page();expect(screen.queryByText(/Tu es hors connexion/)).toBeNull();
 vi.spyOn(navigator,'onLine','get').mockReturnValue(false);fireEvent(window,new Event('offline'));
 expect(screen.getByText(/Tu es hors connexion/)).toBeVisible();expect(screen.getByRole('heading',{name:'Confidentialité'})).toBeVisible();
});
it('n’existe pas sans le module Habitudes & Défis',()=>{
 vi.stubEnv('VITE_HABITUDES_DEFIS','false');page();
 expect(screen.queryByRole('heading',{name:'Aide et confidentialité'})).toBeNull();
});
