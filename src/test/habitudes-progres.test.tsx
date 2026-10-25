import {cleanup,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const tables:Record<string,unknown[]>={};let registryError=false;
const from=vi.fn((table:string)=>{
 const b:Record<string,unknown>={};for(const m of ['select','eq','neq','in','order'])b[m]=()=>b;
 const result=()=>({data:tables[table]??[],error:table==='hd_programme_links'&&registryError?new Error('indisponible'):null});
 b.maybeSingle=()=>Promise.resolve({...result(),data:(tables[table]??[])[0]??null});
 b.then=(ok:(v:unknown)=>unknown)=>Promise.resolve(result()).then(ok);return b;
});
vi.mock('@/lib/supabase',()=>({supabase:{auth:{getSession:()=>Promise.resolve({data:{session:{user:{user_metadata:{}}}}})},rpc:()=>Promise.resolve({data:'P',error:null}),from:(t:string)=>from(t)},siteUrl:(p:string)=>p}));
import {Progres} from '@/routes/progres';
import {joursHabitudesLecture} from '@/lib/habitudes-lecture';
const eid='10000000-0000-4000-8000-000000000001',aid=(n:number)=>`20000000-0000-4000-8000-00000000000${n}`;
const inscription={enrollment_id:eid,programme_id:'HD_FICTIF',version:1,langue:'fr',date_debut:'2026-10-25'};
const contenus=[1,2,3].map(n=>({content_id:`c${n}`,programme_id:'HD_FICTIF',version:1,langue:'fr',jour:1,numero_message:n,theme:'Fixture'}));
const activites=['Prière du matin','Prière de midi','Prière du soir'].map((consigne,k)=>({activity_id:aid(k+1),content_id:`c${k+1}`,type_activite:'action',consigne,obligatoire:true}));
const etats=[{enrollment_id:eid,activity_id:aid(1),etat:'realisee' as const,aide_demandee:false}];
beforeEach(()=>{
 vi.stubEnv('VITE_HABITUDES_DEFIS','true');vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));registryError=false;from.mockClear();
 for(const k of Object.keys(tables))delete tables[k];
 Object.assign(tables,{participants:[{prenom:'RECETTE',langue:'fr'}],enrollments:[{...inscription,etat:'active'}],programmes:[{programme_id:'HD_FICTIF',nom:'Habitudes & Défis',duree_jours:180}],contents:contenus,activities:activites,activity_state:etats,hd_programme_links:[{programme_id:'HD_FICTIF',version:1,langue:'fr'}]});
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllEnvs();});
function page(path='/progres'){render(<MemoryRouter initialEntries={[path]}><Progres/></MemoryRouter>);}
it('montre trois prières distinctes, avec une seule réalisation confirmée',async()=>{
 page();await screen.findByText('1 activité réalisée sur 3');
 for(const a of activites)expect(screen.getByRole('heading',{name:a.consigne})).toBeInTheDocument();
 const midi=screen.getByRole('heading',{name:'Prière de midi'}).closest('li')!;
 expect(within(midi).getByText('Pas encore enregistrée')).toBeInTheDocument();expect(within(midi).queryByText('Enregistrement serveur')).toBeNull();expect(document.querySelectorAll('.hd-etat-realisee')).toHaveLength(1);
});
it('sépare l’aide et la réalisation partielle',async()=>{
 tables.activity_state=[...etats,{enrollment_id:eid,activity_id:aid(2),etat:'partielle',aide_demandee:true}];
 page();await screen.findByText('1 activité réalisée sur 3');
 const midi=screen.getByRole('heading',{name:'Prière de midi'}).closest('li')!;
 expect(within(midi).getByText('Réalisée en partie')).toBeInTheDocument();expect(within(midi).getByText('Aide demandée')).toBeInTheDocument();
});
it('ne présente pas un contenu inaccessible comme un bilan de zéros',async()=>{
 tables.contents=[];page();expect(await screen.findByRole('status')).toHaveTextContent('Aucune activité');expect(screen.queryByText(/sur 0/)).toBeNull();
});
it('affiche une erreur si le registre est indisponible',async()=>{
 registryError=true;page();expect(await screen.findByRole('alert')).toHaveTextContent('Impossible');
});
it('le module désactivé ne consulte pas son registre',async()=>{
 vi.stubEnv('VITE_HABITUDES_DEFIS','false');page();await screen.findByRole('heading',{name:'Les étapes du parcours'});
 expect(from.mock.calls.some(([name])=>name==='hd_programme_links')).toBe(false);expect(document.querySelector('.hd-bilan')).toBeNull();
});
it('traduit l’interface sans modifier les consignes publiées',async()=>{
 page('/progres?lang=en');await screen.findByText('1 of 3 activities completed');expect(screen.getByRole('heading',{name:'Prière du matin'})).toBeInTheDocument();
});
it('isole versions, langues, inscriptions et jours futurs',()=>{
 const autres=contenus.map(c=>({...c,version:2,content_id:c.content_id+'v2'})),futur={...contenus[0]!,jour:2,content_id:'demain'},anglais={...contenus[0]!,langue:'en',content_id:'anglais'};
 const acts=[...activites,{...activites[0]!,activity_id:aid(4),content_id:autres[0]!.content_id},{...activites[0]!,activity_id:aid(5),content_id:'demain'},{...activites[0]!,activity_id:aid(6),content_id:'anglais'}];
 const jours=joursHabitudesLecture(inscription,1,[...contenus,...autres,futur,anglais],acts,[...etats,{enrollment_id:'AUTRE',activity_id:aid(2),etat:'realisee',aide_demandee:false}]);
 expect(jours).toHaveLength(1);expect(jours[0]!.bilan.realisees).toBe(1);expect(jours[0]!.activites).toHaveLength(3);expect(jours[0]!.bilan.journee).toBe('partielle');
});
