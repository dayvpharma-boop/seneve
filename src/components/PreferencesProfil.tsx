import {useId,useState} from 'react';
import {Apparence} from './Apparence';
import {IconePreferences as I} from './IconePreferences';
import {choisirApparence} from '@/lib/apparence';
import {ACCENTS,DEFAUT_VISUEL,usePreferencesVisuelles,type Accent,type Palette,type TailleTexte} from '@/lib/preferences-visuelles';
import type {CSSProperties} from 'react';
/** Couleurs d'accent (31/10/2026) : [nom FR, nom EN, accent en mode clair, accent en mode sombre]. */
export const NOMS_ACCENTS:Record<Accent,[string,string,string,string]>={lavande:['Lavande','Lavender','#49439b','#c5bbff'],menthe:['Menthe','Mint','#2a7548','#8fdba8'],foret:['Forêt','Forest','#2f5d3a','#a9d1a3'],ciel:['Ciel','Sky','#1f5f9e','#9cc8f5'],turquoise:['Turquoise','Turquoise','#0f6b6b','#7fd6d0'],or:['Or','Gold','#7d5b00','#f0c860'],corail:['Corail','Coral','#ad3a2d','#ffad9f'],rose:['Rose','Pink','#9c3068','#f5a8cf']};

const PALETTES:{id:Palette;fr:string;en:string;couleurs:string[]}[]=[
  {id:'ivoire',fr:'Lavande',en:'Lavender',couleurs:['#F5F7FE','#151B36','#49439B']},
  {id:'sable',fr:'Sable',en:'Sand',couleurs:['#FAF2E5','#251B14','#C2A062']},
  {id:'sauge',fr:'Sauge',en:'Sage',couleurs:['#F2F3E9','#171F18','#A7B987']},
  {id:'argile',fr:'Argile',en:'Clay',couleurs:['#FAEFE8','#2B1C18','#C99170']},
  {id:'ardoise',fr:'Bleu ardoise',en:'Slate blue',couleurs:['#EDF2F7','#17212C','#8AA8BE']},
];
/** seul : une seule rubrique (ligne « Langue », « Taille du texte »… des réglages du 31/10/2026). */
export function PreferencesProfil({langue,langueCompte,indisponible=false,lectureSeule=false,onLangueChange,seul}:{
  langue:'fr'|'en';langueCompte:string;indisponible?:boolean;lectureSeule?:boolean;onLangueChange:(langue:'fr'|'en')=>void;seul?:'langue'|'taille'|'palette'|'mode'|'accent';
}) {
  const voir=(r:'langue'|'taille'|'palette'|'mode'|'accent')=>!seul||seul===r;
  const en=langue==='en',id=useId();
  const [preferences,choisir]=usePreferencesVisuelles();
  const [modifie,setModifie]=useState(false),[nonConserve,setNonConserve]=useState(false);
  function appliquer(changements:Partial<typeof preferences>){setNonConserve(!choisir({...preferences,...changements}));setModifie(true);}
  function retablir(){setNonConserve(!choisir(DEFAUT_VISUEL));choisirApparence('systeme');setModifie(true);}
  const tailles:[TailleTexte,string][]=[['petite',en?'Small':'Petite'],['normale',en?'Standard':'Normale'],['grande',en?'Large':'Grande'],['tres-grande',en?'Extra large':'Très grande']];
  return <section className="pf-card pf-preferences" id="preferences" aria-labelledby={`${id}-titre`}>
    {!seul&&<div className="pf-section-heading"><span className="pf-section-icon"><I nom="tune"/></span><div><p className="pf-eyebrow">{en?'Make yourself at home':'Un espace à ton rythme'}</p><h2 id={`${id}-titre`}>{en?'My preferences':'Mes préférences'}</h2></div></div>}
    {voir('langue')&&<div className="pf-preference-block"><h3><I nom="language" taille={22}/>{en?'Language':'Langue'}</h3>
      <p>{en?'Choose the language saved in your account.':'Choisis la langue enregistrée dans ton compte.'}</p>
      <fieldset className="pf-language" disabled={indisponible}><legend className="sr-only">{en?'Profile language':'Langue du profil'}</legend>{(['fr','en'] as const).map(l=><label key={l}><input type="radio" name={`${id}-langue`} checked={langueCompte===l} onChange={()=>onLangueChange(l)}/><span>{l==='fr'?'Français':'English'}</span></label>)}</fieldset>
      {lectureSeule&&<p className="pf-preference-note">{en?'Reconnect to change your account language. Reading and colour settings remain available.':'Reconnecte-toi pour changer la langue du compte. Les réglages de lecture et de couleur restent disponibles.'}</p>}
    </div>}
    {voir('taille')&&<div className="pf-preference-block"><h3><I nom="format_size" taille={22}/>{en?'Text size':'Taille du texte'}</h3>
      <p>{en?'Make reading comfortable throughout the app.':'Pour lire confortablement dans toute l’application.'}</p>
      <fieldset className="pf-size-options"><legend className="sr-only">{en?'Text size':'Taille du texte'}</legend>{tailles.map(([taille,label],k)=><label key={taille}><input type="radio" name={`${id}-taille`} aria-label={label} checked={preferences.taille===taille} onChange={()=>appliquer({taille})}/><span className={`pf-size-aa pf-size-aa-${k}`} aria-hidden="true">Aa</span><span>{label}</span></label>)}</fieldset>
    </div>}
    {voir('palette')&&<div className="pf-preference-block"><h3><I nom="palette" taille={22}/>{en?'App colours':'Couleurs de l’application'}</h3>
      <p>{en?'Choose a palette. Lavender is SÉNEVÉ’s default palette.':'Choisis une palette. Lavande est la palette par défaut de SÉNEVÉ.'}</p>
      <fieldset className="pf-palette-options"><legend className="sr-only">{en?'Colour palette':'Palette de couleurs'}</legend>{PALETTES.map(p=><label key={p.id}><input type="radio" name={`${id}-palette`} checked={preferences.palette===p.id} onChange={()=>appliquer({palette:p.id})}/><span className="pf-palette-swatches" aria-hidden="true">{p.couleurs.map(c=><i key={c} style={{backgroundColor:c}}/>)}</span><span>{en?p.en:p.fr}</span>{preferences.palette===p.id&&<I nom="check" taille={18}/>}</label>)}</fieldset>
    </div>}
    {voir('accent')&&<div className="pf-preference-block"><h3><I nom="palette" taille={22}/>{en?'Accent colour':'Couleur d’accent'}</h3>
      <p>{en?'Colour of highlighted text, buttons and frames, in light and dark mode.':'Couleur des textes mis en avant, des boutons et des cadres, en mode clair comme en mode sombre.'}</p>
      <fieldset className="pf-accent-options"><legend className="sr-only">{en?'Accent colour':'Couleur d’accent'}</legend>{ACCENTS.map(a=>{const[fr,anglais,clair,nuit]=NOMS_ACCENTS[a];const nom=en?anglais:fr;return <label key={a}><input type="radio" name={`${id}-accent`} aria-label={`${en?'Accent colour':'Couleur d’accent'} : ${nom}`} checked={(preferences.accent??'lavande')===a} onChange={()=>appliquer({accent:a})}/><span className="pf-accent-pastille" style={{'--accent-c':clair,'--accent-n':nuit} as CSSProperties} aria-hidden="true"/><span>{nom}</span></label>;})}</fieldset>
    </div>}
    {voir('mode')&&<div className="pf-preference-block pf-mode-block"><h3>{en?'Light or dark':'Clair ou sombre'}</h3><Apparence langue={langue}/></div>}
    {!seul&&<div className="pf-reading-preview"><p className="pf-eyebrow">{en?'Reading preview':'Aperçu de lecture'}</p><p>{en?'A small faithful step, every day.':'Un petit pas fidèle, chaque jour.'}</p></div>}
    {!seul&&<p className="pf-preference-note">{en?'Text size, palette and appearance are kept on this device.':'La taille du texte, la palette et le mode d’affichage sont conservés sur cet appareil.'}</p>}
    {modifie&&<p className="pf-preference-status" role="status">{nonConserve?(en?'Applied for now. Your browser could not save this preference.':'Réglage appliqué. Ton navigateur n’a pas pu le conserver.'):(en?'Display updated':'Affichage mis à jour')}</p>}
    {!seul&&<button type="button" className="link pf-preferences-reset" onClick={retablir}>{en?'Restore display defaults':'Rétablir l’affichage par défaut'}</button>}
  </section>;
}
