import {supabase} from './supabase';

export const PHOTOS_PROFIL='photos-profil';
export const PHOTO_MAX_SOURCE=10*1024*1024;
export const PHOTO_MAX_ENVOI=256*1024;
export class PhotoInvalide extends Error {}
const chemin=(id:string)=>`${id}/avatar.jpg`;
async function verifier(id:string){
  if(navigator.onLine===false)throw Error('Hors connexion');
  const r=await supabase.auth.getSession();
  if(r.error||r.data.session?.user.id!==id)throw Error('Session expirée');
}
export async function chargerPhoto(id:string):Promise<Blob|null>{
  await verifier(id);
  const r=await supabase.storage.from(PHOTOS_PROFIL).download(chemin(id));
  if(r.error){if(String((r.error as {statusCode?:string}).statusCode)==='404')return null;throw r.error;}
  await verifier(id);
  return r.data;
}
export async function enregistrerPhoto(id:string,photo:Blob){
  if(photo.type!=='image/jpeg'||photo.size===0||photo.size>PHOTO_MAX_ENVOI)throw new PhotoInvalide();
  await verifier(id);
  const r=await supabase.storage.from(PHOTOS_PROFIL).upload(chemin(id),photo,{contentType:'image/jpeg',upsert:true,cacheControl:'0'});
  if(r.error)throw r.error;
  await verifier(id);
}
export async function retirerPhoto(id:string){
  await verifier(id);
  const r=await supabase.storage.from(PHOTOS_PROFIL).remove([chemin(id)]);
  if(r.error)throw r.error;
  await verifier(id);
}
/** Recadre au centre et réduit avant l’envoi. Le JPEG produit ne reprend pas les métadonnées du fichier. */
export async function preparerPhoto(fichier:File):Promise<Blob>{
  if(!['image/jpeg','image/png','image/webp'].includes(fichier.type)||fichier.size===0||fichier.size>PHOTO_MAX_SOURCE)throw new PhotoInvalide();
  const url=URL.createObjectURL(fichier);
  try{
    const image=new Image();image.decoding='async';image.src=url;
    await image.decode();
    if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>40_000_000)throw new PhotoInvalide();
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
    const ctx=canvas.getContext('2d');if(!ctx)throw new PhotoInvalide();
    ctx.fillStyle='#fff9ea';ctx.fillRect(0,0,512,512);
    const cote=Math.min(image.naturalWidth,image.naturalHeight);
    ctx.drawImage(image,(image.naturalWidth-cote)/2,(image.naturalHeight-cote)/2,cote,cote,0,0,512,512);
    const photo=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));
    if(!photo||photo.size>PHOTO_MAX_ENVOI)throw new PhotoInvalide();return photo;
  }catch(e){if(e instanceof PhotoInvalide)throw e;throw new PhotoInvalide();}
  finally{URL.revokeObjectURL(url);}
}
