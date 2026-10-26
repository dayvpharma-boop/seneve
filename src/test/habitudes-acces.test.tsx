import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({rows:{} as Record<string,unknown[]>,tables:[] as string[],rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'fixture'}}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:vi.fn()}}})},rpc:mock.rpc,from:(table:string)=>{mock.tables.push(table);const q={select:()=>q,eq:()=>q,neq:()=>q,order:()=>q,then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:mock.rows[table]??[],error:null}).then(resolve)};return q;}},siteUrl:(p:string)=>p}));
import {Offres} from '@/routes/offres';
import {AccesGratuitHabitudes} from '@/components/AccesGratuitHabitudes';
const droit={entitlement_id:'DF',offre_id:'FREE',etat:'actif',debut:'2026-10-01T12:00:00Z',fin:'2026-10-31T12:00:00Z'};
const periode={entitlement_id:'DF',enrollment_id:'EF',debut:droit.debut,fin_exclue:droit.fin};
const inscription={enrollment_id:'EF',entitlement_id:null,programme_id:'PH',date_debut:'2026-10-01',etat:'active'};
function carte(overrides:Partial<Parameters<typeof AccesGratuitHabitudes>[0]>={}){return render(<MemoryRouter><AccesGratuitHabitudes droit={droit} periode={periode} inscription={inscription} langue="fr" fuseau="Pacific/Kiritimati" {...overrides}/></MemoryRouter>);}
beforeEach(()=>{vi.stubEnv('VITE_HABITUDES_DEFIS','true');vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));mock.rows={entitlements:[droit],enrollments:[inscription],hd_access_periods:[periode],participants:[{fuseau:'Africa/Kinshasa',preferences:{rappels:{fuseau:'Pacific/Kiritimati'}}}]};mock.tables=[];mock.rpc.mockClear();});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllEnvs();});
it('relie la période gratuite à son inscription même sans entitlement_id dans celle-ci',async()=>{
 render(<MemoryRouter><Offres mode="acces"/></MemoryRouter>);await screen.findByRole('heading',{name:'Ta période gratuite est en cours.'});
 expect(screen.getByRole('link',{name:'Continuer mes habitudes'})).toHaveAttribute('href','/espace?parcours=EF');
 expect(screen.getByText(/1 novembre 2026 à 02:00/)).toBeVisible();expect(screen.getByText(/Pacific\/Kiritimati/)).toBeVisible();expect(mock.rpc).not.toHaveBeenCalled();
});
it('ferme la lecture exactement à la fin exclusive sans proposer de renouvellement',()=>{
 vi.setSystemTime(new Date(droit.fin));carte();expect(screen.getByRole('heading',{name:'Tes 30 jours gratuits sont terminés.'})).toBeVisible();
 expect(screen.queryByRole('link',{name:'Continuer mes habitudes'})).toBeNull();expect(screen.queryByText(/renouvellement/i)).toBeNull();expect(screen.getByRole('link',{name:'Retrouver mon journal'})).toHaveAttribute('href','/journal');
});
it('actualise la fermeture lorsque la page reste ouverte jusqu’à échéance',()=>{
 vi.useRealTimers();vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-31T11:59:59Z'));carte();expect(screen.getByRole('link',{name:'Continuer mes habitudes'})).toBeVisible();
 act(()=>vi.advanceTimersByTime(1000));expect(screen.queryByRole('link',{name:'Continuer mes habitudes'})).toBeNull();expect(screen.getByRole('heading',{name:'Tes 30 jours gratuits sont terminés.'})).toBeVisible();
});
it('actualise aussi le statut au retour dans la fenêtre',()=>{
 carte();vi.setSystemTime(new Date(droit.fin));fireEvent.focus(window);expect(screen.queryByRole('link',{name:'Continuer mes habitudes'})).toBeNull();
});
it('une révocation et une pause ne laissent pas de lien de continuation',()=>{
 const vue=carte({droit:{...droit,etat:'revoque'}});expect(screen.getByText('Cet accès gratuit est fermé.')).toBeVisible();expect(screen.queryByRole('link',{name:'Continuer mes habitudes'})).toBeNull();vue.unmount();
 carte({inscription:{...inscription,etat:'en_pause'}});expect(screen.getByText('Ton parcours est en pause.')).toBeVisible();expect(screen.queryByRole('link',{name:'Continuer mes habitudes'})).toBeNull();
});
it('une période incohérente ne présente jamais un accès ouvert',()=>{
 carte({periode:{...periode,fin_exclue:'2026-11-01T12:00:00Z'}});expect(screen.getByText('Ton accès gratuit doit être vérifié.')).toBeVisible();expect(screen.queryByRole('link',{name:'Continuer mes habitudes'})).toBeNull();expect(document.querySelector('time')).toBeNull();
});
it('conserve les liens de navigation en anglais',()=>{
 carte({langue:'en'});expect(screen.getByRole('link',{name:'Continue my habits'})).toHaveAttribute('href','/espace?parcours=EF&lang=en');expect(screen.getByRole('link',{name:'Open my journal'})).toHaveAttribute('href','/journal?lang=en');
});
it('ne charge pas les tables HD quand le module est désactivé',async()=>{
 vi.stubEnv('VITE_HABITUDES_DEFIS','false');render(<MemoryRouter><Offres mode="acces"/></MemoryRouter>);await screen.findByRole('heading',{name:/Ton accès est ouvert jusqu/});expect(mock.tables).not.toContain('hd_access_periods');expect(screen.queryByText('30 jours gratuits')).toBeNull();
});
