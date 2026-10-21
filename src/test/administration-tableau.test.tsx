import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
import {PilotageAdmin} from '@/components/PilotageAdmin';
import {csvAdministration} from '@/lib/export-administration';
import {NotFound} from '@/routes/introuvable';
import {InterventionAdministration,identifiantDemande} from '@/components/InterventionAdministration';
const data = {
  actualise_le: '2026-10-18T08:00:00Z', periode_jours: 7, equipe_exclue: 1,
  participants: 12, nouveaux: 3, nouveaux_avant: 1, actifs: 5, actifs_avant: 5,
  parcours_en_cours: 18, parcours_termines: 4, aide_attente: 2, aide_attente_48h: 1,
  entree: { visites_test: 40, visites_test_avant: 30, tests_termines: 20, tests_termines_avant: 15, decouvertes: 5, decouvertes_avant: 4,
    achats: 2, achats_avant: 0, sources: [{ source: 'tiktok', visites: 25 }, { source: 'direct', visites: 15 }] },
  pratique: { actions_realisees: 9, actions_realisees_avant: 6, actions_partielles: 2, aides_bouton: 1, nouveaux_total: 3, nouveaux_premiere_action: 2 },
  coach: { questions: 7, echecs: 1, en_attente: 0 },
  relances_total: 1, achats_attente: 1,
  relances: [{ enrollment_id: 'E1', prenom: 'Marie', langue: 'fr', email: 'marie@example.invalid', whatsapp: '+243900000000',
    programme_id: 'PARCOURS_FR', programme: 'Découverte 7 jours', derniere_activite: '2026-10-13T08:00:00Z', jour: 6, duree: 7, jours_sans_activite: 5 }],
  incidents: [{ source: 'communication', categorie: 'whatsapp', etat: 'erreur', nombre: 2 }],
  achats: [{ payment_event_id: 'P1', id_evenement: 'VENTE1', offre_id: 'OFFRE1', statut_traitement: 'en_attente_compte', recu_le: '2026-10-16T08:00:00Z' }],
};

beforeEach(()=>rpc.mockReset());afterEach(cleanup);
it('le nouveau tableau utilise les vrais chiffres et recharge réellement 30 jours',async()=>{
 rpc.mockResolvedValue({data,error:null});render(<PilotageAdmin/>);
 await screen.findByText('Marie');expect(screen.getByText('VENTE1')).toBeInTheDocument();
 expect(screen.queryByText(/Stripe|CDN Audio Ouest|1 290/)).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'30 jours'}));await waitFor(()=>expect(rpc).toHaveBeenLastCalledWith('staff_dashboard',{p_jours:30}));
 expect(rpc.mock.calls.every(c=>c[0]==='staff_dashboard')).toBe(true);
});
it('le nouveau tableau garde les chiffres et leur date quand une actualisation échoue',async()=>{
 rpc.mockResolvedValueOnce({data,error:null}).mockRejectedValueOnce(new Error('réseau'));
 render(<PilotageAdmin/>);await screen.findByText('Marie');
 fireEvent.click(screen.getByRole('button',{name:'Actualiser'}));expect(await screen.findByRole('alert')).toHaveTextContent('Derniers chiffres conservés');
 expect(screen.getByText('VENTE1')).toBeInTheDocument();expect(screen.getByRole('alert')).toHaveTextContent('18 octobre 2026');
});
it('une première panne affiche une indisponibilité, sans faux chiffres conservés',async()=>{
 rpc.mockResolvedValue({data:null,error:{message:'no'}});render(<PilotageAdmin/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Indicateurs indisponibles');expect(screen.queryByText('Derniers chiffres conservés')).not.toBeInTheDocument();expect(screen.queryByRole('region',{name:'Priorités immédiates'})).not.toBeInTheDocument();
});
it('la page introuvable mène au vrai test et à la vraie adresse d’aide',()=>{
 render(<MemoryRouter initialEntries={['/absent']}><Routes><Route path="/absent" element={<NotFound/>}/><Route path="/p" element={<p>Le test fonctionne</p>}/></Routes></MemoryRouter>);
 expect(screen.getByRole('link',{name:/Écrire à l’équipe/})).toHaveAttribute('href','mailto:contact@drjustintshims.com');
 fireEvent.click(screen.getByRole('link',{name:'Revenir au Test des 7 Racines'}));expect(screen.getByText('Le test fonctionne')).toBeInTheDocument();
});
it('les interventions ignorent les demandes closes et ne proposent pas les conventions à un accompagnateur',()=>{
 const req={request_id:'demande/1',cree_le:'2026-10-01T08:00:00Z',modifie_le:'2026-10-01T08:00:00Z',etat:'recue',motif:'Aide',extraits_partages:null,reponse:null,affecte_a:null,affecte_email:null,prenom:'Marie',langue:'fr',programme_id:null,email:null,whatsapp:null};
 render(<InterventionAdministration requests={[req,{...req,request_id:'2',prenom:'Luc',etat:'resolue'}]} admin={false}/>);
 expect(screen.getByText('Marie')).toBeInTheDocument();expect(screen.queryByText('Luc')).not.toBeInTheDocument();expect(screen.queryByText('Voir les conventions')).not.toBeInTheDocument();expect(screen.getByRole('link',{name:'Ouvrir la demande'})).toHaveAttribute('href','#'+identifiantDemande(req.request_id));
});

it('exporte les métriques réelles sans les coordonnées ni les demandes des personnes',()=>{
 const csv=csvAdministration(data);expect(csv).toContain('Visites du test');expect(csv).toContain('40');expect(csv).toContain(data.actualise_le);expect(csv).not.toContain('marie@example.invalid');expect(csv).not.toContain('+243900000000');expect(csv).not.toContain('VENTE1');
});
