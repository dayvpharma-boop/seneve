import './SimulateurDime.css';
import {useState,type FormEvent} from 'react';
import {simulerDime,type TypeRevenuDime} from '@/lib/habitudes-dime';
type Situation=TypeRevenuDime|'pret'|'offrande'|'particulier'|'';
/** Montants dans l'état React seulement : aucun stockage, RPC, suivi de progression ou paiement. */
export function SimulateurDime({langue}:{langue:string}){
 const en=langue==='en';const [type,setType]=useState<Situation>(''),[periode,setPeriode]=useState('');
 const [recu,setRecu]=useState(''),[cout,setCout]=useState(''),[charges,setCharges]=useState('');
 const [resultat,setResultat]=useState<ReturnType<typeof simulerDime>|null>(null),[erreur,setErreur]=useState(false);
 const effacer=()=>{setRecu('');setCout('');setCharges('');setResultat(null);setErreur(false);};
 const afficher=(s:string)=>en?s:s.replace('.',',');
 const calculable=['commerce','salaire','don'].includes(type);
 function calculer(e:FormEvent){e.preventDefault();setErreur(false);setResultat(null);try{if(!periode)throw Error();setResultat(simulerDime(type as TypeRevenuDime,recu,cout,charges));}catch{setErreur(true);}}
 const champ=(libelle:string,valeur:string,changer:(v:string)=>void)=><label>{libelle}<input type="text" inputMode="decimal" autoComplete="off" required maxLength={32} value={valeur} onChange={e=>{changer(e.target.value);setResultat(null);setErreur(false);}}/></label>;
 return <details className="card hd-simulateur"><summary>{en?'Optional tithe simulator':'Simulateur de dîme facultatif'}</summary>
  <p>{en?'Educational rules taught in SÉNEVÉ. This is not an individual tax assessment or a legal obligation.':'Règles pédagogiques enseignées dans SÉNEVÉ. Ce n’est ni un conseil fiscal individuel ni une obligation légale.'}</p>
  <p>{en?'No amount history is saved. This simulator does not make payments.':'Aucun historique des montants n’est enregistré. Ce simulateur ne réalise aucun paiement.'}</p>
  <label>{en?'Situation':'Situation'}<select value={type} onChange={e=>{setType(e.target.value as Situation);setPeriode('');effacer();}}>
   <option value="">{en?'Choose':'Choisir'}</option><option value="commerce">{en?'Business':'Commerce / entreprise'}</option><option value="salaire">{en?'Salary':'Salaire'}</option><option value="don">{en?'Cash gift — general case':'Don d’argent — cas général'}</option><option value="pret">{en?'Loan principal':'Principal d’un prêt'}</option><option value="offrande">{en?'Offering':'Offrande'}</option><option value="particulier">{en?'Case requiring clarification':'Cas à préciser'}</option>
  </select></label>
  {type==='pret'&&<p role="status">{en?'The loan principal is not treated as income or a gift. No tithe is calculated on the loan itself.':'Le principal d’un prêt n’est pas un revenu ou un don. Aucune dîme n’est calculée sur le simple prêt.'}</p>}
  {type==='offrande'&&<p role="status">{en?'The amount is freely chosen according to your means. No percentage is imposed.':'Le montant est librement choisi selon tes moyens. Aucun pourcentage n’est imposé.'}</p>}
  {type==='particulier'&&<p role="status">{en?'No automatic calculation: earmarked gifts, gifts in kind, expense reimbursements, unsold stock, taxes, contributions and other unresolved cases require clarification.':'Pas de calcul automatique : dons affectés, dons en nature, remboursements de frais, stock invendu, impôts, cotisations et autres cas non tranchés restent à préciser.'}</p>}
  {calculable&&<form onSubmit={calculer}>
   <label>{en?'Period':'Période'}<select required value={periode} onChange={e=>{setPeriode(e.target.value);setResultat(null);}}><option value="">{en?'Choose':'Choisir'}</option><option value="semaine">{en?'Week':'Semaine'}</option><option value="mois">{en?'Month':'Mois'}</option><option value="autre">{en?'Another period':'Autre période'}</option></select></label>
   <p>{en?'Use the same currency and period for every amount.':'Utilise la même monnaie et la même période pour tous les montants.'}</p>
   {type==='don'&&<p>{en?'For earmarked gifts or gifts in kind, choose the case requiring clarification.':'Pour un don affecté à une dépense précise ou un don en nature, choisis « Cas à préciser ».'}</p>}
   {champ(type==='commerce'?(en?'Sales received':'Ventes encaissées'):type==='salaire'?(en?'Salary received':'Salaire reçu'):(en?'Cash gift received':'Don d’argent reçu'),recu,setRecu)}
   {type==='commerce'&&champ(en?'Cost of goods':'Coût des marchandises',cout,setCout)}
   {type!=='don'&&champ(en?'Eligible professional expenses':'Charges professionnelles admissibles',charges,setCharges)}
   {type!=='don'&&<p>{en?'Only actual professional expenses; for salary, necessary expenses that were not reimbursed. Personal rent, household costs, food, school expenses and personal debt repayments are excluded.':'Seulement les charges professionnelles réelles ; pour un salaire, les dépenses nécessaires non remboursées. Le loyer personnel, le ménage, l’alimentation, les frais scolaires et les remboursements de dettes personnelles ne sont pas déduits.'}</p>}
   <button type="submit" className="btn">{en?'Simulate':'Simuler'}</button>
   {erreur&&<p role="alert">{en?'Choose a period and enter valid non-negative amounts (for example 1000.50).':'Choisis une période et saisis des montants valides, positifs ou nuls (par exemple 1000,50).'}</p>}
  </form>}
  {resultat&&<output aria-live="polite"><p>{en?'Calculation basis':'Base de calcul'} : {afficher(resultat.recu)}{type==='commerce'?` − ${afficher(resultat.marchandises)}`:''}{type!=='don'?` − ${afficher(resultat.charges)}`:''} = {afficher(resultat.solde)}</p><p>{en?'Positive basis used':'Base positive retenue'} : {afficher(resultat.base)}</p><p><strong>{en?'Simulated tithe':'Dîme simulée'} : {afficher(resultat.base)} × 10 % = {afficher(resultat.dime)}</strong></p><small>{en?'Exact result; no rounding rule is imposed.':'Résultat exact ; aucune règle d’arrondi n’est imposée.'}</small></output>}
  <button type="button" className="btn-secondaire" onClick={effacer}>{en?'Clear amounts':'Effacer les montants'}</button>
 </details>;
}
