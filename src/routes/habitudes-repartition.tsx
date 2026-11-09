import '@/components/SimulateurEpargne.css';
import '@/components/Repartition.css';
import {useEffect,useState,type ReactNode} from 'react';
import {useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {habitudesActivees} from '@/lib/habitudes-configuration';
import {decimalesDevise} from '@/lib/devises';
import {baseRepartition,maximumPart,repartir,LIMITES_REPARTITION,POURCENTAGES_DEFAUT,type CleRepartition,type Pourcentages,type ProfilRevenu} from '@/lib/habitudes-repartition';
import {NotFound} from '@/routes/introuvable';
import {ChoixDevise} from '@/components/ChoixDevise';
import {EnregistrerRepartition} from '@/components/EnregistrerRepartition';
import {ChargesEntreprise} from '@/components/ChargesEntreprise';

const COULEURS:Record<CleRepartition|'vivre',string>={dime:'#c69214',offrande:'#af52de',reserve:'#ff9500',investir:'#34c759',autre:'#5856d6',dettes:'#ff3b30',vivre:'#5b4ee8'};

/** Icônes au trait, style SF Symbols (maquette Apple validée le 08/11/2026). */
const TRACES:Record<string,ReactNode>={
 mallette:<><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M3 12.5h18"/></>,
 boutique:<><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0"/><path d="M10 20v-5h4v5"/></>,
 ampoule:<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z"/>,
 cadeau:<><rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M2.5 9h19M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"/></>,
 dime:<><path d="M12 2v4M10 4h4M5 21V11l7-5 7 5v10"/><path d="M10 21v-4a2 2 0 014 0v4"/></>,
 offrande:<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>,
 reserve:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></>,
 investir:<><path d="M12 21v-9"/><path d="M12 12C12 7 8 4 4 4c0 5 3.5 8 8 8zM12 14c0-4 3-7 8-7 0 4.5-3 7-8 7z"/></>,
 autre:<><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/></>,
 dettes:<><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></>,
 vivre:<><path d="M3 11l9-7 9 7"/><path d="M6 9.5V20h12V9.5"/></>,
 cadenas:<><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></>,
 coche:<><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/></>,
 ok:<path d="M5 12.5l4.5 4.5L19 7.5"/>,
};
const Trace=({nom,className}:{nom:string;className?:string})=><svg viewBox="0 0 24 24" aria-hidden="true" className={className}>{TRACES[nom]}</svg>;

/** Page « Ma répartition », style Apple (maquette validée le 08/11/2026), ouverte depuis Mon épargne ou Mon suivi des dettes.
 * Le calcul est local ; « Enregistrer ma répartition » ouvre une feuille où chaque part est vérifiée avant d'être notée. */
export function HabitudesRepartition(){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr;
 const pour=q.get('pour')==='dettes'?'dettes':'epargne';
 const [profil,setProfil]=useState<ProfilRevenu>('commerce');
 const [recu,setRecu]=useState(''),[marchandises,setMarchandises]=useState(''),[frais,setFrais]=useState('');
 const [devise,setDevise]=useState('USD');
 const [p,setP]=useState<Pourcentages>(POURCENTAGES_DEFAUT);
 const [feuille,setFeuille]=useState(false);
 const [chargesOK,setChargesOK]=useState(true),[chargesPayees,setChargesPayees]=useState(0);
 const chargesRequises=profil==='commerce'||profil==='entreprise';
 useEffect(()=>{document.title=l('SÉNEVÉ Répartition','SÉNEVÉ Allocation');document.documentElement.lang=langue;},[langue]);// eslint-disable-line react-hooks/exhaustive-deps
 if(!habitudesActivees())return <NotFound/>;
 const dec=decimalesDevise(devise);
 const nombre=(n:number)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{minimumFractionDigits:Number.isInteger(n)?0:dec,maximumFractionDigits:dec}).format(n);
 let r:ReturnType<typeof repartir>|null=null,erreur=false;
 if(recu.trim()!==''){try{const fraisCalcul=profil==='salarie'?frais:String(chargesPayees+(Number(frais.replace(',','.'))||0));r=repartir(baseRepartition(profil,recu,marchandises,fraisCalcul),p,dec);}catch{erreur=true;}}
 const choisir=(v:ProfilRevenu)=>{setProfil(v);setRecu('');setMarchandises('');setFrais('');};
 const PROFILS:{v:ProfilRevenu;nom:string;rythme:string;icone:string;fond:string}[]=[
  {v:'salarie',nom:l('Salarié','Employee'),rythme:l('par mois','monthly'),icone:'mallette',fond:'linear-gradient(135deg,#5ac8fa,#007aff)'},
  {v:'commerce',nom:l('Commerçant','Merchant'),rythme:l('par semaine','weekly'),icone:'boutique',fond:'linear-gradient(135deg,#ffb340,#ff9500)'},
  {v:'entreprise',nom:l('Entrepreneur','Entrepreneur'),rythme:l('par mois','monthly'),icone:'ampoule',fond:'linear-gradient(135deg,#bf5af2,#8e44ad)'},
  {v:'autre',nom:l('Autre revenu','Other income'),rythme:l('don, aide','gift, help'),icone:'cadeau',fond:'linear-gradient(135deg,#4cd964,#2fb24c)'},
 ];
 const periode=profil==='commerce'?l('Cette semaine','This week'):profil==='autre'?l('Ce que j’ai reçu','What I received'):l('Ce mois','This month');
 const aide=profil==='salarie'?l('Le transport ou les outils payés pour ton travail, s’ils ne te sont pas remboursés.','Transport or tools paid for your work, if they are not reimbursed.')
  :profil==='commerce'?l('Le loyer, l’électricité et les autres charges de l’activité se suivent séparément ci-dessous.','Rent, electricity and other business costs are tracked separately below.')
  :profil==='entreprise'?l('Les charges professionnelles se suivent séparément ci-dessous.','Business expenses are tracked separately below.')
  :l('Un don en argent compte en entier. Un prêt n’est pas un revenu : ne l’écris pas ici.','A cash gift counts in full. A loan is not income: do not enter it here.');
 const libelleRecu=profil==='salarie'?l('Salaire reçu','Salary received'):profil==='commerce'?l('Ventes encaissées','Sales received'):profil==='entreprise'?l('Argent encaissé','Money received'):l('Montant reçu (don, aide…)','Amount received (gift, help…)');
 const calcul=profil==='salarie'?l('Salaire − dépenses de travail','Salary − work expenses'):profil==='commerce'?l('Ventes − marchandises − charges','Sales − goods − expenses'):profil==='entreprise'?l('Encaissé − dépenses du travail','Received − work expenses'):l('Le montant reçu, en entier','The full amount received');
 const champ=(id:string,libelle:string,valeur:string,changer:(v:string)=>void)=><div className="sim-ios-ligne"><label htmlFor={id}>{libelle}</label><span className="rep-moins" aria-hidden="true">−</span><span className="flex items-center gap-1.5"><input id={id} type="text" inputMode="decimal" autoComplete="off" maxLength={24} placeholder="0" value={valeur} onChange={e=>changer(e.target.value)}/><span className="text-hd-on-surface-variant" style={{fontSize:15}}>{devise}</span></span></div>;
 const PARTS:{cle:CleRepartition;nom:string;info:string}[]=[
  {cle:'dime',nom:l('Dîme','Tithe'),info:l('10 % fixés par l’enseignement','10% set by the teaching')},
  {cle:'offrande',nom:l('Offrande','Offering'),info:l('libre, selon toi','free, as you choose')},
  {cle:'reserve',nom:l('Réserve de joie','Family joy reserve'),info:l('de 0 à 10 %','0 to 10%')},
  {cle:'investir',nom:l('Pour investir','For investing'),info:l('jusqu’à 30 %','up to 30%')},
  {cle:'autre',nom:l('Autre objectif','Other goal'),info:l('libre : toiture, école…','free: roof, school…')},
  {cle:'dettes',nom:l('Dettes','Debts'),info:l('proposé 15 % (0 à 30 %)','suggested 15% (0 to 30%)')},
 ];
 const reglage=(cle:CleRepartition,d:number)=>setP(x=>{const b=LIMITES_REPARTITION[cle];return {...x,[cle]:Math.min(maximumPart(cle,x),Math.max(b.min,x[cle]+d*b.pas))};});
 const totalParts=p.dime+p.offrande+p.reserve+p.investir+p.autre+p.dettes;
 const vivrePct=r&&r.base>0?Math.round(r.vivre/r.base*100):100-totalParts;
 // Anneau : une couleur par part, « Pour vivre » ferme le cercle.
 const R=42,C=2*Math.PI*R;let depart=0;
 const segments=[...PARTS.map(x=>({cle:x.cle as CleRepartition|'vivre',pct:p[x.cle]})),{cle:'vivre' as const,pct:Math.max(0,100-totalParts)}].filter(s=>s.pct>0).map(s=>{const long=C*s.pct/100,seg={...s,dash:`${Math.max(0,long-1.5)} ${C}`,offset:-depart};depart+=long;return seg;});
 return <CadreHabitudes titre={l('SÉNEVÉ Répartition','SÉNEVÉ Allocation')} langue={langue} retour={pour==='dettes'?`/habitudes/dettes${en?'?lang=en':''}`:`/habitudes/epargne${en?'?lang=en':''}`} retourLibelle={pour==='dettes'?l('Revenir à SÉNEVÉ Suivi des dettes','Back to SÉNEVÉ Debt tracker'):l('Revenir à SÉNEVÉ Finance','Back to SÉNEVÉ Finance')} liens={{aujourdhui:`/espace${en?'?lang=en':''}`}} actif="aujourdhui">
  <div className="sim-ios rep-page mx-auto flex w-full max-w-xl flex-col px-hd-margin pt-hd-space-md pb-hd-space-lg">
   <h1 className="ml-1 text-[34px] font-bold leading-tight tracking-tight">{l('SÉNEVÉ Répartition','SÉNEVÉ Allocation')}</h1>
   <p className="sim-ios-sous hd-classique">{l('Choisis ton profil, écris ce que tu as reçu : tu vois où va chaque franc. Rien n’est enregistré.','Choose your profile and enter what you received: you see where every franc goes. Nothing is saved.')}</p>

   <h2 className="hd-classique sim-ios-titre">{l('Je suis','I am')}</h2>
   <div role="radiogroup" aria-label={l('Mon profil','My profile')} className="rep-profils">
    {PROFILS.map(x=><button key={x.v} type="button" role="radio" aria-checked={profil===x.v} aria-label={x.nom} onClick={()=>choisir(x.v)} className="rep-profil">
     {profil===x.v&&<span className="rep-ok" aria-hidden="true"><Trace nom="ok"/></span>}
     <span className="rep-profil-icone" style={{background:x.fond}}><Trace nom={x.icone}/></span>
     <b>{x.nom}</b><small>{x.rythme}</small>
    </button>)}
   </div>

   <h2 className="hd-classique sim-ios-titre">{periode}</h2>
   <div className="rep-grand hd-classique">
    <label htmlFor="hd-rep-recu">{libelleRecu}</label>
    <span className="rep-grand-valeur"><input id="hd-rep-recu" type="text" inputMode="decimal" autoComplete="off" maxLength={24} placeholder="0" value={recu} onChange={e=>setRecu(e.target.value)}/><span>{devise}</span></span>
   </div>
   <div className="sim-ios-groupe hd-classique mt-2.5">
    {profil==='commerce'&&champ('hd-rep-marchandises',l('Coût des marchandises vendues','Cost of goods sold'),marchandises,setMarchandises)}
    {profil!=='autre'&&champ('hd-rep-frais',profil==='salarie'?l('Dépenses de travail non remboursées','Unreimbursed work expenses'):profil==='commerce'?l('Charges du commerce','Business expenses'):l('Dépenses du travail','Work expenses'),frais,setFrais)}
    <div className="sim-ios-ligne"><label htmlFor="hd-rep-devise">{l('Monnaie','Currency')}</label><ChoixDevise id="hd-rep-devise" valeur={devise} onChange={setDevise} langue={en?'en':'fr'}/></div>
   </div>
   <p className="sim-ios-note hd-classique">{aide}</p>
   {(profil==='commerce'||profil==='entreprise')&&<p className="sim-ios-note hd-classique">{l('Dans le champ de dépenses ci-dessus, indique seulement les dépenses ponctuelles déjà payées qui ne sont pas listées dans les charges de l’entreprise.','In the expenses field above, enter only one-time costs already paid that are not listed below as business charges.')}</p>}
   {chargesRequises&&<ChargesEntreprise devise={devise} langue={langue} onEtat={(ok,montant)=>{setChargesOK(ok);setChargesPayees(montant);}}/>}
   <div className="hd-classique mt-4 rounded-2xl border border-hd-outline-variant bg-white p-3 shadow-sm">
    <button type="button" disabled={!r||r.base<=0||(chargesRequises&&!chargesOK)} onClick={()=>setFeuille(true)} className="sim-ios-bouton rep-bouton w-full disabled:opacity-50"><Trace nom="coche"/>{l('Enregistrer ma répartition','Save my allocation')}</button>
    <p className="mt-2 text-sm text-hd-on-surface-variant">{!r||r.base<=0?l('Le calcul se met à jour pendant la saisie. Écris le montant reçu pour continuer.','The calculation updates as you type. Enter the amount received to continue.'):chargesRequises&&!chargesOK?l('Les charges doivent être réglées avant de répartir le reste.','Business expenses must be paid before allocating the remainder.'):l('Vérifie les parts dans l’écran suivant. Elles seront ajoutées à Mes compteurs seulement après ta confirmation.','Review the shares on the next screen. They are added to My Counters only after you confirm.')}</p>
   </div>
   {erreur&&<p role="alert" className="sim-ios-alerte hd-classique">{l('Vérifie les montants : écris seulement des chiffres, par exemple 500000 ou 1000,50.','Check the amounts: digits only, for example 500000 or 1000.50.')}</p>}

   <section aria-labelledby="hd-rep-base" className="hd-classique mt-6">
    <div className="rep-heros">
     <svg className="rep-anneau" viewBox="0 0 104 104" aria-hidden="true">
      <circle cx="52" cy="52" r={R} fill="none" stroke="rgb(118 118 128 / .14)" strokeWidth="14"/>
      <g transform="rotate(-90 52 52)">{segments.map(s=><circle key={s.cle} cx="52" cy="52" r={R} fill="none" stroke={COULEURS[s.cle]} strokeWidth="14" strokeDasharray={s.dash} strokeDashoffset={s.offset}/>)}</g>
      <text x="52" y="50" textAnchor="middle" className="rep-anneau-pct">{vivrePct} %</text>
      <text x="52" y="66" textAnchor="middle" className="rep-anneau-legende">{l('pour vivre','for living')}</text>
     </svg>
     <div className="min-w-0">
      <small className="rep-heros-sur"><span id="hd-rep-base">{l('Base retenue','Selected basis')}</span> · {periode.toLocaleLowerCase(langue)}</small>
      <b className="rep-heros-montant">{r?`${nombre(r.base)} ${devise}`:'—'}</b>
      <p>{r?l(`${nombre(r.vivre)} ${devise} restent pour vivre après tes parts.`,`${nombre(r.vivre)} ${devise} remain for living after your shares.`):calcul}</p>
     </div>
    </div>
    <h3 className="sim-ios-titre flex justify-between"><span>{l('Mes parts','My shares')}</span><span style={{textTransform:'none'}}>{l(`Total ${totalParts} %`,`Total ${totalParts}%`)}</span></h3>
    <ul className="rep-parts">
     {PARTS.map(x=>{const b=LIMITES_REPARTITION[x.cle];return <li key={x.cle} className="rep-part">
      <span className="rep-tuile" style={{background:COULEURS[x.cle]}}><Trace nom={x.cle}/></span>
      <span className="rep-part-nom"><b>{x.nom}</b><small>{x.info}</small></span>
      <span className="rep-part-droite">
       <b className="tabular-nums">{r?`${nombre(r[x.cle])}`:'—'}</b>
       {b.pas===0?<span className="rep-fixe"><Trace nom="cadenas"/>{p[x.cle]} %</span>
        :<span className="rep-stepper"><button type="button" aria-label={l(`Baisser : ${x.nom}`,`Decrease: ${x.nom}`)} disabled={p[x.cle]<=b.min||(chargesRequises&&!chargesOK)} onClick={()=>reglage(x.cle,-1)}>−</button><span aria-live="polite">{p[x.cle]} %</span><button type="button" aria-label={l(`Augmenter : ${x.nom}`,`Increase: ${x.nom}`)} disabled={p[x.cle]>=maximumPart(x.cle,p)||(chargesRequises&&!chargesOK)} onClick={()=>reglage(x.cle,1)}>+</button></span>}
      </span>
     </li>;})}
     <li className="rep-part rep-part-vivre">
      <span className="rep-tuile" style={{background:COULEURS.vivre}}><Trace nom="vivre"/></span>
      <span className="rep-part-nom"><b>{l('Pour vivre','For living')}</b><small>{l('ce qui reste pour la maison','what is left for home')}</small></span>
      <span className="rep-part-droite"><b className="tabular-nums rep-vivre-montant">{r?nombre(r.vivre):'—'}</b><span className="rep-fixe">{vivrePct} %</span></span>
     </li>
    </ul>
    {!r&&!erreur&&<p className="sim-ios-note">{l('Écris ce que tu as reçu : la répartition apparaît tout de suite.','Enter what you received: the allocation appears straight away.')}</p>}
   </section>

   {chargesRequises&&!chargesOK&&<p role="status" className="sim-ios-note hd-classique mt-3">{l('La répartition reste verrouillée jusqu’au paiement complet des charges de cette période et de cette devise.','Allocation stays locked until all expenses for this period and currency are paid.')}</p>}
   {feuille&&r&&<EnregistrerRepartition montants={r} devise={devise} langue={langue} onFermer={()=>setFeuille(false)}/>}
   <p className="sim-ios-note hd-classique mt-4 flex items-start gap-2"><Trace nom="cadenas" className="rep-note-icone"/>{l('Ces pourcentages sont des repères d’enseignement, pas une obligation ni un conseil financier personnel. Aucun argent ne bouge.','These percentages are teaching guides, not an obligation or personal financial advice. No money moves.')}</p>
  </div>
 </CadreHabitudes>;
}
