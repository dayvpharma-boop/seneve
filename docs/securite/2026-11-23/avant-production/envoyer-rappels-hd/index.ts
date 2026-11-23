import {createClient} from 'npm:@supabase/supabase-js@2.58.0';
import webpush from 'npm:web-push@3.6.7';
import {finJourneeLocale,traiterRappelsHD} from './dispatch.ts';

const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{db:{schema:'seneve'},auth:{persistSession:false}});
// verify_jwt est conservé, et la clé d'appel interne est également exigée.
// Urgence haute : un téléphone en veille (Android) reçoit le rappel tout de suite au lieu de l'attendre.
// 30 minutes de validité au plus, jamais au-delà de minuit chez le participant (30/10/2026) : la relance suivante prend le relais (même étiquette).
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response('Méthode non permise',{status:405});
 try{
  const {data:k,error}=await db.from('push_config').select('cle_appel,vapid_public,vapid_private').eq('id',1).single();
  if(error||!k?.cle_appel)return Response.json({erreur:'Configuration indisponible'},{status:503});
  if(req.headers.get('x-seneve-cle')!==k.cle_appel)return new Response('Non autorisé',{status:401});
  const etat=await db.rpc('hd_push_dispatch_enabled');if(etat.error)throw Error('Configuration indisponible');
  if(etat.data!==true)return Response.json({actif:false,acceptees:0});
  if(!k.vapid_public||!k.vapid_private)return Response.json({erreur:'Notifications non configurées'},{status:503});
  webpush.setVapidDetails('mailto:contact@drjustintshims.com',k.vapid_public,k.vapid_private);
  // Fin de la journée locale du rappel (30/10/2026) : le rappel n'est plus valable après minuit chez le participant.
  const finDeJournee=async(id:string)=>{
   const r=await db.from('hd_activity_reminders').select('creneau,enrollment_id').eq('reminder_id',id).single();if(r.error||!r.data)return null;
   const e=await db.from('enrollments').select('participant_id').eq('enrollment_id',r.data.enrollment_id).single();if(e.error||!e.data)return null;
   const p=await db.from('participants').select('fuseau,preferences').eq('participant_id',e.data.participant_id).single();if(p.error||!p.data)return null;
   const fuseau=(p.data.preferences as {rappels?:{fuseau?:string}}|null)?.rappels?.fuseau??p.data.fuseau;
   if(typeof fuseau!=='string'||!fuseau)return null;
   try{return finJourneeLocale(r.data.creneau as string,fuseau);}catch{return null;}
  };
  const compte=await traiterRappelsHD((nom,params)=>db.rpc(nom,params),async(a,message,ttl)=>{await webpush.sendNotification({endpoint:a.endpoint,keys:{p256dh:a.p256dh,auth:a.auth}},message,{TTL:ttl,urgency:'high',timeout:10000});},resultat=>{console.info(JSON.stringify({type:'hd_push_appareil',...resultat}));},finDeJournee);
  return Response.json(compte);
 }catch{return Response.json({erreur:'Traitement indisponible. Les réservations sont conservées.'},{status:500});}
});

