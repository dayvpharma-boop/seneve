import {IconeResultat} from './IconeResultat';
import {useId,useState} from 'react';
import {useApparence,type Apparence as Choix} from '@/lib/apparence';
import {IconeJourneeDemarrage as I} from './IconesDemarrage';
export function Apparence({langue='fr',compact=false,contraste=false}:{langue?:string;compact?:boolean;contraste?:boolean}){const groupe=useId();const[v,choisir]=useApparence();const[ouvert,setOuvert]=useState(false);const en=langue==='en';const titre=en?'Appearance':'Apparence';const choix:readonly [Choix,string][]=[['clair',en?'Light':'Clair'],['sombre',en?'Dark':'Sombre'],['systeme',en?'Device setting':'Selon l’appareil']];const controles=<fieldset className="apparence-choix"><legend>{titre}</legend>{choix.map(([k,n])=><label key={k}><input type="radio" name={groupe} value={k} checked={v===k} onChange={()=>choisir(k)}/>{n}</label>)}</fieldset>;return compact?<details className="apparence-menu" onToggle={e=>setOuvert(e.currentTarget.open)}><summary aria-label={titre}>{contraste ? <IconeResultat nom="contrast" taille={22}/> : <I nom="bedtime" taille={22}/>}</summary>{ouvert&&controles}</details>:controles;}

