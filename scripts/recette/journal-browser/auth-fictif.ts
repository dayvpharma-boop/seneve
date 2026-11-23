import {creerNettoyageSession} from '../../../src/lib/confidentialite-session';
type Session={user:{id:string}}|null;
type Listener=(event:string,session:Session)=>void;
const listeners=new Set<Listener>();
const cle='recette-journal:session';
const session=():Session=>{const id=localStorage.getItem(cle);return id?{user:{id}}:null;};
const nettoyer=creerNettoyageSession();
function emettre(event:string){const s=session();nettoyer(event,s);for(const f of listeners)f(event,s);}
window.addEventListener('storage',e=>{if(e.key===cle)emettre(e.newValue?'SIGNED_IN':'SIGNED_OUT');});
export function connecter(id:string){localStorage.setItem(cle,id);emettre('SIGNED_IN');}
export function renouveler(){emettre('TOKEN_REFRESHED');}
export const supabase={auth:{
  getSession:async()=>({data:{session:session()},error:null}),
  onAuthStateChange:(f:Listener)=>{listeners.add(f);return{data:{subscription:{unsubscribe:()=>listeners.delete(f)}}};},
  signOut:async()=>{localStorage.removeItem(cle);emettre('SIGNED_OUT');return{error:null};},
}};
