// TEST seulement. Exécuter après le SQL de préparation, puis toujours le nettoyage.
// Ne journalise ni mot de passe, ni jeton, ni données de session.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const c=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert.equal(c.url,'https://rlojnuaajeubzlwofwhn.supabase.co');
const controles=[];
async function requete(path,body,token,method='POST'){
 const r=await fetch(c.url+path,{method,headers:{apikey:c.apiKey,'Content-Type':'application/json',...(path.startsWith('/rest/')?{'Content-Profile':'seneve','Accept-Profile':'seneve'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const s=await r.text();return {status:r.status,data:s?JSON.parse(s):null};
}
const rpc=(nom,args,token)=>requete('/rest/v1/rpc/'+nom,args,token);
const sessions=[];
try{
 const anon=await rpc('hd_free_catalogue',{p_langue:'fr'});assert.equal(anon.status,401);controles.push('catalogue_anonyme_refuse');
 for(const uid of [c.ua,c.ub]){
  const r=await requete('/auth/v1/token?grant_type=password',{email:uid+'@recette.invalid',password:c.password});
  assert.equal(r.status,200,'Connexion fictive refusée');assert.equal(r.data.user.id,uid);assert.ok(r.data.access_token);sessions.push(r.data.access_token);
 }
 controles.push('deux_connexions_auth_reelles');
 const [a,b]=sessions;
 const cat=await rpc('hd_free_catalogue',{p_langue:'fr'},a);assert.equal(cat.status,200);assert.equal(cat.data.compte_id,c.ua);
 const offre=cat.data.offres.find(o=>o.programme_id===c.programme);assert.ok(offre);assert.equal(offre.planning.length,15);controles.push('catalogue_postgrest_complet');
 const horaires=offre.planning.map(({habit_key,creneaux})=>({habit_key,creneaux}));
 const culte=horaires.find(h=>h.habit_key==='culte_semaine');assert.ok(culte);culte.creneaux=[{creneau_id:'premier',heure_locale:'17:45',jours_iso:[2]},{creneau_id:'second',heure_locale:'18:15',jours_iso:[6]}];
 const demande={p_programme_id:c.programme,p_version:1,p_langue:'fr',p_offre_id:offre.offre_id,p_horaires:horaires,p_confirmation:true};
 const refus=await rpc('hd_start_free',{...demande,p_confirmation:false},a);assert.equal(refus.status,403);controles.push('confirmation_explicite_requise');
 const reponses=await Promise.all([rpc('hd_start_free',demande,a),rpc('hd_start_free',demande,a)]);
 reponses.forEach(r=>assert.equal(r.status,200));assert.equal(reponses.filter(r=>r.data.cree).length,1);assert.equal(reponses[0].data.enrollment_id,reponses[1].data.enrollment_id);assert.equal(reponses[0].data.fin_exclue,reponses[1].data.fin_exclue);
 const droit=reponses.find(r=>r.data.cree).data;assert.equal(Date.parse(droit.fin_exclue)-Date.parse(droit.debut),720*3600000);controles.push('deux_requetes_http_un_seul_acces_720h');
 const reg=await rpc('hd_schedule_settings',{p_enrollment_id:droit.enrollment_id},a);assert.equal(reg.status,200);assert.equal(reg.data.horaires.length,16);assert.ok(reg.data.horaires.some(h=>h.habit_key==='culte_semaine'&&h.heure_locale.startsWith('17:45')&&h.jours_iso[0]===2));controles.push('horaires_personnalises_relus');
 const autre=await rpc('hd_schedule_settings',{p_enrollment_id:droit.enrollment_id},b);assert.equal(autre.status,403);controles.push('horaire_autre_compte_refuse');
 const utilise=await rpc('hd_free_catalogue',{p_langue:'fr'},a);assert.equal(utilise.status,200);assert.equal(utilise.data.motif,'gratuite_deja_utilisee');assert.equal(utilise.data.offres.length,0);
 const intact=await rpc('hd_free_catalogue',{p_langue:'fr'},b);assert.equal(intact.status,200);assert.ok(intact.data.offres.some(o=>o.programme_id===c.programme));controles.push('gratuit_utilise_isole_au_compte');
 const reprise=await rpc('hd_start_free',demande,a);assert.equal(reprise.status,200);assert.equal(reprise.data.cree,false);assert.equal(reprise.data.horaires_appliques,false);assert.equal(reprise.data.enrollment_id,droit.enrollment_id);assert.equal(reprise.data.fin_exclue,droit.fin_exclue);controles.push('reprise_sans_prolongation');
 console.log(JSON.stringify({succes:true,controles}));
}catch(e){console.log(JSON.stringify({succes:false,controles,erreur:e.name,message:e instanceof assert.AssertionError?e.message:'Requête non aboutie'}));process.exitCode=1;}
finally{
 for(const token of sessions){try{await requete('/auth/v1/logout',undefined,token);}catch{/* Nettoyage SQL des comptes et sessions requis même si déconnexion échoue. */}}
}
