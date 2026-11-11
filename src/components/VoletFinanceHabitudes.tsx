import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {IconeHD} from './IconeHabitudes';
import {IconeVolet} from './IconeVolet';
import {SimulateurEpargne} from './SimulateurEpargne';
import {suiviFinancierActive} from '@/lib/habitudes-configuration';
import {chargerSuiviFinancier,type DetteSuivie,type SuiviFinancier} from '@/lib/habitudes-finances-suivi';
import {chargerCompteursOuAbsents,disponibleObjectif,type Compteurs} from '@/lib/habitudes-finances-compteurs';
import {decimalesDevise} from '@/lib/devises';
import './VoletFinanceHabitudes.css';

/** Volet « SÉNEVÉ Finance » de la page Aujourd'hui (demande de Dr Justin du 08/11/2026) :
 * remplace « Épargne » ; on y voit d'un coup ses objectifs, son suivi des dettes et le simulateur.
 * Les montants sont les mêmes que dans SÉNEVÉ Finance et SÉNEVÉ Suivi des dettes (versements − retraits ; dû − remboursé). */
type Onglet='epargne'|'dettes'|'simulateur';
const cents=(v:string)=>Math.round(Number(v)*100);
const resteDette=(d:DetteSuivie)=>Math.max(0,cents(d.opening_balance)-d.payments.reduce((n,p)=>n+cents(p.amount),0));
/** Couleur par type d'objectif, comme à la création (Réserve orange, Investir vert, Autre violet). */
const TEINTE:Record<string,string>={reserve_joie:'#ff9500',epargne_investir:'#34c759',autre:'#5856d6'};
function montant(c:number,devise:string,en:boolean){const dec=decimalesDevise(devise);return `${new Intl.NumberFormat(en?'en-US':'fr-FR',{minimumFractionDigits:c%100===0?0:dec,maximumFractionDigits:dec}).format(c/100)} ${devise}`;}

export function VoletFinanceHabitudes({langue}:{langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr,q=en?'?lang=en':'';
 const actif=suiviFinancierActive();
 const [ouvert,setOuvert]=useState(false),[onglet,setOnglet]=useState<Onglet>(actif?'epargne':'simulateur');
 const [suivi,setSuivi]=useState<SuiviFinancier|null|undefined>(undefined),[cpt,setCpt]=useState<Compteurs|null>(null),[erreur,setErreur]=useState(false);
 useEffect(()=>{if(!ouvert||!actif||suivi!==undefined)return;let vivant=true;
  void chargerSuiviFinancier(null).then(async s=>{if(!vivant)return;setSuivi(s);if(s){const c=await chargerCompteursOuAbsents(s.enrollment_id);if(vivant)setCpt(c);}}).catch(()=>{if(vivant){setErreur(true);setSuivi(null);}});
  return()=>{vivant=false;};},[ouvert,actif,suivi]);
 const ONGLETS:[Onglet,string,string][]=actif?[['epargne',l('Épargne','Savings'),'potted_plant'],['dettes',l('Dettes','Debts'),'handshake'],['simulateur',l('Simulateur','Simulator'),'calculate']]:[];
 const lien=(vers:string,texte:string)=><Link to={vers} className="vf-lien"><span>{texte}</span><IconeHD nom="chevron_right" className="text-[20px]"/></Link>;
 const chargement=<p role="status" className="vf-note">{l('Chargement…','Loading…')}</p>;
 const objectifs=suivi?.savings_goals??[];
 const dettes=(suivi?.debts??[]).filter(d=>resteDette(d)>0);
 // Montant global de l'épargne, comme « Il reste à rembourser » côté dettes (demande du 10/11/2026).
 const epargneTotale=objectifs.reduce<Record<string,{dispo:number;cible:number}>>((m,g)=>{const t=m[g.currency]??{dispo:0,cible:0};return {...m,[g.currency]:{dispo:t.dispo+Math.max(0,disponibleObjectif(cpt,g.goal_id,g.entries)),cible:t.cible+cents(g.target_amount)}};},{});
 // Dettes : reste, montant de départ et part remboursée, comme côté épargne (demande du 11/11/2026).
 const totaux=dettes.reduce<Record<string,{reste:number;debut:number}>>((m,d)=>{const t=m[d.currency]??{reste:0,debut:0};return {...m,[d.currency]:{reste:t.reste+resteDette(d),debut:t.debut+cents(d.opening_balance)}};},{});
 return <details id="hd-epargne" className="hd-volet mb-hd-space-lg rounded-2xl bg-hd-surface-container-lowest p-hd-space-md shadow-sm" onToggle={e=>setOuvert(e.currentTarget.open)}>
  <summary className="list-none [&::-webkit-details-marker]:hidden min-h-[48px] cursor-pointer flex items-center gap-3 font-hd-label-lg text-hd-label-lg text-hd-on-surface"><IconeVolet nom="finance"/><span className="flex-1">SÉNEVÉ Finance</span><IconeHD nom="expand_more" className="hd-volet-chevron text-[22px] text-hd-on-surface-variant"/></summary>
  <div className="vf hd-classique pt-2">
   {actif&&<div role="tablist" aria-label="SÉNEVÉ Finance" className="vf-segment" style={{['--i' as string]:ONGLETS.findIndex(([o])=>o===onglet),['--n' as string]:ONGLETS.length}}>
    <span className="vf-curseur" aria-hidden="true"/>
    {ONGLETS.map(([o,nom,icone])=><button key={o} type="button" role="tab" aria-selected={onglet===o} onClick={()=>setOnglet(o)}><IconeHD nom={icone} className="vf-segment-icone"/>{nom}</button>)}
   </div>}
   {onglet==='epargne'&&<div role="tabpanel" aria-label={l('Épargne','Savings')}>
    {suivi===undefined?chargement:erreur?<p role="alert" className="vf-note">{l('Ton suivi ne peut pas être chargé pour le moment.','Your tracker cannot be loaded right now.')}</p>
     :!objectifs.length?<p className="vf-note">{l('Aucun objectif pour l’instant. Crée ta première semence dans SÉNEVÉ Finance.','No goal yet. Create your first seed in SÉNEVÉ Finance.')}</p>
     :<>
      <div className="vf-total vf-total-epargne">{Object.entries(epargneTotale).map(([dev,t])=><p key={dev}><small>{l('Mon épargne totale','My total savings')}</small><b>{montant(t.dispo,dev,en)}</b><small>{l('sur','of')} {montant(t.cible,dev,en)} · {t.cible>0?Math.min(100,Math.round(t.dispo/t.cible*100)):0} %</small></p>)}</div>
      <ul className="vf-liste">{objectifs.map(g=>{const dispo=disponibleObjectif(cpt,g.goal_id,g.entries),cible=cents(g.target_amount),pct=cible>0?Math.min(100,Math.round(dispo/cible*100)):0;
       return <li key={g.goal_id} className="vf-ligne"><span className="vf-anneau" style={{['--p' as string]:`${pct}%`,['--c' as string]:TEINTE[g.goal_type]??'#34c759'}} aria-hidden="true"/><span className="vf-nom"><b>{g.label}</b><small>{montant(Math.max(0,dispo),g.currency,en)} {l('sur','of')} {montant(cible,g.currency,en)}</small></span><span className="vf-pct">{pct} %</span></li>;})}</ul>
     </>}
    {lien(`/habitudes/epargne${q}`,l('Ouvrir SÉNEVÉ Finance','Open SÉNEVÉ Finance'))}
   </div>}
   {onglet==='dettes'&&<div role="tabpanel" aria-label={l('Dettes','Debts')}>
    {suivi===undefined?chargement:erreur?<p role="alert" className="vf-note">{l('Ton suivi ne peut pas être chargé pour le moment.','Your tracker cannot be loaded right now.')}</p>
     :!dettes.length?<p className="vf-note">{l('Aucune dette à rembourser. Tu peux en noter une dans SÉNEVÉ Suivi des dettes.','No debt to repay. You can add one in SÉNEVÉ Debt tracker.')}</p>
     :<>
      <div className="vf-total">{Object.entries(totaux).map(([dev,t])=><p key={dev}><small>{l('Il reste à rembourser','Still to repay')}</small><b>{montant(t.reste,dev,en)}</b><small>{l('sur','of')} {montant(t.debut,dev,en)} · {t.debut>0?Math.round((t.debut-t.reste)/t.debut*100):0} % {l('remboursé','repaid')}</small></p>)}</div>
      <ul className="vf-liste">{dettes.map(d=>{const debut=cents(d.opening_balance),reste=resteDette(d),pct=debut>0?Math.round((debut-reste)/debut*100):0;
       return <li key={d.debt_id} className="vf-ligne"><span className="vf-anneau vf-anneau-dette" style={{['--p' as string]:`${pct}%`}} aria-hidden="true"/><span className="vf-nom"><b>{d.creditor_name||l(`Dette ${d.debt_number}`,`Debt ${d.debt_number}`)}</b><small>{l('Reste','Left')} {montant(reste,d.currency,en)} {l('sur','of')} {montant(debut,d.currency,en)}</small></span><span className="vf-pct">{pct} %</span></li>;})}</ul>
     </>}
    {lien(`/habitudes/dettes${q}`,l('Ouvrir SÉNEVÉ Suivi des dettes','Open SÉNEVÉ Debt tracker'))}
   </div>}
   {onglet==='simulateur'&&<div role="tabpanel" aria-label={l('Simulateur','Simulator')} className="sim-ios-dans-volet"><SimulateurEpargne langue={langue} replie={false}/></div>}
   {actif&&<nav aria-label={l('Raccourcis SÉNEVÉ Finance','SÉNEVÉ Finance shortcuts')} className="vf-raccourcis">
    <Link to={`/habitudes/compteurs${q}`}><span aria-hidden="true" className="vf-tuile" style={{background:'#5856d6'}}><IconeHD nom="account_balance" className="text-[18px]"/></span><span className="vf-raccourci-texte"><b>SÉNEVÉ {l('Compte','Account')}</b><small>{l('Mes caisses et mon bilan','My counters and summary')}</small></span><IconeHD nom="chevron_right" className="vf-raccourci-chevron text-[20px]"/></Link>
    <Link to={`/habitudes/repartition${q}`}><span aria-hidden="true" className="vf-tuile" style={{background:'#ff9500'}}><IconeHD nom="pie_chart" className="text-[18px]"/></span><span className="vf-raccourci-texte"><b>SÉNEVÉ {l('Répartition','Allocation')}</b><small>{l('Quand je reçois de l’argent','When I receive money')}</small></span><IconeHD nom="chevron_right" className="vf-raccourci-chevron text-[20px]"/></Link>
   </nav>}
  </div>
 </details>;
}
