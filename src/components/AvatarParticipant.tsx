import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {supabase} from '@/lib/supabase';
import {chargerPhoto,suivrePhoto} from '@/lib/photo-profil';

type PhotoCompte={userId:string|null;prenom:string;photo:Blob|null;adresse:string|null;indisponible:boolean};
const ContextePhoto=createContext<PhotoCompte|null>(null);
export const usePhotoParticipant=()=>useContext(ContextePhoto);

/** Une photo privée partagée par les en-têtes, conservée en mémoire seulement. */
export function PhotosParticipant({children}:{children:ReactNode}){
 const[compte,setCompte]=useState({id:null as string|null,prenom:''});
 const[photo,setPhoto]=useState<{userId:string|null;blob:Blob|null;adresse:string|null;indisponible:boolean}>({userId:null,blob:null,adresse:null,indisponible:false});
 const courant=useRef<string|null>(null);
 useEffect(()=>{
  let actif=true,evenements=0;
  const appliquer=(u:{id:string;user_metadata?:{prenom?:unknown}}|undefined)=>{
   if(!actif)return;
   courant.current=u?.id??null;
   setCompte({id:u?.id??null,prenom:typeof u?.user_metadata?.prenom==='string'?u.user_metadata.prenom:''});
  };
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{evenements++;appliquer(session?.user);});
  const initial=evenements;
  void supabase.auth.getSession().then(r=>{if(evenements===initial)appliquer(r.error?undefined:r.data.session?.user);}).catch(()=>{if(evenements===initial)appliquer(undefined);});
  return()=>{actif=false;courant.current=null;subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  const id=compte.id;let actif=true,version=0,adresse:string|null=null;
  const remplacer=(blob:Blob|null,indisponible=false)=>{
   if(!actif||courant.current!==id)return;
   if(adresse)URL.revokeObjectURL(adresse);
   adresse=blob?URL.createObjectURL(blob):null;
   setPhoto({userId:id,blob,adresse,indisponible});
  };
  remplacer(null);
  const charger=()=>{if(!id||navigator.onLine===false)return;const n=++version;
   void chargerPhoto(id).then(b=>{if(n===version)remplacer(b);}).catch(()=>{if(n===version)remplacer(null,true);});
  };
  const arreter=suivrePhoto((proprietaire,blob)=>{if(proprietaire===id){version++;remplacer(blob);}});
  charger();window.addEventListener('online',charger);
  return()=>{actif=false;version++;arreter();window.removeEventListener('online',charger);if(adresse)URL.revokeObjectURL(adresse);};
 },[compte.id]);
 const aJour=photo.userId===compte.id;
 return <ContextePhoto.Provider value={{userId:compte.id,prenom:compte.prenom,photo:aJour?photo.blob:null,adresse:aJour?photo.adresse:null,indisponible:aJour&&photo.indisponible}}>{children}</ContextePhoto.Provider>;
}

/** Remplace le contenu d'un avatar existant sans modifier son lien ou sa forme. */
export function AvatarParticipant({children}:{children:ReactNode}){
 const photo=usePhotoParticipant();
 const[illisible,setIllisible]=useState<string|null>(null);
 return <span className="photo-participant" aria-hidden="true">{photo?.adresse&&illisible!==photo.adresse?<img src={photo.adresse} alt="" onError={()=>setIllisible(photo.adresse)}/>:children}</span>;
}
