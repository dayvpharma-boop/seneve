import {useCallback,useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '@/lib/supabase';

type Facteur={id:string;status:string;friendly_name?:string};
type Activation={id:string;qr:string;secret:string};
/** Préparation MFA uniquement : aucune obligation serveur n'est activée par cet écran. */
export function SecuriteAdministrateur(){
 const [etat,setEtat]=useState<'chargement'|'refuse'|'pret'|'erreur'>('chargement');
 const [facteurs,setFacteurs]=useState<Facteur[]>([]),[niveau,setNiveau]=useState('');
 const [activation,setActivation]=useState<Activation|null>(null),[code,setCode]=useState('');
 const [secours,setSecours]=useState(false),[occupe,setOccupe]=useState(false),[message,setMessage]=useState('');
 const verrou=useRef(false),generation=useRef(0);
 const admin=async()=>{const r=await supabase.rpc('staff_me');if(r.error||r.data?.admin!==true)throw Error('acces');};
 const charger=useCallback(async()=>{
  const n=++generation.current;
  try{
   const me=await supabase.rpc('staff_me');if(n!==generation.current)return;
   if(me.error)throw Error('session');if(me.data?.admin!==true){setActivation(null);setCode('');setEtat('refuse');return;}
   const [f,a]=await Promise.all([supabase.auth.mfa.listFactors(),supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
   if(n!==generation.current)return;if(f.error||a.error||!f.data||!a.data)throw Error('lecture');
   setFacteurs(f.data.all.filter(x=>x.factor_type==='totp'));setNiveau(a.data.currentLevel??'');setEtat('pret');
  }catch{if(n===generation.current){setActivation(null);setCode('');setEtat('erreur');}}
 },[]);
 useEffect(()=>{
  let actif=true;void charger();
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{
   generation.current++;setActivation(null);setCode('');setSecours(false);setMessage('');setEtat('chargement');
   queueMicrotask(()=>{if(actif)void charger();});
  });
  return()=>{actif=false;generation.current++;subscription.unsubscribe();};
 },[charger]);
 async function agir(action:()=>Promise<void>){
  if(verrou.current)return;verrou.current=true;setOccupe(true);setMessage('');
  try{await admin();await action();}catch{setMessage('L’opération n’a pas abouti. Vérifie ta connexion et réessaie.');}
  finally{verrou.current=false;setOccupe(false);}
 }
 const verifie=facteurs.find(f=>f.status==='verified');
 async function commencer(){if(!secours)return;await agir(async()=>{
  const n=generation.current;
  const r=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'SÉNEVÉ administrateur'});
  if(n!==generation.current)return;
  if(r.error||!r.data||r.data.type!=='totp')throw Error('activation');
  const qr=r.data.totp.qr_code;
  if(!qr.startsWith('data:image/svg+xml;')&&!qr.trimStart().startsWith('<svg'))throw Error('qr');
  setActivation({id:r.data.id,qr:qr.startsWith('data:')?qr:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`,secret:r.data.totp.secret});setCode('');
 });}
 async function valider(){const id=activation?.id??verifie?.id;if(!id||!/^\d{6}$/.test(code))return;
  await agir(async()=>{const n=generation.current;const r=await supabase.auth.mfa.challengeAndVerify({factorId:id,code});if(n!==generation.current)return;if(r.error||!r.data?.access_token)throw Error('code');
   setActivation(null);setCode('');await charger();setMessage('Second facteur vérifié pour cette session.');});
 }
 async function annuler(id:string){await agir(async()=>{
  // Relecture avant suppression : ne jamais retirer un facteur devenu vérifié dans un autre onglet.
  const f=await supabase.auth.mfa.listFactors();if(f.error||!f.data)throw Error('lecture');
  if(f.data.all.some(x=>x.id===id&&x.factor_type==='totp'&&x.status==='unverified')){const r=await supabase.auth.mfa.unenroll({factorId:id});if(r.error)throw Error('annulation');}
  if(activation?.id===id){setActivation(null);setCode('');}await charger();
 });}
 return <main className="wrap" lang="fr"><Link to="/admin">Revenir à l’administration</Link><h1>Sécurité de l’administrateur</h1>
  {etat==='chargement'?<p role="status">Vérification de ton accès…</p>:etat==='refuse'?<p role="alert">Un accès administrateur est nécessaire.</p>:etat==='erreur'?<><p role="alert">Impossible de vérifier la sécurité du compte.</p><button className="btn" onClick={()=>void charger()}>Réessayer</button></>:<>
   <p>La validation utilise un code à six chiffres fourni par ton application d’authentification.</p>
   <p role="note">La vérification du facteur ferme les autres sessions du compte. Prévois un moyen de retrouver ton application d’authentification ou conserve sa clé dans un emplacement personnel sécurisé.</p>
   <p>Cette étape prépare le second facteur. L’obligation sur les actions d’administration sera mise en place après vérification d’un accès de secours.</p>
   {verifie&&<p role="status">Application d’authentification enregistrée. {niveau==='aal2'?'Cette session a passé la seconde vérification.':'Vérifie le code pour cette session.'}</p>}
   {!verifie&&!activation&&<><label><input type="checkbox" checked={secours} onChange={e=>setSecours(e.target.checked)}/>J’ai prévu un moyen de récupérer mon application d’authentification.</label><p><button className="btn" disabled={!secours||occupe} onClick={()=>void commencer()}>Préparer mon application d’authentification</button></p></>}
   {activation&&<section aria-label="Activation de l’authentification"><h2>Ajouter SÉNEVÉ à ton application</h2><p>Scanne ce QR code dans ton application d’authentification. Ne le partage pas.</p><img src={activation.qr} alt="QR code personnel d’activation" width={220} height={220}/><details><summary>Afficher la clé de configuration manuelle</summary><code>{activation.secret}</code></details><p>Ni cette clé ni le code ne sont conservés dans le stockage local de cet écran.</p></section>}
   {(activation||(verifie&&niveau!=='aal2'))&&<form onSubmit={e=>{e.preventDefault();void valider();}}><label className="field">Code à six chiffres<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label><button className="btn" disabled={occupe||!/^\d{6}$/.test(code)}>Vérifier le code</button></form>}
   {activation&&<button disabled={occupe} onClick={()=>void annuler(activation.id)}>Annuler cette activation</button>}
   {!activation&&facteurs.filter(f=>f.status==='unverified').map(f=><p key={f.id}><button disabled={occupe} onClick={()=>void annuler(f.id)}>Annuler une activation inachevée</button></p>)}
  </>}{message&&<p role="status">{message}</p>}
 </main>;
}
