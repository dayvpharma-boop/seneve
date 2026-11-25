vi.mock('@/lib/supabase',()=>({supabase:{rpc:vi.fn()}}));
import {beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {OnMeDoit} from '@/components/OnMeDoit';
const api=vi.hoisted(()=>({charger:vi.fn(),saisir:vi.fn(),enregistrer:vi.fn(),supprimerPret:vi.fn(),supprimerRemb:vi.fn()}));
vi.mock('@/lib/finance-creances',async original=>({...await original<typeof import('@/lib/finance-creances')>(),chargerCreances:api.charger,saisirCreance:api.saisir,enregistrerPret:api.enregistrer,supprimerPret:api.supprimerPret,supprimerRemboursement:api.supprimerRemb}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:React.ReactNode})=><div>{children}</div>}));
const id='00000000-0000-4000-8000-000000000001',id2='00000000-0000-4000-8000-000000000002',id3='00000000-0000-4000-8000-000000000003';
const avant=(j:number)=>{const d=new Date();d.setDate(d.getDate()-j);return new Intl.DateTimeFormat('en-CA').format(d);};
beforeEach(()=>{vi.clearAllMocks();api.saisir.mockResolvedValue({});api.enregistrer.mockResolvedValue({});api.supprimerPret.mockResolvedValue({});api.supprimerRemb.mockResolvedValue({});api.charger.mockResolvedValue({enrollment_id:id,loans:[
 {loan_id:id,borrower:'Paul',amount:'100.00',currency:'USD',loan_date:'2026-11-01',due_date:avant(6),note:'loyer',payments:[{payment_id:id,amount:'30.00',payment_date:'2026-11-02'}]},
 {loan_id:id2,borrower:'paul ',amount:'50.00',currency:'USD',loan_date:'2026-10-01',due_date:null,payments:[]},
 {loan_id:id3,borrower:'Grâce',amount:'20.00',currency:'USD',loan_date:'2026-10-01',due_date:null,payments:[{payment_id:id3,amount:'20.00',payment_date:'2026-10-05'}]}]});});
const ouvrir=async()=>{render(<MemoryRouter><OnMeDoit userId="u"/></MemoryRouter>);await screen.findByText('Paul');};

it('regroupe par personne, totalise et signale le retard',async()=>{await ouvrir();
 expect(screen.getAllByText('120 USD')).toHaveLength(2);
 expect(screen.getByText('En retard · 6 j')).toBeTruthy();
 expect(screen.getByText('En cours · 1')).toBeTruthy();expect(screen.getByText('Soldés · 1')).toBeTruthy();
 expect(screen.queryByText('Grâce')).toBeNull();fireEvent.click(screen.getByText('Soldés · 1'));expect(screen.getByText('Grâce')).toBeTruthy();});

it('bloque un remboursement trop élevé dans la fiche',async()=>{await ouvrir();fireEvent.click(screen.getByText('Paul'));
 fireEvent.click(screen.getByRole('button',{name:'Remboursement'}));
 fireEvent.change(screen.getByLabelText('Pour le prêt'),{target:{value:id}});
 fireEvent.change(screen.getByLabelText('Montant reçu'),{target:{value:'71'}});
 fireEvent.submit(screen.getByRole('button',{name:'Enregistrer le remboursement'}).closest('form')!);
 expect(api.saisir).not.toHaveBeenCalled();expect(screen.getByRole('status').textContent).toContain('Vérifie le montant');});

it('note « Tout est remboursé » avec le reste exact',async()=>{await ouvrir();fireEvent.click(screen.getByText('Paul'));
 fireEvent.click(screen.getAllByText('Tout est remboursé')[0]!);
 await waitFor(()=>expect(api.saisir).toHaveBeenCalled());const [args,paiement]=api.saisir.mock.calls[0]!;expect(paiement).toBe(true);expect([ 'p_amount' ].map(k=>args[k])[0]).toMatch(/^(70\.00|50\.00)$/);});

it('corrige un prêt avec son identifiant et son motif',async()=>{await ouvrir();fireEvent.click(screen.getByText('Paul'));
 fireEvent.click(screen.getAllByText('Modifier')[0]!);
 fireEvent.change(screen.getByLabelText('Montant prêté'),{target:{value:'20'}});
 fireEvent.submit(screen.getByRole('button',{name:'Enregistrer les changements'}).closest('form')!);
 expect(api.enregistrer).not.toHaveBeenCalled();expect(screen.getByRole('status').textContent).toContain('déjà été remboursé');
 fireEvent.change(screen.getByLabelText('Montant prêté'),{target:{value:'120'}});
 fireEvent.submit(screen.getByRole('button',{name:'Enregistrer les changements'}).closest('form')!);
 await waitFor(()=>expect(api.enregistrer).toHaveBeenCalledWith(expect.objectContaining({p_loan_id:id,p_amount:'120',p_note:'loyer'})));});

it('demande une confirmation avant de supprimer un remboursement',async()=>{await ouvrir();fireEvent.click(screen.getByText('Paul'));
 fireEvent.click(screen.getByLabelText('Supprimer ce remboursement'));expect(api.supprimerRemb).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Supprimer ?'));await waitFor(()=>expect(api.supprimerRemb).toHaveBeenCalledWith(id,id));});

it('affiche une erreur de chargement sans inventer un solde',async()=>{api.charger.mockRejectedValue(Error());render(<MemoryRouter><OnMeDoit userId="u"/></MemoryRouter>);expect(await screen.findByRole('alert')).toHaveTextContent('Suivi indisponible');expect(screen.queryByText('Paul')).toBeNull();});

it('parle anglais',async()=>{render(<MemoryRouter initialEntries={['/?lang=en']}><OnMeDoit userId="u"/></MemoryRouter>);await screen.findByText('Paul');expect(screen.getByText('Still owed')).toBeTruthy();expect(screen.getByText('6 days late')).toBeTruthy();});
