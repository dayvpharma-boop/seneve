import './LectureTexteHabitude.css';
/** Le texte publié reste intégral et échappé par React.
 * Ouvrir, lire ou fermer ce volet ne déclare aucune activité.
 */
export function LectureTexteHabitude({titre,texte,langue}:{titre:string;texte:string;langue:string}){
 if(!texte.trim())return null;
 return <details className="hd-lecture">
  <summary><span>{titre}</span><small>{langue==='en'?'Open the reading':'Ouvrir la lecture'}</small></summary>
  <article aria-label={titre} className="hd-lecture-texte">{texte}</article>
 </details>;
}
