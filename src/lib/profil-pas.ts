/** Profil « Mes pas » (maquette validée par Dr Justin le 31/10/2026).
 *  Uniquement ce que le participant a déclaré : aucun score, aucune mesure de foi ; rien ne recule. */
import {chargerSupabase} from './supabase-differe';

export type Pas={enrollment_id:string;etat:string;realisee_le:string|null};
export type ParcoursPas={id:string;debut:string;duree:number;termineLe:string|null};
export type EtapeJardin='graine'|'pousse'|'tige'|'arbre';
export type Etape={id:EtapeJardin;atteinte:boolean;le:string|null};

const FUSEAU='Africa/Kinshasa';
/** Date locale AAAA-MM-JJ dans le fuseau SÉNEVÉ par défaut. */
export function dateLocale(d:Date,timeZone=FUSEAU){return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
/** Lundi (AAAA-MM-JJ) de la semaine d'une date locale. */
export function lundi(dateIso:string){const d=new Date(`${dateIso}T00:00:00Z`);const j=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-j);return d.toISOString().slice(0,10);}

/** Pas posés : actions réalisées entièrement ou en partie, datées. */
export function pasDates(pas:readonly Pas[]):string[]{return pas.filter(p=>(p.etat==='realisee'||p.etat==='partielle')&&p.realisee_le&&Number.isFinite(Date.parse(p.realisee_le))).map(p=>p.realisee_le!).sort();}

export function pasCetteSemaine(pas:readonly Pas[],now=new Date()){const debut=lundi(dateLocale(now));return pasDates(pas).filter(d=>{const l=dateLocale(new Date(d));return l>=debut&&l<=dateLocale(now);}).length;}
/** Jours distincts du mois en cours avec au moins un pas. */
export function joursCeMois(pas:readonly Pas[],now=new Date()){const mois=dateLocale(now).slice(0,7);return new Set(pasDates(pas).map(d=>dateLocale(new Date(d))).filter(l=>l.startsWith(mois))).size;}

/** Durée réelle d'un parcours : Habitudes & Défis se prolonge mois par mois, sa date de fin prévue
 *  dépasse alors la durée du programme (30 jours). Sans date de fin valable, on garde la durée du programme. */
export function dureeReelle(p:{debut:string;duree:number;fin?:string|null}):number{
 const date=/^\d{4}-\d{2}-\d{2}$/;if(!p.fin||!date.test(p.fin)||!date.test(p.debut))return p.duree;
 const jours=Math.round((Date.parse(`${p.fin}T00:00:00Z`)-Date.parse(`${p.debut}T00:00:00Z`))/864e5)+1;
 return Number.isFinite(jours)?Math.max(p.duree,jours):p.duree;
}

const plusJours=(iso:string,n:number)=>{const d=new Date(`${iso}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const ecart=(de:string,a:string)=>Math.round((Date.parse(`${a}T00:00:00Z`)-Date.parse(`${de}T00:00:00Z`))/864e5);

/** Seuils du jardin validés par Dr Justin le 05/11/2026 : un seul jardin pour tous les parcours SÉNEVÉ. */
export const SEUILS_JARDIN={pousse:.10,tige:.40,arbre:.70} as const;
/** La tige demande aussi au moins sept jours pratiqués, pour qu'un premier jour isolé (1 sur 1 = 100 %) ne suffise pas. */
const JOURS_MIN_TIGE=7;

export type Pratique={pratiques:number;ouverts:number;pourcentage:number};
type Suivi={debut:string;fin:string;jours:Set<string>};

function suivis(parcours:readonly ParcoursPas[],pas:readonly Pas[]):Suivi[]{
 return parcours.filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.debut)&&p.duree>0).map(p=>{
  const fin=plusJours(p.debut,p.duree-1);const jours=new Set<string>();
  for(const x of pas)if(x.enrollment_id===p.id)for(const d of pasDates([x])){const l=dateLocale(new Date(d));if(l>=p.debut&&l<=fin)jours.add(l);}
  return{debut:p.debut,fin,jours};
 });
}
function pratiqueAu(s:readonly Suivi[],jour:string):Pratique{
 let pratiques=0,ouverts=0;
 for(const p of s){if(jour<p.debut)continue;ouverts+=ecart(p.debut,jour<p.fin?jour:p.fin)+1;for(const d of p.jours)if(d<=jour)pratiques++;}
 return{pratiques,ouverts,pourcentage:ouverts?Math.round(pratiques/ouverts*100):0};
}

/** Jours pratiqués ÷ jours déjà ouverts, tous parcours additionnés (un jour compte s'il porte au moins un pas). */
export function pratiqueGlobale(parcours:readonly ParcoursPas[],pas:readonly Pas[],now=new Date()):Pratique{return pratiqueAu(suivis(parcours,pas),dateLocale(now));}

/** Les quatre étapes du jardin (Matthieu 13:31-32), un seul jardin pour tous les parcours.
 *  Graine semée : un parcours commencé. Première pousse : 10 % des jours ouverts pratiqués.
 *  Tige affermie : 40 % et au moins sept jours pratiqués. Arbre accueillant : 70 % et au moins un parcours terminé.
 *  Une étape atteinte ne recule jamais : elle reste acquise même si le pourcentage baisse ensuite. */
export function etapesJardin(parcours:readonly ParcoursPas[],pas:readonly Pas[],now=new Date()):Etape[]{
 const aujourdhui=dateLocale(now);const s=suivis(parcours,pas);
 const debuts=s.map(p=>p.debut).filter(d=>d<=aujourdhui).sort();
 const fins=parcours.map(p=>p.termineLe).filter((d):d is string=>Boolean(d)).sort();
 let pousse:string|null=null,tige:string|null=null,arbre:string|null=null;
 if(debuts[0])for(let jour=debuts[0];jour<=aujourdhui;jour=plusJours(jour,1)){
  const r=pratiqueAu(s,jour);const taux=r.ouverts?r.pratiques/r.ouverts:0;
  if(!pousse&&r.pratiques>0&&taux>=SEUILS_JARDIN.pousse)pousse=jour;
  if(!tige&&r.pratiques>=JOURS_MIN_TIGE&&taux>=SEUILS_JARDIN.tige)tige=jour;
  if(!arbre&&taux>=SEUILS_JARDIN.arbre&&fins.some(f=>f<=jour))arbre=jour;
  if(pousse&&tige&&arbre)break;
 }
 return [
  {id:'graine',atteinte:debuts.length>0,le:debuts[0]??null},
  {id:'pousse',atteinte:Boolean(pousse),le:pousse},
  {id:'tige',atteinte:Boolean(tige),le:tige},
  {id:'arbre',atteinte:Boolean(arbre),le:arbre},
 ];
}

export const TEXTES_JARDIN={
 fr:{graine:['Graine','semée'],pousse:['Première','pousse'],tige:['Tige','affermie'],arbre:['Arbre','accueillant'],
  fil:{graine:'Une graine semée',pousse:'Une première pousse',tige:'Une tige affermie',arbre:'Un arbre accueillant'},
  detail:{graine:'Ton premier parcours a commencé.',pousse:'10 % des jours de tes parcours pratiqués.',tige:'40 % des jours de tes parcours pratiqués.',arbre:'70 % des jours pratiqués et un parcours mené à son terme.'}},
 en:{graine:['Seed','sown'],pousse:['First','shoot'],tige:['Stem','growing strong'],arbre:['Welcoming','tree'],
  fil:{graine:'A seed sown',pousse:'A first shoot',tige:'A stem growing strong',arbre:'A welcoming tree'},
  detail:{graine:'Your first journey has begun.',pousse:'10% of your journey days practised.',tige:'40% of your journey days practised.',arbre:'70% of days practised and a journey completed.'}},
} as const;

/** Actions déclarées des inscriptions du participant (lecture protégée par les règles de la base). */
export async function chargerPas(inscriptions:readonly string[]):Promise<Pas[]>{
 if(!inscriptions.length)return [];
 const supabase=await chargerSupabase();
 const r=await supabase.from('activity_state').select('enrollment_id,etat,realisee_le').in('enrollment_id',[...inscriptions]).in('etat',['realisee','partielle']);
 if(r.error)throw r.error;return (r.data??[]) as Pas[];
}
