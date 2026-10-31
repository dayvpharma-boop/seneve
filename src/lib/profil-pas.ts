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

/** Les quatre étapes du jardin (Matthieu 13:31-32). Elles ne reculent jamais.
 *  Graine semée : un parcours commencé. Première pousse : un premier pas déclaré.
 *  Tige affermie : sept jours différents avec un pas. Arbre accueillant : un parcours mené jusqu'à son dernier jour. */
export function etapesJardin(parcours:readonly ParcoursPas[],pas:readonly Pas[],now=new Date()):Etape[]{
 const aujourdhui=dateLocale(now);
 const debuts=parcours.map(p=>p.debut).filter(d=>d<=aujourdhui).sort();
 const dates=pasDates(pas);const premier=dates[0];
 const jours:string[]=[];for(const d of dates){const l=dateLocale(new Date(d));if(!jours.includes(l))jours.push(l);}
 const fins=parcours.map(p=>p.termineLe).filter((d):d is string=>Boolean(d)&&d!<=aujourdhui).sort();
 return [
  {id:'graine',atteinte:debuts.length>0,le:debuts[0]??null},
  {id:'pousse',atteinte:dates.length>0,le:premier?dateLocale(new Date(premier)):null},
  {id:'tige',atteinte:jours.length>=7,le:jours[6]??null},
  {id:'arbre',atteinte:fins.length>0,le:fins[0]??null},
 ];
}

export const TEXTES_JARDIN={
 fr:{graine:['Graine','semée'],pousse:['Première','pousse'],tige:['Tige','affermie'],arbre:['Arbre','accueillant'],
  fil:{graine:'Une graine semée',pousse:'Une première pousse',tige:'Une tige affermie',arbre:'Un arbre accueillant'},
  detail:{graine:'Ton premier parcours a commencé.',pousse:'Tu as déclaré ton premier pas.',tige:'Sept jours de pratique déclarée.',arbre:'Un parcours mené jusqu’à son dernier jour.'}},
 en:{graine:['Seed','sown'],pousse:['First','shoot'],tige:['Stem','growing strong'],arbre:['Welcoming','tree'],
  fil:{graine:'A seed sown',pousse:'A first shoot',tige:'A stem growing strong',arbre:'A welcoming tree'},
  detail:{graine:'Your first journey has begun.',pousse:'You declared your first step.',tige:'Seven days of declared practice.',arbre:'A journey followed to its last day.'}},
} as const;

/** Actions déclarées des inscriptions du participant (lecture protégée par les règles de la base). */
export async function chargerPas(inscriptions:readonly string[]):Promise<Pas[]>{
 if(!inscriptions.length)return [];
 const supabase=await chargerSupabase();
 const r=await supabase.from('activity_state').select('enrollment_id,etat,realisee_le').in('enrollment_id',[...inscriptions]).in('etat',['realisee','partielle']);
 if(r.error)throw r.error;return (r.data??[]) as Pas[];
}
