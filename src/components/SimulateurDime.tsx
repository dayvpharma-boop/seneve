import './SimulateurDime.css';
import './SimulateurEpargne.css';
import {useState,type FormEvent} from 'react';
import {simulerDime,type TypeRevenuDime} from '@/lib/habitudes-dime';
import {IconeHD} from './IconeHabitudes';
type Situation=TypeRevenuDime|'pret'|'offrande'|'particulier'|'';
/** Mise en page de la maquette Stitch « Dîme et offrande ».
 * Montants dans l'état React seulement : aucun stockage, RPC, suivi de progression ou paiement.
 */
export function SimulateurDime({langue,ouvert=false}:{langue:string;ouvert?:boolean}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [type,setType]=useState<Situation>(''),[periode,setPeriode]=useState('');
 const [recu,setRecu]=useState(''),[cout,setCout]=useState(''),[charges,setCharges]=useState('');
 const [resultat,setResultat]=useState<ReturnType<typeof simulerDime>|null>(null),[erreur,setErreur]=useState(false);
 const effacer=()=>{setRecu('');setCout('');setCharges('');setResultat(null);setErreur(false);};
 const afficher=(s:string)=>en?s:s.replace('.',',');
 const calculable=['commerce','salaire','don'].includes(type);
 function choisir(v:Situation){setType(v);setPeriode('');effacer();}
 function calculer(e:FormEvent){e.preventDefault();setErreur(false);setResultat(null);try{if(!periode)throw Error();setResultat(simulerDime(type as TypeRevenuDime,recu,cout,charges));}catch{setErreur(true);}}
 const champ=(id:string,libelle:string,aide:string,valeur:string,changer:(v:string)=>void)=><div className="sim-ios-ligne">
  <label htmlFor={id}>{libelle}</label>
  <input id={id} type="text" inputMode="decimal" autoComplete="off" required maxLength={32} placeholder={aide} value={valeur} onChange={e=>{changer(e.target.value);setResultat(null);setErreur(false);}}/>
 </div>;
 const principaux:[Situation,string,string][]=[['commerce','Commerçant','Business'],['salaire','Salarié','Salary'],['don','Don reçu','Gift'],['pret','Prêt','Loan']];
 const autres:[Situation,string,string][]=[['offrande','Offrande','Offering'],['particulier','Cas à préciser','Case requiring clarification']];
 const segment=(v:Situation,fr:string,english:string,petit=false)=><button key={v} type="button" role="radio" aria-checked={type===v} onClick={()=>choisir(v)} className={petit?`min-h-[40px] px-3 rounded-full font-hd-label-md text-hd-label-md transition-all ${type===v?'bg-hd-secondary-container/50 text-hd-secondary font-semibold':'bg-hd-surface-container-low text-hd-on-surface-variant hover:text-hd-on-surface'}`:`py-2 px-1 min-h-[40px] rounded font-hd-label-md text-hd-label-md text-center transition-all ${type===v?'bg-hd-surface-container-lowest text-hd-secondary font-semibold shadow-sm':'text-hd-on-surface-variant hover:text-hd-on-surface'}`}>{en?english:fr}</button>;
 const note=(icone:string,texte:string)=><div role="status" className="bg-hd-surface-container-high rounded-lg p-hd-space-sm flex items-start gap-hd-space-xs"><IconeHD nom={icone} className="text-hd-secondary text-[18px] shrink-0 mt-0.5"/><p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{texte}</p></div>;
 return <details open={ouvert||undefined} className="hd-simulateur sim-ios-dime hd-stitch bg-hd-surface-container-lowest rounded-xl shadow-sm text-hd-on-surface">
  <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer p-hd-space-md flex items-center justify-between gap-hd-space-xs min-h-[56px]">
   <span className="flex items-center gap-hd-space-xs"><IconeHD nom="calculate" className="text-hd-secondary text-[22px]"/><span className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{l('Simulateur de dîme facultatif','Optional tithe simulator')}</span></span>
   <span className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant bg-hd-surface-container px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">10 %</span>
  </summary>
  <div className="px-hd-space-md pb-hd-space-md flex flex-col gap-hd-space-md">
   <div className="bg-hd-surface-container-low rounded-xl p-hd-space-md flex flex-col gap-hd-space-sm">
    <span className="self-start inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-hd-surface-container text-hd-secondary font-hd-label-sm text-hd-label-sm"><IconeHD nom="auto_stories" className="text-[14px]"/><span>{l('Enseignement complémentaire','Supplementary teaching')}</span></span>
    <p className="font-hd-body-md text-hd-body-md text-hd-on-surface leading-relaxed">{l('Enseignement complémentaire validé par Dr Justin Tshims (ce n’est pas une citation du livre) : la dîme est de 10 % du revenu ou du bénéfice réel, avant les dépenses personnelles et les remboursements de dettes. L’offrande est libre.','Supplementary teaching approved by Dr Justin Tshims (not a quotation from the book): the tithe is 10% of actual income or profit, before personal spending and debt repayments. The offering is free.')}</p>
    <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Règles pédagogiques enseignées dans SÉNEVÉ. Ce n’est ni un conseil fiscal individuel ni une obligation légale.','Educational rules taught in SÉNEVÉ. This is not an individual tax assessment or a legal obligation.')}</p>
   </div>
   <div role="radiogroup" aria-label={l('Situation','Situation')} className="flex flex-col gap-2">
    <div className="grid grid-cols-4 gap-1 p-1 bg-hd-surface-container rounded-lg">{principaux.map(([v,f,e])=>segment(v,f,e))}</div>
    <div className="flex flex-wrap gap-2">{autres.map(([v,f,e])=>segment(v,f,e,true))}</div>
   </div>
   {type==='pret'&&note('info',l('Le principal d’un prêt n’est pas un revenu ou un don. Aucune dîme n’est calculée sur le simple prêt.','The loan principal is not treated as income or a gift. No tithe is calculated on the loan itself.'))}
   {type==='offrande'&&note('volunteer_activism',l('Le montant est librement choisi selon tes moyens. Aucun pourcentage n’est imposé.','The amount is freely chosen according to your means. No percentage is imposed.'))}
   {type==='particulier'&&note('help_outline',l('Pas de calcul automatique : dons affectés, dons en nature, remboursements de frais, stock invendu, impôts, cotisations et autres cas non tranchés restent à préciser.','No automatic calculation: earmarked gifts, gifts in kind, expense reimbursements, unsold stock, taxes, contributions and other unresolved cases require clarification.'))}
   {calculable&&<form onSubmit={calculer} className="flex flex-col gap-hd-space-md">
    <div className="flex flex-col"><div className="sim-ios-groupe hd-classique"><div className="sim-ios-ligne"><label htmlFor="hd-dime-periode">{l('Période','Period')}</label>
     <select id="hd-dime-periode" required value={periode} onChange={e=>{setPeriode(e.target.value);setResultat(null);}}><option value="">{l('Choisir','Choose')}</option><option value="semaine">{l('Semaine','Week')}</option><option value="mois">{l('Mois','Month')}</option><option value="autre">{l('Autre période','Another period')}</option></select></div></div>
     <p className="sim-ios-note hd-classique">{l('Utilise la même monnaie et la même période pour tous les montants.','Use the same currency and period for every amount.')}</p>
    </div>
    {type==='don'&&<p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Pour un don affecté à une dépense précise ou un don en nature, choisis « Cas à préciser ».','For earmarked gifts or gifts in kind, choose the case requiring clarification.')}</p>}
    <div className="sim-ios-groupe hd-classique">
     {champ('hd-dime-recu',type==='commerce'?l('Ventes encaissées','Sales received'):type==='salaire'?l('Salaire reçu','Salary received'):l('Don d’argent reçu','Cash gift received'),type==='commerce'?l('Revenu brut','Gross income'):type==='salaire'?l('Mensuel','Monthly'):l('Don en argent','Cash gift'),recu,setRecu)}
     {type==='commerce'&&champ('hd-dime-cout',l('Coût des marchandises','Cost of goods'),l('Stock vendu','Goods sold'),cout,setCout)}
     {type!=='don'&&champ('hd-dime-charges',l('Charges professionnelles admissibles','Eligible professional expenses'),l('Transport, atelier','Transport, workshop'),charges,setCharges)}
    </div>
    {type!=='don'&&<div className="bg-hd-surface-container-high rounded-lg p-hd-space-sm flex items-start gap-hd-space-xs"><IconeHD nom="info" className="text-hd-secondary text-[18px] shrink-0 mt-0.5"/><p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Seulement les charges professionnelles réelles ; pour un salaire, les dépenses nécessaires non remboursées. Le loyer personnel, le ménage, l’alimentation, les frais scolaires et les remboursements de dettes personnelles ne sont pas déduits.','Only actual professional expenses; for salary, necessary expenses that were not reimbursed. Personal rent, household costs, food, school expenses and personal debt repayments are excluded.')}</p></div>}
    <button type="submit" className="sim-ios-bouton hd-classique" style={{marginTop:0}}><IconeHD nom="calculate" className="text-[20px]"/>{l('Simuler','Simulate')}</button>
    {erreur&&<p role="alert" className="font-hd-body-sm text-hd-body-sm text-hd-error">{l('Choisis une période et saisis des montants valides, positifs ou nuls (par exemple 1000,50).','Choose a period and enter valid non-negative amounts (for example 1000.50).')}</p>}
   </form>}
   {resultat&&<output aria-live="polite" className="sim-ios-resultat hd-classique" style={{marginTop:0}}>
    <div className="sim-ios-resultat-etiquette">{l('Base de calcul','Calculation basis')}</div>
    <div className="sim-ios-resultat-base" style={{marginBottom:4}}>{afficher(resultat.recu)}{type==='commerce'?` − ${afficher(resultat.marchandises)}`:''}{type!=='don'?` − ${afficher(resultat.charges)}`:''} = {afficher(resultat.solde)}</div>
    <div className="sim-ios-reste" style={{margin:'0 0 16px'}}>{l('Base positive retenue','Positive basis used')} : {afficher(resultat.base)}</div>
    <div className="sim-ios-boite"><small>{l('Dîme simulée','Simulated tithe')}</small><b aria-hidden="true" className="sim-ios-grand">{afficher(resultat.dime)}</b><strong className="sim-ios-formule" style={{fontWeight:400}}>{en?'Simulated tithe':'Dîme simulée'} : {afficher(resultat.base)} × 10 % = {afficher(resultat.dime)}</strong></div>
    <p className="sim-ios-reste">{l('Résultat exact ; aucune règle d’arrondi n’est imposée.','Exact result; no rounding rule is imposed.')}</p>
   </output>}
   <div className="bg-hd-surface-container rounded-xl p-hd-space-md flex flex-col gap-hd-space-xs">
    <div className="flex items-center gap-hd-space-xs"><IconeHD nom="volunteer_activism" className="text-hd-secondary text-[20px]"/><h3 className="font-hd-label-lg text-hd-label-lg text-hd-on-surface font-semibold">{l('Offrande','Offering')}</h3></div>
    <p className="font-hd-body-md text-hd-body-md text-hd-on-surface">{l('Offrande : montant libre, selon tes moyens.','Offering: a free amount, according to your means.')}</p>
   </div>
   <div className="flex flex-col items-center gap-hd-space-sm pt-hd-space-xs">
    <div className="flex items-center gap-1.5 text-hd-on-surface-variant"><IconeHD nom="lock" className="text-[16px] text-hd-secondary"/><span className="font-hd-body-sm text-hd-body-sm">{l('Aucun historique des montants n’est enregistré. Ce simulateur ne réalise aucun paiement.','No amount history is saved. This simulator does not make payments.')}</span></div>
    <button type="button" className="min-h-[44px] px-4 rounded-xl bg-hd-surface-container-low hover:bg-hd-surface-container text-hd-on-surface font-hd-label-md text-hd-label-md font-medium flex items-center gap-1.5" onClick={effacer}><IconeHD nom="restart_alt" className="text-[18px]"/>{l('Effacer les montants','Clear amounts')}</button>
   </div>
  </div>
 </details>;
}
