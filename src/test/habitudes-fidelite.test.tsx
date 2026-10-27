import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
// Serveur simulé : mêmes règles que seneve_private.hd_fidelite_* (série, masque, annulation, double appui).
const mock=vi.hoisted(()=>({appels:[] as {nom:string;args:Record<string,unknown>}[],perdre:0,refus:false,
 serveur:{debut:'2026-10-01',masque:true,precedent:null as string|null,dernier:null as string|null}}));
const AUJOURDHUI='2026-10-27';
const jours=(d:string)=>Math.round((Date.parse(AUJOURDHUI)-Date.parse(d))/864e5);
const etat=()=>({enrollment_id:'EF',date_locale:AUJOURDHUI,debut_serie:mock.serveur.debut,jours:jours(mock.serveur.debut),masque:mock.serveur.masque,annulable:mock.serveur.precedent!==null});
vi.mock('@/lib/supabase',()=>({supabase:{rpc:async(nom:string,args:Record<string,unknown>)=>{
 mock.appels.push({nom,args});const s=mock.serveur;
 if(mock.refus)return {data:null,error:{code:'42501'}};
 if(nom==='hd_fidelite_masquer')s.masque=args.p_masque as boolean;
 if(nom==='hd_fidelite_declarer'&&s.dernier!==args.p_client_event_id){s.precedent=s.debut;s.debut=AUJOURDHUI;s.dernier=args.p_client_event_id as string;}
 if(nom==='hd_fidelite_annuler'){s.debut=s.precedent!;s.precedent=null;s.dernier=null;}
 // Réponse perdue : le serveur a bien enregistré, mais le téléphone ne le sait pas.
 if(mock.perdre>0&&nom==='hd_fidelite_declarer'){mock.perdre--;return {data:null,error:{message:'réseau'}};}
 return {data:etat(),error:null};
}}}));
import {CompteurFidelite} from '@/components/CompteurFidelite';
beforeEach(()=>{mock.appels=[];mock.perdre=0;mock.refus=false;mock.serveur={debut:'2026-10-01',masque:true,precedent:null,dernier:null};});
afterEach(cleanup);
const ouvrir=(langue='fr')=>render(<MemoryRouter><CompteurFidelite enrollmentId="EF" langue={langue}/></MemoryRouter>);
const declarations=()=>mock.appels.filter(a=>a.nom==='hd_fidelite_declarer');

it('est masqué par défaut : aucun chiffre dans la page',async()=>{
 const r=ouvrir();await screen.findByLabelText('Compteur masqué');
 expect(r.container.textContent).not.toMatch(/26/);expect(screen.getByText('Visible par toi seul')).toBeVisible();
 expect(mock.appels).toEqual([{nom:'hd_fidelite_lire',args:{p_enrollment_id:'EF'}}]);
});
it('s’affiche et se masque à la demande, enregistré sur le serveur',async()=>{
 ouvrir();fireEvent.click(await screen.findByRole('button',{name:'Afficher'}));
 expect(await screen.findByText('26')).toBeVisible();expect(screen.getByText('jours')).toBeVisible();
 expect(mock.appels.at(-1)).toEqual({nom:'hd_fidelite_masquer',args:{p_enrollment_id:'EF',p_masque:false}});
 fireEvent.click(screen.getByRole('button',{name:'Masquer'}));await screen.findByLabelText('Compteur masqué');
});
it('HD-12 : la déclaration demande une confirmation, rappelle les protections, puis seul le compteur repart à zéro',async()=>{
 mock.serveur.masque=false;ouvrir();await screen.findByText('26');
 fireEvent.click(screen.getByRole('button',{name:/Faire une déclaration/}));
 expect(declarations()).toHaveLength(0);
 expect(screen.getByText(/uniquement une relation sexuelle hors mariage, librement consentie/)).toBeVisible();
 expect(screen.getByText(/Un acte subi n’est jamais une faute et ne se déclare pas ici/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Annuler'}));expect(declarations()).toHaveLength(0);
 fireEvent.click(screen.getByRole('button',{name:/Faire une déclaration/}));fireEvent.click(screen.getByRole('button',{name:'Confirmer'}));
 expect(await screen.findByText('0')).toBeVisible();
 expect(screen.getByRole('status')).toHaveTextContent('Ta progression est conservée');
 expect(screen.getByRole('link',{name:'Parler à quelqu’un'})).toHaveAttribute('href','/aide');
 expect(declarations()).toHaveLength(1);expect(declarations()[0]!.args).toMatchObject({p_enrollment_id:'EF',p_confirmation:true});
});
it('un double appui ou une réponse perdue réutilise le même identifiant',async()=>{
 mock.serveur.masque=false;mock.perdre=1;ouvrir();await screen.findByText('26');
 fireEvent.click(screen.getByRole('button',{name:/Faire une déclaration/}));
 const confirmer=screen.getByRole('button',{name:'Confirmer'});fireEvent.click(confirmer);fireEvent.click(confirmer);
 await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Confirmer'}));
 expect(await screen.findByText('0')).toBeVisible();
 const ids=new Set(declarations().map(a=>a.args.p_client_event_id));
 expect(declarations()).toHaveLength(2);expect(ids.size).toBe(1);expect(mock.serveur.precedent).toBe('2026-10-01');
});
it('HD-13 : « Annuler ma dernière saisie » rétablit la série précédente',async()=>{
 mock.serveur.masque=false;ouvrir();await screen.findByText('26');
 fireEvent.click(screen.getByRole('button',{name:/Faire une déclaration/}));fireEvent.click(screen.getByRole('button',{name:'Confirmer'}));
 await screen.findByText('0');fireEvent.click(screen.getByRole('button',{name:'Annuler ma dernière saisie'}));
 expect(await screen.findByText('26')).toBeVisible();
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Annuler ma dernière saisie'})).toBeNull());
});
it('refus du serveur : message calme, sans chiffre ni couleur d’alerte',async()=>{
 mock.refus=true;const r=ouvrir();
 expect(await screen.findByRole('alert')).toHaveTextContent('Le compteur n’est pas disponible pour le moment');
 expect(r.container.innerHTML).not.toMatch(/error|red|échec/i);
});
it('existe en anglais, avec le singulier',async()=>{
 mock.serveur={debut:'2026-10-26',masque:false,precedent:null,dernier:null};ouvrir('en');
 expect(await screen.findByText('1')).toBeVisible();expect(screen.getByText('day')).toBeVisible();
 expect(screen.getByText('Visible only to you')).toBeVisible();
});
