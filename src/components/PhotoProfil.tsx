import {usePhotoParticipant} from './AvatarParticipant';
import {useEffect,useId,useRef,useState} from 'react';
import {chargerPhoto,enregistrerPhoto,preparerPhoto,retirerPhoto,PhotoInvalide} from '@/lib/photo-profil';
import {IconeConfidentialite as I} from './IconeConfidentialite';
import {IconeProfilModerne} from './IconeProfilModerne';

function useAdresse(photo:Blob|null){const[url,setUrl]=useState<string|null>(null);useEffect(()=>{if(!photo){setUrl(null);return;}const u=URL.createObjectURL(photo);setUrl(u);return()=>URL.revokeObjectURL(u);},[photo]);return url;}
export function PhotoProfil({userId,prenom,langue,lectureSeule=false}:{userId:string;prenom:string;langue:'fr'|'en';lectureSeule?:boolean}){
 const partage=usePhotoParticipant();
 const en=langue==='en',id=useId(),input=useRef<HTMLInputElement>(null),ticket=useRef(0),verrou=useRef(false);
 const[photoLocale,setPhoto]=useState<Blob|null>(null),[brouillon,setBrouillon]=useState<Blob|null>(null),[busy,setBusy]=useState(false),[confirmation,setConfirmation]=useState(false),[erreur,setErreur]=useState<''|'format'|'image'|'save'|'remove'>(''),[message,setMessage]=useState<''|'saved'|'removed'>(''),[indisponible,setIndisponible]=useState(false),[menu,setMenu]=useState(false);
 const photo=partage?(partage.userId===userId?partage.photo:null):photoLocale;
 const adresse=useAdresse(photo),apercu=useAdresse(brouillon);
 const erreurs=en?{format:'Choose a valid JPG, PNG or WebP image, no larger than 10 MB.',image:'This image cannot be used. Choose another photo.',save:'Your photo could not be saved. Try again.',remove:'Your photo could not be removed. Try again.'}:{format:'Choisis une image JPG, PNG ou WebP valide de 10 Mo maximum.',image:'Cette image ne peut pas être utilisée. Choisis une autre photo.',save:'Ta photo n’a pas pu être enregistrée. Réessaie.',remove:'Ta photo n’a pas pu être retirée. Réessaie.'};
 useEffect(()=>{const n=++ticket.current;setPhoto(null);setBrouillon(null);setErreur('');setMessage('');setConfirmation(false);setMenu(false);if(!partage&&!lectureSeule)void chargerPhoto(userId).then(p=>{if(n===ticket.current){setPhoto(p);setIndisponible(false);}}).catch(()=>{if(n===ticket.current)setIndisponible(true);});return()=>{ticket.current++;};},[userId,lectureSeule,!!partage]);
 async function choisir(f:File|undefined){if(!f||verrou.current)return;verrou.current=true;setBusy(true);setErreur('');setMessage('');const n=ticket.current;try{const p=await preparerPhoto(f);if(n===ticket.current){setBrouillon(p);setConfirmation(false);}}catch{if(n===ticket.current)setErreur('format');}finally{verrou.current=false;if(n===ticket.current)setBusy(false);}}
 async function sauver(){if(!brouillon||verrou.current||lectureSeule)return;verrou.current=true;setBusy(true);setErreur('');setMessage('');const n=ticket.current;try{await enregistrerPhoto(userId,brouillon);if(n===ticket.current){setPhoto(brouillon);setBrouillon(null);setIndisponible(false);setMessage('saved');}}catch(e){if(n===ticket.current)setErreur(e instanceof PhotoInvalide?'image':'save');}finally{verrou.current=false;if(n===ticket.current)setBusy(false);}}
 async function enlever(){if(verrou.current||lectureSeule)return;verrou.current=true;setBusy(true);setErreur('');setMessage('');const n=ticket.current;try{await retirerPhoto(userId);if(n===ticket.current){setPhoto(null);setConfirmation(false);setMessage('removed');}}catch{if(n===ticket.current)setErreur('remove');}finally{verrou.current=false;if(n===ticket.current)setBusy(false);}}
 // Demande de Dr Justin (06/11/2026) : plus de lien « Retirer ma photo » écrit sous l'image. On touche la photo :
 // sans photo, le choix d'image s'ouvre ; avec une photo, un petit menu propose de la changer ou de la retirer.
 const libelle=busy?(en?'Preparing…':'Préparation…'):(photo?(en?'Change my photo':'Changer ma photo'):(en?'Add my photo':'Ajouter ma photo'));
 const toucherPhoto=()=>{setMessage('');if(photo){setMenu(m=>!m);setConfirmation(false);}else input.current?.click();};
 return <div className="pf-photo">
  <div className="pf-photo-avatar">
   <button className="pf-photo-bouton" type="button" disabled={lectureSeule||busy||!!brouillon} aria-haspopup={photo?'menu':undefined} aria-expanded={photo?menu:undefined} onClick={toucherPhoto} onKeyDown={e=>{if(e.key==='Escape')setMenu(false);}}>
    <span className="pf-avatar" aria-hidden="true">{adresse?<img src={adresse} alt=""/>:(prenom.trim().charAt(0).toUpperCase()||<I nom="person"/>)}</span>
    <span className="pf-photo-pastille" aria-hidden="true"><IconeProfilModerne nom="photo_camera" taille={13}/></span>
    <span className="sr-only">{libelle}</span>
   </button>
  </div>
  <input ref={input} id={id} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label={en?'Choose a profile photo':'Choisir une photo de profil'} disabled={lectureSeule||busy} onChange={e=>{void choisir(e.target.files?.[0]);e.target.value='';}}/>
  {menu&&photo&&!brouillon&&!confirmation&&<div className="pf-photo-menu" role="menu" aria-label={en?'My photo':'Ma photo'} onKeyDown={e=>{if(e.key==='Escape')setMenu(false);}}>
   <button type="button" role="menuitem" onClick={()=>{setMenu(false);input.current?.click();}}>{en?'Change photo':'Changer la photo'}</button>
   <button type="button" role="menuitem" className="pf-photo-menu-retirer" onClick={()=>{setMenu(false);setConfirmation(true);}}>{en?'Remove photo':'Retirer la photo'}</button>
   <button type="button" role="menuitem" className="pf-photo-menu-annuler" onClick={()=>setMenu(false)}>{en?'Cancel':'Annuler'}</button>
  </div>}
  {apercu&&<section className="pf-photo-preview" aria-label={en?'Photo preview':'Aperçu de la photo'}><p>{en?'Your new profile photo':'Ta nouvelle photo de profil'}</p><img src={apercu} alt={en?'New profile photo preview':'Aperçu de la nouvelle photo'}/><p>{en?'This photo will be saved in your private SÉNEVÉ account.':'Cette photo sera enregistrée dans ton compte SÉNEVÉ privé.'}</p><button className="btn" type="button" disabled={busy||lectureSeule} onClick={()=>void sauver()}>{busy?(en?'Saving…':'Enregistrement…'):(en?'Save my photo':'Enregistrer ma photo')}</button><button className="link" type="button" disabled={busy} onClick={()=>input.current?.click()}>{en?'Choose another photo':'Choisir une autre photo'}</button><button className="link" type="button" disabled={busy} onClick={()=>{setBrouillon(null);setErreur('');}}>{en?'Cancel':'Annuler'}</button></section>}
  {confirmation&&<section className="pf-photo-menu pf-photo-confirm" aria-label={en?'Remove photo confirmation':'Confirmation du retrait de la photo'}><p>{en?'Remove your profile photo? Your initial will appear again.':'Retirer ta photo de profil ? Ton initiale apparaîtra à nouveau.'}</p><button className="pf-photo-menu-retirer" type="button" disabled={busy||lectureSeule} onClick={()=>void enlever()}>{en?'Confirm removal':'Confirmer le retrait'}</button><button className="pf-photo-menu-annuler" type="button" disabled={busy} onClick={()=>setConfirmation(false)}>{en?'Cancel':'Annuler'}</button></section>}
  {lectureSeule&&<p className="pf-photo-note">{en?'Reconnect to view or change your photo.':'Reconnecte-toi pour voir ou modifier ta photo.'}</p>}
  {(indisponible||partage?.indisponible)&&!photo&&<p className="pf-photo-note">{en?'Your saved photo is unavailable for now.':'Ta photo enregistrée est indisponible pour le moment.'}</p>}
  {message&&<p role="status" className="pf-photo-status">{message==='saved'?(en?'Profile photo saved':'Photo de profil enregistrée'):(en?'Profile photo removed':'Photo de profil retirée')}</p>}{erreur&&<p role="alert" className="error">{erreurs[erreur]}</p>}
 </div>;
}
