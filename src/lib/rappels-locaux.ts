import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import type {PlanLocal} from './rappels-locaux-planning';
import {estIdRappelLocal,MAX_RAPPELS_LOCAUX} from './rappels-locaux-planning';

const CLE='seneve:rappels-locaux:v1';
export const CLE_ERREUR_ARRET_LOCAL='seneve:rappels-locaux:arret-non-confirme';
type Memoire={owner:string;enrollmentId:string;jusqua:number};
let revision=0;
let file:Promise<unknown>=Promise.resolve();
function exclusif<T>(action:()=>Promise<T>):Promise<T>{
  const suite=file.then(action,action);
  file=suite.catch(()=>{});
  return suite;
}
export const rappelsLocauxDisponibles=()=>import.meta.env.VITE_SENEVE_MOBILE==='1'
  &&Capacitor.isNativePlatform()&&Capacitor.isPluginAvailable('LocalNotifications');
export class ReglageAlarmesRequis extends Error {}
export class AutorisationRappelsRefusee extends Error {}

function memoire():Memoire|null{
  try{
    const v=JSON.parse(localStorage.getItem(CLE)??'null');
    return v&&typeof v.owner==='string'&&typeof v.enrollmentId==='string'&&Number.isFinite(v.jusqua)?v:null;
  }catch{return null;}
}
async function annulerSansVerrou(){
  const p=await LocalNotifications.getPending();
  const notifications=p.notifications.filter(n=>estIdRappelLocal(n.id)).map(n=>({id:n.id}));
  if(notifications.length)await LocalNotifications.cancel({notifications});
  if((await LocalNotifications.getPending()).notifications.some(n=>estIdRappelLocal(n.id)))
    throw Error('Arrêt non confirmé par le téléphone');
  localStorage.removeItem(CLE);
  localStorage.removeItem(CLE_ERREUR_ARRET_LOCAL);
}
export function arreterRappelsLocaux(){
  revision++; // Invalide immédiatement une activation encore en attente d'autorisation.
  if(!rappelsLocauxDisponibles())return Promise.resolve();
  return exclusif(annulerSansVerrou);
}
export async function etatRappelsLocaux(){
  if(!rappelsLocauxDisponibles())return {nombre:0,jusqua:null,autorise:false,exact:false};
  const [p,permission,exact]=await Promise.all([
    LocalNotifications.getPending(),LocalNotifications.checkPermissions(),
    Capacitor.getPlatform()==='android'?LocalNotifications.checkExactNotificationSetting():Promise.resolve({exact_alarm:'granted'}),
  ]);
  const nombre=p.notifications.filter(n=>estIdRappelLocal(n.id)).length;
  return {nombre,jusqua:nombre?memoire()?.jusqua??null:null,autorise:permission.display==='granted',exact:exact.exact_alarm==='granted'};
}
export async function ouvrirReglageAlarmes(){
  if(!rappelsLocauxDisponibles()||Capacitor.getPlatform()!=='android')return;
  await LocalNotifications.changeExactNotificationSetting();
}

/** Demande une permission uniquement après l'appui explicite sur le bouton d'activation. */
export function programmerRappelsLocaux(
  plan:PlanLocal, owner:string, enrollmentId:string,
  encoreValide:()=>boolean=()=>true,
){
  const attendu=revision;
  return exclusif(async()=>{
    if(!rappelsLocauxDisponibles())throw Error('Application mobile requise');
    const valide=()=>attendu===revision&&encoreValide();
    if(!valide()||!owner||!enrollmentId||!plan.rappels.length||plan.rappels.length>MAX_RAPPELS_LOCAUX
      ||!Number.isFinite(plan.fin)||plan.fin<=Date.now()
      ||new Set(plan.rappels.map(r=>r.id)).size!==plan.rappels.length
      ||plan.rappels.some(r=>!estIdRappelLocal(r.id)||!Number.isFinite(r.instant)||r.instant<=Date.now()||r.instant>=plan.fin))
      throw Error('Planning à actualiser');
    const ancien=memoire();
    // Les métadonnées doivent pouvoir être conservées pour l'arrêt au changement de compte.
    const preuve=localStorage.getItem(CLE);localStorage.setItem(CLE,preuve??'null');
    let permission=await LocalNotifications.checkPermissions();
    if(permission.display!=='granted')permission=await LocalNotifications.requestPermissions();
    if(permission.display!=='granted')throw new AutorisationRappelsRefusee();
    if(!valide())throw Error('Activation annulée');
    if(Capacitor.getPlatform()==='android'){
      const exact=await LocalNotifications.checkExactNotificationSetting();
      if(exact.exact_alarm!=='granted')throw new ReglageAlarmesRequis();
      await LocalNotifications.createChannel({id:'seneve-rendez-vous',name:'Rendez-vous SÉNEVÉ',description:'Rappels des horaires choisis',importance:4,visibility:0,vibration:true});
    }
    if(!valide())throw Error('Activation annulée');
    const autres=(await LocalNotifications.getPending()).notifications.filter(n=>!estIdRappelLocal(n.id));
    if(autres.length+plan.rappels.length>64)throw Error('Le téléphone contient trop de rappels. Réduis la sélection.');
    if(!valide()||plan.rappels.some(r=>r.instant<=Date.now())||plan.fin<=Date.now())throw Error('Planning à actualiser');
    // Pas de cumul : la nouvelle programmation remplace les anciens rappels HD de cet appareil.
    await annulerSansVerrou();
    try{
      if(!valide()||plan.rappels.some(r=>r.instant<=Date.now()))throw Error('Activation annulée');
      await LocalNotifications.schedule({notifications:plan.rappels.map(r=>({
        id:r.id,title:r.titre,body:plan.langue==='en'?'Find your appointment in SÉNEVÉ.':'Retrouve ton rendez-vous dans SÉNEVÉ.',
        schedule:{at:new Date(r.instant),allowWhileIdle:true},
        channelId:'seneve-rendez-vous',isExactNotification:true,isExactMandatory:true,
      }))});
      const p=await LocalNotifications.getPending();
      if(!valide()||plan.rappels.some(r=>!p.notifications.some(n=>n.id===r.id)))
        throw Error('Programmation non confirmée par le téléphone');
      localStorage.setItem(CLE,JSON.stringify({owner,enrollmentId,jusqua:Math.max(...plan.rappels.map(r=>r.instant))} satisfies Memoire));
      return {nombre:plan.rappels.length,jusqua:Math.max(...plan.rappels.map(r=>r.instant))};
    }catch(error){
      // Un échec n'est jamais présenté comme une activation réussie.
      try{await annulerSansVerrou();}catch{
        if(ancien)localStorage.setItem(CLE,JSON.stringify(ancien));
        throw Error('Vérifie les rappels dans les réglages du téléphone : l’arrêt n’a pas pu être confirmé.');
      }
      throw error;
    }
  });
}

/** L'observateur d'authentification appelle cette fonction sans bloquer son callback. */
export function changementCompteRappelsLocaux(owner:string|null){
  const m=memoire();
  if(!owner||!m||m.owner!==owner)return arreterRappelsLocaux();
  return Promise.resolve();
}

