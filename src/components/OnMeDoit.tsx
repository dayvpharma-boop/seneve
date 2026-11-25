import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useSearchParams} from 'react-router-dom';
import {ComptePrive} from './ComptePrive';
import {CadreHabitudes} from './CadreHabitudes';
import {ChoixDevise} from './ChoixDevise';
import {NotFound} from '@/routes/introuvable';
import {suiviFinancierActive} from '@/lib/habitudes-configuration';
import {chargerCreances,saisirCreance,resteCreance,centsCreance,type Creance} from '@/lib/finance-creances';
import {decimalesDevise,montantValidePourDevise} from '@/lib/devises';
import './SimulateurEpargne.css';
const aujourdHui=()=>new Intl.DateTimeFormat('en-CA').format(new Date());
export function OnMeDoit({userId}:{userId:string}) {
 const [params]=useSearchParams(),en=params.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,eng:string)=>en?eng:fr;
 const [suivi,setSuivi]=useState<{enrollment_id:string;loans:Creance[]}|null>(null),[erreur,setErreur]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [nom,setNom]=useState(''),[montant,setMontant]=useState(''),[devise,setDevise]=useState('USD'),[date,setDate]=useState(aujourdHui),[echeance,setEcheance]=useState('');
 const [pret,setPret]=useState(''),[recu,setRecu]=useState(''),[dateRecu,setDateRecu]=useState(aujourdHui);
 const demande=useRef<{cle:string;id:string}|null>(null),verrou=useRef(false);
 const recharger=()=>chargerCreances().then(s=>{setSuivi(s);setErreur(false);});
 useEffect(()=>{let vivant=true;setSuivi(null);setErreur(false);void chargerCreances().then(s=>{if(vivant)setSuivi(s);}).catch(()=>{if(vivant)setErreur(true);});return()=>{vivant=false;};},[userId]);
 const argent=(c:number,d:string)=>new Intl.NumberFormat(en?'en-US':'fr-FR',{maximumFractionDigits:decimalesDevise(d)}).format(c/100)+' '+d;
 async function enregistrer(e:FormEvent,paiement=false){
 e.preventDefault();if(verrou.current||!suivi)return;const dette=suivi.loans.find(x=>x.loan_id===pret),v=paiement?recu:montant,d=paiement?dette?.currency:devise;
 if(!d||!montantValidePourDevise(v,d)||Number(v)<=0||(paiement&&(!dette||centsCreance(v)>resteCreance(dette)))){setMessage(l('Vérifie le montant et le solde restant.','Check the amount and remaining balance.'));return;}
 const args:Record<string,unknown>=paiement?{p_enrollment_id:suivi.enrollment_id,p_loan_id:pret,p_amount:v,p_payment_date:dateRecu}:{p_enrollment_id:suivi.enrollment_id,p_borrower:nom.trim(),p_amount:v,p_currency:devise,p_loan_date:date,p_due_date:echeance||null};
 const cle=JSON.stringify(args);if(demande.current?.cle!==cle)demande.current={cle,id:crypto.randomUUID()};args.p_request_id=demande.current.id;
 verrou.current=true;setBusy(true);setMessage('');
 try{await saisirCreance(args,paiement);await recharger();demande.current=null;if(paiement)setRecu('');else{setNom('');setMontant('');setEcheance('');}setMessage(l('Enregistré. Le suivi est à jour.','Saved. Your tracker is up to date.'));}
 catch{setMessage(l('Enregistrement non confirmé. Vérifie ta connexion et réessaie avec les mêmes informations.','Save not confirmed. Check your connection and retry with the same details.'));}
 finally{verrou.current=false;setBusy(false);}
 }
 const champ=(id:string,label:string,value:string,onChange:(s:string)=>void,type='text',min?:string,max?:string)=><label className="flex flex-col gap-2 py-2" htmlFor={id}>{label}<input className="rounded-xl border p-3 min-h-[44px]" style={{background:'var(--ios-fond,#f2f2f7)',color:'inherit',minWidth:0,width:'100%'}} id={id} type={type} value={value} required onChange={e=>onChange(e.target.value)} min={min} max={max} maxLength={type==='text'?80:undefined} inputMode={type==='number'?'decimal':undefined} step={type==='number'?'any':undefined}/></label>;
 const totaux=suivi?.loans.reduce<Record<string,{total:number;reste:number}>>((a,x)=>{const t=a[x.currency]??{total:0,reste:0};a[x.currency]={total:t.total+centsCreance(x.amount),reste:t.reste+resteCreance(x)};return a;},{})??{};
 return <CadreHabitudes titre={l('SÉNEVÉ Prêts','SÉNEVÉ Loans')} langue={langue} retour={`/espace${en?'?lang=en':''}`} actif="aujourdhui"><main className="sim-ios mx-auto w-full max-w-xl px-4 pb-8">
 <p className="my-4">{l('Les sommes que tu as prêtées et les remboursements reçus.','Money you have lent and repayments received.')}</p>
 <p className="sim-ios-note">{l('Suivi privé. Ces saisies ne modifient pas tes caisses et ne sont pas réparties comme un revenu. Aucun transfert ni message automatique.','Private tracker. These entries do not change your cash balances or allocate income. No automatic transfers or messages.')}</p>
 {message&&<p role="status" className="my-4 rounded-xl border p-3">{message}</p>}
 {erreur?<div role="alert"><p>{l('Suivi indisponible. Vérifie ta connexion et ton accès à Habitudes & Défis.','Tracker unavailable. Check your connection and access to Habits & Challenges.')}</p><button className="min-h-[44px] underline" onClick={()=>void recharger().catch(()=>setErreur(true))}>{l('Réessayer','Retry')}</button></div>:!suivi?<p role="status">{l('Chargement…','Loading…')}</p>:<>
 <div className="my-4 grid gap-3">{Object.entries(totaux).map(([d,t])=><section key={d} className="sim-ios-groupe p-4"><h2>{l('Reste à récupérer','Still owed')}</h2><strong className="text-2xl">{argent(t.reste,d)}</strong><p>{l('Prêté','Lent')} : {argent(t.total,d)} · {l('Reçu','Received')} : {argent(t.total-t.reste,d)}</p></section>)}</div>
 <details className="sim-ios-groupe my-4 p-4"><summary className="min-h-[44px] cursor-pointer font-semibold">{l('Ajouter un prêt','Add a loan')}</summary><form onSubmit={e=>void enregistrer(e)}><fieldset disabled={busy}>
 {champ('pret-nom',l('Nom de la personne','Person’s name'),nom,setNom)}{champ('pret-montant',l('Montant prêté','Amount lent'),montant,setMontant,'number','0.01')}
 <div className="py-3"><span>{l('Devise','Currency')}</span><ChoixDevise id="pret-devise" valeur={devise} onChange={setDevise} langue={langue}/></div>
 {champ('pret-date',l('Date du prêt','Loan date'),date,setDate,'date',undefined,aujourdHui())}
 <label className="flex flex-col gap-2 py-2" htmlFor="pret-echeance">{l('Échéance (facultative)','Due date (optional)')}<input id="pret-echeance" className="rounded-xl border p-3 min-h-[44px]" style={{background:'var(--ios-fond,#f2f2f7)',color:'inherit'}} type="date" min={date} value={echeance} onChange={e=>setEcheance(e.target.value)}/></label>
 <button className="min-h-[48px] rounded-xl bg-hd-primary px-4 text-hd-on-primary my-3">{busy?l('Enregistrement…','Saving…'):l('Enregistrer le prêt','Save loan')}</button></fieldset></form></details>
 {!suivi.loans.length&&<p className="my-4">{l('Aucun prêt enregistré. Ajoute une personne qui te doit de l’argent.','No loans recorded. Add someone who owes you money.')}</p>}
 {suivi.loans.map(x=>{const reste=resteCreance(x);return <article key={x.loan_id} className="sim-ios-groupe p-4 my-4 break-words"><h2 className="text-lg font-semibold">{x.borrower}</h2><strong className="text-xl">{argent(reste,x.currency)}</strong><p>{reste===0?l('Totalement remboursé','Fully repaid'):l('À récupérer','Still owed')}</p><p>{l('Prêt du','Lent on')} {x.loan_date} · {argent(centsCreance(x.amount),x.currency)}</p>{x.due_date&&<p>{l('Échéance','Due date')} : {x.due_date}</p>}
 {reste>0&&<details onToggle={e=>{if(e.currentTarget.open){setPret(x.loan_id);setRecu('');}}}><summary className="min-h-[44px] py-3 cursor-pointer">{l('Noter un remboursement reçu','Record a repayment received')}</summary><form onSubmit={e=>{if(pret===x.loan_id)void enregistrer(e,true);else e.preventDefault();}}><fieldset disabled={busy}>{pret===x.loan_id&&<>{champ(`recu-${x.loan_id}`,l('Montant reçu','Amount received'),recu,setRecu,'number','0.01',String(reste/100))}{champ(`date-${x.loan_id}`,l('Date du remboursement','Repayment date'),dateRecu,setDateRecu,'date',x.loan_date,aujourdHui())}<button className="min-h-[48px] rounded-xl bg-hd-primary px-4 text-hd-on-primary my-3">{l('Enregistrer le remboursement','Save repayment')}</button></>}</fieldset></form></details>}
 <details><summary className="min-h-[44px] py-3 cursor-pointer">{l('Historique','History')} ({x.payments.length})</summary><ul>{x.payments.map(p=><li key={p.payment_id} className="py-2">{p.payment_date} · {argent(centsCreance(p.amount),x.currency)}</li>)}</ul>{!x.payments.length&&<p>{l('Aucun remboursement reçu.','No repayments received.')}</p>}</details></article>;})}
 </>}
 </main></CadreHabitudes>;
}
export function RouteOnMeDoit(){return suiviFinancierActive()?<ComptePrive enfants={userId=><OnMeDoit userId={userId}/>}/>:<NotFound/>;}
