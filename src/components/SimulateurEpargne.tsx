import './SimulateurEpargne.css';
import {useState} from 'react';
import {simulerEpargne,type TypeRevenuEpargne} from '@/lib/habitudes-epargne';
import {IconeHD} from './IconeHabitudes';

/** Simulateur d'épargne facultatif, présentation iPhone validée par Dr Justin le 07/11/2026 :
 * montants groupés, pourcentages préremplis avec − et +, résultat mis à jour pendant la saisie.
 * Calcul dans l'état React uniquement : aucun montant ne quitte la page, rien n'est enregistré. */
const LIMITES={reserve:{min:5,max:10,pas:1},investir:{min:0,max:30,pas:5}} as const;

export function SimulateurEpargne({langue,replie=true}:{langue:string;replie?:boolean}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 if(!replie)return <div className="sim-ios hd-classique"><ContenuEpargne langue={langue}/></div>;
 return <details className="hd-simulateur sim-ios sim-ios-repli hd-classique rounded-xl shadow-sm" style={{background:'var(--ios-carte,#fff)'}}>
  <summary><IconeHD nom="potted_plant" className="text-hd-secondary text-[22px]"/><span className="flex-1 min-w-0"><strong>{l('Épargne','Savings')}</strong><small>{l('Simulateur facultatif','Optional simulator')}</small></span><IconeHD nom="expand_more" className="text-[22px] text-hd-on-surface-variant"/></summary>
  <div className="sim-ios-repli-corps"><ContenuEpargne langue={langue}/></div>
 </details>;
}

function ContenuEpargne({langue}:{langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [type,setType]=useState<TypeRevenuEpargne>('commerce');
 const [recu,setRecu]=useState(''),[marchandises,setMarchandises]=useState(''),[charges,setCharges]=useState('');
 const [reserve,setReserve]=useState(10),[investir,setInvestir]=useState(20);
 const effacer=()=>{setRecu('');setMarchandises('');setCharges('');};
 const choisir=(v:TypeRevenuEpargne)=>{setType(v);effacer();};
 const nombre=(s:string)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{maximumFractionDigits:2}).format(Number(s));
 let resultat:ReturnType<typeof simulerEpargne>|null=null,erreur=false;
 if(recu.trim()!==''){
  try{resultat=simulerEpargne(type,recu,type==='commerce'?(marchandises.trim()||'0'):'0',charges.trim()||'0',String(reserve),String(investir));}
  catch{erreur=true;}
 }else if([marchandises,charges].some(v=>v.trim()!==''&&!/^\d+(?:[.,]\d{1,6})?$/.test(v.trim().replace(/[   ]/g,''))))erreur=true;
 const reste=resultat?Math.max(0,Number(resultat.base)-Number(resultat.reserve_joie)-Number(resultat.epargne_investissement)):0;
 const champ=(id:string,libelle:string,valeur:string,changer:(v:string)=>void,signe='')=><div className="sim-ios-ligne">
  <label htmlFor={id}>{libelle}</label>{signe&&<span className="sim-ios-signe" aria-hidden="true">{signe}</span>}
  <input id={id} type="text" inputMode="decimal" autoComplete="off" maxLength={32} placeholder="0" value={valeur} onChange={e=>changer(e.target.value)}/>
 </div>;
 const pas=(cle:'reserve'|'investir',libelle:string,valeur:number,changer:(v:number)=>void)=>{const b=LIMITES[cle];return <div className="sim-ios-ligne">
  <label id={`hd-epargne-${cle}`}>{libelle}</label>
  <div className="sim-ios-pas"><span className="sim-ios-valeur">{valeur} %</span><div className="sim-ios-stepper">
   <button type="button" aria-label={l(`Baisser : ${libelle}`,`Decrease: ${libelle}`)} disabled={valeur<=b.min} onClick={()=>changer(Math.max(b.min,valeur-b.pas))}>−</button><span aria-hidden="true"/>
   <button type="button" aria-label={l(`Augmenter : ${libelle}`,`Increase: ${libelle}`)} disabled={valeur>=b.max} onClick={()=>changer(Math.min(b.max,valeur+b.pas))}>+</button>
  </div></div>
 </div>;};
 return <>
  <p className="sim-ios-sous">{l('Facultatif · un calcul pour t’aider. Rien n’est enregistré, aucun argent ne bouge.','Optional · a calculation to help you. Nothing is saved and no money moves.')}</p>
  <div role="radiogroup" aria-label={l('Situation de revenu','Income situation')} className="sim-ios-segment">
   <button type="button" role="radio" aria-checked={type==='commerce'} onClick={()=>choisir('commerce')}>{l('Commerçant','Business')}</button>
   <button type="button" role="radio" aria-checked={type==='salaire'} onClick={()=>choisir('salaire')}>{l('Salarié','Salary')}</button>
  </div>
  <h3 className="sim-ios-titre">{type==='commerce'?l('Cette semaine','This week'):l('Ce mois','This month')}</h3>
  <div className="sim-ios-groupe">
   {champ('hd-epargne-recu',type==='commerce'?l('Ventes encaissées','Sales received'):l('Salaire reçu','Salary received'),recu,setRecu)}
   {type==='commerce'&&champ('hd-epargne-marchandises',l('Coût des marchandises','Cost of goods sold'),marchandises,setMarchandises,'−')}
   {champ('hd-epargne-charges',type==='commerce'?l('Charges du commerce','Business expenses'):l('Charges de travail','Work expenses'),charges,setCharges,'−')}
  </div>
  <p className="sim-ios-note">{l('Tes dépenses personnelles et tes remboursements de dettes ne se retirent pas. Mets tous les montants dans la même monnaie.','Personal expenses and debt repayments are not deducted. Use the same currency for every amount.')}</p>
  {erreur&&<p role="alert" className="sim-ios-alerte">{l('Vérifie les montants : écris seulement des chiffres, par exemple 1000 ou 1000,50.','Check the amounts: use digits only, for example 1000 or 1000.50.')}</p>}
  <h3 className="sim-ios-titre">{l('Mes pourcentages','My percentages')}</h3>
  <div className="sim-ios-groupe">
   {pas('reserve',l('Réserve de joie','Family joy reserve'),reserve,setReserve)}
   {pas('investir',l('Pour investir','For investing'),investir,setInvestir)}
  </div>
  <p className="sim-ios-note">{l('Réserve de joie : de 5 à 10 %. Pour investir : jusqu’à 30 %.','Family joy reserve: 5 to 10%. For investing: up to 30%.')}</p>
  <div aria-live="polite" className="sim-ios-resultat">
   {resultat?<>
    <div className="sim-ios-resultat-etiquette">{l('Base retenue','Selected basis')}</div>
    <div className="sim-ios-resultat-base">{nombre(resultat.base)}</div>
    <div className="sim-ios-deux">
     <div className="sim-ios-boite"><small>{l('Réserve de joie','Family joy reserve')}</small><b>{nombre(resultat.reserve_joie)}</b><i>{reserve} %</i></div>
     <div className="sim-ios-boite"><small>{l('Pour investir','For investing')}</small><b>{nombre(resultat.epargne_investissement)}</b><i>{investir} %</i></div>
    </div>
    <p className="sim-ios-reste">{type==='commerce'?l(`Il te reste ${nombre(String(reste))} pour ta vie et ton commerce.`,`You have ${nombre(String(reste))} left for your life and your business.`):l(`Il te reste ${nombre(String(reste))} pour ta vie.`,`You have ${nombre(String(reste))} left for your life.`)}</p>
   </>:<p className="sim-ios-attente">{l('Écris tes montants : le résultat apparaît tout de suite ici.','Enter your amounts: the result appears here straight away.')}</p>}
  </div>
  <button type="button" className="sim-ios-effacer" onClick={effacer}>{l('Effacer les montants','Clear amounts')}</button>
 </>;
}
