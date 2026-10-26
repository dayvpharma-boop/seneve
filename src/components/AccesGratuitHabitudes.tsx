import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {etatDroit,type DroitAcces,type InscriptionAcces,type PeriodeGratuiteHabitudes} from '@/lib/offres-acces';
import {IconeHD} from './IconeHabitudes';

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
 const titre=active?label('Ta période gratuite est en cours.','Your free period is in progress.'):status==='expire'?label('Tes 30 jours gratuits sont terminés.','Your 30 free days have ended.'):status==='ferme'?label('Cet accès gratuit est fermé.','This free access is closed.'):label('Ton accès gratuit doit être vérifié.','Your free access needs verification.');
 const puce=active?label('Actif','Active'):status==='expire'?label('Terminé','Ended'):status==='ferme'?label('Fermé','Closed'):label('À vérifier','To check');
 return <section className="oa-access hd-acces hd-stitch flex flex-col text-hd-on-surface" aria-label={label('Accès gratuit Habitudes & Défis','Free Habits & Challenges access')}>
  <header className="flex flex-col gap-hd-space-xs mb-hd-space-lg">
   <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-hd-secondary"/><p className="font-hd-label-sm text-hd-label-sm text-hd-secondary tracking-widest uppercase">{label('Habitudes & Défis','Habits & Challenges')}</p></div>
   <h2 className="font-hd-headline-md text-hd-headline-md text-hd-on-surface">{titre}</h2>
  </header>
  <div className="bg-hd-surface-container-lowest rounded-xl p-hd-space-md shadow-sm mb-hd-space-lg relative overflow-hidden">
   <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-hd-secondary-container/20 pointer-events-none"/>
   <div className="flex items-start gap-hd-space-sm relative z-10">
    <div className="w-10 h-10 rounded-full bg-hd-surface-container-low flex items-center justify-center shrink-0 text-hd-secondary"><IconeHD nom="spa" className="text-[22px]"/></div>
    <div className="flex flex-col gap-1 min-w-0">
     <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{label('La période gratuite n’ouvre aucun mois payant.','The free period does not open any paid month.')}</p>
     <div className="flex items-center gap-1.5 mt-2 text-hd-secondary"><IconeHD nom="verified_user" className="text-[16px]"/><span className="font-hd-label-sm text-hd-label-sm">{label('Aucun paiement automatique','No automatic payment')}</span></div>
    </div>
   </div>
  </div>
  <div className="bg-hd-surface-container-low rounded-xl px-hd-space-md py-hd-space-sm mb-hd-space-lg flex items-center justify-between gap-2">
   <div className="flex items-center gap-2"><IconeHD nom="payments" className="text-hd-secondary text-[20px]"/><span className="font-hd-label-md text-hd-label-md text-hd-on-surface">{label('Participation mensuelle','Monthly contribution')}</span></div>
   <span className="font-hd-label-sm text-hd-label-sm text-hd-secondary bg-hd-surface-container-highest px-2.5 py-1 rounded-full uppercase tracking-wider">{label('Tarif à venir','Price to come')}</span>
  </div>
  <div className="flex flex-col relative pl-2 mb-hd-space-lg">
   <div className="absolute left-[19px] top-4 bottom-8 w-[2px] bg-hd-outline-variant/40"/>
   <div className="flex items-start gap-hd-space-md pb-hd-space-lg relative">
    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-0.5 ${active?'bg-hd-secondary':'bg-hd-surface-container-lowest'}`}>{active?<IconeHD nom="check" className="text-hd-on-secondary text-[14px]"/>:<div className="w-2.5 h-2.5 rounded-full bg-hd-secondary"/>}</div>
    <div className="oa-card bg-hd-surface-container-lowest rounded-xl p-hd-space-md flex-1 shadow-sm flex flex-col gap-2 min-w-0">
     <div className="oa-status flex items-center justify-between gap-2"><span className="oa-badge font-hd-label-sm text-hd-label-sm text-hd-secondary tracking-wide uppercase">{label('30 jours gratuits','30 days free')}</span><span className="font-hd-label-sm text-hd-label-sm text-hd-secondary bg-hd-secondary-container/40 px-2 py-0.5 rounded-full">{puce}</span></div>
     {dateFin&&<p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant flex items-start gap-1"><IconeHD nom="schedule" className="text-[16px] text-hd-secondary mt-0.5"/><span>{label('Fin de la période gratuite :','Free period ends:')} <time dateTime={periode.fin_exclue}>{dateFin}</time> ({fuseau}). {label('L’accès se termine à cette heure précise.','Access ends at this exact time.')}</span></p>}
     {active&&inscription?.etat==='en_pause'&&<p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{label('Ton parcours est en pause.','Your journey is paused.')}</p>}
     {status==='expire'&&<p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{label('Pour connaître les conditions de la suite du parcours, contacte l’équipe.','Contact the team to learn about the next part of the journey.')}</p>}
     {active&&inscription?.etat==='active'&&inscription.enrollment_id===periode.enrollment_id&&<Link className="oa-primary mt-1 w-full h-12 bg-hd-secondary text-hd-on-secondary rounded-xl font-hd-label-lg text-hd-label-lg flex items-center justify-center gap-2 shadow-sm" to={path(`/espace?parcours=${encodeURIComponent(periode.enrollment_id)}`)}><IconeHD nom="play_arrow" className="text-[20px]"/>{label('Continuer mes habitudes','Continue my habits')}</Link>}
    </div>
   </div>
   {[2,3,4,5,6].map(n=><div key={n} className={`flex items-start gap-hd-space-md relative ${n<6?'pb-hd-space-lg':''}`}>
    <div className="relative z-10 w-6 h-6 rounded-full bg-hd-surface-container flex items-center justify-center shrink-0 mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-hd-outline-variant"/></div>
    <div className="bg-hd-surface-container-low/70 rounded-xl p-hd-space-md flex-1 flex items-center justify-between"><span className="font-hd-label-sm text-hd-label-sm text-hd-tertiary uppercase tracking-wide">{label(`Mois ${n}`,`Month ${n}`)}</span><span className="font-hd-label-sm text-hd-label-sm text-hd-tertiary">{label('Conditions à venir','Terms to come')}</span></div>
   </div>)}
  </div>
  <footer className="flex flex-col items-center gap-hd-space-md pt-hd-space-sm text-center">
   <Link className="oa-secondary w-full min-h-[48px] rounded-xl bg-hd-surface-container-high text-hd-on-surface font-hd-label-lg text-hd-label-lg flex items-center justify-center gap-2" to={path('/journal')}><IconeHD nom="edit_note" className="text-[18px] text-hd-secondary"/>{label('Retrouver mon journal','Open my journal')}</Link>
   <Link className="oa-link font-hd-label-md text-hd-label-md text-hd-secondary underline underline-offset-4" to={path('/aide')}>{label('Contacter l’équipe SÉNEVÉ','Contact the SÉNEVÉ team')}</Link>
  </footer>
 </section>;
}
