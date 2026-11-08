import './SimulateurEpargne.css';
import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {ComptePrive} from '@/components/ComptePrive';
import {IconeHD} from '@/components/IconeHabitudes';
import {chargerSuiviFinancier,supprimerObjectif,supprimerDette,creerDetteSuivie,creerObjectifEpargne,enregistrerPaiementDette,enregistrerVersementEpargne,renommerDetteSuivie,nomCreancierValide,LONGUEUR_NOM_CREANCIER,type DetteSuivie,type ObjectifEpargne,type TypeObjectifEpargne,type SuiviFinancier,type RythmeRepereDette} from '@/lib/habitudes-finances-suivi';
import {suiviFinancierActive} from '@/lib/habitudes-configuration';
import {decimalesDevise,deviseAcceptee,montantValidePourDevise} from '@/lib/devises';
import {repartirSurDettes} from '@/lib/habitudes-repartition';
import {ChoixDevise,ChoixTypeObjectif} from './ChoixDevise';
import {momentLisible} from '@/lib/date-heure-finances';
import {chargerCompteurs,type Compteurs,type Motif} from '@/lib/habitudes-finances-compteurs';
import {NotFound} from '@/routes/introuvable';

type Mode='epargne'|'dettes';
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const montantCents=(v:string)=>Math.round(Number(v)*100);
const totalCents=(xs:{amount:string}[])=>xs.reduce((n,x)=>n+montantCents(x.amount),0);
const resteDette=(d:DetteSuivie)=>Math.max(0,montantCents(d.opening_balance)-totalCents(d.payments));
/** Montant lisible ; les centimes ne s'affichent que s'il y en a (« 150 000 CDF », « 25,50 $US »). */
const formatter=(centimes:number,devise:string,en:boolean)=>{const dec=decimalesDevise(devise);return new Intl.NumberFormat(en?'en-US':'fr-FR',{style:'currency',currency:devise,minimumFractionDigits:centimes%100===0?0:dec,maximumFractionDigits:dec}).format(centimes/100);};
const nombre=(centimes:number,devise:string,en:boolean)=>{const dec=decimalesDevise(devise);return new Intl.NumberFormat(en?'en-US':'fr-FR',{minimumFractionDigits:centimes%100===0?0:dec,maximumFractionDigits:dec}).format(centimes/100);};
const monnaie=deviseAcceptee;
/** Dollar proposé en premier (demande de Dr Justin du 07/11/2026, qui remplace le franc congolais). */
const DEVISE_DEFAUT='USD';
const aujourdhui=()=>new Intl.DateTimeFormat('en-CA').format(new Date());
/** « 2026-11-07 » devient « 7 novembre 2026 » (ou « 7 November 2026 »), sans décalage de fuseau. */
export const dateLisible=(iso:string,en:boolean)=>ISO.test(iso)?new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z')):iso;
const dateCourte=(iso:string,en:boolean)=>ISO.test(iso)?new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z')):iso;
type Zone=string;

/** Ligne d'un groupe façon Réglages iPhone : libellé à gauche, champ ou valeur à droite. */
function Ligne({id,libelle,children}:{id?:string;libelle:ReactNode;children?:ReactNode}){
 return <div className="sim-ios-ligne">{id?<label htmlFor={id}>{libelle}</label>:<span className="flex-1 min-w-0" style={{fontSize:16}}>{libelle}</span>}{children}</div>;
}

/** Pages privées du suivi financier, présentation iPhone validée sur maquette le 07/11/2026.
 * Chaque saisie passe par une RPC serveur ; aucun paiement n'est lancé. */
export function SuiviEpargneDettes({mode,userId}:{mode:Mode;userId:string}){
 const [params]=useSearchParams(),en=params.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr;
 const [state,setState]=useState<'chargement'|'pret'|'vide'|'erreur'>('chargement');
 const [suivi,setSuivi]=useState<SuiviFinancier|null>(null),[essai,setEssai]=useState(0),[busy,setBusy]=useState(false),[annonce,setAnnonce]=useState<{zone:Zone;texte:string;erreur:boolean}|null>(null);
 const [goal,setGoal]=useState(''),[goalName,setGoalName]=useState(''),[goalType,setGoalType]=useState<TypeObjectifEpargne>('reserve_joie'),[goalTarget,setGoalTarget]=useState(''),[goalCurrency,setGoalCurrency]=useState(DEVISE_DEFAUT),[contribution,setContribution]=useState(''),[contributionDate,setContributionDate]=useState(aujourdhui);
 const [nouvelObjectif,setNouvelObjectif]=useState(false);
 const [debtBalance,setDebtBalance]=useState(''),[debtCurrency,setDebtCurrency]=useState(DEVISE_DEFAUT),[debtBase,setDebtBase]=useState(''),[debtPercent,setDebtPercent]=useState(''),[paymentAmount,setPaymentAmount]=useState(''),[paymentDate,setPaymentDate]=useState(aujourdhui);
 const [ouverte,setOuverte]=useState(''),[ajoutDette,setAjoutDette]=useState(false);
 const [nomNouvelleDette,setNomNouvelleDette]=useState('');
 const [nomEnEdition,setNomEnEdition]=useState<{id:string;nom:string}|null>(null);
 const [erreurNom,setErreurNom]=useState('');
 const formulaireDette=useRef<HTMLElement>(null);
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
 // Retraits notés dans Mes compteurs (07/11/2026) : ils diminuent le disponible de l'objectif et apparaissent dans son historique.
 const [cpt,setCpt]=useState<Compteurs|null>(null);
 // Suppression (07/11/2026) : confirmation d'abord, puis « Annuler » pendant quelques secondes.
 const [aConfirmer,setAConfirmer]=useState<{type:'objectif'|'dette';id:string;nom:string;detail:string}|null>(null);
 const [annulable,setAnnulable]=useState<{type:'objectif'|'dette';id:string;nom:string}|null>(null);
 const minuterie=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(minuterie.current)clearTimeout(minuterie.current);},[]);
 const retraitsDe=(goalId:string)=>cpt?.withdrawals.filter(w=>w.goal_id===goalId)??[];
 const disponibleDe=(g:ObjectifEpargne)=>totalCents(g.entries)-totalCents(retraitsDe(g.goal_id));
 const charger=useCallback(async()=>{
  setState('chargement');
  try{
   const contenu=await chargerSuiviFinancier(null);
   if(!contenu){setSuivi(null);setState('vide');return;}
   setSuivi(contenu);setGoal(current=>contenu.savings_goals.some(g=>g.goal_id===current)?current:contenu.savings_goals[0]?.goal_id??'');
   setCpt(await chargerCompteurs(contenu.enrollment_id).catch(()=>null));
   setState('pret');
  }catch{setState('erreur');}
 },[userId,essai]);
 useEffect(()=>{void charger();},[charger]);
 const montantRecu=params.get('montant'),deviseRecue=params.get('devise'),typeRecu=params.get('type');
 const prerempli=useRef(false);
 const [propositionDettes,setPropositionDettes]=useState<{id:string;centimes:number;solde:boolean}[]|null>(null);
 useEffect(()=>{
  if(prerempli.current||state!=='pret'||!suivi||!montantRecu||!/^\d+(?:\.\d{1,2})?$/.test(montantRecu))return;
  prerempli.current=true;
  if(mode==='epargne'){
   const cible=suivi.savings_goals.find(g=>g.goal_type===typeRecu&&g.currency===deviseRecue)??suivi.savings_goals.find(g=>g.currency===deviseRecue);
   if(cible){setGoal(cible.goal_id);setContribution(montantRecu);setAnnonce({zone:'versement',texte:l(`Montant venu de ta répartition : vérifie-le, puis ajoute-le.`,`Amount from your allocation: check it, then add it.`),erreur:false});}
   else{setNouvelObjectif(true);setAnnonce({zone:'objectif',texte:l(`Crée d’abord un objectif en ${deviseRecue??''} pour y mettre ce montant.`,`First create a goal in ${deviseRecue??''} to put this amount in.`),erreur:false});}
  }else{
   const ouvertes=suivi.debts.filter(d=>d.currency===deviseRecue&&resteDette(d)>0);
   const {propositions}=repartirSurDettes(montantCents(montantRecu),ouvertes.map(d=>({id:d.debt_id,resteCentimes:resteDette(d)})));
   setPropositionDettes(propositions);
   const premiere=propositions[0];
   if(premiere){setOuverte(premiere.id);setPaymentAmount((premiere.centimes/100).toFixed(decimalesDevise(deviseRecue??'CDF')));}
  }
 },[state,suivi,montantRecu,deviseRecue,typeRecu,mode]);
 const titrePage=mode==='epargne'?l('Mon épargne','My savings'):l('Mon suivi des dettes','My debt tracker');
 useEffect(()=>{document.title=titrePage+' — SÉNEVÉ';document.documentElement.lang=langue;},[titrePage,langue]);
 const dettesTriees=useMemo(()=>[...(suivi?.debts??[])].sort((a,b)=>{const ar=resteDette(a),br=resteDette(b);return (ar===0?1:0)-(br===0?1:0)||a.currency.localeCompare(b.currency)||ar-br||a.debt_number-b.debt_number;}),[suivi]);
 const objectif=suivi?.savings_goals.find(g=>g.goal_id===goal)??suivi?.savings_goals[0];
 const dettesOuvertes=dettesTriees.filter(d=>resteDette(d)>0);
 const notice=(message:string,zone:Zone,erreur=false)=>{setAnnonce({zone,texte:message,erreur});};
 const nomDette=(d:DetteSuivie)=>d.creditor_name??`${l('Dette','Debt')} ${d.debt_number}`;
 function basculerDette(debtId:string){
  setPaymentAmount('');setPaymentDate(aujourdhui());setNomEnEdition(null);setErreurNom('');
  setOuverte(current=>current===debtId?'':debtId);
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
   notice(l('Nom enregistré.','Name saved.'),'nom:'+nomEnEdition.id);
   setNomEnEdition(null);
  } catch {
   setErreurNom(l('Le nom n’a pas pu être enregistré. Réessaie.','The name could not be saved. Try again.'));
  } finally {
   setBusy(false);
  }
 }
async function relire(){if(!inscription)return;setSuivi(await chargerSuiviFinancier(inscription));setCpt(await chargerCompteurs(inscription).catch(()=>null));}
 async function supprimer(){
  if(!aConfirmer||!inscription||busy)return;const c=aConfirmer;setBusy(true);
  try{
   if(c.type==='objectif')await supprimerObjectif(inscription,c.id,true);else await supprimerDette(inscription,c.id,true);
   setAConfirmer(null);setOuverte('');await relire();
   setAnnulable({type:c.type,id:c.id,nom:c.nom});
   if(minuterie.current)clearTimeout(minuterie.current);minuterie.current=setTimeout(()=>setAnnulable(null),8000);
  }catch{setAConfirmer(null);notice(l('La suppression n’a pas pu se faire. Réessaie.','Deleting did not work. Try again.'),'haut',true);}
  finally{setBusy(false);}
 }
 async function annulerSuppression(){
  if(!annulable||!inscription||busy)return;const c=annulable;setBusy(true);
  try{if(c.type==='objectif'){await supprimerObjectif(inscription,c.id,false);setGoal(c.id);}else await supprimerDette(inscription,c.id,false);setAnnulable(null);await relire();notice(l(`« ${c.nom} » est revenu.`,`“${c.nom}” is back.`),'haut');}
  catch{notice(l('Impossible d’annuler pour le moment.','Could not undo right now.'),'haut',true);}
  finally{setBusy(false);}
 }
 async function confirmerSaisie(cle:string, message:string, zone:Zone) {
  demandes.current.delete(cle);
  notice(message,zone);
  try {
   setSuivi(await chargerSuiviFinancier(inscription!));
   setCpt(await chargerCompteurs(inscription!).catch(()=>null));
  } catch {
   setState('erreur');
  }
 }
 const montantInvalide=(zone:Zone)=>notice(l('Écris un montant plus grand que 0, avec des chiffres seulement (par exemple 25 ou 25.50).','Enter an amount above 0, using digits only (for example 25 or 25.50).'),zone,true);
 const dateFuture=(zone:Zone)=>notice(l('Choisis une date qui n’est pas dans le futur.','Choose a date that is not in the future.'),zone,true);
 async function creerObjectif(e:FormEvent){
  e.preventDefault();if(!inscription||busy)return;
  if(!goalName.trim()){notice(l('Donne un nom à ton objectif.','Give your goal a name.'),'objectif',true);return;}
  if(!montantValidePourDevise(goalTarget,goalCurrency)||Number(goalTarget)<=0||!monnaie(goalCurrency)){montantInvalide('objectif');return;}
  setBusy(true);setAnnonce(null);
  try{const demande=idDemande('objectif',goalType,goalName,goalTarget,goalCurrency);const cree=await creerObjectifEpargne(inscription,{type:goalType,label:goalName,target:goalTarget,currency:goalCurrency},demande.id) as {goal_id?:string}|undefined;setGoalName('');setGoalTarget('');setNouvelObjectif(false);if(cree?.goal_id)setGoal(cree.goal_id);await confirmerSaisie(demande.cle,l('Objectif enregistré.','Goal saved.'),'versement');}
  catch{notice(l('Objectif non enregistré. Vérifie les champs et réessaie.','Goal was not saved. Check the fields and try again.'),'objectif',true);}
  finally{setBusy(false);}
 }
 async function ajouterVersement(e:FormEvent){
  e.preventDefault();if(!inscription||!objectif||busy)return;
  if(!montantValidePourDevise(contribution,objectif.currency)||Number(contribution)<=0){montantInvalide('versement');return;}
  if(!ISO.test(contributionDate)||contributionDate>aujourdhui()){dateFuture('versement');return;}
  setBusy(true);setAnnonce(null);
  try{const demande=idDemande('versement',objectif.goal_id,contribution,contributionDate);await enregistrerVersementEpargne(inscription,objectif.goal_id,contribution,contributionDate,objectif.currency,demande.id);const total=disponibleDe(objectif)+montantCents(contribution);setContribution('');await confirmerSaisie(demande.cle,l(`Versement ajouté. Ton disponible est maintenant de ${formatter(total,objectif.currency,false)}.`,`Contribution added. You now have ${formatter(total,objectif.currency,true)}.`),'versement');}
  catch{notice(l('Versement non enregistré. Vérifie le montant et réessaie.','Contribution was not saved. Check the amount and try again.'),'versement',true);}
  finally{setBusy(false);}
 }
 async function creerDette(e:FormEvent) {
  e.preventDefault();
  if (!inscription||busy) return;
  if (!nomCreancierValide(nomNouvelleDette)) {
   notice(l('Saisis le nom ou le surnom du créancier.','Enter the creditor’s name or nickname.'),'dette',true);
   return;
  }
  if (!montantValidePourDevise(debtBalance,debtCurrency)||Number(debtBalance)<=0||!monnaie(debtCurrency)) {montantInvalide('dette');return;}
  const creditorName=nomNouvelleDette.trim();
  const avecRepere=debtBase.trim()!==''||debtPercent.trim()!=='';
  if (avecRepere&&!reperePret) {
   notice(l('Pour calculer un repère, saisis un montant et un pourcentage entre 0 et 100.','Enter an amount and a percentage from 0 to 100 to calculate a guide.'),'dette',true);
   return;
  }
  const repere=avecRepere?{base:debtBase,pourcentage:debtPercent,rythme:rythmeDette}:null;
  setBusy(true);
  setAnnonce(null);
  try {
   const demande=idDemande('dette',creditorName,debtBalance,debtCurrency,repere?.rythme??'',debtBase,debtPercent);
   await creerDetteSuivie(inscription,{creditorName,openingBalance:debtBalance,currency:debtCurrency,repere},demande.id);
   setNomNouvelleDette('');
   setDebtBalance('');
   setDebtBase('');
   setDebtPercent('');
   setAjoutDette(false);
   await confirmerSaisie(demande.cle,l(`Dette ajoutée : ${creditorName}.`,`Debt added: ${creditorName}.`),'liste');
  } catch {
   notice(l('Dette non enregistrée. Vérifie les montants et le pourcentage.','Debt was not saved. Check the amounts and percentage.'),'dette',true);
  } finally {
   setBusy(false);
  }
 }
 async function enregistrerPaiement(e:FormEvent,d:DetteSuivie){
  e.preventDefault();const zone='paiement:'+d.debt_id;if(!inscription||busy)return;
  if(!montantValidePourDevise(paymentAmount,d.currency)||Number(paymentAmount)<=0){montantInvalide(zone);return;}
  if(!ISO.test(paymentDate)||paymentDate>aujourdhui()){dateFuture(zone);return;}
  if(montantCents(paymentAmount)>resteDette(d)){notice(l('Le montant dépasse le solde restant de cette dette.','The amount is greater than this debt’s remaining balance.'),zone,true);return;}
  setBusy(true);setAnnonce(null);
  try{const demande=idDemande('remboursement',d.debt_id,paymentAmount,paymentDate);await enregistrerPaiementDette(inscription,d.debt_id,paymentAmount,paymentDate,d.currency,demande.id);setPaymentAmount('');await confirmerSaisie(demande.cle,l('Remboursement ajouté. Le solde a été recalculé.','Repayment added. The balance has been recalculated.'),zone);}
  catch{notice(l('Remboursement non enregistré. Vérifie le solde et réessaie.','Repayment was not saved. Check the remaining balance and try again.'),zone,true);}
  finally{setBusy(false);}
 }
 const message=(zone:Zone)=>annonce?.zone===zone?<p role={annonce.erreur?'alert':'status'} aria-live="polite" className={`mt-2.5 flex items-start gap-2 rounded-xl p-3 text-sm ${annonce.erreur?'bg-red-50 text-red-800':'bg-emerald-50 text-emerald-900'}`}><IconeHD nom={annonce.erreur?'info':'check_circle'} className="shrink-0 text-[18px]"/>{annonce.texte}</p>:null;
 const pas=(devise:string)=>decimalesDevise(devise)===0?1:0.01;
 const titre=(texte:string,action?:ReactNode)=><h2 className="hd-classique sim-ios-titre flex items-baseline justify-between gap-2" style={{textTransform:'none'}}><span style={{textTransform:'uppercase'}}>{texte}</span>{action}</h2>;
 const bouton=(texte:string,couleur='var(--ios-accent,#5b4ee8)')=><button disabled={busy} className="hd-classique sim-ios-bouton disabled:opacity-60" style={{marginTop:12,background:couleur}}>{busy?l('Enregistrement…','Saving…'):texte}</button>;
 const champMontant=(id:string,valeur:string,changer:(v:string)=>void,devise:string,placeholder:string,max?:string)=><span className="flex items-center gap-1.5"><input id={id} required inputMode="decimal" type="number" min={pas(devise)} max={max} step={pas(devise)} value={valeur} onChange={e=>changer(e.target.value)} placeholder={placeholder}/><span className="text-hd-on-surface-variant" style={{fontSize:15}}>{devise}</span></span>;
 const champDate=(id:string,valeur:string,changer:(v:string)=>void)=><input id={id} required type="date" max={aujourdhui()} value={valeur} onChange={e=>changer(e.target.value)} style={{width:150,color:'var(--ios-accent,#5b4ee8)'}}/>;

 const pageEpargne=()=>{
  // Disponible = versements − retraits ; c'est lui qui avance vers l'objectif.
  const verse=objectif?totalCents(objectif.entries):0,retire=objectif?totalCents(retraitsDe(objectif.goal_id)):0;
  const total=verse-retire,cible=objectif?montantCents(objectif.target_amount):1;
  const pct=Math.min(100,Math.round(total/Math.max(1,cible)*100)),reste=Math.max(0,cible-total);
  const dernier=objectif?.entries.at(-1);
  const encouragement=!objectif?'':total===0?l('Ta première semence attend.','Your first seed is waiting.'):total>=cible?l('Objectif atteint : ta semence a grandi.','Goal reached: your seed has grown.'):dernier&&montantCents(dernier.amount)>0?(n=>l(`Ta semence grandit : encore ${n} versement${n>1?'s':''} comme le dernier.`,`Your seed is growing: ${n} more contribution${n>1?'s':''} like the last one.`))(Math.ceil(reste/montantCents(dernier.amount))):l('Chaque versement fait grandir ton jardin.','Each contribution helps your garden grow.');
  const formObjectif=<section aria-labelledby="hd-nouvel-objectif">
   {titre(l('Nouvel objectif','New goal'))}<span id="hd-nouvel-objectif" hidden>{l('Créer un objectif','Create a goal')}</span>
   <form onSubmit={e=>void creerObjectif(e)} noValidate>
    <div className="sim-ios-groupe hd-classique">
     <Ligne id="hd-objectif-nom" libelle={l('Nom','Name')}><input id="hd-objectif-nom" required maxLength={60} value={goalName} onChange={e=>setGoalName(e.target.value)} placeholder={l('Ex. Moto-taxi','E.g. Motorbike')} style={{width:'55%'}}/></Ligne>
    </div>
    <h3 className="hd-classique sim-ios-titre">{l('Pour quoi ?','What for?')}</h3>
    <ChoixTypeObjectif valeur={goalType} onChange={setGoalType} langue={en?'en':'fr'}/>
    <h3 className="hd-classique sim-ios-titre">{l('Montant','Amount')}</h3>
    <div className="sim-ios-groupe hd-classique">
     <Ligne id="hd-objectif-cible" libelle={l('Montant cible','Target amount')}>{champMontant('hd-objectif-cible',goalTarget,setGoalTarget,goalCurrency,'250000')}</Ligne>
     <Ligne id="hd-objectif-devise" libelle={l('Monnaie','Currency')}><ChoixDevise id="hd-objectif-devise" valeur={goalCurrency} onChange={setGoalCurrency} langue={en?'en':'fr'}/></Ligne>
    </div>
    <p className="sim-ios-note hd-classique">{l('Un objectif personnel : aucun prélèvement n’est fait.','A personal goal: no automatic transfer is made.')}</p>
    {bouton(l('Créer mon objectif','Create my goal'))}
    {message('objectif')}
   </form>
  </section>;
  return <>
   {!!suivi?.savings_goals.length&&<div role="group" aria-label={l('Mes objectifs','My goals')} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
    {suivi.savings_goals.map(g=><button key={g.goal_id} type="button" aria-pressed={!nouvelObjectif&&g.goal_id===objectif?.goal_id} onClick={()=>{setGoal(g.goal_id);setNouvelObjectif(false);setAnnonce(null);}} className={`shrink-0 whitespace-nowrap rounded-full px-3.5 min-h-[36px] text-sm font-medium ${!nouvelObjectif&&g.goal_id===objectif?.goal_id?'bg-hd-on-surface text-white':'bg-white text-hd-on-surface'}`}>{g.label}</button>)}
    <button type="button" aria-pressed={nouvelObjectif} onClick={()=>{setNouvelObjectif(v=>!v);setAnnonce(null);}} className={`shrink-0 whitespace-nowrap rounded-full px-3.5 min-h-[36px] text-sm font-medium ${nouvelObjectif?'bg-hd-on-surface text-white':'bg-white text-hd-secondary'}`}>+ {l('Nouvel objectif','New goal')}</button>
   </div>}
   {(nouvelObjectif||!objectif)?<>{!objectif&&<p className="rounded-2xl bg-white p-4 text-[15px]">{l('Crée ton premier objectif pour commencer ton suivi.','Create your first goal to start tracking.')}</p>}{formObjectif}</>:<>
    <section aria-labelledby="hd-epargne-resume" className="hd-classique mt-3 rounded-[20px] bg-white p-[18px] shadow-[0_1px_3px_rgba(0,0,0,.04)]">
     <div className="flex items-center gap-4">
      <div className="relative size-[92px] shrink-0" role="progressbar" aria-label={l('Progression vers l’objectif','Progress to goal')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
       <svg viewBox="0 0 36 36" className="size-[92px] -rotate-90" aria-hidden="true"><circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5f5ec" strokeWidth="4"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="#2f9e62" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(pct/100*97.4).toFixed(1)} 97.4`} style={{transition:'stroke-dasharray .6s cubic-bezier(.32,.72,0,1)'}}/></svg>
       <b className="absolute inset-0 grid place-items-center text-xl font-bold">{pct} %</b>
      </div>
      <div className="min-w-0">
       <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{objectif.goal_type==='reserve_joie'?l('Réserve de joie','Family joy reserve'):objectif.goal_type==='epargne_investir'?l('Épargne pour investir','Savings for investing'):l('Autre objectif','Other goal')}</span>
       <h2 id="hd-epargne-resume" className="sr-only">{objectif.label}</h2>
       <div className="mt-1 text-[28px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere]">{formatter(total,objectif.currency,en)}</div>
       <div className="text-sm text-hd-on-surface-variant">{l('disponible','available')} · {l('sur','of')} {formatter(cible,objectif.currency,en)} · {l('reste','left')} {nombre(reste,objectif.currency,en)}</div>
       {retire>0&&<div className="mt-0.5 text-xs text-hd-on-surface-variant">{l(`Mis de côté ${nombre(verse,objectif.currency,false)} · utilisé ${nombre(retire,objectif.currency,false)}`,`Set aside ${nombre(verse,objectif.currency,true)} · used ${nombre(retire,objectif.currency,true)}`)}</div>}
      </div>
     </div>
     <p className="mt-3.5 flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900"><IconeHD nom={total>=cible?'nature_people':'potted_plant'} className="shrink-0 text-[24px] text-emerald-700"/>{encouragement}</p>
    </section>
    <section aria-labelledby="hd-titre-versement">
     <h2 id="hd-titre-versement" className="hd-classique sim-ios-titre">{l('Ajouter un versement','Add a contribution')}</h2>
     <form onSubmit={e=>void ajouterVersement(e)} noValidate>
      <div className="sim-ios-groupe hd-classique">
       <Ligne id="hd-versement-montant" libelle={l('Montant mis de côté','Amount set aside')}>{champMontant('hd-versement-montant',contribution,setContribution,objectif.currency,'25000')}</Ligne>
       <Ligne id="hd-versement-date" libelle={l('Date','Date')}>{champDate('hd-versement-date',contributionDate,setContributionDate)}</Ligne>
      </div>
      {bouton(l('Ajouter à mon épargne','Add to savings'),'#2f9e62')}
      {message('versement')}
     </form>
    </section>
    <section aria-labelledby="hd-titre-historique">
     <h2 id="hd-titre-historique" className="hd-classique sim-ios-titre">{l('Historique','History')}</h2>
     {objectif.entries.length+retraitsDe(objectif.goal_id).length?<ol className="sim-ios-groupe hd-classique">{[...objectif.entries.map(x=>({id:x.entry_id,date:x.date_locale,cree:x.created_at,signe:1,montant:montantCents(x.amount),motif:null as Motif|null,zero:false})),...retraitsDe(objectif.goal_id).map(w=>({id:w.withdrawal_id,date:w.date_locale,cree:w.created_at,signe:-1,montant:montantCents(w.amount),motif:w.motif as Motif|null,zero:w.remise_a_zero}))].sort((a,b)=>b.date.localeCompare(a.date)||(b.cree??'').localeCompare(a.cree??'')).map(x=><li key={x.id} className="sim-ios-ligne"><time dateTime={x.date} className="flex-1">{momentLisible(x.date,x.cree,en)}{x.signe<0?` · ${({donne:l('donné','given'),depense:l('dépensé','spent'),investi:l('investi','invested'),autre:l('autre','other')} as Record<string,string>)[x.motif??'autre']}${x.zero?l(' · remis à zéro',' · reset to zero'):''}`:''}</time><strong className={`tabular-nums ${x.signe>0?'text-emerald-700':'text-red-700'}`}>{x.signe>0?'+':'−'} {nombre(x.montant,objectif.currency,en)}</strong></li>)}</ol>
      :<p className="sim-ios-note hd-classique">{l('Aucun versement pour le moment.','No contributions yet.')}</p>}
    </section>
    <div className="sim-ios-groupe hd-classique mt-6"><button type="button" disabled={busy} onClick={()=>setAConfirmer({type:'objectif',id:objectif.goal_id,nom:objectif.label,detail:l(`Il disparaît de tes objectifs, de la répartition et des compteurs. Ses ${objectif.entries.length} versement${objectif.entries.length>1?'s':''} (${nombre(verse,objectif.currency,false)} ${objectif.currency}) restent dans ton bilan.`,`It disappears from your goals, allocation and counters. Its ${objectif.entries.length} contribution${objectif.entries.length>1?'s':''} (${nombre(verse,objectif.currency,true)} ${objectif.currency}) stay in your summary.`)})} className="sim-ios-ligne w-full justify-center font-medium" style={{color:'#d70015',fontSize:16}}>{l('Supprimer cet objectif','Delete this goal')}</button></div>
   </>}
  </>;
 };

 const pageDettes=()=>{
  const devises=Array.from(new Set(dettesTriees.map(d=>d.currency)));
  const formDette=<section ref={formulaireDette} id="hd-ajouter-dette" aria-labelledby="hd-titre-ajout-dette" className="scroll-mt-24">
   <h2 id="hd-titre-ajout-dette" className="hd-classique sim-ios-titre">{l('Ajouter une dette','Add a debt')}</h2>
   <form onSubmit={e=>void creerDette(e)} noValidate>
    <div className="sim-ios-groupe hd-classique">
     <Ligne id="hd-dette-nom" libelle={l('Nom du créancier','Creditor name')}><input id="hd-dette-nom" required maxLength={LONGUEUR_NOM_CREANCIER} value={nomNouvelleDette} onChange={e=>setNomNouvelleDette(e.target.value)} placeholder={l('Ex. banque, proche','E.g. bank, relative')} style={{width:'50%'}}/></Ligne>
     <Ligne id="hd-dette-solde" libelle={l('Montant dû','Amount owed')}>{champMontant('hd-dette-solde',debtBalance,setDebtBalance,debtCurrency,'0')}</Ligne>
     <Ligne id="hd-dette-devise" libelle={l('Monnaie','Currency')}><ChoixDevise id="hd-dette-devise" valeur={debtCurrency} onChange={setDebtCurrency} langue={en?'en':'fr'}/></Ligne>
    </div>
    <p className="sim-ios-note hd-classique">{l('Un nom ou un surnom suffit pour reconnaître la dette.','A name or nickname is enough to recognise the debt.')}</p>
    <details className="mt-3 rounded-xl bg-white px-4 hd-classique sim-ios">
     <summary className="flex min-h-[48px] cursor-pointer items-center text-[16px]" style={{color:'var(--ios-accent,#5b4ee8)'}}>{l('Définir un repère de remboursement','Set a repayment guide')}</summary>
     <p className="text-sm text-hd-on-surface-variant">{l('Facultatif. Choisis le rythme qui correspond à ton revenu.','Optional. Choose the schedule that matches your income.')}</p>
     <div className="sim-ios-groupe -mx-4 mt-2" style={{background:'transparent'}}>
      <Ligne id="hd-dette-rythme" libelle={l('Situation de revenu','Income situation')}><select id="hd-dette-rythme" value={rythmeDette} onChange={e=>{setRythmeDette(e.target.value==='hebdomadaire'?'hebdomadaire':'mensuel');setDebtBase('');}}><option value="mensuel">{l('Salarié · par mois','Employee · monthly')}</option><option value="hebdomadaire">{l('Commerçant · par semaine','Merchant · weekly')}</option></select></Ligne>
      <Ligne id="hd-dette-base" libelle={hebdomadaire?l('Bénéfice net de la semaine','Weekly net profit'):l('Salaire net du mois','Monthly take-home pay')}><input id="hd-dette-base" aria-describedby="hd-dette-revenu-aide" min="0" step={pas(debtCurrency)} type="number" inputMode="decimal" value={debtBase} onChange={e=>setDebtBase(e.target.value)} placeholder={hebdomadaire?'150':'600'}/></Ligne>
      <Ligne id="hd-dette-pourcentage" libelle={l('Pourcentage consacré à cette dette','Percentage for this debt')}><input id="hd-dette-pourcentage" min="0" max="100" step="0.01" type="number" inputMode="decimal" value={debtPercent} onChange={e=>setDebtPercent(e.target.value)} placeholder="10" style={{width:64}}/></Ligne>
     </div>
     <p id="hd-dette-revenu-aide" className="pb-3 text-xs text-hd-on-surface-variant">{hebdomadaire
      ?l('Saisis ce qu’il reste après le coût des marchandises et les dépenses de ton activité. Si ton bénéfice varie, tu peux saisir une moyenne par semaine.','Enter what remains after the cost of goods and business expenses. If profit varies, you can enter a weekly average.')
      :l('Saisis le montant que tu reçois après les retenues sur ton salaire.','Enter what you receive after payroll deductions.')}</p>
     {reperePret&&<p role="status" className="mb-3 rounded-xl bg-hd-surface-container-low p-3 text-sm">{l('Repère','Guide')} : <strong>{montantRepere(debtBase,debtPercent,debtCurrency)} {periode(rythmeDette)}</strong></p>}
    </details>
    {bouton(l('Ajouter cette dette','Add this debt'))}
    {message('dette')}
   </form>
  </section>;
  return <>
   {devises.map(devise=>{const groupe=dettesTriees.filter(d=>d.currency===devise),ouverture=groupe.reduce((n,d)=>n+montantCents(d.opening_balance),0),rembourse=groupe.reduce((n,d)=>n+totalCents(d.payments),0),p=ouverture?Math.min(100,Math.round(rembourse/ouverture*100)):0;
    return <section key={devise} aria-label={l(`Total en ${devise}`,`Total in ${devise}`)} className="hd-classique mb-3 rounded-[20px] p-[18px] text-white shadow-[0_12px_30px_rgba(73,67,155,.22)]" style={{background:'linear-gradient(160deg,#5b4fe0,#49439b)'}}>
     <p className="text-[13px] uppercase tracking-wider opacity-80">{l('Il reste à rembourser','Left to repay')}</p>
     <p className="mt-0.5 mb-2.5 text-[32px] font-bold leading-tight tracking-tight tabular-nums [overflow-wrap:anywhere]">{formatter(Math.max(0,ouverture-rembourse),devise,en)}</p>
     <div className="h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{width:`${p}%`}}/></div>
     <div className="mt-1.5 flex justify-between text-[13px] opacity-85"><span>{l('Déjà remboursé','Already repaid')} {nombre(rembourse,devise,en)}</span><span>{p} %</span></div>
    </section>;})}
   {dettesTriees.length>0&&<section aria-labelledby="hd-mes-dettes">
    {titre(l('Mes dettes','My debts'),<button type="button" className="text-[15px] font-normal" style={{color:'var(--ios-accent,#5b4ee8)'}} aria-expanded={ajoutDette} aria-controls="hd-ajouter-dette" onClick={()=>{setAjoutDette(true);setAnnonce(null);setTimeout(()=>formulaireDette.current?.scrollIntoView({behavior:'smooth',block:'start'}),0);}}>+ {l('Ajouter','Add')}</button>)}
    <span id="hd-mes-dettes" hidden>{l('Mes dettes','My debts')}</span>
    {message('liste')}
    {propositionDettes&&<p role="status" className="hd-classique mb-2.5 rounded-xl bg-orange-50 p-3 text-sm text-orange-900">{propositionDettes.length?<>{l('Ta part « Dettes »','Your “Debts” share')} : {propositionDettes.map((x,i)=>{const d=dettesTriees.find(y=>y.debt_id===x.id);return d?<span key={x.id}>{i>0?' ; ':''}{nombre(x.centimes,d.currency,en)} {x.solde?l('soldent','pays off'):l('pour','for')} <b>{nomDette(d)}</b></span>:null;})}. {l('Vérifie le montant dans la fiche ouverte, puis enregistre. Tu peux choisir un autre ordre.','Check the amount in the open card, then save. You can choose another order.')}</>:l('Aucune dette ouverte dans cette monnaie.','No open debt in this currency.')}</p>}
    <div className="mt-1 flex flex-col gap-2.5">
     {dettesTriees.map(d=>{
      const rembourse=totalCents(d.payments),reste=resteDette(d),ouv=montantCents(d.opening_balance);
      const pourcentage=Math.min(100,Math.round(rembourse/Math.max(1,ouv)*100));
      const plusPetite=dettesOuvertes.find(x=>x.currency===d.currency)?.debt_id===d.debt_id;
      const dernier=d.payments.at(-1);
      const statut=reste===0?(dernier?l(`Soldée le ${dateCourte(dernier.date_locale,false)}`,`Paid off on ${dateCourte(dernier.date_locale,true)}`):l('Soldée','Paid off')):plusPetite?l('Plus petit solde · à finir d’abord','Smallest balance · finish first'):l('En cours','In progress');
      const repere=d.repere?`${l('Repère','Guide')} : ${montantRepere(d.repere.base,d.repere.pourcentage,d.currency)} ${periode(d.repere.rythme)}`:dernier?`${l('Dernier paiement','Last payment')} : ${dateCourte(dernier.date_locale,en)}`:l('Aucun remboursement noté','No repayment recorded');
      const estOuverte=ouverte===d.debt_id,edition=nomEnEdition?.id===d.debt_id?nomEnEdition:null;
      const teinte=reste===0?'linear-gradient(180deg,#4cd964,#28b446)':plusPetite?'linear-gradient(180deg,#ffb340,#ff9500)':'linear-gradient(180deg,#8f84ff,#5b4fe0)';
      return <article key={d.debt_id} aria-labelledby={`hd-titre-${d.debt_id}`} className={`rounded-2xl bg-white px-4 py-3.5 transition-shadow ${reste===0&&!estOuverte?'opacity-60':''}`} style={estOuverte?{boxShadow:'0 0 0 2px var(--ios-accent,#5b4ee8)'}:undefined}>
       <h3 className="m-0"><button type="button" aria-expanded={estOuverte} aria-controls={`hd-panneau-${d.debt_id}`} onClick={()=>basculerDette(d.debt_id)} className="flex w-full items-center gap-3 text-left active:scale-[.99] transition-transform">
        <span aria-hidden="true" className="grid size-[30px] shrink-0 place-items-center rounded-lg text-white" style={{background:teinte}}><IconeHD nom={reste===0?'check':'payments'} className="text-[18px]"/></span>
        <span className="min-w-0 flex-1"><span id={`hd-titre-${d.debt_id}`} className="block text-[17px] font-semibold [overflow-wrap:anywhere]">{nomDette(d)}</span><small className="block text-[13px] font-normal text-hd-on-surface-variant">{statut}</small></span>
        <span className="text-right"><span className="block text-[17px] font-bold tabular-nums">{nombre(reste,d.currency,en)}</span><small className="block text-xs font-normal text-hd-on-surface-variant">{reste===0?d.currency:l(`${d.currency} restants`,`${d.currency} left`)}</small></span>
       </button></h3>
       {reste>0&&<><div role="progressbar" aria-label={l('Progression du remboursement','Repayment progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pourcentage} className="mt-3 mb-1.5 h-1.5 overflow-hidden rounded-full bg-hd-surface-container"><div className="h-full rounded-full bg-emerald-600" style={{width:`${pourcentage}%`}}/></div>
        <div className="flex justify-between gap-2 text-[13px] text-hd-on-surface-variant"><span>{estOuverte?l(`Remboursé ${nombre(rembourse,d.currency,false)} sur ${nombre(ouv,d.currency,false)}`,`Repaid ${nombre(rembourse,d.currency,true)} of ${nombre(ouv,d.currency,true)}`):repere}</span><span>{pourcentage} %</span></div></>}
       {message('nom:'+d.debt_id)}
       {estOuverte&&<div id={`hd-panneau-${d.debt_id}`}>
        {reste>0&&<form onSubmit={e=>void enregistrerPaiement(e,d)} noValidate className="mt-3 rounded-xl px-2.5 pb-3 pt-1" style={{background:'var(--ios-fond,#f2f2f7)'}}>
         <h4 className="hd-classique sim-ios-titre" style={{marginTop:10}}>{l('Noter un remboursement','Record a repayment')}</h4>
         <div className="sim-ios-groupe hd-classique">
          <Ligne id={`hd-paiement-${d.debt_id}`} libelle={l('Montant payé','Amount paid')}>{champMontant(`hd-paiement-${d.debt_id}`,paymentAmount,setPaymentAmount,d.currency,'0',(reste/100).toFixed(2))}</Ligne>
          <Ligne id={`hd-paiement-date-${d.debt_id}`} libelle={l('Date','Date')}>{champDate(`hd-paiement-date-${d.debt_id}`,paymentDate,setPaymentDate)}</Ligne>
         </div>
         {bouton(l('Enregistrer le paiement','Record payment'))}
         {d.repere&&<p className="sim-ios-note hd-classique" style={{margin:'8px 6px 0'}}>{l('Ton repère','Your guide')} : {montantRepere(d.repere.base,d.repere.pourcentage,d.currency)} {periode(d.repere.rythme)}.</p>}
         {message('paiement:'+d.debt_id)}
        </form>}
        {d.payments.length>0&&<><h4 className="hd-classique sim-ios-titre" style={{marginLeft:0}}>{l('Historique','History')}</h4>
         <ol className="sim-ios-groupe hd-classique" style={{background:'var(--ios-fond,#f2f2f7)'}}>{[...d.payments].reverse().map(p=><li key={p.payment_id} className="sim-ios-ligne"><time dateTime={p.date_locale} className="flex-1">{momentLisible(p.date_locale,p.created_at,en)}</time><strong className="tabular-nums">− {nombre(montantCents(p.amount),d.currency,en)}</strong></li>)}</ol></>}
        <h4 className="hd-classique sim-ios-titre" style={{marginLeft:0}}>{l('Réglages de la dette','Debt settings')}</h4>
        <div className="sim-ios-groupe hd-classique" style={{background:'var(--ios-fond,#f2f2f7)'}}>
         <Ligne libelle={l('Nom','Name')}><button type="button" aria-expanded={!!edition} disabled={busy} onClick={()=>{setErreurNom('');setNomEnEdition(edition?null:{id:d.debt_id,nom:d.creditor_name??''});}} style={{color:'var(--ios-accent,#5b4ee8)',fontSize:16,minHeight:44}}>{d.creditor_name?l('Modifier le nom','Edit name'):l('Ajouter un nom','Add a name')}</button></Ligne>
         {edition&&<form className="px-4 pb-3" onSubmit={e=>void enregistrerNom(e)} noValidate>
          <label className="flex flex-col gap-1 text-sm font-medium">{l('Nom du créancier','Creditor name')}
           <input autoFocus required maxLength={LONGUEUR_NOM_CREANCIER} value={edition.nom} onChange={e=>setNomEnEdition({id:d.debt_id,nom:e.target.value})} aria-invalid={!!erreurNom} aria-describedby={erreurNom?'hd-erreur-nom':undefined} className="min-h-[44px] w-full rounded-lg bg-white px-3 text-[16px]" placeholder={l('Ex. banque, fournisseur ou proche','E.g. bank, supplier or relative')}/>
          </label>
          {erreurNom&&<p id="hd-erreur-nom" role="alert" className="mt-1 text-sm text-red-700">{erreurNom}</p>}
          <div className="mt-2 flex gap-2"><button disabled={busy} className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-white" style={{background:'var(--ios-accent,#5b4ee8)'}}>{l('Enregistrer le nom','Save name')}</button><button type="button" disabled={busy} className="min-h-[44px] rounded-lg px-3 text-sm" onClick={()=>setNomEnEdition(null)}>{l('Annuler','Cancel')}</button></div>
         </form>}
         {d.repere&&<Ligne libelle={l('Repère de remboursement','Repayment guide')}><span className="text-hd-on-surface-variant" style={{fontSize:15}}>{montantRepere(d.repere.base,d.repere.pourcentage,d.currency)} {periode(d.repere.rythme)}</span></Ligne>}
         <button type="button" disabled={busy} onClick={()=>setAConfirmer({type:'dette',id:d.debt_id,nom:nomDette(d),detail:l(`Elle disparaît de ta liste. ${d.payments.length?`Ses ${d.payments.length} remboursement${d.payments.length>1?'s':''} (${nombre(rembourse,d.currency,false)} ${d.currency}) restent comptés dans ton bilan.`:'Aucun remboursement n’avait été noté.'}`,`It disappears from your list. ${d.payments.length?`Its ${d.payments.length} repayment${d.payments.length>1?'s':''} (${nombre(rembourse,d.currency,true)} ${d.currency}) stay in your summary.`:'No repayment had been recorded.'}`)})} className="sim-ios-ligne w-full justify-center font-medium" style={{color:'#d70015',fontSize:16}}>{l('Supprimer cette dette','Delete this debt')}</button>
        </div>
       </div>}
      </article>;
     })}
    </div>
    <p className="sim-ios-note hd-classique">{l('Touche une dette pour noter un remboursement, voir l’historique ou changer son nom.','Tap a debt to record a repayment, see its history or change its name.')}</p>
   </section>}
   {!dettesTriees.length&&<p className="rounded-2xl bg-white p-4 text-[15px]">{l('Ajoute ta première dette pour suivre ce qu’il reste à rembourser.','Add your first debt to follow what is left to repay.')}</p>}
   {(ajoutDette||!dettesTriees.length)&&formDette}
  </>;
 };

 return <CadreHabitudes titre={titrePage} langue={langue} retour={`/espace${suffix}`} retourLibelle={l('Revenir à ma journée','Back to my day')} liens={{aujourdhui:`/espace${suffix}`}} actif="aujourdhui" cloche>
  <div className="sim-ios mx-auto flex w-full max-w-xl flex-col px-hd-margin pt-hd-space-md pb-hd-space-lg" style={{background:'var(--ios-fond,#f2f2f7)'}}>
   <h1 className="mb-3 ml-1 text-[34px] font-bold leading-tight tracking-tight">{titrePage}</h1>
   <p className="hd-classique sim-ios-sous">{mode==='epargne'?l('Tes objectifs et ce que tu mets de côté.','Your goals and what you set aside.'):l('Ce que tu dois et ce que tu as déjà remboursé.','What you owe and what you have already repaid.')}</p>
   <Link to={`/habitudes/repartition?pour=${mode}${en?'&lang=en':''}`} className="hd-classique mb-3 flex items-center gap-3.5 rounded-[20px] px-[18px] py-4 text-white active:scale-[.98] transition-transform" style={{textDecoration:'none',background:mode==='epargne'?'linear-gradient(160deg,#5b4fe0,#49439b)':'linear-gradient(160deg,#f08a4b,#d9602a)',boxShadow:mode==='epargne'?'0 12px 30px rgba(73,67,155,.22)':'0 12px 30px rgba(217,96,42,.22)'}}>
    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl" style={{background:'rgb(255 255 255 / .18)'}}><IconeHD nom="payments" className="text-[24px]"/></span>
    <span className="min-w-0 flex-1"><b className="block text-[17px]">{l('Quand je reçois de l’argent','When I receive money')}</b><small className="block text-sm opacity-85">{mode==='epargne'?l('Combien mettre de côté, selon ton revenu','How much to set aside, based on your income'):l('Combien rembourser, selon ton revenu','How much to repay, based on your income')}</small></span>
    <IconeHD nom="chevron_right" className="text-[22px] opacity-80"/>
   </Link>
   {mode==='epargne'&&<Link to={`/habitudes/compteurs${en?'?lang=en':''}`} className="hd-classique mb-3 flex min-h-[52px] items-center gap-3 rounded-xl bg-white px-4" style={{textDecoration:'none',color:'inherit'}}><IconeHD nom="calendar_view_week" className="text-[22px] text-hd-secondary"/><span className="flex-1"><span className="block text-[16px]">{l('Mes compteurs','My counters')}</span><small className="block text-[13px] text-hd-on-surface-variant">{l('Ce qui reste dans chaque caisse, et le bilan','What is left in each counter, and the summary')}</small></span><IconeHD nom="chevron_right" className="text-[20px] text-hd-outline"/></Link>}
   {annulable&&<p role="status" aria-live="polite" className="hd-classique mb-3 flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><span className="flex-1">{annulable.type==='objectif'?l(`« ${annulable.nom} » est supprimé. Son historique reste dans ton bilan.`,`“${annulable.nom}” is deleted. Its history stays in your summary.`):l(`« ${annulable.nom} » est supprimée. Son historique reste dans ton bilan.`,`“${annulable.nom}” is deleted. Its history stays in your summary.`)}</span><button type="button" disabled={busy} onClick={()=>void annulerSuppression()} className="min-h-[44px] px-2 font-semibold" style={{color:'var(--ios-accent,#5b4ee8)'}}>{l('Annuler','Undo')}</button></p>}
   {message('haut')}
   {state==='chargement'&&<p role="status" className="rounded-2xl bg-white p-4">{l('Chargement du suivi…','Loading your tracker…')}</p>}
   {state==='erreur'&&<section className="rounded-2xl bg-white p-4"><p role="alert">{l('Le suivi n’est pas disponible pour le moment.','Your tracker is not available right now.')}</p><button className="mt-3 min-h-[44px] rounded-xl px-4 text-white" style={{background:'var(--ios-accent,#5b4ee8)'}} onClick={()=>setEssai(x=>x+1)}>{l('Réessayer','Try again')}</button></section>}
   {state==='vide'&&<section className="rounded-2xl bg-white p-4"><p>{l('Ce suivi est disponible avec un accès actif à Habitudes & Défis.','This tracker is available with active access to Habits & Challenges.')}</p><Link className="mt-3 inline-flex min-h-[44px] items-center underline" style={{color:'var(--ios-accent,#5b4ee8)'}} to={`/habitudes${suffix}`}>{l('Voir Habitudes & Défis','View Habits & Challenges')}</Link></section>}
   {state==='pret'&&(mode==='epargne'?pageEpargne():pageDettes())}
   {aConfirmer&&<div className="fixed inset-0 z-[60] grid place-items-center px-8" role="alertdialog" aria-modal="true" aria-labelledby="hd-supprimer-titre" aria-describedby="hd-supprimer-detail">
    <button type="button" aria-label={l('Fermer','Close')} className="absolute inset-0 bg-black/30" onClick={()=>setAConfirmer(null)}/>
    <div className="hd-classique relative w-full max-w-[290px] overflow-hidden rounded-[14px] text-center shadow-[0_10px_40px_rgba(0,0,0,.25)]" style={{background:'rgb(242 242 247 / .97)'}}>
     <div className="px-4 pb-3.5 pt-4"><h2 id="hd-supprimer-titre" style={{margin:'0 0 4px',fontSize:17,fontWeight:600}}>{l(`Supprimer « ${aConfirmer.nom} » ?`,`Delete “${aConfirmer.nom}”?`)}</h2><p id="hd-supprimer-detail" style={{margin:0,fontSize:13,lineHeight:1.4}}>{aConfirmer.detail}</p></div>
     <button type="button" disabled={busy} onClick={()=>void supprimer()} className="block w-full border-t border-black/20 py-3 text-[17px] font-semibold" style={{color:'#d70015'}}>{busy?l('Suppression…','Deleting…'):l('Supprimer','Delete')}</button>
     <button type="button" autoFocus onClick={()=>setAConfirmer(null)} className="block w-full border-t border-black/20 py-3 text-[17px]" style={{color:'var(--ios-accent,#5b4ee8)'}}>{l('Annuler','Cancel')}</button>
    </div>
   </div>}
   <p className="sim-ios-note hd-classique mt-6 flex items-start gap-2"><IconeHD nom="lock" className="shrink-0 text-[16px]"/>{l('Suivi privé, visible par toi seul. Aucun paiement ni transfert n’est déclenché. Chaque monnaie reste séparée.','Private tracking, visible only to you. No payment or transfer is triggered. Each currency stays separate.')}</p>
  </div>
 </CadreHabitudes>;
}
export function RouteSuiviEpargneDettes({mode}:{mode:Mode}) {
 return suiviFinancierActive() ? <ComptePrive enfants={userId=><SuiviEpargneDettes mode={mode} userId={userId}/>}/> : <NotFound/>;
}
