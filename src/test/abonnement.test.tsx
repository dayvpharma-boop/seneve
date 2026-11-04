import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
const m=vi.hoisted(()=>({rpc:vi.fn(),session:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:m.rpc,auth:{getSession:m.session}}}));
vi.mock('@/components/BarreNav',()=>({BarreNav:()=>null}));
import {Abonnement} from '@/routes/abonnement';
import {lireMonAbonnement,offreAbonnement} from '@/lib/abonnements';
const jour=864e5,iso=(d:number)=>new Date(Date.now()+d*jour).toISOString();
beforeEach(()=>{m.rpc.mockReset();m.session.mockReset();m.session.mockResolvedValue({data:{session:{user:{id:'u1'}}}});});
afterEach(cleanup);
const afficher=(chemin='/reglages/abonnement')=>render(<MemoryRouter initialEntries={[chemin]}><Abonnement/></MemoryRouter>);

// Maquette « Mon abonnement » validée par Dr Justin le 04/11/2026, reliée à seneve.mon_abonnement() (seneve_063).
it('offres Chariow : nom stable par formule, durée et langue',()=>{
 expect(offreAbonnement('plus','an','fr')).toBe('ABONNEMENT_PLUS_AN_FR');
 expect(offreAbonnement('senev','mois','en')).toBe('ABONNEMENT_SENEVE_MOIS_EN');
 expect(offreAbonnement('accompagnement','an','fr')).toBe('ABONNEMENT_ACCOMP_AN_FR');
});
it('réponse du serveur abîmée : Graine par défaut, liens non https ignorés',()=>{
 expect(lireMonAbonnement({formule:'inconnue',liens:{A:'javascript:alert(1)',B:'https://chariow.com/x'},achats:[{offre_id:1}]}))
  .toEqual({formule:'graine',periode:null,debut:null,fin:null,achats:[],liens:{B:'https://chariow.com/x'}});
});
it('mois gratuit en cours : jours restants, aucun produit Chariow encore créé → « Bientôt disponible »',async()=>{
 m.rpc.mockResolvedValue({data:{formule:'graine',periode:null,debut:iso(-20),fin:iso(10),achats:[],liens:{}},error:null});
 afficher();
 expect(await screen.findByRole('heading',{level:2,name:'Graine'})).toBeInTheDocument();
 expect(screen.getByText('10 jours restants')).toBeInTheDocument();
 expect(screen.getAllByText('Bientôt disponible')).toHaveLength(2);
 expect(screen.getByRole('link',{name:'Demander une place'})).toHaveAttribute('href','/aide?motif=accompagnement');
 expect(m.rpc).toHaveBeenCalledWith('mon_abonnement');
});
it('lien Chariow présent : le bouton suit la durée choisie',async()=>{
 m.rpc.mockResolvedValue({data:{formule:'graine',debut:iso(-1),fin:iso(29),achats:[],liens:{ABONNEMENT_PLUS_MOIS_FR:'https://chariow/plus-mois',ABONNEMENT_PLUS_AN_FR:'https://chariow/plus-an'}},error:null});
 afficher();
 expect(await screen.findByRole('link',{name:'Choisir Sénevé Plus'})).toHaveAttribute('href','https://chariow/plus-mois');
 fireEvent.click(screen.getByRole('radio',{name:/À l’année/}));
 expect(screen.getByRole('link',{name:'Choisir Sénevé Plus'})).toHaveAttribute('href','https://chariow/plus-an');
 expect(screen.getByText('Tu économises 40 $ par an')).toBeInTheDocument();
});
it('Sénevé Plus à l’année bientôt fini : alerte, renouveler, achats listés',async()=>{
 m.rpc.mockResolvedValue({data:{formule:'plus',periode:'an',debut:iso(-360),fin:iso(5),achats:[{offre_id:'LIVRE_PDF_FR',produit:'Livre PDF',type_offre:'livre',le:'2026-10-16T10:00:00Z'}],liens:{ABONNEMENT_PLUS_MOIS_FR:'https://chariow/plus-mois'}},error:null});
 afficher();
 expect(await screen.findByRole('heading',{level:2,name:'Sénevé Plus'})).toBeInTheDocument();
 expect(screen.getByText(/à l’année/)).toBeInTheDocument();
 expect(screen.getByText(/se termine bientôt/)).toBeInTheDocument();
 expect(screen.getAllByRole('link',{name:'Renouveler'}).map(a=>a.getAttribute('href'))).toEqual(['#formules','https://chariow/plus-mois']);
 expect(screen.getByText('Acheté le 16 octobre 2026')).toBeInTheDocument();
});
it('formule terminée : message et choix d’une formule',async()=>{
 m.rpc.mockResolvedValue({data:{formule:'senev',periode:'mois',debut:iso(-40),fin:iso(-10),achats:[],liens:{}},error:null});
 afficher();
 expect(await screen.findByText('Terminée')).toBeInTheDocument();
 expect(screen.getByText(/Tout ce que tu as vécu est gardé/)).toBeInTheDocument();
});
it('sans session : invitation à se connecter, rien n’est demandé au serveur',async()=>{
 m.session.mockResolvedValue({data:{session:null}});
 afficher('/reglages/abonnement?lang=en');
 expect(await screen.findByRole('link',{name:'Sign in'})).toHaveAttribute('href','/connexion?lang=en');
 expect(m.rpc).not.toHaveBeenCalled();
});
it('erreur réseau : réessayer recharge',async()=>{
 m.rpc.mockResolvedValueOnce({data:null,error:{message:'x'}}).mockResolvedValueOnce({data:{formule:'graine',liens:{}},error:null});
 afficher();
 fireEvent.click(await screen.findByRole('button',{name:'Réessayer'}));
 expect(await screen.findByRole('heading',{level:2,name:'Graine'})).toBeInTheDocument();
});
