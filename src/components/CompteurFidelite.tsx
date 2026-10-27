import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {annulerFidelite,declarerFidelite,lireFidelite,masquerFidelite,type EtatFidelite} from '@/lib/habitudes-fidelite';
import {IconeHD} from './IconeHabitudes';

/** Carte « Mes jours de fidélité » de la maquette Stitch Engagements (cahier Design, Composants).
 * Masquée par défaut (décision du 27/10/2026) ; aucun chiffre dans la page tant qu'elle est masquée.
 * Pas de rouge ni de mot « échec » ; déclaration en deux étapes, protégée contre le double appui, annulable.
 */
export function CompteurFidelite({enrollmentId,langue}:{enrollmentId:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [etat,setEtat]=useState<EtatFidelite|null>(null),[erreur,setErreur]=useState(false);
 const [confirmer,setConfirmer]=useState(false),[enCours,setEnCours]=useState(false),[reprise,setReprise]=useState(false);
 const evenement=useRef<string|null>(null),sequence=useRef(0),occupe=useRef(false);
 useEffect(()=>{const n=++sequence.current;setEtat(null);setErreur(false);
  void lireFidelite(enrollmentId).then(e=>{if(n===sequence.current)setEtat(e);}).catch(()=>{if(n===sequence.current)setErreur(true);});
  return()=>{sequence.current++;};
 },[enrollmentId]);
 async function agir(action:()=>Promise<EtatFidelite>,apres?:()=>void){
  // Verrou immédiat : deux appuis rapprochés n'envoient qu'une demande.
  if(occupe.current)return;occupe.current=true;setEnCours(true);setErreur(false);
  try{setEtat(await action());apres?.();}catch{setErreur(true);}finally{occupe.current=false;setEnCours(false);}
 }
 const ouvrir=()=>{evenement.current??=crypto.randomUUID();setConfirmer(true);};
 const declarer=()=>agir(()=>declarerFidelite(enrollmentId,evenement.current!),()=>{evenement.current=null;setConfirmer(false);setReprise(true);});
 const annuler=()=>agir(()=>annulerFidelite(enrollmentId),()=>setReprise(false));
 const message=erreur&&<p role="alert" className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant text-center">{l('Le compteur n’est pas disponible pour le moment. Réessaie un peu plus tard.','The counter is not available right now. Please try again a little later.')}</p>;
 if(!etat)return <section aria-busy={!erreur} className="hd-fidelite bg-hd-surface-container-low rounded-xl p-hd-space-md shadow-sm flex flex-col gap-4">
  <h2 className="font-hd-label-lg text-hd-label-lg text-hd-on-surface flex items-center gap-2"><IconeHD nom="lock" className="text-hd-secondary text-[18px]"/>{l('Mes jours de fidélité','My days of faithfulness')}</h2>
  {message||<p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant text-center">{l('Chargement…','Loading…')}</p>}
 </section>;
 return <section aria-labelledby="hd-fidelite-titre" className="hd-fidelite bg-hd-surface-container-low rounded-xl p-hd-space-md shadow-sm relative overflow-hidden flex flex-col gap-4">
  <div className="flex items-center justify-between">
   <h2 id="hd-fidelite-titre" className="font-hd-label-lg text-hd-label-lg text-hd-on-surface flex items-center gap-2"><IconeHD nom="lock" className="text-hd-secondary text-[18px]"/>{l('Mes jours de fidélité','My days of faithfulness')}</h2>
   <button type="button" disabled={enCours} aria-pressed={!etat.masque} onClick={()=>agir(()=>masquerFidelite(enrollmentId,!etat.masque))} className="min-h-[44px] px-2 flex items-center gap-1 text-hd-on-surface-variant hover:text-hd-on-surface transition-colors">
    <IconeHD nom={etat.masque?'visibility':'visibility_off'} className="text-[18px]"/><span className="font-hd-label-sm text-hd-label-sm">{etat.masque?l('Afficher','Show'):l('Masquer','Hide')}</span>
   </button>
  </div>
  <div className="flex flex-col items-center justify-center py-2 text-center">
   {etat.masque?<div aria-label={l('Compteur masqué','Counter hidden')} className="flex items-center justify-center h-11 text-hd-secondary tracking-widest text-[28px] font-hd-headline-md">••••</div>
    :<p className="flex items-baseline gap-2"><span className="font-hd-headline-lg text-[44px] leading-none text-hd-secondary select-none">{etat.jours}</span><span className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant lowercase">{etat.jours>1?l('jours','days'):l('jour','day')}</span></p>}
   <p className="font-hd-label-sm text-[11px] text-hd-on-surface-variant mt-2 flex items-center gap-1"><IconeHD nom="verified_user" className="text-[13px] text-hd-secondary"/>{l('Visible par toi seul','Visible only to you')}</p>
  </div>
  {message}
  {reprise?<div role="status" className="bg-hd-surface-container rounded-xl p-hd-space-md flex flex-col gap-2">
   <p className="font-hd-label-lg text-hd-label-lg text-hd-on-surface flex items-center gap-2"><IconeHD nom="restart_alt" className="text-hd-secondary text-[18px]"/>{l('Tu peux reprendre ton engagement','You can renew your commitment')}</p>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Ta progression est conservée : ton jour de parcours, tes activités, tes achats et tes droits n’ont pas changé. Tu peux prier avec tes mots.','Your progress is saved: your journey day, activities, purchases and access have not changed. You can pray in your own words.')}</p>
   <Link to={`/aide${en?'?lang=en':''}`} className="self-start min-h-[44px] inline-flex items-center gap-1 font-hd-label-md text-hd-label-md text-hd-secondary underline underline-offset-4"><IconeHD nom="hearing" className="text-[16px]"/>{l('Parler à quelqu’un','Talk to someone')}</Link>
  </div>:!confirmer&&<div className="pt-2 flex justify-center">
   <button type="button" onClick={ouvrir} className="min-h-[48px] px-4 inline-flex items-center gap-1.5 text-hd-on-surface-variant hover:text-hd-secondary transition-colors">
    <span className="font-hd-label-md text-hd-label-md underline underline-offset-4 decoration-hd-outline-variant">{l('Faire une déclaration','Make a declaration')}</span><IconeHD nom="chevron_right" className="text-[16px]"/>
   </button>
  </div>}
  {confirmer&&<div role="dialog" aria-modal="false" aria-labelledby="hd-fidelite-confirmer" className="bg-hd-surface-container-lowest rounded-xl p-hd-space-md flex flex-col gap-3 shadow-sm">
   <p id="hd-fidelite-confirmer" className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{l('Tu peux reprendre ton engagement','You can renew your commitment')}</p>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface">{l('Cette déclaration concerne uniquement une relation sexuelle hors mariage, librement consentie. Seul ce compteur repart à zéro : ton jour de parcours, tes activités, tes achats et tes droits sont conservés.','This declaration only concerns sexual relations outside marriage, freely consented to. Only this counter starts again from zero: your journey day, activities, purchases and access are kept.')}</p>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant flex items-start gap-1.5"><IconeHD nom="wb_sunny" className="text-[16px] text-hd-secondary mt-0.5 shrink-0"/>{l('Un acte subi n’est jamais une faute et ne se déclare pas ici. Tu peux prier avec tes mots ou parler à quelqu’un de l’équipe.','Something done to you is never a fault and is not declared here. You can pray in your own words or talk to someone on the team.')}</p>
   <div className="flex gap-2">
    <button type="button" disabled={enCours} onClick={declarer} className="flex-1 min-h-[48px] bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg rounded-xl">{enCours?l('Enregistrement…','Saving…'):l('Confirmer','Confirm')}</button>
    <button type="button" disabled={enCours} onClick={()=>setConfirmer(false)} className="flex-1 min-h-[48px] bg-hd-surface-container text-hd-on-surface font-hd-label-lg text-hd-label-lg rounded-xl">{l('Annuler','Cancel')}</button>
   </div>
  </div>}
  {etat.annulable&&!confirmer&&<button type="button" disabled={enCours} onClick={annuler} className="self-center min-h-[44px] px-3 font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant underline underline-offset-4">{l('Annuler ma dernière saisie','Undo my last entry')}</button>}
 </section>;
}
