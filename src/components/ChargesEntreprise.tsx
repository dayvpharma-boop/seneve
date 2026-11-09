import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {chargerSuiviFinancier} from '@/lib/habitudes-finances-suivi';
import {chargerChargesEntreprise,creerBlocChargesEntreprise,creerChargeEntreprise,enregistrerPaiementCharge,type ChargeEntreprise,type BlocChargeArchive} from '@/lib/habitudes-finance-charges';

const aujourdHui=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Kinshasa'}).format(new Date());
const debutMois=(d:string)=>d.slice(0,8)+'01';
const finMois=(d:string)=>{const x=new Date(d+'T12:00:00Z');return new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0)).toISOString().slice(0,10)};
const cents=(x:string)=>Math.round(Number(x)*100);

export function ChargesEntreprise({devise,langue,onEtat}:{devise:string;langue:string;onEtat:(ok:boolean,paidAmount:number)=>void}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [enrollment,setEnrollment]=useState<string|null>(null),[charges,setCharges]=useState<ChargeEntreprise[]>([]),[archives,setArchives]=useState<BlocChargeArchive[]>([]);
 const [bloc,setBloc]=useState<{block_id:string;month_start:string}|null>(null);
 const [chargeNom,setChargeNom]=useState(''),[chargeMontant,setChargeMontant]=useState('');
 const [paiement,setPaiement]=useState<Record<string,string>>({});
 const [chargement,setChargement]=useState(true),[erreur,setErreur]=useState(''),[message,setMessage]=useState(''),[occupes,setOccupes]=useState<Record<string,boolean>>({});
 const date=aujourdHui(),mois=debutMois(date),fin=finMois(date);
 const fmt=(v:number,c=devise)=>`${new Intl.NumberFormat(en?'en-US':'fr-FR',{maximumFractionDigits:2}).format(v/100)} ${c}`;
 const moisNom=(d:string)=>new Intl.DateTimeFormat(en?'en-US':'fr-FR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
 async function rafraichir(id:string){
  const donnees=await chargerChargesEntreprise(id,date,devise);
  setCharges(donnees?.charges??[]);setBloc(donnees?.active_block??null);setArchives(donnees?.archives??[]);
  const list=donnees?.charges??[];
  const totalDevise=list.filter(c=>c.currency===devise).reduce((n,c)=>n+cents(c.expected_amount),0);
  const payeDevise=list.filter(c=>c.currency===devise).reduce((n,c)=>n+c.payments.reduce((m,p)=>m+cents(p.amount),0),0);
  const aDesCharges=list.length>0;
  const toutEstPaye=aDesCharges&&list.every(c=>c.payments.reduce((n,p)=>n+cents(p.amount),0)>=cents(c.expected_amount));
  onEtat(!!donnees?.active_block&&toutEstPaye,payeDevise/100);
 }
 useEffect(()=>{let vivant=true;setChargement(true);void chargerSuiviFinancier(null).then(async s=>{if(!vivant)return;if(!s){setEnrollment(null);setChargement(false);onEtat(false,0);return;}setEnrollment(s.enrollment_id);await rafraichir(s.enrollment_id);if(vivant)setChargement(false);}).catch(()=>{if(vivant){setErreur(l('Impossible de charger les charges.','Could not load business expenses.'));setChargement(false);onEtat(false,0);}});return()=>{vivant=false;};},[devise,date]); // eslint-disable-line react-hooks/exhaustive-deps
 const attendu=charges.filter(c=>c.currency===devise).reduce((n,c)=>n+cents(c.expected_amount),0);
 const paye=charges.filter(c=>c.currency===devise).reduce((n,c)=>n+c.payments.reduce((m,p)=>m+cents(p.amount),0),0);
 const reste=Math.max(0,attendu-paye);
 async function creerBloc(){if(!enrollment)return;setOccupes(s=>({...s,bloc:true}));setErreur('');setMessage('');try{await creerBlocChargesEntreprise(enrollment,mois,crypto.randomUUID());await rafraichir(enrollment);setMessage(l('Bloc du mois créé. Ajoute maintenant les rubriques de charges.','Monthly block created. Add the expense categories now.'));}catch{setErreur(l('Le bloc du mois n’a pas été créé. Recharge la page pour vérifier s’il existe déjà.','The monthly block was not created. Reload the page to check whether one already exists.'));}finally{setOccupes(s=>({...s,bloc:false}));}}
 async function ajouter(){if(!enrollment||!bloc||!chargeNom.trim()||!chargeMontant)return;setOccupes(s=>({...s,ajout:true}));setErreur('');setMessage('');try{await creerChargeEntreprise(enrollment,{label:chargeNom,amount:chargeMontant,currency:devise,start:mois,end:fin},crypto.randomUUID());setChargeNom('');setChargeMontant('');await rafraichir(enrollment);setMessage(l('Rubrique ajoutée au bloc du mois.','Expense added to this month’s block.'));}catch{setErreur(l('La rubrique n’a pas été ajoutée. Vérifie le montant et le bloc du mois.','The expense was not added. Check the amount and monthly block.'));}finally{setOccupes(s=>({...s,ajout:false}));}}
 async function payer(c:ChargeEntreprise){const value=paiement[c.charge_id];if(!enrollment||!value)return;setOccupes(s=>({...s,[c.charge_id]:true}));setErreur('');setMessage('');try{await enregistrerPaiementCharge(enrollment,c.charge_id,value,date,crypto.randomUUID());setPaiement(s=>({...s,[c.charge_id]:''}));await rafraichir(enrollment);setMessage(l('Paiement enregistré. SÉNEVÉ note l’opération sans déplacer d’argent.','Payment recorded. SÉNEVÉ logs it without moving money.'));}catch{setErreur(l('Paiement non enregistré. Vérifie le montant : il ne peut pas dépasser le reste dû.','Payment not recorded. Check the amount: it cannot exceed the remaining balance.'));}finally{setOccupes(s=>({...s,[c.charge_id]:false}));}}
 const carte=(c:ChargeEntreprise,archive=false)=>{const paid=c.payments.reduce((n,p)=>n+cents(p.amount),0),left=Math.max(0,cents(c.expected_amount)-paid),pct=cents(c.expected_amount)?Math.min(100,Math.round(paid/cents(c.expected_amount)*100)):0;return <article key={c.charge_id} className="rounded-xl border border-hd-outline-variant bg-white p-3">
  <div className="flex justify-between gap-2"><div><b>{c.label}</b><p className="text-xs text-hd-on-surface-variant">{archive?c.period_start+' → '+c.period_end:l('Prévu pour le mois','Scheduled for the month')}</p></div><span className="text-sm">{fmt(left,c.currency)} {l('à payer','left')}</span></div>
  <p className="mt-1 text-xs">{fmt(paid,c.currency)} / {fmt(cents(c.expected_amount),c.currency)} · {pct}%</p>
  {left>0&&!archive&&<div className="mt-2 flex gap-2"><label className="sr-only" htmlFor={'pay-'+c.charge_id}>{l('Montant payé','Amount paid')}</label><input id={'pay-'+c.charge_id} inputMode="decimal" placeholder={l('Montant payé','Amount paid')} value={paiement[c.charge_id]??''} onChange={e=>setPaiement(s=>({...s,[c.charge_id]:e.target.value}))} className="min-h-11 min-w-0 flex-1 rounded-lg border px-3"/><button type="button" className="oa-primary" disabled={!paiement[c.charge_id]||!!occupes[c.charge_id]} onClick={()=>void payer(c)}>{l('Noter le paiement','Record payment')}</button></div>}
 </article>;};
 if(chargement)return <section className="rn-section"><h2>{l('Charges de l’entreprise','Business expenses')}</h2><p role="status">{l('Chargement…','Loading…')}</p></section>;
 if(!enrollment)return <section className="rn-section"><h2>{l('Charges de l’entreprise','Business expenses')}</h2><p>{l('Connecte-toi avec un accès actif à Habitudes & Défis pour suivre les charges et ouvrir la répartition.','Sign in with active Habits & Challenges access to track expenses and unlock allocation.')}</p><Link to={en?'/connexion?lang=en&mode=signin&suite=habitudes':'/connexion?mode=signin&suite=habitudes'} className="sim-ios-bouton mt-3 block text-center">{l('Se connecter','Sign in')}</Link></section>;
 const archivesCards=archives.map(b=><details key={b.block_id} className="rounded-xl border border-hd-outline-variant bg-white p-3"><summary className="cursor-pointer font-semibold capitalize">{moisNom(b.month_start)}</summary><div className="mt-3 flex flex-col gap-2">{b.charges.map(c=>carte(c,true))}{b.charges.length===0&&<p className="text-sm">{l('Aucune charge dans ce bloc.','No expenses in this block.')}</p>}</div></details>);
 return <section className="rn-section" aria-labelledby="charges-entreprise-titre">
  <h2 id="charges-entreprise-titre">{l('Priorité : charges de l’entreprise','Priority: business expenses')}</h2>
  <p>{l('Un seul bloc pour chaque mois. Tu peux y ajouter plusieurs rubriques : loyer, électricité, transport et autres charges. Chaque devise reste séparée. Toutes les charges du bloc doivent être réglées avant d’ouvrir la répartition.','One block per month. Add several expense categories to it: rent, electricity, transport and other costs. Currencies stay separate. All expenses in the block must be paid before allocation opens.')}</p>
  <div className="mt-3 rounded-2xl border border-hd-outline-variant bg-white p-4">
   <div className="flex flex-wrap items-center justify-between gap-2"><div><small className="text-hd-on-surface-variant">{l('Bloc du mois','This month’s block')}</small><h3 className="text-lg font-semibold capitalize">{moisNom(mois)}</h3></div>
    {!bloc&&<button type="button" className="oa-primary" disabled={!!occupes.bloc} onClick={()=>void creerBloc()}>{l('Créer le bloc du mois','Create this month’s block')}</button>}
    {bloc&&<span className="rounded-full bg-hd-secondary-container/60 px-3 py-1 text-sm">{l('Bloc actif','Active block')}</span>}
   </div>
   {!bloc&&<p className="mt-3 text-sm">{l('Crée le bloc mensuel, puis ajoute toutes les charges prévues. Un second bloc ne pourra pas être créé pour ce mois.','Create the monthly block, then add all expected expenses. A second block cannot be created for this month.')}</p>}
   {bloc&&<><div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-hd-secondary-container/40 p-3 text-center text-sm"><div><small>{l('Prévu','Expected')}</small><b className="block">{fmt(attendu)}</b></div><div><small>{l('Payé','Paid')}</small><b className="block">{fmt(paye)}</b></div><div><small>{l('Reste','Remaining')}</small><b className="block">{fmt(reste)}</b></div></div>
    {charges.length>0&&<div className="mt-3 flex flex-col gap-2">{charges.map(c=>carte(c))}</div>}
    {charges.length===0&&<p className="mt-3 text-sm">{l('Ajoute au moins une rubrique de charge. La répartition restera verrouillée tant que le bloc est vide.','Add at least one expense category. Allocation stays locked while the block is empty.')}</p>}
    <details className="mt-3 rounded-xl border p-3"><summary className="cursor-pointer font-semibold">{l('Ajouter une rubrique au bloc','Add a category to this block')}</summary><div className="mt-3 flex flex-col gap-2">
     <label className="flex flex-col gap-1 text-sm">{l('Nom de la charge','Expense name')}<input value={chargeNom} maxLength={80} onChange={e=>setChargeNom(e.target.value)} placeholder={l('Ex. loyer de l’entreprise','e.g. business rent')} className="min-h-11 rounded-lg border px-3"/></label>
     <label className="flex flex-col gap-1 text-sm">{l('Montant prévu','Expected amount')}<input inputMode="decimal" value={chargeMontant} onChange={e=>setChargeMontant(e.target.value)} placeholder={'0 '+devise} className="min-h-11 rounded-lg border px-3"/></label>
     <p className="text-xs text-hd-on-surface-variant">{l('Devise de cette rubrique :','Currency for this expense:')} {devise}</p>
     <button type="button" className="oa-primary" disabled={!chargeNom.trim()||!chargeMontant||!!occupes.ajout} onClick={()=>void ajouter()}>{l('Ajouter cette rubrique','Add this category')}</button>
    </div></details>
   </>}
  </div>
  {archives.length>0&&<details className="mt-3 rounded-xl border p-3"><summary className="cursor-pointer font-semibold">{l('Archives des mois précédents','Previous months’ archives')} ({archives.length})</summary><div className="mt-3 flex flex-col gap-2">{archivesCards}</div></details>}
  {erreur&&<p role="alert" className="mt-2 text-sm text-red-700">{erreur}</p>}<p role="status" aria-live="polite" className="mt-2 text-sm">{message}</p>
 </section>;
}
