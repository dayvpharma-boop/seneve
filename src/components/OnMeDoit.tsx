import {useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {useSearchParams} from 'react-router-dom';
import {ComptePrive} from './ComptePrive';
import {CadreHabitudes} from './CadreHabitudes';
import {ChoixDevise} from './ChoixDevise';
import {IconeHD} from './IconeHabitudes';
import {NotFound} from '@/routes/introuvable';
import {suiviFinancierActive} from '@/lib/habitudes-configuration';
import {chargerCreances,saisirCreance,enregistrerPret,supprimerPret,supprimerRemboursement,resteCreance,recuCreance,centsCreance,regrouperParPersonne,cleNom,joursAvant,type Creance,type Personne,type SuiviCreances} from '@/lib/finance-creances';
import {decimalesDevise,montantValidePourDevise} from '@/lib/devises';
import './SimulateurEpargne.css';
import './SenevePrets.css';

/** SÉNEVÉ Prêts — style iPhone validé par Dr Justin le 25/11/2026 (maquette comparaison-seneve-prets). */
const aujourdHui=()=>new Intl.DateTimeFormat('en-CA').format(new Date());
const COULEURS=['#ff6b5e','#ff9f0a','#34c759','#5ac8fa','#af52de','#ff2d55','#30b0c7','#a2845e','#5856d6'];
const couleur=(cle:string)=>COULEURS[[...cle].reduce((s,c)=>s+c.charCodeAt(0),0)%COULEURS.length]!;
const initiales=(nom:string)=>nom.trim().split(/\s+/).slice(0,2).map(m=>m[0]?.toUpperCase()??'').join('')||'?';
const URGENCE=7;
type Vue={type:'liste'}|{type:'personne';cle:string}|{type:'pret';pret?:Creance;nom?:string;retour:Vue};
type Totaux={devise:string;total:number;recu:number};

function totauxParDevise(prets:Creance[]):Totaux[]{
 const m=new Map<string,Totaux>();
 for(const p of prets){const t=m.get(p.currency)??{devise:p.currency,total:0,recu:0};t.total+=centsCreance(p.amount);t.recu+=recuCreance(p);m.set(p.currency,t);}
 return [...m.values()];
}

export function OnMeDoit({userId}:{userId:string}) {
 const [params]=useSearchParams(),en=params.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,eng:string)=>en?eng:fr,locale=en?'en-US':'fr-FR';
 const [suivi,setSuivi]=useState<SuiviCreances|null>(null),[erreur,setErreur]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [vue,setVue]=useState<Vue>({type:'liste'}),[segment,setSegment]=useState<'cours'|'soldes'>('cours');
 const verrou=useRef(false),haut=useRef<HTMLDivElement>(null);
 const recharger=()=>chargerCreances().then(s=>{setSuivi(s);setErreur(false);});
 useEffect(()=>{let vivant=true;setSuivi(null);setErreur(false);void chargerCreances().then(s=>{if(vivant)setSuivi(s);}).catch(()=>{if(vivant)setErreur(true);});return()=>{vivant=false;};},[userId]);
 const aller=(v:Vue)=>{setVue(v);setMessage('');window.scrollTo?.({top:0});};

 const argent=(c:number,d:string)=>new Intl.NumberFormat(locale,{maximumFractionDigits:decimalesDevise(d)}).format(c/100)+' '+d;
 const nombre=(c:number,d:string)=>new Intl.NumberFormat(locale,{maximumFractionDigits:decimalesDevise(d)}).format(c/100);
 const dateLongue=(s:string)=>{const [a,m,j]=s.split('-').map(Number);return new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(a!,m!-1,j!)));};
 const dateCourte=(s:string)=>{const [a,m,j]=s.split('-').map(Number);return new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(a!,m!-1,j!)));};
 /** Étiquette d'échéance : rouge en retard, orange bientôt, grise sinon, verte si soldé. */
 const puce=(due:string|null,solde:boolean)=>{
  if(solde)return <span className="sp-puce sp-solde">{l('Soldé','Repaid')}</span>;
  if(!due)return <span className="sp-puce sp-libre">{l('Sans date','No date')}</span>;
  const j=joursAvant(due,aujourdHui());
  if(j<0)return <span className="sp-puce sp-retard">{l(`En retard · ${-j} j`,`${-j} ${-j>1?'days':'day'} late`)}</span>;
  if(j===0)return <span className="sp-puce sp-bientot">{l('Aujourd’hui','Due today')}</span>;
  if(j===1)return <span className="sp-puce sp-bientot">{l('Demain','Tomorrow')}</span>;
  if(j<=URGENCE)return <span className="sp-puce sp-bientot">{l(`Dans ${j} jours`,`In ${j} days`)}</span>;
  return <span className="sp-puce sp-libre">{dateCourte(due)}</span>;
 };

 async function action(f:()=>Promise<unknown>,ok:string,apres?:()=>void){
  if(verrou.current||!suivi)return false;verrou.current=true;setBusy(true);setMessage('');
  try{await f();await recharger();apres?.();setMessage(ok);return true;}
  catch{setMessage(l('Enregistrement non confirmé. Vérifie ta connexion et réessaie avec les mêmes informations.','Save not confirmed. Check your connection and retry with the same details.'));return false;}
  finally{verrou.current=false;setBusy(false);}
 }

 const personnes=useMemo(()=>suivi?regrouperParPersonne(suivi.loans,aujourdHui()):[],[suivi]);
 const titre=vue.type==='pret'?(vue.pret?l('Modifier le prêt','Edit loan'):l('Nouveau prêt','New loan')):l('SÉNEVÉ Prêts','SÉNEVÉ Loans');
 const suffixe=en?'?lang=en':'';

 let contenu:ReactNode;
 if(erreur)contenu=<div role="alert" className="sp-vide"><p>{l('Suivi indisponible. Vérifie ta connexion et ton accès à Habitudes & Défis.','Tracker unavailable. Check your connection and access to Habits & Challenges.')}</p><button type="button" className="sp-bouton sp-doux" onClick={()=>void recharger().catch(()=>setErreur(true))}>{l('Réessayer','Retry')}</button></div>;
 else if(!suivi)contenu=<p role="status" className="sp-vide">{l('Chargement…','Loading…')}</p>;
 else if(vue.type==='pret')contenu=<FormulairePret key={vue.pret?.loan_id??'nouveau'} suivi={suivi} pret={vue.pret} nomInitial={vue.nom} noms={personnes.map(p=>p.nom)} busy={busy} l={l} langue={langue}
  annuler={()=>aller(vue.retour)}
  enregistrer={(args,nom)=>action(()=>enregistrerPret(args),l('Prêt enregistré.','Loan saved.'),()=>setVue({type:'personne',cle:cleNom(nom)}))}
  supprimer={vue.pret?()=>action(()=>supprimerPret(suivi.enrollment_id,vue.pret!.loan_id),l('Prêt supprimé.','Loan deleted.'),()=>setVue({type:'liste'})):undefined}/>;
 else if(vue.type==='personne'){
  const p=personnes.find(x=>x.cle===vue.cle);
  contenu=p?<FichePersonne p={p} suivi={suivi} busy={busy} l={l} argent={argent} nombre={nombre} dateLongue={dateLongue} puce={puce}
   retour={()=>aller({type:'liste'})} nouveau={()=>aller({type:'pret',nom:p.nom,retour:vue})} modifier={x=>aller({type:'pret',pret:x,retour:vue})}
   rembourser={(x,montant,date,id)=>action(()=>saisirCreance({p_enrollment_id:suivi.enrollment_id,p_loan_id:x.loan_id,p_amount:montant,p_payment_date:date,p_request_id:id},true),l('Remboursement enregistré.','Repayment saved.'))}
   retirer={id=>action(()=>supprimerRemboursement(suivi.enrollment_id,id),l('Remboursement supprimé.','Repayment deleted.'))}/>
   :<div className="sp-vide"><p>{l('Cette personne n’a plus de prêt.','This person has no loans any more.')}</p><button type="button" className="sp-bouton sp-doux" onClick={()=>aller({type:'liste'})}>{l('Revenir aux prêts','Back to loans')}</button></div>;
 }else{
  const enCours=personnes.filter(p=>p.enCours),soldes=personnes.filter(p=>!p.enCours);
  const urgents=enCours.filter(p=>p.retard!==null&&p.retard<=URGENCE),calmes=enCours.filter(p=>!(p.retard!==null&&p.retard<=URGENCE));
  const ligne=(p:Personne)=>{const t=totauxParDevise(p.prets);return <li key={p.cle}><button type="button" className="sp-ligne" onClick={()=>aller({type:'personne',cle:p.cle})}>
   <span className="sp-av" style={{background:couleur(p.cle)}} aria-hidden="true">{initiales(p.nom)}</span>
   <span className="sp-milieu"><b>{p.nom}</b><small>{t.map(x=>x.recu?l(`Prêté ${nombre(x.total,x.devise)} · reçu ${nombre(x.recu,x.devise)}`,`Lent ${nombre(x.total,x.devise)} · received ${nombre(x.recu,x.devise)}`):l(`Prêté ${nombre(x.total,x.devise)} · rien reçu`,`Lent ${nombre(x.total,x.devise)} · nothing received`)).join(' · ')}</small>
    {t.length===1&&<span className="sp-mini" aria-hidden="true"><i style={{width:`${Math.round(t[0]!.recu/t[0]!.total*100)}%`}}/></span>}</span>
   <span className="sp-droite">{t.map(x=><b key={x.devise}>{argent(p.enCours?x.total-x.recu:x.total,x.devise)}</b>)}{puce(p.prochaine,!p.enCours)}</span>
   <IconeHD nom="chevron_right" className="sp-chev text-[20px]"/></button></li>;};
  contenu=<>
   {(()=>{const t=totauxParDevise(suivi.loans),dus=t.filter(x=>x.total>x.recu);return dus.length?dus:t;})().map(t=>{const pct=Math.round(t.recu/t.total*100);return <section key={t.devise} className="sp-resume" aria-label={l('Résumé','Summary')+' '+t.devise}>
    <small>{l('Reste à récupérer','Still owed')}</small><strong className="sp-gros">{argent(t.total-t.recu,t.devise)}</strong>
    <div className="sp-trois"><div><small>{l('Prêté','Lent')}</small><b>{nombre(t.total,t.devise)}</b></div><div><small>{l('Reçu','Received')}</small><b>{nombre(t.recu,t.devise)}</b></div><div><small>{l('Personnes','People')}</small><b>{new Set(suivi.loans.filter(x=>x.currency===t.devise&&resteCreance(x)>0).map(x=>x.borrower.trim().toLowerCase())).size}</b></div></div>
    <div className="sp-barre" aria-hidden="true"><i style={{width:`${pct}%`}}/></div><small>{l(`${pct} % déjà remboursé`,`${pct}% already repaid`)}</small></section>;})}
   {!suivi.loans.length?<div className="sp-vide"><span className="sp-icone-vide" aria-hidden="true"><IconeHD nom="handshake" className="text-[30px]"/></span><p>{l('Aucun prêt enregistré. Ajoute une personne qui te doit de l’argent.','No loans recorded. Add someone who owes you money.')}</p></div>:<>
    <div className="sim-ios-segment sp-segment" role="radiogroup" aria-label={l('Prêts','Loans')}>
     <button type="button" role="radio" aria-checked={segment==='cours'} onClick={()=>setSegment('cours')}>{l('En cours','Active')} · {enCours.length}</button>
     <button type="button" role="radio" aria-checked={segment==='soldes'} onClick={()=>setSegment('soldes')}>{l('Soldés','Repaid')} · {soldes.length}</button>
    </div>
    {segment==='cours'?<>
     {!enCours.length&&<p className="sp-vide">{l('Tout le monde a remboursé.','Everyone has repaid.')}</p>}
     {urgents.length>0&&<><h2 className="sp-titre-sec">{l('À suivre en premier','Follow up first')}</h2><ul className="sp-groupe">{urgents.map(ligne)}</ul></>}
     {calmes.length>0&&<><h2 className="sp-titre-sec">{urgents.length?l('Sans urgence','No rush'):l('Personnes','People')}</h2><ul className="sp-groupe">{calmes.map(ligne)}</ul></>}
    </>:<>{!soldes.length?<p className="sp-vide">{l('Aucun prêt totalement remboursé pour l’instant.','No fully repaid loans yet.')}</p>:<ul className="sp-groupe sp-marge">{soldes.map(ligne)}</ul>}</>}
   </>}
   <button type="button" className="sp-bouton sp-plein sp-ajouter" onClick={()=>aller({type:'pret',retour:{type:'liste'}})}><IconeHD nom="add" className="text-[22px]"/>{l('Ajouter un prêt','Add a loan')}</button>
   <p className="sim-ios-note">{l('Suivi privé. Ces saisies ne modifient pas tes caisses et ne sont pas réparties comme un revenu. Aucun transfert ni message automatique.','Private tracker. These entries do not change your cash balances or allocate income. No automatic transfers or messages.')}</p>
  </>;
 }
 return <CadreHabitudes titre={titre} langue={langue} retour={`/espace${suffixe}`} retourLibelle={l('Revenir à ma journée','Back to my day')} liens={{aujourdhui:`/espace${suffixe}`}} actif="aujourdhui"><main className="sim-ios sp-page hd-classique mx-auto w-full max-w-xl px-4 pb-10">
  <div ref={haut}/>
  {message&&<p role="status" className="sp-message">{message}</p>}
  {contenu}
 </main></CadreHabitudes>;
}

type L=(fr:string,en:string)=>string;
function FichePersonne({p,suivi,busy,l,argent,nombre,dateLongue,puce,retour,nouveau,modifier,rembourser,retirer}:{p:Personne;suivi:SuiviCreances;busy:boolean;l:L;argent:(c:number,d:string)=>string;nombre:(c:number,d:string)=>string;dateLongue:(s:string)=>string;puce:(d:string|null,s:boolean)=>ReactNode;
 retour:()=>void;nouveau:()=>void;modifier:(x:Creance)=>void;rembourser:(x:Creance,montant:string,date:string,id:string)=>Promise<boolean>;retirer:(id:string)=>Promise<boolean>}){
 const actifs=p.prets.filter(x=>resteCreance(x)>0);
 const [ouvert,setOuvert]=useState(false),[pretId,setPretId]=useState(actifs[0]?.loan_id??''),[recu,setRecu]=useState(''),[date,setDate]=useState(aujourdHui),[erreur,setErreur]=useState(''),[confirmer,setConfirmer]=useState('');
 const demande=useRef<{cle:string;id:string}|null>(null);
 const cible=p.prets.find(x=>x.loan_id===pretId)??actifs[0];
 useEffect(()=>{if(!actifs.some(x=>x.loan_id===pretId))setPretId(actifs[0]?.loan_id??'');},[actifs,pretId]);
 const premiere=[...p.prets].sort((a,b)=>a.loan_date.localeCompare(b.loan_date))[0]!;
 const histoire=[...p.prets.map(x=>({cle:'p'+x.loan_id,date:x.loan_date,pret:x,paiement:null as null|{payment_id:string;amount:string}})),...p.prets.flatMap(x=>x.payments.map(y=>({cle:'r'+y.payment_id,date:y.payment_date,pret:x,paiement:y})))].sort((a,b)=>b.date.localeCompare(a.date)||(a.paiement?-1:1));
 async function envoyer(e:FormEvent,montant=recu){
  e.preventDefault();setErreur('');if(!cible)return;const reste=resteCreance(cible);
  if(!montantValidePourDevise(montant,cible.currency)||Number(montant)<=0||centsCreance(montant)>reste){setErreur(l('Vérifie le montant et le solde restant.','Check the amount and remaining balance.'));return;}
  const cle=JSON.stringify([cible.loan_id,montant,date]);if(demande.current?.cle!==cle)demande.current={cle,id:crypto.randomUUID()};
  if(await rembourser(cible,montant,date,demande.current.id)){demande.current=null;setRecu('');setOuvert(false);}
 }
 const toutRendu=(x:Creance)=>{const v=(resteCreance(x)/100).toFixed(decimalesDevise(x.currency));const id=crypto.randomUUID();void rembourser(x,v,aujourdHui(),id);};
 return <>
  <button type="button" className="sp-lien-retour" onClick={retour}><IconeHD nom="chevron_left" className="text-[22px]"/>{l('Prêts','Loans')}</button>
  <div className="sp-tete"><span className="sp-av sp-av-grand" style={{background:couleur(p.cle)}} aria-hidden="true">{initiales(p.nom)}</span><h1>{p.nom}</h1>
   <small>{p.prets.length>1?l(`${p.prets.length} prêts · depuis le ${dateLongue(premiere.loan_date)}`,`${p.prets.length} loans · since ${dateLongue(premiere.loan_date)}`):l(`Prêt du ${dateLongue(premiere.loan_date)}`,`Lent on ${dateLongue(premiere.loan_date)}`)}</small></div>
  {totauxParDevise(p.prets).map(t=>{const pct=Math.round(t.recu/t.total*100),c=2*Math.PI*30;return <section key={t.devise} className="sp-anneau">
   <svg width="78" height="78" viewBox="0 0 74 74" aria-hidden="true"><circle cx="37" cy="37" r="30" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="10"/><circle cx="37" cy="37" r="30" fill="none" stroke="var(--ios-accent,#5b4ee8)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-pct/100)} transform="rotate(-90 37 37)"/><text x="37" y="42" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">{pct} %</text></svg>
   <div><small>{l('Reste à récupérer','Still owed')}</small><b>{argent(t.total-t.recu,t.devise)}</b><small>{l(`sur ${argent(t.total,t.devise)} prêtés`,`of ${argent(t.total,t.devise)} lent`)}</small>
    <div>{puce(p.prochaine,!p.enCours)}</div></div></section>;})}
  <div className="sp-actions">
   {actifs.length>0&&<button type="button" className="sp-bouton sp-plein" aria-expanded={ouvert} onClick={()=>{setOuvert(!ouvert);setErreur('');}}><IconeHD nom="add" className="text-[20px]"/>{l('Remboursement','Repayment')}</button>}
   <button type="button" className="sp-bouton sp-doux" onClick={nouveau}>{l('Nouveau prêt','New loan')}</button>
  </div>
  {ouvert&&cible&&<form className="sp-groupe sp-formulaire" onSubmit={e=>void envoyer(e)} aria-label={l('Noter un remboursement reçu','Record a repayment received')}><fieldset disabled={busy}>
   {actifs.length>1&&<label className="sp-champ" htmlFor="sp-recu-pret"><span>{l('Pour le prêt','For loan')}</span><select id="sp-recu-pret" value={cible.loan_id} onChange={e=>setPretId(e.target.value)}>{actifs.map(x=><option key={x.loan_id} value={x.loan_id}>{(x.note?x.note+' · ':'')+dateLongue(x.loan_date)}</option>)}</select></label>}
   <label className="sp-champ" htmlFor="sp-recu-montant"><span>{l('Montant reçu','Amount received')}</span><input id="sp-recu-montant" type="number" inputMode="decimal" step="any" min="0.01" max={String(resteCreance(cible)/100)} required value={recu} placeholder="0" onChange={e=>setRecu(e.target.value)}/></label>
   <label className="sp-champ" htmlFor="sp-recu-date"><span>{l('Date du remboursement','Repayment date')}</span><input id="sp-recu-date" type="date" required min={cible.loan_date} max={aujourdHui()} value={date} onChange={e=>setDate(e.target.value)}/></label>
   <p className="sp-aide">{l('Reste dû sur ce prêt :','Left on this loan:')} <button type="button" className="sp-lien" onClick={()=>setRecu((resteCreance(cible)/100).toFixed(decimalesDevise(cible.currency)))}>{argent(resteCreance(cible),cible.currency)}</button></p>
   {erreur&&<p role="status" className="sim-ios-alerte">{erreur}</p>}
   <div className="sp-pied"><button className="sp-bouton sp-plein">{busy?l('Enregistrement…','Saving…'):l('Enregistrer le remboursement','Save repayment')}</button></div>
  </fieldset></form>}
  <h2 className="sp-titre-sec">{p.prets.length>1?l('Ses prêts','Loans'):l('Le prêt','The loan')}</h2>
  {p.prets.map(x=>{const r=resteCreance(x);return <section key={x.loan_id} className="sp-groupe sp-pret">
   <div className="sp-pret-haut"><div><b>{x.note??l('Prêt','Loan')}</b><small>{dateLongue(x.loan_date)} · {argent(centsCreance(x.amount),x.currency)}{x.due_date?' · '+l('échéance','due')+' '+dateLongue(x.due_date):''}</small></div>
    <div className="sp-droite"><b>{argent(r,x.currency)}</b>{puce(x.due_date,r===0)}</div></div>
   <div className="sp-mini sp-mini-large" aria-hidden="true"><i style={{width:`${Math.round(recuCreance(x)/centsCreance(x.amount)*100)}%`}}/></div>
   <div className="sp-pret-actions">
    {r>0&&<button type="button" disabled={busy} className="sp-lien" onClick={()=>toutRendu(x)}><IconeHD nom="check_circle" className="text-[18px]"/>{l('Tout est remboursé','Fully repaid')}</button>}
    <button type="button" disabled={busy} className="sp-lien" onClick={()=>modifier(x)}><IconeHD nom="edit" className="text-[18px]"/>{l('Modifier','Edit')}</button>
   </div></section>;})}
  <h2 className="sp-titre-sec">{l('Historique','History')}</h2>
  <ul className="sp-groupe">{histoire.map(h=>{const pay=h.paiement;return <li key={h.cle} className="sp-hist">
   <span className="sp-pastille" style={{background:pay?'var(--sp-vert)':'var(--ios-accent,#5b4ee8)'}} aria-hidden="true">{pay?'↓':'↑'}</span>
   <span className="sp-milieu"><b>{pay?l('Remboursement','Repayment'):(h.pret.note?l('Prêt · ','Loan · ')+h.pret.note:l('Prêt','Loan'))}</b><small>{dateLongue(h.date)}</small></span>
   <b className={pay?'sp-plus':''}>{pay?'+':''}{argent(centsCreance(pay?pay.amount:h.pret.amount),h.pret.currency)}</b>
   {pay&&(confirmer===pay.payment_id
    ?<button type="button" disabled={busy} className="sp-supprimer sp-confirmer" onClick={()=>void retirer(pay.payment_id).then(()=>setConfirmer(''))}>{l('Supprimer ?','Delete?')}</button>
    :<button type="button" disabled={busy} className="sp-supprimer" aria-label={l('Supprimer ce remboursement','Delete this repayment')} onClick={()=>setConfirmer(pay.payment_id)}><IconeHD nom="delete_outline" className="text-[20px]"/></button>)}
  </li>;})}</ul>
  <p className="sim-ios-note">{l(`Suivi privé : rien n’est envoyé à ${p.nom}.`,`Private tracker: nothing is sent to ${p.nom}.`)}</p>
 </>;
}

function FormulairePret({suivi,pret,nomInitial,noms,busy,l,langue,annuler,enregistrer,supprimer}:{suivi:SuiviCreances;pret?:Creance;nomInitial?:string;noms:string[];busy:boolean;l:L;langue:'fr'|'en';
 annuler:()=>void;enregistrer:(args:Parameters<typeof enregistrerPret>[0],nom:string)=>Promise<boolean>;supprimer?:()=>Promise<boolean>}){
 const [nom,setNom]=useState(pret?.borrower??nomInitial??''),[montant,setMontant]=useState(pret?String(Number(pret.amount)):''),[devise,setDevise]=useState(pret?.currency??suivi.loans[0]?.currency??'USD');
 const [motif,setMotif]=useState(pret?.note??''),[date,setDate]=useState(pret?.loan_date??aujourdHui()),[avecEcheance,setAvecEcheance]=useState(!!pret?.due_date),[echeance,setEcheance]=useState(pret?.due_date??'');
 const [erreur,setErreur]=useState(''),[confirmer,setConfirmer]=useState(false);
 const id=useRef(pret?.loan_id??crypto.randomUUID());
 const paye=pret?recuCreance(pret):0,premierRecu=pret?.payments.map(p=>p.payment_date).sort()[0];
 async function envoyer(e:FormEvent){
  e.preventDefault();setErreur('');
  if(!nom.trim()){setErreur(l('Écris le nom de la personne.','Enter the person’s name.'));return;}
  if(!montantValidePourDevise(montant,devise)||Number(montant)<=0){setErreur(l('Vérifie le montant.','Check the amount.'));return;}
  if(centsCreance(montant)<paye){setErreur(l('Le montant ne peut pas être plus petit que ce qui a déjà été remboursé.','The amount cannot be less than what has already been repaid.'));return;}
  if(avecEcheance&&(!echeance||echeance<date)){setErreur(l('L’échéance doit venir après la date du prêt.','The due date must be after the loan date.'));return;}
  await enregistrer({p_enrollment_id:suivi.enrollment_id,p_loan_id:id.current,p_borrower:nom.trim(),p_amount:montant,p_currency:devise,p_loan_date:date,p_due_date:avecEcheance?echeance:null,p_note:motif.trim()||null},nom.trim());
 }
 return <form onSubmit={e=>void envoyer(e)} aria-label={pret?l('Modifier le prêt','Edit loan'):l('Ajouter un prêt','Add a loan')}><fieldset disabled={busy}>
  <div className="sp-barre-form"><button type="button" className="sp-lien" onClick={annuler}>{l('Annuler','Cancel')}</button><button className="sp-lien sp-gras">{busy?l('Enregistrement…','Saving…'):l('Enregistrer','Save')}</button></div>
  <div className="sp-groupe">
   <label className="sp-champ" htmlFor="pret-nom"><span>{l('Personne','Person')}</span><input id="pret-nom" required maxLength={80} list="sp-noms" placeholder={l('Nom','Name')} value={nom} onChange={e=>setNom(e.target.value)} autoComplete="off"/></label>
   <datalist id="sp-noms">{noms.map(n=><option key={n} value={n}/>)}</datalist>
   <label className="sp-champ" htmlFor="pret-montant"><span>{l('Montant prêté','Amount lent')}</span><input id="pret-montant" type="number" inputMode="decimal" step="any" min="0.01" required placeholder="0" value={montant} onChange={e=>setMontant(e.target.value)}/></label>
   <div className="sp-champ"><span>{l('Devise','Currency')}</span>{paye>0?<span className="sp-fixe">{devise}</span>:<ChoixDevise id="pret-devise" valeur={devise} onChange={setDevise} langue={langue}/>}</div>
   <label className="sp-champ" htmlFor="pret-motif"><span>{l('Motif','Reason')}</span><input id="pret-motif" maxLength={80} placeholder={l('facultatif','optional')} value={motif} onChange={e=>setMotif(e.target.value)}/></label>
  </div>
  {paye>0&&<p className="sim-ios-note">{l('La devise ne change plus après un premier remboursement.','The currency is locked after a first repayment.')}</p>}
  <h2 className="sp-titre-sec">{l('Dates','Dates')}</h2>
  <div className="sp-groupe">
   <label className="sp-champ" htmlFor="pret-date"><span>{l('Date du prêt','Loan date')}</span><input id="pret-date" type="date" required max={premierRecu??aujourdHui()} value={date} onChange={e=>setDate(e.target.value)}/></label>
   <div className="sp-champ"><span id="pret-echeance-libelle">{l('Échéance','Due date')}</span><button type="button" role="switch" aria-checked={avecEcheance} aria-labelledby="pret-echeance-libelle" className="sp-bascule" onClick={()=>setAvecEcheance(!avecEcheance)}/></div>
   {avecEcheance&&<label className="sp-champ" htmlFor="pret-echeance"><span>{l('Remboursement le','Repay by')}</span><input id="pret-echeance" type="date" required min={date} value={echeance} onChange={e=>setEcheance(e.target.value)}/></label>}
  </div>
  {erreur&&<p role="status" className="sim-ios-alerte">{erreur}</p>}
  <div className="sp-pied"><button className="sp-bouton sp-plein">{busy?l('Enregistrement…','Saving…'):pret?l('Enregistrer les changements','Save changes'):l('Enregistrer le prêt','Save loan')}</button></div>
  {supprimer&&<div className="sp-pied">{confirmer
   ?<button type="button" className="sp-bouton sp-danger" onClick={()=>void supprimer()}>{l('Supprimer ce prêt et ses remboursements','Delete this loan and its repayments')}</button>
   :<button type="button" className="sp-bouton sp-danger-doux" onClick={()=>setConfirmer(true)}><IconeHD nom="delete_outline" className="text-[20px]"/>{l('Supprimer le prêt','Delete loan')}</button>}</div>}
 </fieldset></form>;
}

export function RouteOnMeDoit(){return suiviFinancierActive()?<ComptePrive enfants={userId=><OnMeDoit userId={userId}/>}/>:<NotFound/>;}
