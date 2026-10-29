import {createClient} from 'npm:@supabase/supabase-js@2.58.0';
import webpush from 'npm:web-push@3.6.7';
import {traiterRappelsHD} from './dispatch.ts';

const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{db:{schema:'seneve'},auth:{persistSession:false}});
// verify_jwt est conservé, et la clé d'appel interne est également exigée.
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
  const compte=await traiterRappelsHD((nom,params)=>db.rpc(nom,params),async(a,message)=>{await webpush.sendNotification({endpoint:a.endpoint,keys:{p256dh:a.p256dh,auth:a.auth}},message,{TTL:60,urgency:'normal',timeout:10000});},resultat=>{console.info(JSON.stringify({type:'hd_push_appareil',...resultat}));});
  return Response.json(compte);
 }catch{return Response.json({erreur:'Traitement indisponible. Les réservations sont conservées.'},{status:500});}
});

