import './SimulateurEpargne.css';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {IconeHD} from './IconeHabitudes';
import {chargerSuiviFinancier,type SuiviFinancier} from '@/lib/habitudes-finances-suivi';
import {CompteursIndisponibles,enregistrerRepartition,type PartRepartition} from '@/lib/habitudes-finances-compteurs';
import {repartirSurDettes} from '@/lib/habitudes-repartition';
import {decimalesDevise} from '@/lib/devises';

type Montants={dime:number;offrande:number;reserve:number;investir:number;autre:number;dettes:number;vivre:number};
type Ligne={cle:string;nom:string;destination:string;montant:number;parts:PartRepartition[];possible:boolean;couleur:string};
const aujourdhui=()=>new Intl.DateTimeFormat('en-CA').format(new Date());

/** Feuille « Enregistrer ma répartition » (maquette validée le 07/11/2026) : chaque part est vérifiée, cochée ou non,
 * puis toute la répartition est notée en une seule fois (tout ou rien). Aucun argent ne bouge. */
export function EnregistrerRepartition({montants,devise,langue,onFermer}:{montants:Montants;devise:string;langue:string;onFermer:()=>void}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const navigate=useNavigate();
 const [suivi,setSuivi]=useState<SuiviFinancier|null|'aucun'|'erreur'>(null);
 // Tout est coché au départ : on ne retient que les parts décochées.
 const [decoches,setDecoches]=useState<Record<string,boolean>>({});
 const coche=(cle:string)=>!decoches[cle];
 const [enCours,setEnCours]=useState(false),[erreur,setErreur]=useState('');
 // Date choisie par la personne (demande du 07/11/2026) : aujourd’hui au départ, jamais dans le futur.
 const [date,setDate]=useState(aujourdhui);
 // « Autre objectif » : la personne choisit lequel quand elle en a plusieurs dans la monnaie.
 const [autreChoisi,setAutreChoisi]=useState('');
 const demande=useRef(crypto.randomUUID());
 const dec=decimalesDevise(devise);
 const nombre=(n:number)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{minimumFractionDigits:Number.isInteger(n)?0:dec,maximumFractionDigits:dec}).format(n);
 const chaine=(n:number)=>n.toFixed(dec);
 useEffect(()=>{let actif=true;void chargerSuiviFinancier(null).then(s=>{if(actif)setSuivi(s??'aucun');}).catch(()=>{if(actif)setSuivi('erreur');});return()=>{actif=false;};},[]);
 // Clé stable : la page recrée l’objet des montants à chaque rendu.
 const cleMontants=JSON.stringify(montants);
 const lignes=useMemo<Ligne[]>(()=>{
  const s=suivi&&typeof suivi==='object'?suivi:null;
  const objectif=(type:'reserve_joie'|'epargne_investir')=>s?.savings_goals.find(g=>g.goal_type===type&&g.currency===devise);
  const out:Ligne[]=[{cle:'dime',nom:l('Dîme','Tithe'),destination:l('Ma dîme donnée','My tithe'),montant:montants.dime,parts:[{part:'dime',amount:chaine(montants.dime)}],possible:true,couleur:'#b8862b'}];
  if(montants.offrande>0)out.push({cle:'offrande',nom:l('Offrande','Offering'),destination:l('Mes offrandes','My offerings'),montant:montants.offrande,parts:[{part:'offrande',amount:chaine(montants.offrande)}],possible:true,couleur:'#b05bd6'});
  for(const [cle,type,nom,coul,m] of [['reserve','reserve_joie',l('Réserve de joie','Family joy reserve'),'#2f9e62',montants.reserve],['investir','epargne_investir',l('Pour investir','For investing'),'#2f6fe0',montants.investir]] as const){
   if(m<=0)continue;const g=objectif(type);
   out.push({cle,nom,destination:g?l(`objectif « ${g.label} »`,`goal “${g.label}”`):l(`crée d’abord un objectif en ${devise} dans SÉNEVÉ Finance`,`first create a ${devise} goal in SÉNEVÉ Finance`),montant:m,parts:g?[{part:type,goal_id:g.goal_id,amount:chaine(m)}]:[],possible:!!g,couleur:coul});
  }
  if(montants.autre>0){
   const autres=(s?.savings_goals??[]).filter(g=>g.goal_type==='autre'&&g.currency===devise);
   const g=autres.find(x=>x.goal_id===autreChoisi)??autres[0];
   out.push({cle:'autre',nom:l('Autre objectif','Other goal'),destination:g?l(`objectif « ${g.label} »`,`goal “${g.label}”`):l(`crée d’abord un « Autre objectif » en ${devise} dans SÉNEVÉ Finance`,`first create an “Other goal” in ${devise} in SÉNEVÉ Finance`),montant:montants.autre,parts:g?[{part:'autre',goal_id:g.goal_id,amount:chaine(montants.autre)}]:[],possible:!!g,couleur:'#c2410c'});
  }
  if(montants.dettes>0){
   const dettes=(s?.debts??[]).filter(d=>d.currency===devise).map(d=>({d,reste:Math.round(Number(d.opening_balance)*100)-d.payments.reduce((n,p)=>n+Math.round(Number(p.amount)*100),0)}));
   const {propositions,surplus}=repartirSurDettes(Math.round(montants.dettes*100),dettes.map(x=>({id:x.d.debt_id,resteCentimes:x.reste})));
   const noms=propositions.map(p=>{const d=dettes.find(x=>x.d.debt_id===p.id)!.d;return `${d.creditor_name??l(`Dette ${d.debt_number}`,`Debt ${d.debt_number}`)} ${nombre(p.centimes/100)}${p.solde?l(' (soldée)',' (paid off)'):''}`;});
   const total=propositions.reduce((n,p)=>n+p.centimes,0)/100;
   out.push({cle:'dettes',nom:l('Dettes','Debts'),destination:propositions.length?noms.join(' · ')+(surplus>0?l(` · ${nombre(surplus/100)} sans dette à rembourser`,` · ${nombre(surplus/100)} with no debt left`):''):l(`aucune dette en ${devise} dans SÉNEVÉ Suivi des dettes`,`no ${devise} debt in SÉNEVÉ Debt tracker`),montant:propositions.length?total:montants.dettes,parts:propositions.map(p=>({part:'dettes',debt_id:p.id,amount:chaine(p.centimes/100)})),possible:propositions.length>0,couleur:'#e0662f'});
  }
  if(montants.vivre>0)out.push({cle:'vivre',nom:l('Pour vivre','For living'),destination:l('Pour vivre','For living'),montant:montants.vivre,parts:[{part:'vivre',amount:chaine(montants.vivre)}],possible:true,couleur:'#a1a1a6'});
  return out.filter(x=>x.montant>0);
 },[suivi,cleMontants,devise,en,autreChoisi]);
 const choisies=lignes.filter(x=>x.possible&&coche(x.cle));
 const total=choisies.reduce((n,x)=>n+x.montant,0);
 async function enregistrer(){
  if(!suivi||typeof suivi!=='object'||!choisies.length||enCours)return;
  setEnCours(true);setErreur('');
  try{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>aujourdhui()){setErreur(l('Choisis une date qui n’est pas dans le futur.','Choose a date that is not in the future.'));setEnCours(false);return;}
   await enregistrerRepartition(suivi.enrollment_id,devise,date,choisies.flatMap(x=>x.parts),demande.current);
   const soldees=lignes.find(x=>x.cle==='dettes'&&x.possible&&coche('dettes'))?.destination.match(/\((soldée|paid off)\)/g)?.length??0;
   navigate(`/habitudes/compteurs${en?'?lang=en':''}`,{state:{message:l(`Répartition enregistrée : ${choisies.length} part${choisies.length>1?'s':''}, ${nombre(total)} ${devise}.${soldees?` ${soldees} dette${soldees>1?'s':''} soldée${soldees>1?'s':''}.`:''}`,`Allocation saved: ${choisies.length} part${choisies.length>1?'s':''}, ${nombre(total)} ${devise}.${soldees?` ${soldees} debt${soldees>1?'s':''} paid off.`:''}`)}});
  }catch(e){setErreur(e instanceof CompteursIndisponibles?l('Les compteurs ne sont pas encore ouverts. Réessaie un peu plus tard.','Counters are not open yet. Try again a little later.'):l('La répartition n’a pas été enregistrée. Vérifie les montants et réessaie.','The allocation was not saved. Check the amounts and try again.'));setEnCours(false);}
 }
 return <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="hd-feuille-titre">
  <button type="button" aria-label={l('Fermer','Close')} className="absolute inset-0 bg-black/30" onClick={onFermer}/>
  <div className="sim-ios hd-classique relative max-h-[88vh] overflow-y-auto rounded-t-[14px] px-4 pb-8 pt-2 shadow-[0_-8px_30px_rgba(0,0,0,.18)]" style={{background:'var(--ios-fond,#f2f2f7)'}}>
   <div aria-hidden="true" className="mx-auto mb-2.5 h-[5px] w-9 rounded-full bg-[#c7c7cc]"/>
   <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-center"><button type="button" onClick={onFermer} className="justify-self-start text-[17px]" style={{color:'var(--ios-accent,#5b4ee8)',minHeight:44}}>{l('Annuler','Cancel')}</button><h2 id="hd-feuille-titre" className="text-[17px] font-semibold" style={{margin:0}}>{l('Enregistrer','Save')}</h2><span/></div>
   <p className="sim-ios-sous">{l('Décoche ce que tu n’as pas encore donné ou versé.','Untick what you have not given or set aside yet.')}</p>
   <div className="sim-ios-groupe mb-3"><div className="sim-ios-ligne"><label htmlFor="hd-repartition-date">{l('Date de la répartition','Allocation date')}</label><input id="hd-repartition-date" type="date" max={aujourdhui()} value={date} onChange={e=>setDate(e.target.value)} style={{width:150,color:'var(--ios-accent,#5b4ee8)'}}/></div></div>
   {suivi===null&&<p role="status" className="rounded-xl bg-white p-4">{l('Chargement de ton suivi…','Loading your tracker…')}</p>}
   {(suivi==='aucun'||suivi==='erreur')&&<p role="alert" className="rounded-xl bg-white p-4">{suivi==='aucun'?l('Connecte-toi avec un accès actif à Habitudes & Défis pour enregistrer ta répartition.','Sign in with active Habits & Challenges access to save your allocation.'):l('Ton suivi n’est pas disponible pour le moment.','Your tracker is not available right now.')}</p>}
   {suivi&&typeof suivi==='object'&&<>
    <ul className="sim-ios-groupe" style={{listStyle:'none',margin:0,padding:0}}>
     {lignes.map(x=><li key={x.cle} className="sim-ios-ligne" style={{minHeight:62,opacity:x.possible&&coche(x.cle)?1:.5}}>
      <input id={`hd-part-${x.cle}`} type="checkbox" disabled={!x.possible} checked={x.possible&&coche(x.cle)} onChange={e=>setDecoches(c=>({...c,[x.cle]:!e.target.checked}))} style={{width:24,height:24,accentColor:'var(--ios-accent,#5b4ee8)',flex:'none'}}/>
      <label htmlFor={`hd-part-${x.cle}`} style={{flex:1,minWidth:0}}><span className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-sm" style={{background:x.couleur}}/>{x.nom}</span><small className="block text-[13px] text-hd-on-surface-variant">→ {x.destination}</small></label>
      <b className="tabular-nums whitespace-nowrap">{nombre(x.montant)} {devise}</b>
     </li>)}
     {(()=>{const autres=suivi&&typeof suivi==='object'?suivi.savings_goals.filter(g=>g.goal_type==='autre'&&g.currency===devise):[];return montants.autre>0&&autres.length>1?<li className="sim-ios-ligne"><label htmlFor="hd-autre-objectif">{l('Quel autre objectif ?','Which other goal?')}</label><select id="hd-autre-objectif" value={autreChoisi||autres[0]!.goal_id} onChange={e=>setAutreChoisi(e.target.value)}>{autres.map(g=><option key={g.goal_id} value={g.goal_id}>{g.label}</option>)}</select></li>:null;})()}
    </ul>
    <button type="button" disabled={!choisies.length||enCours} onClick={()=>void enregistrer()} className="sim-ios-bouton disabled:opacity-50" style={{marginTop:14}}><IconeHD nom="check_circle" className="mr-2 text-[20px]"/>{enCours?l('Enregistrement…','Saving…'):choisies.length?l(`Enregistrer ${choisies.length} part${choisies.length>1?'s':''} · ${nombre(total)} ${devise}`,`Save ${choisies.length} part${choisies.length>1?'s':''} · ${nombre(total)} ${devise}`):l('Coche au moins une part','Tick at least one part')}</button>
    {erreur&&<p role="alert" className="sim-ios-alerte">{erreur}</p>}
    <p className="sim-ios-note">{l('Ce qui reste décoché n’est pas noté ; tu pourras l’ajouter plus tard. Aucun argent ne bouge.','Anything left unticked is not recorded; you can add it later. No money moves.')}</p>
   </>}
  </div>
 </div>;
}
