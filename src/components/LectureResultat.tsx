import {useId, useState} from 'react';
import {IconeResultat} from './IconeResultat';

export type TailleResultat = 'normal' | 'grand' | 'tres-grand';
const CLE = 'seneve:taille-resultat';
export function lireTailleResultat(): TailleResultat {
  try {
    const valeur = localStorage.getItem(CLE);
    return valeur === 'grand' || valeur === 'tres-grand' ? valeur : 'normal';
  } catch { return 'normal'; }
}

/** Le réglage du résultat reste sur cet appareil ; il ne réduit jamais le corps sous 16 px. */
export function LectureResultat({langue, valeur, onChange}: {
  langue:'fr'|'en'; valeur:TailleResultat; onChange:(valeur:TailleResultat)=>void;
}) {
  const id = useId(), en = langue === 'en';
  const [ouvert,setOuvert]=useState(false);
  const choix: [TailleResultat,string][] = [['normal', en?'Standard':'Normale'], ['grand', en?'Large':'Grande'], ['tres-grand', en?'Extra large':'Très grande']];
  function appliquer(taille:TailleResultat) {
    onChange(taille);
    try { localStorage.setItem(CLE, taille); } catch { /* le réglage reste valable pour la page */ }
  }
  return <details className="result-lecture-menu" onToggle={e=>setOuvert(e.currentTarget.open)}>
    <summary aria-label={en?'Text size':'Taille du texte'}><IconeResultat nom="format_size" taille={22}/></summary>
    {ouvert&&<fieldset><legend>{en?'Text size':'Taille du texte'}</legend>{choix.map(([taille,label]) =>
      <label key={taille}><input type="radio" name={id} value={taille} checked={taille===valeur} onChange={()=>appliquer(taille)}/>{label}</label>
    )}</fieldset>}
  </details>;
}

/** Emblème SVG de la maquette : même tracé, couleurs liées au thème de SÉNEVÉ. */
export function GraineBilan() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" aria-hidden="true" focusable="false">
    <ellipse cx="12" cy="18" rx="3.5" ry="2.5" fill="var(--bilan-accent)" stroke="var(--bilan-or)"/>
    <path d="M12 16V8" stroke="var(--bilan-encre)"/>
    <path d="M12 11C10 9 8 9 7 11C6 13 8 15 12 13M12 9C14 7 17 7 18 9C19 11 17 13 12 11" fill="var(--bilan-accent)" fillOpacity=".3" stroke="var(--bilan-or)"/>
  </svg>;
}
