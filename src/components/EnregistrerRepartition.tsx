import './SimulateurEpargne.css';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {IconeHD} from './IconeHabitudes';
import {chargerSuiviFinancier,type ObjectifEpargne,type SuiviFinancier,type TypeObjectifEpargne} from '@/lib/habitudes-finances-suivi';
import {chargerCompteurs,CompteursIndisponibles,disponibleObjectif,enregistrerRepartition,type Compteurs,type PartRepartition} from '@/lib/habitudes-finances-compteurs';
import {repartirSurDettes} from '@/lib/habitudes-repartition';
import {decimalesDevise} from '@/lib/devises';

// retour : argent déjà réparti revenu au solde (hd_finance_base_nouvelle.sql) ; aucun pourcentage ne s'y applique.
type Montants={dime:number;offrande:number;reserve:number;investir:number;autre:number;dettes:number;vivre:number;retour?:number};
type Ligne={cle:string;nom:string;destination:string;montant:number;parts:PartRepartition[];possible:boolean;couleur:string;details?:string;montantInitial?:number};
const aujourdhui=()=>new Intl.DateTimeFormat('en-CA').format(new Date());

/** Feuille « Enregistrer ma répartition » (maquette validée le 07/11/2026) : chaque part est vérifiée, cochée ou non,
 * puis toute la répartition est notée en une seule fois (tout ou rien). Aucun argent ne bouge. */
export function EnregistrerRepartition({montants,devise,langue,onFermer,depuisEncaissements=false}:{montants:Montants;depuisEncaissements?:boolean;devise:string;langue:string;onFermer:()=>void}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const navigate=useNavigate();
 const [compteurs,setCompteurs]=useState<Compteurs|null>(null);
 const [suivi,setSuivi]=useState<SuiviFinancier|null|'aucun'|'erreur'>(null);
 // Toutes les parts sont cochées au départ, Dettes compris (demande de Dr Justin du 10/11/2026 : le pourcentage
 // choisi vaut décision de rembourser) ; décocher Dettes si l'argent n'est pas encore donné. L'excédent exige un choix.
 const [decoches,setDecoches]=useState<Record<string,boolean>>({});
 // « Solde à répartir » (demande du 10/11/2026) : l'excédent n'est pas enregistré et reste à répartir plus tard.
 const [destinationSurplus,setDestinationSurplus]=useState<'vivre'|'investissement'|'solde'|null>(null);
 // L'argent déjà réparti reste dans le solde par défaut ; il peut aller vers vivre ou l'investissement, sans pourcentage.
 const [destinationRetour,setDestinationRetour]=useState<'solde'|'vivre'|'investissement'>('solde');
 const coche=(cle:string)=>cle==='surplus_dettes'?destinationSurplus!==null:cle==='retour'?destinationRetour!=='solde':!decoches[cle];
 const [enCours,setEnCours]=useState(false),[erreur,setErreur]=useState('');
 // Date choisie par la personne (demande du 07/11/2026) : aujourd’hui au départ, jamais dans le futur.
 const [date,setDate]=useState(aujourdhui);
 // Chaque objectif a son identifiant : deux investissements de même type/devise
 // (Voiture et Achat maison) ne doivent jamais être confondus.
 const [objectifsChoisis,setObjectifsChoisis]=useState<Partial<Record<TypeObjectifEpargne,string>>>({});
 const demande=useRef(crypto.randomUUID());
 const dec=decimalesDevise(devise);
 const nombre=(n:number)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{minimumFractionDigits:Number.isInteger(n)?0:dec,maximumFractionDigits:dec}).format(n);
 const chaine=(n:number)=>n.toFixed(dec);
 useEffect(()=>{let actif=true;void chargerSuiviFinancier(null).then(async s=>{
  const c=s?await chargerCompteurs(s.enrollment_id).catch(()=>null):null;
  if(actif){setCompteurs(c);setSuivi(s??'aucun');}
 }).catch(()=>{if(actif)setSuivi('erreur');});return()=>{actif=false;};},[]);
 // Clé stable : la page recrée l’objet des montants à chaque rendu.
 const cleMontants=JSON.stringify(montants);
 const lignes=useMemo<Ligne[]>(()=>{
  const s=suivi&&typeof suivi==='object'?suivi:null;
  const candidats=(type:TypeObjectifEpargne)=>(s?.savings_goals??[]).filter(g=>g.goal_type===type&&g.currency===devise);
  // Par défaut (« Automatique »), tous les objectifs du type reçoivent la part, du plus petit reste au plus grand,
  // comme les dettes (demande de Dr Justin du 10/11/2026). Un objectif choisi dans la liste reçoit tout.
  const objectifs=(type:TypeObjectifEpargne)=>{
   const liste=candidats(type),choisi=liste.find(g=>g.goal_id===objectifsChoisis[type]);
   return choisi?[choisi]:liste;
  };
  const out:Ligne[]=[{cle:'dime',nom:l('Dîme','Tithe'),destination:l('Dans ma caisse de dîme · pas encore donnée','In my tithe counter · not yet given'),montant:montants.dime,parts:[{part:'dime',amount:chaine(montants.dime)}],possible:true,couleur:'#b8862b'}];
  if(montants.offrande>0)out.push({cle:'offrande',nom:l('Offrande','Offering'),destination:l('Mes offrandes','My offerings'),montant:montants.offrande,parts:[{part:'offrande',amount:chaine(montants.offrande)}],possible:true,couleur:'#b05bd6'});
  // Les deux parts « investissement » peuvent viser le même objectif.
  const dejaPrevu=new Map<string,number>();
  const partObjectif=(liste:ObjectifEpargne[],m:number,retenue:boolean)=>{
   const propose=Math.round(m*100);
   const {propositions,surplus:reste}=repartirSurDettes(propose,liste.map(g=>({id:g.goal_id,
    resteCentimes:Math.max(0,Math.round(Number(g.target_amount)*100)-disponibleObjectif(compteurs,g.goal_id,g.entries)-(dejaPrevu.get(g.goal_id)??0))})));
   if(retenue)for(const p of propositions)dejaPrevu.set(p.id,(dejaPrevu.get(p.id)??0)+p.centimes);
   const verse=propose-reste,surplus=reste/100,plusieurs=liste.length>1;
   const parGoal=(id:string)=>liste.find(g=>g.goal_id===id)!;
   return {
    montant:verse/100,
    parts:propositions.map(p=>({part:parGoal(p.id).goal_type,goal_id:p.id,amount:chaine(p.centimes/100)})),
    possible:verse>0,
    destination:!plusieurs?l(`objectif « ${liste[0]!.label} »`,`goal “${liste[0]!.label}”`)
     :propositions.length?propositions.map(p=>`${parGoal(p.id).label} ${nombre(p.centimes/100)}${p.solde?l(' (atteint)',' (reached)'):''}`).join(' · ')
     :l('tous les objectifs sont atteints','all goals are reached'),
    details:surplus>0
     ?l(`${verse===0?(plusieurs?'Objectifs atteints. ':'Objectif atteint. '):''}${nombre(surplus)} ${devise} restent à répartir.`,
        `${verse===0?(plusieurs?'Goals reached. ':'Goal reached. '):''}${nombre(surplus)} ${devise} remain unallocated.`)
     :undefined
   };
  };
  for(const [cle,type,nom,couleur,m] of [
   ['reserve','reserve_joie',l('Réserve de joie','Family joy reserve'),'#2f9e62',montants.reserve],
   ['investir','epargne_investir',l('Pour investir','For investing'),'#2f6fe0',montants.investir],
   ['autre','autre',l('Autre objectif','Other goal'),'#c2410c',montants.autre]
  ] as const){
   if(m<=0)continue;
   const liste=objectifs(type);
   out.push({cle,nom,couleur,...(liste.length?partObjectif(liste,m,!decoches[cle]):{
    montant:m,parts:[],possible:false,
    destination:l(`crée d’abord un objectif en ${devise} dans SÉNEVÉ Finance`,`first create a ${devise} goal in SÉNEVÉ Finance`)
   })});
  }
  if(montants.dettes>0){
   const dettes=(s?.debts??[]).filter(d=>d.currency===devise).map(d=>({d,reste:Math.round(Number(d.opening_balance)*100)-d.payments.reduce((n,p)=>n+Math.round(Number(p.amount)*100),0)}));
   const {propositions,surplus}=repartirSurDettes(Math.round(montants.dettes*100),dettes.map(x=>({id:x.d.debt_id,resteCentimes:x.reste})));
   const noms=propositions.map(p=>{const d=dettes.find(x=>x.d.debt_id===p.id)!.d;return `${d.creditor_name??l(`Dette ${d.debt_number}`,`Debt ${d.debt_number}`)} ${nombre(p.centimes/100)}${p.solde?l(' (soldée)',' (paid off)'):''}`;});
   const total=propositions.reduce((n,p)=>n+p.centimes,0)/100;
   out.push({cle:'dettes',nom:l('Dettes','Debts'),destination:propositions.length?noms.join(' · '):l(`aucune dette en ${devise} dans SÉNEVÉ Suivi des dettes`,`no ${devise} debt in SÉNEVÉ Debt tracker`),montant:propositions.length?total:montants.dettes,parts:propositions.map(p=>({part:'dettes',debt_id:p.id,amount:chaine(p.centimes/100)})),possible:propositions.length>0,couleur:'#e0662f'});
   // Une part prévue peut dépasser toutes les dettes encore ouvertes. La différence
   // reste au participant : jamais de faux remboursement ni de transfert automatique.
   // Une case explicite permet de l'affecter à « Pour vivre ».
   if(surplus>0&&decoches.dettes!==true){
    const montantSurplus=surplus/100;
    const totalRestant=dettes.reduce((n,x)=>n+Math.max(0,x.reste),0)/100;
    const details=l(`Part dettes : ${nombre(montants.dettes)} ${devise} · dettes restantes : ${nombre(totalRestant)} ${devise} · excédent : ${nombre(montantSurplus)} ${devise}`,`Debt share: ${nombre(montants.dettes)} ${devise} · remaining debts: ${nombre(totalRestant)} ${devise} · surplus: ${nombre(montantSurplus)} ${devise}`);
    const objectifsInvestissement=destinationSurplus==='investissement'?objectifs('epargne_investir'):[];
    const partInvestie=objectifsInvestissement.length?partObjectif(objectifsInvestissement,montantSurplus,true):null;
    const partsSurplus:PartRepartition[]=destinationSurplus==='vivre'
     ?[{part:'vivre',amount:chaine(montantSurplus)}]:partInvestie?.parts??[];
    const destination=destinationSurplus==='vivre'?l('Pour vivre','For living')
     :destinationSurplus==='solde'?l('Solde à répartir · reste à répartir plus tard','Balance to allocate · stays to allocate later')
     :destinationSurplus==='investissement'?partInvestie?.destination??l('objectif d’investissement à choisir','investment goal to choose')
     :l('destination obligatoire à choisir','required destination to choose');
    out.push({cle:'surplus_dettes',nom:l('Excédent à affecter','Surplus to allocate'),destination,
     montant:partInvestie?.montant??montantSurplus,montantInitial:montantSurplus,parts:partsSurplus,possible:partsSurplus.length>0,
     couleur:'#5b4ee8',details:[details,partInvestie?.details].filter(Boolean).join(' ')});
   }
  }
  if(montants.vivre>0)out.push({cle:'vivre',nom:l('Pour vivre','For living'),destination:l('Pour vivre','For living'),montant:montants.vivre,parts:[{part:'vivre',amount:chaine(montants.vivre)}],possible:true,couleur:'#a1a1a6'});
  const retour=montants.retour??0;
  if(retour>0){
   const investis=destinationRetour==='investissement'?objectifs('epargne_investir'):[];
   const partInvestie=investis.length?partObjectif(investis,retour,true):null;
   const parts:PartRepartition[]=destinationRetour==='vivre'?[{part:'vivre',amount:chaine(retour)}]:partInvestie?.parts??[];
   out.push({cle:'retour',nom:l('Déjà réparti, revenu au solde','Already allocated, back in balance'),couleur:'#8e8e93',
    destination:destinationRetour==='vivre'?l('Pour vivre','For living'):destinationRetour==='investissement'?partInvestie?.destination??l('objectif d’investissement à créer','investment goal to create'):l('Reste dans le solde à répartir','Stays in the balance to allocate'),
    montant:partInvestie?.montant??retour,montantInitial:retour,parts,possible:parts.length>0,
    details:[l('Aucun pourcentage : cet argent a déjà été réparti.','No percentages: this money was already allocated.'),partInvestie?.details].filter(Boolean).join(' ')});
  }
  return out.filter(x=>x.montant>0||x.details);
 },[suivi,compteurs,cleMontants,devise,en,objectifsChoisis,destinationSurplus,destinationRetour,decoches]);
 const ligneSurplus=lignes.find(x=>x.cle==='surplus_dettes');
 const montantSurplus=ligneSurplus?.montantInitial??0;
 const montantRetour=lignes.find(x=>x.cle==='retour')?.montantInitial??0;
 const investiHorsParts=(destinationSurplus==='investissement'?montantSurplus:0)+(destinationRetour==='investissement'?montantRetour:0);
 const candidatsInvestir=suivi&&typeof suivi==='object'?suivi.savings_goals.filter(g=>g.goal_type==='epargne_investir'&&g.currency===devise):[];
 const choisies=lignes.filter(x=>x.possible&&coche(x.cle));
 const typesObjectifs:[TypeObjectifEpargne,number][]=[
  ['reserve_joie',montants.reserve],['epargne_investir',Math.max(montants.investir,investiHorsParts)],['autre',montants.autre]
 ];
 // Plus de choix obligatoire : « Automatique » est le réglage par défaut. Seul l'excédent envoyé vers
 // l'investissement sans objectif « Pour investir » bloque l'enregistrement.
 const selectionManquante=!!suivi&&typeof suivi==='object'&&typesObjectifs.some(([type,montant])=>
  montant>0&&type==='epargne_investir'&&(destinationSurplus==='investissement'||destinationRetour==='investissement')&&!suivi.savings_goals.some(g=>g.goal_type===type&&g.currency===devise));
 const choixSurplusManquant=!!ligneSurplus&&!destinationSurplus;
 const total=choisies.reduce((n,x)=>n+x.montant,0);
 async function enregistrer(){
  if(!suivi||typeof suivi!=='object'||!choisies.length||selectionManquante||choixSurplusManquant||enCours)return;
  setEnCours(true);setErreur('');
  try{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>aujourdhui()){setErreur(l('Choisis une date qui n’est pas dans le futur.','Choose a date that is not in the future.'));setEnCours(false);return;}
   await enregistrerRepartition(suivi.enrollment_id,devise,date,choisies.flatMap(x=>x.parts),demande.current,depuisEncaissements);
   const soldees=lignes.find(x=>x.cle==='dettes'&&x.possible&&coche('dettes'))?.destination.match(/\((soldée|paid off)\)/g)?.length??0;
   navigate(`/habitudes/compteurs${en?'?lang=en':''}`,{state:{message:l(`Répartition enregistrée : ${choisies.length} part${choisies.length>1?'s':''}, ${nombre(total)} ${devise}.${soldees?` ${soldees} dette${soldees>1?'s':''} soldée${soldees>1?'s':''}.`:''}`,`Allocation saved: ${choisies.length} part${choisies.length>1?'s':''}, ${nombre(total)} ${devise}.${soldees?` ${soldees} debt${soldees>1?'s':''} paid off.`:''}`)}});
  }catch(e){setErreur(e instanceof CompteursIndisponibles?l('Les compteurs ne sont pas encore ouverts. Réessaie un peu plus tard.','Counters are not open yet. Try again a little later.'):e&&typeof e==='object'&&'code' in e&&e.code==='PFC01'?l('Le disponible d’un objectif a changé. Ferme puis rouvre la répartition pour recalculer les parts.','A goal balance changed. Close and reopen the allocation to recalculate the shares.'):l('La répartition n’a pas été enregistrée. Vérifie les montants et réessaie.','The allocation was not saved. Check the amounts and try again.'));setEnCours(false);}
 }
 return <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="hd-feuille-titre">
  <button type="button" aria-label={l('Fermer','Close')} className="absolute inset-0 bg-black/30" onClick={onFermer}/>
  <div className="sim-ios hd-classique relative max-h-[88vh] overflow-y-auto rounded-t-[14px] px-4 pb-8 pt-2 shadow-[0_-8px_30px_rgba(0,0,0,.18)]" style={{background:'var(--ios-fond,#f2f2f7)'}}>
   <div aria-hidden="true" className="mx-auto mb-2.5 h-[5px] w-9 rounded-full bg-[#c7c7cc]"/>
   <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-center"><button type="button" onClick={onFermer} className="justify-self-start text-[17px]" style={{color:'var(--ios-accent,#5b4ee8)',minHeight:44}}>{l('Annuler','Cancel')}</button><h2 id="hd-feuille-titre" className="text-[17px] font-semibold" style={{margin:0}}>{l('Enregistrer','Save')}</h2><span/></div>
   <p className="sim-ios-sous">{l('Vérifie chaque part. « Dettes » est cochée : cela note le remboursement. Décoche-la si tu n’as pas encore donné l’argent. Si la part Dettes dépasse les dettes restantes, choisis obligatoirement où affecter l’excédent : vivre, investir ou le garder dans le solde à répartir. Aucun argent n’est transféré automatiquement.','Review each share. “Debts” is ticked: this records the repayment. Untick it if you have not paid the money yet. If the Debts share exceeds what is still owed, choose where to allocate the surplus: living, investing or keep it in the balance to allocate. No money is transferred automatically.')}</p>
   <div className="sim-ios-groupe mb-3"><div className="sim-ios-ligne"><label htmlFor="hd-repartition-date">{l('Date de la répartition','Allocation date')}</label><input id="hd-repartition-date" type="date" max={aujourdhui()} value={date} onChange={e=>{demande.current=crypto.randomUUID();setDate(e.target.value);}} style={{width:150,color:'var(--ios-accent,#5b4ee8)'}}/></div></div>
   {suivi===null&&<p role="status" className="rounded-xl bg-white p-4">{l('Chargement de ton suivi…','Loading your tracker…')}</p>}
   {(suivi==='aucun'||suivi==='erreur')&&<p role="alert" className="rounded-xl bg-white p-4">{suivi==='aucun'?l('Connecte-toi avec un accès actif à Habitudes & Défis pour enregistrer ta répartition.','Sign in with active Habits & Challenges access to save your allocation.'):l('Ton suivi n’est pas disponible pour le moment.','Your tracker is not available right now.')}</p>}
   {suivi&&typeof suivi==='object'&&<>
    {/* Le choix de l'excédent s'affiche juste sous la ligne « Excédent à affecter » (demande du 10/11/2026). */}
    {(()=>{
     const iSurplus=lignes.findIndex(x=>x.cle==='surplus_dettes');
     const liste=(xs:Ligne[])=>xs.length>0&&<ul className="sim-ios-groupe" style={{listStyle:'none',margin:'0 0 0',padding:0}}>
      {xs.map(x=><li key={x.cle} className="sim-ios-ligne" style={{minHeight:62,opacity:x.possible&&coche(x.cle)?1:.5}}>
       <input id={`hd-part-${x.cle}`} type="checkbox" disabled={!x.possible||x.cle==='surplus_dettes'||x.cle==='retour'} checked={x.possible&&coche(x.cle)} onChange={e=>{if(x.cle==='surplus_dettes'||x.cle==='retour')return;demande.current=crypto.randomUUID();setDecoches(c=>({...c,[x.cle]:!e.target.checked}));}} style={{width:24,height:24,accentColor:'var(--ios-accent,#5b4ee8)',flex:'none'}}/>
       <label htmlFor={`hd-part-${x.cle}`} style={{flex:1,minWidth:0}}><span className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-sm" style={{background:x.couleur}}/>{x.nom}</span><small className="block text-[13px] text-hd-on-surface-variant">→ {x.destination}</small>{x.details&&<small className="block text-[12px] text-hd-on-surface-variant">{x.details}</small>}</label>
       <b className="tabular-nums whitespace-nowrap">{nombre(x.montant)} {devise}</b>
      </li>)}
     </ul>;
     // La ligne « Déjà réparti » a aussi son menu, juste en dessous d'elle (toujours en dernier).
     const iRetour=lignes.findIndex(x=>x.cle==='retour');
     const finRetour=iRetour<0?null:<>
      <ChoixIOS id="hd-retour" aChoisir={l('Choisir','Choose')} libelle={l(`Déjà réparti · ${nombre(montantRetour)} ${devise}`,`Already allocated · ${nombre(montantRetour)} ${devise}`)} titre={l(`Où va l’argent déjà réparti (${nombre(montantRetour)} ${devise}) ?`,`Where does the already allocated money (${nombre(montantRetour)} ${devise}) go?`)}
       valeur={destinationRetour} onChoisir={v=>{demande.current=crypto.randomUUID();setDestinationRetour(v as 'solde'|'vivre'|'investissement');}}
       options={[
        {cle:'solde',titre:l('Laisser dans le solde','Keep in the balance'),aide:l('Rien n’est noté ; aucun pourcentage ne sera repris dessus.','Nothing is recorded; no percentages will be taken from it.'),icone:'pie_chart',couleur:'#8e8e93'},
        {cle:'vivre',titre:l('Pour vivre','For living'),aide:l('Noté pour vivre, en entier.','Recorded for living, in full.'),icone:'payments',couleur:'#34c759'},
        {cle:'investissement',titre:l('Investissement','Investment'),aide:l('Versé sur tes objectifs « Pour investir ».','Paid into your “For investing” goals.'),icone:'potted_plant',couleur:'#007aff'}]}/>
      {destinationRetour==='investissement'&&candidatsInvestir.length===0&&<p role="alert" className="sim-ios-note">{l('Crée d’abord un objectif « Pour investir » dans SÉNEVÉ Finance.','First create a “For investing” goal in SÉNEVÉ Finance.')}</p>}
     </>;
     if(iSurplus<0)return iRetour<0?liste(lignes):<>{liste(lignes.slice(0,iRetour+1))}{finRetour}</>;
     return <>
      {liste(lignes.slice(0,iSurplus+1))}
      <ChoixIOS id="hd-surplus" aChoisir={l('Choisir','Choose')} libelle={l(`Excédent · ${nombre(montantSurplus)} ${devise}`,`Surplus · ${nombre(montantSurplus)} ${devise}`)} titre={l(`Où va l’excédent de ${nombre(montantSurplus)} ${devise} ?`,`Where does the ${nombre(montantSurplus)} ${devise} surplus go?`)}
       valeur={destinationSurplus} onChoisir={v=>{demande.current=crypto.randomUUID();setDestinationSurplus(v as 'vivre'|'investissement'|'solde');}}
       options={[
        {cle:'vivre',titre:l('Pour vivre','For living'),aide:l('Ajouté à ta part pour vivre.','Added to your living share.'),icone:'payments',couleur:'#34c759'},
        {cle:'investissement',titre:l('Investissement','Investment'),aide:l('Versé sur tes objectifs « Pour investir ».','Paid into your “For investing” goals.'),icone:'potted_plant',couleur:'#007aff'},
        {cle:'solde',titre:l('Solde à répartir','Balance to allocate'),aide:l('Rien n’est noté : l’argent reste à répartir plus tard.','Nothing is recorded: the money stays to allocate later.'),icone:'pie_chart',couleur:'#8e8e93'}]}/>
      {destinationSurplus==='investissement'&&candidatsInvestir.length===0&&<p role="alert" className="sim-ios-note">{l('Crée d’abord un objectif « Pour investir » dans SÉNEVÉ Finance pour enregistrer cet excédent.','First create a “For investing” goal in SÉNEVÉ Finance to record this surplus.')} <Link to={en?'/habitudes/epargne?lang=en':'/habitudes/epargne'} className="underline">{l('Ouvrir SÉNEVÉ Finance','Open SÉNEVÉ Finance')}</Link></p>}
      {choixSurplusManquant&&<p role="status" className="sim-ios-note" style={{color:'var(--ios-encre,#1c1c1e)'}}>{l('Sélectionne « Pour vivre », « Investissement » ou « Solde à répartir » pour continuer.','Select “For living”, “Investment” or “Balance to allocate” to continue.')}</p>}
      {lignes.length>iSurplus+1&&<div style={{marginTop:14}}>{liste(lignes.slice(iSurplus+1,iRetour<0?undefined:iRetour+1))}</div>}
      {finRetour}
     </>;
    })()}
    {/* Choix de l'objectif façon Réglages iOS : Automatique d'abord, puis un objectif précis. */}
    {(['reserve_joie','epargne_investir','autre'] as const).map(type=>{
     const montantsType={reserve_joie:montants.reserve,epargne_investir:Math.max(montants.investir,investiHorsParts),autre:montants.autre};
     const objectifs=suivi.savings_goals.filter(g=>g.goal_type===type&&g.currency===devise);
     if(montantsType[type]<=0||objectifs.length<2)return null;
     const nom=type==='reserve_joie'?l('Réserve de joie','Family joy reserve'):type==='epargne_investir'?l('Pour investir','For investing'):l('Autre objectif','Other goal');
     const couleur=type==='reserve_joie'?'#2f9e62':type==='epargne_investir'?'#2f6fe0':'#c2410c';
     return <ChoixIOS key={type} id={`hd-choix-${type}`} aChoisir={l('Choisir','Choose')} libelle={l(`Objectif · ${nom}`,`Goal · ${nom}`)} titre={l(`Choisir l’objectif : ${nom}`,`Choose goal: ${nom}`)}
      valeur={objectifsChoisis[type]??''} onChoisir={v=>{demande.current=crypto.randomUUID();setObjectifsChoisis(prev=>({...prev,[type]:v}));}}
      options={[{cle:'',titre:l('Automatique','Automatic'),aide:l('D’abord l’objectif à qui il manque le moins, puis le suivant.','First the goal closest to completion, then the next.'),icone:'tune',couleur},
       ...objectifs.map(g=>({cle:g.goal_id,titre:g.label,aide:l(`Toute la part sur « ${g.label} » · il manque ${nombre(Math.max(0,Math.round(Number(g.target_amount)*100)-disponibleObjectif(compteurs,g.goal_id,g.entries))/100)} ${devise}`,`The whole share to “${g.label}” · ${nombre(Math.max(0,Math.round(Number(g.target_amount)*100)-disponibleObjectif(compteurs,g.goal_id,g.entries))/100)} ${devise} still needed`),icone:'bookmark',couleur}))]}/>;
    })}
    <button type="button" disabled={!choisies.length||selectionManquante||choixSurplusManquant||enCours} onClick={()=>void enregistrer()} className="sim-ios-bouton disabled:opacity-50" style={{marginTop:14}}><IconeHD nom="check_circle" className="mr-2 text-[20px]"/>{enCours?l('Enregistrement…','Saving…'):choisies.length?l(`Enregistrer ${choisies.length} part${choisies.length>1?'s':''} · ${nombre(total)} ${devise}`,`Save ${choisies.length} part${choisies.length>1?'s':''} · ${nombre(total)} ${devise}`):l('Coche au moins une part','Tick at least one part')}</button>
    {erreur&&<p role="alert" className="sim-ios-alerte">{erreur}</p>}
    <p className="sim-ios-note">{depuisEncaissements?l('Les montants décochés restent dans le solde à répartir, sans nouveau pourcentage.','Unticked amounts stay in the balance to allocate, with no new percentages.'):l('Tu peux noter les parts décochées plus tard.','You can record unticked shares later.')}</p>
   </>}
  </div>
 </div>;
}

type OptionIOS={cle:string;titre:string;aide:string;icone:string;couleur:string};
/** Menu compact façon iOS (demande du 10/11/2026 : la liste était trop longue) : une seule ligne montre le choix
 * actuel ; un appui ouvre un petit menu avec une coche bleue sur l'option choisie ; choisir referme le menu.
 * Styles en ligne pour ne pas être écrasés par les feuilles de style anciennes. */
function ChoixIOS({id,titre,libelle,aChoisir,options,valeur,onChoisir}:{id:string;titre:string;libelle:string;aChoisir:string;options:OptionIOS[];valeur:string|null;onChoisir:(cle:string)=>void}){
 const [ouvert,setOuvert]=useState(false);
 const racine=useRef<HTMLDivElement>(null),bouton=useRef<HTMLButtonElement>(null);
 const actuelle=options.find(o=>o.cle===valeur);
 useEffect(()=>{
  if(!ouvert)return;
  const dehors=(e:PointerEvent)=>{if(racine.current&&!racine.current.contains(e.target as Node))setOuvert(false);};
  const echap=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOuvert(false);bouton.current?.focus();}};
  document.addEventListener('pointerdown',dehors);document.addEventListener('keydown',echap);
  return()=>{document.removeEventListener('pointerdown',dehors);document.removeEventListener('keydown',echap);};
 },[ouvert]);
 return <div ref={racine} style={{marginTop:12}}>
  <div className="sim-ios-groupe">
   <button ref={bouton} type="button" aria-haspopup="true" aria-expanded={ouvert} aria-controls={`${id}-menu`} aria-label={`${titre} : ${actuelle?.titre??aChoisir}`}
    onClick={()=>setOuvert(o=>!o)} className="sim-ios-ligne sim-ios-choix" style={{minHeight:52}}>
    <span aria-hidden="true" className="sim-ios-pastille" style={{background:actuelle?.couleur??'#c7c7cc',color:'#fff'}}><IconeHD nom={actuelle?.icone??'help_outline'} taille={18}/></span>
    <span className="sim-ios-choix-texte"><span>{libelle}</span></span>
    <span style={{display:'inline-flex',alignItems:'center',gap:4,maxWidth:'50%',fontSize:16,color:actuelle?'var(--ios-accent,#007aff)':'#ff9500',fontWeight:actuelle?400:600}}>
     <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{actuelle?.titre??aChoisir}</span>
     <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" style={{flex:'none',transform:ouvert?'rotate(180deg)':undefined,transition:'transform .2s ease'}}><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </span>
   </button>
  </div>
  {ouvert&&<div id={`${id}-menu`} role="radiogroup" aria-label={titre} style={{marginTop:6,overflow:'hidden',borderRadius:14,background:'var(--ios-carte,#fff)',boxShadow:'0 10px 30px rgb(0 0 0 / .16),0 0 0 .5px rgb(0 0 0 / .06)'}}>
   {options.map(o=>{const choisi=valeur===o.cle;return <button key={o.cle||'auto'} type="button" role="radio" aria-checked={choisi} aria-label={o.titre} aria-describedby={`${id}-aide-${o.cle||'auto'}`}
     onClick={()=>{onChoisir(o.cle);setOuvert(false);bouton.current?.focus();}} className="sim-ios-ligne sim-ios-choix" style={{minHeight:48,paddingTop:6,paddingBottom:6}}>
    <span aria-hidden="true" data-choisi={choisi} style={{display:'inline-flex',flex:'none',width:20,justifyContent:'center',color:'#007aff'}}>
     {choisi&&<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </span>
    <span className="sim-ios-choix-texte"><span style={{fontWeight:choisi?600:400}}>{o.titre}</span><small id={`${id}-aide-${o.cle||'auto'}`}>{o.aide}</small></span>
    <span aria-hidden="true" className="sim-ios-pastille" style={{width:26,height:26,background:o.couleur,color:'#fff'}}><IconeHD nom={o.icone} taille={16}/></span>
   </button>;})}
  </div>}
 </div>;
}
