import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {CompteurFidelite} from '@/components/CompteurFidelite';
import {IconeHD} from '@/components/IconeHabitudes';
import {PROGRAMMES_HD_REELS} from '@/lib/habitudes-programmes';
import {compteurFideliteActif} from '@/lib/habitudes-fidelite';
import {supabase} from '@/lib/supabase';
import {NotFound} from '@/routes/introuvable';
import '../styles-recette-habitudes.css';

/** Textes de la maquette Stitch « Mes engagements », à valider par Dr Justin avant publication. */
const ENGAGEMENTS:{icone:string;fr:[string,string];en:[string,string]}[]=[
 {icone:'edit_note',fr:['Vérité','Parler sans fard ni déformation · Être vrai devant Dieu et les hommes.'],en:['Truth','Speak plainly, without distortion · Be true before God and people.']},
 {icone:'diversity_1',fr:['Respect','Honorer la dignité de chacun en paroles et en actes, sans mépris ni amertume.'],en:['Respect','Honour everyone’s dignity in words and deeds, without contempt or bitterness.']},
 {icone:'balance',fr:['Honnêteté : ni vol ni fraude','Être irréprochable dans les biens d’autrui, le travail et les engagements donnés.'],en:['Honesty: no theft or fraud','Be above reproach with others’ property, at work and in the commitments you make.']},
 {icone:'water_drop',fr:['Pureté : abstinence hors mariage','Garder son corps et ses pensées dans la sainteté et l’attente paisible.'],en:['Purity: abstinence outside marriage','Keep your body and thoughts in holiness and peaceful waiting.']},
];
const ETAPES:{icone:string;fr:[string,string];en:[string,string]}[]=[
 {icone:'folded_hands',fr:['Demander pardon','Revenir humblement à Dieu et à la personne offensée dans le recueillement.'],en:['Ask for forgiveness','Return humbly to God and to the person you hurt, in quiet reflection.']},
 {icone:'handshake',fr:['Réparer si possible','Restituer ce qui a été dérobé, clarifier la vérité ou offrir la réconciliation.'],en:['Make amends if possible','Return what was taken, set the truth straight or offer reconciliation.']},
 {icone:'directions_walk',fr:['Continuer la route','Se relever aussitôt et reprendre son chemin sans se condamner ni s’abandonner.'],en:['Keep going','Get up straight away and continue your path without condemning or giving up on yourself.']},
];

/** Écran « Engagements » d'Habitudes & Défis (maquette Stitch 07). Le compteur n'apparaît qu'ici. */
export function HabitudesEngagements(){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr;
 const [inscription,setInscription]=useState<string|null|undefined>(undefined);
 useEffect(()=>{document.title=l('Mes engagements','My commitments')+' — SÉNEVÉ';document.documentElement.lang=langue;},[langue]);
 useEffect(()=>{
  if(!compteurFideliteActif())return;
  let actif=true;
  void Promise.resolve(supabase.from('enrollments').select('enrollment_id').in('programme_id',Object.values(PROGRAMMES_HD_REELS)).neq('etat','annulee').order('date_debut',{ascending:false}).limit(1))
   .then(({data,error})=>{if(actif)setInscription(error?null:(data?.[0]?.enrollment_id as string|undefined)??null);},()=>{if(actif)setInscription(null);});
  return()=>{actif=false;};
 },[]);
 if(!compteurFideliteActif())return <NotFound/>;
 const suffixe=en?'?lang=en':'';
 return <CadreHabitudes titre={l('Engagements','Commitments')} langue={langue} retour={`/habitudes/aujourdhui${suffixe}`} liens={{aujourdhui:`/habitudes/aujourdhui${suffixe}`}}>
  <div className="px-hd-margin pt-hd-space-lg flex flex-col gap-hd-space-lg">
   <section aria-labelledby="hd-engagements-titre" className="flex flex-col gap-hd-space-sm">
    <p className="font-hd-label-sm text-hd-label-sm uppercase tracking-wider text-hd-secondary flex items-center gap-1"><IconeHD nom="spa" className="text-[14px]"/>{l('Habitudes & Défis · Vie intérieure','Habits & Challenges · Inner life')}</p>
    <h1 id="hd-engagements-titre" className="font-hd-headline-md text-hd-headline-md text-hd-on-surface">{l('Mes engagements','My commitments')}</h1>
    <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Des repères posés devant Dieu pour garder le cœur libre et la conscience paisible.','Markers set before God to keep a free heart and a peaceful conscience.')}</p>
    <ul className="flex flex-col gap-2">{ENGAGEMENTS.map(e=><li key={e.icone} className="bg-hd-surface-container-lowest rounded-xl p-hd-space-md shadow-sm flex items-start gap-3">
     <span className="w-9 h-9 rounded-full bg-hd-surface-container flex items-center justify-center text-hd-secondary shrink-0"><IconeHD nom={e.icone} className="text-[18px]"/></span>
     <span className="flex flex-col"><span className="font-hd-label-lg text-hd-label-lg text-hd-on-surface">{(en?e.en:e.fr)[0]}</span><span className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{(en?e.en:e.fr)[1]}</span></span>
    </li>)}</ul>
   </section>
   {inscription===undefined?<p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Chargement…','Loading…')}</p>
    :inscription===null?<p role="status" className="bg-hd-surface-container-low rounded-xl p-hd-space-md font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Le compteur est disponible une fois inscrit à Habitudes & Défis et connecté à ton compte.','The counter is available once you are enrolled in Habits & Challenges and signed in.')} <Link className="text-hd-secondary underline" to={`/connexion${suffixe}`}>{l('Me connecter','Sign in')}</Link></p>
    :<CompteurFidelite enrollmentId={inscription} langue={langue}/>}
   <section aria-labelledby="hd-manque-titre" className="bg-hd-surface-container rounded-xl p-hd-space-md shadow-sm flex flex-col gap-4 mb-hd-space-lg">
    <h2 id="hd-manque-titre" className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface flex items-center gap-2.5"><span className="w-8 h-8 rounded-full bg-hd-secondary/10 flex items-center justify-center text-hd-secondary"><IconeHD nom="favorite" className="text-[18px]"/></span>{l('Si je manque à un engagement','If I fall short of a commitment')}</h2>
    <ol className="flex flex-col gap-3.5 pl-1">{ETAPES.map((e,i)=><li key={e.icone} className="flex items-start gap-3">
     <span className="w-6 h-6 rounded-full bg-hd-surface-container-high flex items-center justify-center text-hd-secondary shrink-0 text-xs font-hd-label-sm">{i+1}</span>
     <span className="flex flex-col"><span className="font-hd-label-md text-hd-label-md text-hd-on-surface flex items-center gap-1.5">{(en?e.en:e.fr)[0]}<IconeHD nom={e.icone} className="text-[15px] text-hd-secondary"/></span><span className="font-hd-body-md text-[13px] leading-[19px] text-hd-on-surface-variant mt-0.5">{(en?e.en:e.fr)[1]}</span></span>
    </li>)}</ol>
    <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant flex items-start gap-1.5"><IconeHD nom="psychology_alt" className="text-[16px] text-hd-secondary mt-0.5 shrink-0"/>{l('Ton parcours continue : pour ces manquements, rien n’est remis à zéro.','Your journey continues: for these, nothing is reset.')}</p>
    <Link to={`/aide${suffixe}`} className="self-start min-h-[44px] inline-flex items-center gap-1 font-hd-label-md text-hd-label-md text-hd-secondary underline underline-offset-4"><IconeHD nom="hearing" className="text-[16px]"/>{l('Parler à quelqu’un','Talk to someone')}</Link>
   </section>
  </div>
 </CadreHabitudes>;
}
