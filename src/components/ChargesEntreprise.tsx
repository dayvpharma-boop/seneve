import {useEffect,useMemo,useState} from 'react';
import {chargerSuiviFinancier} from '@/lib/habitudes-finances-suivi';
import {chargerChargesEntreprise,creerChargeEntreprise,enregistrerPaiementCharge,type ChargeEntreprise} from '@/lib/habitudes-finance-charges';

const aujourdHui=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Kinshasa'}).format(new Date());
const debutMois=(d:string)=>d.slice(0,8)+'01';
const finMois=(d:string)=>{const x=new Date(d+'T12:00:00Z');return new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0)).toISOString().slice(0,10)};
const cents=(x:string)=>Math.round(Number(x)*100);

export function ChargesEntreprise({devise,langue,onEtat}:{devise:string;langue:string;onEtat:(ok:boolean,paidAmount:number)=>void}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [enrollment,setEnrollment]=useState<string|null>(null),[charges,setCharges]=useState<ChargeEntreprise[]>([]);
 const [chargeNom,setChargeNom]=useState(''),[chargeMontant,setChargeMontant]=useState(''),[debut,setDebut]=useState(debutMois(aujourdHui())),[fin,setFin]=useState(finMois(aujourdHui()));
 const [paiement,setPaiement]=useState<Record<string,string>>({});
 const [chargement,setChargement]=useState(true),[erreur,setErreur]=useState(''),[message,setMessage]=useState(''),[occupes,setOccupes]=useState<Record<string,boolean>>({});
 const date=aujourdHui();
 async function rafraichir(id:string){
  const liste=await chargerChargesEntreprise(id,date,devise)??[];
  setCharges(liste);
  const total=liste.reduce((n,c)=>n+cents(c.expected_amount),0),paid=liste.reduce((n,c)=>n+c.payments.reduce((m,p)=>m+cents(p.amount),0),0);
  onEtat(total===0||paid>=total,paid/100);
 }
 useEffect(()=>{let vivant=true;setChargement(true);void chargerSuiviFinancier(null).then(async s=>{if(!vivant)return;if(!s){setEnrollment(null);setChargement(false);onEtat(true,0);return;}setEnrollment(s.enrollment_id);await rafraichir(s.enrollment_id);if(vivant)setChargement(false);}).catch(()=>{if(vivant){setErreur(l('Impossible de charger les charges.','Could not load business charges.'));setChargement(false);onEtat(false,0);}});return()=>{vivant=false;};},[devise,date]); // eslint-disable-line react-hooks/exhaustive-deps
 const attendu=charges.reduce((n,c)=>n+cents(c.expected_amount),0);
 const paye=charges.reduce((n,c)=>n+c.payments.reduce((m,p)=>m+cents(p.amount),0),0);
 const reste=Math.max(0,attendu-paye);
 const fmt=(v:number)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{maximumFractionDigits:2}).format(v/100);
 async function ajouter(){if(!enrollment||!chargeNom.trim()||!chargeMontant)return;setOccupes(s=>({...s,ajout:true}));setErreur('');setMessage('');try{await creerChargeEntreprise(enrollment,{label:chargeNom,amount:chargeMontant,currency:devise,start:debut,end:fin},crypto.randomUUID());setChargeNom('');setChargeMontant('');await rafraichir(enrollment);setMessage(l('Charge ajoutée.','Charge added.'));}catch{setErreur(l('La charge n’a pas été ajoutée. Vérifie le montant et les dates.','The charge was not added. Check the amount and dates.'));}finally{setOccupes(s=>({...s,ajout:false}));}}
 async function payer(c:ChargeEntreprise){const value=paiement[c.charge_id];if(!enrollment||!value)return;setOccupes(s=>({...s,[c.charge_id]:true}));setErreur('');setMessage('');try{await enregistrerPaiementCharge(enrollment,c.charge_id,value,date,crypto.randomUUID());setPaiement(s=>({...s,[c.charge_id]:''}));await rafraichir(enrollment);setMessage(l('Paiement enregistré. SÉNEVÉ note l’opération sans déplacer d’argent.','Payment recorded. SÉNEVÉ logs it without moving money.'));}catch{setErreur(l('Paiement non enregistré. Vérifie le montant : il ne peut pas dépasser le reste dû.','Payment not recorded. Check the amount: it cannot exceed the remaining balance.'));}finally{setOccupes(s=>({...s,[c.charge_id]:false}));}}
 const cartes=useMemo(()=>charges.map(c=>{const paid=c.payments.reduce((n,p)=>n+cents(p.amount),0),left=Math.max(0,cents(c.expected_amount)-paid),pct=cents(c.expected_amount)?Math.min(100,Math.round(paid/cents(c.expected_amount)*100)):0;return <article key={c.charge_id} className="rounded-xl border border-hd-outline-variant bg-white p-3">
  <div className="flex justify-between gap-2"><div><b>{c.label}</b><p className="text-xs text-hd-on-surface-variant">{c.period_start} → {c.period_end}</p></div><span className="text-sm">{fmt(left)} {devise} {l('à payer','left')}</span></div>
  <p className="mt-1 text-xs">{fmt(paid)} / {fmt(cents(c.expected_amount))} {devise} · {pct}%</p>
  {left>0&&<div className="mt-2 flex gap-2"><label className="sr-only" htmlFor={'pay-'+c.charge_id}>{l('Montant payé','Amount paid')}</label><input id={'pay-'+c.charge_id} inputMode="decimal" placeholder={l('Montant payé','Amount paid')} value={paiement[c.charge_id]??''} onChange={e=>setPaiement(s=>({...s,[c.charge_id]:e.target.value}))} className="min-h-11 min-w-0 flex-1 rounded-lg border px-3"/><button type="button" className="oa-primary" disabled={!paiement[c.charge_id]||!!occupes[c.charge_id]} onClick={()=>void payer(c)}>{l('Noter le paiement','Record payment')}</button></div>}
 </article>}),[charges,paiement,occupes,devise,en]);
 if(chargement)return <section className="rn-section"><h2>{l('Charges de l’entreprise','Business expenses')}</h2><p role="status">{l('Chargement…','Loading…')}</p></section>;
 if(!enrollment)return <section className="rn-section"><h2>{l('Charges de l’entreprise','Business expenses')}</h2><p>{l('Connecte-toi avec un accès actif à Habitudes & Défis pour suivre les charges et ouvrir la répartition.','Sign in with active Habits & Challenges access to track charges and unlock allocation.')}</p></section>;
 return <section className="rn-section" aria-labelledby="charges-entreprise-titre">
  <h2 id="charges-entreprise-titre">{l('Priorité : charges de l’entreprise','Priority: business expenses')}</h2>
  <p>{l('Enregistre le loyer, l’électricité, le transport et les autres charges. La répartition reste verrouillée jusqu’à leur paiement complet pour cette période et cette devise.','Record rent, electricity, transport and other expenses. Allocation stays locked until they are fully paid for this period and currency.')}</p>
  <div className="grid grid-cols-3 gap-2 rounded-xl bg-hd-secondary-container/40 p-3 text-center text-sm"><div><small>{l('Prévu','Expected')}</small><b className="block">{fmt(attendu)} {devise}</b></div><div><small>{l('Payé','Paid')}</small><b className="block">{fmt(paye)} {devise}</b></div><div><small>{l('Reste','Remaining')}</small><b className="block">{fmt(reste)} {devise}</b></div></div>
  {charges.length>0&&<div className="mt-3 flex flex-col gap-2">{cartes}</div>}
  {charges.length===0&&<p className="mt-3 text-sm">{l('Aucune charge prévue pour cette devise et la date du jour. La répartition est ouverte.','No charge is scheduled for this currency and today. Allocation is open.')}</p>}
  <details className="mt-3 rounded-xl border p-3"><summary className="cursor-pointer font-semibold">{l('Ajouter une charge','Add an expense')}</summary><div className="mt-3 flex flex-col gap-2">
   <label className="flex flex-col gap-1 text-sm">{l('Nom de la charge','Expense name')}<input value={chargeNom} maxLength={80} onChange={e=>setChargeNom(e.target.value)} placeholder={l('Ex. loyer de l’entreprise','e.g. business rent')} className="min-h-11 rounded-lg border px-3"/></label>
   <label className="flex flex-col gap-1 text-sm">{l('Montant prévu','Expected amount')}<input inputMode="decimal" value={chargeMontant} onChange={e=>setChargeMontant(e.target.value)} placeholder={'0 '+devise} className="min-h-11 rounded-lg border px-3"/></label>
   <div className="grid grid-cols-2 gap-2"><label className="flex flex-col gap-1 text-sm">{l('Début de période','Period start')}<input type="date" value={debut} onChange={e=>setDebut(e.target.value)} className="min-h-11 rounded-lg border px-2"/></label><label className="flex flex-col gap-1 text-sm">{l('Fin de période','Period end')}<input type="date" value={fin} min={debut} onChange={e=>setFin(e.target.value)} className="min-h-11 rounded-lg border px-2"/></label></div>
   <button type="button" className="oa-primary" disabled={!chargeNom.trim()||!chargeMontant||!!occupes.ajout||fin<debut} onClick={()=>void ajouter()}>{l('Ajouter cette charge','Add this expense')}</button>
  </div></details>
  {erreur&&<p role="alert" className="mt-2 text-sm text-red-700">{erreur}</p>}<p role="status" aria-live="polite" className="mt-2 text-sm">{message}</p>
 </section>;
}
