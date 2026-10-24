import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter,Routes,Route,Link} from 'react-router-dom';
const m=vi.hoisted(()=>({id:'U1' as string|null,auth:null as any,session:vi.fn(),download:vi.fn(),upload:vi.fn(),remove:vi.fn(),unsubscribe:vi.fn(),url:0}));
vi.mock('@/lib/supabase',()=>({supabase:{auth:{getSession:()=>m.session(),onAuthStateChange:(cb:any)=>{m.auth=cb;return{data:{subscription:{unsubscribe:m.unsubscribe}}};}},storage:{from:()=>({download:m.download,upload:m.upload,remove:m.remove})}}}));
vi.mock('@/lib/photo-profil',async original=>({...await original<typeof import('@/lib/photo-profil')>(),preparerPhoto:async()=>new Blob(['nouvelle'],{type:'image/jpeg'})}));
import {PhotosParticipant,AvatarParticipant} from '@/components/AvatarParticipant';
import {PhotoProfil} from '@/components/PhotoProfil';
import {Bibliotheque} from '@/routes/bibliotheque';
import {enregistrerPhoto,retirerPhoto} from '@/lib/photo-profil';
const blob=()=>new Blob(['photo'],{type:'image/jpeg'});
const image=()=>document.querySelector('.photo-participant img');
const avatar=<a href="/profil" aria-label="Mon profil"><AvatarParticipant>M</AvatarParticipant></a>;
async function changer(id:string|null){await act(async()=>{m.id=id;m.auth(id?'SIGNED_IN':'SIGNED_OUT',id?{user:{id,user_metadata:{prenom:'Marie'}}}:null);});}
beforeEach(()=>{m.id='U1';m.url=0;m.session.mockReset().mockImplementation(async()=>({data:{session:m.id?{user:{id:m.id,user_metadata:{prenom:'Marie'}}}:null},error:null}));m.download.mockReset().mockResolvedValue({data:blob(),error:null});m.upload.mockReset().mockResolvedValue({error:null});m.remove.mockReset().mockResolvedValue({error:null});m.unsubscribe.mockReset();vi.stubGlobal('URL',class extends URL{static createObjectURL=vi.fn(()=> 'blob:photo-'+(++m.url));static revokeObjectURL=vi.fn();});Object.defineProperty(navigator,'onLine',{configurable:true,value:true});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it.each(['fr','en'])('bibliothèque %s : photo visible, lien de profil conservé et aucun nouveau téléchargement entre les pages',async langue=>{
 render(<PhotosParticipant><MemoryRouter initialEntries={['/bibliotheque?lang='+langue]}><Routes><Route path="/bibliotheque" element={<><Bibliotheque/><Link to="/suite">Suite</Link></>}/><Route path="/suite" element={avatar}/></Routes></MemoryRouter></PhotosParticipant>);
 await waitFor(()=>expect(image()).not.toBeNull());expect(screen.getByRole('link',{name:langue==='en'?'My profile':'Mon profil'})).toHaveAttribute('href',langue==='en'?'/profil?lang=en':'/profil');const src=image()?.getAttribute('src');fireEvent.click(screen.getByRole('link',{name:'Suite'}));expect(image()).toHaveAttribute('src',src);expect(m.download).toHaveBeenCalledTimes(1);
});
it('charge une seule fois pour plusieurs avatars et le profil, puis propage ajout et retrait après validation',async()=>{
 m.download.mockResolvedValue({data:null,error:{statusCode:404}});
 render(<PhotosParticipant>{avatar}<span>{avatar}</span><PhotoProfil userId="U1" prenom="Marie" langue="fr"/></PhotosParticipant>);
 await waitFor(()=>expect(m.download).toHaveBeenCalledTimes(1));fireEvent.change(screen.getByLabelText('Choisir une photo de profil'),{target:{files:[new File(['x'],'image.png',{type:'image/png'})]}});
 await screen.findByAltText('Aperçu de la nouvelle photo');expect(image()).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Enregistrer ma photo'}));await screen.findByText('Photo de profil enregistrée');expect(document.querySelectorAll('.photo-participant img')).toHaveLength(2);
 fireEvent.click(screen.getByRole('button',{name:'Retirer ma photo'}));fireEvent.click(screen.getByRole('button',{name:'Confirmer le retrait'}));await screen.findByText('Photo de profil retirée');expect(image()).toBeNull();expect(m.download).toHaveBeenCalledTimes(1);
});
it('remplace les URLs, les révoque au retrait et ne diffuse rien après une écriture refusée',async()=>{
 render(<PhotosParticipant>{avatar}</PhotosParticipant>);await waitFor(()=>expect(image()).not.toBeNull());const ancienne=image()!.getAttribute('src');m.upload.mockResolvedValueOnce({error:Error('refus')});await expect(enregistrerPhoto('U1',blob())).rejects.toThrow();expect(image()).toHaveAttribute('src',ancienne);
 await act(()=>enregistrerPhoto('U1',blob()));expect(image()).not.toHaveAttribute('src',ancienne);expect(URL.revokeObjectURL).toHaveBeenCalledWith(ancienne);await act(()=>retirerPhoto('U1'));expect(image()).toBeNull();
});
it('déconnexion : efface la photo et ignore une ancienne lecture encore en cours',async()=>{
 let terminer!:(v:any)=>void;m.download.mockImplementationOnce(()=>new Promise(r=>{terminer=r;}));render(<PhotosParticipant>{avatar}</PhotosParticipant>);await waitFor(()=>expect(m.download).toHaveBeenCalled());await changer(null);await act(async()=>terminer({data:blob(),error:null}));expect(image()).toBeNull();
});
it('changement de compte : retire immédiatement la photo précédente et ignore sa réponse tardive',async()=>{
 render(<PhotosParticipant>{avatar}</PhotosParticipant>);await waitFor(()=>expect(image()).not.toBeNull());let terminer!:(v:any)=>void;m.download.mockImplementationOnce(()=>new Promise(r=>{terminer=r;}));await changer('U2');expect(image()).toBeNull();await waitFor(()=>expect(m.download).toHaveBeenCalledTimes(2));await changer(null);await act(async()=>terminer({data:blob(),error:null}));expect(image()).toBeNull();expect(URL.revokeObjectURL).toHaveBeenCalled();
});
it('une lecture tardive ne remplace pas une nouvelle photo sauvegardée',async()=>{
 let terminer!:(v:any)=>void;m.download.mockImplementationOnce(()=>new Promise(r=>{terminer=r;}));render(<PhotosParticipant>{avatar}</PhotosParticipant>);await waitFor(()=>expect(m.download).toHaveBeenCalled());await act(()=>enregistrerPhoto('U1',blob()));const src=image()!.getAttribute('src');await act(async()=>terminer({data:blob(),error:null}));expect(image()).toHaveAttribute('src',src);
});
it('reste utilisable sans photo ou réseau, puis réessaie au retour de la connexion',async()=>{
 m.download.mockRejectedValueOnce(Error('réseau'));render(<PhotosParticipant>{avatar}</PhotosParticipant>);await waitFor(()=>expect(m.download).toHaveBeenCalled());expect(screen.getByRole('link',{name:'Mon profil'})).toHaveTextContent('M');fireEvent(window,new Event('online'));await waitFor(()=>expect(image()).not.toBeNull());
 fireEvent.error(image()!);expect(image()).toBeNull();expect(screen.getByRole('link',{name:'Mon profil'})).toHaveTextContent('M');
});
it('sans session ne demande aucune photo et libère son abonnement au démontage',async()=>{
 m.id=null;const v=render(<PhotosParticipant>{avatar}</PhotosParticipant>);await act(async()=>{});expect(m.download).not.toHaveBeenCalled();v.unmount();expect(m.unsubscribe).toHaveBeenCalledTimes(1);
});
it('une session initiale tardive ne peut rétablir la photo après une déconnexion',async()=>{
 let terminer!:(v:any)=>void;m.session.mockImplementationOnce(()=>new Promise(r=>{terminer=r;}));render(<PhotosParticipant>{avatar}</PhotosParticipant>);await changer(null);await act(async()=>terminer({data:{session:{user:{id:'U1'}}},error:null}));expect(m.download).not.toHaveBeenCalled();expect(image()).toBeNull();
});
