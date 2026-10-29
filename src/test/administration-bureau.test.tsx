import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
import {AdministrationBureau} from '@/components/AdministrationBureau';
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

const outils={demandes:<p>Outils des demandes</p>,places:<p>Outils des conventions</p>,equipe:<p>Gestion réelle de l’équipe</p>,freins:<p>Réponses déclarées</p>,indicateurs:<p>Indicateurs détaillés</p>};
beforeEach(()=>{rpc.mockReset();rpc.mockImplementation(async(n:string,a?:{p_jours:number})=>({data:n==='staff_dashboard'?{...data,periode_jours:a?.p_jours??7}:[],error:null}));});afterEach(cleanup);
it('le filtre 30 jours recharge les vrais indicateurs dans la nouvelle disposition',async()=>{
 render(<MemoryRouter><AdministrationBureau admin prenom="Justin" requests={[]} outils={outils}/></MemoryRouter>);await screen.findByText('Précédent : 5');fireEvent.click(screen.getByRole('button',{name:'30 jours'}));await waitFor(()=>expect(rpc).toHaveBeenCalledWith('staff_dashboard',{p_jours:30}));await screen.findByText('Vue opérationnelle · Période : 30 derniers jours');expect(screen.queryByText('Jean-Baptiste')).not.toBeInTheDocument();
});
it('les menus ouvrent les outils dans une fenêtre et la fermeture les masque',async()=>{
 render(<MemoryRouter><AdministrationBureau admin prenom="Justin" requests={[]} outils={outils}/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Places financées'}));expect(await screen.findByText('Outils des conventions')).toBeInTheDocument();expect(screen.getByRole('dialog')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Fermer la fenêtre'}));await waitFor(()=>expect(screen.queryByText('Outils des conventions')).not.toBeInTheDocument());
 expect(rpc.mock.calls.every(c=>['staff_dashboard','staff_list_conventions'].includes(c[0]))).toBe(true);
});
it('un accompagnateur ne charge pas les indicateurs globaux et ne voit pas les menus administrateur',()=>{
 render(<MemoryRouter><AdministrationBureau admin={false} prenom="Lucie" requests={[]} outils={outils}/></MemoryRouter>);
 expect(rpc).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Achats et accès'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Communications'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'30 jours'})).toBeDisabled();
});
it('la version mobile ouvre la vraie demande sans la résoudre et conserve les filtres',async()=>{
 const demande={request_id:'R1',cree_le:'2026-10-17T08:00:00Z',modifie_le:'2026-10-17T08:00:00Z',etat:'recue' as const,motif:'Lecture inaccessible',extraits_partages:null,reponse:null,affecte_a:null,affecte_email:null,prenom:'Marie',langue:'fr',programme_id:'Découverte',email:'marie@example.invalid',whatsapp:null};
 render(<MemoryRouter><AdministrationBureau mobile admin prenom="Justin" requests={[demande]} outils={outils}/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:'Poste d’intervention'})).toBeInTheDocument();
 await waitFor(()=>expect(screen.getByRole('button',{name:'30 jours'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Répondre à la demande'}));expect(await screen.findByText('Outils des demandes')).toBeInTheDocument();
 expect(rpc.mock.calls.some(c=>c[0]==='staff_update_help_request')).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Fermer la fenêtre'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'30 jours'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'30 jours'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('staff_dashboard',{p_jours:30}));
});
it('le mobile conserve les restrictions des accompagnateurs',()=>{
 render(<MemoryRouter><AdministrationBureau mobile admin={false} prenom="Lucie" requests={[]} outils={outils}/></MemoryRouter>);
 expect(rpc).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Achats et accès'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'30 jours'})).toBeDisabled();
});
it('le tableau mobile ouvre les achats réels et ses onglets changent de registre',async()=>{
 render(<MemoryRouter><AdministrationBureau vue="tableau" mobile admin prenom="Justin" requests={[]} outils={outils}/></MemoryRouter>);
 await screen.findByText('VENTE1');expect(screen.getByRole('heading',{name:'Tableau de bord',level:1})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Examiner les achats'}));expect(screen.getByRole('dialog')).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Achats et accès'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Fermer la fenêtre'}));fireEvent.click(screen.getByRole('button',{name:'Accès en attente'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'30 j'})).toBeEnabled());expect(document.querySelector('.tf-registres')).toHaveClass('tf-suivi-achats');expect(rpc.mock.calls.every(c=>['staff_dashboard','staff_list_conventions'].includes(c[0]))).toBe(true);
});
it('le tableau ordinateur conserve les chiffres en cas de panne sans annoncer une fausse réussite',async()=>{
 render(<MemoryRouter><AdministrationBureau vue="tableau" admin prenom="Justin" requests={[]} outils={outils}/></MemoryRouter>);
 await screen.findByText('VENTE1');rpc.mockRejectedValue(new Error('réseau'));fireEvent.click(screen.getByRole('button',{name:'Actualiser'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Derniers chiffres conservés');expect(screen.getByText('VENTE1')).toBeInTheDocument();expect(screen.getByRole('alert')).toHaveTextContent('18 octobre 2026');
});
it('l’administrateur trouve « Annonces » dans le menu et la section dans sa vue (signalé le 29/10/2026)',async()=>{
 render(<MemoryRouter><AdministrationBureau admin prenom="Justin" requests={[]} outils={outils}/></MemoryRouter>);
 expect(await screen.findByRole('button',{name:'Annonces'})).toBeInTheDocument();
 cleanup();
 render(<MemoryRouter><AdministrationBureau vue="annonces" admin prenom="Justin" requests={[]} outils={outils}/></MemoryRouter>);
 expect(await screen.findByRole('heading',{name:'Annonces aux participants'})).toBeInTheDocument();
 expect(await screen.findByText('Aucune annonce pour le moment.')).toBeInTheDocument();
});
it('un membre de l’équipe sans rôle administrateur ne voit pas les annonces',async()=>{
 render(<MemoryRouter><AdministrationBureau vue="annonces" admin={false} prenom="Aide" requests={[]} outils={outils}/></MemoryRouter>);
 await waitFor(()=>expect(screen.queryByRole('heading',{name:'Annonces aux participants'})).toBeNull());
 expect(screen.queryByRole('button',{name:'Annonces'})).toBeNull();
});
