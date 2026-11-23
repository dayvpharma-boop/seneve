import {useCallback,useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '@/lib/supabase';
import {IconeConfidentialite as Icone} from '@/components/IconeConfidentialite';
import './admin-securite.css';

type Facteur={id:string;status:string;friendly_name?:string};
type Activation={id:string;qr:string;secret:string};
/** Préparation MFA uniquement : aucune obligation serveur n'est activée par cet écran. */
export function SecuriteAdministrateur(){
 const [etat,setEtat]=useState<'chargement'|'connexion'|'refuse'|'pret'|'erreur'>('chargement');
 const [facteurs,setFacteurs]=useState<Facteur[]>([]),[niveau,setNiveau]=useState('');
 const [activation,setActivation]=useState<Activation|null>(null),[code,setCode]=useState('');
 const [secours,setSecours]=useState(false),[occupe,setOccupe]=useState(false),[message,setMessage]=useState('');
 const verrou=useRef(false),generation=useRef(0);
 const admin=async()=>{const r=await supabase.rpc('staff_me');if(r.error||r.data?.admin!==true)throw Error('acces');};
 const charger=useCallback(async()=>{
  const n=++generation.current;
  try{
   const session=await supabase.auth.getSession();if(n!==generation.current)return;
   if(session.error)throw Error('session');
   if(!session.data.session){setActivation(null);setCode('');setEtat('connexion');return;}
   const me=await supabase.rpc('staff_me');if(n!==generation.current)return;
   if(me.error)throw Error('session');if(me.data?.admin!==true){setActivation(null);setCode('');setEtat('refuse');return;}
   const [f,a]=await Promise.all([supabase.auth.mfa.listFactors(),supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
   if(n!==generation.current)return;if(f.error||a.error||!f.data||!a.data)throw Error('lecture');
   setFacteurs(f.data.all.filter(x=>x.factor_type==='totp'));setNiveau(a.data.currentLevel??'');setEtat('pret');
  }catch{if(n===generation.current){setActivation(null);setCode('');setEtat('erreur');}}
 },[]);
 useEffect(()=>{
  document.title='Sécurité de l’administrateur — SÉNEVÉ';
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
 return <main className="securite-admin" lang="fr">
  <header className="securite-barre"><Link to="/admin"><Icone nom="arrow_back" taille={20}/>Administration</Link><span>SÉNEVÉ</span></header>
  <div className="securite-intro"><span className="securite-symbole"><Icone nom="verified_user" taille={32}/></span><p className="securite-surtitre">TON COMPTE ADMINISTRATEUR</p><h1>Sécurité de l’administrateur</h1><p>Une seconde vérification pour mieux protéger ton accès.</p></div>
  <div className="securite-grille"><section className="securite-carte" aria-labelledby="securite-titre"><div className="securite-carte-titre"><span className="securite-picto"><Icone nom="lock"/></span><div><h2 id="securite-titre">Application d’authentification</h2><p>Un code personnel, renouvelé régulièrement.</p></div></div>
  {etat==='chargement'?<p role="status">Vérification de ton accès…</p>:etat==='connexion'?<div className="securite-etat"><h3>Connecte-toi pour continuer</h3><p>Utilise ton compte administrateur SÉNEVÉ pour accéder à ses réglages de sécurité.</p><Link className="securite-action" to="/connexion?mode=signin" state={{retour:'/admin/securite'}}>Me connecter</Link></div>:etat==='refuse'?<div className="securite-etat"><p role="alert">Un accès administrateur est nécessaire.</p><Link to="/espace">Revenir à mon espace</Link></div>:etat==='erreur'?<div className="securite-etat"><p role="alert">Impossible de vérifier la sécurité du compte.</p><button className="securite-action" onClick={()=>void charger()}>Réessayer</button><Link to="/connexion?mode=signin" state={{retour:'/admin/securite'}}>Vérifier ma connexion</Link></div>:<>
   <div className="securite-statut"><Icone nom={verifie?'check':'lock'} taille={18}/><span>{verifie?(niveau==='aal2'?'Session vérifiée':'Application enregistrée'):'À configurer'}</span></div>
   {verifie&&<p role="status">Application d’authentification enregistrée. {niveau==='aal2'?'Cette session a passé la seconde vérification.':'Vérifie le code pour cette session.'}</p>}
   {!verifie&&!activation&&<><p>Ajoute SÉNEVÉ à ton application d’authentification, puis saisis son code à six chiffres.</p><label className="securite-secours"><input type="checkbox" checked={secours} onChange={e=>setSecours(e.target.checked)}/><span>J’ai prévu un moyen de récupérer mon application d’authentification.</span></label><button className="securite-action" disabled={!secours||occupe} onClick={()=>void commencer()}>Préparer mon application d’authentification</button></>}
   {activation&&<section className="securite-activation" aria-label="Activation de l’authentification"><h3>Ajouter SÉNEVÉ à ton application</h3><p>Scanne ce QR code dans ton application d’authentification. Ne le partage pas.</p><div className="securite-qr"><img src={activation.qr} alt="QR code personnel d’activation" width={220} height={220}/></div><details><summary>Afficher la clé de configuration manuelle</summary><code>{activation.secret}</code></details><p className="securite-discret">Ni cette clé ni le code ne sont conservés dans le stockage local de cet écran.</p></section>}
   {(activation||(verifie&&niveau!=='aal2'))&&<form className="securite-code" onSubmit={e=>{e.preventDefault();void valider();}}><label>Code à six chiffres<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label><button className="securite-action" disabled={occupe||!/^\d{6}$/.test(code)}>Vérifier le code</button></form>}
   {activation&&<button className="securite-secondaire" disabled={occupe} onClick={()=>void annuler(activation.id)}>Annuler cette activation</button>}
   {!activation&&facteurs.filter(f=>f.status==='unverified').map(f=><p key={f.id}><button className="securite-secondaire" disabled={occupe} onClick={()=>void annuler(f.id)}>Annuler une activation inachevée</button></p>)}
  </>}{message&&<p className="securite-message" role="status">{message}</p>}</section>
  <aside className="securite-conseils"><h2>Avant de commencer</h2><ul><li><strong>Préserve ton accès</strong><p>Prévois un moyen de retrouver ton application ou conserve sa clé dans un emplacement personnel sécurisé.</p></li><li><strong>Garde tes codes privés</strong><p>Ne partage ni ton QR code, ni ta clé, ni tes codes de vérification.</p></li><li><strong>Autres appareils</strong><p>La vérification du facteur ferme les autres sessions du compte.</p></li></ul><div className="securite-note"><Icone nom="verified_user" taille={20}/><p>L’activation reste volontaire pendant cet essai. La protection obligatoire des actions d’administration viendra après vérification d’un accès de secours.</p></div></aside></div>
 </main>;
}
