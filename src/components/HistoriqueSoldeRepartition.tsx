import {useEffect,useRef,useState} from 'react';
import {chargerHistoriqueSolde,supprimerEncaissementDuSolde,type MouvementSolde,type SoldeMisAJour} from '@/lib/habitudes-finance-historique';
import {decimalesDevise} from '@/lib/devises';

export function HistoriqueSoldeRepartition({devise,langue,onFermer,onSolde}:{devise:string;langue:string;onFermer:()=>void;onSolde:(solde:SoldeMisAJour)=>void}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [mouvements,setMouvements]=useState<MouvementSolde[]>([]);
 const [suite,setSuite]=useState(false);
 const [chargement,setChargement]=useState(true);
 const [erreur,setErreur]=useState('');
 const [avis,setAvis]=useState('');
 const [aSupprimer,setASupprimer]=useState<Extract<MouvementSolde,{kind:0}>|null>(null);
 const [suppression,setSuppression]=useState(false);
 const [relecture,setRelecture]=useState(0);
 const dialogue=useRef<HTMLDialogElement>(null);
 const chargementSuite=useRef(false);
 const monnaie=new Intl.NumberFormat(en?'en-US':'fr-FR',{maximumFractionDigits:decimalesDevise(devise)});
 const format=(v:string)=>`${monnaie.format(Number(v))} ${devise}`;
 const calendrier=new Intl.DateTimeFormat(en?'en-US':'fr-FR',{dateStyle:'full',timeZone:'UTC'});

 useEffect(()=>{
  const volet=dialogue.current;
  if(!volet)return;
  if(typeof volet.showModal==='function')volet.showModal();
  else volet.setAttribute('open','');
  return ()=>{if(typeof volet.close==='function')volet.close();};
 },[]);

 useEffect(()=>{
  let actif=true;
  setChargement(true);setErreur('');
  void chargerHistoriqueSolde(devise).then(page=>{
   if(actif){setMouvements(page.mouvements);setSuite(page.suite);}
  }).catch(()=>{
   if(actif)setErreur(en?'The balance history could not be loaded.':'Impossible de charger l’historique du solde.');
  }).finally(()=>{if(actif)setChargement(false);});
  return ()=>{actif=false;};
 },[devise,en,relecture]);

 async function afficherSuite(){
  const dernier=mouvements.at(-1);
  if(!dernier||chargementSuite.current)return;
  chargementSuite.current=true;
  setChargement(true);setErreur('');
  try{
   const page=await chargerHistoriqueSolde(devise,dernier);
   setMouvements(liste=>[...liste,...page.mouvements]);
   setSuite(page.suite);
  }catch{
   setErreur(l('Impossible de charger les opérations suivantes.','The next entries could not be loaded.'));
  }finally{
   chargementSuite.current=false;
   setChargement(false);
  }
 }

 async function confirmerSuppression(){
  if(!aSupprimer||suppression)return;
  setSuppression(true);setErreur('');setAvis('');
  try{
   const solde=await supprimerEncaissementDuSolde(devise,aSupprimer.id);
   onSolde(solde);
   setASupprimer(null);
   setMouvements(liste=>liste.filter(m=>m.kind!==0||m.id!==aSupprimer.id));
   setAvis(l('Encaissement supprimé. Le solde a été actualisé.','Receipt removed. The balance has been updated.'));
   setRelecture(n=>n+1);
  }catch(e){
   const refuse=objetErreur(e)&&e.code==='23514';
   setASupprimer(null);
   setErreur(refuse?l('Cet encaissement a déjà servi aux charges ou à une répartition.','This receipt has already been used for expenses or an allocation.'):l('Impossible de supprimer cet encaissement.','This receipt could not be removed.'));
  }finally{setSuppression(false);}
 }

 return <dialog ref={dialogue} className="rep-historique hd-classique" aria-labelledby="rep-historique-titre" onCancel={e=>{e.preventDefault();if(!suppression)onFermer();}}>
  <div className="rep-historique-contenu">
   <header className="rep-historique-entete">
    <div><h2 id="rep-historique-titre">{l('Historique du solde','Balance history')}</h2><p>{devise}</p></div>
    <button type="button" autoFocus disabled={suppression} onClick={onFermer}>{l('Fermer','Close')}</button>
   </header>
   {avis&&<p role="status">{avis}</p>}
   {erreur&&<div role="alert"><p>{erreur}</p><button type="button" onClick={()=>setRelecture(n=>n+1)}>{l('Actualiser','Refresh')}</button></div>}
   {chargement&&mouvements.length===0&&<p role="status">{l('Chargement de l’historique…','Loading history…')}</p>}
   {!chargement&&!erreur&&!mouvements.length&&<p>{l('Aucune opération dans cette devise.','No entries in this currency.')}</p>}
   {mouvements.length>0&&<ol className="rep-historique-liste">
    {mouvements.map(m=><li key={m.kind+':'+m.id}>
     <div className="rep-historique-ligne">
      <div>
       <strong>{m.kind===0?l('Encaissement','Receipt'):l('Solde reporté','Balance carried forward')}</strong>
       <time dateTime={m.date_locale}>{calendrier.format(new Date(m.date_locale+'T12:00:00Z'))}</time>
      </div>
      <strong>{format(m.kind===0?m.amount:m.balance)}</strong>
     </div>
     {m.kind===0?<p>{l('Ajouté au solde','Added to the balance')} <b>{format(m.net)}</b> · {l('Solde après l’entrée','Balance after receipt')} <b>{format(m.balance)}</b></p>
      :<p>{l('Montant réparti','Amount allocated')} <b>{format(m.amount)}</b></p>}
     {m.kind===0&&m.removal_block&&<p>{m.removal_block==='charges'
      ?l('Déjà affecté aux charges','Already used for expenses')
      :l('Déjà pris en compte dans une répartition','Already included in an allocation')}</p>}
     {m.kind===0&&m.removal_block===null&&aSupprimer?.id!==m.id&&<button type="button" className="rep-charge-retirer"
      aria-label={l(`Supprimer l’encaissement de ${format(m.amount)}`,`Remove the ${format(m.amount)} receipt`)}
      disabled={suppression||chargement} onClick={()=>{setASupprimer(m);setErreur('');setAvis('');}}>{l('Supprimer','Remove')}</button>}
     {m.kind===0&&aSupprimer?.id===m.id&&<div className="rep-historique-confirmation">
      <p>{l(`Supprimer cet encaissement de ${format(m.amount)} ?`,`Remove this ${format(m.amount)} receipt?`)}</p>
      <button type="button" className="rep-charge-retirer" disabled={suppression} onClick={()=>void confirmerSuppression()}>{l('Confirmer la suppression','Confirm removal')}</button>
      <button type="button" disabled={suppression} onClick={()=>setASupprimer(null)}>{l('Annuler','Cancel')}</button>
     </div>}
    </li>)}
   </ol>}
   {suite&&<button type="button" disabled={chargement||suppression} onClick={()=>void afficherSuite()}>
    {chargement?l('Chargement…','Loading…'):l('Afficher plus','Show more')}
   </button>}
  </div>
 </dialog>;
}

function objetErreur(e:unknown):e is {code:unknown}{return typeof e==='object'&&e!==null&&'code' in e;}
