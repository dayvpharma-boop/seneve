import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {etatDroit,type DroitAcces,type InscriptionAcces,type PeriodeGratuiteHabitudes} from '@/lib/offres-acces';

/** Affichage seulement : les contrôles serveur restent nécessaires à chaque lecture et déclaration. */
export function AccesGratuitHabitudes({droit,periode,inscription,langue,fuseau}:{droit:DroitAcces;periode:PeriodeGratuiteHabitudes;inscription?:InscriptionAcces;langue:string;fuseau:string}){
 const [now,setNow]=useState(Date.now),en=langue==='en',label=(fr:string,english:string)=>en?english:fr;
 const debut=Date.parse(periode.debut),fin=Date.parse(periode.fin_exclue);
 const coherent=periode.entitlement_id===droit.entitlement_id&&Number.isFinite(debut)&&Number.isFinite(fin)&&fin-debut===720*3600000&&debut===Date.parse(droit.debut)&&droit.fin!==null&&fin===Date.parse(droit.fin);
 let dateFin:string|null=null;
 try{if(coherent)dateFin=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:fuseau,dateStyle:'long',timeStyle:'short'}).format(new Date(fin));}catch{/* Fuseau invalide : ne pas annoncer une heure trompeuse. */}
 const status=coherent&&dateFin?etatDroit(droit,now):'attente',active=status==='actif';
 useEffect(()=>{
  const limites=[debut,fin].filter(t=>Number.isFinite(t)&&t>now);
  const timer=window.setTimeout(()=>setNow(Date.now()),Math.min(60000,...limites.map(t=>Math.max(1,t-now))));
  const actualiser=()=>setNow(Date.now());window.addEventListener('focus',actualiser);document.addEventListener('visibilitychange',actualiser);
  return()=>{window.clearTimeout(timer);window.removeEventListener('focus',actualiser);document.removeEventListener('visibilitychange',actualiser);};
 },[now,debut,fin]);
 const path=(p:string)=>p+(en?(p.includes('?')?'&':'?')+'lang=en':'');
 return <section className="oa-access hd-acces" aria-label={label('Accès gratuit Habitudes & Défis','Free Habits & Challenges access')}>
  <div className="oa-status"><span className="oa-badge">{label('30 jours gratuits','30 days free')}</span><h2>{active?label('Ta période gratuite est en cours.','Your free period is in progress.'):status==='expire'?label('Tes 30 jours gratuits sont terminés.','Your 30 free days have ended.'):status==='ferme'?label('Cet accès gratuit est fermé.','This free access is closed.'):label('Ton accès gratuit doit être vérifié.','Your free access needs verification.')}</h2><p>{label('Habitudes & Défis','Habits & Challenges')}</p></div>
  <div className="oa-card">
   {dateFin&&<p>{label('Fin de la période gratuite :','Free period ends:')} <time dateTime={periode.fin_exclue}>{dateFin}</time> ({fuseau}). {label('L’accès se termine à cette heure précise.','Access ends at this exact time.')}</p>}
   <p>{label('La période gratuite n’ouvre aucun mois payant.','The free period does not open any paid month.')}</p>
   {active&&inscription?.etat==='active'&&inscription.enrollment_id===periode.enrollment_id&&<Link className="oa-primary" to={path(`/espace?parcours=${encodeURIComponent(periode.enrollment_id)}`)}>{label('Continuer mes habitudes','Continue my habits')}</Link>}
   {active&&inscription?.etat==='en_pause'&&<p>{label('Ton parcours est en pause.','Your journey is paused.')}</p>}
   {status==='expire'&&<p>{label('Pour connaître les conditions de la suite du parcours, contacte l’équipe.','Contact the team to learn about the next part of the journey.')}</p>}
   <Link className="oa-secondary" to={path('/journal')}>{label('Retrouver mon journal','Open my journal')}</Link>
   <Link className="oa-link" to={path('/aide')}>{label('Contacter l’équipe SÉNEVÉ','Contact the SÉNEVÉ team')}</Link>
  </div>
 </section>;
}
