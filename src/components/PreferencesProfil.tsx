import {useId,useState} from 'react';
import {Apparence} from './Apparence';
import {IconePreferences as I} from './IconePreferences';
import {choisirApparence} from '@/lib/apparence';
import {DEFAUT_VISUEL,usePreferencesVisuelles,type Palette,type TailleTexte} from '@/lib/preferences-visuelles';

const PALETTES:{id:Palette;fr:string;en:string;couleurs:string[]}[]=[
  {id:'ivoire',fr:'Ivoire',en:'Ivory',couleurs:['#fff9ea','#1d1c13','#C9A84C']},
  {id:'sable',fr:'Sable',en:'Sand',couleurs:['#FAF2E5','#251B14','#C2A062']},
  {id:'sauge',fr:'Sauge',en:'Sage',couleurs:['#F2F3E9','#171F18','#A7B987']},
  {id:'argile',fr:'Argile',en:'Clay',couleurs:['#FAEFE8','#2B1C18','#C99170']},
  {id:'ardoise',fr:'Bleu ardoise',en:'Slate blue',couleurs:['#EDF2F7','#17212C','#8AA8BE']},
];
export function PreferencesProfil({langue,langueCompte,indisponible=false,lectureSeule=false,onLangueChange}:{
  langue:'fr'|'en';langueCompte:string;indisponible?:boolean;lectureSeule?:boolean;onLangueChange:(langue:'fr'|'en')=>void;
}) {
  const en=langue==='en',id=useId();
  const [preferences,choisir]=usePreferencesVisuelles();
  const [modifie,setModifie]=useState(false),[nonConserve,setNonConserve]=useState(false);
  function appliquer(changements:Partial<typeof preferences>){setNonConserve(!choisir({...preferences,...changements}));setModifie(true);}
  function retablir(){setNonConserve(!choisir(DEFAUT_VISUEL));choisirApparence('systeme');setModifie(true);}
  const tailles:[TailleTexte,string][]=[['normale',en?'Standard':'Normale'],['grande',en?'Large':'Grande'],['tres-grande',en?'Extra large':'Très grande']];
  return <section className="pf-card pf-preferences" id="preferences" aria-labelledby={`${id}-titre`}>
    <div className="pf-section-heading"><span className="pf-section-icon"><I nom="tune"/></span><div><p className="pf-eyebrow">{en?'Make yourself at home':'Un espace à ton rythme'}</p><h2 id={`${id}-titre`}>{en?'My preferences':'Mes préférences'}</h2></div></div>
    <div className="pf-preference-block"><h3><I nom="language" taille={22}/>{en?'Language':'Langue'}</h3>
      <p>{en?'Choose the language saved in your account.':'Choisis la langue enregistrée dans ton compte.'}</p>
      <fieldset className="pf-language" disabled={indisponible}><legend className="sr-only">{en?'Profile language':'Langue du profil'}</legend>{(['fr','en'] as const).map(l=><label key={l}><input type="radio" name={`${id}-langue`} checked={langueCompte===l} onChange={()=>onLangueChange(l)}/><span>{l==='fr'?'Français':'English'}</span></label>)}</fieldset>
      {lectureSeule&&<p className="pf-preference-note">{en?'Reconnect to change your account language. Reading and colour settings remain available.':'Reconnecte-toi pour changer la langue du compte. Les réglages de lecture et de couleur restent disponibles.'}</p>}
    </div>
    <div className="pf-preference-block"><h3><I nom="format_size" taille={22}/>{en?'Text size':'Taille du texte'}</h3>
      <p>{en?'Make reading comfortable throughout the app.':'Pour lire confortablement dans toute l’application.'}</p>
      <fieldset className="pf-size-options"><legend className="sr-only">{en?'Text size':'Taille du texte'}</legend>{tailles.map(([taille,label],k)=><label key={taille}><input type="radio" name={`${id}-taille`} aria-label={label} checked={preferences.taille===taille} onChange={()=>appliquer({taille})}/><span className={`pf-size-aa pf-size-aa-${k}`} aria-hidden="true">Aa</span><span>{label}</span></label>)}</fieldset>
    </div>
    <div className="pf-preference-block"><h3><I nom="palette" taille={22}/>{en?'App colours':'Couleurs de l’application'}</h3>
      <p>{en?'Choose a palette. Ivory keeps SÉNEVÉ’s original colours.':'Choisis une palette. Ivoire conserve les couleurs d’origine de SÉNEVÉ.'}</p>
      <fieldset className="pf-palette-options"><legend className="sr-only">{en?'Colour palette':'Palette de couleurs'}</legend>{PALETTES.map(p=><label key={p.id}><input type="radio" name={`${id}-palette`} checked={preferences.palette===p.id} onChange={()=>appliquer({palette:p.id})}/><span className="pf-palette-swatches" aria-hidden="true">{p.couleurs.map(c=><i key={c} style={{backgroundColor:c}}/>)}</span><span>{en?p.en:p.fr}</span>{preferences.palette===p.id&&<I nom="check" taille={18}/>}</label>)}</fieldset>
    </div>
    <div className="pf-preference-block pf-mode-block"><h3>{en?'Light or dark':'Clair ou sombre'}</h3><Apparence langue={langue}/></div>
    <div className="pf-reading-preview"><p className="pf-eyebrow">{en?'Reading preview':'Aperçu de lecture'}</p><p>{en?'A small faithful step, every day.':'Un petit pas fidèle, chaque jour.'}</p></div>
    <p className="pf-preference-note">{en?'Text size, palette and appearance are kept on this device.':'La taille du texte, la palette et le mode d’affichage sont conservés sur cet appareil.'}</p>
    {modifie&&<p className="pf-preference-status" role="status">{nonConserve?(en?'Applied for now. Your browser could not save this preference.':'Réglage appliqué. Ton navigateur n’a pas pu le conserver.'):(en?'Display updated':'Affichage mis à jour')}</p>}
    <button type="button" className="link pf-preferences-reset" onClick={retablir}>{en?'Restore display defaults':'Rétablir l’affichage par défaut'}</button>
  </section>;
}
