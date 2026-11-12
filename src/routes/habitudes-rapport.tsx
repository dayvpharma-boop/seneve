import '@/components/SimulateurEpargne.css';
import './habitudes-depenses.css';
import './habitudes-rapport.css';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {CalendrierPlage,type Plage} from '@/components/CalendrierPlage';
import {ComptePrive} from '@/components/ComptePrive';
import {IconeHD} from '@/components/IconeHabitudes';
import {suiviFinancierActive} from '@/lib/habitudes-configuration';
import {chargerSuiviFinancier,type SuiviFinancier} from '@/lib/habitudes-finances-suivi';
import {chargerCompteursOuAbsents,type Compteurs} from '@/lib/habitudes-finances-compteurs';
import {chargerDepenses,type Depense} from '@/lib/habitudes-finances-depenses';
import {chargerBenefices,type Benefices} from '@/lib/habitudes-finances-benefices';
import {construireRapport,decaler,periodeDe} from '@/lib/rapport-financier';
import {rapportEnHtml,telechargerWord} from '@/lib/rapport-export';
import {decimalesDevise} from '@/lib/devises';
import {NotFound} from '@/routes/introuvable';

/** SÉNEVÉ Rapport (décision de Dr Justin du 12/11/2026) : rapport journalier, mensuel, annuel ou sur des jours choisis,
 * de tous les calculs financiers, à imprimer (ou enregistrer en PDF) et à télécharger en Word.
 * La feuille affichée est exactement celle imprimée et téléchargée. */
type TypePeriode='jour'|'mois'|'annee'|'choix';
const aujourdhui=()=>new Intl.DateTimeFormat('en-CA').format(new Date());

export function RouteHabitudesRapport(){
 return suiviFinancierActive()?<ComptePrive enfants={userId=><HabitudesRapport userId={userId}/>}/>:<NotFound/>;
}

export function HabitudesRapport({userId}:{userId:string}){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr;
 const suffixe=en?'?lang=en':'';
 const [suivi,setSuivi]=useState<SuiviFinancier|null>(null),[cpt,setCpt]=useState<Compteurs|null>(null),[depenses,setDepenses]=useState<Depense[]>([]),[benefices,setBenefices]=useState<Benefices|null>(null);
 const [etat,setEtat]=useState<'chargement'|'pret'|'vide'|'erreur'>('chargement');
 const [type,setType]=useState<TypePeriode>('mois'),[jour,setJour]=useState(aujourdhui),[plage,setPlage]=useState<Plage|null>(null),[devise,setDevise]=useState('');

 const charger=useCallback(async()=>{
  try{
   const s=await chargerSuiviFinancier(null);if(!s){setEtat('vide');return;}
   setSuivi(s);
   const [c,d,b]=await Promise.all([chargerCompteursOuAbsents(s.enrollment_id),chargerDepenses(s.enrollment_id).catch(()=>[]),chargerBenefices(s.enrollment_id).catch(()=>null)]);
   setCpt(c);setDepenses(d);setBenefices(b);setEtat('pret');
  }catch{setEtat('erreur');}
 },[userId]);
 useEffect(()=>{void charger();},[charger]);
 useEffect(()=>{document.title=l('SÉNEVÉ Rapport','SÉNEVÉ Report');document.documentElement.lang=langue;},[langue]);

 const devises=useMemo(()=>{const s=new Set<string>();cpt?.moves.forEach(m=>s.add(m.currency));suivi?.savings_goals.forEach(g=>s.add(g.currency));suivi?.debts.forEach(d=>s.add(d.currency));depenses.forEach(d=>s.add(d.currency));benefices?.ventes.forEach(v=>s.add(v.currency));return [...s];},[cpt,suivi,depenses,benefices]);
 const dev=devise&&devises.includes(devise)?devise:devises[0]??'USD';
 const dec=decimalesDevise(dev);
 const nombre=(c:number)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{minimumFractionDigits:Math.abs(c)%100===0?0:dec,maximumFractionDigits:dec}).format(c/100);
 const auj=aujourdhui();
 const periode=type==='choix'?plage:periodeDe(type,jour);
 const dateLongue=(iso:string,opts:Intl.DateTimeFormatOptions)=>{const t=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{...opts,timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));return t.charAt(0).toUpperCase()+t.slice(1);};
 const libellePeriode=!periode?'':type==='jour'?dateLongue(jour,{weekday:'long',day:'numeric',month:'long',year:'numeric'}):type==='mois'?dateLongue(jour,{month:'long',year:'numeric'}):type==='annee'?l(`Année ${jour.slice(0,4)}`,`Year ${jour.slice(0,4)}`)
  :periode.du===periode.au?dateLongue(periode.du,{day:'numeric',month:'long',year:'numeric'}):l(`Du ${dateLongue(periode.du,{day:'numeric',month:'long',year:'numeric'})} au ${dateLongue(periode.au,{day:'numeric',month:'long',year:'numeric'})}`,`From ${dateLongue(periode.du,{day:'numeric',month:'long',year:'numeric'})} to ${dateLongue(periode.au,{day:'numeric',month:'long',year:'numeric'})}`);
 const titre=type==='jour'?l('Rapport financier du jour','Daily financial report'):type==='mois'?l('Rapport financier du mois','Monthly financial report'):type==='annee'?l('Rapport financier de l’année','Yearly financial report'):l('Rapport financier','Financial report');
 const genereLe=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date());
 const html=useMemo(()=>{if(etat!=='pret'||!suivi||!periode)return '';return rapportEnHtml(construireRapport({suivi,cpt,depenses,benefices},periode.du,periode.au,dev,en),{titre:`SÉNEVÉ — ${titre}`,periode:libellePeriode,genereLe,nombre,en});},[etat,suivi,cpt,depenses,benefices,periode?.du,periode?.au,dev,en,titre,libellePeriode]);
 const suivantImpossible=type!=='choix'&&decaler(type,jour,1)>auj&&periodeDe(type,decaler(type,jour,1)).du>auj;
 const nomFichier=`SENEVE-rapport-${periode?(periode.du===periode.au?periode.du:`${periode.du}_${periode.au}`):'periode'}.doc`;

 return <CadreHabitudes titre={l('SÉNEVÉ Rapport','SÉNEVÉ Report')} langue={langue} retour={`/espace${suffixe}`} retourLibelle={l('Revenir à ma journée','Back to my day')} liens={{aujourdhui:`/espace${suffixe}`}} actif="aujourdhui" cloche>
  <div className="dp-page rp-page sim-ios mx-auto flex w-full max-w-xl flex-col px-hd-margin pt-hd-space-md pb-hd-space-lg">
   <div className="rp-reglages">
    <h1 className="dp-titre">{l('SÉNEVÉ Rapport','SÉNEVÉ Report')}</h1>
    <p className="dp-intro">{l('Tous tes calculs sur la période choisie : à lire ici, à imprimer, à enregistrer en PDF ou à télécharger en Word.','All your calculations for the chosen period: read here, print, save as PDF or download as Word.')}</p>
    {etat==='chargement'&&<p role="status" className="dp-carte-info">{l('Chargement…','Loading…')}</p>}
    {etat==='erreur'&&<p role="alert" className="dp-carte-info">{l('Le rapport n’est pas disponible pour le moment.','The report is not available right now.')}</p>}
    {etat==='vide'&&<p className="dp-carte-info">{l('Le rapport est disponible avec un accès actif à Habitudes & Défis.','The report is available with active Habits & Challenges access.')}</p>}
    {etat==='pret'&&<>
     <div role="radiogroup" aria-label={l('Période du rapport','Report period')} className="rp-segment">{([['jour',l('Jour','Day')],['mois',l('Mois','Month')],['annee',l('Année','Year')],['choix',l('Jours choisis','Chosen days')]] as const).map(([t,n])=><button key={t} type="button" role="radio" aria-checked={type===t} onClick={()=>{setType(t);if(t!=='choix')setJour(auj);}}>{n}</button>)}</div>
     {type!=='choix'?<div className="rp-nav">
      <button type="button" onClick={()=>setJour(decaler(type,jour,-1))} aria-label={l('Période précédente','Previous period')}><IconeHD nom="chevron_left" className="text-[24px]"/></button>
      <span aria-live="polite">{libellePeriode}</span>
      <button type="button" disabled={suivantImpossible} onClick={()=>setJour(decaler(type,jour,1))} aria-label={l('Période suivante','Next period')}><IconeHD nom="chevron_right" className="text-[24px]"/></button>
     </div>:<div className="mt-3"><CalendrierPlage valeur={plage} changer={setPlage} langue={langue}/></div>}
     {devises.length>1&&<div role="radiogroup" aria-label={l('Monnaie','Currency')} className="dp-devises mt-3">{devises.map(d=><button key={d} type="button" role="radio" aria-checked={d===dev} onClick={()=>setDevise(d)}>{d}</button>)}</div>}
     <div className="rp-actions">
      <button type="button" disabled={!html} onClick={()=>window.print()}><IconeHD nom="print" className="text-[20px]"/>{l('Imprimer ou PDF','Print or PDF')}</button>
      <button type="button" disabled={!html} onClick={()=>telechargerWord(html,`SÉNEVÉ — ${titre}`,nomFichier)}><IconeHD nom="description" className="text-[20px]"/>{l('Télécharger Word','Download Word')}</button>
     </div>
     <p className="rp-aide">{l('PDF : touche « Imprimer ou PDF », puis choisis « Enregistrer en PDF » (ou, sur iPhone, partage l’aperçu et choisis « Enregistrer dans Fichiers »).','PDF: tap “Print or PDF”, then choose “Save as PDF” (on iPhone, share the preview and choose “Save to Files”).')}</p>
    </>}
   </div>
   {etat==='pret'&&(html?<article className="rp-papier" aria-label={l('Aperçu du rapport','Report preview')} dangerouslySetInnerHTML={{__html:html}}/>:<p className="dp-vide">{l('Choisis les jours du rapport dans le calendrier.','Choose the report days in the calendar.')}</p>)}
  </div>
 </CadreHabitudes>;
}
