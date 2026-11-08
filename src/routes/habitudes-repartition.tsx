import '@/components/SimulateurEpargne.css';
import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {IconeHD} from '@/components/IconeHabitudes';
import {habitudesActivees} from '@/lib/habitudes-configuration';
import {decimalesDevise} from '@/lib/devises';
import {baseRepartition,maximumPart,repartir,LIMITES_REPARTITION,POURCENTAGES_DEFAUT,type CleRepartition,type Pourcentages,type ProfilRevenu} from '@/lib/habitudes-repartition';
import {NotFound} from '@/routes/introuvable';
import {OptionsDevises} from '@/components/OptionsDevises';
import {EnregistrerRepartition} from '@/components/EnregistrerRepartition';

const COULEURS:Record<CleRepartition|'vivre',string>={dime:'#b8862b',offrande:'#b05bd6',reserve:'#2f9e62',investir:'#2f6fe0',autre:'#c2410c',dettes:'#e0662f',vivre:'#c7c7cc'};

/** Page « Ma répartition » (maquette validée le 07/11/2026), ouverte depuis Mon épargne ou Mon suivi des dettes.
 * Le calcul est local ; « Enregistrer ma répartition » ouvre une feuille où chaque part est vérifiée avant d'être notée. */
export function HabitudesRepartition(){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr;
 const pour=q.get('pour')==='dettes'?'dettes':'epargne',suffixe=en?'&lang=en':'';
 const [profil,setProfil]=useState<ProfilRevenu>('commerce');
 const [recu,setRecu]=useState(''),[marchandises,setMarchandises]=useState(''),[frais,setFrais]=useState('');
 const [devise,setDevise]=useState('USD');
 const [p,setP]=useState<Pourcentages>(POURCENTAGES_DEFAUT);
 const [feuille,setFeuille]=useState(false);
 useEffect(()=>{document.title=l('Ma répartition','My allocation')+' — SÉNEVÉ';document.documentElement.lang=langue;},[langue]);
 if(!habitudesActivees())return <NotFound/>;
 const dec=decimalesDevise(devise);
 const nombre=(n:number)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{minimumFractionDigits:Number.isInteger(n)?0:dec,maximumFractionDigits:dec}).format(n);
 let r:ReturnType<typeof repartir>|null=null,erreur=false;
 if(recu.trim()!==''){try{r=repartir(baseRepartition(profil,recu,marchandises,frais),p,dec);}catch{erreur=true;}}
 const choisir=(v:ProfilRevenu)=>{setProfil(v);setRecu('');setMarchandises('');setFrais('');};
 const PROFILS:[ProfilRevenu,string,string,string][]=[['salarie',l('Salarié','Employee'),'business_center',''],['commerce',l('Commerçant','Merchant'),'payments',''],['entreprise',l('Entrepreneur','Entrepreneur'),'handshake',''],['autre',l('Autre revenu','Other income'),'volunteer_activism','']];
 const periode=profil==='commerce'?l('Cette semaine','This week'):profil==='autre'?l('Ce que j’ai reçu','What I received'):l('Ce mois','This month');
 const aide=profil==='salarie'?l('Le transport ou les outils payés pour ton travail, s’ils ne te sont pas remboursés.','Transport or tools paid for your work, if they are not reimbursed.')
  :profil==='commerce'?l('Loyer de la boutique, transport des marchandises… pas tes dépenses de maison.','Shop rent, transporting goods… not your household spending.')
  :profil==='entreprise'?l('Matériel, sous-traitance, déplacements pour le travail. Une moyenne suffit si tes revenus varient.','Equipment, subcontracting, work travel. An average is fine if your income varies.')
  :l('Un don en argent compte en entier. Un prêt n’est pas un revenu : ne l’écris pas ici.','A cash gift counts in full. A loan is not income: do not enter it here.');
 const champ=(id:string,libelle:string,valeur:string,changer:(v:string)=>void,signe=false)=><div className="sim-ios-ligne"><label htmlFor={id}>{libelle}</label>{signe&&<span className="sim-ios-signe" aria-hidden="true">−</span>}<span className="flex items-center gap-1.5"><input id={id} type="text" inputMode="decimal" autoComplete="off" maxLength={24} placeholder="0" value={valeur} onChange={e=>changer(e.target.value)}/><span className="text-hd-on-surface-variant" style={{fontSize:15}}>{devise}</span></span></div>;
 const PARTS:{cle:CleRepartition;nom:string;info:string}[]=[
  {cle:'dime',nom:l('Dîme','Tithe'),info:l('10 % fixés par l’enseignement','10% set by the teaching')},
  {cle:'offrande',nom:l('Offrande','Offering'),info:l('libre, selon toi','free, as you choose')},
  {cle:'reserve',nom:l('Réserve de joie','Family joy reserve'),info:l('de 0 à 10 %','0 to 10%')},
  {cle:'investir',nom:l('Pour investir','For investing'),info:l('jusqu’à 30 %','up to 30%')},
  {cle:'autre',nom:l('Autre objectif','Other goal'),info:l('libre : toiture, école…','free: roof, school…')},
  {cle:'dettes',nom:l('Dettes','Debts'),info:l('proposé 15 % (0 à 30 %)','suggested 15% (0 to 30%)')},
 ];
 const reglage=(cle:CleRepartition,d:number)=>setP(x=>{const b=LIMITES_REPARTITION[cle];return {...x,[cle]:Math.min(maximumPart(cle,x),Math.max(b.min,x[cle]+d*b.pas))};});
 const vivrePct=r&&r.base>0?Math.round(r.vivre/r.base*100):100-p.dime-p.offrande-p.reserve-p.investir-p.autre-p.dettes;
 return <CadreHabitudes titre={l('Ma répartition','My allocation')} langue={langue} retour={pour==='dettes'?`/habitudes/dettes${en?'?lang=en':''}`:`/habitudes/epargne${en?'?lang=en':''}`} retourLibelle={pour==='dettes'?l('Revenir à Mon suivi des dettes','Back to my debt tracker'):l('Revenir à Mon épargne','Back to my savings')} liens={{aujourdhui:`/espace${en?'?lang=en':''}`}} actif="aujourdhui">
  <div className="sim-ios mx-auto flex w-full max-w-xl flex-col px-hd-margin pt-hd-space-md pb-hd-space-lg" style={{background:'var(--ios-fond,#f2f2f7)'}}>
   <h1 className="ml-1 text-[34px] font-bold leading-tight tracking-tight">{l('Ma répartition','My allocation')}</h1>
   <p className="sim-ios-sous hd-classique">{l('Choisis ton profil, écris ce que tu as reçu : tu vois où va chaque franc. Rien n’est enregistré.','Choose your profile and enter what you received: you see where every franc goes. Nothing is saved.')}</p>
   <div role="radiogroup" aria-label={l('Mon profil','My profile')} className="grid grid-cols-2 gap-1.5">
    {PROFILS.map(([v,nom,icone])=><button key={v} type="button" role="radio" aria-checked={profil===v} onClick={()=>choisir(v)} className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl bg-white text-sm font-medium transition-shadow" style={profil===v?{boxShadow:'0 0 0 2px var(--ios-accent,#5b4ee8)',color:'var(--ios-accent,#5b4ee8)'}:undefined}><IconeHD nom={icone} className="text-[22px]"/>{nom}</button>)}
   </div>
   <h2 className="hd-classique sim-ios-titre">{periode}</h2>
   <div className="sim-ios-groupe hd-classique">
    {champ('hd-rep-recu',profil==='salarie'?l('Salaire reçu','Salary received'):profil==='commerce'?l('Ventes encaissées','Sales received'):profil==='entreprise'?l('Argent encaissé','Money received'):l('Montant reçu (don, aide…)','Amount received (gift, help…)'),recu,setRecu)}
    {profil==='commerce'&&champ('hd-rep-marchandises',l('Coût des marchandises vendues','Cost of goods sold'),marchandises,setMarchandises,true)}
    {profil!=='autre'&&champ('hd-rep-frais',profil==='salarie'?l('Dépenses de travail non remboursées','Unreimbursed work expenses'):profil==='commerce'?l('Charges du commerce','Business expenses'):l('Dépenses du travail','Work expenses'),frais,setFrais,true)}
    <div className="sim-ios-ligne"><label htmlFor="hd-rep-devise">{l('Monnaie','Currency')}</label><select id="hd-rep-devise" value={devise} onChange={e=>setDevise(e.target.value)}><OptionsDevises langue={en?'en':'fr'}/></select></div>
   </div>
   <p className="sim-ios-note hd-classique">{aide}</p>
   {erreur&&<p role="alert" className="sim-ios-alerte hd-classique">{l('Vérifie les montants : écris seulement des chiffres, par exemple 500000 ou 1000,50.','Check the amounts: digits only, for example 500000 or 1000.50.')}</p>}

   <section aria-labelledby="hd-rep-base" className="hd-classique mt-5 rounded-[20px] bg-white p-[18px]">
    <div className="flex items-baseline justify-between gap-2"><h2 id="hd-rep-base" className="uppercase text-hd-on-surface-variant" style={{fontSize:13,fontWeight:400,letterSpacing:".05em",margin:0,lineHeight:1.3}}>{l('Base retenue','Selected basis')}</h2><b className="text-[26px] tracking-tight tabular-nums [overflow-wrap:anywhere]">{r?`${nombre(r.base)} ${devise}`:'—'}</b></div>
    <div aria-hidden="true" className="my-3.5 flex h-3.5 overflow-hidden rounded-full" style={{background:COULEURS.vivre}}>{PARTS.map(x=><i key={x.cle} className="block h-full" style={{width:`${r&&r.base>0?p[x.cle]:0}%`,background:COULEURS[x.cle],transition:'width .35s cubic-bezier(.32,.72,0,1)'}}/>)}</div>
    <ul className="m-0 list-none p-0">
     {PARTS.map(x=>{const b=LIMITES_REPARTITION[x.cle];return <li key={x.cle} className="flex min-h-[52px] items-center gap-2.5 border-t border-black/10 py-1 first:border-t-0">
      <span aria-hidden="true" className="size-3 shrink-0 rounded" style={{background:COULEURS[x.cle]}}/>
      <span className="min-w-0 flex-1 text-[16px]">{x.nom}<small className="block text-xs text-hd-on-surface-variant">{x.info}</small></span>
      {b.pas===0?<span className="min-w-[96px] text-center text-[13px] text-hd-on-surface-variant">{p[x.cle]} %</span>
       :<span className="sim-ios-stepper" style={{alignItems:'center'}}><button type="button" aria-label={l(`Baisser : ${x.nom}`,`Decrease: ${x.nom}`)} disabled={p[x.cle]<=b.min} onClick={()=>reglage(x.cle,-1)} style={{width:32,height:30}}>−</button><span aria-live="polite" style={{minWidth:40,margin:0,background:'none',textAlign:'center',fontSize:14,fontWeight:600}}>{p[x.cle]} %</span><button type="button" aria-label={l(`Augmenter : ${x.nom}`,`Increase: ${x.nom}`)} disabled={p[x.cle]>=maximumPart(x.cle,p)} onClick={()=>reglage(x.cle,1)} style={{width:32,height:30}}>+</button></span>}
      <b className="min-w-[72px] text-right tabular-nums">{r?nombre(r[x.cle]):'—'}</b>
     </li>;})}
     <li className="flex min-h-[52px] items-center gap-2.5 border-t border-black/10 py-1">
      <span aria-hidden="true" className="size-3 shrink-0 rounded" style={{background:COULEURS.vivre}}/>
      <span className="min-w-0 flex-1 text-[16px]">{l('Pour vivre','For living')}<small className="block text-xs text-hd-on-surface-variant">{l('ce qui reste','what is left')}</small></span>
      <span className="min-w-[96px] text-center text-[13px] text-hd-on-surface-variant">{vivrePct} %</span>
      <b className="min-w-[72px] text-right tabular-nums">{r?nombre(r.vivre):'—'}</b>
     </li>
    </ul>
    {!r&&!erreur&&<p className="mt-2 text-sm text-hd-on-surface-variant">{l('Écris ce que tu as reçu : la répartition apparaît tout de suite.','Enter what you received: the allocation appears straight away.')}</p>}
   </section>

   {r&&r.base>0&&<button type="button" onClick={()=>setFeuille(true)} className="hd-classique sim-ios-bouton mt-3"><IconeHD nom="check_circle" className="mr-2 text-[20px]"/>{l('Enregistrer ma répartition','Save my allocation')}</button>}
   {r&&r.base>0&&<p className="sim-ios-note hd-classique">{l('Tu vérifies chaque part avant que rien ne soit enregistré. Aucun argent ne bouge : SÉNEVÉ note seulement ce que tu as fait.','You check each part before anything is saved. No money moves: SÉNEVÉ only records what you did.')}</p>}
   {feuille&&r&&<EnregistrerRepartition montants={r} devise={devise} langue={langue} onFermer={()=>setFeuille(false)}/>}
   <p className="sim-ios-note hd-classique mt-4 flex items-start gap-2"><IconeHD nom="lock" className="shrink-0 text-[16px]"/>{l('Ces pourcentages sont des repères d’enseignement, pas une obligation ni un conseil financier personnel. Aucun argent ne bouge.','These percentages are teaching guides, not an obligation or personal financial advice. No money moves.')}</p>
  </div>
 </CadreHabitudes>;
}
