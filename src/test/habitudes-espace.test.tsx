import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tables: Record<string, unknown[]> = {};
let erreurRegistre=false;
const appels: { etat: string; id: string }[] = [];
let reponse: (etat: string) => { data: unknown; error: unknown } = () => ({ data: null, error: null });
function builder(table: string) {
  const rows = () => tables[table] ?? [];
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'range']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: rows(), error: table==='hd_programme_links'&&erreurRegistre?new Error('registre indisponible'):null }).then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: '10000000-0000-4000-8000-000000000001', user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: (name: string, args: Record<string, string>) => {
      if(name==='hd_schedule_settings')return Promise.resolve({data:{enrollment_id:args['p_enrollment_id'],fuseau:'Africa/Kinshasa',date_locale:'2026-10-25',modifications_a_partir_du:'2026-10-26',modeles:[{module_id:'HABITUDES_DEFIS',version:1,langue:'fr',habit_key:'priere_matin',libelle:'Prière du matin — planning',heure_proposee:'06:00',jours_iso:[1,2,3,4,5,6,7]}],horaires:[{participant_id:'PA',module_id:'HABITUDES_DEFIS',version:1,langue:'fr',habit_key:'priere_matin',creneau_id:'matin',heure_locale:'07:15:00',fuseau:'Africa/Kinshasa',jours_iso:[1,2,3,4,5,6,7],valide_du:'2026-10-01',valide_au:null}],revisions:[]},error:null});
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
 vi.stubEnv('VITE_HABITUDES_DEFIS','true');vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));sessionStorage.clear();localStorage.clear();erreurRegistre=false;appels.length=0;
 for(const k of Object.keys(tables))delete tables[k];
 tables.participants=[{participant_id:'PA',prenom:'RECETTE'}];tables.programmes=[{programme_id:'HD_FICTIF',nom:'Habitudes & Défis',duree_jours:180}];
 tables.enrollments=[{enrollment_id:eid,programme_id:'HD_FICTIF',version:1,langue:'fr',date_debut:'2026-10-25',etat:'active'}];
 tables.contents=[1,2,3].map(n=>({content_id:`c${n}`,programme_id:'HD_FICTIF',version:1,langue:'fr',jour:1,numero_message:n,theme:'Fixture',texte_officiel:'Fixture'}));
 tables.activities=['Prière du matin','Prière de midi','Prière du soir'].map((consigne,k)=>({activity_id:aid(k+1),content_id:`c${k+1}`,type_activite:'action',consigne,obligatoire:true}));
 tables.hd_programme_links=[{programme_id:'HD_FICTIF',version:1,langue:'fr'}];tables.activity_state=[];
 reponse=(etat)=>({data:{event_id:'30000000-0000-4000-8000-000000000001',etat,aide_demandee:false,repetition:false},error:null});
});
afterEach(()=>{cleanup();localStorage.clear();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllEnvs();});
it('la route rend trois déclarations et actualise seulement la prière déclarée',async()=>{
 render(<MemoryRouter><Espace/></MemoryRouter>);const boutons=await screen.findAllByRole('button',{name:'J’ai réalisé cette activité'});expect(boutons).toHaveLength(3);fireEvent.click(boutons[0]!);
 await screen.findByText('Réalisée · Synchronisée');expect(screen.getAllByText('Pas encore enregistrée')).toHaveLength(2);expect(appels).toHaveLength(1);
});
it('le parcours en pause bloque les trois déclarations',async()=>{
 (tables.enrollments![0] as Record<string,unknown>).etat='en_pause';render(<MemoryRouter><Espace/></MemoryRouter>);
 await screen.findByRole('heading',{name:'Mes activités du jour'});expect(screen.queryByRole('button',{name:'J’ai réalisé cette activité'})).toBeNull();expect(appels).toHaveLength(0);
});
it('dans l’espace, une copie hors connexion renvoie vers l’écran Habitudes sans proposer de déclaration',async()=>{
 vi.spyOn(window.navigator,'onLine','get').mockReturnValue(false);render(<MemoryRouter><Espace/></MemoryRouter>);
 await screen.findByText(/Hors connexion : ta journée d’habitudes se relit et se note sur l’écran Habitudes/);expect(screen.getByRole('link',{name:'Ouvrir mes habitudes'})).toHaveAttribute('href','/habitudes/aujourdhui');expect(screen.queryByRole('button',{name:'J’ai réalisé cette activité'})).toBeNull();expect(appels).toHaveLength(0);
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

const cleCache='seneve:espace:v1:10000000-0000-4000-8000-000000000001';
it('exclut les contenus HD du cache quand leur interface est désactivée',async()=>{
 vi.stubEnv('VITE_HABITUDES_DEFIS','false');localStorage.setItem(cleCache,'ancienne copie');
 render(<MemoryRouter><Espace/></MemoryRouter>);await screen.findByRole('button',{name:'Se déconnecter'});
 // Depuis le 29/10/2026, la ligne du parcours reste dans la copie ; ses contenus et activités jamais.
 await waitFor(()=>expect(localStorage.getItem(cleCache)).not.toBe('ancienne copie'));const brut=localStorage.getItem(cleCache)??'';expect(brut).not.toContain('Prière du matin');expect(brut).not.toContain('"c1"');expect(screen.queryByRole('heading',{name:'Mes activités du jour'})).toBeNull();
});
it('reste accessible sans copie si le registre est indisponible et le module désactivé',async()=>{
 vi.stubEnv('VITE_HABITUDES_DEFIS','false');erreurRegistre=true;localStorage.setItem(cleCache,'ancienne copie');
 render(<MemoryRouter><Espace/></MemoryRouter>);await screen.findByRole('button',{name:'Se déconnecter'});
 await waitFor(()=>expect(localStorage.getItem(cleCache)).toBeNull());expect(appels).toHaveLength(0);
});
it('conserve la copie du parcours ordinaire après vérification sans correspondance HD',async()=>{
 vi.stubEnv('VITE_HABITUDES_DEFIS','false');tables.hd_programme_links=[];
 render(<MemoryRouter><Espace/></MemoryRouter>);await screen.findByRole('button',{name:'Se déconnecter'});
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(cleCache)??'null')?.donnees.parcours).toHaveLength(1));
});

it('la date de planning suit la journée choisie et affiche les horaires personnels',async()=>{
 (tables.enrollments![0] as Record<string,unknown>).date_debut='2026-10-24';
 render(<MemoryRouter><Espace/></MemoryRouter>);await screen.findByText('07:15');expect(screen.getByText('Horaire personnel')).toBeVisible();
 fireEvent.change(screen.getByRole('combobox',{name:'Jour du parcours'}),{target:{value:'1'}});
 expect(document.querySelector('.hd-planning-jour time[datetime="2026-10-24"]')).not.toBeNull();expect(appels).toHaveLength(0);
});
it('une journée passée du parcours HD terminé reste lisible sans bouton de déclaration',async()=>{
 (tables.enrollments![0] as Record<string,unknown>).date_debut='2026-04-01';
 tables.activity_state=[{enrollment_id:eid,activity_id:aid(1),etat:'realisee',aide_demandee:false}];
 render(<MemoryRouter initialEntries={['/espace?jour=1']}><Espace/></MemoryRouter>);
 await screen.findByRole('heading',{name:'Mes activités — jour 1'});expect(screen.queryByRole('button',{name:'J’ai réalisé cette activité'})).toBeNull();expect(screen.getAllByText('Lecture seule')).toHaveLength(3);expect(screen.getByText('Réalisée · Synchronisée')).toBeVisible();expect(document.querySelectorAll('.hd-lecture')).toHaveLength(3);expect(appels).toHaveLength(0);
});
it('la dernière journée du programme réel terminé ne rouvre pas les cartes de déclaration d’Aujourd’hui',async()=>{
 (tables.enrollments![0] as Record<string,unknown>).date_debut='2026-04-01';(tables.enrollments![0] as Record<string,unknown>).programme_id='HABITUDES_DEFIS_30J_FR_V1';(tables.programmes![0] as Record<string,unknown>).programme_id='HABITUDES_DEFIS_30J_FR_V1';(tables.hd_programme_links![0] as Record<string,unknown>).programme_id='HABITUDES_DEFIS_30J_FR_V1';
 tables.contents=tables.contents!.map(c=>({...c as Record<string,unknown>,programme_id:'HABITUDES_DEFIS_30J_FR_V1',jour:180}));
 render(<MemoryRouter initialEntries={['/espace?jour=180']}><Espace/></MemoryRouter>);
 await screen.findByRole('heading',{name:'Mes activités du jour'});expect(screen.getAllByText('Lecture seule')).toHaveLength(3);expect(screen.queryByRole('button',{name:'J’ai réalisé cette activité'})).toBeNull();expect(screen.queryByText('Les activités ne peuvent pas être vérifiées. Actualise avant de déclarer une action.')).toBeNull();expect(appels).toHaveLength(0);
});
describe('actualisation sans réseau (signalé par Dr Justin le 29/10/2026)',()=>{
 it('après une actualisation hors connexion, le parcours Habitudes reste là et la journée gardée se relit et se note',async()=>{
  const {enregistrerCopieJourHd}=await import('@/lib/habitudes-copie-jour');
  const {entreesFile}=await import('@/lib/file-actions');
  tables.programmes=[{programme_id:'HABITUDES_DEFIS_30J_FR_V1',nom:'Habitudes & Défis',duree_jours:30}];
  tables.enrollments=[{enrollment_id:eid,programme_id:'HABITUDES_DEFIS_30J_FR_V1',version:1,langue:'fr',date_debut:'2026-10-25',etat:'active'}];
  tables.contents=tables.contents!.map(c=>({...(c as object),programme_id:'HABITUDES_DEFIS_30J_FR_V1'}));
  tables.hd_programme_links=[{programme_id:'HABITUDES_DEFIS_30J_FR_V1',version:1,langue:'fr'}];
  // 1. Visite avec réseau : la copie de l'espace est écrite (le jour HD a sa propre copie, écrite par l'écran Habitudes).
  const premier=render(<MemoryRouter><Espace/></MemoryRouter>);
  await waitFor(()=>expect(localStorage.getItem('seneve:espace:v1:10000000-0000-4000-8000-000000000001')).not.toBeNull());
  premier.unmount();
  const brut=localStorage.getItem('seneve:espace:v1:10000000-0000-4000-8000-000000000001')!;
  expect(brut).toContain(eid);expect(brut).not.toContain('Prière du matin');
  const o={occurrence_id:aid(1),enrollment_id:eid,version:1,date_locale:'2026-10-25',requise:true};
  enregistrerCopieJourHd('10000000-0000-4000-8000-000000000001',{enrollmentId:eid,participantId:'PA',dateLocale:'2026-10-25',fuseau:'Africa/Kinshasa',finExclue:null,data:{userId:'10000000-0000-4000-8000-000000000001',date:'2026-10-25',jour:1,activites:[{habit_key:'gratitude_matin',occurrence:o,consigne:'Gratitude du matin',critere:null,heure:'05:50'}]}});
  // 2. Actualisation sans réseau.
  vi.spyOn(window.navigator,'onLine','get').mockReturnValue(false);
  render(<MemoryRouter><Espace/></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Gratitude du matin'})).toBeInTheDocument();
  expect(screen.getByText(/Tu es hors connexion : tu peux noter tes habitudes/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'J’ai réalisé cette activité'}));
  expect(await screen.findByText('Enregistré sur cet appareil')).toBeInTheDocument();
  expect(appels).toHaveLength(0);
  expect(entreesFile('10000000-0000-4000-8000-000000000001')).toHaveLength(1);
 });
 it('sans journée gardée, l’onglet reste et renvoie vers l’écran Habitudes, sans page d’erreur',async()=>{
  const premier=render(<MemoryRouter><Espace/></MemoryRouter>);
  await waitFor(()=>expect(localStorage.getItem('seneve:espace:v1:10000000-0000-4000-8000-000000000001')).not.toBeNull());
  premier.unmount();
  vi.spyOn(window.navigator,'onLine','get').mockReturnValue(false);
  render(<MemoryRouter><Espace/></MemoryRouter>);
  expect(await screen.findByText(/Hors connexion : ta journée d’habitudes se relit et se note sur l’écran Habitudes/)).toBeInTheDocument();
  expect(screen.queryByText('Aucune activité n’est disponible pour le moment.')).toBeNull();
 });
});
