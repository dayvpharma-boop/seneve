import {render,screen,fireEvent,cleanup,within,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const {from}=vi.hoisted(()=>({from:vi.fn()}));vi.mock('@/lib/supabase',()=>({supabase:{from}}));
import {ContenusVue,ContenusAdministration} from '@/components/ContenusAdministration';
import {CommunicationsVue,IncidentsVue} from '@/components/CommunicationsIncidentsAdministration';
import {programmes,versions,moments,activites,envois,incidents} from './fixtures/edition';
import {envoisDepuisDashboard,incidentsDepuisDashboard} from '@/lib/admin-edition';
import type {Dashboard} from '@/components/PilotageAdmin';
afterEach(cleanup);beforeEach(()=>from.mockReset());
const props={mobile:true,programmes,versions,moments,activites,programme:'DEMO7',version:3,busy:false,erreur:'',choisir:vi.fn(),actualiser:vi.fn()};
it('conserve les jours, les trois moments, les sources et la confirmation sans publication fictive',()=>{
 render(<ContenusVue {...props}/>);expect(screen.getAllByText(/Source livre/)).toHaveLength(3);expect(screen.getByText('Matin · Enseignement')).toBeInTheDocument();expect(screen.getByText('Soir · Relecture')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'J6 Disponible'}));expect(screen.getByText('Jour 6 : S’enraciner dans la gratitude')).toBeInTheDocument();
 fireEvent.click(screen.getAllByRole('button',{name:/^Publier$/})[0]!);expect(screen.getByRole('button',{name:'Confirmer la mise en ligne immédiate'})).toBeDisabled();expect(from).not.toHaveBeenCalled();
});
it('filtre les communications et ouvre une préparation sans envoi réel',()=>{
 render(<CommunicationsVue mobile envois={envois} busy={false} erreur="" actualiser={vi.fn()}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Programmés (1)'}));expect(screen.getByText('Un instant pour revenir à l’essentiel')).toBeInTheDocument();expect(screen.queryByText('Jour 4 : Fidèle dans les petites choses',{exact:true})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Nouvel envoi'}));fireEvent.change(screen.getByLabelText('Message'),{target:{value:'Un petit pas aujourd’hui.'}});expect(screen.getByRole('button',{name:'Envoyer maintenant'})).toBeDisabled();expect(screen.getByRole('button',{name:'Programmer l’envoi'})).toBeDisabled();
});
it('la relance présente le ciblage et ne prétend pas remettre un message en file',()=>{
 render(<CommunicationsVue mobile={false} envois={envois} busy={false} erreur="" actualiser={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Relancer les erreurs'}));
 const d=screen.getByRole('dialog');expect(within(d).getByText(/18 échecs/)).toBeInTheDocument();expect(within(d).getByRole('button',{name:'Confirmer la relance immédiate'})).toBeDisabled();
});
it('ne divise pas les livraisons par un total absent et distingue les agrégats des envois',()=>{
 const data={incidents:[{source:'communication',categorie:'whatsapp',etat:'erreur',nombre:18},{source:'traitement',categorie:'activation',etat:'a_examiner',nombre:2}]} as Dashboard;
 const rows=envoisDepuisDashboard(data);expect(rows).toHaveLength(1);expect(rows[0]?.audience).toBeUndefined();expect(incidentsDepuisDashboard(data)).toHaveLength(2);
 render(<CommunicationsVue mobile envois={rows} busy={false} erreur="" actualiser={vi.fn()}/>);expect(screen.getByText('Total des destinataires non fourni')).toBeInTheDocument();expect(screen.getByText(/ne correspond pas à un envoi individuel/)).toBeInTheDocument();
});
it('filtre les incidents ouverts et exige une note sans résoudre un faux incident',()=>{
 render(<IncidentsVue mobile incidents={incidents} busy={false} erreur="" actualiser={vi.fn()}/>);expect(screen.queryByText('Décalage de version des contenus du parcours')).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Marquer comme résolu'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Note obligatoire de résolution *'),{target:{value:'Contrôle de la passerelle et essai terminé.'}});fireEvent.click(screen.getByRole('button',{name:'Marquer comme résolu'}));expect(screen.getByRole('button',{name:'Confirmer la résolution'})).toBeDisabled();fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Annuler'}));
 fireEvent.click(screen.getByLabelText(/Incidents ouverts/));expect(screen.getByText('Décalage de version des contenus du parcours')).toBeInTheDocument();
});
it('charge uniquement le catalogue éditorial autorisé, sans journal ni identité de participant',async()=>{
 const tables:Record<string,unknown[]>={programmes:programmes.slice(0,1),programme_versions:versions.filter(v=>v.programme_id==='DEMO7'),contents:moments.filter(m=>m.programme_id==='DEMO7'&&m.version===2),activities:activites};
 from.mockImplementation((table:string)=>{const q={select:vi.fn(()=>q),order:vi.fn(()=>q),eq:vi.fn(()=>q),in:vi.fn(()=>q),limit:vi.fn(()=>q),then:(ok:(r:unknown)=>unknown)=>Promise.resolve({data:tables[table]??[],error:null}).then(ok)};return q;});
 render(<ContenusAdministration mobile/>);await screen.findByText('Jour 4 : Fidèle dans les petites choses');await waitFor(()=>expect(screen.queryByText('Chargement des contenus…')).not.toBeInTheDocument());expect(from.mock.calls.every(c=>['programmes','programme_versions','contents','activities'].includes(c[0]))).toBe(true);
});
it('conserve le catalogue et affiche une erreur quand les versions ne sont pas accessibles',async()=>{
 from.mockImplementation((table:string)=>{const q={select:()=>q,order:()=>q,eq:()=>q,then:(ok:(r:unknown)=>unknown)=>Promise.resolve({data:table==='programmes'?programmes.slice(0,1):null,error:table==='programmes'?null:{message:'accès refusé'}}).then(ok)};return q;});
 render(<ContenusAdministration mobile/>);expect(await screen.findByRole('alert')).toHaveTextContent('ne sont pas accessibles');expect(screen.getByRole('button',{name:'Découverte 7 jours 7 jours · FR'})).toBeInTheDocument();
});
