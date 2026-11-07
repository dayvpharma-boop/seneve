import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {ComptePrive} from '@/components/ComptePrive';
import {IconeHD} from '@/components/IconeHabitudes';
import {chargerSuiviFinancier,creerDetteSuivie,creerObjectifEpargne,enregistrerPaiementDette,enregistrerVersementEpargne,renommerDetteSuivie,nomCreancierValide,LONGUEUR_NOM_CREANCIER,type DetteSuivie,type ObjectifEpargne,type TypeObjectifEpargne,type SuiviFinancier,type RythmeRepereDette} from '@/lib/habitudes-finances-suivi';
import {suiviFinancierActive} from '@/lib/habitudes-configuration';
import {DEVISES_SUIVI,decimalesDevise,deviseAcceptee,montantValidePourDevise,nomDevise} from '@/lib/devises';
import {NotFound} from '@/routes/introuvable';

type Mode='epargne'|'dettes';
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const montantCents=(v:string)=>Math.round(Number(v)*100);
const totalCents=(xs:{amount:string}[])=>xs.reduce((n,x)=>n+montantCents(x.amount),0);
const resteDette=(d:DetteSuivie)=>Math.max(0,montantCents(d.opening_balance)-totalCents(d.payments));
const formatter=(centimes:number,devise:string,en:boolean)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{style:'currency',currency:devise,minimumFractionDigits:decimalesDevise(devise),maximumFractionDigits:decimalesDevise(devise)}).format(centimes/100);
const moneyInput=(centimes:number)=> (centimes/100).toFixed(2);
const monnaie=deviseAcceptee;
const AUJOURDHUI=new Intl.DateTimeFormat('en-CA').format(new Date());

/** Pages privées du suivi financier. Chaque saisie passe par une RPC serveur ; aucun paiement n'est lancé. */
export function SuiviEpargneDettes({mode,userId}:{mode:Mode;userId:string}){
 const [params]=useSearchParams(),en=params.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr;
 const [state,setState]=useState<'chargement'|'pret'|'vide'|'erreur'>('chargement');
 const [suivi,setSuivi]=useState<SuiviFinancier|null>(null),[essai,setEssai]=useState(0),[busy,setBusy]=useState(false),[annonce,setAnnonce]=useState('');
 const [goal,setGoal]=useState(''),[goalName,setGoalName]=useState(''),[goalType,setGoalType]=useState<TypeObjectifEpargne>('reserve_joie'),[goalTarget,setGoalTarget]=useState(''),[goalCurrency,setGoalCurrency]=useState('USD'),[contribution,setContribution]=useState(''),[contributionDate,setContributionDate]=useState(AUJOURDHUI);
 const [debtBalance,setDebtBalance]=useState(''),[debtCurrency,setDebtCurrency]=useState('USD'),[debtBase,setDebtBase]=useState(''),[debtPercent,setDebtPercent]=useState(''),[paymentDebt,setPaymentDebt]=useState(''),[paymentAmount,setPaymentAmount]=useState(''),[paymentDate,setPaymentDate]=useState(AUJOURDHUI);
 const [nomNouvelleDette,setNomNouvelleDette]=useState('');
 const [nomEnEdition,setNomEnEdition]=useState<{id:string;nom:string}|null>(null);
 const [erreurNom,setErreurNom]=useState('');
 const titreRemboursement=useRef<HTMLHeadingElement>(null);
 const [rythmeDette,setRythmeDette]=useState<RythmeRepereDette>('mensuel');
 const hebdomadaire=rythmeDette==='hebdomadaire';
 const periode=(rythme:RythmeRepereDette)=>rythme==='hebdomadaire'?l('par semaine','per week'):l('par mois','per month');
 const montantRepere=(base:string,taux:string,devise:string)=>formatter(Math.round(montantCents(base)*Number(taux)/100),devise,en);
 const reperePret=montantValidePourDevise(debtBase,debtCurrency)&&/^\d+(?:\.\d{1,2})?$/.test(debtPercent)&&Number(debtPercent)<=100;
 const inscription=suivi?.enrollment_id;
 const demandes=useRef(new Map<string,string>());
 const suffix=en?'?lang=en':'';
 function idDemande(action:string, ...champs:string[]) {
  const cle=JSON.stringify([action,inscription,...champs]);
  if (!demandes.current.has(cle)) demandes.current.set(cle,crypto.randomUUID());
  return {cle,id:demandes.current.get(cle)!};
 }
 const charger=useCallback(async()=>{
  setState('chargement');
  try{
   const contenu=await chargerSuiviFinancier(null);
   if(!contenu){setSuivi(null);setState('vide');return;}
   setSuivi(contenu);setGoal(current=>contenu.savings_goals.some(g=>g.goal_id===current)?current:contenu.savings_goals[0]?.goal_id??'');
   setPaymentDebt(current=>contenu.debts.some(d=>d.debt_id===current&&resteDette(d)>0)?current:plusPetiteDette(contenu.debts)?.debt_id??'');
   setState('pret');
  }catch{setState('erreur');}
 },[userId,essai]);
 useEffect(()=>{void charger();},[charger]);
 useEffect(()=>{document.title=(mode==='epargne'?l('Mon épargne','My savings'):l('Mes dettes','My debts'))+' — SÉNEVÉ';document.documentElement.lang=langue;},[mode,langue]);
 const dettesTriees=useMemo(()=>[...(suivi?.debts??[])].sort((a,b)=>{const ar=resteDette(a),br=resteDette(b);return (ar===0?1:0)-(br===0?1:0)||a.currency.localeCompare(b.currency)||ar-br||a.debt_number-b.debt_number;}),[suivi]);
 const objectif=suivi?.savings_goals.find(g=>g.goal_id===goal)??suivi?.savings_goals[0];
 const dettesOuvertes=dettesTriees.filter(d=>resteDette(d)>0),detteChoisie=dettesOuvertes.find(d=>d.debt_id===paymentDebt)??dettesOuvertes[0];
 const notice=(message:string)=>{setAnnonce(message);};
 const nomDette=(d:DetteSuivie)=>d.creditor_name??`${l('Dette','Debt')} ${d.debt_number}`;
 function choisirRemboursement(debtId:string) {
  if (debtId!==detteChoisie?.debt_id) setPaymentAmount('');
  setPaymentDebt(debtId);
 }
 async function enregistrerNom(e:FormEvent) {
  e.preventDefault();
  if (!inscription||!nomEnEdition||busy) return;
  if (!nomCreancierValide(nomEnEdition.nom)) {
   setErreurNom(l('Saisis le nom ou le surnom du créancier.','Enter the creditor’s name or nickname.'));
   return;
  }
  setBusy(true);
  setErreurNom('');
  try {
   const nom=await renommerDetteSuivie(inscription,nomEnEdition.id,nomEnEdition.nom);
   setSuivi(current=>current?{...current,debts:current.debts.map(d=>d.debt_id===nomEnEdition.id?{...d,creditor_name:nom}:d)}:current);
   setNomEnEdition(null);
   notice(l('Nom enregistré.','Name saved.'));
  } catch {
   setErreurNom(l('Le nom n’a pas pu être enregistré. Réessaie.','The name could not be saved. Try again.'));
  } finally {
   setBusy(false);
  }
 }
 async function confirmerSaisie(cle:string, message:string) {
  demandes.current.delete(cle);
  notice(message);
  try {
   setSuivi(await chargerSuiviFinancier(inscription!));
  } catch {
   setState('erreur');
  }
 }
 async function creerObjectif(e:FormEvent){e.preventDefault();if(!inscription||busy||!goalName.trim()||!montantValidePourDevise(goalTarget,goalCurrency)||Number(goalTarget)<=0||!monnaie(goalCurrency))return;setBusy(true);setAnnonce('');try{const demande=idDemande('objectif',goalType,goalName,goalTarget,goalCurrency);await creerObjectifEpargne(inscription,{type:goalType,label:goalName,target:goalTarget,currency:goalCurrency},demande.id);setGoalName('');setGoalTarget('');await confirmerSaisie(demande.cle,l('Objectif enregistré.','Goal saved.'));}catch{notice(l('Objectif non enregistré. Vérifie les champs et réessaie.','Goal was not saved. Check the fields and try again.'));}finally{setBusy(false);}}
 async function ajouterVersement(e:FormEvent){e.preventDefault();if(!inscription||!objectif||busy||!montantValidePourDevise(contribution,objectif.currency)||Number(contribution)<=0||!ISO.test(contributionDate))return;setBusy(true);setAnnonce('');try{const demande=idDemande('versement',objectif.goal_id,contribution,contributionDate);await enregistrerVersementEpargne(inscription,objectif.goal_id,contribution,contributionDate,objectif.currency,demande.id);setContribution('');await confirmerSaisie(demande.cle,l('Versement ajouté au suivi.','Contribution added to your tracker.'));}catch{notice(l('Versement non enregistré. Vérifie le montant et réessaie.','Contribution was not saved. Check the amount and try again.'));}finally{setBusy(false);}}
 async function creerDette(e:FormEvent) {
  e.preventDefault();
  if (!inscription||busy||!montantValidePourDevise(debtBalance,debtCurrency)||Number(debtBalance)<=0||!monnaie(debtCurrency)) return;
  if (!nomCreancierValide(nomNouvelleDette)) {
   notice(l('Saisis le nom ou le surnom du créancier.','Enter the creditor’s name or nickname.'));
   return;
  }
  const creditorName=nomNouvelleDette.trim();
  const avecRepere=debtBase.trim()!==''||debtPercent.trim()!=='';
  if (avecRepere&&!reperePret) {
   notice(l('Pour calculer un repère, saisis un montant et un pourcentage entre 0 et 100.','Enter an amount and a percentage from 0 to 100 to calculate a guide.'));
   return;
  }
  const repere=avecRepere?{base:debtBase,pourcentage:debtPercent,rythme:rythmeDette}:null;
  setBusy(true);
  setAnnonce('');
  try {
   const demande=idDemande('dette',creditorName,debtBalance,debtCurrency,repere?.rythme??'',debtBase,debtPercent);
   await creerDetteSuivie(inscription,{creditorName,openingBalance:debtBalance,currency:debtCurrency,repere},demande.id);
   setNomNouvelleDette('');
   setDebtBalance('');
   setDebtBase('');
   setDebtPercent('');
   await confirmerSaisie(demande.cle,l('Dette ajoutée au suivi.','Debt added to your tracker.'));
  } catch {
   notice(l('Dette non enregistrée. Vérifie les montants et le pourcentage.','Debt was not saved. Check the amounts and percentage.'));
  } finally {
   setBusy(false);
  }
 }
 async function enregistrerPaiement(e:FormEvent){e.preventDefault();if(!inscription||!detteChoisie||busy||!montantValidePourDevise(paymentAmount,detteChoisie.currency)||Number(paymentAmount)<=0||!ISO.test(paymentDate))return;if(montantCents(paymentAmount)>resteDette(detteChoisie)){notice(l('Le montant dépasse le solde restant de cette dette.','The amount is greater than this debt’s remaining balance.'));return;}setBusy(true);setAnnonce('');try{const demande=idDemande('remboursement',detteChoisie.debt_id,paymentAmount,paymentDate);await enregistrerPaiementDette(inscription,detteChoisie.debt_id,paymentAmount,paymentDate,detteChoisie.currency,demande.id);setPaymentAmount('');await confirmerSaisie(demande.cle,l('Remboursement ajouté. Le solde a été recalculé.','Repayment added. The balance has been recalculated.'));}catch{notice(l('Remboursement non enregistré. Vérifie le solde et réessaie.','Repayment was not saved. Check the remaining balance and try again.'));}finally{setBusy(false);}}
 const deviseOptions=DEVISES_SUIVI.map(code=><option key={code} value={code}>{code} — {nomDevise(code,en?'en':'fr')}</option>);
 const linkPages=<nav className="flex gap-2 rounded-xl bg-hd-surface-container-low p-1" aria-label={l('Suivi financier','Financial tracker')}><Link aria-current={mode==='epargne'?'page':undefined} className={`flex-1 rounded-lg px-3 py-2.5 text-center min-h-[44px] ${mode==='epargne'?'bg-white text-hd-secondary shadow-sm':'text-hd-on-surface-variant'}`} to={`/habitudes/epargne${suffix}`}>{l('Épargne','Savings')}</Link><Link aria-current={mode==='dettes'?'page':undefined} className={`flex-1 rounded-lg px-3 py-2.5 text-center min-h-[44px] ${mode==='dettes'?'bg-white text-hd-secondary shadow-sm':'text-hd-on-surface-variant'}`} to={`/habitudes/dettes${suffix}`}>{l('Dettes','Debts')}</Link></nav>;
 return <CadreHabitudes titre={mode==='epargne'?l('Mon épargne','My savings'):l('Mes dettes','My debts')} langue={langue} retour={`/habitudes/aujourdhui${suffix}`} cloche>
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-hd-margin pt-hd-space-md pb-hd-space-lg">
   {linkPages}
   <header><p className="font-hd-label-sm uppercase tracking-wider text-hd-secondary">{l('Habitudes & Défis · suivi privé','Habits & Challenges · private tracking')}</p><h1 className="font-hd-headline-md text-hd-headline-md mt-1">{mode==='epargne'?l('Mon épargne prend racine','My savings are taking root'):l('Avancer sur mes dettes','Making progress on my debts')}</h1><p className="font-hd-body-md text-hd-on-surface-variant mt-2">{mode==='epargne'?l('Saisis chaque montant réellement mis de côté. Le total et la distance jusqu’à ton objectif se mettent à jour.','Enter each amount you actually set aside. Your total and distance to your goal update.'):l('Note le solde de départ de chaque dette, puis les paiements réellement faits. Le solde restant se recalcule.','Enter each starting debt balance, then the payments actually made. The remaining balance updates.')}</p></header>
   {state==='chargement'&&<p role="status" className="bg-white rounded-xl p-4">{l('Chargement du suivi…','Loading your tracker…')}</p>}
   {state==='erreur'&&<section className="bg-white rounded-xl p-4"><p role="alert">{l('Le suivi n’est pas disponible pour le moment.','Your tracker is not available right now.')}</p><button className="mt-3 min-h-[44px] rounded-xl bg-hd-secondary px-4 text-white" onClick={()=>setEssai(x=>x+1)}>{l('Réessayer','Try again')}</button></section>}
   {state==='vide'&&<section className="bg-white rounded-xl p-4"><p>{l('Ce suivi est disponible avec un accès actif à Habitudes & Défis.','This tracker is available with active access to Habits & Challenges.')}</p><Link className="mt-3 inline-flex min-h-[44px] items-center text-hd-secondary underline" to={`/habitudes${suffix}`}>{l('Voir Habitudes & Défis','View Habits & Challenges')}</Link></section>}
   {state==='pret'&&mode==='epargne'&&<>
    {objectif?<section className="rounded-2xl bg-white p-4 shadow-sm" aria-labelledby="hd-epargne-resume"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="rounded-full bg-hd-tertiary-container px-3 py-1 text-xs text-hd-on-tertiary-container">{objectif.goal_type==='reserve_joie'?l('Réserve de joie', 'Family joy reserve'):objectif.goal_type==='epargne_investir'?l('Épargne pour investir','Savings for investing'):l('Autre objectif','Other goal')}</span><h2 id="hd-epargne-resume" className="font-hd-headline-sm mt-2">{objectif.label}</h2></div><strong className="text-xl text-hd-secondary">{formatter(totalCents(objectif.entries),objectif.currency,en)}</strong></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-hd-surface-container"><div className="h-full rounded-full bg-gradient-to-r from-hd-secondary to-emerald-500" style={{width:`${Math.min(100,totalCents(objectif.entries)/Math.max(1,montantCents(objectif.target_amount))*100)}%`}}/></div><div className="mt-2 flex justify-between text-sm text-hd-on-surface-variant"><span>{Math.min(100,totalCents(objectif.entries)/Math.max(1,montantCents(objectif.target_amount))*100).toFixed(0)} % {l('atteint','reached')}</span><span>{l('Objectif','Target')} {formatter(montantCents(objectif.target_amount),objectif.currency,en)}</span></div><div className="mt-4 rounded-xl bg-sky-50 p-4 text-center"><div aria-label={l('Jardin de progression','Progress garden')} className="relative mx-auto flex h-32 max-w-xs items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-sky-100 via-blue-50 to-amber-900"><span className="absolute right-4 top-3 text-2xl">☀️</span><span className="absolute bottom-5 h-2 w-full bg-emerald-700"/><span className="absolute bottom-7 text-5xl transition-transform" style={{transform:`scale(${.55+Math.min(100,totalCents(objectif.entries)/Math.max(1,montantCents(objectif.target_amount))*100)/170})`}}>{totalCents(objectif.entries)===0?'🌱':totalCents(objectif.entries)>=montantCents(objectif.target_amount)?'🌳':'🪴'}</span></div><p className="mt-2 text-sm text-hd-on-surface-variant">{totalCents(objectif.entries)===0?l('Ta première semence attend.','Your first seed is waiting.'):totalCents(objectif.entries)>=montantCents(objectif.target_amount)?l('Objectif atteint : ta semence a grandi.','Goal reached: your seed has grown.'):l('Chaque versement fait grandir ton jardin.','Each contribution helps your garden grow.')}</p></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-hd-surface-container-low p-3"><span className="text-xs text-hd-on-surface-variant">{l('Mis de côté','Saved')}</span><strong className="block">{formatter(totalCents(objectif.entries),objectif.currency,en)}</strong></div><div className="rounded-xl bg-hd-surface-container-low p-3"><span className="text-xs text-hd-on-surface-variant">{l('Reste à atteindre','Left to goal')}</span><strong className="block">{formatter(Math.max(0,montantCents(objectif.target_amount)-totalCents(objectif.entries)),objectif.currency,en)}</strong></div></div></section>:<section className="rounded-2xl bg-white p-4"><p>{l('Crée un objectif pour commencer ton suivi.','Create a goal to start tracking.')}</p></section>}
    {!!suivi?.savings_goals.length&&<section className="rounded-2xl bg-white p-4"><h2 className="font-hd-headline-sm">{l('Mes objectifs','My goals')}</h2><label className="mt-2 flex flex-col gap-1 text-sm">{l('Choisir un objectif','Choose a goal')}<select className="min-h-[44px] rounded-lg border px-3" value={objectif?.goal_id??''} onChange={e=>setGoal(e.target.value)}>{suivi.savings_goals.map(g=><option key={g.goal_id} value={g.goal_id}>{g.label} · {g.currency}</option>)}</select></label></section>}
    <section className="rounded-2xl bg-white p-4"><h2 className="font-hd-headline-sm">{l('Créer un objectif','Create a goal')}</h2><p className="mt-1 text-sm text-hd-on-surface-variant">{l('Par exemple, fixe 1 000 USD comme cible. Ce montant est un objectif personnel, sans prélèvement automatique.','For example, set USD 1,000 as your target. This is a personal goal; no automatic transfer is made.')}</p><form className="mt-3 flex flex-col gap-3" onSubmit={e=>void creerObjectif(e)}><label className="flex flex-col gap-1 text-sm">{l('Nom','Name')}<input required maxLength={60} value={goalName} onChange={e=>setGoalName(e.target.value)} className="min-h-[44px] rounded-lg border px-3" placeholder={l('Ex. Réserve familiale','E.g. Family reserve')}/></label><div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-1 text-sm">{l('Type','Type')}<select value={goalType} onChange={e=>setGoalType(e.target.value as TypeObjectifEpargne)} className="min-h-[44px] rounded-lg border px-2"><option value="reserve_joie">{l('Réserve de joie','Family joy reserve')}</option><option value="epargne_investir">{l('Épargne pour investir','Savings for investing')}</option><option value="autre">{l('Autre objectif','Other goal')}</option></select></label><label className="flex flex-col gap-1 text-sm">{l('Montant cible','Target amount')}<input required min={decimalesDevise(goalCurrency)===0?1:0.01} step={decimalesDevise(goalCurrency)===0?1:0.01} type="number" value={goalTarget} onChange={e=>setGoalTarget(e.target.value)} className="min-h-[44px] rounded-lg border px-3" placeholder="1000"/></label></div><label className="flex flex-col gap-1 text-sm">{l('Devise','Currency')}<select value={goalCurrency} onChange={e=>setGoalCurrency(e.target.value)} className="min-h-[44px] rounded-lg border px-3">{deviseOptions}</select></label><button disabled={busy} className="min-h-[46px] rounded-xl bg-hd-secondary px-4 font-semibold text-white disabled:opacity-60">{busy?l('Enregistrement…','Saving…'):l('Créer mon objectif','Create my goal')}</button></form></section>
    {objectif&&<section className="rounded-2xl bg-white p-4"><h2 className="font-hd-headline-sm">{l('Ajouter un versement','Add a contribution')}</h2><p className="mt-1 text-sm text-hd-on-surface-variant">{l('Entre le montant réellement mis de côté.','Enter the amount you actually set aside.')}</p><form className="mt-3 flex flex-col gap-3" onSubmit={e=>void ajouterVersement(e)}><label className="flex flex-col gap-1 text-sm">{l('Objectif','Goal')}<select className="min-h-[44px] rounded-lg border px-3" value={objectif.goal_id} onChange={e=>setGoal(e.target.value)}>{suivi?.savings_goals.map(g=><option key={g.goal_id} value={g.goal_id}>{g.label} · {g.currency}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-1 text-sm">{l('Montant versé','Amount saved')}<input required min={decimalesDevise(objectif.currency)===0?1:0.01} step={decimalesDevise(objectif.currency)===0?1:0.01} type="number" value={contribution} onChange={e=>setContribution(e.target.value)} className="min-h-[44px] rounded-lg border px-3" placeholder="25.00"/></label><label className="flex flex-col gap-1 text-sm">{l('Date','Date')}<input required max={AUJOURDHUI} type="date" value={contributionDate} onChange={e=>setContributionDate(e.target.value)} className="min-h-[44px] rounded-lg border px-2"/></label></div><button disabled={busy} className="min-h-[46px] rounded-xl bg-hd-secondary px-4 font-semibold text-white disabled:opacity-60">{busy?l('Enregistrement…','Saving…'):l('Ajouter à mon épargne','Add to savings')}</button></form><HistoriqueEpargne objectif={objectif} langue={langue}/></section>}
   </>}
   {state==='pret'&&mode==='dettes'&&<>
    <section className="rounded-2xl bg-white p-4"><h2 className="font-hd-headline-sm">{l('Solde restant','Remaining balance')}</h2>{Array.from(new Set(dettesTriees.map(d=>d.currency))).map(currency=>{const groupe=dettesTriees.filter(d=>d.currency===currency),ouverture=groupe.reduce((n,d)=>n+montantCents(d.opening_balance),0),rembourse=groupe.reduce((n,d)=>n+totalCents(d.payments),0),p=ouverture?Math.min(100,rembourse/ouverture*100):0;return <div key={currency} className="mt-3"><div className="flex justify-between gap-2"><strong>{currency}</strong><strong>{formatter(Math.max(0,ouverture-rembourse),currency,en)}</strong></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-hd-surface-container"><div className="h-full rounded-full bg-emerald-600" style={{width:`${p}%`}}/></div><div className="mt-1 flex justify-between text-xs text-hd-on-surface-variant"><span>{l('Remboursé','Repaid')} {formatter(rembourse,currency,en)}</span><span>{l('sur','of')} {formatter(ouverture,currency,en)}</span></div></div>})}{!dettesTriees.length&&<p className="mt-2 text-sm text-hd-on-surface-variant">{l('Ajoute une dette pour voir le suivi.','Add a debt to see your tracker.')}</p>}</section>
    {dettesTriees.length>0&&<section aria-labelledby="hd-mes-dettes">
     <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div>
       <h2 id="hd-mes-dettes" className="font-hd-headline-sm">{l('Mes dettes','My debts')}</h2>
       <p className="mt-1 text-sm text-hd-on-surface-variant">{l('Dans chaque devise, le plus petit solde est affiché en premier.','Within each currency, the smallest balance appears first.')}</p>
      </div>
      <a href="#hd-ajouter-dette" className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-hd-secondary-container px-3 font-semibold text-hd-on-secondary-container">
       {l('Ajouter une dette','Add a debt')}
      </a>
     </div>
     <div className="grid gap-3 sm:grid-cols-2">
      {dettesTriees.map(d=>{
       const rembourse=totalCents(d.payments);
       const reste=resteDette(d);
       const pourcentage=Math.min(100,Math.round(rembourse/Math.max(1,montantCents(d.opening_balance))*100));
       const plusPetite=dettesOuvertes.find(x=>x.currency===d.currency)?.debt_id===d.debt_id;
       const edition=nomEnEdition?.id===d.debt_id?nomEnEdition:null;
       return <article key={d.debt_id} className="min-w-0 rounded-2xl border border-hd-surface-container bg-white p-4 shadow-sm" aria-labelledby={`hd-titre-${d.debt_id}`}>
        <div className="flex items-start gap-3">
         <div aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-hd-secondary-container/40 text-hd-secondary">
          <IconeHD nom={reste===0?'check_circle':'account_balance'}/>
         </div>
         <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-hd-on-surface-variant">{d.creditor_name?`${l('Dette','Debt')} ${d.debt_number} · ${d.currency}`:d.currency}</p>
          <h3 id={`hd-titre-${d.debt_id}`} className="mt-0.5 font-semibold [overflow-wrap:anywhere]">{nomDette(d)}</h3>
         </div>
         <span className="shrink-0 rounded-full bg-hd-surface-container-low px-2.5 py-1 text-xs font-medium text-hd-on-surface-variant">
          {reste===0?l('Soldée','Paid'):plusPetite?l('Plus petit solde','Smallest balance'):l('En cours','In progress')}
         </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2">
         <div className="min-w-0 rounded-xl bg-hd-surface-container-low p-2.5">
          <dt className="text-xs text-hd-on-surface-variant">{l('Reste à payer','Left to pay')}</dt>
          <dd className="mt-0.5 font-bold text-hd-secondary [overflow-wrap:anywhere]">{formatter(reste,d.currency,en)}</dd>
         </div>
         <div className="min-w-0 rounded-xl bg-hd-surface-container-low p-2.5">
          <dt className="text-xs text-hd-on-surface-variant">{l('Déjà remboursé','Already repaid')}</dt>
          <dd className="mt-0.5 font-semibold [overflow-wrap:anywhere]">{formatter(rembourse,d.currency,en)}</dd>
         </div>
        </dl>
        <div className="mt-3 flex items-center gap-3">
         <div role="progressbar" aria-label={l('Progression du remboursement','Repayment progress')} aria-valuenow={pourcentage} className="h-2 flex-1 overflow-hidden rounded-full bg-hd-surface-container">
          <div className="h-full rounded-full bg-emerald-600" style={{width:`${pourcentage}%`}}/>
         </div>
         <span aria-hidden="true" className="text-xs text-hd-on-surface-variant">{pourcentage} %</span>
        </div>
        {d.repere&&<p className="mt-2 text-xs text-hd-on-surface-variant">
         {l('Repère choisi','Chosen guide')}: <strong>{montantRepere(d.repere.base,d.repere.pourcentage,d.currency)} {periode(d.repere.rythme)}</strong>
        </p>}
        <div className="mt-3 flex flex-wrap gap-2">
         {reste>0&&<button type="button" className="min-h-[44px] rounded-lg bg-hd-secondary px-3 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} onClick={()=>{
          choisirRemboursement(d.debt_id);
          titreRemboursement.current?.focus();
         }}>{l('Rembourser','Record repayment')}</button>}
         <button type="button" aria-expanded={!!edition} disabled={busy} className="min-h-[44px] rounded-lg border border-hd-surface-container px-3 text-sm font-medium text-hd-secondary" onClick={()=>{
          setErreurNom('');
          setNomEnEdition(edition?null:{id:d.debt_id,nom:d.creditor_name??''});
         }}>{d.creditor_name?l('Modifier le nom','Edit name'):l('Ajouter un nom','Add a name')}</button>
        </div>
        {edition&&<form className="mt-3 flex flex-col gap-2 rounded-xl bg-hd-surface-container-low p-3" onSubmit={e=>void enregistrerNom(e)}>
         <label className="flex flex-col gap-1 text-sm font-medium">
          {l('Nom du créancier','Creditor name')}
          <input autoFocus required maxLength={LONGUEUR_NOM_CREANCIER} value={edition.nom} onChange={e=>setNomEnEdition({id:d.debt_id,nom:e.target.value})} aria-invalid={!!erreurNom} aria-describedby={erreurNom?'hd-erreur-nom':undefined} className="min-h-[44px] w-full rounded-lg border bg-white px-3" placeholder={l('Ex. Banque, fournisseur ou proche','E.g. Bank, supplier or relative')}/>
         </label>
         {erreurNom&&<p id="hd-erreur-nom" role="alert" className="text-sm text-red-700">{erreurNom}</p>}
         <div className="flex flex-wrap gap-2">
          <button disabled={busy} className="min-h-[44px] rounded-lg bg-hd-secondary px-3 text-sm font-semibold text-white">{l('Enregistrer le nom','Save name')}</button>
          <button type="button" disabled={busy} className="min-h-[44px] rounded-lg px-3 text-sm" onClick={()=>setNomEnEdition(null)}>{l('Annuler','Cancel')}</button>
         </div>
        </form>}
        {d.payments.length>0&&<details className="mt-2 border-t border-hd-surface-container">
         <summary className="min-h-[44px] py-3 text-sm font-medium text-hd-secondary">{l('Historique des remboursements','Repayment history')} ({d.payments.length})</summary>
         <ol className="flex flex-col gap-1 text-sm">
          {[...d.payments].reverse().map(p=><li key={p.payment_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-hd-surface-container-low px-3 py-2">
           <time dateTime={p.date_locale}>{p.date_locale}</time><strong>{formatter(montantCents(p.amount),d.currency,en)}</strong>
          </li>)}
         </ol>
        </details>}
       </article>;
      })}
     </div>
    </section>}
    <section id="hd-ajouter-dette" className="scroll-mt-24 rounded-2xl bg-white p-4 shadow-sm">
     <h2 className="font-hd-headline-sm">{l('Ajouter une dette','Add a debt')}</h2>
     <p className="mt-1 text-sm text-hd-on-surface-variant">{l('Commence par indiquer à qui tu dois de l’argent.','Start by naming who you owe.')}</p>
     <form className="mt-3 flex flex-col gap-3" onSubmit={e=>void creerDette(e)}>
      <label className="flex flex-col gap-1 text-sm font-medium">
       {l('Nom du créancier','Creditor name')}
       <input required maxLength={LONGUEUR_NOM_CREANCIER} value={nomNouvelleDette} onChange={e=>setNomNouvelleDette(e.target.value)} aria-describedby="hd-nom-creancier-aide" className="min-h-[44px] w-full rounded-lg border px-3" placeholder={l('Ex. Banque, fournisseur ou proche','E.g. Bank, supplier or relative')}/>
      </label>
      <p id="hd-nom-creancier-aide" className="-mt-2 text-xs text-hd-on-surface-variant">{l('Un nom ou un surnom suffit pour reconnaître la dette.','A name or nickname is enough to recognize the debt.')}</p>
      <div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-1 text-sm">{l('Solde de départ','Starting balance')}<input required min={decimalesDevise(debtCurrency)===0?1:0.01} step={decimalesDevise(debtCurrency)===0?1:0.01} type="number" value={debtBalance} onChange={e=>setDebtBalance(e.target.value)} className="min-h-[44px] rounded-lg border px-3" placeholder="120"/></label><label className="flex flex-col gap-1 text-sm">{l('Devise','Currency')}<select value={debtCurrency} onChange={e=>setDebtCurrency(e.target.value)} className="min-h-[44px] rounded-lg border px-3">{deviseOptions}</select></label></div><details>
     <summary className="min-h-[44px] flex items-center">{l('Définir un repère de remboursement','Set a repayment guide')}</summary>
     <p className="mb-3 text-sm text-hd-on-surface-variant">{l('Facultatif. Choisis le rythme qui correspond à ton revenu. Ton solde diminue quand tu enregistres un remboursement.','Optional. Choose the schedule that matches your income. Your balance drops when you record a repayment.')}</p>
     <label className="flex flex-col gap-1 text-sm">
      {l('Situation de revenu','Income situation')}
      <select className="min-h-[44px] rounded-lg border px-3" value={rythmeDette} onChange={e=>{
       setRythmeDette(e.target.value==='hebdomadaire'?'hebdomadaire':'mensuel');
       setDebtBase('');
      }}>
       <option value="mensuel">{l('Salarié · par mois','Employee · monthly')}</option>
       <option value="hebdomadaire">{l('Commerçant ou entrepreneur · par semaine','Merchant or entrepreneur · weekly')}</option>
      </select>
     </label>
     <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
       {hebdomadaire?l('Bénéfice net de la semaine','Weekly net profit'):l('Salaire net du mois','Monthly take-home pay')}
       <input aria-describedby="hd-dette-revenu-aide" min="0" step={decimalesDevise(debtCurrency)===0?1:0.01} type="number" value={debtBase} onChange={e=>setDebtBase(e.target.value)} className="min-h-[44px] rounded-lg border px-3" placeholder={hebdomadaire?'150':'600'}/>
      </label>
      <label className="flex flex-col gap-1 text-sm">
       {l('Pourcentage consacré à cette dette','Percentage for this debt')}
       <input min="0" max="100" step="0.01" type="number" value={debtPercent} onChange={e=>setDebtPercent(e.target.value)} className="min-h-[44px] rounded-lg border px-3" placeholder="10"/>
      </label>
     </div>
     <p id="hd-dette-revenu-aide" className="mt-2 text-xs text-hd-on-surface-variant">{hebdomadaire
      ?l('Saisis ce qu’il reste après le coût des marchandises et les dépenses de ton activité. Si ton bénéfice varie, tu peux saisir une moyenne par semaine.','Enter what remains after the cost of goods and business expenses. If profit varies, you can enter a weekly average.')
      :l('Saisis le montant que tu reçois après les retenues sur ton salaire.','Enter what you receive after payroll deductions.')}</p>
     {reperePret&&<p role="status" className="mt-3 rounded-xl bg-hd-surface-container-low p-3 text-sm">
      {l('Repère','Guide')}: <strong>{montantRepere(debtBase,debtPercent,debtCurrency)} {periode(rythmeDette)}</strong>
     </p>}
    </details><button disabled={busy} className="min-h-[46px] rounded-xl bg-hd-secondary px-4 font-semibold text-white disabled:opacity-60">{busy?l('Enregistrement…','Saving…'):l('Ajouter cette dette','Add this debt')}</button></form></section>
    <section className="rounded-2xl bg-white p-4"><h2 ref={titreRemboursement} tabIndex={-1} className="scroll-mt-24 font-hd-headline-sm">{l('Enregistrer un remboursement','Record a repayment')}</h2>{detteChoisie?<form className="mt-3 flex flex-col gap-3" onSubmit={e=>void enregistrerPaiement(e)}><label className="flex flex-col gap-1 text-sm">{l('Dette à rembourser','Debt to repay')}<select value={detteChoisie.debt_id} onChange={e=>choisirRemboursement(e.target.value)} className="min-h-[44px] rounded-lg border px-3">{dettesOuvertes.map(d=><option key={d.debt_id} value={d.debt_id}>{nomDette(d)} · {formatter(resteDette(d),d.currency,en)}</option>)}</select></label>{dettesOuvertes.find(d=>d.currency===detteChoisie.currency)?.debt_id===detteChoisie.debt_id&&<p className="rounded-xl bg-hd-secondary-container/30 p-3 text-sm">{l('Cette dette a le plus petit solde dans sa devise. Tu peux en choisir une autre.','This debt has the smallest balance in its currency. You can choose another.')}</p>}<div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-1 text-sm">{l('Montant payé','Amount paid')}<input required min={decimalesDevise(detteChoisie.currency)===0?1:0.01} max={moneyInput(resteDette(detteChoisie))} step={decimalesDevise(detteChoisie.currency)===0?1:0.01} type="number" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} className="min-h-[44px] rounded-lg border px-3" placeholder="20.00"/></label><label className="flex flex-col gap-1 text-sm">{l('Date','Date')}<input required max={AUJOURDHUI} type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)} className="min-h-[44px] rounded-lg border px-2"/></label></div><button disabled={busy} className="min-h-[46px] rounded-xl bg-hd-secondary px-4 font-semibold text-white disabled:opacity-60">{busy?l('Enregistrement…','Saving…'):l('Enregistrer le paiement','Record payment')}</button></form>:<p className="mt-2 text-sm text-hd-on-surface-variant">{l('Ajoute une dette pour pouvoir consigner un remboursement.','Add a debt before recording a repayment.')}</p>}</section>
   </>}
   {annonce&&<p role="status" aria-live="polite" className="rounded-xl bg-hd-surface-container-low p-3">{annonce}</p>}
   <p className="flex items-start gap-2 rounded-xl bg-hd-surface-container-low p-3 text-xs text-hd-on-surface-variant"><IconeHD nom="lock" className="shrink-0 text-hd-secondary"/>{l('Suivi privé réservé à ton compte. Les montants ne sont pas partagés. Aucun paiement ou transfert n’est déclenché. Les dettes et l’épargne restent séparées par devise.','Private tracking for your account. Amounts are not shared. No payment or transfer is triggered. Debts and savings stay separate by currency.')}</p>
  </div>
 </CadreHabitudes>;
}
function plusPetiteDette(debts:DetteSuivie[]){return debts.filter(d=>resteDette(d)>0).sort((a,b)=>a.currency.localeCompare(b.currency)||resteDette(a)-resteDette(b)||a.debt_number-b.debt_number)[0];}
function HistoriqueEpargne({objectif,langue}:{objectif:ObjectifEpargne;langue:string}){const en=langue==='en';return <details className="mt-4"><summary className="min-h-[44px] flex items-center font-semibold">{en?'Contribution history':'Historique des versements'} ({objectif.entries.length})</summary><ol className="mt-2 flex flex-col gap-2">{[...objectif.entries].reverse().map(entry=><li key={entry.entry_id} className="flex justify-between gap-3 rounded-lg bg-hd-surface-container-low px-3 py-2 text-sm"><span>{entry.date_locale}</span><strong>+ {formatter(montantCents(entry.amount),objectif.currency,en)}</strong></li>)}</ol>{!objectif.entries.length&&<p className="text-sm text-hd-on-surface-variant">{en?'No contributions yet.':'Aucun versement pour le moment.'}</p>}</details>;}
export function RouteSuiviEpargneDettes({mode}:{mode:Mode}) {
 return suiviFinancierActive() ? <ComptePrive enfants={userId=><SuiviEpargneDettes mode={mode} userId={userId}/>}/> : <NotFound/>;
}
