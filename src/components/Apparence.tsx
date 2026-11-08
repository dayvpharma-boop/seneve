import {IconeResultat} from './IconeResultat';
import {useId,useRef,useState} from 'react';
import {useApparence,type Apparence as Choix} from '@/lib/apparence';
import {IconeJourneeDemarrage as I} from './IconesDemarrage';
export function Apparence({langue='fr',compact=false,contraste=false}:{langue?:string;compact?:boolean;contraste?:boolean}){
  const groupe=useId();
  const [apparence,choisir]=useApparence();
  const [ouvert,setOuvert]=useState(false);
  const menu=useRef<HTMLDetailsElement>(null);
  const en=langue==='en';
  const titre=en?'Appearance':'Apparence';
  const choix:readonly [Choix,string][]=[
    ['clair',en?'Light':'Clair'],
    ['sombre',en?'Dark':'Sombre'],
    ['systeme',en?'Device setting':'Selon l’appareil'],
  ];

  function fermerMenu(){
    if(!menu.current)return;
    menu.current.open=false;
    menu.current.querySelector('summary')?.focus();
  }

  const controles=<fieldset className="apparence-choix">
    <legend>{titre}</legend>
    {choix.map(([valeur,nom])=><label key={valeur}>
      <input
        type="radio"
        name={groupe}
        value={valeur}
        checked={apparence===valeur}
        onChange={()=>{choisir(valeur);fermerMenu();}}
        onClick={apparence===valeur?fermerMenu:undefined}
      />
      {nom}
    </label>)}
  </fieldset>;

  return compact?<details ref={menu} className="apparence-menu" onToggle={e=>setOuvert(e.currentTarget.open)}>
    <summary aria-label={titre}>{contraste ? <IconeResultat nom="contrast" taille={22}/> : <I nom="bedtime" taille={22}/>}</summary>
    {ouvert&&controles}
  </details>:controles;
}

