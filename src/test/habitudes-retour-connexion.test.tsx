import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter,Route,Routes,useLocation} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({actif:true,signin:vi.fn(),signup:vi.fn(),resend:vi.fn()}));
vi.mock('@/lib/supabase',()=>({siteUrl:(s:string)=>s,supabase:{auth:{signInWithPassword:mock.signin,signUp:mock.signup,resend:mock.resend}}}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>mock.actif}));
import {Connexion} from '@/routes/connexion';
beforeEach(()=>{mock.actif=true;mock.resend.mockReset();mock.resend.mockResolvedValue({error:null});mock.signin.mockReset();mock.signin.mockResolvedValue({error:null});mock.signup.mockReset();mock.signup.mockResolvedValue({data:{user:{identities:[{}]},session:{}},error:null});});afterEach(cleanup);
function Destination(){const l=useLocation();return <p>Destination : {l.pathname}{l.search}</p>;}
function ouvrir(url='/connexion?mode=signin&suite=habitudes&lang=fr',state?:unknown){return render(<MemoryRouter initialEntries={[{pathname:'/connexion',search:url.slice(url.indexOf('?')),state}]}><Routes><Route path="/connexion" element={<Connexion/>}/><Route path="*" element={<Destination/>}/></Routes></MemoryRouter>);}
function envoyer(en=false){fireEvent.change(screen.getByLabelText(en?'Email':'E-mail'),{target:{value:'recette@example.invalid'}});fireEvent.change(screen.getByLabelText(en?'Password':'Mot de passe'),{target:{value:'recette-fictive-123'}});fireEvent.submit(screen.getByLabelText(en?'Password':'Mot de passe').closest('form')!);}
it('revient à la préinscription après connexion sans ouvrir l’accès gratuit',async()=>{ouvrir();envoyer();await screen.findByText('Destination : /habitudes/inscription?lang=fr');expect(mock.signin).toHaveBeenCalledTimes(1);expect(mock.signup).not.toHaveBeenCalled();});
it('conserve la langue anglaise',async()=>{ouvrir('/connexion?mode=signin&suite=habitudes&lang=en');envoyer(true);await screen.findByText('Destination : /habitudes/inscription?lang=en');});
it('le changement de langue conserve l’intention et le mode de connexion',async()=>{ouvrir();fireEvent.click(screen.getByRole('link',{name:'English'}));expect(screen.getByRole('tab',{name:'Sign in'})).toHaveAttribute('aria-selected','true');envoyer(true);await screen.findByText('Destination : /habitudes/inscription?lang=en');});
it('une destination externe dans la requête est ignorée',async()=>{ouvrir('/connexion?mode=signin&suite=https%3A%2F%2Fexample.invalid');envoyer();await screen.findByText('Destination : /espace');});
it('une intention HD avec module désactivé garde le retour habituel',async()=>{mock.actif=false;ouvrir();envoyer();await screen.findByText('Destination : /espace');});
it('préserve le retour journal existant',async()=>{ouvrir(undefined,{retourJournal:'/journal?note=recette'});envoyer();await screen.findByText('Destination : /journal?note=recette');});
it('une erreur de connexion laisse le formulaire et ne redirige pas',async()=>{mock.signin.mockResolvedValue({error:{message:'Invalid login credentials'}});ouvrir();envoyer();await screen.findByRole('alert');expect(screen.queryByText(/Destination :/)).toBeNull();});
it('une création de compte avec session immédiate retrouve la préinscription',async()=>{ouvrir('/connexion?mode=signup&suite=habitudes&lang=fr');fireEvent.change(screen.getByLabelText('Ton prénom'),{target:{value:'Recette'}});envoyer();await screen.findByText('Destination : /habitudes/inscription?lang=fr');expect(mock.signup).toHaveBeenCalledTimes(1);});

it.each(['fr','en'])('la confirmation et son renvoi retrouvent HD dans la langue %s sans démarrer l’essai',async(langue)=>{
 mock.signup.mockResolvedValue({data:{user:{identities:[{}]},session:null},error:null});
 ouvrir(`/connexion?mode=signup&suite=habitudes&lang=${langue}`);
 const en=langue==='en';fireEvent.change(screen.getByLabelText(en?'Your first name':'Ton prénom'),{target:{value:'Recette'}});envoyer(en);
 const renvoi=await screen.findByRole('button',{name:en?'Resend the confirmation email':"Renvoyer l'e-mail de confirmation"});
 expect(mock.signup).toHaveBeenCalledWith(expect.objectContaining({options:expect.objectContaining({emailRedirectTo:`habitudes/inscription?lang=${langue}`})}));
 expect(screen.queryByText(/Destination :/)).toBeNull();expect(mock.signin).not.toHaveBeenCalled();
 fireEvent.click(renvoi);
 await screen.findByText(en?/New email sent/:/Nouvel e-mail envoyé/);
 expect(mock.resend).toHaveBeenCalledWith({type:'signup',email:'recette@example.invalid',options:{emailRedirectTo:`habitudes/inscription?lang=${langue}`}});
});
it.each([['habitudes',false],['https://example.invalid',true]])('la confirmation ne détourne pas le parcours existant : %s, module %s',async(suite,actif)=>{
 mock.actif=actif;mock.signup.mockResolvedValue({data:{user:{identities:[{}]},session:null},error:null});
 ouvrir(`/connexion?mode=signup&suite=${encodeURIComponent(suite)}&lang=fr`);
 fireEvent.change(screen.getByLabelText('Ton prénom'),{target:{value:'Recette'}});envoyer();
 await screen.findByRole('button',{name:"Renvoyer l'e-mail de confirmation"});
 expect(mock.signup).toHaveBeenCalledWith(expect.objectContaining({options:expect.objectContaining({emailRedirectTo:'espace'})}));
});
