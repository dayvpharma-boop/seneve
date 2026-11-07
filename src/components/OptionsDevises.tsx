import {DEVISES_SUIVI,nomDevise} from '@/lib/devises';

/** Monnaies les plus utilisées en premier (demande du 07/11/2026 : le dollar était perdu en 133e position). */
// Ordre demandé par Dr Justin (07/11/2026) : le dollar en premier ; le franc congolais juste après le kwanza
// (7e ligne du menu en comptant le titre « Les plus utilisées »), puis pays voisins et monnaies du commerce.
export const DEVISES_COURANTES=['USD','EUR','XAF','XOF','AOA','CDF','ZMW','RWF','BIF','UGX','TZS','KES','ZAR','NGN','GHS','CNY','AED','GBP','CAD','CHF'] as const;
const NOMS_FR:Record<string,string>={USD:'Dollar américain',CDF:'Franc congolais',EUR:'Euro',XAF:'Franc CFA d’Afrique centrale',XOF:'Franc CFA d’Afrique de l’Ouest',CNY:'Yuan chinois',AED:'Dirham des Émirats – Dubaï'};
const NOMS_EN:Record<string,string>={USD:'US dollar',CDF:'Congolese franc',EUR:'Euro',XAF:'Central African CFA franc',XOF:'West African CFA franc',CNY:'Chinese yuan',AED:'UAE dirham – Dubai'};
const majuscule=(s:string)=>s.charAt(0).toLocaleUpperCase('fr-FR')+s.slice(1);

export function libelleDevise(code:string,langue:'fr'|'en'):string{
 const nom=(langue==='en'?NOMS_EN:NOMS_FR)[code]??nomDevise(code,langue);
 return `${majuscule(nom)} (${code})`;
}

/** Options d'un menu de monnaies : les plus utilisées, puis toutes les autres par ordre alphabétique de nom. */
export function OptionsDevises({langue}:{langue:'fr'|'en'}){
 const courantes=DEVISES_COURANTES.filter(c=>DEVISES_SUIVI.includes(c));
 const autres=DEVISES_SUIVI.filter(c=>!(courantes as readonly string[]).includes(c)).map(c=>({c,l:libelleDevise(c,langue)})).sort((a,b)=>a.l.localeCompare(b.l,langue));
 return <>
  <optgroup label={langue==='en'?'Most used':'Les plus utilisées'}>{courantes.map(c=><option key={c} value={c}>{libelleDevise(c,langue)}</option>)}</optgroup>
  <optgroup label={langue==='en'?'Other currencies':'Autres monnaies'}>{autres.map(({c,l})=><option key={c} value={c}>{l}</option>)}</optgroup>
 </>;
}
