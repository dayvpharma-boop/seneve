import {messageRappel} from './messages.ts';
type Rpc=(nom:string,params?:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>;
export type AppareilPush={endpoint:string;p256dh:string;auth:string};
export type ResultatAppareil={request_id:string;fournisseur:'google'|'apple'|'mozilla';resultat:'accepte_fournisseur'|'echec';statut_http:number|null};
/** Ne transmettre ni l'endpoint, ni les clés, ni le texte du rappel aux traces. */
export function statutHttpPush(erreur:unknown):number|null{
 if(!erreur||typeof erreur!=='object')return null;
 const code=(erreur as {statusCode?:unknown}).statusCode;
 return typeof code==='number'&&Number.isInteger(code)&&code>=100&&code<=599?code:null;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Aucun endpoint arbitraire ou réseau interne ne doit être contacté. */
export function appareilPushValide(x:unknown):x is AppareilPush{
 if(!x||typeof x!=='object')return false;const a=x as AppareilPush;
 if(typeof a.endpoint!=='string'||typeof a.p256dh!=='string'||typeof a.auth!=='string'||!a.p256dh||!a.auth)return false;
 try{const u=new URL(a.endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname);}catch{return false;}
}
/** Fin de la journée locale d'un créneau (minuit suivant, dans le fuseau du participant), en millisecondes.
 *  Demande de Dr Justin du 30/10/2026 : à minuit, les rappels de la veille s'arrêtent, la nouvelle journée a les siens. */
export function finJourneeLocale(creneau:string|Date,fuseau:string):number{
 const t=new Date(creneau).getTime();
 const parts=(ms:number)=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:fuseau,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 const decalage=(ms:number)=>{const p=parts(ms);return Date.UTC(+p.year!,+p.month!-1,+p.day!,+p.hour!,+p.minute!,+p.second!)-Math.floor(ms/1000)*1000;};
 const p=parts(t);
 const minuitUtc=Date.UTC(+p.year!,+p.month!-1,+p.day!+1,0,0,0);
 let fin=minuitUtc-decalage(minuitUtc);fin=minuitUtc-decalage(fin);
 return fin;
}
/** Durée de validité du rappel chez le fournisseur : 30 minutes au plus, jamais au-delà de minuit local. */
export function dureeValidite(fin:number|null,maintenant=Date.now()):number{
 if(fin===null)return 1800;
 return Math.max(0,Math.min(1800,Math.floor((fin-maintenant)/1000)));
}
/** Le transport est injecté : les tests ne contactent jamais un téléphone. Aucun rejeu fournisseur.
 *  `finDeJournee` (facultatif) donne la fin de la journée locale du rappel ; inconnue, la validité reste de 30 minutes. */
export async function traiterRappelsHD(rpc:Rpc,envoyer:(a:AppareilPush,message:string,ttl:number)=>Promise<void>,observer?:(resultat:ResultatAppareil)=>void,finDeJournee?:(reminder_id:string)=>Promise<number|null>,maintenant:()=>number=Date.now){
 const compte={acceptees:0,echecs:0,bloquees:0,incertaines:0};
 const enabled=await rpc('hd_push_dispatch_enabled');if(enabled.error)throw Error('Configuration indisponible');if(enabled.data!==true)return compte;
 const planning=await rpc('hd_prepare_push_pilot');if(planning.error)throw Error('Planification indisponible');
 if(!planning.data||typeof planning.data!=='object'||(planning.data as {prepare?:boolean}).prepare!==true)return compte;
 const claim=await rpc('hd_claim_push_deliveries',{p_limite:10});if(claim.error||!Array.isArray(claim.data))throw Error('Réservation indisponible');
 for(const item of claim.data){
  if(!item||typeof item!=='object')continue;
  const {reminder_id,request_id}=item as Record<string,unknown>;
  if(typeof reminder_id!=='string'||typeof request_id!=='string'||!UUID.test(reminder_id)||!UUID.test(request_id))continue;
  const params={p_reminder_id:reminder_id,p_request_id:request_id};let accepte=false;
  try{
   const a=await rpc('hd_authorize_push_delivery',params);if(a.error)throw Error('Autorisation inconnue');
   const livraison=a.data as {autorise?:boolean;langue?:string;habit_key?:string;activity_id?:string;relance?:boolean;appareils?:unknown[]}|null;
   if(livraison?.autorise!==true){compte.bloquees++;continue;}
   if(!Array.isArray(livraison.appareils))throw Error('Appareils invalides');
   let finJour:number|null=null;
   try{finJour=finDeJournee?await finDeJournee(reminder_id):null;}catch{finJour=null;}
   const ttl=dureeValidite(finJour,maintenant());
   // Moins d'une minute avant minuit : ce rappel appartient à une journée qui se termine, il n'est pas envoyé.
   if(finJour!==null&&ttl<60){compte.bloquees++;try{await rpc('hd_finish_push_delivery',{...params,p_accepte:false});}catch{/* réservation conservée */}continue;}
   const en=livraison.langue==='en';
   const message=JSON.stringify({...messageRappel(livraison.habit_key,livraison.langue,livraison.relance),url:`/seneve/habitudes/aujourdhui?lang=${en?'en':'fr'}${typeof livraison.activity_id==='string'&&UUID.test(livraison.activity_id)?'#hd-activite-'+livraison.activity_id:''}`,tag:`seneve-hd-${typeof livraison.activity_id==='string'&&UUID.test(livraison.activity_id)?livraison.activity_id:reminder_id}`,...(finJour!==null?{fin:finJour}:{})});
   const vus=new Set<string>();
   for(const appareil of livraison.appareils){
    if(!appareilPushValide(appareil)||vus.has(appareil.endpoint))continue;vus.add(appareil.endpoint);
    const control=await rpc('hd_push_delivery_allowed',params);if(control.error)throw Error('Contrôle final inconnu');if(control.data!==true)break;
    let resultat:ResultatAppareil['resultat']='echec';let statut_http:number|null=null;
    try{await envoyer(appareil,message,ttl);accepte=true;resultat='accepte_fournisseur';}catch(erreur){statut_http=statutHttpPush(erreur);}
    const fournisseur=new URL(appareil.endpoint).hostname==='fcm.googleapis.com'?'google':new URL(appareil.endpoint).hostname==='web.push.apple.com'?'apple':'mozilla';
    // Une panne du journal ne doit jamais modifier le résultat ni rejouer l'envoi.
    try{observer?.({request_id,fournisseur,resultat,statut_http});}catch{/* Traces indisponibles. */}
   }
   const fin=await rpc('hd_finish_push_delivery',{...params,p_accepte:accepte});
   if(fin.error||fin.data!==true)compte.incertaines++;else if(accepte)compte.acceptees++;else compte.echecs++;
  }catch{
   // Une réponse incertaine ne doit jamais provoquer un deuxième envoi.
   compte.incertaines++;
   try{await rpc('hd_finish_push_delivery',{...params,p_accepte:accepte});}catch{/* La réservation reste conservée. */}
  }
 }
 return compte;
}

