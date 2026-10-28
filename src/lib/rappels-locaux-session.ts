import {supabase} from './supabase';
import {LocalNotifications} from '@capacitor/local-notifications';
import {arreterRappelsLocaux,changementCompteRappelsLocaux,rappelsLocauxDisponibles,CLE_ERREUR_ARRET_LOCAL} from './rappels-locaux';
import {estIdRappelLocal} from './rappels-locaux-planning';

export function initialiserRappelsLocaux(){
 if(!rappelsLocauxDisponibles())return;
 let precedent:string|null|undefined;
 const signaler=()=>{try{localStorage.setItem(CLE_ERREUR_ARRET_LOCAL,'1');}catch{/* le message reste affiché si possible */}window.dispatchEvent(new Event('seneve:rappels-locaux-erreur'));};
 supabase.auth.onAuthStateChange((event,session)=>{
  const owner=session?.user.id??null;
  const initial=precedent===undefined,change=!initial&&owner!==precedent;
  precedent=owner;
  // Aucun appel Supabase asynchrone dans le callback d'authentification.
  if(initial)void changementCompteRappelsLocaux(owner).catch(signaler);
  else if(change||event==='SIGNED_OUT')void arreterRappelsLocaux().catch(signaler);
 });
 void LocalNotifications.addListener('localNotificationActionPerformed',action=>{
  if(estIdRappelLocal(action.notification.id))
   window.location.assign(import.meta.env.BASE_URL+'habitudes/aujourdhui');
 }).catch(()=>console.warn('L’ouverture depuis une alerte n’a pas pu être initialisée.'));
}

