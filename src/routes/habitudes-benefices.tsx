import '@/components/SimulateurEpargne.css';
import './habitudes-depenses.css';
import './habitudes-benefices.css';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {ComptePrive} from '@/components/ComptePrive';
import {IconeHD} from '@/components/IconeHabitudes';
import {suiviFinancierActive} from '@/lib/habitudes-configuration';
import {chargerSuiviFinancier} from '@/lib/habitudes-finances-suivi';
import {bilanDuMois,chargerBenefices,derniersMois,type Benefices} from '@/lib/habitudes-finances-benefices';
import {moisPrecedent,moisSuivant} from '@/lib/habitudes-finances-depenses';
import {decimalesDevise} from '@/lib/devises';
import {NotFound} from '@/routes/introuvable';

/** SÉNEVÉ Bénéfices (décision de Dr Justin du 11/11/2026, une seule activité) :
 * ce que rapporte l'activité, mois par mois, à partir des ventes notées dans SÉNEVÉ Répartition (aucune nouvelle saisie).
 * Bénéfice = ventes − marchandises − autres frais − charges du mois payées. Sans commerce : les revenus reçus du mois. */
const aujourdhui=()=>new Intl.DateTimeFormat('en-CA').format(new Date());

export function RouteHabitudesBenefices(){
 return suiviFinancierActive()?<ComptePrive enfants={userId=><HabitudesBenefices userId={userId}/>}/>:<NotFound/>;
}

export function HabitudesBenefices({userId}:{userId:string}){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr;
 const suffixe=en?'?lang=en':'';
 const [donnees,setDonnees]=useState<Benefices|null>(null),[etat,setEtat]=useState<'chargement'|'pret'|'vide'|'erreur'>('chargement');
 const [devise,setDevise]=useState(''),[mois,setMois]=useState(()=>aujourdhui().slice(0,7));

 const charger=useCallback(async()=>{
  try{const s=await chargerSuiviFinancier(null);if(!s){setEtat('vide');return;}setDonnees(await chargerBenefices(s.enrollment_id));setEtat('pret');}
  catch{setEtat('erreur');}
 },[userId]);
 useEffect(()=>{void charger();},[charger]);
 useEffect(()=>{document.title=l('SÉNEVÉ Bénéfices','SÉNEVÉ Profits');document.documentElement.lang=langue;},[langue]);

 const devises=useMemo(()=>{const s=new Set<string>();donnees?.ventes.forEach(v=>s.add(v.currency));donnees?.revenus.forEach(v=>s.add(v.currency));return [...s];},[donnees]);
 const dev=devise&&devises.includes(devise)?devise:devises[0]??'USD';
 const dec=decimalesDevise(dev);
 const nombre=(c:number)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{minimumFractionDigits:Math.abs(c)%100===0?0:dec,maximumFractionDigits:dec}).format(c/100);
 const nomMois=(m:string,court=false)=>{const t=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',court?{month:'short',timeZone:'UTC'}:{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-01T00:00:00Z'));return t.charAt(0).toUpperCase()+t.slice(1).replace('.','');};
 const vide={ventes:[],revenus:[]};
 const b=bilanDuMois(donnees??vide,mois,dev),avant=bilanDuMois(donnees??vide,moisPrecedent(mois),dev);
 const commerce=(donnees?.ventes.length??0)>0;
 const moisCourant=aujourdhui().slice(0,7);
 const marge=b.ventes>0?Math.round(b.benefice/b.ventes*100):null;
 const ecart=b.benefice-avant.benefice;
 const serie=derniersMois(mois,6).map(m=>({m,v:bilanDuMois(donnees??vide,m,dev).benefice}));
 const maxSerie=Math.max(1,...serie.map(x=>Math.abs(x.v)));

 return <CadreHabitudes titre={l('SÉNEVÉ Bénéfices','SÉNEVÉ Profits')} langue={langue} retour={`/espace${suffixe}`} retourLibelle={l('Revenir à ma journée','Back to my day')} liens={{aujourdhui:`/espace${suffixe}`}} actif="aujourdhui" cloche>
  <div className="dp-page bn-page sim-ios mx-auto flex w-full max-w-xl flex-col px-hd-margin pt-hd-space-md pb-hd-space-lg">
   <h1 className="dp-titre">{l('SÉNEVÉ Bénéfices','SÉNEVÉ Profits')}</h1>
   <p className="dp-intro">{l('Ce que rapporte ton activité, à partir des ventes notées dans SÉNEVÉ Répartition. Rien à saisir ici.','What your business brings in, from the sales recorded in SÉNEVÉ Allocation. Nothing to enter here.')}</p>

   {etat==='chargement'&&<p role="status" className="dp-carte-info">{l('Chargement…','Loading…')}</p>}
   {etat==='erreur'&&<p role="alert" className="dp-carte-info">{l('Tes bénéfices ne sont pas disponibles pour le moment.','Your profits are not available right now.')}</p>}
   {etat==='vide'&&<p className="dp-carte-info">{l('Le suivi des bénéfices est disponible avec un accès actif à Habitudes & Défis.','Profit tracking is available with active Habits & Challenges access.')}</p>}

   {etat==='pret'&&<>
    {devises.length>1&&<div role="radiogroup" aria-label={l('Monnaie','Currency')} className="dp-devises">{devises.map(d=><button key={d} type="button" role="radio" aria-checked={d===dev} onClick={()=>setDevise(d)}>{d}</button>)}</div>}

    <section className={`dp-heros bn-heros${b.benefice<0?' bn-perte':''}`} aria-labelledby="bn-total">
     <div className="dp-mois">
      <button type="button" onClick={()=>setMois(moisPrecedent(mois))} aria-label={l('Mois précédent','Previous month')}><IconeHD nom="chevron_left" className="text-[22px]"/></button>
      <span>{nomMois(mois)}</span>
      <button type="button" onClick={()=>setMois(moisSuivant(mois))} disabled={mois>=moisCourant} aria-label={l('Mois suivant','Next month')}><IconeHD nom="chevron_right" className="text-[22px]"/></button>
     </div>
     {commerce?<>
      <small className="dp-heros-etiquette">{b.benefice<0?l('Perte du mois','Loss this month'):l('Bénéfice du mois','Profit this month')}</small>
      <b id="bn-total" className="dp-heros-total">{nombre(b.benefice)} {dev}</b>
      <p className="dp-heros-ecart">{marge!==null?l(`Marge : ${marge} % des ventes · ${b.nbVentes} encaissement${b.nbVentes>1?'s':''}`,`Margin: ${marge}% of sales · ${b.nbVentes} receipt${b.nbVentes>1?'s':''}`):l('Aucune vente notée ce mois-ci.','No sales recorded this month.')}</p>
      <p className="dp-heros-ecart bn-ecart">{avant.ventes===0?l('Aucune vente notée le mois précédent.','No sales recorded the previous month.'):ecart===0?l('Autant que le mois précédent.','Same as the previous month.'):ecart>0?l(`${nombre(ecart)} ${dev} de plus que le mois précédent.`,`${nombre(ecart)} ${dev} more than the previous month.`):l(`${nombre(-ecart)} ${dev} de moins que le mois précédent.`,`${nombre(-ecart)} ${dev} less than the previous month.`)}</p>
     </>:<>
      <small className="dp-heros-etiquette">{l('Revenus reçus ce mois','Income received this month')}</small>
      <b id="bn-total" className="dp-heros-total">{nombre(b.revenus)} {dev}</b>
      <p className="dp-heros-ecart">{l('Total des montants que tu as répartis ce mois-ci.','Total of the amounts you allocated this month.')}</p>
     </>}
    </section>

    {commerce&&<>
     <h2 className="dp-section">{l('Le calcul du mois','This month’s calculation')}</h2>
     <ul className="dp-liste bn-calcul">
      <li><span className="dp-icone" style={{background:'#34c759'}} aria-hidden="true"><IconeHD nom="payments" className="text-[18px]"/></span><span className="dp-ligne-texte"><b>{l('Ventes encaissées','Sales received')}</b></span><span className="dp-ligne-montant"><b>{nombre(b.ventes)}</b><small>{dev}</small></span></li>
      <li><span className="dp-icone" style={{background:'#ff9500'}} aria-hidden="true"><IconeHD nom="business_center" className="text-[18px]"/></span><span className="dp-ligne-texte"><b>{l('Coût des marchandises','Cost of goods')}</b></span><span className="dp-ligne-montant bn-moins"><b>− {nombre(b.marchandises)}</b><small>{dev}</small></span></li>
      <li><span className="dp-icone" style={{background:'#8e8e93'}} aria-hidden="true"><IconeHD nom="receipt_long" className="text-[18px]"/></span><span className="dp-ligne-texte"><b>{l('Autres frais','Other costs')}</b></span><span className="dp-ligne-montant bn-moins"><b>− {nombre(b.frais)}</b><small>{dev}</small></span></li>
      <li><span className="dp-icone" style={{background:'#5856d6'}} aria-hidden="true"><IconeHD nom="home" className="text-[18px]"/></span><span className="dp-ligne-texte"><b>{l('Charges du mois payées','Monthly costs paid')}</b><small>{l('loyer et autres charges','rent and other costs')}</small></span><span className="dp-ligne-montant bn-moins"><b>− {nombre(b.charges)}</b><small>{dev}</small></span></li>
      <li className="bn-total-ligne"><span className="dp-ligne-texte"><b>{b.benefice<0?l('Perte','Loss'):l('Bénéfice','Profit')}</b></span><span className="dp-ligne-montant"><b>{nombre(b.benefice)}</b><small>{dev}</small></span></li>
     </ul>

     <h2 className="dp-section">{l('Les 6 derniers mois','Last 6 months')}</h2>
     <div className="bn-graphique" role="img" aria-label={serie.map(x=>`${nomMois(x.m)} : ${nombre(x.v)} ${dev}`).join(' ; ')}>
      {serie.map(x=><button key={x.m} type="button" className={`bn-colonne${x.m===mois?' bn-actif':''}${x.v<0?' bn-negatif':''}`} onClick={()=>setMois(x.m)} aria-hidden="true" tabIndex={-1}>
       <span className="bn-valeur">{x.v===0?'':nombre(Math.round(x.v/100)*100)}</span>
       <span className="bn-piste"><i style={{height:`${Math.max(x.v===0?0:4,Math.round(Math.abs(x.v)/maxSerie*100))}%`}}/></span>
       <span className="bn-mois">{nomMois(x.m,true)}</span>
      </button>)}
     </div>
    </>}

    {!commerce&&b.revenus===0&&<p className="dp-vide"><IconeHD nom="payments" className="text-[28px]"/>{l('Rien n’est encore noté. Quand tu reçois de l’argent, note-le dans SÉNEVÉ Répartition : tes bénéfices apparaîtront ici.','Nothing recorded yet. When you receive money, record it in SÉNEVÉ Allocation: your profits will appear here.')}</p>}
    <Link to={`/habitudes/repartition${suffixe}`} className="dp-ajouter bn-lien"><IconeHD nom="pie_chart" className="text-[22px]"/>{l('Noter une vente dans Répartition','Record a sale in Allocation')}</Link>
   </>}
  </div>
 </CadreHabitudes>;
}
